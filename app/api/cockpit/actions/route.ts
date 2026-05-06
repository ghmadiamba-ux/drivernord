import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { getCockpitActions } from '../../../../lib/cockpit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  try {
    const data = await getCockpitActions();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[cockpit/actions] GET failed:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
