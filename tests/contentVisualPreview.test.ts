// tests/contentVisualPreview.test.ts
//
// Tests for visual preview generation — SVG output for branded_graphic,
// concept description for other types, safety boundaries.
//
// SAFETY TESTS (non-negotiable):
//   ✗ No external API calls
//   ✗ No Facebook API calls
//   ✗ No image downloads
//   ✓ All previews labeled INTERN FÖRHANDSVISNING or similar

import { describe, it, expect, vi } from 'vitest';
import { generateVisualPreview, generateBrandedGraphicSvg } from '../lib/content/visualPreview';
import { BRAND_COLORS, BRAND_NAME, BRAND_LINE } from '../lib/content/creativeBible';
import type { VisualProductionPlan } from '../lib/content/visualTypes';

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makePlan(overrides: Partial<VisualProductionPlan> = {}): VisualProductionPlan {
  const now = new Date().toISOString();
  return {
    id:                      'plan-preview-1',
    campaign_card_id:        'card-123',
    visual_objective:        'Test preview generation',
    asset_strategy:          'branded_graphic',
    asset_strategy_reason:   'Branded graphic appropriate',
    visual_family:           'operational_intelligence',
    scene_type:              'infographic_education',
    subject_type:            'no_subject',
    setting:                 'branded_background',
    transport_context:       'none',
    mood:                    'informative_clear',
    time_of_day:             'not_applicable',
    light_condition:         'not_applicable',
    composition_direction:   'text_centered_minimal',
    text_overlay_structure:  'headline_plus_support',
    proposed_headline:       'YKB-krav för CE-förare',
    proposed_support_line:   'drivernord.com',
    max_word_count_on_image: 5,
    format_recommendation:   'portrait_1080x1350',
    required_brand_elements: ['brand_name_or_logo', 'brand_color_presence'],
    prohibited_elements:     ['external_company_logos'],
    provenance_status:       'branded_graphic_ready',
    visual_risk_level:       'low',
    gate_outcome:            'ready_for_internal_preview',
    gate_findings:           ['Clean plan'],
    lifecycle_status:        'draft',
    generated_by:            'system',
    created_at:              now,
    updated_at:              now,
    ...overrides,
  };
}

// ─── Preview type selection ───────────────────────────────────────────────────

describe('generateVisualPreview — preview type selection', () => {
  it('returns branded_graphic_svg for branded_graphic strategy', () => {
    const spec = generateVisualPreview('card-123', makePlan());
    expect(spec.preview_type).toBe('branded_graphic_svg');
  });

  it('returns concept_description for real_asset strategy', () => {
    const spec = generateVisualPreview('card-123', makePlan({ asset_strategy: 'real_asset', provenance_status: 'unverified' }));
    expect(spec.preview_type).toBe('concept_description');
  });

  it('returns concept_description for future_ai_generated strategy', () => {
    const spec = generateVisualPreview('card-123', makePlan({ asset_strategy: 'future_ai_generated', provenance_status: 'unverified' }));
    expect(spec.preview_type).toBe('concept_description');
  });

  it('returns concept_description for no_visual_needed strategy', () => {
    const spec = generateVisualPreview('card-123', makePlan({ asset_strategy: 'no_visual_needed' }));
    expect(spec.preview_type).toBe('concept_description');
  });
});

// ─── Safety boundaries ────────────────────────────────────────────────────────

describe('generateVisualPreview — safety boundaries', () => {
  it('always sets is_internal_only to true', () => {
    const spec = generateVisualPreview('card-123', makePlan());
    expect(spec.is_internal_only).toBe(true);
  });

  it('always includes a disclaimer', () => {
    const strategies = ['branded_graphic', 'real_asset', 'future_ai_generated', 'no_visual_needed'] as const;
    for (const strategy of strategies) {
      const spec = generateVisualPreview('card-123', makePlan({ asset_strategy: strategy, provenance_status: 'unverified' }));
      expect(spec.disclaimer.length).toBeGreaterThan(0);
    }
  });

  it('disclaimer mentions INTERN for branded_graphic', () => {
    const spec = generateVisualPreview('card-123', makePlan());
    expect(spec.disclaimer.toUpperCase()).toContain('INTERN');
  });

  it('disclaimer mentions INTERN for real_asset', () => {
    const spec = generateVisualPreview('card-123', makePlan({ asset_strategy: 'real_asset', provenance_status: 'unverified' }));
    expect(spec.disclaimer.toUpperCase()).toContain('INTERN');
  });

  it('does NOT mention Facebook anywhere in the output', () => {
    const spec = generateVisualPreview('card-123', makePlan());
    const allText = JSON.stringify(spec);
    expect(allText.toLowerCase()).not.toContain('facebook');
    expect(allText.toLowerCase()).not.toContain('meta api');
  });

  it('does NOT include any external resource URLs (no external calls)', () => {
    const spec = generateVisualPreview('card-123', makePlan());
    const allText = JSON.stringify(spec);
    // SVG xmlns="http://www.w3.org/2000/svg" is a namespace declaration — not a request.
    // We check there are no src= or href= attributes pointing to external content.
    expect(allText).not.toMatch(/\ssrc=["'][^"']+["']/);
    expect(allText).not.toMatch(/\shref=["'][^"']+["']/);
    expect(allText).not.toMatch(/xlink:href/);
  });
});

