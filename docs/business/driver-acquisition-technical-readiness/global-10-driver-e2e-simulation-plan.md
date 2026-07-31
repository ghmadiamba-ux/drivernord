# DriverNord — Global 10-Driver E2E Simulation Plan

**Date:** 2026-05-14
**Scope:** Local in-memory simulation only — no production Supabase, no SMS, no deployment.
**Purpose:** Stress-test the complete driver acquisition pipeline before Meta campaign preparation. Validate consent capture, attribution, classification, ingestion, scoring, and package readiness logic.

---

## Safety Boundaries

| Boundary | Status |
|----------|--------|
| SUPABASE_URL in .env.local | Contains `supabase.co` (production) |
| Simulation DB mode | In-memory only — all supabaseStore and ingestedDriverStore calls mocked via vi.mock |
| Production Supabase touched | **NEVER** — mocks prevent all real connections |
| SMS provider | Not configured — simulated only |
| Deployment | **NOT PERFORMED** |
| Real drivers contacted | **NEVER** |
| Real companies contacted | **NEVER** |
| Real personal data used | **NONE** — all names/phones are reserved test data |

**Implementation method:** Vitest test file (`tests/e2e-10-driver-simulation.test.ts`) using:
- `vi.mock('../lib/supabaseStore')` — all getLead/updateLead/createLead calls intercepted
- `vi.mock('../lib/ingestedDriverStore')` — all createIngestedDriver calls intercepted
- `applyStep()`, `buildDriverProfile()`, `buildIngestedDriver()`, `scoreDriver()` — pure functions, no DB required
- `ingestLead()` — tested with mocked dependencies

---

## Fake Driver Profile Table

All phone numbers use reserved test range +46700000001–+46700000010. All names are fictional.

| # | Name | License | YKB | Driver Card | Region | Relocate | Availability | Shift | Phone | UTM Content |
|---|------|---------|-----|-------------|--------|----------|--------------|-------|-------|-------------|
| D1 | SimLeif Johansson | CE | valid | valid | stockholm | N/A | now | day | +46700000001 | driver_01 |
| D2 | SimBritta Lindberg | CE | valid | valid | other_sweden | yes | 2_weeks | night | +46700000002 | driver_02 |
| D3 | SimMagnus Eriksson | C | valid | valid | stockholm | N/A | now | flexible | +46700000003 | driver_03 |
| D4 | SimIngrid Pettersson | CE | none | valid | stockholm | N/A | now | day | +46700000004 | driver_04 |
| D5 | SimThore Andersson | D | valid | valid | stockholm | N/A | 1_month | day | +46700000005 | driver_05 |
| D6 | SimElsie Nilsson | CE | valid | no | stockholm | N/A | now | day | +46700000006 | driver_06 |
| D7 | SimRune Berg | CE | valid | valid | other_sweden | yes | now | flexible | +46700000007 | driver_07 |
| D8 | SimKerstin Holm | C | none | no | stockholm | N/A | not_yet | night | +46700000008 | driver_08 |
| D9 | SimHarald Qvist | none | N/A | N/A | stockholm | N/A | N/A | N/A | N/A | driver_09 |
| D10 | SimGreta Strand | CE | valid | valid | stockholm | N/A | now | day | +46700000010 | driver_10 |

---

## Expected Classification Per Driver

| # | lead_status | lead_priority | Notes |
|---|-------------|---------------|-------|
| D1 | ready_for_ingestion | HIGH | CE + valid YKB + now + stockholm |
| D2 | ready_for_ingestion | HIGH | CE + valid YKB + 2_weeks + relocatable |
| D3 | ready_for_ingestion | HIGH | C + valid YKB + now + stockholm |
| D4 | ready_for_ingestion | MEDIUM | CE + no YKB + stockholm (YKB not valid → not HIGH) |
| D5 | ready_for_ingestion | MEDIUM | D + valid YKB + 1_month (not now/2_weeks → not HIGH) |
| D6 | ready_for_ingestion | HIGH | CE + valid YKB + now (driver_card=no does not affect classifyPriority) |
| D7 | ready_for_ingestion | HIGH | CE + valid YKB + now + relocatable |
| D8 | ready_for_ingestion | MEDIUM | C + no YKB + not_yet + stockholm |
| D9 | disqualified | null | license=none → disqualified at license step |
| D10 | ready_for_ingestion | HIGH | CE + valid YKB + now + stockholm (same as D1) |

---

## Expected Ingestion Result

