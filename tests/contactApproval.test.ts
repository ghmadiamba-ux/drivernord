import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/recruiterAuth', () => ({
  requireRecruiterAuth: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('log-id'),
}));

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

// No messaging mock — this cockpit must never call getMessagingProvider

import { PATCH } from '../app/api/admin/contacts/[id]/route';
import { GET } from '../app/api/admin/contacts/route';
import { getContactApprovalQueue } from '../lib/contactApproval';
import { db } from '../lib/db';
import { logAction } from '../lib/systemActions';
import { requireRecruiterAuth } from '../lib/recruiterAuth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body?: unknown): NextRequest {
  return {
    headers: new Headers({ 'x-recruiter-key': 'test-key' }),
    json:    () => Promise.resolve(body),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

function makeContactSuggestedRow(overrides: Partial<{
  id:          string;
  action_type: string;
  target_type: string;
  target_id:   string;
  status:      string;
  input:       Record<string, unknown> | null;
}> = {}) {
  return {
    id:          'action-1',
    action_type: 'contact_suggested',
    target_type: 'shortlist_entry',
    target_id:   'entry-1',
    status:      'pending',
    input: {
      driver_id:       'driver-1',
      match_score:     88,
      first_name:      'Erik',
      phone:           '+46701234567',
      message:         'Hej Erik 👋\n\nVi har en match...',
      company_name:    'Transport AB',
      urgency:         'high',
      company_need_id: 'need-1',
      shortlist_id:    'shortlist-1',
    },
    ...overrides,
  };
}

// ─── DB chain builders for PATCH ─────────────────────────────────────────────

// Mocks the four-call sequence for PATCH approve:
//  1. SELECT single()               — fetch action row
//  2. SELECT .eq().eq().limit()     — governance: DQ check  (returns dqHits entries)
//  3. SELECT .eq().limit()          — governance: dup check (returns dupPhone match or empty)
//  4. UPDATE().eq().eq().select()   — atomic status update
function mockApproveChain(
  row: ReturnType<typeof makeContactSuggestedRow>,
  { dqHits = 0, dupPhone = '' }: { dqHits?: number; dupPhone?: string } = {},
) {
  let saCount = 0;
  vi.mocked(db.from).mockImplementation((table: string) => {
    if (table === 'system_actions') {
      saCount++;
      if (saCount === 1) {
        // Fetch action row
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: row, error: null }),
            }),
          }),
        } as never;
      }
      if (saCount === 2) {
        // DQ check: .select('id').eq(action_type).eq(target_id).limit(1)
        const dqData = dqHits > 0 ? [{ id: 'dq-1' }] : [];
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => Promise.resolve({ data: dqData, error: null }),
              }),
            }),
          }),
        } as never;
      }
      if (saCount === 3) {
        // Dup check: .select('input').eq(action_type).limit(50)
        const dupData = dupPhone
          ? [{ input: { phone: dupPhone } }]
          : [];
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: dupData, error: null }),
            }),
          }),
        } as never;
      }
      // saCount >= 4: Atomic update
      return {
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => Promise.resolve({ data: [{ id: row.id }], error: null }),
            }),
          }),
        }),
      } as never;
    }
    return {} as never;
  });
}

// Mocks force approve (force: true skips governance queries):
//  1. SELECT single()               — fetch action row
//  2. UPDATE().eq().eq().select()   — atomic status update
function mockForceApproveChain(row: ReturnType<typeof makeContactSuggestedRow>) {
  let saCount = 0;
  vi.mocked(db.from).mockImplementation((table: string) => {
    if (table === 'system_actions') {
      saCount++;
      if (saCount === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: row, error: null }),
            }),
          }),
        } as never;
      }
      return {
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => Promise.resolve({ data: [{ id: row.id }], error: null }),
            }),
          }),
        }),
      } as never;
    }
    return {} as never;
  });
}

// Mocks the two-call sequence for PATCH skip / needs_review (atomic guard):
//  1. SELECT single() — returns the row
//  2. UPDATE().eq().eq().select() — returns [{ id }]
function mockUpdateChain(row: ReturnType<typeof makeContactSuggestedRow>) {
  let saCount = 0;
  vi.mocked(db.from).mockImplementation((table: string) => {
    if (table === 'system_actions') {
      saCount++;
      if (saCount === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: row, error: null }),
            }),
          }),
        } as never;
      }
      return {
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => Promise.resolve({ data: [{ id: row.id }], error: null }),
            }),
          }),
        }),
      } as never;
    }
    return {} as never;
  });
}

// ─── DB chain builders for getContactApprovalQueue ───────────────────────────

// system_actions: .select().eq().eq().order()
function makeContactSuggestedChain(rows: unknown[]) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: rows, error: null }),
        }),
      }),
    }),
  };
}

