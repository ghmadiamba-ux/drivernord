# DriverNord — Database Schema

*Last updated: 2026-05-10*
*Based on: migrations 001–007, verified against lib/supabaseStore.ts, lib/ingestedDriverStore.ts, lib/companyNeedStore.ts, lib/shortlistStore.ts, lib/systemActions.ts*

---

## Overview

Seven tables. Applied in order — each migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`).

| Migration | File | Creates / Alters |
|-----------|------|-----------------|
| 001 | `001_create_drivers.sql` | `drivers` table |
| 002 | `002_add_domain_shift_preference_to_drivers.sql` | adds 2 columns to `drivers` |
| 003 | `003_create_companies_and_company_needs.sql` | `companies`, `company_needs` |
| 004 | `004_create_ingested_drivers.sql` | `ingested_drivers` |
| 005 | `005_create_shortlists.sql` | `shortlists`, `shortlist_entries` |
| 006 | `006_add_contact_workflow_to_shortlist_entries.sql` | adds 4 columns to `shortlist_entries` |
| 007 | `007_create_system_actions.sql` | `system_actions` |

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
```

---

## Schema Assumptions and Known Risks

| Item | Status | Notes |
|------|--------|-------|
| Migration files are idempotent | CONFIRMED | All use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` |
| Migrations match codebase | CONFIRMED | Verified column-by-column against store files and types |
| `domain_preferred` element validation | APP LAYER ONLY | DB stores any TEXT[]; `validateCompanyNeedInput` enforces valid domain values |
| Phone number format | UNVALIDATED | TEXT column; no regex or format check at DB level |
| Email format | UNVALIDATED | TEXT column; no CHECK constraint |
| `need_ingested` action type | RESERVED | Defined in both migration and ActionType but never emitted |
| `target_id` referential integrity | NONE | Intentional — allows audit log to outlive deleted records |
| Re-ingestion behavior | IGNORE | `upsert(ignoreDuplicates: true)` — only the first ingestion is stored |
| Live production schema | UNKNOWN | This schema reflects the migration files. The live Supabase instance has not been inspected — column types, default values, or indexes may differ if migrations were not applied in order or were applied manually. |

---

## Domain Tag Values (15)

Used in `drivers.domain`, `ingested_drivers.domain`, `company_needs.domain_required`, and validated (not constrained) in `company_needs.domain_preferred`.

```
tipp, kran, kylfrys, silo, flatbed, tanker,
ekipage, schakt_bygg, distribution, livsmedelskyla,
avfall, skogstransport, adr, fjarrtransport, budtransport
```
