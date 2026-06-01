// lib/marketSignalImport.ts
//
// Core import_run mechanism for the Market Agent V1.
//
// Accepts any array of NormalizedMarketSignal, validates, deduplicates,
// upserts company_research_targets and company_need_drafts, then runs
// supply-aware evaluation.
//
// Called by:
//   - POST /api/agent/market-import (admin import endpoint)
//   - runMarketImportScan() in companyNeedMarketAgent.ts
//   - Platsbanken live scan connector
//
// SAFETY: Never sends email/SMS. Never contacts companies. No external calls.

import { randomUUID } from 'node:crypto';
import { db } from './db';
import { logAction } from './systemActions';
import type { NormalizedMarketSignal, ImportRunSummary, MarketSignalSourceType } from './marketSignalTypes';
import type { Domain, Region } from '../types/lead';
import type { CompanyLicense } from './companyNeed';

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateSignal(signal: NormalizedMarketSignal): string | null {
  if (!signal.stable_signal_id?.trim()) return 'stable_signal_id is required';
  if (!signal.company_name?.trim())     return 'company_name is required';
  if (!signal.source_type)              return 'source_type is required';
  if (!signal.scan_date)                return 'scan_date is required';

  // confidence_score must be a number between 0 and 100
  if (typeof signal.confidence_score !== 'number' ||
      signal.confidence_score < 0 ||
      signal.confidence_score > 100) {
    return 'confidence_score must be 0–100';
  }

  // Must have at least one useful signal — a role or domain or license
  if (!signal.role_title && !signal.license_required && !signal.domain_required) {
    return 'signal must include role_title, license_required, or domain_required';
  }

  return null;
}

// ─── Region mapping ───────────────────────────────────────────────────────────
// Maps raw municipality/region strings from external sources to DriverNord regions.

export function normalizeRegion(raw: string | null): Region | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes('stockholm') && !s.includes('region')) return 'stockholm';
  if (s.includes('stockholm') ||
      s.includes('södertälje') ||
      s.includes('nacka') ||
      s.includes('huddinge') ||
      s.includes('haninge') ||
      s.includes('järfälla') ||
      s.includes('tyresö') ||
      s.includes('botkyrka') ||
      s.includes('täby') ||
      s.includes('sollentuna') ||
      s.includes('danderyd')) {
    return 'stockholm_region';
  }
  if (s.includes('västerås') ||
      s.includes('örebro') ||
      s.includes('eskilstuna') ||
      s.includes('uppsala') ||
      s.includes('mälardalen')) {
    return 'malardalen';
  }
  return 'other_sweden';
}

// ─── License extraction ───────────────────────────────────────────────────────
// Extracts the most specific license mentioned from title + description.

export function extractLicense(text: string | null): CompanyLicense | null {
  if (!text) return null;
  const t = text.toUpperCase();
  if (t.includes('CE+D') || t.includes('CE/D')) return 'CE+D';
  if (t.includes('CE'))                          return 'CE';
  if (t.includes(' C ') || t.includes('C-BEH') || t.includes('LASTBIL')) return 'C';
  if (t.includes(' D ') || t.includes('D-BEH') || t.includes('BUSS'))    return 'D';
  if (t.includes(' B ') || t.includes('B-BEH'))                           return 'B';
  return null;
}

// ─── Domain extraction ────────────────────────────────────────────────────────

export function extractDomain(text: string | null): Domain | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('kyl') || t.includes('frys') || t.includes('temperatur') || t.includes('kylbil')) return 'kylfrys';
  if (t.includes('tank') || t.includes('adr') || t.includes('farligt gods'))                        return 'tank';
  if (t.includes('schakt') || t.includes('bygg') || t.includes('anlägg') || t.includes('maskin'))   return 'schakt_bygg';
  if (t.includes('fjärr') || t.includes('lång') || t.includes('natt') || t.includes('expressgods')) return 'fjarrtransport';
  if (t.includes('distribution') || t.includes('bud') || t.includes('last ') || t.includes('paket')) return 'distribution';
  return null;
}

// ─── Stable signal ID ─────────────────────────────────────────────────────────
// Generates a deterministic stable_signal_id when none is provided.

export function generateStableSignalId(signal: Pick<NormalizedMarketSignal, 'source_type' | 'company_name' | 'region_required' | 'role_title'>): string {
  const parts = [
    signal.source_type,
    signal.company_name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    (signal.region_required ?? 'unknown'),
    (signal.role_title ?? 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30),
  ];
  return parts.join(':');
}

// ─── Company research target upsert ──────────────────────────────────────────

