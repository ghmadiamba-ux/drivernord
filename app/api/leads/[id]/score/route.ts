import { NextRequest, NextResponse } from 'next/server';
import { getLead } from '../../../../../lib/supabaseStore';
import { buildDriverProfile } from '../../../../../lib/driverProfile';
import { buildIngestedDriver } from '../../../../../lib/ingestedDriver';
import { createIngestedDriver } from '../../../../../lib/ingestedDriverStore';
import { scoreDriver } from '../../../../../lib/scoreDriver';
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
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const result = await resolvePipeline(params.id);
  if ('response' in result) return result.response;
  return NextResponse.json({ driver: result.driver, score: result.score });
}

// POST — ingest + score: persists to ingested_drivers, then returns the same shape
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const result = await resolvePipeline(params.id);
  if ('response' in result) return result.response;

  // Duplicate upserts are silently ignored by the store.
  // Failure must never break the score response.
  try {
    await createIngestedDriver(result.driver);
  } catch (err) {
    console.error('createIngestedDriver failed (non-fatal):', err);
  }

  return NextResponse.json({ driver: result.driver, score: result.score });
}
