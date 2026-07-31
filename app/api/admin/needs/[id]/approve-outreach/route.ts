import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../../lib/recruiterAuth';
import { db } from '../../../../../../lib/db';
import { logAction } from '../../../../../../lib/systemActions';

export const dynamic = 'force-dynamic';

// Need types that can receive outreach approval
const APPROVABLE_NEED_TYPES = new Set([
  'active_public_need',
  'matching_eligible',
  'contact_ready_candidate',
  'outreach_pending_approval',
]);

// Need types that are permanently blocked
const BLOCKED_NEED_TYPES = new Set(['simulation_only', 'archived_test']);

const REASON_MIN_LENGTH = 10;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const reason = ((body as Record<string, unknown>)?.reason as string | undefined) ?? '';
  if (reason.trim().length < REASON_MIN_LENGTH) {
    return NextResponse.json(
      {
        error:   'reason_required',
        message: `A written reason (minimum ${REASON_MIN_LENGTH} characters) is required to approve outreach for a company need.`,
        hint:    'Add "reason": "..." to the request body explaining why this need is eligible for external outreach.',
      },
      { status: 400 },
    );
  }

  const needId = params.id;

  const { data: row, error: fetchErr } = await db
    .from('company_needs')
    .select('id, need_type, status, company_id')
    .eq('id', needId)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const r = row as Record<string, unknown>;
  const needType = r.need_type as string;
  const status   = r.status   as string;

  // Permanently blocked types
  if (BLOCKED_NEED_TYPES.has(needType)) {
    return NextResponse.json(
      {
        error:     'blocked_need_type',
        need_type: needType,
        message:   `Needs of type '${needType}' can never be approved for outreach.`,
      },
      { status: 403 },
    );
  }

  // Closed needs
  if (status === 'closed') {
    return NextResponse.json(
      { error: 'need_closed', message: 'This need is closed and cannot be approved for outreach.' },
      { status: 422 },
    );
  }

  // Expired needs
  if (needType === 'expired') {
    return NextResponse.json(
      { error: 'need_expired', message: 'This need is expired and cannot be approved for outreach.' },
      { status: 422 },
    );
  }

  // Already contacted — outreach already happened
  if (needType === 'contacted') {
    return NextResponse.json(
      { error: 'already_contacted', message: 'This need is already in contacted state; outreach has already occurred.' },
      { status: 409 },
    );
  }

  // Already approved
  if (needType === 'outreach_approved') {
    return NextResponse.json(
      { error: 'already_approved', message: 'This need is already approved for outreach.' },
      { status: 409 },
    );
  }

  // Must be in an approvable type
  if (!APPROVABLE_NEED_TYPES.has(needType)) {
    return NextResponse.json(
      {
        error:     'not_approvable',
        need_type: needType,
        message:   `Cannot approve outreach for a need in state '${needType}'.`,
      },
      { status: 422 },
    );
  }

  // Atomic update — only succeeds if the need is still in an approvable type
  const { data: updated } = await db
    .from('company_needs')
    .update({ need_type: 'outreach_approved' })
    .eq('id', needId)
    .in('need_type', [...APPROVABLE_NEED_TYPES])
    .select('id');

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'state_changed' }, { status: 409 });
  }

  const now = new Date().toISOString();

  await logAction({
    action_type:  'company_need_outreach_approved',
    triggered_by: 'human',
    target_type:  'company_need',
    target_id:    needId,
    status:       'completed',
    input: {
      reason:        reason.trim(),
      approved_by:   'founder',
      approved_at:   now,
      prior_need_type: needType,
      source:        'founder_governance_cockpit_v1',
    },
  });

  return NextResponse.json({
    ok:       true,
    need_id:  needId,
    need_type: 'outreach_approved',
    note: 'Outreach approved for this need. No SMS or email has been sent. Driver contact requires a configured SMS provider and separate driver-level confirmation.',
  });
}
