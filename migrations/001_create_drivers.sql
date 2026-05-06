-- 001_create_drivers.sql
--
-- Creates the `drivers` table, which stores every conversation session
-- from /chat. Each row is one anonymous lead that may progress into a
-- fully-classified driver profile.
--
-- Source of truth: lib/supabaseStore.ts, types/lead.ts

CREATE TABLE IF NOT EXISTS drivers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  last_step_reached INTEGER     NOT NULL DEFAULT 0,

  -- ── Conversation answers ────────────────────────────────────────────
  lang              TEXT        CHECK (lang IN ('sv', 'en')),
  region            TEXT        CHECK (region IN ('stockholm', 'other_sweden', 'abroad')),
  relocate          TEXT        CHECK (relocate IN ('yes', 'no')),
  license           TEXT        CHECK (license IN ('C', 'CE', 'D', 'C+D', 'CE+D', 'none')),
  ykb               TEXT        CHECK (ykb IN ('valid', 'expired', 'in_progress', 'none', 'unknown')),
  driver_card       TEXT        CHECK (driver_card IN ('valid', 'expired', 'no', 'unknown')),
  availability      TEXT        CHECK (availability IN ('now', '2_weeks', '1_month', 'not_yet')),

  -- ── Contact ────────────────────────────────────────────────────────
  first_name        TEXT,
  phone             TEXT,
  email             TEXT,

  -- ── Classification ────────────────────────────────────────────────
  lead_status       TEXT        NOT NULL DEFAULT 'anonymous_dropoff'
                                CHECK (lead_status IN (
                                  'ready_for_ingestion',
                                  'incomplete_lead',
                                  'disqualified',
                                  'anonymous_dropoff'
                                )),
  lead_priority     TEXT        CHECK (lead_priority IN ('HIGH', 'MEDIUM', 'LOW')),

  -- ── Follow-up scheduling ──────────────────────────────────────────
  follow_up_sent    BOOLEAN     NOT NULL DEFAULT false,
  follow_up_at      TIMESTAMPTZ,
  follow_up_reason  TEXT        CHECK (follow_up_reason IN (
                                  'incomplete_lead',
                                  'not_yet_available',
                                  'ykb_in_progress'
                                ))

  -- NOTE: domain and shift_preference are added in migration 002.
);

-- Used by followUpAgent: fetch pending follow-ups efficiently.
CREATE INDEX IF NOT EXISTS idx_drivers_follow_up
  ON drivers (follow_up_at)
  WHERE follow_up_sent = false AND follow_up_at IS NOT NULL;

-- Used for lead status filtering in ingestion checks.
CREATE INDEX IF NOT EXISTS idx_drivers_lead_status
  ON drivers (lead_status);
