# DriverNord Operator Cockpit — Design Document v1

**Status:** Design only — no implementation, no migrations, no production changes  
**Date:** 2026-05-05  
**Scope:** Next operational interface for the single human pilot running DriverNord

---

## 1. Executive Summary

The current `/recruiter` page is a functional matching tool but not a cockpit. It lets an operator run one match at a time and load a shortlist by ID. It does not show the operator what is happening in the system, what has happened before, or what needs attention next.

The operator cockpit described here transforms the interface from a tool that executes individual actions into a mission control panel that answers: *who came in, who is qualified, who is being worked, what still needs me, and what failed.*

**Recommended MVP cockpit:** A new `/cockpit` route with three views — **Dashboard**, **Needs & Matches**, and **Contact Pipeline** — backed by four new API endpoints. No new database migrations required for MVP. The existing `/recruiter` page is kept live during transition.

**First implementation step:** Extend `GET /api/company-needs` to return `company_name` from the joined `companies` table, and add `GET /api/recruiter/shortlists` to list all shortlists without requiring the operator to know UUIDs.

---

## 2. Why the Cockpit Is Needed Now

The system is live and operational:
- Drivers are entering via `/chat`
- Company needs exist in the database
- Matching runs and shortlists are being created
- Contact status tracking is in place (`shortlist_entries.contact_status`)

But the operator has no unified view of any of this. To answer "who should I call today?" they must:
1. Know the UUID of the right shortlist (there is no list)
2. Manually load it via the "Load Previous Shortlist" input
3. Mentally track which drivers they have already called across other shortlists

The system has enough live data to support a real operational interface. The bottleneck is now the UI, not the backend.

---

## 3. Current Operational Blind Spots

The following questions cannot be answered from the current `/recruiter` page:

| Question | Why it is blind today |
|----------|----------------------|
| Who entered the system this week? | No route reads the `drivers` table for the operator |
| How many drivers are in the matchable pool? | No route reads `ingested_drivers` for the operator |
| Which needs have never been matched? | No list of company needs shows last-matched-at |
| What shortlists exist? | Shortlists are only accessible by UUID — there is no list endpoint |
| Who across all shortlists is currently in "interested" status? | No cross-shortlist pipeline view |
| Was this driver already contacted on a previous shortlist? | No cross-shortlist dedup check exists |
| What failed in the last 24 hours? | No error log surface |
| What should I do next? | Nothing computes or surfaces recommended actions |
| What is the company name for this need? | `GET /api/company-needs` does not join the `companies` table — the UI shows only `company_id` |

---

## 4. Proposed Cockpit Sections

Seven sections. Each maps to either a page tab or a panel within the cockpit.

### A. System Health Bar
Persistent top banner. Always visible. Shows at a glance whether the system is functional.

Displays: DB status · leads today · pool size · open needs · drivers in `interested` status · last error (if any)

### B. Dashboard (Action Queue)
The home screen. Answers: *what do I need to do right now?*

Two lists:
- **Requires approval** — actions the system recommends that require operator confirmation
- **Suggestions only** — lower-priority signals the operator can act on or ignore

### C. Needs & Matches
Replaces and extends the current company needs + match UI.

Shows all open company needs as cards. Each card shows the company name, need parameters, urgency, and the last time a match was run for it. Operator can run a new match directly from the card.

Below each need: all shortlists ever generated for it, ordered by recency, with per-shortlist contact status summary.

### D. Contact Pipeline
The most operationally critical view. Shows all shortlist entries that have been acted on (any status other than `new`), grouped by status.

Pipeline stages: `new` → `contacted` → `interested` → `not_interested`

Each entry shows: driver name, company context, rank, score, when contacted, recruiter note.

### E. Incoming Leads
A table of all `drivers` rows, newest first. Shows who entered via `/chat` and their qualification status. Lets the operator identify leads that need follow-up today (`follow_up_at` due).

### F. Ingested Driver Pool
A table of all `ingested_drivers`. Shows the matchable pool. No phone or email by default (PII control). The operator uses this to understand pool depth before running a match.

