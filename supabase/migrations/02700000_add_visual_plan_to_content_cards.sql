-- Migration: 02700000_add_visual_plan_to_content_cards
--
-- PURPOSE:
--   Phase 2 of the Content & Distribution Engine — Visual Production Pipeline.
--   Adds visual production plan storage to content_campaign_cards (JSONB column)
--   and extends system_actions CHECK constraints for 3 new visual plan action types.
--
-- DESIGN DECISION:
--   Visual plans are stored as JSONB on content_campaign_cards rather than a
--   separate table because:
--   (a) Visual plans are strictly 1:1 with campaign cards.
--   (b) Avoids JOIN complexity for cockpit queries.
--   (c) Schema is append-only — existing cards simply have visual_plan = NULL.
--   Binary image data is never stored in this column — metadata/specs only.
--
-- NEW ACTION TYPES (Group C — Visual Production Pipeline):
--   content_visual_plan_generated — system generated a visual plan for a card
--   content_visual_plan_updated   — founder updated visual plan (lifecycle/feedback)
--   content_visual_plan_held      — visual plan held for risk or repetition
--
-- EXISTING CONSTRAINT COUNT (migration 026 baseline):
--   action_type: 74 allowed values
--   target_type: 13 allowed values
--
-- AFTER THIS MIGRATION:
--   action_type: 77 allowed values (+3)
--   target_type: 13 allowed values (unchanged — uses content_campaign_card)
--
-- SAFETY:
--   ADD COLUMN IF NOT EXISTS is idempotent.
--   DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT is idempotent.
--   No data is modified. No triggers. No RLS changes.
--
-- FOUNDER ACTION REQUIRED: apply via Supabase SQL Editor after migrations 024–026.

-- ── Step 1: Add visual_plan column ──────────────────────────────────────────

ALTER TABLE content_campaign_cards
  ADD COLUMN IF NOT EXISTS visual_plan JSONB;

COMMENT ON COLUMN content_campaign_cards.visual_plan IS
  'Visual Production Plan — metadata only; no binary image data. '
  'Populated when founder generates a visual plan via /admin/content cockpit.';

-- Index for retrieving cards that have a visual plan (non-null)
CREATE INDEX IF NOT EXISTS idx_content_cards_visual_plan
  ON content_campaign_cards ((visual_plan IS NOT NULL))
  WHERE visual_plan IS NOT NULL;

-- ── Step 2: Extend system_actions action_type constraint ─────────────────────

ALTER TABLE system_actions
  DROP CONSTRAINT IF EXISTS system_actions_action_type_check;

ALTER TABLE system_actions
  ADD CONSTRAINT system_actions_action_type_check CHECK (action_type IN (
    -- ── Core pipeline (migration 007) ─────────────────────────────────────────
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
    -- ── Extended pipeline (migration 021) ─────────────────────────────────────
    'driver_duplicate_detected',
    'data_quality_issue',
    'high_priority_lead_detected',
    'contact_skipped_by_founder',
    'contact_needs_review',
    'company_need_draft_promoted',
    'company_need_draft_rejected',
    -- ── Market Agent (migration 021) ──────────────────────────────────────────
    'market_signal_detected',
    'company_need_refresh_needed',
    'company_need_expired',
    'company_need_pain_score_updated',
    'company_need_promotion_recommended',
    'company_need_daily_scan_completed',
    'company_need_weekly_scan_completed',
    'company_need_triggered_scan_completed',
    -- ── Founder governance (migration 021) ───────────────────────────────────
    'company_need_outreach_approved',
    -- ── Pilot outreach (migration 021) ───────────────────────────────────────
    'pilot_outreach_email_logged',
    'pilot_company_replied',
    'pilot_need_confirmed',
    'pilot_shortlist_delivered',
    'pilot_closed',
    -- ── Zoho outreach queue (migration 021) ──────────────────────────────────
    'outreach_email_queued',
    'outreach_email_approved',
    'outreach_email_scheduled',
    'outreach_email_sent',
    'outreach_email_failed',
    'outreach_reply_received',
    'outreach_reply_classified',
    -- ── Logistikklubb Agent V2 (migration 021) ────────────────────────────────
    'logistikklubb_sequence_generated',
    'logistikklubb_posts_approved',
    'logistikklubb_posts_scheduled',
    'logistikklubb_post_due',
    'logistikklubb_post_marked_published',
    'logistikklubb_post_skipped',
    'logistikklubb_auto_post_blocked_manual_mode',
    -- ── Agency scan (migration 021) ───────────────────────────────────────────
    'agency_scan_completed',
    'agency_chronic_unfilled_detected',
    -- ── News Relay Agent (migration 021) ──────────────────────────────────────
    'logistikklubb_news_relay_completed',
    'logistikklubb_news_relay_draft_created',
    -- ── Facebook Page Publisher (migration 021) ───────────────────────────────
    'logistikklubb_facebook_page_post_published',
    'logistikklubb_facebook_page_post_failed',
    'logistikklubb_facebook_rate_limit_hit',
    -- ── Founder Control Channel (migration 021) ───────────────────────────────
    'founder_notification_sent',
    'founder_notification_failed',
    'founder_command_received',
    'founder_command_executed',
    'founder_command_rejected',
    -- ── Stale shortlist refresh (migration 021) ───────────────────────────────
    'shortlist_refresh',
    -- ── Logistikklubb daily notify (migration 026) ────────────────────────────
    'logistikklubb_daily_notify_sent',
    'logistikklubb_daily_notify_failed',
    -- ── Content Engine V1 (migration 026) ────────────────────────────────────
    'content_plan_generated',
    'content_card_created',
    'content_card_approved',
    'content_card_held',
    'content_card_archived',
    'content_card_risk_flagged',
    'content_draft_generated',
    'content_anti_repetition_blocked',
    'content_feedback_recorded',
    'content_plan_week_approved',
    -- ── Visual Production Pipeline V1 [NEW — Group C] ─────────────────────────
    'content_visual_plan_generated',
    'content_visual_plan_updated',
    'content_visual_plan_held'
  ));

-- ── target_type: unchanged — visual plans use content_campaign_card ───────────
-- (target_type constraint from migration 026 remains valid as-is)

-- ── Verification queries (run after applying) ─────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'content_campaign_cards' AND column_name = 'visual_plan';
-- SELECT COUNT(*) FROM pg_indexes
--   WHERE tablename = 'content_campaign_cards' AND indexname = 'idx_content_cards_visual_plan';
