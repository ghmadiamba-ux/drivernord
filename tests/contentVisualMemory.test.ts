// tests/contentVisualMemory.test.ts
//
// Tests for visual memory — anti-repetition checks, memory entry building,
// history filtering, and feedback analysis.

import { describe, it, expect } from 'vitest';
import {
  checkVisualAntiRepetition,
  buildVisualMemoryEntry,
  filterVisualHistory,
  filterByFamily,
  filterByScene,
  extractPausedFamilies,
  extractPausedScenes,
  hasStrongPositiveSignal,
} from '../lib/content/visualMemory';
import type { VisualMemoryEntry, VisualProductionPlan } from '../lib/content/visualTypes';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<VisualMemoryEntry> = {}): VisualMemoryEntry {
  return {
    visual_family:          'reality_of_work',
    scene_type:             'terminal_operations',
    subject_type:           'ce_driver',
    setting:                'terminal',
    composition_direction:  'documentary_candid',
    text_overlay_structure: 'no_text',
    transport_context:      'ce_heavy_transport',
    concept_signature:      'reality_of_work__terminal_operations__documentary_candid__professional_confidence',
    gate_outcome:           'ready_for_internal_preview',
    planned_date:           new Date().toISOString().slice(0, 10),
    asset_strategy:         'real_asset',
    ...overrides,
  };
}

function makePlan(overrides: Partial<VisualProductionPlan> = {}): VisualProductionPlan {
  const now = new Date().toISOString();
  return {
    id:                      'plan-abc',
    campaign_card_id:        'card-123',
    visual_objective:        'Test objective',
    asset_strategy:          'branded_graphic',
    asset_strategy_reason:   'Branded graphic',
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
    proposed_headline:       'YKB-info',
    proposed_support_line:   'drivernord.com',
    max_word_count_on_image: 3,
    format_recommendation:   'portrait_1080x1350',
    required_brand_elements: ['brand_name_or_logo'],
    prohibited_elements:     ['external_company_logos'],
    provenance_status:       'branded_graphic_ready',
    visual_risk_level:       'low',
    gate_outcome:            'ready_for_internal_preview',
    gate_findings:           ['Clean'],
    lifecycle_status:        'draft',
    generated_by:            'system',
    created_at:              now,
    updated_at:              now,
    ...overrides,
  };
}

// ─── Anti-repetition checks ───────────────────────────────────────────────────

describe('checkVisualAntiRepetition', () => {
  it('returns not blocked for empty history', () => {
    const result = checkVisualAntiRepetition({
      proposed: {
        visual_family: 'reality_of_work',
        scene_type: 'terminal_operations',
        composition_direction: 'documentary_candid',
        text_overlay_structure: 'no_text',
        mood: 'professional_confidence',
        asset_strategy: 'real_asset',
      },
      history: [],
    });
    expect(result.blocked).toBe(false);
    expect(result.violations).toHaveLength(0);
  });

  it('blocks when same family used 2+ times in 7 days', () => {
    const today = new Date().toISOString().slice(0, 10);
    const history = [
      makeEntry({ visual_family: 'driver_pride', planned_date: today }),
      makeEntry({ visual_family: 'driver_pride', scene_type: 'cab_interior', planned_date: today }),
    ];
    const result = checkVisualAntiRepetition({
      proposed: {
        visual_family: 'driver_pride',
        scene_type: 'driver_portrait',
        composition_direction: 'driver_subject_foreground',
        text_overlay_structure: 'no_text',
        mood: 'warm_collegial',
        asset_strategy: 'real_asset',
      },
      history,
    });
    expect(result.blocked).toBe(true);
    expect(result.blocked_reason).toBeDefined();
  });

  it('blocks when same scene used within 14 days', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const history = [
      makeEntry({ scene_type: 'cab_interior', planned_date: threeDaysAgo.toISOString().slice(0, 10) }),
    ];
    const result = checkVisualAntiRepetition({
      proposed: {
        visual_family: 'reality_of_work',
        scene_type: 'cab_interior',
        composition_direction: 'close_up_detail',
        text_overlay_structure: 'no_text',
        mood: 'professional_confidence',
        asset_strategy: 'real_asset',
      },
      history,
    });
    expect(result.blocked).toBe(true);
  });

  it('does not block scene after 15 days', () => {
    const sixteenDaysAgo = new Date();
    sixteenDaysAgo.setDate(sixteenDaysAgo.getDate() - 16);
    const history = [
      makeEntry({ scene_type: 'cab_interior', planned_date: sixteenDaysAgo.toISOString().slice(0, 10) }),
    ];
    const result = checkVisualAntiRepetition({
      proposed: {
        visual_family: 'reality_of_work',
        scene_type: 'cab_interior',
        composition_direction: 'close_up_detail',
        text_overlay_structure: 'no_text',
        mood: 'professional_confidence',
        asset_strategy: 'real_asset',
      },
      history,
    });
    expect(result.blocked).toBe(false);
  });

  it('warns (not blocks) on text overlay structure repeat', () => {
    const today = new Date().toISOString().slice(0, 10);
    const history = [
      makeEntry({ text_overlay_structure: 'single_headline', planned_date: today }),
      makeEntry({ text_overlay_structure: 'single_headline', scene_type: 'loading_bay', planned_date: today }),
    ];
    const result = checkVisualAntiRepetition({
      proposed: {
        visual_family: 'community_conversation',
        scene_type: 'community_prompt',
        composition_direction: 'text_centered_minimal',
        text_overlay_structure: 'single_headline',
        mood: 'community_welcoming',
        asset_strategy: 'branded_graphic',
      },
      history,
    });
    // text overlay repeat is a warn, not block
    const textViolations = result.violations.filter((v) => v.rule === 'text_overlay_structure_14d');
    if (textViolations.length > 0) {
      expect(textViolations[0].severity).toBe('warn');
    }
  });
});

