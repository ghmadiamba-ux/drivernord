// tests/contentFacebookBridge.test.ts
//
// Regression tests for the Facebook Content Bridge V1.
// Covers:
//   A. Publishability policy — eligible and blocked cases
//   B. Dry-run card exclusion
//   C. Regulatory hold exclusion
//   D. Cap enforcement (daily, weekly, CTA)
//   E. Category/global pause
//   F. Anti-repetition (topic signature)
//   G. Visual asset blocking
//   H. Text adapter — Swedish copy adaptation
//   I. Text adapter — forbidden content rejection
//   J. Text adapter — WhatsApp formatting cleanup
//   K. Cron route auth — CRON_SECRET required
//   L. Cron route — no-op when FACEBOOK_PAGE_API_ENABLED not set

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  evaluatePublishability,
  DRY_RUN_CREATED_BY_PREFIX,
  type PublishContext,
} from '../lib/content/facebookPublishPolicy';
import {
  adaptForFacebook,
  FB_MAX_CHARS,
} from '../lib/content/facebookTextAdapter';
import { REGULATORY_BLOCKED_REASON_PREFIX } from '../lib/content/regulatoryContentDetector';
import type { CampaignCard } from '../lib/content/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<CampaignCard & { draft_text?: string | null }> = {}): CampaignCard & { draft_text?: string | null } {
  return {
    id:               'card-test-001',
    objective:        'reach',
    target_audience:  'CE_drivers',
    source_basis:     'evergreen_driver_insight',
    driver_insight:   'En typisk morgon på terminalen börjar länge innan övriga Sverige vaknat.',
    content_pillar:   'recognition',
    creative_angle:   'relatable_work_moment',
    emotional_tone:   'warm',
    format:           'short_story',
    cta_type:         'none',
    planned_channel:  'facebook_page',
    topic_signature:  'morning-terminal-routine',
    angle_signature:  'relatable-work-recognition',
    risk_level:       'low',
    lifecycle_status: 'ready',
    blocked_reason:   undefined,
    hashtag_set:      ['transport', 'logistik', 'chaufförslivet'],
    draft_text:       'Klockan 04:15. Terminalen lyser upp i mörkret. Det är här jobbet börjar — långt innan Sverige vaknar.',
    created_by:       'content_engine_v1',
    feedback_signals: [],
    created_at:       new Date('2026-06-20T08:00:00Z'),
    updated_at:       new Date('2026-06-20T08:00:00Z'),
    ...overrides,
  };
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

// ─── A. Eligible — base case ──────────────────────────────────────────────────

describe('publishability — eligible base case', () => {
  it('returns eligible for a clean, low-risk ready card', () => {
    const decision = evaluatePublishability(makeCard(), null, makeCtx());
    expect(decision.eligible).toBe(true);
    expect(decision.blocked_reason).toBeNull();
    expect(decision.policy_rule).toBeNull();
  });

  it('founder approval is NOT required for routine low-risk cards', () => {
    // The policy does not check for an "approved_by_founder" flag —
    // autonomous publishing is the default for low-risk ready cards.
    const card = makeCard({ lifecycle_status: 'ready', risk_level: 'low' });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(true);
  });
});

// ─── B. Dry-run exclusion ─────────────────────────────────────────────────────

describe('publishability — dry-run exclusion', () => {
  it('blocks W28 dry-run card (created_by starts with dry_run_)', () => {
    const card = makeCard({ created_by: 'dry_run_phase4_proven_reference_2026_W28' });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('dry_run_card');
  });

  it('blocks any card with dry_run_ prefix in created_by', () => {
    const card = makeCard({ created_by: 'dry_run_test_batch_2026_W01' });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('dry_run_card');
  });

  it('DRY_RUN_CREATED_BY_PREFIX constant is "dry_run_"', () => {
    expect(DRY_RUN_CREATED_BY_PREFIX).toBe('dry_run_');
  });

  it('does NOT block a non-dry-run card from content engine', () => {
    const card = makeCard({ created_by: 'content_engine_v1' });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(true);
  });

  it('does NOT block a founder-created card', () => {
    const card = makeCard({ created_by: 'founder' });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(true);
  });
});

