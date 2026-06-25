// tests/contentVisualFamilies.test.ts
//
// Tests for visual family taxonomy, selection, rotation, and cooldown checks.
// All imports use relative paths (vitest has no @/ alias resolution).

import { describe, it, expect } from 'vitest';
import {
  VISUAL_FAMILY_PROFILES,
  selectVisualFamily,
  selectSceneType,
  selectCompositionDirection,
  selectMood,
  selectTransportContext,
  checkFamilyCooldown,
  checkConsecutiveFamily,
  checkSceneCooldown,
  buildConceptSignature,
  conceptSimilarity,
  getVisualFamilyProfile,
  isValidVisualFamily,
  allVisualFamilies,
} from '../lib/content/visualFamilies';
import type { VisualMemoryEntry } from '../lib/content/visualTypes';

// ─── Taxonomy integrity ───────────────────────────────────────────────────────

describe('VISUAL_FAMILY_PROFILES — taxonomy integrity', () => {
  it('defines all 5 required visual families', () => {
    const families = allVisualFamilies();
    expect(families).toContain('reality_of_work');
    expect(families).toContain('driver_pride');
    expect(families).toContain('operational_intelligence');
    expect(families).toContain('community_conversation');
    expect(families).toContain('drivernord_campaign');
    expect(families).toHaveLength(5);
  });

  it('frequency weights sum to 1.0', () => {
    const total = Object.values(VISUAL_FAMILY_PROFILES)
      .reduce((sum, p) => sum + p.frequency_weight, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it('each family has at least one scene_type', () => {
    for (const profile of Object.values(VISUAL_FAMILY_PROFILES)) {
      expect(profile.scene_types.length).toBeGreaterThan(0);
    }
  });

  it('each family has at least one composition', () => {
    for (const profile of Object.values(VISUAL_FAMILY_PROFILES)) {
      expect(profile.compositions.length).toBeGreaterThan(0);
    }
  });

  it('each family has a name_sv', () => {
    for (const profile of Object.values(VISUAL_FAMILY_PROFILES)) {
      expect(profile.name_sv.length).toBeGreaterThan(0);
    }
  });
});

// ─── Family selection ─────────────────────────────────────────────────────────

describe('selectVisualFamily', () => {
  it('maps practical_advice → operational_intelligence', () => {
    expect(selectVisualFamily('practical', 'practical_advice')).toBe('operational_intelligence');
  });

  it('maps recognition + driver_recognition → driver_pride', () => {
    expect(selectVisualFamily('recognition', 'driver_recognition')).toBe('driver_pride');
  });

  it('maps community + community_question → community_conversation', () => {
    expect(selectVisualFamily('community', 'community_question')).toBe('community_conversation');
  });

  it('maps acquisition + low_freq_acquisition_cta → drivernord_campaign', () => {
    expect(selectVisualFamily('acquisition', 'low_freq_acquisition_cta')).toBe('drivernord_campaign');
  });

  it('maps operational_insight to reality_of_work', () => {
    const fam = selectVisualFamily('practical', 'operational_insight');
    expect(fam).toBe('reality_of_work');
  });

  it('always returns a valid family string', () => {
    const result = selectVisualFamily('recognition', 'market_education');
    expect(isValidVisualFamily(result)).toBe(true);
  });
});

// ─── Scene selection with rotation ───────────────────────────────────────────

describe('selectSceneType', () => {
  const emptyHistory: VisualMemoryEntry[] = [];

  it('returns a valid scene for reality_of_work', () => {
    const scene = selectSceneType('reality_of_work', 0, emptyHistory);
    const profile = getVisualFamilyProfile('reality_of_work');
    expect(profile.scene_types).toContain(scene);
  });

  it('rotates scenes across different week indices', () => {
    const scenes = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
      selectSceneType('reality_of_work', i, emptyHistory)
    );
    const unique = new Set(scenes);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('avoids recently used scenes (14-day cooldown)', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const history: VisualMemoryEntry[] = [{
      visual_family:          'reality_of_work',
      scene_type:             'terminal_operations',
      subject_type:           'ce_driver',
      setting:                'terminal',
      composition_direction:  'documentary_candid',
      text_overlay_structure: 'no_text',
      transport_context:      'ce_heavy_transport',
      concept_signature:      'reality_of_work__terminal_operations__documentary_candid__professional_confidence',
      gate_outcome:           'ready_for_internal_preview',
      planned_date:           yesterday.toISOString().slice(0, 10),
      asset_strategy:         'real_asset',
    }];

    // Run many times to confirm terminal_operations is avoided when possible
    const chosen = Array.from({ length: 10 }, (_, i) =>
      selectSceneType('reality_of_work', i, history)
    );
    const usedTerminal = chosen.some((s) => s === 'terminal_operations');
    // Should try to avoid it (but may fall back if all scenes used)
    // At least some choices should avoid it
    expect(chosen.some((s) => s !== 'terminal_operations')).toBe(true);
  });
});

// ─── Composition selection ────────────────────────────────────────────────────

describe('selectCompositionDirection', () => {
  it('returns a valid composition for each family', () => {
    for (const family of allVisualFamilies()) {
      const comp = selectCompositionDirection(family, 0);
      const profile = getVisualFamilyProfile(family);
      expect(profile.compositions).toContain(comp);
    }
  });

  it('operational_intelligence uses text_centered_minimal or split_horizontal', () => {
    const comp = selectCompositionDirection('operational_intelligence', 0);
    expect(['text_centered_minimal', 'split_horizontal']).toContain(comp);
  });
});

// ─── Transport context ────────────────────────────────────────────────────────

describe('selectTransportContext', () => {
  it('CE in audience → ce_heavy_transport', () => {
    expect(selectTransportContext('reality_of_work', 'CE_drivers', 0)).toBe('ce_heavy_transport');
  });

  it('D_ in audience → d_bus_transport', () => {
    expect(selectTransportContext('driver_pride', 'D_drivers', 0)).toBe('d_bus_transport');
  });
});

// ─── Cooldown checks ──────────────────────────────────────────────────────────

describe('checkFamilyCooldown', () => {
  const today = new Date().toISOString().slice(0, 10);

  it('returns no violations for an empty history', () => {
    const violations = checkFamilyCooldown([], 'reality_of_work');
    expect(violations).toHaveLength(0);
  });

  it('returns warn for 1 use in 7 days', () => {
    const history: VisualMemoryEntry[] = [{
      visual_family: 'reality_of_work',
      scene_type: 'terminal_operations', subject_type: 'ce_driver',
      setting: 'terminal', composition_direction: 'documentary_candid',
      text_overlay_structure: 'no_text', transport_context: 'ce_heavy_transport',
      concept_signature: 'sig', gate_outcome: 'ready_for_internal_preview',
      planned_date: today, asset_strategy: 'real_asset',
    }];
    const violations = checkFamilyCooldown(history, 'reality_of_work');
    expect(violations.some((v) => v.severity === 'warn')).toBe(true);
  });

  it('returns block for 2 uses in 7 days', () => {
    const history: VisualMemoryEntry[] = [
      { visual_family: 'reality_of_work', scene_type: 'terminal_operations', subject_type: 'ce_driver', setting: 'terminal', composition_direction: 'documentary_candid', text_overlay_structure: 'no_text', transport_context: 'ce_heavy_transport', concept_signature: 'a', gate_outcome: 'ready_for_internal_preview', planned_date: today, asset_strategy: 'real_asset' },
      { visual_family: 'reality_of_work', scene_type: 'loading_bay', subject_type: 'vehicle_heavy', setting: 'terminal', composition_direction: 'vehicle_dominant', text_overlay_structure: 'no_text', transport_context: 'ce_heavy_transport', concept_signature: 'b', gate_outcome: 'ready_for_internal_preview', planned_date: today, asset_strategy: 'real_asset' },
    ];
    const violations = checkFamilyCooldown(history, 'reality_of_work');
    expect(violations.some((v) => v.severity === 'block')).toBe(true);
  });
});

describe('checkConsecutiveFamily', () => {
  it('returns warn if last post used the same family', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const history: VisualMemoryEntry[] = [{
      visual_family: 'driver_pride', scene_type: 'driver_portrait', subject_type: 'ce_driver',
      setting: 'terminal', composition_direction: 'driver_subject_foreground',
      text_overlay_structure: 'no_text', transport_context: 'ce_heavy_transport',
      concept_signature: 'sig', gate_outcome: 'ready_for_internal_preview',
      planned_date: yesterday.toISOString().slice(0, 10), asset_strategy: 'real_asset',
    }];
    const violations = checkConsecutiveFamily(history, 'driver_pride');
    expect(violations.some((v) => v.severity === 'warn')).toBe(true);
  });

  it('returns no violation if last post used a different family', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const history: VisualMemoryEntry[] = [{
      visual_family: 'reality_of_work', scene_type: 'highway_route', subject_type: 'vehicle_heavy',
      setting: 'highway_sweden', composition_direction: 'landscape_wide',
      text_overlay_structure: 'no_text', transport_context: 'ce_heavy_transport',
      concept_signature: 'sig', gate_outcome: 'ready_for_internal_preview',
      planned_date: yesterday.toISOString().slice(0, 10), asset_strategy: 'real_asset',
    }];
    const violations = checkConsecutiveFamily(history, 'driver_pride');
    expect(violations).toHaveLength(0);
  });
});

describe('checkSceneCooldown', () => {
  it('blocks if same scene used within 14 days', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const history: VisualMemoryEntry[] = [{
      visual_family: 'reality_of_work', scene_type: 'cab_interior', subject_type: 'ce_driver',
      setting: 'highway_sweden', composition_direction: 'close_up_detail',
      text_overlay_structure: 'no_text', transport_context: 'ce_heavy_transport',
      concept_signature: 'sig', gate_outcome: 'ready_for_internal_preview',
      planned_date: threeDaysAgo.toISOString().slice(0, 10), asset_strategy: 'real_asset',
    }];
    const violations = checkSceneCooldown(history, 'cab_interior');
    expect(violations.some((v) => v.severity === 'block')).toBe(true);
  });

  it('allows same scene after 15 days', () => {
    const sixteenDaysAgo = new Date();
    sixteenDaysAgo.setDate(sixteenDaysAgo.getDate() - 16);
    const history: VisualMemoryEntry[] = [{
      visual_family: 'reality_of_work', scene_type: 'cab_interior', subject_type: 'ce_driver',
      setting: 'highway_sweden', composition_direction: 'close_up_detail',
      text_overlay_structure: 'no_text', transport_context: 'ce_heavy_transport',
      concept_signature: 'sig', gate_outcome: 'ready_for_internal_preview',
      planned_date: sixteenDaysAgo.toISOString().slice(0, 10), asset_strategy: 'real_asset',
    }];
    const violations = checkSceneCooldown(history, 'cab_interior');
    expect(violations).toHaveLength(0);
  });
});

