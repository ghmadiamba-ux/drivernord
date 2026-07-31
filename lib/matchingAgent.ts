import { getMatchableOpenCompanyNeeds, getCompanyNamesForIds } from './companyNeedStore';
import { getActiveIngestedDrivers } from './ingestedDriverStore';
import { buildShortlist } from './matchingEngine';
import { createShortlist, getShortlistByNeedId } from './shortlistStore';
import { logAction } from './systemActions';
import { runContactAgent } from './contactAgent';
import { isDoNotContact } from './doNotContact';
import type { MatchNeed } from './matchScore';
import type { License } from '../types/lead';
import type { ShortlistEntry, RejectedDriver } from './matchingEngine';

export interface MatchAgentInput {
  needId:      string;
  triggeredBy: string;
}

export type MatchAgentResult =
  | {
      ok:                 true;
      shortlistId:        string;
      entryIdsByDriverId: Record<string, string>;
      shortlisted:        ShortlistEntry[];
      rejected:           RejectedDriver[];
      totalCandidates:    number;
      totalShortlisted:   number;
      summary:            string;
    }
  | { ok: false; error: string };

// Idempotent shortlist ensure: returns the existing shortlist if fresh (< 7 days),
// otherwise runs matching to create a new one.
// Zero-match needs are handled gracefully — matching succeeds with empty shortlist.
const SHORTLIST_STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function ensureShortlistForNeed(needId: string): Promise<MatchAgentResult> {
  const existing = await getShortlistByNeedId(needId);
  if (existing) {
    const ageMs = Date.now() - new Date(existing.created_at).getTime();
    if (ageMs < SHORTLIST_STALE_MS) {
      // Shortlist exists and is fresh — return idempotent result without re-matching
      return {
        ok:                 true,
        shortlistId:        existing.id,
        entryIdsByDriverId: {},
        shortlisted:        [],
        rejected:           [],
        totalCandidates:    existing.total_shortlisted,
        totalShortlisted:   existing.total_shortlisted,
        summary:            `existing_shortlist:fresh (${existing.total_shortlisted} entries, ${Math.round(ageMs / 3_600_000)}h old)`,
      };
    }
  }
  // No shortlist or stale — run full matching
  return runMatchingAgent({ needId, triggeredBy: 'agent:ensure_shortlist_v1' });
}

export async function runMatchingAgent(input: MatchAgentInput): Promise<MatchAgentResult> {
  const { needId, triggeredBy } = input;

  // ── 1. Fetch needs ────────────────────────────────────────────────────────
  let needs;
  try {
    needs = await getMatchableOpenCompanyNeeds();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await logAction({
      action_type:  'match_run',
      triggered_by: triggeredBy,
      target_type:  'company_need',
      target_id:    needId,
      status:       'failed',
      input:        { need_id: needId },
      error,
    });
    return { ok: false, error };
  }

  const needRow = needs.find((n) => n.id === needId);
  if (!needRow) {
    return { ok: false, error: 'need_not_found' };
  }

  const need: MatchNeed = {
    license_required:   needRow.license_required as License,
    domain_required:    needRow.domain_required,
    domain_preferred:   needRow.domain_preferred,
    location_region:    needRow.location_region,
    relocation_allowed: needRow.relocation_allowed,
    shift_type:         needRow.shift_type,
    urgency:            needRow.urgency,
  };

  // ── 2. Fetch driver pool ──────────────────────────────────────────────────
  let drivers;
  try {
    drivers = await getActiveIngestedDrivers();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await logAction({
      action_type:  'match_run',
      triggered_by: triggeredBy,
      target_type:  'company_need',
      target_id:    needId,
      status:       'failed',
      input:        { need_id: needId },
      error,
    });
    return { ok: false, error };
  }

  // ── 3. Score and rank ─────────────────────────────────────────────────────
  const result = buildShortlist(drivers, need);

  // ── 4. Persist shortlist ──────────────────────────────────────────────────
  let shortlistResult;
  try {
    shortlistResult = await createShortlist(needId, result);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await logAction({
      action_type:  'match_run',
      triggered_by: triggeredBy,
      target_type:  'company_need',
      target_id:    needId,
      status:       'failed',
      input:        { need_id: needId, pool_size: drivers.length },
      error,
    });
    return { ok: false, error };
  }

  // ── 5. Log ────────────────────────────────────────────────────────────────
  await logAction({
    action_type:  'match_run',
    triggered_by: triggeredBy,
    target_type:  'company_need',
    target_id:    needId,
    status:       'completed',
    input:        { need_id: needId, pool_size: drivers.length },
    result: {
      shortlist_id:      shortlistResult.shortlistId,
      total_shortlisted: result.totalShortlisted,
      total_candidates:  result.totalCandidates,
    },
  });

  await logAction({
    action_type:  'shortlist_created',
    triggered_by: triggeredBy,
    target_type:  'shortlist',
    target_id:    shortlistResult.shortlistId,
    status:       'completed',
    input:        { company_need_id: needId },
    result: {
      total_shortlisted: result.totalShortlisted,
      total_candidates:  result.totalCandidates,
    },
  });

  // ── 6. Trigger contact agent (fire-and-forget, errors never surface to caller) ─
  void runContactAgent({ shortlistId: shortlistResult.shortlistId }).catch((err) =>
    console.error('[matchingAgent] contactAgent fire-and-forget error:', String(err)),
  );

  return {
    ok:                 true,
    shortlistId:        shortlistResult.shortlistId,
    entryIdsByDriverId: shortlistResult.entryIdsByDriverId,
    shortlisted:        result.shortlisted,
    rejected:           result.rejected,
    totalCandidates:    result.totalCandidates,
    totalShortlisted:   result.totalShortlisted,
    summary:            result.summary,
  };
}

