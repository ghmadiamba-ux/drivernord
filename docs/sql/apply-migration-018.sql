-- ============================================================
-- DRIVERNORD PRODUCTION MIGRATION 018
-- Extend system_actions constraints: contact workflow + draft lifecycle
--
-- HOW TO APPLY:
--   1. Open: https://supabase.com/dashboard/project/iwawdnfrbwhfrfibeqlp/sql/new
--   2. Paste this entire file into the SQL editor
--   3. Click Run (or Ctrl+Enter)
--   4. Expected: no errors, "ALTER TABLE" twice
--
-- SAFE: DROP CONSTRAINT IF EXISTS — re-running is harmless.
--
-- WHY:
--   5 action_type values and 1 status value exist in TypeScript and are
--   actively called (ingestLead.ts, contacts API route, companyNeedDraft.ts)
--   but were missing from the DB CHECK constraint. logAction() swallows
--   errors silently, so these inserts have been failing without indication.
--   Migration 018 unblocks:
--     - high_priority_lead_detected (ingestLead.ts — every high-priority ingestion)
--     - contact_skipped_by_founder (contacts route — founder skips a suggestion)
--     - contact_needs_review (contacts route — founder flags for review)
--     - company_need_draft_promoted (companyNeedDraft.ts — promote audit trail)
--     - company_need_draft_rejected (companyNeedDraft.ts — reject audit trail)
--     - needs_review status (contacts route — sets system_actions.status)
-- ============================================================

ALTER TABLE system_actions DROP CONSTRAINT IF EXISTS system_actions_action_type_check;

ALTER TABLE system_actions ADD CONSTRAINT system_actions_action_type_check
  CHECK (action_type IN (
    'driver_ingested',
    'need_ingested',
    'match_run',
    'shortlist_created',
    'contact_suggested',
    'contact_sent',
    'contact_skipped',
    'contact_confirmed',
    'follow_up_triggered',
    'follow_up_sent',
    'follow_up_skipped',
    'follow_up_confirmed',
    'override_cancelled',
    'override_retried',
    'driver_duplicate_detected',
    'data_quality_issue',
    'market_signal_detected',
    'company_need_refresh_needed',
    'company_need_expired',
    'company_need_pain_score_updated',
    'company_need_promotion_recommended',
    'company_need_daily_scan_completed',
    'company_need_weekly_scan_completed',
    'company_need_triggered_scan_completed',
    'high_priority_lead_detected',
    'contact_skipped_by_founder',
    'contact_needs_review',
    'company_need_draft_promoted',
    'company_need_draft_rejected'
  ));

ALTER TABLE system_actions DROP CONSTRAINT IF EXISTS system_actions_status_check;

ALTER TABLE system_actions ADD CONSTRAINT system_actions_status_check
  CHECK (status IN (
    'pending',
    'approved',
    'completed',
    'failed',
    'cancelled',
    'needs_review'
  ));

-- ── VERIFICATION ──────────────────────────────────────────────────────────────
/*
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name IN (
  'system_actions_action_type_check',
  'system_actions_status_check'
);
-- Expect: 2 rows with extended check_clause values

SELECT COUNT(*) FROM system_actions;
-- Should return without error
*/
