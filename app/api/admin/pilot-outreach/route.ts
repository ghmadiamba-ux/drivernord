import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { buildPilotOutreachList } from '../../../../lib/pilotOutreach';

export async function GET(req: NextRequest) {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const entries = await buildPilotOutreachList();
  return NextResponse.json({ entries });
}
