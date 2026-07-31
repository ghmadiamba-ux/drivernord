import { randomUUID } from 'node:crypto';
import { db } from './db';

export type ActionType =
  | 'driver_ingested'
  | 'driver_duplicate_detected'
  | 'data_quality_issue'
  | 'high_priority_lead_detected'
  | 'need_ingested'
  | 'match_run'
  | 'shortlist_created'
  | 'contact_suggested'
  | 'contact_sent'
  | 'contact_skipped'
  | 'contact_confirmed'
  | 'follow_up_triggered'
  | 'follow_up_confirmed'
  | 'follow_up_sent'
  | 'follow_up_skipped'
  | 'override_cancelled'
  | 'override_retried'
  | 'contact_skipped_by_founder'
  | 'contact_needs_review'
  | 'company_need_draft_promoted'
  | 'company_need_draft_rejected'
  // Market Agent events
  | 'market_signal_detected'
  | 'company_need_refresh_needed'
  | 'company_need_expired'
  | 'company_need_pain_score_updated'
  | 'company_need_promotion_recommended'
  | 'company_need_daily_scan_completed'
  | 'company_need_weekly_scan_completed'
  | 'company_need_triggered_scan_completed'
  // Founder governance events
  | 'company_need_outreach_approved'
  // Pilot outreach tracker events
  | 'pilot_outreach_email_logged'
  | 'pilot_company_replied'
  | 'pilot_need_confirmed'
  | 'pilot_shortlist_delivered'
  | 'pilot_closed'
  // Zoho outreach queue events
  | 'outreach_email_queued'
  | 'outreach_email_approved'
  | 'outreach_email_scheduled'
  | 'outreach_email_sent'
  | 'outreach_email_failed'
  | 'outreach_reply_received'
  | 'outreach_reply_classified'
  // Logistikklubb Agent V2 events
  | 'logistikklubb_sequence_generated'
  | 'logistikklubb_posts_approved'
  | 'logistikklubb_posts_scheduled'
  | 'logistikklubb_post_due'
  | 'logistikklubb_post_marked_published'
  | 'logistikklubb_post_skipped'
  | 'logistikklubb_auto_post_blocked_manual_mode'
  // Agency scan events
  | 'agency_scan_completed'
  | 'agency_chronic_unfilled_detected'
  // News Relay Agent events
  | 'logistikklubb_news_relay_completed'
  | 'logistikklubb_news_relay_draft_created'
  // Facebook Page Publisher events
  | 'logistikklubb_facebook_page_post_published'
  | 'logistikklubb_facebook_page_post_failed'
  | 'logistikklubb_facebook_rate_limit_hit'
  // Founder Control Channel events
  | 'founder_notification_sent'
  | 'founder_notification_failed'
  | 'founder_command_received'
  | 'founder_command_executed'
  | 'founder_command_rejected'
  // Daily twice-per-day Logistikklubb notify
  | 'logistikklubb_daily_notify_sent'
  | 'logistikklubb_daily_notify_failed'
  // Stale shortlist refresh cron
  | 'shortlist_refresh'
  // Content Engine V1 events
  | 'content_plan_generated'
  | 'content_card_created'
  | 'content_card_approved'
  | 'content_card_held'
  | 'content_card_archived'
  | 'content_card_risk_flagged'
  | 'content_draft_generated'
  | 'content_anti_repetition_blocked'
  | 'content_feedback_recorded'
  | 'content_plan_week_approved'
  // Visual Production Pipeline V1 events
  | 'content_visual_plan_generated'
  | 'content_visual_plan_updated'
  | 'content_visual_plan_held'
  // Facebook Content Bridge V1 events
  | 'content_facebook_card_queued'
  | 'content_facebook_card_blocked'
  | 'content_facebook_card_scheduled'
  | 'content_facebook_card_due'
  | 'content_facebook_post_published'
  | 'content_facebook_post_failed'
  | 'content_facebook_emergency_pause'
  | 'content_facebook_category_paused'
  | 'content_facebook_cap_hit'
  | 'content_facebook_queue_plan_run';

export type ActionStatus = 'pending' | 'approved' | 'completed' | 'failed' | 'cancelled' | 'needs_review';

export type TargetType =
  | 'driver'
  | 'company_need'
  | 'shortlist'
  | 'shortlist_entry'
  | 'company_need_draft'
  | 'market_scan'
  | 'pilot_company_relationship'
  | 'outreach_email_queue'
  | 'logistikklubb_scheduled_post'
  | 'logistikklubb_daily_notify'
  | 'agency_posting_signal'
  | 'content_campaign_card'
  | 'content_weekly_plan'
  | 'content_facebook_queue_entry';

export interface LogActionParams {
  action_type:  ActionType;
  triggered_by: string;
  target_type:  TargetType;
  target_id:    string | null;
  status:       ActionStatus;
  input?:       Record<string, unknown>;
  result?:      Record<string, unknown>;
  error?:       string;
}

// Writes one system_actions row. Never throws — logs to console on DB failure
// so that a logging error never breaks the calling agent.
export async function logAction(params: LogActionParams): Promise<string> {
  const id  = randomUUID();
  const now = new Date().toISOString();

  const { error: dbError } = await db.from('system_actions').insert({
    id,
    action_type:  params.action_type,
    triggered_by: params.triggered_by,
    target_type:  params.target_type,
    target_id:    params.target_id,
    status:       params.status,
    input:        params.input  ?? null,
    result:       params.result ?? null,
    error:        params.error  ?? null,
    created_at:   now,
    completed_at:
      params.status === 'completed' || params.status === 'failed' ? now : null,
  });

  if (dbError) {
    console.error('[systemActions] logAction failed:', dbError.message, '| action_type:', params.action_type);
  }

  return id;
}
