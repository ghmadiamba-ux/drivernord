import { NextRequest, NextResponse } from 'next/server';
import { getLead, updateLead } from '../../../../lib/supabaseStore';
import { applyStep } from '../../../../lib/applyStep';
import type { StepId } from '../../../../lib/conversation';

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

  return NextResponse.json({
    id: result.lead.id,
    next_step: result.next_step,
    lead_status: result.lead.lead_status,
    lead_priority: result.lead.lead_priority,
  });
}
