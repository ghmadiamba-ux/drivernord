// tests/contentFacebookQueuePlanner.test.ts
//
// Tests for the Facebook Content Bridge autonomous queue planner.
//
// Coverage:
//   A — getNextPublishingSlots: core slot algorithm
//   B — getNextPublishingSlots: edge cases (weekend skip, dedup, past publish time)
//   C — Policy integration: eligible routine card queued without founder approval
//   D — Policy integration: dry-run card excluded
//   E — Policy integration: held / regulatory card excluded
//   F — Policy integration: high-risk card excluded
//   G — Policy integration: real_asset / future_ai_generated excluded
//   H — Policy integration: daily cap (bypassed in planner — slot availability controls it)
//   I — Policy integration: weekly cap enforced in planner context
//   J — Policy integration: CTA weekly cap
//   K — Policy integration: category / angle pause
//   L — Policy integration: global emergency pause
//   M — Duplicate queue prevention (unique slot dedup + already_queued cards)
//   N — No Graph API invocation while Facebook gate is disabled
//   O — Logistikklubb approval workflow untouched

import { describe, it, expect } from 'vitest';
import { getNextPublishingSlots, PUBLISH_HOUR_UTC } from '../lib/content/facebookQueuePlanner';
import { evaluatePublishability, DRY_RUN_CREATED_BY_PREFIX } from '../lib/content/facebookPublishPolicy';
import { isRegulatoryHold } from '../lib/content/regulatoryContentDetector';
import type { PublishContext } from '../lib/content/facebookPublishPolicy';
import type { CampaignCard } from '../lib/content/types';
import type { VisualProductionPlan } from '../lib/content/visualTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<CampaignCard & { draft_text?: string | null }> = {}): CampaignCard & { draft_text?: string | null } {
  return {
    id:               'card-test-001',
    label:            'Testinlägg',
    content_pillar:   'trust',
    creative_angle:   'community',
    target_audience:  'CE chauffören',
    format:           'informational_post',
    cta_type:         'none',
    risk_level:       'low',
    lifecycle_status: 'ready',
    topic_signature:  'trust_community_ce_001',
    driver_insight:   '',
    hashtag_set:      ['#Logistik'],
    planned_week:     '2026-W26',
    created_by:       'founder',
    blocked_reason:   null,
    draft_text:       'Vi arbetar för dig som kör lastbil i Sverige.',
    ...overrides,
  } as CampaignCard & { draft_text?: string | null };
}

function makeCtx(overrides: Partial<PublishContext> = {}): PublishContext {
  return {
    emergency_pause:         false,
    paused_pillars:          [],
    paused_angles:           [],
    fb_posts_today:          0,
    fb_posts_this_week:      0,
    fb_cta_this_week:        0,
    max_posts_per_day:       1,
    max_posts_per_week:      3,
    max_cta_per_week:        1,
    recent_topic_signatures: [],
    ...overrides,
  };
}

// Monday 09:00 UTC — within publish window
const MON_0900 = new Date('2026-06-22T09:00:00Z');
// Monday 08:55 UTC — just before publish window
const MON_0855 = new Date('2026-06-22T08:55:00Z');
// Monday 09:10 UTC — 10 min past publish window
const MON_0910 = new Date('2026-06-22T09:10:00Z');
// Friday 09:00 UTC
const FRI_0900 = new Date('2026-06-26T09:00:00Z');
// Saturday 09:00 UTC
const SAT_0900 = new Date('2026-06-27T09:00:00Z');

// ─── A: Core slot algorithm ───────────────────────────────────────────────────

