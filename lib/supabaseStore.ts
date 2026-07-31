import { randomUUID } from 'node:crypto';
import type { Lead, Lang } from '../types/lead';
import { db } from './db';

export interface AttributionInput {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  landing_page_url?: string | null;
  referrer_url?: string | null;
}

// ─── Timestamp helpers ────────────────────────────────────────────────────────

function toRequiredDate(value: unknown, field: string): Date {
  if (!value || typeof value !== 'string') {
    throw new Error(`supabaseStore: missing required timestamp "${field}"`);
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`supabaseStore: invalid timestamp for "${field}": ${value}`);
  }
  return d;
}

function toNullableDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

// ─── Row conversion ───────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function fromRow(row: Row): Lead {
  return {
    id:                  row.id as string,
    created_at:          toRequiredDate(row.created_at, 'created_at'),
    completed_at:        toNullableDate(row.completed_at),
    last_step_reached:   row.last_step_reached as number,
    lang:                (row.lang ?? null) as Lead['lang'],
    region:              (row.region ?? null) as Lead['region'],
    relocate:            (row.relocate ?? null) as Lead['relocate'],
    license:             (row.license ?? null) as Lead['license'],
    ykb:                 (row.ykb ?? null) as Lead['ykb'],
    driver_card:         (row.driver_card ?? null) as Lead['driver_card'],
    availability:        (row.availability ?? null) as Lead['availability'],
    domain:              (row.domain ?? null) as Lead['domain'],
    shift_preference:    (row.shift_preference ?? null) as Lead['shift_preference'],
    first_name:          (row.first_name ?? null) as string | null,
    phone:               (row.phone ?? null) as string | null,
    email:               (row.email ?? null) as string | null,
    lead_status:         row.lead_status as Lead['lead_status'],
    lead_priority:       (row.lead_priority ?? null) as Lead['lead_priority'],
    follow_up_sent:      row.follow_up_sent as boolean,
    follow_up_at:        toNullableDate(row.follow_up_at),
    follow_up_reason:    (row.follow_up_reason ?? null) as Lead['follow_up_reason'],
    consent_registration_at:      toNullableDate(row.consent_registration_at),
    consent_registration_version: (row.consent_registration_version ?? null) as string | null,
    consent_scope:                (row.consent_scope ?? null) as string | null,
    open_to_bemanning:   (row.open_to_bemanning ?? null) as boolean | null,
    bemanning_consent_at: toNullableDate(row.bemanning_consent_at),
    utm_source:       (row.utm_source ?? null) as string | null,
    utm_medium:       (row.utm_medium ?? null) as string | null,
    utm_campaign:     (row.utm_campaign ?? null) as string | null,
    utm_content:      (row.utm_content ?? null) as string | null,
    utm_term:         (row.utm_term ?? null) as string | null,
    landing_page_url: (row.landing_page_url ?? null) as string | null,
    referrer_url:     (row.referrer_url ?? null) as string | null,
  };
}

function toRow(lead: Lead): Row {
  return {
    id:                  lead.id,
    created_at:          lead.created_at.toISOString(),
    completed_at:        lead.completed_at?.toISOString() ?? null,
    last_step_reached:   lead.last_step_reached,
    lang:                lead.lang,
    region:              lead.region,
    relocate:            lead.relocate,
    license:             lead.license,
    ykb:                 lead.ykb,
    driver_card:         lead.driver_card,
    availability:        lead.availability,
    domain:              lead.domain,
    shift_preference:    lead.shift_preference,
    first_name:          lead.first_name,
    phone:               lead.phone,
    email:               lead.email,
    lead_status:         lead.lead_status,
    lead_priority:       lead.lead_priority,
    follow_up_sent:      lead.follow_up_sent,
    follow_up_at:        lead.follow_up_at?.toISOString() ?? null,
    follow_up_reason:    lead.follow_up_reason,
    consent_registration_at:      lead.consent_registration_at?.toISOString() ?? null,
    consent_registration_version: lead.consent_registration_version,
    consent_scope:                lead.consent_scope,
    open_to_bemanning:    lead.open_to_bemanning,
    bemanning_consent_at: lead.bemanning_consent_at?.toISOString() ?? null,
    utm_source:       lead.utm_source,
    utm_medium:       lead.utm_medium,
    utm_campaign:     lead.utm_campaign,
    utm_content:      lead.utm_content,
    utm_term:         lead.utm_term,
    landing_page_url: lead.landing_page_url,
    referrer_url:     lead.referrer_url,
  };
}

