# DriverNord — Database Schema

*Last updated: 2026-05-16*
*Based on: migrations 001–013, verified against migration SQL files in `/supabase/migrations/`*

**Canonical migration directory:** `/supabase/migrations/` (Supabase CLI timestamp naming). The `/migrations/` directory is a human-readable duplicate — never run from both.

**Production state:** Migrations 001–012 are presumed applied. Migration 013 (consent + attribution columns) is **NOT YET APPLIED to production** as of 2026-05-16.

---

## Overview

Thirteen migrations across two layers: driver pipeline (001–007) and B2B pipeline (008–012), plus a GDPR/attribution extension (013).

| Migration | File | Creates / Alters | Production |
|-----------|------|-----------------|------------|
| 001 | `00100000_create_drivers.sql` | `drivers` table | Applied |
| 002 | `00200000_add_domain_shift_preference_to_drivers.sql` | adds 2 columns to `drivers` | Applied |
| 003 | `00300000_create_companies_and_company_needs.sql` | `companies`, `company_needs` | Applied |
| 004 | `00400000_create_ingested_drivers.sql` | `ingested_drivers` | Applied |
| 005 | `00500000_create_shortlists.sql` | `shortlists`, `shortlist_entries` | Applied |
| 006 | `00600000_add_contact_workflow_to_shortlist_entries.sql` | adds 4 columns to `shortlist_entries` | Applied |
| 007 | `00700000_create_system_actions.sql` | `system_actions` | Applied |
| 008 | `00800000_create_company_research_targets.sql` | `company_research_targets` | Presumed applied |
| 009 | `00900000_create_company_outreach_actions.sql` | `company_outreach_actions` | Presumed applied |
| 010 | `01000000_create_pilot_company_relationships.sql` | `pilot_company_relationships` | Presumed applied |
| 011 | `01100000_create_company_need_drafts.sql` | `company_need_drafts` | Presumed applied |
| 012 | `01200000_create_b2b_agent_warnings.sql` | `b2b_agent_warnings` | Presumed applied |
| 013 | `01300000_add_consent_and_attribution_to_drivers.sql` | adds 10 columns to `drivers` | **NOT APPLIED** |

---

## Tables

### `drivers`

Every conversation session from `/chat`. Each row is one anonymous lead that may progress into a classified driver profile. All columns except `id`, `created_at`, `last_step_reached`, `lead_status`, and `follow_up_sent` are nullable — they are filled in as the conversation progresses.

**Source:** `lib/supabaseStore.ts`, `types/lead.ts`

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `completed_at` | TIMESTAMPTZ | YES | — | |
| `last_step_reached` | INTEGER | NOT NULL | `0` | |
| `lang` | TEXT | YES | — | `IN ('sv', 'en')` |
| `region` | TEXT | YES | — | `IN ('stockholm', 'other_sweden', 'abroad')` |
| `relocate` | TEXT | YES | — | `IN ('yes', 'no')` |
| `license` | TEXT | YES | — | `IN ('C', 'CE', 'D', 'C+D', 'CE+D', 'none')` |
| `ykb` | TEXT | YES | — | `IN ('valid', 'expired', 'in_progress', 'none', 'unknown')` |
| `driver_card` | TEXT | YES | — | `IN ('valid', 'expired', 'no', 'unknown')` |
| `availability` | TEXT | YES | — | `IN ('now', '2_weeks', '1_month', 'not_yet')` |
| `domain` | TEXT | YES | — | 15-value CHECK (added in 002) |
| `shift_preference` | TEXT | YES | — | `IN ('day', 'night', 'weekend', 'flexible')` (added in 002) |
| `first_name` | TEXT | YES | — | |
| `phone` | TEXT | YES | — | |
| `email` | TEXT | YES | — | |
| `lead_status` | TEXT | NOT NULL | `'anonymous_dropoff'` | `IN ('ready_for_ingestion', 'incomplete_lead', 'disqualified', 'anonymous_dropoff')` |
| `lead_priority` | TEXT | YES | — | `IN ('HIGH', 'MEDIUM', 'LOW')` |
| `follow_up_sent` | BOOLEAN | NOT NULL | `false` | |
| `follow_up_at` | TIMESTAMPTZ | YES | — | |
| `follow_up_reason` | TEXT | YES | — | `IN ('incomplete_lead', 'not_yet_available', 'ykb_in_progress')` |

