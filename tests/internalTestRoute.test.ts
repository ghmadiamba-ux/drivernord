import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/recruiterAuth', () => ({
  requireRecruiterAuth: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock('../lib/zohoMailClient', () => ({
  sendEmailViaZoho:      vi.fn(),
  getZohoConfigStatus:   vi.fn(),
  getZohoFromEmail:      vi.fn().mockReturnValue('hej@drivernord.com'),
  getZohoFromName:       vi.fn().mockReturnValue('Ghislain Alexander Mad'),
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('action-id'),
}));

import { POST } from '../app/api/admin/zoho/internal-test-send/route';
import { requireRecruiterAuth } from '../lib/recruiterAuth';
import { sendEmailViaZoho, getZohoConfigStatus } from '../lib/zohoMailClient';
import { logAction } from '../lib/systemActions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body?: unknown): NextRequest {
  return {
    headers: new Headers({ 'x-recruiter-key': 'test-key' }),
    json:    () => Promise.resolve(body),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

function mockConfigured() {
  vi.mocked(getZohoConfigStatus).mockReturnValue({ configured: true, missing_env: [] });
}

function mockNotConfigured(missing: string[] = ['ZOHO_CLIENT_ID']) {
  vi.mocked(getZohoConfigStatus).mockReturnValue({ configured: false, missing_env: missing });
}

const originalEnv = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv, ZOHO_TEST_RECIPIENT: 'founder@test.se' };
});

afterEach(() => {
  process.env = originalEnv;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/zoho/internal-test-send — auth', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({ ok: false, status: 401, body: { error: 'unauthorized' } });
    const res = await POST(makeReq({ confirm: true }));
    expect(res.status).toBe(401);
  });
});

// ─── Zoho config gate ─────────────────────────────────────────────────────────

describe('POST — Zoho config gate', () => {
  it('returns 400 when Zoho not configured', async () => {
    mockNotConfigured(['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET']);
    const res  = await POST(makeReq({ confirm: true }));
    const body = await res.json() as { error: string; missing_env: string[] };
    expect(res.status).toBe(400);
    expect(body.error).toContain('not configured');
    expect(body.missing_env).toContain('ZOHO_CLIENT_ID');
  });

  it('returns names only — no secret values in missing_env', async () => {
    mockNotConfigured(['ZOHO_REFRESH_TOKEN']);
    const res  = await POST(makeReq({ confirm: true }));
    const body = await res.json() as { missing_env: string[] };
    for (const entry of body.missing_env ?? []) {
      expect(entry).toMatch(/^ZOHO_/);
    }
  });
});

// ─── ZOHO_TEST_RECIPIENT gate ─────────────────────────────────────────────────

describe('POST — test recipient gate', () => {
  it('returns 400 when ZOHO_TEST_RECIPIENT not set', async () => {
    mockConfigured();
    delete process.env.ZOHO_TEST_RECIPIENT;
    const res = await POST(makeReq({ confirm: true }));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toContain('ZOHO_TEST_RECIPIENT');
  });
});

// ─── Confirm gate ─────────────────────────────────────────────────────────────

describe('POST — confirm gate', () => {
  it('returns 400 when confirm is not true', async () => {
    mockConfigured();
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toContain('confirm');
  });

  it('returns 400 when body is empty', async () => {
    mockConfigured();
    const res = await POST(makeReq(null));
    expect(res.status).toBe(400);
  });
});

// ─── Successful test send ─────────────────────────────────────────────────────

describe('POST — successful test send', () => {
  it('returns 200 with message_id on success', async () => {
    mockConfigured();
    vi.mocked(sendEmailViaZoho).mockResolvedValueOnce({
      success: true, message_id: 'zoho-test-msg-id', dry_run: false, error: null,
    });
    const res  = await POST(makeReq({ confirm: true }));
    const body = await res.json() as { ok: boolean; message_id: string; recipient: string; dry_run: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.message_id).toBe('zoho-test-msg-id');
    expect(body.recipient).toBe('founder@test.se');
    expect(body.dry_run).toBe(false);
  });

  it('sends to ZOHO_TEST_RECIPIENT only', async () => {
    mockConfigured();
    let capturedTo: string | undefined;
    vi.mocked(sendEmailViaZoho).mockImplementationOnce(async (input) => {
      capturedTo = input.to;
      return { success: true, message_id: 'msg-id', dry_run: false, error: null };
    });
    await POST(makeReq({ confirm: true }));
    expect(capturedTo).toBe('founder@test.se');
  });

  it('logs outreach_email_sent action on success', async () => {
    mockConfigured();
    vi.mocked(sendEmailViaZoho).mockResolvedValueOnce({
      success: true, message_id: 'msg-id', dry_run: false, error: null,
    });
    await POST(makeReq({ confirm: true }));
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type:  'outreach_email_sent',
        triggered_by: 'founder_internal_test',
        target_type:  'outreach_email_queue',
        status:       'completed',
      }),
    );
  });
});

// ─── Failed test send ─────────────────────────────────────────────────────────

describe('POST — failed test send', () => {
  it('returns 500 when sendEmailViaZoho fails', async () => {
    mockConfigured();
    vi.mocked(sendEmailViaZoho).mockResolvedValueOnce({
      success: false, message_id: null, dry_run: false, error: 'HTTP 401 — invalid token',
    });
    const res = await POST(makeReq({ confirm: true }));
    expect(res.status).toBe(500);
    expect((await res.json() as { ok: boolean }).ok).toBe(false);
  });

  it('logs outreach_email_failed action on failure', async () => {
    mockConfigured();
    vi.mocked(sendEmailViaZoho).mockResolvedValueOnce({
      success: false, message_id: null, dry_run: false, error: 'send failed',
    });
    await POST(makeReq({ confirm: true }));
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'outreach_email_failed',
        status:      'failed',
      }),
    );
  });
});
