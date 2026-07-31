# DriverNord — Tracking Consent vs. Driver Registration Consent

**Date:** 2026-05-17
**Status:** REFERENCE
**Audience:** Claude Code + founder + GDPR lawyer review

---

## The Core Distinction

DriverNord collects two completely separate types of consent from two overlapping but distinct user groups. These must never be conflated in code, documentation, or legal disclosures.

---

## Consent Type A: Cookie / Tracking Consent

**Legal instrument:** ePR (ePrivacy Regulation) + GDPR Art. 6(1)(a)
**Swedish law:** Cookielagen (SFS 2003:389, updated under GDPR alignment)
**Who gives it:** Any visitor to drivernord.com — whether they are a driver, a company representative, or someone who clicked by mistake
**When:** On the first page load, before any tracking begins
**Mechanism:** Cookie consent banner with affirmative choice
**Scope:** Permission to load fbevents.js and allow Meta to track behavior on the site
**Storage:** localStorage key `dn_cookie_consent`
**Default:** OFF — tracking does not happen until the user affirmatively accepts

### What it gates

| Without this consent | With this consent |
|---|---|
| fbevents.js does NOT load | fbevents.js loads |
| PageView does NOT fire | PageView fires |
| ViewContent does NOT fire | ViewContent fires |
| DriverChatStarted does NOT fire | DriverChatStarted fires |
| All Meta Pixel events blocked | Cookie-gated Meta events can fire |

### Who this applies to

ALL visitors to drivernord.com. Not just drivers. A transport company visiting the homepage is also subject to cookie consent rules.

---

## Consent Type B: Driver Registration Consent (GDPR Affirmative Consent)

**Legal instrument:** GDPR Art. 6(1)(a) + Art. 13 information obligation
**Swedish law:** Same GDPR implementation
**Who gives it:** Only drivers who actively choose to register via the `/chat` qualification flow
**When:** At step 13 of 14 in the intake chat — after completing all qualification questions
**Mechanism:** In-chat consent step with "Jag samtycker" button
**Scope:** Permission to store the driver's personal data (name, phone, email, license class, YKB, region, availability) in DriverNord's database and share it with transport companies for matching
**Storage:** `drivers.consent_registration_at` column in Supabase
**Default:** OFF — no personal data is stored until the driver clicks "Jag samtycker"

### What it gates

| Without this consent | With this consent |
|---|---|
| Driver's personal data NOT stored | Personal data stored in `drivers` table |
| Lead NOT classified | Lead classified (status + priority) |
| Lead NOT ingested to `ingested_drivers` | Lead ingested and eligible for matching |
| Lead NOT shared with companies | Lead eligible to be shared (Package 4) |
| DriverConsentAccepted event does NOT fire | DriverConsentAccepted fires |
| DriverRegistrationCompleted does NOT fire | DriverRegistrationCompleted fires |
| QualifiedDriverLead does NOT fire | QualifiedDriverLead fires (if qualified) |
| HighPriorityDriverLead does NOT fire | HighPriorityDriverLead fires (if HIGH priority) |

### Who this applies to

Only active drivers who complete the full 14-step qualification flow. A company visiting the homepage is NOT subject to this consent. A driver who abandons the chat at step 5 has NOT given this consent and no data about them is stored.

---

## Why These Two Consents Are Completely Separate

### Different legal basis

Both use GDPR Art. 6(1)(a) consent as the legal basis, but:

- **Cookie consent** is required by ePR (which overrides GDPR for cookies/tracking) — no other legal basis is available for non-essential tracking. Legitimate interests cannot be used.
- **Registration consent** is required because drivers are sharing their personal data for the explicit purpose of job matching — again, consent is the most appropriate basis, and it aligns with the transactional nature of the service.

### Different timing

| | Cookie consent | Registration consent |
|---|---|---|
| **First possible moment** | Before any page loads | After completing 13 qualification questions |
| **Latest possible moment** | Must happen before any tracking | Must happen before personal data is stored |
| **Who triggers it** | Banner auto-appears | In-chat "Jag samtycker" step |

