# DriverNord — Agent System

*Last updated: 2026-05-10 (messaging provider abstraction added)*

---

## Overview

DriverNord operates a pipeline of 5 named agents plus a cockpit observer. Each agent has a specific trigger, a set of guards, and logs every action to `system_actions`. Agents communicate through the database, not through direct inter-agent calls — with one intentional exception: the matching agent calls the contact agent fire-and-forget.

The guiding principle: **agents act autonomously; humans observe and approve.** The default mode for both contact and follow-up agents is `suggest` — agents create pending actions, and the human recruiter approves via the cockpit.

---

## Agent 1 — Driver Ingestion

**File:** `app/api/leads/[id]/route.ts` (embedded in PATCH handler)
**Trigger:** Automatic — fires when `lead_status === 'ready_for_ingestion'` after a step PATCH
**What it does:**
1. Calls `ingestLead(lead.id)` — reads from `drivers`, runs `buildDriverProfile()` + `buildIngestedDriver()` + `scoreDriver()`, writes to `ingested_drivers`
2. On success: fire-and-forget calls `triggerMatchingForAllNeeds(leadId, driverId, score)`
3. `triggerMatchingForAllNeeds` logs `driver_ingested` (completed) to `system_actions`, then fires `runMatchingAgent()` for each open company need

**Logs:** `driver_ingested` (completed) — includes score in result field
**Error handling:** Ingestion failure logged to `console.error` only; does not block the HTTP response to the driver
**Kill switch:** None — always runs on `ready_for_ingestion`
**Current status:** Production-ready

---

## Agent 2 — Company Need Ingestion

**File:** `app/api/company-needs/route.ts` (embedded in POST handler)
**Trigger:** Manual — `POST /api/company-needs` by authenticated recruiter
**What it does:**
1. Validates input via `validateCompanyNeedInput()`
2. Creates `companies` row via `createCompany()`
3. Creates `company_needs` row via `createCompanyNeed()`
4. Fire-and-forget calls `triggerMatchingForNeed(needId)`
5. `triggerMatchingForNeed` logs `need_ingested` (completed) and fires `runMatchingAgent()`

**Auth:** `requireRecruiterAuth(req)` — requires `RECRUITER_API_KEY` via header or cookie
**Logs:** `need_ingested` (completed) — includes need_id in input field
**Current status:** Production-ready

---

## Agent 3 — Matching Agent

**File:** `lib/matchingAgent.ts`
**Function:** `runMatchingAgent({ needId, triggeredBy })`
**Trigger:** Fire-and-forget from Agent 1 (after driver ingestion) or Agent 2 (after need creation). Can also be called manually via `POST /api/recruiter/match` or `POST /api/match`.

**What it does:**
1. Fetches all open company needs (to validate needId exists)
2. Fetches all active ingested drivers
3. Calls `buildShortlist(drivers, need, limit=5)` from `lib/matchingEngine.ts`
4. Calls `createShortlist(needId, result)` — writes `shortlists` + `shortlist_entries` rows
5. Logs `match_run` (completed) and `shortlist_created` (completed)
6. Fire-and-forget calls `runContactAgent({ shortlistId })`

**Hard filters in buildShortlist:**
- License: driver must cover the required license (via `LICENSE_COVERS` hierarchy)
- YKB: `ykb === 'none'` or `ykb === 'unknown'` → rejected
- Driver card: `driverCard === 'no'` or `driverCard === 'unknown'` → rejected

**Logs:** `match_run` (completed or failed), `shortlist_created` (completed)
**Known limitation:** Fetches ALL open needs to validate one needId — inefficient at scale. No cooldown guard — can create duplicate shortlists for the same need in rapid succession.
**Current status:** Production-ready. Inefficiency acceptable at current pool size.

---

## Agent 4 — Contact Agent

**File:** `lib/contactAgent.ts`
**Function:** `runContactAgent({ shortlistId })`
**Trigger:** Fire-and-forget from Matching Agent

**What it does:**
1. Fetches company context (company_name, region, domain, shift_type, urgency)
2. Fetches all shortlist_entries for the shortlist
3. Batch-fetches current ykb + availability for all driver IDs (live DB state, not snapshot)
4. For each entry, runs guards in order:
   - `match_score < 60` → skip silently (no log)
   - No phone or no firstName → skip silently (no log)
   - `contact_status !== 'new'` → skip silently (already actioned)
   - `ykb === 'in_progress'` → log `contact_skipped` (reason: ykb_in_progress)
   - `availability === 'not_yet'` → log `contact_skipped` (reason: not_available_yet)
   - Recently contacted: 14d window (3d for emergency) → log `contact_skipped` (reason: recently_contacted)
