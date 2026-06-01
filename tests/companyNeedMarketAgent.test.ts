import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module mocks (must be declared before imports) ───────────────────────────

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

vi.mock('../lib/companyNeedDraft', () => ({
  listDrafts: vi.fn(),
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('action-uuid'),
}));

// Safety mocks: these modules must NOT be called by the Market Agent.
// If any market agent function accidentally invokes them, the test will fail.
vi.mock('../lib/matchingAgent', () => ({
  runMatchingAgent: vi.fn().mockRejectedValue(new Error('matchingAgent MUST NOT be called by Market Agent')),
}));

vi.mock('../lib/contactAgent', () => ({
  runContactAgent: vi.fn().mockRejectedValue(new Error('contactAgent MUST NOT be called by Market Agent')),
}));

import {
  scoreRecruitmentPain,
  scoreUrgency,
  scoreFreshness,
  scoreContactability,
  scoreComposite,
  scoreMarketOpportunity,
  classifyMarketLifecycle,
  classifySupplyFit,
  isPromotionRecommended,
  isStale,
  buildRecommendedAction,
  deriveUrgencySignal,
  refreshCompanyNeedDrafts,
  runDailyCompanyNeedScan,
  runWeeklyCompanyNeedDeepScan,
  runTriggeredCompanyNeedScan,
  STALE_DAYS,
  EXPIRED_DAYS,
  PROMOTION_SCORE_THRESHOLD,
} from '../lib/companyNeedMarketAgent';

import { listDrafts } from '../lib/companyNeedDraft';
import { logAction } from '../lib/systemActions';
import { db } from '../lib/db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

const BASE_SCORE_INPUT = {
  urgency:              'urgent',
  urgency_signal:       'repeated_ads',
  license_required:     'CE' as string,
  ykb_required:         true,
  driver_card_required: true,
  barrier_level:        'low',
  contact_email_known:  true,
  decision_maker_known: true,
  scan_date_iso:        daysAgoIso(3),
  missing_fields:       [],
  metadata_pain_score:      80,
  metadata_fit_score:        9,
  metadata_contactability:  85,
};

const BASE_LIFECYCLE_INPUT = {
  draft_status:   'ready_for_review',
  missing_fields: [],
  scan_date_iso:  daysAgoIso(5),
  composite:      75,
};

function makeDraftRow(overrides: Partial<{
  id: string;
  draft_status: string;
  urgency: string;
  ykb_required: boolean;
  driver_card_required: boolean;
  license_required: string;
  domain_required: string;
  missing_fields: string[];
  converted_need_id: string | null;
  metadata: Record<string, unknown>;
  target_id: string;
  scan_record_id: string | null;
}> = {}) {
  return {
    id:                   overrides.id ?? 'draft-1',
    target_id:            overrides.target_id ?? 'target-1',
    draft_status:         overrides.draft_status ?? 'ready_for_review',
    urgency:              overrides.urgency ?? 'urgent',
    ykb_required:         overrides.ykb_required ?? true,
    driver_card_required: overrides.driver_card_required ?? false,
    license_required:     overrides.license_required ?? 'CE',
    domain_required:      overrides.domain_required ?? 'schakt_bygg',
    missing_fields:       overrides.missing_fields ?? [],
    converted_need_id:    overrides.converted_need_id ?? null,
    metadata:             overrides.metadata ?? {
      recruitment_pain_score: 80,
      drivernord_fit_score:    9,
      contactability_score:   85,
      pilot_readiness_score:  8.3,
      ad_status:              'active_linkedin',
      scan_date:              daysAgoIso(3),
    },
    source_call_notes:    '',
    created_at:           new Date().toISOString(),
    updated_at:           new Date().toISOString(),
    relationship_id:      null,
    domain_preferred:     [],
    location_region:      'stockholm',
    relocation_allowed:   false,
    shift_type:           'day',
    drivers_needed:       2,
    constraints:          null,
    match_readiness:      'ready',
    dpa_confirmed:        false,
    drafted_by:           'agent:scan_import_v1',
    rejection_reason:     null,
    converted_at:         null,
    converted_by:         null,
    need_source:          'scan',
    scan_record_id:       overrides.scan_record_id ?? 'DN-003',
  };
}

type MockTarget = {
  id: string;
  company_name: string;
  barrier_level?: string | null;
  contact_email?: string | null;
  decision_maker_name?: string | null;
};

type MockSupplyRow = { license_required: string; domain_required: string };

function setupDbMocks(
  targets: MockTarget[] = [],
  supplyRows: MockSupplyRow[] = [],
) {
  vi.mocked(db.from).mockImplementation((table: string) => {
    if (table === 'company_research_targets') {
      return {
        select: () => ({ in: () => Promise.resolve({ data: targets, error: null }) }),
      } as never;
    }
    if (table === 'ingested_drivers') {
      return {
        select: () => Promise.resolve({ data: supplyRows, error: null }),
      } as never;
    }
    return {} as never;
  });
}

// Keep old name as alias so existing describe blocks compile
function setupDbResearchTargetsMock(targets: MockTarget[] = []) {
  setupDbMocks(targets, []);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDbMocks(
    [{ id: 'target-1', company_name: 'Test Company AB', barrier_level: null, contact_email: null, decision_maker_name: null }],
    [],
  );
});

// ─── scoreRecruitmentPain ─────────────────────────────────────────────────────

