-- 011_create_company_need_drafts.sql
--
-- Creates the company_need_drafts table — the firewall between a sales
-- conversation and a real, matching-triggering company_need.
--
-- Source of truth:
--   docs/business/b2b-data-model-v1.md §Table 4
--   docs/business/b2b-agent-architecture-v1.md §Agent E
--
-- ═══════════════════════════════════════════════════════════════════════
-- CRITICAL DISTINCTION — READ BEFORE MODIFYING THIS TABLE
--
--   company_need_draft  →  stored here  →  does NOT trigger matching
--   company_need        →  company_needs →  triggers runMatchingAgent() AUTOMATICALLY
--
-- There is NO automated path from this table to company_needs. Conversion
-- is a single explicit human action (Gate 6): a recruiter-authenticated API
-- call that creates the companies row, creates the company_needs row, and
-- then sets converted_need_id on this draft record.
--
-- No agent, cron job, background process, or database trigger may perform
-- this conversion. If this boundary is ever broken — by an agent writing
-- to company_needs directly, or by a background job watching draft_status
-- and auto-promoting approved drafts — the result is a matching run against
-- a need that may not be real, which can produce driver contacts for a
-- company that has not confirmed the pilot.
-- ═══════════════════════════════════════════════════════════════════════
--
-- This migration does not alter any existing table.
-- This migration does not create any trigger.

