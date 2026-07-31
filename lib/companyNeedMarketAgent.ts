// lib/companyNeedMarketAgent.ts
//
// Company Need / Market Agent — V1 Foundation
//
// ROLE:
//   Continuous market radar for company-side driver demand.
//   Classifies, scores, and refreshes company_need_drafts and company_needs
//   based on public-data signals. Produces internal intelligence only.
//
// EXPLICIT BOUNDARIES:
//   ✗ Does NOT perform driver–company matching        → matchingAgent.ts
//   ✗ Does NOT trigger SMS or email                  → contactAgent.ts
//   ✗ Does NOT approve outreach                      → cockpit / founder only
//   ✗ Does NOT share driver profiles externally
//   ✗ Does NOT set outreach_approved
//   ✓ Produces company-side scores and lifecycle classifications
//   ✓ Recommends internal promotion (founder must confirm)
//   ✓ Detects stale / expired signals
//   ✓ Logs market intelligence events to system_actions

import { randomUUID } from 'node:crypto';
import { db } from './db';
import { logAction } from './systemActions';
import { listDrafts } from './companyNeedDraft';
import { classifyPostingSource } from './agencyScanAgent';
import type { CompanyNeedDraftRow } from './companyNeedDraft';

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export type MarketLifecycle =
  | 'research_discovered'          // data gaps remain — cannot promote yet
  | 'active_public_signal'         // ready_for_review, fresh, below promotion threshold
  | 'needs_refresh'                // signal is stale (> STALE_DAYS old)
  | 'ready_for_internal_promotion' // complete + scored + above threshold + supply available
  | 'hold_supply_gap'              // above threshold but DriverNord has zero matching supply
  | 'hold_agency'                  // staffing/bemanning agency — excluded from normal client pipeline
  | 'promoted'                     // draft already promoted to company_needs
  | 'expired'                      // signal too old to act on (> EXPIRED_DAYS)
  | 'rejected';                    // draft explicitly rejected

// ─── Supply classification ────────────────────────────────────────────────────
//
// Indicates whether DriverNord has drivers to serve a given license/domain combo.
// Based on ingested_drivers aggregate counts — never exposes individual driver PII.

export type SupplyFit =
  | 'SUPPLY_READY'    // ≥ 2 matching drivers available
  | 'SUPPLY_THIN'     // exactly 1 matching driver
  | 'SUPPLY_GAP'      // 0 matching drivers — cannot serve this company
  | 'UNKNOWN_SUPPLY'; // license or domain not set — supply cannot be determined

// Thresholds (days since scan_date)
export const STALE_DAYS   = 14;  // after this, signal needs re-verification
export const EXPIRED_DAYS = 45;  // after this, signal is treated as expired

// Composite score above which promotion is recommended
export const PROMOTION_SCORE_THRESHOLD = 65;

// ─── Scoring types ────────────────────────────────────────────────────────────

export interface ScoreInput {
  urgency:               string;  // 'standard' | 'urgent' | 'emergency'
  urgency_signal:        string;  // 'none' | 'single_ad' | 'repeated_ads' | 'stated_urgency'
  license_required:      string | null;
  ykb_required:          boolean;
  driver_card_required:  boolean;
  barrier_level:         string;  // 'low' | 'medium' | 'high' | 'enterprise_only'
  contact_email_known:   boolean;
  decision_maker_known:  boolean;
  scan_date_iso:         string | null;
  missing_fields:        string[];
  // Analyst scores from scan metadata (0–100 or 0–10)
  metadata_pain_score:        number; // 0–100
  metadata_fit_score:         number; // 0–10
  metadata_contactability:    number; // 0–100
}

export interface MarketOpportunityScore {
  recruitment_pain_score:  number; // 0–100
  urgency_score:           number; // 0–100
  freshness_score:         number; // 0–100
  contactability_score:    number; // 0–100
  pilot_priority_score:    number; // 0–100
  drivernord_fit_score:    number; // 0–10 (as provided by analyst)
  composite:               number; // 0–100 weighted composite
}

