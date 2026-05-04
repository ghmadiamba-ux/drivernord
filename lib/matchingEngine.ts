import type { IngestedDriver } from './ingestedDriver';
import type { License } from '../types/lead';
import { matchScore } from './matchScore';
import type { MatchNeed, MatchScore } from './matchScore';

export interface ShortlistEntry {
  driver: IngestedDriver;
  score:  MatchScore;
}

export interface RejectedDriver {
  driverId: string;
  reason:   string;
}

export interface ShortlistResult {
  shortlisted:      ShortlistEntry[];
  rejected:         RejectedDriver[];
  totalCandidates:  number;
  totalShortlisted: number;
  summary:          string;
}

// Mirror of matchScore.ts §LICENSE_COVERS — not exported from there, kept minimal here.
const LICENSE_COVERS: Record<License, readonly License[]> = {
  none:    [],
  C:       ['C'],
  CE:      ['C', 'CE'],
  D:       ['D'],
  'C+D':   ['C', 'D'],
  'CE+D':  ['C', 'CE', 'D', 'C+D', 'CE+D'],
};

function licenseSatisfied(driverLicense: License, required: License): boolean {
  return (LICENSE_COVERS[driverLicense] as License[]).includes(required);
}

function buildSummary(shortlisted: number, total: number): string {
  if (total === 0)        return 'No candidates provided';
  if (shortlisted === 0)  return `No candidates passed hard filters (${total} evaluated)`;
  return `${shortlisted} of ${total} candidate${total === 1 ? '' : 's'} shortlisted`;
}

export function buildShortlist(
  drivers: IngestedDriver[],
  need:    MatchNeed,
  limit    = 5,
): ShortlistResult {
  const eligible: ShortlistEntry[] = [];
  const rejected: RejectedDriver[] = [];

  for (const driver of drivers) {
    if (!licenseSatisfied(driver.license, need.license_required)) {
      rejected.push({ driverId: driver.id, reason: 'license_mismatch' });
      continue;
    }

    if (driver.ykb === 'none' || driver.ykb === 'unknown') {
      rejected.push({ driverId: driver.id, reason: 'ykb_invalid' });
      continue;
    }

    if (driver.driverCard === 'no' || driver.driverCard === 'unknown') {
      rejected.push({ driverId: driver.id, reason: 'driver_card_invalid' });
      continue;
    }

    eligible.push({ driver, score: matchScore(driver, need) });
  }

  // Primary sort: score descending. Tiebreaker: id ascending (deterministic).
  eligible.sort((a, b) =>
    b.score.total !== a.score.total
      ? b.score.total - a.score.total
      : a.driver.id.localeCompare(b.driver.id),
  );

  const shortlisted = eligible.slice(0, limit);

  return {
    shortlisted,
    rejected,
    totalCandidates:  drivers.length,
    totalShortlisted: shortlisted.length,
    summary:          buildSummary(shortlisted.length, drivers.length),
  };
}
