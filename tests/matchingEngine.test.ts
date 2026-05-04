import { describe, it, expect } from 'vitest';
import { buildShortlist } from '../lib/matchingEngine';
import type { ShortlistResult } from '../lib/matchingEngine';
import type { MatchNeed } from '../lib/matchScore';
import type { IngestedDriver } from '../lib/ingestedDriver';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const d = (id: string, overrides: Partial<IngestedDriver> = {}): IngestedDriver => ({
  id,
  ingestedAt:      new Date('2026-05-01T10:00:00.000Z'),
  priority:        'HIGH',
  license:         'CE',
  ykb:             'valid',
  driverCard:      'valid',
  location:        { region: 'stockholm', willingToRelocate: null },
  availability:    'now',
  domain:          'distribution',
  shiftPreference: 'day',
  contact:         { firstName: 'Test', phone: '+46700000000', email: null },
  needsFollowUp:   false,
  followUpAt:      null,
  followUpReason:  null,
  ...overrides,
});

const need = (overrides: Partial<MatchNeed> = {}): MatchNeed => ({
  license_required:   'CE',
  domain_required:    'distribution',
  domain_preferred:   [],
  location_region:    'stockholm',
  relocation_allowed: true,
  shift_type:         'day',
  urgency:            'standard',
  ...overrides,
});

// ─── 1. Ordering ──────────────────────────────────────────────────────────────

describe('buildShortlist — ordering', () => {
  it('returns drivers sorted by score descending', () => {
    // driver-a: domain match (score 98)
    // driver-b: domain null  (score 73)
    // driver-c: availability 1_month + domain null (score lower)
    const drivers = [
      d('driver-b', { domain: null }),
      d('driver-c', { domain: null, availability: '1_month' }),
      d('driver-a'),
    ];
    const result = buildShortlist(drivers, need());
    expect(result.shortlisted[0].driver.id).toBe('driver-a');
    expect(result.shortlisted[1].driver.id).toBe('driver-b');
    expect(result.shortlisted[2].driver.id).toBe('driver-c');
  });

  it('higher score appears first regardless of input order', () => {
    const drivers = [
      d('low',  { availability: 'not_yet', domain: null }),
      d('high', { availability: 'now' }),
    ];
    const result = buildShortlist(drivers, need());
    expect(result.shortlisted[0].driver.id).toBe('high');
  });

  it('scores are non-increasing in the returned list', () => {
    const drivers = [
      d('d1', { availability: '1_month' }),
      d('d2', { availability: 'now' }),
      d('d3', { availability: '2_weeks' }),
    ];
    const { shortlisted } = buildShortlist(drivers, need());
    for (let i = 1; i < shortlisted.length; i++) {
      expect(shortlisted[i].score.total).toBeLessThanOrEqual(shortlisted[i - 1].score.total);
    }
  });
});

// ─── 2. Hard filter — license ─────────────────────────────────────────────────

