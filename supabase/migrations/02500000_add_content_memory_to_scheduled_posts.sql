-- Migration: 02500000_add_content_memory_to_scheduled_posts
-- Extends logistikklubb_scheduled_posts with content engine memory fields.
-- These fields let the anti-repetition system query post history efficiently.

ALTER TABLE logistikklubb_scheduled_posts
  ADD COLUMN IF NOT EXISTS content_topic_signature  TEXT,
  ADD COLUMN IF NOT EXISTS content_angle_signature  TEXT,
  ADD COLUMN IF NOT EXISTS content_pillar           TEXT
    CHECK (content_pillar IN ('practical', 'recognition', 'community', 'acquisition')),
  ADD COLUMN IF NOT EXISTS content_cta_type         TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS content_hashtag_set      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS content_campaign_card_id UUID
    REFERENCES content_campaign_cards(id) ON DELETE SET NULL;

-- Index for anti-repetition queries (topic cooldown, CTA cooldown)
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_topic_sig
  ON logistikklubb_scheduled_posts (content_topic_signature)
  WHERE content_topic_signature IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_cta_type
  ON logistikklubb_scheduled_posts (content_cta_type, scheduled_at)
  WHERE content_cta_type IS NOT NULL AND content_cta_type != 'none';

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_pillar
  ON logistikklubb_scheduled_posts (content_pillar, scheduled_at)
  WHERE content_pillar IS NOT NULL;