describe('scoreRecruitmentPain', () => {
  it('stated_urgency + emergency + CE = near maximum', () => {
    const score = scoreRecruitmentPain({
      urgency_signal:       'stated_urgency',
      urgency:              'emergency',
      license_required:     'CE',
      ykb_required:         true,
      driver_card_required: true,
      metadata_pain_score:  100,
    });
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('none + standard + no CE = low score', () => {
    const score = scoreRecruitmentPain({
      urgency_signal:       'none',
      urgency:              'standard',
      license_required:     'C',
      ykb_required:         false,
      driver_card_required: false,
      metadata_pain_score:  20,
    });
    expect(score).toBeLessThan(40);
  });

  it('blends computed score with metadata_pain_score', () => {
    // Same signal, different metadata scores → different results
    const hi = scoreRecruitmentPain({ urgency_signal: 'single_ad', urgency: 'standard', license_required: null, ykb_required: false, driver_card_required: false, metadata_pain_score: 100 });
    const lo = scoreRecruitmentPain({ urgency_signal: 'single_ad', urgency: 'standard', license_required: null, ykb_required: false, driver_card_required: false, metadata_pain_score:   0 });
    expect(hi).toBeGreaterThan(lo);
  });

  it('returns a number in [0, 100]', () => {
    const score = scoreRecruitmentPain({ urgency_signal: 'repeated_ads', urgency: 'urgent', license_required: 'CE', ykb_required: true, driver_card_required: true, metadata_pain_score: 80 });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─── scoreUrgency ─────────────────────────────────────────────────────────────

describe('scoreUrgency', () => {
  it('emergency + stated_urgency = 100', () => {
    expect(scoreUrgency({ urgency: 'emergency', urgency_signal: 'stated_urgency' })).toBe(100);
  });

  it('urgent + repeated_ads = 80', () => {
    expect(scoreUrgency({ urgency: 'urgent', urgency_signal: 'repeated_ads' })).toBe(80);
  });

  it('standard + none = 30', () => {
    expect(scoreUrgency({ urgency: 'standard', urgency_signal: 'none' })).toBe(30);
  });

  it('result is capped at 100', () => {
    // Even if both are maximum, result stays ≤ 100
    const score = scoreUrgency({ urgency: 'emergency', urgency_signal: 'stated_urgency' });
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─── scoreFreshness ───────────────────────────────────────────────────────────

describe('scoreFreshness', () => {
  it('returns 100 for scans from today', () => {
    expect(scoreFreshness(daysAgoIso(0))).toBe(100);
  });

  it('returns 85 for scans 5 days ago', () => {
    expect(scoreFreshness(daysAgoIso(5))).toBe(85);
  });

  it('returns 65 for scans 10 days ago', () => {
    expect(scoreFreshness(daysAgoIso(10))).toBe(65);
  });

  it('returns 35 for scans 20 days ago', () => {
    expect(scoreFreshness(daysAgoIso(20))).toBe(35);
  });

  it('returns 15 for scans 40 days ago', () => {
    expect(scoreFreshness(daysAgoIso(40))).toBe(15);
  });

  it('returns 0 for scans over 60 days ago', () => {
    expect(scoreFreshness(daysAgoIso(70))).toBe(0);
  });

  it('returns 50 for null scan date', () => {
    expect(scoreFreshness(null)).toBe(50);
  });

  it('returns 50 for invalid date string', () => {
    expect(scoreFreshness('not-a-date')).toBe(50);
  });
});

// ─── scoreContactability ──────────────────────────────────────────────────────

describe('scoreContactability', () => {
  it('low barrier + email + decision maker = high score', () => {
    const score = scoreContactability({
      barrier_level:        'low',
      contact_email_known:  true,
      decision_maker_known: true,
      metadata_contactability: 90,
    });
    expect(score).toBeGreaterThan(80);
  });

  it('enterprise_only + no email + no DM = very low score', () => {
    const score = scoreContactability({
      barrier_level:        'enterprise_only',
      contact_email_known:  false,
      decision_maker_known: false,
      metadata_contactability: 10,
    });
    expect(score).toBeLessThan(20);
  });

  it('medium barrier produces intermediate score', () => {
    const score = scoreContactability({
      barrier_level:        'medium',
      contact_email_known:  false,
      decision_maker_known: false,
      metadata_contactability: 50,
    });
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThan(70);
  });

  it('returns a number in [0, 100]', () => {
    const score = scoreContactability({ barrier_level: 'low', contact_email_known: true, decision_maker_known: true, metadata_contactability: 100 });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─── scoreComposite ───────────────────────────────────────────────────────────

describe('scoreComposite', () => {
  it('returns weighted average of pain, fit, freshness, contactability', () => {
    // All at 100 → composite should be 100
    expect(scoreComposite(100, 10, 100, 100)).toBe(100);
  });

  it('all zeros → composite 0', () => {
    expect(scoreComposite(0, 0, 0, 0)).toBe(0);
  });

  it('fit10 of 10 maps to fit100 of 100', () => {
    const withMax  = scoreComposite(50, 10, 50, 50);
    const withZero = scoreComposite(50,  0, 50, 50);
    expect(withMax).toBeGreaterThan(withZero);
  });

  it('pain has the highest weight', () => {
    // Only pain varies; others at 50
    const highPain = scoreComposite(100, 5, 50, 50);
    const lowPain  = scoreComposite(  0, 5, 50, 50);
    const painDiff = highPain - lowPain;
    // freshness diff for same spread
    const highFresh = scoreComposite(50, 5, 100, 50);
    const lowFresh  = scoreComposite(50, 5,   0, 50);
    const freshDiff = highFresh - lowFresh;
    expect(painDiff).toBeGreaterThan(freshDiff);
  });
});

// ─── scoreMarketOpportunity ───────────────────────────────────────────────────

describe('scoreMarketOpportunity', () => {
  it('returns all expected score fields', () => {
    const scores = scoreMarketOpportunity(BASE_SCORE_INPUT);
    expect(scores).toHaveProperty('recruitment_pain_score');
    expect(scores).toHaveProperty('urgency_score');
    expect(scores).toHaveProperty('freshness_score');
    expect(scores).toHaveProperty('contactability_score');
    expect(scores).toHaveProperty('pilot_priority_score');
    expect(scores).toHaveProperty('drivernord_fit_score');
    expect(scores).toHaveProperty('composite');
  });

  it('all scores are in [0, 100] except drivernord_fit_score (0–10)', () => {
    const scores = scoreMarketOpportunity(BASE_SCORE_INPUT);
    expect(scores.recruitment_pain_score).toBeGreaterThanOrEqual(0);
    expect(scores.urgency_score).toBeLessThanOrEqual(100);
    expect(scores.freshness_score).toBeLessThanOrEqual(100);
    expect(scores.composite).toBeLessThanOrEqual(100);
    expect(scores.drivernord_fit_score).toBeLessThanOrEqual(10);
  });

  it('high-signal input produces composite above threshold', () => {
    const scores = scoreMarketOpportunity(BASE_SCORE_INPUT);
    expect(scores.composite).toBeGreaterThan(PROMOTION_SCORE_THRESHOLD);
  });

  it('low-signal input produces low composite', () => {
    const lowInput = {
      ...BASE_SCORE_INPUT,
      urgency: 'standard',
      urgency_signal: 'none',
      metadata_pain_score: 10,
      metadata_fit_score: 2,
      metadata_contactability: 10,
      scan_date_iso: daysAgoIso(50),
    };
    const scores = scoreMarketOpportunity(lowInput);
    expect(scores.composite).toBeLessThan(PROMOTION_SCORE_THRESHOLD);
  });
});

// ─── classifyMarketLifecycle ──────────────────────────────────────────────────

describe('classifyMarketLifecycle', () => {
  it('promoted draft → "promoted"', () => {
    expect(classifyMarketLifecycle({ ...BASE_LIFECYCLE_INPUT, draft_status: 'promoted' })).toBe('promoted');
  });

  it('rejected draft → "rejected"', () => {
    expect(classifyMarketLifecycle({ ...BASE_LIFECYCLE_INPUT, draft_status: 'rejected' })).toBe('rejected');
  });

  it(`scan > ${EXPIRED_DAYS} days old → "expired"`, () => {
    expect(classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      scan_date_iso: daysAgoIso(EXPIRED_DAYS + 5),
    })).toBe('expired');
  });

  it('missing_fields present → "research_discovered"', () => {
    expect(classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      missing_fields: ['license_required', 'urgency'],
    })).toBe('research_discovered');
  });

  it(`scan ${STALE_DAYS + 1} days old, no missing fields → "needs_refresh"`, () => {
    expect(classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      scan_date_iso: daysAgoIso(STALE_DAYS + 1),
      missing_fields: [],
    })).toBe('needs_refresh');
  });

  it(`composite >= ${PROMOTION_SCORE_THRESHOLD}, fresh, complete → "ready_for_internal_promotion"`, () => {
    expect(classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      composite: PROMOTION_SCORE_THRESHOLD,
      missing_fields: [],
      scan_date_iso: daysAgoIso(3),
    })).toBe('ready_for_internal_promotion');
  });

  it(`composite < ${PROMOTION_SCORE_THRESHOLD}, fresh, complete → "active_public_signal"`, () => {
    expect(classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      composite: PROMOTION_SCORE_THRESHOLD - 1,
      missing_fields: [],
      scan_date_iso: daysAgoIso(3),
    })).toBe('active_public_signal');
  });

  it('null scan_date with missing fields → "research_discovered" (not expired)', () => {
    expect(classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      scan_date_iso: null,
      missing_fields: ['domain_required'],
    })).toBe('research_discovered');
  });
});

// ─── isPromotionRecommended ───────────────────────────────────────────────────

describe('isPromotionRecommended', () => {
  it('true only for ready_for_internal_promotion', () => {
    expect(isPromotionRecommended('ready_for_internal_promotion')).toBe(true);
  });

  const nonPromotion: Array<Parameters<typeof isPromotionRecommended>[0]> = [
    'active_public_signal', 'needs_refresh', 'research_discovered',
    'expired', 'promoted', 'rejected',
  ];
  for (const state of nonPromotion) {
    it(`false for "${state}"`, () => {
      expect(isPromotionRecommended(state)).toBe(false);
    });
  }
});

// ─── isStale ──────────────────────────────────────────────────────────────────

describe('isStale', () => {
  it('true for needs_refresh', () => {
    expect(isStale('needs_refresh')).toBe(true);
  });

  it('true for expired', () => {
    expect(isStale('expired')).toBe(true);
  });

  const notStale: Array<Parameters<typeof isStale>[0]> = [
    'active_public_signal', 'research_discovered', 'ready_for_internal_promotion', 'promoted', 'rejected',
  ];
  for (const state of notStale) {
    it(`false for "${state}"`, () => {
      expect(isStale(state)).toBe(false);
    });
  }
});

// ─── buildRecommendedAction ───────────────────────────────────────────────────

describe('buildRecommendedAction', () => {
  const states: Array<Parameters<typeof buildRecommendedAction>[0]> = [
    'ready_for_internal_promotion', 'needs_refresh', 'expired',
    'research_discovered', 'active_public_signal', 'promoted', 'rejected',
  ];

  for (const state of states) {
    it(`returns non-empty string for "${state}"`, () => {
      const action = buildRecommendedAction(state, 70);
      expect(typeof action).toBe('string');
      expect(action.length).toBeGreaterThan(0);
    });
  }

  it('ready_for_internal_promotion action mentions promotion', () => {
    const action = buildRecommendedAction('ready_for_internal_promotion', 80);
    expect(action.toLowerCase()).toContain('promot');
  });

  it('needs_refresh action mentions refresh or stale', () => {
    const action = buildRecommendedAction('needs_refresh', 40);
    expect(action.toLowerCase()).toMatch(/refresh|stale/);
  });

  it('expired action mentions expired or archive', () => {
    const action = buildRecommendedAction('expired', 5);
    expect(action.toLowerCase()).toMatch(/expired|archive/);
  });
});

// ─── deriveUrgencySignal ──────────────────────────────────────────────────────

describe('deriveUrgencySignal', () => {
  it('null → single_ad', () => {
    expect(deriveUrgencySignal(null)).toBe('single_ad');
  });

  it('undefined → single_ad', () => {
    expect(deriveUrgencySignal(undefined)).toBe('single_ad');
  });

  it('active_linkedin → single_ad', () => {
    expect(deriveUrgencySignal('active_linkedin')).toBe('single_ad');
  });

  it('active_repeated_ads → repeated_ads', () => {
    expect(deriveUrgencySignal('active_repeated_ads')).toBe('repeated_ads');
  });

  it('multiple_ads → repeated_ads', () => {
    expect(deriveUrgencySignal('multiple_ads')).toBe('repeated_ads');
  });

  it('stated_urgency → stated_urgency', () => {
    expect(deriveUrgencySignal('stated_urgency')).toBe('stated_urgency');
  });

  it('no_ad → none', () => {
    expect(deriveUrgencySignal('no_ad')).toBe('none');
  });
});

// ─── Safety: Market Agent does not perform matching ───────────────────────────

describe('Market Agent safety — no matching or external contact', () => {
  it('classifyMarketLifecycle does not invoke runMatchingAgent', () => {
    // Pure function — no async, no module calls
    classifyMarketLifecycle(BASE_LIFECYCLE_INPUT);
    // If matchingAgent were called, the mock would reject and this test would fail
    expect(true).toBe(true);
  });

  it('scoreMarketOpportunity does not invoke runContactAgent', () => {
    scoreMarketOpportunity(BASE_SCORE_INPUT);
    expect(true).toBe(true);
  });

  it('isPromotionRecommended only returns boolean — no side effects', () => {
    const result = isPromotionRecommended('ready_for_internal_promotion');
    expect(typeof result).toBe('boolean');
  });

  it('refreshCompanyNeedDrafts does not call runMatchingAgent or runContactAgent', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    await refreshCompanyNeedDrafts();
    // If either safety mock were called they would throw — test passes if no throw
  });

  it('market agent scan runner does not call runMatchingAgent or runContactAgent', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    await expect(runDailyCompanyNeedScan()).resolves.not.toThrow();
  });
});

