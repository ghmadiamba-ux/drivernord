// lib/companyNeedDraft.ts
//
// Store, import, and promotion logic for company_need_drafts.
//
// KEY BOUNDARIES:
//   importScanRecords() — inserts drafts from public scan data; NO outreach triggered
//   promoteDraft()      — creates a live company_need (matching_eligible);
//                         sets need_type = 'active_public_need';
//                         does NOT set outreach_approved;
//                         does NOT trigger driver contact
//
// Outreach still requires:
//   1. AGENT_CONTACT_MODE = suggest (minimum) or hybrid/auto
//   2. Contact approval cockpit: founder approves each contact_suggested action
//   3. 46elks credentials configured before any SMS is sent

import { randomUUID } from 'node:crypto';
import { db } from './db';
import { logAction } from './systemActions';
import { SCAN_RECORDS } from './scanImportData';
import type { ScanRecord } from './scanImportData';
import type { CompanyLicense, NeedType } from './companyNeed';
import type { Domain, Region } from '../types/lead';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DraftStatus =
  | 'draft_created'
  | 'incomplete'
  | 'ready_for_review'
  | 'approved_for_matching'
  | 'rejected'
  | 'promoted'
  | 'hold_agency';

export interface CompanyNeedDraftRow {
  id:                  string;
  created_at:          string;
  updated_at:          string;
  target_id:           string;
  relationship_id:     string | null;
  source_call_notes:   string;
  need_source:         string | null;
  scan_record_id:      string | null;
  metadata:            Record<string, unknown> | null;
  draft_status:        DraftStatus;
  license_required:    CompanyLicense | null;
  ykb_required:        boolean | null;
  driver_card_required: boolean | null;
  domain_required:     Domain | null;
  domain_preferred:    Domain[];
  location_region:     Region | null;
  relocation_allowed:  boolean | null;
  shift_type:          string | null;
  urgency:             string | null;
  drivers_needed:      number | null;
  constraints:         string | null;
  missing_fields:      string[];
  match_readiness:     string | null;
  dpa_confirmed:       boolean;
  drafted_by:          string;
  rejection_reason:    string | null;
  converted_at:        string | null;
  converted_by:        string | null;
  converted_need_id:   string | null;
}

// ─── List drafts ──────────────────────────────────────────────────────────────

