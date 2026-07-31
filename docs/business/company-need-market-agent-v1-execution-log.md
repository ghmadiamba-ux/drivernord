# Company Need Market Agent V1 — Execution Log

**Date:** 2026-05-20  
**Session scope:** OI proxy bug fix · JPC duplicate resolution · Enskede promotion + matching · Full test verification · Migration 018 (pending apply)

---

## 1. System state going in

| Entity | Count |
|--------|-------|
| Company needs (active) | 3 |
| Company need drafts (total) | 17 |
| Drafts — ready_for_review | 6 |
| Drafts — incomplete | 9 |
| Drafts — promoted | 1 (Edvardssons, earlier session) |
| Drafts — rejected | 1 (JPC duplicate, this session) |

Active needs entering this session:
- **JPC Maskin** (`33bc791f`) — CE / schakt_bygg / stockholm / urgent
- **Edvardssons Maskin** (`3c9b5e48`) — CE / schakt_bygg / stockholm / urgent

---

## 2. Bug fix: OI Proxy — drafts returning 0

**Symptom:** `/api/admin/operational-intelligence` returned `drafts.total: 0`, `promotion_candidates: 0`, `stale_signals: 0` despite 17 real drafts in DB.

**Root cause:** The OI route used a bare `db.from('company_need_drafts').select('id, draft_status')` call. In the Next.js / Supabase JS v2 context this consistently returned 0 rows for this table (same pattern works on `company_needs`; root cause not fully isolated — possible PostgREST schema cache or RLS edge case).

**Fix:** Replaced with `listDrafts({ limit: 200 })` from `lib/companyNeedDraft.ts`, which uses the proven `.select('*').order('created_at', {ascending: false}).limit(n)` chain.

**Files changed:**
- `app/api/admin/operational-intelligence/route.ts` — import `listDrafts`, remove raw DB call, adjust destructure and draft_status access
- `tests/operationalIntelligence.test.ts` — mock `listDrafts` instead of `db.from('company_need_drafts')`

**Outcome:** OI now reports correct draft totals. All 1064 tests pass.

---

## 3. Migration 018 — DB constraint gap discovered

**Background:** `logAction()` in `lib/systemActions.ts` swallows DB errors silently (console.error only, never throws). This means CHECK constraint violations produce no visible failure — operations succeed, audit trail silently drops.

**Gap identified:** Comparing `ActionType` union in `lib/systemActions.ts` against the live `system_actions_action_type_check` constraint revealed 5 action types and 1 status value actively called in production code but missing from the DB constraint:

| Value | Caller | Missing since |
|-------|--------|---------------|
| `high_priority_lead_detected` | `lib/ingestLead.ts` | migration 017 |
| `contact_skipped_by_founder` | `app/api/contacts/route.ts` | migration 017 |
| `contact_needs_review` | `app/api/contacts/route.ts` | migration 017 |
| `company_need_draft_promoted` | `lib/companyNeedDraft.ts` | this session |
| `company_need_draft_rejected` | `lib/companyNeedDraft.ts` | this session |
| `needs_review` (status) | `app/api/contacts/route.ts` | migration 017 |

**Files created:**
- `migrations/018_extend_system_actions_contact_and_draft.sql` — canonical migration with grouped comments per origin
- `docs/sql/apply-migration-018.sql` — production apply script with verification queries

**Status: PENDING USER ACTION** — must be applied via Supabase Dashboard SQL editor before audit trail logging is fully functional for the values above.

---

## 4. JPC duplicate draft — rejected

**Draft:** `d889712d` — JPC Maskin AB, created from scan record, status `ready_for_review`  
**Reason:** JPC already has a live company_need (`33bc791f`) created earlier via direct REST insert. Promoting this draft would create a second redundant need.

**Action taken:** `POST /api/admin/drafts/d889712d/reject` with `reason: "duplicate_of_live_need"`

