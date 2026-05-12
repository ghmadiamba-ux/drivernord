import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '@/lib/recruiterAuth';
import {
  getCompanyResearchTargets,
  computeB2BTargetSummary,
} from '@/lib/b2b/companyResearchStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  try {
    const targets = await getCompanyResearchTargets();
    const summary = computeB2BTargetSummary(targets);
    return NextResponse.json({ targets, summary });
  } catch (err) {
    return NextResponse.json(
      { error: 'internal_error', detail: String(err) },
      { status: 500 },
    );
  }
}
