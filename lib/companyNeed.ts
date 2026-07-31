import type { Domain, Region } from '../types/lead';

// License values valid on a company need.
// 'none' is excluded — a need cannot require no license.
// Value set matches CHECK constraint in migration 003.
export type CompanyLicense = 'C' | 'CE' | 'D' | 'C+D' | 'CE+D';

// Matches MatchNeed.shift_type and drivers.shift_preference CHECK in migration 002.
export type ShiftType = 'day' | 'night' | 'weekend' | 'flexible';

// Matches MatchNeed.urgency and company_needs.urgency CHECK in migration 003.
export type Urgency = 'standard' | 'urgent' | 'emergency';

// Matches company_needs.status CHECK in migration 003.
export type CompanyNeedStatus = 'open' | 'closed';

// Matches company_needs.need_type CHECK in migration 015.
export type NeedType =
  | 'active_public_need'
  | 'matching_eligible'
  | 'contact_ready_candidate'
  | 'outreach_pending_approval'
  | 'outreach_approved'
  | 'contacted'
  | 'expired'
  | 'simulation_only'
  | 'archived_test';

// Need types that the matching engine is permitted to use.
export const MATCHABLE_NEED_TYPES: readonly NeedType[] = [
  'active_public_need',
  'matching_eligible',
  'contact_ready_candidate',
];

// Persisted company record — shape returned from the companies table.
export interface Company {
  id:         string;
  name:       string;
  created_at: Date;
}

// Validated, pre-persistence CompanyNeed.
// id, company_id, and created_at are assigned by the persistence layer after insert.
export interface CompanyNeed {
  company_name:       string;
  license_required:   CompanyLicense;
  domain_required:    Domain;
  domain_preferred:   Domain[];
  location_region:    Region;
  relocation_allowed: boolean;
  shift_type:         ShiftType;
  urgency:            Urgency;
  status:             CompanyNeedStatus;
}

export type CompanyNeedValidationResult =
  | { ok: true;  need: CompanyNeed }
  | { ok: false; error: string };

// ─── Allowed value sets ───────────────────────────────────────────────────────
// Each set mirrors the corresponding CHECK constraint in migration 003.

const COMPANY_LICENSES: readonly CompanyLicense[] = ['C', 'CE', 'D', 'C+D', 'CE+D'];

const DOMAIN_TAGS: readonly Domain[] = [
  'tipp', 'kran', 'kylfrys', 'silo', 'flatbed', 'tanker',
  'ekipage', 'schakt_bygg', 'distribution', 'livsmedelskyla',
  'avfall', 'skogstransport', 'adr', 'fjarrtransport', 'budtransport',
];

const REGIONS: readonly Region[] = ['stockholm', 'other_sweden', 'abroad'];

const SHIFT_TYPES: readonly ShiftType[] = ['day', 'night', 'weekend', 'flexible'];

const URGENCY_LEVELS: readonly Urgency[] = ['standard', 'urgent', 'emergency'];

const NEED_STATUSES: readonly CompanyNeedStatus[] = ['open', 'closed'];

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateCompanyNeedInput(
  input: Record<string, unknown>,
): CompanyNeedValidationResult {

  // company_name — non-empty string
  if (typeof input.company_name !== 'string' || input.company_name.trim() === '') {
    return { ok: false, error: 'company_name must be a non-empty string' };
  }

  // license_required — valid CompanyLicense (excludes 'none')
  if (!(COMPANY_LICENSES as readonly unknown[]).includes(input.license_required)) {
    return { ok: false, error: `license_required must be one of: ${COMPANY_LICENSES.join(', ')}` };
  }

  // domain_required — valid DomainTag
  if (!(DOMAIN_TAGS as readonly unknown[]).includes(input.domain_required)) {
    return { ok: false, error: 'domain_required must be a valid DomainTag' };
  }
  const domainRequired = input.domain_required as Domain;

  // domain_preferred — array of valid DomainTags, must not include domain_required
  const rawPreferred = input.domain_preferred ?? [];
  if (!Array.isArray(rawPreferred)) {
    return { ok: false, error: 'domain_preferred must be an array' };
  }
  for (const v of rawPreferred) {
    if (!(DOMAIN_TAGS as readonly unknown[]).includes(v)) {
      return { ok: false, error: `domain_preferred contains invalid DomainTag: "${v}"` };
    }
  }
  const domainPreferred = rawPreferred as Domain[];
  if (domainPreferred.includes(domainRequired)) {
    return { ok: false, error: 'domain_preferred must not include domain_required' };
  }

  // location_region — valid Region
  if (!(REGIONS as readonly unknown[]).includes(input.location_region)) {
    return { ok: false, error: `location_region must be one of: ${REGIONS.join(', ')}` };
  }

  // relocation_allowed — boolean
  if (typeof input.relocation_allowed !== 'boolean') {
    return { ok: false, error: 'relocation_allowed must be a boolean' };
  }

  // shift_type — valid ShiftType
  if (!(SHIFT_TYPES as readonly unknown[]).includes(input.shift_type)) {
    return { ok: false, error: `shift_type must be one of: ${SHIFT_TYPES.join(', ')}` };
  }

  // urgency — valid Urgency
  if (!(URGENCY_LEVELS as readonly unknown[]).includes(input.urgency)) {
    return { ok: false, error: `urgency must be one of: ${URGENCY_LEVELS.join(', ')}` };
  }

  // status — optional, defaults to 'open'
  const rawStatus = input.status ?? 'open';
  if (!(NEED_STATUSES as readonly unknown[]).includes(rawStatus)) {
    return { ok: false, error: `status must be one of: ${NEED_STATUSES.join(', ')}` };
  }

  return {
    ok: true,
    need: {
      company_name:       input.company_name.trim(),
      license_required:   input.license_required as CompanyLicense,
      domain_required:    domainRequired,
      domain_preferred:   domainPreferred,
      location_region:    input.location_region as Region,
      relocation_allowed: input.relocation_allowed,
      shift_type:         input.shift_type as ShiftType,
      urgency:            input.urgency as Urgency,
      status:             rawStatus as CompanyNeedStatus,
    },
  };
}
