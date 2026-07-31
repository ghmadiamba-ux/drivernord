import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { db } from '../../../../../lib/db';
import { logAction } from '../../../../../lib/systemActions';

export const dynamic = 'force-dynamic';

type ContactAction = 'approve' | 'skip' | 'needs_review';

export async function PATCH(
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

  const action = (body as Record<string, unknown>)?.action as string | undefined;
  if (action !== 'approve' && action !== 'skip' && action !== 'needs_review') {
    return NextResponse.json(
      { error: 'action must be approve, skip, or needs_review' },
      { status: 400 },
    );
  }

  const forceApprove  = (body as Record<string, unknown>)?.force === true;
  const forceReason   = ((body as Record<string, unknown>)?.force_reason as string | undefined) ?? '';
  const actionId = params.id;

  const { data: row, error: fetchErr } = await db
    .from('system_actions')
    .select('id, action_type, target_type, target_id, status, input')
    .eq('id', actionId)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const r = row as Record<string, unknown>;

  if (r.status !== 'pending') {
    return NextResponse.json(
      { error: 'action_not_pending', current_status: r.status },
      { status: 409 },
    );
  }

  return handleAction(action as ContactAction, actionId, r, forceApprove, forceReason);
}

// ─── Action handlers ──────────────────────────────────────────────────────────

const FORCE_REASON_MIN_LENGTH = 10;

async function handleAction(
  action: ContactAction,
  actionId: string,
  row: Record<string, unknown>,
  force: boolean = false,
  forceReason: string = '',
): Promise<NextResponse> {
  const targetId = row.target_id as string;

  if (action === 'approve') {
    // ── Force override reason gate ─────────────────────────────────────────
    // Force override must have a written reason of at least 10 characters.
    // This is checked BEFORE the governance block so the reason is required
    // even when the caller cannot yet know whether the candidate is blocked.
    if (force) {
      const trimmed = forceReason.trim();
      if (trimmed.length < FORCE_REASON_MIN_LENGTH) {
        return NextResponse.json(
          {
            error:   'force_reason_required',
            message: `A written reason (minimum ${FORCE_REASON_MIN_LENGTH} characters) is required to force-approve a governance-blocked candidate.`,
            hint:    'Add "force_reason": "..." to the request body explaining why the governance block is being bypassed.',
          },
          { status: 400 },
        );
      }
    }

    // ── Governance check ───────────────────────────────────────────────────
    // Block approval if the driver has DQ or duplicate flags unless force=true.
    // This prevents accidental cockpit approval of unresolved data quality issues.
    if (!force) {
      const input    = (row.input ?? {}) as Record<string, unknown>;
      const driverId = input.driver_id as string | undefined;
      const phone    = input.phone    as string | undefined;

      if (driverId || phone) {
        const [qualRes, dupRes] = await Promise.all([
          driverId
            ? db.from('system_actions').select('id').eq('action_type', 'data_quality_issue').eq('target_id', driverId).limit(1)
            : Promise.resolve({ data: [] as unknown[], error: null }),
          phone
            ? db.from('system_actions').select('input').eq('action_type', 'driver_duplicate_detected').limit(50)
            : Promise.resolve({ data: [] as unknown[], error: null }),
        ]);

        const hasQualityIssue = (qualRes.data?.length ?? 0) > 0;
        const hasDuplicate    = (dupRes.data ?? []).some(
          (a) => ((a as Record<string, unknown>).input as Record<string, unknown> | null)?.phone === phone,
        );

        if (hasQualityIssue || hasDuplicate) {
          return NextResponse.json(
            {
              error:             'blocked_data_quality',
              has_quality_issue: hasQualityIssue,
              has_duplicate:     hasDuplicate,
              driver_id:         driverId ?? null,
              warning: hasQualityIssue
                ? 'Driver has a data quality issue (name contains phone number). Verify driver identity before approval.'
                : 'Driver phone matches a duplicate record. Multiple drivers share this phone number.',
              force_available: true,
              hint: 'Resubmit with { "action": "approve", "force": true } to override this warning.',
            },
            { status: 422 },
          );
        }
      }
    }

    // Atomic guard: only update if still pending
    const { data: updated } = await db
      .from('system_actions')
      .update({ status: 'approved' })
      .eq('id', actionId)
      .eq('status', 'pending')
      .select('id');

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'action_no_longer_pending' }, { status: 409 });
    }

    // Log approval — NO SMS sent. SMS happens only after 46elks is configured.
    await logAction({
      action_type:  'contact_confirmed',
      triggered_by: 'human',
      target_type:  'shortlist_entry',
      target_id:    targetId,
      status:       'completed',
      input: {
        approved_action_id: actionId,
        note: force
          ? `force_approved_without_sms — ${forceReason.trim()}`
          : 'approved_without_sms — waiting for 46elks activation',
        ...(force ? { force_override: true, force_reason: forceReason.trim() } : {}),
      },
    });

    return NextResponse.json({ ok: true, action: 'approved' });
  }

  if (action === 'skip') {
    const { data: skipped } = await db
      .from('system_actions')
      .update({ status: 'cancelled' })
      .eq('id', actionId)
      .eq('status', 'pending')
      .select('id');

    if (!skipped || skipped.length === 0) {
      return NextResponse.json({ error: 'action_no_longer_pending' }, { status: 409 });
    }

    await logAction({
      action_type:  'contact_skipped_by_founder',
      triggered_by: 'human',
      target_type:  'shortlist_entry',
      target_id:    targetId,
      status:       'completed',
      input: { skipped_action_id: actionId },
    });

    return NextResponse.json({ ok: true, action: 'skipped' });
  }

  // needs_review
  const { data: flagged } = await db
    .from('system_actions')
    .update({ status: 'needs_review' })
    .eq('id', actionId)
    .eq('status', 'pending')
    .select('id');

  if (!flagged || flagged.length === 0) {
    return NextResponse.json({ error: 'action_no_longer_pending' }, { status: 409 });
  }

  await logAction({
    action_type:  'contact_needs_review',
    triggered_by: 'human',
    target_type:  'shortlist_entry',
    target_id:    targetId,
    status:       'completed',
    input: { flagged_action_id: actionId },
  });

  return NextResponse.json({ ok: true, action: 'needs_review' });
}
