import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '@/lib/recruiterAuth';
import { readMarketSignalSummary, generateFiveDaySequence } from '@/lib/logistikklubbAgent';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const signals  = await readMarketSignalSummary();
  const sequence = generateFiveDaySequence(signals);
  return NextResponse.json(sequence);
}