**Indexes:**
- `idx_drivers_follow_up` — partial on `(follow_up_at)` WHERE `follow_up_sent = false AND follow_up_at IS NOT NULL` — used by `followUpAgent`
- `idx_drivers_lead_status` — on `(lead_status)` — used for ingestion checks

---

### `ingested_drivers`

The candidate pool for the matching engine. Populated by `ingestLead()` when a driver's `lead_status` reaches `'ready_for_ingestion'`. The primary key is the same UUID as the originating `drivers` row, enforcing a strict 1:1 relationship.

**Source:** `lib/ingestedDriverStore.ts`, `lib/ingestedDriver.ts`

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | — | PK + FK → `drivers(id)` |
| `ingested_at` | TIMESTAMPTZ | NOT NULL | — | |
| `priority` | TEXT | NOT NULL | — | `IN ('HIGH', 'MEDIUM', 'LOW')` |
| `license` | TEXT | NOT NULL | — | `IN ('C', 'CE', 'D', 'C+D', 'CE+D', 'none')` |
| `ykb` | TEXT | NOT NULL | — | `IN ('valid', 'expired', 'in_progress', 'none', 'unknown')` |
| `driver_card` | TEXT | NOT NULL | — | `IN ('valid', 'expired', 'no', 'unknown')` |
| `region` | TEXT | NOT NULL | — | `IN ('stockholm', 'other_sweden', 'abroad')` |
| `willing_to_relocate` | BOOLEAN | YES | — | |
| `availability` | TEXT | NOT NULL | — | `IN ('now', '2_weeks', '1_month', 'not_yet')` |
| `domain` | TEXT | YES | — | 15-value CHECK |
| `shift_preference` | TEXT | YES | — | `IN ('day', 'night', 'weekend', 'flexible')` |
| `first_name` | TEXT | NOT NULL | — | |
| `phone` | TEXT | NOT NULL | — | |
| `email` | TEXT | YES | — | |
| `needs_follow_up` | BOOLEAN | NOT NULL | `false` | |
| `follow_up_at` | TIMESTAMPTZ | YES | — | |
| `follow_up_reason` | TEXT | YES | — | `IN ('incomplete_lead', 'not_yet_available', 'ykb_in_progress')` |

**Notes:**
- `createIngestedDriver` uses `upsert({ onConflict: 'id', ignoreDuplicates: true })` — re-ingestion is a no-op, the original row is preserved.
- Phone is stored as plain TEXT — format is not validated at the database level.

**Indexes:**
- `idx_ingested_drivers_region_license` — composite on `(region, license)` — matching engine filter

---

### `companies`

Client company lookup table. One row per company. Created before any `company_needs` rows, since `company_needs.company_id` references this table.

**Source:** `lib/companyNeedStore.ts`

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `name` | TEXT | NOT NULL | — | |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |

---

### `company_needs`

Open staffing requirements from client companies. The matching engine scores all `ingested_drivers` against each open need. `domain_preferred` is a TEXT array validated at the application layer (not constrained element-by-element in the DB).

**Source:** `lib/companyNeedStore.ts`, `lib/companyNeed.ts`

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `company_id` | UUID | NOT NULL | — | FK → `companies(id)` ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `license_required` | TEXT | NOT NULL | — | `IN ('C', 'CE', 'D', 'C+D', 'CE+D')` — 'none' excluded |
| `domain_required` | TEXT | NOT NULL | — | 15-value CHECK |
| `domain_preferred` | TEXT[] | NOT NULL | `'{}'` | element values validated by app layer |
| `location_region` | TEXT | NOT NULL | — | `IN ('stockholm', 'other_sweden', 'abroad')` |
| `relocation_allowed` | BOOLEAN | NOT NULL | `false` | |
| `shift_type` | TEXT | NOT NULL | — | `IN ('day', 'night', 'weekend', 'flexible')` |
| `urgency` | TEXT | NOT NULL | `'standard'` | `IN ('standard', 'urgent', 'emergency')` |
| `status` | TEXT | NOT NULL | `'open'` | `IN ('open', 'closed')` |

