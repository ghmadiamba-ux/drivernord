import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

beforeEach(() => vi.clearAllMocks());

// ─── Mock matchingAgent so the route uses a controlled stub ───────────────────

vi.mock('../lib/matchingAgent', () => ({
  refreshStaleShortlists: vi.fn(),
}));

import { GET, POST } from '../app/api/agent/shortlist-refresh/route';
import { refreshStaleShortlists } from '../lib/matchingAgent';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: new Headers(headers),
    json:    () => Promise.resolve({}),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

const REFRESH_OK = {
  run_type:               'shortlist_refresh' as const,
  needs_checked:          3,
  stale_needs_found:      2,
  shortlists_refreshed:   2,
  skipped_do_not_contact: 1,
  skipped_fresh:          0,
  errors:                 [],
};

const originalEnv = process.env;

afterEach(() => {
  process.env = originalEnv;
});

// ─── Auth — CRON_SECRET (Bearer token, used by Vercel Cron) ───────────────────

describe('GET /api/agent/shortlist-refresh — CRON_SECRET auth', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, CRON_SECRET: 'cron-secret-abc' };
    vi.mocked(refreshStaleShortlists).mockResolvedValue(REFRESH_OK);
  });

  it('returns 401 with no auth header', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect((await res.json() as { error: string }).error).toBe('unauthorized');
  });

  it('returns 401 with wrong cron secret', async () => {
    const res = await GET(makeReq({ authorization: 'Bearer wrong' }));
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid Bearer CRON_SECRET', async () => {
    const res = await GET(makeReq({ authorization: 'Bearer cron-secret-abc' }));
    expect(res.status).toBe(200);
  });

  it('calls refreshStaleShortlists on valid auth', async () => {
    await GET(makeReq({ authorization: 'Bearer cron-secret-abc' }));
    expect(vi.mocked(refreshStaleShortlists)).toHaveBeenCalledOnce();
  });
});

// ─── Auth — AGENT_API_KEY (x-api-key header, used for manual triggers) ────────

describe('POST /api/agent/shortlist-refresh — AGENT_API_KEY auth', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, AGENT_API_KEY: 'agent-key-xyz' };
    vi.mocked(refreshStaleShortlists).mockResolvedValue(REFRESH_OK);
  });

  it('returns 200 with valid x-api-key', async () => {
    const res = await POST(makeReq({ 'x-api-key': 'agent-key-xyz' }));
    expect(res.status).toBe(200);
  });

  it('returns 401 with wrong x-api-key', async () => {
    const res = await POST(makeReq({ 'x-api-key': 'wrong' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 with no auth', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });
});

// ─── Misconfigured server ─────────────────────────────────────────────────────

describe('GET /api/agent/shortlist-refresh — misconfigured server', () => {
  it('returns 500 when neither CRON_SECRET nor AGENT_API_KEY is set', async () => {
    process.env = { ...originalEnv };
    delete process.env.CRON_SECRET;
    delete process.env.AGENT_API_KEY;

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    expect((await res.json() as { error: string }).error).toBe('server_misconfigured');
  });
});

// ─── Response shape ───────────────────────────────────────────────────────────

describe('GET /api/agent/shortlist-refresh — response shape', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, CRON_SECRET: 'secret' };
    vi.mocked(refreshStaleShortlists).mockResolvedValue(REFRESH_OK);
  });

  it('returns ok: true', async () => {
    const res  = await GET(makeReq({ authorization: 'Bearer secret' }));
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('returns run_type: shortlist_refresh', async () => {
    const res  = await GET(makeReq({ authorization: 'Bearer secret' }));
    const body = await res.json() as { run_type: string };
    expect(body.run_type).toBe('shortlist_refresh');
  });

  it('returns summary counts from refreshStaleShortlists', async () => {
    const res  = await GET(makeReq({ authorization: 'Bearer secret' }));
    const body = await res.json() as Record<string, unknown>;
    expect(body.needs_checked).toBe(3);
    expect(body.shortlists_refreshed).toBe(2);
    expect(body.skipped_do_not_contact).toBe(1);
    expect(body.error_count).toBe(0);
  });

  it('does not include driver names, emails, or phone numbers in response', async () => {
    const res  = await GET(makeReq({ authorization: 'Bearer secret' }));
    const body = JSON.stringify(await res.json());
    expect(body).not.toMatch(/@/);
    expect(body).not.toMatch(/\+46/);
    expect(body).not.toMatch(/Enskede|Edvardsson|driver/i);
  });

  it('includes error_count not raw error strings', async () => {
    vi.mocked(refreshStaleShortlists).mockResolvedValue({
      ...REFRESH_OK,
      errors: ['need:uuid-123 error:insert timeout'],
    });
    const res  = await GET(makeReq({ authorization: 'Bearer secret' }));
    const body = await res.json() as { error_count: number };
    expect(body.error_count).toBe(1);
    // Raw error strings are NOT exposed in the response
    expect(JSON.stringify(body)).not.toContain('insert timeout');
  });
});

// ─── No outreach created ──────────────────────────────────────────────────────

describe('GET /api/agent/shortlist-refresh — no outreach side-effects', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, CRON_SECRET: 'secret' };
    vi.mocked(refreshStaleShortlists).mockResolvedValue(REFRESH_OK);
  });

  it('only calls refreshStaleShortlists — no other agent triggered by the route', async () => {
    await GET(makeReq({ authorization: 'Bearer secret' }));
    // The route calls exactly one function; if refreshStaleShortlists is the
    // only mock with a call count, the route has no other external effects.
    expect(vi.mocked(refreshStaleShortlists)).toHaveBeenCalledOnce();
  });
});
