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

import { POST } from '../app/api/admin/needs/[id]/approve-outreach/route';
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

function makeNeedRow(overrides: Partial<{
  id:        string;
  need_type: string;
  status:    string;
  company_id: string;
}> = {}) {
  return {
    id:         overrides.id         ?? 'need-1',
    need_type:  overrides.need_type  ?? 'active_public_need',
    status:     overrides.status     ?? 'open',
    company_id: overrides.company_id ?? 'company-1',
  };
}

// ─── DB chain builders ────────────────────────────────────────────────────────

// Fetch need: .select().eq().single()  → returns row or null
function mockFetchNeed(row: ReturnType<typeof makeNeedRow> | null, error = false) {
  vi.mocked(db.from).mockImplementationOnce((table: string) => {
    if (table === 'company_needs') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve(
              error
                ? { data: null, error: { message: 'not found' } }
                : { data: row, error: null },
            ),
          }),
        }),
      } as never;
    }
    return {} as never;
  });
}

// Atomic update: .update().eq().in().select() → returns [{ id }] or []
function mockAtomicUpdate(success: boolean, needRow: ReturnType<typeof makeNeedRow>) {
  vi.mocked(db.from).mockImplementationOnce((table: string) => {
    if (table === 'company_needs') {
      return {
        update: () => ({
          eq: () => ({
            in: () => ({
              select: () => Promise.resolve({
                data: success ? [{ id: needRow.id }] : [],
                error: null,
              }),
            }),
          }),
        }),
      } as never;
    }
    return {} as never;
  });
}

// Full happy-path: fetch + atomic update
function mockApproveChain(row: ReturnType<typeof makeNeedRow>) {
  mockFetchNeed(row);
  mockAtomicUpdate(true, row);
}

beforeEach(() => vi.clearAllMocks());

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/needs/[id]/approve-outreach — auth', () => {
  it('rejects unauthorized requests', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({
      ok: false, status: 401, body: { error: 'unauthorized' },
    });
    const res = await POST(makeReq({ reason: 'Valid reason here' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(401);
  });
});

// ─── Reason validation ────────────────────────────────────────────────────────

