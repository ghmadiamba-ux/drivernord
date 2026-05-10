import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('../lib/recruiterAuth', () => ({
  requireRecruiterAuth: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock('../lib/shortlistStore', () => ({
  updateShortlistEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('action-id'),
}));

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

vi.mock('../lib/messaging', () => ({
  getMessagingProvider: vi.fn(),
}));

import { PATCH } from '../app/api/cockpit/actions/[id]/route';
import { db } from '../lib/db';
import { logAction } from '../lib/systemActions';
import { updateShortlistEntry } from '../lib/shortlistStore';
import { getMessagingProvider } from '../lib/messaging';

// Created per-test in beforeEach so vi.mock factory doesn't reference it at hoist time
let mockSendMessage: ReturnType<typeof vi.fn>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: unknown): NextRequest {
  return {
    headers: new Headers({ 'x-recruiter-key': 'key' }),
    json:    () => Promise.resolve(body),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

function mockSystemActionRow(overrides: Partial<{
  id:          string;
  action_type: string;
  target_id:   string;
  status:      string;
  input:       Record<string, unknown> | null;
}> = {}) {
  return {
    id:          'action-1',
    action_type: 'contact_suggested',
    target_id:   'entry-1',
    status:      'pending',
    input: {
      phone:   '+46700000001',
      message: 'Hej Erik 👋\n\nVi har en match...',
    },
    ...overrides,
  };
}

// Sets up the two system_actions DB calls:
//   1. SELECT ... single() → returns the action row
//   2. UPDATE (set approved) → returns [{ id }] (non-empty = success)
function mockDbChain(row: ReturnType<typeof mockSystemActionRow>) {
  let saCallCount = 0;

  vi.mocked(db.from).mockImplementation((table: string) => {
    if (table === 'system_actions') {
      saCallCount++;
      if (saCallCount === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: row, error: null }),
            }),
          }),
        } as never;
      }
      // Second call: atomic update to 'approved'
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

    if (table === 'drivers') {
      return {
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      } as never;
    }

    return {} as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendMessage = vi.fn().mockResolvedValue({ ok: true, channel: 'simulated' });
  vi.mocked(getMessagingProvider).mockReturnValue({
    channel:     'simulated',
    sendMessage: mockSendMessage,
  });
});

// ─── contact_suggested — approve with message ─────────────────────────────────

describe('approve contact_suggested — sends message', () => {
  it('calls sendMessage with phone and message from action input', async () => {
    const row = mockSystemActionRow({
      input: { phone: '+46700000001', message: 'Hej Erik!' },
    });
    mockDbChain(row);

    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });

    expect(mockSendMessage).toHaveBeenCalledWith({
      to:   '+46700000001',
      body: 'Hej Erik!',
    });
  });

  it('marks shortlist entry as contacted on successful send', async () => {
    mockDbChain(mockSystemActionRow());
    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    expect(vi.mocked(updateShortlistEntry)).toHaveBeenCalledWith(
      'entry-1',
      { contact_status: 'contacted' },
    );
  });

  it('logs contact_confirmed with channel from provider result', async () => {
    mockDbChain(mockSystemActionRow());
    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });

    const confirmed = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'contact_confirmed',
    );
    expect(confirmed).toBeDefined();
    expect(confirmed![0].status).toBe('completed');
    expect(confirmed![0].target_id).toBe('entry-1');
    expect((confirmed![0].result as Record<string, unknown>).channel).toBe('simulated');
  });

  it('returns 200 ok:true on successful send', async () => {
    mockDbChain(mockSystemActionRow());
    const res = await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});

// ─── contact_suggested — failed provider ──────────────────────────────────────

describe('approve contact_suggested — failed provider', () => {
  it('does NOT mark entry as contacted when send fails', async () => {
    mockSendMessage.mockResolvedValue({ ok: false, channel: 'sms', error: 'missing_credentials' });
    mockDbChain(mockSystemActionRow());

    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });

    expect(vi.mocked(updateShortlistEntry)).not.toHaveBeenCalled();
  });

  it('returns 500 when provider send fails', async () => {
    mockSendMessage.mockResolvedValue({ ok: false, channel: 'sms', error: 'network error' });
    mockDbChain(mockSystemActionRow());

    const res = await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    expect(res.status).toBe(500);
  });

  it('does NOT log contact_confirmed when send fails', async () => {
    mockSendMessage.mockResolvedValue({ ok: false, channel: 'sms', error: 'timeout' });
    mockDbChain(mockSystemActionRow());

    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });

    const confirmed = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'contact_confirmed',
    );
    expect(confirmed).toBeUndefined();
  });
});

