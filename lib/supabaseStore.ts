import { randomUUID } from 'node:crypto';
import type { Lead, Lang } from '../types/lead';
import { db } from './db';

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
  };
}

// ─── Store functions ──────────────────────────────────────────────────────────

export async function createLead(lang: Lang): Promise<Lead> {
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
  };

  const { error } = await db.from('drivers').insert(toRow(lead));

  if (error) throw new Error(`supabaseStore.createLead failed: ${error.message}`);

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
  const { error } = await db
    .from('drivers')
    .update(toRow(lead))
    .eq('id', lead.id);

  if (error) throw new Error(`supabaseStore.updateLead failed: ${error.message}`);
}