// ─── Pure scoring functions ───────────────────────────────────────────────────
//
// All functions below are pure: no DB access, no side effects, deterministic.
// This makes them directly unit-testable without mocks.

export function scoreRecruitmentPain(input: Pick<
  ScoreInput,
  'urgency_signal' | 'urgency' | 'license_required' | 'ykb_required' | 'driver_card_required' | 'metadata_pain_score'
>): number {
  const signalBase: Record<string, number> = {
    stated_urgency: 95,
    repeated_ads:   75,
    single_ad:      50,
    none:           20,
  };
  let score = signalBase[input.urgency_signal] ?? 50;

  if (input.urgency === 'emergency') score = Math.min(100, score + 15);
  else if (input.urgency === 'urgent') score = Math.min(100, score + 8);

  // CE is the hardest license to fill in the Swedish market
  if (input.license_required === 'CE' || input.license_required === 'CE+D') {
    score = Math.min(100, score + 5);
  }
  if (input.ykb_required)         score = Math.min(100, score + 3);
  if (input.driver_card_required) score = Math.min(100, score + 2);

  // Blend computed score with analyst's scan assessment
  return Math.round(score * 0.6 + input.metadata_pain_score * 0.4);
}

export function scoreUrgency(input: Pick<ScoreInput, 'urgency' | 'urgency_signal'>): number {
  const base: Record<string, number> = { emergency: 100, urgent: 70, standard: 30 };
  const bonus: Record<string, number> = {
    stated_urgency: 20,
    repeated_ads:   10,
    single_ad:       5,
    none:            0,
  };
  return Math.min(100, (base[input.urgency] ?? 30) + (bonus[input.urgency_signal] ?? 0));
}

export function scoreFreshness(scanDateIso: string | null): number {
  if (!scanDateIso) return 50;
  const scanDate = new Date(scanDateIso);
  if (isNaN(scanDate.getTime())) return 50;
  const daysOld = (Date.now() - scanDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld <=  3) return 100;
  if (daysOld <=  7) return 85;
  if (daysOld <= 14) return 65;
  if (daysOld <= 30) return 35;
  if (daysOld <= 60) return 15;
  return 0;
}

export function scoreContactability(input: Pick<
  ScoreInput,
  'barrier_level' | 'contact_email_known' | 'decision_maker_known' | 'metadata_contactability'
>): number {
  const barrierBase: Record<string, number> = {
    low:             80,
    medium:          55,
    high:            25,
    enterprise_only:  0,
  };
  let score = barrierBase[input.barrier_level] ?? 40;
  if (input.contact_email_known)   score = Math.min(100, score + 10);
  if (input.decision_maker_known)  score = Math.min(100, score + 10);
  return Math.round(score * 0.7 + input.metadata_contactability * 0.3);
}

export function scoreComposite(
  pain:          number,
  fit10:         number,
  freshness:     number,
  contactability: number,
): number {
  const fit100 = Math.min(100, fit10 * 10);
  // Weights: pain 35%, fit 25%, freshness 25%, contactability 15%
  return Math.round(pain * 0.35 + fit100 * 0.25 + freshness * 0.25 + contactability * 0.15);
}

export function scoreMarketOpportunity(input: ScoreInput): MarketOpportunityScore {
  const pain          = scoreRecruitmentPain(input);
  const urgency       = scoreUrgency(input);
  const freshness     = scoreFreshness(input.scan_date_iso);
  const contactability = scoreContactability(input);
  const composite     = scoreComposite(pain, input.metadata_fit_score, freshness, contactability);

  return {
    recruitment_pain_score: pain,
    urgency_score:          urgency,
    freshness_score:        freshness,
    contactability_score:   contactability,
    pilot_priority_score:   composite,
    drivernord_fit_score:   input.metadata_fit_score,
    composite,
  };
}

// ─── Lifecycle classification (pure) ─────────────────────────────────────────

export interface LifecycleInput {
  draft_status:       string;
  missing_fields:     string[];
  scan_date_iso:      string | null;
  composite:          number;
  supply_fit?:        SupplyFit; // optional — when absent treated as UNKNOWN_SUPPLY (no blocking)
  is_staffing_agency?: boolean;  // true → hold_agency (excluded from normal promotion pipeline)
}

