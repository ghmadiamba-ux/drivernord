import type { IngestedDriver } from './ingestedDriver';

export type ScoreTier = 'HIGH' | 'MEDIUM' | 'LOW';

export type ScoreFlag =
  | 'bus_segment'
  | 'ykb_missing'
  | 'ykb_in_progress'
  | 'ykb_expired'
  | 'relocation_required'
  | 'abroad_origin'
  | 'driver_card_expired'
  | 'driver_card_missing'
  | 'available_later';

export interface ScoreBreakdown {
  license:      number;  // 0–35
  ykb:          number;  // 0–25
  availability: number;  // 0–20
  location:     number;  // 0–20
}

export interface DriverScore {
  total:     number;
  tier:      ScoreTier;
  breakdown: ScoreBreakdown;
  flags:     ScoreFlag[];
  summary:   string;
}

// ─── dimension points ─────────────────────────────────────────────────────────

function licensePoints(license: IngestedDriver['license']): number {
  switch (license) {
    case 'CE+D': return 35;
    case 'CE':   return 33;
    case 'C+D':  return 31;
    case 'C':    return 28;
    case 'D':    return 18;
    case 'none': return 0;
  }
}

function ykbPoints(ykb: IngestedDriver['ykb']): number {
  switch (ykb) {
    case 'valid':       return 25;
    case 'in_progress': return 14;
    case 'expired':     return 7;
    case 'none':        return 0;
    case 'unknown':     return 0;
  }
}

function availabilityPoints(availability: IngestedDriver['availability']): number {
  switch (availability) {
    case 'now':      return 20;
    case '2_weeks':  return 14;
    case '1_month':  return 7;
    case 'not_yet':  return 2;
  }
}

function locationPoints(driver: IngestedDriver): number {
  const { region, willingToRelocate } = driver.location;
  const relocates = willingToRelocate ?? false;
  if (region === 'stockholm')     return 20;
  if (region === 'other_sweden')  return relocates ? 13 : 5;
  return relocates ? 7 : 1; // abroad
}

// ─── flags ────────────────────────────────────────────────────────────────────

function collectFlags(driver: IngestedDriver): ScoreFlag[] {
  const flags: ScoreFlag[] = [];
  if (driver.license === 'D')                                         flags.push('bus_segment');
  if (driver.ykb === 'none' || driver.ykb === 'unknown')             flags.push('ykb_missing');
  if (driver.ykb === 'in_progress')                                   flags.push('ykb_in_progress');
  if (driver.ykb === 'expired')                                       flags.push('ykb_expired');
  if (driver.location.region !== 'stockholm')                         flags.push('relocation_required');
  if (driver.location.region === 'abroad')                            flags.push('abroad_origin');
  if (driver.driverCard === 'expired')                                flags.push('driver_card_expired');
  if (driver.driverCard === 'no' || driver.driverCard === 'unknown')  flags.push('driver_card_missing');
  if (driver.availability === 'not_yet')                              flags.push('available_later');
  return flags;
}

// ─── tier ─────────────────────────────────────────────────────────────────────

function baseTier(total: number): ScoreTier {
  if (total >= 72) return 'HIGH';
  if (total >= 42) return 'MEDIUM';
  return 'LOW';
}

function applyTierCaps(tier: ScoreTier, flags: ScoreFlag[]): ScoreTier {
  if (tier === 'HIGH' && (flags.includes('bus_segment') || flags.includes('ykb_missing'))) {
    return 'MEDIUM';
  }
  return tier;
}

// ─── summary ─────────────────────────────────────────────────────────────────

function buildSummary(driver: IngestedDriver, flags: ScoreFlag[]): string {
  const licenseLabel: Record<IngestedDriver['license'], string> = {
    'CE+D': 'CE+D license',
    'CE':   'CE license',
    'C+D':  'C+D license',
    'C':    'C license',
    'D':    'D license',
    'none': 'no license',
  };

  const ykbLabel: Record<IngestedDriver['ykb'], string> = {
    valid:       'valid YKB',
    in_progress: 'YKB in progress',
    expired:     'YKB expired',
    none:        'no YKB',
    unknown:     'YKB unknown',
  };

  const availLabel: Record<IngestedDriver['availability'], string> = {
    now:      'available now',
    '2_weeks':  'available in 2 weeks',
    '1_month':  'available in 1 month',
    not_yet:  'not yet available',
  };

  const { region, willingToRelocate } = driver.location;
  let locationLabel: string;
  if (region === 'stockholm') {
    locationLabel = 'Stockholm';
  } else if (region === 'other_sweden') {
    locationLabel = willingToRelocate ? 'other Sweden (willing to relocate)' : 'other Sweden (not relocating)';
  } else {
    locationLabel = willingToRelocate ? 'abroad (willing to relocate)' : 'abroad (not relocating)';
  }

  const parts = [
    licenseLabel[driver.license],
    ykbLabel[driver.ykb],
    availLabel[driver.availability],
    locationLabel,
  ];

  const suffixes: string[] = [];
  if (flags.includes('bus_segment')) suffixes.push('bus segment');
  if (flags.includes('ykb_missing')) suffixes.push('YKB missing');

  const base = parts.join(', ');
  return suffixes.length > 0 ? `${base} — ${suffixes.join(', ')}` : base;
}

// ─── main export ──────────────────────────────────────────────────────────────

export function scoreDriver(driver: IngestedDriver): DriverScore {
  const breakdown: ScoreBreakdown = {
    license:      licensePoints(driver.license),
    ykb:          ykbPoints(driver.ykb),
    availability: availabilityPoints(driver.availability),
    location:     locationPoints(driver),
  };

  const total = breakdown.license + breakdown.ykb + breakdown.availability + breakdown.location;
  const flags = collectFlags(driver);
  const tier  = applyTierCaps(baseTier(total), flags);
  const summary = buildSummary(driver, flags);

  return { total, tier, breakdown, flags, summary };
}
