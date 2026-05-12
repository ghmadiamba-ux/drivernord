import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/db', () => ({ db: { from: vi.fn() } }));

import { computeB2BTargetSummary } from '../lib/b2b/companyResearchStore';
import type { CompanyResearchTarget } from '../lib/b2b/types';

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeTarget(overrides: Partial<CompanyResearchTarget> = {}): CompanyResearchTarget {
  return {
    id:         'test-id',
    created_at: '2026-05-10T00:00:00Z',
    updated_at: '2026-05-10T00:00:00Z',
    company_name:  'Test AB',
    website:       null,
    region:        'stockholm',
    city:          null,
    company_size:  'small',
    segment:       'A',
    transport_domain:     [],
    visible_driver_need:  true,
    job_ads_url:          null,
    license_mentions:     ['C'],
    ykb_mentioned:        true,
    driver_card_mentioned: null,
    urgency_signal:       'single_ad',
    contact_email:        null,
    phone:                null,
    linkedin_url:         null,
    decision_maker_name:  null,
    decision_maker_role:  null,
    procurement_page:     null,
    supplier_requirements_url: null,
    barrier_level:  'low',
    barrier_notes:  null,
    pilot_accessibility_score: null,
    opportunity_score:         null,
    recommended_entry_point:   null,
    next_action:               null,
    research_status:   'enriched',
    source_notes:      null,
    last_checked_date: null,
    scored_at: null,
    scored_by: null,
    approved_as_target_at: null,
    approved_as_target_by: null,
    ...overrides,
  };
}

// ── computeB2BTargetSummary ───────────────────────────────────────────────────

describe('computeB2BTargetSummary — empty list', () => {
  it('returns zero totals for an empty array', () => {
    const summary = computeB2BTargetSummary([]);
    expect(summary.total).toBe(0);
    expect(summary.enriched).toBe(0);
    expect(summary.scoredAbove70).toBe(0);
    expect(summary.withContact).toBe(0);
  });

  it('initialises all status buckets to 0', () => {
    const { byStatus } = computeB2BTargetSummary([]);
    expect(byStatus.not_started).toBe(0);
    expect(byStatus.researching).toBe(0);
    expect(byStatus.enriched).toBe(0);
    expect(byStatus.incomplete).toBe(0);
    expect(byStatus.rejected).toBe(0);
  });

  it('returns an empty byBarrier object', () => {
    const { byBarrier } = computeB2BTargetSummary([]);
    expect(Object.keys(byBarrier).length).toBe(0);
  });
});

describe('computeB2BTargetSummary — status counting', () => {
  it('counts total correctly', () => {
    const targets = [
      makeTarget({ research_status: 'enriched' }),
      makeTarget({ research_status: 'enriched' }),
      makeTarget({ research_status: 'incomplete' }),
    ];
    expect(computeB2BTargetSummary(targets).total).toBe(3);
  });

  it('counts enriched targets', () => {
    const targets = [
      makeTarget({ research_status: 'enriched' }),
      makeTarget({ research_status: 'enriched' }),
      makeTarget({ research_status: 'not_started' }),
    ];
    const { enriched, byStatus } = computeB2BTargetSummary(targets);
    expect(enriched).toBe(2);
    expect(byStatus.enriched).toBe(2);
    expect(byStatus.not_started).toBe(1);
  });

  it('matches enriched shortcut to byStatus.enriched', () => {
    const targets = [
      makeTarget({ research_status: 'enriched' }),
      makeTarget({ research_status: 'rejected' }),
    ];
    const summary = computeB2BTargetSummary(targets);
    expect(summary.enriched).toBe(summary.byStatus.enriched);
  });
});

describe('computeB2BTargetSummary — score threshold', () => {
  it('counts targets with score >= 70', () => {
    const targets = [
      makeTarget({ pilot_accessibility_score: 90 }),
      makeTarget({ pilot_accessibility_score: 70 }),
      makeTarget({ pilot_accessibility_score: 69 }),
      makeTarget({ pilot_accessibility_score: null }),
    ];
    expect(computeB2BTargetSummary(targets).scoredAbove70).toBe(2);
  });

  it('treats null score as 0 (not counted)', () => {
    const targets = [makeTarget({ pilot_accessibility_score: null })];
    expect(computeB2BTargetSummary(targets).scoredAbove70).toBe(0);
  });
});

describe('computeB2BTargetSummary — contact presence', () => {
  it('counts targets with contact_email', () => {
    const targets = [
      makeTarget({ contact_email: 'a@b.se', linkedin_url: null }),
      makeTarget({ contact_email: null,     linkedin_url: null }),
    ];
    expect(computeB2BTargetSummary(targets).withContact).toBe(1);
  });

  it('counts targets with linkedin_url only', () => {
    const targets = [
      makeTarget({ contact_email: null, linkedin_url: 'https://linkedin.com/company/x' }),
    ];
    expect(computeB2BTargetSummary(targets).withContact).toBe(1);
  });

  it('does not double-count targets with both email and linkedin', () => {
    const targets = [
      makeTarget({ contact_email: 'a@b.se', linkedin_url: 'https://linkedin.com/x' }),
    ];
    expect(computeB2BTargetSummary(targets).withContact).toBe(1);
  });

  it('does not count targets with neither email nor linkedin', () => {
    const targets = [makeTarget({ contact_email: null, linkedin_url: null })];
    expect(computeB2BTargetSummary(targets).withContact).toBe(0);
  });
});

describe('computeB2BTargetSummary — barrier distribution', () => {
  it('groups targets by barrier_level', () => {
    const targets = [
      makeTarget({ barrier_level: 'low' }),
      makeTarget({ barrier_level: 'low' }),
      makeTarget({ barrier_level: 'medium' }),
      makeTarget({ barrier_level: null }),
    ];
    const { byBarrier } = computeB2BTargetSummary(targets);
    expect(byBarrier.low).toBe(2);
    expect(byBarrier.medium).toBe(1);
    expect(byBarrier.high).toBeUndefined();
  });

  it('skips null barrier_level (not added to byBarrier)', () => {
    const targets = [makeTarget({ barrier_level: null })];
    const { byBarrier } = computeB2BTargetSummary(targets);
    expect('null' in byBarrier).toBe(false);
    expect(Object.keys(byBarrier).length).toBe(0);
  });
});
