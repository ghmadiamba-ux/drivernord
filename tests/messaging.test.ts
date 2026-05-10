import { describe, it, expect, vi, afterEach } from 'vitest';
import { getMessagingProvider } from '../lib/messaging';
import { simulatedProvider } from '../lib/messaging/simulatedProvider';
import { createSmsProvider } from '../lib/messaging/smsProvider';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ─── getMessagingProvider ─────────────────────────────────────────────────────

describe('getMessagingProvider', () => {
  it('returns simulated provider when SMS_PROVIDER is not set', () => {
    const provider = getMessagingProvider();
    expect(provider.channel).toBe('simulated');
  });

  it('returns SMS provider when SMS_PROVIDER is set', () => {
    vi.stubEnv('SMS_PROVIDER', '46elks');
    const provider = getMessagingProvider();
    expect(provider.channel).toBe('sms');
  });

  it('returns simulated provider when SMS_PROVIDER is empty string', () => {
    vi.stubEnv('SMS_PROVIDER', '');
    const provider = getMessagingProvider();
    expect(provider.channel).toBe('simulated');
  });
});

// ─── simulatedProvider ────────────────────────────────────────────────────────

describe('simulatedProvider', () => {
  it('always returns ok:true', async () => {
    const result = await simulatedProvider.sendMessage({ to: '+46700000001', body: 'Hej!' });
    expect(result.ok).toBe(true);
  });

  it('returns channel=simulated', async () => {
    const result = await simulatedProvider.sendMessage({ to: '+46700000001', body: 'Hej!' });
    expect(result.channel).toBe('simulated');
  });

  it('never throws even with empty body', async () => {
    await expect(simulatedProvider.sendMessage({ to: '+46700000001', body: '' }))
      .resolves.toBeDefined();
  });
});

// ─── createSmsProvider — missing credentials ──────────────────────────────────

describe('createSmsProvider — missing credentials', () => {
  it('returns failed result when all credentials are missing', async () => {
    vi.stubEnv('SMS_PROVIDER', '46elks');
    // SMS_API_KEY, SMS_API_SECRET, SMS_FROM_NUMBER not set
    const provider = createSmsProvider();
    const result   = await provider.sendMessage({ to: '+46700000001', body: 'test' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_credentials');
    expect(result.channel).toBe('sms');
  });

  it('returns failed result when SMS_API_SECRET is missing', async () => {
    vi.stubEnv('SMS_PROVIDER', '46elks');
    vi.stubEnv('SMS_API_KEY', 'mykey');
    vi.stubEnv('SMS_FROM_NUMBER', '+46700000000');
    const provider = createSmsProvider();
    const result   = await provider.sendMessage({ to: '+46700000001', body: 'test' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_credentials');
  });

  it('returns failed result for unknown provider name', async () => {
    vi.stubEnv('SMS_PROVIDER', 'unknown-provider');
    vi.stubEnv('SMS_API_KEY', 'key');
    vi.stubEnv('SMS_API_SECRET', 'secret');
    vi.stubEnv('SMS_FROM_NUMBER', '+46700000000');
    const provider = createSmsProvider();
    const result   = await provider.sendMessage({ to: '+46700000001', body: 'test' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('unknown_provider');
    expect(result.channel).toBe('sms');
  });

  it('does not throw when fetch fails — returns failed result', async () => {
    vi.stubEnv('SMS_PROVIDER', '46elks');
    vi.stubEnv('SMS_API_KEY', 'key');
    vi.stubEnv('SMS_API_SECRET', 'secret');
    vi.stubEnv('SMS_FROM_NUMBER', '+46700000000');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const provider = createSmsProvider();
    const result   = await provider.sendMessage({ to: '+46700000001', body: 'test' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('network error');
    expect(result.channel).toBe('sms');
  });
});

// ─── createSmsProvider — 46elks ───────────────────────────────────────────────

describe('createSmsProvider — 46elks', () => {
  function stubCredentials() {
    vi.stubEnv('SMS_PROVIDER', '46elks');
    vi.stubEnv('SMS_API_KEY', 'mykey');
    vi.stubEnv('SMS_API_SECRET', 'mysecret');
    vi.stubEnv('SMS_FROM_NUMBER', '+46700000000');
  }

  it('returns ok:true and messageId on successful send', async () => {
    stubCredentials();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:   true,
      json: () => Promise.resolve({ id: 'msg-abc123' }),
    }));

    const provider = createSmsProvider();
    const result   = await provider.sendMessage({ to: '+46700000001', body: 'Hej!' });
    expect(result.ok).toBe(true);
    expect(result.channel).toBe('sms');
    expect(result.messageId).toBe('msg-abc123');
  });

  it('calls the 46elks SMS endpoint', async () => {
    stubCredentials();
    const mockFetch = vi.fn().mockResolvedValue({
      ok:   true,
      json: () => Promise.resolve({ id: 'msg-1' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = createSmsProvider();
    await provider.sendMessage({ to: '+46700000001', body: 'Hej!' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.46elks.com/a1/sms',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends Authorization header using Basic auth', async () => {
    stubCredentials();
    const mockFetch = vi.fn().mockResolvedValue({
      ok:   true,
      json: () => Promise.resolve({ id: 'msg-1' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = createSmsProvider();
    await provider.sendMessage({ to: '+46700000001', body: 'Hej!' });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toMatch(/^Basic /);
  });

  it('returns failed result on HTTP 401', async () => {
    stubCredentials();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:     false,
      status: 401,
      text:   () => Promise.resolve('Unauthorized'),
    }));

    const provider = createSmsProvider();
    const result   = await provider.sendMessage({ to: '+46700000001', body: 'Hej!' });
    expect(result.ok).toBe(false);
    expect(result.channel).toBe('sms');
    expect(result.error).toContain('401');
  });

  it('returns failed result on HTTP 500', async () => {
    stubCredentials();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:     false,
      status: 500,
      text:   () => Promise.resolve('Internal Server Error'),
    }));

    const provider = createSmsProvider();
    const result   = await provider.sendMessage({ to: '+46700000001', body: 'test' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('500');
  });

  it('does not expose credentials in returned result', async () => {
    stubCredentials();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:   true,
      json: () => Promise.resolve({ id: 'msg-1' }),
    }));

    const provider = createSmsProvider();
    const result   = await provider.sendMessage({ to: '+46700000001', body: 'test' });
    const asString = JSON.stringify(result);
    expect(asString).not.toContain('mykey');
    expect(asString).not.toContain('mysecret');
  });
});
