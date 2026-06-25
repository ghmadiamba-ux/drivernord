// tests/contentCampaignCard.test.ts

import { describe, it, expect } from 'vitest';
import {
  validateCampaignCardInput,
  createCampaignCard,
  transitionCard,
  filterReadyCards,
  filterHeldCards,
  filterHighRiskCards,
} from '../lib/content/campaignCard';
import type { CampaignCard, CampaignCardInput } from '../lib/content/types';

const VALID_INPUT: CampaignCardInput = {
  objective:       'engagement',
  target_audience: 'CE_drivers',
  source_basis:    'evergreen_driver_insight',
  driver_insight:  'Yrkesförare med CE håller Sveriges logistik igång varje dag',
  content_pillar:  'recognition',
  creative_angle:  'driver_recognition',
  emotional_tone:  'warm',
  format:          'text_post',
  cta_type:        'none',
  planned_channel: 'facebook_page',
  planned_week:    '2026-W26',
  planned_day_of_week: 5,
  suggested_slot_time: '09:00',
};

// ─── Validation ───────────────────────────────────────────────────────────────

describe('validateCampaignCardInput', () => {
  it('passes for a valid input', () => {
    const result = validateCampaignCardInput(VALID_INPUT);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails for invalid objective', () => {
    const result = validateCampaignCardInput({ ...VALID_INPUT, objective: 'nonexistent' as never });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('objective'))).toBe(true);
  });

  it('fails for invalid pillar', () => {
    const result = validateCampaignCardInput({ ...VALID_INPUT, content_pillar: 'promo' as never });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('content_pillar'))).toBe(true);
  });

  it('fails when angle is not allowed for the pillar', () => {
    const result = validateCampaignCardInput({
      ...VALID_INPUT,
      content_pillar: 'community',
      creative_angle: 'driver_recognition', // not in community angles
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('creative_angle'))).toBe(true);
  });

  it('fails when driver_insight is too short', () => {
    const result = validateCampaignCardInput({ ...VALID_INPUT, driver_insight: 'kort' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('driver_insight'))).toBe(true);
  });

  it('fails when driver_insight exceeds 500 chars', () => {
    const result = validateCampaignCardInput({ ...VALID_INPUT, driver_insight: 'x'.repeat(501) });
    expect(result.valid).toBe(false);
  });

  it('fails for invalid planned_week format', () => {
    const result = validateCampaignCardInput({ ...VALID_INPUT, planned_week: '2026-26' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('planned_week'))).toBe(true);
  });

  it('fails for CTA post targeting facebook_page', () => {
    const result = validateCampaignCardInput({
      ...VALID_INPUT,
      cta_type: 'soft_registration',
      planned_channel: 'facebook_page',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('facebook_page'))).toBe(true);
  });
});

// ─── Card creation ────────────────────────────────────────────────────────────

describe('createCampaignCard', () => {
  it('creates a valid card from valid input', () => {
    const { card, validation } = createCampaignCard(VALID_INPUT);
    expect(validation.valid).toBe(true);
    expect(card).not.toBeNull();
    expect(card!.id).toBeTruthy();
    expect(card!.topic_signature).toBeTruthy();
    expect(card!.angle_signature).toBeTruthy();
    expect(card!.lifecycle_status).toBe('draft');
    expect(card!.risk_level).toBe('low');
    expect(card!.created_by).toBe('system');
  });

  it('returns null card for invalid input', () => {
    const { card, validation } = createCampaignCard({
      ...VALID_INPUT,
      content_pillar: 'invalid' as never,
    });
    expect(card).toBeNull();
    expect(validation.valid).toBe(false);
  });

  it('sets lifecycle_status to held if draft_text is high risk', () => {
    const { card } = createCampaignCard(VALID_INPUT, {
      draft_text: 'Vi söker erfarna CE-förare för anställning hos Schenker.',
    });
    expect(card).not.toBeNull();
    expect(card!.lifecycle_status).toBe('held');
    expect(card!.risk_level).toBe('high');
    expect(card!.blocked_reason).toBeTruthy();
  });

  it('attaches draft_text and hashtag_set if provided', () => {
    const { card } = createCampaignCard(VALID_INPUT, {
      draft_text:  'CE-förare är ryggraden i logistikkedjan.',
      hashtag_set: ['#CEförare'],
    });
    expect(card!.draft_text).toBe('CE-förare är ryggraden i logistikkedjan.');
    expect(card!.hashtag_set).toContain('#CEförare');
  });
});

// ─── Lifecycle transitions ─────────────────────────────────────────────────────

describe('transitionCard', () => {
  function makeCard(status: CampaignCard['lifecycle_status'] = 'draft'): CampaignCard {
    const { card } = createCampaignCard(VALID_INPUT);
    return { ...card!, lifecycle_status: status };
  }

  it('transitions draft → ready on approve', () => {
    const { card, error } = transitionCard(makeCard('draft'), 'approve');
    expect(error).toBeUndefined();
    expect(card.lifecycle_status).toBe('ready');
  });

  it('transitions draft → held on hold', () => {
    const { card } = transitionCard(makeCard('draft'), 'hold');
    expect(card.lifecycle_status).toBe('held');
  });

  it('transitions held → draft on reset_to_draft', () => {
    const { card } = transitionCard(makeCard('held'), 'reset_to_draft');
    expect(card.lifecycle_status).toBe('draft');
  });

  it('cannot approve an archived card', () => {
    const { error } = transitionCard(makeCard('archived'), 'approve');
    expect(error).toBeTruthy();
  });

  it('cannot transition from archived', () => {
    const { error } = transitionCard(makeCard('archived'), 'hold');
    expect(error).toBeTruthy();
  });
});

// ─── Filter helpers ───────────────────────────────────────────────────────────

describe('filterReadyCards / filterHeldCards / filterHighRiskCards', () => {
  const draftCard = createCampaignCard(VALID_INPUT).card!;
  const heldCard  = { ...draftCard, lifecycle_status: 'held' as const };
  const readyCard = { ...draftCard, lifecycle_status: 'ready' as const };
  const highCard  = { ...draftCard, risk_level: 'high' as const };

  const cards = [draftCard, heldCard, readyCard, highCard];

  it('filterReadyCards returns only ready cards', () => {
    expect(filterReadyCards(cards)).toHaveLength(1);
    expect(filterReadyCards(cards)[0]!.lifecycle_status).toBe('ready');
  });

  it('filterHeldCards returns only held cards', () => {
    expect(filterHeldCards(cards)).toHaveLength(1);
    expect(filterHeldCards(cards)[0]!.lifecycle_status).toBe('held');
  });

  it('filterHighRiskCards returns only high-risk cards', () => {
    expect(filterHighRiskCards(cards)).toHaveLength(1);
    expect(filterHighRiskCards(cards)[0]!.risk_level).toBe('high');
  });
});
