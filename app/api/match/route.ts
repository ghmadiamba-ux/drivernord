import { NextRequest, NextResponse } from 'next/server';
import { getOpenCompanyNeeds } from '../../../lib/companyNeedStore';
import { getActiveIngestedDrivers } from '../../../lib/ingestedDriverStore';
import { buildShortlist } from '../../../lib/matchingEngine';
import { createShortlist } from '../../../lib/shortlistStore';
import type { MatchNeed } from '../../../lib/matchScore';
import type { License } from '../../../types/lead';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 0. API key check
  const configuredKey = process.env.MATCH_API_KEY;
  if (!configuredKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  if (req.headers.get('x-api-key') !== configuredKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 1. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // 2. Validate need_id
  if (
    !body ||
    typeof body !== 'object' ||
    typeof (body as Record<string, unknown>).need_id !== 'string'
  ) {
    return NextResponse.json({ error: 'invalid_need_id' }, { status: 400 });
  }
  const needId = (body as Record<string, unknown>).need_id as string;

  // 3. Fetch open company needs
  let needs;
  try {
    needs = await getOpenCompanyNeeds();
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  // 4. Find the requested need
  const needRow = needs.find((n) => n.id === needId);
  if (!needRow) {
    return NextResponse.json({ error: 'need_not_found' }, { status: 404 });
  }

  // 5. Convert CompanyNeedRow → MatchNeed
  // CompanyLicense excludes 'none'; the cast to License is safe.
  const need: MatchNeed = {
    license_required:   needRow.license_required as License,
    domain_required:    needRow.domain_required,
    domain_preferred:   needRow.domain_preferred,
    location_region:    needRow.location_region,
    relocation_allowed: needRow.relocation_allowed,
    shift_type:         needRow.shift_type,
    urgency:            needRow.urgency,
  };

  // 6. Fetch active ingested drivers
  let drivers;
  try {
    drivers = await getActiveIngestedDrivers();
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  // 7. Run matching engine
  const result = buildShortlist(drivers, need);

  // 8. Persist shortlist
  let shortlistResult;
  try {
    shortlistResult = await createShortlist(needId, result);
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  return NextResponse.json({ shortlist_id: shortlistResult.shortlistId, ...result }, { status: 200 });
}
