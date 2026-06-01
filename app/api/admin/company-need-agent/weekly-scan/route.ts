import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { runWeeklyCompanyNeedDeepScan, runLiveScanCycle } from '../../../../../lib/companyNeedMarketAgent';

export const dynamic = 'force-dynamic';

// POST /api/admin/company-need-agent/weekly-scan
//
// Runs the weekly deep scan: full re-evaluation of all drafts and needs,
// top opportunity ranking, national market intelligence summary.
//
// Recommended trigger: Monday at 05:00.
// Protected: requires x-recruiter-key header.
//
// SAFETY: produces only internal intelligence. No SMS, no email, no contact.

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  try {
    // When PLATSBANKEN_SCAN_ENABLED=true, run live scan cycle (fetch + import + evaluate).
    // Otherwise run standard evaluation_run.
    const liveScanEnabled = process.env.PLATSBANKEN_SCAN_ENABLED === 'true';
    const result = liveScanEnabled
      ? await runLiveScanCycle()
      : await runWeeklyCompanyNeedDeepScan();

    // Sort signals by composite score descending for opportunity ranking
    const ranked = [...result.signals].sort((a, b) => b.scores.composite - a.scores.composite);

    return NextResponse.json({
      ok:                      true,
      run_type:                result.run_type,
      is_evaluation_only:      result.is_evaluation_only,
      live_scan_attempted:     result.live_scan_attempted ?? liveScanEnabled,
      live_sources_checked:    result.live_sources_checked ?? 0,
      signals_imported:        result.signals_imported ?? 0,
      signals_updated:         result.signals_updated  ?? 0,
      scan_type:               result.scan_type,
      scanned_at:              result.scanned_at,
      drafts_evaluated:        result.drafts_evaluated,
      stale_detected:          result.stale_detected,
      supply_gap_blocked:      result.supply_gap_blocked,
      supply_ready_promotable: result.supply_ready_promotable,
      promotion_recommended:   result.promotion_recommended,
      expired_detected:        result.expired_detected,
      scan_action_id:          result.scan_action_id,
      top_opportunities: ranked.slice(0, 5).map((s) => ({
        company_name:       s.company_name,
        draft_id:           s.draft_id,
        lifecycle:          s.lifecycle,
        composite:          s.scores.composite,
        pain:               s.scores.recruitment_pain_score,
        freshness:          s.scores.freshness_score,
        fit:                s.scores.drivernord_fit_score,
        recommended_action: s.recommended_action,
      })),
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
    console.error('[company-need-agent/weekly-scan] failed:', err);
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 });
  }
}
