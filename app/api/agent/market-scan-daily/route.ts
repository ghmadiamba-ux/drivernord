import { NextRequest, NextResponse } from 'next/server';
import { runDailyCompanyNeedScan } from '../../../../lib/companyNeedMarketAgent';
import { syncAgencyDraftsToSignals } from '../../../../lib/agencyScanAgent';

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
    // Run both scans in parallel — agency sync is independent of company need evaluation
    const [result, agencyResult] = await Promise.allSettled([
      runDailyCompanyNeedScan(),
      syncAgencyDraftsToSignals(),
    ]);

    if (result.status === 'rejected') {
      console.error('[agent/market-scan-daily] company need scan failed:', result.reason);
      return NextResponse.json({ error: 'scan_failed' }, { status: 500 });
    }

    if (agencyResult.status === 'rejected') {
      console.warn('[agent/market-scan-daily] agency sync failed (non-fatal):', agencyResult.reason);
    }

    const scan = result.value;
    const agency = agencyResult.status === 'fulfilled' ? agencyResult.value : null;

    return NextResponse.json({
      ok:                      true,
      run_type:                scan.run_type,
      is_evaluation_only:      scan.is_evaluation_only,
      live_scan_available:     scan.live_scan_available ?? false,
      import_run_available:    scan.import_run_available,
      scan_type:               scan.scan_type,
      scanned_at:              scan.scanned_at,
      drafts_evaluated:        scan.drafts_evaluated,
      stale_detected:          scan.stale_detected,
      promotion_recommended:   scan.promotion_recommended,
      supply_gap_blocked:      scan.supply_gap_blocked,
      supply_ready_promotable: scan.supply_ready_promotable,
      expired_detected:        scan.expired_detected,
      scan_action_id:          scan.scan_action_id,
      agency_scan: agency ? {
        agencies_found:    agency.agencies_found,
        agencies_upserted: agency.agencies_upserted,
        chronic_count:     agency.chronic_count,
      } : null,
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