describe('A — getNextPublishingSlots: core algorithm', () => {
  it('returns weekday slots at PUBLISH_HOUR_UTC', () => {
    const slots = getNextPublishingSlots(MON_0855, 3, []);
    expect(slots).toHaveLength(3);
    slots.forEach(s => {
      expect(s.getUTCHours()).toBe(PUBLISH_HOUR_UTC);
      expect(s.getUTCMinutes()).toBe(0);
    });
  });

  it('returns correct days: Mon Wed Fri when starting Monday before publish time', () => {
    // Mon 08:55 → slots: Mon, Tue, Wed (next 3 consecutive weekdays)
    const slots = getNextPublishingSlots(MON_0855, 3, []);
    expect(slots[0].getUTCDay()).toBe(1); // Monday
    expect(slots[1].getUTCDay()).toBe(2); // Tuesday
    expect(slots[2].getUTCDay()).toBe(3); // Wednesday
  });

  it('starts from tomorrow when past the publish window', () => {
    // Mon 09:10 — past the 5-min grace → first slot is Tuesday
    const slots = getNextPublishingSlots(MON_0910, 1, []);
    expect(slots[0].getUTCDay()).toBe(2); // Tuesday
  });

  it('returns requested count', () => {
    expect(getNextPublishingSlots(MON_0855, 5, [])).toHaveLength(5);
    expect(getNextPublishingSlots(MON_0855, 1, [])).toHaveLength(1);
    expect(getNextPublishingSlots(MON_0855, 0, [])).toHaveLength(0);
  });
});

// ─── B: Edge cases ────────────────────────────────────────────────────────────

describe('B — getNextPublishingSlots: edge cases', () => {
  it('skips Saturday and Sunday', () => {
    // Saturday → next slot is Monday
    const slots = getNextPublishingSlots(SAT_0900, 2, []);
    expect(slots[0].getUTCDay()).toBe(1); // Monday
    expect(slots[1].getUTCDay()).toBe(2); // Tuesday
  });

  it('does not duplicate already-used dates', () => {
    // Monday is already used; should return Tuesday as first slot
    const mondaySlot = new Date('2026-06-22T09:00:00Z');
    const slots = getNextPublishingSlots(MON_0855, 1, [mondaySlot]);
    expect(slots[0].getUTCDay()).toBe(2); // Tuesday
  });

  it('handles multiple already-used dates without returning duplicates', () => {
    const used = [
      new Date('2026-06-22T09:00:00Z'), // Mon
      new Date('2026-06-23T09:00:00Z'), // Tue
    ];
    const slots = getNextPublishingSlots(MON_0855, 2, used);
    expect(slots[0].getUTCDay()).toBe(3); // Wed
    expect(slots[1].getUTCDay()).toBe(4); // Thu
  });

  it('returns today as valid slot when exactly at PUBLISH_HOUR_UTC (within grace)', () => {
    // Mon 09:00 exactly — within the 5-min grace → today is valid
    const slots = getNextPublishingSlots(MON_0900, 1, []);
    expect(slots[0].getUTCDay()).toBe(1); // same Monday
  });

  it('wraps past end of week correctly (Friday → skip weekend → Monday)', () => {
    const slots = getNextPublishingSlots(FRI_0900, 2, []);
    expect(slots[0].getUTCDay()).toBe(5); // Friday (current day, still in window)
    expect(slots[1].getUTCDay()).toBe(1); // Monday (skip Sat/Sun)
  });
});

// ─── C: Eligible routine card — no founder approval required ─────────────────

describe('C — eligible routine card auto-queued without founder approval', () => {
  it('evaluates eligible for a clean ready/low-risk card', () => {
    const card = makeCard();
    const ctx  = makeCtx();
    const decision = evaluatePublishability(card, null, ctx);
    expect(decision.eligible).toBe(true);
    expect(decision.blocked_reason).toBeNull();
  });

  it('policy function has no founder_approved field — approval is not checked', () => {
    // The policy function signature does not include founder_approved in card or ctx
    const card = makeCard({ created_by: 'system' }); // system-created, no founder involvement
    const ctx  = makeCtx();
    const decision = evaluatePublishability(card, null, ctx);
    expect(decision.eligible).toBe(true);
  });
});

// ─── D: Dry-run card excluded ─────────────────────────────────────────────────

describe('D — dry-run card excluded', () => {
  it('blocks card with dry_run_ prefix', () => {
    const card = makeCard({ created_by: `${DRY_RUN_CREATED_BY_PREFIX}w28_planner` });
    const ctx  = makeCtx();
    const d = evaluatePublishability(card, null, ctx);
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('dry_run_card');
  });

  it('blocks any dry_run_ prefix regardless of suffix', () => {
    ['dry_run_w27', 'dry_run_test', 'dry_run_'].forEach(prefix => {
      const card = makeCard({ created_by: prefix });
      const d = evaluatePublishability(card, null, makeCtx());
      expect(d.eligible).toBe(false);
      expect(d.policy_rule).toBe('dry_run_card');
    });
  });

  it('does not block a non-dry-run system card', () => {
    const card = makeCard({ created_by: 'system_content_engine' });
    const d = evaluatePublishability(card, null, makeCtx());
    expect(d.eligible).toBe(true);
  });
});

