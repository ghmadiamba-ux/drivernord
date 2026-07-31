import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isPixelEnabled,
  isPixelReady,
  sanitizePayload,
  trackPageView,
  trackEvent,
  type SafePayload,
} from '../lib/analytics/metaPixel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setEnv(pixelId: string | undefined, enabled: string | undefined) {
  if (pixelId !== undefined) {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = pixelId;
  } else {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  }
  if (enabled !== undefined) {
    process.env.NEXT_PUBLIC_META_PIXEL_ENABLED = enabled;
  } else {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ENABLED;
  }
}

function mockFbq() {
  const fbq = vi.fn();
  (globalThis as Record<string, unknown>).window = { fbq };
  return fbq;
}

function clearWindow() {
  // Restore undefined window to simulate SSR
  delete (globalThis as Record<string, unknown>).window;
}

// ─── isPixelEnabled ───────────────────────────────────────────────────────────

describe('isPixelEnabled', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ENABLED;
  });

  it('returns false when NEXT_PUBLIC_META_PIXEL_ENABLED is not set', () => {
    setEnv('1011051371582313', undefined);
    expect(isPixelEnabled()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_META_PIXEL_ENABLED is "false"', () => {
    setEnv('1011051371582313', 'false');
    expect(isPixelEnabled()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_META_PIXEL_ID is missing', () => {
    setEnv(undefined, 'true');
    expect(isPixelEnabled()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_META_PIXEL_ID is empty string', () => {
    setEnv('', 'true');
    expect(isPixelEnabled()).toBe(false);
  });

  it('returns true when both env vars are correctly set', () => {
    setEnv('1011051371582313', 'true');
    expect(isPixelEnabled()).toBe(true);
  });
});

// ─── isPixelReady (SSR safety) ────────────────────────────────────────────────

describe('isPixelReady — SSR safety', () => {
  beforeEach(() => {
    setEnv('1011051371582313', 'true');
  });

  afterEach(() => {
    clearWindow();
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ENABLED;
  });

  it('returns false when window is undefined (SSR context)', () => {
    clearWindow();
    expect(isPixelReady()).toBe(false);
  });

  it('returns false when window exists but fbq is not loaded yet', () => {
    (globalThis as Record<string, unknown>).window = {};
    expect(isPixelReady()).toBe(false);
  });

  it('returns false when window.fbq is not a function', () => {
    (globalThis as Record<string, unknown>).window = { fbq: 'not-a-function' };
    expect(isPixelReady()).toBe(false);
  });

  it('returns true when window.fbq is a function and env vars are set', () => {
    mockFbq();
    expect(isPixelReady()).toBe(true);
  });

  it('returns false when pixel is disabled even if fbq exists', () => {
    setEnv('1011051371582313', 'false');
    mockFbq();
    expect(isPixelReady()).toBe(false);
  });
});

// ─── sanitizePayload ──────────────────────────────────────────────────────────

describe('sanitizePayload', () => {
  it('passes through safe fields untouched', () => {
    const input: SafePayload = {
      content_name: 'driver-landing',
      content_category: 'driver-acquisition',
      value: 0,
      currency: 'SEK',
    };
    expect(sanitizePayload(input)).toEqual(input);
  });

  it('strips exact field "name" but passes through "content_name"', () => {
    const input: SafePayload = { name: 'Lars', content_name: 'landing' };
    const result = sanitizePayload(input);
    expect(result).not.toHaveProperty('name');
    expect(result).toHaveProperty('content_name', 'landing');
  });

  it('strips exact fields "email" and "em"', () => {
    const input: SafePayload = { email: 'test@example.com', em: 'hashed' };
    const result = sanitizePayload(input);
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('em');
  });

  it('strips exact fields "phone" and "ph"', () => {
    const input: SafePayload = { phone: '+46700000000', ph: '+46700000000' };
    const result = sanitizePayload(input);
    expect(result).not.toHaveProperty('phone');
    expect(result).not.toHaveProperty('ph');
  });

  it('strips exact field "address" and "addr" but passes non-PII address-like fields', () => {
    const input: SafePayload = { address: 'Storgatan 1', addr: 'x', event_type: 'click' };
    const result = sanitizePayload(input);
    expect(result).not.toHaveProperty('address');
    expect(result).not.toHaveProperty('addr');
    expect(result).toHaveProperty('event_type', 'click');
  });

  it('strips exact field "personnummer"', () => {
    const input: SafePayload = { personnummer: '198001011234' };
    expect(sanitizePayload(input)).toEqual({});
  });

  it('strips exact fields "message" and "free_text"', () => {
    const input: SafePayload = { message: 'hello', free_text: 'notes' };
    const result = sanitizePayload(input);
    expect(result).not.toHaveProperty('message');
    expect(result).not.toHaveProperty('free_text');
  });

  it('returns an empty object for an empty input', () => {
    expect(sanitizePayload({})).toEqual({});
  });
});

// ─── trackPageView ────────────────────────────────────────────────────────────

describe('trackPageView', () => {
  afterEach(() => {
    clearWindow();
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ENABLED;
  });

  it('does not throw when pixel is disabled', () => {
    setEnv('1011051371582313', 'false');
    expect(() => trackPageView()).not.toThrow();
  });

  it('does not call fbq when pixel is disabled', () => {
    setEnv('1011051371582313', 'false');
    const fbq = mockFbq();
    trackPageView();
    expect(fbq).not.toHaveBeenCalled();
  });

  it('does not throw when window is undefined (SSR)', () => {
    setEnv('1011051371582313', 'true');
    clearWindow();
    expect(() => trackPageView()).not.toThrow();
  });

  it('calls fbq("track", "PageView") when pixel is ready', () => {
    setEnv('1011051371582313', 'true');
    const fbq = mockFbq();
    trackPageView();
    expect(fbq).toHaveBeenCalledWith('track', 'PageView');
  });
});

// ─── trackEvent ───────────────────────────────────────────────────────────────

describe('trackEvent', () => {
  afterEach(() => {
    clearWindow();
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ENABLED;
  });

  it('does not throw when pixel is disabled', () => {
    setEnv('1011051371582313', 'false');
    expect(() => trackEvent('DriverChatStarted')).not.toThrow();
  });

  it('does not call fbq when pixel is disabled', () => {
    setEnv('1011051371582313', 'false');
    const fbq = mockFbq();
    trackEvent('DriverConsentAccepted');
    expect(fbq).not.toHaveBeenCalled();
  });

  it('does not throw when window is undefined (SSR)', () => {
    setEnv('1011051371582313', 'true');
    clearWindow();
    expect(() => trackEvent('DriverRegistrationCompleted')).not.toThrow();
  });

  it('calls fbq("trackCustom", event) for custom DriverNord events', () => {
    setEnv('1011051371582313', 'true');
    const fbq = mockFbq();
    trackEvent('DriverChatStarted');
    expect(fbq).toHaveBeenCalledWith('trackCustom', 'DriverChatStarted', {});
  });

  it('calls fbq("track", "ViewContent") for the standard ViewContent event', () => {
    setEnv('1011051371582313', 'true');
    const fbq = mockFbq();
    trackEvent('ViewContent', { content_name: 'driver-landing' });
    expect(fbq).toHaveBeenCalledWith('track', 'ViewContent', { content_name: 'driver-landing' });
  });

  it('strips forbidden payload fields before calling fbq', () => {
    setEnv('1011051371582313', 'true');
    const fbq = mockFbq();
    trackEvent('DriverConsentAccepted', {
      phone: '+46700000000',
      email: 'user@example.com',
      safe_field: 'ok',
    } as SafePayload);
    const callArgs = fbq.mock.calls[0];
    expect(callArgs[2]).not.toHaveProperty('phone');
    expect(callArgs[2]).not.toHaveProperty('email');
    expect(callArgs[2]).toHaveProperty('safe_field', 'ok');
  });

  it('fires DriverRegistrationCompleted without PII', () => {
    setEnv('1011051371582313', 'true');
    const fbq = mockFbq();
    trackEvent('DriverRegistrationCompleted');
    expect(fbq).toHaveBeenCalledWith('trackCustom', 'DriverRegistrationCompleted', {});
    const payload = fbq.mock.calls[0][2] as Record<string, unknown>;
    // Confirm no driver PII in payload
    expect(Object.keys(payload)).toHaveLength(0);
  });

  it('fires QualifiedDriverLead without PII', () => {
    setEnv('1011051371582313', 'true');
    const fbq = mockFbq();
    trackEvent('QualifiedDriverLead');
    expect(fbq).toHaveBeenCalledWith('trackCustom', 'QualifiedDriverLead', {});
  });

  it('fires HighPriorityDriverLead without PII', () => {
    setEnv('1011051371582313', 'true');
    const fbq = mockFbq();
    trackEvent('HighPriorityDriverLead');
    expect(fbq).toHaveBeenCalledWith('trackCustom', 'HighPriorityDriverLead', {});
  });
});
