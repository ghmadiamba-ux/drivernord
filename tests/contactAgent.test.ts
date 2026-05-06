import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('action-id'),
}));

vi.mock('../lib/shortlistStore', () => ({
  updateShortlistEntry: vi.fn().mockResolvedValue(undefined),
}));

import { runContactAgent } from '../lib/contactAgent';
import { db } from '../lib/db';
import { logAction } from '../lib/systemActions';
import { updateShortlistEntry } from '../lib/shortlistStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<{
  id:              string;
  driver_id:       string;
  match_score:     number;
  contact_status:  string;
  contacted_at:    string | null;
  driver_snapshot: Record<string, unknown>;
}> = {}) {
  return {
    id:             'entry-1',
    driver_id:      'driver-1',
    match_score:    90,
    contact_status: 'new',
    contacted_at:   null,
    driver_snapshot: {
      firstName:       'Erik',
      phone:           '+46700000001',
      region:          'stockholm',
      domain:          'distribution',
      shiftPreference: 'day',
    },
    ...overrides,
  };
}

// Set up the full chain of DB calls:
//   1. shortlists.select        → returns shortlist header
//   2. company_needs.select     → returns need (includes urgency)
//   3. companies.select         → returns company
//   4. shortlist_entries.select → returns entries (main fetch)
//   5. ingested_drivers.select  → returns driver ykb/availability
//   6. shortlist_entries.select → dedup checks (one per driver)
function mockDbChain({
  entries          = [makeEntry()],
  dedupResult      = [] as unknown[],
  companyName      = 'Test AB',
  urgency          = 'standard',
  driverInfoRows,
}: {
  entries?:       ReturnType<typeof makeEntry>[];
  dedupResult?:   unknown[];
  companyName?:   string;
  urgency?:       string;
  driverInfoRows?: { id: string; ykb: string; availability: string }[];
} = {}) {
  const resolvedDriverInfoRows = driverInfoRows ??
    entries.map(e => ({ id: e.driver_id, ykb: 'valid', availability: 'now' }));

  let seCallCount = 0;  // shortlist_entries call counter

  vi.mocked(db.from).mockImplementation((table: string) => {
    if (table === 'shortlists') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data:  { company_need_id: 'need-1' },
              error: null,
            }),
          }),
        }),
      } as never;
    }

    if (table === 'company_needs') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                company_id:      'co-1',
                location_region: 'stockholm',
                domain_required: 'distribution',
                shift_type:      'day',
                urgency,
              },
              error: null,
            }),
          }),
        }),
      } as never;
    }

    if (table === 'companies') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data:  { name: companyName },
              error: null,
            }),
          }),
        }),
      } as never;
    }

    if (table === 'ingested_drivers') {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: resolvedDriverInfoRows, error: null }),
        }),
      } as never;
    }

    if (table === 'shortlist_entries') {
      seCallCount++;
      if (seCallCount === 1) {
        // main entries fetch
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: entries, error: null }),
          }),
        } as never;
      }
      // dedup checks
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

describe('runContactAgent — kill switch', () => {
  it('returns zero counts immediately when AGENT_CONTACT_ENABLED=false', async () => {
    vi.stubEnv('AGENT_CONTACT_ENABLED', 'false');
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r).toEqual({ suggested: 0, contacted: 0, skipped: 0, errors: 0 });
    expect(vi.mocked(db.from)).not.toHaveBeenCalled();
  });

  it('runs normally when AGENT_CONTACT_ENABLED is not set', async () => {
    mockDbChain({ entries: [] });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.errors).toBe(0);
  });
});

// ─── Hard filters ─────────────────────────────────────────────────────────────

describe('runContactAgent — hard filters', () => {
  it('skips entries with score below 60', async () => {
    mockDbChain({ entries: [makeEntry({ match_score: 59 })] });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.skipped).toBe(1);
    expect(r.suggested).toBe(0);
    expect(r.contacted).toBe(0);
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });

  it('skips entries with score exactly 60 when phone is missing', async () => {
    mockDbChain({
      entries: [makeEntry({ match_score: 60, driver_snapshot: { firstName: 'Erik', phone: null, region: 'stockholm', domain: 'distribution', shiftPreference: 'day' } })],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.skipped).toBe(1);
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });

  it('skips entries where firstName is null', async () => {
    mockDbChain({
      entries: [makeEntry({ driver_snapshot: { firstName: null, phone: '+46700000001', region: 'stockholm', domain: 'distribution', shiftPreference: 'day' } })],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.skipped).toBe(1);
  });

  it('skips entries that are already contacted on this shortlist', async () => {
    mockDbChain({ entries: [makeEntry({ contact_status: 'contacted' })] });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.skipped).toBe(1);
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });

  it('skips entries with contact_status=interested on this shortlist', async () => {
    mockDbChain({ entries: [makeEntry({ contact_status: 'interested' })] });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.skipped).toBe(1);
  });
});

