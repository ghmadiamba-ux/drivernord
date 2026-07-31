// lib/content/facebookPublishPolicy.ts
//
// Facebook Content Bridge V1 — Publishability Policy
//
// Pure function. Decides whether a campaign card is eligible for autonomous
// Facebook Page publishing. No DB imports, no side effects.
//
// DOCTRINE:
//   Autonomous low-risk publishing is the default.
//   Founder correction happens after publication, not as a gate before it.
//   Exception: regulatory content, dry-run cards, and high-risk cards are
//   always blocked regardless of any other factor.
//
// BOUNDARIES:
//   ✓ Pure function — deterministic, no side effects
//   ✗ Does NOT call the Graph API
//   ✗ Does NOT write to the DB
//   ✗ Does NOT modify any card

import { isRegulatoryHold } from './regulatoryContentDetector';
import type { CampaignCard, RiskLevel, CardLifecycleStatus, CtaType } from './types';
import type { VisualProductionPlan, AssetStrategy, VisualGateOutcome } from './visualTypes';

// ─── Constants ────────────────────────────────────────────────────────────────

// created_by prefix that marks dry-run/internal cards. Never publish these.
export const DRY_RUN_CREATED_BY_PREFIX = 'dry_run_';

// Card lifecycle_status values that are ineligible for any publishing
const INELIGIBLE_LIFECYCLE_STATUSES: CardLifecycleStatus[] = ['held', 'archived'];

// VisualGateOutcome values that prevent publishing when visual is present
const BLOCKING_GATE_OUTCOMES: VisualGateOutcome[] = [
  'requires_real_asset',
  'requires_future_ai_generation',
  'held_for_risk',
];

// AssetStrategy values that cannot be published text-only at launch
// (these need a real asset or AI image that doesn't exist yet)
const TEXT_ONLY_INELIGIBLE_STRATEGIES: AssetStrategy[] = [
  'real_asset',
  'future_ai_generated',
];

// Patterns in draft_text or driver_insight that indicate unsafe claims
const UNSAFE_CLAIM_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b\d+\s*kr(onor)?\/?(tim|h|day|dag|månad|month)\b/i,
    reason:  'salary or rate claim (SEK per hour/day/month)',
  },
  {
    pattern: /\bgaranterad?\s+lön\b/i,
    reason:  'guaranteed salary claim',
  },
  {
    pattern: /\b(vi har|just nu|aktuell|nuvarande|pågående)\s+(uppdrag|kund|kli?ent|partner|samarbets?partner)\b/i,
    reason:  'claim of current client or active assignment',
  },
  {
    pattern: /\b\d+\s*(chaufförer?|förare|sjöfarts?|drivers?)\s+(finns|tillgänglig|redo|ledig|i databas)/i,
    reason:  'claim of current driver availability or database count',
  },
  {
    pattern: /\btusentals?\s+(chaufförer?|förare|members?|användare)/i,
    reason:  'unsupported scale claim (thousands of drivers/members)',
  },
  {
    pattern: /drivernord\.se\b/i,
    reason:  'wrong domain (drivernord.se does not exist — use drivernord.com)',
  },
];

// Patterns that indicate a named company (cannot be published without legal review)
const NAMED_COMPANY_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bDB\s?Schenker\b/i, reason: 'named company: DB Schenker' },
  { pattern: /\bDHL\b/, reason: 'named company: DHL' },
  { pattern: /\bPostNord\b/i, reason: 'named company: PostNord' },
  { pattern: /\bTNT\b/, reason: 'named company: TNT' },
  { pattern: /\bFedEx\b/i, reason: 'named company: FedEx' },
  { pattern: /\bUPS\b/, reason: 'named company: UPS' },
  // Generic pattern: any word ending in AB/AB followed by space/punctuation
  { pattern: /\b[A-ZÅÄÖ][a-zåäö]{2,}\s+AB\b/, reason: 'possible named Swedish company (AB suffix)' },
];