async function upsertResearchTarget(signal: NormalizedMarketSignal): Promise<string> {
  // Look up by company_name (primary dedup key for company identity)
  const { data: existing } = await db
    .from('company_research_targets')
    .select('id')
    .eq('company_name', signal.company_name)
    .limit(1);

  const now = new Date().toISOString();

  if (existing && existing.length > 0) {
    const targetId = (existing[0] as { id: string }).id;
    // Update last_checked_date to reflect the fresh signal
    await db
      .from('company_research_targets')
      .update({ last_checked_date: now, updated_at: now })
      .eq('id', targetId);
    return targetId;
  }

  // Create new research target from signal
  const targetId = randomUUID();
  const region   = (normalizeRegion(signal.region_required) ?? 'stockholm_region') as Region;

  await db.from('company_research_targets').insert({
    id:           targetId,
    created_at:   now,
    updated_at:   now,
    company_name: signal.company_name.trim(),
    region,
    city:         signal.region_required ?? null,
    segment:      'A',
    transport_domain: signal.domain_required ? [signal.domain_required] : [],
    visible_driver_need:    true,
    job_ads_url:            signal.job_url ?? signal.source_url,
    license_mentions:       signal.license_required ? [signal.license_required] : [],
    ykb_mentioned:          false,
    driver_card_mentioned:  false,
    urgency_signal:         signal.urgency_signal,
    contact_email:          signal.contact_email,
    phone:                  signal.phone,
    decision_maker_name:    signal.decision_maker_name,
    decision_maker_role:    signal.decision_maker_role,
    barrier_level:          'medium',
    pilot_accessibility_score: signal.confidence_score,
    opportunity_score:         signal.confidence_score / 10,
    research_status:        'enriched',
    source_notes:           `${signal.source_type}:${signal.stable_signal_id}`,
    last_checked_date:      now,
    scored_at:              now,
    scored_by:              `agent:market_scan_v1:${signal.source_type}`,
  });

  return targetId;
}

// ─── Company need draft upsert ────────────────────────────────────────────────

async function upsertCompanyNeedDraft(
  signal:   NormalizedMarketSignal,
  targetId: string,
): Promise<'created' | 'updated' | 'skipped'> {
  const now = new Date().toISOString();

  // Check if a draft already exists for this stable_signal_id
  const { data: existing } = await db
    .from('company_need_drafts')
    .select('id, updated_at')
    .eq('scan_record_id', signal.stable_signal_id)
    .limit(1);

  if (existing && existing.length > 0) {
    const existingRow = existing[0] as { id: string; updated_at: string };
    // Only update if signal is newer
    if (signal.scan_date > existingRow.updated_at) {
      await db
        .from('company_need_drafts')
        .update({
          updated_at: now,
          metadata: {
            scan_date:              signal.scan_date,
            signal_date:            signal.signal_date,
            source_type:            signal.source_type,
            source_url:             signal.source_url,
            job_url:                signal.job_url,
            confidence_score:       signal.confidence_score,
            role_title:             signal.role_title,
            description_snippet:    signal.description_snippet,
            urgency_signal:         signal.urgency_signal,
          },
        })
        .eq('id', existingRow.id);
      return 'updated';
    }
    return 'skipped';
  }

  // Determine draft status based on completeness
  const missingFields: string[] = [];
  if (!signal.license_required) missingFields.push('license_required');
  if (!signal.domain_required)  missingFields.push('domain_required');
  if (!signal.region_required)  missingFields.push('region_required');

  const draftStatus = missingFields.length > 0 ? 'incomplete' : 'ready_for_review';
  const region      = normalizeRegion(signal.region_required) as Region | null;

  await db.from('company_need_drafts').insert({
    id:                   randomUUID(),
    created_at:           now,
    updated_at:           now,
    target_id:            targetId,
    relationship_id:      null,
    source_call_notes:    '',
    need_source:          'scan',
    scan_record_id:       signal.stable_signal_id,
    metadata: {
      scan_date:              signal.scan_date,
      signal_date:            signal.signal_date,
      source_type:            signal.source_type,
      source_url:             signal.source_url,
      job_url:                signal.job_url,
      confidence_score:       signal.confidence_score,
      role_title:             signal.role_title,
      description_snippet:    signal.description_snippet,
      urgency_signal:         signal.urgency_signal,
      // Analyst-score proxies from connector confidence
      recruitment_pain_score: signal.urgency_signal === 'repeated_ads' ? 75
        : signal.urgency_signal === 'stated_urgency' ? 90 : 50,
      drivernord_fit_score:   Math.round(signal.confidence_score / 10),
      contactability_score:   signal.contact_email ? 70 : 40,
      ad_status:              signal.urgency_signal,
    },
    draft_status:         draftStatus,
    license_required:     (signal.license_required as CompanyLicense | null) ?? null,
    ykb_required:         false,
    driver_card_required: false,
    domain_required:      (signal.domain_required as Domain | null) ?? null,
    domain_preferred:     [],
    location_region:      region,
    relocation_allowed:   false,
    shift_type:           signal.shift_preference ?? 'day',
    urgency:              signal.urgency_signal === 'stated_urgency' ? 'emergency'
      : signal.urgency_signal === 'repeated_ads' ? 'urgent' : 'standard',
    drivers_needed:       1,
    constraints:          null,
    missing_fields:       missingFields,
    match_readiness:      missingFields.length === 0 ? 'ready' : 'incomplete',
    dpa_confirmed:        false,
    drafted_by:           `agent:market_scan_v1:${signal.source_type}`,
    rejection_reason:     null,
    converted_at:         null,
    converted_by:         null,
    converted_need_id:    null,
  });

  return 'created';
}

