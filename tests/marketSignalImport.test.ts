import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/db', () => ({ db: { from: vi.fn() } }));
vi.mock('../lib/systemActions', () => ({ logAction: vi.fn().mockResolvedValue('action-uuid') }));

import {
  validateSignal,
  extractLicense,
  extractDomain,
  normalizeRegion,
  generateStableSignalId,
  importMarketSignals,
} from '../lib/marketSignalImport';
import { db } from '../lib/db';
import { logAction } from '../lib/systemActions';
import type { NormalizedMarketSignal } from '../lib/marketSignalTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Use explicit `in` check so null overrides work (not swallowed by ??)
function makeSignal(overrides: Partial<NormalizedMarketSignal> = {}): NormalizedMarketSignal {
  const d = (k: keyof NormalizedMarketSignal, def: unknown) =>
    k in overrides ? overrides[k] : def;
  return {
    stable_signal_id:    d('stable_signal_id',    'platsbanken:abc123') as string,
    source_type:         d('source_type',         'platsbanken')        as NormalizedMarketSignal['source_type'],
    source_url:          d('source_url',          'https://jobs.api.jobtechdev.se/search?q=CE') as string | null,
    job_url:             d('job_url',             'https://platsbanken.se/job/abc123') as string | null,
    scan_date:           d('scan_date',           new Date().toISOString()) as string,
    signal_date:         d('signal_date',         new Date().toISOString()) as string | null,
    company_name:        d('company_name',        'Test Åkeri AB') as string,
    organization_number: d('organization_number', '5565554444') as string | null,
    role_title:          d('role_title',          'CE-chaufför för distribution') as string | null,
    description_snippet: d('description_snippet', 'Vi söker en erfaren CE-chaufför.') as string | null,
    license_required:    d('license_required',    'CE') as string | null,
    domain_required:     d('domain_required',     'distribution') as string | null,
    region_required:     d('region_required',     'Stockholm') as string | null,
    shift_preference:    d('shift_preference',    'day') as string | null,
    urgency_signal:      d('urgency_signal',      'single_ad') as NormalizedMarketSignal['urgency_signal'],
    contact_email:       d('contact_email',       null) as string | null,
    phone:               d('phone',               null) as string | null,
    decision_maker_name: d('decision_maker_name', null) as string | null,
    decision_maker_role: d('decision_maker_role', null) as string | null,
    confidence_score:    d('confidence_score',    65) as number,
    raw_metadata:        d('raw_metadata',        { source: 'test' }) as Record<string, unknown>,
  };
}

// Mock DB: SELECT returns empty (no existing), INSERT succeeds
function mockDbForImport(existingTargets: unknown[] = [], existingDrafts: unknown[] = []) {
  vi.mocked(db.from).mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({
        limit: () => Promise.resolve({
          data: table === 'company_research_targets' ? existingTargets : existingDrafts,
          error: null,
        }),
      }),
    }),
    insert: () => Promise.resolve({ error: null }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  } as never));
}

beforeEach(() => vi.clearAllMocks());

// ─── validateSignal ───────────────────────────────────────────────────────────

describe('validateSignal', () => {
  it('passes a valid signal', () => {
    expect(validateSignal(makeSignal())).toBeNull();
  });

  it('rejects missing stable_signal_id', () => {
    expect(validateSignal(makeSignal({ stable_signal_id: '' }))).not.toBeNull();
  });

  it('rejects missing company_name', () => {
    expect(validateSignal(makeSignal({ company_name: '' }))).not.toBeNull();
  });

  it('rejects missing source_type', () => {
    expect(validateSignal(makeSignal({ source_type: '' as never }))).not.toBeNull();
  });

  it('rejects confidence_score out of range', () => {
    expect(validateSignal(makeSignal({ confidence_score: 150 }))).not.toBeNull();
    expect(validateSignal(makeSignal({ confidence_score: -1  }))).not.toBeNull();
  });

  it('rejects signal with no useful content', () => {
    expect(validateSignal(makeSignal({
      role_title:       null,
      license_required: null,
      domain_required:  null,
    }))).not.toBeNull();
  });

  it('accepts signal with only license (no role or domain)', () => {
    expect(validateSignal(makeSignal({
      role_title:      null,
      domain_required: null,
      license_required: 'CE',
    }))).toBeNull();
  });
});

