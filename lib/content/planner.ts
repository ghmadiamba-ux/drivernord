// lib/content/planner.ts
//
// Internal weekly content planner for DriverNord Content Engine V1.
// Pure — no DB, no I/O. Takes history + config, returns a WeeklyPlan.
//
// Schedule: Mon (practical/market_education), Wed (practical/practical_advice),
//           Fri (recognition/driver_recognition), Sun (community/community_question)
// CTA replacement: even-indexed weeks replace Fri with acquisition/low_freq_acquisition_cta

import { randomUUID } from 'crypto';
import type {
  CampaignCard,
  CampaignCardInput,
  ContentMemoryEntry,
  WeeklyPlan,
} from './types';
import {
  DEFAULT_WEEKLY_SLOTS,
  getAcquisitionSlotWeek,
  rotateAngle,
  rotateAudience,
  pickFormat,
  computeActualRatio,
  type WeekSlot,
} from './pillars';
import { checkAntiRepetition } from './memory';
import { createCampaignCard } from './campaignCard';
import { generateDraft } from './generator';

// ─── ISO week helpers ─────────────────────────────────────────────────────────

function isoWeekToDate(week: string, dayOfWeek: number): string {
  // week: "YYYY-WNN", dayOfWeek: 1=Mon … 7=Sun
  const [year, wPart] = week.split('-W');
  const weekNum = parseInt(wPart!, 10);
  const y = parseInt(year!, 10);

  // Jan 4 is always in week 1
  const jan4 = new Date(y, 0, 4);
  const jan4Day = jan4.getDay() || 7; // 1=Mon, 7=Sun
  const startOfW1 = new Date(jan4);
  startOfW1.setDate(jan4.getDate() - jan4Day + 1); // Monday of week 1

  const target = new Date(startOfW1);
  target.setDate(startOfW1.getDate() + (weekNum - 1) * 7 + (dayOfWeek - 1));
  return target.toISOString().slice(0, 10);
}

export function getWeekIndex(isoWeek: string): number {
  const [year, wPart] = isoWeek.split('-W');
  return parseInt(year!, 10) * 53 + parseInt(wPart!, 10);
}

// ─── Driver insights for each slot (evergreen, no company names) ──────────────

const SLOT_INSIGHTS: Record<string, string[]> = {
  'practical:market_education':  [
    'Transportmarknaden i Sverige har säsongsvaration som påverkar uppdragsvolym',
    'CE-körkort kombinerat med YKB ger bredare uppdragsmöjligheter i Sverige',
    'Kylfrystransport kräver specialkunnande utöver standardlicens',
    'Fjärrtransport och distribution har olika arbetsrytm och planeringshorisonter',
  ],
  'practical:practical_advice':  [
    'YKB-fortbildning kräver 35 timmar var 5 år och bör bokas i god tid',
    'Färdskrivarkort måste förnyas — administrationstiden kan vara upp till 8 veckor',
    'Rondkontroll är ett lagkrav och chaufförens ansvar inför varje körning',
    'Stockholmstrafiken har kända peak-tider som påverkar distributionskörning',
  ],
  'recognition:driver_recognition':  [
    'Yrkesförare utgör ryggraden i den svenska varuförsörjningskedjan',
    'Nattskiftsförare levererar till butiker och terminaler utan publik eller bekräftelse',
    'CE-körning i stadsmiljö är ett hantverk som tar år att behärska',
    'Erfarenhet i yrket bygger en kunskapsbank som ingen kurs kan ersätta',
  ],
  'community:community_question':  [
    'Forumfråga om bästa rutt eller sträcka i Sverige för lastbilsförare',
    'Öppen fråga om råd till nya förare som precis tagit sitt körkort',
    'Diskussion om hur förare hanterar stress och planering under högsäsong',
    'Fråga om vad folk utanför branschen inte förstår om jobbet',
  ],
  'acquisition:low_freq_acquisition_cta':  [
    'Soft registration CTA to drivernord.com/chaufforer for unregistered CE/C/D drivers',
    'Community join CTA to Logistikklubb for all logistics workers',
    'Profile update reminder for already registered drivers',
  ],
};

function getInsightForSlot(pillar: string, angle: string, weekIndex: number): string {
  const key = `${pillar}:${angle}`;
  const pool = SLOT_INSIGHTS[key] ?? SLOT_INSIGHTS['community:community_question']!;
  return pool[weekIndex % pool.length]!;
}

// ─── Slot → CampaignCardInput ─────────────────────────────────────────────────

function slotToCardInput(
  slot: WeekSlot,
  isoWeek: string,
  weekIndex: number
): CampaignCardInput {
  const audience = rotateAudience(slot.pillar, weekIndex);
  const angle = rotateAngle(slot.pillar, weekIndex, 0);
  const format = pickFormat(slot.angle, weekIndex);
  const insight = getInsightForSlot(slot.pillar, slot.angle, weekIndex);

  const isCtaSlot =
    slot.pillar === 'acquisition' || slot.angle === 'low_freq_acquisition_cta';

  return {
    objective:       slot.pillar === 'community' ? 'community_growth'
                   : slot.pillar === 'acquisition' ? 'registration'
                   : slot.pillar === 'recognition' ? 'engagement'
                   : 'market_education',
    target_audience: audience,
    source_basis:    'editorial_theme',
    driver_insight:  insight,
    content_pillar:  slot.pillar,
    creative_angle:  slot.angle,
    emotional_tone:  slot.pillar === 'recognition' ? 'warm'
                   : slot.pillar === 'community'   ? 'warm'
                   : slot.pillar === 'acquisition' ? 'informative'
                   : 'informative',
    format,
    cta_type:        isCtaSlot ? 'soft_registration' : 'none',
    planned_channel: isCtaSlot ? 'manual' : 'facebook_page',
    planned_week:    isoWeek,
    planned_day_of_week: slot.day_of_week,
    suggested_slot_time: slot.slot_time,
  };
}

