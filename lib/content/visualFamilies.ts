// lib/content/visualFamilies.ts
//
// Visual family taxonomy, scene selection, rotation logic, and cooldown checks.
//
// BOUNDARIES:
//   ✓ Pure functions — no DB imports, no side effects
//   ✗ Does NOT connect to any external service

import type { ContentPillar, CreativeAngle } from './types';
import type {
  VisualFamily,
  SceneType,
  SubjectType,
  VisualSetting,
  TransportContext,
  VisualMood,
  TimeOfDay,
  LightCondition,
  CompositionDirection,
  VisualMemoryEntry,
  VisualAntiRepetitionViolation,
} from './visualTypes';

// ─── Family profiles ──────────────────────────────────────────────────────────

export interface VisualFamilyProfile {
  id: VisualFamily;
  name_sv: string;
  description_sv: string;
  primary_pillars: ContentPillar[];
  primary_angles: CreativeAngle[];
  scene_types: SceneType[];
  subject_types: SubjectType[];
  settings: VisualSetting[];
  transport_contexts: TransportContext[];
  moods: VisualMood[];
  times_of_day: TimeOfDay[];
  light_conditions: LightCondition[];
  compositions: CompositionDirection[];
  frequency_weight: number;  // sum across all families = 1.0
}

export const VISUAL_FAMILY_PROFILES: Record<VisualFamily, VisualFamilyProfile> = {
  reality_of_work: {
    id: 'reality_of_work',
    name_sv: 'Transportens vardag',
    description_sv: 'Verklig transportmiljö — terminal, lastkaj, hytt, rutter, lager, nattskift',
    primary_pillars: ['practical', 'recognition'],
    primary_angles: ['operational_insight', 'relatable_work_moment'],
    scene_types: [
      'terminal_operations', 'loading_bay', 'cab_interior',
      'highway_route', 'city_delivery', 'warehouse',
      'early_morning_start', 'night_shift', 'weather_conditions',
    ],
    subject_types: ['ce_driver', 'c_driver', 'vehicle_heavy', 'vehicle_medium', 'logistics_worker'],
    settings: ['terminal', 'highway_sweden', 'warehouse', 'urban_sweden'],
    transport_contexts: ['ce_heavy_transport', 'c_medium_transport', 'distribution_logistics', 'warehouse_logistics'],
    moods: ['professional_confidence', 'early_morning_focused', 'warm_collegial'],
    times_of_day: ['early_morning', 'day', 'night'],
    light_conditions: ['golden_hour', 'overcast', 'rain', 'snow', 'artificial'],
    compositions: ['documentary_candid', 'vehicle_dominant', 'landscape_wide', 'close_up_detail', 'driver_subject_foreground'],
    frequency_weight: 0.35,
  },

  driver_pride: {
    id: 'driver_pride',
    name_sv: 'Chaufförstolthet',
    description_sv: 'Mänskligt centrerat — professionell porträtt, naturlig hållning, trovärdig arbetsutrustning',
    primary_pillars: ['recognition'],
    primary_angles: ['driver_recognition', 'career_confidence', 'relatable_work_moment'],
    scene_types: ['driver_portrait', 'cab_interior', 'vehicle_close_up', 'terminal_operations'],
    subject_types: ['ce_driver', 'c_driver', 'd_driver', 'logistics_worker'],
    settings: ['terminal', 'highway_sweden', 'urban_sweden'],
    transport_contexts: ['ce_heavy_transport', 'c_medium_transport', 'd_bus_transport', 'general_transport'],
    moods: ['professional_confidence', 'warm_collegial', 'motivational_calm'],
    times_of_day: ['early_morning', 'day'],
    light_conditions: ['golden_hour', 'clear_day', 'overcast'],
    compositions: ['driver_subject_foreground', 'close_up_detail', 'documentary_candid'],
    frequency_weight: 0.25,
  },

  operational_intelligence: {
    id: 'operational_intelligence',
    name_sv: 'Operationell intelligens',
    description_sv: 'Enkel visuell förklaring — CE/C/D, YKB, tillgänglighet, transportkontext',
    primary_pillars: ['practical'],
    primary_angles: ['practical_advice', 'market_education', 'myth_vs_reality'],
    scene_types: ['infographic_education', 'branded_text_only'],
    subject_types: ['no_subject'],
    settings: ['branded_background', 'abstract_minimal'],
    transport_contexts: ['ce_heavy_transport', 'c_medium_transport', 'd_bus_transport', 'none'],
    moods: ['informative_clear'],
    times_of_day: ['not_applicable'],
    light_conditions: ['not_applicable'],
    compositions: ['text_centered_minimal', 'split_horizontal'],
    frequency_weight: 0.20,
  },

  community_conversation: {
    id: 'community_conversation',
    name_sv: 'Gemenskapsdialog',
    description_sv: 'Frågeledda grafik — varmare ton, diskussionsuppmaning för Logistikklubb',
    primary_pillars: ['community'],
    primary_angles: ['community_question', 'safe_light_humor', 'relatable_work_moment'],
    scene_types: ['community_prompt', 'branded_text_only'],
    subject_types: ['no_subject'],
    settings: ['branded_background', 'abstract_minimal'],
    transport_contexts: ['none', 'general_transport'],
    moods: ['community_welcoming', 'warm_collegial'],
    times_of_day: ['not_applicable'],
    light_conditions: ['not_applicable'],
    compositions: ['text_centered_minimal'],
    frequency_weight: 0.15,
  },

  drivernord_campaign: {
    id: 'drivernord_campaign',
    name_sv: 'DriverNord kampanj',
    description_sv: 'Premium varumärkesframåt — sällsynt och distinkt, framtida förvärvsanvändning',
    primary_pillars: ['acquisition'],
    primary_angles: ['low_freq_acquisition_cta', 'career_confidence'],
    scene_types: ['driver_portrait', 'highway_route', 'branded_text_only'],
    subject_types: ['ce_driver', 'c_driver', 'vehicle_heavy'],
    settings: ['highway_sweden', 'branded_background'],
    transport_contexts: ['ce_heavy_transport', 'general_transport'],
    moods: ['professional_confidence', 'motivational_calm'],
    times_of_day: ['early_morning', 'day'],
    light_conditions: ['golden_hour', 'clear_day'],
    compositions: ['driver_subject_foreground', 'landscape_wide', 'text_centered_minimal'],
    frequency_weight: 0.05,
  },
};

