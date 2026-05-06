import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('action-id'),
}));

import { runFollowUpAgent } from '../lib/followUpAgent';
import { db } from '../lib/db';
import { logAction } from '../lib/systemActions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDriver(overrides: Partial<{
  id:               string;
  first_name:       string | null;
  phone:            string | null;
  follow_up_reason: string | null;
  follow_up_at:     string | null;
}> = {}) {
  return {
    id:               'driver-1',
    first_name:       'Erik',
    phone:            '+46700000001',
    follow_up_reason: 'incomplete_lead',
    follow_up_at:     '2026-05-03T08:00:00Z',
    ...overrides,
  };
}

// Sets up all DB call chains:
//   1. drivers SELECT (detection query)  → returns `drivers`
//   2. shortlist_entries SELECT (dedup)  → returns `dedupResult`
//   3. drivers UPDATE (auto mode)        → returns no error
function mockDbChain({
  drivers    = [makeDriver()],
  dedupResult = [],
}: {
  drivers?:     ReturnType<typeof makeDriver>[];
  dedupResult?: unknown[];
} = {}) {
  let driversCallCount = 0;

  vi.mocked(db.from).mockImplementation((table: string) => {
    if (table === 'drivers') {
      driversCallCount++;
      if (driversCallCount === 1) {
        return {
          select: () => ({
            lte: () => ({
              eq: () => Promise.resolve({ data: drivers, error: null }),
            }),
          }),
        } as never;
      }
      // UPDATE call (auto mode)
      return {
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      } as never;
    }

    if (table === 'shortlist_entries') {
      return {
        select: () => ({
          eq: () => ({
            neq: () => ({
              gt: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: dedupResult, error: null }),
                }),
              }),
            }),
          }),
        }),
      } as never;
    }

    return {} as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

// ─── Kill switch ──────────────────────────────────────────────────────────────

describe('runFollowUpAgent — kill switch', () => {
  it('returns zero counts immediately when AGENT_FOLLOWUP_ENABLED=false', async () => {
    vi.stubEnv('AGENT_FOLLOWUP_ENABLED', 'false');
    const r = await runFollowUpAgent();
    expect(r).toEqual({ suggested: 0, sent: 0, skipped: 0, errors: 0 });
    expect(vi.mocked(db.from)).not.toHaveBeenCalled();
  });

  it('runs normally when AGENT_FOLLOWUP_ENABLED is not set', async () => {
    mockDbChain({ drivers: [] });
    const r = await runFollowUpAgent();
    expect(r.errors).toBe(0);
  });
});

// ─── Hard filters ─────────────────────────────────────────────────────────────

describe('runFollowUpAgent — hard filters', () => {
  beforeEach(() => { vi.stubEnv('AGENT_FOLLOWUP_MODE', 'suggest'); });

  it('skips drivers with no phone', async () => {
    mockDbChain({ drivers: [makeDriver({ phone: null })] });
    const r = await runFollowUpAgent();
    expect(r.skipped).toBe(1);
    expect(r.suggested).toBe(0);
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });

  it('skips drivers with no first_name', async () => {
    mockDbChain({ drivers: [makeDriver({ first_name: null })] });
    const r = await runFollowUpAgent();
    expect(r.skipped).toBe(1);
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });
});

// ─── Anti-spam dedup ──────────────────────────────────────────────────────────