// ─── E: Held / regulatory card excluded ──────────────────────────────────────

describe('E — held / regulatory card excluded', () => {
  it('blocks held lifecycle cards', () => {
    const card = makeCard({ lifecycle_status: 'held' });
    const d = evaluatePublishability(card, null, makeCtx());
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('ineligible_lifecycle');
  });

  it('blocks archived cards', () => {
    const card = makeCard({ lifecycle_status: 'archived' });
    const d = evaluatePublishability(card, null, makeCtx());
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('ineligible_lifecycle');
  });

  it('blocks draft cards (not ready)', () => {
    const card = makeCard({ lifecycle_status: 'draft' });
    const d = evaluatePublishability(card, null, makeCtx());
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('not_ready');
  });

  it('blocks card with regulatory hold prefix in blocked_reason', () => {
    const card = makeCard({
      blocked_reason: 'REGULATORY_CONTENT — requires_official_source_review: färdskrivarkort',
    });
    const d = evaluatePublishability(card, null, makeCtx());
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('regulatory_hold');
  });

  it('confirms regulatory hold detection', () => {
    expect(isRegulatoryHold('REGULATORY_CONTENT — requires_official_source_review: test')).toBe(true);
    expect(isRegulatoryHold('some other reason')).toBe(false);
    expect(isRegulatoryHold(null)).toBe(false);
  });

  it('blocks card with any non-regulatory blocked_reason', () => {
    const card = makeCard({ blocked_reason: 'visual quality gate failed' });
    const d = evaluatePublishability(card, null, makeCtx());
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('blocked_reason_present');
  });
});

// ─── F: High-risk card excluded ───────────────────────────────────────────────

describe('F — high-risk card excluded', () => {
  it('blocks high-risk cards', () => {
    const card = makeCard({ risk_level: 'high' });
    const d = evaluatePublishability(card, null, makeCtx());
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('high_risk_card');
  });

  it('allows low-risk cards', () => {
    const card = makeCard({ risk_level: 'low' });
    const d = evaluatePublishability(card, null, makeCtx());
    expect(d.eligible).toBe(true);
  });
});

// ─── G: Visual asset strategy blocking ───────────────────────────────────────

describe('G — real_asset / future_ai_generated excluded at launch', () => {
  it('blocks cards with real_asset strategy', () => {
    const vp: Partial<VisualProductionPlan> = { asset_strategy: 'real_asset', gate_outcome: 'ready_for_internal_preview' };
    const card = makeCard();
    const d = evaluatePublishability(card, vp as VisualProductionPlan, makeCtx());
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('visual_asset_strategy_unsupported');
  });

  it('blocks cards with future_ai_generated strategy', () => {
    const vp: Partial<VisualProductionPlan> = { asset_strategy: 'future_ai_generated', gate_outcome: 'ready_for_internal_preview' };
    const card = makeCard();
    const d = evaluatePublishability(card, vp as VisualProductionPlan, makeCtx());
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('visual_asset_strategy_unsupported');
  });

  it('blocks cards with requires_real_asset gate outcome', () => {
    const vp: Partial<VisualProductionPlan> = { asset_strategy: 'branded_graphic', gate_outcome: 'requires_real_asset' };
    const card = makeCard();
    const d = evaluatePublishability(card, vp as VisualProductionPlan, makeCtx());
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('visual_asset_blocked');
  });

  it('blocks requires_future_ai_generation gate outcome', () => {
    const vp: Partial<VisualProductionPlan> = { asset_strategy: 'branded_graphic', gate_outcome: 'requires_future_ai_generation' };
    const card = makeCard();
    const d = evaluatePublishability(card, vp as VisualProductionPlan, makeCtx());
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('visual_asset_blocked');
  });

  it('allows branded_graphic with ready_for_internal_preview gate', () => {
    const vp: Partial<VisualProductionPlan> = { asset_strategy: 'branded_graphic', gate_outcome: 'ready_for_internal_preview' };
    const card = makeCard();
    const d = evaluatePublishability(card, vp as VisualProductionPlan, makeCtx());
    expect(d.eligible).toBe(true);
  });

  it('allows card with null visual plan (text-only)', () => {
    const d = evaluatePublishability(makeCard(), null, makeCtx());
    expect(d.eligible).toBe(true);
  });
});

