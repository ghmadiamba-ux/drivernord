// tests/contentCreativeMechanism.test.ts
//
// Tests for creative mechanism taxonomy, visual mode specifications,
// and cooldown rules.
//
// SAFETY CONSTRAINTS:
//   ✗ No drivernord.se in any output
//   ✗ No Facebook, no external API calls
//   ✓ All functions are pure — no DB, no I/O

import { describe, it, expect } from 'vitest';
import {
  VISUAL_MODE_SPECS,
  MECHANISM_COOLDOWNS,
  OVERUSE_PHRASES,
  selectCreativeMode,
  checkMechanismCooldown,
  checkVisualLanguageCooldown,
  checkPhraseOveruse,
  checkChatSimulationCooldown,
  containsDeprecatedDomain,
  type CreativeMode,
  type ProvenMechanismId,
} from '../lib/content/creativeMechanism';

// ─── VISUAL_MODE_SPECS ────────────────────────────────────────────────────────

describe('VISUAL_MODE_SPECS', () => {
  it('has both trust_organic and performance_acquisition modes', () => {
    expect(VISUAL_MODE_SPECS.trust_organic).toBeDefined();
    expect(VISUAL_MODE_SPECS.performance_acquisition).toBeDefined();
  });

  it('trust_organic uses navy primary color', () => {
    expect(VISUAL_MODE_SPECS.trust_organic.primary_color).toBe('#1C1C2E');
  });

  it('performance_acquisition uses black primary color', () => {
    expect(VISUAL_MODE_SPECS.performance_acquisition.primary_color).toBe('#000000');
  });

  it('performance_acquisition uses yellow secondary', () => {
    expect(VISUAL_MODE_SPECS.performance_acquisition.secondary_color).toBe('#F5C100');
  });

  it('trust_organic has unlimited organic_max_per_week (0)', () => {
    expect(VISUAL_MODE_SPECS.trust_organic.organic_max_per_week).toBe(0);
  });

  it('performance_acquisition has organic_max_per_week = 1', () => {
    expect(VISUAL_MODE_SPECS.performance_acquisition.organic_max_per_week).toBe(1);
  });

  it('trust_organic hook_intensity is low', () => {
    expect(VISUAL_MODE_SPECS.trust_organic.hook_intensity).toBe('low');
  });

  it('performance_acquisition hook_intensity is high', () => {
    expect(VISUAL_MODE_SPECS.performance_acquisition.hook_intensity).toBe('high');
  });

  it('trust_organic has soft CTA', () => {
    expect(VISUAL_MODE_SPECS.trust_organic.cta_intensity).toBe('soft');
  });

  it('performance_acquisition has direct CTA', () => {
    expect(VISUAL_MODE_SPECS.performance_acquisition.cta_intensity).toBe('direct');
  });

  it('both modes have non-empty description', () => {
    expect(VISUAL_MODE_SPECS.trust_organic.description.length).toBeGreaterThan(10);
    expect(VISUAL_MODE_SPECS.performance_acquisition.description.length).toBeGreaterThan(10);
  });
});

// ─── MECHANISM_COOLDOWNS ──────────────────────────────────────────────────────

describe('MECHANISM_COOLDOWNS', () => {
  it('same_mechanism_days is 14', () => {
    expect(MECHANISM_COOLDOWNS.same_mechanism_days).toBe(14);
  });

  it('chat_simulation_days is 14', () => {
    expect(MECHANISM_COOLDOWNS.chat_simulation_days).toBe(14);
  });

  it('three_minuter_days is 21', () => {
    expect(MECHANISM_COOLDOWNS.three_minuter_days).toBe(21);
  });

  it('inte_bemanning_days is 21', () => {
    expect(MECHANISM_COOLDOWNS.inte_bemanning_days).toBe(21);
  });

  it('driver_truck_portrait_days is 21', () => {
    expect(MECHANISM_COOLDOWNS.driver_truck_portrait_days).toBe(21);
  });

  it('black_yellow_organic_max_per_week is 1', () => {
    expect(MECHANISM_COOLDOWNS.black_yellow_organic_max_per_week).toBe(1);
  });
});

// ─── selectCreativeMode ───────────────────────────────────────────────────────