**New infrastructure built:**
- `lib/companyNeedDraft.ts` — added `rejectDraft()` function with idempotency guards (blocks rejecting promoted drafts)
- `lib/systemActions.ts` — added `company_need_draft_rejected` to `ActionType` union
- `app/api/admin/drafts/[id]/reject/route.ts` — new POST endpoint (recruiter-auth protected); 409 for promoted, 422 for other errors

**Outcome:**
- Draft `d889712d` → `draft_status: 'rejected'`, `rejection_reason: 'duplicate_of_live_need'`
- `company_need_draft_rejected` system_action attempted — **silently failed** due to missing DB constraint (migration 018 not yet applied)
- No matching triggered, no contact triggered, no outreach_approved set

---

## 5. Enskede Bilexpress AB — promoted and matched

### 5a. Promotion

**Draft:** `d30ad605` — Enskede Bilexpress AB, composite score 72, domain distribution, CE, stockholm, urgent  
**Action:** `POST /api/admin/drafts/d30ad605/promote`

**Outcome:**
- Company created: Enskede Bilexpress AB (new companies row)
- Need created: `e82769d8` — `need_type: active_public_need`, `status: open`
- Draft updated: `draft_status: 'promoted'`, `converted_need_id: e82769d8`
- `company_need_draft_promoted` system_action attempted — **silently failed** (migration 018 not applied)
- `outreach_approved` NOT set — outreach still requires cockpit approval per driver
- No SMS sent, no email sent, no driver contact

### 5b. Matching

**Action:** `POST /api/recruiter/match` with `{ need_id: "e82769d8" }`  
**Shortlist ID:** `3d84a0e0`

| Rank | Driver | Score | Notes |
|------|--------|-------|-------|
| 1 | Samir | 97 | CE · distribution · stockholm · available now — clean match |
| 2 | +46793055655 | 92 | CE · distribution · stockholm · 2_weeks — **DATA QUALITY: name field contains phone number** |
| 3 | Jenny | 78 | CE · distribution · other_sweden · now — region miss (location score 0) |
| 4 | Samuel Saman | 73 | CE+D · fjarrtransport · stockholm · now — **DUPLICATE PHONE 0733344130** |
| 5 | Samuel Rajabi | 73 | CE · fjarrtransport · stockholm · now — **DUPLICATE PHONE 0733344130** |

5 `contact_suggested` rows created, all `status: pending`. No SMS sent (46elks not activated, `AGENT_CONTACT_MODE=suggest`).

---

## 6. Three-way need comparison

### Active needs

| Need | ID | Domain | License | Region | Urgency |
|------|----|--------|---------|--------|---------|
| JPC Maskin | 33bc791f | schakt_bygg | CE | stockholm | urgent |
| Edvardssons Maskin | 3c9b5e48 | schakt_bygg | CE | stockholm | urgent |
| Enskede Bilexpress | e82769d8 | distribution | CE | stockholm | urgent |

### JPC shortlist (`b4f89870`)

| Rank | Driver | Score | Domain hit | Region hit | Notes |
|------|--------|-------|-----------|-----------|-------|
| 1 | Anders | 95 | ✓ schakt_bygg | ✓ stockholm | available 2_weeks |
| 2 | Fredrik Valgren | 78 | ✓ schakt_bygg | ✗ other_sweden | available now |
| 3 | Niklas Melander | 74 | ✓ schakt_bygg | ✗ other_sweden | 2_weeks |
| 4 | Samuel Saman | 73 | ✗ fjarrtransport | ✓ stockholm | DUP PHONE |
| 5 | Samuel Rajabi | 73 | ✗ fjarrtransport | ✓ stockholm | DUP PHONE |

### Edvardssons shortlist (`aed29c2c`)

