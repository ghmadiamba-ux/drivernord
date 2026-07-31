import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ZohoSendInput } from '../lib/zohoMailClient';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setEnv(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string> = {
    ZOHO_CLIENT_ID:     'test-client-id',
    ZOHO_CLIENT_SECRET: 'test-client-secret',
    ZOHO_REFRESH_TOKEN: 'test-refresh-token',
    ZOHO_ACCOUNT_ID:    '123456789',
    ZOHO_FROM_EMAIL:    'hej@drivernord.com',
    ZOHO_FROM_NAME:     'Ghislain Alexander Mad',
    ...overrides,
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

function clearZohoEnv() {
  for (const k of [
    'ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN',
    'ZOHO_ACCOUNT_ID', 'ZOHO_FROM_EMAIL', 'ZOHO_FROM_NAME',
  ]) {
    delete process.env[k];
  }
}

const MOCK_ACCESS_TOKEN = 'mock-access-token-xyz';

function mockOAuthSuccess() {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ access_token: MOCK_ACCESS_TOKEN, token_type: 'Bearer' }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function mockSendSuccess(messageId = 'msg-abc-123') {
  return vi.fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: MOCK_ACCESS_TOKEN }), { status: 200 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { messageId } }), { status: 200 }),
    );
}

const SEND_INPUT: ZohoSendInput = {
  to:         'recipient@example.se',
  subject:    'CE-chaufförer för distribution',
  body:       'Hej,\n\nDriverNord arbetar med matchning av yrkesförare.\n\nMed vänliga hälsningar,\nGhislain Alexander Mad',
  from_email: 'hej@drivernord.com',
  from_name:  'Ghislain Alexander Mad',
};

// ── isZohoConfigured ──────────────────────────────────────────────────────────

describe('isZohoConfigured', () => {
  afterEach(clearZohoEnv);

  it('returns false when no env vars are set', async () => {
    const { isZohoConfigured } = await import('../lib/zohoMailClient');
    expect(isZohoConfigured()).toBe(false);
  });

  it('returns false when only some env vars are set', async () => {
    process.env.ZOHO_CLIENT_ID = 'abc';
    process.env.ZOHO_CLIENT_SECRET = 'def';
    const { isZohoConfigured } = await import('../lib/zohoMailClient');
    expect(isZohoConfigured()).toBe(false);
  });

  it('returns true when all four required vars are set', async () => {
    setEnv();
    const { isZohoConfigured } = await import('../lib/zohoMailClient');
    expect(isZohoConfigured()).toBe(true);
  });
});

// ── getZohoFromEmail / getZohoFromName ────────────────────────────────────────

describe('getZohoFromEmail / getZohoFromName', () => {
  afterEach(clearZohoEnv);

  it('returns defaults when env vars are not set', async () => {
    const { getZohoFromEmail, getZohoFromName } = await import('../lib/zohoMailClient');
    expect(getZohoFromEmail()).toBe('hej@drivernord.com');
    expect(getZohoFromName()).toBe('Ghislain Alexander Mad');
  });

  it('returns env var values when set', async () => {
    setEnv({ ZOHO_FROM_EMAIL: 'custom@drivernord.com', ZOHO_FROM_NAME: 'Ghislain Alexander Mad' });
    const { getZohoFromEmail, getZohoFromName } = await import('../lib/zohoMailClient');
    expect(getZohoFromEmail()).toBe('custom@drivernord.com');
    expect(getZohoFromName()).toBe('Ghislain Alexander Mad');
  });

  it('from name is never Adam', async () => {
    const { getZohoFromName } = await import('../lib/zohoMailClient');
    expect(getZohoFromName()).not.toContain('Adam');
    expect(getZohoFromName()).not.toBe('Adam');
  });
});

// ── sendEmailViaZoho — not configured ─────────────────────────────────────────