**Indexes:**
- `idx_company_needs_open` — partial on `(created_at DESC)` WHERE `status = 'open'` — matching engine fetch
- `idx_company_needs_company_id` — on `(company_id)`

---

### `shortlists`

Header record for each matching run. One shortlist is created per `runMatchingAgent` call against one `company_need`. Multiple shortlists can exist for the same need (one per run). The `id` is assigned by the application (`randomUUID()` in `createShortlist`) — the DB `DEFAULT gen_random_uuid()` is not used in practice.

**Source:** `lib/shortlistStore.ts`

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `company_need_id` | UUID | NOT NULL | — | FK → `company_needs(id)` ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `total_candidates` | INTEGER | NOT NULL | `0` | |
| `total_shortlisted` | INTEGER | NOT NULL | `0` | |
| `summary` | TEXT | NOT NULL | `''` | |

**Indexes:**
- `idx_shortlists_company_need_id` — on `(company_need_id, created_at DESC)`

---

### `shortlist_entries`

One row per scored driver in a shortlist. The `id` is auto-generated by the DB (`gen_random_uuid()`) — the application does not set it. `driver_snapshot` is a point-in-time denormalised copy of the driver at match time, used for cockpit display without a join.

**Source:** `lib/shortlistStore.ts`

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `shortlist_id` | UUID | NOT NULL | — | FK → `shortlists(id)` ON DELETE CASCADE |
| `driver_id` | UUID | NOT NULL | — | FK → `ingested_drivers(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `rank` | INTEGER | NOT NULL | — | |
| `match_score` | INTEGER | NOT NULL | — | |
| `breakdown` | JSONB | NOT NULL | `'{}'` | |
| `flags` | TEXT[] | NOT NULL | `'{}'` | |
| `summary` | TEXT | NOT NULL | `''` | |
| `driver_snapshot` | JSONB | NOT NULL | `'{}'` | |
| `contact_status` | TEXT | NOT NULL | `'new'` | `IN ('new', 'contacted', 'interested', 'not_interested')` (added in 006) |
| `contacted_at` | TIMESTAMPTZ | YES | — | set on first status transition away from 'new' (added in 006) |
| `recruiter_note` | TEXT | YES | — | (added in 006) |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | bumped on every `updateShortlistEntry` call (added in 006) |

**Indexes:**
- `idx_shortlist_entries_shortlist_id` — on `(shortlist_id, rank)`
- `idx_shortlist_entries_driver_id` — on `(driver_id)`
- `idx_shortlist_entries_driver_contact` — partial on `(driver_id, contacted_at DESC)` WHERE `contact_status != 'new'` — used by `wasRecentlyContacted` dedup check (added in 006)
- `idx_shortlist_entries_contact_status` — partial on `(contact_status)` WHERE `contact_status = 'new'` — pending-approval queue (added in 006)

---

### `system_actions`

The single audit trail, observation feed, and pending-approval queue for the autonomous pipeline. Every agent action and every human override appends one row. The cockpit reads this table for the live feed, pending queue, and failure panel.

**Source:** `lib/systemActions.ts`

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `action_type` | TEXT | NOT NULL | — | 14-value CHECK (see below) |
| `triggered_by` | TEXT | NOT NULL | — | free-text; no CHECK constraint |
| `target_type` | TEXT | NOT NULL | — | `IN ('driver', 'company_need', 'shortlist', 'shortlist_entry')` |
| `target_id` | UUID | NOT NULL | — | no FK — intentional; target may not exist at query time |
| `status` | TEXT | NOT NULL | `'completed'` | `IN ('pending', 'approved', 'completed', 'failed', 'cancelled')` |
| `input` | JSONB | YES | — | inputs passed to the agent |
| `result` | JSONB | YES | — | outputs produced |
| `error` | TEXT | YES | — | set when `status = 'failed'` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `completed_at` | TIMESTAMPTZ | YES | — | set when status is `'completed'` or `'failed'` |

**`action_type` values (14):**

| Value | Set by | Meaning |
|-------|--------|---------|
| `driver_ingested` | agent:driver_ingestion | Driver entered candidate pool |
| `need_ingested` | agent:company_need | New company need created (reserved) |
| `match_run` | agent:matching | Scoring run completed for one need |
| `shortlist_created` | agent:matching | Shortlist header written |
| `contact_suggested` | agent:contact | Suggestion queued for human approval |
| `contact_sent` | agent:contact | Message sent (auto mode) |
| `contact_skipped` | agent:contact | Driver skipped (dedup / guard / score) |
| `contact_confirmed` | human | Approved a `contact_suggested` action |
| `follow_up_triggered` | agent:followup | Follow-up queued for human approval |
| `follow_up_sent` | agent:followup | Follow-up sent (auto mode) |
| `follow_up_skipped` | agent:followup | Driver skipped (dedup) |
| `follow_up_confirmed` | human | Approved a `follow_up_triggered` action |
| `override_cancelled` | human | Cancelled a pending action |
| `override_retried` | human | Retried a failed action |

**Notes:**
- `triggered_by` is free-text (no CHECK) so new agent labels can be introduced without a migration. Known values: `'agent:driver_ingestion'`, `'agent:matching'`, `'agent:contact'`, `'agent:followup'`, `'human'`, `'agent:company_need'`.
- `target_id` has no FK — a deleted driver's actions remain in the audit log.
- `need_ingested` is reserved and not currently emitted by any agent.

**Indexes:**
- `idx_system_actions_created_at` — on `(created_at DESC)` — cockpit live feed
- `idx_system_actions_pending` — partial on `(created_at DESC)` WHERE `status = 'pending'` — pending-approval queue
- `idx_system_actions_target` — on `(target_type, target_id, created_at DESC)` — per-entity audit history
- `idx_system_actions_failed` — partial on `(created_at DESC)` WHERE `status = 'failed'` — failure panel in cockpit

---

## Relationships

```
companies
  └─ company_needs (company_id → companies.id, CASCADE)
       └─ shortlists (company_need_id → company_needs.id, CASCADE)
            └─ shortlist_entries (shortlist_id → shortlists.id, CASCADE)

