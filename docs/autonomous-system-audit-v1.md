# DriverNord — Autonomous System Audit v1

**Status:** Architecture and redesign specification — no implementation yet  
**Date:** 2026-05-05  
**Principle:** The system executes all actions automatically. The human observes, validates, and overrides when necessary.

---

## 1. Executive Summary

The codebase is closer to autonomous than it appears. The driver intake pipeline is already fully automated: a driver who completes `/chat` is classified, scored, and ingested into the matching pool without any human touch. That is correct.

Everything after ingestion is fully manual. A human must open `/recruiter`, select a company need, click "Run Match", then manually set each contact status. There is no agent, no trigger, no scheduled check, and no log of what the system has done.

This audit identifies the exact gaps, redesigns the system into six named agents with explicit triggers, introduces a `system_actions` log table, and describes how to transform `/recruiter` from a control panel into an observation panel — progressively, without breaking anything.

---

## 2. Full Pipeline Map: Current State

```
DRIVER SIDE                          COMPANY SIDE
───────────                          ────────────
Driver opens /chat                   Human calls POST /api/company-needs
  POST /api/leads                    → creates companies + company_needs row
  → creates drivers row              (no trigger fires after this)
  → lead_status = anonymous_dropoff
       ↓
  PATCH /api/leads/[id] × N steps
  → applyStep()
  → classifyStatus/Priority()        company_needs row sits idle
  → computeFollowUp()                until human visits /recruiter
       ↓
  lead_status = ready_for_ingestion?
       ↓ YES
  auto-ingestLead()    ← AUTONOMOUS  ← this is the only autonomous action
  → ingested_drivers row created
  → scoreDriver() called
  → follow_up_at computed
       ↓
  *** SYSTEM STOPS HERE ***
       ↓
  Human opens /recruiter
  Human selects a company need        ← MANUAL
  Human clicks "Run Match"            ← MANUAL
       ↓
  POST /api/recruiter/match
  → buildShortlist()
  → createShortlist()
  → shortlist + entries written
       ↓
  Human reviews shortlisted drivers   ← MANUAL
  Human sets contact_status           ← MANUAL
  → PATCH /api/recruiter/shortlist-entries/[id]
  → contacted_at set on first contact
       ↓
  Human remembers to follow up        ← MANUAL (follow_up_at field exists
  (no agent, no alert, no trigger)      but nothing reads it)
```

**Summary:** One autonomous step (auto-ingest). Six manual steps after that.

---

## 3. Classification of Every Part of the System

### 3.1 AUTONOMOUS — correct, keep as-is

| Component | File | What it does automatically |
|-----------|------|---------------------------|
| Lead creation | `POST /api/leads` | Creates `drivers` row on chat start |
| Conversation step | `PATCH /api/leads/[id]` | Applies each step answer, re-classifies |
| Status classification | `lib/classify.ts` | `classifyStatus()` + `classifyPriority()` called on every step |
| Follow-up scheduling | `lib/followup.ts` | `computeFollowUp()` called on every step; writes `follow_up_at` |
| Auto-ingestion | `PATCH /api/leads/[id]:64-68` | On `ready_for_ingestion`, calls `ingestLead()` inline |
| Driver profiling | `lib/driverProfile.ts` | Pure transform from `Lead` → `DriverProfile` |
| Driver scoring | `lib/scoreDriver.ts` | `scoreDriver()` runs inside `ingestLead()` |
| Match scoring | `lib/matchScore.ts` | Pure function, no side effects |
| Hard filter logic | `lib/matchingEngine.ts:buildShortlist()` | License/YKB/driver_card filters are automatic |
| Contact timestamp | `lib/shortlistStore.ts:updateShortlistEntry()` | Sets `contacted_at` on first contact transition |

### 3.2 SEMI-MANUAL — partially automated, missing the trigger

| Component | File | What is manual | What should be automatic |
|-----------|------|---------------|--------------------------|
| Matching | `POST /api/recruiter/match` | Human selects need and presses "Run Match" | Should fire automatically when new driver is ingested OR when new company need is created |
| Shortlist creation | `lib/shortlistStore.ts:createShortlist()` | Called from within match route, which is manual | Automatic once matching is triggered |
| Company need ingestion | `POST /api/company-needs` | No trigger or webhook — requires external caller | Should trigger matching for all existing pool drivers immediately |
| Contact suggestion | None | Entirely manual — human decides who to contact | System should suggest contact for entries above score threshold |

### 3.3 MANUAL — must be redesigned

