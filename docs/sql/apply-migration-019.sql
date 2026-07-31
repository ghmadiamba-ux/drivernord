-- apply-migration-019.sql
--
-- Run this in Supabase SQL Editor → drivernord project.
-- Extends system_actions action_type check constraint with all types added
-- after migration 018 (Logistikklubb, outreach queue, Facebook, LK-007).
--
-- EFFECT: logAction() calls that previously failed silently will now
-- persist correctly. No existing data is affected.
--
-- Re-running is safe (DROP CONSTRAINT IF EXISTS).

ALTER TABLE system_actions DROP CONSTRAINT IF EXISTS system_actions_action_type_check;

ALTER TABLE system_actions ADD CONSTRAINT system_actions_action_type_check
  CHECK (action_type IN (
    -- original 14 types (migration 007)
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
    -- ingestion + quality types (migration 017)
    'driver_duplicate_detected',
    'data_quality_issue',
    -- market agent V1 types (migration 017)
    'market_signal_detected',
    'company_need_refresh_needed',
    'company_need_expired',
    'company_need_pain_score_updated',
    'company_need_promotion_recommended',
    'company_need_daily_scan_completed',
    'company_need_weekly_scan_completed',
    'company_need_triggered_scan_completed',
    -- contact workflow + draft lifecycle (migration 018)
    'high_priority_lead_detected',
    'contact_skipped_by_founder',
    'contact_needs_review',
    'company_need_draft_promoted',
    'company_need_draft_rejected',
    -- founder governance (migration 019)
    'company_need_outreach_approved',
    -- pilot outreach tracker (migration 019)
    'pilot_outreach_email_logged',
    'pilot_company_replied',
    'pilot_need_confirmed',
    'pilot_shortlist_delivered',
    'pilot_closed',
    -- Zoho outreach queue (migration 019)
    'outreach_email_queued',
    'outreach_email_approved',
    'outreach_email_scheduled',
    'outreach_email_sent',
    'outreach_email_failed',
    'outreach_reply_received',
    'outreach_reply_classified',
    -- Logistikklubb Agent V2 (migration 019)
    'logistikklubb_sequence_generated',
    'logistikklubb_posts_approved',
    'logistikklubb_posts_scheduled',
    'logistikklubb_post_due',
    'logistikklubb_post_marked_published',
    'logistikklubb_post_skipped',
    'logistikklubb_auto_post_blocked_manual_mode',
    -- Agency scan (migration 019)
    'agency_scan_completed',
    'agency_chronic_unfilled_detected',
    -- News Relay Agent (migration 019)
    'logistikklubb_news_relay_completed',
    'logistikklubb_news_relay_draft_created',
    -- Facebook Page Publisher (migration 019)
    'logistikklubb_facebook_page_post_published',
    'logistikklubb_facebook_page_post_failed',
    'logistikklubb_facebook_rate_limit_hit',
    -- Founder Control Channel / LK-007 (migration 019)
    'founder_notification_sent',
    'founder_notification_failed',
    'founder_command_received',
    'founder_command_executed',
    'founder_command_rejected'
  ));
