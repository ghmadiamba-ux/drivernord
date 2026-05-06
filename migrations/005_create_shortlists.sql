-- 005_create_shortlists.sql
--
-- Creates the shortlists header table and the shortlist_entries detail table.
-- A shortlist is produced by one matching run (runMatchingAgent) against one
-- company_need. Each entry captures a scored, ranked driver candidate.
--
-- Contact workflow columns (contact_status, contacted_at, recruiter_note,
-- updated_at) are added separately in migration 006.
--
-- Source of truth: lib/shortlistStore.ts (createShortlist, getShortlist)

-- ── Header ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shortlists (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_need_id   UUID        NOT NULL REFERENCES company_needs (id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Aggregate counts from the matching run (for cockpit display).
  total_candidates  INTEGER     NOT NULL DEFAULT 0,
  total_shortlisted INTEGER     NOT NULL DEFAULT 0,

  -- Human-readable summary produced by buildShortlist.
  summary           TEXT        NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_shortlists_company_need_id
  ON shortlists (company_need_id, created_at DESC);

-- ── Entries ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shortlist_entries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shortlist_id    UUID        NOT NULL REFERENCES shortlists (id) ON DELETE CASCADE,
  -- References ingested_drivers, not drivers; only ingested drivers appear.
  driver_id       UUID        NOT NULL REFERENCES ingested_drivers (id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ── Scoring ─────────────────────────────────────────────────────
  rank            INTEGER     NOT NULL,
  match_score     INTEGER     NOT NULL,
  breakdown       JSONB       NOT NULL DEFAULT '{}',
  flags           TEXT[]      NOT NULL DEFAULT '{}',
  summary         TEXT        NOT NULL DEFAULT '',

  -- Point-in-time snapshot of the driver at match time (denormalised for
  -- display without a join; schema mirrors the object built in createShortlist).
  driver_snapshot JSONB       NOT NULL DEFAULT '{}'

  -- NOTE: contact_status, contacted_at, recruiter_note, updated_at
  --       are added in migration 006.
);

CREATE INDEX IF NOT EXISTS idx_shortlist_entries_shortlist_id
  ON shortlist_entries (shortlist_id, rank);

CREATE INDEX IF NOT EXISTS idx_shortlist_entries_driver_id
  ON shortlist_entries (driver_id);
