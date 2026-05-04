import type { IngestedDriver } from './ingestedDriver';
import type { License, Domain, Region } from '../types/lead';

// Minimal CompanyNeed shape required for match scoring.
// Full model is defined in docs/company-need-model-v1.md.
export interface MatchNeed {
  license_required:   License;
  domain_required:    Domain;
  domain_preferred:   Domain[];
  location_region:    Region;
  relocation_allowed: boolean;
  shift_type:         'day' | 'night' | 'weekend' | 'flexible';
  urgency:            'standard' | 'urgent' | 'emergency';
}

export interface MatchBreakdown {
  license:      number;
  domain:       number;
  location:     number;
  availability: number;
  shift:        number;
  salary:       number;
}

export interface MatchScore {
  total:     number;
  breakdown: MatchBreakdown;
  flags:     string[];
  summary:   string;
}

// Source: docs/matching-engine-v1.md §2.1
const LICENSE_COVERS: Record<License, readonly License[]> = {
  none:    [],
  C:       ['C'],
  CE:      ['C', 'CE'],
  D:       ['D'],
  'C+D':   ['C', 'D'],
  'CE+D':  ['C', 'CE', 'D', 'C+D', 'CE+D'],
};

const WEIGHTS = {
  license:      0.25,
  domain:       0.25,
  location:     0.20,
  availability: 0.10,
  shift:        0.10,
  salary:       0.10,
} as const;

function licenseSatisfied(driverLicense: License, required: License): boolean {
  return (LICENSE_COVERS[driverLicense] as License[]).includes(required);
}

function scoreDomain(driver: IngestedDriver, need: MatchNeed): number {
  const d = driver.domain ?? null;
  if (d === null) return 0;
  if (d === need.domain_required) return 100;
  if (need.domain_preferred.includes(d)) return 60;
  return 0;
}

function scoreLocation(driver: IngestedDriver, need: MatchNeed): number {
  if (driver.location.region === need.location_region) return 100;
  if (need.relocation_allowed && driver.location.willingToRelocate) return 60;
  return 0;
}

function scoreAvailability(driver: IngestedDriver): number {
  switch (driver.availability) {
    case 'now':     return 100;
    case '2_weeks': return 70;
    case '1_month': return 40;
    case 'not_yet': return 10;
  }
}

function scoreShift(driver: IngestedDriver, need: MatchNeed): number {
  const pref = driver.shiftPreference ?? null;

  if (pref === null) {
    switch (need.shift_type) {
      case 'day':      return 70;
      case 'night':    return 50;
      case 'weekend':  return 60;
      case 'flexible': return 100;
    }
  }

  if (pref === need.shift_type)       return 100; // exact match
  if (need.shift_type === 'flexible') return 100; // employer accepts any
  if (pref === 'flexible')            return 90;  // driver accepts any
  return 40;                                       // mismatch
}

function buildFlags(driver: IngestedDriver, breakdown: MatchBreakdown): string[] {
  const flags: string[] = [];
  if ((driver.domain ?? null) === null)  flags.push('domain_missing');
  if (breakdown.location === 60)         flags.push('relocation_required');
  if (breakdown.shift === 40)            flags.push('shift_mismatch');
  if (driver.availability === 'not_yet') flags.push('low_availability');
  return flags;
}

function buildSummary(total: number, breakdown: MatchBreakdown): string {
  const parts: string[] = ['correct license'];

  if (breakdown.domain === 100)      parts.push('domain aligned');
  else if (breakdown.domain === 60)  parts.push('domain partially aligned');
  else                               parts.push('domain unknown');

  if (breakdown.availability === 100)      parts.push('immediate availability');
  else if (breakdown.availability >= 70)   parts.push('available soon');
  else                                     parts.push('delayed availability');

  const prefix =
    total >= 80 ? 'Strong match' :
    total >= 60 ? 'Good match'   :
    total >= 40 ? 'Partial match' :
                  'Weak match';

  return `${prefix} — ${parts.join(', ')}`;
}

export function matchScore(driver: IngestedDriver, need: MatchNeed): MatchScore {
  if (!licenseSatisfied(driver.license, need.license_required)) {
    return {
      total:     0,
      breakdown: { license: 0, domain: 0, location: 0, availability: 0, shift: 0, salary: 0 },
      flags:     [],
      summary:   'No match — license category does not meet the requirement',
    };
  }

  const breakdown: MatchBreakdown = {
    license:      100,
    domain:       scoreDomain(driver, need),
    location:     scoreLocation(driver, need),
    availability: scoreAvailability(driver),
    shift:        scoreShift(driver, need),
    salary:       75,
  };

  const total = Math.round(
    breakdown.license      * WEIGHTS.license      +
    breakdown.domain       * WEIGHTS.domain       +
    breakdown.location     * WEIGHTS.location     +
    breakdown.availability * WEIGHTS.availability +
    breakdown.shift        * WEIGHTS.shift        +
    breakdown.salary       * WEIGHTS.salary,
  );

  const flags   = buildFlags(driver, breakdown);
  const summary = buildSummary(total, breakdown);

  return { total, breakdown, flags, summary };
}
