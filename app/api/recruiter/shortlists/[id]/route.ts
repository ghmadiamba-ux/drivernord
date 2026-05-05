import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { getShortlist } from '../../../../../lib/shortlistStore';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let shortlist;
  try {
    shortlist = await getShortlist(params.id);
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  if (!shortlist) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json(shortlist);
}