describe('POST — reason validation', () => {
  it('returns 400 when reason is missing', async () => {
    const res = await POST(makeReq({}), { params: { id: 'need-1' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('reason_required');
  });

  it('returns 400 when reason is an empty string', async () => {
    const res = await POST(makeReq({ reason: '' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('reason_required');
  });

  it('returns 400 when reason is shorter than 10 characters', async () => {
    const res = await POST(makeReq({ reason: 'short' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('reason_required');
  });

  it('returns 400 when reason is whitespace only', async () => {
    const res = await POST(makeReq({ reason: '         ' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('reason_required');
  });

  it('accepts reason of exactly 10 characters', async () => {
    const row = makeNeedRow();
    mockApproveChain(row);
    const res = await POST(makeReq({ reason: '1234567890' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(200);
  });
});

// ─── Need not found ───────────────────────────────────────────────────────────

describe('POST — need not found', () => {
  it('returns 404 when need does not exist', async () => {
    mockFetchNeed(null, true);
    const res = await POST(makeReq({ reason: 'Founder approved this need' }), { params: { id: 'missing' } });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('not_found');
  });
});

// ─── Blocked need types ───────────────────────────────────────────────────────

describe('POST — simulation and test needs blocked', () => {
  it('returns 403 for simulation_only need', async () => {
    mockFetchNeed(makeNeedRow({ need_type: 'simulation_only' }));
    const res = await POST(makeReq({ reason: 'Founder approved this need' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('blocked_need_type');
  });

  it('returns 403 for archived_test need', async () => {
    mockFetchNeed(makeNeedRow({ need_type: 'archived_test' }));
    const res = await POST(makeReq({ reason: 'Founder approved this need' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('blocked_need_type');
  });

  it('does NOT log system_action for blocked simulation need', async () => {
    mockFetchNeed(makeNeedRow({ need_type: 'simulation_only' }));
    await POST(makeReq({ reason: 'Founder approved this need' }), { params: { id: 'need-1' } });
    expect(vi.mocked(logAction).mock.calls).toHaveLength(0);
  });
});

// ─── Invalid lifecycle states ─────────────────────────────────────────────────

describe('POST — invalid lifecycle states', () => {
  it('returns 422 for closed need', async () => {
    mockFetchNeed(makeNeedRow({ status: 'closed' }));
    const res = await POST(makeReq({ reason: 'Founder approved this need' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('need_closed');
  });

  it('returns 422 for expired need', async () => {
    mockFetchNeed(makeNeedRow({ need_type: 'expired' }));
    const res = await POST(makeReq({ reason: 'Founder approved this need' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('need_expired');
  });

  it('returns 409 for already contacted need', async () => {
    mockFetchNeed(makeNeedRow({ need_type: 'contacted' }));
    const res = await POST(makeReq({ reason: 'Founder approved this need' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('already_contacted');
  });

  it('returns 409 when outreach already approved (idempotency)', async () => {
    mockFetchNeed(makeNeedRow({ need_type: 'outreach_approved' }));
    const res = await POST(makeReq({ reason: 'Founder approved this need' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('already_approved');
  });
});

// ─── Valid approvals ──────────────────────────────────────────────────────────

describe('POST — valid approval', () => {
  it('approves active_public_need and returns 200', async () => {
    mockApproveChain(makeNeedRow({ need_type: 'active_public_need' }));
    const res = await POST(makeReq({ reason: 'Three clean candidates ready' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.need_type).toBe('outreach_approved');
  });

  it('approves matching_eligible need', async () => {
    mockApproveChain(makeNeedRow({ need_type: 'matching_eligible' }));
    const res = await POST(makeReq({ reason: 'Three clean candidates ready' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(200);
  });

  it('approves contact_ready_candidate need', async () => {
    mockApproveChain(makeNeedRow({ need_type: 'contact_ready_candidate' }));
    const res = await POST(makeReq({ reason: 'Three clean candidates ready' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(200);
  });

  it('approves outreach_pending_approval need', async () => {
    mockApproveChain(makeNeedRow({ need_type: 'outreach_pending_approval' }));
    const res = await POST(makeReq({ reason: 'Three clean candidates ready' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(200);
  });

  it('response includes a no-sms note', async () => {
    mockApproveChain(makeNeedRow());
    const res = await POST(makeReq({ reason: 'Three clean candidates ready' }), { params: { id: 'need-1' } });
    const body = await res.json();
    expect(typeof body.note).toBe('string');
    expect(body.note).toContain('No SMS or email');
  });
});

// ─── Audit logging ────────────────────────────────────────────────────────────

describe('POST — audit logging', () => {
  it('logs company_need_outreach_approved action', async () => {
    mockApproveChain(makeNeedRow());
    await POST(makeReq({ reason: 'Three clean candidates ready for contact' }), { params: { id: 'need-1' } });
    const call = vi.mocked(logAction).mock.calls[0];
    expect(call).toBeDefined();
    expect(call[0].action_type).toBe('company_need_outreach_approved');
    expect(call[0].target_type).toBe('company_need');
    expect(call[0].target_id).toBe('need-1');
    expect(call[0].status).toBe('completed');
    expect(call[0].triggered_by).toBe('human');
  });

  it('persists trimmed reason in log input', async () => {
    mockApproveChain(makeNeedRow());
    await POST(makeReq({ reason: '  Three clean candidates ready  ' }), { params: { id: 'need-1' } });
    const input = vi.mocked(logAction).mock.calls[0][0].input as Record<string, unknown>;
    expect(input.reason).toBe('Three clean candidates ready');
    expect(input.approved_by).toBe('founder');
    expect(input.source).toBe('founder_governance_cockpit_v1');
  });

  it('records prior_need_type in log input', async () => {
    mockApproveChain(makeNeedRow({ need_type: 'matching_eligible' }));
    await POST(makeReq({ reason: 'Three clean candidates ready' }), { params: { id: 'need-1' } });
    const input = vi.mocked(logAction).mock.calls[0][0].input as Record<string, unknown>;
    expect(input.prior_need_type).toBe('matching_eligible');
  });

  it('does NOT log any contact_sent or SMS-related action', async () => {
    mockApproveChain(makeNeedRow());
    await POST(makeReq({ reason: 'Three clean candidates ready' }), { params: { id: 'need-1' } });
    const actionTypes = vi.mocked(logAction).mock.calls.map(([p]) => p.action_type);
    expect(actionTypes).not.toContain('contact_sent');
    expect(actionTypes).not.toContain('follow_up_sent');
    expect(actionTypes).not.toContain('contact_confirmed');
  });
});

// ─── Race condition guard ─────────────────────────────────────────────────────

describe('POST — atomic guard', () => {
  it('returns 409 when need_type changed between fetch and update (race)', async () => {
    mockFetchNeed(makeNeedRow({ need_type: 'active_public_need' }));
    mockAtomicUpdate(false, makeNeedRow());
    const res = await POST(makeReq({ reason: 'Three clean candidates ready' }), { params: { id: 'need-1' } });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('state_changed');
  });

  it('does not log action when atomic update fails', async () => {
    mockFetchNeed(makeNeedRow({ need_type: 'active_public_need' }));
    mockAtomicUpdate(false, makeNeedRow());
    await POST(makeReq({ reason: 'Three clean candidates ready' }), { params: { id: 'need-1' } });
    expect(vi.mocked(logAction).mock.calls).toHaveLength(0);
  });
});

// ─── Safety: no contact_suggested auto-approval ───────────────────────────────

describe('POST — governance isolation', () => {
  it('does not access system_actions table (contact_suggested unaffected)', async () => {
    mockApproveChain(makeNeedRow());
    await POST(makeReq({ reason: 'Three clean candidates ready' }), { params: { id: 'need-1' } });
    const tablesAccessed = vi.mocked(db.from).mock.calls.map(([t]) => t);
    expect(tablesAccessed).not.toContain('system_actions');
    // Only company_needs is touched
    tablesAccessed.forEach((t) => expect(t).toBe('company_needs'));
  });
});
