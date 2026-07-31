# Company Need Drafts — Promotion Flow v1

_Last updated: 2026-05-19_

---

## Corrected Architecture

The original `company_need_drafts` schema was designed for a B2B sales CRM requiring explicit human approval (Gate 5 / Gate 6) before any record became actionable. That model is too slow for an AI-first system.

The corrected architecture separates **internal system use** (no human approval required) from **external action** (founder approval required):

```
National scan CSV
       ↓
importScanRecords()          ← agent-controlled, idempotent
       ↓
company_need_drafts           ← staging area; no matching, no outreach
       ↓
promoteDraft()               ← system-controlled; no founder approval needed
       ↓
company_needs
  need_type = active_public_need  ← matching-eligible immediately
       ↓
matchingAgent + buildShortlist()  ← internal only; no external contact
       ↓
contactAgent (suggest mode)   ← recommendation prepared, NOT sent
       ↓
[COCKPIT APPROVAL per driver] ← founder approves outreach_approved per need
       ↓
actual SMS / outreach          ← only after explicit approval
```

### Why founder approval is NOT required before internal promotion

- Public scan data (company name, location, job listings) is already public information
- Storing and classifying public opportunities is not a regulated act
- Internal matching produces recommendations, not contact
- No driver profile is shared with any company until cockpit approval
- No company is contacted until cockpit approval

### Why founder approval IS required before external outreach

- Swedish GDPR (Dataskyddsförordningen) governs all personal data processing
- Driver phone numbers, CV data, and work history are personal data
- Company contacts are natural persons — unsolicited commercial contact is regulated
- Marknadsföringslagen prohibits certain unsolicited B2B approaches
- DriverNord's brand depends on high-quality, consent-based introductions

---

## Lifecycle Model

### company_need_drafts.draft_status

| Status | Meaning |
|--------|---------|
| `draft_created` | Created but fields incomplete |
| `incomplete` | Imported from scan; missing required fields |
| `ready_for_review` | All required fields present; can be promoted |
| `approved_for_matching` | (Reserved for future human-approval flow) |
| `rejected` | Manually rejected; blocked from promotion |
| `promoted` | Promoted to company_needs; `converted_need_id` is set |

### company_needs.need_type

| need_type | Matching | Outreach allowed |
|-----------|----------|-----------------|
| `active_public_need` | YES | No |
| `matching_eligible` | YES | No |
| `contact_ready_candidate` | YES | No |
| `outreach_pending_approval` | No | Pending (cockpit) |
| `outreach_approved` | No | YES — cockpit approved |
| `contacted` | No | YES — outreach completed |
| `expired` | No | No |
| `simulation_only` | Only if `ENABLE_SIMULATION_MATCHING=true` | No |
| `archived_test` | No | No |

**MATCHABLE_NEED_TYPES** (matching engine uses only these):
```
active_public_need, matching_eligible, contact_ready_candidate
```

A promoted draft starts as `active_public_need`. Advancing to `outreach_approved` requires explicit cockpit approval per need.

---

## Import Flow

### Source

`lib/scanImportData.ts` — 17 typed `ScanRecord` objects from the national scan CSV (`company-needs-refresh-national-scan-v1.csv`). Records DN-001 through DN-017.

### Running import

```
POST /api/admin/drafts/import
Authorization: x-recruiter-key <RECRUITER_API_KEY>
```

Response:
```json
{
  "ok": true,
  "imported": 14,
  "skipped": 3,
  "errors": []
}
```

Import is **idempotent**: records with an existing `scan_record_id` are skipped. Safe to re-run.

### Status after import

| scan_record_id | Company | Score | Draft status |
|----------------|---------|-------|-------------|
| DN-001 | Canoil AB | 9.0 | ready_for_review |
| DN-002 | JPC Entreprenad AB | 8.3 | ready_for_review |
| DN-003 | Edvardssons Transport & Maskin AB | 8.3 | ready_for_review |
| DN-004 | Kyl & Frysexpressen i Sverige AB | 8.0 | ready_for_review |
| DN-005 | Enskede Bilexpress AB | 8.0 | ready_for_review |
| DN-006 | Gevalia / Jacobs Douwe Egberts | 7.8 | ready_for_review |
| DN-007 | Stockholms Åkeri AB | 7.5 | incomplete |
| DN-008 | Ragn-Sells AB | 7.5 | ready_for_review |
| DN-009 | PostNord Logistics AB | 7.0 | incomplete |
| DN-010 | Trabé AB | 6.5 | **rejected** (not hiring) |
| DN-011 | Bring Frigo AB | 6.5 | incomplete |
| DN-012 | DB Schenker AB | 6.0 | incomplete |
| DN-013 | DHL Freight Sweden AB | 6.0 | incomplete |
| DN-014 | Loomis AB | 5.8 | incomplete |
| DN-015 | Eurest Services (Compass Group) | 5.5 | incomplete |
| DN-016 | Coor Service Management AB | 5.2 | incomplete |
| DN-017 | Veolia Transport Sverige AB | 5.0 | incomplete |