export function classifyMarketLifecycle(input: LifecycleInput): MarketLifecycle {
  if (input.draft_status === 'promoted')   return 'promoted';
  if (input.draft_status === 'rejected')   return 'rejected';
  if (input.draft_status === 'hold_agency') return 'hold_agency';

  // Staffing/bemanning agency gate — must not enter the normal promotion pipeline.
  // Checked before any scoring logic so classification is unconditional.
  if (input.is_staffing_agency) return 'hold_agency';

  // Data gaps take priority — can't promote or reliably evaluate without complete fields
  if (input.missing_fields.length > 0) return 'research_discovered';

  // Staleness check — only when scan_date is known
  if (input.scan_date_iso) {
    const daysOld = (Date.now() - new Date(input.scan_date_iso).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld > EXPIRED_DAYS) return 'expired';
    if (daysOld > STALE_DAYS)   return 'needs_refresh';
  }

  // Supply gap blocks promotion even when score is above threshold.
  // UNKNOWN_SUPPLY does not block — only a confirmed SUPPLY_GAP does.
  if (input.supply_fit === 'SUPPLY_GAP') return 'hold_supply_gap';

  if (input.composite >= PROMOTION_SCORE_THRESHOLD) return 'ready_for_internal_promotion';
  return 'active_public_signal';
}

export function isPromotionRecommended(lifecycle: MarketLifecycle): boolean {
  return lifecycle === 'ready_for_internal_promotion';
}

export function isStale(lifecycle: MarketLifecycle): boolean {
  return lifecycle === 'needs_refresh' || lifecycle === 'expired';
}

export function buildRecommendedAction(lifecycle: MarketLifecycle, composite: number): string {
  switch (lifecycle) {
    case 'ready_for_internal_promotion':
      return `Score ${composite} — promote to active_public_need; founder review before any outreach`;
    case 'hold_supply_gap':
      return `Score ${composite} — above threshold but SUPPLY_GAP: recruit matching drivers before promoting`;
    case 'hold_agency':
      return 'Staffing/bemanning agency — excluded from normal client outreach; routes to agency_posting_signals for commercial classification';
    case 'needs_refresh':
      return 'Signal is stale — re-verify public sources before acting';
    case 'expired':
      return 'Signal is expired — mark draft as rejected or archive';
    case 'research_discovered':
      return 'Missing required fields — complete research before promoting';
    case 'active_public_signal':
      return composite >= 80
        ? `Score ${composite} — strong signal; consider founder review`
        : `Score ${composite} — monitor; not yet promotion priority`;
    case 'promoted':
      return 'Already promoted to active_public_need — check matching results';
    case 'rejected':
      return 'Draft rejected — no action required';
  }
}

// ─── Urgency signal derivation ────────────────────────────────────────────────
//
// Derives a UrgencySignal from draft metadata ad_status.
// ad_status is stored by importScanRecords() from ScanRecord.metadata.
// If unknown, defaults to 'single_ad'.

export function deriveUrgencySignal(adStatus: string | null | undefined): string {
  if (!adStatus) return 'single_ad';
  const s = adStatus.toLowerCase();
  if (s.includes('repeated') || s.includes('multiple')) return 'repeated_ads';
  if (s.includes('urgent') || s.includes('stated'))     return 'stated_urgency';
  if (s.includes('none') || s === 'no_ad')              return 'none';
  return 'single_ad';
}

// ─── Supply fit classification (pure) ────────────────────────────────────────
//
// Counts drivers in the supply map matching a given license+domain combination.
// The supply map is pre-built from ingested_drivers aggregates — no PII.

export function classifySupplyFit(
  licenseRequired: string | null,
  domainRequired:  string | null,
  supplyMap: Map<string, number>,
): SupplyFit {
  if (!licenseRequired) return 'UNKNOWN_SUPPLY';
  const key   = `${licenseRequired}:${domainRequired ?? ''}`;
  const count = supplyMap.get(key) ?? 0;
  if (count === 0) return 'SUPPLY_GAP';
  if (count < 2)   return 'SUPPLY_THIN';
  return 'SUPPLY_READY';
}