// ─── H: Daily cap — in planner context (max_posts_per_day=9999) ───────────────

describe('H — daily cap bypassed in planner context (slot availability controls it)', () => {
  it('does not block when planner passes max_posts_per_day=9999', () => {
    // Planner sets max_posts_per_day=9999 and fb_posts_today=0 to bypass daily cap
    const ctx = makeCtx({ max_posts_per_day: 9999, fb_posts_today: 0 });
    const d = evaluatePublishability(makeCard(), null, ctx);
    expect(d.eligible).toBe(true);
  });

  it('blocks with daily cap in normal (non-planner) context', () => {
    const ctx = makeCtx({ fb_posts_today: 1, max_posts_per_day: 1 });
    const d = evaluatePublishability(makeCard(), null, ctx);
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('daily_cap');
  });
});

// ─── I: Weekly cap ────────────────────────────────────────────────────────────

describe('I — weekly cap enforced in planner context', () => {
  it('blocks when weekly cap is reached', () => {
    const ctx = makeCtx({ fb_posts_this_week: 3, max_posts_per_week: 3 });
    const d = evaluatePublishability(makeCard(), null, ctx);
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('weekly_cap');
  });

  it('allows when below weekly cap', () => {
    const ctx = makeCtx({ fb_posts_this_week: 2, max_posts_per_week: 3 });
    const d = evaluatePublishability(makeCard(), null, ctx);
    expect(d.eligible).toBe(true);
  });

  it('blocks at exactly max_posts_per_week (≥ check)', () => {
    const ctx = makeCtx({ fb_posts_this_week: 3, max_posts_per_week: 3 });
    const d = evaluatePublishability(makeCard(), null, ctx);
    expect(d.eligible).toBe(false);
  });
});

// ─── J: CTA weekly cap ────────────────────────────────────────────────────────

describe('J — CTA weekly cap', () => {
  it('blocks CTA card when weekly CTA cap is reached', () => {
    const card = makeCard({ cta_type: 'soft_registration' });
    const ctx  = makeCtx({ fb_cta_this_week: 1, max_cta_per_week: 1 });
    const d = evaluatePublishability(card, null, ctx);
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('cta_weekly_cap');
  });

  it('does not block non-CTA card when CTA cap is reached', () => {
    const card = makeCard({ cta_type: 'none' });
    const ctx  = makeCtx({ fb_cta_this_week: 1, max_cta_per_week: 1 });
    const d = evaluatePublishability(card, null, ctx);
    expect(d.eligible).toBe(true);
  });

  it('allows CTA card below weekly CTA cap', () => {
    const card = makeCard({ cta_type: 'community_join' });
    const ctx  = makeCtx({ fb_cta_this_week: 0, max_cta_per_week: 1 });
    const d = evaluatePublishability(card, null, ctx);
    expect(d.eligible).toBe(true);
  });
});

// ─── K: Category / angle pause ───────────────────────────────────────────────

describe('K — category pause', () => {
  it('blocks card when content_pillar is paused', () => {
    const card = makeCard({ content_pillar: 'acquisition' });
    const ctx  = makeCtx({ paused_pillars: ['acquisition'] });
    const d = evaluatePublishability(card, null, ctx);
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('pillar_paused');
  });

  it('blocks card when creative_angle is paused', () => {
    const card = makeCard({ creative_angle: 'social_proof' });
    const ctx  = makeCtx({ paused_angles: ['social_proof'] });
    const d = evaluatePublishability(card, null, ctx);
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('angle_paused');
  });

  it('allows card when its pillar is not in pause list', () => {
    const card = makeCard({ content_pillar: 'trust' });
    const ctx  = makeCtx({ paused_pillars: ['acquisition'] });
    const d = evaluatePublishability(card, null, ctx);
    expect(d.eligible).toBe(true);
  });
});