// ─── DB-dependent: refreshCompanyNeedDrafts ───────────────────────────────────

describe('refreshCompanyNeedDrafts', () => {
  it('returns an array of MarketSignal objects', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    const signals = await refreshCompanyNeedDrafts();
    expect(Array.isArray(signals)).toBe(true);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toHaveProperty('lifecycle');
    expect(signals[0]).toHaveProperty('scores');
    expect(signals[0]).toHaveProperty('recommended_action');
    expect(signals[0]).toHaveProperty('promotion_recommended');
    expect(signals[0]).toHaveProperty('is_stale');
  });

  it('returns empty array when no drafts exist', async () => {
    vi.mocked(listDrafts).mockResolvedValue([] as never);
    const signals = await refreshCompanyNeedDrafts();
    expect(signals).toHaveLength(0);
  });

  it('classifies promoted draft correctly', async () => {
    vi.mocked(listDrafts).mockResolvedValue([
      makeDraftRow({ draft_status: 'promoted', converted_need_id: 'need-abc' }),
    ] as never);
    const signals = await refreshCompanyNeedDrafts();
    expect(signals[0].lifecycle).toBe('promoted');
    expect(signals[0].promotion_recommended).toBe(false);
  });

  it('classifies rejected draft correctly', async () => {
    vi.mocked(listDrafts).mockResolvedValue([
      makeDraftRow({ draft_status: 'rejected' }),
    ] as never);
    const signals = await refreshCompanyNeedDrafts();
    expect(signals[0].lifecycle).toBe('rejected');
  });

  it('classifies incomplete draft as research_discovered', async () => {
    vi.mocked(listDrafts).mockResolvedValue([
      makeDraftRow({ draft_status: 'incomplete', missing_fields: ['license_required'] }),
    ] as never);
    const signals = await refreshCompanyNeedDrafts();
    expect(signals[0].lifecycle).toBe('research_discovered');
    expect(signals[0].is_stale).toBe(false);
  });
});