// ─── YKB guard ────────────────────────────────────────────────────────────────

describe('runContactAgent — YKB guard', () => {
  it('skips driver with ykb=in_progress and logs contact_skipped reason=ykb_in_progress', async () => {
    mockDbChain({
      driverInfoRows: [{ id: 'driver-1', ykb: 'in_progress', availability: 'now' }],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.skipped).toBe(1);
    expect(r.contacted).toBe(0);
    expect(r.suggested).toBe(0);
    const skipLog = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'contact_skipped',
    );
    expect(skipLog).toBeDefined();
    expect(skipLog![0].status).toBe('completed');
    expect((skipLog![0].result as Record<string, unknown>).reason).toBe('ykb_in_progress');
  });

  it('includes urgency, company_need_id, shortlist_id in the YKB skip input', async () => {
    mockDbChain({
      urgency:        'urgent',
      driverInfoRows: [{ id: 'driver-1', ykb: 'in_progress', availability: 'now' }],
    });
    await runContactAgent({ shortlistId: 'sl-1' });
    const skipLog = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_skipped');
    const inp = skipLog![0].input as Record<string, unknown>;
    expect(inp.urgency).toBe('urgent');
    expect(inp.company_need_id).toBe('need-1');
    expect(inp.shortlist_id).toBe('sl-1');
  });

  it('does NOT skip driver with ykb=valid', async () => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'auto');
    mockDbChain({
      driverInfoRows: [{ id: 'driver-1', ykb: 'valid', availability: 'now' }],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.contacted).toBe(1);
    expect(r.skipped).toBe(0);
  });

  it('does NOT skip driver when ykb is null (defensive fallback)', async () => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'suggest');
    mockDbChain({
      driverInfoRows: [{ id: 'driver-1', ykb: null as unknown as string, availability: 'now' }],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.suggested).toBe(1);
  });
});

// ─── Availability guard ───────────────────────────────────────────────────────

describe('runContactAgent — availability guard', () => {
  it('skips driver with availability=not_yet and logs contact_skipped reason=not_available_yet', async () => {
    mockDbChain({
      driverInfoRows: [{ id: 'driver-1', ykb: 'valid', availability: 'not_yet' }],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.skipped).toBe(1);
    expect(r.contacted).toBe(0);
    expect(r.suggested).toBe(0);
    const skipLog = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'contact_skipped',
    );
    expect(skipLog).toBeDefined();
    expect(skipLog![0].status).toBe('completed');
    expect((skipLog![0].result as Record<string, unknown>).reason).toBe('not_available_yet');
  });

  it('includes urgency, company_need_id, shortlist_id in the availability skip input', async () => {
    mockDbChain({
      urgency:        'emergency',
      driverInfoRows: [{ id: 'driver-1', ykb: 'valid', availability: 'not_yet' }],
    });
    await runContactAgent({ shortlistId: 'sl-1' });
    const skipLog = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_skipped');
    const inp = skipLog![0].input as Record<string, unknown>;
    expect(inp.urgency).toBe('emergency');
    expect(inp.company_need_id).toBe('need-1');
    expect(inp.shortlist_id).toBe('sl-1');
  });

  it('does NOT skip driver with availability=now', async () => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'auto');
    mockDbChain({
      driverInfoRows: [{ id: 'driver-1', ykb: 'valid', availability: 'now' }],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.contacted).toBe(1);
    expect(r.skipped).toBe(0);
  });

  it('does NOT skip driver with availability=2_weeks', async () => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'suggest');
    mockDbChain({
      driverInfoRows: [{ id: 'driver-1', ykb: 'valid', availability: '2_weeks' }],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.suggested).toBe(1);
  });

  it('does NOT skip driver with availability=1_month', async () => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'suggest');
    mockDbChain({
      driverInfoRows: [{ id: 'driver-1', ykb: 'valid', availability: '1_month' }],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.suggested).toBe(1);
  });

  it('YKB guard fires before availability guard (ykb=in_progress wins)', async () => {
    mockDbChain({
      driverInfoRows: [{ id: 'driver-1', ykb: 'in_progress', availability: 'not_yet' }],
    });
    await runContactAgent({ shortlistId: 'sl-1' });
    const skipLog = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_skipped');
    expect((skipLog![0].result as Record<string, unknown>).reason).toBe('ykb_in_progress');
  });
});

// ─── Anti-spam dedup ──────────────────────────────────────────────────────────

