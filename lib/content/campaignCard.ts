// lib/content/campaignCard.ts
//
// Campaign card validation and creation for DriverNord Content Engine V1.
// Pure — no DB, no I/O.

import { randomUUID } from 'crypto';
import type {
  CampaignCard,
  CampaignCardInput,
  CampaignCardValidationResult,
  CardLifecycleStatus,
  RiskLevel,
} from './types';
import { PILLAR_ANGLES } from './pillars';
import { classifyCardRisk } from './riskClassifier';
import { buildTopicSignature, buildAngleSignature } from './memory';

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_OBJECTIVES = new Set([
  'reach', 'engagement', 'follow', 'community_growth',
  'registration', 're_engagement', 'market_education',
]);

const VALID_PILLARS = new Set(['practical', 'recognition', 'community', 'acquisition']);

const VALID_ANGLES = new Set([
  'practical_advice', 'market_education', 'driver_recognition',
  'community_question', 'myth_vs_reality', 'operational_insight',
  'relatable_work_moment', 'career_confidence', 'safe_light_humor',
  'low_freq_acquisition_cta',
]);

const VALID_TONES = new Set(['informative', 'warm', 'humorous', 'motivational', 'empowering']);

const VALID_FORMATS = new Set(['text_post', 'poll', 'question', 'tip_list', 'short_story', 'cta']);

const VALID_CTA_TYPES = new Set([
  'none', 'soft_registration', 'community_join', 'website_visit', 'follow_page', 'profile_update',
]);

const VALID_AUDIENCES = new Set([
  'C_drivers', 'CE_drivers', 'D_drivers', 'YKB_holders', 'night_shift_drivers',
  'distribution_drivers', 'fjarrtransport_drivers', 'kylfrys_drivers',
  'logistics_workers', 'all_drivers',
]);

const VALID_SOURCE_BASIS = new Set([
  'evergreen_driver_insight', 'approved_market_signal', 'community_theme', 'editorial_theme',
]);

const VALID_CHANNELS = new Set(['facebook_page', 'whatsapp_group', 'website', 'manual']);

// ISO week format: YYYY-WNN
const ISO_WEEK_RE = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

