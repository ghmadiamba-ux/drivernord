// lib/dataQualityScan.ts
//
// Retroactive scan of ingested_drivers for duplicate phones and name=phone
// data quality issues. Creates system_actions for newly discovered problems.
//
// Safe to run repeatedly — idempotency is enforced by checking for existing
// system_actions before inserting new ones.

import { db } from './db';
import { getActiveIngestedDrivers } from './ingestedDriverStore';
import { detectDataQualityIssues } from './dataQuality';
import { logAction } from './systemActions';

export interface DataQualityScanResult {
  scanned:               number;
  new_duplicate_flagged: number;
  new_dq_flagged:        number;
  already_flagged:       number;
  errors:                string[];
}

export async function scanAndLogExistingIssues(): Promise<DataQualityScanResult> {
  const result: DataQualityScanResult = {
    scanned:               0,
    new_duplicate_flagged: 0,
    new_dq_flagged:        0,
    already_flagged:       0,
    errors:                [],
  };

  let drivers;
  try {
    drivers = await getActiveIngestedDrivers();
  } catch (err) {
    result.errors.push(`fetch_drivers_failed: ${String(err)}`);
    return result;
  }
  result.scanned = drivers.length;
  if (drivers.length === 0) return result;

  // Fetch existing flags in parallel (all-time, not windowed)
  const [existingDupRes, existingDqRes] = await Promise.all([
    db.from('system_actions').select('input').eq('action_type', 'driver_duplicate_detected'),
    db.from('system_actions').select('target_id').eq('action_type', 'data_quality_issue'),
  ]);

  const alreadyFlaggedPhones = new Set<string>(
    (existingDupRes.data ?? [])
      .map((a) => ((a.input ?? {}) as Record<string, unknown>).phone as string)
      .filter(Boolean),
  );

  const alreadyFlaggedDriverIds = new Set<string>(
    (existingDqRes.data ?? [])
      .map((a) => (a as Record<string, unknown>).target_id as string)
      .filter(Boolean),
  );

  // ── 1. Duplicate phone detection ─────────────────────────────────────────

  const phoneToIds = new Map<string, string[]>();
  for (const d of drivers) {
    const list = phoneToIds.get(d.contact.phone) ?? [];
    list.push(d.id);
    phoneToIds.set(d.contact.phone, list);
  }

  for (const [phone, ids] of phoneToIds) {
    if (ids.length < 2) continue;
    if (alreadyFlaggedPhones.has(phone)) { result.already_flagged++; continue; }

    // Treat the first-inserted record as canonical; flag the rest as duplicates
    const [canonicalId, ...duplicateIds] = ids;
    for (const dupId of duplicateIds) {
      try {
        await logAction({
          action_type:  'driver_duplicate_detected',
          triggered_by: 'scan:dataQualityScan_v1',
          target_type:  'driver',
          target_id:    dupId,
          status:       'completed',
          input: {
            phone,
            new_id:      dupId,
            existing_id: canonicalId,
            note: 'retroactive scan — both records exist in ingested_drivers',
          },
        });
        result.new_duplicate_flagged++;
      } catch (err) {
        result.errors.push(`dup_flag_failed:${dupId}: ${String(err)}`);
      }
    }
  }

  // ── 2. Data quality (name contains phone number) ──────────────────────────

  for (const d of drivers) {
    if (alreadyFlaggedDriverIds.has(d.id)) { result.already_flagged++; continue; }

    const quality = detectDataQualityIssues({
      firstName: d.contact.firstName,
      phone:     d.contact.phone,
      email:     d.contact.email,
    });

    if (quality.clean) continue;

    try {
      await logAction({
        action_type:  'data_quality_issue',
        triggered_by: 'scan:dataQualityScan_v1',
        target_type:  'driver',
        target_id:    d.id,
        status:       'completed',
        input: {
          issues:     quality.issues.map((i) => i.type),
          first_name: d.contact.firstName,
          phone:      d.contact.phone,
          email:      d.contact.email,
          note: 'retroactive scan',
        },
      });
      result.new_dq_flagged++;
    } catch (err) {
      result.errors.push(`dq_flag_failed:${d.id}: ${String(err)}`);
    }
  }

  return result;
}
