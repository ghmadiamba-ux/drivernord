import { NextRequest, NextResponse } from 'next/server';
import { getOpenCompanyNeeds } from '../../../../lib/companyNeedStore';
import { getActiveIngestedDrivers } from '../../../../lib/ingestedDriverStore';
import { buildShortlist } from '../../../../lib/matchingEngine';
import { createShortlist } from '../../../../lib/shortlistStore';
import type { MatchNeed } from '../../../../lib/matchScore';
import type { License } from '../../../../types/lead';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    typeof (body as Record<string, unknown>).need_id !== 'string'
  ) {
    return NextResponse.json({ error: 'need_id required' }, { status: 400 });
  }

  const needId = (body as Record<string, unknown>).need_id as string;

  let needs;
  try {
    needs = await getOpenCompanyNeeds();
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  const needRow = needs.find((n) => n.id === needId);
  if (!needRow) {
    return NextResponse.json({ error: 'need_not_found' }, { status: 404 });
  }

  const need: MatchNeed = {
    license_required:   needRow.license_required as License,
    domain_required:    needRow.domain_required,
    domain_preferred:   needRow.domain_preferred,
    location_region:    needRow.location_region,
    relocation_allowed: needRow.relocation_allowed,
    shift_type:         needRow.shift_type,
    urgency:            needRow.urgency,
  };

  let drivers;
  try {
    drivers = await getActiveIngestedDrivers();
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  const result = buildShortlist(drivers, need);

  let shortlistId: string;
  try {
    shortlistId = await createShortlist(needId, result);
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  return NextResponse.json({ shortlist_id: shortlistId, ...result });
}
