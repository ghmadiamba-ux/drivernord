import { randomUUID } from 'node:crypto';
import { db } from './db';
import type { ShortlistResult } from './matchingEngine';

// ─── Store functions ──────────────────────────────────────────────────────────

export async function createShortlist(
  needId: string,
  result: ShortlistResult,
): Promise<string> {
  const shortlistId = randomUUID();

  // 1. Insert shortlists header row
  const { error: shortlistError } = await db.from('shortlists').insert({
    id:                shortlistId,
    company_need_id:   needId,
    total_candidates:  result.totalCandidates,
    total_shortlisted: result.totalShortlisted,
    summary:           result.summary,
  });

  if (shortlistError) {
    throw new Error(`shortlistStore.createShortlist (header) failed: ${shortlistError.message}`);
  }

  // 2. Insert one shortlist_entries row per shortlisted driver
  if (result.shortlisted.length > 0) {
    const entries = result.shortlisted.map((entry, index) => ({
      shortlist_id: shortlistId,
      driver_id:    entry.driver.id,
      rank:         index + 1,
      match_score:  entry.score.total,
      breakdown:    entry.score.breakdown,
      flags:        entry.score.flags,
      summary:      entry.score.summary,
      driver_snapshot: {
        license:            entry.driver.license,
        ykb:                entry.driver.ykb,
        driverCard:         entry.driver.driverCard,
        region:             entry.driver.location.region,
        willingToRelocate:  entry.driver.location.willingToRelocate,
        availability:       entry.driver.availability,
        domain:             entry.driver.domain,
        shiftPreference:    entry.driver.shiftPreference,
      },
    }));

    const { error: entriesError } = await db.from('shortlist_entries').insert(entries);

    if (entriesError) {
      throw new Error(`shortlistStore.createShortlist (entries) failed: ${entriesError.message}`);
    }
  }

  return shortlistId;
}
