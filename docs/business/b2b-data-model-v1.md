# DriverNord — B2B Data Model v1

*Created: 2026-05-10*
*Based on: b2b-agent-architecture-v1.md, database-schema.md (migrations 001–007)*
*Status: Design document only. No migrations written yet. No schema changes.*

---

## Overview

The existing DriverNord schema has 7 tables covering the driver-side pipeline (`drivers`, `ingested_drivers`, `companies`, `company_needs`, `shortlists`, `shortlist_entries`, `system_actions`). This document defines 5 additional tables for the B2B agent pipeline. They are additive — they extend the schema without modifying any existing table.

The 5 new tables follow the same conventions as migrations 001–007:
- UUID primary keys with `gen_random_uuid()` default
- `TIMESTAMPTZ NOT NULL DEFAULT now()` for `created_at`
- TEXT columns with CHECK constraints for enum fields
- Partial indexes for frequent filtered queries
- No FK enforcement on fields that may outlive their referenced rows (same pattern as `system_actions.target_id`)

**Migration file targets:** `migrations/008` through `migrations/012`

---

## Table 1 — `company_research_targets`

**Purpose:** Canonical database storage for every company DriverNord has researched as a potential pilot client. Replaces the static CSV files (`b2b-target-company-first-50.csv`, `b2b-target-company-top-10-research.csv`) with queryable, join-able, cockpit-visible records.

**Important distinction from `companies`:** A `company_research_target` is a prospect — a company being evaluated for potential outreach. A `companies` row is a client — a company with at least one real, matching-triggering `company_need`. These two states must remain in separate tables. A research target becomes a `companies` row only when Gate 6 (human approval to convert a need draft) is cleared and a real `company_need` is created. Until that point, the research target must never appear in the `companies` table, because anything linked to `companies` can be joined to `company_needs` and matched against the driver pool.

### Column schema

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | bumped on any field change |
| `company_name` | TEXT | NOT NULL | — | |
| `website` | TEXT | YES | — | |
| `region` | TEXT | YES | — | `IN ('stockholm', 'stockholm_region', 'malardalen', 'other_sweden')` |
| `city` | TEXT | YES | — | |
| `company_size` | TEXT | YES | — | `IN ('micro', 'small', 'medium', 'large')` |
| `segment` | TEXT | YES | — | `IN ('A', 'B', 'C', 'D', 'E', 'F', 'agency', 'A/E', 'B/E', 'A/D', 'B/D')` |
| `transport_domain` | TEXT[] | NOT NULL | `'{}'` | element values validated at app layer (15-domain taxonomy) |
| `visible_driver_need` | BOOLEAN | YES | — | |
| `job_ads_url` | TEXT | YES | — | |
| `license_mentions` | TEXT[] | NOT NULL | `'{}'` | element values: `IN ('C', 'CE', 'D', 'C+D', 'CE+D', 'B')` at app layer |
| `ykb_mentioned` | BOOLEAN | YES | — | |
| `driver_card_mentioned` | BOOLEAN | YES | — | |
| `urgency_signal` | TEXT | YES | — | `IN ('none', 'single_ad', 'repeated_ads', 'stated_urgency')` |
| `contact_email` | TEXT | YES | — | |
| `phone` | TEXT | YES | — | |
| `linkedin_url` | TEXT | YES | — | |
| `decision_maker_name` | TEXT | YES | — | |
| `decision_maker_role` | TEXT | YES | — | `IN ('owner', 'VD', 'transport_manager', 'driftchef', 'operations_director', 'HR_manager', 'unknown')` |
| `procurement_page` | TEXT | YES | — | URL or `'none'` |
| `supplier_requirements_url` | TEXT | YES | — | URL or `'none_found'` |
| `barrier_level` | TEXT | YES | — | `IN ('low', 'medium', 'high', 'enterprise_only')` |
| `barrier_notes` | TEXT | YES | — | specific evidence; free text |
| `pilot_accessibility_score` | INTEGER | YES | — | `CHECK (pilot_accessibility_score >= 0 AND pilot_accessibility_score <= 100)` |
| `opportunity_score` | INTEGER | YES | — | `CHECK (opportunity_score >= 0 AND opportunity_score <= 100)` |
| `recommended_entry_point` | TEXT | YES | — | |
| `next_action` | TEXT | YES | — | |
| `research_status` | TEXT | NOT NULL | `'not_started'` | `IN ('not_started', 'researching', 'enriched', 'incomplete', 'rejected')` |
| `source_notes` | TEXT | YES | — | raw evidence, source platform, ad content before expiry |
| `last_checked_date` | TIMESTAMPTZ | YES | — | |
| `scored_at` | TIMESTAMPTZ | YES | — | when Agent B last computed the score |
| `scored_by` | TEXT | YES | — | `'agent:scoring'` or recruiter ID on manual override |
| `approved_as_target_at` | TIMESTAMPTZ | YES | — | when Gate 1 was cleared (operator confirmed valid target) |
| `approved_as_target_by` | TEXT | YES | — | recruiter identifier |

### `research_status` values

| Value | Meaning | Allowed transitions |
|-------|---------|---------------------|
| `not_started` | Identified, minimum fields only | → `researching` |
| `researching` | Agent A is actively processing | → `enriched`, `incomplete`, `rejected` |
| `enriched` | All available public fields complete; awaiting Gate 1 | → `not_started` (if re-queued), `rejected` |
| `incomplete` | Research attempted; key fields missing (no DM, no contact) | → `researching` (re-queued), `rejected` |
| `rejected` | Disqualified: Segment F, wrong license, bankrupt, Norrland, public procurement | terminal |

