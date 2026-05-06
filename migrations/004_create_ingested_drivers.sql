-- 004_create_ingested_drivers.sql
--
-- Creates the ingested_drivers table.
-- Populated by the ingestion agent when a driver lead reaches
-- lead_status = 'ready_for_ingestion'. Serves as the candidate pool
-- for the matching engine (lib/matchingAgent.ts → getActiveIngestedDrivers).
--
-- The primary key is the same UUID as the originating drivers row,
-- enforcing a 1:1 relationship. upsert(onConflict: 'id', ignoreDuplicates: true)
-- is used in createIngestedDriver to handle re-ingestion gracefully.
--
-- Source of truth: lib/ingestedDriverStore.ts, lib/ingestedDriver.ts

CREATE TABLE IF NOT EXISTS ingested_drivers (
  -- Shared PK with drivers — same UUID, no surrogate key needed.
  id                  UUID        PRIMARY KEY REFERENCES drivers (id),
  ingested_at         TIMESTAMPTZ NOT NULL,

  -- ── Classification ────────────────────────────────────────────────
  priority            TEXT        NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),

  -- ── Qualifications ────────────────────────────────────────────────
  license             TEXT        NOT NULL
                                  CHECK (license IN ('C', 'CE', 'D', 'C+D', 'CE+D', 'none')),
  ykb                 TEXT        NOT NULL
                                  CHECK (ykb IN ('valid', 'expired', 'in_progress', 'none', 'unknown')),
  driver_card         TEXT        NOT NULL
                                  CHECK (driver_card IN ('valid', 'expired', 'no', 'unknown')),

  -- ── Location ──────────────────────────────────────────────────────
  region              TEXT        NOT NULL
                                  CHECK (region IN ('stockholm', 'other_sweden', 'abroad')),
  willing_to_relocate BOOLEAN,

  -- ── Availability ──────────────────────────────────────────────────
  availability        TEXT        NOT NULL
                                  CHECK (availability IN ('now', '2_weeks', '1_month', 'not_yet')),

  -- ── Specialisms ───────────────────────────────────────────────────
  domain              TEXT        CHECK (domain IN (
                                    'tipp', 'kran', 'kylfrys', 'silo', 'flatbed', 'tanker',
                                    'ekipage', 'schakt_bygg', 'distribution', 'livsmedelskyla',
                                    'avfall', 'skogstransport', 'adr', 'fjarrtransport', 'budtransport'
                                  )),
  shift_preference    TEXT        CHECK (shift_preference IN ('day', 'night', 'weekend', 'flexible')),

  -- ── Contact ───────────────────────────────────────────────────────
  first_name          TEXT        NOT NULL,
  phone               TEXT        NOT NULL,
  email               TEXT,

  -- ── Follow-up scheduling ──────────────────────────────────────────
  -- Mirrors the same columns in drivers; copied at ingestion time.
  needs_follow_up     BOOLEAN     NOT NULL DEFAULT false,
  follow_up_at        TIMESTAMPTZ,
  follow_up_reason    TEXT        CHECK (follow_up_reason IN (
                                    'incomplete_lead',
                                    'not_yet_available',
                                    'ykb_in_progress'
                                  ))
);

-- Matching engine filters by region and license; composite index covers both.
CREATE INDEX IF NOT EXISTS idx_ingested_drivers_region_license
  ON ingested_drivers (region, license);