// ─── Core import function ─────────────────────────────────────────────────────

export interface ImportMarketSignalsOptions {
  run_type:       'import_run' | 'live_scan';
  source_types:   MarketSignalSourceType[];
  live_sources_checked?: number;
  live_signals_found?:   number;
  skip_evaluation?: boolean; // if true, caller runs evaluation separately
}

export async function importMarketSignals(
  signals:  NormalizedMarketSignal[],
  options:  ImportMarketSignalsOptions,
): Promise<Omit<ImportRunSummary, 'evaluation_run' | 'drafts_evaluated' | 'supply_gap_blocked' | 'supply_ready_promotable' | 'stale_count'>> {
  const startedAt = new Date().toISOString();

  let valid = 0;
  let imported = 0;
  let updated = 0;
  let skippedDuplicate = 0;
  let skippedInvalid = 0;
  const errors: string[] = [];

  // Track which stable_signal_ids we've processed this run to prevent in-batch duplication
  const processedIds = new Set<string>();

  for (const signal of signals) {
    // Validate
    const validationError = validateSignal(signal);
    if (validationError) {
      skippedInvalid++;
      errors.push(`${signal.stable_signal_id ?? 'unknown'}: ${validationError}`);
      continue;
    }
    valid++;

    // In-batch dedup
    if (processedIds.has(signal.stable_signal_id)) {
      skippedDuplicate++;
      continue;
    }
    processedIds.add(signal.stable_signal_id);

    try {
      const targetId = await upsertResearchTarget(signal);
      const outcome  = await upsertCompanyNeedDraft(signal, targetId);

      if (outcome === 'created')  imported++;
      else if (outcome === 'updated') updated++;
      else skippedDuplicate++;
    } catch (err) {
      errors.push(`${signal.stable_signal_id}: ${String(err)}`);
    }
  }

  const completedAt = new Date().toISOString();

  // Log to system_actions
  await logAction({
    action_type:  'company_need_daily_scan_completed',
    triggered_by: `agent:market_scan_v1:${options.run_type}`,
    target_type:  'market_scan',
    target_id:    randomUUID(),
    status:       'completed',
    result: {
      run_type:               options.run_type,
      is_evaluation_only:     false,
      signals_received:       signals.length,
      signals_valid:          valid,
      signals_imported:       imported,
      signals_updated:        updated,
      signals_skipped_duplicate: skippedDuplicate,
      signals_skipped_invalid:   skippedInvalid,
      live_scan_attempted:    options.run_type === 'live_scan',
      live_sources_checked:   options.live_sources_checked ?? 0,
      live_signals_found:     options.live_signals_found ?? signals.length,
    },
  });

  return {
    run_type:             options.run_type,
    started_at:           startedAt,
    completed_at:         completedAt,
    source_types:         options.source_types,
    signals_received:     signals.length,
    signals_valid:        valid,
    signals_imported:     imported,
    signals_updated:      updated,
    signals_skipped_duplicate: skippedDuplicate,
    signals_skipped_invalid:   skippedInvalid,
    errors,
    live_scan_attempted:  options.run_type === 'live_scan',
    live_sources_checked: options.live_sources_checked ?? 0,
    live_signals_found:   options.live_signals_found ?? signals.length,
  };
}

// ─── Stale draft detection for refresh_run ────────────────────────────────────

export async function identifyStaleDrafts(): Promise<Array<{
  id: string;
  company_name: string;
  scan_date: string | null;
  source_url: string | null;
}>> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await db
    .from('company_need_drafts')
    .select('id, target_id, metadata, updated_at')
    .neq('draft_status', 'promoted')
    .neq('draft_status', 'rejected')
    .lt('updated_at', cutoff);

  if (!data) return [];

  const targetIds = [...new Set((data as Array<{ target_id: string }>).map((r) => r.target_id).filter(Boolean))];
  const nameMap = new Map<string, string>();

  if (targetIds.length > 0) {
    const { data: targets } = await db
      .from('company_research_targets')
      .select('id, company_name')
      .in('id', targetIds);
    for (const t of (targets ?? []) as Array<{ id: string; company_name: string }>) {
      nameMap.set(t.id, t.company_name);
    }
  }

  return (data as Array<{ id: string; target_id: string; metadata: Record<string, unknown> | null; updated_at: string }>)
    .map((row) => ({
      id:           row.id,
      company_name: nameMap.get(row.target_id) ?? 'Unknown',
      scan_date:    (row.metadata?.scan_date as string | null) ?? null,
      source_url:   (row.metadata?.source_url as string | null) ?? null,
    }));
}