// ─── C. Regulatory hold exclusion ─────────────────────────────────────────────

describe('publishability — regulatory hold exclusion', () => {
  it('blocks a card with a regulatory blocked_reason', () => {
    const card = makeCard({
      lifecycle_status: 'held',
      blocked_reason:   `${REGULATORY_BLOCKED_REASON_PREFIX} färdskrivare content`,
    });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(false);
    // lifecycle_status='held' is caught first (ineligible_lifecycle)
    expect(['ineligible_lifecycle', 'regulatory_hold', 'not_ready']).toContain(decision.policy_rule);
  });

  it('blocks a ready card with a regulatory blocked_reason', () => {
    // Edge case: card somehow has lifecycle_status='ready' but has a regulatory hold reason
    const card = makeCard({
      lifecycle_status: 'ready',
      blocked_reason:   `${REGULATORY_BLOCKED_REASON_PREFIX} körtid/vilotid rules detected`,
    });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('regulatory_hold');
  });

  it('blocks a held card (any reason) via lifecycle check', () => {
    const card = makeCard({ lifecycle_status: 'held', blocked_reason: 'Manual hold.' });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('ineligible_lifecycle');
  });

  it('blocks a card with any non-null blocked_reason (non-regulatory)', () => {
    const card = makeCard({
      lifecycle_status: 'ready',
      blocked_reason:   'Similarity block — too similar to W27 content',
    });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('blocked_reason_present');
  });
});

// ─── D. Cap enforcement ───────────────────────────────────────────────────────

describe('publishability — daily and weekly caps', () => {
  it('blocks when daily cap is reached', () => {
    const ctx = makeCtx({ fb_posts_today: 1, max_posts_per_day: 1 });
    const decision = evaluatePublishability(makeCard(), null, ctx);
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('daily_cap');
  });

  it('allows when daily cap not yet reached', () => {
    const ctx = makeCtx({ fb_posts_today: 0, max_posts_per_day: 1 });
    const decision = evaluatePublishability(makeCard(), null, ctx);
    expect(decision.eligible).toBe(true);
  });

  it('blocks when weekly cap is reached', () => {
    const ctx = makeCtx({ fb_posts_today: 0, fb_posts_this_week: 3, max_posts_per_week: 3 });
    const decision = evaluatePublishability(makeCard(), null, ctx);
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('weekly_cap');
  });

  it('blocks a CTA card when CTA weekly cap is reached', () => {
    const card = makeCard({ cta_type: 'soft_registration' });
    const ctx  = makeCtx({ fb_cta_this_week: 1, max_cta_per_week: 1 });
    const decision = evaluatePublishability(card, null, ctx);
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('cta_weekly_cap');
  });

  it('does NOT block a non-CTA card when CTA weekly cap is reached', () => {
    const card = makeCard({ cta_type: 'none' });
    const ctx  = makeCtx({ fb_cta_this_week: 1, max_cta_per_week: 1 });
    const decision = evaluatePublishability(card, null, ctx);
    expect(decision.eligible).toBe(true);
  });

  it('max 1 direct acquisition CTA per week enforced', () => {
    const card = makeCard({ cta_type: 'low_freq_acquisition_cta' });
    const ctx  = makeCtx({ fb_cta_this_week: 1, max_cta_per_week: 1 });
    const decision = evaluatePublishability(card, null, ctx);
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('cta_weekly_cap');
  });
});

// ─── E. Category and global pause ─────────────────────────────────────────────