drivers
  └─ ingested_drivers (id → drivers.id, shared PK/FK, 1:1)
       └─ shortlist_entries (driver_id → ingested_drivers.id)

system_actions
  (no FK — target_id is a free UUID reference)

company_research_targets (B2B pipeline root)
  └─ company_outreach_actions (target_id → company_research_targets.id, CASCADE)
  └─ company_need_drafts (target_id → company_research_targets.id, CASCADE)
  └─ pilot_company_relationships (target_id → company_research_targets.id, CASCADE, 1:1 UNIQUE)
       └─ company_need_drafts (relationship_id → pilot_company_relationships.id, SET NULL)
       └─ companies (company_id → companies.id, SET NULL) ← Gate 6 promotion only

b2b_agent_warnings
  (nullable FKs to research_targets, outreach_actions, pilot_relationships)
```

---

## B2B Tables (migrations 008–012)

These tables form the B2B sales pipeline — fully separate from the driver pipeline. A research target must never appear in `companies` until a human explicitly clears Gate 6.

### `company_research_targets`

The master prospect registry. One row per company researched. Replaces the static CSV files. **Key constraint:** A row here is a prospect, not a client. Rows are promoted to `companies` only at Gate 6.

Key columns: `company_name` (UNIQUE), `region`, `segment`, `transport_domain[]`, `barrier_level`, `pilot_accessibility_score` (0–100), `research_status`, `decision_maker_name/role`, `contact_email`.

### `company_outreach_actions`

Outreach drafts (email, LinkedIn, phone opener) generated by agents and reviewed by the operator. **No send mechanism exists** — the operator manually sends from their own email/LinkedIn and confirms by updating `sent_at`. This is a draft storage table, not a messaging system.

Key columns: `target_id` (FK), `outreach_type`, `draft_content`, `draft_status` (`drafted` → `approved` → `sent`), `sent_at` (human-confirmed only).

### `pilot_company_relationships`

Sales pipeline state machine. One row per target (1:1 UNIQUE). Tracks from first outreach through pilot agreement or disqualification.

Key columns: `target_id` (UNIQUE FK), `relationship_status` (9 states from `researched` → `pilot_agreed`), `dpa_status`, `company_id` (NULL until Gate 6).

**Critical invariant:** `company_id` is NULL for the entire research/outreach lifecycle. It is set only when Gate 6 is cleared and a real `companies` row is created.

### `company_need_drafts`

Firewall between a sales conversation and a matching-triggering `company_need`. Agent drafts the need structure from call notes; human approves at Gate 5; human converts at Gate 6.

**No automated path from this table to `company_needs`.** Conversion is a single explicit recruiter-authenticated API call.

Key columns: `target_id` (FK), `relationship_id` (FK, nullable), `draft_status`, `converted_need_id` (set at Gate 6).

### `b2b_agent_warnings`

Structured warnings generated by B2B agents (stale research, missed follow-up, DPA missing before share, draft queue overflow). Separate from `system_actions` — different entity types, different lifecycle.

Key columns: `warning_type` (9 types), `severity` (`error`/`warning`/`reminder`), nullable FKs to target/outreach/relationship.

---

## Migration 013: Consent and Attribution Columns

**Status: NOT APPLIED TO PRODUCTION as of 2026-05-16.**

These columns were added to `drivers` by `01300000_add_consent_and_attribution_to_drivers.sql`:

| Column | Purpose |
|--------|---------|
| `consent_registration_at` | Timestamp of GDPR consent step completion (NULL = no consent yet) |
| `consent_registration_version` | Version of consent text shown (e.g. `'v1'`) |
| `consent_scope` | Scope of consent granted |
| `utm_source` | e.g. `facebook`, `instagram` |
| `utm_medium` | e.g. `organic`, `paid` |
| `utm_campaign` | e.g. `driver_acquisition` |
| `utm_content` | e.g. `angle01_frustration_v1` (links to Creative Agent angle) |
| `utm_term` | keyword (rarely used for social) |
| `landing_page_url` | Full URL of the page where the driver first landed |
| `referrer_url` | HTTP Referer at chat start |

**Index added:** `idx_drivers_no_consent` — on `(created_at DESC)` WHERE `consent_registration_at IS NULL AND lead_status = 'ready_for_ingestion'` — supports GDPR audit queries.

**Action required:** Founder must apply migration 013 to production Supabase before any driver consent data is stored. Until applied, consent records are silently discarded.

---

## Schema Assumptions and Known Risks

| Item | Status | Notes |
|------|--------|-------|
| Migration files are idempotent | CONFIRMED | All use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` |
| Migration 013 NOT in production | CONFIRMED GAP | Apply immediately — consent and UTM data is being lost |
| Migrations 001–012 in production | PRESUMED | Not verified against live Supabase; assume applied based on project-state.md |
| `domain_preferred` element validation | APP LAYER ONLY | DB stores any TEXT[]; `validateCompanyNeedInput` enforces valid domain values |
| Phone number format | UNVALIDATED | TEXT column; no regex or format check at DB level |
| Email format | UNVALIDATED | TEXT column; no CHECK constraint |
| `need_ingested` action type | RESERVED | Defined in both migration and ActionType but never emitted |
| `target_id` referential integrity (system_actions) | NONE | Intentional — allows audit log to outlive deleted records |
| Re-ingestion behavior | IGNORE | `upsert(ignoreDuplicates: true)` — only the first ingestion is stored |
| B2B send mechanism | NONE | `company_outreach_actions` has no automated send. Operator sends manually. |
| Gate 6 automation | PROHIBITED | No agent may write to `company_needs` directly. Human-only Gate 6 conversion. |

---

## Domain Tag Values (15)

Used in `drivers.domain`, `ingested_drivers.domain`, `company_needs.domain_required`, and validated (not constrained) in `company_needs.domain_preferred`.

```
tipp, kran, kylfrys, silo, flatbed, tanker,
ekipage, schakt_bygg, distribution, livsmedelskyla,
avfall, skogstransport, adr, fjarrtransport, budtransport
```
