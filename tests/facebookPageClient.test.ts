import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { postToFacebookPage, redactToken } from '../lib/facebookPageClient';
import type { FacebookPageClientConfig } from '../lib/facebookPageClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEST_TOKEN = 'EAAtest-secret-token-abc123';

const TEST_CONFIG: FacebookPageClientConfig = {
  pageId:      '123456789',
  accessToken: TEST_TOKEN,
  apiVersion:  'v21.0',
};

function mockFetchSuccess(postId = '123456789_987654321') {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ id: postId }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function mockFetchError(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function setFbEnv(overrides: Partial<Record<string, string | undefined>> = {}) {
  const defaults: Record<string, string> = {
    FACEBOOK_PAGE_API_ENABLED:      'true',
    FACEBOOK_PAGE_ID:               '123456789',
    FACEBOOK_PAGE_ACCESS_TOKEN:     TEST_TOKEN,
    FACEBOOK_API_VERSION:           'v21.0',
    FACEBOOK_MAX_POSTS_PER_DAY:     '1',
    ...overrides,
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function clearFbEnv() {
  for (const k of [
    'FACEBOOK_PAGE_API_ENABLED',
    'FACEBOOK_PAGE_ID',
    'FACEBOOK_PAGE_ACCESS_TOKEN',
    'FACEBOOK_API_VERSION',
    'FACEBOOK_MAX_POSTS_PER_DAY',
    'WHATSAPP_GROUPS_API_ENABLED',
  ]) {
    delete process.env[k];
  }
}

// ─── postToFacebookPage — success ─────────────────────────────────────────────

describe('postToFacebookPage — success', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns ok:true with postId on 200 response', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(mockFetchSuccess('123_456'));
    const result = await postToFacebookPage('Hello Logistikklubb!', TEST_CONFIG);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postId).toBe('123_456');
  });

  it('calls the correct Graph API endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchSuccess());
    await postToFacebookPage('Test post', TEST_CONFIG);
    const [url] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://graph.facebook.com/v21.0/123456789/feed');
  });

  it('uses POST method', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchSuccess());
    await postToFacebookPage('Test post', TEST_CONFIG);
    const [, init] = fetchSpy.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('POST');
  });

  it('sends Authorization: Bearer header', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchSuccess());
    await postToFacebookPage('Test post', TEST_CONFIG);
    const [, init] = fetchSpy.mock.calls[0]!;
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${TEST_TOKEN}`);
  });

  it('sends message in JSON body', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchSuccess());
    const message  = 'CE-brist i Stockholm — marknadssignal 📊';
    await postToFacebookPage(message, TEST_CONFIG);
    const [, init]  = fetchSpy.mock.calls[0]!;
    const body      = JSON.parse((init as RequestInit).body as string) as { message: string };
    expect(body.message).toBe(message);
  });

  it('handles 2xx response with missing id field', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const result = await postToFacebookPage('Test', TEST_CONFIG);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.postId).toBe('');
  });
});

// ─── postToFacebookPage — HTTP errors ────────────────────────────────────────

describe('postToFacebookPage — HTTP errors', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns ok:false on HTTP 400 with Meta error body', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(
      mockFetchError(400, {
        error: { code: 190, message: 'Invalid OAuth access token.' },
      }),
    );
    const result = await postToFacebookPage('Test', TEST_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe(190);
      expect(result.errorMessage).toContain('Invalid OAuth access token');
    }
  });

  it('returns ok:false on HTTP 500 with fallback to HTTP status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );
    const result = await postToFacebookPage('Test', TEST_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe(500);
  });

  it('returns ok:false on HTTP 403', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(
      mockFetchError(403, { error: { code: 200, message: 'Permission error' } }),
    );
    const result = await postToFacebookPage('Test', TEST_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe(200);
  });
});

// ─── postToFacebookPage — network failures ────────────────────────────────────

describe('postToFacebookPage — network failures', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns ok:false on network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'));
    const result = await postToFacebookPage('Test', TEST_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe(0);
      expect(result.errorMessage).toContain('Network failure');
    }
  });

  it('returns ok:false on timeout (AbortError)', async () => {
    const abortErr = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    vi.spyOn(global, 'fetch').mockRejectedValue(abortErr);
    const result = await postToFacebookPage('Test', TEST_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe(0);
  });
});

// ─── Token redaction ──────────────────────────────────────────────────────────

describe('postToFacebookPage — token redaction', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not include raw token in network error message', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(
      new Error(`Connection refused — token: ${TEST_TOKEN}`),
    );
    const result = await postToFacebookPage('Test', TEST_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorMessage).not.toContain(TEST_TOKEN);
  });

  it('does not include raw token in Meta API error message', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(
      mockFetchError(400, {
        error: { code: 190, message: `Invalid token: ${TEST_TOKEN}` },
      }),
    );
    const result = await postToFacebookPage('Test', TEST_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorMessage).not.toContain(TEST_TOKEN);
  });

  it('redactToken replaces token with [REDACTED]', () => {
    const text = `Bearer ${TEST_TOKEN} is invalid`;
    expect(redactToken(text, TEST_TOKEN)).toBe('Bearer [REDACTED] is invalid');
  });

  it('redactToken is a no-op when token is empty', () => {
    expect(redactToken('some text', '')).toBe('some text');
  });

  it('redactToken is a no-op when token does not appear', () => {
    expect(redactToken('some other text', TEST_TOKEN)).toBe('some other text');
  });
});

// ─── isFacebookPagePostEnabled ────────────────────────────────────────────────

describe('isFacebookPagePostEnabled', () => {
  afterEach(clearFbEnv);

  it('returns false when FACEBOOK_PAGE_API_ENABLED is not set', async () => {
    clearFbEnv();
    const { isFacebookPagePostEnabled } = await import('../lib/logistikklubbPublisher');
    expect(isFacebookPagePostEnabled()).toBe(false);
  });

  it('returns true when FACEBOOK_PAGE_API_ENABLED=true', async () => {
    process.env.FACEBOOK_PAGE_API_ENABLED = 'true';
    const { isFacebookPagePostEnabled } = await import('../lib/logistikklubbPublisher');
    expect(isFacebookPagePostEnabled()).toBe(true);
  });

  it('returns false when FACEBOOK_PAGE_API_ENABLED=false', async () => {
    process.env.FACEBOOK_PAGE_API_ENABLED = 'false';
    const { isFacebookPagePostEnabled } = await import('../lib/logistikklubbPublisher');
    expect(isFacebookPagePostEnabled()).toBe(false);
  });

  it('returns false when FACEBOOK_PAGE_API_ENABLED=1 (not exactly "true")', async () => {
    process.env.FACEBOOK_PAGE_API_ENABLED = '1';
    const { isFacebookPagePostEnabled } = await import('../lib/logistikklubbPublisher');
    expect(isFacebookPagePostEnabled()).toBe(false);
  });
});

// ─── isRateLimitReached ───────────────────────────────────────────────────────

describe('isRateLimitReached', () => {
  it('returns false when count is below max', async () => {
    const { isRateLimitReached } = await import('../lib/logistikklubbPublisher');
    expect(isRateLimitReached(0, 1)).toBe(false);
  });

  it('returns true when count equals max', async () => {
    const { isRateLimitReached } = await import('../lib/logistikklubbPublisher');
    expect(isRateLimitReached(1, 1)).toBe(true);
  });

  it('returns true when count exceeds max', async () => {
    const { isRateLimitReached } = await import('../lib/logistikklubbPublisher');
    expect(isRateLimitReached(2, 1)).toBe(true);
  });

  it('returns true when max is 0 (no posts allowed)', async () => {
    const { isRateLimitReached } = await import('../lib/logistikklubbPublisher');
    expect(isRateLimitReached(0, 0)).toBe(true);
  });

  it('returns false with larger caps', async () => {
    const { isRateLimitReached } = await import('../lib/logistikklubbPublisher');
    expect(isRateLimitReached(3, 5)).toBe(false);
    expect(isRateLimitReached(4, 5)).toBe(false);
    expect(isRateLimitReached(5, 5)).toBe(true);
  });
});

// ─── getFacebookMaxPostsPerDay ────────────────────────────────────────────────

describe('getFacebookMaxPostsPerDay', () => {
  afterEach(clearFbEnv);

  it('returns 1 when FACEBOOK_MAX_POSTS_PER_DAY is not set', async () => {
    clearFbEnv();
    const { getFacebookMaxPostsPerDay } = await import('../lib/logistikklubbPublisher');
    expect(getFacebookMaxPostsPerDay()).toBe(1);
  });

  it('returns the configured value when set', async () => {
    process.env.FACEBOOK_MAX_POSTS_PER_DAY = '3';
    const { getFacebookMaxPostsPerDay } = await import('../lib/logistikklubbPublisher');
    expect(getFacebookMaxPostsPerDay()).toBe(3);
  });

  it('returns 1 for invalid (non-numeric) value', async () => {
    process.env.FACEBOOK_MAX_POSTS_PER_DAY = 'abc';
    const { getFacebookMaxPostsPerDay } = await import('../lib/logistikklubbPublisher');
    expect(getFacebookMaxPostsPerDay()).toBe(1);
  });

  it('returns 0 when configured to 0', async () => {
    process.env.FACEBOOK_MAX_POSTS_PER_DAY = '0';
    const { getFacebookMaxPostsPerDay } = await import('../lib/logistikklubbPublisher');
    expect(getFacebookMaxPostsPerDay()).toBe(0);
  });
});

// ─── WhatsApp gate untouched ──────────────────────────────────────────────────

describe('WhatsApp gate — unchanged by Facebook additions', () => {
  afterEach(clearFbEnv);

  it('isAutoPostEnabled returns false when WHATSAPP_GROUPS_API_ENABLED is not set', async () => {
    clearFbEnv();
    const { isAutoPostEnabled } = await import('../lib/logistikklubbPublisher');
    expect(isAutoPostEnabled()).toBe(false);
  });

  it('isAutoPostEnabled returns false even when FACEBOOK_PAGE_API_ENABLED=true', async () => {
    process.env.FACEBOOK_PAGE_API_ENABLED = 'true';
    const { isAutoPostEnabled } = await import('../lib/logistikklubbPublisher');
    expect(isAutoPostEnabled()).toBe(false);
  });

  it('getPublisherAdapter returns ManualPublisherAdapter when WhatsApp gate is off', async () => {
    clearFbEnv();
    const { getPublisherAdapter, ManualPublisherAdapter } = await import('../lib/logistikklubbPublisher');
    expect(getPublisherAdapter()).toBeInstanceOf(ManualPublisherAdapter);
  });

  it('getPublisherAdapter result publishes as manual_mode (not api_error)', async () => {
    clearFbEnv();
    const { getPublisherAdapter } = await import('../lib/logistikklubbPublisher');
    const adapter = getPublisherAdapter();
    const result  = await adapter.publish('post-id', 'some text');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('manual_mode');
  });
});

// ─── Facebook adapter disabled by default ────────────────────────────────────

describe('getFacebookPageAdapter — disabled by default', () => {
  afterEach(clearFbEnv);

  it('returns ManualPublisherAdapter when FACEBOOK_PAGE_API_ENABLED is not set', async () => {
    clearFbEnv();
    const { getFacebookPageAdapter, ManualPublisherAdapter } = await import('../lib/logistikklubbPublisher');
    expect(getFacebookPageAdapter()).toBeInstanceOf(ManualPublisherAdapter);
  });

  it('returns ManualPublisherAdapter when FACEBOOK_PAGE_API_ENABLED=false', async () => {
    process.env.FACEBOOK_PAGE_API_ENABLED = 'false';
    const { getFacebookPageAdapter, ManualPublisherAdapter } = await import('../lib/logistikklubbPublisher');
    expect(getFacebookPageAdapter()).toBeInstanceOf(ManualPublisherAdapter);
  });

  it('returns FacebookPagePublisherAdapter when gate is enabled', async () => {
    process.env.FACEBOOK_PAGE_API_ENABLED = 'true';
    const { getFacebookPageAdapter, FacebookPagePublisherAdapter } = await import('../lib/logistikklubbPublisher');
    expect(getFacebookPageAdapter()).toBeInstanceOf(FacebookPagePublisherAdapter);
  });
});

// ─── FacebookPagePublisherAdapter — missing config ───────────────────────────

describe('FacebookPagePublisherAdapter — missing config', () => {
  afterEach(() => {
    clearFbEnv();
    vi.restoreAllMocks();
  });

  it('returns adapter_disabled when PAGE_ID is missing', async () => {
    process.env.FACEBOOK_PAGE_API_ENABLED      = 'true';
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN     = TEST_TOKEN;
    delete process.env.FACEBOOK_PAGE_ID;
    const { FacebookPagePublisherAdapter } = await import('../lib/logistikklubbPublisher');
    const adapter = new FacebookPagePublisherAdapter();
    const result  = await adapter.publish('post-id', 'text');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('adapter_disabled');
  });

  it('returns adapter_disabled when ACCESS_TOKEN is missing', async () => {
    process.env.FACEBOOK_PAGE_API_ENABLED  = 'true';
    process.env.FACEBOOK_PAGE_ID           = '123456789';
    delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const { FacebookPagePublisherAdapter } = await import('../lib/logistikklubbPublisher');
    const adapter = new FacebookPagePublisherAdapter();
    const result  = await adapter.publish('post-id', 'text');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('adapter_disabled');
  });
});

// ─── FacebookPagePublisherAdapter — success via mocked fetch ─────────────────

describe('FacebookPagePublisherAdapter — publish with mocked fetch', () => {
  beforeEach(() => setFbEnv());
  afterEach(() => {
    clearFbEnv();
    vi.restoreAllMocks();
  });

  it('returns ok:true with facebook_page_api method on success', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(mockFetchSuccess('111_222'));
    const { FacebookPagePublisherAdapter } = await import('../lib/logistikklubbPublisher');
    const adapter = new FacebookPagePublisherAdapter();
    const result  = await adapter.publish('post-id', 'Marknadssignal 📊');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.method).toBe('facebook_page_api');
      expect(result.postId).toBe('111_222');
    }
  });

  it('returns ok:false with api_error reason on HTTP error', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(
      mockFetchError(400, { error: { code: 190, message: 'Invalid token.' } }),
    );
    const { FacebookPagePublisherAdapter } = await import('../lib/logistikklubbPublisher');
    const adapter = new FacebookPagePublisherAdapter();
    const result  = await adapter.publish('post-id', 'text');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('api_error');
  });

  it('does not include raw access token in error message', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(
      mockFetchError(400, { error: { code: 190, message: `Bad token: ${TEST_TOKEN}` } }),
    );
    const { FacebookPagePublisherAdapter } = await import('../lib/logistikklubbPublisher');
    const adapter = new FacebookPagePublisherAdapter();
    const result  = await adapter.publish('post-id', 'text');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).not.toContain(TEST_TOKEN);
  });
});
