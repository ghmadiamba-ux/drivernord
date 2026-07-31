import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock is hoisted above all imports — factory must be self-contained (no outer variable refs)
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn() },
}));

import nodemailer from 'nodemailer';
import {
  isSmtpConfigured,
  getSmtpFromEmail,
  getSmtpFromName,
  sendEmailViaSmtp,
} from '../lib/smtpMailClient';
import type { SmtpSendInput } from '../lib/smtpMailClient';

// ─── Typed references to mocked functions ────────────────────────────────────

const mockCreateTransport = vi.mocked(nodemailer.createTransport);
let mockSendMail: ReturnType<typeof vi.fn>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const INPUT: SmtpSendInput = {
  to:         'recipient@example.com',
  subject:    'Test Subject',
  body:       'Test body text.',
  from_email: 'hej@drivernord.com',
  from_name:  'DriverNord',
};

function setSmtpPassword(value: string | undefined) {
  if (value === undefined) delete process.env.ZOHO_SMTP_PASSWORD;
  else process.env.ZOHO_SMTP_PASSWORD = value;
}

beforeEach(() => {
  mockSendMail = vi.fn();
  mockCreateTransport.mockClear();
  mockCreateTransport.mockReturnValue({ sendMail: mockSendMail } as ReturnType<typeof nodemailer.createTransport>);
});

// ─── isSmtpConfigured ────────────────────────────────────────────────────────

describe('isSmtpConfigured', () => {
  afterEach(() => setSmtpPassword(undefined));

  it('returns false when ZOHO_SMTP_PASSWORD is not set', () => {
    setSmtpPassword(undefined);
    expect(isSmtpConfigured()).toBe(false);
  });

  it('returns true when ZOHO_SMTP_PASSWORD is set', () => {
    setSmtpPassword('some-app-password');
    expect(isSmtpConfigured()).toBe(true);
  });

  it('returns false for empty string', () => {
    setSmtpPassword('');
    expect(isSmtpConfigured()).toBe(false);
  });
});

// ─── getSmtpFromEmail ─────────────────────────────────────────────────────────

describe('getSmtpFromEmail', () => {
  afterEach(() => { delete process.env.ZOHO_FROM_EMAIL; });

  it('returns default hej@drivernord.com when env var not set', () => {
    delete process.env.ZOHO_FROM_EMAIL;
    expect(getSmtpFromEmail()).toBe('hej@drivernord.com');
  });

  it('returns configured email when ZOHO_FROM_EMAIL is set', () => {
    process.env.ZOHO_FROM_EMAIL = 'custom@drivernord.com';
    expect(getSmtpFromEmail()).toBe('custom@drivernord.com');
  });
});

// ─── getSmtpFromName ──────────────────────────────────────────────────────────

describe('getSmtpFromName', () => {
  afterEach(() => { delete process.env.ZOHO_FROM_NAME; });

  it('returns default "DriverNord" when env var not set', () => {
    delete process.env.ZOHO_FROM_NAME;
    expect(getSmtpFromName()).toBe('DriverNord');
  });

  it('returns configured name when ZOHO_FROM_NAME is set', () => {
    process.env.ZOHO_FROM_NAME = 'DriverNord System';
    expect(getSmtpFromName()).toBe('DriverNord System');
  });
});

// ─── sendEmailViaSmtp — dry_run ───────────────────────────────────────────────

describe('sendEmailViaSmtp — dry_run (no SMTP password)', () => {
  beforeEach(() => setSmtpPassword(undefined));
  afterEach(() => setSmtpPassword(undefined));

  it('returns dry_run: true when ZOHO_SMTP_PASSWORD not set', async () => {
    const result = await sendEmailViaSmtp(INPUT);
    expect(result.dry_run).toBe(true);
    expect(result.success).toBe(false);
    expect(result.message_id).toBeNull();
  });

  it('returns an informative error message in dry_run mode', async () => {
    const result = await sendEmailViaSmtp(INPUT);
    expect(result.error).toContain('ZOHO_SMTP_PASSWORD');
    expect(result.error).toContain('dry_run');
  });

  it('does not call nodemailer.createTransport in dry_run mode', async () => {
    await sendEmailViaSmtp(INPUT);
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });
});

