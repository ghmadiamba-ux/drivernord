-- Migration: 02400000_create_content_campaign_cards
-- Creates the content_campaign_cards table for the Content & Distribution Engine V1.
-- All fields are internal-only; no external publishing connection.

CREATE TABLE IF NOT EXISTS content_campaign_cards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core card fields
  objective           TEXT NOT NULL,
  target_audience     TEXT NOT NULL,
  source_basis        TEXT NOT NULL,
  driver_insight      TEXT NOT NULL CHECK (length(driver_insight) >= 10 AND length(driver_insight) <= 500),
  content_pillar      TEXT NOT NULL CHECK (content_pillar IN ('practical', 'recognition', 'community', 'acquisition')),
  creative_angle      TEXT NOT NULL,
  emotional_tone      TEXT NOT NULL,
  format              TEXT NOT NULL,
  cta_type            TEXT NOT NULL DEFAULT 'none',
  planned_channel     TEXT NOT NULL DEFAULT 'manual',

  -- Scheduling hints
  planned_week        TEXT,  -- ISO week e.g. "2026-W26"
  planned_day_of_week INTEGER CHECK (planned_day_of_week BETWEEN 1 AND 7),
  suggested_slot_time TEXT,

  -- Signatures (for anti-repetition)
  topic_signature     TEXT NOT NULL,
  angle_signature     TEXT NOT NULL,

  -- Generated content
  draft_text          TEXT,
  hashtag_set         TEXT[] DEFAULT '{}',

  -- Risk and lifecycle
  risk_level          TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'high')),
  lifecycle_status    TEXT NOT NULL DEFAULT 'draft'
                        CHECK (lifecycle_status IN ('draft', 'ready', 'held', 'archived')),
  similarity_warning  TEXT,
  blocked_reason      TEXT,

  -- Feedback
  feedback_signals    TEXT[] DEFAULT '{}',

  -- External link (once scheduled)
  scheduled_post_id   UUID REFERENCES logistikklubb_scheduled_posts(id) ON DELETE SET NULL,

  -- Audit
  created_by          TEXT NOT NULL DEFAULT 'system',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  visual_family       TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_content_cards_pillar
  ON content_campaign_cards (content_pillar);

CREATE INDEX IF NOT EXISTS idx_content_cards_lifecycle
  ON content_campaign_cards (lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_content_cards_risk
  ON content_campaign_cards (risk_level);

CREATE INDEX IF NOT EXISTS idx_content_cards_week
  ON content_campaign_cards (planned_week);

CREATE INDEX IF NOT EXISTS idx_content_cards_topic_sig
  ON content_campaign_cards (topic_signature);

-- RLS: service role only (admin cockpit uses service role client)
ALTER TABLE content_campaign_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_content_campaign_cards"
  ON content_campaign_cards
  AS RESTRICTIVE
  TO authenticated, anon
  USING (false);
