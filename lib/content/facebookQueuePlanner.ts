// lib/content/facebookQueuePlanner.ts
//
// Facebook Content Bridge V1 — Autonomous Queue Planner
//
// Scans content_campaign_cards, applies all 19 publishability policy rules,
// and queues eligible low-risk cards for upcoming Facebook publishing slots
// WITHOUT requiring any founder approval step.
//
// DOCTRINE:
//   Low-risk content is queued and published autonomously.
//   Founder corrects after publication if needed.
//   Founder pre-approval or manual queueing is an exception, not the default.
//
// BOUNDARIES:
//   ✓ Reads content_campaign_cards (never writes cards)
//   ✓ Writes content_facebook_publish_queue (new entries only)
//   ✓ Reads content_facebook_publish_config
//   ✗ Does NOT call the Graph API
//   ✗ Does NOT publish anything externally
//   ✗ Does NOT require founder_approved=true or any approval flag
//   ✗ Does NOT touch logistikklubb_scheduled_posts
//
// CALLED BY:
//   content-facebook-publisher cron (Phase 1, before publish phase)
//   POST /api/admin/content-facebook-queue/plan (manual founder trigger)

import { db } from '../db';
import { evaluatePublishability, DRY_RUN_CREATED_BY_PREFIX } from './facebookPublishPolicy';
import { adaptForFacebook } from './facebookTextAdapter';
import {
  getPublishConfig,
  getFbPostsToday,
  getFbPostsThisWeek,
  getFbCtaThisWeek,
  getRecentTopicSignatures,
  getEntriesByStatus,
  createQueueEntry,
  markEligible,
  markBlocked,
  scheduleEntry,
  type FbPublishStatus,
} from './facebookPublishQueue';
import type { CampaignCard } from './types';
import type { VisualProductionPlan } from './visualTypes';
import type { PublishContext } from './facebookPublishPolicy';

// ─── Constants ────────────────────────────────────────────────────────────────

// Target publish time: 09:00 UTC = 11:00 CEST (summer) / 10:00 CET (winter)
// Peak organic reach for Swedish professional audience.
export const PUBLISH_HOUR_UTC = 9;

// Max days ahead to look for slots
const MAX_LOOK_AHEAD_DAYS = 21;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlannerCardAction = 'queued' | 'skipped' | 'error' | 'already_queued';

export interface PlannerCardResult {
  card_id:         string;
  topic_signature: string;
  content_pillar:  string;
  action:          PlannerCardAction;
  blocked_reason:  string | null;
  policy_rule:     string | null;
  scheduled_at:    string | null;
}

export interface PlannerRunResult {
  queued:                number;
  skipped:               number;
  already_queued:        number;
  errors:                number;
  week_budget_remaining: number;
  day_budget_remaining:  number;
  cards:                 PlannerCardResult[];
  skipped_emergency_pause: boolean;
}

// ─── Pure: slot calculator ────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Returns the next `count` available weekday (Mon–Fri) publishing slots
 * starting from `fromDate`, avoiding dates already in `alreadyUsedDates`.
 *
 * Publishing time is always PUBLISH_HOUR_UTC (09:00 UTC) on the slot day.
 *
 * If the current UTC hour is past the publish time, slots start from tomorrow.
 * Saturday and Sunday are skipped.
 *
 * Pure function — no DB calls.
 */
export function getNextPublishingSlots(
  fromDate: Date,
  count: number,
  alreadyUsedDates: Date[],
): Date[] {
  if (count <= 0) return [];

  const slots: Date[] = [];
  const used = new Set(alreadyUsedDates.map(toDateKey));

  const candidate = new Date(fromDate);
  candidate.setUTCHours(PUBLISH_HOUR_UTC, 0, 0, 0);

  // If we're already past today's publish window (with 5-min grace), start tomorrow
  const nowHour = fromDate.getUTCHours();
  const nowMin  = fromDate.getUTCMinutes();
  const pastWindow = nowHour > PUBLISH_HOUR_UTC || (nowHour === PUBLISH_HOUR_UTC && nowMin > 5);
  if (pastWindow) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
    candidate.setUTCHours(PUBLISH_HOUR_UTC, 0, 0, 0);
  }

  let lookAhead = 0;
  while (slots.length < count && lookAhead < MAX_LOOK_AHEAD_DAYS) {
    const dow = candidate.getUTCDay(); // 0=Sun, 6=Sat
    const key = toDateKey(candidate);

    if (dow !== 0 && dow !== 6 && !used.has(key)) {
      slots.push(new Date(candidate));
      used.add(key);
    }

    candidate.setUTCDate(candidate.getUTCDate() + 1);
    candidate.setUTCHours(PUBLISH_HOUR_UTC, 0, 0, 0);
    lookAhead++;
  }

  return slots;
}

