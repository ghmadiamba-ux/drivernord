import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/founderNotifier', () => ({
  notifyFounderWhatsApp: vi.fn(),
  isFounderWhatsAppEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('action-id'),
}));

// Supabase chain mock — hasAlreadySent queries system_actions
// Default: count = 0 (not yet sent). Tests override mockCountResult to change behaviour.
let mockCountResult: { count: number | null; error: string | null } = { count: 0, error: null };

function makeDbChain() {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'not', 'gte', 'lte', 'order', 'filter', 'limit', 'single']) {
    chain[m] = vi.fn(() => chain);
  }
  chain['then'] = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(mockCountResult).then(resolve, reject);
  chain['catch'] = (reject: (e: unknown) => unknown) =>
    Promise.resolve(mockCountResult).catch(reject);
  return chain;
}

vi.mock('../lib/db', () => ({
  db: { from: vi.fn(() => makeDbChain()) },
}));

import { GET, POST } from '../app/api/cron/logistikklubb-daily-notify/route';
import { notifyFounderWhatsApp, isFounderWhatsAppEnabled } from '../lib/founderNotifier';
import { logAction } from '../lib/systemActions';

// ─── Constants ────────────────────────────────────────────────────────────────

const SENT_RESULT     = { sent: true,  dry_run: false, error: null,              message_id: 'wamid.abc123' };
const DRY_RUN_RESULT  = { sent: false, dry_run: true,  error: 'dry_run',         message_id: null };
const FAILED_RESULT   = { sent: false, dry_run: false, error: 'Meta API HTTP 400', message_id: null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGet(headers: Record<string, string> = {}): NextRequest {
  return {
    headers:  new Headers(headers),
    json:     () => Promise.reject(new Error('no body on GET')),
    cookies:  { get: () => undefined },
    method:   'GET',
  } as unknown as NextRequest;
}

function makePost(body: Record<string, unknown> = {}, headers: Record<string, string> = {}): NextRequest {
  return {
    headers:  new Headers(headers),
    json:     () => Promise.resolve(body),
    cookies:  { get: () => undefined },
    method:   'POST',
  } as unknown as NextRequest;
}

function withCronKey(headers: Record<string, string> = {}): Record<string, string> {
  return { ...headers, authorization: 'Bearer test-cron-secret' };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockCountResult = { count: 0, error: null };
  process.env.CRON_SECRET = 'test-cron-secret';
  vi.mocked(notifyFounderWhatsApp).mockResolvedValue(SENT_RESULT);
  vi.mocked(isFounderWhatsAppEnabled).mockReturnValue(true);
  vi.mocked(logAction).mockResolvedValue('action-id');
  // Set a deterministic UTC hour in morning range (05:00 UTC)
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-22T05:30:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.CRON_SECRET;
});

// ─── Auth gate ────────────────────────────────────────────────────────────────