// Patterns that indicate personal data
const PERSONAL_DATA_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b07[0-9]\s*[-–]?\s*\d{3}\s*\d{2}\s*\d{2}\b/,
    reason:  'Swedish phone number',
  },
  {
    pattern: /\b\d{6}[-–]\d{4}\b/,
    reason:  'Swedish personnummer',
  },
  {
    pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
    reason:  'email address',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublishContext {
  // From config table (caller fetches and passes in — pure function)
  emergency_pause:     boolean;
  paused_pillars:      string[];
  paused_angles:       string[];
  // From system_actions count queries (caller fetches)
  fb_posts_today:      number;
  fb_posts_this_week:  number;
  fb_cta_this_week:    number;
  // Caps (from config table)
  max_posts_per_day:   number;
  max_posts_per_week:  number;
  max_cta_per_week:    number;
  // Anti-repetition: recent topic signatures published to Facebook (last 14 days)
  recent_topic_signatures: string[];
}

export interface PublishabilityDecision {
  eligible:     boolean;
  blocked_reason: string | null;   // null when eligible
  policy_rule:  string | null;     // which rule triggered the block
}

// ─── Main policy function ─────────────────────────────────────────────────────

/**
 * Evaluates whether a campaign card is eligible for autonomous Facebook publishing.
 *
 * Returns { eligible: true, blocked_reason: null } when all checks pass.
 * Returns { eligible: false, blocked_reason: '<explanation>', policy_rule: '<rule>' }
 * when any check fails.
 *
 * Evaluation is short-circuit: the first failing check returns immediately.
 */
export function evaluatePublishability(
  card: CampaignCard & { draft_text?: string | null },
  visual_plan: VisualProductionPlan | null,
  ctx: PublishContext,
): PublishabilityDecision {

  // ── Rule 1: emergency pause ──────────────────────────────────────────────────
  if (ctx.emergency_pause) {
    return block('Emergency pause is active — all Facebook publishing suspended', 'emergency_pause');
  }

  // ── Rule 2: dry-run / internal card ─────────────────────────────────────────
  if (card.created_by && card.created_by.startsWith(DRY_RUN_CREATED_BY_PREFIX)) {
    return block(
      `Card is an internal dry-run (created_by starts with "${DRY_RUN_CREATED_BY_PREFIX}") — never publish`,
      'dry_run_card',
    );
  }

  // ── Rule 3: lifecycle_status ────────────────────────────────────────────────
  if (INELIGIBLE_LIFECYCLE_STATUSES.includes(card.lifecycle_status)) {
    return block(
      `Card lifecycle_status is '${card.lifecycle_status}' — must be 'ready' or 'draft' to be evaluated`,
      'ineligible_lifecycle',
    );
  }

  // Cards must reach 'ready' before they can publish
  if (card.lifecycle_status !== 'ready') {
    return block(
      `Card lifecycle_status is '${card.lifecycle_status}' — must be 'ready'`,
      'not_ready',
    );
  }

  // ── Rule 4: risk level ──────────────────────────────────────────────────────
  if (card.risk_level !== 'low') {
    return block(
      `Card risk_level is '${card.risk_level as RiskLevel}' — only 'low' risk cards are eligible for autonomous publishing`,
      'high_risk_card',
    );
  }

  // ── Rule 5: regulatory hold ─────────────────────────────────────────────────
  if (isRegulatoryHold(card.blocked_reason)) {
    return block(
      `Card has a regulatory hold: ${card.blocked_reason ?? ''}`,
      'regulatory_hold',
    );
  }

  // ── Rule 6: any blocked_reason present ─────────────────────────────────────
  if (card.blocked_reason) {
    return block(
      `Card has an unresolved blocked_reason: ${card.blocked_reason}`,
      'blocked_reason_present',
    );
  }

  // ── Rule 7: draft text must exist ──────────────────────────────────────────
  const text = card.draft_text ?? '';
  if (!text.trim()) {
    return block('Card has no draft_text — cannot generate Facebook copy', 'no_draft_text');
  }

  // ── Rule 8: personal data check ────────────────────────────────────────────
  for (const { pattern, reason } of PERSONAL_DATA_PATTERNS) {
    if (pattern.test(text)) {
      return block(`Personal data detected in draft_text: ${reason}`, 'personal_data');
    }
  }

  // ── Rule 9: named company check ────────────────────────────────────────────
  for (const { pattern, reason } of NAMED_COMPANY_PATTERNS) {
    if (pattern.test(text)) {
      return block(`Named company reference in draft_text: ${reason}`, 'named_company');
    }
  }

  // ── Rule 10: unsafe claims ──────────────────────────────────────────────────
  for (const { pattern, reason } of UNSAFE_CLAIM_PATTERNS) {
    if (pattern.test(text) || pattern.test(card.driver_insight ?? '')) {
      return block(`Unsafe claim detected: ${reason}`, 'unsafe_claim');
    }
  }

  // ── Rule 11: category pause ─────────────────────────────────────────────────
  if (ctx.paused_pillars.includes(card.content_pillar)) {
    return block(
      `Content pillar '${card.content_pillar}' is paused — resume in publish config`,
      'pillar_paused',
    );
  }
  if (ctx.paused_angles.includes(card.creative_angle)) {
    return block(
      `Creative angle '${card.creative_angle}' is paused — resume in publish config`,
      'angle_paused',
    );
  }

  // ── Rule 12: daily cap ─────────────────────────────────────────────────────
  if (ctx.fb_posts_today >= ctx.max_posts_per_day) {
    return block(
      `Daily Facebook cap reached (${ctx.fb_posts_today}/${ctx.max_posts_per_day} today)`,
      'daily_cap',
    );
  }

  // ── Rule 13: weekly cap ─────────────────────────────────────────────────────
  if (ctx.fb_posts_this_week >= ctx.max_posts_per_week) {
    return block(
      `Weekly Facebook cap reached (${ctx.fb_posts_this_week}/${ctx.max_posts_per_week} this week)`,
      'weekly_cap',
    );
  }

  // ── Rule 14: CTA weekly cap ─────────────────────────────────────────────────
  const isCtaCard = (card.cta_type as CtaType) !== 'none';
  if (isCtaCard && ctx.fb_cta_this_week >= ctx.max_cta_per_week) {
    return block(
      `Weekly CTA cap reached (${ctx.fb_cta_this_week}/${ctx.max_cta_per_week} CTA posts this week) — only ${ctx.max_cta_per_week} acquisition CTA allowed per week`,
      'cta_weekly_cap',
    );
  }

  // ── Rule 15: anti-repetition (topic signature) ──────────────────────────────
  if (ctx.recent_topic_signatures.includes(card.topic_signature)) {
    return block(
      `Topic signature '${card.topic_signature}' was recently published to Facebook — wait for cooldown`,
      'topic_repetition',
    );
  }

  // ── Rule 16: visual asset state ─────────────────────────────────────────────
  if (visual_plan !== null) {
    // If a visual plan exists, check it is in a publishable state
    if (BLOCKING_GATE_OUTCOMES.includes(visual_plan.gate_outcome)) {
      return block(
        `Visual plan gate_outcome is '${visual_plan.gate_outcome}' — card is not publishable until asset is resolved`,
        'visual_asset_blocked',
      );
    }
    // Strategy check for launch phase (text-only)
    if (TEXT_ONLY_INELIGIBLE_STRATEGIES.includes(visual_plan.asset_strategy)) {
      return block(
        `Visual plan asset_strategy is '${visual_plan.asset_strategy}' — image publishing not available at launch; use 'branded_graphic' or 'no_visual_needed' cards first`,
        'visual_asset_strategy_unsupported',
      );
    }
  }

  // ── All checks passed ────────────────────────────────────────────────────────
  return { eligible: true, blocked_reason: null, policy_rule: null };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function block(reason: string, rule: string): PublishabilityDecision {
  return { eligible: false, blocked_reason: reason, policy_rule: rule };
}

/**
 * Returns true if a queue entry's blocked_reason was set by the policy engine
 * (as opposed to a manual hold or system error).
 * Currently all blocked_reasons from this module are plain strings, not prefixed.
 * This guard is a placeholder for future structured prefix patterns.
 */
export function isPolicyBlock(blockedReason: string | null | undefined): boolean {
  return typeof blockedReason === 'string' && blockedReason.length > 0;
}