// ─── Weekly plan generator ────────────────────────────────────────────────────

export interface PlannerInput {
  iso_week: string;                  // e.g. "2026-W26"
  history: ContentMemoryEntry[];     // full history for anti-repetition checks
  created_by?: string;
}

export interface PlannerResult {
  plan: WeeklyPlan;
  errors: string[];
}

export function generateWeeklyPlan(input: PlannerInput): PlannerResult {
  const { iso_week, history, created_by = 'system' } = input;
  const weekIndex = getWeekIndex(iso_week);
  const warnings: string[] = [];
  const errors: string[] = [];
  const cards: CampaignCard[] = [];

  // Build effective slots — replace Fri slot with acquisition on even weeks
  const acquisitionDay = getAcquisitionSlotWeek(weekIndex);
  const slots: WeekSlot[] = DEFAULT_WEEKLY_SLOTS.map((slot) => {
    if (slot.day_of_week === 5 && acquisitionDay === 5) {
      return {
        ...slot,
        label: 'Fredag — Mjuk Registrerings-CTA',
        pillar: 'acquisition' as const,
        angle: 'low_freq_acquisition_cta' as const,
        format: 'cta' as const,
      };
    }
    return slot;
  });

  for (const slot of slots) {
    const cardInput = slotToCardInput(slot, iso_week, weekIndex);
    const planned_date = isoWeekToDate(iso_week, slot.day_of_week);

    // Generate draft to have text for anti-repetition check
    const draftResult = generateDraft({ card: cardInput, week_index: weekIndex });

    // Anti-repetition check
    const antiCheck = checkAntiRepetition({
      card: {
        content_pillar:  cardInput.content_pillar,
        cta_type:        cardInput.cta_type,
        format:          cardInput.format,
        topic_signature: draftResult.topic_signature,
        draft_text:      draftResult.draft_text,
      },
      planned_date,
      recent_history: history,
    });

    const { card: newCard, validation } = createCampaignCard(cardInput, {
      draft_text:   draftResult.draft_text,
      hashtag_set:  draftResult.hashtag_set,
      created_by,
    });

    if (!validation.valid) {
      errors.push(`[${slot.label}] validation: ${validation.errors.join('; ')}`);
      continue;
    }

    if (!newCard) continue;

    if (!antiCheck.pass) {
      const reasons = antiCheck.violations.map((v) => v.message).join('; ');
      warnings.push(`[${slot.label}] held — anti-repetition: ${reasons}`);
      cards.push({
        ...newCard,
        lifecycle_status: 'held',
        blocked_reason:   `Anti-repetition: ${reasons}`,
      });
    } else {
      for (const warn of antiCheck.warnings) {
        warnings.push(`[${slot.label}] ${warn.message}`);
      }
      // Risk level already set by createCampaignCard via classifyCardRisk
      cards.push({
        ...newCard,
        risk_level:       draftResult.risk_level,
        topic_signature:  draftResult.topic_signature,
        angle_signature:  draftResult.angle_signature,
        lifecycle_status: draftResult.risk_level === 'high' ? 'held' : 'draft',
        blocked_reason:   draftResult.risk_level === 'high'
          ? `Risk: ${draftResult.risk_reason}`
          : undefined,
      });
    }
  }

  const pillars = cards.map((c) => c.content_pillar);
  const pillar_ratio = computeActualRatio(pillars);
  const cta_count = cards.filter((c) => c.cta_type !== 'none').length;

  const plan: WeeklyPlan = {
    week: iso_week,
    cards,
    pillar_ratio,
    cta_count,
    warnings,
    generated_at: new Date().toISOString(),
  };

  return { plan, errors };
}

// ─── Plan summary ──────────────────────────────────────────────────────────────

export interface PlanSummary {
  week: string;
  total: number;
  ready: number;
  held: number;
  high_risk: number;
  cta_count: number;
  pillar_ratio: WeeklyPlan['pillar_ratio'];
  warnings: string[];
}

export function summarizePlan(plan: WeeklyPlan): PlanSummary {
  return {
    week:        plan.week,
    total:       plan.cards.length,
    ready:       plan.cards.filter((c) => c.lifecycle_status === 'draft' || c.lifecycle_status === 'ready').length,
    held:        plan.cards.filter((c) => c.lifecycle_status === 'held').length,
    high_risk:   plan.cards.filter((c) => c.risk_level === 'high').length,
    cta_count:   plan.cta_count,
    pillar_ratio: plan.pillar_ratio,
    warnings:    plan.warnings,
  };
}