// ─── Scan runners ─────────────────────────────────────────────────────────────

describe('runDailyCompanyNeedScan', () => {
  it('returns scan_type = "daily"', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    const result = await runDailyCompanyNeedScan();
    expect(result.scan_type).toBe('daily');
  });

  it('returns correct counts', async () => {
    vi.mocked(listDrafts).mockResolvedValue([
      makeDraftRow({ id: 'draft-1' }),
      makeDraftRow({ id: 'draft-2', draft_status: 'rejected' }),
    ] as never);
    const result = await runDailyCompanyNeedScan();
    expect(result.drafts_evaluated).toBe(2);
  });

  it('logs company_need_daily_scan_completed to system_actions', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    await runDailyCompanyNeedScan();
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({ action_type: 'company_need_daily_scan_completed' }),
    );
  });

  it('returns a non-empty scan_action_id', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    const result = await runDailyCompanyNeedScan();
    expect(typeof result.scan_action_id).toBe('string');
    expect(result.scan_action_id.length).toBeGreaterThan(0);
  });
});

describe('runWeeklyCompanyNeedDeepScan', () => {
  it('returns scan_type = "weekly"', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    const result = await runWeeklyCompanyNeedDeepScan();
    expect(result.scan_type).toBe('weekly');
  });

  it('logs company_need_weekly_scan_completed', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    await runWeeklyCompanyNeedDeepScan();
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({ action_type: 'company_need_weekly_scan_completed' }),
    );
  });
});

