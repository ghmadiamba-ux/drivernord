// Reusable do-not-contact guard.
// Works with any object that carries the relevant fields — drafts, outreach targets,
// company lookups, or plain name strings.
// Keep this file narrow: it must never grow into a full compliance framework.

// Permanent company-level exclusions — no DB query required.
// Only add companies that are structurally excluded (bankrupt, legal block, fraud).
const PERMANENT_COMPANY_EXCLUSIONS: readonly string[] = [
  'jpc entreprenad ab',
  'jpc entreprenad',
];

export interface DoNotContactInput {
  company_name?:           string;
  draft_status?:           string;
  do_not_contact?:         boolean;
  is_bankrupt?:            boolean;
  do_not_contact_reason?:  string | null;
}

/**
 * Returns true if any flag or name indicates the company must not be contacted.
 * Checks (in order):
 *  1. Explicit boolean `do_not_contact` flag
 *  2. `is_bankrupt` flag (used on OutreachTarget)
 *  3. Non-null `do_not_contact_reason` string (used on pilot_company_relationships)
 *  4. `draft_status === 'rejected'` (used on CompanyNeedDraftRow)
 *  5. Company name matches a permanent hardcoded exclusion list
 */
export function isDoNotContact(input: DoNotContactInput): boolean {
  if (input.do_not_contact === true) return true;
  if (input.is_bankrupt === true) return true;
  if (typeof input.do_not_contact_reason === 'string') return true;
  if (input.draft_status === 'rejected') return true;
  if (input.company_name) {
    const lower = input.company_name.toLowerCase().trim();
    if (PERMANENT_COMPANY_EXCLUSIONS.some((ex) => lower.includes(ex))) return true;
  }
  return false;
}
