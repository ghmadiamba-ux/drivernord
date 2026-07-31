import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock db — must appear before any lib import that transitively loads db
vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

import {
  isWhatsAppConfigured,
  getWhatsAppFounderPhone,
  getWhatsAppMaxDaily,
  getWhatsAppTodayCount,
  sendWhatsAppTemplate,
} from '../lib/whatsappClient';
import { db } from '../lib/db';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEST_TOKEN    = 'EAAtest-wa-token-xyz789';
const FOUNDER_PHONE = '46709385267'; // sanctioned DriverNord business number
const PHONE_NUM_ID  = '123456789012345';

function setEnv(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string> = {
    WHATSAPP_PHONE_NUMBER_ID:   PHONE_NUM_ID,
    WHATSAPP_ACCESS_TOKEN:      TEST_TOKEN,
    WHATSAPP_FOUNDER_PHONE:     FOUNDER_PHONE,
    WHATSAPP_TEMPLATE_NAME:     'logistikklubb_post_due',
    WHATSAPP_TEMPLATE_LANGUAGE: 'sv',
    ...overrides,
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function clearEnv() {
  for (const k of [
    'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_FOUNDER_PHONE',   'WHATSAPP_TEMPLATE_NAME',
    'WHATSAPP_TEMPLATE_LANGUAGE', 'WHATSAPP_MAX_DAILY',
    'FOUNDER_WHATSAPP_ENABLED',
  ]) delete process.env[k];
}

// Sets up a mock Supabase chain that resolves with { count, error } on .filter()
function mockDbChain(count: number | null, error: unknown = null) {
  const filterFn = vi.fn().mockResolvedValue({ count, error });
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
    filter: filterFn,
  };
  vi.mocked(db.from).mockReturnValue(chain as never);
  return { chain, filterFn };
}

function mockFetchOk(messageId = 'wamid.abc123') {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ messages: [{ id: messageId }] }), { status: 200 }),
  );
}

function mockFetchError(status: number, body: string) {
  return vi.fn().mockResolvedValue(new Response(body, { status }));
}

beforeEach(() => {
  vi.clearAllMocks();
  clearEnv();
});

// ─── isWhatsAppConfigured ─────────────────────────────────────────────────────

describe('isWhatsAppConfigured', () => {
  it('returns false when all vars missing', () => {
    expect(isWhatsAppConfigured()).toBe(false);
  });

  it('returns false when WHATSAPP_PHONE_NUMBER_ID is missing', () => {
    process.env.WHATSAPP_ACCESS_TOKEN   = TEST_TOKEN;
    process.env.WHATSAPP_FOUNDER_PHONE  = FOUNDER_PHONE;
    expect(isWhatsAppConfigured()).toBe(false);
  });

  it('returns false when WHATSAPP_ACCESS_TOKEN is missing', () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = PHONE_NUM_ID;
    process.env.WHATSAPP_FOUNDER_PHONE   = FOUNDER_PHONE;
    expect(isWhatsAppConfigured()).toBe(false);
  });

  it('returns false when WHATSAPP_FOUNDER_PHONE is missing', () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = PHONE_NUM_ID;
    process.env.WHATSAPP_ACCESS_TOKEN    = TEST_TOKEN;
    expect(isWhatsAppConfigured()).toBe(false);
  });

  it('returns true when all three required vars are set', () => {
    setEnv();
    expect(isWhatsAppConfigured()).toBe(true);
  });
});

// ─── getWhatsAppFounderPhone ──────────────────────────────────────────────────

describe('getWhatsAppFounderPhone', () => {
  it('returns empty string when WHATSAPP_FOUNDER_PHONE not set', () => {
    expect(getWhatsAppFounderPhone()).toBe('');
  });

  it('returns the configured phone number', () => {
    process.env.WHATSAPP_FOUNDER_PHONE = '46700000001';
    expect(getWhatsAppFounderPhone()).toBe('46700000001');
  });
});

// ─── getWhatsAppMaxDaily ──────────────────────────────────────────────────────