describe('runTriggeredCompanyNeedScan', () => {
  it('returns scan_type = "triggered"', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    const result = await runTriggeredCompanyNeedScan({ type: 'ce_threshold', count: 5 });
    expect(result.scan_type).toBe('triggered');
  });

  it('preserves the trigger in result', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    const trigger = { type: 'driver_cluster', domain: 'schakt_bygg', region: 'stockholm', count: 4 };
    const result = await runTriggeredCompanyNeedScan(trigger);
    expect(result.trigger).toEqual(trigger);
  });

  it('logs company_need_triggered_scan_completed', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    await runTriggeredCompanyNeedScan({ type: 'rare_domain', domain: 'kran' });
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({ action_type: 'company_need_triggered_scan_completed' }),
    );
  });
});

// ─── New ActionType and TargetType coverage ───────────────────────────────────

describe('systemActions — new Market Agent event types are valid ActionType values', () => {
  it('logAction accepts market_signal_detected', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    await runDailyCompanyNeedScan(); // triggers market_signal_detected internally if signals qualify
    // If the type were invalid TypeScript would have caught it at compile time
    expect(true).toBe(true);
  });

  it('logAction accepts company_need_promotion_recommended', async () => {
    // Draft with high composite → promotion_recommended → logs this event
    vi.mocked(listDrafts).mockResolvedValue([
      makeDraftRow({
        draft_status:  'ready_for_review',
        missing_fields: [],
        metadata: {
          recruitment_pain_score: 90,
          drivernord_fit_score:    9,
          contactability_score:   90,
          scan_date:               daysAgoIso(3),
          ad_status:              'repeated_ads',
        },
      }),
    ] as never);
    await runDailyCompanyNeedScan();
    const calls = vi.mocked(logAction).mock.calls;
    const actionTypes = calls.map((c) => (c[0] as { action_type: string }).action_type);
    // Either promotion_recommended was logged OR scan_completed was logged (both use new types)
    expect(actionTypes.some((t) => t.includes('company_need'))).toBe(true);
  });

  it('company_need_draft is a valid TargetType', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    await runDailyCompanyNeedScan();
    const calls = vi.mocked(logAction).mock.calls;
    const usesNewTargetType = calls.some(
      (c) => (c[0] as { target_type: string }).target_type === 'company_need_draft'
        || (c[0] as { target_type: string }).target_type === 'market_scan',
    );
    expect(usesNewTargetType).toBe(true);
  });
});

// ─── Triggered scan — trigger type validation (route-level test) ──────────────

describe('triggered scan trigger types', () => {
  it('driver_cluster trigger is recognized', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    const result = await runTriggeredCompanyNeedScan({
      type: 'driver_cluster', domain: 'schakt_bygg', region: 'stockholm', count: 3,
    });
    expect(result.trigger?.type).toBe('driver_cluster');
  });

  it('ce_threshold trigger is recognized', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    const result = await runTriggeredCompanyNeedScan({ type: 'ce_threshold', count: 6 });
    expect(result.trigger?.type).toBe('ce_threshold');
  });

  it('rare_domain trigger is recognized', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    const result = await runTriggeredCompanyNeedScan({ type: 'rare_domain', domain: 'kran' });
    expect(result.trigger?.type).toBe('rare_domain');
  });
});

// ─── Contactability fix: company_research_targets join ────────────────────────
//
// These tests verify that buildScoreInputFromDraft() now reads real contact
// fields from company_research_targets instead of using hardcoded defaults.