// ── Stale shortlist refresh ───────────────────────────────────────────────────

export interface ShortlistRefreshResult {
  run_type:               'shortlist_refresh';
  needs_checked:          number;
  stale_needs_found:      number;
  shortlists_refreshed:   number;
  skipped_do_not_contact: number;
  skipped_fresh:          number;
  errors:                 string[];
}

// Scans every matchable open company need and re-runs matching for any whose
// shortlist is absent or older than SHORTLIST_STALE_MS.
// Never creates outreach — contact agent in suggest mode only logs suggestions.
// Safe to call from cron: idempotent, no PII in logs, no side-effects beyond DB writes.
export async function refreshStaleShortlists(): Promise<ShortlistRefreshResult> {
  const summary: ShortlistRefreshResult = {
    run_type:               'shortlist_refresh',
    needs_checked:          0,
    stale_needs_found:      0,
    shortlists_refreshed:   0,
    skipped_do_not_contact: 0,
    skipped_fresh:          0,
    errors:                 [],
  };

  // ── 1. Fetch all matchable open needs ────────────────────────────────────────
  let needs;
  try {
    needs = await getMatchableOpenCompanyNeeds();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    summary.errors.push(`fetch_needs: ${error}`);
    await logAction({
      action_type:  'shortlist_refresh',
      triggered_by: 'cron:shortlist_refresh_v1',
      target_type:  'company_need',
      target_id:    'all',
      status:       'failed',
      error,
    });
    return summary;
  }

  summary.needs_checked = needs.length;

  // ── 2. Resolve company names (one round-trip) for do-not-contact checks ─────
  const companyIds = [...new Set(needs.map((n) => n.company_id))];
  let companyNameMap: Record<string, string> = {};
  try {
    companyNameMap = await getCompanyNamesForIds(companyIds);
  } catch (_) {
    // Non-fatal: hardcoded exclusions still apply even without name resolution
  }

  // ── 3. Per-need: DNC guard → staleness check → refresh ──────────────────────
  for (const need of needs) {
    const companyName = companyNameMap[need.company_id] ?? '';

    if (isDoNotContact({ company_name: companyName })) {
      summary.skipped_do_not_contact++;
      continue;
    }

    // Check whether the existing shortlist is still fresh
    let existing: { id: string; created_at: string; total_shortlisted: number } | null = null;
    try {
      existing = await getShortlistByNeedId(need.id);
    } catch (_) {
      // Treat as stale if lookup fails — ensureShortlistForNeed handles it
    }

    if (existing) {
      const ageMs = Date.now() - new Date(existing.created_at).getTime();
      if (ageMs < SHORTLIST_STALE_MS) {
        summary.skipped_fresh++;
        continue;
      }
    }

    summary.stale_needs_found++;

    try {
      const refreshed = await ensureShortlistForNeed(need.id);
      if (refreshed.ok) {
        summary.shortlists_refreshed++;
      } else {
        summary.errors.push(`need:${need.id} error:${refreshed.error}`);
      }
    } catch (err) {
      summary.errors.push(
        `need:${need.id} error:${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ── 4. Log the refresh run (no PII — only counts and UUIDs) ─────────────────
  await logAction({
    action_type:  'shortlist_refresh',
    triggered_by: 'cron:shortlist_refresh_v1',
    target_type:  'company_need',
    target_id:    'all',
    status:       'completed',
    result: {
      needs_checked:          summary.needs_checked,
      stale_needs_found:      summary.stale_needs_found,
      shortlists_refreshed:   summary.shortlists_refreshed,
      skipped_do_not_contact: summary.skipped_do_not_contact,
      skipped_fresh:          summary.skipped_fresh,
      error_count:            summary.errors.length,
    },
  });

  return summary;
}
