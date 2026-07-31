import { describe, it, expect } from 'vitest';
import { isDoNotContact } from '../lib/doNotContact';

// ─── Permanent hardcoded exclusions ──────────────────────────────────────────

describe('isDoNotContact — JPC Entreprenad (permanent exclusion)', () => {
  it('blocks exact full name', () => {
    expect(isDoNotContact({ company_name: 'JPC Entreprenad AB' })).toBe(true);
  });

  it('blocks lowercase variant', () => {
    expect(isDoNotContact({ company_name: 'jpc entreprenad' })).toBe(true);
  });

  it('blocks mixed-case variant', () => {
    expect(isDoNotContact({ company_name: 'JPC Entreprenad' })).toBe(true);
  });

  it('blocks name embedded in longer string', () => {
    expect(isDoNotContact({ company_name: 'Some JPC Entreprenad AB Subsidiary' })).toBe(true);
  });

  it('does NOT block an unrelated company with similar prefix', () => {
    expect(isDoNotContact({ company_name: 'JPCO Logistics AB' })).toBe(false);
  });
});

// ─── Unrelated companies ──────────────────────────────────────────────────────

describe('isDoNotContact — non-excluded companies', () => {
  it('passes a normal transport company', () => {
    expect(isDoNotContact({ company_name: 'Enskede Bilexpress AB' })).toBe(false);
  });

  it('passes a company with similar letters but different name', () => {
    expect(isDoNotContact({ company_name: 'Transportfirma Trabé' })).toBe(false);
  });

  it('passes empty company_name', () => {
    expect(isDoNotContact({ company_name: '' })).toBe(false);
  });
});

// ─── Explicit boolean flag ────────────────────────────────────────────────────

describe('isDoNotContact — do_not_contact boolean flag', () => {
  it('blocks when do_not_contact is true', () => {
    expect(isDoNotContact({ do_not_contact: true })).toBe(true);
  });

  it('passes when do_not_contact is false', () => {
    expect(isDoNotContact({ do_not_contact: false })).toBe(false);
  });

  it('passes when do_not_contact is undefined', () => {
    expect(isDoNotContact({})).toBe(false);
  });
});

// ─── Bankrupt flag ────────────────────────────────────────────────────────────

describe('isDoNotContact — is_bankrupt flag', () => {
  it('blocks when is_bankrupt is true', () => {
    expect(isDoNotContact({ is_bankrupt: true })).toBe(true);
  });

  it('passes when is_bankrupt is false', () => {
    expect(isDoNotContact({ is_bankrupt: false })).toBe(false);
  });
});

// ─── do_not_contact_reason string ────────────────────────────────────────────

describe('isDoNotContact — do_not_contact_reason', () => {
  it('blocks when a non-empty reason string is present', () => {
    expect(isDoNotContact({ do_not_contact_reason: 'bankruptcy confirmed 2026-05' })).toBe(true);
  });

  it('passes when reason is null', () => {
    expect(isDoNotContact({ do_not_contact_reason: null })).toBe(false);
  });

  it('passes when reason is undefined', () => {
    expect(isDoNotContact({})).toBe(false);
  });
});

// ─── Draft status ─────────────────────────────────────────────────────────────

describe('isDoNotContact — draft_status', () => {
  it('blocks when draft_status is rejected', () => {
    expect(isDoNotContact({ draft_status: 'rejected' })).toBe(true);
  });

  it('passes when draft_status is ready_for_review', () => {
    expect(isDoNotContact({ draft_status: 'ready_for_review' })).toBe(false);
  });

  it('passes when draft_status is promoted', () => {
    expect(isDoNotContact({ draft_status: 'promoted' })).toBe(false);
  });

  it('passes when draft_status is approved_for_matching', () => {
    expect(isDoNotContact({ draft_status: 'approved_for_matching' })).toBe(false);
  });
});

// ─── Combined inputs ──────────────────────────────────────────────────────────

describe('isDoNotContact — combined flags', () => {
  it('blocks when company is clean but explicit do_not_contact is true', () => {
    expect(isDoNotContact({
      company_name: 'Normal AB',
      do_not_contact: true,
    })).toBe(true);
  });

  it('blocks JPC even if other flags are clean', () => {
    expect(isDoNotContact({
      company_name: 'JPC Entreprenad AB',
      do_not_contact: false,
      is_bankrupt: false,
    })).toBe(true);
  });

  it('passes when all fields are safe', () => {
    expect(isDoNotContact({
      company_name:          'Edvardssons Last och Schakt AB',
      draft_status:          'promoted',
      do_not_contact:        false,
      is_bankrupt:           false,
      do_not_contact_reason: null,
    })).toBe(false);
  });
});
