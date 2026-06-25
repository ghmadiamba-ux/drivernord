// lib/content/creativeMechanism.ts
//
// Creative mechanism taxonomy, visual mode specifications, and cooldown rules.
// Encodes the underlying persuasion mechanics of the Proven Creative Reference Library V1.
//
// BOUNDARIES:
//   ✓ Pure functions and constants — no DB, no I/O
//   ✗ Does NOT connect to any external service
//   ✗ Does NOT publish or generate content

import type { ContentPillar } from './types';

// ─── Mechanism ID (all 9 proven mechanisms) ───────────────────────────────────

export type ProvenMechanismId =
  | 'pain_led_recruitment_friction'
  | 'radical_simplification_promise'
  | 'explicit_differentiation'
  | 'driver_control_consent'
  | 'driver_dignity_identity'
  | 'mobile_native_simulation'
  | 'premium_brand_trust_visual'
  | 'performance_ad_visual'
  | 'human_transport_realism';

// ─── Taxonomy tags ────────────────────────────────────────────────────────────

export type PainTag =
  | 'anti_cv'
  | 'anti_recruiter'
  | 'anti_job_board'
  | 'anti_staffing'
  | 'no_middlemen'
  | 'wrong_assignment_friction';

export type PromiseTag =
  | 'three_minute_simplicity'
  | 'no_cv'
  | 'low_friction_registration'
  | 'relevant_contact_only'
  | 'direct_matching';

export type TrustTag =
  | 'consent_control'
  | 'profile_privacy'
  | 'driver_choice'
  | 'no_spam'
  | 'right_assignment';

export type IdentityTag =
  | 'driver_pride'
  | 'skilled_professional'
  | 'right_driver_right_assignment'
  | 'driver_first';

export type FormatTag =
  | 'chat_simulation'
  | 'pain_led_static_ad'
  | 'premium_brand_hero'
  | 'driver_portrait'
  | 'in_cab_realism'
  | 'operational_brand_graphic';

export type VisualLanguageTag =
  | 'black_yellow_performance'
  | 'navy_white_trust'
  | 'human_transport_realism'
  | 'mobile_native_conversation'
  | 'high_contrast_hook'
  | 'clean_premium_layout';

export type ReferenceUseCase =
  | 'acquisition'
  | 'trust'
  | 'conversion'
  | 'community'
  | 'brand';

export type ChannelFit =
  | 'paid_acquisition'
  | 'organic_facebook'
  | 'retargeting'
  | 'website'
  | 'community';

// ─── Creative mode ─────────────────────────────────────────────────────────────

export type CreativeMode = 'trust_organic' | 'performance_acquisition';

export interface VisualModeSpec {
  id: CreativeMode;
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  hook_intensity: 'low' | 'medium' | 'high';
  cta_intensity: 'none' | 'soft' | 'direct';
  organic_max_per_week: number;  // 0 = unlimited
  description: string;
}

export const VISUAL_MODE_SPECS: Record<CreativeMode, VisualModeSpec> = {
  trust_organic: {
    id:                   'trust_organic',
    name:                 'DriverNord Trust / Organic',
    primary_color:        '#1C1C2E',   // deep navy
    secondary_color:      '#FFFFFF',
    accent_color:         '#2563EB',   // blue-600
    hook_intensity:       'low',
    cta_intensity:        'soft',
    organic_max_per_week: 0,           // unlimited
    description:
      'Lugn, trovärdig, nordisk logistikton. Navy/vitt. Begränsad bildtext. ' +
      'Hög mobilläsbarhet. Inga aggressiva visuella kontraster.',
  },
  performance_acquisition: {
    id:                   'performance_acquisition',
    name:                 'DriverNord Performance Acquisition',
    primary_color:        '#000000',   // black
    secondary_color:      '#F5C100',   // yellow
    accent_color:         '#FFFFFF',
    hook_intensity:       'high',
    cta_intensity:        'direct',
    organic_max_per_week: 1,           // max 1/week in organic channel
    description:
      'Hög kontrast, smärtledd hook, strukturerad övertygelse. ' +
      'Svart/gult/vitt. Primärt för betald förvärv och enstaka organisk konvertering.',
  },
};

// ─── Cooldown rules ───────────────────────────────────────────────────────────

export const MECHANISM_COOLDOWNS = {
  same_mechanism_days:                     14,
  same_hook_days:                          30,
  same_visual_language_max_per_7d:          2,
  black_yellow_organic_max_per_week:        1,
  direct_acquisition_organic_max_per_week:  1,
  three_minuter_days:                      21,
  inte_bemanning_days:                     21,
  chat_simulation_days:                    14,
  driver_truck_portrait_days:              21,
} as const;

export const OVERUSE_PHRASES = {
  three_minuter:  { pattern: /3\s*minut/i,       cooldown_days: 21 },
  inte_bemanning: { pattern: /inte bemanning/i,  cooldown_days: 21 },
} as const;