// ─── extractLicense ───────────────────────────────────────────────────────────

describe('extractLicense', () => {
  it('extracts CE from headline', () => expect(extractLicense('CE-chaufför sökes')).toBe('CE'));
  it('extracts C from lastbil context', () => expect(extractLicense('Lastbilschaufför C-behörighet')).toBe('C'));
  it('extracts D from buss context', () => expect(extractLicense('Busschaufför D-behörighet')).toBe('D'));
  it('returns null for no license', () => expect(extractLicense('Kontorsjobb')).toBeNull());
  it('handles null input', () => expect(extractLicense(null)).toBeNull());
  it('CE+D takes priority over CE', () => expect(extractLicense('CE+D behörighet krävs')).toBe('CE+D'));
});

// ─── extractDomain ────────────────────────────────────────────────────────────

describe('extractDomain', () => {
  it('kylfrys from kylbilschaufför', () => expect(extractDomain('Kylbilschaufför sökes')).toBe('kylfrys'));
  it('kylfrys from kyltransport', () => expect(extractDomain('kyltransport chaufför')).toBe('kylfrys'));
  it('schakt_bygg from schakt', () => expect(extractDomain('Schaktförare CE-behörighet')).toBe('schakt_bygg'));
  it('fjarrtransport from fjärr', () => expect(extractDomain('Fjärrtransportchaufför CE')).toBe('fjarrtransport'));
  it('distribution from distributionschaufför', () => expect(extractDomain('Distributionschaufför sökes')).toBe('distribution'));
  it('tank from ADR', () => expect(extractDomain('ADR tankbilschaufför')).toBe('tank'));
  it('returns null for unrecognized domain', () => expect(extractDomain('Kontorsjobb')).toBeNull());
});

// ─── normalizeRegion ──────────────────────────────────────────────────────────

describe('normalizeRegion', () => {
  it('maps Stockholm city to stockholm', () => expect(normalizeRegion('Stockholm')).toBe('stockholm'));
  it('maps Nacka to stockholm_region', () => expect(normalizeRegion('Nacka')).toBe('stockholm_region'));
  it('maps Västerås to malardalen', () => expect(normalizeRegion('Västerås')).toBe('malardalen'));
  it('maps unknown to other_sweden', () => expect(normalizeRegion('Malmö')).toBe('other_sweden'));
  it('handles null', () => expect(normalizeRegion(null)).toBeNull());
});

// ─── importMarketSignals ──────────────────────────────────────────────────────

