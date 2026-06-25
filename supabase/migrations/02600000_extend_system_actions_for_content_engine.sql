-- Migration: 02600000_extend_system_actions_for_content_engine
--
-- PURPOSE:
--   Widens the CHECK constraints on system_actions.action_type and
--   system_actions.target_type to include values that exist in
--   lib/systemActions.ts but are missing from the DB constraint set
--   by migration 02100000_fix_system_actions_constraints.
--
-- ROOT CAUSE:
--   Two groups of values were added to the TypeScript union after migration 021
--   was applied, but no migration was written to extend the DB constraints:
--
--   Group A — Logistikklubb daily notify (predates Content Engine):
--     action_type: logistikklubb_daily_notify_sent, logistikklubb_daily_notify_failed
--     target_type: logistikklubb_daily_notify
--
--   Group B — Content & Distribution Engine V1 (10 action_types, 2 target_types):
--     action_type: content_plan_generated, content_card_created,
--                  content_card_approved, content_card_held, content_card_archived,
--                  content_card_risk_flagged, content_draft_generated,
--                  content_anti_repetition_blocked, content_feedback_recorded,
--                  content_plan_week_approved
--     target_type: content_campaign_card, content_weekly_plan
--
--   Without this migration, every logAction() call from the content cockpit
--   silently fails (error is caught and console.errored by logAction) — the
--   cockpit UI and card generation work, but no audit rows are persisted.
--
-- SAFETY:
--   All existing rows in system_actions use values from migration 021.
--   Expanding the CHECK is non-destructive and fully backwards-compatible.
--   No data is modified. No triggers. No RLS changes.
--   The status constraint is correct and is NOT touched.
--
-- EXISTING CONSTRAINT COUNT (migration 021 baseline):
--   action_type: 62 allowed values
--   target_type: 10 allowed values
--
-- AFTER THIS MIGRATION:
--   action_type: 74 allowed values (+12)
--   target_type: 13 allowed values (+3)
--
-- FOUNDER ACTION REQUIRED: apply via Supabase SQL Editor.

-- ── action_type ───────────────────────────────────────────────────────────────

ALTER TABLE system_actions
  DROP CONSTRAINT IF EXISTS system_actions_action_type_check;

ALTER TABLE system_actions
  ADD CONSTRAINT system_actions_action_type_check CHECK (action_type IN (
    -- ── Core pipeline (original 14 from migration 007) ────────────────────────
    'driver_ingested',
    'need_ingested',
    'match_run',
    'shortlist_created',
    'contact_suggested',
    'contact_sent',
    'contact_skipped',
    'contact_confirmed',
    'follow_up_triggered',
    'follow_up_confirmed',
    'follow_up_sent',
    'follow_up_skipped',
    'override_cancelled',
    'override_retried',
    -- ── Extended pipeline (added in migration 021) ────────────────────────────
    'driver_duplicate_detected',
    'data_quality_issue',
    'high_priority_lead_detected',
    'contact_skipped_by_founder',
    'contact_needs_review',
    'company_need_draft_promoted',
    'company_need_draft_rejected',
    -- ── Market Agent (added in migration 021) ────────────────────────────────
    'market_signal_detected',
    'company_need_refresh_needed',
    'company_need_expired',
    'company_need_pain_score_updated',
    'company_need_promotion_recommended',
    'company_need_daily_scan_completed',
    'company_need_weekly_scan_completed',
    'company_need_triggered_scan_completed',
    -- ── Founder governance (added in migration 021) ───────────────────────────
    'company_need_outreach_approved',
    -- ── Pilot outreach tracker (added in migration 021) ───────────────────────
    'pilot_outreach_email_logged',
    'pilot_company_replied',
    'pilot_need_confirmed',
    'pilot_shortlist_delivered',
    'pilot_closed',
    -- ── Zoho outreach queue (added in migration 021) ─────────────────────────
    'outreach_email_queued',
    'outreach_email_approved',
    'outreach_email_scheduled',
    'outreach_email_sent',
    'outreach_email_failed',
    'outreach_reply_received',
    'outreach_reply_classified',
    -- ── Logistikklubb Agent V2 (added in migration 021) ──────────────────────
    'logistikklubb_sequence_generated',
    'logistikklubb_posts_approved',
    'logistikklubb_posts_scheduled',
    'logistikklubb_post_due',
    'logistikklubb_post_marked_published',
    'logistikklubb_post_skipped',
    'logistikklubb_auto_post_blocked_manual_mode',
    -- ── Agency scan (added in migration 021) ─────────────────────────────────
    'agency_scan_completed',
    'agency_chronic_unfilled_detected',
    -- ── News Relay Agent (added in migration 021) ─────────────────────────────
    'logistikklubb_news_relay_completed',
    'logistikklubb_news_relay_draft_created',
    -- ── Facebook Page Publisher (added in migration 021) ──────────────────────
    'logistikklubb_facebook_page_post_published',
    'logistikklubb_facebook_page_post_failed',
    'logistikklubb_facebook_rate_limit_hit',
    -- ── Founder Control Channel (added in migration 021) ─────────────────────
    'founder_notification_sent',
    'founder_notification_failed',
    'founder_command_received',
    'founder_command_executed',
    'founder_command_rejected',
    -- ── Stale shortlist refresh (added in migration 021) ─────────────────────
    'shortlist_refresh',
    -- ── Logistikklubb daily notify [NEW — Group A] ────────────────────────────
    'logistikklubb_daily_notify_sent',
    'logistikklubb_daily_notify_failed',
    -- ── Content & Distribution Engine V1 [NEW — Group B] ─────────────────────
    'content_plan_generated',
    'content_card_created',
    'content_card_approved',
    'content_card_held',
    'content_card_archived',
    'content_card_risk_flagged',
    'content_draft_generated',
    'content_anti_repetition_blocked',
    'content_feedback_recorded',
    'content_plan_week_approved'
  ));

-- ── target_type ───────────────────────────────────────────────────────────────

ALTER TABLE system_actions
  DROP CONSTRAINT IF EXISTS system_actions_target_type_check;

ALTER TABLE system_actions
  ADD CONSTRAINT system_actions_target_type_check CHECK (target_type IN (
    -- ── Existing values (migration 021 baseline, 10 values) ───────────────────
    'driver',
    'company_need',
    'shortlist',
    'shortlist_entry',
    'company_need_draft',
    'market_scan',
    'pilot_company_relationship',
    'outreach_email_queue',
    'logistikklubb_scheduled_post',
    'agency_posting_signal',
    -- ── Logistikklubb daily notify [NEW — Group A] ────────────────────────────
    'logistikklubb_daily_notify',
    -- ── Content & Distribution Engine V1 [NEW — Group B] ─────────────────────
    'content_campaign_card',
    'content_weekly_plan'
  ));

-- ── status: unchanged — no new values required ────────────────────────────────
-- (status constraint from migration 021 remains valid as-is)
