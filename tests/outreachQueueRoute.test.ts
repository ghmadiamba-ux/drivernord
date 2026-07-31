import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/recruiterAuth', () => ({
  requireRecruiterAuth: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

// Zoho client must NEVER be called from this route — mock it to detect accidental calls
vi.mock('../lib/zohoMailClient', () => ({
  sendEmailViaZoho: vi.fn().mockRejectedValue(new Error('sendEmailViaZoho must not be called from outreach-queue route')),
  isZohoConfigured: vi.fn().mockReturnValue(false),
  readInboxReplies: vi.fn().mockRejectedValue(new Error('readInboxReplies must not be called from outreach-queue route')),
}));

import { GET, PATCH } from '../app/api/admin/outreach-queue/route';
import { db } from '../lib/db';
import { requireRecruiterAuth } from '../lib/recruiterAuth';
import { sendEmailViaZoho } from '../lib/zohoMailClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body?: unknown): NextRequest {
  return {
    headers: new Headers({ 'x-recruiter-key': 'test-key' }),
    json:    () => Promise.resolve(body),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

function makeQueueRow(overrides: Partial<{
  id:                    string;
  company_name_snapshot: string;
  recipient_email:       string;
  recipient_name:        string | null;
  subject:               string;
  body:                  string;
  readiness_category:    string;
  status:                string;
  send_mode:             string;
  approved_by_founder:   boolean;
  automation_used:       boolean;
  risk_notes:            string | null;
  scheduled_send_at:     string | null;
}> = {}) {
  return {
    id:                    overrides.id                    ?? 'row-1',
    company_name_snapshot: overrides.company_name_snapshot ?? 'Test Åkeri AB',
    recipient_email:       overrides.recipient_email       ?? 'test@testakeri.se',
    recipient_name:        overrides.recipient_name        ?? 'Lars',
    subject:               overrides.subject               ?? 'CE-chaufförer för distribution',
    body:                  overrides.body                  ?? 'Hej Lars,\n\nVi har uppmärksammat...\n\nMed vänliga hälsningar,\nGhislain Alexander Mad',
    readiness_category:    overrides.readiness_category    ?? 'READY',
    status:                overrides.status                ?? 'draft',
    send_mode:             overrides.send_mode             ?? 'dry_run',
    approved_by_founder:   overrides.approved_by_founder   ?? false,
    automation_used:       overrides.automation_used       ?? false,
    risk_notes:            overrides.risk_notes            ?? null,
    scheduled_send_at:     overrides.scheduled_send_at     ?? '2026-05-27T06:30:00+00:00',
    provider:              'zoho',
    provider_message_id:   null,
    sent_at:               null,
    reply_detected_at:     null,
    reply_classification:  null,
    created_by_agent:      true,
    created_at:            '2026-05-26T00:00:00Z',
    updated_at:            '2026-05-26T00:00:00Z',
  };
}

function mockGetSuccess(rows: ReturnType<typeof makeQueueRow>[]) {
  vi.mocked(db.from).mockReturnValueOnce({
    select: () => ({
      order:  () => ({
        limit: () => Promise.resolve({ data: rows, error: null }),
      }),
    }),
  } as never);
}

function mockGetError(message: string) {
  vi.mocked(db.from).mockReturnValueOnce({
    select: () => ({
      order: () => ({
        limit: () => Promise.resolve({ data: null, error: { message } }),
      }),
    }),
  } as never);
}

function mockPatchSuccess() {
  vi.mocked(db.from).mockReturnValueOnce({
    update: () => ({
      eq: () => ({
        in: () => Promise.resolve({ error: null }),
      }),
    }),
  } as never);
}

function mockPatchError(message: string) {
  vi.mocked(db.from).mockReturnValueOnce({
    update: () => ({
      eq: () => ({
        in: () => Promise.resolve({ error: { message } }),
      }),
    }),
  } as never);
}

beforeEach(() => vi.clearAllMocks());

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/outreach-queue — auth', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({
      ok: false, status: 401, body: { error: 'unauthorized' },
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/admin/outreach-queue — auth', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({
      ok: false, status: 401, body: { error: 'unauthorized' },
    });
    const res = await PATCH(makeReq({ id: 'row-1', action: 'approve' }));
    expect(res.status).toBe(401);
  });
});