describe('sendEmailViaZoho — not configured', () => {
  beforeEach(clearZohoEnv);
  afterEach(clearZohoEnv);

  it('returns dry_run=true when Zoho is not configured', async () => {
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    const result = await sendEmailViaZoho(SEND_INPUT);
    expect(result.dry_run).toBe(true);
    expect(result.success).toBe(false);
    expect(result.message_id).toBeNull();
    expect(result.error).toMatch(/not configured/i);
  });

  it('does not call fetch when not configured', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    await sendEmailViaZoho(SEND_INPUT);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

// ── sendEmailViaZoho — configured, happy path ─────────────────────────────────

describe('sendEmailViaZoho — configured and mocked', () => {
  beforeEach(() => setEnv());
  afterEach(() => {
    clearZohoEnv();
    vi.restoreAllMocks();
  });

  it('returns success with message_id on happy path', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(mockSendSuccess('msg-test-001'));
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    const result = await sendEmailViaZoho(SEND_INPUT);
    expect(result.success).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(result.message_id).toBe('msg-test-001');
    expect(result.error).toBeNull();
  });

  it('sends OAuth refresh token request first', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockSendSuccess());
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    await sendEmailViaZoho(SEND_INPUT);
    const firstCall = fetchSpy.mock.calls[0];
    expect(firstCall[0]).toContain('accounts.zoho.eu/oauth/v2/token');
    expect((firstCall[1] as RequestInit)?.method).toBe('POST');
  });

  it('sends email to Zoho Mail API with correct payload', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockSendSuccess());
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    await sendEmailViaZoho(SEND_INPUT);
    const secondCall = fetchSpy.mock.calls[1];
    expect(secondCall[0]).toContain('mail.zoho.eu/api/accounts/123456789/messages');
    const body = JSON.parse((secondCall[1] as RequestInit)?.body as string);
    expect(body.toAddress).toBe('recipient@example.se');
    expect(body.fromAddress).toBe('hej@drivernord.com');
    expect(body.subject).toBe('CE-chaufförer för distribution');
    expect(body.mailFormat).toBe('plaintext');
  });

  it('uses correct Authorization header format', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockSendSuccess());
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    await sendEmailViaZoho(SEND_INPUT);
    const secondCall = fetchSpy.mock.calls[1];
    const headers = (secondCall[1] as RequestInit)?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Zoho-oauthtoken ${MOCK_ACCESS_TOKEN}`);
  });

  it('includes inReplyTo when in_reply_to is provided', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockSendSuccess());
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    await sendEmailViaZoho({ ...SEND_INPUT, in_reply_to: 'original-msg-id' });
    const secondCall = fetchSpy.mock.calls[1];
    const body = JSON.parse((secondCall[1] as RequestInit)?.body as string);
    expect(body.inReplyTo).toBe('original-msg-id');
  });
});

// ── sendEmailViaZoho — error handling ────────────────────────────────────────

describe('sendEmailViaZoho — error handling', () => {
  beforeEach(() => setEnv());
  afterEach(() => {
    clearZohoEnv();
    vi.restoreAllMocks();
  });

  it('returns error result when OAuth token refresh fails (non-2xx)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('invalid_client', { status: 400 }),
    );
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    const result = await sendEmailViaZoho(SEND_INPUT);
    expect(result.success).toBe(false);
    expect(result.dry_run).toBe(false);
    expect(result.error).toMatch(/OAuth token refresh failed/i);
  });

  it('returns error result when OAuth returns no access_token', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 200 }),
    );
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    const result = await sendEmailViaZoho(SEND_INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no access_token/i);
  });

  it('returns error result when Zoho send returns non-2xx', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: MOCK_ACCESS_TOKEN }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response('Rate limit exceeded', { status: 429 }),
      );
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    const result = await sendEmailViaZoho(SEND_INPUT);
    expect(result.success).toBe(false);
    expect(result.dry_run).toBe(false);
    expect(result.error).toMatch(/HTTP 429/);
  });

  it('returns error result when fetch throws (network error)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'));
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    const result = await sendEmailViaZoho(SEND_INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Network failure/);
  });

  it('handles missing messageId in response (success=true, message_id=null)', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: MOCK_ACCESS_TOKEN }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: {} }), { status: 200 }),
      );
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    const result = await sendEmailViaZoho(SEND_INPUT);
    expect(result.success).toBe(true);
    expect(result.message_id).toBeNull();
  });
});

// ── readInboxReplies ──────────────────────────────────────────────────────────

describe('readInboxReplies — not configured', () => {
  beforeEach(clearZohoEnv);
  afterEach(clearZohoEnv);

  it('returns empty array when not configured', async () => {
    const { readInboxReplies } = await import('../lib/zohoMailClient');
    const result = await readInboxReplies();
    expect(result).toEqual([]);
  });

  it('does not call fetch when not configured', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { readInboxReplies } = await import('../lib/zohoMailClient');
    await readInboxReplies();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('readInboxReplies — configured and mocked', () => {
  beforeEach(() => setEnv());
  afterEach(() => {
    clearZohoEnv();
    vi.restoreAllMocks();
  });

  it('returns mapped messages from Zoho API response', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: MOCK_ACCESS_TOKEN }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: [
            {
              messageId:    'reply-msg-001',
              fromAddress:  'contact@company.se',
              subject:      'Re: CE-chaufförer',
              summary:      'Tack för mejlet, vi är intresserade',
              receivedTime: '1716800000000',
              inReplyTo:    'sent-msg-abc',
              threadId:     'thread-xyz',
            },
          ],
        }), { status: 200 }),
      );
    const { readInboxReplies } = await import('../lib/zohoMailClient');
    const result = await readInboxReplies();
    expect(result).toHaveLength(1);
    expect(result[0].message_id).toBe('reply-msg-001');
    expect(result[0].from).toBe('contact@company.se');
    expect(result[0].subject).toBe('Re: CE-chaufförer');
    expect(result[0].in_reply_to).toBe('sent-msg-abc');
    expect(result[0].thread_id).toBe('thread-xyz');
  });

  it('returns empty array when Zoho returns non-2xx', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: MOCK_ACCESS_TOKEN }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));
    const { readInboxReplies } = await import('../lib/zohoMailClient');
    const result = await readInboxReplies();
    expect(result).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const { readInboxReplies } = await import('../lib/zohoMailClient');
    const result = await readInboxReplies();
    expect(result).toEqual([]);
  });

  it('passes since parameter as receivedTime in query string', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: MOCK_ACCESS_TOKEN }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      );
    const { readInboxReplies } = await import('../lib/zohoMailClient');
    await readInboxReplies('2026-05-22T00:00:00Z');
    const secondCall = fetchSpy.mock.calls[1];
    expect(secondCall[0]).toContain('receivedTime=');
  });

  it('requests INBOX folder', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: MOCK_ACCESS_TOKEN }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      );
    const { readInboxReplies } = await import('../lib/zohoMailClient');
    await readInboxReplies();
    const secondCall = fetchSpy.mock.calls[1];
    expect(secondCall[0]).toContain('folder=INBOX');
  });
});

// ── isReplyToSentEmail ────────────────────────────────────────────────────────

describe('isReplyToSentEmail', () => {
  it('matches on in_reply_to', async () => {
    const { isReplyToSentEmail } = await import('../lib/zohoMailClient');
    expect(isReplyToSentEmail(
      { message_id: 'r1', from: '', subject: '', body_text: '', received_at: '', in_reply_to: 'sent-001', thread_id: null },
      'sent-001',
    )).toBe(true);
  });

  it('matches on thread_id', async () => {
    const { isReplyToSentEmail } = await import('../lib/zohoMailClient');
    expect(isReplyToSentEmail(
      { message_id: 'r1', from: '', subject: '', body_text: '', received_at: '', in_reply_to: null, thread_id: 'sent-001' },
      'sent-001',
    )).toBe(true);
  });

  it('returns false when neither matches', async () => {
    const { isReplyToSentEmail } = await import('../lib/zohoMailClient');
    expect(isReplyToSentEmail(
      { message_id: 'r1', from: '', subject: '', body_text: '', received_at: '', in_reply_to: 'other', thread_id: 'other2' },
      'sent-001',
    )).toBe(false);
  });
});

// ── Safety: email body never contains forbidden content ───────────────────────

describe('sendEmailViaZoho — body passthrough (no injection)', () => {
  beforeEach(() => setEnv());
  afterEach(() => {
    clearZohoEnv();
    vi.restoreAllMocks();
  });

  it('passes the body verbatim — forbidden word detection is caller responsibility', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockSendSuccess());
    const { sendEmailViaZoho } = await import('../lib/zohoMailClient');
    const bodyWithGhislain = 'Ghislain Alexander Mad\nDriverNord\nhej@drivernord.com';
    await sendEmailViaZoho({ ...SEND_INPUT, body: bodyWithGhislain });
    const secondCall = fetchSpy.mock.calls[1];
    const body = JSON.parse((secondCall[1] as RequestInit)?.body as string);
    expect(body.content).toBe(bodyWithGhislain);
  });
});
