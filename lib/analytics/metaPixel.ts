/**
 * Meta Pixel utility — browser-only, env-gated, consent-aware.
 *
 * Pixel fires only when:
 *   NEXT_PUBLIC_META_PIXEL_ENABLED === 'true'
 *   NEXT_PUBLIC_META_PIXEL_ID is set
 *   window.fbq is available (script has loaded)
 *
 * Payload safety: forbidden field names are blocked at the utility level.
 * Driver/lead events must never be called before GDPR consent is accepted —
 * this is enforced by the call sites (see hooks/useChat.ts).
 */

// Extend the Window type so TypeScript knows about fbq.
declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

// ─── Allowed custom event names ───────────────────────────────────────────────

export type PixelEvent =
  | 'PageView'
  | 'ViewContent'
  | 'DriverChatStarted'
  | 'DriverConsentAccepted'
  | 'DriverRegistrationCompleted'
  | 'QualifiedDriverLead'
  | 'HighPriorityDriverLead'
  | 'DriverCommunityViewed'
  | 'DriverCommunityClicked'
  | 'DriverCommunityCTAAfterIntakeClicked';

// ─── Safe payload type ────────────────────────────────────────────────────────

export type SafePayload = Record<string, string | number>;

// Exact field names that are forbidden in any event payload.
// Uses exact match (not substring) to avoid false positives on safe Meta fields
// like `content_name`, `event_name`, or `page_name`.
const FORBIDDEN_PAYLOAD_FIELDS = new Set([
  'name', 'first_name', 'last_name', 'fn', 'ln',
  'email', 'em',
  'phone', 'ph', 'mobile',
  'personnummer', 'ssn',
  'address', 'addr', 'street', 'zip',
  'message', 'free_text', 'comment',
  'license_document', 'passport',
]);

// ─── Guard helpers ────────────────────────────────────────────────────────────

export function isPixelEnabled(): boolean {
  if (typeof process === 'undefined') return false;
  return (
    process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === 'true' &&
    Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID)
  );
}

export function isPixelReady(): boolean {
  if (typeof window === 'undefined') return false;
  return isPixelEnabled() && typeof window.fbq === 'function';
}

// ─── Payload sanitizer ────────────────────────────────────────────────────────

export function sanitizePayload(params: SafePayload): SafePayload {
  const clean: SafePayload = {};
  for (const [key, value] of Object.entries(params)) {
    if (!FORBIDDEN_PAYLOAD_FIELDS.has(key.toLowerCase())) {
      clean[key] = value;
    }
  }
  return clean;
}

// ─── Tracking functions ───────────────────────────────────────────────────────

export function trackPageView(): void {
  if (!isPixelReady()) return;
  window.fbq('track', 'PageView');
}

export function trackEvent(event: PixelEvent, params: SafePayload = {}): void {
  if (!isPixelReady()) return;

  const safe = sanitizePayload(params);

  if (event === 'PageView') {
    window.fbq('track', 'PageView');
  } else if (event === 'ViewContent') {
    // ViewContent is a standard Meta event
    window.fbq('track', 'ViewContent', safe);
  } else {
    // All DriverNord-specific events are custom events
    window.fbq('trackCustom', event, safe);
  }
}
