import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isFounderNotificationsEnabled,
  getFounderNotificationEmail,
  formatPostDueEmailSubject,
  formatPostDueEmailBody,
  formatPostDueWhatsAppParams,
  isFounderWhatsAppEnabled,
  notifyFounderPostDue,
  notifyFounderWhatsApp,
} from '../lib/founderNotifier';
import type { PostDuePayload } from '../lib/founderNotifier';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/smtpMailClient', () => ({
  sendEmailViaSmtp: vi.fn(),
  getSmtpFromEmail: vi.fn().mockReturnValue('hej@drivernord.com'),
  getSmtpFromName:  vi.fn().mockReturnValue('DriverNord System'),
}));

vi.mock('../lib/whatsappClient', () => ({
  sendWhatsAppTemplate:      vi.fn(),
  getWhatsAppFounderPhone:   vi.fn().mockReturnValue('46700000001'),
  getWhatsAppMaxDaily:       vi.fn().mockReturnValue(10),
  getWhatsAppTodayCount:     vi.fn().mockResolvedValue(0),
  getWhatsAppTemplateName:   vi.fn().mockReturnValue('logistikklubb_post_due'),
  getWhatsAppTemplateLanguage: vi.fn().mockReturnValue('sv'),
}));

// Imports AFTER mock declarations so Vitest hoisting takes effect
import { sendEmailViaSmtp } from '../lib/smtpMailClient';
import { sendWhatsAppTemplate, getWhatsAppTodayCount } from '../lib/whatsappClient';
const mockSend       = vi.mocked(sendEmailViaSmtp);
const mockWASend     = vi.mocked(sendWhatsAppTemplate);
const mockWACount    = vi.mocked(getWhatsAppTodayCount);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const POST: PostDuePayload = {
  id:             'post-uuid-001',
  day_number:     3,
  title:          'YKB — Veckans tips',
  category:       'weekly_tips',
  post_text:      'Kort men viktigt tips den här veckan ⚠️\n\nYKB och kontroller...',
  suggested_time: '09:00 – 10:00',
};

const POST_NO_TIME: PostDuePayload = {
  ...POST,
  id:             'post-uuid-002',
  suggested_time: null,
};