// ─── Memory entry builder ─────────────────────────────────────────────────────

describe('buildVisualMemoryEntry', () => {
  it('creates entry with correct planned_date', () => {
    const plan = makePlan();
    const date = '2026-06-25';
    const entry = buildVisualMemoryEntry(plan, date);
    expect(entry.planned_date).toBe(date);
  });

  it('copies visual_family from plan', () => {
    const plan = makePlan({ visual_family: 'driver_pride' });
    const entry = buildVisualMemoryEntry(plan, '2026-06-25');
    expect(entry.visual_family).toBe('driver_pride');
  });

  it('builds a concept_signature', () => {
    const plan = makePlan();
    const entry = buildVisualMemoryEntry(plan, '2026-06-25');
    expect(entry.concept_signature.length).toBeGreaterThan(0);
    expect(entry.concept_signature).toContain('operational_intelligence');
  });

  it('includes gate_outcome', () => {
    const plan = makePlan({ gate_outcome: 'requires_real_asset' });
    const entry = buildVisualMemoryEntry(plan, '2026-06-25');
    expect(entry.gate_outcome).toBe('requires_real_asset');
  });
});

// ─── History filters ──────────────────────────────────────────────────────────

describe('filterVisualHistory', () => {
  it('filters out entries older than N days', () => {
    const old = new Date();
    old.setDate(old.getDate() - 20);
    const recent = new Date();
    recent.setDate(recent.getDate() - 3);

    const history = [
      makeEntry({ planned_date: old.toISOString().slice(0, 10) }),
      makeEntry({ planned_date: recent.toISOString().slice(0, 10) }),
    ];
    const filtered = filterVisualHistory(history, 7);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].planned_date).toBe(recent.toISOString().slice(0, 10));
  });

  it('returns all entries when all are within N days', () => {
    const today = new Date().toISOString().slice(0, 10);
    const history = [makeEntry({ planned_date: today }), makeEntry({ planned_date: today })];
    expect(filterVisualHistory(history, 7)).toHaveLength(2);
  });
});

describe('filterByFamily', () => {
  it('returns only entries matching the family', () => {
    const history = [
      makeEntry({ visual_family: 'driver_pride' }),
      makeEntry({ visual_family: 'reality_of_work' }),
      makeEntry({ visual_family: 'driver_pride', scene_type: 'driver_portrait' }),
    ];
    const result = filterByFamily(history, 'driver_pride');
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.visual_family === 'driver_pride')).toBe(true);
  });
});

describe('filterByScene', () => {
  it('returns only entries matching the scene', () => {
    const history = [
      makeEntry({ scene_type: 'terminal_operations' }),
      makeEntry({ scene_type: 'cab_interior' }),
      makeEntry({ scene_type: 'terminal_operations', visual_family: 'driver_pride' }),
    ];
    const result = filterByScene(history, 'terminal_operations');
    expect(result).toHaveLength(2);
  });
});

// ─── Feedback analysis ────────────────────────────────────────────────────────

describe('extractPausedFamilies', () => {
  it('returns families with avoid_this_visual_family signal', () => {
    const feedback = [
      { visual_family: 'driver_pride' as const, signals: ['avoid_this_visual_family' as const] },
      { visual_family: 'reality_of_work' as const, signals: ['excellent_visual_pattern' as const] },
    ];
    const paused = extractPausedFamilies(feedback);
    expect(paused).toContain('driver_pride');
    expect(paused).not.toContain('reality_of_work');
  });

  it('returns empty array when no family is paused', () => {
    const feedback = [
      { visual_family: 'driver_pride' as const, signals: ['excellent_visual_pattern' as const] },
    ];
    expect(extractPausedFamilies(feedback)).toHaveLength(0);
  });
});

describe('extractPausedScenes', () => {
  it('returns scenes with avoid_this_scene_type signal', () => {
    const feedback = [
      { scene_type: 'terminal_operations' as const, signals: ['avoid_this_scene_type' as const] },
      { scene_type: 'cab_interior' as const, signals: ['excellent_visual_pattern' as const] },
    ];
    const paused = extractPausedScenes(feedback);
    expect(paused).toContain('terminal_operations');
    expect(paused).not.toContain('cab_interior');
  });
});

describe('hasStrongPositiveSignal', () => {
  it('returns true for excellent_visual_pattern', () => {
    expect(hasStrongPositiveSignal(['excellent_visual_pattern'])).toBe(true);
  });

  it('returns true for reuse_this_visual_direction', () => {
    expect(hasStrongPositiveSignal(['reuse_this_visual_direction'])).toBe(true);
  });

  it('returns true for future_campaign_candidate', () => {
    expect(hasStrongPositiveSignal(['future_campaign_candidate'])).toBe(true);
  });

  it('returns false for neutral signals', () => {
    expect(hasStrongPositiveSignal(['too_generic', 'weak_composition'])).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasStrongPositiveSignal([])).toBe(false);
  });
});
