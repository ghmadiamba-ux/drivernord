import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/recruiterAuth', () => ({
  requireRecruiterAuth: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock('../lib/founderNotifier', () => ({
  notifyFounderWhatsApp:    vi.fn(),
  isFounderWhatsAppEnabled: vi.fn().mockReturnValue(false),
}));

vi.mock('../lib/whatsappClient', () => ({
  getWhatsAppFounderPhone: vi.fn().mockReturnValue(''),
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('action-id'),
}));

import { POST } from '../app/api/admin/whatsapp-test/route';
import { requireRecruiterAuth } from '../lib/recruiterAuth';
import { notifyFounderWhatsApp, isFounderWhatsAppEnabled } from '../lib/founderNotifier';
import { getWhatsAppFounderPhone } from '../lib/whatsappClient';
import { logAction } from '../lib/systemActions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body?: unknown): NextRequest {
  return {
    headers: new Headers({ 'x-recruiter-key': 'test-key' }),
    json:    () => Promise.resolve(body ?? {}),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

const DRY_RUN_RESULT   = { sent: false, dry_run: true,  error: 'FOUNDER_WHATSAPP_ENABLED not set — dry_run', message_id: null };
const SUCCESS_RESULT   = { sent: true,  dry_run: false, error: null, message_id: 'wamid.test-abc-123' };
const FAILURE_RESULT   = { sent: false, dry_run: false, error: 'Meta API HTTP 401: invalid token', message_id: null };

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Auth gate ────────────────────────────────────────────────────────────────

describe('POST /api/admin/whatsapp-test — auth', () => {
  it('returns 401 when not authenticated and no CRON_SECRET', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({ ok: false, status: 401, body: { error: 'unauthorized' } });
    delete process.env.CRON_SECRET;
    const res = await POST(makeReq({ confirm: true }));
    expect(res.status).toBe(401);
  });

  it('does not call notifyFounderWhatsApp when not authenticated', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({ ok: false, status: 401, body: { error: 'unauthorized' } });
    delete process.env.CRON_SECRET;
    await POST(makeReq({ confirm: true }));
    expect(vi.mocked(notifyFounderWhatsApp)).not.toHaveBeenCalled();
  });

  it('accepts CRON_SECRET bearer auth as secondary pathway', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({ ok: false, status: 401, body: { error: 'unauthorized' } });
    process.env.CRON_SECRET = 'test-cron-secret';
    vi.mocked(notifyFounderWhatsApp).mockResolvedValueOnce(DRY_RUN_RESULT);
    vi.mocked(isFounderWhatsAppEnabled).mockReturnValue(false);
    vi.mocked(getWhatsAppFounderPhone).mockReturnValue('');
    const reqWithCron = {
      headers: new Headers({ 'authorization': 'Bearer test-cron-secret', 'content-type': 'application/json' }),
      json:    () => Promise.resolve({ confirm: true }),
      cookies: { get: () => undefined },
    } as unknown as NextRequest;
    const res = await POST(reqWithCron);
    expect(res.status).toBe(200);
    delete process.env.CRON_SECRET;
  });
});

// ─── Confirm gate ─────────────────────────────────────────────────────────────

describe('POST — confirm gate', () => {
  it('returns 400 when confirm is missing', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toContain('confirm');
  });

  it('returns 400 when confirm is false', async () => {
    const res = await POST(makeReq({ confirm: false }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when confirm is a string "true" (not boolean)', async () => {
    const res = await POST(makeReq({ confirm: 'true' }));
    expect(res.status).toBe(400);
  });

  it('does not call notifyFounderWhatsApp when confirm is missing', async () => {
    await POST(makeReq({}));
    expect(vi.mocked(notifyFounderWhatsApp)).not.toHaveBeenCalled();
  });
});

// ─── Dry-run (WhatsApp not enabled) ──────────────────────────────────────────

describe('POST — dry_run when WhatsApp not enabled', () => {
  beforeEach(() => {
    vi.mocked(notifyFounderWhatsApp).mockResolvedValue(DRY_RUN_RESULT);
    vi.mocked(isFounderWhatsAppEnabled).mockReturnValue(false);
    vi.mocked(getWhatsAppFounderPhone).mockReturnValue('');
  });

  it('returns 200 with dry_run: true when FOUNDER_WHATSAPP_ENABLED is not set', async () => {
    const res  = await POST(makeReq({ confirm: true }));
    const body = await res.json() as { ok: boolean; dry_run: boolean; whatsapp_enabled: boolean };
    expect(res.status).toBe(200);
    expect(body.dry_run).toBe(true);
    expect(body.ok).toBe(false);
    expect(body.whatsapp_enabled).toBe(false);
  });

  it('includes error message explaining dry_run reason', async () => {
    const res  = await POST(makeReq({ confirm: true }));
    const body = await res.json() as { error: string | null };
    expect(body.error).toBeTruthy();
    expect(body.error).toContain('FOUNDER_WHATSAPP_ENABLED');
  });

  it('still logs to system_actions on dry_run', async () => {
    await POST(makeReq({ confirm: true }));
    expect(vi.mocked(logAction)).toHaveBeenCalledOnce();
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type:  'founder_notification_failed',
        triggered_by: 'admin:whatsapp-test',
        target_type:  'logistikklubb_scheduled_post',
      }),
    );
  });
});