function setEnv(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string> = {
    FOUNDER_NOTIFICATIONS_ENABLED: 'true',
    FOUNDER_NOTIFICATION_EMAIL:    'founder@example.com',
    ...overrides,
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function clearEnv() {
  delete process.env.FOUNDER_NOTIFICATIONS_ENABLED;
  delete process.env.FOUNDER_NOTIFICATION_EMAIL;
  delete process.env.FOUNDER_WHATSAPP_ENABLED;
  delete process.env.WHATSAPP_FOUNDER_PHONE;
}

const SMTP_SUCCESS = { success: true,  message_id: 'msg-xyz', dry_run: false, error: null };
const SMTP_FAIL    = { success: false, message_id: null,       dry_run: false, error: 'SMTP connection error' };
const SMTP_DRY_RUN = { success: false, message_id: null,       dry_run: true,  error: 'ZOHO_SMTP_PASSWORD not set — dry_run active. Add app password to env.' };

// ─── isFounderNotificationsEnabled ───────────────────────────────────────────

describe('isFounderNotificationsEnabled', () => {
  afterEach(clearEnv);

  it('returns false when FOUNDER_NOTIFICATIONS_ENABLED is not set', () => {
    clearEnv();
    expect(isFounderNotificationsEnabled()).toBe(false);
  });

  it('returns true when FOUNDER_NOTIFICATIONS_ENABLED=true', () => {
    process.env.FOUNDER_NOTIFICATIONS_ENABLED = 'true';
    expect(isFounderNotificationsEnabled()).toBe(true);
  });

  it('returns false when FOUNDER_NOTIFICATIONS_ENABLED=false', () => {
    process.env.FOUNDER_NOTIFICATIONS_ENABLED = 'false';
    expect(isFounderNotificationsEnabled()).toBe(false);
  });

  it('returns false for non-exact values like "1" or "yes"', () => {
    process.env.FOUNDER_NOTIFICATIONS_ENABLED = '1';
    expect(isFounderNotificationsEnabled()).toBe(false);
    process.env.FOUNDER_NOTIFICATIONS_ENABLED = 'yes';
    expect(isFounderNotificationsEnabled()).toBe(false);
  });
});

// ─── getFounderNotificationEmail ─────────────────────────────────────────────

describe('getFounderNotificationEmail', () => {
  afterEach(clearEnv);

  it('returns empty string when FOUNDER_NOTIFICATION_EMAIL is not set', () => {
    clearEnv();
    expect(getFounderNotificationEmail()).toBe('');
  });

  it('returns the configured email address', () => {
    process.env.FOUNDER_NOTIFICATION_EMAIL = 'test@example.com';
    expect(getFounderNotificationEmail()).toBe('test@example.com');
  });
});

// ─── formatPostDueEmailSubject ────────────────────────────────────────────────

describe('formatPostDueEmailSubject', () => {
  it('includes [Logistikklubb] prefix', () => {
    expect(formatPostDueEmailSubject(POST)).toContain('[Logistikklubb]');
  });

  it('includes day number', () => {
    expect(formatPostDueEmailSubject(POST)).toContain('Dag 3');
  });

  it('includes post title', () => {
    expect(formatPostDueEmailSubject(POST)).toContain('YKB — Veckans tips');
  });

  it('ends with "Klar att posta"', () => {
    expect(formatPostDueEmailSubject(POST)).toContain('Klar att posta');
  });

  it('handles day 1 correctly', () => {
    const subject = formatPostDueEmailSubject({ ...POST, day_number: 1, title: 'Välkommen' });
    expect(subject).toContain('Dag 1');
    expect(subject).toContain('Välkommen');
  });
});

// ─── formatPostDueEmailBody ───────────────────────────────────────────────────

describe('formatPostDueEmailBody', () => {
  it('includes the day number', () => {
    expect(formatPostDueEmailBody(POST)).toContain('Dag 3');
  });

  it('includes the Swedish category label', () => {
    expect(formatPostDueEmailBody(POST)).toContain('KATEGORI: Tips');
  });

  it('falls back to raw category name if not in label map', () => {
    const body = formatPostDueEmailBody({ ...POST, category: 'unknown_category' });
    expect(body).toContain('KATEGORI: unknown_category');
  });

  it('includes TITEL field', () => {
    expect(formatPostDueEmailBody(POST)).toContain('TITEL: YKB — Veckans tips');
  });

  it('includes suggested time when present', () => {
    expect(formatPostDueEmailBody(POST)).toContain('FÖRESLAGEN TID: 09:00 – 10:00');
  });

  it('omits FÖRESLAGEN TID line when suggested_time is null', () => {
    expect(formatPostDueEmailBody(POST_NO_TIME)).not.toContain('FÖRESLAGEN TID');
  });

  it('includes the full post text verbatim', () => {
    expect(formatPostDueEmailBody(POST)).toContain(POST.post_text);
  });

  it('includes the admin page link', () => {
    expect(formatPostDueEmailBody(POST)).toContain('https://drivernord.com/admin/logistikklubb');
  });

  it('states that no WhatsApp message was sent automatically', () => {
    const body = formatPostDueEmailBody(POST);
    expect(body).toContain('Inget WhatsApp-meddelande skickades automatiskt');
  });

  it('states that manual posting is required', () => {
    expect(formatPostDueEmailBody(POST)).toContain('Manuell posting krävs');
  });

  it('does not contain driver PII patterns (phone numbers)', () => {
    const body = formatPostDueEmailBody(POST);
    expect(body).not.toMatch(/\+46\d{8,}/);
    expect(body).not.toMatch(/07\d{8}/);
  });

  it('does not contain email addresses other than the admin link domain', () => {
    const body = formatPostDueEmailBody(POST);
    const withoutDomain = body.replace(/drivernord\.com/g, '');
    expect(withoutDomain).not.toMatch(/\S+@\S+\.\S+/);
  });

  it('includes all action step instructions', () => {
    const body = formatPostDueEmailBody(POST);
    expect(body).toContain('1. Kopiera texten ovan');
    expect(body).toContain('2. Öppna WhatsApp Logistikklubben');
    expect(body).toContain('3. Klistra in och skicka');
  });
});

// ─── notifyFounderPostDue — gate / missing config ─────────────────────────────

describe('notifyFounderPostDue — missing config', () => {
  beforeEach(() => {
    mockSend.mockReset();
    clearEnv();
  });

  it('returns error when FOUNDER_NOTIFICATION_EMAIL is not set', async () => {
    process.env.FOUNDER_NOTIFICATION_EMAIL = '';
    const result = await notifyFounderPostDue(POST);
    expect(result.sent).toBe(false);
    expect(result.error).toMatch(/FOUNDER_NOTIFICATION_EMAIL not configured/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does not call sendEmailViaSmtp when email env is missing', async () => {
    delete process.env.FOUNDER_NOTIFICATION_EMAIL;
    await notifyFounderPostDue(POST);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ─── notifyFounderPostDue — success ──────────────────────────────────────────

describe('notifyFounderPostDue — success', () => {
  beforeEach(() => {
    mockSend.mockReset();
    setEnv();
  });
  afterEach(clearEnv);

  it('returns { sent: true } when SMTP reports success', async () => {
    mockSend.mockResolvedValue(SMTP_SUCCESS);
    const result = await notifyFounderPostDue(POST);
    expect(result.sent).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(result.error).toBeNull();
  });

  it('calls sendEmailViaSmtp with correct to address', async () => {
    mockSend.mockResolvedValue(SMTP_SUCCESS);
    await notifyFounderPostDue(POST);
    expect(mockSend).toHaveBeenCalledOnce();
    const call = mockSend.mock.calls[0]![0];
    expect(call.to).toBe('founder@example.com');
  });

  it('calls sendEmailViaSmtp with correct subject', async () => {
    mockSend.mockResolvedValue(SMTP_SUCCESS);
    await notifyFounderPostDue(POST);
    const call = mockSend.mock.calls[0]![0];
    expect(call.subject).toContain('[Logistikklubb]');
    expect(call.subject).toContain('Dag 3');
  });

  it('calls sendEmailViaSmtp with body containing post text', async () => {
    mockSend.mockResolvedValue(SMTP_SUCCESS);
    await notifyFounderPostDue(POST);
    const call = mockSend.mock.calls[0]![0];
    expect(call.body).toContain(POST.post_text);
  });

  it('calls sendEmailViaSmtp with from_email from SMTP config', async () => {
    mockSend.mockResolvedValue(SMTP_SUCCESS);
    await notifyFounderPostDue(POST);
    const call = mockSend.mock.calls[0]![0];
    expect(call.from_email).toBe('hej@drivernord.com');
  });
});

// ─── notifyFounderPostDue — SMTP errors ──────────────────────────────────────

describe('notifyFounderPostDue — SMTP errors', () => {
  beforeEach(() => {
    mockSend.mockReset();
    setEnv();
  });
  afterEach(clearEnv);

  it('returns { sent: false, error } when SMTP returns failure', async () => {
    mockSend.mockResolvedValue(SMTP_FAIL);
    const result = await notifyFounderPostDue(POST);
    expect(result.sent).toBe(false);
    expect(result.dry_run).toBe(false);
    expect(result.error).toContain('SMTP connection error');
  });

  it('returns { sent: false, dry_run: true } when SMTP not configured', async () => {
    mockSend.mockResolvedValue(SMTP_DRY_RUN);
    const result = await notifyFounderPostDue(POST);
    expect(result.sent).toBe(false);
    expect(result.dry_run).toBe(true);
    expect(result.error).toBeTruthy();
  });

  it('returns { sent: false, error } when SMTP returns null error message', async () => {
    mockSend.mockResolvedValue({ success: false, message_id: null, dry_run: false, error: null });
    const result = await notifyFounderPostDue(POST);
    expect(result.sent).toBe(false);
    expect(result.error).toBe('SMTP send failed');
  });
});

// ─── notifyFounderPostDue — non-throwing guarantee ───────────────────────────

describe('notifyFounderPostDue — never throws', () => {
  beforeEach(() => {
    mockSend.mockReset();
    setEnv();
  });
  afterEach(clearEnv);

  it('catches and returns error when sendEmailViaSmtp throws', async () => {
    mockSend.mockRejectedValue(new Error('Network timeout'));
    const result = await notifyFounderPostDue(POST);
    expect(result.sent).toBe(false);
    expect(result.error).toContain('Network timeout');
  });

  it('does not throw even when sendEmailViaSmtp throws a non-Error', async () => {
    mockSend.mockRejectedValue('string error');
    const result = await notifyFounderPostDue(POST);
    expect(result.sent).toBe(false);
    expect(result.error).toBe('string error');
  });

  it('cron continues after notification failure — markPostDue is independent', async () => {
    mockSend.mockRejectedValue(new Error('Connection refused'));
    const result = await notifyFounderPostDue(POST);
    expect(result).toMatchObject({ sent: false, error: expect.stringContaining('Connection refused') });
  });
});

// ─── WhatsApp path untouched ──────────────────────────────────────────────────

describe('WhatsApp path — not affected by founder notifications', () => {
  it('no WhatsApp env vars referenced in founderNotifier', async () => {
    setEnv();
    process.env.WHATSAPP_GROUPS_API_ENABLED = 'true';
    mockSend.mockResolvedValue(SMTP_SUCCESS);
    const result = await notifyFounderPostDue(POST);
    expect(result.sent).toBe(true);
    delete process.env.WHATSAPP_GROUPS_API_ENABLED;
    clearEnv();
  });
});

// ─── Category label mapping ───────────────────────────────────────────────────

describe('category label mapping in email body', () => {
  const cases: Array<[string, string]> = [
    ['morning_greeting',    'Morgon'],
    ['market_signal',       'Marknad'],
    ['discussion_question', 'Diskussion'],
    ['everyday_logistics',  'Logistikvardag'],
    ['poll',                'Poll'],
    ['weekly_tips',         'Tips'],
    ['soft_cta',            'DriverNord CTA'],
  ];

  it.each(cases)('category "%s" maps to "%s"', (category, label) => {
    const body = formatPostDueEmailBody({ ...POST, category });
    expect(body).toContain(`KATEGORI: ${label}`);
  });
});

// ─── isFounderWhatsAppEnabled ─────────────────────────────────────────────────

describe('isFounderWhatsAppEnabled', () => {
  afterEach(clearEnv);

  it('returns false when FOUNDER_WHATSAPP_ENABLED is not set', () => {
    expect(isFounderWhatsAppEnabled()).toBe(false);
  });

  it('returns true when FOUNDER_WHATSAPP_ENABLED=true', () => {
    process.env.FOUNDER_WHATSAPP_ENABLED = 'true';
    expect(isFounderWhatsAppEnabled()).toBe(true);
  });

  it('returns false when FOUNDER_WHATSAPP_ENABLED=false', () => {
    process.env.FOUNDER_WHATSAPP_ENABLED = 'false';
    expect(isFounderWhatsAppEnabled()).toBe(false);
  });

  it('returns false for non-exact values like "1" or "yes"', () => {
    process.env.FOUNDER_WHATSAPP_ENABLED = '1';
    expect(isFounderWhatsAppEnabled()).toBe(false);
    process.env.FOUNDER_WHATSAPP_ENABLED = 'yes';
    expect(isFounderWhatsAppEnabled()).toBe(false);
  });
});

// ─── formatPostDueWhatsAppParams ──────────────────────────────────────────────

describe('formatPostDueWhatsAppParams', () => {
  it('returns an array of 3 strings', () => {
    const params = formatPostDueWhatsAppParams(POST);
    expect(params).toHaveLength(3);
  });

  it('first param contains day number', () => {
    const [p1] = formatPostDueWhatsAppParams(POST);
    expect(p1).toContain('3');
  });

  it('first param contains Swedish category label', () => {
    const [p1] = formatPostDueWhatsAppParams(POST);
    expect(p1).toContain('Tips');
  });

  it('second param contains the post title', () => {
    const [, p2] = formatPostDueWhatsAppParams(POST);
    expect(p2).toContain('YKB — Veckans tips');
  });

  it('third param contains the full post text for short posts', () => {
    const [,, p3] = formatPostDueWhatsAppParams(POST);
    expect(p3).toBe(POST.post_text);
  });

  it('truncates post text longer than 850 chars with ellipsis', () => {
    const longText = 'A'.repeat(900);
    const [,, p3] = formatPostDueWhatsAppParams({ ...POST, post_text: longText });
    expect(p3.length).toBeLessThanOrEqual(850);
    expect(p3.endsWith('...')).toBe(true);
  });

  it('does not truncate text exactly 850 chars', () => {
    const exactText = 'B'.repeat(850);
    const [,, p3] = formatPostDueWhatsAppParams({ ...POST, post_text: exactText });
    expect(p3).toBe(exactText);
  });

  it('does not contain driver PII patterns', () => {
    const params = formatPostDueWhatsAppParams(POST).join('');
    expect(params).not.toMatch(/\+46\d{8,}/);
    expect(params).not.toMatch(/07\d{8}/);
  });

  it('uses raw category as fallback for unknown categories', () => {
    const [p1] = formatPostDueWhatsAppParams({ ...POST, category: 'unknown_category' });
    expect(p1).toContain('unknown_category');
  });
});

// ─── notifyFounderWhatsApp — gate / config ────────────────────────────────────

describe('notifyFounderWhatsApp — gate', () => {
  beforeEach(() => {
    mockWASend.mockReset();
    mockWACount.mockReset();
    clearEnv();
  });

  it('returns dry_run: true when FOUNDER_WHATSAPP_ENABLED is not set', async () => {
    const result = await notifyFounderWhatsApp(POST);
    expect(result.sent).toBe(false);
    expect(result.dry_run).toBe(true);
    expect(mockWASend).not.toHaveBeenCalled();
  });

  it('returns dry_run: true when FOUNDER_WHATSAPP_ENABLED=false', async () => {
    process.env.FOUNDER_WHATSAPP_ENABLED = 'false';
    const result = await notifyFounderWhatsApp(POST);
    expect(result.dry_run).toBe(true);
    expect(mockWASend).not.toHaveBeenCalled();
  });

  it('returns error when WHATSAPP_FOUNDER_PHONE is not configured', async () => {
    process.env.FOUNDER_WHATSAPP_ENABLED = 'true';
    // getWhatsAppFounderPhone mock returns '' for missing phone
    const { getWhatsAppFounderPhone } = await import('../lib/whatsappClient');
    vi.mocked(getWhatsAppFounderPhone).mockReturnValueOnce('');
    const result = await notifyFounderWhatsApp(POST);
    expect(result.sent).toBe(false);
    expect(result.dry_run).toBe(false);
    expect(result.error).toContain('WHATSAPP_FOUNDER_PHONE');
  });
});

// ─── notifyFounderWhatsApp — rate limit ───────────────────────────────────────

describe('notifyFounderWhatsApp — rate limit', () => {
  beforeEach(() => {
    mockWASend.mockReset();
    mockWACount.mockReset();
    process.env.FOUNDER_WHATSAPP_ENABLED = 'true';
  });
  afterEach(clearEnv);

  it('returns error when today count >= max daily', async () => {
    mockWACount.mockResolvedValueOnce(10); // 10 >= 10 (default max)
    const result = await notifyFounderWhatsApp(POST);
    expect(result.sent).toBe(false);
    expect(result.error).toContain('rate limit');
    expect(mockWASend).not.toHaveBeenCalled();
  });

  it('allows send when today count is below max', async () => {
    mockWACount.mockResolvedValueOnce(9); // 9 < 10
    mockWASend.mockResolvedValueOnce({ success: true, message_id: 'wamid.x', dry_run: false, error: null });
    const result = await notifyFounderWhatsApp(POST);
    expect(mockWASend).toHaveBeenCalledOnce();
    expect(result.sent).toBe(true);
  });

  it('includes count and max in the rate-limit error', async () => {
    mockWACount.mockResolvedValueOnce(10);
    const result = await notifyFounderWhatsApp(POST);
    expect(result.error).toContain('10/10');
  });
});

// ─── notifyFounderWhatsApp — success ─────────────────────────────────────────

describe('notifyFounderWhatsApp — success', () => {
  beforeEach(() => {
    mockWASend.mockReset();
    mockWACount.mockReset();
    mockWACount.mockResolvedValue(0);
    process.env.FOUNDER_WHATSAPP_ENABLED = 'true';
  });
  afterEach(clearEnv);

  it('returns { sent: true } when sendWhatsAppTemplate reports success', async () => {
    mockWASend.mockResolvedValue({ success: true, message_id: 'wamid.abc', dry_run: false, error: null });
    const result = await notifyFounderWhatsApp(POST);
    expect(result.sent).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(result.error).toBeNull();
  });

  it('calls sendWhatsAppTemplate with the founder phone number', async () => {
    mockWASend.mockResolvedValue({ success: true, message_id: 'wamid.x', dry_run: false, error: null });
    await notifyFounderWhatsApp(POST);
    expect(mockWASend).toHaveBeenCalledOnce();
    const call = mockWASend.mock.calls[0]![0];
    expect(call.to).toBe('46700000001');
  });

  it('calls sendWhatsAppTemplate with template name and language from env', async () => {
    mockWASend.mockResolvedValue({ success: true, message_id: 'x', dry_run: false, error: null });
    await notifyFounderWhatsApp(POST);
    const call = mockWASend.mock.calls[0]![0];
    expect(call.template_name).toBe('logistikklubb_post_due');
    expect(call.language).toBe('sv');
  });

  it('includes day number in body_params', async () => {
    mockWASend.mockResolvedValue({ success: true, message_id: 'x', dry_run: false, error: null });
    await notifyFounderWhatsApp(POST);
    const call = mockWASend.mock.calls[0]![0];
    expect(call.body_params.join(' ')).toContain('3');
  });

  it('includes post title in body_params', async () => {
    mockWASend.mockResolvedValue({ success: true, message_id: 'x', dry_run: false, error: null });
    await notifyFounderWhatsApp(POST);
    const call = mockWASend.mock.calls[0]![0];
    expect(call.body_params.join(' ')).toContain('YKB — Veckans tips');
  });

  it('includes post text in body_params', async () => {
    mockWASend.mockResolvedValue({ success: true, message_id: 'x', dry_run: false, error: null });
    await notifyFounderWhatsApp(POST);
    const call = mockWASend.mock.calls[0]![0];
    expect(call.body_params.join(' ')).toContain('YKB och kontroller');
  });
});

// ─── notifyFounderWhatsApp — SMTP/WA error passthrough ───────────────────────

describe('notifyFounderWhatsApp — error passthrough', () => {
  beforeEach(() => {
    mockWASend.mockReset();
    mockWACount.mockResolvedValue(0);
    process.env.FOUNDER_WHATSAPP_ENABLED = 'true';
  });
  afterEach(clearEnv);

  it('returns { sent: false, dry_run: true } when sendWhatsAppTemplate returns dry_run', async () => {
    mockWASend.mockResolvedValue({ success: false, message_id: null, dry_run: true, error: 'not configured' });
    const result = await notifyFounderWhatsApp(POST);
    expect(result.sent).toBe(false);
    expect(result.dry_run).toBe(true);
  });

  it('returns { sent: false, error } when sendWhatsAppTemplate returns failure', async () => {
    mockWASend.mockResolvedValue({ success: false, message_id: null, dry_run: false, error: 'Meta API HTTP 401' });
    const result = await notifyFounderWhatsApp(POST);
    expect(result.sent).toBe(false);
    expect(result.error).toContain('Meta API HTTP 401');
  });

  it('uses fallback error message when sendWhatsAppTemplate returns null error', async () => {
    mockWASend.mockResolvedValue({ success: false, message_id: null, dry_run: false, error: null });
    const result = await notifyFounderWhatsApp(POST);
    expect(result.error).toBe('WhatsApp send failed');
  });
});

// ─── notifyFounderWhatsApp — never throws ────────────────────────────────────

describe('notifyFounderWhatsApp — never throws', () => {
  beforeEach(() => {
    mockWASend.mockReset();
    mockWACount.mockResolvedValue(0);
    process.env.FOUNDER_WHATSAPP_ENABLED = 'true';
  });
  afterEach(clearEnv);

  it('catches and returns error when sendWhatsAppTemplate throws', async () => {
    mockWASend.mockRejectedValue(new Error('Connection refused'));
    const result = await notifyFounderWhatsApp(POST);
    expect(result.sent).toBe(false);
    expect(result.error).toContain('Connection refused');
  });

  it('does not throw even when sendWhatsAppTemplate throws a non-Error', async () => {
    mockWASend.mockRejectedValue('network down');
    const result = await notifyFounderWhatsApp(POST);
    expect(result.sent).toBe(false);
    expect(result.error).toBe('network down');
  });

  it('cron markPostDue is independent — this function returning error never breaks due-processing', async () => {
    mockWASend.mockRejectedValue(new Error('Timeout'));
    const result = await notifyFounderWhatsApp(POST);
    expect(result).toMatchObject({ sent: false, error: expect.stringContaining('Timeout') });
  });
});

// ─── message_id propagation ───────────────────────────────────────────────────

describe('notifyFounderPostDue — message_id propagation', () => {
  beforeEach(() => {
    mockSend.mockReset();
    setEnv();
  });
  afterEach(clearEnv);

  it('propagates message_id from SMTP success result', async () => {
    mockSend.mockResolvedValue(SMTP_SUCCESS);
    const result = await notifyFounderPostDue(POST);
    expect(result.message_id).toBe('msg-xyz');
  });

  it('returns message_id: null on SMTP failure', async () => {
    mockSend.mockResolvedValue(SMTP_FAIL);
    const result = await notifyFounderPostDue(POST);
    expect(result.message_id).toBeNull();
  });

  it('returns message_id: null on dry_run', async () => {
    mockSend.mockResolvedValue(SMTP_DRY_RUN);
    const result = await notifyFounderPostDue(POST);
    expect(result.message_id).toBeNull();
  });

  it('returns message_id: null when email not configured', async () => {
    process.env.FOUNDER_NOTIFICATION_EMAIL = '';
    const result = await notifyFounderPostDue(POST);
    expect(result.message_id).toBeNull();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns message_id: null when SMTP throws', async () => {
    mockSend.mockRejectedValue(new Error('Timeout'));
    const result = await notifyFounderPostDue(POST);
    expect(result.message_id).toBeNull();
  });
});

describe('notifyFounderWhatsApp — message_id propagation', () => {
  beforeEach(() => {
    mockWASend.mockReset();
    mockWACount.mockResolvedValue(0);
    process.env.FOUNDER_WHATSAPP_ENABLED = 'true';
  });
  afterEach(clearEnv);

  it('propagates message_id from successful WhatsApp send', async () => {
    mockWASend.mockResolvedValue({ success: true, message_id: 'wamid.abc123', dry_run: false, error: null });
    const result = await notifyFounderWhatsApp(POST);
    expect(result.message_id).toBe('wamid.abc123');
  });

  it('returns message_id: null when sendWhatsAppTemplate returns failure', async () => {
    mockWASend.mockResolvedValue({ success: false, message_id: null, dry_run: false, error: 'error' });
    const result = await notifyFounderWhatsApp(POST);
    expect(result.message_id).toBeNull();
  });

  it('returns message_id: null on dry_run from sendWhatsAppTemplate', async () => {
    mockWASend.mockResolvedValue({ success: false, message_id: null, dry_run: true, error: 'not configured' });
    const result = await notifyFounderWhatsApp(POST);
    expect(result.message_id).toBeNull();
  });

  it('returns message_id: null when FOUNDER_WHATSAPP_ENABLED gate fires (outer dry_run)', async () => {
    process.env.FOUNDER_WHATSAPP_ENABLED = 'false';
    const result = await notifyFounderWhatsApp(POST);
    expect(result.dry_run).toBe(true);
    expect(result.message_id).toBeNull();
  });

  it('returns message_id: null when rate limit blocks send', async () => {
    mockWACount.mockResolvedValueOnce(10);
    const result = await notifyFounderWhatsApp(POST);
    expect(result.sent).toBe(false);
    expect(result.message_id).toBeNull();
  });

  it('returns message_id: null when sendWhatsAppTemplate throws', async () => {
    mockWASend.mockRejectedValue(new Error('Network failure'));
    const result = await notifyFounderWhatsApp(POST);
    expect(result.message_id).toBeNull();
  });
});

// ─── Channel independence ─────────────────────────────────────────────────────

describe('email and WhatsApp channels are independent', () => {
  it('notifyFounderPostDue does not call sendWhatsAppTemplate', async () => {
    setEnv();
    mockSend.mockResolvedValue({ success: true, message_id: 'smtp-id', dry_run: false, error: null });
    mockWASend.mockReset();
    await notifyFounderPostDue(POST);
    expect(mockWASend).not.toHaveBeenCalled();
    clearEnv();
  });

  it('notifyFounderWhatsApp does not call sendEmailViaSmtp', async () => {
    process.env.FOUNDER_WHATSAPP_ENABLED = 'true';
    mockWACount.mockResolvedValue(0);
    mockWASend.mockResolvedValue({ success: true, message_id: 'wamid.x', dry_run: false, error: null });
    mockSend.mockReset();
    await notifyFounderWhatsApp(POST);
    expect(mockSend).not.toHaveBeenCalled();
    clearEnv();
  });

  it('WhatsApp gate does not affect the email gate', () => {
    process.env.FOUNDER_NOTIFICATIONS_ENABLED = 'true';
    process.env.FOUNDER_WHATSAPP_ENABLED      = 'false';
    expect(isFounderNotificationsEnabled()).toBe(true);
    expect(isFounderWhatsAppEnabled()).toBe(false);
    clearEnv();
  });
});