### G. Event Timeline (per driver or per need)
A drill-down view. For a given driver or company need, shows a chronological history of everything that happened to it in the system.

This requires new infrastructure (see Section 12). Not in MVP.

---

## 5. Data Each Section Needs

### A. System Health Bar

| Field | Source | Current state |
|-------|--------|---------------|
| DB connected | Supabase ping | Not surfaced — no health endpoint |
| Leads today | `drivers` table — COUNT WHERE created_at >= today | No operator route |
| Pool size | `ingested_drivers` — COUNT | No operator route |
| Open needs count | `company_needs` WHERE status='open' — COUNT | Partially supported via `/api/company-needs` |
| Interested count | `shortlist_entries` WHERE contact_status='interested' — COUNT | No route |
| Last error | In-memory or `operation_logs` table | Not tracked |

### B. Dashboard / Action Queue

All computed, no raw data required:
- Emergency needs with no shortlist: join `company_needs` (urgency='emergency') LEFT JOIN `shortlists`
- Overdue follow-ups: `drivers` WHERE follow_up_at <= now AND follow_up_sent=false
- Stale interested entries: `shortlist_entries` WHERE contact_status='interested' AND contacted_at < now - 72h

### C. Needs & Matches

| Field | Source | Current state |
|-------|--------|---------------|
| company_name | `companies.name` | Exists in DB, missing from `GET /api/company-needs` response |
| Need fields | `company_needs.*` | Returned by `/api/company-needs` |
| Last matched at | MAX(shortlists.created_at) WHERE company_need_id=X | Not returned by any route |
| Shortlist history | `shortlists` WHERE company_need_id=X | No list endpoint — only `GET /api/recruiter/shortlists/[id]` by UUID |
| Status summary per shortlist | COUNT of entries by contact_status | Not returned by any route |

### D. Contact Pipeline

| Field | Source | Current state |
|-------|--------|---------------|
| All non-new entries | `shortlist_entries` WHERE contact_status != 'new' | No endpoint; only retrievable by shortlist ID |
| Company context | Join shortlist_entries → shortlists → company_needs → companies | Not joined in any current route |
| Driver details | `driver_snapshot` JSONB column in shortlist_entries | Available once entry is loaded |
| contacted_at | `shortlist_entries.contacted_at` | Persisted, not surfaced in a list view |

### E. Incoming Leads

| Field | Source | Current state |
|-------|--------|---------------|
| Full leads list | `drivers` table | No operator-facing read route |
| Fields needed | id, created_at, first_name, phone, region, license, ykb, lead_status, lead_priority, follow_up_at | All in `drivers` table |

### F. Ingested Driver Pool

| Field | Source | Current state |
|-------|--------|---------------|
| Pool list | `ingested_drivers` table | Used internally by matching engine; no operator-facing route |
| Fields (no PII) | id, ingested_at, priority, license, ykb, region, domain, availability | All in `ingested_drivers` |
| PII fields (gated) | first_name, phone, email | In `ingested_drivers`, must be behind reveal toggle |

---

## 6. Existing Tables and Routes That Already Support the Cockpit

| Capability | Asset | How it is used |
|------------|-------|----------------|
| Open company needs list | `GET /api/company-needs` | Fetches all open needs (missing company_name join) |
| Run a match | `POST /api/recruiter/match` | Fully supported |
| Load shortlist by ID | `GET /api/recruiter/shortlists/[id]` | Returns full `ShortlistRecord` with entries |
| Update contact status | `PATCH /api/recruiter/shortlist-entries/[id]` | Sets contact_status, note, contacted_at |
| Contact status persistence | `shortlist_entries.contact_status`, `.contacted_at`, `.recruiter_note` | Migration 006 in place |
| Driver qualification | `ingested_drivers` table — hard filters in matching engine | YKB/license/driver_card already enforced |
| Follow-up scheduling | `drivers.follow_up_at`, `.follow_up_reason` | Fields exist, not surfaced to operator |
| Match score breakdown | `shortlist_entries.breakdown` JSONB | Stored, not currently shown in UI |