describe('runContactAgent — anti-spam dedup', () => {
  it('skips and logs contact_skipped when driver was recently contacted', async () => {
    mockDbChain({
      dedupResult: [{ contacted_at: '2026-05-03T10:00:00Z', shortlist_id: 'sl-old' }],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.skipped).toBe(1);
    const skipLog = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'contact_skipped',
    );
    expect(skipLog).toBeDefined();
    expect(skipLog![0].status).toBe('completed');
    expect((skipLog![0].result as Record<string, unknown>).reason).toBe('recently_contacted');
  });

  it('includes last_contacted_at and last_contact_shortlist_id in the skip log', async () => {
    mockDbChain({
      dedupResult: [{ contacted_at: '2026-05-03T10:00:00Z', shortlist_id: 'sl-old' }],
    });
    await runContactAgent({ shortlistId: 'sl-1' });
    const skipLog = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_skipped');
    const res = skipLog![0].result as Record<string, unknown>;
    expect(res.last_contacted_at).toBe('2026-05-03T10:00:00Z');
    expect(res.last_contact_shortlist_id).toBe('sl-old');
  });

  it('proceeds when dedup check returns empty', async () => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'suggest');
    mockDbChain({ dedupResult: [] });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.suggested).toBe(1);
    expect(r.skipped).toBe(0);
  });

  it('records dedup_window_days=14 for standard need skip', async () => {
    mockDbChain({
      urgency:     'standard',
      dedupResult: [{ contacted_at: '2026-05-03T10:00:00Z', shortlist_id: 'sl-old' }],
    });
    await runContactAgent({ shortlistId: 'sl-1' });
    const skipLog = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_skipped');
    expect((skipLog![0].result as Record<string, unknown>).dedup_window_days).toBe(14);
  });
});

// ─── Emergency urgency dedup override ────────────────────────────────────────

describe('runContactAgent — emergency urgency dedup window', () => {
  it('records dedup_window_days=3 for emergency need skip', async () => {
    mockDbChain({
      urgency:     'emergency',
      dedupResult: [{ contacted_at: '2026-05-04T10:00:00Z', shortlist_id: 'sl-old' }],
    });
    await runContactAgent({ shortlistId: 'sl-1' });
    const skipLog = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_skipped');
    const res = skipLog![0].result as Record<string, unknown>;
    expect(res.reason).toBe('recently_contacted');
    expect(res.dedup_window_days).toBe(3);
  });

  it('contacts driver for emergency when dedup returns empty (dedup not bypassed)', async () => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'auto');
    mockDbChain({ urgency: 'emergency', dedupResult: [] });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.contacted).toBe(1);
    expect(r.skipped).toBe(0);
  });

  it('still skips for emergency when driver was contacted within 3-day window', async () => {
    mockDbChain({
      urgency:     'emergency',
      dedupResult: [{ contacted_at: '2026-05-05T10:00:00Z', shortlist_id: 'sl-old' }],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.skipped).toBe(1);
  });

  it('includes urgency in contact_sent input', async () => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'auto');
    mockDbChain({ urgency: 'emergency' });
    await runContactAgent({ shortlistId: 'sl-1' });
    const sent = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_sent');
    const inp = sent![0].input as Record<string, unknown>;
    expect(inp.urgency).toBe('emergency');
    expect(inp.company_need_id).toBe('need-1');
    expect(inp.shortlist_id).toBe('sl-1');
  });

  it('includes urgency in contact_suggested input', async () => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'suggest');
    mockDbChain({ urgency: 'urgent' });
    await runContactAgent({ shortlistId: 'sl-1' });
    const suggestion = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_suggested');
    const inp = suggestion![0].input as Record<string, unknown>;
    expect(inp.urgency).toBe('urgent');
    expect(inp.company_need_id).toBe('need-1');
    expect(inp.shortlist_id).toBe('sl-1');
  });
});

// ─── Mode: suggest ────────────────────────────────────────────────────────────

describe('runContactAgent — mode: suggest', () => {
  beforeEach(() => { vi.stubEnv('AGENT_CONTACT_MODE', 'suggest'); });

  it('creates a pending contact_suggested action', async () => {
    mockDbChain();
    await runContactAgent({ shortlistId: 'sl-1' });
    const suggestion = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'contact_suggested',
    );
    expect(suggestion).toBeDefined();
    expect(suggestion![0].status).toBe('pending');
  });

  it('does NOT call updateShortlistEntry', async () => {
    mockDbChain();
    await runContactAgent({ shortlistId: 'sl-1' });
    expect(vi.mocked(updateShortlistEntry)).not.toHaveBeenCalled();
  });

  it('returns suggested=1', async () => {
    mockDbChain();
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.suggested).toBe(1);
    expect(r.contacted).toBe(0);
  });

  it('includes driver_id, match_score, first_name, phone, company_name in input', async () => {
    mockDbChain({ companyName: 'Scania AB' });
    await runContactAgent({ shortlistId: 'sl-1' });
    const suggestion = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_suggested');
    const inp = suggestion![0].input as Record<string, unknown>;
    expect(inp.driver_id).toBe('driver-1');
    expect(inp.match_score).toBe(90);
    expect(inp.first_name).toBe('Erik');
    expect(inp.phone).toBe('+46700000001');
    expect(inp.company_name).toBe('Scania AB');
  });
});

