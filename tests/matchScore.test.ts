import { describe, it, expect } from 'vitest';
import { matchScore } from '../lib/matchScore';
import type { MatchNeed } from '../lib/matchScore';
import type { IngestedDriver } from '../lib/ingestedDriver';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseDriver = (overrides: Partial<IngestedDriver> = {}): IngestedDriver => ({
  id: 'driver-1',
  ingestedAt: new Date('2026-05-01T10:00:00.000Z'),
  priority: 'HIGH',
  license: 'CE',
  ykb: 'valid',
  driverCard: 'valid',
  location: { region: 'stockholm', willingToRelocate: null },
  availability: 'now',
  domain: 'distribution',
  shiftPreference: 'day',
  needsFollowUp: false,
  followUpAt: null,
  followUpReason: null,
  ...overrides,
});

const baseNeed = (overrides: Partial<MatchNeed> = {}): MatchNeed => ({
  license_required:   'CE',
  domain_required:    'distribution',
  domain_preferred:   [],
  location_region:    'stockholm',
  relocation_allowed: true,
  shift_type:         'day',
  urgency:            'standard',
  ...overrides,
});

// Perfect match expected total:
// license(100)×0.25 + domain(100)×0.25 + location(100)×0.20
// + availability(100)×0.10 + shift(100)×0.10 + salary(75)×0.10
// = 25 + 25 + 20 + 10 + 10 + 7.5 = 97.5 → 98
const PERFECT = 98;

// ─── 1. Perfect match ─────────────────────────────────────────────────────────

describe('matchScore — perfect match', () => {
  it('returns total ≥ 90 for a driver matching on every dimension', () => {
    const result = matchScore(baseDriver(), baseNeed());
    expect(result.total).toBeGreaterThanOrEqual(90);
  });

  it('perfect match total is 98', () => {
    expect(matchScore(baseDriver(), baseNeed()).total).toBe(PERFECT);
  });

  it('all breakdown dimensions are at maximum (except salary placeholder)', () => {
    const { breakdown } = matchScore(baseDriver(), baseNeed());
    expect(breakdown.license).toBe(100);
    expect(breakdown.domain).toBe(100);
    expect(breakdown.location).toBe(100);
    expect(breakdown.availability).toBe(100);
    expect(breakdown.shift).toBe(100);
    expect(breakdown.salary).toBe(75);
  });

  it('no flags for a perfect match', () => {
    expect(matchScore(baseDriver(), baseNeed()).flags).toEqual([]);
  });

  it('total is always an integer', () => {
    const { total } = matchScore(baseDriver(), baseNeed());
    expect(Number.isInteger(total)).toBe(true);
  });

  it('inputs are not mutated', () => {
    const driver = baseDriver();
    const need   = baseNeed();
    const domainBefore = driver.domain;
    matchScore(driver, need);
    expect(driver.domain).toBe(domainBefore);
    expect(need.license_required).toBe('CE');
  });
});

// ─── 2. License scoring ───────────────────────────────────────────────────────

describe('matchScore — license scoring', () => {
  it('C driver does not satisfy CE requirement → total = 0', () => {
    expect(matchScore(baseDriver({ license: 'C' }), baseNeed({ license_required: 'CE' })).total).toBe(0);
  });

  it('D driver does not satisfy C requirement → total = 0', () => {
    expect(matchScore(baseDriver({ license: 'D' }), baseNeed({ license_required: 'C' })).total).toBe(0);
  });

  it('CE driver satisfies C requirement (overcertified)', () => {
    expect(matchScore(baseDriver({ license: 'CE' }), baseNeed({ license_required: 'C' })).total).toBeGreaterThan(0);
  });

  it('CE+D satisfies CE requirement', () => {
    expect(matchScore(baseDriver({ license: 'CE+D' }), baseNeed({ license_required: 'CE' })).total).toBeGreaterThan(0);
  });

  it('CE+D satisfies D requirement', () => {
    expect(matchScore(baseDriver({ license: 'CE+D' }), baseNeed({ license_required: 'D' })).total).toBeGreaterThan(0);
  });

  it('C+D satisfies D requirement', () => {
    expect(matchScore(baseDriver({ license: 'C+D' }), baseNeed({ license_required: 'D' })).total).toBeGreaterThan(0);
  });

  it('license mismatch sets all breakdown values to 0', () => {
    const { breakdown } = matchScore(baseDriver({ license: 'C' }), baseNeed({ license_required: 'CE' }));
    expect(breakdown).toEqual({ license: 0, domain: 0, location: 0, availability: 0, shift: 0, salary: 0 });
  });

  it('license mismatch summary describes the reason', () => {
    const { summary } = matchScore(baseDriver({ license: 'C' }), baseNeed({ license_required: 'CE' }));
    expect(summary.toLowerCase()).toContain('license');
  });
});