describe('runFollowUpAgent — anti-spam dedup', () => {
  beforeEach(() => { vi.stubEnv('AGENT_FOLLOWUP_MODE', 'suggest'); });

  it('skips and logs follow_up_skipped when driver was recently contacted', async () => {
    mockDbChain({ dedupResult: [{ contacted_at: '2026-05-04T10:00:00Z' }] });
    const r = await runFollowUpAgent();
    expect(r.skipped).toBe(1);
    const skipLog = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'follow_up_skipped',
    );
    expect(skipLog).toBeDefined();
    expect(skipLog![0].status).toBe('completed');
    expect((skipLog![0].result as Record<string, unknown>).reason).toBe('recently_contacted');
  });

  it('includes last_contacted_at in skip log result', async () => {
    mockDbChain({ dedupResult: [{ contacted_at: '2026-05-04T10:00:00Z' }] });
    await runFollowUpAgent();
    const skipLog = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'follow_up_skipped',
    );
    const res = skipLog![0].result as Record<string, unknown>;
    expect(res.last_contacted_at).toBe('2026-05-04T10:00:00Z');
  });

  it('proceeds when dedup returns empty', async () => {
    mockDbChain({ dedupResult: [] });
    const r = await runFollowUpAgent();
    expect(r.suggested).toBe(1);
    expect(r.skipped).toBe(0);
  });
});

// ─── Mode: suggest ────────────────────────────────────────────────────────────

describe('runFollowUpAgent — mode: suggest', () => {
  beforeEach(() => { vi.stubEnv('AGENT_FOLLOWUP_MODE', 'suggest'); });

  it('logs a pending follow_up_triggered action', async () => {
    mockDbChain();
    await runFollowUpAgent();
    const trigger = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'follow_up_triggered',
    );
    expect(trigger).toBeDefined();
    expect(trigger![0].status).toBe('pending');
    expect(trigger![0].target_id).toBe('driver-1');
  });

  it('includes first_name, phone, follow_up_reason in input', async () => {
    mockDbChain({ drivers: [makeDriver({ follow_up_reason: 'ykb_in_progress' })] });
    await runFollowUpAgent();
    const trigger = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'follow_up_triggered',
    );
    const inp = trigger![0].input as Record<string, unknown>;
    expect(inp.first_name).toBe('Erik');
    expect(inp.phone).toBe('+46700000001');
    expect(inp.follow_up_reason).toBe('ykb_in_progress');
  });

  it('returns suggested=1, sent=0', async () => {
    mockDbChain();
    const r = await runFollowUpAgent();
    expect(r.suggested).toBe(1);
    expect(r.sent).toBe(0);
  });

  it('does NOT update the drivers table', async () => {
    mockDbChain();
    await runFollowUpAgent();
    const updateCall = vi.mocked(db.from).mock.calls
      .map((c) => c[0])
      .filter((t) => t === 'drivers');
    // only one drivers call: the SELECT
    expect(updateCall).toHaveLength(1);
  });
});

// ─── Mode: auto ───────────────────────────────────────────────────────────────

