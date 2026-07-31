import { getLead } from './supabaseStore';
import { buildDriverProfile } from './driverProfile';
import { buildIngestedDriver } from './ingestedDriver';
import { createIngestedDriver, findIngestedDriverByPhone } from './ingestedDriverStore';
import { scoreDriver } from './scoreDriver';
import { detectDataQualityIssues } from './dataQuality';
import { logAction } from './systemActions';
import type { IngestedDriver } from './ingestedDriver';
import type { DriverScore } from './scoreDriver';
import type { LeadStatus } from '../types/lead';

export type IngestLeadResult =
  | { ok: true; driver: IngestedDriver; score: DriverScore; persisted: true }
  | { ok: true; driver: IngestedDriver; score: DriverScore; persisted: false; skipped: 'duplicate_phone'; existing_id: string }
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

  const driver = ingested.driver;
  const score = scoreDriver(driver);

  // ── Duplicate phone check ──────────────────────────────────────────────────
  let existingDriver: IngestedDriver | null = null;
  try {
    existingDriver = await findIngestedDriverByPhone(driver.contact.phone);
  } catch {
    // Non-fatal: if the check fails, proceed with insert rather than blocking ingestion
    existingDriver = null;
  }

  if (existingDriver !== null && existingDriver.id !== driver.id) {
    // Fire-and-forget duplicate log — never throws
    logAction({
      action_type:  'driver_duplicate_detected',
      triggered_by: 'ingestLead',
      target_type:  'driver',
      target_id:    driver.id,
      status:       'completed',
      input: {
        phone:       driver.contact.phone,
        new_id:      driver.id,
        existing_id: existingDriver.id,
      },
    }).catch(() => { /* non-fatal */ });

    return {
      ok:          true,
      driver,
      score,
      persisted:   false,
      skipped:     'duplicate_phone',
      existing_id: existingDriver.id,
    };
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  try {
    await createIngestedDriver(driver);
  } catch {
    return { ok: false, error: 'supabase_error' };
  }

  // ── Data quality flags (fire-and-forget, post-insert) ─────────────────────
  const quality = detectDataQualityIssues({
    firstName: driver.contact.firstName,
    phone:     driver.contact.phone,
    email:     driver.contact.email,
  });

  if (!quality.clean) {
    logAction({
      action_type:  'data_quality_issue',
      triggered_by: 'ingestLead',
      target_type:  'driver',
      target_id:    driver.id,
      status:       'completed',
      input: {
        issues:     quality.issues.map((i) => i.type),
        first_name: driver.contact.firstName,
        phone:      driver.contact.phone,
        email:      driver.contact.email,
      },
    }).catch(() => { /* non-fatal */ });
  }

  // ── High-priority alert (fire-and-forget) ─────────────────────────────────
  if (driver.priority === 'HIGH') {
    logAction({
      action_type:  'high_priority_lead_detected',
      triggered_by: 'ingestLead',
      target_type:  'driver',
      target_id:    driver.id,
      status:       'completed',
      input: {
        first_name:   driver.contact.firstName,
        phone:        driver.contact.phone,
        license:      driver.license,
        region:       driver.location.region,
        availability: driver.availability,
        domain:       driver.domain,
        score:        score.total,
        tier:         score.tier,
        summary:      score.summary,
      },
    }).catch(() => { /* non-fatal */ });
  }

  return { ok: true, driver, score, persisted: true };
}