describe('buildShortlist — hard filter: license', () => {
  it('driver with wrong license is rejected', () => {
    const result = buildShortlist([d('d1', { license: 'C' })], need({ license_required: 'CE' }));
    expect(result.shortlisted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].driverId).toBe('d1');
  });

  it('rejected license entry has reason "license_mismatch"', () => {
    const result = buildShortlist([d('d1', { license: 'C' })], need({ license_required: 'CE' }));
    expect(result.rejected[0].reason).toBe('license_mismatch');
  });

  it('CE+D driver is not rejected for a CE requirement', () => {
    const result = buildShortlist([d('d1', { license: 'CE+D' })], need({ license_required: 'CE' }));
    expect(result.shortlisted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it('CE driver is not rejected for a C requirement (overcertified)', () => {
    const result = buildShortlist([d('d1', { license: 'CE' })], need({ license_required: 'C' }));
    expect(result.shortlisted).toHaveLength(1);
  });
});

// ─── 3. Hard filter — YKB ────────────────────────────────────────────────────

describe('buildShortlist — hard filter: ykb', () => {
  it('ykb "none" is rejected', () => {
    const result = buildShortlist([d('d1', { ykb: 'none' })], need());
    expect(result.shortlisted).toHaveLength(0);
    expect(result.rejected[0].reason).toBe('ykb_invalid');
  });

  it('ykb "unknown" is rejected', () => {
    const result = buildShortlist([d('d1', { ykb: 'unknown' })], need());
    expect(result.shortlisted).toHaveLength(0);
    expect(result.rejected[0].reason).toBe('ykb_invalid');
  });

  it('ykb "valid" is not rejected', () => {
    expect(buildShortlist([d('d1', { ykb: 'valid' })], need()).shortlisted).toHaveLength(1);
  });

  it('ykb "expired" is not rejected (filtered by pool tier, not hard filter)', () => {
    expect(buildShortlist([d('d1', { ykb: 'expired' })], need()).shortlisted).toHaveLength(1);
  });

  it('ykb "in_progress" is not rejected', () => {
    expect(buildShortlist([d('d1', { ykb: 'in_progress' })], need()).shortlisted).toHaveLength(1);
  });
});

// ─── 4. Hard filter — driver card ────────────────────────────────────────────

describe('buildShortlist — hard filter: driver card', () => {
  it('driverCard "no" is rejected', () => {
    const result = buildShortlist([d('d1', { driverCard: 'no' })], need());
    expect(result.shortlisted).toHaveLength(0);
    expect(result.rejected[0].reason).toBe('driver_card_invalid');
  });

  it('driverCard "unknown" is rejected', () => {
    const result = buildShortlist([d('d1', { driverCard: 'unknown' })], need());
    expect(result.shortlisted).toHaveLength(0);
    expect(result.rejected[0].reason).toBe('driver_card_invalid');
  });

  it('driverCard "valid" is not rejected', () => {
    expect(buildShortlist([d('d1', { driverCard: 'valid' })], need()).shortlisted).toHaveLength(1);
  });

  it('driverCard "expired" is not rejected by hard filter', () => {
    expect(buildShortlist([d('d1', { driverCard: 'expired' })], need()).shortlisted).toHaveLength(1);
  });
});

// ─── 5. Availability — kept but scored lower ──────────────────────────────────

describe('buildShortlist — availability not_yet', () => {
  it('driver with availability not_yet passes hard filters and appears in shortlist', () => {
    const result = buildShortlist([d('d1', { availability: 'not_yet' })], need());
    expect(result.shortlisted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it('not_yet driver scores lower than an immediate driver', () => {
    const drivers = [
      d('immediate', { availability: 'now' }),
      d('later',     { availability: 'not_yet' }),
    ];
    const { shortlisted } = buildShortlist(drivers, need());
    expect(shortlisted[0].driver.id).toBe('immediate');
    expect(shortlisted[0].score.total).toBeGreaterThan(shortlisted[1].score.total);
  });

  it('not_yet driver score carries the low_availability flag', () => {
    const { shortlisted } = buildShortlist([d('d1', { availability: 'not_yet' })], need());
    expect(shortlisted[0].score.flags).toContain('low_availability');
  });
});

// ─── 6. Shortlist limit ───────────────────────────────────────────────────────

describe('buildShortlist — shortlist limit', () => {
  it('caps result at 5 by default when more than 5 pass filters', () => {
    const drivers = Array.from({ length: 8 }, (_, i) => d(`d${i}`));
    const result = buildShortlist(drivers, need());
    expect(result.shortlisted).toHaveLength(5);
    expect(result.totalCandidates).toBe(8);
  });

  it('returns all passing drivers when fewer than 5 pass', () => {
    const drivers = [d('d1'), d('d2'), d('d3')];
    expect(buildShortlist(drivers, need()).shortlisted).toHaveLength(3);
  });

  it('custom limit is respected', () => {
    const drivers = Array.from({ length: 6 }, (_, i) => d(`d${i}`));
    expect(buildShortlist(drivers, need(), 3).shortlisted).toHaveLength(3);
  });
});

// ─── 7. Empty and edge cases ─────────────────────────────────────────────────

describe('buildShortlist — empty and edge cases', () => {
  it('empty driver array returns empty shortlist and no rejected', () => {
    const result = buildShortlist([], need());
    expect(result.shortlisted).toHaveLength(0);
    expect(result.rejected).toHaveLength(0);
    expect(result.totalCandidates).toBe(0);
    expect(result.totalShortlisted).toBe(0);
  });

  it('all drivers failing hard filters returns empty shortlist', () => {
    const drivers = [
      d('d1', { license: 'C' }),
      d('d2', { ykb: 'none' }),
      d('d3', { driverCard: 'no' }),
    ];
    const result = buildShortlist(drivers, need({ license_required: 'CE' }));
    expect(result.shortlisted).toHaveLength(0);
    expect(result.rejected).toHaveLength(3);
  });

  it('single passing driver produces shortlisted length 1', () => {
    expect(buildShortlist([d('d1')], need()).shortlisted).toHaveLength(1);
  });
});

// ─── 8. Rejected reasons ─────────────────────────────────────────────────────

describe('buildShortlist — rejected reasons', () => {
  it('each rejected entry contains driverId and reason', () => {
    const result = buildShortlist([d('d1', { license: 'C' })], need({ license_required: 'CE' }));
    const r = result.rejected[0];
    expect(r).toHaveProperty('driverId', 'd1');
    expect(r).toHaveProperty('reason');
    expect(typeof r.reason).toBe('string');
  });

  it('multiple drivers with different rejection reasons are all recorded', () => {
    const drivers = [
      d('lic',  { license: 'C' }),
      d('ykb',  { ykb: 'none' }),
      d('card', { driverCard: 'no' }),
    ];
    const result = buildShortlist(drivers, need({ license_required: 'CE' }));
    expect(result.rejected).toHaveLength(3);

    const reasons = result.rejected.map(r => r.reason);
    expect(reasons).toContain('license_mismatch');
    expect(reasons).toContain('ykb_invalid');
    expect(reasons).toContain('driver_card_invalid');
  });

  it('passing drivers do not appear in rejected', () => {
    const result = buildShortlist([d('good'), d('bad', { ykb: 'none' })], need());
    expect(result.rejected.map(r => r.driverId)).not.toContain('good');
    expect(result.shortlisted.map(e => e.driver.id)).not.toContain('bad');
  });
});

// ─── 9. Input immutability ────────────────────────────────────────────────────

describe('buildShortlist — immutability', () => {
  it('does not mutate the input drivers array', () => {
    const drivers = [d('d1'), d('d2'), d('d3')];
    const originalIds = drivers.map(dr => dr.id);
    buildShortlist(drivers, need());
    expect(drivers.map(dr => dr.id)).toEqual(originalIds);
    expect(drivers).toHaveLength(3);
  });

  it('does not mutate individual driver objects', () => {
    const driver = d('d1');
    const originalLicense = driver.license;
    buildShortlist([driver], need());
    expect(driver.license).toBe(originalLicense);
  });
});

// ─── 10. Deterministic ordering for equal scores ─────────────────────────────

describe('buildShortlist — deterministic ordering', () => {
  it('drivers with identical scores are sorted by id ascending', () => {
    // All three have identical profiles → identical scores → sort by id
    const drivers = [d('driver-z'), d('driver-a'), d('driver-m')];
    const { shortlisted } = buildShortlist(drivers, need());
    expect(shortlisted[0].driver.id).toBe('driver-a');
    expect(shortlisted[1].driver.id).toBe('driver-m');
    expect(shortlisted[2].driver.id).toBe('driver-z');
  });

  it('same input always produces same output order', () => {
    const drivers = [d('driver-z'), d('driver-a')];
    const first  = buildShortlist(drivers, need()).shortlisted.map(e => e.driver.id);
    const second = buildShortlist(drivers, need()).shortlisted.map(e => e.driver.id);
    expect(first).toEqual(second);
  });
});

// ─── 11. Output shape ─────────────────────────────────────────────────────────

describe('buildShortlist — output shape', () => {
  it('result has all required top-level keys', () => {
    const result = buildShortlist([d('d1')], need());
    expect(result).toHaveProperty('shortlisted');
    expect(result).toHaveProperty('rejected');
    expect(result).toHaveProperty('totalCandidates');
    expect(result).toHaveProperty('totalShortlisted');
    expect(result).toHaveProperty('summary');
  });

  it('totalCandidates equals the length of the input array', () => {
    const drivers = [d('d1'), d('d2'), d('d3')];
    expect(buildShortlist(drivers, need()).totalCandidates).toBe(3);
  });

  it('totalShortlisted equals shortlisted.length', () => {
    const result = buildShortlist([d('d1'), d('d2')], need());
    expect(result.totalShortlisted).toBe(result.shortlisted.length);
  });

  it('summary is a non-empty string', () => {
    const { summary } = buildShortlist([d('d1')], need());
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('each shortlist entry exposes driver and score', () => {
    const { shortlisted } = buildShortlist([d('d1')], need());
    const entry = shortlisted[0];
    expect(entry).toHaveProperty('driver');
    expect(entry).toHaveProperty('score');
    expect(entry.score).toHaveProperty('total');
    expect(entry.score).toHaveProperty('breakdown');
  });
});
