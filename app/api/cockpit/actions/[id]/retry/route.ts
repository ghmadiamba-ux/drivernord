import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../../lib/recruiterAuth';
import { db } from '../../../../../../lib/db';
import { logAction } from '../../../../../../lib/systemActions';
import { updateShortlistEntry } from '../../../../../../lib/shortlistStore';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const actionId = params.id;

  const { data: row, error: fetchErr } = await db
    .from('system_actions')
    .select('*')
    .eq('id', actionId)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (row.status !== 'failed') {
    return NextResponse.json({ error: 'action_not_failed', current_status: row.status }, { status: 409 });
  }

  const now = new Date().toISOString();

  try {
    await retryAction(row as Record<string, unknown>, now);
  } catch (err) {
    console.error('[cockpit/retry] retryAction failed:', err);
    return NextResponse.json({ error: 'retry_failed' }, { status: 500 });
  }

  await logAction({
    action_type:  'override_retried',
    triggered_by: 'human',
    target_type:  row.target_type as never,
    target_id:    row.target_id as string,
    status:       'completed',
    input:        { retried_action_id: actionId, retried_type: row.action_type },
  });

  return NextResponse.json({ ok: true });
}

async function retryAction(row: Record<string, unknown>, now: string): Promise<void> {
  const actionType = row.action_type as string;
  const targetId   = row.target_id as string;
  const actionId   = row.id as string;

  if (actionType === 'contact_suggested' || actionType === 'contact_sent') {
    await updateShortlistEntry(targetId, { contact_status: 'contacted' });
    await db
      .from('system_actions')
      .update({ status: 'completed', completed_at: now, error: null })
      .eq('id', actionId);
    return;
  }

  if (actionType === 'follow_up_triggered' || actionType === 'follow_up_sent') {
    await db.from('drivers').update({ follow_up_sent: true }).eq('id', targetId);
    await db
      .from('system_actions')
      .update({ status: 'completed', completed_at: now, error: null })
      .eq('id', actionId);
    return;
  }

  // Other types: mark completed
  await db
    .from('system_actions')
    .update({ status: 'completed', completed_at: now, error: null })
    .eq('id', actionId);
}