| Rank | Driver | Score | Domain hit | Region hit | Notes |
|------|--------|-------|-----------|-----------|-------|
| 1 | Anders | 95 | ✓ schakt_bygg | ✓ stockholm | 2_weeks |
| 2 | Fredrik Valgren | 78 | ✓ schakt_bygg | ✗ other_sweden | now |
| 3 | Niklas Melander | 74 | ✓ schakt_bygg | ✗ other_sweden | 2_weeks |
| 4 | Samuel Saman | 73 | ✗ fjarrtransport | ✓ stockholm | DUP PHONE |
| 5 | Samuel Rajabi | 73 | ✗ fjarrtransport | ✓ stockholm | DUP PHONE |

### Enskede shortlist (`3d84a0e0`)

| Rank | Driver | Score | Domain hit | Region hit | Notes |
|------|--------|-------|-----------|-----------|-------|
| 1 | Samir | 97 | ✓ distribution | ✓ stockholm | now — clean |
| 2 | +46793055655 | 92 | ✓ distribution | ✓ stockholm | 2_weeks — name=phone (DQ) |
| 3 | Jenny | 78 | ✓ distribution | ✗ other_sweden | now |
| 4 | Samuel Saman | 73 | ✗ fjarrtransport | ✓ stockholm | DUP PHONE |
| 5 | Samuel Rajabi | 73 | ✗ fjarrtransport | ✓ stockholm | DUP PHONE |

### Domain hit rate

| Need | Top-5 domain hits | Rate |
|------|-------------------|------|
| JPC (schakt_bygg) | 3/5 | 60% |
| Edvardssons (schakt_bygg) | 3/5 | 60% |
| Enskede (distribution) | 4/5 | 80% |

Enskede has the strongest domain hit rate. JPC/Edvardssons share identical shortlists (same domain, same region — expected given current driver pool depth in schakt_bygg).

### Cross-need data quality issues

| Issue | Drivers affected | Impact |
|-------|-----------------|--------|
| Duplicate phone 0733344130 | Samuel Saman + Samuel Rajabi | Appears in all 3 shortlists; likely same person, double-ingested |
| Name field = phone number | +46793055655 | Scores 92 for Enskede — would block SMS from being personalised |

---

## 7. Test suite

**Result:** 32 test files, **1064 tests passed**, 0 failed.  
Key suites verified: `operationalIntelligence`, `companyNeedDraft`, `companyNeedMarketAgent` (92 tests), `matchingAgent`, `systemActions`, `cockpitApproval`, `ingestLead`, `contactWorkflow`.

---

## 8. Safety verdict

All operations this session comply with non-negotiable constraints:
- No SMS sent
- No email sent
- No driver or company contact
- 46elks never activated
- `outreach_approved` not set on any need
- Driver profiles not shared externally
- Meta campaigns unchanged
- No production data hard-deleted
- `AGENT_CONTACT_MODE` remains `suggest`
- Market Agent did not perform driver-company matching (matching triggered only through recruiter match route)

---

## 9. Pending user action

**Apply Migration 018** — resolves silent audit trail failures for 5 action types and 1 status value.

Steps:
1. Open: `https://supabase.com/dashboard/project/iwawdnfrbwhfrfibeqlp/sql/new`
2. Paste contents of `docs/sql/apply-migration-018.sql`
3. Click Run (Ctrl+Enter)
4. Expected output: `ALTER TABLE` twice, no errors

After applying, consider inserting retroactive `system_actions` rows for:
- `company_need_draft_promoted` — Enskede (`e82769d8`), triggered 2026-05-20
- `company_need_draft_rejected` — JPC duplicate (`d889712d`), triggered 2026-05-20

---

## 10. Next internal steps

| Priority | Action | Prerequisite |
|----------|--------|--------------|
| 1 | Apply migration 018 | User runs SQL in dashboard |
| 2 | Resolve duplicate phone 0733344130 (Samuel Saman / Samuel Rajabi) | Data quality review |
| 3 | Fix name=phone DQ issue for driver +46793055655 | Data quality review |
| 4 | Cockpit: review 5 Enskede `contact_suggested` rows — Samir (97) is actionable | After 46elks configured |
| 5 | Promote remaining 6 `ready_for_review` drafts as pilot companies confirm interest | Business decision |