### Indexes

```sql
-- Primary query: cockpit B2B tab sorted by score descending, filtered by research_status
CREATE INDEX idx_crt_status_score
  ON company_research_targets (research_status, pilot_accessibility_score DESC);

-- Warning agent: find stale enriched records (last_checked_date old, no Gate 1 approval)
CREATE INDEX idx_crt_last_checked
  ON company_research_targets (last_checked_date ASC)
  WHERE research_status = 'enriched';

-- Score queue: find unscored enriched records for Agent B
CREATE INDEX idx_crt_unscored
  ON company_research_targets (created_at ASC)
  WHERE research_status = 'enriched' AND pilot_accessibility_score IS NULL;

-- Region filter for geographic clustering
CREATE INDEX idx_crt_region
  ON company_research_targets (region, barrier_level);
```

### What this table must NOT replace

`companies` — the existing client table. `companies` is joined to `company_needs`, which feeds the matching engine. A research target written to `companies` by mistake would make it possible for `runMatchingAgent()` to find that company and attach a shortlist to it before any real need exists. The separation is a hard architectural boundary: research targets live here until a human explicitly promotes them.

---

## Table 2 — `company_outreach_actions`

**Purpose:** Every outreach draft generated by Agent C, reviewed by the operator, and (once approved) sent manually via the operator's own email or LinkedIn account. Also stores follow-up drafts and phone openers. This table is the audit trail for all B2B contact preparation and confirms what was written before any message reached a company contact.

**This table never sends anything.** There is no send mechanism in DriverNord that reads from this table and dispatches a message to a company contact. All sending is done by the human outside the system. The `sent_at` and `sent_by` fields are populated only when the operator manually confirms they have sent the message.

### Column schema

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `target_id` | UUID | NOT NULL | — | FK → `company_research_targets(id)` ON DELETE CASCADE |
| `outreach_type` | TEXT | NOT NULL | — | `IN ('email_first', 'email_followup', 'linkedin_message', 'phone_opener', 'objection_response')` |
| `draft_content` | TEXT | NOT NULL | — | the draft message body |
| `subject_line` | TEXT | YES | — | populated for `email_first` and `email_followup` only |
| `draft_status` | TEXT | NOT NULL | `'drafted'` | `IN ('drafted', 'needs_edit', 'approved', 'rejected', 'sent')` |
| `drafted_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `drafted_by` | TEXT | NOT NULL | — | `'agent:outreach_draft'` or recruiter ID on manual write |
| `reviewed_at` | TIMESTAMPTZ | YES | — | when operator opened the draft for review |
| `approved_at` | TIMESTAMPTZ | YES | — | when Gate 3 was cleared |
| `approved_by` | TEXT | YES | — | recruiter identifier |
| `rejection_reason` | TEXT | YES | — | operator note on why draft was rejected |
| `edit_notes` | TEXT | YES | — | operator notes on what was changed from the draft |
| `sent_at` | TIMESTAMPTZ | YES | — | human-confirmed send timestamp — not set automatically |
| `sent_by` | TEXT | YES | — | recruiter identifier; set manually |
| `send_channel` | TEXT | YES | — | `IN ('email', 'linkedin', 'phone', 'other')` — how the human sent it |
| `send_context` | TEXT | YES | — | operator note, e.g. "sent from personal Gmail, CC joakim.sjolen@trabe.se" |
| `sequence_position` | INTEGER | YES | — | for multi-step sequences: 1=first, 2=follow-up, 3=second follow-up |

### `draft_status` values

| Value | Meaning | Allowed transitions |
|-------|---------|---------------------|
| `drafted` | Agent C produced draft; awaiting operator review | → `needs_edit`, `approved`, `rejected` |
| `needs_edit` | Operator flagged issues; operator edits directly or re-queues to agent | → `drafted` (re-draft), `approved` |
| `approved` | Gate 3 cleared; operator is ready to send manually | → `sent`, `rejected` |
| `rejected` | Operator discarded this draft (wrote their own, or decided not to send) | terminal |
| `sent` | Operator confirmed they sent the message | terminal |

### Indexes

```sql
-- Cockpit B2B: pending draft approval queue
CREATE INDEX idx_coa_pending
  ON company_outreach_actions (created_at DESC)
  WHERE draft_status IN ('drafted', 'needs_edit');

-- Per-target history (all drafts for one company)
CREATE INDEX idx_coa_target_id
  ON company_outreach_actions (target_id, created_at DESC);

-- Sent log (confirmed sends, newest first)
CREATE INDEX idx_coa_sent
  ON company_outreach_actions (sent_at DESC)
  WHERE draft_status = 'sent';
