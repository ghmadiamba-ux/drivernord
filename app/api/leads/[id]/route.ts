import { NextRequest, NextResponse } from 'next/server';
import { getLead, updateLead } from '../../../../lib/supabaseStore';
import { applyStep } from '../../../../lib/applyStep';
import type { StepId } from '../../../../lib/conversation';
import { ingestLead } from '../../../../lib/ingestLead';
import { logAction } from '../../../../lib/systemActions';
import { getOpenCompanyNeeds } from '../../../../lib/companyNeedStore';
import { runMatchingAgent } from '../../../../lib/matchingAgent';
import type { DriverScore } from '../../../../lib/scoreDriver';

export const dynamic = 'force-dynamic';

// Runs after a successful ingest — not awaited by the HTTP handler.
async function triggerMatchingForAllNeeds(
  leadId:   string,
  driverId: string,
  score:    DriverScore,
): Promise<void> {
  await logAction({
    action_type:  'driver_ingested',
    triggered_by: 'agent:driver_ingestion',
    target_type:  'driver',
    target_id:    driverId,
    status:       'completed',
    input:  { lead_id: leadId },
    result: { score },
  });

  let openNeeds;
  try {
    openNeeds = await getOpenCompanyNeeds();
  } catch (err) {
    console.error('[auto-match] failed to fetch open needs:', err);
    return;
  }

  if (openNeeds.length === 0) {
    console.log('[auto-match] driver ingested — no open needs, matching skipped');
    return;
  }

  for (const need of openNeeds) {
    void runMatchingAgent({ needId: need.id, triggeredBy: 'agent:driver_ingestion' });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  let lead;
  try {
    lead = await getLead(params.id);
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  if (!lead) {
    return NextResponse.json({ error: 'lead_not_found' }, { status: 404 });
  }

  return NextResponse.json(lead);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  let lead;
  try {
    lead = await getLead(params.id);
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  if (!lead) {
    return NextResponse.json({ error: 'lead_not_found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const step = (body as Record<string, unknown>)?.step as StepId;
  const answer = ((body as Record<string, unknown>)?.answer ?? null) as string | null;

  const result = applyStep(lead, step, answer);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    await updateLead(result.lead);
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  if (result.lead.lead_status === 'ready_for_ingestion') {
    const ingestResult = await ingestLead(result.lead.id);
    if (!ingestResult.ok) {
      console.error('[auto-ingest] failed for lead', result.lead.id, '—', ingestResult.error);
    } else {
      void triggerMatchingForAllNeeds(result.lead.id, ingestResult.driver.id, ingestResult.score);
    }
  }

  return NextResponse.json({
    id: result.lead.id,
    next_step: result.next_step,
    lead_status: result.lead.lead_status,
    lead_priority: result.lead.lead_priority,
  });
}
