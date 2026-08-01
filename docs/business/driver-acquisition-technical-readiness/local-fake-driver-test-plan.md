# DriverNord — Local Fake-Driver Test Plan

**Date:** 2026-05-14
**Scope:** Local environment only. No production Supabase. No SMS. No deployment.
**Purpose:** Verify the end-to-end chat flow — including the new GDPR consent step and UTM attribution capture — before any real driver acquisition campaign.

---

## Test Objective

Confirm that:
1. The full 14-step chat flow completes correctly (`lang → ... → name → consent → confirmation`)
2. The GDPR consent step appears, requires active acceptance, and stores all three consent fields
3. UTM attribution fields are captured from the URL and stored
4. Lead is classified, scored, and marked `ready_for_ingestion` on consent (not confirmation)
5. No SMS is sent at any point
6. No production Supabase is touched at any point
7. The rate limiter does not interfere with normal flow

---

## Preconditions

Before running this test:

- [ ] Local Supabase is running: `supabase start` (from the project root)
- [ ] Verify `SUPABASE_URL` contains `127.0.0.1` — STOP if it contains `supabase.co`
- [ ] Local dev server is running: `npm run dev` (from the project root)
- [ ] Migration 013 has been applied to local DB: `psql $LOCAL_DB_URL < migrations/013_add_consent_and_attribution_to_drivers.sql`
- [ ] No previous test leads are contaminating the results (run cleanup SQL below if needed)

**Cleanup SQL (local DB only — never run against production):**
```sql
-- Run ONLY against local Supabase (127.0.0.1)
DELETE FROM ingested_drivers WHERE driver_id IN (
  SELECT id FROM drivers WHERE first_name = 'TestFörareLars'
);
DELETE FROM drivers WHERE first_name = 'TestFörareLars';
```

---

## Fake Driver Profile

Use this exact profile for the test. All values are fake — chosen to produce a HIGH priority lead.

| Field | Value |
|-------|-------|
| Language | Svenska (sv) |
| Region | Stockholm |
| License | CE |
| YKB | valid |
| Driver card | valid |
| Domain | tipp |
| Availability | now |
| Shift preference | day |
| Phone | 0701234567 |
| Email | (skip) |
| First name | TestFörareLars |
| Consent | Jag samtycker (accept) |

**Expected classification:** HIGH priority — Stockholm CE with valid YKB and immediate availability.

---

## Test URL (with sample UTM parameters)

Open the following URL in a browser to start the test:

```
http://localhost:3000/chat?utm_source=meta&utm_medium=paid_social&utm_campaign=ce_drivers_stockholm_may2026&utm_content=variant_a&utm_term=ce+lastbil+stockholm
```

This URL exercises all five UTM fields simultaneously. Use it from the first step (language selection).

---

## Step-by-Step Chat Test

Follow these steps in order. Each step is one screen.

| Step | Screen | Action | Expected result |
|------|--------|--------|-----------------|
| 1 | Language | Click "Svenska" | Proceeds to region screen; UTM fields captured and sent in POST body |
| 2 | Region | Click "Stockholm" | Proceeds to license screen (relocate skipped) |
| 3 | License | Click "CE" | Proceeds to YKB screen |
| 4 | YKB | Click "Ja, giltig YKB" | Proceeds to driver card screen |
| 5 | Driver card | Click "Ja, giltigt körkortstillstånd" | Proceeds to domain screen |
| 6 | Domain | Click "Tipp" | Proceeds to availability screen |
| 7 | Availability | Click "Omgående" | Proceeds to shift preference screen |
| 8 | Shift preference | Click "Dag" | Proceeds to phone screen |
| 9 | Phone | Type `0701234567`, click Fortsätt | Proceeds to email screen |
| 10 | Email | Click "Hoppa över" | Proceeds to name screen |
| 11 | Name | Type `TestFörareLars`, click Fortsätt | Proceeds to **consent screen** |
| 12 | **Consent** | Review consent text, click **"Jag samtycker"** | Proceeds to confirmation screen |
| 13 | Confirmation | Screen loads automatically | Registration complete screen shown |

---

## Consent Step Verification (Step 12 — Critical)

When the consent screen appears, verify ALL of the following before clicking "Jag samtycker":

- [ ] The GDPR eyebrow label is visible: "GDPR — Ditt samtycke"
- [ ] The heading is correct: "Godkänn innan vi registrerar dig"
- [ ] The consent text box is visible and contains the full Swedish consent paragraph
- [ ] The button reads "Jag samtycker" (not "Fortsätt")
- [ ] There is NO skip option
- [ ] The withdrawal note is visible at the bottom

Then click "Jag samtycker" and verify:
- [ ] The consent screen dismisses without error
- [ ] The confirmation screen appears

**Verify the button is REQUIRED:** Reload the chat to step 12 without clicking "Jag samtycker" — the form must NOT advance.

