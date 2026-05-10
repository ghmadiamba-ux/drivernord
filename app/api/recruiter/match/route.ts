import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { runMatchingAgent } from '../../../../lib/matchingAgent';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

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

  const result = await runMatchingAgent({ needId, triggeredBy: 'human' });

  if (!result.ok) {
    const status = result.error === 'need_not_found' ? 404 : 500;
    const error  = result.error === 'need_not_found' ? 'need_not_found' : 'supabase_error';
    return NextResponse.json({ error }, { status });
  }

  const shortlisted = result.shortlisted.map((entry) => ({
    ...entry,
    shortlist_entry_id: result.entryIdsByDriverId[entry.driver.id] ?? null,
  }));

  return NextResponse.json({
    shortlist_id:     result.shortlistId,
    shortlisted,
    rejected:         result.rejected,
    totalCandidates:  result.totalCandidates,
    totalShortlisted: result.totalShortlisted,
    summary:          result.summary,
  });
}