// ─── Successful send ──────────────────────────────────────────────────────────

describe('POST — successful send', () => {
  beforeEach(() => {
    vi.mocked(notifyFounderWhatsApp).mockResolvedValue(SUCCESS_RESULT);
    vi.mocked(isFounderWhatsAppEnabled).mockReturnValue(true);
    vi.mocked(getWhatsAppFounderPhone).mockReturnValue('46709385267');
  });

  it('returns 200 with ok: true on success', async () => {
    const res  = await POST(makeReq({ confirm: true }));
    const body = await res.json() as { ok: boolean; dry_run: boolean; error: string | null };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dry_run).toBe(false);
    expect(body.error).toBeNull();
  });

  it('returns message_id from notifyFounderWhatsApp', async () => {
    const res  = await POST(makeReq({ confirm: true }));
    const body = await res.json() as { message_id: string | null };
    expect(body.message_id).toBe('wamid.test-abc-123');
  });

  it('returns whatsapp_enabled: true in response', async () => {
    const res  = await POST(makeReq({ confirm: true }));
    const body = await res.json() as { whatsapp_enabled: boolean; recipient: string };
    expect(body.whatsapp_enabled).toBe(true);
    expect(body.recipient).toBe('46709385267');
  });

  it('logs founder_notification_sent on success', async () => {
    await POST(makeReq({ confirm: true }));
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type:  'founder_notification_sent',
        triggered_by: 'admin:whatsapp-test',
        status:       'completed',
      }),
    );
  });

  it('calls notifyFounderWhatsApp exactly once', async () => {
    await POST(makeReq({ confirm: true }));
    expect(vi.mocked(notifyFounderWhatsApp)).toHaveBeenCalledOnce();
  });
});

// ─── WhatsApp send failure ────────────────────────────────────────────────────

describe('POST — WhatsApp send failure', () => {
  beforeEach(() => {
    vi.mocked(notifyFounderWhatsApp).mockResolvedValue(FAILURE_RESULT);
    vi.mocked(isFounderWhatsAppEnabled).mockReturnValue(true);
    vi.mocked(getWhatsAppFounderPhone).mockReturnValue('46709385267');
  });

  it('returns 500 when notifyFounderWhatsApp returns failure', async () => {
    const res = await POST(makeReq({ confirm: true }));
    expect(res.status).toBe(500);
  });

  it('returns ok: false on failure', async () => {
    const res  = await POST(makeReq({ confirm: true }));
    const body = await res.json() as { ok: boolean; error: string | null };
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Meta API HTTP 401');
  });

  it('logs founder_notification_failed on failure', async () => {
    await POST(makeReq({ confirm: true }));
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'founder_notification_failed',
        status:      'failed',
        error:       'Meta API HTTP 401: invalid token',
      }),
    );
  });

  it('returns message_id: null on failure', async () => {
    const res  = await POST(makeReq({ confirm: true }));
    const body = await res.json() as { message_id: string | null };
    expect(body.message_id).toBeNull();
  });
});

// ─── Custom post content — valid payloads ─────────────────────────────────────

