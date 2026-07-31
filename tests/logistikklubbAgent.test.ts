import { describe, it, expect } from 'vitest';
import {
  generateFiveDaySequence,
  getWeekNumber,
} from '../lib/logistikklubbAgent';
import type { MarketSignalSummary } from '../lib/logistikklubbAgent';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptySignals(): MarketSignalSummary {
  return {
    ce_distribution_active: false,
    fjarrtransport_active:  false,
    kylfrys_active:         false,
    adr_tank_active:        false,
    stockholm_demand:       false,
    total_active_signals:   0,
    supply_gap_domains:     [],
    last_scan_at:           null,
  };
}

function liveSignals(overrides: Partial<MarketSignalSummary> = {}): MarketSignalSummary {
  return {
    ce_distribution_active: true,
    fjarrtransport_active:  false,
    kylfrys_active:         false,
    adr_tank_active:        false,
    stockholm_demand:       true,
    total_active_signals:   12,
    supply_gap_domains:     ['kylfrys'],
    last_scan_at:           new Date().toISOString(),
    ...overrides,
  };
}

// ─── generateFiveDaySequence ──────────────────────────────────────────────────

describe('generateFiveDaySequence', () => {
  it('returns exactly 5 days', () => {
    const seq = generateFiveDaySequence();
    expect(seq.days).toHaveLength(5);
  });

  it('days are numbered 1 through 5', () => {
    const seq = generateFiveDaySequence();
    expect(seq.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
  });

  it('every day has required fields', () => {
    const seq = generateFiveDaySequence();
    for (const day of seq.days) {
      expect(day.id).toBeTruthy();
      expect(typeof day.day).toBe('number');
      expect(day.title).toBeTruthy();
      expect(day.category).toBeTruthy();
      expect(day.text.length).toBeGreaterThan(20);
      expect(day.suggested_time).toBeTruthy();
      expect(typeof day.is_cta).toBe('boolean');
      expect(typeof day.is_market_signal).toBe('boolean');
    }
  });

  it('content_ratio fields exist and sum to 100', () => {
    const seq = generateFiveDaySequence();
    const { value_pct, market_pct, cta_pct } = seq.content_ratio;
    expect(typeof value_pct).toBe('number');
    expect(typeof market_pct).toBe('number');
    expect(typeof cta_pct).toBe('number');
    expect(value_pct + market_pct + cta_pct).toBe(100);
  });

  it('CTA percentage is 20% on even weeks (1 of 5 days)', () => {
    const seq = generateFiveDaySequence(undefined, 2);
    expect(seq.content_ratio.cta_pct).toBe(20);
  });

  it('CTA percentage is 0% on odd weeks (doctrine: ~10% average over time)', () => {
    const seq = generateFiveDaySequence(undefined, 1);
    expect(seq.content_ratio.cta_pct).toBe(0);
  });

  it('day 5 is CTA on even weeks', () => {
    const seq = generateFiveDaySequence(undefined, 2);
    const day5 = seq.days.find((d) => d.day === 5)!;
    expect(day5.is_cta).toBe(true);
  });

  it('day 5 is a value post on odd weeks', () => {
    const seq = generateFiveDaySequence(undefined, 1);
    const day5 = seq.days.find((d) => d.day === 5)!;
    expect(day5.is_cta).toBe(false);
    expect(day5.is_market_signal).toBe(false);
  });

  it('no non-day-5 posts are CTA', () => {
    for (const week of [0, 1, 2, 3]) {
      const seq = generateFiveDaySequence(undefined, week);
      const ctaNotDay5 = seq.days.filter((d) => d.is_cta && d.day !== 5);
      expect(ctaNotDay5).toHaveLength(0);
    }
  });

  it('only day 2 is marked is_market_signal', () => {
    const seq = generateFiveDaySequence();
    const marketDays = seq.days.filter((d) => d.is_market_signal);
    expect(marketDays).toHaveLength(1);
    expect(marketDays[0].day).toBe(2);
  });

  it('has a generated_at ISO timestamp', () => {
    const seq = generateFiveDaySequence();
    expect(() => new Date(seq.generated_at)).not.toThrow();
    expect(new Date(seq.generated_at).toISOString()).toBe(seq.generated_at);
  });

  it('has a week_theme string', () => {
    const seq = generateFiveDaySequence();
    expect(typeof seq.week_theme).toBe('string');
    expect(seq.week_theme.length).toBeGreaterThan(3);
  });

  it('signal_basis is static_fallback when no signals provided', () => {
    const seq = generateFiveDaySequence(emptySignals());
    expect(seq.signal_basis).toBe('static_fallback');
  });

  it('signal_basis is live_signals when signals have total > 0', () => {
    const seq = generateFiveDaySequence(liveSignals());
    expect(seq.signal_basis).toBe('live_signals');
  });

  it('signal_basis is static_fallback when signals is undefined', () => {
    const seq = generateFiveDaySequence(undefined, 1);
    expect(seq.signal_basis).toBe('static_fallback');
  });
});

// ─── Market signal — content variations ──────────────────────────────────────

describe('generateFiveDaySequence — market signal content', () => {
  it('day 2 text mentions kylfrys when kylfrys signal is active', () => {
    const seq = generateFiveDaySequence(liveSignals({ kylfrys_active: true, ce_distribution_active: false, stockholm_demand: false }));
    const day2 = seq.days.find((d) => d.day === 2)!;
    expect(day2.text.toLowerCase()).toMatch(/kyl/);
  });

  it('day 2 text mentions fjärrtransport when fjarrtransport signal is active', () => {
    const seq = generateFiveDaySequence(liveSignals({ fjarrtransport_active: true, ce_distribution_active: false, kylfrys_active: false, stockholm_demand: false }));
    const day2 = seq.days.find((d) => d.day === 2)!;
    expect(day2.text.toLowerCase()).toMatch(/fjärr|fj.rr/);
  });

  it('day 2 text mentions distribution when ce_distribution + stockholm active', () => {
    const seq = generateFiveDaySequence(liveSignals({ ce_distribution_active: true, stockholm_demand: true }));
    const day2 = seq.days.find((d) => d.day === 2)!;
    expect(day2.text.toLowerCase()).toMatch(/distribution|stockholm/);
  });

  it('day 2 falls back gracefully when no signals active', () => {
    const seq = generateFiveDaySequence(emptySignals());
    const day2 = seq.days.find((d) => d.day === 2)!;
    expect(day2.text.length).toBeGreaterThan(50);
    expect(day2.category).toBe('market_signal');
  });
});

// ─── Content rotation ─────────────────────────────────────────────────────────

describe('generateFiveDaySequence — week rotation', () => {
  it('different week indices produce the same structure (5 days)', () => {
    for (const week of [0, 1, 2, 3, 5, 10, 52]) {
      const seq = generateFiveDaySequence(undefined, week);
      expect(seq.days).toHaveLength(5);
    }
  });

  it('week index rotation changes day 3 content across 4 weeks', () => {
    const texts = [0, 1, 2, 3].map(
      (w) => generateFiveDaySequence(undefined, w).days.find((d) => d.day === 3)!.text
    );
    const unique = new Set(texts);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('week index rotation changes day 4 content across 3 weeks', () => {
    const texts = [0, 1, 2].map(
      (w) => generateFiveDaySequence(undefined, w).days.find((d) => d.day === 4)!.text
    );
    const unique = new Set(texts);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('week index rotation changes day 5 content across 3 weeks', () => {
    const texts = [0, 1, 2].map(
      (w) => generateFiveDaySequence(undefined, w).days.find((d) => d.day === 5)!.text
    );
    const unique = new Set(texts);
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ─── PII and safety checks ────────────────────────────────────────────────────

describe('generateFiveDaySequence — no PII in output', () => {
  it('no email addresses in any post text', () => {
    const seq = generateFiveDaySequence(liveSignals());
    for (const day of seq.days) {
      expect(day.text).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    }
  });

  it('no Swedish phone numbers in any post text', () => {
    const seq = generateFiveDaySequence(liveSignals());
    for (const day of seq.days) {
      expect(day.text).not.toMatch(/07[0-9]{8}/);
      expect(day.text).not.toMatch(/\+46[0-9]{8,}/);
    }
  });

  it('no Swedish org numbers in any post text', () => {
    const seq = generateFiveDaySequence(liveSignals());
    for (const day of seq.days) {
      // Org numbers: XXXXXX-XXXX
      expect(day.text).not.toMatch(/\d{6}-\d{4}/);
    }
  });
});

// ─── No automatic sending ─────────────────────────────────────────────────────

describe('logistikklubbAgent module — no automatic send', () => {
  it('generateFiveDaySequence is synchronous (not async)', () => {
    const result = generateFiveDaySequence();
    // A Promise would not have a .days property
    expect(result).not.toBeInstanceOf(Promise);
    expect(Array.isArray(result.days)).toBe(true);
  });

  it('generateFiveDaySequence has no send-related properties in output', () => {
    const seq = generateFiveDaySequence();
    const seqStr = JSON.stringify(seq);
    // These property names would indicate auto-posting
    expect(seqStr).not.toContain('"sent":');
    expect(seqStr).not.toContain('"auto_post"');
    expect(seqStr).not.toContain('"webhook"');
  });
});

// ─── getWeekNumber ────────────────────────────────────────────────────────────

describe('getWeekNumber', () => {
  it('returns a number between 1 and 53', () => {
    const w = getWeekNumber(new Date());
    expect(w).toBeGreaterThanOrEqual(1);
    expect(w).toBeLessThanOrEqual(53);
  });

  it('returns a consistent value for the same date', () => {
    const d = new Date('2026-06-07');
    expect(getWeekNumber(d)).toBe(getWeekNumber(d));
  });

  it('week 1 of 2026 is in early January', () => {
    const d = new Date('2026-01-05');
    expect(getWeekNumber(d)).toBe(2); // ISO week 2
  });
});