```

### Why this table must never send automatically

The driver-side contact agent sends messages via `getMessagingProvider().sendMessage()` after human approval. That mechanism exists because drivers have already consented to being contacted (they submitted their profile). Companies have not consented. Sending a message to a company contact via an automated system — even one that the human has approved — would constitute unsolicited automated commercial contact to a third party. All company outreach must originate from the human's own account, not from DriverNord's infrastructure.

---

## Table 3 — `pilot_company_relationships`

**Purpose:** Tracks each target company's progression through the B2B sales pipeline — from first outreach through pilot agreement or disqualification. One row per company (one active relationship record per `target_id`). This is the state machine for the B2B pipeline; all Agent D outputs land here.

### Column schema

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `target_id` | UUID | NOT NULL | — | FK → `company_research_targets(id)` ON DELETE CASCADE; UNIQUE (one relationship per target) |
| `relationship_status` | TEXT | NOT NULL | `'researched'` | `IN ('researched', 'outreach_ready', 'contacted', 'replied', 'call_booked', 'needs_collected', 'pilot_agreed', 'pilot_lost', 'nurture_later')` |
| `first_contact_date` | TIMESTAMPTZ | YES | — | set when operator confirms first outreach was sent |
| `first_contact_outreach_id` | UUID | YES | — | FK → `company_outreach_actions(id)` — which draft was used |
| `last_interaction_date` | TIMESTAMPTZ | YES | — | bumped on every human-confirmed touchpoint |
| `next_action` | TEXT | YES | — | specific next step instruction |
| `next_action_date` | TIMESTAMPTZ | YES | — | when the next action should happen; drives follow-up reminders |
| `call_notes` | TEXT | YES | — | operator-entered notes from calls and meetings; append-only by convention |
| `reply_summary` | TEXT | YES | — | summary of company's first and subsequent replies |
| `reply_sentiment` | TEXT | YES | — | `IN ('positive', 'neutral', 'negative', 'no_reply')` — operator assessment |
| `objections_raised` | TEXT[] | NOT NULL | `'{}'` | e.g., `'{staffing_confusion, existing_agency, no_budget}'` |
| `pilot_agreed_date` | TIMESTAMPTZ | YES | — | when pilot agreement was confirmed |
| `pilot_scope_notes` | TEXT | YES | — | what was agreed: one need, one shortlist, reference in exchange |
| `pilot_lost_reason` | TEXT | YES | — | why the company declined or became unsuitable |
| `nurture_resume_date` | TIMESTAMPTZ | YES | — | when to revisit a `nurture_later` company |
| `dpa_status` | TEXT | YES | — | `IN ('not_raised', 'requested', 'signed', 'declined')` — GDPR data processor agreement |
| `dpa_signed_date` | TIMESTAMPTZ | YES | — | |
| `company_id` | UUID | YES | — | FK → `companies(id)` — populated only when a real `company_need` is created (Gate 6) |
| `converted_at` | TIMESTAMPTZ | YES | — | when this relationship produced a real `companies` + `company_needs` row |

### `relationship_status` values and transitions

| Value | Meaning | Set by | Allowed transitions |
|-------|---------|--------|---------------------|
| `researched` | In research queue; not yet outreach-ready | Agent D (initial) | → `outreach_ready` |
| `outreach_ready` | Score and draft approved; ready for human to send | Human (Gate 3 cleared) | → `contacted` |
| `contacted` | Human confirmed they sent first outreach | Human | → `replied`, `nurture_later` |
| `replied` | Company responded (any content) | Human (enters reply) | → `call_booked`, `pilot_lost`, `nurture_later` |
| `call_booked` | Meeting or call scheduled | Human | → `needs_collected`, `pilot_lost`, `nurture_later` |
| `needs_collected` | Call happened; company requirements captured as notes | Human (Gate 4 cleared) | → `pilot_agreed`, `pilot_lost`, `nurture_later` |
| `pilot_agreed` | Company agreed to participate in a pilot | Human | → `pilot_lost` (rare — fallback if company backs out) |
| `pilot_lost` | Company declined, disqualified, or became unsuitable | Human | → `nurture_later` |
| `nurture_later` | No current urgency; revisit in 60–90 days | Human | → `outreach_ready` (re-activated) |

**What Agent D cannot do:** Advance a company past `outreach_ready` without human confirmation. Silence after a sent email does not move status from `contacted` to `pilot_lost`. Only a human entering an outcome does. Agent D surfaces a reminder (via `b2b_agent_warnings`) when `next_action_date` passes with no status change — it does not act unilaterally.

### Indexes

```sql
-- Cockpit: all relationships with overdue next_action_date (reminder queue)
CREATE INDEX idx_pcr_next_action
  ON pilot_company_relationships (next_action_date ASC)
  WHERE relationship_status NOT IN ('pilot_agreed', 'pilot_lost')
    AND next_action_date IS NOT NULL;

-- Per-status counts for cockpit pipeline summary
CREATE INDEX idx_pcr_status
  ON pilot_company_relationships (relationship_status, last_interaction_date DESC);

-- Lookup by target_id (one-to-one join)
CREATE UNIQUE INDEX idx_pcr_target_id
  ON pilot_company_relationships (target_id);

-- Find relationships that have converted (have a company_id)
CREATE INDEX idx_pcr_converted
  ON pilot_company_relationships (company_id)
  WHERE company_id IS NOT NULL;