export function validateCampaignCardInput(
  input: CampaignCardInput
): CampaignCardValidationResult {
  const errors: string[] = [];

  if (!VALID_OBJECTIVES.has(input.objective)) {
    errors.push(`Invalid objective: "${input.objective}"`);
  }
  if (!VALID_PILLARS.has(input.content_pillar)) {
    errors.push(`Invalid content_pillar: "${input.content_pillar}"`);
  }
  if (!VALID_ANGLES.has(input.creative_angle)) {
    errors.push(`Invalid creative_angle: "${input.creative_angle}"`);
  }
  if (!VALID_TONES.has(input.emotional_tone)) {
    errors.push(`Invalid emotional_tone: "${input.emotional_tone}"`);
  }
  if (!VALID_FORMATS.has(input.format)) {
    errors.push(`Invalid format: "${input.format}"`);
  }
  if (!VALID_CTA_TYPES.has(input.cta_type)) {
    errors.push(`Invalid cta_type: "${input.cta_type}"`);
  }
  if (!VALID_AUDIENCES.has(input.target_audience)) {
    errors.push(`Invalid target_audience: "${input.target_audience}"`);
  }
  if (!VALID_SOURCE_BASIS.has(input.source_basis)) {
    errors.push(`Invalid source_basis: "${input.source_basis}"`);
  }
  if (!VALID_CHANNELS.has(input.planned_channel)) {
    errors.push(`Invalid planned_channel: "${input.planned_channel}"`);
  }

  // Pillar ↔ angle compatibility
  if (
    VALID_PILLARS.has(input.content_pillar) &&
    VALID_ANGLES.has(input.creative_angle)
  ) {
    const allowed = PILLAR_ANGLES[input.content_pillar as keyof typeof PILLAR_ANGLES] ?? [];
    if (!allowed.includes(input.creative_angle as never)) {
      errors.push(
        `creative_angle "${input.creative_angle}" is not valid for pillar "${input.content_pillar}". ` +
        `Allowed: ${allowed.join(', ')}`
      );
    }
  }

  // driver_insight must be non-empty
  if (!input.driver_insight || input.driver_insight.trim().length < 10) {
    errors.push('driver_insight must be at least 10 characters');
  }
  if (input.driver_insight && input.driver_insight.trim().length > 500) {
    errors.push('driver_insight must not exceed 500 characters');
  }

  // planned_week format
  if (input.planned_week && !ISO_WEEK_RE.test(input.planned_week)) {
    errors.push(`planned_week must be in YYYY-WNN format, got: "${input.planned_week}"`);
  }

  // planned_day_of_week range
  if (
    input.planned_day_of_week !== undefined &&
    (input.planned_day_of_week < 1 || input.planned_day_of_week > 7)
  ) {
    errors.push(`planned_day_of_week must be 1–7, got: ${input.planned_day_of_week}`);
  }

  // CTA channel consistency — CTA posts should not target facebook_page yet
  if (input.cta_type !== 'none' && input.planned_channel === 'facebook_page') {
    errors.push(
      'CTA posts must not target facebook_page — Facebook publishing is not connected. ' +
      'Use planned_channel: "manual" for CTA posts.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─── Card creation ────────────────────────────────────────────────────────────

export interface CreateCampaignCardResult {
  card: CampaignCard | null;
  validation: CampaignCardValidationResult;
}

export function createCampaignCard(
  input: CampaignCardInput,
  options: {
    draft_text?: string;
    hashtag_set?: string[];
    created_by?: string;
  } = {}
): CreateCampaignCardResult {
  const validation = validateCampaignCardInput(input);
  if (!validation.valid) {
    return { card: null, validation };
  }

  const topic_signature = buildTopicSignature(
    input.content_pillar,
    input.creative_angle,
    input.driver_insight
  );
  const angle_signature = buildAngleSignature(
    input.content_pillar,
    input.creative_angle,
    input.target_audience
  );

  const riskResult = classifyCardRisk(input, options.draft_text);
  const risk_level: RiskLevel = riskResult.risk_level;

  const lifecycle_status: CardLifecycleStatus =
    risk_level === 'high' ? 'held' : 'draft';

  const blocked_reason =
    risk_level === 'high'
      ? `Risk: ${riskResult.reason}`
      : undefined;

  const now = new Date();
  const card: CampaignCard = {
    ...input,
    id: randomUUID(),
    topic_signature,
    angle_signature,
    risk_level,
    lifecycle_status,
    blocked_reason,
    draft_text: options.draft_text,
    hashtag_set: options.hashtag_set,
    created_by: options.created_by ?? 'system',
    created_at: now,
    updated_at: now,
  };

  return { card, validation: { valid: true, errors: [] } };
}

// ─── Lifecycle transitions ─────────────────────────────────────────────────────

export type CardTransition = 'approve' | 'hold' | 'archive' | 'reset_to_draft';

const VALID_CARD_TRANSITIONS: Record<CardLifecycleStatus, CardTransition[]> = {
  draft:    ['approve', 'hold', 'archive'],
  ready:    ['hold', 'archive'],
  held:     ['reset_to_draft', 'archive'],
  archived: [],
};

export function transitionCard(
  card: CampaignCard,
  transition: CardTransition
): { card: CampaignCard; error?: string } {
  const allowed = VALID_CARD_TRANSITIONS[card.lifecycle_status];
  if (!allowed.includes(transition)) {
    return {
      card,
      error: `Cannot apply "${transition}" to a card in state "${card.lifecycle_status}". Allowed: ${allowed.join(', ') || 'none'}`,
    };
  }

  const nextStatus: Record<CardTransition, CardLifecycleStatus> = {
    approve:       'ready',
    hold:          'held',
    archive:       'archived',
    reset_to_draft: 'draft',
  };

  return {
    card: {
      ...card,
      lifecycle_status: nextStatus[transition],
      blocked_reason: transition === 'hold' ? card.blocked_reason : undefined,
      updated_at: new Date(),
    },
  };
}

// ─── Batch helpers ────────────────────────────────────────────────────────────

export function filterReadyCards(cards: CampaignCard[]): CampaignCard[] {
  return cards.filter((c) => c.lifecycle_status === 'ready');
}

export function filterDraftCards(cards: CampaignCard[]): CampaignCard[] {
  return cards.filter((c) => c.lifecycle_status === 'draft');
}

export function filterHeldCards(cards: CampaignCard[]): CampaignCard[] {
  return cards.filter((c) => c.lifecycle_status === 'held');
}

export function filterHighRiskCards(cards: CampaignCard[]): CampaignCard[] {
  return cards.filter((c) => c.risk_level === 'high');
}