// ─── contact_suggested — legacy (no message in input) ────────────────────────

describe('approve contact_suggested — legacy input (no message)', () => {
  it('marks entry as contacted without calling sendMessage', async () => {
    mockDbChain(mockSystemActionRow({ input: { phone: '+46700000001' } }));

    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(vi.mocked(updateShortlistEntry)).toHaveBeenCalledWith(
      'entry-1',
      { contact_status: 'contacted' },
    );
  });

  it('marks entry as contacted when input is null', async () => {
    mockDbChain(mockSystemActionRow({ input: null }));

    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(vi.mocked(updateShortlistEntry)).toHaveBeenCalledWith(
      'entry-1',
      { contact_status: 'contacted' },
    );
  });
});

// ─── follow_up_triggered — approve with message ───────────────────────────────

describe('approve follow_up_triggered — sends message', () => {
  it('calls sendMessage with phone and message from action input', async () => {
    const row = mockSystemActionRow({
      action_type: 'follow_up_triggered',
      target_id:   'driver-1',
      input:       { phone: '+46700000001', message: 'Hej Erik! Din YKB...' },
    });
    mockDbChain(row);

    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });

    expect(mockSendMessage).toHaveBeenCalledWith({
      to:   '+46700000001',
      body: 'Hej Erik! Din YKB...',
    });
  });

  it('sets follow_up_sent=true on the driver on successful send', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

    let saCallCount = 0;
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'system_actions') {
        saCallCount++;
        if (saCallCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: mockSystemActionRow({
                    action_type: 'follow_up_triggered',
                    target_id:   'driver-1',
                    input:       { phone: '+46700000001', message: 'Hej Erik!' },
                  }),
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => Promise.resolve({ data: [{ id: 'action-1' }], error: null }),
              }),
            }),
          }),
        } as never;
      }
      if (table === 'drivers') {
        return { update: updateFn } as never;
      }
      return {} as never;
    });

    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });

    expect(updateFn).toHaveBeenCalledWith({ follow_up_sent: true });
    expect(updateEq).toHaveBeenCalledWith('id', 'driver-1');
  });

  it('does NOT set follow_up_sent when send fails', async () => {
    mockSendMessage.mockResolvedValue({ ok: false, channel: 'sms', error: 'network error' });

    const updateFn = vi.fn();
    let saCallCount = 0;
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'system_actions') {
        saCallCount++;
        if (saCallCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: mockSystemActionRow({
                    action_type: 'follow_up_triggered',
                    target_id:   'driver-1',
                    input:       { phone: '+46700000001', message: 'Hej!' },
                  }),
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => Promise.resolve({ data: [{ id: 'action-1' }], error: null }),
              }),
            }),
          }),
        } as never;
      }
      if (table === 'drivers') {
        return { update: updateFn } as never;
      }
      return {} as never;
    });

    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });

    expect(updateFn).not.toHaveBeenCalled();
  });
});

// ─── cancel — not affected ────────────────────────────────────────────────────

describe('cancel action — no send', () => {
  it('does NOT call sendMessage when cancelling', async () => {
    mockDbChain(mockSystemActionRow());

    // For cancel, the DB update is: { status: 'cancelled' } — not 'approved'
    // We need a simpler mock that handles both select and update with just 'cancelled'
    let saCount = 0;
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'system_actions') {
        saCount++;
        if (saCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: mockSystemActionRow(),
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        } as never;
      }
      return {} as never;
    });

    await PATCH(makeReq({ action: 'cancel' }), { params: { id: 'action-1' } });
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});

// ─── getMessagingProvider called with correct context ─────────────────────────

describe('provider selection', () => {
  it('calls getMessagingProvider when approving contact_suggested with message', async () => {
    mockDbChain(mockSystemActionRow());
    await PATCH(makeReq({ action: 'approve' }), { params: { id: 'action-1' } });
    expect(vi.mocked(getMessagingProvider)).toHaveBeenCalled();
  });
});