---

## Expected Database State After Test

After the test completes, run these queries against local Supabase:

### Check drivers row:
```sql
SELECT 
  id,
  first_name,
  phone,
  lang,
  region,
  license,
  ykb,
  availability,
  lead_status,
  lead_priority,
  last_step_reached,
  consent_registration_at,
  consent_registration_version,
  consent_scope,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_content,
  utm_term,
  landing_page_url,
  referrer_url
FROM drivers
WHERE first_name = 'TestFörareLars'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected values:**

| Column | Expected value |
|--------|---------------|
| `first_name` | `TestFörareLars` |
| `phone` | `0701234567` |
| `lang` | `sv` |
| `region` | `stockholm` |
| `license` | `CE` |
| `ykb` | `valid` |
| `availability` | `now` |
| `lead_status` | `ready_for_ingestion` |
| `lead_priority` | `HIGH` |
| `last_step_reached` | `7` |
| `consent_registration_at` | non-null ISO timestamp |
| `consent_registration_version` | `driver-consent-v1-2026-05-14` |
| `consent_scope` | `driver_registration_matching_no_company_sharing_without_separate_consent` |
| `utm_source` | `meta` |
| `utm_medium` | `paid_social` |
| `utm_campaign` | `ce_drivers_stockholm_may2026` |
| `utm_content` | `variant_a` |
| `utm_term` | `ce+lastbil+stockholm` |
| `landing_page_url` | `http://localhost:3000/chat?utm_source=meta&...` (full URL) |
| `referrer_url` | `null` or empty (direct navigation in test) |

### Check ingested_drivers row:
```sql
SELECT *
FROM ingested_drivers
WHERE driver_id = (
  SELECT id FROM drivers WHERE first_name = 'TestFörareLars' ORDER BY created_at DESC LIMIT 1
);
```

**Expected:** One row present. Lead was ingested on consent step (not confirmation).

### Confirm no double-ingest:
```sql
SELECT COUNT(*) AS ingest_count
FROM ingested_drivers
WHERE driver_id = (
  SELECT id FROM drivers WHERE first_name = 'TestFörareLars' ORDER BY created_at DESC LIMIT 1
);
```

**Expected:** `ingest_count = 1` (not 2). The double-ingest guard must prevent a second ingest on the confirmation PATCH.

---

## Expected No-SMS Behavior

When the lead reaches `ready_for_ingestion`:
- [ ] No SMS is sent to `0701234567`
- [ ] The application log may show a `console.log` simulated send — this is correct
- [ ] `SMS_PROVIDER` must NOT be set to `46elks` during this test

Verify by checking that `SMS_PROVIDER` is absent or empty in `.env.local`.

---

## Expected No-Production Behavior

- [ ] `SUPABASE_URL` in `.env.local` contains `127.0.0.1` — never `supabase.co`
- [ ] No network requests to `supabase.co` appear in browser DevTools Network tab
- [ ] All DB operations target local Supabase only

---

## Pass/Fail Checklist

| # | Check | Pass / Fail |
|---|-------|-------------|
| 1 | All 13 chat steps complete without JS errors | |
| 2 | Consent screen appears at step 12 (between name and confirmation) | |
| 3 | Consent screen has no skip button | |
| 4 | Clicking "Jag samtycker" advances to confirmation | |
| 5 | Confirmation screen shows "Registrering klar" | |
| 6 | `lead_status = 'ready_for_ingestion'` in drivers table | |
| 7 | `lead_priority = 'HIGH'` in drivers table | |
| 8 | `consent_registration_at` is non-null | |
| 9 | `consent_registration_version = 'driver-consent-v1-2026-05-14'` | |
| 10 | `consent_scope` is correctly stored (not a duplicate of version) | |
| 11 | All 5 UTM fields captured from URL | |
| 12 | `landing_page_url` captured | |
| 13 | One row in `ingested_drivers` (not zero, not two) | |
| 14 | No SMS sent | |
| 15 | No production Supabase touched | |
| 16 | `npm test` passes (578/578) after test completes | |

**All 16 checks must pass before any production deployment or real driver acquisition campaign.**

---

## If Local Supabase Is Not Running

If `supabase start` cannot be run (no Docker, no authorization), the following items can still be partially verified:

- The consent screen renders correctly by running `npm run dev` and navigating to `/chat` with the test URL (uses the in-memory store if Supabase is unavailable)
- The UTM attribution capture can be verified by inspecting the POST request to `/api/leads` in browser DevTools
- The consent step validation can be verified by confirming the "Jag samtycker" button is the only forward action

The database field checks (items 6–13) require local Supabase. Document this limitation if Supabase is not available.

---

*Version 1.0 — 2026-05-14*
*Local environment only. No production Supabase. No SMS. No deployment. No real drivers.*