// ─── Signal interface ─────────────────────────────────────────────────────────

export interface MarketSignal {
  company_name:          string;
  draft_id:              string;
  need_id:               string | null;
  lifecycle:             MarketLifecycle;
  scores:                MarketOpportunityScore;
  supply_fit:            SupplyFit;
  supply_gap_reason?:    string; // present only when supply_fit === 'SUPPLY_GAP'
  recommended_action:    string;
  promotion_recommended: boolean;
  is_stale:              boolean;
}

// ─── Scan result ──────────────────────────────────────────────────────────────

export interface MarketScanResult {
  // ── What type of run this was ─────────────────────────────────────────────
  // run_type is always 'evaluation_run' until a real live-source connector is built.
  // Hermes and the Cockpit must display this label — not "market scanned".
  run_type:              'evaluation_run' | 'import_run' | 'live_scan';
  is_evaluation_only:    boolean; // true when run_type === 'evaluation_run'

  scan_type:             'daily' | 'weekly' | 'triggered';
  scanned_at:            string;
  trigger?:              Record<string, unknown>;
  drafts_evaluated:      number;
  stale_detected:        number;
  promotion_recommended: number;  // supply-ready promotable only
  supply_gap_blocked:    number;  // above threshold but blocked by supply gap
  supply_ready_promotable: number; // same as promotion_recommended but explicit
  expired_detected:      number;
  signals:               MarketSignal[];
  scan_action_id:        string;

  // ── Import / live scan fields (populated only on import_run / live_scan) ──
  signals_imported?:     number;
  signals_updated?:      number;
  live_scan_attempted?:  boolean;
  live_sources_checked?: number;
  live_scan_available?:  boolean;
  import_run_available:  boolean;
}

// ─── Draft evaluation ─────────────────────────────────────────────────────────

// Contact fields fetched from company_research_targets and joined per draft.
// Only non-PII fields used for scoring; raw values are never logged.
interface ResearchTargetContactData {
  barrier_level:       string | null;
  contact_email:       string | null;
  decision_maker_name: string | null;
}

function buildScoreInputFromDraft(
  draft:  CompanyNeedDraftRow,
  target: ResearchTargetContactData | null,
): ScoreInput {
  const meta = (draft.metadata ?? {}) as Record<string, unknown>;

  return {
    urgency:              draft.urgency ?? 'standard',
    urgency_signal:       deriveUrgencySignal(meta.ad_status as string | null),
    license_required:     draft.license_required,
    ykb_required:         draft.ykb_required ?? false,
    driver_card_required: draft.driver_card_required ?? false,
    barrier_level:        target?.barrier_level ?? 'medium',
    contact_email_known:  (target?.contact_email ?? null) !== null,
    decision_maker_known: (target?.decision_maker_name ?? null) !== null,
    scan_date_iso:        (meta.scan_date as string | null) ?? null,
    missing_fields:       draft.missing_fields,
    metadata_pain_score:        Number(meta.recruitment_pain_score)  || 50,
    metadata_fit_score:         Number(meta.drivernord_fit_score)    || 5,
    metadata_contactability:    Number(meta.contactability_score)    || 50,
  };
}

// Builds an aggregate supply map from ingested_drivers.
// Key: "license:domain" (e.g. "CE:distribution", "C:kylfrys").
// Value: count of matching drivers. No individual driver PII is read.
async function getDriverSupplyMap(): Promise<Map<string, number>> {
  const { data } = await db
    .from('ingested_drivers')
    .select('license_required, domain_required');

  const supplyMap = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ license_required: string | null; domain_required: string | null }>) {
    const key = `${row.license_required ?? ''}:${row.domain_required ?? ''}`;
    supplyMap.set(key, (supplyMap.get(key) ?? 0) + 1);
  }
  return supplyMap;
}

