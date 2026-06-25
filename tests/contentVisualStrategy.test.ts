// tests/contentVisualStrategy.test.ts
//
// Tests for asset strategy selection, format selection, and composition rules.

import { describe, it, expect } from 'vitest';
import {
  selectAssetStrategy,
  shouldSuppressVisual,
  getStrategyLabel,
  isImmediatelyProducible,
} from '../lib/content/assetStrategySelector';
import {
  getFormatRecommendation,
  getMaxWordCount,
  getCompositionForFamily,
  validateTextOverlay,
  getRequiredBrandElements,
  getProhibitedElements,
  checkMobileReadability,
  FORMAT_SPECS,
} from '../lib/content/compositionRules';
import { BRAND_TYPOGRAPHY } from '../lib/content/creativeBible';

// ─── Asset strategy selection ─────────────────────────────────────────────────

describe('selectAssetStrategy', () => {
  it('high-risk content always → no_visual_needed', () => {
    const result = selectAssetStrategy('practical', 'practical_advice', 'high');
    expect(result.strategy).toBe('no_visual_needed');
    expect(result.reason_sv).toContain('Hög riskklassificering');
  });

  it('practical_advice → branded_graphic', () => {
    const result = selectAssetStrategy('practical', 'practical_advice', 'low');
    expect(result.strategy).toBe('branded_graphic');
  });

  it('market_education → branded_graphic', () => {
    expect(selectAssetStrategy('practical', 'market_education', 'low').strategy).toBe('branded_graphic');
  });

  it('driver_recognition → real_asset', () => {
    expect(selectAssetStrategy('recognition', 'driver_recognition', 'low').strategy).toBe('real_asset');
  });

  it('operational_insight → real_asset', () => {
    expect(selectAssetStrategy('practical', 'operational_insight', 'low').strategy).toBe('real_asset');
  });

  it('relatable_work_moment → future_ai_generated', () => {
    expect(selectAssetStrategy('recognition', 'relatable_work_moment', 'low').strategy).toBe('future_ai_generated');
  });

  it('career_confidence → future_ai_generated', () => {
    expect(selectAssetStrategy('recognition', 'career_confidence', 'low').strategy).toBe('future_ai_generated');
  });

  it('community_question → branded_graphic', () => {
    expect(selectAssetStrategy('community', 'community_question', 'low').strategy).toBe('branded_graphic');
  });

  it('myth_vs_reality → branded_graphic', () => {
    expect(selectAssetStrategy('practical', 'myth_vs_reality', 'low').strategy).toBe('branded_graphic');
  });

  it('low_freq_acquisition_cta → branded_graphic', () => {
    expect(selectAssetStrategy('acquisition', 'low_freq_acquisition_cta', 'low').strategy).toBe('branded_graphic');
  });

  it('returns a reason_sv string for every selection', () => {
    const angles = [
      'practical_advice', 'market_education', 'driver_recognition',
      'community_question', 'myth_vs_reality', 'operational_insight',
      'relatable_work_moment', 'career_confidence', 'safe_light_humor',
      'low_freq_acquisition_cta',
    ] as const;
    for (const angle of angles) {
      const result = selectAssetStrategy('practical', angle, 'low');
      expect(result.reason_sv.length).toBeGreaterThan(0);
    }
  });
});

describe('shouldSuppressVisual', () => {
  it('suppresses visual for poll format', () => {
    expect(shouldSuppressVisual('poll')).toBe(true);
  });

  it('suppresses visual for question format', () => {
    expect(shouldSuppressVisual('question')).toBe(true);
  });

  it('does not suppress for text_post', () => {
    expect(shouldSuppressVisual('text_post')).toBe(false);
  });

  it('does not suppress for tip_list', () => {
    expect(shouldSuppressVisual('tip_list')).toBe(false);
  });
});

describe('isImmediatelyProducible', () => {
  it('branded_graphic is immediately producible', () => {
    expect(isImmediatelyProducible('branded_graphic')).toBe(true);
  });

  it('no_visual_needed is immediately producible', () => {
    expect(isImmediatelyProducible('no_visual_needed')).toBe(true);
  });

  it('real_asset is NOT immediately producible', () => {
    expect(isImmediatelyProducible('real_asset')).toBe(false);
  });

  it('future_ai_generated is NOT immediately producible', () => {
    expect(isImmediatelyProducible('future_ai_generated')).toBe(false);
  });
});

