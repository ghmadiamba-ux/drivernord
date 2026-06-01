import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { runDailyCompanyNeedScan } from '../../../../../lib/companyNeedMarketAgent';

export const dynamic = 'force-dynamic';

// POST /api/admin/company-need-agent/daily-scan
//
// Runs the daily light scan: refreshes freshness, detects stale signals,
// classifies lifecycle, and logs market intelligence events.
//
// Recommended trigger: daily at 06:00 via cron or manual founder invocation.
// Protected: requires x-recruiter-key header.
//
// SAFETY: produces only internal intelligence. No SMS, no email, no contact.

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  try {
    const result = await runDailyCompanyNeedScan();
    return NextResponse.json({
      ok:                      true,
      run_type:                result.run_type,
      is_evaluation_only:      result.is_evaluation_only,
      scan_type:               result.scan_type,
      scanned_at:              result.scanned_at,
      drafts_evaluated:        result.drafts_evaluated,
      stale_detected:          result.stale_detected,
      supply_gap_blocked:      result.supply_gap_blocked,
      supply_ready_promotable: result.supply_ready_promotable,
      promotion_recommended:   result.promotion_recommended,
      expired_detected:        result.expired_detected,
      scan_action_id:          result.scan_action_id,
      signals: result.signals.map((s) => ({
        company_name:          s.company_name,
        draft_id:              s.draft_id,
        lifecycle:             s.lifecycle,
        composite:             s.scores.composite,
        promotion_recommended: s.promotion_recommended,
        is_stale:              s.is_stale,
        recommended_action:    s.recommended_action,
      })),
    });
  } catch (err) {
    console.error('[company-need-agent/daily-scan] failed:', err);
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 });
  }
}
