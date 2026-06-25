// tests/contentPlanner.test.ts

import { describe, it, expect } from 'vitest';
import { generateWeeklyPlan, summarizePlan, getWeekIndex } from '../lib/content/planner';
import type { ContentMemoryEntry } from '../lib/content/types';

const EMPTY_HISTORY: ContentMemoryEntry[] = [];

// ─── getWeekIndex ─────────────────────────────────────────────────────────────

describe('getWeekIndex', () => {
  it('returns a stable number for a given week', () => {
    const idx = getWeekIndex('2026-W26');
    expect(typeof idx).toBe('number');
    expect(idx).toBeGreaterThan(0);
  });

  it('returns different values for different weeks', () => {
    expect(getWeekIndex('2026-W26')).not.toBe(getWeekIndex('2026-W27'));
  });

  it('is deterministic', () => {
    expect(getWeekIndex('2026-W01')).toBe(getWeekIndex('2026-W01'));
  });
});

// ─── generateWeeklyPlan ───────────────────────────────────────────────────────

describe('generateWeeklyPlan', () => {
  it('generates exactly 4 cards for an empty history', () => {
    const { plan, errors } = generateWeeklyPlan({
      iso_week:    '2026-W26',
      history:     EMPTY_HISTORY,
      created_by:  'test',
    });
    expect(errors).toHaveLength(0);
    expect(plan.cards).toHaveLength(4);
  });

  it('assigns cards to Mon, Wed, Fri, Sun', () => {
    const { plan } = generateWeeklyPlan({
      iso_week: '2026-W26',
      history:  EMPTY_HISTORY,
    });
    const days = plan.cards.map((c) => c.planned_day_of_week).sort();
    expect(days).toEqual([1, 3, 5, 7]);
  });

  it('returns correct week string', () => {
    const { plan } = generateWeeklyPlan({ iso_week: '2026-W26', history: EMPTY_HISTORY });
    expect(plan.week).toBe('2026-W26');
  });

  it('has at most 1 CTA per week', () => {
    const { plan } = generateWeeklyPlan({ iso_week: '2026-W26', history: EMPTY_HISTORY });
    expect(plan.cta_count).toBeLessThanOrEqual(1);
  });

  it('has CTA on even week index (acquisition replaces Friday)', () => {
    // week 26 — index will be 2026*53+26 which is even or odd depending on value
    const idx = getWeekIndex('2026-W26');
    const { plan } = generateWeeklyPlan({ iso_week: '2026-W26', history: EMPTY_HISTORY });
    if (idx % 2 === 0) {
      // Friday slot should be acquisition
      const friCard = plan.cards.find((c) => c.planned_day_of_week === 5);
      expect(friCard?.content_pillar).toBe('acquisition');
    } else {
      const friCard = plan.cards.find((c) => c.planned_day_of_week === 5);
      expect(friCard?.content_pillar).toBe('recognition');
    }
  });

  it('computes pillar_ratio that sums to 1', () => {
    const { plan } = generateWeeklyPlan({ iso_week: '2026-W26', history: EMPTY_HISTORY });
    const total = Object.values(plan.pillar_ratio).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it('includes generated_at timestamp', () => {
    const { plan } = generateWeeklyPlan({ iso_week: '2026-W26', history: EMPTY_HISTORY });
    expect(new Date(plan.generated_at).getTime()).toBeGreaterThan(0);
  });

  it('all cards have draft_text', () => {
    const { plan } = generateWeeklyPlan({ iso_week: '2026-W26', history: EMPTY_HISTORY });
    for (const card of plan.cards) {
      expect(card.draft_text, `card ${card.id} missing draft_text`).toBeTruthy();
    }
  });

  it('all cards have hashtag_set', () => {
    const { plan } = generateWeeklyPlan({ iso_week: '2026-W26', history: EMPTY_HISTORY });
    for (const card of plan.cards) {
      expect(Array.isArray(card.hashtag_set), `card ${card.id} missing hashtag_set`).toBe(true);
    }
  });

  it('low-risk cards start in draft, high-risk in held', () => {
    const { plan } = generateWeeklyPlan({ iso_week: '2026-W26', history: EMPTY_HISTORY });
    for (const card of plan.cards) {
      if (card.risk_level === 'high') {
        expect(card.lifecycle_status).toBe('held');
      } else {
        expect(['draft', 'held']).toContain(card.lifecycle_status);
      }
    }
  });

  it('is deterministic — same week + empty history = same output structure', () => {
    const r1 = generateWeeklyPlan({ iso_week: '2026-W27', history: EMPTY_HISTORY });
    const r2 = generateWeeklyPlan({ iso_week: '2026-W27', history: EMPTY_HISTORY });
    expect(r1.plan.cards.map((c) => c.content_pillar)).toEqual(
      r2.plan.cards.map((c) => c.content_pillar)
    );
    expect(r1.plan.cards.map((c) => c.creative_angle)).toEqual(
      r2.plan.cards.map((c) => c.creative_angle)
    );
  });
});

// ─── summarizePlan ────────────────────────────────────────────────────────────

describe('summarizePlan', () => {
  it('summarizes a plan correctly', () => {
    const { plan } = generateWeeklyPlan({ iso_week: '2026-W26', history: EMPTY_HISTORY });
    const summary = summarizePlan(plan);
    expect(summary.total).toBe(4);
    expect(summary.total).toBe(summary.ready + summary.held);
    expect(summary.cta_count).toBe(plan.cta_count);
    expect(summary.week).toBe('2026-W26');
  });
});
