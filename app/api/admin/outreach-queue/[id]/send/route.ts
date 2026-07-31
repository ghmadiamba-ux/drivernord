import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../../lib/recruiterAuth';
import {
  getQueueItemById,
  markQueueItemSent,
  markQueueItemFailed,
  countSentInLastHour,
} from '../../../../../../lib/outreachQueue';
import {
  validateEmailBeforeSend,
  isWithinRateLimit,
  isWorkingHours,
} from '../../../../../../lib/agents/zohoOutreachAgent';
import {
  sendEmailViaZoho,
  getZohoConfigStatus,
  getZohoFromEmail,
  getZohoFromName,
} from '../../../../../../lib/zohoMailClient';
import { logAction } from '../../../../../../lib/systemActions';

// POST /api/admin/outreach-queue/[id]/send
// Dispatches a single approved queue item via Zoho Mail API.
//
// Safety gates (in order):
//   1. Recruiter auth
//   2. Zoho fully configured (all 6 env vars)
//   3. Item exists and status === 'approved'
//   4. Item is not dry_run
//   5. validateEmailBeforeSend (content, mojibake, JPC, approved_by_founder, etc.)
//   6. Rate limit: countSentInLastHour < RATE_LIMIT_PER_HOUR (2/hour)
//   7. Working hours: Mon–Fri 08:00–16:00 Stockholm (UTC 06:00–14:00)
//
// On success: marks item sent, sets automation_used = true, logs action.
// On any gate failure: returns 4xx/5xx with a descriptive error, no email sent.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Gate 2 — Zoho must be fully configured
  const configStatus = getZohoConfigStatus();
  if (!configStatus.configured) {
    return NextResponse.json(
      { error: 'Zoho not configured', missing_env: configStatus.missing_env },
      { status: 400 },
    );
  }

  const { id } = params;

  // Gate 3 — item must exist and be approved
  const item = await getQueueItemById(id);
  if (!item) {
    return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
  }
  if (item.status !== 'approved') {
    return NextResponse.json(
      { error: `Item status is '${item.status}' — only approved items can be dispatched` },
      { status: 409 },
    );
  }

  // Gate 4 — item must not be dry_run
  if (item.send_mode === 'dry_run') {
    return NextResponse.json(
      { error: 'Item send_mode is dry_run — cannot dispatch' },
      { status: 409 },
    );
  }

  // Gate 5 — pre-send content validation
  const validation = validateEmailBeforeSend(item);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.errors },
      { status: 422 },
    );
  }

  // Gate 6 — rate limit
  const sentInLastHour = await countSentInLastHour();
  if (!isWithinRateLimit(sentInLastHour)) {
    return NextResponse.json(
      { error: `Rate limit reached — ${sentInLastHour} emails sent in the last hour (max 2)` },
      { status: 429 },
    );
  }

  // Gate 7 — working hours
  if (!isWorkingHours(new Date())) {
    return NextResponse.json(
      { error: 'Outside working hours — dispatch allowed Mon–Fri 08:00–16:00 Stockholm time' },
      { status: 503 },
    );
  }

  // All gates passed — send via Zoho
  const sendResult = await sendEmailViaZoho({
    to:         item.recipient_email,
    subject:    item.subject,
    body:       item.body,
    from_email: getZohoFromEmail(),
    from_name:  getZohoFromName(),
  });

  if (!sendResult.success || sendResult.dry_run) {
    await markQueueItemFailed(id, sendResult.error ?? 'sendEmailViaZoho returned success=false');
    await logAction({
      action_type:  'outreach_email_failed',
      triggered_by: 'dispatch_route',
      target_type:  'outreach_email_queue',
      target_id:    id,
      status:       'failed',
      input:        { recipient: item.recipient_email, company: item.company_name_snapshot },
      error:        sendResult.error ?? 'send failed',
    });
    return NextResponse.json(
      { ok: false, error: sendResult.error ?? 'Zoho send failed' },
      { status: 500 },
    );
  }

  await markQueueItemSent(id, sendResult.message_id ?? '', true);
  await logAction({
    action_type:  'outreach_email_sent',
    triggered_by: 'dispatch_route',
    target_type:  'outreach_email_queue',
    target_id:    id,
    status:       'completed',
    input:        { recipient: item.recipient_email, company: item.company_name_snapshot },
    result:       { message_id: sendResult.message_id },
  });

  return NextResponse.json({
    ok:         true,
    message_id: sendResult.message_id,
    sent_to:    item.recipient_email,
  });
}
