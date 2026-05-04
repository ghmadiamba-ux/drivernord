import { db } from './db';
import type { IngestedDriver } from './ingestedDriver';
import type {
  License, Ykb, DriverCard, Region,
  Availability, LeadPriority, FollowUpReason,
  Domain, ShiftPreference,
} from '../types/lead';

// ─── Row type ─────────────────────────────────────────────────────────────────

// Mirrors the ingested_drivers table (migration 004).
// All columns are typed as they arrive from Supabase (snake_case, dates as strings).
interface IngestedDriverRow {
  id:                  string;
  ingested_at:         string;
  priority:            LeadPriority;
  license:             License;
  ykb:                 Ykb;
  driver_card:         DriverCard;
  region:              Region;
  willing_to_relocate: boolean | null;
  availability:        Availability;
  domain:              Domain | null;
  shift_preference:    ShiftPreference | null;
  first_name:          string;
  phone:               string;
  email:               string | null;
  needs_follow_up:     boolean;
  follow_up_at:        string | null;
  follow_up_reason:    FollowUpReason | null;
}

// ─── Timestamp helpers ────────────────────────────────────────────────────────

function toDate(value: string, field: string): Date {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`ingestedDriverStore: invalid timestamp for "${field}": ${value}`);
  }
  return d;
}

function toNullableDate(value: string | null, field: string): Date | null {
  if (value === null || value === undefined) return null;
  return toDate(value, field);
}

// ─── Row conversion ───────────────────────────────────────────────────────────

function ingestedDriverFromRow(row: IngestedDriverRow): IngestedDriver {
  return {
    id:           row.id,
    ingestedAt:   toDate(row.ingested_at, 'ingested_at'),
    priority:     row.priority,
    license:      row.license,
    ykb:          row.ykb,
    driverCard:   row.driver_card,
    location: {
      region:             row.region,
      willingToRelocate:  row.willing_to_relocate,
    },
    availability:    row.availability,
    domain:          row.domain,
    shiftPreference: row.shift_preference,
    contact: {
      firstName: row.first_name,
      phone:     row.phone,
      email:     row.email,
    },
    needsFollowUp:  row.needs_follow_up,
    followUpAt:     toNullableDate(row.follow_up_at, 'follow_up_at'),
    followUpReason: row.follow_up_reason,
  };
}

// ─── Store functions ──────────────────────────────────────────────────────────

export async function createIngestedDriver(driver: IngestedDriver): Promise<void> {
  const { error } = await db.from('ingested_drivers').upsert(
    {
      id:                  driver.id,
      ingested_at:         driver.ingestedAt.toISOString(),
      priority:            driver.priority,
      license:             driver.license,
      ykb:                 driver.ykb,
      driver_card:         driver.driverCard,
      region:              driver.location.region,
      willing_to_relocate: driver.location.willingToRelocate,
      availability:        driver.availability,
      domain:              driver.domain,
      shift_preference:    driver.shiftPreference,
      first_name:          driver.contact.firstName,
      phone:               driver.contact.phone,
      email:               driver.contact.email,
      needs_follow_up:     driver.needsFollowUp,
      follow_up_at:        driver.followUpAt?.toISOString() ?? null,
      follow_up_reason:    driver.followUpReason,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  if (error) throw new Error(`ingestedDriverStore.createIngestedDriver failed: ${error.message}`);
}

export async function getActiveIngestedDrivers(): Promise<IngestedDriver[]> {
  const { data, error } = await db
    .from('ingested_drivers')
    .select('*');

  if (error) throw new Error(`ingestedDriverStore.getActiveIngestedDrivers failed: ${error.message}`);
  if (!data)  return [];

  return (data as IngestedDriverRow[]).map(ingestedDriverFromRow);
}
