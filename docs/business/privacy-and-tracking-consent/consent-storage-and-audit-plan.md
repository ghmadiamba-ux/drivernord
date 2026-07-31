# DriverNord — Consent Storage and Audit Plan

**Date:** 2026-05-17
**Status:** PLAN_DEFINED — NOT IMPLEMENTED
**Audience:** Claude Code implementation guide + GDPR lawyer review

---

## What Must Be Stored

GDPR Art. 7(1) requires controllers to be able to demonstrate that consent was given. For DriverNord, two types of consent must be auditable:

| Consent type | Must demonstrate | Storage location |
|---|---|---|
| Cookie/Tracking consent | That a visitor gave marketing consent before tracking began | localStorage (client-side) + optionally server-side |
| Driver registration consent | That a driver actively accepted data processing before any personal data was stored | Supabase `drivers.consent_registration_at` (already implemented) |

---

## Cookie Consent Storage (V1)

### localStorage structure

```typescript
// Key: 'dn_cookie_consent'
// Value: JSON string

{
  "necessary": true,
  "analytics": false,
  "marketing": true,
  "consentedAt": "2026-05-17T14:32:00.000Z",
  "consentVersion": "1.0"
}
```

### What each field proves

| Field | Legal function |
|---|---|
| `marketing: true` | User affirmatively accepted marketing cookies |
| `consentedAt` | Timestamp of consent — proves timing |
| `consentVersion` | Which version of the privacy policy/consent text was shown |
| `necessary: true` | Hardcoded — not a user choice, but documents that only necessary cookies are used without consent |

### Limitations of localStorage-only storage

| Limitation | Risk | Mitigation |
|---|---|---|
| User can clear site data | Consent record lost — banner will reappear | Acceptable — consent is re-obtained |
| Not accessible server-side | Cannot verify consent in API routes | For V1, CAPI not implemented — acceptable |
| Not auditable by DriverNord | Cannot prove a specific user gave consent on a specific date | Medium risk — see V2 plan below |
| Shared device scenarios | One user's consent applies to the browser, not the individual | Accepted limitation of localStorage approach |

**For V1 (browser Pixel only), localStorage-only storage is acceptable.** The main protection is the code gate — if the Pixel cannot load without the consent flag, then any Pixel event that fires is proof that consent was given (since the flag must have been set).

---

## V2 — Server-Side Consent Logging (Required Before CAPI)

When CAPI is implemented, server-side routes send events to Meta. Those routes need server-side proof of consent — localStorage is not accessible from the server.

### Proposed Supabase schema addition

```sql
-- To be added in a future migration (NOT migration 013 — that is already defined)
-- This is a proposal only — not implemented

ALTER TABLE drivers
  ADD COLUMN cookie_marketing_consent_at TIMESTAMPTZ,
  ADD COLUMN cookie_consent_version TEXT;
```

### When the column would be populated

After a visitor gives cookie consent AND subsequently becomes a registered driver, the `cookie_marketing_consent_at` could be populated at the time the lead is created. However, this approach has a gap: many cookie consent events happen before any driver record exists.

### Alternative: Separate consent log table

```sql
-- Proposal — NOT implemented
CREATE TABLE cookie_consent_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,         -- anonymous session identifier (not a user ID)
  marketing_accepted BOOLEAN NOT NULL,
  analytics_accepted BOOLEAN NOT NULL,
  consent_version TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  page_url TEXT
);
```

**Pros:** Full audit trail. Proves consent for any session.
**Cons:** Stores browser fingerprint data — this itself requires GDPR consideration. Session ID must be anonymous.
**Legal review required:** Whether storing session_id + consent in Supabase is required or just best practice. Lawyer must advise.

**For V1:** Do not implement the consent log table. Use localStorage only. Implement server-side consent logging as part of the CAPI implementation task.

---

## Driver Registration Consent (Already Implemented)

The driver registration consent audit trail is already in place:

| Field | Location | Value when consent given |
|---|---|---|
| `consent_registration_at` | `drivers` table | TIMESTAMPTZ of consent click |

