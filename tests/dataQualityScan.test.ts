import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('logged-id'),
}));

vi.mock('../lib/ingestedDriverStore', () => ({
  getActiveIngestedDrivers: vi.fn(),
}));

import { scanAndLogExistingIssues } from '../lib/dataQualityScan';
import { db } from '../lib/db';
import { logAction } from '../lib/systemActions';
import { getActiveIngestedDrivers } from '../lib/ingestedDriverStore';
import type { IngestedDriver } from '../lib/ingestedDriver';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDriver(overrides: Partial<{
  id:        string;
  firstName: string;
  phone:     string;
  email:     string | null;
}>): IngestedDriver {
  return {
    id:           overrides.id         ?? 'driver-a',
    ingestedAt:   new Date('2026-05-20T00:00:00Z'),
    priority:     'HIGH',
    license:      'CE',
    ykb:          'yes',
    driverCard:   'yes',
    location:     { region: 'stockholm', willingToRelocate: null },
    availability: 'now',
    domain:       'distribution',
    shiftPreference: null,
    contact: {
      firstName: overrides.firstName ?? 'Erik',
      phone:     overrides.phone     ?? '+46701234567',
      email:     overrides.email     ?? null,
    },
    needsFollowUp: false,
    followUpAt:    null,
    followUpReason: null,
  };
}

// system_actions: .select().eq()  → returns { data, error }
function makeSelectEqChain(result: unknown) {
  return {
    select: () => ({ eq: () => Promise.resolve(result) }),
  };
}

function setupDbMocks({
  existingDupActions  = [] as unknown[],
  existingDqActions   = [] as unknown[],
} = {}) {
  let callCount = 0;
  vi.mocked(db.from).mockImplementation((table: string) => {
    if (table === 'system_actions') {
      callCount++;
      if (callCount === 1) return makeSelectEqChain({ data: existingDupActions, error: null }) as never;
      return              makeSelectEqChain({ data: existingDqActions,  error: null }) as never;
    }
    return {} as never;
  });
}

beforeEach(() => vi.clearAllMocks());

// ─── scanAndLogExistingIssues — drivers fetch failure ────────────────────────

describe('scanAndLogExistingIssues — fetch failure', () => {
  it('returns error when getActiveIngestedDrivers throws', async () => {
    vi.mocked(getActiveIngestedDrivers).mockRejectedValueOnce(new Error('DB down'));
    const result = await scanAndLogExistingIssues();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('fetch_drivers_failed');
    expect(result.scanned).toBe(0);
  });
});

// ─── scanAndLogExistingIssues — empty driver list ────────────────────────────

describe('scanAndLogExistingIssues — empty', () => {
  it('returns zero counts when no drivers', async () => {
    vi.mocked(getActiveIngestedDrivers).mockResolvedValueOnce([]);
    const result = await scanAndLogExistingIssues();
    expect(result.scanned).toBe(0);
    expect(result.new_duplicate_flagged).toBe(0);
    expect(result.new_dq_flagged).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });
});

// ─── Duplicate phone detection ────────────────────────────────────────────────

