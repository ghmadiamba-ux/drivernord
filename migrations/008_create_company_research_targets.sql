-- 008_create_company_research_targets.sql
--
-- Creates the company_research_targets table — the canonical database
-- record for every company DriverNord has researched as a potential pilot
-- client. Replaces the static CSV files (b2b-target-company-first-50.csv,
-- b2b-target-company-top-10-research.csv) with queryable, join-able,
-- cockpit-visible records.
--
-- Source of truth:
--   docs/business/b2b-data-model-v1.md §Table 1
--   docs/business/b2b-agent-architecture-v1.md §Agent A
--
-- IMPORTANT: This table must remain separate from companies (migration 003).
-- A company_research_target is a prospect under evaluation. A companies row
-- is a client with at least one matching-triggering company_need. Mixing them
-- would allow runMatchingAgent() to attach shortlists to unconfirmed prospects.
-- A research target is promoted to companies only at Gate 6 — an explicit
-- human action — via the pilot_company_relationships.company_id FK.
--
-- This migration does not alter any existing table.

CREATE TABLE IF NOT EXISTS company_research_targets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- bumped on any field change; maintained by application layer (no trigger)
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ── Identity ─────────────────────────────────────────────────────────
  company_name  TEXT NOT NULL,
  website       TEXT,

  -- ── Geography ────────────────────────────────────────────────────────
  region  TEXT CHECK (region IN (
    'stockholm',
    'stockholm_region',
    'malardalen',
    'other_sweden'
  )),
  city    TEXT,

  -- ── Company classification ───────────────────────────────────────────
  company_size  TEXT CHECK (company_size IN ('micro', 'small', 'medium', 'large')),

  -- Combined segment tags (e.g. 'A/E' = SME with repeated ads urgency signal).
  -- See b2b-barrier-entry-research-framework.md §2 for segment definitions.
  segment  TEXT CHECK (segment IN (
    'A',        -- SME transport company (5–50 trucks, owner-operated)
    'B',        -- Regional transport operator (50–200 trucks)
    'C',        -- Mid-size logistics company (200–1000 employees)
    'D',        -- Cross-segment: uses staffing/bemanning agency
    'E',        -- Cross-segment urgency tag: repeatedly posting driver ads
    'F',        -- Large enterprise benchmark — research only, no outreach
    'agency',   -- Staffing agency itself — potential B2B partner track
    'A/E',      -- SME + repeated ads
    'B/E',      -- Regional operator + repeated ads
    'A/D',      -- SME + uses staffing agency
    'B/D'       -- Regional operator + uses staffing agency
  )),

  -- Transport domains from DriverNord 15-domain taxonomy.
  -- Element values validated at application layer (same constraint as company_needs).
  transport_domain  TEXT[] NOT NULL DEFAULT '{}',

  -- ── Hiring signal ────────────────────────────────────────────────────
  visible_driver_need    BOOLEAN,
  job_ads_url            TEXT,     -- may expire; raw ad content preserved in source_notes
  license_mentions       TEXT[] NOT NULL DEFAULT '{}',  -- app-layer validated: C/CE/D/C+D/CE+D/B
  ykb_mentioned          BOOLEAN,
  driver_card_mentioned  BOOLEAN,
  urgency_signal         TEXT CHECK (urgency_signal IN (
    'none',
    'single_ad',
    'repeated_ads',
    'stated_urgency'
  )),

  -- ── Contact details ──────────────────────────────────────────────────
  contact_email   TEXT,
  phone           TEXT,
  linkedin_url    TEXT,

  -- ── Decision-maker ───────────────────────────────────────────────────
  decision_maker_name  TEXT,
  decision_maker_role  TEXT CHECK (decision_maker_role IN (
    'owner',
    'VD',
    'transport_manager',
    'driftchef',
    'operations_director',
    'HR_manager',
    'unknown'
  )),

  -- ── Procurement / barrier signals ────────────────────────────────────
  procurement_page          TEXT,   -- URL or 'none'
  supplier_requirements_url TEXT,   -- URL or 'none_found'

  barrier_level  TEXT CHECK (barrier_level IN (
    'low',            -- 70–100 score: direct DM access, no formal procurement
    'medium',         -- 45–69: some process exists, still pilot-feasible
    'high',           -- 20–44: formal process, hold until 3+ pilot wins
    'enterprise_only' -- 0–19: research benchmark only, no outreach
  )),
  barrier_notes  TEXT,  -- specific evidence: what was found and where

  -- ── Scoring (7-dimension model, 0–100) ──────────────────────────────
  -- See b2b-barrier-entry-research-framework.md §5 for the scoring model.
  pilot_accessibility_score  INTEGER
    CHECK (pilot_accessibility_score >= 0 AND pilot_accessibility_score <= 100),
  opportunity_score          INTEGER
    CHECK (opportunity_score >= 0 AND opportunity_score <= 100),

  -- ── Outreach planning ───────────────────────────────────────────────
  recommended_entry_point  TEXT,  -- who to contact, which channel, opening line
  next_action              TEXT,  -- specific next step instruction

  -- ── Research lifecycle ───────────────────────────────────────────────
  research_status  TEXT NOT NULL DEFAULT 'not_started'
    CHECK (research_status IN (
      'not_started',  -- identified; minimum fields only
      'researching',  -- Agent A actively processing
      'enriched',     -- all available public fields complete; awaiting Gate 1
      'incomplete',   -- research attempted; key fields missing
      'rejected'      -- disqualified: Segment F, wrong license, bankrupt, etc.
    )),

  source_notes      TEXT,        -- raw evidence, source platform, ad content
  last_checked_date TIMESTAMPTZ,

  -- ── Scoring audit ────────────────────────────────────────────────────
  scored_at  TIMESTAMPTZ,   -- when Agent B last computed the score
  scored_by  TEXT,          -- 'agent:scoring' or recruiter ID on manual override

  -- ── Gate 1 approval ──────────────────────────────────────────────────
  -- Populated when a human confirms this is a valid target (not misclassified,
  -- not an enterprise account, source data verified).
  approved_as_target_at  TIMESTAMPTZ,
  approved_as_target_by  TEXT        -- recruiter identifier
);

-- ── Indexes ──────────────────────────────────────────────────────────────

-- Cockpit B2B tab: score-ranked queue filtered by research_status.
-- Primary read path for the B2B target registry view.
CREATE INDEX IF NOT EXISTS idx_crt_status_score
  ON company_research_targets (research_status, pilot_accessibility_score DESC);

-- Stale-research warning detection (Agent F / b2b_agent_warnings).
-- Finds enriched records that have not been checked recently.
CREATE INDEX IF NOT EXISTS idx_crt_last_checked
  ON company_research_targets (last_checked_date ASC)
  WHERE research_status = 'enriched';

-- Agent B scoring queue: find enriched records not yet scored.
CREATE INDEX IF NOT EXISTS idx_crt_unscored
  ON company_research_targets (created_at ASC)
  WHERE research_status = 'enriched' AND pilot_accessibility_score IS NULL;

-- Regional clustering for geographic grouping queries.
CREATE INDEX IF NOT EXISTS idx_crt_region
  ON company_research_targets (region, barrier_level);
