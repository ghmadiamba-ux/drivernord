import { randomUUID } from 'node:crypto';
import { db } from './db';
import { logAction } from './systemActions';
import type { NormalizedMarketSignal } from './marketSignalTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostingSourceType = 'direct_employer' | 'staffing_agency' | 'unknown';

// Commercial role of a staffing agency relative to DriverNord.
// Default: 'unknown' — safe hold. Founder must classify manually after migration.
export type CommercialClassification =
  | 'signal_only'       // demand indicator only; no commercial relationship
  | 'hidden_client'     // agency posts on behalf of an identifiable end client
  | 'potential_partner' // candidate for driver-supply partnership
  | 'competitor'        // competes for the same driver pool
  | 'unknown';          // unclassified; must not trigger outreach

// Parsed hints extracted from an agency name or description.
export interface HiddenClientContext {
  is_hidden_client: boolean;
  end_client?:      string;   // e.g. "Årsta client"
  location_hint?:   string;   // e.g. "Jordbro"
}

export interface NewAgencyPosting {
  agency_name:               string;
  license_required:          string | null;
  location_region:           string | null;
  source_context?:           Record<string, unknown>;
  commercial_classification?: CommercialClassification;
}

export interface AgencySignalRow {
  id:                       string;
  signal_key:               string;
  agency_name:              string;
  license_required:         string | null;
  location_region:          string | null;
  scan_count:               number;
  chronic_unfilled:         boolean;
  chronic_weeks:            number;
  status:                   'active' | 'resolved' | 'partner';
  commercial_classification: CommercialClassification;
  first_seen_at:            string;
  last_seen_at:             string;
  created_at:               string;
  updated_at:               string;
}

export interface AgencyScanResult {
  scanned_at: string;
  agencies_found: number;
  agencies_upserted: number;
  chronic_count: number;
  errors: string[];
  scan_action_id: string;
}

// ─── Known Swedish staffing/bemanning agencies ────────────────────────────────
// Partial list of agencies known to post repeated C/CE/D driver ads in Sweden.

export const KNOWN_SWEDISH_STAFFING_AGENCIES: readonly string[] = [
  'lernia', 'uniflex', 'adecco', 'manpower', 'randstad',
  'studentconsulting', 'student consulting', 'jobwise', 'westaff',
  'we staff', 'agil bemanning', 'simplex bemanning', 'simplex',
  'arena personal', 'rekryteringsgruppen', 'tng group', 'tng',
  'experis', 'proffice', 'perido', 'poolia', 'ps partner',
  '2complete', 'andara group', 'staffing solutions',
  'sjödin personaluthyrning', 'prolog bemanning', 'speed group',
  'clevry', 'reachmee', 'careersoft', 'adway', 'recuro',
  'hays', 'michael page', 'michaelpage', 'page personnel',
  'wise professionals', 'dfind', 'recruit partner', 'recruitpartner',
  'joblink', 'jobmatch',
];

// Keywords in company NAME that strongly suggest a staffing agency.
export const AGENCY_NAME_KEYWORDS: readonly string[] = [
  'bemanning', 'bemannings', 'personaluthyrning', 'rekrytering',
  'staffing', 'konsultföretag', 'hr partner', 'hr-partner',
  'employer of record', 'talangföretag', 'personalföretag',
];

// Phrases found in job DESCRIPTIONS that indicate agency posting (not direct employer).
export const AGENCY_DESCRIPTION_SIGNALS: readonly string[] = [
  'söker för kunds räkning',
  'vår kund',
  'vår uppdragsgivare',
  'konsultuppdrag',
  'bemanningsuppdrag',
  'via oss',
  'för en av våra kunder',
  'till vår kund',
  'on behalf of our client',
  'for our client',
  'at our client',
  'hos vår kund',
];

// ─── Hidden-client context parser ────────────────────────────────────────────
//
// Extracts end-client and location hints from agency name strings and descriptions.
//
// Recognised patterns:
//   "Simplex Bemanning AB (Årsta client)"    → is_hidden_client=true, location_hint="Årsta"
//   "Arena Personal client (Jordbro)"        → is_hidden_client=true, location_hint="Jordbro"
//   description with "vår kund", "för kunds räkning", etc. → is_hidden_client=true

