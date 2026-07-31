# UTM Capture Validation Checklist

**Date:** 2026-05-18
**Prerequisite:** Migration 013 must be applied before UTM columns exist in Supabase

---

## How UTM Capture Works (Technical Summary)

UTM parameters are read from `window.location.search` in `hooks/useChat.ts` (`readAttribution()`), at the moment the user submits the **first step** (language selection). They are sent in the `POST /api/leads` body and stored on the `drivers` row at row creation.

- Capture point: step = `lang` (first user action)
- Transport: JSON body of `POST /api/leads`
- Storage: written to `drivers` table at row INSERT
- Sanitization: each UTM field is trimmed and limited to 500 chars; `landing_page_url` and `referrer_url` are limited to 2000 chars
- Persistence: captured once at row creation — not updated on subsequent steps

**Seven attribution fields captured:**

| Field | Source | Max length |
|-------|--------|---|
| `utm_source` | `?utm_source=` | 500 chars |
| `utm_medium` | `?utm_medium=` | 500 chars |
| `utm_campaign` | `?utm_campaign=` | 500 chars |
| `utm_content` | `?utm_content=` | 500 chars |
| `utm_term` | `?utm_term=` | 500 chars |
| `landing_page_url` | `window.location.href` | 2000 chars |
| `referrer_url` | `document.referrer` | 2000 chars |

---

## Test URLs

Use these exact URLs to validate each scenario. Replace `https://drivernord.com` with your local dev or staging URL during testing.

### Test 1 — Full UTM Capture (Happy Path)

```
https://drivernord.com/chat?utm_source=facebook&utm_medium=paid_social&utm_campaign=ce-driver-stockholm-v1&utm_content=p2-sunday-text&utm_term=ce-forare
```

**Expected `drivers` row values after completing lang step:**

| Column | Expected value |
|--------|---|
| `utm_source` | `facebook` |
| `utm_medium` | `paid_social` |
| `utm_campaign` | `ce-driver-stockholm-v1` |
| `utm_content` | `p2-sunday-text` |
| `utm_term` | `ce-forare` |
| `landing_page_url` | `https://drivernord.com/chat?utm_source=facebook&utm_medium=...` (full URL) |
| `referrer_url` | Depends on browser — `https://www.facebook.com/...` if coming from Facebook, or empty string if direct |

---

### Test 2 — Partial UTM (Source + Medium only, no campaign)

```
https://drivernord.com/chat?utm_source=instagram&utm_medium=paid_social
```

**Expected:**

| Column | Expected value |
|--------|---|
| `utm_source` | `instagram` |
| `utm_medium` | `paid_social` |
| `utm_campaign` | `NULL` |
| `utm_content` | `NULL` |
| `utm_term` | `NULL` |
| `landing_page_url` | Full URL with only the two params present |
| `referrer_url` | NULL or empty depending on browser |

---

### Test 3 — No UTM Parameters (Direct Navigation)

```
https://drivernord.com/chat
```

**Expected:**

| Column | Expected value |
|--------|---|
| `utm_source` | `NULL` |
| `utm_medium` | `NULL` |
| `utm_campaign` | `NULL` |
| `utm_content` | `NULL` |
| `utm_term` | `NULL` |
| `landing_page_url` | `https://drivernord.com/chat` |
| `referrer_url` | NULL (direct nav has no referrer) |

---

### Test 4 — UTM With Special Characters (Encoding)

```
https://drivernord.com/chat?utm_source=facebook&utm_campaign=ce%20f%C3%B6rare%20stockholm
```

**Expected:**

| Column | Expected value |
|--------|---|
| `utm_source` | `facebook` |
| `utm_campaign` | `ce förare stockholm` (decoded by `URLSearchParams.get()`) |

**Note:** `URLSearchParams.get()` automatically decodes percent-encoded values. Swedish characters (å, ä, ö) are safe.

---

### Test 5 — Oversized UTM Value (Sanitization)

Construct a URL where `utm_campaign` is longer than 500 characters. The value should be truncated to exactly 500 characters in the database.

---

### Test 6 — Mobile Facebook In-App Browser

Open the Test 1 URL inside the Facebook mobile app's built-in browser. This is the real user journey for Meta campaign clicks.