describe('runFollowUpAgent — mode: auto', () => {
  beforeEach(() => { vi.stubEnv('AGENT_FOLLOWUP_MODE', 'auto'); });

  it('updates follow_up_sent=true on the driver', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

    let driversCallCount = 0;
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'drivers') {
        driversCallCount++;
        if (driversCallCount === 1) {
          return {
            select: () => ({
              lte: () => ({
                eq: () => Promise.resolve({ data: [makeDriver()], error: null }),
              }),
            }),
          } as never;
        }
        return { update: updateFn } as never;
      }
      if (table === 'shortlist_entries') {
        return {
          select: () => ({
            eq: () => ({
              neq: () => ({
                gt: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });

    await runFollowUpAgent();
    expect(updateFn).toHaveBeenCalledWith({ follow_up_sent: true });
    expect(updateEq).toHaveBeenCalledWith('id', 'driver-1');
  });

  it('logs a completed follow_up_sent action', async () => {
    mockDbChain();
    await runFollowUpAgent();
    const sent = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'follow_up_sent',
    );
    expect(sent).toBeDefined();
    expect(sent![0].status).toBe('completed');
    expect(sent![0].target_id).toBe('driver-1');
  });

  it('records channel=simulated in result', async () => {
    mockDbChain();
    await runFollowUpAgent();
    const sent = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'follow_up_sent',
    );
    expect((sent![0].result as Record<string, unknown>).channel).toBe('simulated');
  });

  it('returns sent=1, suggested=0', async () => {
    mockDbChain();
    const r = await runFollowUpAgent();
    expect(r.sent).toBe(1);
    expect(r.suggested).toBe(0);
  });

  it('does NOT log a follow_up_triggered action', async () => {
    mockDbChain();
    await runFollowUpAgent();
    const trigger = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'follow_up_triggered',
    );
    expect(trigger).toBeUndefined();
  });
});

// ─── Message templates ────────────────────────────────────────────────────────

describe('runFollowUpAgent — message templates', () => {
  beforeEach(() => { vi.stubEnv('AGENT_FOLLOWUP_MODE', 'auto'); });

  it('sends availability message for not_yet_available', async () => {
    mockDbChain({ drivers: [makeDriver({ follow_up_reason: 'not_yet_available' })] });
    await runFollowUpAgent();
    const sent = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'follow_up_sent',
    );
    const preview = (sent![0].result as Record<string, unknown>).message_preview as string;
    expect(preview).toContain('tillgänglighet');
  });

  it('sends YKB message for ykb_in_progress', async () => {
    mockDbChain({ drivers: [makeDriver({ follow_up_reason: 'ykb_in_progress' })] });
    await runFollowUpAgent();
    const sent = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'follow_up_sent',
    );
    const preview = (sent![0].result as Record<string, unknown>).message_preview as string;
    expect(preview).toContain('YKB');
  });

  it('sends profile message for incomplete_lead', async () => {
    mockDbChain({ drivers: [makeDriver({ follow_up_reason: 'incomplete_lead' })] });
    await runFollowUpAgent();
    const sent = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'follow_up_sent',
    );
    const preview = (sent![0].result as Record<string, unknown>).message_preview as string;
    expect(preview).toContain('information');
  });

  it('sends profile message when follow_up_reason is null', async () => {
    mockDbChain({ drivers: [makeDriver({ follow_up_reason: null })] });
    await runFollowUpAgent();
    const sent = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'follow_up_sent',
    );
    const preview = (sent![0].result as Record<string, unknown>).message_preview as string;
    expect(preview).toContain('information');
  });
});

// ─── Multiple drivers ─────────────────────────────────────────────────────────

describe('runFollowUpAgent — multiple drivers', () => {
  it('processes all drivers independently', async () => {
    vi.stubEnv('AGENT_FOLLOWUP_MODE', 'suggest');
    const drivers = [
      makeDriver({ id: 'd1', phone: '+46700000001' }),
      makeDriver({ id: 'd2', phone: null }),          // skip: no phone
      makeDriver({ id: 'd3', phone: '+46700000003' }),
    ];
    mockDbChain({ drivers });
    const r = await runFollowUpAgent();
    expect(r.suggested).toBe(2);
    expect(r.skipped).toBe(1);
  });
});

// ─── DB fetch error ───────────────────────────────────────────────────────────

describe('runFollowUpAgent — DB errors', () => {
  it('returns errors=1 when drivers fetch fails', async () => {
    vi.mocked(db.from).mockImplementation(() => ({
      select: () => ({
        lte: () => ({
          eq: () => Promise.resolve({ data: null, error: { message: 'connection reset' } }),
        }),
      }),
    } as never));
    const r = await runFollowUpAgent();
    expect(r.errors).toBe(1);
    expect(r.suggested).toBe(0);
  });

  it('counts errors per driver when dedup throws', async () => {
    vi.stubEnv('AGENT_FOLLOWUP_MODE', 'suggest');
    let driversCallCount = 0;
    vi.mocked(db.from).mockImplementation((table: string) => {
      if (table === 'drivers') {
        driversCallCount++;
        if (driversCallCount === 1) {
          return {
            select: () => ({
              lte: () => ({
                eq: () => Promise.resolve({ data: [makeDriver()], error: null }),
              }),
            }),
          } as never;
        }
      }
      if (table === 'shortlist_entries') {
        return {
          select: () => ({
            eq: () => ({
              neq: () => ({
                gt: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: null, error: { message: 'timeout' } }),
                  }),
                }),
              }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });
    const r = await runFollowUpAgent();
    expect(r.errors).toBe(1);
  });
});