// ─── Family selection ─────────────────────────────────────────────────────────

export function selectVisualFamily(pillar: ContentPillar, angle: CreativeAngle): VisualFamily {
  for (const profile of Object.values(VISUAL_FAMILY_PROFILES)) {
    if (profile.primary_angles.includes(angle) && profile.primary_pillars.includes(pillar)) {
      return profile.id;
    }
  }
  // Fallback by pillar alone
  const pillarMap: Record<ContentPillar, VisualFamily> = {
    practical:   'operational_intelligence',
    recognition: 'driver_pride',
    community:   'community_conversation',
    acquisition: 'drivernord_campaign',
  };
  return pillarMap[pillar] ?? 'reality_of_work';
}

// ─── Scene / composition selection within a family ────────────────────────────

export function selectSceneType(
  family: VisualFamily,
  weekIndex: number,
  history: VisualMemoryEntry[],
): SceneType {
  const profile = VISUAL_FAMILY_PROFILES[family];
  const usedRecently = new Set(
    history
      .filter((e) => daysSince(e.planned_date) <= 14)
      .map((e) => e.scene_type)
  );
  const available = profile.scene_types.filter((s) => !usedRecently.has(s));
  const pool = available.length > 0 ? available : profile.scene_types;
  return pool[weekIndex % pool.length];
}

export function selectCompositionDirection(
  family: VisualFamily,
  weekIndex: number,
): CompositionDirection {
  const c = VISUAL_FAMILY_PROFILES[family].compositions;
  return c[weekIndex % c.length];
}

export function selectMood(family: VisualFamily, weekIndex: number): VisualMood {
  const m = VISUAL_FAMILY_PROFILES[family].moods;
  return m[weekIndex % m.length];
}

export function selectSubjectType(family: VisualFamily, weekIndex: number): SubjectType {
  const s = VISUAL_FAMILY_PROFILES[family].subject_types;
  return s[weekIndex % s.length];
}