### Different data subjects

| | Cookie consent | Registration consent |
|---|---|---|
| **Who gives it** | Any visitor (anonymous or identified) | Only drivers who complete the qualification flow |
| **What they consent to** | Being tracked by Meta across sessions | Having their personal data stored and shared |

### Different withdrawal mechanisms

| | Cookie consent | Registration consent |
|---|---|---|
| **How to withdraw** | Cookie preferences link in footer → set marketing=false | Email hej@drivernord.com with deletion request |
| **Effect of withdrawal** | Pixel stops loading on next page load | Driver data must be deleted within 30 days (GDPR Art. 17) |
| **Automatic effect on other consent** | Withdrawing cookie consent does NOT delete registration data | Withdrawing registration consent does NOT affect cookie preference |

---

## A Driver Can Be in Any of Four States

| Cookie consent | Registration consent | Meaning |
|---|---|---|
| No | No | Visitor who hasn't interacted with either banner or chat |
| Yes | No | Driver (or anyone) who accepted cookies but hasn't completed registration |
| No | Yes | Driver who registered but refused cookie tracking (unlikely but legally valid) |
| Yes | Yes | Driver who accepted both — full pipeline participant |

All four states are valid and must be handled correctly by the system.

---

## Implications for Meta Pixel Event Firing

This separation explains the event gating model in `pixel-event-architecture.md`:

```
PageView, ViewContent, DriverChatStarted
  → Gated by: Cookie consent ONLY
  → No driver personal data involved
  → These are funnel-measurement signals, not personal data signals

DriverConsentAccepted, DriverRegistrationCompleted, QualifiedDriverLead, HighPriorityDriverLead
  → Gated by: Cookie consent AND (implicitly) Registration consent
  → Registration consent is implied by the step flow
     (you can only reach step 'confirmation' if you passed step 'consent' → 'accepted')
  → Cookie consent must also be given — without it, fbevents.js never loaded
     and these events cannot fire regardless
```

The current implementation has a **gap**: `PageView`, `ViewContent`, and `DriverChatStarted` can fire when `NEXT_PUBLIC_META_PIXEL_ENABLED=true` WITHOUT any cookie consent banner existing. This is why `NEXT_PUBLIC_META_PIXEL_ENABLED=false` in production is the correct current state.

The gap is closed by implementing the cookie consent banner described in `cookie-consent-architecture.md`.

---

## What Must NOT Happen

| Prohibited action | Why |
|---|---|
| Using registration consent as a proxy for cookie consent | They are different legal acts with different scopes |
| Firing PageView before cookie consent is given | Violates ePR + Swedish cookielagen |
| Showing registration consent checkbox as part of cookie banner | These are separate decisions — combining them creates an invalid bundled consent |
| Pre-ticking the "marketing/Pixel" checkbox | Swedish DPA (IMY) guidance prohibits pre-ticked opt-in for tracking |
| Using "legitimate interests" as legal basis for Meta Pixel | Not available for ePR-regulated tracking |
| Implying that clicking "Jag samtycker" in the chat grants cookie consent | It does not — these are separate |

---

## Summary for GDPR Lawyer Review

When the Swedish GDPR lawyer reviews this architecture, the key questions to answer are:

1. Is GDPR Art. 6(1)(a) the correct legal basis for both consent types? (Expected: yes)
2. Is the cookie consent banner design compliant with IMY's guidance on granularity and presentation?
3. Does the driver registration consent text (C-L2 in the chat) satisfy Art. 13 information obligations?
4. Is localStorage an acceptable storage mechanism for consent records, or must they be stored in a cookie or database?
5. Does the consent version bump mechanism satisfy the requirement to re-obtain consent after material changes?
6. Does withdrawing registration consent require deletion of ALL data, or only the data collected under that consent? (Affects whether scoring/classification data must also be deleted)

---

*Version 1.0 — 2026-05-17 — Reference document. No implementation decisions made here.*