describe('publishability — category and global pause', () => {
  it('blocks when emergency pause is active', () => {
    const ctx = makeCtx({ emergency_pause: true });
    const decision = evaluatePublishability(makeCard(), null, ctx);
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('emergency_pause');
  });

  it('emergency pause is checked first (before dry-run, before lifecycle)', () => {
    const card = makeCard({ created_by: 'dry_run_w28', lifecycle_status: 'held' });
    const ctx  = makeCtx({ emergency_pause: true });
    const decision = evaluatePublishability(card, null, ctx);
    expect(decision.policy_rule).toBe('emergency_pause');
  });

  it('blocks when card pillar is paused', () => {
    const card = makeCard({ content_pillar: 'acquisition' });
    const ctx  = makeCtx({ paused_pillars: ['acquisition'] });
    const decision = evaluatePublishability(card, null, ctx);
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('pillar_paused');
  });

  it('blocks when card creative_angle is paused', () => {
    const card = makeCard({ creative_angle: 'low_freq_acquisition_cta' });
    const ctx  = makeCtx({ paused_angles: ['low_freq_acquisition_cta'] });
    const decision = evaluatePublishability(card, null, ctx);
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('angle_paused');
  });

  it('does not block when paused pillar does not match card', () => {
    const card = makeCard({ content_pillar: 'recognition' });
    const ctx  = makeCtx({ paused_pillars: ['acquisition'] });
    const decision = evaluatePublishability(card, null, ctx);
    expect(decision.eligible).toBe(true);
  });
});

// ─── F. Anti-repetition (topic signature) ─────────────────────────────────────

describe('publishability — anti-repetition', () => {
  it('blocks when topic_signature was recently published', () => {
    const card = makeCard({ topic_signature: 'morning-terminal-routine' });
    const ctx  = makeCtx({ recent_topic_signatures: ['morning-terminal-routine'] });
    const decision = evaluatePublishability(card, null, ctx);
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('topic_repetition');
  });

  it('allows when topic_signature is new', () => {
    const card = makeCard({ topic_signature: 'morning-terminal-routine' });
    const ctx  = makeCtx({ recent_topic_signatures: ['different-topic-sig'] });
    const decision = evaluatePublishability(card, null, ctx);
    expect(decision.eligible).toBe(true);
  });
});

// ─── G. Visual asset blocking ─────────────────────────────────────────────────

