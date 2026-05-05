import { getLead } from './supabaseStore';
import { buildDriverProfile } from './driverProfile';
import { buildIngestedDriver } from './ingestedDriver';
import { createIngestedDriver } from './ingestedDriverStore';
import { scoreDriver } from './scoreDriver';
import type { IngestedDriver } from './ingestedDriver';
import type { DriverScore } from './scoreDriver';
import type { LeadStatus } from '../types/lead';

export type IngestLeadResult =
  | { ok: true; driver: IngestedDriver; score: DriverScore; persisted: true }
  | {
      ok: false;
      error: 'lead_not_found' | 'not_ready_for_ingestion' | 'missing_required_field' | 'supabase_error';
      lead_status?: LeadStatus;
    };

export async function ingestLead(leadId: string): Promise<IngestLeadResult> {
  let lead;
  try {
    lead = await getLead(leadId);
  } catch {
    return { ok: false, error: 'supabase_error' };
  }

  if (!lead) {
    return { ok: false, error: 'lead_not_found' };
  }

  const profile = buildDriverProfile(lead);
  const ingested = buildIngestedDriver(profile);

  if (!ingested.ok) {
    return { ok: false, error: ingested.error, lead_status: lead.lead_status };
  }

  const score = scoreDriver(ingested.driver);

  try {
    await createIngestedDriver(ingested.driver);
  } catch {
    return { ok: false, error: 'supabase_error' };
  }

  return { ok: true, driver: ingested.driver, score, persisted: true };
}
