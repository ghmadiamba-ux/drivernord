CREATE TABLE IF NOT EXISTS public.outreach_email_queue (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id             UUID        REFERENCES public.company_research_targets(id) ON DELETE SET NULL,
  company_name_snapshot TEXT        NOT NULL,
  recipient_email       TEXT        NOT NULL,
  recipient_name        TEXT,
  subject               TEXT        NOT NULL,
  body                  TEXT        NOT NULL,
  readiness_category    TEXT        NOT NULL CHECK (readiness_category IN (
                          'READY', 'THIN_BUT_USABLE', 'QUESTION_BASED', 'SUPPLY_GAP'
                        )),
  safe_claim_used       TEXT,
  risk_notes            TEXT,
  status                TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN (
                          'draft', 'approved', 'scheduled', 'sent', 'failed', 'skipped', 'replied'
                        )),
  provider              TEXT        NOT NULL DEFAULT 'zoho',
  provider_message_id   TEXT        UNIQUE,
  scheduled_send_at     TIMESTAMPTZ,
  sent_at               TIMESTAMPTZ,
  reply_detected_at     TIMESTAMPTZ,
  reply_classification  TEXT        CHECK (reply_classification IN (
                          'interested', 'call_requested', 'not_now', 'not_interested',
                          'wrong_contact', 'auto_reply', 'bounced', 'unclear'
                        )),
  created_by_agent      BOOLEAN     NOT NULL DEFAULT false,
  approved_by_founder   BOOLEAN     NOT NULL DEFAULT false,
  automation_used       BOOLEAN     NOT NULL DEFAULT false,
  send_mode             TEXT        NOT NULL DEFAULT 'dry_run' CHECK (send_mode IN (
                          'dry_run', 'founder_approval', 'controlled_auto_send'
                        )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oeq_status_created
  ON public.outreach_email_queue (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_oeq_sent_at
  ON public.outreach_email_queue (sent_at DESC)
  WHERE status = 'sent';

CREATE INDEX IF NOT EXISTS idx_oeq_scheduled_send
  ON public.outreach_email_queue (scheduled_send_at ASC)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_oeq_target_id
  ON public.outreach_email_queue (target_id)
  WHERE target_id IS NOT NULL;

ALTER TABLE public.system_actions
  DROP CONSTRAINT IF EXISTS system_actions_action_type_check;

ALTER TABLE public.system_actions
  ADD CONSTRAINT system_actions_action_type_check
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
    'data_quality_issue',
    'driver_duplicate_detected',
    'high_priority_lead_detected',
    'market_signal_detected',
    'company_need_refresh_needed',
    'company_need_expired',
    'company_need_pain_score_updated',
    'company_need_promotion_recommended',
    'company_need_daily_scan_completed',
    'company_need_weekly_scan_completed',
    'company_need_triggered_scan_completed',
    'company_need_draft_promoted',
    'company_need_draft_rejected',
    'contact_skipped_by_founder',
    'contact_needs_review',
    'company_need_outreach_approved',
    'pilot_outreach_email_logged',
    'pilot_company_replied',
    'pilot_need_confirmed',
    'pilot_shortlist_delivered',
    'pilot_closed',
    'outreach_email_queued',
    'outreach_email_approved',
    'outreach_email_scheduled',
    'outreach_email_sent',
    'outreach_email_failed',
    'outreach_reply_received',
    'outreach_reply_classified'
  ));

ALTER TABLE public.system_actions
  DROP CONSTRAINT IF EXISTS system_actions_target_type_check;

ALTER TABLE public.system_actions
  ADD CONSTRAINT system_actions_target_type_check
  CHECK (target_type IN (
    'driver',
    'company_need',
    'shortlist',
    'shortlist_entry',
    'company_need_draft',
    'market_scan',
    'pilot_company_relationship',
    'outreach_email_queue'
  ));

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'outreach_email_queue';

SELECT COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'outreach_email_queue';

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'outreach_email_queue'
ORDER BY indexname;
