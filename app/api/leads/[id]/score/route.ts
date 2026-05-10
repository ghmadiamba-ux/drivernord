import { NextRequest, NextResponse } from 'next/server';
import { getLead } from '../../../../../lib/supabaseStore';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';

export const dynamic = 'force-dynamic';
import { buildDriverProfile } from '../../../../../lib/driverProfile';
import { buildIngestedDriver } from '../../../../../lib/ingestedDriver';
import { scoreDriver } from '../../../../../lib/scoreDriver';
import { ingestLead } from '../../../../../lib/ingestLead';
import type { IngestedDriver } from '../../../../../lib/ingestedDriver';
import type { DriverScore } from '../../../../../lib/scoreDriver';

type PipelineResult =
  | { response: NextResponse }
  | { driver: IngestedDriver; score: DriverScore };

async function resolvePipeline(id: string): Promise<PipelineResult> {
  let lead;
  try {
    lead = await getLead(id);
  } catch {
    return { response: NextResponse.json({ error: 'supabase_error' }, { status: 500 }) };
  }

  if (!lead) {
    return { response: NextResponse.json({ error: 'lead_not_found' }, { status: 404 }) };
  }

  const profile = buildDriverProfile(lead);
  const ingested = buildIngestedDriver(profile);

  if (!ingested.ok) {
    return {
      response: NextResponse.json(
        { error: ingested.error, lead_status: lead.lead_status },
        { status: 409 },
      ),
    };
  }

  return { driver: ingested.driver, score: scoreDriver(ingested.driver) };
}

// GET — pure read, no side effects
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const result = await resolvePipeline(params.id);
  if ('response' in result) return result.response;
  return NextResponse.json({ driver: result.driver, score: result.score });
}

// POST — ingest + score: persists to ingested_drivers with explicit failure response
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });
  const result = await ingestLead(params.id);

  if (!result.ok) {
    switch (result.error) {
      case 'lead_not_found':
        return NextResponse.json({ error: 'lead_not_found' }, { status: 404 });
      case 'not_ready_for_ingestion':
      case 'missing_required_field':
        return NextResponse.json(
          { error: result.error, lead_status: result.lead_status },
          { status: 409 },
        );
      case 'supabase_error':
        return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
    }
  }

  return NextResponse.json({ driver: result.driver, score: result.score, persisted: true });
}
