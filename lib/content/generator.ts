// lib/content/generator.ts
//
// Swedish draft generation from a CampaignCard — deterministic, no external AI.
// Pure — no DB, no I/O.
//
// Generates a full draft text + hashtag set from a CampaignCard by:
//   1. Selecting the right template variant (pillar × angle × audience × week rotation)
//   2. Building a TemplateContext from the card
//   3. Running risk classification on the generated text
//   4. Attaching an appropriate hashtag set

import type {
  CampaignCard,
  CampaignCardInput,
  TemplateContext,
  RiskLevel,
} from './types';
import { getTemplate, buildHashtagSet } from './templates';
import { classifyCardRisk, scanTextForRisk } from './riskClassifier';
import { buildTopicSignature, buildAngleSignature } from './memory';

// ─── Generation input ─────────────────────────────────────────────────────────

export interface GeneratorInput {
  card: CampaignCardInput;
  week_index: number; // 0-based ISO week number (used for variant rotation)
}

export interface GeneratorResult {
  draft_text: string;
  hashtag_set: string[];
  risk_level: RiskLevel;
  risk_reason: string;
  topic_signature: string;
  angle_signature: string;
}

// ─── Draft generator ──────────────────────────────────────────────────────────

export function generateDraft(input: GeneratorInput): GeneratorResult {
  const { card, week_index } = input;

  const ctx: TemplateContext = {
    audience:        card.target_audience,
    variant:         week_index,
    include_cta:     card.cta_type !== 'none',
    driverNord_line: card.content_pillar === 'recognition',
  };

  const draft_text = getTemplate(card.content_pillar, card.creative_angle, ctx);

  // Post-generation risk check — catches any text that slipped through
  const textFindings = scanTextForRisk(draft_text);
  const structuralRisk = classifyCardRisk(card, draft_text);

  const risk_level: RiskLevel =
    textFindings.length > 0 || structuralRisk.risk_level === 'high' ? 'high' : 'low';

  const risk_reason =
    risk_level === 'high'
      ? [
          ...textFindings.map((f) => f.reason),
          ...(structuralRisk.risk_level === 'high' ? [structuralRisk.reason] : []),
        ].join('; ')
      : 'No high-risk patterns detected';

  const hashtag_set = buildHashtagSet(
    card.content_pillar,
    card.target_audience,
    week_index
  );

  const topic_signature = buildTopicSignature(
    card.content_pillar,
    card.creative_angle,
    card.driver_insight
  );

  const angle_signature = buildAngleSignature(
    card.content_pillar,
    card.creative_angle,
    card.target_audience
  );

  return {
    draft_text,
    hashtag_set,
    risk_level,
    risk_reason,
    topic_signature,
    angle_signature,
  };
}

// ─── Full card enrichment ─────────────────────────────────────────────────────
// Takes an existing CampaignCard and adds draft_text + hashtag_set
// Returns a new card object (immutable update)

export function enrichCardWithDraft(
  card: CampaignCard,
  week_index: number
): CampaignCard {
  const result = generateDraft({ card, week_index });

  return {
    ...card,
    draft_text:       result.draft_text,
    hashtag_set:      result.hashtag_set,
    risk_level:       result.risk_level,
    topic_signature:  result.topic_signature,
    angle_signature:  result.angle_signature,
    lifecycle_status:
      result.risk_level === 'high' ? 'held' : card.lifecycle_status,
    blocked_reason:
      result.risk_level === 'high' ? `Risk: ${result.risk_reason}` : card.blocked_reason,
    updated_at: new Date(),
  };
}

// ─── Character count helpers ──────────────────────────────────────────────────

export const FACEBOOK_SOFT_LIMIT = 400;
export const WHATSAPP_SOFT_LIMIT = 500;

export interface LengthAssessment {
  char_count: number;
  within_facebook: boolean;
  within_whatsapp: boolean;
  warning?: string;
}

export function assessLength(text: string): LengthAssessment {
  const char_count = text.length;
  return {
    char_count,
    within_facebook: char_count <= FACEBOOK_SOFT_LIMIT,
    within_whatsapp: char_count <= WHATSAPP_SOFT_LIMIT,
    warning:
      char_count > WHATSAPP_SOFT_LIMIT
        ? `Text is ${char_count} chars — exceeds both Facebook (${FACEBOOK_SOFT_LIMIT}) and WhatsApp (${WHATSAPP_SOFT_LIMIT}) soft limits`
        : char_count > FACEBOOK_SOFT_LIMIT
        ? `Text is ${char_count} chars — exceeds Facebook soft limit (${FACEBOOK_SOFT_LIMIT})`
        : undefined,
  };
}
