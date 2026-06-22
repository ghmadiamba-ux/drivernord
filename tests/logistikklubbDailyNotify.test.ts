import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  selectDailyMessage,
  getStockholmDateString,
  getStockholmDateIndex,
  MORNING_POOL_SIZE,
  EVENING_POOL_SIZE,
  type DailySlot,
} from '../lib/logistikklubbDailyNotify';

afterEach(() => {
  vi.useRealTimers();
});

// ─── Pool integrity ───────────────────────────────────────────────────────────

describe('content pools', () => {
  it('morning pool has entries', () => {
    expect(MORNING_POOL_SIZE).toBeGreaterThan(0);
  });

  it('evening pool has entries', () => {
    expect(EVENING_POOL_SIZE).toBeGreaterThan(0);
  });

  it('all morning messages are within 850 chars', () => {
    for (let i = 0; i < MORNING_POOL_SIZE; i++) {
      const msg = selectDailyMessage('morning', i);
      expect(msg.post_text.length).toBeLessThanOrEqual(850);
    }
  });

  it('all evening messages are within 850 chars', () => {
    for (let i = 0; i < EVENING_POOL_SIZE; i++) {
      const msg = selectDailyMessage('evening', i);
      expect(msg.post_text.length).toBeLessThanOrEqual(850);
    }
  });

  it('all morning messages are non-empty', () => {
    for (let i = 0; i < MORNING_POOL_SIZE; i++) {
      const msg = selectDailyMessage('morning', i);
      expect(msg.post_text.trim().length).toBeGreaterThan(0);
      expect(msg.title.trim().length).toBeGreaterThan(0);
    }
  });

  it('all evening messages are non-empty', () => {
    for (let i = 0; i < EVENING_POOL_SIZE; i++) {
      const msg = selectDailyMessage('evening', i);
      expect(msg.post_text.trim().length).toBeGreaterThan(0);
      expect(msg.title.trim().length).toBeGreaterThan(0);
    }
  });

  it('all morning messages have a category', () => {
    for (let i = 0; i < MORNING_POOL_SIZE; i++) {
      const msg = selectDailyMessage('morning', i);
      expect(msg.category).toBeTruthy();
    }
  });

  it('all evening messages have a category', () => {
    for (let i = 0; i < EVENING_POOL_SIZE; i++) {
      const msg = selectDailyMessage('evening', i);
      expect(msg.category).toBeTruthy();
    }
  });
});

// ─── selectDailyMessage ───────────────────────────────────────────────────────

describe('selectDailyMessage', () => {
  it('returns slot field matching the requested slot', () => {
    expect(selectDailyMessage('morning', 0).slot).toBe('morning');
    expect(selectDailyMessage('evening', 0).slot).toBe('evening');
  });

  it('is deterministic — same dateIndex always returns same content', () => {
    const a = selectDailyMessage('morning', 42);
    const b = selectDailyMessage('morning', 42);
    expect(a).toEqual(b);
  });

  it('is deterministic for evening too', () => {
    const a = selectDailyMessage('evening', 100);
    const b = selectDailyMessage('evening', 100);
    expect(a).toEqual(b);
  });

  it('cycles through pool — different dateIndexes can return different content', () => {
    const results = new Set<string>();
    for (let i = 0; i < MORNING_POOL_SIZE * 2; i++) {
      results.add(selectDailyMessage('morning', i).title);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('morning and evening return different content for the same dateIndex', () => {
    const morning = selectDailyMessage('morning', 7);
    const evening = selectDailyMessage('evening', 7);
    // Different pools — same index should not produce identical post_text
    expect(morning.post_text).not.toBe(evening.post_text);
  });

  it('uses current date index when no dateIndex provided', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T10:00:00Z'));
    const withDefault = selectDailyMessage('morning');
    const withExplicit = selectDailyMessage('morning', getStockholmDateIndex());
    expect(withDefault).toEqual(withExplicit);
  });

  it('wraps around at pool boundary — dateIndex wraps via modulo', () => {
    const a = selectDailyMessage('morning', 0);
    const b = selectDailyMessage('morning', MORNING_POOL_SIZE);
    expect(a.title).toBe(b.title);
    expect(a.post_text).toBe(b.post_text);
  });
});

// ─── getStockholmDateString ───────────────────────────────────────────────────

describe('getStockholmDateString', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T12:00:00Z'));
    const result = getStockholmDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns the Stockholm date — reflects Stockholm midnight, not UTC midnight', () => {
    vi.useFakeTimers();
    // 23:30 UTC on June 21 = 01:30 CEST (UTC+2) on June 22 in Stockholm
    vi.setSystemTime(new Date('2026-06-21T23:30:00Z'));
    const result = getStockholmDateString();
    expect(result).toBe('2026-06-22');
  });

  it('returns June 21 at 22:30 UTC (still June 21 in CEST)', () => {
    vi.useFakeTimers();
    // 22:30 UTC = 00:30 CEST on June 22... wait that's June 22 again
    // Let's use 20:00 UTC June 21 = 22:00 CEST June 21 (still June 21)
    vi.setSystemTime(new Date('2026-06-21T20:00:00Z'));
    const result = getStockholmDateString();
    expect(result).toBe('2026-06-21');
  });
});

// ─── getStockholmDateIndex ────────────────────────────────────────────────────

describe('getStockholmDateIndex', () => {
  it('returns a positive integer', () => {
    const idx = getStockholmDateIndex();
    expect(Number.isInteger(idx)).toBe(true);
    expect(idx).toBeGreaterThan(0);
  });

  it('increments by 1 across Stockholm midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T21:59:00Z')); // 23:59 CEST June 21
    const before = getStockholmDateIndex();
    vi.setSystemTime(new Date('2026-06-21T22:01:00Z')); // 00:01 CEST June 22
    const after = getStockholmDateIndex();
    expect(after - before).toBe(1);
  });

  it('is stable throughout the Stockholm calendar day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T06:00:00Z')); // 08:00 CEST
    const morning = getStockholmDateIndex();
    vi.setSystemTime(new Date('2026-06-22T14:00:00Z')); // 16:00 CEST
    const afternoon = getStockholmDateIndex();
    expect(morning).toBe(afternoon);
  });
});