async function evaluateDrafts(): Promise<{ signals: MarketSignal[]; companyNames: Map<string, string> }> {
  const drafts = await listDrafts({ limit: 200 });

  // Fetch company names and contact data from research targets in one query
  const targetIds = [...new Set(drafts.map((d) => d.target_id).filter(Boolean))];
  const companyNames   = new Map<string, string>();
  const targetContacts = new Map<string, ResearchTargetContactData>();

  if (targetIds.length > 0) {
    const { data: targets } = await db
      .from('company_research_targets')
      .select('id, company_name, barrier_level, contact_email, decision_maker_name')
      .in('id', targetIds);

    for (const t of targets ?? []) {
      const row = t as {
        id: string;
        company_name: string;
        barrier_level: string | null;
        contact_email: string | null;
        decision_maker_name: string | null;
      };
      companyNames.set(row.id, row.company_name);
      targetContacts.set(row.id, {
        barrier_level:       row.barrier_level,
        contact_email:       row.contact_email,
        decision_maker_name: row.decision_maker_name,
      });
    }
  }

  // Fetch aggregate driver supply — no PII, counts only
  const supplyMap = await getDriverSupplyMap();

  const signals: MarketSignal[] = [];

  for (const draft of drafts) {
    const companyName    = companyNames.get(draft.target_id) ?? 'Unknown';
    const contact        = targetContacts.get(draft.target_id) ?? null;
    const meta           = (draft.metadata ?? {}) as Record<string, unknown>;
    const descriptionSnippet = (meta.description_snippet as string | null) ?? null;
    const isStaffingAgency   = classifyPostingSource(companyName, descriptionSnippet) === 'staffing_agency';

    const input     = buildScoreInputFromDraft(draft, contact);
    const scores    = scoreMarketOpportunity(input);
    const supplyFit = classifySupplyFit(
      draft.license_required,
      draft.domain_required,
      supplyMap,
    );
    const lifecycle = classifyMarketLifecycle({
      draft_status:       draft.draft_status,
      missing_fields:     draft.missing_fields,
      scan_date_iso:      input.scan_date_iso,
      composite:          scores.composite,
      supply_fit:         supplyFit,
      is_staffing_agency: isStaffingAgency,
    });

    signals.push({
      company_name:          companyName,
      draft_id:              draft.id,
      need_id:               draft.converted_need_id ?? null,
      lifecycle,
      scores,
      supply_fit:            supplyFit,
      supply_gap_reason:     supplyFit === 'SUPPLY_GAP'
        ? `No ${draft.license_required ?? 'unknown'}/${draft.domain_required ?? 'unknown'} drivers in pool`
        : undefined,
      recommended_action:    buildRecommendedAction(lifecycle, scores.composite),
      promotion_recommended: isPromotionRecommended(lifecycle),
      is_stale:              isStale(lifecycle),
    });
  }

  return { signals, companyNames };
}

// ─── Scan runners ─────────────────────────────────────────────────────────────

