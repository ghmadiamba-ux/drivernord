import { NextRequest, NextResponse } from 'next/server';
import { runDailyCompanyNeedScan } from '../../../../lib/companyNeedMarketAgent';

export const dynamic = 'force-dynamic';

// POST /api/agent/market-scan-daily
//
// Cron-facing endpoint for the daily light Market Agent scan.
// Schedule: "0 5 * * *" in vercel.json (07:00 Swedish summer time).
//
// Auth: accepts either:
//   x-api-key: AGENT_API_KEY     — manual triggers and local dev
//   Authorization: Bearer {CRON_SECRET}  — Vercel cron scheduler (auto-injected)
//
// SAFETY: produces only internal intelligence. No SMS, no email, no contact.

function isAuthorized(req: NextRequest): boolean {
  const apiKey    = process.env.AGENT_API_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (apiKey && req.headers.get('x-api-key') === apiKey) return true;
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return true;
  return false;
}

async function handleScan(req: NextRequest): Promise<NextResponse> {
  const apiKey    = process.env.AGENT_API_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (!apiKey && !cronSecret) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDailyCompanyNeedScan();
    return NextResponse.json({
      ok:                      true,
      run_type:                result.run_type,
      is_evaluation_only:      result.is_evaluation_only,
      live_scan_available:     result.live_scan_available ?? false,
      import_run_available:    result.import_run_available,
      scan_type:               result.scan_type,
      scanned_at:              result.scanned_at,
      drafts_evaluated:        result.drafts_evaluated,
      stale_detected:          result.stale_detected,
      promotion_recommended:   result.promotion_recommended,
      supply_gap_blocked:      result.supply_gap_blocked,
      supply_ready_promotable: result.supply_ready_promotable,
      expired_detected:        result.expired_detected,
      scan_action_id:          result.scan_action_id,
    });
  } catch (err) {
    console.error('[agent/market-scan-daily] failed:', err);
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 });
  }
}

// GET: Vercel cron scheduler sends GET requests
// POST: manual triggers via AGENT_API_KEY or CRON_SECRET
export const GET = handleScan;
export const POST = handleScan;