| # | Ingested? | Score (total) | Score Tier | Shortlist Eligible? | Blocker |
|---|-----------|---------------|------------|---------------------|---------|
| D1 | YES | 98 | HIGH | YES | — |
| D2 | YES | 85 | HIGH | YES | — |
| D3 | YES | 93 | HIGH | YES | — |
| D4 | YES | 73 | MEDIUM (capped from HIGH by ykb_missing) | NO | ykb=none hard filter |
| D5 | YES | 70 | MEDIUM (capped from base MEDIUM by bus_segment) | YES | — |
| D6 | YES | 98 | HIGH | NO | driver_card=no hard filter |
| D7 | YES | 91 | HIGH | YES | — |
| D8 | YES | 50 | MEDIUM | NO | ykb=none + driver_card=no hard filters |
| D9 | NO | N/A | N/A | NO | Disqualified — never reaches ready_for_ingestion |
| D10 | YES | 98 | HIGH | YES | — |

**Score formula:**
- License: CE=33, C=28, D=18
- YKB: valid=25, none=0
- Availability: now=20, 2_weeks=14, 1_month=7, not_yet=2
- Location: stockholm=20, other_sweden+relocate=13

---

## Expected Consent Result

All drivers who reach the consent step (D1–D8, D10) must show:
- `consent_registration_at` = non-null ISO timestamp
- `consent_registration_version` = `'driver-consent-v1-2026-05-14'`
- `consent_scope` = `'driver_registration_matching_no_company_sharing_without_separate_consent'`

D9 (disqualified) never reaches the consent step — consent fields remain null.

---

## Expected Attribution Result

All drivers receive UTM attribution fields set at registration (simulated at lead creation):
- `utm_source` = `'simulation'`
- `utm_medium` = `'e2e_test'`
- `utm_campaign` = `'driver_acquisition_global_simulation'`
- `utm_content` = `'driver_01'` through `'driver_10'` (unique per driver)
- `landing_page_url` = `'http://localhost:3000/chat'`

---

## Expected Package 4 and Package 2 Readiness

### Package 4: Akut Förarsökning (1 CE driver, 48h delivery)
- Requires: CE license + valid YKB + available (now or 2_weeks) + Stockholm or relocatable + shortlist eligible
- Threshold: ≥5

| Driver | CE? | Valid YKB? | Available? | Stockholm/Relocatable? | Shortlist Eligible? | Package 4 Qualified? |
|--------|-----|-----------|-----------|----------------------|--------------------|--------------------|
| D1 | YES | YES | now | YES (stockholm) | YES | **YES** |
| D2 | YES | YES | 2_weeks | YES (relocate) | YES | **YES** |
| D6 | YES | YES | now | YES (stockholm) | NO (driver_card=no) | NO |
| D7 | YES | YES | now | YES (relocate) | YES | **YES** |
| D10 | YES | YES | now | YES (stockholm) | YES | **YES** |

**Package 4 count: 4 (D1, D2, D7, D10). Threshold ≥5: NOT MET. Expected — dataset has only 10 drivers. System functions correctly; insufficient supply, not system failure.**

### Package 2: Verifierad Förarlista (3–5 drivers shortlist)
- Requires: ≥15 qualified, shortlist-eligible drivers in database
- Shortlist-eligible drivers in simulation: D1, D2, D3, D5, D7, D10 = 6 drivers
- Threshold ≥15: NOT MET. Expected — dataset size.

---

## Edge Cases Tested

| Edge Case | Driver | Expected Behavior |
|-----------|--------|-------------------|
| No license → disqualified | D9 | Routes to disqualified terminal, not ingested |
| No YKB → ingested but filtered from shortlists | D4, D8 | Ingested; ykb=none hard filter rejects from buildShortlist |
| No driver card → ingested but filtered from shortlists | D6, D8 | Ingested; driver_card=no hard filter rejects |
| Outside Stockholm + relocate=yes → HIGH priority | D2, D7 | HIGH priority, eligible for matching |
| D license → bus_segment flag, MEDIUM tier | D5 | MEDIUM score tier despite valid YKB |
| Unavailable driver → ingested, follow_up scheduled | D8 | MEDIUM priority, follow_up_at set |
| Re-registration same phone | D10 vs D1 | Treated as separate lead (no cross-lead dedup in V1) |
| Double-ingest guard | D10 | Consent PATCH ingests; confirmation PATCH does NOT ingest again |
| Rate limiting | Simulated | 10 requests allowed per IP; 11th blocked |
| Consent required | All completing drivers | No consent → no ready_for_ingestion |

---

*Version 1.0 — 2026-05-14 — Simulation plan only. No deployment. No production DB. No SMS. No ads.*