---

## 7. Missing Routes, Tables, and Fields

### 7.1 Missing API Routes

| Route | Purpose | Priority |
|-------|---------|----------|
| `GET /api/cockpit/stats` | System health counts | MVP |
| `GET /api/recruiter/shortlists` | List all shortlists with company context | MVP |
| `GET /api/cockpit/pipeline` | All non-new shortlist entries across all shortlists | MVP |
| `GET /api/cockpit/actions` | Computed action queue (rule-based) | MVP |
| `GET /api/cockpit/leads` | Operator view of all leads (`drivers` table) | Post-MVP |
| `GET /api/cockpit/ingested-drivers` | Operator view of matchable pool | Post-MVP |
| `GET /api/cockpit/driver-contact-history/[driverId]` | Previous contacts for a driver across shortlists | Post-MVP (risk control) |

### 7.2 Missing from Existing Routes

| Route | Missing field | Fix |
|-------|--------------|-----|
| `GET /api/company-needs` | `company_name` (only `company_id` returned) | Join `companies` table in `getOpenCompanyNeeds()` — update `companyNeedStore.ts` and the route handler |
| `GET /api/company-needs` | `created_at` of each need | Add to select in store |
| `GET /api/recruiter/shortlists/[id]` | `company_name` | Join when fetching shortlist header |

### 7.3 Missing Table Columns

| Table | Missing column | Purpose |
|-------|---------------|---------|
| `shortlist_entries.contact_status` | Value `placement_ready` | Marks driver confirmed for placement; needs migration to add to CHECK constraint |
| `shortlists` | `last_contact_at` | Derived field — do not persist; compute from MAX(entries.contacted_at) |

### 7.4 Missing Tables

**`events` table** — for timeline feature (post-MVP):
```sql
CREATE TABLE events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT        NOT NULL,
  entity_type TEXT        NOT NULL CHECK (entity_type IN ('driver','company_need','shortlist','shortlist_entry')),
  entity_id   UUID        NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_entity ON events (entity_type, entity_id, created_at);
CREATE INDEX idx_events_created_at ON events (created_at);
```

**`operation_logs` table** — for error log (post-MVP, or use Vercel logs):
```sql
CREATE TABLE operation_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level      TEXT        NOT NULL CHECK (level IN ('error','warn','info')),
  operation  TEXT        NOT NULL,
  detail     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 8. Suggested UX Layout

### Route
New page at `/cockpit`. Keep `/recruiter` alive and redirect to `/cockpit/matches` during transition.

### Navigation
Fixed left sidebar (desktop) or top tab bar (mobile):
```
[DriverNord Cockpit]

  • Dashboard
  • Needs & Matches
  • Contact Pipeline
  — — — — — — — —
  • Leads (post-MVP)
  • Driver Pool (post-MVP)
```

### Top banner (always visible)
```
[ DB: ✓ ] [ Leads today: 3 ] [ Pool: 12 ] [ Open needs: 4 ] [ Interested: 2 ] [ ⚠ 1 action required ]
```

### Dashboard page
```
┌─ ACTION REQUIRED ──────────────────────────────────────────────┐
│  ⚠ SIMULATION Stockholm Flexible Fleet — emergency, no         │
│    shortlist in 7 days → [Run Match]                           │
└────────────────────────────────────────────────────────────────┘

