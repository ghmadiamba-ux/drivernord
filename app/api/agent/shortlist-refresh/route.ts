import { NextRequest, NextResponse } from 'next/server';
import { refreshStaleShortlists } from '../../../../lib/matchingAgent';

export const dynamic = 'force-dynamic';

// GET /api/agent/shortlist-refresh  — Vercel cron (sends GET + Authorization: Bearer CRON_SECRET)
// POST /api/agent/shortlist-refresh — manual trigger via x-api-key: AGENT_API_KEY
//
// Schedule: "0 3 * * *" in vercel.json (05:00 CEST — before commercial hours).
// SAFETY: re-runs matching and writes fresh shortlists only.
//   - no emails sent
//   - no SMS sent
//   - no outreach approved
//   - contact agent fires in suggest mode (logs only, no PII in response)

function isAuthorized(req: NextRequest): boolean {
  const apiKey     = process.env.AGENT_API_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (apiKey     && req.headers.get('x-api-key')     === apiKey)             return true;
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return true;
  return false;
}

async function handleRefresh(req: NextRequest): Promise<NextResponse> {
  const apiKey     = process.env.AGENT_API_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (!apiKey && !cronSecret) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await refreshStaleShortlists();

  // Return the safe summary — counts only, no PII, no driver names, no company names
  return NextResponse.json({
    ok:                     true,
    run_type:               result.run_type,
    needs_checked:          result.needs_checked,
    stale_needs_found:      result.stale_needs_found,
    shortlists_refreshed:   result.shortlists_refreshed,
    skipped_do_not_contact: result.skipped_do_not_contact,
    skipped_fresh:          result.skipped_fresh,
    error_count:            result.errors.length,
  });
}

export const GET  = handleRefresh;
export const POST = handleRefresh;
