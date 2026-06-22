import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { notifyFounderWhatsApp, isFounderWhatsAppEnabled } from '../../../../lib/founderNotifier';
import { getWhatsAppFounderPhone } from '../../../../lib/whatsappClient';
import { logAction } from '../../../../lib/systemActions';
import type { PostDuePayload } from '../../../../lib/founderNotifier';

// POST /api/admin/whatsapp-test
// Recruiter-auth protected (x-recruiter-key: RECRUITER_API_KEY).
// Also accepts CRON_SECRET auth (Authorization: Bearer <CRON_SECRET>) as secondary pathway.
// Requires { confirm: true } in the request body to prevent accidental sends.
// When FOUNDER_WHATSAPP_ENABLED is not set, returns dry_run: true without sending.
// Never bypasses any gates in notifyFounderWhatsApp().
//
// Optional body fields override the default sample post:
//   post_text  — custom Swedish message body (≤850 chars)
//   title      — post title shown in template header
//   category   — post category (defaults to 'discussion_question')
//   day_number — day counter shown in template header (defaults to 0)
//
// SAFETY:
//   ✗ Does not send to drivers, companies, or the WhatsApp group
//   ✗ Does not expose WHATSAPP_ACCESS_TOKEN
//   ✗ Does not bypass FOUNDER_WHATSAPP_ENABLED, phone allowlist, or rate limit
//   ✓ Logs test action to system_actions regardless of outcome

const SAMPLE_POST: PostDuePayload = {
  id:             'whatsapp-test-probe',
  day_number:     0,
  title:          'WhatsApp Relay Test',
  category:       'weekly_tips',
  post_text:      'Det här är ett testmeddelande från DriverNord admin-cockpit. Inget riktigt inlägg att posta — bara en bekräftelse att WhatsApp-relay fungerar.',
  suggested_time: null,
};

function checkAuth(req: NextRequest): boolean {
  // Primary: recruiter session key
  const recruiterResult = requireRecruiterAuth(req);
  if (recruiterResult.ok) return true;
  // Secondary: cron secret (allows founder-triggered sends without recruiter session)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }
  return false;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    // no-op — body is optional; confirm check below handles missing key
  }

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: 'confirm: true required to send test WhatsApp message' },
      { status: 400 },
    );
  }

  // Build post payload — accept optional content overrides from body
  const post: PostDuePayload = {
    id:             'whatsapp-test-probe',
    day_number:     typeof body.day_number === 'number' ? body.day_number : SAMPLE_POST.day_number,
    title:          typeof body.title      === 'string' ? body.title      : SAMPLE_POST.title,
    category:       typeof body.category   === 'string' ? body.category   : SAMPLE_POST.category,
    post_text:      typeof body.post_text  === 'string' ? body.post_text  : SAMPLE_POST.post_text,
    suggested_time: null,
  };

  const whatsapp_enabled = isFounderWhatsAppEnabled();
  const recipient        = getWhatsAppFounderPhone() || null;

  const notifyResult = await notifyFounderWhatsApp(post);

  await logAction({
    action_type:  notifyResult.sent ? 'founder_notification_sent' : 'founder_notification_failed',
    triggered_by: 'admin:whatsapp-test',
    target_type:  'logistikklubb_scheduled_post',
    target_id:    post.id,
    status:       notifyResult.sent ? 'completed' : (notifyResult.dry_run ? 'pending' : 'failed'),
    input:        { channel: 'whatsapp', test: true, confirm: true },
    result:       {
      channel:    'whatsapp',
      sent:       notifyResult.sent,
      dry_run:    notifyResult.dry_run,
      message_id: notifyResult.message_id,
    },
    error:        notifyResult.error ?? undefined,
  });

  if (!notifyResult.sent && !notifyResult.dry_run) {
    return NextResponse.json(
      {
        ok:               false,
        dry_run:          false,
        error:            notifyResult.error,
        message_id:       null,
        whatsapp_enabled,
        recipient,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok:               notifyResult.sent,
    dry_run:          notifyResult.dry_run,
    error:            notifyResult.error,
    message_id:       notifyResult.message_id,
    whatsapp_enabled,
    recipient,
  });
}