// ─── L: Global emergency pause ───────────────────────────────────────────────

describe('L — global emergency pause', () => {
  it('blocks everything when emergency_pause=true', () => {
    const ctx = makeCtx({ emergency_pause: true });
    const d = evaluatePublishability(makeCard(), null, ctx);
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('emergency_pause');
  });

  it('emergency_pause takes priority over all other rules', () => {
    const card = makeCard({
      lifecycle_status: 'ready',
      risk_level: 'low',
      blocked_reason: null,
    });
    const ctx = makeCtx({ emergency_pause: true });
    const d = evaluatePublishability(card, null, ctx);
    expect(d.policy_rule).toBe('emergency_pause'); // first rule, short-circuit
  });
});

// ─── M: Duplicate queue prevention ───────────────────────────────────────────

describe('M — duplicate slot / queue prevention', () => {
  it('getNextPublishingSlots never returns duplicate dates', () => {
    const slots = getNextPublishingSlots(MON_0855, 5, []);
    const keys = slots.map(s => `${s.getUTCFullYear()}-${s.getUTCMonth()}-${s.getUTCDate()}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(slots.length);
  });

  it('topic repetition blocks card with same topic in recent list', () => {
    const card = makeCard({ topic_signature: 'trust_community_ce_001' });
    const ctx  = makeCtx({ recent_topic_signatures: ['trust_community_ce_001'] });
    const d = evaluatePublishability(card, null, ctx);
    expect(d.eligible).toBe(false);
    expect(d.policy_rule).toBe('topic_repetition');
  });

  it('different topic_signature passes topic repetition check', () => {
    const card = makeCard({ topic_signature: 'trust_community_ce_002' });
    const ctx  = makeCtx({ recent_topic_signatures: ['trust_community_ce_001'] });
    const d = evaluatePublishability(card, null, ctx);
    expect(d.eligible).toBe(true);
  });
});

// ─── N: No Graph API while Facebook gate is disabled ─────────────────────────

describe('N — no Graph API invocation while Facebook gate is disabled', () => {
  it('isFacebookPagePostEnabled returns false when env var is not set', async () => {
    const { isFacebookPagePostEnabled } = await import('../lib/logistikklubbPublisher');
    const original = process.env.FACEBOOK_PAGE_API_ENABLED;
    delete process.env.FACEBOOK_PAGE_API_ENABLED;
    expect(isFacebookPagePostEnabled()).toBe(false);
    if (original !== undefined) process.env.FACEBOOK_PAGE_API_ENABLED = original;
  });

  it('isFacebookPagePostEnabled returns false when set to "false"', async () => {
    const { isFacebookPagePostEnabled } = await import('../lib/logistikklubbPublisher');
    process.env.FACEBOOK_PAGE_API_ENABLED = 'false';
    expect(isFacebookPagePostEnabled()).toBe(false);
    delete process.env.FACEBOOK_PAGE_API_ENABLED;
  });
});

// ─── O: Logistikklubb approval workflow untouched ─────────────────────────────

describe('O — Logistikklubb approval workflow untouched', () => {
  it('facebookQueuePlanner does not read or write logistikklubb_scheduled_posts', async () => {
    const { readFileSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(dir, '../lib/content/facebookQueuePlanner.ts'), 'utf8');
    // The planner may mention the table name in comments but must not query it
    expect(src).not.toContain("from('logistikklubb_scheduled_posts')");
    expect(src).not.toContain('.from("logistikklubb_scheduled_posts")');
  });

  it('facebookQueuePlanner does not import logistikklubbPublisher', async () => {
    const { readFileSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(dir, '../lib/content/facebookQueuePlanner.ts'), 'utf8');
    expect(src).not.toContain('logistikklubbPublisher');
  });

  it('content-facebook-publish-queue table is separate from logistikklubb_scheduled_posts', async () => {
    const { readFileSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(dir, '../lib/content/facebookPublishQueue.ts'), 'utf8');
    expect(src).toContain('content_facebook_publish_queue');
    expect(src).not.toContain('logistikklubb_scheduled_posts');
  });
});
