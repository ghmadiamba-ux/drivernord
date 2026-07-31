import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { buildCockpitSummary } from '../../../../lib/cockpitSummary';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  try {
    const payload = await buildCockpitSummary();
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[cockpit-summary] GET failed:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