```

### Relation to `companies`

`pilot_company_relationships.company_id` is nullable. It is `NULL` for every company in the research and outreach stages. It is populated only when:

1. The company has agreed to a pilot (`relationship_status = 'pilot_agreed'`)
2. A `company_need_draft` has been validated (Gate 5)
3. The operator has explicitly approved conversion (Gate 6)
4. The system creates a `companies` row and a `company_needs` row
5. The `company_id` FK is set on this relationship record

Before all five steps are complete, the company must never appear in the `companies` table.

---

## Table 4 — `company_need_drafts`

**Purpose:** The firewall between a sales conversation and a real, matching-triggering `company_need`. Agent E writes structured need drafts here from operator-entered call notes. The operator validates the draft at Gate 5, then explicitly converts it to a real need at Gate 6. Only after Gate 6 does a `company_need` row exist.

---

### The critical distinction — repeated here because it must never be forgotten

**`company_need_draft`** → stored in `company_need_drafts` → **does not trigger matching** → no shortlist created → no driver contacted

**`company_need`** → stored in `company_needs` → **triggers `runMatchingAgent()` automatically** → shortlist created → contact agent runs → drivers may be contacted

There is no automated path from `company_need_drafts` to `company_needs`. The conversion is a single explicit human action (cockpit button, API call with recruiter auth). No agent, cron job, or background task performs this conversion. If this boundary is ever blurred — by an agent writing directly to `company_needs`, or by a background job auto-promoting approved drafts — the result is a matching run against a need that may not be real, which can produce driver contacts for a company that has not confirmed the pilot.

---

### Column schema

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `target_id` | UUID | NOT NULL | — | FK → `company_research_targets(id)` ON DELETE CASCADE |
| `relationship_id` | UUID | YES | — | FK → `pilot_company_relationships(id)` |
| `source_call_notes` | TEXT | NOT NULL | — | raw operator notes this draft was derived from; immutable after draft creation |
| `draft_status` | TEXT | NOT NULL | `'draft_created'` | `IN ('draft_created', 'incomplete', 'ready_for_review', 'approved_for_matching', 'rejected')` |
| `license_required` | TEXT | YES | — | `IN ('C', 'CE', 'D', 'C+D', 'CE+D')` — `'none'` excluded, same as `company_needs` |
| `ykb_required` | BOOLEAN | YES | — | |
| `driver_card_required` | BOOLEAN | YES | — | |
| `domain_required` | TEXT | YES | — | 15-domain CHECK at app layer, same as `company_needs.domain_required` |
| `domain_preferred` | TEXT[] | NOT NULL | `'{}'` | app-layer validated, same as `company_needs.domain_preferred` |
| `location_region` | TEXT | YES | — | `IN ('stockholm', 'other_sweden', 'abroad')` — same enum as `company_needs` |
| `relocation_allowed` | BOOLEAN | YES | — | |
| `shift_type` | TEXT | YES | — | `IN ('day', 'night', 'weekend', 'flexible')` — same enum as `company_needs` |
| `urgency` | TEXT | YES | — | `IN ('standard', 'urgent', 'emergency')` — same enum as `company_needs` |
| `drivers_needed` | INTEGER | YES | — | `CHECK (drivers_needed > 0)` — how many drivers the company needs |
| `desired_start_date` | TIMESTAMPTZ | YES | — | |
| `constraints` | TEXT | YES | — | additional constraints from call notes (ADR, specific vehicle type, min years exp) |
| `missing_fields` | TEXT[] | NOT NULL | `'{}'` | list of field names that could not be extracted from notes |
| `match_readiness` | TEXT | YES | — | `IN ('ready', 'incomplete', 'not_yet')` |
| `validation_questions` | TEXT | YES | — | questions to ask the company to fill missing fields |
| `pool_size_warning` | TEXT | YES | — | populated by agent if current driver pool is too small for this need |
| `dpa_confirmed` | BOOLEAN | NOT NULL | `false` | operator confirms DPA is in place before approving conversion |
| `drafted_by` | TEXT | NOT NULL | — | `'agent:need_draft'` or recruiter ID |
| `reviewed_at` | TIMESTAMPTZ | YES | — | Gate 5: when operator opened draft for validation |
| `approved_at` | TIMESTAMPTZ | YES | — | Gate 5 cleared: draft validated |
| `approved_by` | TEXT | YES | — | recruiter identifier |
| `converted_at` | TIMESTAMPTZ | YES | — | Gate 6 cleared: draft converted to real need |
| `converted_by` | TEXT | YES | — | recruiter identifier |
| `converted_need_id` | UUID | YES | — | FK → `company_needs(id)` — set at Gate 6; NULL until conversion |
| `rejection_reason` | TEXT | YES | — | why draft was rejected |

### `draft_status` values

| Value | Meaning | Set by | Allowed transitions |
|-------|---------|--------|---------------------|
| `draft_created` | Agent E produced draft from call notes; awaiting operator review | Agent E | → `incomplete`, `ready_for_review`, `rejected` |
| `incomplete` | Required fields missing; cannot approve until filled | Agent E or human assessment | → `draft_created` (re-draft with more notes), `ready_for_review` (after human fills gaps) |
| `ready_for_review` | All required fields present; Gate 5 review pending | Human or agent assessment | → `approved_for_matching`, `rejected`, `incomplete` (if review finds gaps) |
| `approved_for_matching` | Gate 5 cleared; ready for Gate 6 conversion | Human (Gate 5) | → `rejected` (if company backs out after approval) |
| `rejected` | Draft discarded: call was exploratory, requirements out of scope, company backed out | Human | terminal |

### Required fields for `match_readiness = 'ready'`

A draft must have all of these non-null before `match_readiness` can be set to `'ready'`:
- `license_required`
- `domain_required`
- `location_region`
- `shift_type`
- `urgency`

These match the NOT NULL columns of `company_needs` that `runMatchingAgent` depends on. A draft missing any of these fields cannot produce a useful shortlist and must stay in `incomplete` status.

### Indexes

```sql
-- Cockpit: drafts awaiting Gate 5 (validation queue)
CREATE INDEX idx_cnd_pending_review
  ON company_need_drafts (created_at DESC)
  WHERE draft_status IN ('draft_created', 'incomplete', 'ready_for_review');

