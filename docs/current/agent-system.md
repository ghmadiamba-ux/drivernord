# DriverNord — Agent System

*Last updated: 2026-05-16*
*For the full agentic OS design (8-agent roster, approval queues, state management, implementation roadmap), see `docs/business/agents/agentic-operating-system/`. This file describes the 5 built agents only.*

---

## Operating Principle

DriverNord is AI-driven end to end. The correct operating model is:

**AI executes and prepares → human validates and authorizes → system executes and logs → AI monitors.**

Human work is limited to: legal approval, financial/account setup, final commercial decisions, sensitive communication approval, production deployment authorization, GDPR validation, and exceptional judgment calls.

Agents do not replace human judgment on high-stakes decisions — they eliminate low-value manual work so human judgment is reserved for decisions that require it.

---

## Current Agent Architecture (Built)

DriverNord operates 5 named agents plus a cockpit observer. Each agent has a specific trigger, a set of guards, and logs every action to `system_actions`. Agents communicate through the database, not through direct inter-agent calls — with one intentional exception: the matching agent calls the contact agent fire-and-forget.

Default mode for both contact and follow-up agents: **`suggest`** — agents create pending actions, and the human recruiter approves via the cockpit. This is the correct setting for pre-pilot with zero track record.

---

## Agent 1 — Driver Ingestion

**File:** `app/api/leads/[id]/route.ts` (embedded in PATCH handler)
**Trigger:** Automatic — fires when `lead_status === 'ready_for_ingestion'` after a step PATCH
**What it does:**
1. Calls `ingestLead(lead.id)` — reads from `drivers`, runs `buildDriverProfile()` + `buildIngestedDriver()` + `scoreDriver()`, writes to `ingested_drivers`
2. On success: fire-and-forget calls `triggerMatchingForAllNeeds(leadId, driverId, score)`
3. `triggerMatchingForAllNeeds` logs `driver_ingested` (completed) to `system_actions`, then fires `runMatchingAgent()` for each open company need

**Logs:** `driver_ingested` (completed) — includes score in result field
**Error handling:** Ingestion failure logged to `console.error` only; does not block the HTTP response to the driver (known gap — see Phase 6 for fix)
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
**Commercial context:** This agent is the gateway for registering a client company's driver need. In the commercial model, a client company's need is entered here before the matching agent builds a shortlist for delivery.
**Current status:** Production-ready

---

## Agent 3 — Matching Agent

**File:** `lib/matchingAgent.ts`
**Function:** `runMatchingAgent({ needId, triggeredBy })`
**Trigger:** Fire-and-forget from Agent 1 (after driver ingestion) or Agent 2 (after need creation). Can also be called manually via `POST /api/recruiter/match` or `POST /api/match`.

**What it does:**
1. Fetches all open company needs (validates needId exists)
2. Fetches all active ingested drivers
3. Calls `buildShortlist(drivers, need, limit=5)` from `lib/matchingEngine.ts`
4. Calls `createShortlist(needId, result)` — writes `shortlists` + `shortlist_entries` rows
5. Logs `match_run` (completed) and `shortlist_created` (completed)
6. Fire-and-forget calls `runContactAgent({ shortlistId })`

**Hard filters in buildShortlist:**
- License: driver must cover the required license (via `LICENSE_COVERS` hierarchy)
- YKB: `ykb === 'none'` or `ykb === 'unknown'` → rejected
- Driver card: `driverCard === 'no'` or `driverCard === 'unknown'` → rejected

**Commercial context:** The shortlist built by this agent is the core deliverable of Package 2 (Verifierad Förarlista). For commercial delivery, the founder reviews the shortlist in the recruiter cockpit before sending it to the client company. The agent builds; the human approves delivery.

**Logs:** `match_run` (completed or failed), `shortlist_created` (completed)
**Known limitations:** No cooldown guard (can create duplicate shortlists); fetches all open needs to validate one. Both are acceptable at current scale.
**Current status:** Production-ready

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
   - `auto` or `hybrid` (score ≥ AUTO_CONTACT_THRESHOLD): calls `getMessagingProvider().sendMessage(...)` → **CURRENTLY SIMULATED** (console.log only until SMS_PROVIDER is configured)