// ─── GET — field presence ──────────────────────────────────────────────────────

describe('GET — response shape', () => {
  it('returns items array with migration_required = false on success', async () => {
    mockGetSuccess([makeQueueRow()]);
    const res  = await GET(makeReq());
    const body = await res.json() as { items: unknown[]; migration_required: boolean };
    expect(res.status).toBe(200);
    expect(body.migration_required).toBe(false);
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('includes body field in each returned row', async () => {
    const emailBody = 'Hej Lars,\n\nVi har uppmärksammat...\n\nGhislain Alexander Mad';
    mockGetSuccess([makeQueueRow({ body: emailBody })]);
    const res  = await GET(makeReq());
    const body = await res.json() as { items: Array<Record<string, unknown>> };
    expect(body.items[0]).toHaveProperty('body', emailBody);
  });

  it('includes subject, recipient_email, readiness_category, send_mode in each row', async () => {
    mockGetSuccess([makeQueueRow()]);
    const res  = await GET(makeReq());
    const data = await res.json() as { items: Array<Record<string, unknown>> };
    const row  = data.items[0];
    expect(row).toHaveProperty('subject');
    expect(row).toHaveProperty('recipient_email');
    expect(row).toHaveProperty('readiness_category');
    expect(row).toHaveProperty('send_mode');
  });

  it('includes approved_by_founder and automation_used flags', async () => {
    mockGetSuccess([makeQueueRow({ approved_by_founder: false, automation_used: false })]);
    const res  = await GET(makeReq());
    const data = await res.json() as { items: Array<Record<string, unknown>> };
    expect(data.items[0]).toHaveProperty('approved_by_founder', false);
    expect(data.items[0]).toHaveProperty('automation_used', false);
  });

  it('includes scheduled_send_at in returned rows', async () => {
    mockGetSuccess([makeQueueRow({ scheduled_send_at: '2026-05-27T06:30:00+00:00' })]);
    const res  = await GET(makeReq());
    const data = await res.json() as { items: Array<Record<string, unknown>> };
    expect(data.items[0]).toHaveProperty('scheduled_send_at', '2026-05-27T06:30:00+00:00');
  });

  it('returns empty items array when no rows exist', async () => {
    mockGetSuccess([]);
    const res  = await GET(makeReq());
    const body = await res.json() as { items: unknown[] };
    expect(body.items).toHaveLength(0);
  });

  it('returns migration_required = true when table does not exist', async () => {
    mockGetError('relation "outreach_email_queue" does not exist');
    const res  = await GET(makeReq());
    const body = await res.json() as { items: unknown[]; migration_required: boolean };
    expect(res.status).toBe(200);
    expect(body.migration_required).toBe(true);
    expect(body.items).toHaveLength(0);
  });

  it('returns 500 for generic DB errors', async () => {
    mockGetError('connection refused');
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });
});

// ─── GET — does NOT call Zoho ─────────────────────────────────────────────────

describe('GET — Zoho never called', () => {
  it('does not call sendEmailViaZoho', async () => {
    mockGetSuccess([makeQueueRow()]);
    await GET(makeReq());
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });
});

// ─── PATCH — approve action ───────────────────────────────────────────────────

describe('PATCH — approve action', () => {
  it('returns 400 when id is missing', async () => {
    const res = await PATCH(makeReq({ action: 'approve' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when action is not approve', async () => {
    const res = await PATCH(makeReq({ id: 'row-1', action: 'send' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is empty', async () => {
    const res = await PATCH(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 200 ok:true on successful approval', async () => {
    mockPatchSuccess();
    const res  = await PATCH(makeReq({ id: 'row-1', action: 'approve' }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('only approves draft items — .in("status", ["draft"]) filter applied', async () => {
    let capturedInArgs: unknown;
    vi.mocked(db.from).mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          in: (field: string, values: unknown) => {
            capturedInArgs = { field, values };
            return Promise.resolve({ error: null });
          },
        }),
      }),
    } as never);
    await PATCH(makeReq({ id: 'row-1', action: 'approve' }));
    expect(capturedInArgs).toEqual({ field: 'status', values: ['draft'] });
  });

  it('sets approved_by_founder = true in the update', async () => {
    let capturedUpdate: unknown;
    vi.mocked(db.from).mockReturnValueOnce({
      update: (payload: unknown) => {
        capturedUpdate = payload;
        return {
          eq: () => ({
            in: () => Promise.resolve({ error: null }),
          }),
        };
      },
    } as never);
    await PATCH(makeReq({ id: 'row-1', action: 'approve' }));
    expect((capturedUpdate as Record<string, unknown>).approved_by_founder).toBe(true);
  });

  it('sets status = approved in the update', async () => {
    let capturedUpdate: unknown;
    vi.mocked(db.from).mockReturnValueOnce({
      update: (payload: unknown) => {
        capturedUpdate = payload;
        return {
          eq: () => ({
            in: () => Promise.resolve({ error: null }),
          }),
        };
      },
    } as never);
    await PATCH(makeReq({ id: 'row-1', action: 'approve' }));
    expect((capturedUpdate as Record<string, unknown>).status).toBe('approved');
  });

  it('does NOT set send_mode in the update (preserves dry_run)', async () => {
    let capturedUpdate: unknown;
    vi.mocked(db.from).mockReturnValueOnce({
      update: (payload: unknown) => {
        capturedUpdate = payload;
        return {
          eq: () => ({
            in: () => Promise.resolve({ error: null }),
          }),
        };
      },
    } as never);
    await PATCH(makeReq({ id: 'row-1', action: 'approve' }));
    expect((capturedUpdate as Record<string, unknown>)).not.toHaveProperty('send_mode');
  });

  it('does NOT set automation_used = true in the update', async () => {
    let capturedUpdate: unknown;
    vi.mocked(db.from).mockReturnValueOnce({
      update: (payload: unknown) => {
        capturedUpdate = payload;
        return {
          eq: () => ({
            in: () => Promise.resolve({ error: null }),
          }),
        };
      },
    } as never);
    await PATCH(makeReq({ id: 'row-1', action: 'approve' }));
    expect((capturedUpdate as Record<string, unknown>)).not.toHaveProperty('automation_used');
  });

  it('returns 500 on DB error', async () => {
    mockPatchError('update failed');
    const res = await PATCH(makeReq({ id: 'row-1', action: 'approve' }));
    expect(res.status).toBe(500);
  });
});

// ─── PATCH — does NOT call Zoho ───────────────────────────────────────────────

describe('PATCH — Zoho never called during approval', () => {
  it('does not call sendEmailViaZoho on approve', async () => {
    mockPatchSuccess();
    await PATCH(makeReq({ id: 'row-1', action: 'approve' }));
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });

  it('does not call sendEmailViaZoho even on DB error', async () => {
    mockPatchError('db error');
    await PATCH(makeReq({ id: 'row-1', action: 'approve' }));
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });
});

// ─── PATCH — dry_run rows remain dry_run after approval ──────────────────────

describe('PATCH — send_mode invariant', () => {
  it('does not alter send_mode regardless of input', async () => {
    const updatesApplied: Record<string, unknown>[] = [];
    vi.mocked(db.from).mockReturnValue({
      update: (payload: unknown) => {
        updatesApplied.push(payload as Record<string, unknown>);
        return {
          eq: () => ({
            in: () => Promise.resolve({ error: null }),
          }),
        };
      },
    } as never);

    await PATCH(makeReq({ id: 'row-1', action: 'approve' }));

    for (const update of updatesApplied) {
      expect(update).not.toHaveProperty('send_mode');
    }
  });
});