describe('scanAndLogExistingIssues — duplicate phone', () => {
  it('flags the second driver when two share the same phone', async () => {
    const driverA = makeDriver({ id: 'a', phone: '0733344130', firstName: 'Samuel Saman' });
    const driverB = makeDriver({ id: 'b', phone: '0733344130', firstName: 'Samuel Rajabi' });
    vi.mocked(getActiveIngestedDrivers).mockResolvedValueOnce([driverA, driverB]);
    setupDbMocks({ existingDupActions: [], existingDqActions: [] });

    const result = await scanAndLogExistingIssues();
    expect(result.scanned).toBe(2);
    expect(result.new_duplicate_flagged).toBe(1);
    expect(result.new_dq_flagged).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('calls logAction with driver_duplicate_detected and correct params', async () => {
    const driverA = makeDriver({ id: 'canonical-id', phone: '0733344130' });
    const driverB = makeDriver({ id: 'duplicate-id', phone: '0733344130' });
    vi.mocked(getActiveIngestedDrivers).mockResolvedValueOnce([driverA, driverB]);
    setupDbMocks();

    await scanAndLogExistingIssues();

    const call = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'driver_duplicate_detected',
    );
    expect(call).toBeDefined();
    expect(call![0].target_id).toBe('duplicate-id');
    expect(call![0].status).toBe('completed');
    expect(call![0].triggered_by).toBe('scan:dataQualityScan_v1');
    const inp = call![0].input as Record<string, unknown>;
    expect(inp.phone).toBe('0733344130');
    expect(inp.existing_id).toBe('canonical-id');
    expect(inp.new_id).toBe('duplicate-id');
  });

  it('skips phone already present in existing driver_duplicate_detected actions', async () => {
    const driverA = makeDriver({ id: 'a', phone: '0733344130' });
    const driverB = makeDriver({ id: 'b', phone: '0733344130' });
    vi.mocked(getActiveIngestedDrivers).mockResolvedValueOnce([driverA, driverB]);
    setupDbMocks({
      existingDupActions: [{ input: { phone: '0733344130', new_id: 'b', existing_id: 'a' } }],
    });

    const result = await scanAndLogExistingIssues();
    expect(result.new_duplicate_flagged).toBe(0);
    expect(result.already_flagged).toBeGreaterThan(0);
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });

  it('flags 2 duplicates when three drivers share the same phone', async () => {
    const a = makeDriver({ id: 'a', phone: '0700000000' });
    const b = makeDriver({ id: 'b', phone: '0700000000' });
    const c = makeDriver({ id: 'c', phone: '0700000000' });
    vi.mocked(getActiveIngestedDrivers).mockResolvedValueOnce([a, b, c]);
    setupDbMocks();

    const result = await scanAndLogExistingIssues();
    expect(result.new_duplicate_flagged).toBe(2);
  });
});

// ─── Data quality (name=phone) detection ─────────────────────────────────────

describe('scanAndLogExistingIssues — name is phone number', () => {
  it('flags driver whose firstName looks like a phone number', async () => {
    const d = makeDriver({ id: 'dq-driver', firstName: '+46793055655', phone: '+46793055655' });
    vi.mocked(getActiveIngestedDrivers).mockResolvedValueOnce([d]);
    setupDbMocks();

    const result = await scanAndLogExistingIssues();
    expect(result.new_dq_flagged).toBe(1);
    expect(result.new_duplicate_flagged).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('calls logAction with data_quality_issue and correct params', async () => {
    const d = makeDriver({ id: 'dq-driver', firstName: '+46793055655', phone: '+46793055655' });
    vi.mocked(getActiveIngestedDrivers).mockResolvedValueOnce([d]);
    setupDbMocks();

    await scanAndLogExistingIssues();

    const call = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'data_quality_issue',
    );
    expect(call).toBeDefined();
    expect(call![0].target_id).toBe('dq-driver');
    expect(call![0].status).toBe('completed');
    expect(call![0].triggered_by).toBe('scan:dataQualityScan_v1');
    const inp = call![0].input as Record<string, unknown>;
    expect((inp.issues as string[])).toContain('name_is_phone_number');
  });

  it('skips driver already flagged in system_actions', async () => {
    const d = makeDriver({ id: 'dq-driver', firstName: '+46793055655', phone: '+46793055655' });
    vi.mocked(getActiveIngestedDrivers).mockResolvedValueOnce([d]);
    setupDbMocks({
      existingDqActions: [{ target_id: 'dq-driver' }],
    });

    const result = await scanAndLogExistingIssues();
    expect(result.new_dq_flagged).toBe(0);
    expect(result.already_flagged).toBeGreaterThan(0);
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });
});

// ─── Clean drivers not flagged ────────────────────────────────────────────────

describe('scanAndLogExistingIssues — clean drivers', () => {
  it('does not log actions for a driver with valid name and unique phone', async () => {
    const d = makeDriver({ id: 'clean', firstName: 'Samir', phone: '+46701234567' });
    vi.mocked(getActiveIngestedDrivers).mockResolvedValueOnce([d]);
    setupDbMocks();

    const result = await scanAndLogExistingIssues();
    expect(result.new_duplicate_flagged).toBe(0);
    expect(result.new_dq_flagged).toBe(0);
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });
});

// ─── No SMS / outreach triggered ────────────────────────────────────────────

describe('scanAndLogExistingIssues — no outreach', () => {
  it('never calls any messaging provider or sends SMS', async () => {
    const a = makeDriver({ id: 'a', phone: '0733344130' });
    const b = makeDriver({ id: 'b', phone: '0733344130' });
    vi.mocked(getActiveIngestedDrivers).mockResolvedValueOnce([a, b]);
    setupDbMocks();

    await scanAndLogExistingIssues();

    // logAction is called only for audit — never a messaging function
    const calls = vi.mocked(logAction).mock.calls;
    const hasSmsCall = calls.some(([p]) =>
      p.action_type === 'contact_sent' || p.action_type === 'follow_up_sent',
    );
    expect(hasSmsCall).toBe(false);
  });
});
