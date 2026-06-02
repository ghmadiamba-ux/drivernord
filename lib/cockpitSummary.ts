import { db } from './db';
import type { DraftStatus } from './companyNeedDraft';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GovernanceSignals {
  real_open_needs:           number;
  matching_blocked:          boolean;
  external_contact_blocked:  boolean;
  sms_safe:                  boolean;
  pending_contact_suggested: number;
  dq_flagged_count:          number;
  duplicate_flagged_count:   number;
  last_daily_scan_at:        string | null;
  last_weekly_scan_at:       string | null;
  daily_scan_overdue:        boolean;
  weekly_scan_overdue:       boolean;
  promotion_candidates:      number;
  stale_signals:             number;
  outreach_approved_needs:   number;
  pilot_companies_active:    number;
  pilot_followup_overdue:    number;
  agent_contact_mode:        string;
  sms_configured:            boolean;
  migration_016_applied:     boolean;
  migration_017_applied:          boolean;
  queue_batch1_followup_due:     boolean;
  market_agent_run_type:         'evaluation_run' | 'import_run' | 'live_scan' | 'unknown';
  supply_gap_blocked:            number;
  supply_ready_promotable:       number;
  last_import_run_at:            string | null;
  last_live_scan_at:             string | null;
  signals_imported_last_run:     number;
  live_scan_available:           boolean;
  import_run_available:          boolean;
}

export type MatchingReadinessLabel = 'NO_SHORTLIST' | 'SHORTLIST_READY' | 'SHORTLIST_STALE';

export interface ActiveNeedOverview {
  need_id:           string;
  company_name:      string;
  need_type:         string;
  license:           string;
  domain:            string;
  region:            string;
  urgency:           string;
  top_match_score:   number | null;
  shortlisted_count: number;
  clean_candidates:  number;
  blocked_candidates: number;
  outreach_approved: boolean;
  matching_eligible: boolean;
  // Matching readiness — no driver PII
  has_shortlist:     boolean;
  readiness_label:   MatchingReadinessLabel;
  matched_at:        string | null; // when shortlist was created
}

export interface DraftItem {
  id:               string;
  company_name:     string;
  license:          string | null;
  domain:           string | null;
  region:           string | null;
  urgency:          string | null;
  draft_status:     DraftStatus;
  missing_fields:   string[];
  rejection_reason: string | null;
  updated_at:       string;
}

export interface MarketRecommendations {
  promotion_candidates: DraftItem[];
  recently_promoted:    DraftItem[];
  rejected_drafts:      DraftItem[];
  stale_drafts:         DraftItem[];
}

