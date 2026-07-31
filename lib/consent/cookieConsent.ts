/**
 * Cookie / tracking consent utility — browser-only, SSR-safe.
 *
 * Stores the visitor's cookie preference in localStorage.
 * Version-stamped so that scope changes force re-consent.
 *
 * This consent is separate from driver registration consent (GDPR Art. 6(1)(a)
 * affirmative consent collected in /chat step 13). See:
 * docs/business/privacy-and-tracking-consent/tracking-consent-vs-driver-consent.md
 */

export const CONSENT_KEY = 'dn_cookie_consent';
export const CONSENT_VERSION = '1.0';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CookieConsentState {
  necessary: true;       // always true — not a user choice
  analytics: boolean;    // future analytics tools
  marketing: boolean;    // Meta Pixel, CAPI
  consentedAt: string;   // ISO 8601 timestamp
  consentVersion: string;
}

// ─── Storage access ───────────────────────────────────────────────────────────

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns the stored consent state, or null if:
 * - no consent has been recorded yet
 * - the stored version does not match CONSENT_VERSION (forces re-consent)
 * - the stored value is malformed
 * - called server-side (localStorage not available)
 */
export function getCookieConsent(): CookieConsentState | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(CONSENT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed.consentVersion !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasMarketingConsent(): boolean {
  return getCookieConsent()?.marketing === true;
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent()?.analytics === true;
}

export function getConsentTimestamp(): string | null {
  return getCookieConsent()?.consentedAt ?? null;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Persists the visitor's consent choice.
 * marketing=true enables Meta Pixel. analytics=true enables future analytics tools.
 * Neither defaults to true — both must be explicitly granted.
 */
export function setCookieConsent(marketing: boolean, analytics: boolean): void {
  const storage = getStorage();
  if (!storage) return;

  const state: CookieConsentState = {
    necessary: true,
    analytics,
    marketing,
    consentedAt: new Date().toISOString(),
    consentVersion: CONSENT_VERSION,
  };

  storage.setItem(CONSENT_KEY, JSON.stringify(state));
}

/**
 * Removes the stored consent record, causing the banner to reappear on next visit.
 * Used for testing and for version-bump re-consent flows.
 */
export function clearCookieConsent(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(CONSENT_KEY);
}

// ─── Event ────────────────────────────────────────────────────────────────────

/**
 * Dispatches a custom browser event after consent is changed so that components
 * (e.g., MetaPixel) can react without a full page reload.
 * Safe to call — no-ops on the server.
 */
export function dispatchConsentChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('dn:consentChanged'));
}