| Component | File | Current behavior | Target behavior |
|-----------|------|-----------------|-----------------|
| Match trigger | `/recruiter` page, "Run Match" button | Human clicks button | Agent triggers automatically |
| Need selection | `/recruiter` page, need list | Human selects which need to match | Agent processes all open needs |
| Contact status update | `/recruiter` page, status buttons | Human sets status | Human approves agent suggestion; system records |
| Follow-up execution | Nothing | `follow_up_at` exists in DB but nothing reads it | Follow-up agent checks daily |
| System health check | Nothing | Operator must try an action to discover failures | System logs all actions to `system_actions` |
| Shortlist reload | `/recruiter` page, UUID input | Human types UUID | All shortlists visible in observation panel |

---

## 4. The Six Required Agents

### Agent 1 — Driver Ingestion Agent

**Already implemented.** This agent is embedded in `PATCH /api/leads/[id]` lines 64–68.

**Trigger:** Lead reaches `lead_status = 'ready_for_ingestion'` on any step answer  
**Action:** Calls `ingestLead(lead.id)` → writes row to `ingested_drivers`  
**What is missing:**
- No `system_actions` log entry written after successful ingestion
- After ingestion, does not fire the Matching Agent
- If `ingestLead()` fails, error is only `console.error` — not visible to operator

**Required change:** After successful `ingestLead()`, write a `system_actions` entry and call the Matching Agent for all open needs.

---

### Agent 2 — Company Need Ingestion Agent

**Not implemented.** Company needs are currently created by direct API call (`POST /api/company-needs`) with no downstream trigger.

**Trigger:** `POST /api/company-needs` succeeds (new need created)  
**Action:** Immediately call the Matching Agent for the newly created need against the full current pool  
**What is missing:**
- No trigger fires after `createCompanyNeed()` in `app/api/company-needs/route.ts`
- No `system_actions` entry written on need creation

**Required change:** After `createCompanyNeed()` succeeds, write a `system_actions` entry and invoke the Matching Agent.

---

### Agent 3 — Matching Agent

**Exists as a route but not as an agent.** The logic in `POST /api/recruiter/match` and `POST /api/match` is identical but requires a human or authenticated caller to POST with a `need_id`.

**Trigger:**
- New driver ingested → run for all open needs
- New company need created → run for full current pool
- Scheduled check: any open need whose last shortlist is > 24h old and pool has grown (post-MVP)

**Action:** `buildShortlist(drivers, need)` → `createShortlist()` → write `system_actions` entry  
**What is missing:**
- No function encapsulating the matching logic that can be called internally (only as an HTTP route)
- No trigger from ingestion or need creation
- No `system_actions` log

**Required change:** Extract matching logic from the route handler into `lib/matchingAgent.ts` as a callable async function. Call it from both the route handler (backwards-compatible) and from the triggers above.

---

### Agent 4 — Shortlist Agent

**Already part of Agent 3.** `createShortlist()` is called synchronously from within the matching flow. It does not need to be a separate agent.

**What it does:** Takes a `ShortlistResult` from `buildShortlist()` and writes `shortlists` + `shortlist_entries` rows.

**What is missing:** After shortlist creation, does not fire the Contact Agent.

**Required change:** After `createShortlist()` succeeds in the matching flow, call the Contact Agent with the new shortlist.

---

### Agent 5 — Contact Agent

**Not implemented.** Contact status changes are entirely human-driven via the `/recruiter` UI.

**Trigger:** New shortlist created with entries where `match_score >= CONTACT_THRESHOLD` (suggested default: 60)  
**Action:**
- For each shortlist entry above threshold, check cross-shortlist history: has this driver been contacted in the last 14 days? (`shortlist_entries WHERE driver_id = X AND contact_status != 'new' AND contacted_at > now - 14d`)
- If not recently contacted: write a `system_actions` entry with `status = 'pending'` and `action_type = 'contact_suggested'`
- Do NOT set `contact_status = 'contacted'` automatically — require human approval
- If recently contacted: write `system_actions` entry with `status = 'completed'`, `action_type = 'contact_skipped'`, `result = { reason: 'recently_contacted', last_contact_shortlist_id }` 

**Safety rules enforced by this agent:**
1. Score threshold: only suggest contact for entries with `match_score >= 60`
2. Dedup window: skip if driver was contacted within 14 days on any shortlist
3. No auto-send: agent only writes `status = 'pending'`; human must approve

**What is missing:** Entire agent — new function, new `system_actions` entries, human approval flow.

---

### Agent 6 — Follow-up Agent

**Not implemented.** The `follow_up_at` and `follow_up_reason` fields are computed correctly by `computeFollowUp()` and persisted in `drivers`, but nothing ever reads them to take action.