// ─── 3. Domain scoring ────────────────────────────────────────────────────────

describe('matchScore — domain scoring', () => {
  it('exact domain match → breakdown.domain = 100', () => {
    const { breakdown } = matchScore(
      baseDriver({ domain: 'kylfrys' }),
      baseNeed({ domain_required: 'kylfrys' }),
    );
    expect(breakdown.domain).toBe(100);
  });

  it('domain in preferred list → breakdown.domain = 60', () => {
    const { breakdown } = matchScore(
      baseDriver({ domain: 'schakt_bygg' }),
      baseNeed({ domain_required: 'distribution', domain_preferred: ['schakt_bygg', 'tipp'] }),
    );
    expect(breakdown.domain).toBe(60);
  });

  it('domain not in required or preferred → breakdown.domain = 0', () => {
    const { breakdown } = matchScore(
      baseDriver({ domain: 'kran' }),
      baseNeed({ domain_required: 'distribution', domain_preferred: [] }),
    );
    expect(breakdown.domain).toBe(0);
  });

  it('domain null → breakdown.domain = 0', () => {
    expect(matchScore(baseDriver({ domain: null }), baseNeed()).breakdown.domain).toBe(0);
  });

  it('domain null adds domain_missing flag', () => {
    expect(matchScore(baseDriver({ domain: null }), baseNeed()).flags).toContain('domain_missing');
  });

  it('domain null reduces total vs perfect match', () => {
    // license(100)×0.25 + domain(0)×0.25 + location(100)×0.20
    // + avail(100)×0.10 + shift(100)×0.10 + salary(75)×0.10
    // = 25 + 0 + 20 + 10 + 10 + 7.5 = 72.5 → 73
    expect(matchScore(baseDriver({ domain: null }), baseNeed()).total).toBe(73);
  });

  it('domain in preferred total = 88', () => {
    // domain(60)×0.25 = 15 → 25+15+20+10+10+7.5 = 87.5 → 88
    const result = matchScore(
      baseDriver({ domain: 'schakt_bygg' }),
      baseNeed({ domain_required: 'distribution', domain_preferred: ['schakt_bygg'] }),
    );
    expect(result.total).toBe(88);
  });
});

// ─── 4. Location scoring ──────────────────────────────────────────────────────

describe('matchScore — location scoring', () => {
  it('same region → breakdown.location = 100', () => {
    const { breakdown } = matchScore(
      baseDriver({ location: { region: 'stockholm', willingToRelocate: null } }),
      baseNeed({ location_region: 'stockholm' }),
    );
    expect(breakdown.location).toBe(100);
  });

  it('different region + willing + relocation_allowed → breakdown.location = 60', () => {
    const { breakdown } = matchScore(
      baseDriver({ location: { region: 'other_sweden', willingToRelocate: true } }),
      baseNeed({ location_region: 'stockholm', relocation_allowed: true }),
    );
    expect(breakdown.location).toBe(60);
  });

  it('different region + willing but relocation_allowed:false → breakdown.location = 0', () => {
    const { breakdown } = matchScore(
      baseDriver({ location: { region: 'other_sweden', willingToRelocate: true } }),
      baseNeed({ location_region: 'stockholm', relocation_allowed: false }),
    );
    expect(breakdown.location).toBe(0);
  });

  it('different region + not willing → breakdown.location = 0', () => {
    const { breakdown } = matchScore(
      baseDriver({ location: { region: 'other_sweden', willingToRelocate: false } }),
      baseNeed({ location_region: 'stockholm' }),
    );
    expect(breakdown.location).toBe(0);
  });

  it('relocation case adds relocation_required flag', () => {
    const { flags } = matchScore(
      baseDriver({ location: { region: 'other_sweden', willingToRelocate: true } }),
      baseNeed({ location_region: 'stockholm', relocation_allowed: true }),
    );
    expect(flags).toContain('relocation_required');
  });

  it('same region does not add relocation_required flag', () => {
    expect(matchScore(baseDriver(), baseNeed()).flags).not.toContain('relocation_required');
  });

  it('relocation case total = 90', () => {
    // location(60)×0.20 = 12 → 25+25+12+10+10+7.5 = 89.5 → 90
    const result = matchScore(
      baseDriver({ location: { region: 'other_sweden', willingToRelocate: true } }),
      baseNeed({ location_region: 'stockholm', relocation_allowed: true }),
    );
    expect(result.total).toBe(90);
  });
});

