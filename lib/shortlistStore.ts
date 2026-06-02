import { randomUUID } from 'node:crypto';
import { db } from './db';
import type { ShortlistResult } from './matchingEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContactStatus = 'new' | 'contacted' | 'interested' | 'not_interested';

export const VALID_CONTACT_STATUSES: readonly ContactStatus[] = [
  'new',
  'contacted',
  'interested',
  'not_interested',
];

export interface ShortlistEntryRecord {
  id:              string;
  shortlist_id:    string;
  driver_id:       string;
  rank:            number;
  match_score:     number;
  breakdown:       Record<string, number>;
  flags:           string[];
  summary:         string;
  driver_snapshot: Record<string, unknown>;
  contact_status:  ContactStatus;
  recruiter_note:  string | null;
  contacted_at:    Date | null;
  updated_at:      Date;
  created_at:      Date;
}

export interface ShortlistRecord {
  id:                string;
  company_need_id:   string;
  created_at:        Date;
  total_candidates:  number;
  total_shortlisted: number;
  summary:           string;
  entries:           ShortlistEntryRecord[];
}

export interface CreateShortlistResult {
  shortlistId:        string;
  entryIdsByDriverId: Record<string, string>;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

const CONTACTED_STATUSES: readonly ContactStatus[] = ['contacted', 'interested', 'not_interested'];

// ─── Store functions ──────────────────────────────────────────────────────────

export async function createShortlist(
  needId: string,
  result: ShortlistResult,
): Promise<CreateShortlistResult> {
  const shortlistId = randomUUID();

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

  const entryIdsByDriverId: Record<string, string> = {};

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
        license:           entry.driver.license,
        ykb:               entry.driver.ykb,
        driverCard:        entry.driver.driverCard,
        region:            entry.driver.location.region,
        willingToRelocate: entry.driver.location.willingToRelocate,
        availability:      entry.driver.availability,
        domain:            entry.driver.domain,
        shiftPreference:   entry.driver.shiftPreference,
        firstName:         entry.driver.contact.firstName,
        phone:             entry.driver.contact.phone,
        email:             entry.driver.contact.email,
      },
    }));

    const { data: inserted, error: entriesError } = await db
      .from('shortlist_entries')
      .insert(entries)
      .select('id, driver_id');

    if (entriesError) {
      throw new Error(`shortlistStore.createShortlist (entries) failed: ${entriesError.message}`);
    }

    for (const row of inserted ?? []) {
      entryIdsByDriverId[row.driver_id] = row.id;
    }
  }

  return { shortlistId, entryIdsByDriverId };
}

export async function getShortlist(shortlistId: string): Promise<ShortlistRecord | null> {
  const { data: header, error: headerError } = await db
    .from('shortlists')
    .select('*')
    .eq('id', shortlistId)
    .single();

  if (headerError) {
    if (headerError.code === 'PGRST116') return null;
    throw new Error(`shortlistStore.getShortlist (header) failed: ${headerError.message}`);
  }

  const { data: rawEntries, error: entriesError } = await db
    .from('shortlist_entries')
    .select('*')
    .eq('shortlist_id', shortlistId)
    .order('rank', { ascending: true });

  if (entriesError) {
    throw new Error(`shortlistStore.getShortlist (entries) failed: ${entriesError.message}`);
  }

  return {
    id:                header.id,
    company_need_id:   header.company_need_id,
    created_at:        new Date(header.created_at),
    total_candidates:  header.total_candidates,
    total_shortlisted: header.total_shortlisted,
    summary:           header.summary,
    entries: (rawEntries ?? []).map((e) => ({
      id:              e.id,
      shortlist_id:    e.shortlist_id,
      driver_id:       e.driver_id,
      rank:            e.rank,
      match_score:     e.match_score,
      breakdown:       e.breakdown as Record<string, number>,
      flags:           e.flags as string[],
      summary:         e.summary,
      driver_snapshot: e.driver_snapshot as Record<string, unknown>,
      contact_status:  e.contact_status as ContactStatus,
      recruiter_note:  e.recruiter_note ?? null,
      contacted_at:    e.contacted_at ? new Date(e.contacted_at) : null,
      updated_at:      new Date(e.updated_at),
      created_at:      new Date(e.created_at),
    })),
  };
}

// Returns the most-recent shortlist for a given company_need, or null if none exists.
export async function getShortlistByNeedId(needId: string): Promise<{
  id:                string;
  created_at:        string;
  total_shortlisted: number;
} | null> {
  const { data, error } = await db
    .from('shortlists')
    .select('id, created_at, total_shortlisted')
    .eq('company_need_id', needId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return null;
  if (!data || data.length === 0) return null;
  const row = data[0] as { id: string; created_at: string; total_shortlisted: number };
  return { id: row.id, created_at: row.created_at, total_shortlisted: row.total_shortlisted };
}

export async function updateShortlistEntry(
  entryId: string,
  input: { contact_status?: ContactStatus; recruiter_note?: string },
): Promise<void> {
  const { data: current, error: readError } = await db
    .from('shortlist_entries')
    .select('contacted_at')
    .eq('id', entryId)
    .single();

  if (readError) {
    if (readError.code === 'PGRST116') throw new Error('entry_not_found');
    throw new Error(`shortlistStore.updateShortlistEntry (read) failed: ${readError.message}`);
  }

  const now = new Date().toISOString();
  const shouldSetContactedAt =
    input.contact_status !== undefined &&
    CONTACTED_STATUSES.includes(input.contact_status) &&
    !current.contacted_at;

  const patch: Record<string, unknown> = { updated_at: now };
  if (input.contact_status !== undefined) patch.contact_status = input.contact_status;
  if (input.recruiter_note !== undefined) patch.recruiter_note = input.recruiter_note;
  if (shouldSetContactedAt) patch.contacted_at = now;

  const { error: updateError } = await db
    .from('shortlist_entries')
    .update(patch)
    .eq('id', entryId);

  if (updateError) {
    throw new Error(`shortlistStore.updateShortlistEntry (update) failed: ${updateError.message}`);
  }
}