export async function listDrafts(filter?: {
  status?: DraftStatus | DraftStatus[];
  limit?:  number;
}): Promise<CompanyNeedDraftRow[]> {
  let query = db
    .from('company_need_drafts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filter?.limit ?? 100);

  if (filter?.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    query = query.in('draft_status', statuses);
  }

  const { data, error } = await query;
  if (error) throw new Error(`companyNeedDraft.listDrafts failed: ${error.message}`);
  return (data ?? []) as CompanyNeedDraftRow[];
}

export async function getDraftById(id: string): Promise<CompanyNeedDraftRow | null> {
  const { data, error } = await db
    .from('company_need_drafts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as CompanyNeedDraftRow;
}

// ─── Import scan records ──────────────────────────────────────────────────────

export interface ImportResult {
  imported: number;
  skipped:  number;
  errors:   string[];
}

export async function importScanRecords(): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  // Fetch already-imported scan_record_ids to avoid duplicates
  const { data: existing } = await db
    .from('company_need_drafts')
    .select('scan_record_id')
    .not('scan_record_id', 'is', null);

  const imported = new Set(
    (existing ?? []).map((r) => (r as { scan_record_id: string }).scan_record_id),
  );

  for (const record of SCAN_RECORDS) {
    if (imported.has(record.scan_record_id)) {
      result.skipped++;
      continue;
    }

    try {
      await importOneRecord(record);
      result.imported++;
    } catch (err) {
      result.errors.push(`${record.scan_record_id}: ${String(err)}`);
    }
  }

  return result;
}

async function importOneRecord(record: ScanRecord): Promise<void> {
  // Step 1: find or create company_research_targets row
  const targetId = await findOrCreateResearchTarget(record);

  // Step 2: insert company_need_draft
  const draftId = randomUUID();
  const now = new Date().toISOString();

  const matchReadiness =
    record.draft_status === 'ready_for_review' && record.missing_fields.length === 0
      ? 'ready'
      : record.draft_status === 'rejected'
        ? 'not_yet'
        : 'incomplete';

  const { error } = await db.from('company_need_drafts').insert({
    id:                   draftId,
    created_at:           now,
    updated_at:           now,
    target_id:            targetId,
    relationship_id:      null,
    source_call_notes:    record.source_call_notes,
    need_source:          'scan',
    scan_record_id:       record.scan_record_id,
    metadata:             record.metadata,
    draft_status:         record.draft_status,
    license_required:     record.license_required,
    ykb_required:         record.ykb_required,
    driver_card_required: record.driver_card_required,
    domain_required:      record.domain_required,
    domain_preferred:     [],
    location_region:      record.location_region,
    relocation_allowed:   false,
    shift_type:           record.shift_type,
    urgency:              record.urgency,
    drivers_needed:       record.drivers_needed,
    constraints:          record.constraints,
    missing_fields:       record.missing_fields,
    match_readiness:      matchReadiness,
    validation_questions: null,
    pool_size_warning:    null,
    dpa_confirmed:        false,
    drafted_by:           'agent:scan_import_v1',
    reviewed_at:          null,
    approved_at:          null,
    approved_by:          null,
    rejection_reason:     record.rejection_reason,
    converted_at:         null,
    converted_by:         null,
    converted_need_id:    null,
  });

  if (error) throw new Error(`insert draft failed: ${error.message}`);
}

async function findOrCreateResearchTarget(record: ScanRecord): Promise<string> {
  // Check if a research target for this company already exists
  const { data: existing } = await db
    .from('company_research_targets')
    .select('id')
    .eq('company_name', record.company_name)
    .limit(1);

  if (existing && existing.length > 0) {
    return (existing[0] as { id: string }).id;
  }

  // Create new research target
  const targetId = randomUUID();
  const now = new Date().toISOString();

  const { error } = await db.from('company_research_targets').insert({
    id:           targetId,
    created_at:   now,
    updated_at:   now,
    company_name: record.company_name,
    region:       record.region,
    city:         record.city,
    segment:      record.segment,
    transport_domain: record.domain_required ? [record.domain_required] : [],
    visible_driver_need:    record.visible_driver_need,
    job_ads_url:            record.job_ads_url,
    license_mentions:       record.license_mentions,
    ykb_mentioned:          record.ykb_mentioned,
    driver_card_mentioned:  record.driver_card_mentioned,
    urgency_signal:         record.urgency_signal,
    contact_email:          record.contact_email,
    phone:                  record.contact_phone,
    decision_maker_name:    record.decision_maker_name,
    decision_maker_role:    record.decision_maker_role,
    barrier_level:          record.barrier_level,
    pilot_accessibility_score: record.pilot_accessibility_score,
    opportunity_score:         record.opportunity_score,
    research_status:        record.research_status,
    source_notes:           `scan_record_id:${record.scan_record_id}`,
    last_checked_date:      now,
    scored_at:              now,
    scored_by:              'agent:scan_import_v1',
  });

  if (error) throw new Error(`insert research_target failed: ${error.message}`);
  return targetId;
}

// ─── Promotion logic ──────────────────────────────────────────────────────────

export interface PromotionResult {
  need_id:    string;
  company_id: string;
}

export interface PromotionError {
  error: string;
  code:  'already_promoted' | 'validation_failed' | 'simulation_blocked' | 'db_error';
}

export type PromoteOutcome =
  | { ok: true;  result: PromotionResult }
  | { ok: false; reason: PromotionError };

// Validation rules for promotion
function validateForPromotion(draft: CompanyNeedDraftRow): string | null {
  if (draft.draft_status === 'promoted')   return 'already promoted';
  if (draft.draft_status === 'rejected')   return 'draft is rejected';
  if (draft.draft_status === 'hold_agency') return 'staffing agency draft — cannot be promoted as normal client need';
  if (!draft.license_required)  return 'license_required is missing';
  if (!draft.domain_required)   return 'domain_required is missing';
  if (!draft.location_region)   return 'location_region is missing';
  if (!draft.shift_type)        return 'shift_type is missing';
  if (!draft.urgency)           return 'urgency is missing';

  // Block simulation/test records — these should not exist in real scan data
  // but guard against misuse
  const notes = draft.source_call_notes.toUpperCase();
  if (
    notes.includes('SIMULATION') ||
    notes.includes('DO NOT CONTACT') ||
    draft.drafted_by === 'system:simulation'
  ) {
    return 'simulation or test draft — cannot promote';
  }

  return null; // valid
}

export async function promoteDraft(draftId: string): Promise<PromoteOutcome> {
  // Fetch draft
  const draft = await getDraftById(draftId);
  if (!draft) {
    return { ok: false, reason: { error: 'draft not found', code: 'db_error' } };
  }

  // Idempotency: already promoted
  if (draft.converted_need_id) {
    return { ok: false, reason: { error: 'already promoted', code: 'already_promoted' } };
  }

  // Validate
  const validationError = validateForPromotion(draft);
  if (validationError) {
    const code = validationError.includes('simulation')
      ? 'simulation_blocked'
      : validationError === 'already promoted'
        ? 'already_promoted'
        : 'validation_failed';
    return { ok: false, reason: { error: validationError, code } };
  }

  // Fetch company name from research target
  const { data: targetRow, error: tErr } = await db
    .from('company_research_targets')
    .select('company_name')
    .eq('id', draft.target_id)
    .single();

  if (tErr || !targetRow) {
    return { ok: false, reason: { error: 'research target not found', code: 'db_error' } };
  }

  const companyName = (targetRow as { company_name: string }).company_name;

  // Find or create company record
  const companyId = await findOrCreateCompany(companyName);
  if (!companyId) {
    return { ok: false, reason: { error: 'failed to create/find company record', code: 'db_error' } };
  }

  // Determine need_type: promoted scan records start as active_public_need
  // This is NOT outreach_approved — outreach still requires cockpit approval per driver
  const needType: NeedType = 'active_public_need';
  const needId = randomUUID();
  const now = new Date().toISOString();

  // Insert company_need row
  const { error: needErr } = await db.from('company_needs').insert({
    id:                 needId,
    company_id:         companyId,
    created_at:         now,
    license_required:   draft.license_required,
    domain_required:    draft.domain_required,
    domain_preferred:   draft.domain_preferred ?? [],
    location_region:    draft.location_region,
    relocation_allowed: draft.relocation_allowed ?? false,
    shift_type:         draft.shift_type,
    urgency:            draft.urgency,
    status:             'open',
    need_type:          needType,
    source_draft_id:    draftId,
    metadata:           draft.metadata ?? {},
  });

  if (needErr) {
    return { ok: false, reason: { error: `company_needs insert failed: ${needErr.message}`, code: 'db_error' } };
  }

  // Mark draft as promoted
  const { error: updateErr } = await db
    .from('company_need_drafts')
    .update({
      draft_status:      'promoted',
      converted_at:      now,
      converted_by:      'agent:promotion_flow_v1',
      converted_need_id: needId,
      updated_at:        now,
    })
    .eq('id', draftId);

  if (updateErr) {
    // Need was created but draft not marked — log the inconsistency
    console.error('[companyNeedDraft] promoteDraft: draft update failed after need creation', {
      draftId, needId, error: updateErr.message,
    });
  }

  // Log system action
  await logAction({
    action_type:  'company_need_draft_promoted',
    triggered_by: 'agent:promotion_flow_v1',
    target_type:  'company_need',
    target_id:    needId,
    status:       'completed',
    input: {
      draft_id:       draftId,
      company_id:     companyId,
      company_name:   companyName,
      need_type:      needType,
      license:        draft.license_required,
      domain:         draft.domain_required,
      scan_record_id: draft.scan_record_id,
      note: 'promoted to active_public_need — outreach still requires cockpit approval per driver',
    },
  });

  // Fire-and-forget: trigger matching for the newly promoted need.
  // Matching failure must never block or fail the promotion itself.
  void import('./matchingAgent').then(({ runMatchingAgent }) =>
    runMatchingAgent({ needId, triggeredBy: 'agent:promotion_flow_v1' }),
  ).catch((err) =>
    console.error('[promoteDraft] post-promotion matching error:', String(err)),
  );

  return { ok: true, result: { need_id: needId, company_id: companyId } };
}

// ─── Rejection logic ──────────────────────────────────────────────────────────

export interface RejectionResult {
  draft_id: string;
  reason:   string;
}

export async function rejectDraft(
  draftId: string,
  reason:  string,
): Promise<{ ok: true; result: RejectionResult } | { ok: false; error: string }> {
  const draft = await getDraftById(draftId);
  if (!draft) {
    return { ok: false, error: 'draft not found' };
  }
  if (draft.draft_status === 'promoted') {
    return { ok: false, error: 'cannot reject a promoted draft' };
  }
  if (draft.draft_status === 'rejected') {
    return { ok: false, error: 'draft is already rejected' };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await db
    .from('company_need_drafts')
    .update({
      draft_status:     'rejected',
      rejection_reason: reason,
      updated_at:       now,
    })
    .eq('id', draftId);

  if (updateErr) {
    return { ok: false, error: `db update failed: ${updateErr.message}` };
  }

  await logAction({
    action_type:  'company_need_draft_rejected',
    triggered_by: 'agent:promotion_flow_v1',
    target_type:  'company_need_draft',
    target_id:    draftId,
    status:       'completed',
    input:        { reason },
  });

  return { ok: true, result: { draft_id: draftId, reason } };
}

async function findOrCreateCompany(name: string): Promise<string | null> {
  // Check if company already exists (case-insensitive match)
  const { data: existing } = await db
    .from('companies')
    .select('id')
    .ilike('name', name)
    .limit(1);

  if (existing && existing.length > 0) {
    return (existing[0] as { id: string }).id;
  }

  // Insert new company
  const companyId = randomUUID();
  const { error } = await db.from('companies').insert({
    id:         companyId,
    name,
    created_at: new Date().toISOString(),
  });

  if (error) return null;
  return companyId;
}