**⚠ CRITICAL STATUS: All sends are currently simulated (console.log). No driver receives any message. This is the single largest operational gap. Configuring SMS_PROVIDER=46elks + credentials transforms this agent from simulation to operational.**

**Commercial context:** This agent contacts drivers to confirm their interest before a shortlist is delivered to a client. In the DriverNord model, Stage 3 consent (driver approves per-company introduction) happens via this contact. A driver who does not respond or declines should not appear in the commercial shortlist delivered to the client.

**Messaging provider (`lib/messaging/`):**
- `getMessagingProvider()` returns simulated provider when `SMS_PROVIDER` env var is not set
- `SMS_PROVIDER=46elks` + credentials → calls 46elks REST API
- Simulated provider: `console.log` only, always returns `{ ok: true, channel: 'simulated' }`

**Configuration:**
- `AGENT_CONTACT_MODE`: `suggest` (default) / `auto` / `hybrid`
- `AGENT_CONTACT_ENABLED`: kill switch (default: enabled)
- `AUTO_CONTACT_THRESHOLD`: score threshold for auto in hybrid mode (default: 85)
- `CONTACT_MIN_SCORE = 60`: hard-coded minimum for any contact (below this → silent skip)

**Dedup windows:** Standard: 14 days; Emergency (urgency === 'emergency'): 3 days

**Message template (Swedish):**
```
Hej {firstName} 👋

Vi har en match för dig i {location_region} ({domain_required}, {shift_type}).

Vill du att vi kopplar dig direkt till företaget?
→ Svara JA så går vi vidare
```

**Logs:** `contact_suggested` (pending), `contact_skipped` (completed), `contact_sent` (completed or failed)
**Current status:** Provider abstraction production-ready. **Real delivery requires `SMS_PROVIDER` + credentials in environment.**

---

## Agent 5 — Follow-up Agent

**File:** `lib/followUpAgent.ts`
**Function:** `runFollowUpAgent()`
**Trigger:** Vercel Cron — `POST /api/agent/follow-up` at `0 8 * * *` (08:00 UTC daily). Requires `x-api-key: AGENT_API_KEY` header.

**What it does:**
1. Queries `drivers WHERE follow_up_at <= now AND follow_up_sent = false`
2. For each driver: dedup + mode decision → suggest (pending) or auto (SIMULATED send)

**⚠ SAME STATUS AS CONTACT AGENT: All sends are simulated until SMS_PROVIDER is configured.**

**Commercial context for follow-up in V1 monetization:**
The follow-up agent has a second commercial use case beyond re-engaging inactive drivers: **pre-delivery availability confirmation**. Before any shortlist is delivered to a client (per best-practice-playbook.md), each driver on the shortlist should be re-confirmed as available within 48–72 hours of delivery. The follow-up agent infrastructure can serve this function once SMS is operational.

**Configuration:**
- `AGENT_FOLLOWUP_MODE`: `suggest` (default) / `auto`
- `AGENT_FOLLOWUP_ENABLED`: kill switch (default: enabled)
- Dedup window: 7 days

**Message templates (3 types, based on follow_up_reason):**
- `not_yet_available` — "Har din tillgänglighet ändrats? Vi har roller tillgängliga nu."
- `ykb_in_progress` — "Hur går det med YKB-utbildningen? Hör av dig när du är klar."
- `incomplete_lead` (default) — "Vi saknar information — kan du slutföra profilen på 2 min?"

**Logs:** `follow_up_triggered` (pending), `follow_up_sent` (completed or failed), `follow_up_skipped` (completed)
**Current status:** Provider abstraction production-ready. Real delivery requires `SMS_PROVIDER` + credentials.

---

## Cockpit Observer

**File:** `lib/cockpit.ts` / **Page:** `app/recruiter/page.tsx`
**Trigger:** Manual (human opens `/recruiter`); auto-polls every 15 seconds

**getCockpitData() runs 11 parallel queries** for: ingested driver count, open needs, pending actions, failed actions, emergency needs, recent actions, shortlist stats, and warning detection.