export function parseHiddenClientContext(
  agencyName: string,
  description?: string | null,
): HiddenClientContext {
  const ctx: HiddenClientContext = { is_hidden_client: false };

  // Pattern 1: parenthetical containing "client" or "kund" → explicit hidden-client reference
  //   "Simplex Bemanning AB (Årsta client)"
  const clientParenMatch = agencyName.match(/\(([^)]*(?:client|kund|uppdragsgivare)[^)]*)\)/i);
  if (clientParenMatch) {
    ctx.is_hidden_client = true;
    ctx.end_client = clientParenMatch[1].trim();
    // Location hint: first word before the client/kund keyword (if not the keyword itself)
    const locPart = clientParenMatch[1].trim().replace(/(?:client|kund|uppdragsgivare)\s*$/i, '').trim();
    if (locPart) ctx.location_hint = locPart;
  }

  // Pattern 2: "client" appears in the agency name itself (outside parens)
  //   "Arena Personal client (Jordbro)"
  const nameWithoutParens = agencyName.replace(/\([^)]*\)/g, '').trim();
  if (!ctx.is_hidden_client && /\bclient\b/i.test(nameWithoutParens)) {
    ctx.is_hidden_client = true;
  }

  // Any parenthetical → location hint (even without "client" keyword)
  if (!ctx.location_hint) {
    const anyParenMatch = agencyName.match(/\(([^)]+)\)/);
    if (anyParenMatch) ctx.location_hint = anyParenMatch[1].trim();
  }

  // Description signals → marks posting as on behalf of hidden client
  if (!ctx.is_hidden_client && description) {
    const desc = description.toLowerCase();
    if (AGENCY_DESCRIPTION_SIGNALS.some((s) => desc.includes(s.toLowerCase()))) {
      ctx.is_hidden_client = true;
    }
  }

  return ctx;
}

// ─── Pure classification functions ────────────────────────────────────────────

export function isKnownAgency(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  return KNOWN_SWEDISH_STAFFING_AGENCIES.some(
    (a) => normalized === a || normalized.includes(a),
  );
}

export function detectAgencyFromName(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  return AGENCY_NAME_KEYWORDS.some((kw) => normalized.includes(kw));
}

export function detectAgencyFromDescription(description: string): boolean {
  const normalized = description.toLowerCase();
  return AGENCY_DESCRIPTION_SIGNALS.some((sig) => normalized.includes(sig));
}

export function classifyPostingSource(
  companyName: string,
  description?: string | null,
): PostingSourceType {
  if (isKnownAgency(companyName)) return 'staffing_agency';
  if (detectAgencyFromName(companyName)) return 'staffing_agency';
  if (description && detectAgencyFromDescription(description)) return 'staffing_agency';
  return 'unknown';
}