// ─── SVG content ──────────────────────────────────────────────────────────────

describe('generateVisualPreview — SVG content for branded_graphic', () => {
  it('svg_content is present and non-empty', () => {
    const spec = generateVisualPreview('card-123', makePlan());
    expect(spec.svg_content).toBeDefined();
    expect(spec.svg_content!.length).toBeGreaterThan(100);
  });

  it('SVG is valid XML (starts with <svg)', () => {
    const spec = generateVisualPreview('card-123', makePlan());
    expect(spec.svg_content!.trim().startsWith('<svg')).toBe(true);
  });

  it('SVG contains brand color', () => {
    const spec = generateVisualPreview('card-123', makePlan());
    expect(spec.svg_content).toContain(BRAND_COLORS.primary_dark);
  });

  it('SVG contains brand name', () => {
    const spec = generateVisualPreview('card-123', makePlan());
    expect(spec.svg_content).toContain(BRAND_NAME);
  });

  it('SVG contains brand line', () => {
    const spec = generateVisualPreview('card-123', makePlan());
    expect(spec.svg_content).toContain('Du kör');
  });

  it('SVG contains INTERN FÖRHANDSVISNING watermark', () => {
    const spec = generateVisualPreview('card-123', makePlan());
    expect(spec.svg_content).toContain('INTERN FÖRHANDSVISNING');
  });

  it('SVG headline contains proposed text', () => {
    const plan = makePlan({ proposed_headline: 'Rubrik för testning' });
    const spec  = generateVisualPreview('card-123', plan);
    expect(spec.svg_content).toContain('Rubrik');
  });
});

// ─── generateBrandedGraphicSvg directly ──────────────────────────────────────

describe('generateBrandedGraphicSvg', () => {
  it('returns valid SVG string', () => {
    const svg = generateBrandedGraphicSvg({
      headline: 'Testrad',
      family: 'operational_intelligence',
      scene: 'infographic_education',
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('handles missing headline gracefully', () => {
    const svg = generateBrandedGraphicSvg({
      family: 'community_conversation',
      scene: 'community_prompt',
    });
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('undefined');
    expect(svg).not.toContain('null');
  });

  it('escapes XML-special characters in headline', () => {
    const svg = generateBrandedGraphicSvg({
      headline: 'Test & Rätt <CE>',
      family: 'operational_intelligence',
      scene: 'infographic_education',
    });
    expect(svg).not.toContain('<CE>');         // raw < not present
    expect(svg).toContain('&amp;');            // & escaped
  });

  it('does not contain any src= or href= attributes (no external requests)', () => {
    const svg = generateBrandedGraphicSvg({
      headline: 'Testrubrik',
      support_line: 'Stödtext här',
      family: 'operational_intelligence',
      scene: 'infographic_education',
    });
    expect(svg).not.toMatch(/\ssrc=/);
    expect(svg).not.toMatch(/\shref=/);
    expect(svg).not.toMatch(/\sxlink:href=/);
  });
});

// ─── Concept description ──────────────────────────────────────────────────────

describe('generateVisualPreview — concept description', () => {
  it('concept_description is non-empty', () => {
    const spec = generateVisualPreview('card-123', makePlan({ asset_strategy: 'real_asset', provenance_status: 'unverified' }));
    expect(spec.concept_description.length).toBeGreaterThan(10);
  });

  it('copy_hierarchy reflects proposed_headline', () => {
    const plan = makePlan({ asset_strategy: 'real_asset', provenance_status: 'unverified', proposed_headline: 'Min rubrik' });
    const spec  = generateVisualPreview('card-123', plan);
    expect(spec.copy_hierarchy).toContain('Min rubrik');
  });

  it('format_notes describes the format', () => {
    const spec = generateVisualPreview('card-123', makePlan({ asset_strategy: 'real_asset', provenance_status: 'unverified' }));
    expect(spec.format_notes).toContain('1080');
  });
});

// ─── campaign_card_id and visual_plan_id ──────────────────────────────────────

describe('generateVisualPreview — identifiers', () => {
  it('sets campaign_card_id correctly', () => {
    const spec = generateVisualPreview('card-xyz', makePlan());
    expect(spec.campaign_card_id).toBe('card-xyz');
  });

  it('sets visual_plan_id from plan.id', () => {
    const spec = generateVisualPreview('card-123', makePlan({ id: 'plan-99' }));
    expect(spec.visual_plan_id).toBe('plan-99');
  });
});