describe('publishability — visual asset state', () => {
  function makeVisualPlan(gate_outcome: string, asset_strategy: string) {
    return {
      id: 'vp-001',
      gate_outcome,
      asset_strategy,
    } as Parameters<typeof evaluatePublishability>[1];
  }

  it('blocks when gate_outcome is requires_real_asset', () => {
    const plan     = makeVisualPlan('requires_real_asset', 'real_asset');
    const decision = evaluatePublishability(makeCard(), plan, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('visual_asset_blocked');
  });

  it('blocks when gate_outcome is requires_future_ai_generation', () => {
    const plan     = makeVisualPlan('requires_future_ai_generation', 'future_ai_generated');
    const decision = evaluatePublishability(makeCard(), plan, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('visual_asset_blocked');
  });

  it('blocks real_asset strategy regardless of gate_outcome (launch limitation)', () => {
    const plan     = makeVisualPlan('ready_for_internal_preview', 'real_asset');
    const decision = evaluatePublishability(makeCard(), plan, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('visual_asset_strategy_unsupported');
  });

  it('allows branded_graphic strategy when gate is ready', () => {
    const plan     = makeVisualPlan('ready_for_internal_preview', 'branded_graphic');
    const decision = evaluatePublishability(makeCard(), plan, makeCtx());
    expect(decision.eligible).toBe(true);
  });

  it('allows no_visual_needed strategy', () => {
    const plan     = makeVisualPlan('no_visual_needed', 'no_visual_needed');
    const decision = evaluatePublishability(makeCard(), plan, makeCtx());
    expect(decision.eligible).toBe(true);
  });

  it('allows null visual_plan (text-only card)', () => {
    const decision = evaluatePublishability(makeCard(), null, makeCtx());
    expect(decision.eligible).toBe(true);
  });
});

// ─── H. Text adapter — Swedish copy adaptation ────────────────────────────────

describe('facebookTextAdapter — copy adaptation', () => {
  it('returns a FacebookCopy object with text, body, hashtags, char_count', () => {
    const card   = makeCard();
    const result = adaptForFacebook(card);
    expect(result.text).toBeTruthy();
    expect(result.body).toBeTruthy();
    expect(typeof result.char_count).toBe('number');
    expect(Array.isArray(result.hashtags)).toBe(true);
  });

  it('appends hashtags with # prefix', () => {
    const card   = makeCard({ hashtag_set: ['transport', 'logistik'] });
    const result = adaptForFacebook(card);
    expect(result.text).toContain('#transport');
    expect(result.text).toContain('#logistik');
  });

  it('does not include more than 5 hashtags', () => {
    const card = makeCard({
      hashtag_set: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    });
    const result = adaptForFacebook(card);
    expect(result.hashtags.length).toBeLessThanOrEqual(5);
  });

  it('appends CTA line for soft_registration', () => {
    const card   = makeCard({ cta_type: 'soft_registration' });
    const result = adaptForFacebook(card);
    expect(result.cta_line).toBeTruthy();
    expect(result.text).toContain('drivernord.com');
  });

  it('no CTA line when cta_type is none', () => {
    const card   = makeCard({ cta_type: 'none' });
    const result = adaptForFacebook(card);
    expect(result.cta_line).toBeNull();
  });

  it('stays within FB_MAX_CHARS', () => {
    const longText = 'A'.repeat(2000);
    const card     = makeCard({ draft_text: longText });
    const result   = adaptForFacebook(card);
    expect(result.char_count).toBeLessThanOrEqual(FB_MAX_CHARS);
  });

  it('throws if draft_text is empty', () => {
    const card = makeCard({ draft_text: '' });
    expect(() => adaptForFacebook(card)).toThrow();
  });

  it('throws if draft_text is null', () => {
    const card = makeCard({ draft_text: null });
    expect(() => adaptForFacebook(card)).toThrow();
  });
});

// ─── I. Text adapter — forbidden content rejection ────────────────────────────

describe('facebookTextAdapter — forbidden content', () => {
  it('throws when draft_text contains drivernord.se', () => {
    const card = makeCard({ draft_text: 'Besök oss på drivernord.se för mer info.' });
    expect(() => adaptForFacebook(card)).toThrow(/wrong domain/i);
  });

  it('throws when draft_text contains internal preview watermark', () => {
    const card = makeCard({ draft_text: 'INTERN FÖRHANDSVISNING — ej publicerbart' });
    expect(() => adaptForFacebook(card)).toThrow(/watermark/i);
  });

  it('does NOT throw for clean Swedish content', () => {
    const card = makeCard({ draft_text: 'En typisk morgon i distributionslogistiken.' });
    expect(() => adaptForFacebook(card)).not.toThrow();
  });
});

// ─── J. Text adapter — WhatsApp formatting cleanup ────────────────────────────

describe('facebookTextAdapter — WhatsApp formatting cleanup', () => {
  it('strips *bold* markers', () => {
    const card   = makeCard({ draft_text: 'Det är *viktigt* att hålla schemat.' });
    const result = adaptForFacebook(card);
    expect(result.body).not.toContain('*');
    expect(result.body).toContain('viktigt');
  });

  it('strips _italic_ markers', () => {
    const card   = makeCard({ draft_text: 'En _viktig_ detalj om CE-körning.' });
    const result = adaptForFacebook(card);
    expect(result.body).not.toContain('_');
    expect(result.body).toContain('viktig');
  });

  it('collapses triple+ newlines to double', () => {
    const card   = makeCard({ draft_text: 'Rad 1\n\n\n\nRad 2' });
    const result = adaptForFacebook(card);
    expect(result.body).not.toMatch(/\n{3,}/);
  });
});

// ─── K. Unsafe claim detection ────────────────────────────────────────────────

describe('publishability — unsafe claim detection', () => {
  it('blocks a card with a salary claim (SEK/hour)', () => {
    const card = makeCard({ draft_text: 'Snittlön: 250 kr/tim för CE-chaufförer.' });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('unsafe_claim');
  });

  it('blocks a card claiming current client partnerships', () => {
    const card = makeCard({ draft_text: 'Vi har just nu uppdrag med en stor kund i Stockholm.' });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('unsafe_claim');
  });

  it('blocks a card with wrong domain in draft_text', () => {
    const card = makeCard({ draft_text: 'Läs mer på drivernord.se — registrera dig!' });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('unsafe_claim');
  });

  it('blocks a card with high risk_level', () => {
    const card = makeCard({ risk_level: 'high' });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('high_risk_card');
  });

  it('does not flag clean community content', () => {
    const card = makeCard({
      draft_text: 'Hur hanterar ni långa körningar på vintern? Dela era erfarenheter!',
    });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(true);
  });
});

// ─── L. Cron route — CRON_SECRET required ────────────────────────────────────

describe('content-facebook-publisher cron — CRON_SECRET enforcement', () => {
  const ENV_BACKUP: Record<string, string | undefined> = {};

  beforeEach(() => {
    ENV_BACKUP['CRON_SECRET'] = process.env.CRON_SECRET;
    ENV_BACKUP['FACEBOOK_PAGE_API_ENABLED'] = process.env.FACEBOOK_PAGE_API_ENABLED;
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(ENV_BACKUP)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('CRON_SECRET is required — if unset, all requests are rejected', async () => {
    delete process.env.CRON_SECRET;
    // The cron route exports GET and POST; import dynamically to pick up env changes
    const { GET } = await import('../app/api/cron/content-facebook-publisher/route');
    const req = new Request('http://localhost/api/cron/content-facebook-publisher', {
      method: 'GET',
      headers: {},
    });
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
  });

  it('CRON_SECRET mismatch → 401', async () => {
    process.env.CRON_SECRET = 'correct-secret';
    const { GET } = await import('../app/api/cron/content-facebook-publisher/route');
    const req = new Request('http://localhost/api/cron/content-facebook-publisher', {
      method: 'GET',
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
  });

  it('no Meta publish when FACEBOOK_PAGE_API_ENABLED is not set', async () => {
    process.env.CRON_SECRET              = 'test-secret-abc';
    delete process.env.FACEBOOK_PAGE_API_ENABLED;

    const { GET } = await import('../app/api/cron/content-facebook-publisher/route');
    const req = new Request('http://localhost/api/cron/content-facebook-publisher', {
      method: 'GET',
      headers: { authorization: 'Bearer test-secret-abc' },
    });
    const res  = await GET(req as unknown as Parameters<typeof GET>[0]);
    const body = await res.json() as { ok: boolean; skipped?: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe(true);
  });

  it('no Meta publish when FACEBOOK_PAGE_API_ENABLED=false', async () => {
    process.env.CRON_SECRET              = 'test-secret-abc';
    process.env.FACEBOOK_PAGE_API_ENABLED = 'false';

    const { GET } = await import('../app/api/cron/content-facebook-publisher/route');
    const req = new Request('http://localhost/api/cron/content-facebook-publisher', {
      method: 'GET',
      headers: { authorization: 'Bearer test-secret-abc' },
    });
    const res  = await GET(req as unknown as Parameters<typeof GET>[0]);
    const body = await res.json() as { ok: boolean; skipped?: boolean };
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe(true);
  });
});

// ─── M. No W28 dry-run publication path ───────────────────────────────────────

describe('W28 dry-run cards — no publication path', () => {
  const W28_TAG = 'dry_run_phase4_proven_reference_2026_W28';

  it('W28 sprint tag starts with DRY_RUN_CREATED_BY_PREFIX', () => {
    expect(W28_TAG.startsWith(DRY_RUN_CREATED_BY_PREFIX)).toBe(true);
  });

  it('W28 dry-run card is blocked for all publishability checks', () => {
    const card = makeCard({
      created_by:       W28_TAG,
      lifecycle_status: 'ready',
      risk_level:       'low',
      blocked_reason:   undefined,
    });
    const decision = evaluatePublishability(card, null, makeCtx());
    expect(decision.eligible).toBe(false);
    expect(decision.policy_rule).toBe('dry_run_card');
  });

  it('W28 dry-run card with regulatory hold is still blocked as dry-run (emergency → dry-run order)', () => {
    const card = makeCard({
      created_by:   W28_TAG,
      blocked_reason: `${REGULATORY_BLOCKED_REASON_PREFIX} färdskrivare`,
      lifecycle_status: 'held',
    });
    const decision = evaluatePublishability(card, null, makeCtx());
    // emergency_pause is checked first, then dry_run
    expect(decision.eligible).toBe(false);
    expect(['emergency_pause', 'dry_run_card', 'ineligible_lifecycle']).toContain(decision.policy_rule);
  });
});