**Trigger:** Scheduled (cron or external ping) — daily check, e.g., at 08:00  
**Action:**
- Query `drivers WHERE follow_up_at <= now AND follow_up_sent = false`
- For each due follow-up: write `system_actions` entry with `status = 'pending'` and `action_type = 'follow_up_triggered'`
- Do NOT mark `follow_up_sent = true` until human approves
- On human approval: mark `follow_up_sent = true` on the driver row

**Implementation path on Vercel (no background workers):**  
Since Vercel does not support persistent background workers, the trigger is an externally-called endpoint:  
`POST /api/agent/follow-up` — protected by `AGENT_API_KEY` — runs the check and writes pending actions.  
This endpoint can be called by:
- A Vercel Cron Job (in `vercel.json`)
- An external scheduler (cron.io, GitHub Actions, etc.)
- The operator manually from the cockpit (as a fallback)

---

## 5. The `system_actions` Log

### Purpose

Every action taken by any agent or human must be recorded with type, target, status, and result. This table is the audit trail, the operator's observation feed, and the pending-approval queue — all in one.

### Schema (Migration 007)

```sql
CREATE TABLE system_actions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened
  action_type   TEXT        NOT NULL CHECK (action_type IN (
    'driver_ingested',      -- Agent 1: driver entered pool
    'need_ingested',        -- Agent 2: company need created
    'match_run',            -- Agent 3: matching executed
    'shortlist_created',    -- Agent 4: shortlist written
    'contact_suggested',    -- Agent 5: contact recommendation (pending)
    'contact_confirmed',    -- Agent 5: human approved contact
    'contact_skipped',      -- Agent 5: driver recently contacted, skip
    'follow_up_triggered',  -- Agent 6: follow-up due (pending)
    'follow_up_confirmed',  -- Agent 6: human approved follow-up
    'override_cancelled',   -- Human cancelled a pending action
    'override_retried'      -- Human retried a failed action
  )),

  -- Who triggered it
  triggered_by  TEXT        NOT NULL,
  -- Values: 'agent:ingestion', 'agent:matching', 'agent:contact',
  --         'agent:follow_up', 'human', 'agent:company_need'

  -- What it acted on
  target_type   TEXT        NOT NULL CHECK (target_type IN (
    'driver', 'company_need', 'shortlist', 'shortlist_entry'
  )),
  target_id     UUID        NOT NULL,

  -- Lifecycle
  status        TEXT        NOT NULL DEFAULT 'completed' CHECK (status IN (
    'pending',    -- written by agent, waiting for human approval
    'approved',   -- human approved; action in progress
    'completed',  -- action finished successfully
    'failed',     -- action failed; error field has detail
    'cancelled'   -- human cancelled a pending action
  )),

  -- Payload
  input         JSONB,    -- what the agent was given (need_id, driver_id, etc.)
  result        JSONB,    -- what came out (shortlist_id, score, etc.)
  error         TEXT,     -- error message if status = 'failed'

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

-- Read path: observation panel (newest first)
CREATE INDEX idx_system_actions_created_at
  ON system_actions (created_at DESC);

-- Pending approval queue
CREATE INDEX idx_system_actions_status
  ON system_actions (status)
  WHERE status = 'pending';

-- Per-entity history
CREATE INDEX idx_system_actions_target
  ON system_actions (target_type, target_id, created_at DESC);
```

### Example rows

```json
// Agent 1 — driver auto-ingested
{
  "action_type": "driver_ingested",
  "triggered_by": "agent:ingestion",
  "target_type": "driver",
  "target_id": "<driver_uuid>",
  "status": "completed",
  "input": { "lead_id": "<uuid>", "priority": "HIGH", "license": "CE" },
  "result": { "ingested_at": "2026-05-05T08:12:00Z", "score": 88 }
}

// Agent 3 — match run automatically after driver ingestion
{
  "action_type": "match_run",
  "triggered_by": "agent:matching",
  "target_type": "company_need",
  "target_id": "<need_uuid>",
  "status": "completed",
  "input": { "trigger": "driver_ingested", "driver_id": "<uuid>", "pool_size": 12 },
  "result": { "shortlist_id": "<uuid>", "total_shortlisted": 4, "total_candidates": 12 }
}

// Agent 5 — contact suggestion waiting for human approval
{
  "action_type": "contact_suggested",
  "triggered_by": "agent:contact",
  "target_type": "shortlist_entry",
  "target_id": "<entry_uuid>",
  "status": "pending",
  "input": {
    "driver_id": "<uuid>",
    "match_score": 95,
    "company_name": "Scania Logistics",
    "first_name": "Erik",
    "phone": "+46700000001"
  },
  "result": null
}

// Agent 5 — contact skipped (recently contacted)
{
  "action_type": "contact_skipped",
  "triggered_by": "agent:contact",
  "target_type": "shortlist_entry",
  "target_id": "<entry_uuid>",
  "status": "completed",
  "input": { "driver_id": "<uuid>", "match_score": 88 },
  "result": {
    "reason": "recently_contacted",
    "last_contacted_at": "2026-05-02T14:30:00Z",
    "last_contact_shortlist_id": "<uuid>"
  }
}

// Human cancelled a pending suggestion
{
  "action_type": "override_cancelled",
  "triggered_by": "human",
  "target_type": "shortlist_entry",
  "target_id": "<entry_uuid>",
  "status": "completed",
  "input": { "cancelled_action_id": "<system_action_uuid>", "reason": "driver already placed elsewhere" }
}
```

