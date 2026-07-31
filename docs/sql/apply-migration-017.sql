-- ============================================================
-- DRIVERNORD PRODUCTION MIGRATION 017
-- Extend system_actions CHECK constraints for Market Agent V1
--
-- HOW TO APPLY:
--   1. Open: https://supabase.com/dashboard/project/iwawdnfrbwhfrfibeqlp/sql/new
--   2. Paste this entire file into the SQL editor
--   3. Click Run (or Ctrl+Enter)
--   4. Expected: no errors, "ALTER TABLE" twice
--
-- SAFE: DROP CONSTRAINT IF EXISTS — re-running is harmless.
--
-- WHY THIS IS NEEDED:
--   lib/companyNeedMarketAgent.ts calls logAction() with new action_type and
--   target_type values. logAction() swallows DB errors silently, so scan
--   events were not persisting. This migration unblocks that.
--
--   Also fixes: data_quality_issue and driver_duplicate_detected (used by
--   ingestLead.ts since launch but also missing from the original constraint).
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
    'company_need_triggered_scan_completed'
  ));

ALTER TABLE system_actions DROP CONSTRAINT IF EXISTS system_actions_target_type_check;

ALTER TABLE system_actions ADD CONSTRAINT system_actions_target_type_check
  CHECK (target_type IN (
    'driver',
    'company_need',
    'shortlist',
    'shortlist_entry',
    'company_need_draft',
    'market_scan'
  ));

-- ── VERIFICATION ──────────────────────────────────────────────────────────────
-- Run after applying to confirm constraints are in place:
/*
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name IN (
  'system_actions_action_type_check',
  'system_actions_target_type_check'
);
-- Expect: 2 rows with the new extended check_clause values

-- Confirm existing rows still pass the constraint:
SELECT COUNT(*) FROM system_actions;
-- Should return without error (all existing rows use values in the new set)
*/
