import { getOpenCompanyNeeds } from './companyNeedStore';
import { getActiveIngestedDrivers } from './ingestedDriverStore';
import { buildShortlist } from './matchingEngine';
import { createShortlist } from './shortlistStore';
import { logAction } from './systemActions';
import { runContactAgent } from './contactAgent';
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

export async function runMatchingAgent(input: MatchAgentInput): Promise<MatchAgentResult> {
  const { needId, triggeredBy } = input;

  // ── 1. Fetch needs ────────────────────────────────────────────────────────
  let needs;
  try {
    needs = await getOpenCompanyNeeds();
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

  // ── 6. Trigger contact agent (fire-and-forget) ────────────────────────────
  void runContactAgent({ shortlistId: shortlistResult.shortlistId });

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
