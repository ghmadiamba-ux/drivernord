import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { getTodayMetrics } from '../../../../lib/cockpit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  try {
    const metrics = await getTodayMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    console.error('[cockpit/metrics] GET failed:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