// ─── Main planner ─────────────────────────────────────────────────────────────

/**
 * Autonomous queue planner. Scans all eligible campaign cards and queues them
 * for upcoming Facebook publishing slots.
 *
 * Returns a detailed audit of what was queued, skipped, and why.
 * Never throws — returns partial results on DB errors.
 *
 * Does NOT require or check any founder approval flag.
 * Does NOT touch logistikklubb_scheduled_posts.
 */
export async function planFacebookQueue(): Promise<PlannerRunResult> {
  const result: PlannerRunResult = {
    queued:                0,
    skipped:               0,
    already_queued:        0,
    errors:                0,
    week_budget_remaining: 0,
    day_budget_remaining:  0,
    cards:                 [],
    skipped_emergency_pause: false,
  };

  // ── 1. Config ────────────────────────────────────────────────────────────────

  let config;
  try {
    config = await getPublishConfig();
  } catch (e) {
    console.error('[facebookQueuePlanner] getPublishConfig failed:', e);
    return result;
  }

  if (config.emergency_pause) {
    result.skipped_emergency_pause = true;
    return result;
  }

  // ── 2. Current counters ──────────────────────────────────────────────────────

  const [postsToday, postsThisWeek, ctaThisWeek, recentTopics] = await Promise.all([
    getFbPostsToday(),
    getFbPostsThisWeek(),
    getFbCtaThisWeek(),
    getRecentTopicSignatures(),
  ]);

  // ── 3. Active queue entries (published + due status excluded from uniqueness) ─

  const ACTIVE_STATUSES: FbPublishStatus[] = [
    'pending_check', 'eligible', 'blocked', 'queued', 'scheduled', 'due',
  ];
  const activeEntries = await getEntriesByStatus(ACTIVE_STATUSES);
  const queuedCardIds = new Set(activeEntries.map(e => e.card_id));

  // Dates already claimed by scheduled/queued entries
  const scheduledDates = activeEntries
    .filter(e => e.scheduled_at)
    .map(e => new Date(e.scheduled_at!));

  // Count scheduled entries for this calendar week to adjust budgets
  const monday = getMondayUTC(new Date());
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);

  const alreadyScheduledThisWeek = activeEntries.filter(e =>
    e.scheduled_at &&
    new Date(e.scheduled_at) >= monday &&
    new Date(e.scheduled_at) < nextMonday
  ).length;

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  const alreadyScheduledToday = activeEntries.filter(e =>
    e.scheduled_at &&
    new Date(e.scheduled_at) >= todayStart &&
    new Date(e.scheduled_at) < todayEnd
  ).length;

  const effectivePostsToday      = postsToday + alreadyScheduledToday;
  const effectivePostsThisWeek   = postsThisWeek + alreadyScheduledThisWeek;
  const weekBudget = Math.max(0, config.max_posts_per_week - effectivePostsThisWeek);
  const dayBudget  = Math.max(0, config.max_posts_per_day  - effectivePostsToday);

  result.week_budget_remaining = weekBudget;
  result.day_budget_remaining  = dayBudget;

  if (weekBudget === 0) {
    return result;
  }

  // ── 4. Get available slots ───────────────────────────────────────────────────

  // Request enough slots to cover the remaining weekly budget
  const availableSlots = getNextPublishingSlots(new Date(), weekBudget, scheduledDates);
  if (availableSlots.length === 0) {
    return result;
  }

  // ── 5. Fetch candidate cards ─────────────────────────────────────────────────

  const { data: rawCards, error: fetchError } = await db
    .from('content_campaign_cards')
    .select('*, visual_plan')
    .eq('lifecycle_status', 'ready')
    .eq('risk_level', 'low')
    .is('blocked_reason', null)
    .not('draft_text', 'is', null)
    .order('created_at', { ascending: true }); // oldest first = fairness

  if (fetchError || !rawCards) {
    console.error('[facebookQueuePlanner] card fetch failed:', fetchError?.message);
    return result;
  }

  // Pre-screen: exclude dry-run cards and already-queued cards
  const candidates = (rawCards as Array<CampaignCard & { draft_text?: string | null; visual_plan?: unknown }>)
    .filter(c =>
      !c.created_by?.startsWith(DRY_RUN_CREATED_BY_PREFIX) &&
      !queuedCardIds.has(c.id)
    );

  // ── 6. Plan cards into slots ──────────────────────────────────────────────────

  // Running counters updated as we queue cards
  let runningWeekCount = effectivePostsThisWeek;
  let runningCtaCount  = ctaThisWeek;
  const runningTopics  = [...recentTopics];
  let slotIndex = 0;

  for (const card of candidates) {
    if (slotIndex >= availableSlots.length) break;
    if (runningWeekCount >= config.max_posts_per_week) break;

    // Build publish context with running counters.
    // Daily cap is NOT passed here — it is enforced via slot availability
    // (one slot per day from getNextPublishingSlots). We pass 0 for fb_posts_today
    // and 9999 for max_posts_per_day so the policy function skips that check.
    const ctx: PublishContext = {
      emergency_pause:         false,
      paused_pillars:          config.paused_pillars,
      paused_angles:           config.paused_angles,
      fb_posts_today:          0,
      fb_posts_this_week:      runningWeekCount,
      fb_cta_this_week:        runningCtaCount,
      max_posts_per_day:       9999,
      max_posts_per_week:      config.max_posts_per_week,
      max_cta_per_week:        config.max_cta_per_week,
      recent_topic_signatures: runningTopics,
    };

    const visual_plan = extractVisualPlan(card);
    const decision = evaluatePublishability(card, visual_plan, ctx);

    if (!decision.eligible) {
      result.skipped++;
      result.cards.push({
        card_id:         card.id,
        topic_signature: card.topic_signature,
        content_pillar:  card.content_pillar,
        action:          'skipped',
        blocked_reason:  decision.blocked_reason,
        policy_rule:     decision.policy_rule,
        scheduled_at:    null,
      });
      continue;
    }

    // Adapt copy for Facebook
    let fbText: string;
    let fbHashtags: string[];
    try {
      const adapted = adaptForFacebook(card);
      fbText     = adapted.text;
      fbHashtags = adapted.hashtags;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors++;
      result.cards.push({
        card_id:         card.id,
        topic_signature: card.topic_signature,
        content_pillar:  card.content_pillar,
        action:          'error',
        blocked_reason:  `Text adaptation failed: ${msg}`,
        policy_rule:     'text_adapter_error',
        scheduled_at:    null,
      });
      continue;
    }

    // Write to DB
    const slot = availableSlots[slotIndex];
    try {
      const entry = await createQueueEntry(card.id, 'system');
      await markEligible(entry.id, fbText, fbHashtags);
      await scheduleEntry(entry.id, slot);

      // Update running counters
      runningWeekCount++;
      const isCtaCard = card.cta_type !== 'none';
      if (isCtaCard) runningCtaCount++;
      runningTopics.push(card.topic_signature);
      queuedCardIds.add(card.id);
      slotIndex++;

      result.queued++;
      result.cards.push({
        card_id:         card.id,
        topic_signature: card.topic_signature,
        content_pillar:  card.content_pillar,
        action:          'queued',
        blocked_reason:  null,
        policy_rule:     null,
        scheduled_at:    slot.toISOString(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Unique index violation = concurrent run already queued this card
      if (msg.includes('idx_fb_queue_card_active') || msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        result.already_queued++;
        result.cards.push({
          card_id:         card.id,
          topic_signature: card.topic_signature,
          content_pillar:  card.content_pillar,
          action:          'already_queued',
          blocked_reason:  null,
          policy_rule:     null,
          scheduled_at:    null,
        });
        slotIndex++; // consumed a slot conceptually
      } else {
        result.errors++;
        result.cards.push({
          card_id:         card.id,
          topic_signature: card.topic_signature,
          content_pillar:  card.content_pillar,
          action:          'error',
          blocked_reason:  `Queue write error: ${msg}`,
          policy_rule:     'queue_write_error',
          scheduled_at:    null,
        });
      }
    }
  }

  result.week_budget_remaining = Math.max(0, config.max_posts_per_week - runningWeekCount);
  result.day_budget_remaining  = Math.max(0, dayBudget - result.queued);

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMondayUTC(d: Date): Date {
  const date = new Date(d);
  const dow = date.getUTCDay(); // 0=Sun … 6=Sat
  const offset = dow === 0 ? -6 : 1 - dow; // shift to Monday
  date.setUTCDate(date.getUTCDate() + offset);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function extractVisualPlan(card: { visual_plan?: unknown }): VisualProductionPlan | null {
  if (!card.visual_plan || typeof card.visual_plan !== 'object') return null;
  return card.visual_plan as VisualProductionPlan;
}
