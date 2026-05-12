-- 010_create_pilot_company_relationships.sql
--
-- Creates the pilot_company_relationships table — the B2B sales pipeline
-- state machine. One row per research target. Tracks progression from first
-- outreach through pilot agreement or disqualification.
--
-- Source of truth:
--   docs/business/b2b-data-model-v1.md §Table 3
--   docs/business/b2b-agent-architecture-v1.md §Agent D
--
-- Key invariant: company_id is NULL until Gate 6 is cleared. Gate 6 is an
-- explicit human action that creates a companies row and a company_needs row
-- and triggers runMatchingAgent(). Until Gate 6, the research target must
-- never appear in the companies table, because companies rows can be joined
-- to company_needs and fed into the matching engine.
--
-- Agent D may read this table and surface reminders (via b2b_agent_warnings),
-- but it may not advance relationship_status without a human action. Silence
-- after a sent email does not change status from 'contacted' to anything.
--
-- This migration does not alter any existing table.

CREATE TABLE IF NOT EXISTS pilot_company_relationships (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ── Relation to research target (1:1) ───────────────────────────────
  -- One active relationship record per research target. Enforced by UNIQUE.
  target_id  UUID NOT NULL UNIQUE REFERENCES company_research_targets (id) ON DELETE CASCADE,

  -- ── Pipeline status ──────────────────────────────────────────────────
  -- Transitions require human confirmation. Agents may not advance status
  -- unilaterally. See b2b-data-model-v1.md §7 for the full state machine.
  relationship_status  TEXT NOT NULL DEFAULT 'researched'
    CHECK (relationship_status IN (
      'researched',       -- in research queue; not yet outreach-ready
      'outreach_ready',   -- score + draft approved; ready for human to send
      'contacted',        -- human confirmed first outreach was sent
      'replied',          -- company responded (any content)
      'call_booked',      -- meeting or call scheduled
      'needs_collected',  -- call happened; requirements captured as notes (Gate 4)
      'pilot_agreed',     -- company confirmed pilot participation
      'pilot_lost',       -- company declined or became unsuitable
      'nurture_later'     -- no current urgency; revisit in 60–90 days
    )),

  -- ── Contact timeline ─────────────────────────────────────────────────
  first_contact_date       TIMESTAMPTZ,  -- set when operator confirms first outreach sent
  last_interaction_date    TIMESTAMPTZ,  -- bumped on every human-confirmed touchpoint

  -- FK to the outreach draft that was used for first contact (optional audit link).
  first_contact_outreach_id  UUID REFERENCES company_outreach_actions (id) ON DELETE SET NULL,

  -- ── Next action ──────────────────────────────────────────────────────
  next_action       TEXT,         -- specific next step instruction
  next_action_date  TIMESTAMPTZ,  -- when the next action should happen; drives reminder warnings

  -- ── Interaction notes ────────────────────────────────────────────────
  -- Operator-entered; append-only by convention (application layer responsibility).
  call_notes     TEXT,   -- notes from calls and meetings
  reply_summary  TEXT,   -- summary of company's reply content
  reply_sentiment  TEXT CHECK (reply_sentiment IN (
    'positive',
    'neutral',
    'negative',
    'no_reply'
  )),

  -- Common objections raised by the company during conversation.
  -- e.g. '{staffing_confusion, existing_agency, no_budget}'
  -- Values are free-text tags; element values validated at application layer.
  objections_raised  TEXT[] NOT NULL DEFAULT '{}',

  -- ── Pilot outcome ────────────────────────────────────────────────────
  pilot_agreed_date  TIMESTAMPTZ,  -- when pilot agreement was confirmed
  pilot_scope_notes  TEXT,         -- what was agreed: one need, one shortlist, reference in exchange
  pilot_lost_reason  TEXT,         -- why the company declined or became unsuitable

  -- When nurture_later: the date to re-activate and move to outreach_ready.
  nurture_resume_date  TIMESTAMPTZ,

  -- ── GDPR / DPA tracking ──────────────────────────────────────────────
  -- A Data Processor Agreement is required before any driver PII (name, phone)
  -- is shared with a company. dpa_confirmed is also checked in company_need_drafts
  -- before Gate 6 conversion is allowed.
  dpa_status  TEXT CHECK (dpa_status IN (
    'not_raised',  -- GDPR/DPA not yet discussed
    'requested',   -- DriverNord has requested the company sign a DPA
    'signed',      -- DPA is in place; PII sharing is permitted
    'declined'     -- company declined to sign
  )),
  dpa_signed_date  TIMESTAMPTZ,

  -- ── Gate 6: promotion to real client ─────────────────────────────────
  -- Populated only when a human clears Gate 6: creates a companies row,
  -- creates a company_needs row (which triggers runMatchingAgent), and
  -- sets this FK to link the relationship to the new companies record.
  -- NULL for the entire research and outreach lifecycle.
  company_id    UUID REFERENCES companies (id) ON DELETE SET NULL,
  converted_at  TIMESTAMPTZ,  -- when Gate 6 was cleared
  converted_by  TEXT          -- recruiter identifier
);

-- ── Indexes ──────────────────────────────────────────────────────────────

-- Follow-up reminder queue: relationships with overdue next_action_date.
-- Agent F reads this to generate missed_followup warnings.
CREATE INDEX IF NOT EXISTS idx_pcr_next_action
  ON pilot_company_relationships (next_action_date ASC)
  WHERE relationship_status NOT IN ('pilot_agreed', 'pilot_lost')
    AND next_action_date IS NOT NULL;

-- Pipeline stage counts for cockpit summary view.
CREATE INDEX IF NOT EXISTS idx_pcr_status
  ON pilot_company_relationships (relationship_status, last_interaction_date DESC);

-- One-to-one lookup from research target — enforced by UNIQUE above,
-- but a named index makes the JOIN plan explicit.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pcr_target_id
  ON pilot_company_relationships (target_id);

-- Find relationships that have been promoted to real clients (Gate 6 cleared).
CREATE INDEX IF NOT EXISTS idx_pcr_converted
  ON pilot_company_relationships (company_id)
  WHERE company_id IS NOT NULL;
