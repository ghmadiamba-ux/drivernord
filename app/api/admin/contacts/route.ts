import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { getContactApprovalQueue } from '../../../../lib/contactApproval';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  try {
    const queue = await getContactApprovalQueue();
    return NextResponse.json({ queue, count: queue.length });
  } catch (err) {
    console.error('[admin/contacts] GET failed:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