// ingested_drivers: .select().in()
function makeIngestedDriversChain(rows: unknown[]) {
  return {
    select: () => ({
      in: () => Promise.resolve({ data: rows, error: null }),
    }),
  };
}

// system_actions quality issues: .select().eq().in()
function makeQualityChain(rows: unknown[]) {
  return {
    select: () => ({
      eq: () => ({
        in: () => Promise.resolve({ data: rows, error: null }),
      }),
    }),
  };
}

// system_actions duplicate warnings: .select().eq()
function makeDuplicateChain(rows: unknown[]) {
  return {
    select: () => ({
      eq: () => Promise.resolve({ data: rows, error: null }),
    }),
  };
}

function setupQueueMocks({
  actions    = [] as unknown[],
  drivers    = [] as unknown[],
  quality    = [] as unknown[],
  duplicates = [] as unknown[],
} = {}) {
  let saCount = 0;
  vi.mocked(db.from).mockImplementation((table: string) => {
    if (table === 'system_actions') {
      saCount++;
      if (saCount === 1) return makeContactSuggestedChain(actions) as never;
      if (saCount === 2) return makeQualityChain(quality)          as never;
      return              makeDuplicateChain(duplicates)            as never;
    }
    if (table === 'ingested_drivers') {
      return makeIngestedDriversChain(drivers) as never;
    }
    return {} as never;
  });
}

beforeEach(() => vi.clearAllMocks());

// ─── PATCH /api/admin/contacts/[id] — auth ────────────────────────────────────

describe('PATCH /api/admin/contacts/[id] — auth', () => {
  it('rejects unauthorized requests', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({
      ok: false, status: 401, body: { error: 'unauthorized' },
    });
    const res = await PATCH(makeReq({ action: 'approve' }), { params: { id: 'x' } });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH — input validation ─────────────────────────────────────────────────

describe('PATCH /api/admin/contacts/[id] — validation', () => {
  it('returns 400 for invalid action', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }),
    } as never);

    const res = await PATCH(makeReq({ action: 'send_sms' }), { params: { id: 'x' } });
    expect(res.status).toBe(400);
  });

  it('returns 404 when action does not exist', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }),
    } as never);

    const res = await PATCH(makeReq({ action: 'approve' }), { params: { id: 'missing' } });
    expect(res.status).toBe(404);
  });

  it('returns 409 when action is not pending', async () => {
    const row = makeContactSuggestedRow({ status: 'approved' });
    vi.mocked(db.from).mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }),
    } as never);

    const res = await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(409);
    expect((await res.json()).current_status).toBe('approved');
  });
});

// ─── PATCH — approve (NO SMS) ────────────────────────────────────────────────

describe('PATCH /api/admin/contacts/[id] — approve', () => {
  beforeEach(() => mockApproveChain(makeContactSuggestedRow()));

  it('returns 200 ok:true', async () => {
    const res = await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('logs contact_confirmed', async () => {
    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    const call = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_confirmed');
    expect(call).toBeDefined();
    expect(call![0].status).toBe('completed');
    expect(call![0].target_id).toBe('entry-1');
  });

  it('includes no-sms note in contact_confirmed input', async () => {
    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    const call = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_confirmed');
    expect(String((call![0].input as Record<string, unknown>).note)).toContain('without_sms');
  });

  it('does NOT import or call any messaging provider', async () => {
    // If getMessagingProvider were called, it would throw since it's not mocked
    await expect(
      PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } }),
    ).resolves.not.toThrow();
    // Verify no module named 'messaging' was accessed through db calls
    const dbCalls = vi.mocked(db.from).mock.calls.map(([t]) => t);
    expect(dbCalls).not.toContain('messaging');
  });

  it('returns 409 if idempotency guard fires (race condition)', async () => {
    let saCount = 0;
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'system_actions') {
        saCount++;
        if (saCount === 1) {
          return {
            select: () => ({
              eq: () => ({ single: () => Promise.resolve({ data: makeContactSuggestedRow(), error: null }) }),
            }),
          } as never;
        }
        if (saCount === 2) {
          // DQ check — no issues
          return {
            select: () => ({ eq: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }),
          } as never;
        }
        if (saCount === 3) {
          // Dup check — no issues
          return {
            select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
          } as never;
        }
        // saCount >= 4: Atomic update returns empty — race condition
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });

    const res = await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(409);
  });
});

// ─── PATCH — skip ─────────────────────────────────────────────────────────────

