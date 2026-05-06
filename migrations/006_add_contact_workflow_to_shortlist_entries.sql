-- 006_add_contact_workflow_to_shortlist_entries.sql
--
-- Adds the contact workflow columns to shortlist_entries.
-- These columns power the contact agent (lib/contactAgent.ts) and the
-- follow-up dedup check (lib/followUpAgent.ts → wasRecentlyContacted).
--
-- Source of truth:
--   lib/shortlistStore.ts  — ShortlistEntryRecord interface, updateShortlistEntry
--   lib/contactAgent.ts    — wasRecentlyContacted queries contact_status + contacted_at
--   lib/followUpAgent.ts   — dedup query: contact_status != 'new' AND contacted_at > since

ALTER TABLE shortlist_entries
  ADD COLUMN IF NOT EXISTS contact_status TEXT NOT NULL DEFAULT 'new'
    CHECK (contact_status IN ('new', 'contacted', 'interested', 'not_interested')),

  ADD COLUMN IF NOT EXISTS contacted_at   TIMESTAMPTZ,

  ADD COLUMN IF NOT EXISTS recruiter_note TEXT,

  -- updated_at is bumped on every updateShortlistEntry call.
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT now();

-- Anti-spam dedup: contactAgent and followUpAgent both query
--   WHERE driver_id = X AND contact_status != 'new' AND contacted_at > <since>
-- This index covers both filters efficiently.
CREATE INDEX IF NOT EXISTS idx_shortlist_entries_driver_contact
  ON shortlist_entries (driver_id, contacted_at DESC)
  WHERE contact_status != 'new';

-- Cockpit pending-approval queue filters on contact_status = 'new' across shortlists.
CREATE INDEX IF NOT EXISTS idx_shortlist_entries_contact_status
  ON shortlist_entries (contact_status)
  WHERE contact_status = 'new';