---

## 6. Architecture Diagram

```
═══════════════════════════════════════════════════════════════════
                    DRIVERNORD AUTONOMOUS PIPELINE
═══════════════════════════════════════════════════════════════════

DRIVER INTAKE                        COMPANY SIDE
─────────────                        ────────────
Driver opens /chat                   POST /api/company-needs
     │                                      │
     ▼                                      ▼
POST /api/leads                      companies + company_needs
creates drivers row                         │
     │                               ┌──────┘
     ▼                               │  AGENT 2: Company Need Ingestion
PATCH /api/leads/[id] × N steps      │  → log system_actions (need_ingested)
applyStep()                          │  → trigger AGENT 3 for new need
classifyStatus/Priority()            │
computeFollowUp()                    │
     │                               │
     ├─ license=none                 │
     │  → lead_status = disqualified │
     │                               │
     └─ last_step_reached = 7        │
        lead_status = ready_for_ingestion
               │
               ▼
  AGENT 1: Driver Ingestion          ← auto, already exists
  ingestLead() → ingested_drivers    ← in PATCH /api/leads/[id]
  scoreDriver()                        needs: log + trigger below
  → log system_actions (driver_ingested)
               │
               ▼
  TRIGGER: new driver in pool ───────► AGENT 3: Matching Agent
  TRIGGER: new company need ─────────►   For each open need:
                                         getActiveIngestedDrivers()
                                         buildShortlist()
                                         createShortlist()
                                         → log system_actions (match_run)
                                         → log system_actions (shortlist_created)
                                               │
                                               ▼
                                     AGENT 5: Contact Agent
                                       for each entry, score >= 60:
                                         check cross-shortlist history
                                         if recently contacted: skip (log)
                                         else: write pending system_action
                                         → system_actions (contact_suggested, pending)
                                               │
                                         ┌─────┘
                                         │  *** HUMAN GATE ***
                                         │  Operator sees pending action
                                         │  in observation panel
                                         │  → Approve / Cancel
                                         └─────┐
                                               ▼
                                     shortlist_entry.contact_status = 'contacted'
                                     → log system_actions (contact_confirmed)

SCHEDULED (daily 08:00)
──────────────────────
  POST /api/agent/follow-up
         │
         ▼
  AGENT 6: Follow-up Agent
    drivers WHERE follow_up_at <= now AND follow_up_sent = false
         │
         ▼
  → write system_actions (follow_up_triggered, pending)
         │
    *** HUMAN GATE ***
    Operator approves in observation panel
         │
         ▼
  drivers.follow_up_sent = true
  → log system_actions (follow_up_confirmed)

═══════════════════════════════════════════════════════════════════
                    OBSERVATION PANEL (/recruiter)
═══════════════════════════════════════════════════════════════════

  READ: system_actions feed (what happened, ordered by time)
  READ: pending actions queue (what needs human decision)
  READ: warnings (failed actions, stale shortlists)
  WRITE: approve / cancel pending actions only
  NEVER: action buttons that trigger new pipeline steps
```

---

## 7. Redesigned `/recruiter` Page — Observation Panel

### Principle

The `/recruiter` page currently has two action buttons: "Run Match" and "Load Shortlist". Both must be removed. The page becomes read-only except for approving or cancelling pending system actions.

### New layout

