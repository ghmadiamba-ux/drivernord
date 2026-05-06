import { NextRequest, NextResponse } from 'next/server';
import { runFollowUpAgent } from '../../../../lib/followUpAgent';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const configuredKey = process.env.AGENT_API_KEY;
  if (!configuredKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  if (req.headers.get('x-api-key') !== configuredKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await runFollowUpAgent();
  return NextResponse.json(result);
}