5. Executes mode decision:
   - `suggest` (default): builds message, logs `contact_suggested` (pending, includes pre-built `message` in input) — human must approve in cockpit
   - `auto` or `hybrid` (score ≥ AUTO_CONTACT_THRESHOLD): calls `getMessagingProvider().sendMessage(...)` → on success: mark contacted + log `contact_sent` (completed); on failure: log `contact_sent` (failed), do not mark contacted

**Messaging provider (`lib/messaging/`):**
- `getMessagingProvider()` returns simulated provider when `SMS_PROVIDER` env var is not set
- `SMS_PROVIDER=46elks` + credentials → calls 46elks REST API
- Simulated provider: `console.log` only, always returns `{ ok: true, channel: 'simulated' }`
- SMS provider: returns `{ ok: false, error: 'missing_credentials' }` if credentials missing — never throws
- WhatsApp: not yet implemented (reserved for a future provider in `lib/messaging/smsProvider.ts`)

**Configuration:**
- `AGENT_CONTACT_MODE`: `suggest` (default) / `auto` / `hybrid`
- `AGENT_CONTACT_ENABLED`: kill switch (default: enabled)
- `AUTO_CONTACT_THRESHOLD`: score threshold for auto in hybrid mode (default: 85)
- `CONTACT_MIN_SCORE = 60`: hard-coded minimum for any contact (below this → silent skip)
- `SMS_PROVIDER`: `46elks` or unset (default: simulated)
- `SMS_API_KEY`, `SMS_API_SECRET`, `SMS_FROM_NUMBER`: required when SMS_PROVIDER is set

**Dedup windows:**
- Standard: 14 days (checks `shortlist_entries.contacted_at`)
- Emergency (`urgency === 'emergency'`): 3 days

**Message template (Swedish):**
```
Hej {firstName} 👋

Vi har en match för dig i {location_region} ({domain_required}, {shift_type}).

Vill du att vi kopplar dig direkt till företaget?
→ Svara JA så går vi vidare
```

The pre-built message is stored in `contact_suggested.input.message` so the cockpit approval handler can send it without re-fetching company context.

**Cockpit approval → real send:**
When a human approves `contact_suggested` in the cockpit, `executeApproval()` reads `input.phone` and `input.message` from the stored action and calls `getMessagingProvider().sendMessage()`. On success: marks entry contacted + logs `contact_confirmed`. On failure: throws → action marked `failed`, retry available.

**Logs:** `contact_suggested` (pending), `contact_skipped` (completed), `contact_sent` (completed or failed)
**Current status:** Provider abstraction production-ready. Real delivery requires `SMS_PROVIDER` + credentials in environment.

---

## Agent 5 — Follow-up Agent

**File:** `lib/followUpAgent.ts`
**Function:** `runFollowUpAgent()`
**Trigger:** Vercel Cron — `POST /api/agent/follow-up` at `0 8 * * *` (08:00 UTC daily). Requires `x-api-key: AGENT_API_KEY` header.

**What it does:**
1. Queries `drivers WHERE follow_up_at <= now AND follow_up_sent = false`
2. For each driver:
   - Guard: no phone or no firstName → skip silently
   - Dedup: shortlist_entries.contacted_at within 7 days → log `follow_up_skipped`
   - Mode decision:
     - `suggest` (default): builds message, logs `follow_up_triggered` (pending, includes pre-built `message` in input) — human approves in cockpit
     - `auto`: calls `getMessagingProvider().sendMessage(...)` → on success: set `follow_up_sent = true` + log `follow_up_sent` (completed); on failure: log `follow_up_sent` (failed), do not set follow_up_sent

**Configuration:**
- `AGENT_FOLLOWUP_MODE`: `suggest` (default) / `auto`
- `AGENT_FOLLOWUP_ENABLED`: kill switch (default: enabled)
- Dedup window: 7 days (hard-coded)
- Uses same `getMessagingProvider()` as contact agent — same SMS_PROVIDER env vars apply

**Message templates (3 types, based on follow_up_reason):**
- `not_yet_available` — "Har din tillgänglighet ändrats? Vi har roller tillgängliga nu."
- `ykb_in_progress` — "Hur går det med YKB-utbildningen? Hör av dig när du är klar."
- `incomplete_lead` (default) — "Vi saknar information — kan du slutföra profilen på 2 min?"

