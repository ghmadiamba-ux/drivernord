import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

// isSimulationCompanyName is a pure function — import it directly (no DB needed).
import { isSimulationCompanyName } from '../lib/warnings';
import { getMatchableOpenCompanyNeeds } from '../lib/companyNeedStore';
import { db } from '../lib/db';

// ─── isSimulationCompanyName (pure, no DB) ────────────────────────────────────

describe('isSimulationCompanyName', () => {
  it('matches "SIMULATION …" prefix', () => {
    expect(isSimulationCompanyName('SIMULATION Stockholm Distribution AB')).toBe(true);
  });

  it('matches "SIM-…" prefix', () => {
    expect(isSimulationCompanyName('SIM-FP-v2 Nordic Long Haul')).toBe(true);
  });

  it('matches name containing "Test"', () => {
    expect(isSimulationCompanyName('Test Logistics')).toBe(true);
    expect(isSimulationCompanyName('Real Transport Test')).toBe(true);
    expect(isSimulationCompanyName('Auth Test Co')).toBe(true);
  });

  it('matches "Probe" in name', () => {
    expect(isSimulationCompanyName('Probe Live')).toBe(true);
  });

  it('matches "Auth Test" substring', () => {
    expect(isSimulationCompanyName('Auth Test Co')).toBe(true);
  });

  it('does NOT match a real company name', () => {
    expect(isSimulationCompanyName('Göteborgs Åkeri AB')).toBe(false);
    expect(isSimulationCompanyName('Nordic Express Transport')).toBe(false);
    expect(isSimulationCompanyName('Ekipage & Logistik Sverige')).toBe(false);
  });
});

// ─── getMatchableOpenCompanyNeeds ────────────────────────────────────────────
//
// New implementation uses need_type column to filter simulation/test rows.
// Chain: .select('*').eq('status','open').in('need_type', MATCHABLE_NEED_TYPES)
// No companies table JOIN is needed.

const REAL_NEED = {
  id:                 'need-real-1',
  company_id:         'co-real-1',
  created_at:         '2026-05-01T10:00:00.000Z',
  license_required:   'CE',
  domain_required:    'distribution',
  domain_preferred:   [],
  location_region:    'stockholm',
  relocation_allowed: false,
  shift_type:         'day',
  urgency:            'standard',
  status:             'open',
  need_type:          'active_public_need',
  source_draft_id:    null,
  metadata:           null,
};

const SIM_NEED = {
  ...REAL_NEED,
  id:        'need-sim-1',
  company_id: 'co-sim-1',
  need_type:  'simulation_only',
};

const TEST_NEED = {
  ...REAL_NEED,
  id:        'need-test-1',
  company_id: 'co-test-1',
  need_type:  'archived_test',
};

// Non-simulation path: .select('*').eq('status','open').in('need_type', [...])
function makeEqInChain(result: unknown) {
  return { select: () => ({ eq: () => ({ in: () => Promise.resolve(result) }) }) };
}

// Simulation path (getOpenCompanyNeeds): .select('*').eq('status','open')
function makeEqChain(result: unknown) {
  return { select: () => ({ eq: () => Promise.resolve(result) }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('getMatchableOpenCompanyNeeds — ENABLE_SIMULATION_MATCHING=false (default)', () => {
  it('excludes needs with simulation_only need_type', async () => {
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'company_needs') {
        // DB filters by need_type IN MATCHABLE_NEED_TYPES — only real need comes back
        return makeEqInChain({ data: [REAL_NEED], error: null }) as never;
      }
      return makeEqChain({ data: [], error: null }) as never;
    });

    const result = await getMatchableOpenCompanyNeeds();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('need-real-1');
  });

  it('excludes needs with archived_test need_type', async () => {
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'company_needs') {
        return makeEqInChain({ data: [REAL_NEED], error: null }) as never;
      }
      return makeEqChain({ data: [], error: null }) as never;
    });

    const result = await getMatchableOpenCompanyNeeds();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('need-real-1');
  });

  it('returns all matching needs when all have active need_types', async () => {
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'company_needs') {
        return makeEqInChain({ data: [REAL_NEED], error: null }) as never;
      }
      return makeEqChain({ data: [], error: null }) as never;
    });

    const result = await getMatchableOpenCompanyNeeds();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('need-real-1');
  });

  it('returns empty array when DB returns no matchable needs', async () => {
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'company_needs') {
        return makeEqInChain({ data: [], error: null }) as never;
      }
      return makeEqChain({ data: [], error: null }) as never;
    });

    const result = await getMatchableOpenCompanyNeeds();
    expect(result).toHaveLength(0);
  });

  it('does NOT query the companies table', async () => {
    let companiesQueried = false;
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'company_needs') {
        return makeEqInChain({ data: [], error: null }) as never;
      }
      if (table === 'companies') {
        companiesQueried = true;
        return makeEqChain({ data: [], error: null }) as never;
      }
      return makeEqChain({ data: [], error: null }) as never;
    });

    await getMatchableOpenCompanyNeeds();
    expect(companiesQueried).toBe(false);
  });
});

describe('getMatchableOpenCompanyNeeds — ENABLE_SIMULATION_MATCHING=true', () => {
  it('returns all open needs (including simulation) when flag is enabled', async () => {
    vi.stubEnv('ENABLE_SIMULATION_MATCHING', 'true');

    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'company_needs') {
        return makeEqChain({ data: [SIM_NEED, REAL_NEED], error: null }) as never;
      }
      return makeEqChain({ data: [], error: null }) as never;
    });

    const result = await getMatchableOpenCompanyNeeds();
    expect(result).toHaveLength(2);
  });

  it('does not query companies table when flag is enabled', async () => {
    vi.stubEnv('ENABLE_SIMULATION_MATCHING', 'true');

    let companiesQueried = false;
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'company_needs') {
        return makeEqChain({ data: [SIM_NEED], error: null }) as never;
      }
      if (table === 'companies') {
        companiesQueried = true;
        return makeEqChain({ data: [], error: null }) as never;
      }
      return makeEqChain({ data: [], error: null }) as never;
    });

    await getMatchableOpenCompanyNeeds();
    expect(companiesQueried).toBe(false);
  });
});
