import { describe, it, expect } from 'vitest';
import {
  isKnownAgency,
  detectAgencyFromName,
  detectAgencyFromDescription,
  classifyPostingSource,
  buildSignalKey,
  isChronicUnfilled,
  parseHiddenClientContext,
} from '../lib/agencyScanAgent';

// ─── isKnownAgency ────────────────────────────────────────────────────────────

describe('isKnownAgency', () => {
  it('exact match on known agency name', () => {
    expect(isKnownAgency('Lernia')).toBe(true);
  });

  it('case-insensitive match', () => {
    expect(isKnownAgency('RANDSTAD')).toBe(true);
    expect(isKnownAgency('randstad')).toBe(true);
    expect(isKnownAgency('Randstad')).toBe(true);
  });

  it('partial match — agency name is contained in company name', () => {
    expect(isKnownAgency('Simplex Bemanning AB')).toBe(true);
    expect(isKnownAgency('Rekryteringsgruppen Sverige AB')).toBe(true);
  });

  it('returns false for direct employer', () => {
    expect(isKnownAgency('Nilssons Åkeri AB')).toBe(false);
    expect(isKnownAgency('Stockholms Transporttjänst')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isKnownAgency('')).toBe(false);
  });
});

// ─── detectAgencyFromName ─────────────────────────────────────────────────────

