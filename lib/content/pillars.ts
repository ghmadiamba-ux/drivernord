// lib/content/pillars.ts
//
// Content pillar taxonomy, creative angle rotation, and weekly schedule defaults.
// Pure — no DB, no I/O.

import type {
  ContentPillar,
  CreativeAngle,
  PostFormat,
  TargetAudience,
} from './types';

// ─── Pillar target ratios ─────────────────────────────────────────────────────

export const PILLAR_TARGET_RATIOS: Record<ContentPillar, number> = {
  practical:   0.50,
  recognition: 0.20,
  community:   0.20,
  acquisition: 0.10,
};

// ─── Pillar → allowed creative angles ─────────────────────────────────────────

export const PILLAR_ANGLES: Record<ContentPillar, CreativeAngle[]> = {
  practical: [
    'practical_advice',
    'market_education',
    'myth_vs_reality',
    'operational_insight',
  ],
  recognition: [
    'driver_recognition',
    'relatable_work_moment',
    'career_confidence',
    'safe_light_humor',
  ],
  community: [
    'community_question',
    'relatable_work_moment',
    'safe_light_humor',
  ],
  acquisition: [
    'low_freq_acquisition_cta',
    'practical_advice', // can wrap a CTA inside a practical framing
  ],
};

// ─── Default weekly schedule ──────────────────────────────────────────────────
// 4 posts per week, one per slot day.
// day_of_week: 1=Mon, 3=Wed, 5=Fri, 7=Sun

export interface WeekSlot {
  day_of_week: 1 | 3 | 5 | 7;
  label: string;
  pillar: ContentPillar;
  angle: CreativeAngle;
  format: PostFormat;
  slot_time: string;
}

export const DEFAULT_WEEKLY_SLOTS: WeekSlot[] = [
  {
    day_of_week: 1,
    label: 'Måndag — Marknad & Insikt',
    pillar: 'practical',
    angle: 'market_education',
    format: 'text_post',
    slot_time: '08:00',
  },
  {
    day_of_week: 3,
    label: 'Onsdag — Tips & Råd',
    pillar: 'practical',
    angle: 'practical_advice',
    format: 'tip_list',
    slot_time: '09:00',
  },
  {
    day_of_week: 5,
    label: 'Fredag — Yrkesstolthet',
    pillar: 'recognition',
    angle: 'driver_recognition',
    format: 'text_post',
    slot_time: '09:00',
  },
  {
    day_of_week: 7,
    label: 'Söndag — Gemenskap',
    pillar: 'community',
    angle: 'community_question',
    format: 'question',
    slot_time: '11:00',
  },
];

// Acquisition CTA replaces the Friday slot every ~10 days (every 2nd week,
// Friday becomes acquisition). This keeps CTA ≤ 10% over time.
export function getAcquisitionSlotWeek(weekIndex: number): number {
  // Even-numbered weeks → acquisition on Friday
  return weekIndex % 2 === 0 ? 5 : -1; // -1 = no acquisition this week
}

// ─── Allowed formats per creative angle ──────────────────────────────────────

export const ANGLE_FORMATS: Record<CreativeAngle, PostFormat[]> = {
  practical_advice:          ['tip_list', 'text_post'],
  market_education:          ['text_post', 'question'],
  driver_recognition:        ['text_post', 'short_story'],
  community_question:        ['question', 'poll'],
  myth_vs_reality:           ['text_post'],
  operational_insight:       ['text_post', 'short_story'],
  relatable_work_moment:     ['short_story', 'text_post'],
  career_confidence:         ['text_post', 'short_story'],
  safe_light_humor:          ['text_post', 'short_story'],
  low_freq_acquisition_cta:  ['cta', 'text_post'],
};

// ─── Primary audience per content pillar ─────────────────────────────────────

export const PILLAR_AUDIENCES: Record<ContentPillar, TargetAudience[]> = {
  practical:   ['CE_drivers', 'C_drivers', 'all_drivers', 'YKB_holders'],
  recognition: ['CE_drivers', 'C_drivers', 'D_drivers', 'all_drivers', 'logistics_workers'],
  community:   ['all_drivers', 'logistics_workers', 'CE_drivers', 'C_drivers'],
  acquisition: ['CE_drivers', 'C_drivers', 'D_drivers', 'logistics_workers'],
};

// ─── Angle rotation helpers ───────────────────────────────────────────────────

// Pick a creative angle for a pillar, rotating by week to ensure variety
export function rotateAngle(
  pillar: ContentPillar,
  weekIndex: number,
  offsetWithinPillar: number = 0
): CreativeAngle {
  const angles = PILLAR_ANGLES[pillar];
  return angles[(weekIndex + offsetWithinPillar) % angles.length]!;
}

export function rotateAudience(
  pillar: ContentPillar,
  weekIndex: number
): TargetAudience {
  const audiences = PILLAR_AUDIENCES[pillar];
  return audiences[weekIndex % audiences.length]!;
}

export function pickFormat(angle: CreativeAngle, weekIndex: number): PostFormat {
  const formats = ANGLE_FORMATS[angle];
  return formats[weekIndex % formats.length]!;
}

// ─── Pillar ratio validator ───────────────────────────────────────────────────

export function computeActualRatio(
  pillars: ContentPillar[]
): Record<ContentPillar, number> {
  const counts: Record<ContentPillar, number> = {
    practical: 0, recognition: 0, community: 0, acquisition: 0,
  };
  for (const p of pillars) counts[p]++;
  const total = pillars.length || 1;
  return {
    practical:   counts.practical   / total,
    recognition: counts.recognition / total,
    community:   counts.community   / total,
    acquisition: counts.acquisition / total,
  };
}

// ─── Pillar from angle (reverse lookup) ──────────────────────────────────────

export function getPillarForAngle(angle: CreativeAngle): ContentPillar | null {
  for (const [pillar, angles] of Object.entries(PILLAR_ANGLES) as [ContentPillar, CreativeAngle[]][]) {
    if (angles.includes(angle)) return pillar;
  }
  return null;
}

// ─── Guards ──────────────────────────────────────────────────────────────────

export function isValidPillar(v: string): v is ContentPillar {
  return ['practical', 'recognition', 'community', 'acquisition'].includes(v);
}

export function isValidAngle(v: string): v is CreativeAngle {
  return [
    'practical_advice', 'market_education', 'driver_recognition',
    'community_question', 'myth_vs_reality', 'operational_insight',
    'relatable_work_moment', 'career_confidence', 'safe_light_humor',
    'low_freq_acquisition_cta',
  ].includes(v);
}