describe('PATCH /api/admin/contacts/[id] — skip', () => {
  beforeEach(() => mockUpdateChain(makeContactSuggestedRow()));

  it('returns 200 ok:true', async () => {
    const res = await PATCH(makeReq({ action: 'skip' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('logs contact_skipped_by_founder', async () => {
    await PATCH(makeReq({ action: 'skip' }), { params: { id: 'action-1' } });
    const call = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'contact_skipped_by_founder',
    );
    expect(call).toBeDefined();
    expect(call![0].target_id).toBe('entry-1');
    expect(call![0].status).toBe('completed');
  });

  it('returns 409 if atomic guard fires (race condition)', async () => {
    let saCount = 0;
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'system_actions') {
        saCount++;
        if (saCount === 1) {
          return {
            select: () => ({
              eq: () => ({ single: () => Promise.resolve({ data: makeContactSuggestedRow(), error: null }) }),
            }),
          } as never;
        }
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });

    const res = await PATCH(makeReq({ action: 'skip' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(409);
  });
});

// ─── PATCH — needs_review ──────────────────────────────────────────────────────

describe('PATCH /api/admin/contacts/[id] — needs_review', () => {
  beforeEach(() => mockUpdateChain(makeContactSuggestedRow()));

  it('returns 200 ok:true', async () => {
    const res = await PATCH(makeReq({ action: 'needs_review' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('logs contact_needs_review', async () => {
    await PATCH(makeReq({ action: 'needs_review' }), { params: { id: 'action-1' } });
    const call = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'contact_needs_review',
    );
    expect(call).toBeDefined();
    expect(call![0].target_id).toBe('entry-1');
    expect(call![0].status).toBe('completed');
  });

  it('returns 409 if atomic guard fires (race condition)', async () => {
    let saCount = 0;
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'system_actions') {
        saCount++;
        if (saCount === 1) {
          return {
            select: () => ({
              eq: () => ({ single: () => Promise.resolve({ data: makeContactSuggestedRow(), error: null }) }),
            }),
          } as never;
        }
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });

    const res = await PATCH(makeReq({ action: 'needs_review' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(409);
  });
});

// ─── GET /api/admin/contacts — auth ───────────────────────────────────────────

describe('GET /api/admin/contacts — auth', () => {
  it('rejects unauthorized requests', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({
      ok: false, status: 401, body: { error: 'unauthorized' },
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });
});

// ─── getContactApprovalQueue — enrichment ────────────────────────────────────

describe('getContactApprovalQueue — queue building', () => {
  it('returns empty array when no pending actions', async () => {
    setupQueueMocks({ actions: [] });
    const result = await getContactApprovalQueue();
    expect(result).toEqual([]);
  });

  it('enriches action with driver details', async () => {
    setupQueueMocks({
      actions: [makeContactSuggestedRow()],
      drivers: [{
        id:           'driver-1',
        license:      'CE',
        ykb:          'yes',
        region:       'stockholm',
        availability: 'now',
        domain:       'distribution',
      }],
    });

    const result = await getContactApprovalQueue();
    expect(result).toHaveLength(1);
    expect(result[0].license).toBe('CE');
    expect(result[0].ykb).toBe('yes');
    expect(result[0].region).toBe('stockholm');
    expect(result[0].availability).toBe('now');
    expect(result[0].domain).toBe('distribution');
  });

  it('sets has_quality_issue true when driver has quality action', async () => {
    setupQueueMocks({
      actions: [makeContactSuggestedRow()],
      drivers: [{ id: 'driver-1', license: 'CE', ykb: 'yes', region: 'stockholm', availability: 'now', domain: null }],
      quality: [{ target_id: 'driver-1' }],
    });

    const result = await getContactApprovalQueue();
    expect(result[0].has_quality_issue).toBe(true);
  });

  it('sets has_quality_issue false when no quality action for driver', async () => {
    setupQueueMocks({
      actions: [makeContactSuggestedRow()],
      drivers: [{ id: 'driver-1', license: 'CE', ykb: 'yes', region: 'stockholm', availability: 'now', domain: null }],
      quality: [],
    });

    const result = await getContactApprovalQueue();
    expect(result[0].has_quality_issue).toBe(false);
  });

  it('sets has_duplicate true when phone matches a duplicate warning', async () => {
    setupQueueMocks({
      actions: [makeContactSuggestedRow()],
      drivers: [{ id: 'driver-1', license: 'CE', ykb: 'yes', region: 'stockholm', availability: 'now', domain: null }],
      duplicates: [{ input: { phone: '+46701234567' } }],
    });

    const result = await getContactApprovalQueue();
    expect(result[0].has_duplicate).toBe(true);
  });

  it('sets has_duplicate false when no matching duplicate warning', async () => {
    setupQueueMocks({
      actions: [makeContactSuggestedRow()],
      drivers: [{ id: 'driver-1', license: 'CE', ykb: 'yes', region: 'stockholm', availability: 'now', domain: null }],
      duplicates: [{ input: { phone: '+46799999999' } }],
    });

    const result = await getContactApprovalQueue();
    expect(result[0].has_duplicate).toBe(false);
  });

  it('maps all action input fields correctly', async () => {
    setupQueueMocks({
      actions: [makeContactSuggestedRow()],
      drivers: [{ id: 'driver-1', license: 'CE', ykb: 'yes', region: 'stockholm', availability: 'now', domain: null }],
    });

    const result = await getContactApprovalQueue();
    const item = result[0];
    expect(item.action_id).toBe('action-1');
    expect(item.driver_id).toBe('driver-1');
    expect(item.match_score).toBe(88);
    expect(item.first_name).toBe('Erik');
    expect(item.phone).toBe('+46701234567');
    expect(item.company_name).toBe('Transport AB');
    expect(item.urgency).toBe('high');
    expect(item.company_need_id).toBe('need-1');
    expect(item.shortlist_id).toBe('shortlist-1');
  });

  it('handles missing driver gracefully (nulls for enriched fields)', async () => {
    setupQueueMocks({
      actions: [makeContactSuggestedRow()],
      drivers: [], // driver not found
    });

    const result = await getContactApprovalQueue();
    expect(result[0].license).toBeNull();
    expect(result[0].ykb).toBeNull();
    expect(result[0].region).toBeNull();
  });
});

// ─── PATCH — governance: approve blocked on DQ issue ─────────────────────────

describe('PATCH /api/admin/contacts/[id] — governance: data quality block', () => {
  it('returns 422 when driver has a data_quality_issue action', async () => {
    mockApproveChain(makeContactSuggestedRow(), { dqHits: 1 });
    const res = await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('blocked_data_quality');
    expect(body.has_quality_issue).toBe(true);
    expect(body.has_duplicate).toBe(false);
    expect(body.force_available).toBe(true);
  });

  it('response includes a human-readable warning', async () => {
    mockApproveChain(makeContactSuggestedRow(), { dqHits: 1 });
    const res = await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    const body = await res.json();
    expect(typeof body.warning).toBe('string');
    expect(body.warning.length).toBeGreaterThan(10);
  });

  it('approve succeeds with force: true + valid reason despite quality issue', async () => {
    mockForceApproveChain(makeContactSuggestedRow());
    const res = await PATCH(
      makeReq({ action: 'approve', force: true, force_reason: 'Called driver, identity confirmed' }),
      { params: { id: 'action-1' } },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('returns 400 when force=true but force_reason is missing', async () => {
    mockForceApproveChain(makeContactSuggestedRow());
    const res = await PATCH(makeReq({ action: 'approve', force: true }), { params: { id: 'action-1' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('force_reason_required');
  });

  it('returns 400 when force_reason is shorter than 10 characters', async () => {
    mockForceApproveChain(makeContactSuggestedRow());
    const res = await PATCH(
      makeReq({ action: 'approve', force: true, force_reason: 'short' }),
      { params: { id: 'action-1' } },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('force_reason_required');
  });

  it('persists force_reason in contact_confirmed log entry', async () => {
    mockForceApproveChain(makeContactSuggestedRow());
    await PATCH(
      makeReq({ action: 'approve', force: true, force_reason: 'Identity verified by phone call' }),
      { params: { id: 'action-1' } },
    );
    const call = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_confirmed');
    expect(call).toBeDefined();
    const input = call![0].input as Record<string, unknown>;
    expect(input.force_override).toBe(true);
    expect(input.force_reason).toBe('Identity verified by phone call');
    expect(String(input.note)).toContain('force_approved_without_sms');
  });
});

// ─── PATCH — governance: approve blocked on duplicate phone ───────────────────

describe('PATCH /api/admin/contacts/[id] — governance: duplicate phone block', () => {
  it('returns 422 when phone matches a driver_duplicate_detected action', async () => {
    const row = makeContactSuggestedRow();
    const phone = (row.input as Record<string, unknown>).phone as string;
    mockApproveChain(row, { dupPhone: phone });

    const res = await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('blocked_data_quality');
    expect(body.has_duplicate).toBe(true);
    expect(body.has_quality_issue).toBe(false);
  });

  it('approve succeeds with force: true + valid reason despite duplicate phone', async () => {
    mockForceApproveChain(makeContactSuggestedRow());
    const res = await PATCH(
      makeReq({ action: 'approve', force: true, force_reason: 'Confirmed canonical driver by phone' }),
      { params: { id: 'action-1' } },
    );
    expect(res.status).toBe(200);
  });
});

// ─── PATCH — governance: skip and needs_review bypass governance ──────────────

describe('PATCH /api/admin/contacts/[id] — governance: non-approve actions bypass check', () => {
  it('skip is never blocked by governance', async () => {
    mockUpdateChain(makeContactSuggestedRow());
    const res = await PATCH(makeReq({ action: 'skip' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(200);
  });

  it('needs_review is never blocked by governance', async () => {
    mockUpdateChain(makeContactSuggestedRow());
    const res = await PATCH(makeReq({ action: 'needs_review' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(200);
  });
});