7 records are `ready_for_review` (have all required fields). 9 are `incomplete` (missing domain/license/shift details). 1 is pre-rejected.

---

## Promotion Rules

### Required fields for promotion

A draft must have all of the following:
- `required_license` — CE / C / D
- `domain` — transport / logistics / construction / etc.
- `location_region` — stockholm / gothenburg / malmö / etc.
- `shift_type` — day / night / rotating / flex
- `urgency` — standard / urgent / emergency

### Blocking conditions

| Condition | Error code | HTTP |
|-----------|-----------|------|
| Already promoted (`converted_need_id` set) | `already_promoted` | 409 |
| `draft_status = 'rejected'` | `validation_failed` | 422 |
| Any required field missing | `validation_failed` | 422 |
| Call notes contain 'SIMULATION' or 'DO NOT CONTACT' | `simulation_blocked` | 403 |
| DB insert failure | `db_error` | 500 |

### Promotion endpoint

```
POST /api/admin/drafts/{id}/promote
Authorization: x-recruiter-key <RECRUITER_API_KEY>
```

Success response:
```json
{
  "ok": true,
  "need_id": "uuid",
  "company_id": "uuid",
  "note": "need is active_public_need — matching-eligible; outreach still requires cockpit approval per driver"
}
```

### What promotion does

1. Looks up company by name in `companies` table (case-insensitive); creates if not found
2. Inserts `company_needs` row with `need_type = 'active_public_need'`, `status = 'open'`
3. Updates draft: `draft_status = 'promoted'`, sets `converted_at`, `converted_by = 'agent:promotion_flow_v1'`, sets `converted_need_id`
4. Logs `company_need_draft_promoted` action to `system_actions` with note confirming no outreach_approved was granted

### What promotion does NOT do

- Does NOT send SMS or activate 46elks
- Does NOT contact any company
- Does NOT contact any driver
- Does NOT set `outreach_approved = true`
- Does NOT share any driver profile
- Does NOT run matching (matching runs separately via `matchingAgent`)

---

## Matching Eligibility Rules

After promotion, the need is immediately eligible for matching because `active_public_need` is in `MATCHABLE_NEED_TYPES`.

`getMatchableOpenCompanyNeeds()` in `lib/companyNeedStore.ts` returns only needs where:
- `status = 'open'`
- `need_type IN ('active_public_need', 'matching_eligible', 'contact_ready_candidate')`

Simulation/test needs (`simulation_only`, `archived_test`) are excluded unless `ENABLE_SIMULATION_MATCHING=true` is set in the environment (for controlled testing only).

---

## Contact / Outreach Safety Gates

All external contact paths remain blocked until explicit approval:

### Gate 1 — contactAgent mode

`AGENT_CONTACT_MODE=suggest` (default). Even if matching produces a high-scoring shortlist, contactAgent only logs the recommendation; it does not send SMS.

### Gate 2 — 46elks not configured

`TWILIO_AUTH_TOKEN` / 46elks credentials are not in the production environment. SMS physically cannot be sent.

### Gate 3 — outreach_approved per need

Each `company_needs` row starts without `outreach_approved`. The cockpit must explicitly set this before any outreach action proceeds.

### Gate 4 — per-driver cockpit approval

Contact is approved per driver per need in the recruiter cockpit (`/recruiter`). The system does not auto-approve any driver contact.

### Gate 5 — no outreach_approved set during promotion

`promoteDraft()` explicitly does NOT set `outreach_approved`. The audit log entry records this fact: `'approved without outreach_approved — outreach still requires cockpit approval per driver'`.

---

## Simulation Cleanup

Migration 015 runs the following reversible UPDATE statements:

```sql
-- Mark simulation company needs
UPDATE company_needs SET need_type = 'simulation_only', status = 'closed'
  WHERE company_id IN (SELECT id FROM companies WHERE name ILIKE '%SIMULATION%' OR name ILIKE 'SIM-%');

-- Mark test/probe company needs
UPDATE company_needs SET need_type = 'archived_test', status = 'closed'
  WHERE company_id IN (SELECT id FROM companies WHERE name ILIKE '%Test%' OR name ILIKE '%Probe%' OR name ILIKE '%Auth Test%');
```