// ─── Mode selector ────────────────────────────────────────────────────────────

const PERFORMANCE_MECHANISM_IDS: ReadonlySet<ProvenMechanismId> = new Set<ProvenMechanismId>([
  'performance_ad_visual',
  'mobile_native_simulation',
  'pain_led_recruitment_friction',
  'radical_simplification_promise',
  'explicit_differentiation',
]);

export function selectCreativeMode(
  pillar:      ContentPillar,
  channelFit:  ChannelFit | string,
  mechanismId: ProvenMechanismId | undefined,
): CreativeMode {
  if (pillar === 'acquisition')                            return 'performance_acquisition';
  if (channelFit === 'paid_acquisition')                   return 'performance_acquisition';
  if (channelFit === 'retargeting')                        return 'performance_acquisition';
  if (
    mechanismId &&
    PERFORMANCE_MECHANISM_IDS.has(mechanismId) &&
    channelFit !== 'organic_facebook' &&
    channelFit !== 'community'
  ) {
    return 'performance_acquisition';
  }
  return 'trust_organic';
}

// ─── Cooldown violation ───────────────────────────────────────────────────────

export interface MechanismCooldownViolation {
  rule:     string;
  message:  string;
  severity: 'warn' | 'block';
}

// ─── Mechanism reuse cooldown ─────────────────────────────────────────────────

export function checkMechanismCooldown(
  mechanismId: ProvenMechanismId,
  history: Array<{ reference_mechanism_id?: string; planned_date: string }>,
): MechanismCooldownViolation[] {
  const days = MECHANISM_COOLDOWNS.same_mechanism_days;
  const hit  = history.find(
    (e) =>
      e.reference_mechanism_id === mechanismId &&
      daysSince(e.planned_date) <= days,
  );
  if (!hit) return [];
  return [{
    rule:     `mechanism_cooldown_${days}d`,
    message:  `Mekanism "${mechanismId}" användes ${hit.planned_date} — avkylning ${days} dagar.`,
    severity: 'warn',
  }];
}

// ─── Visual language cooldown ─────────────────────────────────────────────────

export function checkVisualLanguageCooldown(
  tag:     VisualLanguageTag,
  history: Array<{ visual_language_tags?: string[]; planned_date: string }>,
): MechanismCooldownViolation[] {
  if (tag !== 'black_yellow_performance') return [];
  const max   = MECHANISM_COOLDOWNS.black_yellow_organic_max_per_week;
  const count = history.filter(
    (e) =>
      Array.isArray(e.visual_language_tags) &&
      e.visual_language_tags.includes(tag) &&
      daysSince(e.planned_date) <= 7,
  ).length;
  if (count >= max) {
    return [{
      rule:     'black_yellow_max_1_per_week',
      message:  `"black_yellow_performance" användes ${count} gång(er) senaste 7 dagarna (max ${max}).`,
      severity: 'warn',
    }];
  }
  return [];
}

// ─── Overuse phrase cooldown ──────────────────────────────────────────────────

export function checkPhraseOveruse(
  text:    string,
  phrase:  keyof typeof OVERUSE_PHRASES,
  history: Array<{ draft_text?: string; planned_date: string }>,
): MechanismCooldownViolation[] {
  const rule = OVERUSE_PHRASES[phrase];
  if (!rule.pattern.test(text)) return [];
  const hit = history.find(
    (e) =>
      e.draft_text &&
      rule.pattern.test(e.draft_text) &&
      daysSince(e.planned_date) <= rule.cooldown_days,
  );
  if (!hit) return [];
  return [{
    rule:     `${phrase}_cooldown_${rule.cooldown_days}d`,
    message:
      `Fras för "${phrase.replace(/_/g, ' ')}" användes ${hit.planned_date} — ` +
      `avkylning ${rule.cooldown_days} dagar.`,
    severity: 'warn',
  }];
}

// ─── Chat simulation cooldown ─────────────────────────────────────────────────

export function checkChatSimulationCooldown(
  isSimulation: boolean,
  history: Array<{ format_tag?: string; planned_date: string }>,
): MechanismCooldownViolation[] {
  if (!isSimulation) return [];
  const days = MECHANISM_COOLDOWNS.chat_simulation_days;
  const hit  = history.find(
    (e) => e.format_tag === 'chat_simulation' && daysSince(e.planned_date) <= days,
  );
  if (!hit) return [];
  return [{
    rule:     `chat_simulation_cooldown_${days}d`,
    message:  `Chattsimulering användes ${hit.planned_date} — avkylning ${days} dagar.`,
    severity: 'warn',
  }];
}

// ─── Canonical domain guard ───────────────────────────────────────────────────

export function containsDeprecatedDomain(text: string): boolean {
  return /drivernord\.se/i.test(text);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function daysSince(isoDate: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000),
  );
}
