-- 007_create_system_actions.sql
--
-- Creates the system_actions table — the single audit trail, observation
-- feed, and pending-approval queue for the autonomous pipeline.
-- Every agent action (and every human override) appends one row here.
--
-- Source of truth:
--   lib/systemActions.ts   — ActionType, ActionStatus, TargetType, logAction
--   docs/autonomous-system-audit-v1.md §Schema (Migration 007)
--
-- IMPORTANT: The action_type CHECK here includes 14 values — three more
-- than the 11 in the original design doc (contact_sent, follow_up_sent,
-- follow_up_skipped were added when the contact and follow-up agents were
-- implemented). This file is authoritative over the design doc.

CREATE TABLE IF NOT EXISTS system_actions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── What happened ────────────────────────────────────────────────
  action_type   TEXT        NOT NULL CHECK (action_type IN (
    'driver_ingested',      -- ingestion agent: driver entered the candidate pool
    'need_ingested',        -- company need agent: new need created (reserved)
    'match_run',            -- matching agent: scoring run completed for one need
    'shortlist_created',    -- matching agent: shortlist header written
    'contact_suggested',    -- contact agent: suggestion queued for human approval
    'contact_sent',         -- contact agent: message sent (auto mode)
    'contact_skipped',      -- contact agent: driver skipped (dedup / guard / score)
    'contact_confirmed',    -- human: approved a contact_suggested action
    'follow_up_triggered',  -- follow-up agent: follow-up queued for human approval
    'follow_up_sent',       -- follow-up agent: follow-up sent (auto mode)
    'follow_up_skipped',    -- follow-up agent: driver skipped (dedup)
    'follow_up_confirmed',  -- human: approved a follow_up_triggered action
    'override_cancelled',   -- human: cancelled a pending action
    'override_retried'      -- human: retried a failed action
  )),

  -- ── Who triggered it ────────────────────────────────────────────
  -- Known values: 'agent:driver_ingestion', 'agent:matching', 'agent:contact',
  --               'agent:followup', 'human', 'agent:company_need'
  -- Free-text; not constrained to allow new agent labels without a migration.
  triggered_by  TEXT        NOT NULL,

  -- ── What it acted on ────────────────────────────────────────────
  target_type   TEXT        NOT NULL CHECK (target_type IN (
    'driver',
    'company_need',
    'shortlist',
    'shortlist_entry'
  )),
  target_id     UUID        NOT NULL,

  -- ── Lifecycle ───────────────────────────────────────────────────
  status        TEXT        NOT NULL DEFAULT 'completed' CHECK (status IN (
    'pending',    -- written by agent; awaiting human approval
    'approved',   -- human approved; action being executed
    'completed',  -- finished successfully
    'failed',     -- failed; see error column
    'cancelled'   -- human cancelled
  )),

  -- ── Payload ─────────────────────────────────────────────────────
  input         JSONB,       -- inputs provided to the agent action
  result        JSONB,       -- outputs produced by the agent action
  error         TEXT,        -- error message when status = 'failed'

  -- ── Timestamps ──────────────────────────────────────────────────
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ          -- set when status transitions to completed or failed
);

-- Cockpit live feed: newest actions first.
CREATE INDEX IF NOT EXISTS idx_system_actions_created_at
  ON system_actions (created_at DESC);

-- Pending-approval queue: partial index — only pending rows are indexed.
CREATE INDEX IF NOT EXISTS idx_system_actions_pending
  ON system_actions (created_at DESC)
  WHERE status = 'pending';

-- Per-entity audit history: e.g. all actions on a specific driver or need.
CREATE INDEX IF NOT EXISTS idx_system_actions_target
  ON system_actions (target_type, target_id, created_at DESC);

-- Failed-actions panel in cockpit: recent failures (last 24h query in warnings.ts).
CREATE INDEX IF NOT EXISTS idx_system_actions_failed
  ON system_actions (created_at DESC)
  WHERE status = 'failed';