describe('GET — auth gate', () => {
  it('returns 401 when Authorization header is wrong', async () => {
    const res = await GET(makeGet({ authorization: 'Bearer wrong' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it('allows request when CRON_SECRET is not set (dev mode)', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
  });

  it('allows request with correct CRON_SECRET', async () => {
    const res = await GET(makeGet(withCronKey()));
    expect(res.status).toBe(200);
  });
});

describe('POST — auth gate', () => {
  it('returns 401 when Authorization header is wrong', async () => {
    const res = await POST(makePost({}, { authorization: 'Bearer wrong' }));
    expect(res.status).toBe(401);
  });
});

// ─── Slot detection ───────────────────────────────────────────────────────────

describe('GET — slot detection from UTC hour', () => {
  it('uses morning slot at 05:30 UTC', async () => {
    vi.setSystemTime(new Date('2026-06-22T05:30:00Z'));
    const res = await GET(makeGet(withCronKey()));
    const body = await res.json() as { slot: string };
    expect(body.slot).toBe('morning');
  });

  it('uses evening slot at 17:30 UTC', async () => {
    vi.setSystemTime(new Date('2026-06-22T17:30:00Z'));
    const res = await GET(makeGet(withCronKey()));
    const body = await res.json() as { slot: string };
    expect(body.slot).toBe('evening');
  });

  it('morning boundary: 11:59 UTC is still morning', async () => {
    vi.setSystemTime(new Date('2026-06-22T11:59:00Z'));
    const res = await GET(makeGet(withCronKey()));
    const body = await res.json() as { slot: string };
    expect(body.slot).toBe('morning');
  });

  it('evening boundary: 12:00 UTC switches to evening', async () => {
    vi.setSystemTime(new Date('2026-06-22T12:00:00Z'));
    const res = await GET(makeGet(withCronKey()));
    const body = await res.json() as { slot: string };
    expect(body.slot).toBe('evening');
  });
});

// ─── POST slot override ───────────────────────────────────────────────────────

// ─── POST confirm gate ────────────────────────────────────────────────────────

describe('POST — confirm gate', () => {
  it('returns 400 when body is empty (no confirm field)', async () => {
    const res = await POST(makePost({}, withCronKey()));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/confirm/i);
  });

  it('returns 400 when confirm is false', async () => {
    const res = await POST(makePost({ confirm: false }, withCronKey()));
    expect(res.status).toBe(400);
  });

  it('returns 200 when confirm is true (no slot override)', async () => {
    const res = await POST(makePost({ confirm: true }, withCronKey()));
    expect(res.status).toBe(200);
  });
});

// ─── POST slot override ───────────────────────────────────────────────────────

describe('POST — slot override', () => {
  it('uses morning slot when body contains { slot: "morning" }', async () => {
    vi.setSystemTime(new Date('2026-06-22T17:30:00Z')); // Would be evening automatically
    const res = await POST(makePost({ confirm: true, slot: 'morning' }, withCronKey()));
    const body = await res.json() as { slot: string };
    expect(body.slot).toBe('morning');
  });

  it('uses evening slot when body contains { slot: "evening" }', async () => {
    vi.setSystemTime(new Date('2026-06-22T05:30:00Z')); // Would be morning automatically
    const res = await POST(makePost({ confirm: true, slot: 'evening' }, withCronKey()));
    const body = await res.json() as { slot: string };
    expect(body.slot).toBe('evening');
  });

  it('ignores unknown slot values and falls back to UTC-hour detection', async () => {
    vi.setSystemTime(new Date('2026-06-22T05:30:00Z')); // Morning UTC
    const res = await POST(makePost({ confirm: true, slot: 'midnight' }, withCronKey()));
    const body = await res.json() as { slot: string };
    expect(body.slot).toBe('morning');
  });
});

// ─── Sent result ──────────────────────────────────────────────────────────────

describe('GET — successful send', () => {
  it('returns ok: true with message_id when WhatsApp sends', async () => {
    const res  = await GET(makeGet(withCronKey()));
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(true);
    expect(body.dry_run).toBe(false);
    expect(body.message_id).toBe('wamid.abc123');
  });

  it('includes slot and date in response', async () => {
    const body = await (await GET(makeGet(withCronKey()))).json() as Record<string, unknown>;
    expect(body.slot).toBe('morning');
    expect(body.date).toBe('2026-06-22');
  });

  it('includes title in response', async () => {
    const body = await (await GET(makeGet(withCronKey()))).json() as Record<string, unknown>;
    expect(typeof body.title).toBe('string');
    expect((body.title as string).length).toBeGreaterThan(0);
  });

  it('calls notifyFounderWhatsApp exactly once', async () => {
    await GET(makeGet(withCronKey()));
    expect(vi.mocked(notifyFounderWhatsApp)).toHaveBeenCalledOnce();
  });

  it('calls logAction to record the notification', async () => {
    await GET(makeGet(withCronKey()));
    expect(vi.mocked(logAction)).toHaveBeenCalledOnce();
    const call = vi.mocked(logAction).mock.calls[0]![0];
    expect(call.action_type).toBe('logistikklubb_daily_notify_sent');
    expect(call.status).toBe('completed');
  });
});

// ─── Dry-run result ───────────────────────────────────────────────────────────

describe('GET — dry-run (WhatsApp not configured)', () => {
  beforeEach(() => {
    vi.mocked(notifyFounderWhatsApp).mockResolvedValue(DRY_RUN_RESULT);
    vi.mocked(isFounderWhatsAppEnabled).mockReturnValue(false);
  });

  it('returns ok: true, dry_run: true, sent: false', async () => {
    const body = await (await GET(makeGet(withCronKey()))).json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.dry_run).toBe(true);
    expect(body.sent).toBe(false);
    expect(body.whatsapp_enabled).toBe(false);
  });

  it('logs with status pending in dry-run mode', async () => {
    await GET(makeGet(withCronKey()));
    const call = vi.mocked(logAction).mock.calls[0]![0];
    expect(call.status).toBe('pending');
    expect(call.action_type).toBe('logistikklubb_daily_notify_failed');
  });
});

// ─── Failed result ────────────────────────────────────────────────────────────

describe('GET — send failure (Meta API error)', () => {
  beforeEach(() => {
    vi.mocked(notifyFounderWhatsApp).mockResolvedValue(FAILED_RESULT);
  });

  it('returns ok: false with error', async () => {
    const body = await (await GET(makeGet(withCronKey()))).json() as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(body.sent).toBe(false);
    expect(body.error).toBe('Meta API HTTP 400');
  });

  it('logs with status failed', async () => {
    await GET(makeGet(withCronKey()));
    const call = vi.mocked(logAction).mock.calls[0]![0];
    expect(call.status).toBe('failed');
    expect(call.error).toBe('Meta API HTTP 400');
  });
});

// ─── Idempotency ─────────────────────────────────────────────────────────────

describe('GET — idempotency (already sent)', () => {
  it('skips when already successfully sent today', async () => {
    mockCountResult = { count: 1, error: null };
    const body = await (await GET(makeGet(withCronKey()))).json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe(true);
    expect(body.reason).toBe('already_sent');
    expect(vi.mocked(notifyFounderWhatsApp)).not.toHaveBeenCalled();
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });

  it('does not skip when count is 0', async () => {
    mockCountResult = { count: 0, error: null };
    await GET(makeGet(withCronKey()));
    expect(vi.mocked(notifyFounderWhatsApp)).toHaveBeenCalledOnce();
  });

  it('does not skip when DB check errors (fails open)', async () => {
    mockCountResult = { count: null, error: 'db error' };
    await GET(makeGet(withCronKey()));
    expect(vi.mocked(notifyFounderWhatsApp)).toHaveBeenCalledOnce();
  });
});

// ─── Safety — no secrets in response ─────────────────────────────────────────

describe('response — no secrets leaked', () => {
  it('does not include WHATSAPP_FOUNDER_PHONE in response', async () => {
    process.env.WHATSAPP_FOUNDER_PHONE = '46709385267';
    const body = await (await GET(makeGet(withCronKey()))).json() as Record<string, unknown>;
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('46709385267');
  });

  it('does not include WHATSAPP_ACCESS_TOKEN in response', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'secret-token-xyz';
    const body = await (await GET(makeGet(withCronKey()))).json() as Record<string, unknown>;
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('secret-token-xyz');
    delete process.env.WHATSAPP_ACCESS_TOKEN;
  });

  it('does not include recipient field in response', async () => {
    const body = await (await GET(makeGet(withCronKey()))).json() as Record<string, unknown>;
    expect(body).not.toHaveProperty('recipient');
  });
});

// ─── notifyFounderWhatsApp payload ───────────────────────────────────────────

describe('notifyFounderWhatsApp call', () => {
  it('passes a PostDuePayload with id matching the slot + date', async () => {
    vi.setSystemTime(new Date('2026-06-22T05:30:00Z'));
    await GET(makeGet(withCronKey()));
    const payload = vi.mocked(notifyFounderWhatsApp).mock.calls[0]![0];
    expect(payload.id).toBe('daily-morning-2026-06-22');
  });

  it('post_text is non-empty and within 850 chars', async () => {
    await GET(makeGet(withCronKey()));
    const payload = vi.mocked(notifyFounderWhatsApp).mock.calls[0]![0];
    expect(payload.post_text.length).toBeGreaterThan(0);
    expect(payload.post_text.length).toBeLessThanOrEqual(850);
  });

  it('evening slot produces a different payload title than morning', async () => {
    vi.setSystemTime(new Date('2026-06-22T05:30:00Z'));
    await GET(makeGet(withCronKey()));
    const morningTitle = vi.mocked(notifyFounderWhatsApp).mock.calls[0]![0].title;

    vi.mocked(notifyFounderWhatsApp).mockClear();
    vi.setSystemTime(new Date('2026-06-22T17:30:00Z'));
    await GET(makeGet(withCronKey()));
    const eveningTitle = vi.mocked(notifyFounderWhatsApp).mock.calls[0]![0].title;

    expect(morningTitle).not.toBe(eveningTitle);
  });
});