// ─── 5. Availability scoring ──────────────────────────────────────────────────

describe('matchScore — availability scoring', () => {
  it('now → breakdown.availability = 100', () => {
    expect(matchScore(baseDriver({ availability: 'now' }), baseNeed()).breakdown.availability).toBe(100);
  });

  it('2_weeks → breakdown.availability = 70', () => {
    // avail(70)×0.10 = 7 → 25+25+20+7+10+7.5 = 94.5 → 95
    const result = matchScore(baseDriver({ availability: '2_weeks' }), baseNeed());
    expect(result.breakdown.availability).toBe(70);
    expect(result.total).toBe(95);
  });

  it('1_month → breakdown.availability = 40', () => {
    // avail(40)×0.10 = 4 → 25+25+20+4+10+7.5 = 91.5 → 92
    const result = matchScore(baseDriver({ availability: '1_month' }), baseNeed());
    expect(result.breakdown.availability).toBe(40);
    expect(result.total).toBe(92);
  });

  it('not_yet → breakdown.availability = 10', () => {
    // avail(10)×0.10 = 1 → 25+25+20+1+10+7.5 = 88.5 → 89
    const result = matchScore(baseDriver({ availability: 'not_yet' }), baseNeed());
    expect(result.breakdown.availability).toBe(10);
    expect(result.total).toBe(89);
  });

  it('not_yet adds low_availability flag', () => {
    expect(matchScore(baseDriver({ availability: 'not_yet' }), baseNeed()).flags).toContain('low_availability');
  });

  it('now does not add low_availability flag', () => {
    expect(matchScore(baseDriver({ availability: 'now' }), baseNeed()).flags).not.toContain('low_availability');
  });
});

// ─── 6. Shift scoring ─────────────────────────────────────────────────────────

describe('matchScore — shift scoring', () => {
  it('exact shift match → breakdown.shift = 100', () => {
    expect(matchScore(baseDriver({ shiftPreference: 'night' }), baseNeed({ shift_type: 'night' })).breakdown.shift).toBe(100);
  });

  it('driver flexible → breakdown.shift = 90', () => {
    // pref(flexible) + need(day) → 90
    // shift(90)×0.10 = 9 → 25+25+20+10+9+7.5 = 96.5 → 97
    const result = matchScore(baseDriver({ shiftPreference: 'flexible' }), baseNeed({ shift_type: 'day' }));
    expect(result.breakdown.shift).toBe(90);
    expect(result.total).toBe(97);
  });

  it('need flexible → breakdown.shift = 100 (employer accepts any)', () => {
    const result = matchScore(baseDriver({ shiftPreference: 'day' }), baseNeed({ shift_type: 'flexible' }));
    expect(result.breakdown.shift).toBe(100);
  });

  it('shift mismatch (night driver, day need) → breakdown.shift = 40', () => {
    // shift(40)×0.10 = 4 → 25+25+20+10+4+7.5 = 91.5 → 92
    const result = matchScore(baseDriver({ shiftPreference: 'night' }), baseNeed({ shift_type: 'day' }));
    expect(result.breakdown.shift).toBe(40);
    expect(result.total).toBe(92);
  });

  it('shift mismatch adds shift_mismatch flag', () => {
    const { flags } = matchScore(baseDriver({ shiftPreference: 'night' }), baseNeed({ shift_type: 'day' }));
    expect(flags).toContain('shift_mismatch');
  });

  it('non-mismatch does not add shift_mismatch flag', () => {
    expect(matchScore(baseDriver({ shiftPreference: 'day' }), baseNeed({ shift_type: 'day' })).flags).not.toContain('shift_mismatch');
  });

  // Null fallback cases — shiftPreference was not collected (driver skipped the step)
  it('null shift + day need → breakdown.shift = 70', () => {
    // shift(70)×0.10 = 7 → 25+25+20+10+7+7.5 = 94.5 → 95
    const result = matchScore(baseDriver({ shiftPreference: null }), baseNeed({ shift_type: 'day' }));
    expect(result.breakdown.shift).toBe(70);
    expect(result.total).toBe(95);
  });

  it('null shift + night need → breakdown.shift = 50', () => {
    // shift(50)×0.10 = 5 → 25+25+20+10+5+7.5 = 92.5 → 93
    const result = matchScore(baseDriver({ shiftPreference: null }), baseNeed({ shift_type: 'night' }));
    expect(result.breakdown.shift).toBe(50);
    expect(result.total).toBe(93);
  });

  it('null shift + weekend need → breakdown.shift = 60', () => {
    // shift(60)×0.10 = 6 → 25+25+20+10+6+7.5 = 93.5 → 94
    const result = matchScore(baseDriver({ shiftPreference: null }), baseNeed({ shift_type: 'weekend' }));
    expect(result.breakdown.shift).toBe(60);
    expect(result.total).toBe(94);
  });

  it('null shift + flexible need → breakdown.shift = 100', () => {
    const result = matchScore(baseDriver({ shiftPreference: null }), baseNeed({ shift_type: 'flexible' }));
    expect(result.breakdown.shift).toBe(100);
    expect(result.total).toBe(PERFECT);
  });

  it('null shift does not add shift_mismatch flag', () => {
    expect(matchScore(baseDriver({ shiftPreference: null }), baseNeed({ shift_type: 'day' })).flags).not.toContain('shift_mismatch');
  });
});