describe('detectAgencyFromName', () => {
  it('detects "bemanning" keyword', () => {
    expect(detectAgencyFromName('Nordic Bemanning AB')).toBe(true);
    expect(detectAgencyFromName('Agil Bemanning')).toBe(true);
  });

  it('detects "rekrytering" keyword', () => {
    expect(detectAgencyFromName('Prolog Rekrytering')).toBe(true);
  });

  it('detects "staffing" keyword', () => {
    expect(detectAgencyFromName('Nordic Staffing Group')).toBe(true);
  });

  it('detects "personaluthyrning" keyword', () => {
    expect(detectAgencyFromName('Sjödin Personaluthyrning')).toBe(true);
  });

  it('returns false for direct employer with no agency keywords', () => {
    expect(detectAgencyFromName('Transportgruppen AB')).toBe(false);
    expect(detectAgencyFromName('Göteborgs Åkeri')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(detectAgencyFromName('NORDIC BEMANNING')).toBe(true);
  });
});

// ─── detectAgencyFromDescription ─────────────────────────────────────────────

describe('detectAgencyFromDescription', () => {
  it('detects "söker för kunds räkning"', () => {
    expect(detectAgencyFromDescription(
      'Vi söker för kunds räkning en CE-förare till Stockholm.',
    )).toBe(true);
  });

  it('detects "vår kund"', () => {
    expect(detectAgencyFromDescription(
      'Vår kund i Södertälje söker en erfaren C-förare.',
    )).toBe(true);
  });

  it('detects "konsultuppdrag"', () => {
    expect(detectAgencyFromDescription(
      'Detta är ett konsultuppdrag med möjlighet till fast anställning.',
    )).toBe(true);
  });

  it('detects "bemanningsuppdrag"', () => {
    expect(detectAgencyFromDescription(
      'Tjänsten är ett bemanningsuppdrag på 6 månader.',
    )).toBe(true);
  });

  it('returns false for direct employer description', () => {
    expect(detectAgencyFromDescription(
      'Vi är ett åkeri i Stockholm och söker CE-förare med giltigt YKB.',
    )).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(detectAgencyFromDescription('VÅR KUND söker förare')).toBe(true);
  });
});

// ─── classifyPostingSource ────────────────────────────────────────────────────

describe('classifyPostingSource', () => {
  it('known agency name → staffing_agency', () => {
    expect(classifyPostingSource('Lernia AB')).toBe('staffing_agency');
  });

  it('agency keyword in name → staffing_agency', () => {
    expect(classifyPostingSource('Nordic Bemanning AB')).toBe('staffing_agency');
  });

  it('agency signal in description → staffing_agency', () => {
    expect(classifyPostingSource('XYZ Transport', 'Vi söker för kunds räkning en CE-förare.')).toBe('staffing_agency');
  });

  it('unknown company, no agency signals → unknown', () => {
    expect(classifyPostingSource('Nilssons Åkeri AB', 'Vi söker en CE-förare.')).toBe('unknown');
  });

  it('unknown company, no description → unknown', () => {
    expect(classifyPostingSource('SomeCo AB')).toBe('unknown');
  });

  it('description takes precedence when name is ambiguous', () => {
    expect(
      classifyPostingSource('Unknown Logistics', 'Hos vår kund i Södertälje söker vi förare.'),
    ).toBe('staffing_agency');
  });
});

// ─── buildSignalKey ───────────────────────────────────────────────────────────

describe('buildSignalKey', () => {
  it('produces deterministic key for same inputs', () => {
    const a = buildSignalKey('Lernia AB', 'CE', 'stockholm');
    const b = buildSignalKey('Lernia AB', 'CE', 'stockholm');
    expect(a).toBe(b);
  });

  it('normalizes company name — strips "AB" suffix', () => {
    const withAb    = buildSignalKey('Lernia AB', 'CE', 'stockholm');
    const withoutAb = buildSignalKey('Lernia', 'CE', 'stockholm');
    expect(withAb).toBe(withoutAb);
  });

  it('uses "any" when license is null', () => {
    const key = buildSignalKey('Lernia', null, 'stockholm');
    expect(key).toContain('::any::');
  });

  it('uses "nationwide" when region is null', () => {
    const key = buildSignalKey('Lernia', 'CE', null);
    expect(key).toContain('::nationwide');
  });

  it('different licenses produce different keys', () => {
    const ce  = buildSignalKey('Lernia', 'CE', 'stockholm');
    const c   = buildSignalKey('Lernia', 'C', 'stockholm');
    const d   = buildSignalKey('Lernia', 'D', 'stockholm');
    expect(ce).not.toBe(c);
    expect(ce).not.toBe(d);
    expect(c).not.toBe(d);
  });

  it('different regions produce different keys', () => {
    const sthlm = buildSignalKey('Lernia', 'CE', 'stockholm');
    const other = buildSignalKey('Lernia', 'CE', 'other_sweden');
    expect(sthlm).not.toBe(other);
  });

  it('key contains only safe characters (no spaces)', () => {
    const key = buildSignalKey('Nordic Staffing Group AB', 'CE', 'stockholm');
    expect(key).not.toMatch(/\s/);
  });
});

// ─── isChronicUnfilled ────────────────────────────────────────────────────────

describe('isChronicUnfilled', () => {
  it('false when scanCount < 3 and days < 21', () => {
    expect(isChronicUnfilled(1, 0)).toBe(false);
    expect(isChronicUnfilled(2, 10)).toBe(false);
  });

  it('true when scanCount reaches 3', () => {
    expect(isChronicUnfilled(3, 0)).toBe(true);
    expect(isChronicUnfilled(5, 0)).toBe(true);
  });

  it('true when days since first seen >= 21 (3 weeks)', () => {
    expect(isChronicUnfilled(1, 21)).toBe(true);
    expect(isChronicUnfilled(2, 30)).toBe(true);
  });

  it('true when both conditions met', () => {
    expect(isChronicUnfilled(4, 30)).toBe(true);
  });

  it('exact boundary — scanCount=2, days=20 is not chronic', () => {
    expect(isChronicUnfilled(2, 20)).toBe(false);
  });

  it('exact boundary — scanCount=3, days=20 is chronic', () => {
    expect(isChronicUnfilled(3, 20)).toBe(true);
  });

  it('exact boundary — scanCount=2, days=21 is chronic', () => {
    expect(isChronicUnfilled(2, 21)).toBe(true);
  });
});

// ─── parseHiddenClientContext ─────────────────────────────────────────────────

describe('parseHiddenClientContext', () => {
  // Pattern 1: "(Xxx client)" or "(Xxx kund)" in agency name
  it('detects hidden client from "(Xxx client)" parenthetical', () => {
    const ctx = parseHiddenClientContext('Simplex Bemanning AB (Årsta client)');
    expect(ctx.is_hidden_client).toBe(true);
    expect(ctx.end_client).toBe('Årsta client');
    expect(ctx.location_hint).toBe('Årsta');
  });

  it('detects hidden client from "(Xxx kund)" parenthetical', () => {
    const ctx = parseHiddenClientContext('Nordic Staffing (Kista kund)');
    expect(ctx.is_hidden_client).toBe(true);
    expect(ctx.end_client).toBe('Kista kund');
    expect(ctx.location_hint).toBe('Kista');
  });

  it('detects hidden client from "(Xxx uppdragsgivare)" parenthetical', () => {
    const ctx = parseHiddenClientContext('Lernia AB (Södertälje uppdragsgivare)');
    expect(ctx.is_hidden_client).toBe(true);
    expect(ctx.is_hidden_client).toBe(true);
  });

  // Pattern 2: "client" appears in the agency name itself
  it('detects hidden client when "client" appears in agency name — Arena Personal client (Jordbro)', () => {
    const ctx = parseHiddenClientContext('Arena Personal client (Jordbro)');
    expect(ctx.is_hidden_client).toBe(true);
    expect(ctx.location_hint).toBe('Jordbro');
  });

  // Pattern 3: description signals
  it('detects hidden client from "vår kund" in description', () => {
    const ctx = parseHiddenClientContext('Jobwise AB', 'Vår kund i Södertälje söker CE-förare.');
    expect(ctx.is_hidden_client).toBe(true);
  });

  it('detects hidden client from "söker för kunds räkning" in description', () => {
    const ctx = parseHiddenClientContext('Randstad AB', 'Vi söker för kunds räkning en erfaren C-förare.');
    expect(ctx.is_hidden_client).toBe(true);
  });

  it('detects hidden client from "vår uppdragsgivare" in description', () => {
    const ctx = parseHiddenClientContext('WeStaff', 'Vår uppdragsgivare i Jordbro söker chaufför.');
    expect(ctx.is_hidden_client).toBe(true);
  });

  // Location hint from plain parenthetical (no "client" keyword)
  it('extracts location_hint from plain parenthetical even without hidden client keyword', () => {
    const ctx = parseHiddenClientContext('Jobwise AB (Stockholm)');
    expect(ctx.location_hint).toBe('Stockholm');
    expect(ctx.is_hidden_client).toBe(false);
  });

  // Direct employer — no signals
  it('returns is_hidden_client=false for direct employer with no signals', () => {
    const ctx = parseHiddenClientContext('Edvardssons Åkeri AB');
    expect(ctx.is_hidden_client).toBe(false);
    expect(ctx.end_client).toBeUndefined();
    expect(ctx.location_hint).toBeUndefined();
  });

  it('returns is_hidden_client=false when description has no agency signals', () => {
    const ctx = parseHiddenClientContext('Nilssons Transport', 'Vi söker en CE-förare till vår verksamhet.');
    expect(ctx.is_hidden_client).toBe(false);
  });

  // Case insensitivity
  it('is case-insensitive for "CLIENT"', () => {
    const ctx = parseHiddenClientContext('Some Agency (Jordbro CLIENT)');
    expect(ctx.is_hidden_client).toBe(true);
  });

  // No description provided
  it('handles missing description gracefully', () => {
    const ctx = parseHiddenClientContext('Lernia AB');
    expect(ctx.is_hidden_client).toBe(false);
    expect(ctx.end_client).toBeUndefined();
  });

  it('handles null description gracefully', () => {
    const ctx = parseHiddenClientContext('Lernia AB', null);
    expect(ctx.is_hidden_client).toBe(false);
  });

  // JPC DNC guard — JPC is not a bemanning agency, should not be flagged as hidden client
  it('JPC Entreprenad AB — not classified as hidden client (direct employer)', () => {
    const ctx = parseHiddenClientContext('JPC Entreprenad AB');
    expect(ctx.is_hidden_client).toBe(false);
  });
});

// ─── CommercialClassification — valid values ──────────────────────────────────

describe('CommercialClassification — type safety coverage', () => {
  it('classifyPostingSource correctly identifies the 5 known chronic agencies', () => {
    const agencies = [
      'Simplex Bemanning AB',
      'Jobwise AB',
      'Rekryteringsgruppen i Stockholm AB',
      'Arena Personal',
      'JKT Bemanning AB',
    ];
    for (const name of agencies) {
      expect(classifyPostingSource(name)).toBe('staffing_agency');
    }
  });

  it('JPC Entreprenad AB is NOT classified as a staffing agency', () => {
    expect(classifyPostingSource('JPC Entreprenad AB')).toBe('unknown');
  });

  it('direct transport companies are NOT classified as staffing agencies', () => {
    const direct = [
      'Edvardssons Åkeri AB',
      'Enskede Bilexpress AB',
      'Dagab Inköp & Logistik AB',
      'DHL Freight (Sweden) AB',
    ];
    for (const name of direct) {
      expect(classifyPostingSource(name)).toBe('unknown');
    }
  });
});