describe('getWhatsAppMaxDaily', () => {
  afterEach(() => { delete process.env.WHATSAPP_MAX_DAILY; });

  it('returns 10 when WHATSAPP_MAX_DAILY not set', () => {
    expect(getWhatsAppMaxDaily()).toBe(10);
  });

  it('returns the configured numeric value', () => {
    process.env.WHATSAPP_MAX_DAILY = '5';
    expect(getWhatsAppMaxDaily()).toBe(5);
  });

  it('returns 10 for non-numeric value', () => {
    process.env.WHATSAPP_MAX_DAILY = 'not-a-number';
    expect(getWhatsAppMaxDaily()).toBe(10);
  });

  it('returns 10 for negative value', () => {
    process.env.WHATSAPP_MAX_DAILY = '-3';
    expect(getWhatsAppMaxDaily()).toBe(10);
  });

  it('returns 0 when WHATSAPP_MAX_DAILY=0 (effectively disables)', () => {
    process.env.WHATSAPP_MAX_DAILY = '0';
    expect(getWhatsAppMaxDaily()).toBe(0);
  });
});

// ─── getWhatsAppTodayCount ────────────────────────────────────────────────────

describe('getWhatsAppTodayCount', () => {
  it('returns the count from DB', async () => {
    mockDbChain(4);
    expect(await getWhatsAppTodayCount()).toBe(4);
  });

  it('returns 0 when DB count is null', async () => {
    mockDbChain(null);
    expect(await getWhatsAppTodayCount()).toBe(0);
  });

  it('returns 0 when DB returns an error object', async () => {
    mockDbChain(5, { message: 'connection refused' });
    expect(await getWhatsAppTodayCount()).toBe(0);
  });

  it('returns 0 when DB throws', async () => {
    vi.mocked(db.from).mockImplementation(() => { throw new Error('DB crash'); });
    expect(await getWhatsAppTodayCount()).toBe(0);
  });

  it('queries the system_actions table', async () => {
    mockDbChain(0);
    await getWhatsAppTodayCount();
    expect(vi.mocked(db.from)).toHaveBeenCalledWith('system_actions');
  });

  it('filters by founder_notification_sent action_type', async () => {
    const { chain } = mockDbChain(0);
    await getWhatsAppTodayCount();
    expect(chain.eq).toHaveBeenCalledWith('action_type', 'founder_notification_sent');
  });

  it('filters by whatsapp channel in result JSONB', async () => {
    const { chain } = mockDbChain(0);
    await getWhatsAppTodayCount();
    expect(chain.filter).toHaveBeenCalledWith('result->>channel', 'eq', 'whatsapp');
  });
});

// ─── sendWhatsAppTemplate — dry_run ──────────────────────────────────────────

describe('sendWhatsAppTemplate — dry_run (not configured)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns dry_run: true when WHATSAPP_ACCESS_TOKEN not set', async () => {
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.dry_run).toBe(true);
    expect(result.success).toBe(false);
    expect(result.message_id).toBeNull();
  });

  it('returns informative error message in dry_run', async () => {
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.error).toContain('WHATSAPP_PHONE_NUMBER_ID');
    expect(result.error).toContain('dry_run');
  });

  it('does not call fetch in dry_run mode', async () => {
    const spy = vi.spyOn(global, 'fetch');
    await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(spy).not.toHaveBeenCalled();
  });
});

// ─── sendWhatsAppTemplate — allowlist guard ───────────────────────────────────

describe('sendWhatsAppTemplate — allowlist guard', () => {
  beforeEach(() => setEnv());
  afterEach(() => { vi.restoreAllMocks(); clearEnv(); });

  it('blocks send to a number that is not WHATSAPP_FOUNDER_PHONE', async () => {
    const result = await sendWhatsAppTemplate({ to: '46999999999', template_name: 't', language: 'sv', body_params: [] });
    expect(result.success).toBe(false);
    expect(result.error).toContain('allowlist');
  });

  it('does not call fetch when recipient is blocked', async () => {
    const spy = vi.spyOn(global, 'fetch');
    await sendWhatsAppTemplate({ to: '46999999999', template_name: 't', language: 'sv', body_params: [] });
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns dry_run: false for allowlist block (it is a real rejection)', async () => {
    const result = await sendWhatsAppTemplate({ to: '46999999999', template_name: 't', language: 'sv', body_params: [] });
    expect(result.dry_run).toBe(false);
  });

  it('allows send to the configured founder phone', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.success).toBe(true);
  });
});