// ─── Mode: auto ───────────────────────────────────────────────────────────────

describe('runContactAgent — mode: auto', () => {
  beforeEach(() => { vi.stubEnv('AGENT_CONTACT_MODE', 'auto'); });

  it('updates shortlist entry to contacted', async () => {
    mockDbChain();
    await runContactAgent({ shortlistId: 'sl-1' });
    expect(vi.mocked(updateShortlistEntry)).toHaveBeenCalledWith('entry-1', { contact_status: 'contacted' });
  });

  it('logs a completed contact_sent action', async () => {
    mockDbChain();
    await runContactAgent({ shortlistId: 'sl-1' });
    const sent = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_sent');
    expect(sent).toBeDefined();
    expect(sent![0].status).toBe('completed');
    expect(sent![0].target_id).toBe('driver-1');
  });

  it('records channel=simulated in the result', async () => {
    mockDbChain();
    await runContactAgent({ shortlistId: 'sl-1' });
    const sent = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_sent');
    expect((sent![0].result as Record<string, unknown>).channel).toBe('simulated');
  });

  it('returns contacted=1, suggested=0', async () => {
    mockDbChain();
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.contacted).toBe(1);
    expect(r.suggested).toBe(0);
  });

  it('does NOT create a contact_suggested action', async () => {
    mockDbChain();
    await runContactAgent({ shortlistId: 'sl-1' });
    const suggestion = vi.mocked(logAction).mock.calls.find(([p]) => p.action_type === 'contact_suggested');
    expect(suggestion).toBeUndefined();
  });
});

// ─── Mode: hybrid ─────────────────────────────────────────────────────────────

describe('runContactAgent — mode: hybrid', () => {
  beforeEach(() => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'hybrid');
    vi.stubEnv('AUTO_CONTACT_THRESHOLD', '85');
  });

  it('auto-contacts when score >= threshold', async () => {
    mockDbChain({ entries: [makeEntry({ match_score: 90 })] });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.contacted).toBe(1);
    expect(r.suggested).toBe(0);
    expect(vi.mocked(updateShortlistEntry)).toHaveBeenCalled();
  });

  it('suggests when score < threshold', async () => {
    mockDbChain({ entries: [makeEntry({ match_score: 70 })] });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.suggested).toBe(1);
    expect(r.contacted).toBe(0);
    expect(vi.mocked(updateShortlistEntry)).not.toHaveBeenCalled();
  });

  it('auto-contacts at exactly the threshold', async () => {
    mockDbChain({ entries: [makeEntry({ match_score: 85 })] });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.contacted).toBe(1);
  });

  it('suggests at one below threshold', async () => {
    mockDbChain({ entries: [makeEntry({ match_score: 84 })] });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.suggested).toBe(1);
  });
});

// ─── Multiple entries ─────────────────────────────────────────────────────────

describe('runContactAgent — multiple entries', () => {
  it('processes all entries independently', async () => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'suggest');
    const entries = [
      makeEntry({ id: 'e1', driver_id: 'd1', match_score: 95 }),
      makeEntry({ id: 'e2', driver_id: 'd2', match_score: 55 }),  // below threshold
      makeEntry({ id: 'e3', driver_id: 'd3', match_score: 70 }),
    ];
    mockDbChain({ entries });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.suggested).toBe(2);
    expect(r.skipped).toBe(1);
  });

  it('skips ykb=in_progress drivers independently without affecting others', async () => {
    vi.stubEnv('AGENT_CONTACT_MODE', 'auto');
    const entries = [
      makeEntry({ id: 'e1', driver_id: 'd1', match_score: 90 }),
      makeEntry({ id: 'e2', driver_id: 'd2', match_score: 80 }),
    ];
    mockDbChain({
      entries,
      driverInfoRows: [
        { id: 'd1', ykb: 'in_progress', availability: 'now' },
        { id: 'd2', ykb: 'valid',       availability: 'now' },
      ],
    });
    const r = await runContactAgent({ shortlistId: 'sl-1' });
    expect(r.skipped).toBe(1);
    expect(r.contacted).toBe(1);
  });
});

// ─── Company context failure ──────────────────────────────────────────────────

describe('runContactAgent — company context errors', () => {
  it('returns errors=1 when shortlist header is not found', async () => {
    vi.mocked(db.from).mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
        }),
      }),
    } as never));
    const r = await runContactAgent({ shortlistId: 'missing' });
    expect(r.errors).toBe(1);
    expect(r.suggested).toBe(0);
  });
});