┌─ SUGGESTIONS ──────────────────────────────────────────────────┐
│  ○ Erik A. contacted 5 days ago, no response. Consider         │
│    moving to not_interested.                     [View]        │
│  ○ 2 new drivers entered pool since last match for             │
│    ByggLogistik Sverige. Consider re-matching.   [Run]         │
└────────────────────────────────────────────────────────────────┘
```

### Needs & Matches page
Each company need is a card:
```
┌─ Scania Logistics — CE · distribution · stockholm · urgent ──────┐
│  Last matched: 3 days ago · 3 shortlisted · 1 interested         │
│  [Run New Match]                                                   │
│                                                                    │
│  ▾ Shortlists (2)                                                  │
│    2026-05-02  3 of 7 shortlisted  [1 contacted, 1 interested]    │
│    2026-04-28  2 of 6 shortlisted  [0 contacted]                  │
└────────────────────────────────────────────────────────────────────┘
```

### Contact Pipeline page
Tab layout or Kanban columns:
```
new (4) │ contacted (3) │ interested (2) │ not_interested (1)
────────┼───────────────┼────────────────┼──────────────────
[cards] │   [cards]     │    [cards]     │    [cards]
```
Each card shows: driver first_name · company name · score · contacted_at if set · note excerpt

Contact details (phone, email) hidden by default. "Show contact info" button reveals on click.

---

## 9. Operator Workflow: Morning to Evening

### 08:00 — Morning start
1. Open `/cockpit/dashboard`
2. Check system health bar: DB connected? Any overnight errors?
3. Check **ACTION REQUIRED** panel: any emergency needs without shortlists?
4. Check **SUGGESTIONS**: any follow-up dates due today? Any drivers unresponsive for 5+ days?
5. Run any recommended matches

### 10:00 — Lead review
6. Navigate to **Leads** (post-MVP) or scan dashboard count for "leads today"
7. Identify any `follow_up_at = today` entries; add to mental queue

### 12:00 — Pipeline check
8. Navigate to **Contact Pipeline**
9. Review `contacted` column: who was contacted earlier and may have responded?
10. Move any responsive drivers to `interested`; add notes with salary/availability details
11. Move unresponsive drivers (contacted 5+ days ago) to `not_interested`

### 14:00 — Matching review
12. Navigate to **Needs & Matches**
13. For any urgent/emergency need: if last match was > 3 days ago and pool may have grown, run new match
14. Review shortlisted entries for new matches; set contact status and add notes as calls are made

### 17:00 — End-of-day wrap
15. Pipeline sweep: ensure all contacted-today entries have notes
16. Check action queue for any unresolved items
17. Verify system health bar is green before leaving

---

## 10. AI-Assisted Workflow Design

### Fully automated (no human approval needed)

These actions already happen automatically or are safe to automate:

| Action | Status | Notes |
|--------|--------|-------|
| Ingest `ready_for_ingestion` driver into `ingested_drivers` | **Already automated** in `PATCH /api/leads/[id]` | Triggered when last step is completed |
| Score and rank shortlist candidates | **Already automated** in `buildShortlist()` | Deterministic function |
| Set `contacted_at` on first contact transition | **Already automated** in `updateShortlistEntry()` | Only on first transition to contacted/interested/not_interested |
| Reject license/YKB/driver_card ineligible drivers | **Already automated** in `buildShortlist()` hard filters | Cannot be overridden by operator |

### Requires human approval

These actions change system state in ways the operator must consciously authorize:

| Action | Why approval is required |
|--------|--------------------------|
| Running a match (`POST /api/recruiter/match`) | Creates a new shortlist; affects operator's working view |
| Changing a contact_status | Represents a real-world interaction; must reflect actual contact |
| Closing a company need (status → closed) | Removes need from active pipeline |
| Marking a driver as `placement_ready` (future) | High-stakes — implies confirmed placement |
| Any message send to driver (future) | PII + irreversible |

### Suggestions only (computed by system, operator decides)

| Suggestion trigger | Signal | Action offered |
|-------------------|--------|---------------|
| Urgency=emergency + no shortlist in 72h | company_needs × shortlists join | "Run match" button |
| `follow_up_at` overdue | `drivers.follow_up_at <= now` | "View driver" link |
| Entry in `contacted` for > 5 days | `shortlist_entries.contacted_at` | "Move to not_interested?" link |
| New drivers entered pool since last match | `ingested_drivers.ingested_at` > `shortlists.created_at` | "Re-run match?" link |
| `interested` entry with no note | `shortlist_entries.recruiter_note IS NULL` | "Add note?" prompt |

---

## 11. Contact Process Design

### Status flow

```
shortlisted → new
                ↓ (operator calls)
           contacted ─────────────────────→ not_interested
                ↓ (driver responds positively)
           interested
                ↓ (future: both parties confirm)
          placement_ready  (migration required)