-- Approved drafts awaiting Gate 6 (conversion queue)
CREATE INDEX idx_cnd_approved
  ON company_need_drafts (approved_at DESC)
  WHERE draft_status = 'approved_for_matching';

-- Per-target lookup
CREATE INDEX idx_cnd_target_id
  ON company_need_drafts (target_id, created_at DESC);

-- Converted needs lookup (confirms which draft produced which need)
CREATE INDEX idx_cnd_converted_need
  ON company_need_drafts (converted_need_id)
  WHERE converted_need_id IS NOT NULL;
```

### What this table must NOT replace

`company_needs` — the production need table. Every column in `company_need_drafts` that mirrors `company_needs` (license, domain, region, shift, urgency) is an intentional copy, not a reference. The draft and the real need are separate records with separate lifecycles. The draft is mutable during validation; the need is immutable once created (matching has already run). The `converted_need_id` FK is the only link between them, and it is populated only at Gate 6.

---

## Table 5 — `b2b_agent_warnings`

**Purpose:** Structured warnings and reminders generated by B2B agents (primarily Agent F, the cockpit agent) and surfaced to the operator in the B2B cockpit tab. This is the B2B equivalent of the five warning types in `lib/warnings.ts`, but stored in a dedicated table rather than computed live on each cockpit load. Stored warnings can persist across sessions, be resolved explicitly, and be queried for trends.

### Column schema

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `warning_type` | TEXT | NOT NULL | — | `IN ('stale_research', 'missed_followup', 'incomplete_barrier_notes', 'high_opp_unactioned', 'pool_too_small_for_draft', 'no_contact_found', 'enterprise_misclassified', 'dpa_missing_before_share', 'draft_queue_overflow')` |
| `severity` | TEXT | NOT NULL | — | `IN ('error', 'warning', 'reminder')` |
| `target_id` | UUID | YES | — | FK → `company_research_targets(id)` ON DELETE CASCADE |
| `relationship_id` | UUID | YES | — | FK → `pilot_company_relationships(id)` ON DELETE SET NULL |
| `draft_id` | UUID | YES | — | FK → `company_need_drafts(id)` ON DELETE SET NULL |
| `outreach_id` | UUID | YES | — | FK → `company_outreach_actions(id)` ON DELETE SET NULL |
| `message` | TEXT | NOT NULL | — | human-readable warning description |
| `suggested_action` | TEXT | YES | — | what the operator should do to resolve this warning |
| `warning_status` | TEXT | NOT NULL | `'active'` | `IN ('active', 'resolved', 'snoozed', 'dismissed')` |
| `snoozed_until` | TIMESTAMPTZ | YES | — | if snoozed: re-surface after this timestamp |
| `resolved_at` | TIMESTAMPTZ | YES | — | when warning was resolved or dismissed |
| `resolved_by` | TEXT | YES | — | recruiter identifier |
| `resolution_note` | TEXT | YES | — | optional note on how the warning was resolved |
| `auto_resolved` | BOOLEAN | NOT NULL | `false` | true if agent detected the condition resolved itself without operator action |

### Warning types defined

| `warning_type` | Severity | Triggered when | Suggested action |
|----------------|---------|----------------|-----------------|
| `stale_research` | warning | `enriched` target not acted on in 14+ days | Review and approve or reject as target |
| `missed_followup` | warning | `next_action_date` passed with no status change | Complete follow-up action or update next_action_date |
| `incomplete_barrier_notes` | reminder | Approved target has empty `barrier_notes` | Complete barrier_notes before outreach |
| `high_opp_unactioned` | warning | `pilot_accessibility_score >= 70` target in `outreach_ready` for 7+ days | Send the approved outreach draft |
| `pool_too_small_for_draft` | error | Approved draft converted to need but `ingested_drivers` count < 3 for matching | Pause conversion; build driver pool first |
| `no_contact_found` | reminder | `enriched` target has no `contact_email` and no `linkedin_url` | Find contact before generating outreach draft |
| `enterprise_misclassified` | error | Target scored as `low` barrier but has >250 employees or procurement page found | Review segment classification and score |
| `dpa_missing_before_share` | error | Draft status is `approved_for_matching` but `dpa_confirmed = false` | Confirm DPA is in place before Gate 6 |
| `draft_queue_overflow` | warning | More than 10 drafts in `drafted` or `needs_edit` status simultaneously | Review and approve or reject pending drafts |

### `warning_status` values

| Value | Meaning | Allowed transitions |
|-------|---------|---------------------|
| `active` | Warning is current and visible in cockpit | → `snoozed`, `resolved`, `dismissed` |
| `snoozed` | Operator acknowledged and deferred; re-surfaces after `snoozed_until` | → `active` (on resume), `resolved` |
| `resolved` | Condition was fixed | terminal |
| `dismissed` | Operator decided this warning does not apply | terminal |

### Indexes

```sql
-- Cockpit: active warnings sorted by severity (errors first, then warnings, reminders last)
CREATE INDEX idx_baw_active_severity
  ON b2b_agent_warnings (severity, created_at DESC)
  WHERE warning_status = 'active';

