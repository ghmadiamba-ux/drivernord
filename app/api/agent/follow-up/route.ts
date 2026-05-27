import { NextRequest, NextResponse } from 'next/server';
import { runFollowUpAgent } from '../../../../lib/followUpAgent';

export const dynamic = 'force-dynamic';

// GET /api/agent/follow-up  — Vercel cron scheduler (sends GET + Authorization: Bearer CRON_SECRET)
// POST /api/agent/follow-up — manual triggers via x-api-key: AGENT_API_KEY
//
// Schedule: "0 8 * * *" in vercel.json (10:00 Swedish summer time).
// SAFETY: follow-up is SIMULATED — no real SMS/email sent.

function isAuthorized(req: NextRequest): boolean {
  const apiKey     = process.env.AGENT_API_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (apiKey && req.headers.get('x-api-key') === apiKey) return true;
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return true;
  return false;
}

async function handleFollowUp(req: NextRequest): Promise<NextResponse> {
  const apiKey     = process.env.AGENT_API_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (!apiKey && !cronSecret) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await runFollowUpAgent();
  return NextResponse.json(result);
}

// GET: Vercel cron scheduler sends GET requests
// POST: manual triggers via AGENT_API_KEY or CRON_SECRET
export const GET = handleFollowUp;
export const POST = handleFollowUp;