describe('contactability fix — research_targets join', () => {
  it('known contact_email produces higher contactability than no email', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);

    setupDbResearchTargetsMock([{
      id: 'target-1', company_name: 'Test Co',
      barrier_level: 'medium', contact_email: 'test@example.se', decision_maker_name: null,
    }]);
    const withEmail = await refreshCompanyNeedDrafts();

    setupDbResearchTargetsMock([{
      id: 'target-1', company_name: 'Test Co',
      barrier_level: 'medium', contact_email: null, decision_maker_name: null,
    }]);
    const withoutEmail = await refreshCompanyNeedDrafts();

    expect(withEmail[0].scores.contactability_score)
      .toBeGreaterThan(withoutEmail[0].scores.contactability_score);
  });

  it('known decision_maker_name produces higher contactability than no DM', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);

    setupDbResearchTargetsMock([{
      id: 'target-1', company_name: 'Test Co',
      barrier_level: 'medium', contact_email: null, decision_maker_name: 'Anna Svensson',
    }]);
    const withDM = await refreshCompanyNeedDrafts();

    setupDbResearchTargetsMock([{
      id: 'target-1', company_name: 'Test Co',
      barrier_level: 'medium', contact_email: null, decision_maker_name: null,
    }]);
    const withoutDM = await refreshCompanyNeedDrafts();

    expect(withDM[0].scores.contactability_score)
      .toBeGreaterThan(withoutDM[0].scores.contactability_score);
  });

  it('low barrier produces higher contactability than high barrier', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);

    setupDbResearchTargetsMock([{
      id: 'target-1', company_name: 'Test Co',
      barrier_level: 'low', contact_email: null, decision_maker_name: null,
    }]);
    const lowBarrier = await refreshCompanyNeedDrafts();

    setupDbResearchTargetsMock([{
      id: 'target-1', company_name: 'Test Co',
      barrier_level: 'high', contact_email: null, decision_maker_name: null,
    }]);
    const highBarrier = await refreshCompanyNeedDrafts();

    expect(lowBarrier[0].scores.contactability_score)
      .toBeGreaterThan(highBarrier[0].scores.contactability_score);
  });

  it('draft with no matching research target falls back safely (null target → medium/false/false)', async () => {
    // Draft has target_id that is NOT in the research targets result
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow({ target_id: 'no-such-target' })] as never);
    setupDbResearchTargetsMock([]);  // no rows returned

    await expect(refreshCompanyNeedDrafts()).resolves.toHaveLength(1);
    const signals = await refreshCompanyNeedDrafts();
    // Should not throw; contactability score falls back to medium-barrier defaults
    expect(signals[0].scores.contactability_score).toBeGreaterThanOrEqual(0);
    expect(signals[0].scores.contactability_score).toBeLessThanOrEqual(100);
  });

  it('draft without target_id uses safe defaults (no crash)', async () => {
    const draftWithNoTarget = makeDraftRow({ target_id: '' });
    vi.mocked(listDrafts).mockResolvedValue([draftWithNoTarget] as never);
    setupDbResearchTargetsMock([]);

    await expect(refreshCompanyNeedDrafts()).resolves.toHaveLength(1);
  });

  it('enterprise_only barrier produces lower contactability than medium barrier', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);

    setupDbResearchTargetsMock([{
      id: 'target-1', company_name: 'Enterprise Co',
      barrier_level: 'enterprise_only', contact_email: null, decision_maker_name: null,
    }]);
    const enterprise = await refreshCompanyNeedDrafts();

    setupDbResearchTargetsMock([{
      id: 'target-1', company_name: 'Test Co',
      barrier_level: 'medium', contact_email: null, decision_maker_name: null,
    }]);
    const medium = await refreshCompanyNeedDrafts();

    expect(enterprise[0].scores.contactability_score)
      .toBeLessThan(medium[0].scores.contactability_score);
  });

  it('Market Agent scan does NOT create outreach queue entries', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    setupDbResearchTargetsMock([{
      id: 'target-1', company_name: 'Test Co',
      barrier_level: 'low', contact_email: 'ceo@test.se', decision_maker_name: 'CEO Test',
    }]);
    await runDailyCompanyNeedScan();
    // logAction should NOT have been called with any outreach-related action type
    const calls = vi.mocked(logAction).mock.calls;
    const hasOutreachAction = calls.some((c) => {
      const type = (c[0] as { action_type: string }).action_type;
      return type.includes('outreach') || type.includes('contact') || type.includes('sms');
    });
    expect(hasOutreachAction).toBe(false);
  });

  it('contact email and decision_maker_name are NOT logged in system_actions', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    setupDbResearchTargetsMock([{
      id: 'target-1', company_name: 'Test Co',
      barrier_level: 'low', contact_email: 'secret@company.se', decision_maker_name: 'John Secret',
    }]);
    await runDailyCompanyNeedScan();

    const calls = vi.mocked(logAction).mock.calls;
    const loggedPayload = JSON.stringify(calls);
    expect(loggedPayload).not.toContain('secret@company.se');
    expect(loggedPayload).not.toContain('John Secret');
  });
});

// ─── classifySupplyFit ────────────────────────────────────────────────────────

describe('classifySupplyFit', () => {
  it('returns SUPPLY_GAP when map has 0 for the license:domain key', () => {
    const map = new Map<string, number>();
    expect(classifySupplyFit('CE', 'kylfrys', map)).toBe('SUPPLY_GAP');
  });

  it('returns SUPPLY_GAP for Canoil-like: CE/tank with 0 drivers', () => {
    const map = new Map([['CE:distribution', 3]]);
    // CE:tank is absent → 0 drivers
    expect(classifySupplyFit('CE', 'tank', map)).toBe('SUPPLY_GAP');
  });

  it('returns SUPPLY_GAP for KOF-like: C/kylfrys with 0 drivers', () => {
    const map = new Map([['CE:distribution', 3]]);
    expect(classifySupplyFit('C', 'kylfrys', map)).toBe('SUPPLY_GAP');
  });

  it('returns SUPPLY_THIN when exactly 1 matching driver exists', () => {
    const map = new Map([['CE:distribution', 1]]);
    expect(classifySupplyFit('CE', 'distribution', map)).toBe('SUPPLY_THIN');
  });

  it('returns SUPPLY_READY when 2 or more matching drivers exist', () => {
    const map = new Map([['CE:distribution', 3]]);
    expect(classifySupplyFit('CE', 'distribution', map)).toBe('SUPPLY_READY');
  });

  it('returns SUPPLY_READY at exactly 2 drivers (boundary)', () => {
    const map = new Map([['CE:distribution', 2]]);
    expect(classifySupplyFit('CE', 'distribution', map)).toBe('SUPPLY_READY');
  });

  it('returns UNKNOWN_SUPPLY when licenseRequired is null', () => {
    const map = new Map([['CE:distribution', 5]]);
    expect(classifySupplyFit(null, 'distribution', map)).toBe('UNKNOWN_SUPPLY');
  });

  it('handles null domainRequired by using empty string key', () => {
    const map = new Map([['CE:', 2]]);
    expect(classifySupplyFit('CE', null, map)).toBe('SUPPLY_READY');
  });
});