// ─── sendWhatsAppTemplate — success ──────────────────────────────────────────

describe('sendWhatsAppTemplate — success', () => {
  beforeEach(() => setEnv());
  afterEach(() => { vi.restoreAllMocks(); clearEnv(); });

  it('returns success: true on 200 response', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.success).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(result.error).toBeNull();
  });

  it('returns the message_id from the response', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk('wamid.xyz789'));
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.message_id).toBe('wamid.xyz789');
  });

  it('returns message_id: null when messages array is empty', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ messages: [] }), { status: 200 }));
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.message_id).toBeNull();
  });

  it('calls the correct Meta Graph API endpoint', async () => {
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    const [url] = spy.mock.calls[0]!;
    expect(url as string).toContain('graph.facebook.com');
    expect(url as string).toContain(PHONE_NUM_ID);
    expect(url as string).toContain('/messages');
  });

  it('uses POST method', async () => {
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    const [, init] = spy.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('POST');
  });

  it('includes Authorization: Bearer header', async () => {
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    const [, init] = spy.mock.calls[0]!;
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${TEST_TOKEN}`);
  });

  it('does NOT include access token in the returned result', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(JSON.stringify(result)).not.toContain(TEST_TOKEN);
  });

  it('sends body_params as template body component parameters', async () => {
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: ['Dag 3 — Tips', 'YKB: Veckans tips', 'Post text...'] });
    const [, init] = spy.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    const template  = body['template'] as Record<string, unknown>;
    const components = template['components'] as Array<Record<string, unknown>>;
    expect(components[0]!['type']).toBe('body');
    const params = components[0]!['parameters'] as Array<Record<string, unknown>>;
    expect(params[0]!['text']).toBe('Dag 3 — Tips');
    expect(params[1]!['text']).toBe('YKB: Veckans tips');
    expect(params[2]!['text']).toBe('Post text...');
  });

  it('omits components when body_params is empty', async () => {
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    const [, init] = spy.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    const template = body['template'] as Record<string, unknown>;
    expect(template['components']).toBeUndefined();
  });

  it('sends messaging_product: whatsapp', async () => {
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    const [, init] = spy.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body['messaging_product']).toBe('whatsapp');
  });
});

// ─── sendWhatsAppTemplate — failure / never-throws ───────────────────────────

describe('sendWhatsAppTemplate — failure', () => {
  beforeEach(() => setEnv());
  afterEach(() => { vi.restoreAllMocks(); clearEnv(); });

  it('returns success: false on HTTP 401', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(mockFetchError(401, 'Unauthorized'));
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
  });

  it('redacts access token from HTTP error response body', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(mockFetchError(400, `token=${TEST_TOKEN} is invalid`));
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.error).not.toContain(TEST_TOKEN);
    expect(result.error).toContain('[REDACTED]');
  });

  it('returns success: false when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network unreachable'));
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network unreachable');
  });

  it('redacts access token from thrown error message', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error(`Bearer ${TEST_TOKEN} rejected`));
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.error).not.toContain(TEST_TOKEN);
    expect(result.error).toContain('[REDACTED]');
  });

  it('never throws — always resolves', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue('string error');
    await expect(
      sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] })
    ).resolves.toMatchObject({ success: false });
  });

  it('returns message_id: null on failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Timeout'));
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.message_id).toBeNull();
  });
});

// ─── Company number relay configuration ──────────────────────────────────────
// Documents and validates the intended relay pattern:
//   sender: Meta Cloud API registered number (WHATSAPP_PHONE_NUMBER_ID)
//   recipient: company WhatsApp number (46709385267) via WHATSAPP_FOUNDER_PHONE

describe('company number relay — WHATSAPP_FOUNDER_PHONE=46709385267', () => {
  const COMPANY_PHONE = '46709385267'; // DriverNord company number without '+'

  beforeEach(() => {
    setEnv({ WHATSAPP_FOUNDER_PHONE: COMPANY_PHONE });
  });
  afterEach(() => { vi.restoreAllMocks(); clearEnv(); });

  it('allows send when recipient is the company number', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk('wamid.company-relay'));
    const result = await sendWhatsAppTemplate({ to: COMPANY_PHONE, template_name: 'logistikklubb_post_due', language: 'sv', body_params: ['Dag 1 — Morgon', 'Välkommen', 'God morgon!'] });
    expect(result.success).toBe(true);
    expect(result.message_id).toBe('wamid.company-relay');
  });

  it('blocks any other number when company number is configured', async () => {
    const result = await sendWhatsAppTemplate({ to: '46700000001', template_name: 'logistikklubb_post_due', language: 'sv', body_params: [] });
    expect(result.success).toBe(false);
    expect(result.error).toContain('allowlist');
  });

  it('dry_run mode still active when WHATSAPP_PHONE_NUMBER_ID is missing', async () => {
    setEnv({ WHATSAPP_FOUNDER_PHONE: COMPANY_PHONE, WHATSAPP_PHONE_NUMBER_ID: undefined });
    const result = await sendWhatsAppTemplate({ to: COMPANY_PHONE, template_name: 'logistikklubb_post_due', language: 'sv', body_params: [] });
    expect(result.dry_run).toBe(true);
    expect(result.success).toBe(false);
  });

  it('normalizes Swedish national format (0709385267) to E.164 in Meta payload', async () => {
    const LOCAL = '0709385267';
    setEnv({ WHATSAPP_FOUNDER_PHONE: LOCAL });
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk('wamid.e164'));
    await sendWhatsAppTemplate({ to: LOCAL, template_name: 'logistikklubb_post_due', language: 'sv', body_params: [] });
    const [, init] = spy.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body['to']).toBe('46709385267');
  });

  it('leaves already-international format unchanged in Meta payload', async () => {
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    await sendWhatsAppTemplate({ to: COMPANY_PHONE, template_name: 'logistikklubb_post_due', language: 'sv', body_params: [] });
    const [, init] = spy.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body['to']).toBe('46709385267');
  });
});

// ─── BOM / invisible-char sanitization ───────────────────────────────────────
// Regression tests for the ﻿1149360608265872 incident where WHATSAPP_PHONE_NUMBER_ID
// was stored with a UTF-8 BOM prefix, causing Meta API HTTP 400.

describe('BOM sanitization — WHATSAPP_PHONE_NUMBER_ID', () => {
  beforeEach(() => setEnv());
  afterEach(() => { vi.restoreAllMocks(); clearEnv(); });

  it('strips UTF-8 BOM (\\uFEFF) prefix — Meta URL must contain clean digits only', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '﻿' + PHONE_NUM_ID;
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    const url = spy.mock.calls[0]![0] as string;
    expect(url).not.toContain('﻿');
    expect(url).toContain(`/${PHONE_NUM_ID}/messages`);
  });

  it('strips zero-width space (\\u200B) prefix', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '​' + PHONE_NUM_ID;
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    const url = spy.mock.calls[0]![0] as string;
    expect(url).toContain(`/${PHONE_NUM_ID}/messages`);
    expect(url).not.toContain('​');
  });

  it('strips compound invisible prefix (BOM + zero-width chars)', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '﻿​‌' + PHONE_NUM_ID;
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    const url = spy.mock.calls[0]![0] as string;
    expect(url).toContain(`/${PHONE_NUM_ID}/messages`);
  });

  it('strips surrounding whitespace', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '  ' + PHONE_NUM_ID + '  ';
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk());
    await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    const url = spy.mock.calls[0]![0] as string;
    expect(url).toContain(`/${PHONE_NUM_ID}/messages`);
  });

  it('plain ID passes through unchanged and succeeds', async () => {
    const spy = vi.spyOn(global, 'fetch').mockImplementation(mockFetchOk('wamid.bom-regression'));
    const result = await sendWhatsAppTemplate({ to: FOUNDER_PHONE, template_name: 't', language: 'sv', body_params: [] });
    expect(result.success).toBe(true);
    const url = spy.mock.calls[0]![0] as string;
    expect(url).toContain(`/${PHONE_NUM_ID}/messages`);
  });

  it('isWhatsAppConfigured returns true even when phone number ID has BOM', () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '﻿' + PHONE_NUM_ID;
    expect(isWhatsAppConfigured()).toBe(true);
  });
});