**Expected:** Same as Test 1. The Facebook in-app browser passes UTM parameters normally via `window.location.search`.

**Note on `referrer_url`:** Facebook's in-app browser may or may not pass a referrer header. The `document.referrer` fallback to empty string → NULL handles this gracefully. Do not rely on `referrer_url` being set for Facebook in-app browser traffic.

---

## How to Validate Each Test

### Step 1 — Open the test URL and complete the lang step only

Navigate to the test URL. Select a language (e.g., "Svenska"). Do not proceed further.

### Step 2 — Find the row in Supabase

In Supabase → Table Editor → `drivers` table:
- Sort by `created_at DESC`
- The newest row is your test row (status: `anonymous_dropoff`, `last_step_reached: 0`)

### Step 3 — Check the attribution columns

Scroll right to see `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `landing_page_url`, `referrer_url`.

Verify values match the expected values from the test table above.

### Alternative: SQL query

```sql
SELECT
  id,
  created_at,
  last_step_reached,
  lead_status,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_content,
  utm_term,
  landing_page_url,
  referrer_url
FROM drivers
ORDER BY created_at DESC
LIMIT 5;
```

---

## Consent Column Validation

Run a full registration (complete all 13 steps through confirmation) using the Test 1 URL.

After completion, the row should have:

| Column | Expected value |
|--------|---|
| `consent_registration_at` | Timestamp of when you clicked "Jag samtycker" (within seconds of your action) |
| `consent_registration_version` | `driver-consent-v1-2026-05-14` |
| `consent_scope` | `driver_registration_matching_no_company_sharing_without_separate_consent` |
| `lead_status` | `ready_for_ingestion` |
| `completed_at` | Timestamp (set when status transitions to ready_for_ingestion) |
| All 5 UTM fields | Values from Test 1 URL |
| `landing_page_url` | Full test URL |

---

## Debugging: If UTM Values Are Missing

**Symptom:** UTM columns are NULL in a row that came from a URL with UTM parameters.

**Checklist:**

1. **Migration 013 not applied.** The columns don't exist, so the fallback code strips them before INSERT. Verify the migration was applied (see `final-migration-013-execution.md`).

2. **User reloaded the /chat page mid-flow.** UTMs are captured at the lang step. If the row was created before the UTMs were in the URL (e.g., user navigated to /chat without UTMs, then navigated back with UTMs and started again), the second row captures them but the first row doesn't.

3. **JavaScript error before `readAttribution()` ran.** Check browser console for errors before the lang submit action.

4. **UTMs stripped by intermediary.** Some redirect chains (link shorteners, UTM-stripping proxies) remove query parameters. Test the direct URL without redirects first.

5. **Trailing slash or hash routing.** `window.location.search` reads query params from `?`, not from `#`. If UTMs are after `#` they won't be captured. Meta ad URLs use `?` — this should be fine.

**Debug query — check all recent rows for UTM presence:**

```sql
SELECT
  id,
  created_at,
  utm_source,
  utm_campaign,
  lead_status,
  CASE WHEN utm_source IS NOT NULL THEN 'has_utm' ELSE 'no_utm' END AS utm_present
FROM drivers
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

---

## Meta Ad URL Convention for V1 Campaign

All Meta ad destination URLs should follow this format:

```
https://drivernord.com/chat?utm_source=facebook&utm_medium=paid_social&utm_campaign={campaign_name}&utm_content={ad_set_or_creative_id}&utm_term={target_persona}
```

**Example for P2 Sunday ad:**
```
https://drivernord.com/chat?utm_source=facebook&utm_medium=paid_social&utm_campaign=p2-employed-driver-stockholm-v1&utm_content=p2-sunday-static-01&utm_term=ce-employed
```

**Convention:**
- `utm_source`: always `facebook` or `instagram`
- `utm_medium`: always `paid_social`
- `utm_campaign`: slug format, includes persona (p1/p2), geography, version
- `utm_content`: specific ad creative ID (matches your Meta ad naming)
- `utm_term`: target persona shorthand

Use this convention from the first campaign. Do not use Meta's auto-tagging (`fbclid`) as a substitute — Meta's click ID is not the same as UTM source tracking, and `fbclid` is a separate field not captured in this system.