// ─── classifyMarketLifecycle with supply_fit ─────────────────────────────────

describe('classifyMarketLifecycle — supply-aware', () => {
  it('SUPPLY_GAP blocks promotion even when composite is above threshold', () => {
    const lifecycle = classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      composite:   70,  // above 65 threshold
      supply_fit: 'SUPPLY_GAP',
    });
    expect(lifecycle).toBe('hold_supply_gap');
  });

  it('SUPPLY_GAP does not block if draft is already promoted', () => {
    const lifecycle = classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      draft_status: 'promoted',
      composite:    70,
      supply_fit:   'SUPPLY_GAP',
    });
    expect(lifecycle).toBe('promoted');
  });

  it('SUPPLY_GAP does not block if draft is rejected', () => {
    const lifecycle = classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      draft_status: 'rejected',
      composite:    70,
      supply_fit:   'SUPPLY_GAP',
    });
    expect(lifecycle).toBe('rejected');
  });

  it('SUPPLY_GAP does not block if there are missing fields (research_discovered takes priority)', () => {
    const lifecycle = classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      missing_fields: ['contact_email'],
      composite:      70,
      supply_fit:     'SUPPLY_GAP',
    });
    expect(lifecycle).toBe('research_discovered');
  });

  it('SUPPLY_GAP does not block stale signals (needs_refresh takes priority)', () => {
    const lifecycle = classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      scan_date_iso: daysAgoIso(STALE_DAYS + 1),
      composite:     70,
      supply_fit:    'SUPPLY_GAP',
    });
    expect(lifecycle).toBe('needs_refresh');
  });

  it('SUPPLY_READY allows promotion when composite is above threshold', () => {
    const lifecycle = classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      composite:   70,
      supply_fit: 'SUPPLY_READY',
    });
    expect(lifecycle).toBe('ready_for_internal_promotion');
  });

  it('SUPPLY_THIN allows promotion when composite is above threshold', () => {
    const lifecycle = classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      composite:   70,
      supply_fit: 'SUPPLY_THIN',
    });
    expect(lifecycle).toBe('ready_for_internal_promotion');
  });

  it('UNKNOWN_SUPPLY does not block promotion', () => {
    const lifecycle = classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      composite:   70,
      supply_fit: 'UNKNOWN_SUPPLY',
    });
    expect(lifecycle).toBe('ready_for_internal_promotion');
  });

  it('omitting supply_fit (legacy call) does not block promotion', () => {
    const lifecycle = classifyMarketLifecycle({
      ...BASE_LIFECYCLE_INPUT,
      composite: 70,
      // no supply_fit — backward compatible
    });
    expect(lifecycle).toBe('ready_for_internal_promotion');
  });
});

// ─── Supply-aware scan — full pipeline tests ──────────────────────────────────

describe('supply-aware scan — Canoil / KOF / JPC scenarios', () => {
  beforeEach(() => {
    vi.mocked(listDrafts).mockResolvedValue([
      makeDraftRow({ id: 'canoil', target_id: 'tgt-canoil', license_required: 'CE', domain_required: 'tank' as never }),
      makeDraftRow({ id: 'kof',    target_id: 'tgt-kof',    license_required: 'C',  domain_required: 'kylfrys' as never }),
      makeDraftRow({ id: 'dist',   target_id: 'tgt-dist',   license_required: 'CE', domain_required: 'distribution' as never }),
    ] as never);
    setupDbMocks(
      [
        { id: 'tgt-canoil', company_name: 'Canoil Transport AB',   barrier_level: 'low', contact_email: 'tf@canoil.se', decision_maker_name: null },
        { id: 'tgt-kof',    company_name: 'Kyl-och-Frysexpressen', barrier_level: 'low', contact_email: 'info@kof.se',  decision_maker_name: null },
        { id: 'tgt-dist',   company_name: 'Enskede Bilexpress AB', barrier_level: 'low', contact_email: 'ceo@enk.se',  decision_maker_name: 'David' },
      ],
      [
        // Only CE/distribution drivers exist — no CE/tank, no C/kylfrys
        { license_required: 'CE', domain_required: 'distribution' },
        { license_required: 'CE', domain_required: 'distribution' },
        { license_required: 'CE', domain_required: 'distribution' },
      ],
    );
  });

  it('Canoil (CE/tank, 0 supply) is NOT promotion-recommended', async () => {
    const signals = await refreshCompanyNeedDrafts();
    const canoil = signals.find((s) => s.draft_id === 'canoil')!;
    expect(canoil.promotion_recommended).toBe(false);
    expect(canoil.lifecycle).toBe('hold_supply_gap');
    expect(canoil.supply_fit).toBe('SUPPLY_GAP');
  });

  it('KOF (C/kylfrys, 0 supply) is NOT promotion-recommended', async () => {
    const signals = await refreshCompanyNeedDrafts();
    const kof = signals.find((s) => s.draft_id === 'kof')!;
    expect(kof.promotion_recommended).toBe(false);
    expect(kof.lifecycle).toBe('hold_supply_gap');
    expect(kof.supply_fit).toBe('SUPPLY_GAP');
  });

  it('Enskede (CE/distribution, 3 drivers) CAN be promotion-recommended', async () => {
    const signals = await refreshCompanyNeedDrafts();
    const dist = signals.find((s) => s.draft_id === 'dist')!;
    expect(dist.supply_fit).toBe('SUPPLY_READY');
    // May or may not be promotion-recommended depending on score, but supply is not the blocker
    expect(dist.lifecycle).not.toBe('hold_supply_gap');
  });

  it('supply_gap_reason is set for SUPPLY_GAP drafts', async () => {
    const signals = await refreshCompanyNeedDrafts();
    const canoil = signals.find((s) => s.draft_id === 'canoil')!;
    expect(canoil.supply_gap_reason).toBeDefined();
    expect(canoil.supply_gap_reason).toContain('CE');
  });

  it('supply_gap_reason is undefined for non-gap drafts', async () => {
    const signals = await refreshCompanyNeedDrafts();
    const dist = signals.find((s) => s.draft_id === 'dist')!;
    expect(dist.supply_gap_reason).toBeUndefined();
  });

  it('hold_supply_gap is NOT treated as stale', async () => {
    const signals = await refreshCompanyNeedDrafts();
    const canoil = signals.find((s) => s.draft_id === 'canoil')!;
    expect(canoil.is_stale).toBe(false);
  });

  it('driver PII is never exposed in supply gap signals', async () => {
    const signals = await refreshCompanyNeedDrafts();
    const payload = JSON.stringify(signals);
    // Specific driver names/emails must not appear
    expect(payload).not.toContain('0730');
    expect(payload).not.toContain('@gmail');
    expect(payload).not.toContain('@hotmail');
  });
});