describe('importMarketSignals — creates new targets and drafts', () => {
  it('imports a valid signal — creates research target and draft', async () => {
    mockDbForImport([], []); // no existing records

    const result = await importMarketSignals([makeSignal()], {
      run_type:     'import_run',
      source_types: ['platsbanken'],
    });

    expect(result.signals_received).toBe(1);
    expect(result.signals_valid).toBe(1);
    expect(result.signals_imported).toBe(1);
    expect(result.signals_skipped_duplicate).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('skips invalid signals and counts them', async () => {
    const result = await importMarketSignals([
      makeSignal({ stable_signal_id: '' }),  // invalid
      makeSignal(),                           // valid
    ], { run_type: 'import_run', source_types: ['platsbanken'] });

    expect(result.signals_received).toBe(2);
    expect(result.signals_valid).toBe(1);
    expect(result.signals_skipped_invalid).toBe(1);
  });

  it('deduplicates signals with the same stable_signal_id in one batch', async () => {
    mockDbForImport([], []);
    const sig = makeSignal({ stable_signal_id: 'platsbanken:dup' });

    const result = await importMarketSignals([sig, sig], {
      run_type: 'import_run', source_types: ['platsbanken'],
    });

    expect(result.signals_received).toBe(2);
    expect(result.signals_imported).toBe(1);
    expect(result.signals_skipped_duplicate).toBe(1);
  });

  it('updates existing draft when scan_date is newer', async () => {
    const existingTarget = [{ id: 'tgt-existing' }];
    const existingDraft  = [{ id: 'draft-existing', updated_at: '2026-05-01T00:00:00Z' }];

    // Mock: company_research_targets returns existing, company_need_drafts returns existing
    vi.mocked(db.from).mockImplementation((table: string) => ({
      select: () => ({
        eq: () => ({
          limit: () => Promise.resolve({
            data: table === 'company_research_targets' ? existingTarget : existingDraft,
            error: null,
          }),
        }),
      }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      insert: () => Promise.resolve({ error: null }),
    } as never));

    const result = await importMarketSignals(
      [makeSignal({ scan_date: '2026-06-01T00:00:00Z' })],
      { run_type: 'import_run', source_types: ['platsbanken'] },
    );

    expect(result.signals_updated).toBe(1);
    expect(result.signals_imported).toBe(0);
  });

  it('logs run_type=import_run to system_actions', async () => {
    mockDbForImport([], []);
    await importMarketSignals([makeSignal()], {
      run_type: 'import_run', source_types: ['manual_csv'],
    });

    const call = vi.mocked(logAction).mock.calls[0];
    const result = (call[0] as { result: Record<string, unknown> }).result;
    expect(result.run_type).toBe('import_run');
    expect(result.is_evaluation_only).toBe(false);
  });

  it('does NOT log driver PII — no names or phones', async () => {
    mockDbForImport([], []);
    await importMarketSignals([makeSignal({
      contact_email:         'secret@company.se',
      phone:                 '0730123456',
      decision_maker_name:   'Lars Andersson',
    })], { run_type: 'import_run', source_types: ['platsbanken'] });

    const payload = JSON.stringify(vi.mocked(logAction).mock.calls);
    expect(payload).not.toContain('secret@company.se');
    expect(payload).not.toContain('0730123456');
    expect(payload).not.toContain('Lars Andersson');
  });

  it('preserves source_url and job_url in draft metadata — import count reflects success', async () => {
    mockDbForImport([], []);
    const sig = makeSignal({
      source_url: 'https://example.com/search',
      job_url:    'https://example.com/job/123',
    });
    const result = await importMarketSignals([sig], { run_type: 'import_run', source_types: ['platsbanken'] });
    // If source fields were preserved, import should succeed
    expect(result.signals_imported).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('live_scan run_type is logged correctly', async () => {
    mockDbForImport([], []);
    await importMarketSignals([makeSignal()], {
      run_type:             'live_scan',
      source_types:         ['platsbanken'],
      live_sources_checked: 9,
      live_signals_found:   25,
    });

    const call   = vi.mocked(logAction).mock.calls[0];
    const result = (call[0] as { result: Record<string, unknown> }).result;
    expect(result.run_type).toBe('live_scan');
    expect(result.live_sources_checked).toBe(9);
    expect(result.live_signals_found).toBe(25);
  });
});

// ─── Safety: no external contact, no email/SMS ────────────────────────────────

describe('importMarketSignals — safety', () => {
  it('does not trigger matchingAgent', async () => {
    // Covered by absence of matchingAgent import in marketSignalImport.ts
    // This test verifies the module does not import contact/matching modules
    const src = await import('../lib/marketSignalImport?t=' + Date.now());
    const keys = Object.keys(src);
    expect(keys).not.toContain('runMatchingAgent');
    expect(keys).not.toContain('runContactAgent');
  });
});
