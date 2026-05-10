import { NextRequest, NextResponse } from 'next/server';
import { runMatchingAgent } from '../../../lib/matchingAgent';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
  const configuredKey = process.env.MATCH_API_KEY;
  if (!configuredKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  if (req.headers.get('x-api-key') !== configuredKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Parse body
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
    return NextResponse.json({ error: 'invalid_need_id' }, { status: 400 });
  }

  const needId = (body as Record<string, unknown>).need_id as string;

  const result = await runMatchingAgent({ needId, triggeredBy: 'agent:matching' });

  if (!result.ok) {
    const status = result.error === 'need_not_found' ? 404 : 500;
    const error  = result.error === 'need_not_found' ? 'need_not_found' : 'supabase_error';
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({
    shortlist_id:     result.shortlistId,
    shortlisted:      result.shortlisted,
    rejected:         result.rejected,
    totalCandidates:  result.totalCandidates,
    totalShortlisted: result.totalShortlisted,
    summary:          result.summary,
  });
}