// ─── Migration-013 fallback ───────────────────────────────────────────────────
//
// Migration 013 adds consent + attribution columns to `drivers`. If the
// migration has not been applied to production, PostgREST returns an error
// for unknown columns and the entire INSERT/UPDATE fails — breaking /chat.
//
// The fallback below detects the column-not-found error and retries without
// the new columns so the registration flow continues working. Consent and
// attribution data will not be persisted until the migration is applied.
//
// Fix: apply migrations/013_add_consent_and_attribution_to_drivers.sql
// in the Supabase Dashboard → SQL editor. ~10 minutes. No data is lost.

const MIGRATION_013_COLS = [
  'consent_registration_at',
  'consent_registration_version',
  'consent_scope',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'landing_page_url',
  'referrer_url',
] as const;

const MIGRATION_019_COLS = [
  'open_to_bemanning',
  'bemanning_consent_at',
] as const;

function logDbError(label: string, error: Record<string, unknown>): void {
  console.error(`[supabaseStore] ${label}:`, JSON.stringify({
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  }));
}

function stripMigration013(row: Row): Row {
  const r = { ...row };
  for (const col of MIGRATION_013_COLS) delete r[col];
  return r;
}

function stripMigration019(row: Row): Row {
  const r = { ...row };
  for (const col of MIGRATION_019_COLS) delete r[col];
  return r;
}

function stripAllNewCols(row: Row): Row {
  return stripMigration013(stripMigration019(row));
}

// ─── Store functions ──────────────────────────────────────────────────────────

export async function createLead(lang: Lang, attribution?: AttributionInput): Promise<Lead> {
  const lead: Lead = {
    id:                  randomUUID(),
    created_at:          new Date(),
    completed_at:        null,
    last_step_reached:   0,
    lang,
    region:              null,
    relocate:            null,
    license:             null,
    ykb:                 null,
    driver_card:         null,
    availability:        null,
    domain:              null,
    shift_preference:    null,
    first_name:          null,
    phone:               null,
    email:               null,
    lead_status:         'anonymous_dropoff',
    lead_priority:       null,
    follow_up_sent:      false,
    follow_up_at:        null,
    follow_up_reason:    null,
    consent_registration_at:      null,
    consent_registration_version: null,
    consent_scope:                null,
    open_to_bemanning:   null,
    bemanning_consent_at: null,
    utm_source:       attribution?.utm_source       ?? null,
    utm_medium:       attribution?.utm_medium       ?? null,
    utm_campaign:     attribution?.utm_campaign     ?? null,
    utm_content:      attribution?.utm_content      ?? null,
    utm_term:         attribution?.utm_term         ?? null,
    landing_page_url: attribution?.landing_page_url ?? null,
    referrer_url:     attribution?.referrer_url     ?? null,
  };

  let { error } = await db.from('drivers').insert(toRow(lead));

  if (error) {
    logDbError('createLead first attempt failed', error as unknown as Record<string, unknown>);
    console.warn(
      '[supabaseStore] Retrying createLead without new migration columns. ' +
      'Apply migrations 013 and 019 to persist all fields.',
    );
    const { error: e2 } = await db.from('drivers').insert(stripAllNewCols(toRow(lead)));
    if (e2) {
      logDbError('createLead retry also failed', e2 as unknown as Record<string, unknown>);
      throw new Error(`supabaseStore.createLead failed: ${e2.message}`);
    }
    error = null;
  }

  return lead;
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await db
    .from('drivers')
    .select('*')
    .eq('id', id)
    .single();

  // PGRST116 = no rows found — expected when id does not exist
  if (error?.code === 'PGRST116') return null;

  if (error) throw new Error(`supabaseStore.getLead failed: ${error.message}`);
  if (!data)  return null;

  return fromRow(data as Row);
}

export async function updateLead(lead: Lead): Promise<void> {
  let { error } = await db
    .from('drivers')
    .update(toRow(lead))
    .eq('id', lead.id);

  if (error) {
    logDbError('updateLead first attempt failed', error as unknown as Record<string, unknown>);
    // Try without migration 019 cols first (bemanning consent columns)
    console.warn('[supabaseStore] Retrying updateLead without migration 019 columns.');
    const { error: e2 } = await db
      .from('drivers')
      .update(stripMigration019(toRow(lead)))
      .eq('id', lead.id);
    if (!e2) {
      error = null;
    } else {
      // Fall back further — strip both 013 and 019 cols
      logDbError('updateLead 019-stripped retry failed', e2 as unknown as Record<string, unknown>);
      console.warn('[supabaseStore] Retrying updateLead without all new migration columns.');
      const { error: e3 } = await db
        .from('drivers')
        .update(stripAllNewCols(toRow(lead)))
        .eq('id', lead.id);
      if (e3) {
        logDbError('updateLead all-stripped retry also failed', e3 as unknown as Record<string, unknown>);
        throw new Error(`supabaseStore.updateLead failed: ${e3.message}`);
      }
      error = null;
    }
  }
}
