import { randomUUID } from 'crypto';
import type { Lead, Lang } from '../types/lead';

const store = new Map<string, Lead>();

export function createLead(lang: Lang): Lead {
  const now = new Date();
  const lead: Lead = {
    id: randomUUID(),
    created_at: now,
    completed_at: null,
    last_step_reached: 0,
    lang,
    region: null,
    relocate: null,
    license: null,
    ykb: null,
    driver_card: null,
    availability: null,
    domain: null,
    shift_preference: null,
    first_name: null,
    phone: null,
    email: null,
    lead_status: 'anonymous_dropoff',
    lead_priority: null,
    follow_up_sent: false,
    follow_up_at: null,
    follow_up_reason: null,
  };
  store.set(lead.id, lead);
  return lead;
}

export function getLead(id: string): Lead | null {
  return store.get(id) ?? null;
}

export function updateLead(lead: Lead): void {
  store.set(lead.id, lead);
}

export function clearStore(): void {
  store.clear();
}