export function buildSignalKey(
  agencyName: string,
  licenseRequired: string | null,
  locationRegion: string | null,
): string {
  const normalized = agencyName
    .toLowerCase()
    .replace(/\b(ab|ltd|inc|group|sverige|sweden)\b/gi, '')
    .replace(/[^a-zåäö0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const lic = (licenseRequired ?? 'any').toLowerCase();
  const reg = (locationRegion ?? 'nationwide').toLowerCase();
  return `${normalized}::${lic}::${reg}`;
}

// chronic_unfilled = seen 3+ times OR open for 3+ weeks with no resolution
export function isChronicUnfilled(scanCount: number, daysSinceFirst: number): boolean {
  return scanCount >= 3 || daysSinceFirst >= 21;
}

// ─── DB operations ────────────────────────────────────────────────────────────

export async function upsertAgencyPosting(posting: NewAgencyPosting): Promise<void> {
  const key = buildSignalKey(
    posting.agency_name,
    posting.license_required,
    posting.location_region,
  );
  const now = new Date().toISOString();

  // Parse hidden-client hints from the agency name (always, regardless of source_context)
  const hiddenCtx = parseHiddenClientContext(posting.agency_name);
  const enrichedContext: Record<string, unknown> = { ...(posting.source_context ?? {}) };
  if (hiddenCtx.end_client)     enrichedContext.end_client     = hiddenCtx.end_client;
  if (hiddenCtx.location_hint)  enrichedContext.location_hint  = hiddenCtx.location_hint;
  if (hiddenCtx.is_hidden_client) enrichedContext.is_hidden_client = true;

  const { data: existing } = await db
    .from('agency_posting_signals')
    .select('id, scan_count, first_seen_at')
    .eq('signal_key', key)
    .maybeSingle();

  if (existing) {
    const row = existing as { id: string; scan_count: number; first_seen_at: string };
    const newCount = row.scan_count + 1;
    const daysSinceFirst = Math.floor(
      (Date.now() - new Date(row.first_seen_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    const { error } = await db.from('agency_posting_signals').update({
      last_seen_at:     now,
      scan_count:       newCount,
      chronic_unfilled: isChronicUnfilled(newCount, daysSinceFirst),
      chronic_weeks:    Math.floor(daysSinceFirst / 7),
      source_context:   enrichedContext,
      updated_at:       now,
    }).eq('id', row.id);
    if (error) throw new Error(`agencyScanAgent.upsert update failed: ${error.message}`);
  } else {
    const { error } = await db.from('agency_posting_signals').insert({
      signal_key:                key,
      agency_name:               posting.agency_name,
      license_required:          posting.license_required,
      location_region:           posting.location_region,
      scan_count:                1,
      chronic_unfilled:          false,
      chronic_weeks:             0,
      status:                    'active',
      commercial_classification: posting.commercial_classification ?? 'unknown',
      source_context:            enrichedContext,
      first_seen_at:             now,
      last_seen_at:              now,
      created_at:                now,
      updated_at:                now,
    });
    if (error) throw new Error(`agencyScanAgent.upsert insert failed: ${error.message}`);
  }
}

export async function getChronicUnfilledReport(): Promise<AgencySignalRow[]> {
  const { data, error } = await db
    .from('agency_posting_signals')
    .select('*')
    .eq('chronic_unfilled', true)
    .eq('status', 'active')
    .order('scan_count', { ascending: false });
  if (error) throw new Error(`agencyScanAgent.getChronicUnfilled failed: ${error.message}`);
  return (data ?? []) as AgencySignalRow[];
}

export async function getAllAgencySignals(): Promise<AgencySignalRow[]> {
  const { data, error } = await db
    .from('agency_posting_signals')
    .select('*')
    .order('last_seen_at', { ascending: false });
  if (error) throw new Error(`agencyScanAgent.getAllSignals failed: ${error.message}`);
  return (data ?? []) as AgencySignalRow[];
}

// ─── Scan: from incoming NormalizedMarketSignal[] ─────────────────────────────
// Used by the import pipeline when new signals arrive from Platsbanken or CSV.

export async function runAgencyPostingScan(
  signals: NormalizedMarketSignal[],
): Promise<AgencyScanResult> {
  const scannedAt = new Date().toISOString();
  const scanId    = randomUUID();
  const errors: string[] = [];
  let agenciesFound    = 0;
  let agenciesUpserted = 0;

  for (const signal of signals) {
    const sourceType = classifyPostingSource(signal.company_name, signal.description_snippet);
    if (sourceType !== 'staffing_agency') continue;

    agenciesFound++;
    try {
      await upsertAgencyPosting({
        agency_name:      signal.company_name,
        license_required: signal.license_required,
        location_region:  signal.region_required ?? null,
        source_context: {
          stable_signal_id: signal.stable_signal_id,
          source_type:      signal.source_type,
          urgency_signal:   signal.urgency_signal,
          scan_date:        signal.scan_date,
        },
      });
      agenciesUpserted++;
    } catch (err) {
      errors.push(
        `${signal.company_name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const chronic = await getChronicUnfilledReport();

  // Log one event per chronic agency so the cockpit surfaces them individually
  for (const signal of chronic) {
    await logAction({
      action_type:  'agency_chronic_unfilled_detected',
      triggered_by: 'agent:agency_scan_v1:signals',
      target_type:  'agency_posting_signal',
      target_id:    signal.id,
      status:       'completed',
      result: {
        agency_name:      signal.agency_name,
        scan_count:       signal.scan_count,
        chronic_weeks:    signal.chronic_weeks,
        license_required: signal.license_required,
        location_region:  signal.location_region,
      },
    });
  }

  const scanActionId = await logAction({
    action_type:  'agency_scan_completed',
    triggered_by: 'agent:agency_scan_v1:signals',
    target_type:  'agency_posting_signal',
    target_id:    scanId,
    status:       errors.length === 0 ? 'completed' : 'failed',
    result: {
      agencies_found:    agenciesFound,
      agencies_upserted: agenciesUpserted,
      chronic_count:     chronic.length,
      errors,
    },
  });

  return {
    scanned_at:        scannedAt,
    agencies_found:    agenciesFound,
    agencies_upserted: agenciesUpserted,
    chronic_count:     chronic.length,
    errors,
    scan_action_id:    scanActionId,
  };
}

// ─── Sync: from existing company_need_drafts ──────────────────────────────────
// Reads active company_need_drafts, classifies companies as staffing agencies,
// and upserts matches into agency_posting_signals.
// Called by the daily market scan to keep the agency list current.

export async function syncAgencyDraftsToSignals(): Promise<AgencyScanResult> {
  const scannedAt = new Date().toISOString();
  const scanId    = randomUUID();
  const errors: string[] = [];
  let agenciesFound    = 0;
  let agenciesUpserted = 0;

  const { data: drafts, error: draftsError } = await db
    .from('company_need_drafts')
    .select('id, target_id, license_required, metadata')
    .not('draft_status', 'in', '("expired","rejected")');

  if (draftsError) {
    const scanActionId = await logAction({
      action_type:  'agency_scan_completed',
      triggered_by: 'agent:agency_scan_v1:sync',
      target_type:  'agency_posting_signal',
      target_id:    scanId,
      status:       'failed',
      error:        draftsError.message,
      result:       { agencies_found: 0, agencies_upserted: 0, chronic_count: 0, errors: [draftsError.message] },
    });
    return {
      scanned_at: scannedAt, agencies_found: 0, agencies_upserted: 0,
      chronic_count: 0, errors: [draftsError.message], scan_action_id: scanActionId,
    };
  }

  const rows = (drafts ?? []) as Array<{
    id: string;
    target_id: string;
    license_required: string | null;
    metadata: Record<string, unknown> | null;
  }>;

  if (rows.length === 0) {
    const scanActionId = await logAction({
      action_type:  'agency_scan_completed',
      triggered_by: 'agent:agency_scan_v1:sync',
      target_type:  'agency_posting_signal',
      target_id:    scanId,
      status:       'completed',
      result:       { agencies_found: 0, agencies_upserted: 0, chronic_count: 0, errors: [] },
    });
    return {
      scanned_at: scannedAt, agencies_found: 0, agencies_upserted: 0,
      chronic_count: 0, errors: [], scan_action_id: scanActionId,
    };
  }

  // Fetch company names from company_research_targets
  const targetIds = [...new Set(rows.map((d) => d.target_id).filter(Boolean))];
  const nameMap   = new Map<string, string>();

  if (targetIds.length > 0) {
    const { data: targets } = await db
      .from('company_research_targets')
      .select('id, company_name')
      .in('id', targetIds);
    for (const t of targets ?? []) {
      const row = t as { id: string; company_name: string };
      nameMap.set(row.id, row.company_name);
    }
  }

  for (const draft of rows) {
    const companyName = nameMap.get(draft.target_id) ?? '';
    if (!companyName) continue;

    const meta        = (draft.metadata ?? {}) as Record<string, unknown>;
    const description = (meta.description_snippet as string | null) ?? null;
    const sourceType  = classifyPostingSource(companyName, description);
    if (sourceType !== 'staffing_agency') continue;

    agenciesFound++;
    try {
      const region      = (meta.region_required as string | null) ?? null;
      const description = (meta.description_snippet as string | null) ?? null;
      const hiddenCtx   = parseHiddenClientContext(companyName, description);
      await upsertAgencyPosting({
        agency_name:      companyName,
        license_required: draft.license_required,
        location_region:  region,
        source_context: {
          draft_id: draft.id,
          ...(hiddenCtx.end_client    && { end_client:      hiddenCtx.end_client }),
          ...(hiddenCtx.location_hint && { location_hint:   hiddenCtx.location_hint }),
          ...(hiddenCtx.is_hidden_client && { is_hidden_client: true }),
        },
      });
      agenciesUpserted++;
    } catch (err) {
      errors.push(
        `draft ${draft.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const chronic = await getChronicUnfilledReport();

  // Log one event per chronic agency so the cockpit surfaces them individually
  for (const signal of chronic) {
    await logAction({
      action_type:  'agency_chronic_unfilled_detected',
      triggered_by: 'agent:agency_scan_v1:sync',
      target_type:  'agency_posting_signal',
      target_id:    signal.id,
      status:       'completed',
      result: {
        agency_name:      signal.agency_name,
        scan_count:       signal.scan_count,
        chronic_weeks:    signal.chronic_weeks,
        license_required: signal.license_required,
        location_region:  signal.location_region,
      },
    });
  }

  const scanActionId = await logAction({
    action_type:  'agency_scan_completed',
    triggered_by: 'agent:agency_scan_v1:sync',
    target_type:  'agency_posting_signal',
    target_id:    scanId,
    status:       errors.length === 0 ? 'completed' : 'failed',
    result: {
      agencies_found:    agenciesFound,
      agencies_upserted: agenciesUpserted,
      chronic_count:     chronic.length,
      errors,
    },
  });

  return {
    scanned_at:        scannedAt,
    agencies_found:    agenciesFound,
    agencies_upserted: agenciesUpserted,
    chronic_count:     chronic.length,
    errors,
    scan_action_id:    scanActionId,
  };
}