```
┌─ DRIVERNORD OBSERVATION PANEL ─────────────────────────────────────┐
│  System: ● Active │ Pool: 12 drivers │ Open needs: 4 │ Pending: 2  │
└─────────────────────────────────────────────────────────────────────┘

┌─ PENDING APPROVAL (2) ──────────────────────────────────────────────┐
│  [!] contact_suggested                              2026-05-05 09:12 │
│      Driver: Erik A. · Score: 95 · Company: Scania Logistics        │
│      Phone: +46700000001 (tap to reveal)                            │
│      [Approve — mark contacted]    [Cancel]                         │
│                                                                      │
│  [!] follow_up_triggered                            2026-05-05 08:00 │
│      Driver: Johan B. · Reason: incomplete_lead · Due: today        │
│      [Approve — mark follow-up sent]   [Cancel]                     │
└──────────────────────────────────────────────────────────────────────┘

┌─ RECENT ACTIONS ─────────────────────────────────────────────────────┐
│  ✓ match_run          Scania Logistics — 4/12 shortlisted   09:11    │
│  ✓ driver_ingested    CE · stockholm · distribution         09:11    │
│  ✓ match_run          ByggLogistik Sverige — 5/12           09:10    │
│  ✓ shortlist_created  Nordic Long Haul · id=7d1e92a8…      08:45    │
│  ✗ match_run          FAILED — supabase_error               08:44    │
│      [Retry]                                                         │
└──────────────────────────────────────────────────────────────────────┘

┌─ WARNINGS ───────────────────────────────────────────────────────────┐
│  ⚠ City Passenger Transport: no shortlist in 7 days (emergency)     │
│  ⚠ Driver Lars K.: contacted 8 days ago, no status update           │
└──────────────────────────────────────────────────────────────────────┘

┌─ CONTACT PIPELINE ───────────────────────────────────────────────────┐
│  contacted (3) │ interested (1) │ not_interested (2) │               │
│  [read-only cards — operator sees state, no buttons except notes]    │
└──────────────────────────────────────────────────────────────────────┘
```

### What changes in the UI

| Current element | New behavior |
|----------------|-------------|
| "Open Company Needs" list with need selection | Removed — matching is automatic |
| "Run Match" button | Removed — replaced by agent trigger |
| Match result cards | Shown as part of "Recent Actions" feed |
| "Load Previous Shortlist" UUID input | Removed — all shortlists visible in pipeline |
| Contact status buttons (new/contacted/interested/not_interested) | **Kept** — these are human approvals of agent suggestions, not manual triggers. Reframed as confirmation of a pending action OR manual override |
| Recruiter note textarea | Kept — human adds context to system log |

### What stays the same (backend)

- `PATCH /api/recruiter/shortlist-entries/[id]` — kept as-is, still the write path for contact status
- `GET /api/recruiter/shortlists/[id]` — kept as-is
- `GET /api/company-needs` — kept as-is

---

## 8. Safety Constraints

### Constraint 1 — Do not contact the same driver twice

**Implementation:**  
Before Contact Agent writes a `contact_suggested` pending action, it queries:

```sql
SELECT se.contacted_at, s.company_need_id, se.shortlist_id
FROM shortlist_entries se
JOIN shortlists s ON s.id = se.shortlist_id
WHERE se.driver_id = $driverId
  AND se.contact_status != 'new'
  AND se.contacted_at > now() - interval '14 days'
ORDER BY se.contacted_at DESC
LIMIT 1
```

If a row is returned: write `contact_skipped` action (not pending — already handled). Include `last_contacted_at` and `last_contact_shortlist_id` in `result` JSONB for operator visibility.

**Configurable dedup window:** `CONTACT_DEDUP_DAYS` environment variable (default: 14). Operator can reduce to 7 for higher-activity periods.

### Constraint 2 — Do not contact below score threshold

**Implementation:**  
Contact Agent only writes `contact_suggested` for entries where `match_score >= CONTACT_MIN_SCORE`.

`CONTACT_MIN_SCORE` environment variable (default: 60). Below this threshold: entry remains `new`, no action written. Operator can still manually update status via the PATCH endpoint.

### Constraint 3 — Require human validation (optional toggle)

**Two modes controlled by environment variable `AGENT_CONTACT_MODE`:**

| Mode | Behavior |
|------|---------|
| `suggest` (default) | Agent writes `contact_suggested` with `status = 'pending'`. Human approves before `contact_status` changes. |
| `auto` | Agent sets `contact_status = 'contacted'` directly and writes `contact_confirmed` with `status = 'completed'`. Use only when operator has validated system reliability. |

`suggest` is the default and must remain default until the operator has reviewed at least 50 agent-suggested contacts and found them accurate.

### Constraint 4 — Do not act on disqualified or incomplete pool drivers

**Already enforced:** The matching engine hard-filters on `license`, `ykb`, and `driver_card` in `lib/matchingEngine.ts:buildShortlist()`. Only drivers who passed all three checks can appear in `shortlist_entries`. The Contact Agent acts only on shortlist entries — this constraint is inherited automatically.

### Constraint 5 — Do not run duplicate matches

**Implementation:**  
Before Matching Agent runs for a given `need_id`, check:

```sql
SELECT id FROM shortlists
WHERE company_need_id = $needId
  AND created_at > now() - interval '1 hour'
LIMIT 1
```

If a shortlist already exists within the last hour: skip and write `system_actions (match_run, status='cancelled', result={reason:'recent_shortlist_exists'})`.

**Configurable cooldown:** `MATCH_COOLDOWN_MINUTES` environment variable (default: 60).

---

## 9. New Files and Functions Required

### 9.1 `lib/matchingAgent.ts` (extract from route)

Extracts matching logic from `app/api/recruiter/match/route.ts` into a callable function:

```typescript
export interface MatchAgentInput {
  needId:       string;
  triggeredBy:  string; // 'agent:matching' | 'human' | 'agent:company_need'
}

export interface MatchAgentResult {
  ok:          boolean;
  shortlistId?: string;
  shortlisted?: number;
  candidates?:  number;
  error?:       string;
}

export async function runMatchingAgent(input: MatchAgentInput): Promise<MatchAgentResult>
```

Route handlers (`app/api/recruiter/match/route.ts` and `app/api/match/route.ts`) call this function instead of duplicating the logic. No behavior change for existing callers.

### 9.2 `lib/contactAgent.ts` (new)

```typescript
export interface ContactAgentInput {
  shortlistId: string;
  threshold?:  number; // default: CONTACT_MIN_SCORE env var or 60
}

export interface ContactAgentResult {
  suggested: number;  // pending actions written
  skipped:   number;  // recently contacted, skipped
  below:     number;  // below threshold
}

export async function runContactAgent(input: ContactAgentInput): Promise<ContactAgentResult>
```

### 9.3 `lib/followUpAgent.ts` (new)

```typescript
export interface FollowUpAgentResult {
  found:     number;
  pending:   number;
}

export async function runFollowUpAgent(): Promise<FollowUpAgentResult>
```

### 9.4 `lib/systemActions.ts` (new)

Wraps all `system_actions` table writes:

```typescript
export type ActionType =
  | 'driver_ingested' | 'need_ingested' | 'match_run'
  | 'shortlist_created' | 'contact_suggested' | 'contact_confirmed'
  | 'contact_skipped' | 'follow_up_triggered' | 'follow_up_confirmed'
  | 'override_cancelled' | 'override_retried';

export type ActionStatus = 'pending' | 'approved' | 'completed' | 'failed' | 'cancelled';

export async function logAction(params: {
  action_type:  ActionType;
  triggered_by: string;
  target_type:  'driver' | 'company_need' | 'shortlist' | 'shortlist_entry';
  target_id:    string;
  status:       ActionStatus;
  input?:       Record<string, unknown>;
  result?:      Record<string, unknown>;
  error?:       string;
}): Promise<string> // returns action id

export async function getPendingActions(): Promise<SystemAction[]>

export async function updateActionStatus(
  id: string,
  status: ActionStatus,
  result?: Record<string, unknown>,
): Promise<void>
```

### 9.5 New API routes

| Route | Purpose |
|-------|---------|
| `POST /api/agent/match` | Internal trigger for Matching Agent — protected by `AGENT_API_KEY` |
| `POST /api/agent/follow-up` | Internal trigger for Follow-up Agent — protected by `AGENT_API_KEY` + Vercel Cron |
| `GET /api/cockpit/actions` | Returns pending + recent system_actions for observation panel |
| `PATCH /api/cockpit/actions/[id]` | Approve or cancel a pending action |

---

## 10. Trigger Wiring

### Trigger A — New driver ingested → run matching for all open needs

**Where:** `app/api/leads/[id]/route.ts`, after line 68 (after successful `ingestLead()`)

```typescript
// Current code (lines 64-68):
if (result.lead.lead_status === 'ready_for_ingestion') {
  const ingestResult = await ingestLead(result.lead.id);
  if (!ingestResult.ok) {
    console.error('[auto-ingest] failed for lead', result.lead.id, '—', ingestResult.error);
  }
}

// Add after successful ingest:
if (ingestResult.ok) {
  await logAction({ action_type: 'driver_ingested', ... });
  // fire-and-forget: don't block the driver chat response
  void runMatchingAgentForAllOpenNeeds('agent:ingestion');
}
```

`runMatchingAgentForAllOpenNeeds` fetches all open needs and calls `runMatchingAgent()` for each, respecting the cooldown constraint.

### Trigger B — New company need created → run matching for full pool

**Where:** `app/api/company-needs/route.ts`, after successful `createCompanyNeed()`

```typescript
// Add after line 55 (successful createCompanyNeed):
await logAction({ action_type: 'need_ingested', ... });
void runMatchingAgent({ needId: companyNeed.id, triggeredBy: 'agent:company_need' });
```

