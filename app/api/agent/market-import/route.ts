import { type NextRequest, NextResponse } from 'next/server';
import { runMarketImportScan } from '../../../../lib/companyNeedMarketAgent';
import type { NormalizedMarketSignal, MarketSignalSourceType } from '../../../../lib/marketSignalTypes';
import { validateSignal } from '../../../../lib/marketSignalImport';

export const dynamic = 'force-dynamic';

// POST /api/agent/market-import
//
// Accepts an array of NormalizedMarketSignal objects, imports them into
// company_research_targets + company_need_drafts, and runs supply-aware
// evaluation.  This is the import_run entry point for fresh market data.
//
// Auth: x-api-key: AGENT_API_KEY or Authorization: Bearer {CRON_SECRET}
// Body: { signals: NormalizedMarketSignal[], source_types?: string[] }
//
// SAFETY: No emails, no SMS, no external contact. Read + write DB only.

function isAuthorized(req: NextRequest): boolean {
  const apiKey     = process.env.AGENT_API_KEY;
  const cronSecret = process.env.CRON_SECRET;
  if (apiKey     && req.headers.get('x-api-key')     === apiKey)             return true;
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return true;
  return false;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey    = process.env.AGENT_API_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (!apiKey && !cronSecret) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { signals?: unknown; source_types?: unknown };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!Array.isArray(body.signals)) {
    return NextResponse.json({ error: 'signals must be an array' }, { status: 400 });
  }

  if (body.signals.length === 0) {
    return NextResponse.json({ error: 'signals array is empty' }, { status: 400 });
  }

  if (body.signals.length > 500) {
    return NextResponse.json({ error: 'max 500 signals per request' }, { status: 400 });
  }

  // Pre-validate all signals before touching the DB
  const preErrors: string[] = [];
  for (let i = 0; i < body.signals.length; i++) {
    const err = validateSignal(body.signals[i] as NormalizedMarketSignal);
    if (err) preErrors.push(`signals[${i}]: ${err}`);
  }
  if (preErrors.length > 0) {
    return NextResponse.json({
      error:   'validation_failed',
      details: preErrors.slice(0, 10),
      total_invalid: preErrors.length,
    }, { status: 422 });
  }

  const signals     = body.signals as NormalizedMarketSignal[];
  const sourceTypes = (Array.isArray(body.source_types) ? body.source_types : ['manual_entry']) as MarketSignalSourceType[];

  try {
    const result = await runMarketImportScan(signals, sourceTypes);

    return NextResponse.json({
      ok:                    true,
      run_type:              result.run_type,
      is_evaluation_only:    result.is_evaluation_only,
      scanned_at:            result.scanned_at,
      signals_imported:      result.signals_imported,
      signals_updated:       result.signals_updated,
      drafts_evaluated:      result.drafts_evaluated,
      stale_detected:        result.stale_detected,
      promotion_recommended: result.promotion_recommended,
      supply_gap_blocked:    result.supply_gap_blocked,
      supply_ready_promotable: result.supply_ready_promotable,
      expired_detected:      result.expired_detected,
      scan_action_id:        result.scan_action_id,
    });
  } catch (err) {
    console.error('[agent/market-import] failed:', err);
    return NextResponse.json({ error: 'import_failed', details: String(err) }, { status: 500 });
  }
}