export function selectSetting(family: VisualFamily, weekIndex: number): VisualSetting {
  const s = VISUAL_FAMILY_PROFILES[family].settings;
  return s[weekIndex % s.length];
}

export function selectTimeOfDay(family: VisualFamily, weekIndex: number): TimeOfDay {
  const t = VISUAL_FAMILY_PROFILES[family].times_of_day;
  return t[weekIndex % t.length];
}

export function selectLightCondition(family: VisualFamily, weekIndex: number): LightCondition {
  const l = VISUAL_FAMILY_PROFILES[family].light_conditions;
  return l[weekIndex % l.length];
}

export function selectTransportContext(
  family: VisualFamily,
  audience: string,
  weekIndex: number,
): TransportContext {
  if (audience.includes('CE')) return 'ce_heavy_transport';
  if (audience.includes('C_') || audience === 'C_drivers') return 'c_medium_transport';
  if (audience.includes('D_') || audience === 'D_drivers') return 'd_bus_transport';
  const ctx = VISUAL_FAMILY_PROFILES[family].transport_contexts;
  return ctx[weekIndex % ctx.length];
}

// ─── Cooldown / repetition checks ────────────────────────────────────────────

export function checkFamilyCooldown(
  history: VisualMemoryEntry[],
  proposed: VisualFamily,
): VisualAntiRepetitionViolation[] {
  const violations: VisualAntiRepetitionViolation[] = [];
  const recentCount = history.filter(
    (e) => e.visual_family === proposed && daysSince(e.planned_date) <= 7
  ).length;

  if (recentCount >= 2) {
    violations.push({
      rule: 'family_max_2_per_7d',
      message: `Familj "${proposed}" användes ${recentCount} gånger de senaste 7 dagarna (max 2).`,
      severity: 'block',
    });
  } else if (recentCount === 1) {
    violations.push({
      rule: 'family_max_2_per_7d',
      message: `Familj "${proposed}" användes 1 gång de senaste 7 dagarna (max 2 — kvar 1).`,
      severity: 'warn',
    });
  }
  return violations;
}

export function checkConsecutiveFamily(
  history: VisualMemoryEntry[],
  proposed: VisualFamily,
): VisualAntiRepetitionViolation[] {
  const sorted = [...history].sort((a, b) => b.planned_date.localeCompare(a.planned_date));
  if (sorted.length > 0 && sorted[0].visual_family === proposed) {
    return [{
      rule: 'no_consecutive_same_family',
      message: `Familj "${proposed}" användes i föregående inlägg — undvik konsekutiv upprepning.`,
      severity: 'warn',
    }];
  }
  return [];
}

export function checkSceneCooldown(
  history: VisualMemoryEntry[],
  proposed: SceneType,
): VisualAntiRepetitionViolation[] {
  const hit = history.find(
    (e) => e.scene_type === proposed && daysSince(e.planned_date) <= 14
  );
  if (hit) {
    return [{
      rule: 'scene_cooldown_14d',
      message: `Scen "${proposed}" användes ${hit.planned_date} — 14-dagars avkylning gäller.`,
      severity: 'block',
    }];
  }
  return [];
}

// ─── Concept signature (for Jaccard similarity) ───────────────────────────────
// Components separated by '__' so conceptSimilarity() can tokenize correctly.

export function buildConceptSignature(
  family: VisualFamily,
  scene: SceneType,
  composition: CompositionDirection,
  mood: VisualMood,
): string {
  return `${family}__${scene}__${composition}__${mood}`;
}

// Jaccard on the 4 concept components (not text tokens).
export function conceptSimilarity(sigA: string, sigB: string): number {
  const setA = new Set(sigA.split('__').filter(Boolean));
  const setB = new Set(sigB.split('__').filter(Boolean));
  const intersection = [...setA].filter((t) => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(isoDate: string): number {
  const d = new Date(isoDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}

export function getVisualFamilyProfile(family: VisualFamily): VisualFamilyProfile {
  return VISUAL_FAMILY_PROFILES[family];
}

export function isValidVisualFamily(value: string): value is VisualFamily {
  return value in VISUAL_FAMILY_PROFILES;
}

export function allVisualFamilies(): VisualFamily[] {
  return Object.keys(VISUAL_FAMILY_PROFILES) as VisualFamily[];
}