### Trigger C — New shortlist created → run contact agent

**Where:** `lib/matchingAgent.ts`, after successful `createShortlist()`

```typescript
await logAction({ action_type: 'shortlist_created', ... });
void runContactAgent({ shortlistId: shortlistId });
```

### Trigger D — Daily follow-up check

**Where:** `app/api/agent/follow-up/route.ts` called by Vercel Cron

`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/agent/follow-up",
      "schedule": "0 8 * * *"
    }
  ]
}
```

---

## 11. Minimal Migration Plan

Two migrations needed for the autonomous system. Neither breaks existing functionality.

### Migration 007 — `system_actions` table

Adds the audit log table described in Section 5. No existing tables changed. No foreign keys to existing tables (uses `target_id UUID` without a FK constraint to allow referencing multiple tables).

**Risk:** Zero. New table, no existing queries affected.

### Migration 008 — `contact_status` addition (optional, deferrable)

Adds `placement_ready` to the `shortlist_entries.contact_status` CHECK constraint. Required only when the placement workflow is ready. Can be deferred until after the agent pipeline is live.

```sql
ALTER TABLE shortlist_entries
  DROP CONSTRAINT shortlist_entries_contact_status_check,
  ADD CONSTRAINT shortlist_entries_contact_status_check
    CHECK (contact_status IN ('new','contacted','interested','not_interested','placement_ready'));
```

**Risk:** Zero if `placement_ready` is not yet used. Purely additive.

---

## 12. Minimal Implementation Plan

Steps are ordered strictly by dependency. Each step is independently deployable and does not break existing functionality.

### Step 1 — Migration 007: add `system_actions` table *(1 migration)*

Run migration. No code changes yet. Table is empty and unused.

**Rollback:** DROP TABLE system_actions — no data loss elsewhere.

---

### Step 2 — Add `lib/systemActions.ts` *(1 new file)*

Write `logAction()`, `getPendingActions()`, `updateActionStatus()`. Wire to Supabase via `db`. Add unit tests.

No routes call this yet. Library only.

---

### Step 3 — Log existing auto-ingest *(1 file change)*

In `app/api/leads/[id]/route.ts`, after the existing `ingestLead()` call succeeds, add:

```typescript
await logAction({
  action_type:  'driver_ingested',
  triggered_by: 'agent:ingestion',
  target_type:  'driver',
  target_id:    result.lead.id,
  status:       'completed',
  input:  { priority: result.lead.lead_priority, license: result.lead.license },
  result: { ingested_at: ingestResult.driver.ingestedAt, score: ingestResult.score.total },
});
```

Also log on failure:
```typescript
await logAction({ ..., status: 'failed', error: ingestResult.error });
```

**Effect:** `system_actions` starts accumulating real entries. Operator can query it. No behavior change.

---

### Step 4 — Extract `lib/matchingAgent.ts` *(1 new file, 2 files changed)*

Extract matching logic from `app/api/recruiter/match/route.ts` into `lib/matchingAgent.ts:runMatchingAgent()`. Update both route handlers to call the new function. Full test coverage.

**Effect:** Identical behavior. Matching logic is now callable programmatically.

---

### Step 5 — Log all match runs *(1 file change)*

In `lib/matchingAgent.ts`, add `logAction()` calls for `match_run` and `shortlist_created` events.

**Effect:** All matching activity visible in `system_actions` feed.

---

### Step 6 — Add matching trigger after ingestion *(1 file change)*

In `app/api/leads/[id]/route.ts`, after logging `driver_ingested`, add:

```typescript
const openNeeds = await getOpenCompanyNeeds();
for (const need of openNeeds) {
  void runMatchingAgent({ needId: need.id, triggeredBy: 'agent:ingestion' });
}
```

**Fire-and-forget** (void): the driver's PATCH response is not blocked. The matching runs asynchronously on Vercel's function lifecycle.

**Effect:** Every new ingested driver immediately triggers fresh matches for all open needs. This is the first autonomous end-to-end loop.

---

### Step 7 — Add matching trigger after new company need *(1 file change)*

In `app/api/company-needs/route.ts`, after `createCompanyNeed()` succeeds:

```typescript
void runMatchingAgent({ needId: companyNeed.id, triggeredBy: 'agent:company_need' });
```

**Effect:** Adding a new company need immediately produces a shortlist from the current pool.

---

### Step 8 — Add `lib/contactAgent.ts` *(1 new file)*

Write `runContactAgent()` with score threshold check and cross-shortlist dedup query. Writes `contact_suggested` pending actions. Full test coverage.

---

### Step 9 — Add contact trigger after shortlist creation *(1 file change)*