async function runScan(
  scanType: 'daily' | 'weekly' | 'triggered',
  trigger?: Record<string, unknown>,
): Promise<MarketScanResult> {
  const scannedAt = new Date().toISOString();
  const scanId    = randomUUID();

  const actionType =
    scanType === 'daily'     ? 'company_need_daily_scan_completed'
    : scanType === 'weekly'  ? 'company_need_weekly_scan_completed'
    :                          'company_need_triggered_scan_completed';

  const { signals } = await evaluateDrafts();

  const staleDetected          = signals.filter((s) => s.is_stale).length;
  const promotionRecommended   = signals.filter((s) => s.promotion_recommended).length;
  const expiredDetected        = signals.filter((s) => s.lifecycle === 'expired').length;
  const supplyGapBlocked       = signals.filter((s) => s.lifecycle === 'hold_supply_gap').length;
  const supplyReadyPromotable  = signals.filter((s) => s.lifecycle === 'ready_for_internal_promotion').length;

  // Log per-signal events for promotion recommendations and staleness
  for (const signal of signals) {
    if (signal.promotion_recommended) {
      await logAction({
        action_type:  'company_need_promotion_recommended',
        triggered_by: `agent:market_agent_v1:${scanType}`,
        target_type:  'company_need_draft',
        target_id:    signal.draft_id,
        status:       'pending',
        result: {
          company_name:  signal.company_name,
          lifecycle:     signal.lifecycle,
          composite:     signal.scores.composite,
          recommended:   signal.recommended_action,
        },
      });
    }
    if (signal.lifecycle === 'needs_refresh') {
      await logAction({
        action_type:  'company_need_refresh_needed',
        triggered_by: `agent:market_agent_v1:${scanType}`,
        target_type:  'company_need_draft',
        target_id:    signal.draft_id,
        status:       'pending',
        result: {
          company_name:  signal.company_name,
          freshness:     signal.scores.freshness_score,
          recommended:   signal.recommended_action,
        },
      });
    }
    if (signal.lifecycle === 'expired') {
      await logAction({
        action_type:  'company_need_expired',
        triggered_by: `agent:market_agent_v1:${scanType}`,
        target_type:  'company_need_draft',
        target_id:    signal.draft_id,
        status:       'completed',
        result: {
          company_name: signal.company_name,
          recommended:  signal.recommended_action,
        },
      });
    }
  }

  // Log scan completion
  const scanActionId = await logAction({
    action_type:  actionType,
    triggered_by: `agent:market_agent_v1:${scanType}`,
    target_type:  'market_scan',
    target_id:    scanId,
    status:       'completed',
    input:        trigger ? { trigger } : undefined,
    result: {
      // run_type must always be logged so Hermes/Cockpit know this is evaluation-only
      run_type:              'evaluation_run',
      is_evaluation_only:    true,
      drafts_evaluated:      signals.length,
      stale_detected:        staleDetected,
      promotion_recommended: promotionRecommended,
      supply_gap_blocked:    supplyGapBlocked,
      supply_ready_promotable: supplyReadyPromotable,
      expired_detected:      expiredDetected,
    },
  });

  return {
    run_type:              'evaluation_run',
    is_evaluation_only:    true,
    scan_type:             scanType,
    scanned_at:            scannedAt,
    trigger,
    drafts_evaluated:      signals.length,
    stale_detected:        staleDetected,
    promotion_recommended: promotionRecommended,
    supply_gap_blocked:    supplyGapBlocked,
    supply_ready_promotable: supplyReadyPromotable,
    expired_detected:      expiredDetected,
    signals,
    scan_action_id:        scanActionId,
    import_run_available:  true,
    live_scan_available:   process.env.PLATSBANKEN_SCAN_ENABLED === 'true',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Daily light scan — refresh freshness and detect staleness on all active drafts.
// Recommended: 06:00 daily via POST /api/admin/company-need-agent/daily-scan
export async function runDailyCompanyNeedScan(): Promise<MarketScanResult> {
  return runScan('daily');
}

// Weekly deep scan — full re-evaluation + top opportunity ranking.
// Recommended: Monday 05:00 via POST /api/admin/company-need-agent/weekly-scan
export async function runWeeklyCompanyNeedDeepScan(): Promise<MarketScanResult> {
  return runScan('weekly');
}

// Triggered scan — run when driver supply changes materially.
// The trigger describes what changed; the scan still only produces company-side intelligence.
//
// Example triggers:
//   { type: 'driver_cluster', domain: 'schakt_bygg', region: 'stockholm', count: 4 }
//   { type: 'ce_threshold', count: 6 }
//   { type: 'rare_domain', domain: 'kran' }
export async function runTriggeredCompanyNeedScan(
  trigger: Record<string, unknown>,
): Promise<MarketScanResult> {
  return runScan('triggered', trigger);
}

// Import fresh market signals, then run supply-aware evaluation.
// Accepts any array of NormalizedMarketSignal (from CSV, live API, manual entry).
// Returns a full MarketScanResult including import counts + evaluation results.
export async function runMarketImportScan(
  signals: import('./marketSignalTypes').NormalizedMarketSignal[],
  sourceTypes: import('./marketSignalTypes').MarketSignalSourceType[],
): Promise<MarketScanResult> {
  const { importMarketSignals }    = await import('./marketSignalImport');
  const { runAgencyPostingScan }   = await import('./agencyScanAgent');

  // Detect agency signals in the incoming batch before import
  await runAgencyPostingScan(signals).catch((err) =>
    console.warn('[companyNeedMarketAgent] agency scan (import) failed (non-fatal):', err),
  );

  const importSummary = await importMarketSignals(signals, {
    run_type:     'import_run',
    source_types: sourceTypes,
  });

  // Evaluate all drafts after import (supply-aware)
  const scannedAt                = importSummary.completed_at;
  const { signals: evalSignals } = await evaluateDrafts();
  const staleDetected            = evalSignals.filter((s) => s.is_stale).length;
  const promotionRecommended     = evalSignals.filter((s) => s.promotion_recommended).length;
  const expiredDetected          = evalSignals.filter((s) => s.lifecycle === 'expired').length;
  const supplyGapBlocked         = evalSignals.filter((s) => s.lifecycle === 'hold_supply_gap').length;
  const supplyReadyPromotable    = evalSignals.filter((s) => s.lifecycle === 'ready_for_internal_promotion').length;

  const scanActionId = await logAction({
    action_type:  'company_need_daily_scan_completed',
    triggered_by: 'agent:market_agent_v1:import_run',
    target_type:  'market_scan',
    target_id:    randomUUID(),
    status:       'completed',
    result: {
      run_type:               'import_run',
      is_evaluation_only:     false,
      signals_imported:       importSummary.signals_imported,
      signals_updated:        importSummary.signals_updated,
      drafts_evaluated:       evalSignals.length,
      stale_detected:         staleDetected,
      promotion_recommended:  promotionRecommended,
      supply_gap_blocked:     supplyGapBlocked,
      supply_ready_promotable: supplyReadyPromotable,
      expired_detected:       expiredDetected,
    },
  });

  return {
    run_type:              'import_run',
    is_evaluation_only:    false,
    scan_type:             'triggered',
    scanned_at:            scannedAt,
    drafts_evaluated:      evalSignals.length,
    stale_detected:        staleDetected,
    promotion_recommended: promotionRecommended,
    supply_gap_blocked:    supplyGapBlocked,
    supply_ready_promotable: supplyReadyPromotable,
    expired_detected:      expiredDetected,
    signals:               evalSignals,
    scan_action_id:        scanActionId,
    signals_imported:      importSummary.signals_imported,
    signals_updated:       importSummary.signals_updated,
    live_scan_attempted:   false,
    import_run_available:  true,
    live_scan_available:   process.env.PLATSBANKEN_SCAN_ENABLED === 'true',
  };
}

// Fetch live signals from all enabled connectors, import them, then evaluate.
// Runs a full live_scan cycle: fetch → import → evaluate.
// Requires at least one connector with ENABLED=true env var.
export async function runLiveScanCycle(): Promise<MarketScanResult> {
  const { platsbankenConnector } = await import('./marketScanConnectors/platsbanken');
  const { importMarketSignals }  = await import('./marketSignalImport');
  const { runAgencyPostingScan } = await import('./agencyScanAgent');

  const connectors = [platsbankenConnector].filter((c) => c.enabled);
  const liveScanAvailable = connectors.length > 0;

  if (!liveScanAvailable) {
    // No connectors enabled — fall back to evaluation run
    return runScan('daily');
  }

  let allSignals:    import('./marketSignalTypes').NormalizedMarketSignal[] = [];
  let sourcesChecked = 0;
  let rawFound       = 0;
  const sourceTypes: import('./marketSignalTypes').MarketSignalSourceType[] = [];

  const connectorErrors: string[] = [];
  for (const connector of connectors) {
    const result = await connector.fetchSignals();
    allSignals    = allSignals.concat(result.signals);
    sourcesChecked += result.sources_checked;
    rawFound       += result.raw_found;
    connectorErrors.push(...result.errors);
    sourceTypes.push(connector.source_type as import('./marketSignalTypes').MarketSignalSourceType);
  }

  // Detect agency signals in the live batch before import
  await runAgencyPostingScan(allSignals).catch((err) =>
    console.warn('[companyNeedMarketAgent] agency scan (live) failed (non-fatal):', err),
  );

  const importSummary = await importMarketSignals(allSignals, {
    run_type:              'live_scan',
    source_types:          sourceTypes,
    live_sources_checked:  sourcesChecked,
    live_signals_found:    rawFound,
  });

  const { signals: evalSignals } = await evaluateDrafts();
  const staleDetected            = evalSignals.filter((s) => s.is_stale).length;
  const promotionRecommended     = evalSignals.filter((s) => s.promotion_recommended).length;
  const expiredDetected          = evalSignals.filter((s) => s.lifecycle === 'expired').length;
  const supplyGapBlocked         = evalSignals.filter((s) => s.lifecycle === 'hold_supply_gap').length;
  const supplyReadyPromotable    = evalSignals.filter((s) => s.lifecycle === 'ready_for_internal_promotion').length;

  const scanActionId = await logAction({
    action_type:  'company_need_daily_scan_completed',
    triggered_by: 'agent:market_agent_v1:live_scan',
    target_type:  'market_scan',
    target_id:    randomUUID(),
    status:       'completed',
    result: {
      run_type:               'live_scan',
      is_evaluation_only:     false,
      live_sources_checked:   sourcesChecked,
      live_signals_found:     rawFound,
      signals_imported:       importSummary.signals_imported,
      signals_updated:        importSummary.signals_updated,
      drafts_evaluated:       evalSignals.length,
      stale_detected:         staleDetected,
      promotion_recommended:  promotionRecommended,
      supply_gap_blocked:     supplyGapBlocked,
      supply_ready_promotable: supplyReadyPromotable,
      expired_detected:       expiredDetected,
      connector_errors:       connectorErrors.length > 0 ? connectorErrors : undefined,
    },
  });

  return {
    run_type:              'live_scan',
    is_evaluation_only:    false,
    scan_type:             'weekly',
    scanned_at:            importSummary.completed_at,
    drafts_evaluated:      evalSignals.length,
    stale_detected:        staleDetected,
    promotion_recommended: promotionRecommended,
    supply_gap_blocked:    supplyGapBlocked,
    supply_ready_promotable: supplyReadyPromotable,
    expired_detected:      expiredDetected,
    signals:               evalSignals,
    scan_action_id:        scanActionId,
    signals_imported:      importSummary.signals_imported,
    signals_updated:       importSummary.signals_updated,
    live_scan_attempted:   true,
    live_sources_checked:  sourcesChecked,
    import_run_available:  true,
    live_scan_available:   true,
  };
}

// Evaluate all drafts and return classified signals without triggering DB writes.
// Useful for OI integration — reads only, no log writes.
export async function refreshCompanyNeedDrafts(): Promise<MarketSignal[]> {
  const { signals } = await evaluateDrafts();
  return signals;
}

// Score a single opportunity from raw inputs — pure, no DB access.
export function scoreCompanyNeedOpportunity(input: ScoreInput): MarketOpportunityScore {
  return scoreMarketOpportunity(input);
}

// Classify the lifecycle state of a single draft — pure, no DB access.
export function classifyCompanyNeedLifecycle(input: LifecycleInput): MarketLifecycle {
  return classifyMarketLifecycle(input);
}

// Recommend internal promotion for all drafts that qualify.
// Returns a filtered list of signals where promotion is recommended.
// Does NOT promote — caller must invoke promoteDraft() and get founder confirmation.
export async function recommendInternalPromotion(): Promise<MarketSignal[]> {
  const signals = await refreshCompanyNeedDrafts();
  return signals.filter((s) => s.promotion_recommended);
}

// Log a market intelligence signal to system_actions.
export async function logMarketSignal(
  draftId: string,
  signal:  Omit<MarketSignal, 'draft_id'>,
): Promise<void> {
  await logAction({
    action_type:  'market_signal_detected',
    triggered_by: 'agent:market_agent_v1',
    target_type:  'company_need_draft',
    target_id:    draftId,
    status:       'completed',
    result: {
      company_name:  signal.company_name,
      lifecycle:     signal.lifecycle,
      composite:     signal.scores.composite,
      pain:          signal.scores.recruitment_pain_score,
      freshness:     signal.scores.freshness_score,
      recommended:   signal.recommended_action,
    },
  });
}