This is populated when the driver clicks "Jag samtycker" in the chat flow. The `PATCH /api/leads/[id]` route writes this value.

This satisfies GDPR Art. 7(1) for registration consent — the timestamp is stored server-side and is durable.

---

## Consent Withdrawal and Deletion

### Cookie consent withdrawal

| Action | Mechanism | Effect |
|---|---|---|
| User clicks "Hantera cookieinställningar" in footer | Opens consent banner with current settings | User can change to "Endast nödvändiga" |
| User sets marketing to false | `setCookieConsent(marketing: false, ...)` called | `dn_cookie_consent.marketing` = false |
| On next page load | `MetaPixel.tsx` reads consent → returns null | fbevents.js does not load |

**Note:** Withdrawing cookie consent does NOT delete any data already sent to Meta before withdrawal. Meta retains data according to their own retention policies. This must be disclosed in the privacy policy.

### Driver registration consent withdrawal (GDPR Art. 17)

| Trigger | Response time | Action |
|---|---|---|
| Driver emails hej@drivernord.com requesting deletion | 30-day maximum (target: 5 business days) | Founder deletes driver record from Supabase |

Currently manual. Future Email Agent classification: `LEGAL_GDPR_REQUEST` → escalate to founder immediately.

---

## Consent Version Management

When any of the following changes, the consent version must be bumped and users must re-consent:

| Change | Version bump | Re-consent required |
|---|---|---|
| Meta Pixel added or changed | Yes | Yes — existing consent was for a different scope |
| CAPI (server-side tracking) added | Yes | Yes — new processing scope |
| New analytics tool added | Yes | Yes |
| Privacy policy wording updated (material change) | Yes | Yes |
| Minor wording fix in privacy policy | No | No |
| Meta Pixel removed | N/A | N/A — no new consent needed |

### Current version: 1.0

When CAPI is added: bump to 1.1 (adds server-side tracking disclosure).

---

## Data Subject Requests

All data subject requests (access, deletion, correction, portability) must be handled within 30 days.

| Request type | Who handles | Process |
|---|---|---|
| Data deletion (Art. 17) | Founder | Email to hej@drivernord.com → Email Agent flags as LEGAL_GDPR_REQUEST → Founder deletes from Supabase |
| Data access (Art. 15) | Founder | Email to hej@drivernord.com → Founder exports driver record |
| Data correction (Art. 16) | Founder | Email to hej@drivernord.com → Founder updates record |
| Consent withdrawal (Art. 7(3)) | Self-service (footer link) for cookies; email for registration data | Cookie: auto via localStorage. Registration: manual deletion |

---

## Audit Readiness for IMY Inspection

If IMY (Swedish DPA) inspects DriverNord's Meta Pixel use, the following must be demonstrable:

| Requirement | Evidence | Current status |
|---|---|---|
| Consent obtained before tracking | Code gate in MetaPixel.tsx (cannot load without consent flag) | PENDING — gate not yet implemented |
| Consent was affirmative (not pre-ticked) | Banner design (both buttons equally prominent, no pre-ticking) | PENDING — banner not yet built |
| Consent text was clear and specific | Banner copy + privacy policy | PENDING — copy drafted, not deployed |
| Users can withdraw consent | Footer link → consent change | PENDING — not yet implemented |
| Consent records exist | localStorage (V1); server log (V2) | PENDING |
| Data minimization applied | No PII in Meta Pixel payloads | IMPLEMENTED — sanitizePayload() in metaPixel.ts |
| Privacy policy updated | Privacy policy page on drivernord.com | PENDING |

---

## Summary of V1 vs V2 Storage

| Feature | V1 (Browser Pixel launch) | V2 (CAPI launch) |
|---|---|---|
| Consent storage | localStorage | localStorage + Supabase consent log |
| Server-side consent verification | Not needed (no CAPI) | Required |
| Audit trail | Code-enforced (gate proves consent was given) | Full timestamp log per session |
| Deletion | Footer link for cookies; email for registration | Same |

---

*Version 1.0 — 2026-05-17 — Plan only. No implementation. localStorage approach selected for V1.*