-- Snoozed warnings that need to be re-surfaced
CREATE INDEX idx_baw_snoozed
  ON b2b_agent_warnings (snoozed_until ASC)
  WHERE warning_status = 'snoozed';

-- Per-target warning history
CREATE INDEX idx_baw_target_id
  ON b2b_agent_warnings (target_id, created_at DESC)
  WHERE target_id IS NOT NULL;
```

### What this table must NOT replace

`system_actions` — the driver-side audit log and pending-approval queue. Driver-side warnings (`no_match_activity`, `many_pending_actions`, `failed_actions`, etc.) are computed live in `lib/warnings.ts` from `system_actions`. B2B warnings come from a different source (company research state, outreach status, relationship stage) and have a different lifecycle (they persist, can be snoozed, and are linked to B2B entities). Mixing them into `system_actions` would require adding a new `target_type` value for every B2B entity type and would pollute the driver-side cockpit with B2B noise.

---

## 6. Relationship Diagram

```
company_research_targets (id)
  │
  ├──[1:1]── pilot_company_relationships (target_id → crt.id)
  │               │
  │               ├── first_contact_outreach_id → company_outreach_actions(id)
  │               │
  │               └── company_id → companies(id)  ← populated only at Gate 6
  │                       │
  │                       └── company_needs(company_id → companies.id)
  │                               │
  │                               └── shortlists → shortlist_entries → drivers
  │
  ├──[1:N]── company_outreach_actions (target_id → crt.id)
  │
  ├──[1:N]── company_need_drafts (target_id → crt.id)
  │               │
  │               ├── relationship_id → pilot_company_relationships(id)
  │               │
  │               └── converted_need_id → company_needs(id)  ← populated only at Gate 6
  │
  └──[1:N]── b2b_agent_warnings (target_id → crt.id)
                  │
                  ├── relationship_id → pilot_company_relationships(id)
                  ├── draft_id → company_need_drafts(id)
                  └── outreach_id → company_outreach_actions(id)


Existing schema (unchanged):

companies (id)
  └── company_needs (company_id → companies.id)
        └── shortlists (company_need_id → company_needs.id)
              └── shortlist_entries (shortlist_id → shortlists.id)
                    └── FK: driver_id → ingested_drivers(id)

drivers (id)
  └── ingested_drivers (id → drivers.id, shared PK, 1:1)

system_actions (no FK, target_id is a free UUID reference)
```

**Two entry points into the existing schema from the B2B model:**

1. `pilot_company_relationships.company_id` → `companies.id` — created at Gate 6
2. `company_need_drafts.converted_need_id` → `company_needs.id` — created at Gate 6

Both FKs are nullable until Gate 6. Before Gate 6, the B2B pipeline and the existing pipeline are completely isolated.

---

## 7. Status Machines

### Research status (`company_research_targets.research_status`)

```
not_started
    │
    ▼
researching ──────────────────────────────┐
    │                                     │
    ▼                         ← re-queue  │
enriched ─────► [Gate 1] ────► (approved as target)
    │                │
    │           rejected ──► terminal
    │
incomplete ──► researching (re-queued) OR rejected
    │
rejected ──► terminal
```

### Outreach draft status (`company_outreach_actions.draft_status`)

```
drafted ──► needs_edit ──► drafted (re-draft)
    │            │
    │            └──► approved ──► sent (terminal)
    │                     │
    │                     └──► rejected (terminal)
    │
    └──► approved ──► sent (terminal)
    │
    └──► rejected (terminal)
```

### Relationship status (`pilot_company_relationships.relationship_status`)

```
researched
    │
    ▼ (Gate 3 + human confirms outreach-ready)
outreach_ready
    │
    ▼ (human confirms send)
contacted
    │
    ├──► nurture_later ◄──────────────────────────────────┐
    │                                                      │
    ▼ (human enters reply)                                 │
replied                                                    │
    │                                                      │
    ├──► pilot_lost (terminal / or ──► nurture_later)      │
    │                                                      │
    ▼ (human books call)                                   │
call_booked                                                │
    │                                                      │
    ├──► pilot_lost                                        │
    │                                                      │
    ▼ (human enters call notes, Gate 4)                    │
needs_collected                                            │
    │                                                      │
    ├──► pilot_lost                                        │
    │                                                      │
    ▼ (human confirms agreement)                           │
pilot_agreed ────────────────────────────────────────────┘
    │
    └──► pilot_lost (if company backs out after agreement)

nurture_later ──► outreach_ready (re-activation, operator decision)
```

### Need draft status (`company_need_drafts.draft_status`)

```
draft_created
    │
    ├──► incomplete ──► draft_created (re-draft) OR ready_for_review (human fills gaps)
    │
    ├──► ready_for_review ──► [Gate 5: operator validates]
    │                               │
    │                         approved_for_matching ──► [Gate 6: operator converts]
    │                               │                         │
    │                               └──► rejected (terminal)  │
    │                                                         ▼
    │                                               company_need row created
    │                                               converted_need_id set
    │                                               (triggers runMatchingAgent)
    │
    └──► rejected (terminal)
```

### Warning status (`b2b_agent_warnings.warning_status`)

```
active ──► snoozed ──► active (after snoozed_until)
    │            │
    │            └──► resolved (terminal)
    │
    ├──► resolved (terminal)
    │
    └──► dismissed (terminal)