// ─── 7. Salary scoring ────────────────────────────────────────────────────────

describe('matchScore — salary scoring', () => {
  it('salary is always 75 (placeholder until behavioral inference exists)', () => {
    expect(matchScore(baseDriver(), baseNeed()).breakdown.salary).toBe(75);
  });

  it('salary is 75 regardless of urgency', () => {
    expect(matchScore(baseDriver(), baseNeed({ urgency: 'emergency' })).breakdown.salary).toBe(75);
  });
});

// ─── 8. Flags ─────────────────────────────────────────────────────────────────

describe('matchScore — flags', () => {
  it('all four flags are raised when conditions are met simultaneously', () => {
    const driver = baseDriver({
      domain:           null,
      availability:     'not_yet',
      shiftPreference:  'night',
      location:         { region: 'other_sweden', willingToRelocate: true },
    });
    const need = baseNeed({ shift_type: 'day', relocation_allowed: true });
    const { flags } = matchScore(driver, need);
    expect(flags).toContain('domain_missing');
    expect(flags).toContain('relocation_required');
    expect(flags).toContain('shift_mismatch');
    expect(flags).toContain('low_availability');
  });

  it('no flags for a clean driver', () => {
    expect(matchScore(baseDriver(), baseNeed()).flags).toEqual([]);
  });

  it('total with all four flag conditions = 50', () => {
    // license(100)×0.25 + domain(0)×0.25 + location(60)×0.20
    // + avail(10)×0.10 + shift(40)×0.10 + salary(75)×0.10
    // = 25 + 0 + 12 + 1 + 4 + 7.5 = 49.5 → 50
    const driver = baseDriver({
      domain:          null,
      availability:    'not_yet',
      shiftPreference: 'night',
      location:        { region: 'other_sweden', willingToRelocate: true },
    });
    expect(matchScore(driver, baseNeed({ shift_type: 'day', relocation_allowed: true })).total).toBe(50);
  });
});

// ─── 9. Summary ───────────────────────────────────────────────────────────────

describe('matchScore — summary', () => {
  it('summary is a non-empty string', () => {
    const { summary } = matchScore(baseDriver(), baseNeed());
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('high-scoring match summary contains "Strong match"', () => {
    expect(matchScore(baseDriver(), baseNeed()).summary).toContain('Strong match');
  });

  it('license mismatch summary does not contain "Strong match"', () => {
    const { summary } = matchScore(baseDriver({ license: 'C' }), baseNeed({ license_required: 'CE' }));
    expect(summary).not.toContain('Strong match');
  });

  it('summary is deterministic — same inputs produce same summary', () => {
    const a = matchScore(baseDriver(), baseNeed()).summary;
    const b = matchScore(baseDriver(), baseNeed()).summary;
    expect(a).toBe(b);
  });
});

// ─── 10. Output shape ─────────────────────────────────────────────────────────

describe('matchScore — output shape', () => {
  it('result has total, breakdown, flags, summary', () => {
    const result = matchScore(baseDriver(), baseNeed());
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('breakdown');
    expect(result).toHaveProperty('flags');
    expect(result).toHaveProperty('summary');
  });

  it('breakdown has all six dimensions', () => {
    const { breakdown } = matchScore(baseDriver(), baseNeed());
    expect(breakdown).toHaveProperty('license');
    expect(breakdown).toHaveProperty('domain');
    expect(breakdown).toHaveProperty('location');
    expect(breakdown).toHaveProperty('availability');
    expect(breakdown).toHaveProperty('shift');
    expect(breakdown).toHaveProperty('salary');
  });

  it('total is within 0–100', () => {
    const { total } = matchScore(baseDriver(), baseNeed());
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(100);
  });
});