In `lib/matchingAgent.ts`, after `createShortlist()`:

```typescript
void runContactAgent({ shortlistId: shortlistId });
```

**Effect:** Every new shortlist produces a set of pending contact suggestions in `system_actions`.

---

### Step 10 — Build `GET /api/cockpit/actions` and observation panel *(2 new routes, 1 new page)*

- `GET /api/cockpit/actions` — returns pending actions + recent actions feed
- `PATCH /api/cockpit/actions/[id]` — approve or cancel a pending action; on approve of `contact_suggested`, calls `updateShortlistEntry(entryId, { contact_status: 'contacted' })`
- Update `/recruiter` page: add pending actions panel + recent actions feed at top; action buttons remain below for manual override

**Effect:** Operator sees the full agent feed and can approve/cancel pending contact suggestions.

---

### Step 11 — Follow-up Agent and Cron *(1 new file, 1 new route, `vercel.json`)*

- Write `lib/followUpAgent.ts`
- Add `POST /api/agent/follow-up` route protected by `AGENT_API_KEY`
- Add Vercel Cron in `vercel.json`

**Effect:** Daily follow-up check surfaces overdue leads as pending actions.

---

### Step 12 — Remove action buttons from `/recruiter` *(1 file change)*

Once Steps 6–11 are live and validated for at least one week, remove "Run Match" and shortlist UUID input from `/recruiter`. Replace with the full observation panel layout from Section 7.

**This is the last step, not the first.** The transition is progressive.

---

## 13. What to Change First

**The single first change that makes the biggest difference with the least risk:**

→ **Step 6: Add matching trigger after driver ingestion**

This requires Steps 1–5 to be done first (table + library + extraction), but Steps 1–5 are zero-risk groundwork. Step 6 is the first change that closes an actual gap: currently, the system stops after ingestion. After Step 6, every new driver automatically produces shortlists for all open needs.

**Second most important:** Step 9 (contact agent trigger). This closes the second gap: currently, shortlists sit idle after creation. After Step 9, every new shortlist produces a pending contact suggestion that the operator sees and approves.

After Steps 6 and 9 are live, the system is 90% autonomous. The only remaining manual element is the operator's approval of contact suggestions — which is intentional for the safety constraints.

---

## 14. What NOT to Change Yet

| Item | Why not yet |
|------|------------|
| Remove action buttons from `/recruiter` | Only after agent pipeline is live and validated — operator needs fallback |
| Set `AGENT_CONTACT_MODE=auto` | Never auto-contact before the operator has reviewed 50+ suggestions and confirmed accuracy |
| Automated messaging (SMS/WhatsApp) | This audit does not scope messaging. All contact is still operator-to-driver by phone. |
| Modify `buildShortlist()` or `matchScore.ts` | These are correct and well-tested. Do not change scoring logic during architecture migration. |
| Add `placement_ready` status | Requires Migration 008 and a defined placement workflow that does not exist yet |
| Replace `X-Recruiter-Key` auth with sessions | The current single-key auth is sufficient for one operator; session auth adds complexity for zero benefit now |
| Parallel agent execution with a queue | Vercel functions can handle the fire-and-forget pattern for current scale; a proper job queue (Redis, Inngest, Trigger.dev) adds infrastructure cost that is not yet justified |

---

## 15. Summary Classification Table

| System component | Classification | Action |
|-----------------|---------------|--------|
| `/chat` driver intake | **Autonomous** | No change |
| `classifyStatus/Priority` | **Autonomous** | No change |
| `computeFollowUp` | **Autonomous** | No change |
| Auto-ingest on step completion | **Autonomous** | Add logging (Step 3) |
| `scoreDriver()` | **Autonomous** | No change |
| `buildShortlist()` / `matchScore.ts` | **Autonomous** (logic only) | Extract into agent (Step 4) |
| Match trigger — needs human click | **Manual** | Replace with ingestion trigger (Step 6) |
| Shortlist creation — needs human click | **Manual** | Replace with agent call (Steps 4+6) |
| Company need creation trigger | **Manual** | Add post-creation trigger (Step 7) |
| Contact suggestion — fully manual | **Manual** | Add Contact Agent with pending queue (Steps 8+9) |
| Contact approval — human decision | **Manual** | **Keep manual** — safety gate |
| Follow-up execution — nothing fires | **Manual** | Add Follow-up Agent + Cron (Step 11) |
| `system_actions` log — does not exist | **Missing** | Add table + library (Steps 1+2) |
| `/recruiter` action buttons | **Manual** | Removed last (Step 12) |
| `/recruiter` observation feed | **Missing** | Add in Step 10 |
