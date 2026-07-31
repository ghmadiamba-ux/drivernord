import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCookieConsent,
  setCookieConsent,
  hasMarketingConsent,
  hasAnalyticsConsent,
  clearCookieConsent,
  getConsentTimestamp,
  dispatchConsentChanged,
  CONSENT_KEY,
  CONSENT_VERSION,
  type CookieConsentState,
} from '../lib/consent/cookieConsent';

// ─── localStorage mock ────────────────────────────────────────────────────────

function makeLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

let localStorageMock: ReturnType<typeof makeLocalStorageMock>;

function setWindowWithStorage() {
  localStorageMock = makeLocalStorageMock();
  vi.stubGlobal('window', { localStorage: localStorageMock });
}

function clearWindow() {
  vi.unstubAllGlobals();
}

// ─── getCookieConsent ─────────────────────────────────────────────────────────

describe('getCookieConsent', () => {
  afterEach(clearWindow);

  it('returns null when window is not available (SSR)', () => {
    clearWindow(); // no window set
    expect(getCookieConsent()).toBeNull();
  });

  it('returns null when localStorage has no entry', () => {
    setWindowWithStorage();
    expect(getCookieConsent()).toBeNull();
  });

  it('returns null when stored version does not match CONSENT_VERSION', () => {
    setWindowWithStorage();
    const stale: CookieConsentState = {
      necessary: true,
      analytics: false,
      marketing: true,
      consentedAt: new Date().toISOString(),
      consentVersion: '0.9',
    };
    localStorageMock.setItem(CONSENT_KEY, JSON.stringify(stale));
    expect(getCookieConsent()).toBeNull();
  });

  it('returns null when stored value is malformed JSON', () => {
    setWindowWithStorage();
    localStorageMock.setItem(CONSENT_KEY, 'not-json{{{');
    expect(getCookieConsent()).toBeNull();
  });

  it('returns the stored consent object when version matches', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    const result = getCookieConsent();
    expect(result).not.toBeNull();
    expect(result?.marketing).toBe(true);
    expect(result?.analytics).toBe(false);
    expect(result?.necessary).toBe(true);
    expect(result?.consentVersion).toBe(CONSENT_VERSION);
  });
});

// ─── setCookieConsent ─────────────────────────────────────────────────────────

describe('setCookieConsent', () => {
  afterEach(clearWindow);

  it('does not throw when window is unavailable (SSR)', () => {
    clearWindow();
    expect(() => setCookieConsent(true, false)).not.toThrow();
  });

  it('stores marketing=true when called with (true, false)', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    const stored = JSON.parse(localStorageMock.getItem(CONSENT_KEY)!) as CookieConsentState;
    expect(stored.marketing).toBe(true);
    expect(stored.analytics).toBe(false);
  });

  it('stores marketing=false when called with (false, false)', () => {
    setWindowWithStorage();
    setCookieConsent(false, false);
    const stored = JSON.parse(localStorageMock.getItem(CONSENT_KEY)!) as CookieConsentState;
    expect(stored.marketing).toBe(false);
  });

  it('always stores necessary=true regardless of arguments', () => {
    setWindowWithStorage();
    setCookieConsent(false, false);
    const stored = JSON.parse(localStorageMock.getItem(CONSENT_KEY)!) as CookieConsentState;
    expect(stored.necessary).toBe(true);
  });

  it('stores the current CONSENT_VERSION', () => {
    setWindowWithStorage();
    setCookieConsent(false, false);
    const stored = JSON.parse(localStorageMock.getItem(CONSENT_KEY)!) as CookieConsentState;
    expect(stored.consentVersion).toBe(CONSENT_VERSION);
  });

  it('stores a valid ISO 8601 timestamp', () => {
    setWindowWithStorage();
    const before = new Date().toISOString();
    setCookieConsent(true, false);
    const after = new Date().toISOString();
    const stored = JSON.parse(localStorageMock.getItem(CONSENT_KEY)!) as CookieConsentState;
    expect(stored.consentedAt >= before).toBe(true);
    expect(stored.consentedAt <= after).toBe(true);
  });

  it('overwrites a previous choice', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    setCookieConsent(false, false);
    const stored = JSON.parse(localStorageMock.getItem(CONSENT_KEY)!) as CookieConsentState;
    expect(stored.marketing).toBe(false);
  });
});

// ─── hasMarketingConsent ──────────────────────────────────────────────────────