CREATE TABLE IF NOT EXISTS company_need_drafts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ── Relations ────────────────────────────────────────────────────────
  target_id        UUID NOT NULL REFERENCES company_research_targets (id) ON DELETE CASCADE,
  -- Nullable: linked to a relationship record when available, but a draft
  -- may be created before a pilot_company_relationships row exists.
  relationship_id  UUID REFERENCES pilot_company_relationships (id) ON DELETE SET NULL,

  -- ── Source ───────────────────────────────────────────────────────────
  -- The raw operator notes this draft was derived from. Immutable after draft
  -- creation — preserved for audit trail regardless of subsequent edits.
  source_call_notes  TEXT NOT NULL,

  -- ── Draft lifecycle ──────────────────────────────────────────────────
  -- Gate 5: operator validates the draft.
  -- Gate 6: operator converts the approved draft to a real company_need.
  draft_status  TEXT NOT NULL DEFAULT 'draft_created'
    CHECK (draft_status IN (
      'draft_created',        -- Agent E produced draft from call notes; awaiting review
      'incomplete',           -- required fields missing; cannot approve until filled
      'ready_for_review',     -- all required fields present; Gate 5 pending
      'approved_for_matching',-- Gate 5 cleared; waiting for Gate 6 conversion
      'rejected'              -- draft discarded: exploratory call, out of scope, company backed out
    )),

  -- ── Requirement fields ───────────────────────────────────────────────
  -- These mirror the NOT NULL requirement fields of company_needs exactly.
  -- A draft may leave these NULL while incomplete; conversion to company_needs
  -- requires all of them to be non-null (enforced at application layer).
  --
  -- 'none' is excluded from license_required — same constraint as company_needs.
  license_required  TEXT CHECK (license_required IN ('C', 'CE', 'D', 'C+D', 'CE+D')),

  ykb_required          BOOLEAN,
  driver_card_required  BOOLEAN,

  domain_required  TEXT CHECK (domain_required IN (
    'tipp', 'kran', 'kylfrys', 'silo', 'flatbed', 'tanker',
    'ekipage', 'schakt_bygg', 'distribution', 'livsmedelskyla',
    'avfall', 'skogstransport', 'adr', 'fjarrtransport', 'budtransport'
  )),

  -- Array of secondary domains; element values validated at application layer.
  domain_preferred  TEXT[] NOT NULL DEFAULT '{}',

  location_region  TEXT CHECK (location_region IN ('stockholm', 'other_sweden', 'abroad')),

  relocation_allowed  BOOLEAN,

  shift_type  TEXT CHECK (shift_type IN ('day', 'night', 'weekend', 'flexible')),

  urgency  TEXT CHECK (urgency IN ('standard', 'urgent', 'emergency')),

  -- ── Volume and timing ────────────────────────────────────────────────
  drivers_needed      INTEGER CHECK (drivers_needed > 0),
  desired_start_date  TIMESTAMPTZ,

  -- ── Validation support ───────────────────────────────────────────────
  -- Free-text constraints from call notes (e.g. 'ADR required', 'min 3 years exp').
  constraints  TEXT,

  -- Field names that could not be extracted from source_call_notes.
  -- e.g. '{shift_type, drivers_needed}'
  missing_fields  TEXT[] NOT NULL DEFAULT '{}',

  -- 'ready'      = all required fields present, draft can be approved
  -- 'incomplete' = missing required fields
  -- 'not_yet'    = call was exploratory; company has not confirmed requirements
  match_readiness  TEXT CHECK (match_readiness IN ('ready', 'incomplete', 'not_yet')),

  -- Questions to ask the company to fill missing fields.
  validation_questions  TEXT,

  -- Warning text if current ingested_drivers pool is too small to produce
  -- a useful shortlist for this need. Populated by Agent E at draft time.
  pool_size_warning  TEXT,

  -- ── DPA gate ─────────────────────────────────────────────────────────
  -- Operator must confirm a Data Processor Agreement is in place before
  -- Gate 6 is permitted. Sharing driver PII (name, phone) requires a DPA.
  -- The cockpit blocks Gate 6 and surfaces a dpa_missing_before_share
  -- warning in b2b_agent_warnings when this is false at approval time.
  dpa_confirmed  BOOLEAN NOT NULL DEFAULT false,

  -- ── Draft authorship ─────────────────────────────────────────────────
  drafted_by  TEXT NOT NULL,  -- 'agent:need_draft' or recruiter ID

  -- ── Gate 5: validation ───────────────────────────────────────────────
  reviewed_at  TIMESTAMPTZ,  -- when operator opened draft for validation
  approved_at  TIMESTAMPTZ,  -- when Gate 5 was cleared
  approved_by  TEXT,         -- recruiter identifier

  rejection_reason  TEXT,    -- why draft was rejected

  -- ── Gate 6: conversion ───────────────────────────────────────────────
  -- Set by the explicit human conversion action only. Never set automatically.
  converted_at  TIMESTAMPTZ,  -- when Gate 6 was cleared
  converted_by  TEXT,         -- recruiter identifier

  -- FK to the company_needs row that this draft became after Gate 6.
  -- NULL until Gate 6. Existence of this FK confirms the draft produced a
  -- real need. Do not use its presence to infer any agent action — it is
  -- set by the human conversion action, not by any automated process.
  converted_need_id  UUID REFERENCES company_needs (id) ON DELETE SET NULL
);

-- ── Indexes ──────────────────────────────────────────────────────────────

-- Gate 5 validation queue: drafts awaiting operator review.
CREATE INDEX IF NOT EXISTS idx_cnd_pending_review
  ON company_need_drafts (created_at DESC)
  WHERE draft_status IN ('draft_created', 'incomplete', 'ready_for_review');

-- Gate 6 conversion queue: approved drafts waiting for human to convert.
CREATE INDEX IF NOT EXISTS idx_cnd_approved
  ON company_need_drafts (approved_at DESC)
  WHERE draft_status = 'approved_for_matching';

-- Per-company draft history (multiple drafts possible per target).
CREATE INDEX IF NOT EXISTS idx_cnd_target_id
  ON company_need_drafts (target_id, created_at DESC);

-- Lookup: which draft produced which company_need (post Gate 6 audit).
CREATE INDEX IF NOT EXISTS idx_cnd_converted_need
  ON company_need_drafts (converted_need_id)
  WHERE converted_need_id IS NOT NULL;