// ─── sendEmailViaSmtp — success ───────────────────────────────────────────────

describe('sendEmailViaSmtp — success', () => {
  beforeEach(() => setSmtpPassword('test-app-password-123'));
  afterEach(() => setSmtpPassword(undefined));

  it('returns success: true when nodemailer sendMail resolves', async () => {
    mockSendMail.mockResolvedValue({ messageId: '<msg-001@zoho.eu>' });
    const result = await sendEmailViaSmtp(INPUT);
    expect(result.success).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(result.error).toBeNull();
  });

  it('returns the message_id from nodemailer info.messageId', async () => {
    mockSendMail.mockResolvedValue({ messageId: '<msg-abc@zoho.eu>' });
    const result = await sendEmailViaSmtp(INPUT);
    expect(result.message_id).toBe('<msg-abc@zoho.eu>');
  });

  it('returns message_id: null when nodemailer info.messageId is absent', async () => {
    mockSendMail.mockResolvedValue({});
    const result = await sendEmailViaSmtp(INPUT);
    expect(result.message_id).toBeNull();
  });

  it('calls createTransport with Zoho EU SMTP host and port 587', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'x' });
    await sendEmailViaSmtp(INPUT);
    expect(mockCreateTransport).toHaveBeenCalledOnce();
    const config = mockCreateTransport.mock.calls[0]![0] as Record<string, unknown>;
    expect(config['host']).toBe('smtppro.zoho.eu');
    expect(config['port']).toBe(587);
    expect(config['secure']).toBe(false);
  });

  it('passes the from_email as SMTP auth user', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'x' });
    await sendEmailViaSmtp(INPUT);
    const config = mockCreateTransport.mock.calls[0]![0] as Record<string, unknown>;
    expect((config['auth'] as Record<string, unknown>)['user']).toBe('hej@drivernord.com');
  });

  it('passes ZOHO_SMTP_PASSWORD as SMTP auth pass', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'x' });
    await sendEmailViaSmtp(INPUT);
    const config = mockCreateTransport.mock.calls[0]![0] as Record<string, unknown>;
    expect((config['auth'] as Record<string, unknown>)['pass']).toBe('test-app-password-123');
  });

  it('calls sendMail with correct to/subject/text fields', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'x' });
    await sendEmailViaSmtp(INPUT);
    const mail = mockSendMail.mock.calls[0]![0] as Record<string, unknown>;
    expect(mail['to']).toBe('recipient@example.com');
    expect(mail['subject']).toBe('Test Subject');
    expect(mail['text']).toBe('Test body text.');
  });

  it('wraps from_name and from_email in the "Name <email>" format', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'x' });
    await sendEmailViaSmtp(INPUT);
    const mail = mockSendMail.mock.calls[0]![0] as Record<string, unknown>;
    expect(mail['from'] as string).toContain('DriverNord');
    expect(mail['from'] as string).toContain('hej@drivernord.com');
  });
});

// ─── sendEmailViaSmtp — failure / never-throws ────────────────────────────────

describe('sendEmailViaSmtp — failure', () => {
  beforeEach(() => setSmtpPassword('test-app-password-123'));
  afterEach(() => setSmtpPassword(undefined));

  it('returns success: false when nodemailer throws an Error', async () => {
    mockSendMail.mockRejectedValue(new Error('Connection refused'));
    const result = await sendEmailViaSmtp(INPUT);
    expect(result.success).toBe(false);
    expect(result.dry_run).toBe(false);
    expect(result.error).toContain('Connection refused');
  });

  it('returns error as string when nodemailer throws a non-Error', async () => {
    mockSendMail.mockRejectedValue('network down');
    const result = await sendEmailViaSmtp(INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toBe('network down');
  });

  it('never throws — always returns a result object', async () => {
    mockSendMail.mockRejectedValue(new Error('Auth failed'));
    await expect(sendEmailViaSmtp(INPUT)).resolves.toMatchObject({
      success: false,
      error:   expect.stringContaining('Auth failed'),
    });
  });

  it('returns message_id: null on failure', async () => {
    mockSendMail.mockRejectedValue(new Error('Timeout'));
    const result = await sendEmailViaSmtp(INPUT);
    expect(result.message_id).toBeNull();
  });
});