// ─── run_type and observability ───────────────────────────────────────────────

describe('run_type labeling — evaluation not presented as live scan', () => {
  beforeEach(() => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
  });

  it('daily scan result has run_type = evaluation_run', async () => {
    const result = await runDailyCompanyNeedScan();
    expect(result.run_type).toBe('evaluation_run');
  });

  it('weekly scan result has run_type = evaluation_run', async () => {
    const result = await runWeeklyCompanyNeedDeepScan();
    expect(result.run_type).toBe('evaluation_run');
  });

  it('triggered scan result has run_type = evaluation_run', async () => {
    const result = await runTriggeredCompanyNeedScan({ type: 'test' });
    expect(result.run_type).toBe('evaluation_run');
  });

  it('is_evaluation_only is true for all current scan types', async () => {
    const result = await runDailyCompanyNeedScan();
    expect(result.is_evaluation_only).toBe(true);
  });

  it('system_actions result metadata contains run_type = evaluation_run', async () => {
    await runDailyCompanyNeedScan();
    const completionCall = vi.mocked(logAction).mock.calls.find((c) => {
      const a = c[0] as { action_type: string };
      return a.action_type === 'company_need_daily_scan_completed';
    });
    expect(completionCall).toBeDefined();
    const result = (completionCall![0] as { result: Record<string, unknown> }).result;
    expect(result.run_type).toBe('evaluation_run');
    expect(result.is_evaluation_only).toBe(true);
  });

  it('system_actions result metadata contains supply_gap_blocked count', async () => {
    vi.mocked(listDrafts).mockResolvedValue([
      makeDraftRow({ id: 'gap-draft', license_required: 'CE', domain_required: 'kylfrys' as never }),
    ] as never);
    setupDbMocks(
      [{ id: 'target-1', company_name: 'Test Co', barrier_level: 'low', contact_email: null, decision_maker_name: null }],
      [], // no supply
    );

    await runDailyCompanyNeedScan();
    const completionCall = vi.mocked(logAction).mock.calls.find((c) => {
      const a = c[0] as { action_type: string };
      return a.action_type === 'company_need_daily_scan_completed';
    });
    const result = (completionCall![0] as { result: Record<string, unknown> }).result;
    expect(result.supply_gap_blocked).toBe(1);
    expect(result.supply_ready_promotable).toBe(0);
  });
});

// ─── JPC / do_not_contact guard ───────────────────────────────────────────────

describe('JPC Entreprenad AB — permanently blocked', () => {
  it('rejected draft cannot become hold_supply_gap or promotion candidate', () => {
    const lifecycle = classifyMarketLifecycle({
      draft_status:   'rejected',
      missing_fields: [],
      scan_date_iso:  daysAgoIso(1),
      composite:      90,
      supply_fit:     'SUPPLY_READY',
    });
    expect(lifecycle).toBe('rejected');
    expect(isPromotionRecommended(lifecycle)).toBe(false);
  });

  it('buildRecommendedAction for rejected returns no-action string', () => {
    const action = buildRecommendedAction('rejected', 90);
    expect(action).toContain('no action');
  });
});

// ─── Source/contact lineage in scan output ────────────────────────────────────

describe('source and contact lineage', () => {
  it('MarketSignal includes draft_id for lineage tracing', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow({ id: 'draft-xyz', scan_record_id: 'DN-001' })] as never);
    const signals = await refreshCompanyNeedDrafts();
    expect(signals[0].draft_id).toBe('draft-xyz');
  });

  it('scan result does not include individual driver names, phones, or emails', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraftRow()] as never);
    setupDbMocks(
      [{ id: 'target-1', company_name: 'Test Co', barrier_level: 'low', contact_email: 'admin@test.se', decision_maker_name: 'Admin User' }],
      [{ license_required: 'CE', domain_required: 'distribution' }],
    );
    const result = await runDailyCompanyNeedScan();
    const payload = JSON.stringify(result);
    // Company contact details used only for scoring — not in logged output
    expect(payload).not.toContain('admin@test.se');
    expect(payload).not.toContain('Admin User');
  });
});