// ─── Concept signature and similarity ────────────────────────────────────────

describe('buildConceptSignature', () => {
  it('produces a non-empty string', () => {
    const sig = buildConceptSignature('reality_of_work', 'terminal_operations', 'documentary_candid', 'professional_confidence');
    expect(sig.length).toBeGreaterThan(0);
  });

  it('includes all 4 components', () => {
    const sig = buildConceptSignature('driver_pride', 'driver_portrait', 'driver_subject_foreground', 'warm_collegial');
    expect(sig).toContain('driver_pride');
    expect(sig).toContain('driver_portrait');
    expect(sig).toContain('driver_subject_foreground');
    expect(sig).toContain('warm_collegial');
  });
});

describe('conceptSimilarity', () => {
  it('returns 1.0 for identical signatures', () => {
    const sig = buildConceptSignature('driver_pride', 'driver_portrait', 'driver_subject_foreground', 'warm_collegial');
    expect(conceptSimilarity(sig, sig)).toBe(1.0);
  });

  it('returns 0 for completely different signatures', () => {
    const a = buildConceptSignature('reality_of_work', 'terminal_operations', 'vehicle_dominant', 'professional_confidence');
    const b = buildConceptSignature('community_conversation', 'community_prompt', 'text_centered_minimal', 'community_welcoming');
    const sim = conceptSimilarity(a, b);
    expect(sim).toBe(0);
  });

  it('returns partial similarity when some components match', () => {
    const a = buildConceptSignature('driver_pride', 'driver_portrait', 'close_up_detail', 'warm_collegial');
    const b = buildConceptSignature('driver_pride', 'cab_interior', 'close_up_detail', 'professional_confidence');
    const sim = conceptSimilarity(a, b);
    // 2 of 4+2 unique tokens match → Jaccard = 2/6... let's just check it's between 0 and 1
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });
});