**5 Warning types (lib/warnings.ts):** no_match_activity, many_pending_actions, need_without_recent_shortlist, failed_actions, emergency_need_zero_contacts.

**Human actions available:** approve / cancel / retry (all routed through `PATCH /api/cockpit/actions/[id]`)

**Commercial context:** In the V1 monetization model, the recruiter cockpit is also the shortlist review interface. Before delivering Package 2 (Verifierad Förarlista) to a client company, the founder reviews the shortlist in the cockpit to confirm quality. This is the human gate in the AI prepares → human validates → system executes model.

---

## Planned Agents (Phase 1–3)

The full 8-agent roster is specified in `docs/business/agents/agentic-operating-system/recommended-agent-roster.md`. Full agentic OS architecture in the same folder.

**The Creative & Acquisition Agent (Phase 1) has a complete 9-file spec** in `docs/business/agents/creative-acquisition-agent/`. It is the next agent to be built.

| Agent | Spec location | Phase | Build status |
|-------|--------------|-------|--------------|
| Creative & Acquisition Agent | `agents/creative-acquisition-agent/` | Phase 1 | Spec complete; not built |
| Performance & Reporting Agent | `agents/agentic-operating-system/recommended-agent-roster.md` | Phase 1 | Description only |
| Communication Triage Agent | same | Phase 1 | Description only |
| Match Explanation Agent | same | Phase 1 | Description only |
| Operator/Orchestrator Agent | same | Phase 2 | Description only |
| Cockpit AI Assistant | same | Phase 2 | Description only |
| Demand Intelligence Agent | same | Phase 2 | Description only |
| Legal Compliance Monitor | same | Phase 3 | Description only |

**Prerequisites before any agent code:** install `@anthropic-ai/sdk`, add `ANTHROPIC_API_KEY` to env, complete Phase 0 (Facebook Page, migration 013 in production).

---

## system_actions Reference

All 14 action types with their normal flow:

| Action Type | Triggered By | Status | Meaning |
|-------------|-------------|--------|---------|
| `driver_ingested` | agent:driver_ingestion | completed | Driver ingested to pool |
| `need_ingested` | agent:company_need_ingestion | completed | Company need created and matching triggered |
| `match_run` | any | completed / failed | Matching run for a need |
| `shortlist_created` | any | completed | Shortlist persisted |
| `contact_suggested` | agent:contact | **pending** | Awaiting human approval |
| `contact_sent` | agent:contact | completed | SIMULATED send executed (auto mode) — not a real send |
| `contact_skipped` | agent:contact | completed | Guard triggered — skip logged |
| `contact_confirmed` | human via cockpit | completed | Human approved a contact_suggested |
| `follow_up_triggered` | agent:followup | **pending** | Awaiting human approval |
| `follow_up_sent` | agent:followup | completed | SIMULATED send executed (auto mode) — not a real send |
| `follow_up_skipped` | agent:followup | completed | Dedup guard triggered |
| `follow_up_confirmed` | human via cockpit | completed | Human approved a follow_up_triggered |
| `override_cancelled` | human via cockpit | cancelled | Human cancelled a pending action |
| `override_retried` | human via cockpit | completed | Human retried a failed action |

**Note on `contact_sent` and `follow_up_sent`:** These action types indicate that the send was ATTEMPTED, not necessarily delivered. In the current simulated state, they mean only that `console.log` was called. When SMS_PROVIDER is configured, they will indicate actual SMS delivery attempts.

---

## Known Agent Limitations

1. **No real message delivery** — `contact_sent` and `follow_up_sent` are console.log simulations. Zero actual driver outreach occurs.
2. **No match cooldown** — `runMatchingAgent` has no guard against running for the same needId in rapid succession.
3. **Matching fetches all open needs to validate one** — O(n) on needs; acceptable at current scale.
4. **Follow-up dedup is shortlist-based** — checks `shortlist_entries.contacted_at`, not a general "last contacted" field.
5. **Ingestion failure is silent to operator** — `ingestLead()` failure is `console.error` only. Not logged to `system_actions`.
6. **No pre-delivery availability confirmation step** — must be designed and implemented before Package 4 is offered commercially. A driver who accepted another job cannot be on the shortlist.