```

### Per-status definition and controls

**`new`**
- Meaning: Driver appeared on shortlist but no contact attempt has been made.
- Operator action: Review score, flags, and driver snapshot. Decide whether to call.
- Risk control: Before calling, check cross-shortlist history — has this driver been contacted on another shortlist in the past 14 days? (requires `GET /api/cockpit/driver-contact-history/[driverId]`)
- Display: Gray badge. No `contacted_at` set.

**`contacted`**
- Meaning: Operator has made first contact attempt (call, SMS, or email).
- Transition: `contacted_at` is set automatically on first transition from `new` (already implemented in `updateShortlistEntry()`).
- Expected next: Driver responds within 24–72h. If no response after 5 days → surface as suggestion to move to `not_interested`.
- Operator action: Add note with attempt details ("Called, no answer — left voicemail").
- Display: Blue badge.

**`interested`**
- Meaning: Driver has expressed interest in the role.
- Operator action: Record salary expectations, availability confirmation, and any conditions in `recruiter_note`. Arrange introduction between driver and company.
- No automated next step — human judgment required.
- Display: Green badge.

**`not_interested`**
- Meaning: Driver declined, is unreachable, or is no longer a fit.
- Driver remains in `ingested_drivers` and is eligible for future matches.
- Operator action: Record reason in `recruiter_note` (helps future analysis).
- Display: Red badge.

**`placement_ready`** *(future — migration 007 required)*
- Meaning: Both driver and company have confirmed — placement is in progress.
- This is a human-only decision. No automation.
- Requires: ALTER TABLE shortlist_entries — add 'placement_ready' to contact_status CHECK constraint.
- Display: Purple badge (suggested).

**Follow-up** *(not a contact_status — a scheduler concept)*
- Driven by `drivers.follow_up_at` and `drivers.follow_up_reason` (existing fields, migration 001).
- Reasons: `incomplete_lead`, `not_yet_available`, `ykb_in_progress`.
- Surfaced in Dashboard action queue when `follow_up_at <= today`.
- Not the same as shortlist entry follow-up — this is about the raw lead, not the match.

---

## 12. Event Timeline Design

A per-entity chronological history of everything that happened in the system.

### Events to record

| Event type | Entity | Entity type | Triggered by | Key metadata |
|------------|--------|-------------|-------------|--------------|
| `lead_created` | driver | `driver` | `POST /api/leads` | `lang`, `region` |
| `lead_ingested` | driver | `driver` | auto-ingest in `PATCH /api/leads/[id]` | `priority`, `license`, `ykb` |
| `need_created` | company need | `company_need` | `POST /api/company-needs` | `company_name`, `urgency`, `license_required` |
| `match_run` | company need | `company_need` | `POST /api/recruiter/match` | `shortlist_id`, `total_shortlisted`, `total_candidates` |
| `shortlisted` | driver | `driver` | `POST /api/recruiter/match` | `shortlist_id`, `rank`, `score`, `company_name` |
| `status_changed` | shortlist entry | `shortlist_entry` | `PATCH /api/recruiter/shortlist-entries/[id]` | `old_status`, `new_status` |
| `note_added` | shortlist entry | `shortlist_entry` | `PATCH /api/recruiter/shortlist-entries/[id]` | `note_excerpt` (first 100 chars) |

### MVP implementation: derive from existing timestamps

No new table needed for MVP. The following timestamps already exist:

| Event | Source |
|-------|--------|
| Driver entered system | `drivers.created_at` |
| Driver completed chat | `drivers.completed_at` |
| Driver ingested to pool | `ingested_drivers.ingested_at` |
| Shortlist created | `shortlists.created_at` |
| Driver shortlisted | `shortlist_entries.created_at` |
| First contact attempt | `shortlist_entries.contacted_at` |
| Last entry update | `shortlist_entries.updated_at` |

**Limitation of derived timeline:** No status change history (only the current status and the timestamp of the first contact). No note revision history.

### v2 implementation: `events` table

When status change history becomes operationally necessary, add the `events` table described in Section 7.4. Write events from inside `updateShortlistEntry()` and the match route handler.

---

## 13. Risk Controls

### 13.1 Avoid contacting the same driver twice

**Current state:** Not controlled. A driver can appear on multiple shortlists (because `shortlist_entries.driver_id` has no UNIQUE constraint across all entries, only within a shortlist). The same driver could be set to `contacted` on three different shortlists independently.

**Control (post-MVP):**
- New route: `GET /api/cockpit/driver-contact-history/[driverId]`
  - Query: `shortlist_entries WHERE driver_id = X AND contact_status != 'new' ORDER BY contacted_at DESC`
  - Join: → `shortlists` → `company_needs` → `companies`
- UI: When operator hovers over or opens a driver card in a shortlist, show "Previously contacted: [company name] on [date]" if history exists.
- No hard block — the operator may intentionally contact a driver for a different need. The control is informational, not preventive.

### 13.2 Avoid contacting a driver without valid qualification

**Current state:** Already controlled at the matching engine level.

`buildShortlist()` in `lib/matchingEngine.ts` hard-filters out:
- `ykb === 'none'` or `'unknown'` → rejected with `ykb_invalid`
- `driverCard === 'no'` or `'unknown'` → rejected with `driver_card_invalid`
- License not satisfying requirement → rejected with `license_mismatch`

Only drivers who pass all three checks appear on any shortlist. The operator cannot accidentally contact a disqualified driver via the shortlist workflow.

**Additional UI control:** Show qualification pills (License ✓, YKB ✓, Driver Card ✓) on every contact card, matching the values already displayed in `DriverCard` and `LoadedEntryCard` components.

### 13.3 Avoid exposing PII

**Current state:** The `/recruiter` page shows `firstName`, `phone`, and `email` directly in the rendered HTML for every shortlisted driver. If the page is open during a screen share, all contact details are visible.

**Controls to implement:**
1. Default render: show `firstName` only. Replace phone and email with a "[Show contact info]" button.
2. On click: reveal phone/email in-place (no server round-trip — data is already in the component state).
3. Bulk endpoints (stats, pipeline list) must not return phone or email. Only the shortlist entry detail path returns PII.
4. Future: log when contact info is revealed (requires `events` table).

**Not yet implemented.** This is a UI-only change to the existing `DriverCard` and `LoadedEntryCard` components.

### 13.4 Avoid AI sending messages without approval

**Current state:** No messaging capability exists in the system. This is not a current risk.

**Control to establish before messaging is built:**
- Any send action must go through a dedicated confirmation screen showing: recipient name, message text, and channel (SMS/email/WhatsApp).
- Confirmation screen must have an explicit "Send Now" button — no auto-send, no default-yes keyboard shortcut.
- All sent messages must be logged with: sender identity, timestamp, channel, shortlist_entry_id. This log must be readable by the operator.
- System must never call any messaging API without the operator having clicked "Send Now" in that session.

### 13.5 Avoid acting on stale shortlists

**Current state:** No indication of shortlist age on the `/recruiter` page.

**Control:** Show `created_at` on each shortlist card. In the action queue, surface: "Shortlist for [Need X] is 7 days old and pool has grown — re-run?" when `ingested_drivers.ingested_at` has entries newer than `shortlists.created_at` for that need.

---

## 14. Minimal MVP Cockpit Scope

The MVP cockpit gives the operator complete operational visibility and control without any new database migrations.

### MVP: 3 views

| View | Route | Replaces |
|------|-------|---------|
| Dashboard | `/cockpit` | Nothing (new) |
| Needs & Matches | `/cockpit/matches` | Current `/recruiter` core functionality |
| Contact Pipeline | `/cockpit/pipeline` | Nothing (new) |

### MVP: 4 new API endpoints

| Endpoint | What it does | Migration required? |
|----------|-------------|---------------------|
| `GET /api/cockpit/stats` | Counts: leads, pool, open needs, interested entries | No |
| `GET /api/recruiter/shortlists` | List all shortlists with company_name + entry status summary | No |
| `GET /api/cockpit/pipeline` | All non-new shortlist entries with company + driver context | No |
| `GET /api/cockpit/actions` | Rule-based action queue | No |

### MVP: 2 changes to existing routes

| Change | Why |
|--------|-----|
| `GET /api/company-needs` — add `company_name` via companies join | Currently only `company_id` returned; company name must be visible |
| `GET /api/company-needs` — add `created_at` to each row | Needed for "last matched X days ago" computation |

### MVP: What it enables

After MVP, the operator can:
- See a system health summary on load
- See all company needs with their company names and last-matched date
- Run matches from a need card (not a separate selection step)
- See all past shortlists without knowing UUIDs
- See all drivers currently in `contacted` or `interested` status across every shortlist
- Get a computed list of actions that need attention

### MVP: What it does NOT include

- Incoming leads table (requires new `GET /api/cockpit/leads`)
- Ingested driver pool table (requires new endpoint + PII handling)
- Event timeline (requires `events` table — post-MVP)
- Cross-shortlist duplicate-contact warning (requires new driver history endpoint)
- PII reveal toggle (UI improvement — technically easy, not blocking)
- `placement_ready` status (requires migration 007)
- Error log table (use Vercel logs until justified)

---

## 15. What NOT to Build Yet

| Feature | Why not yet |
|---------|------------|
| `events` / audit log table | Adds write overhead to every operation; derive from existing timestamps for MVP |
| `operation_logs` DB table | Vercel function logs serve this purpose until volume justifies a table |
| Automated messaging (SMS/WhatsApp) | High risk; only build after the operator has established trust in the system's recommendations |
| `placement_ready` contact status | Requires migration; add only when the placement workflow is actually being used |
| Multiple operator accounts / RBAC | One operator now; the `X-Recruiter-Key` mechanism is sufficient |
| Company portal (company sees their own needs) | Phase 3; companies are currently contacted by the operator, not self-serve |
| Mobile-optimized cockpit | Single operator on desktop; defer |
| AI-generated match summaries | The current score + flag + summary system already provides this |
| Automated re-matching on new driver entry | Risky without human review of pool changes; keep as suggestion only |
| Salary data | No salary information is collected from drivers; `salary` score component is hardcoded at 75 in `matchScore.ts` |

---

## 16. Recommended Implementation Sequence

Steps are ordered by value-per-effort ratio. Each step is independently shippable.

### Step 1 — Fix company name in needs response *(1 file change, 0 migrations)*
**Change:** In `lib/companyNeedStore.ts`, update `getOpenCompanyNeeds()` to join `companies` and return `company_name` alongside each need row. Update `GET /api/company-needs` to include it in the response. Update `/recruiter` page to display it.

**Why first:** The cockpit cannot display meaningful company need cards without names. This is a data bug, not a feature. It unblocks every subsequent UI step.

**Effort:** ~30 minutes.

---

### Step 2 — Add shortlist list endpoint *(1 new route, 0 migrations)*
**Route:** `GET /api/recruiter/shortlists`

**Returns:** Array of shortlists, each with: `id`, `created_at`, `company_need_id`, `company_name`, `total_shortlisted`, `total_candidates`, `summary`, and status counts (`new_count`, `contacted_count`, `interested_count`, `not_interested_count`).

**Query:** SELECT from `shortlists` JOIN `company_needs` JOIN `companies`, then aggregate `shortlist_entries` counts per shortlist.

**Why second:** Eliminates the "load by UUID" dead end. The operator can now navigate to any shortlist. This closes the biggest current blind spot.

**Effort:** ~2 hours.

---

### Step 3 — Add contact pipeline endpoint *(1 new route, 0 migrations)*
**Route:** `GET /api/cockpit/pipeline`

**Returns:** All `shortlist_entries` WHERE `contact_status != 'new'`, joined with: `shortlists.created_at`, `company_needs.*`, `companies.name`, plus driver details from `driver_snapshot` JSONB.

**Sorted:** `contacted` entries first, then `interested`, ordered by `contacted_at` DESC within each group.

**PII policy:** Include `firstName` in default response. Omit `phone` and `email` — return them only when the operator clicks "show contact info" (frontend-only reveal from the driver_snapshot already in state).

**Why third:** Gives the operator the contact pipeline view — the most operationally critical new capability.

**Effort:** ~2 hours.

---

### Step 4 — Add stats endpoint *(1 new route, 0 migrations)*
**Route:** `GET /api/cockpit/stats`

**Returns:**
```json
{
  "leads_today": 2,
  "pool_size": 12,
  "open_needs": 4,
  "interested_count": 2,
  "contacted_count": 3
}
```

**Queries:** 5 COUNT queries on existing tables.

**Why fourth:** Powers the system health banner on every cockpit page.

**Effort:** ~1 hour.

---

### Step 5 — Build `/cockpit` page *(new Next.js page, no backend)*
**Route:** `/cockpit` with tab navigation: Dashboard | Needs & Matches | Contact Pipeline

- **Dashboard tab:** Stats banner + action queue (initially: emergency needs with no shortlist, overdue follow_up_at entries — computed from API responses already fetched)
- **Needs & Matches tab:** Company need cards using Steps 1+2 data. "Run Match" inline. Shortlist history from Step 2 endpoint.
- **Contact Pipeline tab:** Pipeline view from Step 3 endpoint.

**Redirect:** `/recruiter` → `/cockpit/matches` (or keep both until confidence is established).

**Effort:** ~1 day.

---

### Step 6 — Add incoming leads view *(1 new route, 1 new UI tab)*
**Route:** `GET /api/cockpit/leads`

**Returns:** All `drivers` rows, ordered by `created_at` DESC, with follow-up metadata. Paginated (limit 50).

**Fields returned:** `id`, `created_at`, `completed_at`, `lead_status`, `lead_priority`, `region`, `license`, `ykb`, `follow_up_at`, `follow_up_reason` — and `first_name`. **Do not return phone or email in the list response.**

**Effort:** ~1 hour.

---

### Step 7 — Events table and timeline *(1 migration, multiple write hooks)*
**Migration 007:** Create `events` table (schema in Section 7.4).

**Write events from:**
- `POST /api/leads` → `lead_created`
- `PATCH /api/leads/[id]` (when status becomes `ready_for_ingestion`) → `lead_ingested`
- `POST /api/company-needs` → `need_created`
- `POST /api/recruiter/match` → `match_run` + one `shortlisted` event per driver
- `PATCH /api/recruiter/shortlist-entries/[id]` → `status_changed` and/or `note_added`

**Effort:** ~1 day.

---

## Replace or Extend `/recruiter`?

**Recommendation: Extend, then migrate.**

1. Build the cockpit at `/cockpit` as a new page.
2. Keep `/recruiter` live during transition — it is currently functional and in use.
3. Once `/cockpit` has been operated for one week and all features of `/recruiter` are covered, add a redirect from `/recruiter` to `/cockpit/matches`.
4. After the redirect has been live for one week with no issues, remove the `/recruiter` page.

Do not attempt a direct in-place rewrite of `/recruiter` — the risk of breaking a working tool during the rewrite is not justified when a new page can be built alongside it.

---

## Summary Table

| Capability | Already supported | Partially supported | Missing |
|------------|------------------|---------------------|---------|
| Company needs list | Route exists | company_name missing | — |
| Run a match | Fully supported | — | — |
| Load shortlist by ID | Fully supported | — | — |
| List all shortlists | — | — | New route needed |
| Contact status + notes | Fully supported | — | — |
| Contact pipeline (all active) | — | — | New route needed |
| System health stats | — | — | New route needed |
| Incoming leads view | — | — | New route + UI |
| Ingested driver pool view | — | — | New route + UI |
| Event timeline | — | timestamps only | events table needed |
| Action queue | — | — | Computed logic needed |
| Cross-shortlist dedup | — | — | New route needed |
| PII reveal control | — | — | UI change needed |
| placement_ready status | — | — | Migration needed |
| Error log | — | — | Table or Vercel logs |
