-- ============================================================
-- DRIVERNORD PRODUCTION MIGRATION RECOVERY
-- Apply migrations 008–015 in exact order
--
-- HOW TO APPLY:
--   1. Open: https://supabase.com/dashboard/project/iwawdnfrbwhfrfibeqlp/sql/new
--   2. Paste this entire file into the SQL editor
--   3. Click Run (or Ctrl+Enter)
--   4. Expected: no errors, 7 tables/columns created
--
-- SAFE: All operations use IF NOT EXISTS — re-running is harmless.
-- ORDER: Dependencies enforced by script order. Do not rearrange.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- MIGRATION 008: company_research_targets
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_research_targets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_name  TEXT NOT NULL,
  website       TEXT,
  region  TEXT CHECK (region IN (
    'stockholm', 'stockholm_region', 'malardalen', 'other_sweden'
  )),
  city    TEXT,
  company_size  TEXT CHECK (company_size IN ('micro', 'small', 'medium', 'large')),
  segment  TEXT CHECK (segment IN (
    'A', 'B', 'C', 'D', 'E', 'F', 'agency', 'A/E', 'B/E', 'A/D', 'B/D'
  )),
  transport_domain  TEXT[] NOT NULL DEFAULT '{}',
  visible_driver_need    BOOLEAN,
  job_ads_url            TEXT,
  license_mentions       TEXT[] NOT NULL DEFAULT '{}',
  ykb_mentioned          BOOLEAN,
  driver_card_mentioned  BOOLEAN,
  urgency_signal         TEXT CHECK (urgency_signal IN (
    'none', 'single_ad', 'repeated_ads', 'stated_urgency'
  )),
  contact_email   TEXT,
  phone           TEXT,
  linkedin_url    TEXT,
  decision_maker_name  TEXT,
  decision_maker_role  TEXT CHECK (decision_maker_role IN (
    'owner', 'VD', 'transport_manager', 'driftchef',
    'operations_director', 'HR_manager', 'unknown'
  )),
  procurement_page          TEXT,
  supplier_requirements_url TEXT,
  barrier_level  TEXT CHECK (barrier_level IN (
    'low', 'medium', 'high', 'enterprise_only'
  )),
  barrier_notes  TEXT,
  pilot_accessibility_score  INTEGER
    CHECK (pilot_accessibility_score >= 0 AND pilot_accessibility_score <= 100),
  opportunity_score          INTEGER
    CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
  recommended_entry_point  TEXT,
  next_action              TEXT,
  research_status  TEXT NOT NULL DEFAULT 'not_started'
    CHECK (research_status IN (
      'not_started', 'researching', 'enriched', 'incomplete', 'rejected'
    )),
  source_notes      TEXT,
  last_checked_date TIMESTAMPTZ,
  scored_at  TIMESTAMPTZ,
  scored_by  TEXT,
  approved_as_target_at  TIMESTAMPTZ,
  approved_as_target_by  TEXT
);

CREATE INDEX IF NOT EXISTS idx_crt_status_score
  ON company_research_targets (research_status, pilot_accessibility_score DESC);

CREATE INDEX IF NOT EXISTS idx_crt_last_checked
  ON company_research_targets (last_checked_date ASC)
  WHERE research_status = 'enriched';

CREATE INDEX IF NOT EXISTS idx_crt_unscored
  ON company_research_targets (created_at ASC)
  WHERE research_status = 'enriched' AND pilot_accessibility_score IS NULL;

CREATE INDEX IF NOT EXISTS idx_crt_region
  ON company_research_targets (region, barrier_level);

