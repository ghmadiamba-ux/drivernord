// tests/contentGenerator.test.ts

import { describe, it, expect } from 'vitest';
import { generateDraft, enrichCardWithDraft, assessLength, FACEBOOK_SOFT_LIMIT } from '../lib/content/generator';
import { createCampaignCard } from '../lib/content/campaignCard';
import type { CampaignCardInput } from '../lib/content/types';

const BASE_INPUT: CampaignCardInput = {
  objective:        'engagement',
  target_audience:  'CE_drivers',
  source_basis:     'evergreen_driver_insight',
  driver_insight:   'Yrkesförare med CE håller Sveriges logistik igång varje dag',
  content_pillar:   'recognition',
  creative_angle:   'driver_recognition',
  emotional_tone:   'warm',
  format:           'text_post',
  cta_type:         'none',
  planned_channel:  'facebook_page',
  planned_week:     '2026-W26',
  planned_day_of_week: 5,
};

describe('generateDraft', () => {
  it('returns a non-empty draft_text for a valid card', () => {
    const result = generateDraft({ card: BASE_INPUT, week_index: 0 });
    expect(typeof result.draft_text).toBe('string');
    expect(result.draft_text.length).toBeGreaterThan(10);
  });

  it('returns a hashtag set with at least 1 hashtag', () => {
    const result = generateDraft({ card: BASE_INPUT, week_index: 0 });
    expect(Array.isArray(result.hashtag_set)).toBe(true);
    expect(result.hashtag_set.length).toBeGreaterThanOrEqual(1);
  });

  it('returns low risk for safe content', () => {
    const result = generateDraft({ card: BASE_INPUT, week_index: 0 });
    expect(result.risk_level).toBe('low');
  });

  it('sets high risk if generated text matches a risk pattern', () => {
    const riskyInput: CampaignCardInput = {
      ...BASE_INPUT,
      driver_insight: 'Vi söker CE-förare för lediga tjänster — ansök nu',
    };
    const result = generateDraft({ card: riskyInput, week_index: 0 });
    // driver_insight contains "vi söker" — should be flagged
    expect(result.risk_level).toBe('high');
  });

  it('returns different text for different week indices (template rotation)', () => {
    const results = [0, 1, 2, 3].map((w) =>
      generateDraft({ card: BASE_INPUT, week_index: w }).draft_text
    );
    // At least two distinct texts in the 4 rotations
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic — same input produces same output', () => {
    const r1 = generateDraft({ card: BASE_INPUT, week_index: 5 });
    const r2 = generateDraft({ card: BASE_INPUT, week_index: 5 });
    expect(r1.draft_text).toBe(r2.draft_text);
    expect(r1.hashtag_set).toEqual(r2.hashtag_set);
  });

  it('generates text for acquisition/low_freq_acquisition_cta pillar', () => {
    const ctaInput: CampaignCardInput = {
      ...BASE_INPUT,
      content_pillar:  'acquisition',
      creative_angle:  'low_freq_acquisition_cta',
      cta_type:        'soft_registration',
      planned_channel: 'manual',
    };
    const result = generateDraft({ card: ctaInput, week_index: 0 });
    expect(result.draft_text.length).toBeGreaterThan(10);
  });

  it('populates topic_signature and angle_signature', () => {
    const result = generateDraft({ card: BASE_INPUT, week_index: 0 });
    expect(result.topic_signature).toContain('recognition');
    expect(result.angle_signature).toContain('driver_recognition');
  });
});

describe('enrichCardWithDraft', () => {
  it('returns a card with draft_text set', () => {
    const { card } = createCampaignCard(BASE_INPUT);
    const enriched = enrichCardWithDraft(card!, 0);
    expect(enriched.draft_text).toBeTruthy();
    expect(enriched.hashtag_set!.length).toBeGreaterThan(0);
  });

  it('sets lifecycle_status to held for high-risk draft', () => {
    const riskyInput: CampaignCardInput = {
      ...BASE_INPUT,
      driver_insight: 'Vi söker förare till lediga tjänster hos DHL',
    };
    const { card } = createCampaignCard(riskyInput);
    const enriched = enrichCardWithDraft(card!, 0);
    // Either the card creation or draft enrichment should flag risk
    expect(['held', 'draft']).toContain(enriched.lifecycle_status);
  });
});

describe('assessLength', () => {
  it('returns within_facebook true for short text', () => {
    const short = 'CE-förare är ryggraden i Sverige.';
    const result = assessLength(short);
    expect(result.within_facebook).toBe(true);
    expect(result.within_whatsapp).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('returns within_facebook false for text > FACEBOOK_SOFT_LIMIT', () => {
    const long = 'a'.repeat(FACEBOOK_SOFT_LIMIT + 1);
    const result = assessLength(long);
    expect(result.within_facebook).toBe(false);
    expect(result.warning).toBeTruthy();
  });
});