describe('selectCreativeMode', () => {
  it('returns performance_acquisition for acquisition pillar', () => {
    expect(selectCreativeMode('acquisition', 'organic_facebook', undefined)).toBe('performance_acquisition');
  });

  it('returns performance_acquisition for paid_acquisition channel', () => {
    expect(selectCreativeMode('community', 'paid_acquisition', undefined)).toBe('performance_acquisition');
  });

  it('returns performance_acquisition for retargeting channel', () => {
    expect(selectCreativeMode('practical', 'retargeting', undefined)).toBe('performance_acquisition');
  });

  it('returns trust_organic for recognition + organic_facebook + no mechanism', () => {
    expect(selectCreativeMode('recognition', 'organic_facebook', undefined)).toBe('trust_organic');
  });

  it('returns trust_organic for community + community channel', () => {
    expect(selectCreativeMode('community', 'community', undefined)).toBe('trust_organic');
  });

  it('returns trust_organic for organic channel even with performance mechanism', () => {
    const mode = selectCreativeMode('practical', 'organic_facebook', 'performance_ad_visual');
    expect(mode).toBe('trust_organic');
  });

  it('returns performance_acquisition for performance mechanism on website channel', () => {
    const mode = selectCreativeMode('practical', 'website', 'performance_ad_visual');
    expect(mode).toBe('performance_acquisition');
  });

  it('returns performance_acquisition for mobile_native_simulation on non-organic', () => {
    const mode = selectCreativeMode('acquisition', 'website', 'mobile_native_simulation');
    expect(mode).toBe('performance_acquisition');
  });

  it('returns trust_organic for trust mechanism on organic', () => {
    const mode = selectCreativeMode('recognition', 'organic_facebook', 'premium_brand_trust_visual');
    expect(mode).toBe('trust_organic');
  });

  it('returns trust_organic for community pillar + community channel regardless of mechanism', () => {
    const mode = selectCreativeMode('community', 'community', 'mobile_native_simulation');
    expect(mode).toBe('trust_organic');
  });
});

// ─── checkMechanismCooldown ───────────────────────────────────────────────────

describe('checkMechanismCooldown', () => {
  const today = new Date().toISOString().slice(0, 10);

  it('returns no violations when history is empty', () => {
    const result = checkMechanismCooldown('premium_brand_trust_visual', []);
    expect(result).toHaveLength(0);
  });

  it('returns no violations when same mechanism used over 14 days ago', () => {
    const old = new Date(Date.now() - 15 * 86_400_000).toISOString().slice(0, 10);
    const result = checkMechanismCooldown('premium_brand_trust_visual', [
      { reference_mechanism_id: 'premium_brand_trust_visual', planned_date: old },
    ]);
    expect(result).toHaveLength(0);
  });

  it('returns warn violation when same mechanism used within 14 days', () => {
    const result = checkMechanismCooldown('premium_brand_trust_visual', [
      { reference_mechanism_id: 'premium_brand_trust_visual', planned_date: today },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warn');
    expect(result[0].rule).toContain('14d');
  });

  it('returns no violations when a different mechanism was used recently', () => {
    const result = checkMechanismCooldown('premium_brand_trust_visual', [
      { reference_mechanism_id: 'performance_ad_visual', planned_date: today },
    ]);
    expect(result).toHaveLength(0);
  });

  it('violation message contains the mechanism ID', () => {
    const id: ProvenMechanismId = 'driver_dignity_identity';
    const result = checkMechanismCooldown(id, [
      { reference_mechanism_id: id, planned_date: today },
    ]);
    expect(result[0].message).toContain(id);
  });
});

// ─── checkVisualLanguageCooldown ──────────────────────────────────────────────

describe('checkVisualLanguageCooldown', () => {
  it('returns no violations for non-black_yellow tag', () => {
    const result = checkVisualLanguageCooldown('navy_white_trust', []);
    expect(result).toHaveLength(0);
  });

  it('returns no violations when black_yellow_performance not used this week', () => {
    const old = new Date(Date.now() - 8 * 86_400_000).toISOString().slice(0, 10);
    const result = checkVisualLanguageCooldown('black_yellow_performance', [
      { visual_language_tags: ['black_yellow_performance'], planned_date: old },
    ]);
    expect(result).toHaveLength(0);
  });

  it('returns warn when black_yellow_performance used once this week', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = checkVisualLanguageCooldown('black_yellow_performance', [
      { visual_language_tags: ['black_yellow_performance'], planned_date: today },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe('black_yellow_max_1_per_week');
    expect(result[0].severity).toBe('warn');
  });

  it('returns no violations when history has different visual language tags', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = checkVisualLanguageCooldown('black_yellow_performance', [
      { visual_language_tags: ['navy_white_trust'], planned_date: today },
    ]);
    expect(result).toHaveLength(0);
  });
});

// ─── checkPhraseOveruse ───────────────────────────────────────────────────────

describe('checkPhraseOveruse', () => {
  it('returns no violations when text does not match three_minuter', () => {
    const result = checkPhraseOveruse('Ingen matchande fras', 'three_minuter', []);
    expect(result).toHaveLength(0);
  });

  it('detects "3 minuter" phrase', () => {
    const old = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    const result = checkPhraseOveruse(
      'Registrera dig på 3 minuter',
      'three_minuter',
      [{ draft_text: 'Ta 3 minuter', planned_date: old }],
    );
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warn');
  });

  it('detects "inte bemanning" phrase', () => {
    const old = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
    const result = checkPhraseOveruse(
      'Vi är inte bemanning eller jobbsajt',
      'inte_bemanning',
      [{ draft_text: 'Inte bemanning, aldrig', planned_date: old }],
    );
    expect(result).toHaveLength(1);
    expect(result[0].rule).toContain('inte_bemanning');
  });

  it('returns no violations when the phrase was used over 21 days ago', () => {
    const old = new Date(Date.now() - 22 * 86_400_000).toISOString().slice(0, 10);
    const result = checkPhraseOveruse(
      'Registrera dig på 3 minuter',
      'three_minuter',
      [{ draft_text: '3 minuter', planned_date: old }],
    );
    expect(result).toHaveLength(0);
  });

  it('returns no violations when history has no draft_text match', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = checkPhraseOveruse(
      'Registrera dig på 3 minuter',
      'three_minuter',
      [{ draft_text: 'Helt annan text om transport', planned_date: today }],
    );
    expect(result).toHaveLength(0);
  });
});

// ─── checkChatSimulationCooldown ──────────────────────────────────────────────

describe('checkChatSimulationCooldown', () => {
  it('returns no violations when isSimulation is false', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = checkChatSimulationCooldown(false, [
      { format_tag: 'chat_simulation', planned_date: today },
    ]);
    expect(result).toHaveLength(0);
  });

  it('returns warn when simulation used within 14 days', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = checkChatSimulationCooldown(true, [
      { format_tag: 'chat_simulation', planned_date: today },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toContain('14d');
  });

  it('returns no violations when simulation used over 14 days ago', () => {
    const old = new Date(Date.now() - 15 * 86_400_000).toISOString().slice(0, 10);
    const result = checkChatSimulationCooldown(true, [
      { format_tag: 'chat_simulation', planned_date: old },
    ]);
    expect(result).toHaveLength(0);
  });

  it('returns no violations when history has different format_tag', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = checkChatSimulationCooldown(true, [
      { format_tag: 'pain_led_static_ad', planned_date: today },
    ]);
    expect(result).toHaveLength(0);
  });
});

