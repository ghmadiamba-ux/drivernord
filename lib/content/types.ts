// lib/content/types.ts
//
// DriverNord Content & Distribution Engine V1 — Type Definitions
//
// All types for Campaign Cards, content memory, weekly plans, and feedback.
// Pure types — no DB imports, no side effects.
//
// BOUNDARIES:
//   ✗ Does NOT connect to any channel
//   ✗ Does NOT publish anything externally
//   ✓ Internal planning and draft generation only

// ─── Enumerations ─────────────────────────────────────────────────────────────

export type ContentObjective =
  | 'reach'
  | 'engagement'
  | 'follow'
  | 'community_growth'
  | 'registration'
  | 're_engagement'
  | 'market_education';

export type ContentPillar =
  | 'practical'    // 50% — practical info, market education, tips, regulations
  | 'recognition'  // 20% — driver identity, profession pride, relatable moments
  | 'community'    // 20% — Logistikklubb engagement, discussion, questions
  | 'acquisition'; // 10% — low-frequency soft CTA only

export type CreativeAngle =
  | 'practical_advice'       // actionable tip or guidance
  | 'market_education'       // how the market works, what to expect
  | 'driver_recognition'     // celebrating the profession and its people
  | 'community_question'     // question to spark group discussion
  | 'myth_vs_reality'        // correcting common misconceptions
  | 'operational_insight'    // a day in the life, behind-the-scenes perspective
  | 'relatable_work_moment'  // short grounded story or scenario
  | 'career_confidence'      // empowering drivers in their professional decisions
  | 'safe_light_humor'       // gentle humor that resonates without excluding
  | 'low_freq_acquisition_cta'; // DriverNord soft registration or Logistikklubb join

export type EmotionalTone =
  | 'informative'   // clear, factual, useful
  | 'warm'          // human, empathetic, collegial
  | 'humorous'      // light, grounded, relatable (never forced)
  | 'motivational'  // energizing, respectful
  | 'empowering';   // confidence-building, supportive

export type PostFormat =
  | 'text_post'   // standard mobile-first paragraphs
  | 'poll'        // question with lettered/numbered choices
  | 'question'    // single open-ended community question
  | 'tip_list'    // numbered or bullet practical tips
  | 'short_story' // 3–5 sentence relatable narrative
  | 'cta';        // soft call to action

export type CtaType =
  | 'none'
  | 'soft_registration'  // "Register at drivernord.com/chaufforer"
  | 'community_join'     // "Join Logistikklubb at drivernord.com/logistikklubb"
  | 'website_visit'      // "See more at drivernord.com"
  | 'follow_page'        // "Follow us for more transport news"
  | 'profile_update';    // "Update your profile if your availability changed"

export type RiskLevel =
  | 'low'   // eligible for future autonomous publishing
  | 'high'; // must be held for founder review

export type TargetAudience =
  | 'C_drivers'
  | 'CE_drivers'
  | 'D_drivers'
  | 'YKB_holders'
  | 'night_shift_drivers'
  | 'distribution_drivers'
  | 'fjarrtransport_drivers'
  | 'kylfrys_drivers'
  | 'logistics_workers'
  | 'all_drivers';

export type SourceBasis =
  | 'evergreen_driver_insight' // timeless professional insight
  | 'approved_market_signal'   // signal from DB market data (no company names)
  | 'community_theme'          // engagement pattern from Logistikklubb
  | 'editorial_theme';         // internal editorial rotation

export type PlannedChannel =
  | 'facebook_page'     // DriverNord Facebook Page (not connected yet)
  | 'whatsapp_group'    // Logistikklubb WhatsApp (manual)
  | 'website'           // drivernord.com (not connected yet)
  | 'manual';           // founder copies and posts manually

export type CardLifecycleStatus =
  | 'draft'    // generated, not yet reviewed
  | 'ready'    // passes all checks, eligible for scheduling
  | 'held'     // blocked — similarity, risk, or prerequisite
  | 'archived'; // superseded or cancelled
// Note: regulatory-held cards use lifecycle_status='held' with a blocked_reason
// starting with REGULATORY_BLOCKED_REASON_PREFIX from regulatoryContentDetector.ts.

export type FeedbackSignal =
  | 'good_reproduce'          // "This worked well — reproduce this pattern"
  | 'too_generic'             // "Too generic — needs more specificity"
  | 'too_commercial'          // "Feels too salesy"
  | 'too_ai_like'             // "Reads like AI output — weak naturalness"
  | 'weak_swedish'            // "Swedish phrasing is unnatural"
  | 'wrong_audience'          // "Wrong audience for this content"
  | 'weak_creative_angle'     // "Creative angle did not land"
  | 'avoid_topic'             // "Do not revisit this topic soon"
  | 'avoid_cta'               // "CTA felt premature or unwanted"
  | 'future_boost_candidate'  // "Worth boosting if paid channel opens"
  | 'pause_category';         // "Pause this category for now"

// ─── Core domain objects ──────────────────────────────────────────────────────

export interface CampaignCardInput {
  objective: ContentObjective;
  target_audience: TargetAudience;
  source_basis: SourceBasis;
  driver_insight: string;
  content_pillar: ContentPillar;
  creative_angle: CreativeAngle;
  emotional_tone: EmotionalTone;
  format: PostFormat;
  cta_type: CtaType;
  planned_channel: PlannedChannel;
  planned_week?: string;       // ISO week e.g. "2026-W26"
  planned_day_of_week?: number; // 1=Mon … 7=Sun
  suggested_slot_time?: string; // e.g. "09:00"
  visual_family?: string;       // placeholder for future visual theming
}

export interface CampaignCard extends CampaignCardInput {
  id: string;
  topic_signature: string;
  angle_signature: string;
  risk_level: RiskLevel;
  draft_text?: string;
  hashtag_set?: string[];
  lifecycle_status: CardLifecycleStatus;
  similarity_warning?: string;
  blocked_reason?: string;
  feedback_signals?: FeedbackSignal[];
  scheduled_post_id?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// ─── Content memory (for anti-repetition checks) ──────────────────────────────

export interface ContentMemoryEntry {
  topic_signature: string;
  angle_signature: string;
  content_pillar: ContentPillar;
  format: PostFormat;
  cta_type: CtaType;
  hashtag_set: string[];
  post_text: string;
  planned_date: string; // ISO date string (YYYY-MM-DD)
}

// ─── Anti-repetition ─────────────────────────────────────────────────────────

export interface AntiRepetitionViolation {
  rule: string;
  message: string;
  severity: 'block' | 'warn';
}

// ─── Weekly plan ─────────────────────────────────────────────────────────────

export interface WeeklyPlan {
  week: string;              // ISO week e.g. "2026-W26"
  cards: CampaignCard[];
  pillar_ratio: {
    practical:   number;    // fraction 0–1
    recognition: number;
    community:   number;
    acquisition: number;
  };
  cta_count: number;
  warnings: string[];
  generated_at: string;     // ISO datetime
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface CampaignCardValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Template context ─────────────────────────────────────────────────────────

export interface TemplateContext {
  audience: TargetAudience;
  variant: number;           // 0-based rotation index
  include_cta: boolean;
  driverNord_line: boolean;  // include "Du kör. Vi hjälper dig hitta rätt uppdrag."
}