```

---

## 8. Index Strategy

All indexes below follow the same conventions as migrations 001–007: named with prefix `idx_` + abbreviated table name + query purpose, using partial indexes for status-filtered queries to minimise index size.

### `company_research_targets`

| Index | Columns | Partial condition | Purpose |
|-------|---------|------------------|---------|
| `idx_crt_status_score` | `(research_status, pilot_accessibility_score DESC)` | — | Cockpit B2B tab: score-ranked queue per status |
| `idx_crt_last_checked` | `(last_checked_date ASC)` | `research_status = 'enriched'` | Stale-research warning detection |
| `idx_crt_unscored` | `(created_at ASC)` | `research_status = 'enriched' AND pilot_accessibility_score IS NULL` | Agent B scoring queue |
| `idx_crt_region` | `(region, barrier_level)` | — | Regional clustering queries |

### `company_outreach_actions`

| Index | Columns | Partial condition | Purpose |
|-------|---------|------------------|---------|
| `idx_coa_pending` | `(created_at DESC)` | `draft_status IN ('drafted', 'needs_edit')` | Gate 3 approval queue |
| `idx_coa_target_id` | `(target_id, created_at DESC)` | — | Per-company draft history |
| `idx_coa_sent` | `(sent_at DESC)` | `draft_status = 'sent'` | Sent confirmation log |

### `pilot_company_relationships`

| Index | Columns | Partial condition | Purpose |
|-------|---------|------------------|---------|
| `idx_pcr_next_action` | `(next_action_date ASC)` | `relationship_status NOT IN ('pilot_agreed', 'pilot_lost') AND next_action_date IS NOT NULL` | Follow-up reminder queue |
| `idx_pcr_status` | `(relationship_status, last_interaction_date DESC)` | — | Pipeline stage counts + cockpit summary |
| `idx_pcr_target_id` | `(target_id)` UNIQUE | — | One-to-one join from research targets |
| `idx_pcr_converted` | `(company_id)` | `company_id IS NOT NULL` | Find relationships with real company rows |

### `company_need_drafts`

| Index | Columns | Partial condition | Purpose |
|-------|---------|------------------|---------|
| `idx_cnd_pending_review` | `(created_at DESC)` | `draft_status IN ('draft_created', 'incomplete', 'ready_for_review')` | Gate 5 validation queue |
| `idx_cnd_approved` | `(approved_at DESC)` | `draft_status = 'approved_for_matching'` | Gate 6 conversion queue |
| `idx_cnd_target_id` | `(target_id, created_at DESC)` | — | Per-company draft history |
| `idx_cnd_converted_need` | `(converted_need_id)` | `converted_need_id IS NOT NULL` | Lookup which draft produced which need |

### `b2b_agent_warnings`

| Index | Columns | Partial condition | Purpose |
|-------|---------|------------------|---------|
| `idx_baw_active_severity` | `(severity, created_at DESC)` | `warning_status = 'active'` | Cockpit: errors first, then warnings, then reminders |
| `idx_baw_snoozed` | `(snoozed_until ASC)` | `warning_status = 'snoozed'` | Re-surface snoozed warnings |
| `idx_baw_target_id` | `(target_id, created_at DESC)` | `target_id IS NOT NULL` | Per-company warning history |

---

## 9. Migration Plan Preview

Five migration files, one per table, applied in dependency order. Each file follows the existing pattern: `CREATE TABLE IF NOT EXISTS`, named CHECK constraints, partial indexes with `IF NOT EXISTS`, no destructive operations.

**Dependency order:**
1. `company_research_targets` — no FK dependencies on new tables
2. `company_outreach_actions` — depends on `company_research_targets`
3. `pilot_company_relationships` — depends on `company_research_targets` and `company_outreach_actions`
4. `company_need_drafts` — depends on `company_research_targets` and `pilot_company_relationships`; references `company_needs` (existing)
5. `b2b_agent_warnings` — depends on all four new tables above

| File | Creates | FK dependencies |
|------|---------|----------------|
| `migrations/008_create_company_research_targets.sql` | `company_research_targets` | None (standalone) |
| `migrations/009_create_company_outreach_actions.sql` | `company_outreach_actions` | → `company_research_targets` |
| `migrations/010_create_pilot_company_relationships.sql` | `pilot_company_relationships` | → `company_research_targets`, → `company_outreach_actions`, → `companies` (existing) |
| `migrations/011_create_company_need_drafts.sql` | `company_need_drafts` | → `company_research_targets`, → `pilot_company_relationships`, → `company_needs` (existing) |
| `migrations/012_create_b2b_agent_warnings.sql` | `b2b_agent_warnings` | → `company_research_targets`, → `pilot_company_relationships`, → `company_need_drafts`, → `company_outreach_actions` |

**Each migration must:**
- Use `CREATE TABLE IF NOT EXISTS` for idempotency
- Define all CHECK constraints inline with `CONSTRAINT constraint_name CHECK (...)`
- Create all indexes with `CREATE INDEX IF NOT EXISTS`
- Not modify any existing table from migrations 001–007
- Be applicable in any order relative to B2B agent implementation steps (the tables are inert until populated)

**What migrations must NOT do:**
- Alter `companies`, `company_needs`, `shortlists`, `shortlist_entries`, `drivers`, `ingested_drivers`, or `system_actions`
- Create any triggers that auto-promote `company_need_drafts` to `company_needs`
- Create any stored procedures that send outreach
- Set up any cron functions at the database level for B2B actions

---

## 10. Implementation Constraints

These constraints are non-negotiable. They derive from the core principle in `b2b-agent-architecture-v1.md` (Section 3) and must be respected at every layer: database, application code, and UI.

---

### No automatic outreach to company contacts

No DriverNord system — agent, cron, API route, or background process — may send an email, LinkedIn message, SMS, or any other message to a company contact without a human performing the send action from their own account.

**What this means in practice:**
- `company_outreach_actions` has no send trigger, no messaging provider call, and no webhook
- Approving a draft at Gate 3 does not send anything — it only changes `draft_status` from `approved` to `approved`; the human copies the draft and sends it manually
- There is no equivalent of `getMessagingProvider()` in the B2B pipeline
- `sent_at` and `sent_by` are set by the human confirming the send, not by any automated process

---

### No automatic `company_need` creation

No agent, background job, or API route may write to `company_needs` in response to any B2B pipeline event — including a Gate 5 approval, a `pilot_agreed` status change, or a `draft_status = 'approved_for_matching'` transition.

**What this means in practice:**
- `company_need_drafts.draft_status = 'approved_for_matching'` is a waiting state — it signals readiness but does not trigger anything
- The Gate 6 conversion requires an explicit human API call (recruiter-authenticated) to `POST /api/company-needs` — the same endpoint used today for all need creation
- The cockpit must present Gate 6 as a distinct, high-consequence action with a confirmation step
- No cron, trigger, or webhook should watch `company_need_drafts` and auto-convert approved drafts

---

### No driver PII shared without a DPA in place

Driver PII (name, phone number, email) from `ingested_drivers` must not be included in any shortlist presented to a company contact until a Data Processor Agreement (DPA) is signed between DriverNord and that company.

**What this means in practice:**
- `company_need_drafts.dpa_confirmed` must be `true` before the operator can clear Gate 6
- The cockpit must surface a `dpa_missing_before_share` error warning (`b2b_agent_warnings`) if Gate 6 is attempted with `dpa_confirmed = false`
- Initial shortlists shared with companies during early pilot conversations must contain only anonymized profiles (license class, YKB status, domain, availability, match score) — no names, no phone numbers
- Full PII transfer from `shortlist_entries.driver_snapshot` to a company requires DPA signed + `dpa_signed_date` populated in `pilot_company_relationships`

---

### No outreach automation for enterprise accounts

Companies with `barrier_level = 'enterprise_only'` or `segment = 'F'` must never enter the outreach queue at any stage of the B2B pipeline, regardless of their `pilot_accessibility_score`.

**What this means in practice:**
- Agent B must refuse to set `research_status = 'enriched'` and `barrier_level = 'enterprise_only'` together without surfacing an `enterprise_misclassified` warning if the score is above 45 (score/barrier mismatch)
- Gate 1 approval UI must block approval for `segment = 'F'` targets and display a hard error
- `pilot_company_relationships` must not be created for `segment = 'F'` targets — these are research benchmarks only
- The `enterprise_misclassified` warning type in `b2b_agent_warnings` fires when a target's stated barrier level contradicts other observable signals (employee count, procurement page, size estimate)

---

### All external actions require human approval

Every action that has consequences outside the DriverNord system — contacting a company, sharing driver data, creating a company need, suggesting driver contact — requires an explicit human decision at a named gate.

The seven gates defined in `b2b-agent-architecture-v1.md` Section 6 are the only authorized paths past these boundaries. No agent, background process, or API call may bypass a gate by operating on intermediate tables without passing through the corresponding approval action.

**Gate-to-table mapping summary:**

| Gate | Table written | Written by | Condition |
|------|--------------|-----------|-----------|
| Gate 1 | `company_research_targets` (`approved_as_target_at`) | Human | Explicit approval action in cockpit |
| Gate 2 | `company_research_targets` (`pilot_accessibility_score`, `barrier_level`) | Human override or agent confirmation | Score reviewed and accepted |
| Gate 3 | `company_outreach_actions` (`approved_at`, `draft_status = 'approved'`) | Human | Draft reviewed and approved |
| Gate 4 | `pilot_company_relationships` (`relationship_status`) | Human | Outcome of real-world interaction entered |
| Gate 5 | `company_need_drafts` (`approved_at`, `draft_status = 'approved_for_matching'`) | Human | Draft validated against call notes |
| Gate 6 | `company_needs` + `companies` (new rows); `company_need_drafts` (`converted_need_id`) | Human | Explicit conversion action, recruiter-auth required |
| Gate 7 | `system_actions` (`contact_suggested` → `contact_confirmed`) | Human | Existing cockpit approval (driver-side, unchanged) |

---

## Next Recommended Step

**Write the five migration files.**

All design decisions in this document are stable enough to implement. The migration files (008–012) are the next concrete output:

1. Read this document alongside `docs/current/database-schema.md`
2. Write each migration as idempotent SQL following the style of `migrations/001`–`007`
3. Do not apply the migrations until Step 4 of the implementation order (migrating CSV data into `company_research_targets`) is ready to execute
4. After migrations are written, verify each column name and type against the corresponding store file that will be written to implement Agent A, B, C, D, E, and F

The migration files are pure SQL with no application logic — they can be written, reviewed, and committed before any TypeScript implementation begins.
