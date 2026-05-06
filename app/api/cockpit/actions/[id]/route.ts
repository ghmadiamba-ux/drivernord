import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { db } from '../../../../../lib/db';
import { logAction } from '../../../../../lib/systemActions';
import { updateShortlistEntry } from '../../../../../lib/shortlistStore';

export const dynamic = 'force-dynamic';

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

  const action = (body as Record<string, unknown>)?.action;
  if (action !== 'approve' && action !== 'cancel') {
    return NextResponse.json({ error: 'action must be approve or cancel' }, { status: 400 });
  }

  const actionId = params.id;

  const { data: row, error: fetchErr } = await db
    .from('system_actions')
    .select('*')
    .eq('id', actionId)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (row.status !== 'pending') {
    return NextResponse.json({ error: 'action_not_pending', current_status: row.status }, { status: 409 });
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  if (action === 'cancel') {
    await db.from('system_actions').update({ status: 'cancelled' }).eq('id', actionId);
    await logAction({
      action_type:  'override_cancelled',
      triggered_by: 'human',
      target_type:  row.target_type as never,
      target_id:    row.target_id as string,
      status:       'completed',
      input:        { cancelled_action_id: actionId, cancelled_type: row.action_type },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Approve ───────────────────────────────────────────────────────────────

  // Atomic idempotency guard: only update if still pending
  const { data: updated } = await db
    .from('system_actions')
    .update({ status: 'approved' })
    .eq('id', actionId)
    .eq('status', 'pending')
    .select('id');

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'action_no_longer_pending' }, { status: 409 });
  }

  try {
    await executeApproval(row as Record<string, unknown>);
  } catch (err) {
    console.error('[cockpit/actions] executeApproval failed:', err);
    await db
      .from('system_actions')
      .update({ status: 'failed', error: String(err) })
      .eq('id', actionId);
    return NextResponse.json({ error: 'execution_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ─── Execution ────────────────────────────────────────────────────────────────

async function executeApproval(row: Record<string, unknown>): Promise<void> {
  const actionType = row.action_type as string;
  const targetId   = row.target_id as string;

  if (actionType === 'contact_suggested') {
    await updateShortlistEntry(targetId, { contact_status: 'contacted' });
    await logAction({
      action_type:  'contact_confirmed',
      triggered_by: 'human',
      target_type:  'shortlist_entry',
      target_id:    targetId,
      status:       'completed',
      input:        { approved_action_id: row.id as string },
    });
    return;
  }

  if (actionType === 'follow_up_triggered') {
    await db.from('drivers').update({ follow_up_sent: true }).eq('id', targetId);
    await logAction({
      action_type:  'follow_up_confirmed',
      triggered_by: 'human',
      target_type:  'driver',
      target_id:    targetId,
      status:       'completed',
      input:        { approved_action_id: row.id as string },
    });
    return;
  }

  // Other pending types: mark completed
  await db
    .from('system_actions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', row.id as string);
}