-- ────────────────────────────────────────────────────────────
-- MIGRATION 009: company_outreach_actions
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_outreach_actions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_id  UUID NOT NULL REFERENCES company_research_targets (id) ON DELETE CASCADE,
  outreach_type  TEXT NOT NULL CHECK (outreach_type IN (
    'email_first', 'email_followup', 'linkedin_message',
    'phone_opener', 'objection_response'
  )),
  draft_content  TEXT NOT NULL,
  subject_line   TEXT,
  sequence_position  INTEGER,
  draft_status  TEXT NOT NULL DEFAULT 'drafted'
    CHECK (draft_status IN (
      'drafted', 'needs_edit', 'approved', 'rejected', 'sent'
    )),
  drafted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  drafted_by   TEXT        NOT NULL,
  reviewed_at  TIMESTAMPTZ,
  approved_at  TIMESTAMPTZ,
  approved_by  TEXT,
  rejection_reason  TEXT,
  edit_notes        TEXT,
  sent_at       TIMESTAMPTZ,
  sent_by       TEXT,
  send_channel  TEXT CHECK (send_channel IN ('email', 'linkedin', 'phone', 'other')),
  send_context  TEXT
);

CREATE INDEX IF NOT EXISTS idx_coa_pending
  ON company_outreach_actions (created_at DESC)
  WHERE draft_status IN ('drafted', 'needs_edit');