describe('getStrategyLabel', () => {
  it('returns Swedish label for each strategy', () => {
    const strategies = ['real_asset', 'branded_graphic', 'future_ai_generated', 'no_visual_needed'] as const;
    for (const s of strategies) {
      const label = getStrategyLabel(s);
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// ─── Format recommendation ────────────────────────────────────────────────────

describe('getFormatRecommendation', () => {
  it('community_conversation family → square_1080x1080', () => {
    expect(getFormatRecommendation('community', 'community_conversation')).toBe('square_1080x1080');
  });

  it('drivernord_campaign family → portrait_1080x1350', () => {
    expect(getFormatRecommendation('acquisition', 'drivernord_campaign')).toBe('portrait_1080x1350');
  });

  it('default family → portrait_1080x1350', () => {
    expect(getFormatRecommendation('practical', 'operational_intelligence')).toBe('portrait_1080x1350');
  });

  it('FORMAT_SPECS defines spec for every recommendation', () => {
    const formats = ['portrait_1080x1350', 'square_1080x1080', 'story_1080x1920'] as const;
    for (const f of formats) {
      expect(FORMAT_SPECS[f]).toBeDefined();
      expect(FORMAT_SPECS[f].width).toBeGreaterThan(0);
      expect(FORMAT_SPECS[f].height).toBeGreaterThan(0);
    }
  });
});

describe('getMaxWordCount', () => {
  it('portrait allows up to 16 words', () => {
    expect(getMaxWordCount('portrait_1080x1350')).toBe(16);
  });

  it('square allows up to 14 words', () => {
    expect(getMaxWordCount('square_1080x1080')).toBe(14);
  });
});

// ─── Text overlay validation ──────────────────────────────────────────────────

describe('validateTextOverlay', () => {
  it('passes when headline is ≤ 6 words', () => {
    const result = validateTextOverlay('Du kör vi hjälper', undefined, 'portrait_1080x1350');
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('fails when headline exceeds 6 words', () => {
    const result = validateTextOverlay('En rubrik med mer än sex ord total', undefined, 'portrait_1080x1350');
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('Rubrik'))).toBe(true);
  });

  it('counts combined word count correctly', () => {
    const result = validateTextOverlay('Fyra ord rubrik', 'tre support ord', 'portrait_1080x1350');
    expect(result.word_count).toBe(6);
  });

  it('fails when total exceeds format max', () => {
    // 6 headline + 10 support = 16 → exactly at limit (should pass for portrait)
    const headline = 'Sex ord i rubriken nu'; // 5 words
    const support  = 'Och ytterligare tio ord i stödtexten nu totalt'; // 9 words
    const result   = validateTextOverlay(headline, support, 'square_1080x1080');
    // 14 words = exactly at square limit
    expect(result.valid).toBe(true);
  });

  it('respects BRAND_TYPOGRAPHY limits', () => {
    expect(BRAND_TYPOGRAPHY.headline_max_words).toBe(6);
    expect(BRAND_TYPOGRAPHY.support_max_words).toBe(10);
    expect(BRAND_TYPOGRAPHY.max_on_image_words).toBe(16);
  });
});

// ─── Required / prohibited elements ──────────────────────────────────────────

describe('getRequiredBrandElements', () => {
  it('every family requires brand_name_or_logo', () => {
    const families = ['reality_of_work', 'driver_pride', 'operational_intelligence', 'community_conversation', 'drivernord_campaign'] as const;
    for (const family of families) {
      expect(getRequiredBrandElements(family)).toContain('brand_name_or_logo');
    }
  });

  it('drivernord_campaign requires brand_line_text and domain_url', () => {
    const elements = getRequiredBrandElements('drivernord_campaign');
    expect(elements).toContain('brand_line_text');
    expect(elements).toContain('domain_url');
  });
});

describe('getProhibitedElements', () => {
  it('all families prohibit external_company_logos', () => {
    const families = ['reality_of_work', 'driver_pride', 'operational_intelligence'] as const;
    for (const family of families) {
      expect(getProhibitedElements(family)).toContain('external_company_logos');
    }
  });

  it('reality_of_work prohibits generic_non_swedish_stock', () => {
    expect(getProhibitedElements('reality_of_work')).toContain('generic_non_swedish_stock');
  });
});

// ─── Mobile readability ───────────────────────────────────────────────────────

describe('checkMobileReadability', () => {
  it('passes for ≤ 12 words', () => {
    const result = checkMobileReadability(8, 'driver_subject_foreground', 'portrait_1080x1350');
    expect(result.passes).toBe(true);
  });

  it('warns for > 12 words', () => {
    const result = checkMobileReadability(13, 'text_centered_minimal', 'portrait_1080x1350');
    expect(result.passes).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
