import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '../../../lib/supabaseStore';
import { getNextStep, getFirstStep } from '../../../lib/conversation';
import type { Lang } from '../../../types/lead';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const lang = (body as Record<string, unknown>)?.lang;
  if (lang !== 'sv' && lang !== 'en') {
    return NextResponse.json({ error: 'invalid_lang' }, { status: 400 });
  }

  let lead;
  try {
    lead = await createLead(lang as Lang);
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  const next_step = getNextStep(getFirstStep(), { region: null, license: null });

  return NextResponse.json(
    { id: lead.id, next_step, lead_status: lead.lead_status },
    { status: 201 },
  );
}