export interface CockpitSummaryPayload {
  generated_at: string;
  signals:      GovernanceSignals;
  active_needs: ActiveNeedOverview[];
  market:       MarketRecommendations;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOCKED_NEED_TYPES  = new Set(['simulation_only', 'archived_test']);
const MATCHABLE_NEED_TYPES = new Set(['active_public_need', 'matching_eligible', 'contact_ready_candidate']);
const OUTREACH_NEED_TYPES  = new Set(['outreach_approved']);

// ─── Main export ──────────────────────────────────────────────────────────────

export async function buildCockpitSummary(): Promise<CockpitSummaryPayload> {

  // ─ Phase 1: parallel base fetches ──────────────────────────────────────────
  const [
    needsRes,
    dqRes,
    dupRes,
    pendingCountRes,
    draftsRes,
    lastScanRes,
    lastWeeklyScanRes,
    pilotRes,
    outreachQueueRes,
    lastScanResultRes,
  ] = await Promise.all([
    db.from('company_needs')
      .select('id, company_id, need_type, license_required, domain_required, location_region, urgency, companies(name)')
      .eq('status', 'open'),
    db.from('system_actions')
      .select('target_id')
      .eq('action_type', 'data_quality_issue'),
    db.from('system_actions')
      .select('input')
      .eq('action_type', 'driver_duplicate_detected'),
    db.from('system_actions')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'contact_suggested')
      .eq('status', 'pending'),
    db.from('company_need_drafts')
      .select('id, draft_status, target_id, license_required, domain_required, location_region, urgency, missing_fields, rejection_reason, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100),
    db.from('system_actions')
      .select('created_at')
      .eq('action_type', 'company_need_daily_scan_completed')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1),
    db.from('system_actions')
      .select('created_at')
      .eq('action_type', 'company_need_weekly_scan_completed')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1),
    db.from('pilot_company_relationships')
      .select('relationship_status, next_action_date, do_not_contact_reason'),
    db.from('outreach_email_queue')
      .select('status, risk_notes, scheduled_send_at, reply_detected_at'),
    db.from('system_actions')
      .select('result')
      .eq('action_type', 'company_need_daily_scan_completed')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const needRows         = (needsRes.data         ?? []) as Record<string, unknown>[];
  const dqRows           = (dqRes.data            ?? []) as Record<string, unknown>[];
  const dupRows          = (dupRes.data           ?? []) as Record<string, unknown>[];
  const draftRows        = (draftsRes.data        ?? []) as Record<string, unknown>[];
  const lastScanRows     = (lastScanRes.data      ?? []) as Record<string, unknown>[];
  const lastWeeklyScanRows = (lastWeeklyScanRes.data ?? []) as Record<string, unknown>[];
  // Migration 016 not applied when pilotRes returns a column-missing error
  const migration016Applied = !pilotRes.error?.message?.includes('do_not_contact_reason') &&
                              !pilotRes.error?.message?.includes('does not exist');
  const pilotRows        = (pilotRes.data         ?? []) as Record<string, unknown>[];
  // Migration 017 not applied when outreach_email_queue table does not exist
  const migration017Applied = !outreachQueueRes.error?.message?.includes('does not exist') &&
                              !outreachQueueRes.error?.message?.includes('relation');
  const oeqRows = (outreachQueueRes.data ?? []) as Record<string, unknown>[];
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const queueBatch1FollowupDue = oeqRows.some((r) =>
    r.status === 'sent' &&
    typeof r.risk_notes === 'string' &&
    r.risk_notes.startsWith('MANUAL_SMTP_BATCH_1') &&
    r.reply_detected_at === null &&
    r.scheduled_send_at !== null &&
    (r.scheduled_send_at as string) <= threeDaysFromNow,
  );

  // Extract supply + import observability from last scan result
  const lastScanResultRow = ((lastScanResultRes.data ?? []) as Record<string, unknown>[])[0];
  const lastScanResult    = (lastScanResultRow?.result ?? {}) as Record<string, unknown>;
  const rawRunType = lastScanResult.run_type as string | undefined;
  const marketAgentRunType: 'evaluation_run' | 'import_run' | 'live_scan' | 'unknown' =
    rawRunType === 'evaluation_run' ? 'evaluation_run'
    : rawRunType === 'import_run'   ? 'import_run'
    : rawRunType === 'live_scan'    ? 'live_scan'
    :                                 'unknown';
  const supplyGapBlocked       = Number(lastScanResult.supply_gap_blocked      ?? 0);
  const supplyReadyPromotable  = Number(lastScanResult.supply_ready_promotable ?? 0);
  const signalsImportedLastRun = Number(lastScanResult.signals_imported        ?? 0);
  // last_import_run_at and last_live_scan_at from separate system_actions queries
  // (derived from the same last scan result row for V1 — separate queries in V2)
  const lastScanCreatedAt    = lastScanResultRow?.created_at as string | null ?? null;
  const lastImportRunAt      = (rawRunType === 'import_run' || rawRunType === 'live_scan') ? lastScanCreatedAt : null;
  const lastLiveScanAt       = rawRunType === 'live_scan' ? lastScanCreatedAt : null;
  const liveScanAvailable    = process.env.PLATSBANKEN_SCAN_ENABLED === 'true';
  const importRunAvailable   = true; // always true — POST /api/agent/market-import exists

  // ─ Derived blocker sets ────────────────────────────────────────────────────
  const dqDriverIds = new Set(
    dqRows.map((r) => r.target_id as string).filter(Boolean),
  );
  const dupDriverIds = new Set(
    dupRows
      .map((r) => ((r.input ?? {}) as Record<string, unknown>).new_id as string)
      .filter(Boolean),
  );
  const blockedDriverIds = new Set([...dqDriverIds, ...dupDriverIds]);

  // ─ Filter real needs (exclude simulation / test) ──────────────────────────
  const realNeeds = needRows.filter((n) => !BLOCKED_NEED_TYPES.has(n.need_type as string));
  const needIds   = realNeeds.map((n) => n.id as string).filter(Boolean);

  // ─ Phase 2: shortlists + draft target names in parallel ───────────────────
  const draftTargetIds = [
    ...new Set(draftRows.map((d) => d.target_id as string).filter(Boolean)),
  ];

  const [shortlistsRes, targetNamesRes] = await Promise.all([
    needIds.length > 0
      ? db.from('shortlists').select('id, company_need_id, created_at').in('company_need_id', needIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    draftTargetIds.length > 0
      ? db.from('company_research_targets').select('id, company_name').in('id', draftTargetIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  const shortlistRows = (shortlistsRes.data ?? []) as Record<string, unknown>[];
  const targetNameMap = new Map<string, string>(
    ((targetNamesRes.data ?? []) as Record<string, unknown>[]).map(
      (t) => [t.id as string, t.company_name as string],
    ),
  );

  // ─ Phase 3: shortlist entries ─────────────────────────────────────────────
  const shortlistIds = shortlistRows.map((sl) => sl.id as string).filter(Boolean);
  let allEntries: Array<{ shortlist_id: string; driver_id: string; match_score: number }> = [];

  if (shortlistIds.length > 0) {
    const entriesRes = await db
      .from('shortlist_entries')
      .select('shortlist_id, driver_id, match_score')
      .in('shortlist_id', shortlistIds);
    allEntries = ((entriesRes.data ?? []) as Record<string, unknown>[]).map((e) => ({
      shortlist_id: e.shortlist_id as string,
      driver_id:    e.driver_id    as string,
      match_score:  e.match_score  as number,
    }));
  }

  // ─ Build need-id → entries map ─────────────────────────────────────────────
  const shortlistToNeed     = new Map<string, string>();  // shortlist_id → need_id
  const needToMatchedAt     = new Map<string, string>();  // need_id → shortlist created_at
  const STALE_SHORTLIST_MS  = 7 * 24 * 60 * 60 * 1000;

  for (const sl of shortlistRows) {
    shortlistToNeed.set(sl.id as string, sl.company_need_id as string);
    needToMatchedAt.set(sl.company_need_id as string, sl.created_at as string);
  }

  const needEntries = new Map<string, Array<{ driver_id: string; match_score: number }>>();
  for (const e of allEntries) {
    const needId = shortlistToNeed.get(e.shortlist_id);
    if (!needId) continue;
    if (!needEntries.has(needId)) needEntries.set(needId, []);
    needEntries.get(needId)!.push({ driver_id: e.driver_id, match_score: e.match_score });
  }

  // ─ Build active needs overview ─────────────────────────────────────────────
  const activeNeeds: ActiveNeedOverview[] = realNeeds.map((n) => {
    const companyRaw  = n.companies as Record<string, unknown> | null;
    const companyName = (companyRaw?.name as string) ?? '(unknown)';
    const entries     = needEntries.get(n.id as string) ?? [];
    const scores      = entries.map((e) => e.match_score);

    const cleanCount   = entries.filter((e) => !blockedDriverIds.has(e.driver_id)).length;
    const blockedCount = entries.filter((e) => blockedDriverIds.has(e.driver_id)).length;

    const needType   = n.need_type as string;
    const matchedAt  = needToMatchedAt.get(n.id as string) ?? null;
    const hasShortlist = entries.length > 0 || matchedAt !== null;
    const readinessLabel: MatchingReadinessLabel =
      !hasShortlist ? 'NO_SHORTLIST'
      : matchedAt && (Date.now() - new Date(matchedAt).getTime()) > STALE_SHORTLIST_MS
        ? 'SHORTLIST_STALE'
        : 'SHORTLIST_READY';

    return {
      need_id:           n.id             as string,
      company_name:      companyName,
      need_type:         needType,
      license:           n.license_required as string,
      domain:            n.domain_required  as string,
      region:            n.location_region  as string,
      urgency:           n.urgency          as string,
      top_match_score:   scores.length > 0 ? Math.max(...scores) : null,
      shortlisted_count: entries.length,
      clean_candidates:  cleanCount,
      blocked_candidates: blockedCount,
      outreach_approved: OUTREACH_NEED_TYPES.has(needType),
      matching_eligible: MATCHABLE_NEED_TYPES.has(needType),
      has_shortlist:     hasShortlist,
      readiness_label:   readinessLabel,
      matched_at:        matchedAt,
    };
  });

  // ─ Market recommendations ─────────────────────────────────────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  function toDraftItem(d: Record<string, unknown>): DraftItem {
    return {
      id:               d.id               as string,
      company_name:     targetNameMap.get(d.target_id as string) ?? '(unknown)',
      license:          (d.license_required as string | null) ?? null,
      domain:           (d.domain_required  as string | null) ?? null,
      region:           (d.location_region  as string | null) ?? null,
      urgency:          (d.urgency          as string | null) ?? null,
      draft_status:     d.draft_status      as DraftStatus,
      missing_fields:   (d.missing_fields   as string[]) ?? [],
      rejection_reason: (d.rejection_reason as string | null) ?? null,
      updated_at:       d.updated_at        as string,
    };
  }

  const market: MarketRecommendations = {
    promotion_candidates: draftRows
      .filter((d) => d.draft_status === 'ready_for_review')
      .map(toDraftItem),
    recently_promoted: draftRows
      .filter((d) => d.draft_status === 'promoted' && (d.updated_at as string) >= sevenDaysAgo)
      .map(toDraftItem),
    rejected_drafts: draftRows
      .filter((d) => d.draft_status === 'rejected')
      .slice(0, 10)
      .map(toDraftItem),
    stale_drafts: draftRows
      .filter((d) => d.draft_status === 'incomplete')
      .map(toDraftItem),
  };

  // ─ Signals ────────────────────────────────────────────────────────────────
  const matchEligibleCount = realNeeds.filter(
    (n) => MATCHABLE_NEED_TYPES.has(n.need_type as string),
  ).length;

  const outreachApprovedCount = realNeeds.filter(
    (n) => OUTREACH_NEED_TYPES.has(n.need_type as string),
  ).length;

  const hasSimulationNeeds = needRows.some((n) => n.need_type === 'simulation_only');
  const smsSafe            = !hasSimulationNeeds;

  const terminalStatuses = new Set(['pilot_lost', 'pilot_completed', 'do_not_contact', 'nurture_later']);
  const nowIso = new Date().toISOString();

  const pilotCompaniesActive = pilotRows.filter(
    (r) => !terminalStatuses.has(r.relationship_status as string),
  ).length;

  const pilotFollowupOverdue = pilotRows.filter(
    (r) =>
      r.relationship_status === 'contacted' &&
      r.next_action_date !== null &&
      (r.next_action_date as string) < nowIso,
  ).length;

  const lastDailyScanAt  = (lastScanRows[0]?.created_at as string | undefined) ?? null;
  const lastWeeklyScanAt = (lastWeeklyScanRows[0]?.created_at as string | undefined) ?? null;

  const DAILY_OVERDUE_MS  = 25 * 60 * 60 * 1000; // 25h — allows for cron jitter
  const WEEKLY_OVERDUE_MS = 8  * 24 * 60 * 60 * 1000; // 8 days

  const dailyScanOverdue  = !lastDailyScanAt  || (Date.now() - new Date(lastDailyScanAt).getTime())  > DAILY_OVERDUE_MS;
  const weeklyScanOverdue = !lastWeeklyScanAt || (Date.now() - new Date(lastWeeklyScanAt).getTime()) > WEEKLY_OVERDUE_MS;

  const agentContactMode = process.env.AGENT_CONTACT_MODE ?? 'suggest';
  const smsConfigured    = Boolean(process.env.SMS_API_KEY && process.env.SMS_API_SECRET);

  const signals: GovernanceSignals = {
    real_open_needs:           realNeeds.length,
    matching_blocked:          !smsSafe || matchEligibleCount === 0,
    external_contact_blocked:  outreachApprovedCount === 0,
    sms_safe:                  smsSafe,
    pending_contact_suggested: pendingCountRes.count ?? 0,
    dq_flagged_count:          dqRows.length,
    duplicate_flagged_count:   dupRows.length,
    last_daily_scan_at:        lastDailyScanAt,
    last_weekly_scan_at:       lastWeeklyScanAt,
    daily_scan_overdue:        dailyScanOverdue,
    weekly_scan_overdue:       weeklyScanOverdue,
    promotion_candidates:      market.promotion_candidates.length,
    stale_signals:             market.stale_drafts.length,
    outreach_approved_needs:   outreachApprovedCount,
    pilot_companies_active:    pilotCompaniesActive,
    pilot_followup_overdue:    pilotFollowupOverdue,
    agent_contact_mode:        agentContactMode,
    sms_configured:            smsConfigured,
    migration_016_applied:     migration016Applied,
    migration_017_applied:          migration017Applied,
    queue_batch1_followup_due:     queueBatch1FollowupDue,
    market_agent_run_type:         marketAgentRunType,
    supply_gap_blocked:            supplyGapBlocked,
    supply_ready_promotable:       supplyReadyPromotable,
    last_import_run_at:            lastImportRunAt,
    last_live_scan_at:             lastLiveScanAt,
    signals_imported_last_run:     signalsImportedLastRun,
    live_scan_available:           liveScanAvailable,
    import_run_available:          importRunAvailable,
  };

  return {
    generated_at: new Date().toISOString(),
    signals,
    active_needs: activeNeeds,
    market,
  };
}