CREATE INDEX IF NOT EXISTS idx_coa_target_id
  ON company_outreach_actions (target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coa_sent
  ON company_outreach_actions (sent_at DESC)
  WHERE draft_status = 'sent';

-- ────────────────────────────────────────────────────────────
-- MIGRATION 010: pilot_company_relationships
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pilot_company_relationships (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_id  UUID NOT NULL UNIQUE REFERENCES company_research_targets (id) ON DELETE CASCADE,
  relationship_status  TEXT NOT NULL DEFAULT 'researched'
    CHECK (relationship_status IN (
      'researched', 'outreach_ready', 'contacted', 'replied',
      'call_booked', 'needs_collected', 'pilot_agreed', 'pilot_lost', 'nurture_later'
    )),
  first_contact_date       TIMESTAMPTZ,
  last_interaction_date    TIMESTAMPTZ,
  first_contact_outreach_id  UUID REFERENCES company_outreach_actions (id) ON DELETE SET NULL,
  next_action       TEXT,
  next_action_date  TIMESTAMPTZ,
  call_notes     TEXT,
  reply_summary  TEXT,
  reply_sentiment  TEXT CHECK (reply_sentiment IN (
    'positive', 'neutral', 'negative', 'no_reply'
  )),
  objections_raised  TEXT[] NOT NULL DEFAULT '{}',
  pilot_agreed_date  TIMESTAMPTZ,
  pilot_scope_notes  TEXT,
  pilot_lost_reason  TEXT,
  nurture_resume_date  TIMESTAMPTZ,
  dpa_status  TEXT CHECK (dpa_status IN (
    'not_raised', 'requested', 'signed', 'declined'
  )),
  dpa_signed_date  TIMESTAMPTZ,
  company_id    UUID REFERENCES companies (id) ON DELETE SET NULL,
  converted_at  TIMESTAMPTZ,
  converted_by  TEXT
);

CREATE INDEX IF NOT EXISTS idx_pcr_next_action
  ON pilot_company_relationships (next_action_date ASC)
  WHERE relationship_status NOT IN ('pilot_agreed', 'pilot_lost')
    AND next_action_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pcr_status
  ON pilot_company_relationships (relationship_status, last_interaction_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pcr_target_id
  ON pilot_company_relationships (target_id);

CREATE INDEX IF NOT EXISTS idx_pcr_converted
  ON pilot_company_relationships (company_id)
  WHERE company_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- MIGRATION 011: company_need_drafts
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_need_drafts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_id        UUID NOT NULL REFERENCES company_research_targets (id) ON DELETE CASCADE,
  relationship_id  UUID REFERENCES pilot_company_relationships (id) ON DELETE SET NULL,
  source_call_notes  TEXT NOT NULL,
  draft_status  TEXT NOT NULL DEFAULT 'draft_created'
    CHECK (draft_status IN (
      'draft_created', 'incomplete', 'ready_for_review',
      'approved_for_matching', 'rejected'
    )),
  license_required  TEXT CHECK (license_required IN ('C', 'CE', 'D', 'C+D', 'CE+D')),
  ykb_required          BOOLEAN,
  driver_card_required  BOOLEAN,
  domain_required  TEXT CHECK (domain_required IN (
    'tipp', 'kran', 'kylfrys', 'silo', 'flatbed', 'tanker',
    'ekipage', 'schakt_bygg', 'distribution', 'livsmedelskyla',
    'avfall', 'skogstransport', 'adr', 'fjarrtransport', 'budtransport'
  )),
  domain_preferred  TEXT[] NOT NULL DEFAULT '{}',
  location_region  TEXT CHECK (location_region IN ('stockholm', 'other_sweden', 'abroad')),
  relocation_allowed  BOOLEAN,
  shift_type  TEXT CHECK (shift_type IN ('day', 'night', 'weekend', 'flexible')),
  urgency  TEXT CHECK (urgency IN ('standard', 'urgent', 'emergency')),
  drivers_needed      INTEGER CHECK (drivers_needed > 0),
  desired_start_date  TIMESTAMPTZ,
  constraints  TEXT,
  missing_fields  TEXT[] NOT NULL DEFAULT '{}',
  match_readiness  TEXT CHECK (match_readiness IN ('ready', 'incomplete', 'not_yet')),
  validation_questions  TEXT,
  pool_size_warning  TEXT,
  dpa_confirmed  BOOLEAN NOT NULL DEFAULT false,
  drafted_by  TEXT NOT NULL,
  reviewed_at  TIMESTAMPTZ,
  approved_at  TIMESTAMPTZ,
  approved_by  TEXT,
  rejection_reason  TEXT,
  converted_at  TIMESTAMPTZ,
  converted_by  TEXT,
  converted_need_id  UUID REFERENCES company_needs (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cnd_pending_review
  ON company_need_drafts (created_at DESC)
  WHERE draft_status IN ('draft_created', 'incomplete', 'ready_for_review');

CREATE INDEX IF NOT EXISTS idx_cnd_approved
  ON company_need_drafts (approved_at DESC)
  WHERE draft_status = 'approved_for_matching';

CREATE INDEX IF NOT EXISTS idx_cnd_target_id
  ON company_need_drafts (target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cnd_converted_need
  ON company_need_drafts (converted_need_id)
  WHERE converted_need_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- MIGRATION 012: b2b_agent_warnings
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS b2b_agent_warnings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  warning_type  TEXT NOT NULL CHECK (warning_type IN (
    'stale_research', 'missed_followup', 'incomplete_barrier_notes',
    'high_opp_unactioned', 'pool_too_small_for_draft', 'no_contact_found',
    'enterprise_misclassified', 'dpa_missing_before_share', 'draft_queue_overflow'
  )),
  severity  TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'reminder')),
  target_id        UUID REFERENCES company_research_targets (id) ON DELETE SET NULL,
  relationship_id  UUID REFERENCES pilot_company_relationships (id) ON DELETE SET NULL,
  draft_id         UUID REFERENCES company_need_drafts (id) ON DELETE SET NULL,
  outreach_id      UUID REFERENCES company_outreach_actions (id) ON DELETE SET NULL,
  message          TEXT NOT NULL,
  suggested_action TEXT,
  warning_status  TEXT NOT NULL DEFAULT 'active'
    CHECK (warning_status IN ('active', 'snoozed', 'resolved', 'dismissed')),
  snoozed_until  TIMESTAMPTZ,
  resolved_at    TIMESTAMPTZ,
  resolved_by    TEXT,
  resolution_note  TEXT,
  auto_resolved  BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_baw_active_severity
  ON b2b_agent_warnings (severity, created_at DESC)
  WHERE warning_status = 'active';

CREATE INDEX IF NOT EXISTS idx_baw_snoozed
  ON b2b_agent_warnings (snoozed_until ASC)
  WHERE warning_status = 'snoozed';

CREATE INDEX IF NOT EXISTS idx_baw_target_id
  ON b2b_agent_warnings (target_id, created_at DESC)
  WHERE target_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- MIGRATION 014: extend company_need_drafts (scan-import columns)
-- NOTE: 013 already applied. Skip to 014.
-- ────────────────────────────────────────────────────────────

ALTER TABLE company_need_drafts
  DROP CONSTRAINT IF EXISTS company_need_drafts_draft_status_check;

ALTER TABLE company_need_drafts
  ADD CONSTRAINT company_need_drafts_draft_status_check
    CHECK (draft_status IN (
      'draft_created', 'incomplete', 'ready_for_review',
      'approved_for_matching', 'rejected', 'promoted'
    ));

ALTER TABLE company_need_drafts
  ADD COLUMN IF NOT EXISTS need_source    TEXT,
  ADD COLUMN IF NOT EXISTS scan_record_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata       JSONB;

CREATE INDEX IF NOT EXISTS idx_cnd_scan_record_id
  ON company_need_drafts (scan_record_id)
  WHERE scan_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cnd_promoted
  ON company_need_drafts (converted_at DESC)
  WHERE draft_status = 'promoted';

-- ────────────────────────────────────────────────────────────
-- MIGRATION 015: add need_type to company_needs + simulation cleanup
-- ────────────────────────────────────────────────────────────

ALTER TABLE company_needs
  ADD COLUMN IF NOT EXISTS need_type TEXT NOT NULL DEFAULT 'matching_eligible'
    CHECK (need_type IN (
      'active_public_need', 'matching_eligible', 'contact_ready_candidate',
      'outreach_pending_approval', 'outreach_approved', 'contacted',
      'expired', 'simulation_only', 'archived_test'
    ));

ALTER TABLE company_needs
  ADD COLUMN IF NOT EXISTS source_draft_id UUID REFERENCES company_need_drafts (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata       JSONB;

-- Simulation cleanup — mark and close simulation company_needs
UPDATE company_needs
SET
  need_type = 'simulation_only',
  status    = 'closed'
WHERE company_id IN (
  SELECT id FROM companies
  WHERE name ILIKE '%SIMULATION%'
     OR name ILIKE 'SIM-%'
);

-- Test/probe cleanup
UPDATE company_needs
SET
  need_type = 'archived_test',
  status    = 'closed'
WHERE company_id IN (
  SELECT id FROM companies
  WHERE name ILIKE '%Test%'
     OR name ILIKE '%Probe%'
     OR name ILIKE '%Auth Test%'
);

CREATE INDEX IF NOT EXISTS idx_company_needs_need_type
  ON company_needs (need_type, created_at DESC)
  WHERE status = 'open';

-- ────────────────────────────────────────────────────────────
-- POST-MIGRATION: JPC reconciliation
-- Set JPC need_type to active_public_need
-- ────────────────────────────────────────────────────────────

UPDATE company_needs
SET need_type = 'active_public_need'
WHERE id = '33bc791f-baf6-4d72-851a-beab50b62337';

-- ────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (run separately to confirm success)
-- ────────────────────────────────────────────────────────────
/*
-- 1. All new tables exist:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'company_research_targets', 'company_outreach_actions',
    'pilot_company_relationships', 'company_need_drafts', 'b2b_agent_warnings'
  )
ORDER BY table_name;
-- Expect: 5 rows

-- 2. company_needs has new columns:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'company_needs'
  AND column_name IN ('need_type', 'source_draft_id', 'metadata');
-- Expect: 3 rows

-- 3. company_need_drafts has scan columns:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'company_need_drafts'
  AND column_name IN ('need_source', 'scan_record_id', 'metadata');
-- Expect: 3 rows

-- 4. JPC is correctly reconciled:
SELECT cn.id, cn.need_type, cn.status, c.name
FROM company_needs cn JOIN companies c ON c.id = cn.company_id
WHERE cn.id = '33bc791f-baf6-4d72-851a-beab50b62337';
-- Expect: need_type = active_public_need, status = open

-- 5. Simulation needs are closed:
SELECT need_type, status, COUNT(*) FROM company_needs
GROUP BY need_type, status ORDER BY need_type;
-- Expect: simulation_only/closed and archived_test/closed rows visible
-- JPC row: active_public_need/open
*/
