# DriverNord — Cookie Consent Architecture

**Date:** 2026-05-17
**Status:** ARCHITECTURE_READY_FOR_IMPLEMENTATION
**Audience:** Claude Code implementation guide + founder review
**Dependency:** Must be implemented before `NEXT_PUBLIC_META_PIXEL_ENABLED=true` in production.

---

## Problem Statement

Meta Pixel (fbevents.js) sets third-party cookies and sends behavioral data to Meta. Under Swedish law (GDPR + ePR/cookielagen), this requires:

1. A cookie consent banner on first visit
2. Affirmative opt-in before tracking begins (not pre-ticked boxes)
3. Ability to withdraw consent at any time
4. Consent recorded with timestamp and version

The current codebase has no cookie consent banner. Meta Pixel is env-gated (`NEXT_PUBLIC_META_PIXEL_ENABLED=false`), which prevents it from loading in production. The env gate is the safe interim state. This document defines what must replace it.

---

## Two Distinct Consent Types

This codebase handles **two fundamentally different consent mechanisms**. They must not be conflated.

| Consent Type | What it gates | Where collected | Legal basis |
|---|---|---|---|
| **Cookie/Tracking Consent** | Meta Pixel (fbevents.js), analytics cookies | Cookie banner on first visit | ePR + GDPR Art. 6(1)(a) — affirmative consent |
| **Driver Registration Consent** | Driver's personal data stored in Supabase, shared with transport companies | Consent step in `/chat` flow (step 13) | GDPR Art. 6(1)(a) — affirmative consent |

These are separate. A driver who accepts cookie tracking has NOT given registration consent. A driver who completes registration consent has NOT necessarily accepted tracking cookies. Both are required independently.

See `tracking-consent-vs-driver-consent.md` for full separation analysis.

---

## Consent Categories

Five consent categories govern DriverNord's data processing:

| Category | Required? | What it covers | Default |
|---|---|---|---|
| **Necessary** | Always active — no consent needed | Session management, CSRF protection, Supabase auth session | Always ON |
| **Analytics** | Optional — consent required | Future: PostHog, Plausible, or similar page analytics (not implemented) | OFF |
| **Marketing / Pixel** | Optional — consent required | Meta Pixel (fbevents.js), Meta Conversions API (future) | OFF |
| **Driver Registration** | Required to register — separate flow | Driver personal data processing via `/chat` consent step | OFF until step 13 |
| **Company Data Sharing** | Required to match — separate flow | Sharing driver lead with transport company (future Package 4 action) | OFF until explicit match consent |

**For V1 implementation, only three categories matter for the cookie banner: Necessary, Analytics (placeholder), Marketing/Pixel.**

Driver Registration consent and Company Data Sharing consent are handled separately inside the `/chat` flow and are out of scope for the cookie banner.

---

## Architecture Overview

```
Browser visits any drivernord.com page
  │
  ▼
app/layout.tsx
  ├── <CookieConsentBanner />     ← NEW: renders on first visit if no consent stored
  │     ├── Reads from localStorage: 'dn_cookie_consent'
  │     ├── If null → show banner
  │     └── If set → don't show again (respect stored choice)
  │
  ├── <MetaPixel />               ← EXISTING: reads cookieConsent.marketing
  │     └── Only mounts fbevents.js if:
  │           • NEXT_PUBLIC_META_PIXEL_ENABLED === 'true'  AND
  │           • cookieConsent.marketing === true
  │
  └── Page content renders
```

### Consent State Shape

```typescript
// lib/consent/cookieConsent.ts
export interface CookieConsentState {
  necessary: true;         // always true — not a user choice
  analytics: boolean;      // future analytics tools
  marketing: boolean;      // Meta Pixel, CAPI
  consentedAt: string;     // ISO 8601 timestamp
  consentVersion: string;  // e.g. '1.0' — bump when policy changes, forcing re-consent
}

const CONSENT_STORAGE_KEY = 'dn_cookie_consent';
const CONSENT_VERSION = '1.0';
```

### Reading Consent

```typescript
export function getCookieConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed.consentVersion !== CONSENT_VERSION) return null; // force re-consent on version bump
    return parsed;
  } catch {
    return null;
  }
}

export function hasMarketingConsent(): boolean {
  return getCookieConsent()?.marketing === true;
}
```

### Writing Consent

```typescript
export function setCookieConsent(marketing: boolean, analytics: boolean): void {
  const state: CookieConsentState = {
    necessary: true,
    analytics,
    marketing,
    consentedAt: new Date().toISOString(),
    consentVersion: CONSENT_VERSION,
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
}
```

---