These are non-destructive. Original rows are preserved with their history. They are simply excluded from matching and the real_open count in operational intelligence.

The old name-pattern simulation detection (`isSimulationCompanyName()`) is no longer used by `getMatchableOpenCompanyNeeds()`. It remains exported from `lib/warnings.ts` for use by `getSystemWarnings()` only.

---

## Operational Intelligence

`GET /api/admin/operational-intelligence` now returns:

```json
{
  "company_needs": {
    "total_open": 5,
    "simulation_only": 2,
    "archived_test": 1,
    "real_open": 2,
    "matching_eligible": 2,
    "outreach_pending_approval": 0,
    "outreach_approved": 0,
    "external_contact_blocked": true
  },
  "drafts": {
    "total": 17,
    "ready_for_review": 7,
    "incomplete": 9,
    "rejected": 1,
    "promoted": 0
  }
}
```

When `real_open === 0`, an urgent action is added to the response:
```json
{
  "type": "no_real_company_need",
  "severity": "urgent",
  "message": "No real company needs are open. Promote a draft to enable matching."
}
```

---

## Listing Drafts

```
GET /api/admin/drafts?status=ready_for_review&limit=10
Authorization: x-recruiter-key <RECRUITER_API_KEY>
```

Valid status values: `draft_created`, `incomplete`, `ready_for_review`, `approved_for_matching`, `rejected`, `promoted`

Multiple statuses: `?status=ready_for_review,incomplete`

---

## Recommended First Pilot Promotion

### Option A: JPC Entreprenad AB (DN-002, score 8.3)

**Why**: Construction sector CE driver need in Stockholm. All required fields complete. Score 8.3. Lower profile than Canoil but strong evidence of hiring activity and a defined contact path. Good test case for matching quality.

**Promotion command**:
```
POST /api/admin/drafts/{dn-002-uuid}/promote
```

### Option B: Edvardssons Transport & Maskin AB (DN-003, score 8.3)

**Why**: Regional transport company. Active CE hiring. Score matches JPC. Good for testing matching against a smaller, regionally-focused company profile.

### Option C: Canoil AB (DN-001, score 9.0)

**Why**: Highest score in the scan. Fuel logistics, CE license. But: score 9.0 may reflect data richness more than hiring urgency. Recommend as second promotion after validating matching quality with a lower-stakes pilot.

### Recommendation

Promote **JPC Entreprenad (DN-002)** first. It has a clear CE need, strong evidence, and a mid-range profile that makes it a good canary. If matching produces quality shortlist candidates, promote Edvardssons and Canoil in sequence.

**Do not promote all 7 ready_for_review drafts at once.** Promote one, verify matching output, verify no unintended outreach was triggered, then proceed.

---

## Files Changed in This Implementation

| File | Change |
|------|--------|
| `migrations/014_extend_company_need_drafts.sql` | Extends draft_status enum, adds scan_record_id + metadata columns |
| `migrations/015_add_need_type_to_company_needs.sql` | Adds need_type + source_draft_id columns; runs simulation cleanup |
| `lib/companyNeed.ts` | Adds NeedType union, MATCHABLE_NEED_TYPES |
| `lib/systemActions.ts` | Adds `company_need_draft_promoted` ActionType |
| `lib/companyNeedStore.ts` | Updates CompanyNeedRow, createCompanyNeed opts, getMatchableOpenCompanyNeeds |
| `lib/scanImportData.ts` | 17 typed ScanRecord objects from national scan CSV |
| `lib/companyNeedDraft.ts` | importScanRecords(), promoteDraft(), listDrafts(), getDraftById() |
| `app/api/admin/drafts/route.ts` | GET /api/admin/drafts with status + limit filters |
| `app/api/admin/drafts/import/route.ts` | POST /api/admin/drafts/import |
| `app/api/admin/drafts/[id]/promote/route.ts` | POST /api/admin/drafts/[id]/promote |
| `app/api/admin/operational-intelligence/route.ts` | Adds company_needs + drafts summary to response |
| `app/admin/contacts/page.tsx` | Fixes urgencyColor bug (high → urgent) |
| `app/api/admin/contacts/[id]/route.ts` | Adds atomic race guard to skip + needs_review handlers |
| `lib/applyStep.ts` | Rejects phone numbers in name step |
| `tests/applyStep.test.ts` | 4 new tests for name step validation |
| `tests/contactApproval.test.ts` | Updated mock chain + 2 new race-condition tests |
| `tests/companyNeedDraft.test.ts` | Full test suite for import, promote, list flows |