**Follow-up scheduling (computeFollowUp — set at intake):**
- `incomplete_lead` + phone present → +24 hours
- `availability = not_yet` → +30 days
- `availability = 1_month` (if not immediately) — uses standard incomplete trigger
- `ykb = in_progress` → +60 days
- Earliest date wins when multiple triggers apply

**Logs:** `follow_up_triggered` (pending), `follow_up_sent` (completed or failed), `follow_up_skipped` (completed)
**Current status:** Provider abstraction production-ready. Real delivery requires `SMS_PROVIDER` + credentials.

---

## Cockpit Observer

**File:** `lib/cockpit.ts`
**Page:** `app/recruiter/page.tsx`
**Trigger:** Manual (human opens `/recruiter`); auto-polls every 15 seconds

**getCockpitData() runs 11 parallel queries:**
1. ingested_drivers count
2. open company_needs count
3. pending system_actions (all, no limit)
4. failed system_actions in last 24h (limit 10)
5. emergency open needs count
6. recent system_actions (last 50, ordered by created_at DESC)
7. shortlist_entries count (total shortlisted)
8. shortlist_entries with contact_status ≠ new (contacted count)
9. shortlist_entries with contact_status = interested
10. getSystemWarnings() (5 warning types)
11. getTodayMetrics() (today's action counts)

**5 Warning types (lib/warnings.ts):**
1. `no_match_activity` — no completed match_run in last 2 hours (severity: warning)
2. `many_pending_actions` — more than 10 pending actions (severity: warning)
3. `need_without_recent_shortlist` — open need not shortlisted in last 24h (severity: warning)
4. `failed_actions` — any failed action in last 24h (severity: error)
5. `emergency_need_zero_contacts` — emergency need with no contacted drivers (severity: error)

**Human actions available in cockpit:**
- `approve` (contact_suggested) → `PATCH /api/cockpit/actions/[id]` → calls `getMessagingProvider().sendMessage()` → on success: marks entry contacted + logs `contact_confirmed`; on failure: action status → failed (retryable)
- `approve` (follow_up_triggered) → same pattern: sends via provider → on success: sets `follow_up_sent=true` + logs `follow_up_confirmed`; on failure: action status → failed
- `cancel` → marks action cancelled, logs `override_cancelled`
- `retry` → `POST /api/cockpit/actions/[id]/retry` → re-attempts provider send if phone+message present; marks completed on success

---

## system_actions Reference

All 14 action types with their normal flow:

| Action Type | Triggered By | Status | Meaning |
|-------------|-------------|--------|---------|
| `driver_ingested` | agent:driver_ingestion | completed | Driver ingested to pool |
| `need_ingested` | agent:company_need_ingestion | completed | Company need created and matching triggered |
| `match_run` | any | completed / failed | Matching run for a need |
| `shortlist_created` | any | completed | Shortlist persisted |
| `contact_suggested` | agent:contact | pending | Awaiting human approval |
| `contact_sent` | agent:contact | completed | SIMULATED send executed (auto mode) |
| `contact_skipped` | agent:contact | completed | Guard triggered — skip logged |
| `contact_confirmed` | human via cockpit | completed | Human approved a contact_suggested |
| `follow_up_triggered` | agent:followup | pending | Awaiting human approval |
| `follow_up_sent` | agent:followup | completed | SIMULATED send executed (auto mode) |
| `follow_up_skipped` | agent:followup | completed | Dedup guard triggered |
| `follow_up_confirmed` | human via cockpit | completed | Human approved a follow_up_triggered |
| `override_cancelled` | human via cockpit | cancelled | Human cancelled a pending action |
| `override_retried` | human via cockpit | completed | Human retried a failed action |

---

## Known Agent Limitations

1. **No real message delivery** — `contact_sent` and `follow_up_sent` are console.log simulations. Zero actual driver outreach occurs.

2. **No match cooldown** — `runMatchingAgent` has no guard against running for the same needId in rapid succession. Multiple drivers completing `/chat` in quick succession could trigger multiple shortlists for the same need.

3. **Matching fetches all open needs to validate one** — `getOpenCompanyNeeds()` returns all open needs; the agent then `find()`s the target. This is O(n) on needs. Acceptable now, not at scale.

4. **Follow-up dedup is shortlist-based** — checks `shortlist_entries.contacted_at`, not a general "last contacted" field on the driver. A driver contacted outside the shortlist system would not be deduped.

5. **Ingestion failure is silent to the operator** — `ingestLead()` failure is `console.error` only. No `system_actions` log is written on failure. Operator cannot see failed ingestions in the cockpit.