// ─── containsDeprecatedDomain ─────────────────────────────────────────────────

describe('containsDeprecatedDomain', () => {
  it('detects drivernord.se', () => {
    expect(containsDeprecatedDomain('Besök drivernord.se för mer info')).toBe(true);
  });

  it('detects drivernord.SE (case insensitive)', () => {
    expect(containsDeprecatedDomain('drivernord.SE')).toBe(true);
  });

  it('returns false for drivernord.com', () => {
    expect(containsDeprecatedDomain('Besök drivernord.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(containsDeprecatedDomain('')).toBe(false);
  });

  it('returns false for unrelated text', () => {
    expect(containsDeprecatedDomain('Kör rätt, hitta rätt uppdrag')).toBe(false);
  });
});

// ─── OVERUSE_PHRASES ──────────────────────────────────────────────────────────

describe('OVERUSE_PHRASES', () => {
  it('three_minuter pattern matches "3 minuter"', () => {
    expect(OVERUSE_PHRASES.three_minuter.pattern.test('3 minuter')).toBe(true);
  });

  it('three_minuter pattern matches "3minuter" without space', () => {
    expect(OVERUSE_PHRASES.three_minuter.pattern.test('3minuter')).toBe(true);
  });

  it('three_minuter cooldown_days is 21', () => {
    expect(OVERUSE_PHRASES.three_minuter.cooldown_days).toBe(21);
  });

  it('inte_bemanning pattern matches "inte bemanning"', () => {
    expect(OVERUSE_PHRASES.inte_bemanning.pattern.test('Vi är inte bemanning')).toBe(true);
  });

  it('inte_bemanning pattern is case insensitive', () => {
    expect(OVERUSE_PHRASES.inte_bemanning.pattern.test('INTE BEMANNING')).toBe(true);
  });

  it('inte_bemanning cooldown_days is 21', () => {
    expect(OVERUSE_PHRASES.inte_bemanning.cooldown_days).toBe(21);
  });
});