describe('hasMarketingConsent', () => {
  afterEach(clearWindow);

  it('returns false when window is not available (SSR)', () => {
    clearWindow();
    expect(hasMarketingConsent()).toBe(false);
  });

  it('returns false when no consent is stored', () => {
    setWindowWithStorage();
    expect(hasMarketingConsent()).toBe(false);
  });

  it('returns false after "necessary only" choice', () => {
    setWindowWithStorage();
    setCookieConsent(false, false);
    expect(hasMarketingConsent()).toBe(false);
  });

  it('returns true after "accept all" choice', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    expect(hasMarketingConsent()).toBe(true);
  });

  it('returns false after consent is cleared', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    clearCookieConsent();
    expect(hasMarketingConsent()).toBe(false);
  });

  it('returns false when stored version is outdated (forces re-consent)', () => {
    setWindowWithStorage();
    const stale: CookieConsentState = {
      necessary: true,
      analytics: false,
      marketing: true,
      consentedAt: new Date().toISOString(),
      consentVersion: '0.1',
    };
    localStorageMock.setItem(CONSENT_KEY, JSON.stringify(stale));
    expect(hasMarketingConsent()).toBe(false);
  });
});

// ─── hasAnalyticsConsent ──────────────────────────────────────────────────────

describe('hasAnalyticsConsent', () => {
  afterEach(clearWindow);

  it('returns false when no consent is stored', () => {
    setWindowWithStorage();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('returns false when analytics=false is stored', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('returns true when analytics=true is stored', () => {
    setWindowWithStorage();
    setCookieConsent(false, true);
    expect(hasAnalyticsConsent()).toBe(true);
  });
});

// ─── clearCookieConsent ───────────────────────────────────────────────────────

describe('clearCookieConsent', () => {
  afterEach(clearWindow);

  it('does not throw when window is unavailable (SSR)', () => {
    clearWindow();
    expect(() => clearCookieConsent()).not.toThrow();
  });

  it('removes the stored consent entry', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    clearCookieConsent();
    expect(localStorageMock.getItem(CONSENT_KEY)).toBeNull();
  });

  it('causes getCookieConsent() to return null after clearing', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    clearCookieConsent();
    expect(getCookieConsent()).toBeNull();
  });

  it('is idempotent — does not throw when called twice', () => {
    setWindowWithStorage();
    setCookieConsent(false, false);
    expect(() => { clearCookieConsent(); clearCookieConsent(); }).not.toThrow();
  });
});

// ─── getConsentTimestamp ──────────────────────────────────────────────────────

describe('getConsentTimestamp', () => {
  afterEach(clearWindow);

  it('returns null when no consent is stored', () => {
    setWindowWithStorage();
    expect(getConsentTimestamp()).toBeNull();
  });

  it('returns null when window is not available (SSR)', () => {
    clearWindow();
    expect(getConsentTimestamp()).toBeNull();
  });

  it('returns an ISO 8601 string after setCookieConsent', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    const ts = getConsentTimestamp();
    expect(ts).not.toBeNull();
    expect(typeof ts).toBe('string');
    // Validate ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(() => new Date(ts!).toISOString()).not.toThrow();
  });

  it('returns null after consent is cleared', () => {
    setWindowWithStorage();
    setCookieConsent(false, false);
    clearCookieConsent();
    expect(getConsentTimestamp()).toBeNull();
  });
});

// ─── dispatchConsentChanged ───────────────────────────────────────────────────

describe('dispatchConsentChanged', () => {
  afterEach(clearWindow);

  it('does not throw when window is not available (SSR)', () => {
    clearWindow();
    expect(() => dispatchConsentChanged()).not.toThrow();
  });

  it('dispatches a dn:consentChanged event on window', () => {
    const events: string[] = [];
    vi.stubGlobal('window', {
      localStorage: makeLocalStorageMock(),
      dispatchEvent: (e: Event) => { events.push(e.type); return true; },
    });
    dispatchConsentChanged();
    expect(events).toContain('dn:consentChanged');
  });
});

// ─── Pixel gating integration ─────────────────────────────────────────────────
//
// These tests verify that the consent state correctly gates the Pixel.
// The MetaPixel component itself reads hasMarketingConsent() via useEffect.
// We test the data contract: marketing=false → hasMarketingConsent()=false.

describe('Pixel gating — consent state contract', () => {
  afterEach(clearWindow);

  it('hasMarketingConsent() is false on a first visit (no stored consent)', () => {
    setWindowWithStorage();
    expect(hasMarketingConsent()).toBe(false);
  });

  it('hasMarketingConsent() is false after "necessary only" — Pixel must not load', () => {
    setWindowWithStorage();
    setCookieConsent(false, false);
    expect(hasMarketingConsent()).toBe(false);
  });

  it('hasMarketingConsent() is true only after explicit "accept all" — Pixel may load', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    expect(hasMarketingConsent()).toBe(true);
  });

  it('consent state contains no PII fields', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    const state = getCookieConsent()!;
    const keys = Object.keys(state);
    const piiFields = ['name', 'email', 'phone', 'personnummer', 'address'];
    for (const field of piiFields) {
      expect(keys).not.toContain(field);
    }
  });

  it('consent choice persists across simulated page reloads (reads same localStorage)', () => {
    setWindowWithStorage();
    setCookieConsent(true, false);
    // Simulate "reload": create new read without re-calling setCookieConsent
    expect(hasMarketingConsent()).toBe(true);
    expect(hasMarketingConsent()).toBe(true);
  });
});