## MetaPixel Integration

The existing `<MetaPixel />` component in `components/analytics/MetaPixel.tsx` currently loads fbevents.js unconditionally when `NEXT_PUBLIC_META_PIXEL_ENABLED=true`. It must be updated to also check cookie consent.

### Required change to MetaPixel.tsx

```tsx
// components/analytics/MetaPixel.tsx
'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { hasMarketingConsent } from '@/lib/consent/cookieConsent';

export default function MetaPixel() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    setConsentGranted(hasMarketingConsent());
  }, []);

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const enabled = process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === 'true';

  if (!enabled || !pixelId || !consentGranted) return null;

  // ... existing Script component
}
```

**Note:** The `useEffect` is critical — `localStorage` is only available client-side. Without it, SSR would throw or silently fail.

### Consent Change Handler

When a user accepts or rejects consent later (e.g., via a consent preferences link), the Pixel must respond:

- **Accept (marketing = true):** Set consent in localStorage → reload page OR trigger Pixel init dynamically
- **Reject (marketing = false):** Set consent in localStorage → do NOT call fbq → do NOT load fbevents.js for the session

Page reload on consent change is simpler and avoids race conditions with fbq. This is acceptable for V1.

---

## Cookie Banner Component Spec

See `cookie-banner-copy-sv.md` for the Swedish copy.

### Component requirements

| Requirement | Detail |
|---|---|
| First-visit trigger | Show if `localStorage['dn_cookie_consent']` is null or version mismatch |
| Position | Bottom of viewport — fixed, full-width bar or centered modal |
| Buttons | "Acceptera alla" (Accept all) + "Endast nödvändiga" (Necessary only) |
| Granular toggle | Optional for V1 — can add per-category toggles in V2 |
| No pre-ticked marketing | Marketing must default to false. Only ticked after explicit "Acceptera alla" |
| Cookie preferences link | In footer — lets users change choice after initial consent |
| No dark patterns | Accept/Reject buttons must be equally prominent. "Reject" must not be hidden or smaller. |
| Accessible | Must be keyboard navigable. Must have role="dialog" and aria-labelledby |

### Component file target

```
components/consent/CookieConsentBanner.tsx   ← new file
lib/consent/cookieConsent.ts                 ← new file
```

---

## localStorage vs Cookie Storage

The consent state is stored in **localStorage**, not a cookie:

| Approach | Pros | Cons |
|---|---|---|
| **localStorage** | No additional cookie set for storing consent; simpler to read in JS | Not accessible server-side; lost if user clears site data |
| **Cookie (httpOnly:false)** | Accessible in SSR; survives some clearing scenarios | Meta irony — using a cookie to gatekeep cookies |

**Decision:** localStorage for V1. The Pixel is a client-side script; consent only needs to be checked client-side. If SSR-gated Pixel loading is needed in future, revisit.

---

## Consent Version Management

Every time the privacy policy or consent scope changes (e.g., CAPI added, new analytics tool), increment `CONSENT_VERSION`. On next visit, `getCookieConsent()` returns null (version mismatch), triggering the banner again.

```
V1.0 → Meta Pixel (browser-side only)
V1.1 → Add CAPI (server-side tracking added)
V2.0 → Add analytics tool
```

Increment major version (1.x → 2.0) when consent scope expands meaningfully. Minor version (1.0 → 1.1) for updates that are less material.

---

## Server-Side Consent Considerations (Future)

When CAPI is implemented, the server-side route (`app/api/leads/[id]/route.ts`) will need to confirm that marketing consent was given before sending CAPI events to Meta. Options:

1. **Pass consent flag as a header from the browser** — simple but spoofable
2. **Store consent_marketing_at in Supabase drivers table** — authoritative but requires schema change
3. **Infer from the event sequence** — if `DriverConsentAccepted` was fired, user completed the flow (not the same as cookie consent)

Recommended: Option 2 (Supabase column `cookie_marketing_consent_at TIMESTAMPTZ`) when CAPI is implemented. Not part of V1 cookie banner task.

---

## What This Document Does NOT Cover

- CAPI server-side consent (see `conversions-api-architecture.md`)
- Driver registration consent (handled in `/chat` flow — see `tracking-consent-vs-driver-consent.md`)
- Privacy policy text (see `privacy-policy-update-requirements.md`)
- Banner Swedish copy (see `cookie-banner-copy-sv.md`)
- Production activation gates (see `meta-pixel-production-activation-gates.md`)
- Consent audit log (see `consent-storage-and-audit-plan.md`)

---

*Version 1.0 — 2026-05-17 — Architecture document. No implementation. Cookie banner not yet built.*