describe('POST — custom post content: valid payloads', () => {
  beforeEach(() => {
    vi.mocked(notifyFounderWhatsApp).mockResolvedValue(SUCCESS_RESULT);
    vi.mocked(isFounderWhatsAppEnabled).mockReturnValue(true);
    vi.mocked(getWhatsAppFounderPhone).mockReturnValue('46709385267');
  });

  it('passes custom post_text to notifyFounderWhatsApp', async () => {
    const customText = 'Kvällsreflektion — en dag i logistik-Sverige avklarad.';
    await POST(makeReq({ confirm: true, post_text: customText }));
    const call = vi.mocked(notifyFounderWhatsApp).mock.calls[0]![0];
    expect(call.post_text).toBe(customText);
  });

  it('passes custom title to notifyFounderWhatsApp', async () => {
    await POST(makeReq({ confirm: true, title: 'Kvällsreflektion' }));
    const call = vi.mocked(notifyFounderWhatsApp).mock.calls[0]![0];
    expect(call.title).toBe('Kvällsreflektion');
  });

  it('passes custom category and day_number', async () => {
    await POST(makeReq({ confirm: true, category: 'discussion_question', day_number: 3 }));
    const call = vi.mocked(notifyFounderWhatsApp).mock.calls[0]![0];
    expect(call.category).toBe('discussion_question');
    expect(call.day_number).toBe(3);
  });

  it('falls back to sample post when no override provided', async () => {
    await POST(makeReq({ confirm: true }));
    const call = vi.mocked(notifyFounderWhatsApp).mock.calls[0]![0];
    expect(call.title).toBe('WhatsApp Relay Test');
    expect(call.post_text).toContain('testmeddelande');
  });

  it('ignores non-string post_text values and falls back to sample', async () => {
    await POST(makeReq({ confirm: true, post_text: 12345 }));
    const call = vi.mocked(notifyFounderWhatsApp).mock.calls[0]![0];
    expect(call.post_text).toContain('testmeddelande');
  });

  it('accepts post_text exactly 850 characters', async () => {
    const text850 = 'A'.repeat(850);
    const res = await POST(makeReq({ confirm: true, post_text: text850 }));
    expect(res.status).not.toBe(400);
    const call = vi.mocked(notifyFounderWhatsApp).mock.calls[0]![0];
    expect(call.post_text).toBe(text850);
  });

  it('accepts title exactly 100 characters', async () => {
    const title100 = 'T'.repeat(100);
    const res = await POST(makeReq({ confirm: true, title: title100 }));
    expect(res.status).not.toBe(400);
  });

  it('does not accept recipient field — no recipient override', async () => {
    await POST(makeReq({ confirm: true, recipient: '46999999999', to: '46999999999' }));
    // notifyFounderWhatsApp must still be called with the fixed test post, not a custom recipient
    expect(vi.mocked(notifyFounderWhatsApp)).toHaveBeenCalledOnce();
    // getWhatsAppFounderPhone controls the recipient — body fields cannot change it
    expect(vi.mocked(getWhatsAppFounderPhone)).toHaveBeenCalled();
  });

  it('does not accept template_name field — no template override', async () => {
    await POST(makeReq({ confirm: true, template_name: 'malicious_template', language: 'en' }));
    // Route still calls notifyFounderWhatsApp normally; template is fixed inside notifyFounderWhatsApp
    expect(vi.mocked(notifyFounderWhatsApp)).toHaveBeenCalledOnce();
  });
});

// ─── Custom post content — validation rejections ───────────────────────────────

describe('POST — custom post content: validation', () => {
  it('returns 400 when post_text is an empty string', async () => {
    const res = await POST(makeReq({ confirm: true, post_text: '' }));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toContain('post_text');
    expect(vi.mocked(notifyFounderWhatsApp)).not.toHaveBeenCalled();
  });

  it('returns 400 when post_text is whitespace only', async () => {
    const res = await POST(makeReq({ confirm: true, post_text: '   ' }));
    expect(res.status).toBe(400);
    expect(vi.mocked(notifyFounderWhatsApp)).not.toHaveBeenCalled();
  });

  it('returns 400 when post_text exceeds 850 characters', async () => {
    const res = await POST(makeReq({ confirm: true, post_text: 'A'.repeat(851) }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('850');
    expect(vi.mocked(notifyFounderWhatsApp)).not.toHaveBeenCalled();
  });

  it('returns 400 when title exceeds 100 characters', async () => {
    const res = await POST(makeReq({ confirm: true, title: 'T'.repeat(101) }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('100');
    expect(vi.mocked(notifyFounderWhatsApp)).not.toHaveBeenCalled();
  });

  it('auth gate still fires before content validation', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({ ok: false, status: 401, body: { error: 'unauthorized' } });
    delete process.env.CRON_SECRET;
    // Even with invalid post_text, auth is checked first
    const res = await POST(makeReq({ confirm: true, post_text: '' }));
    expect(res.status).toBe(401);
  });

  it('confirm gate still fires before content validation', async () => {
    // confirm missing → 400 before post_text is validated
    const res = await POST(makeReq({ post_text: 'A'.repeat(851) }));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toContain('confirm');
    expect(vi.mocked(notifyFounderWhatsApp)).not.toHaveBeenCalled();
  });
});

// ─── Safety: no token exposure ────────────────────────────────────────────────

describe('POST — safety: no token in response', () => {
  const FAKE_TOKEN = 'EAATest12345SuperSecretToken';

  afterEach(() => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
  });

  it('does not include WHATSAPP_ACCESS_TOKEN in response body', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = FAKE_TOKEN;
    vi.mocked(notifyFounderWhatsApp).mockResolvedValue(SUCCESS_RESULT);
    vi.mocked(isFounderWhatsAppEnabled).mockReturnValue(true);
    vi.mocked(getWhatsAppFounderPhone).mockReturnValue('46709385267');
    const res  = await POST(makeReq({ confirm: true }));
    const text = await res.text();
    expect(text).not.toContain(FAKE_TOKEN);
  });
});
