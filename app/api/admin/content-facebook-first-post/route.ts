// app/api/admin/content-facebook-first-post/route.ts
//
// Facebook Content Bridge V1 — Controlled First-Post
//
// One-shot endpoint for founder-authorized immediate publish.
// Bypasses the schedule/cron cycle; publishes NOW when called.
//
// Safety constraints (always enforced):
//   ✓ Requires recruiter session cookie (requireRecruiterAuth)
//   ✓ Requires body { card_id: string, confirm: true }
//   ✓ Requires FACEBOOK_PAGE_API_ENABLED === 'true'
//   ✓ Runs all 19 policy rules (evaluatePublishability)
//   ✓ Runs text adapter safety checks (adaptForFacebook)
//   ✓ Blocks dry-run cards
//   ✓ Rejects if active queue entry already exists
//   ✓ Logs to system_actions with triggered_by: 'founder_first_post'
//   ✗ Does NOT schedule recurring publishing
//   ✗ Does NOT accept arbitrary text input
//   ✗ Does NOT expose PAGE_ID or PAGE_TOKEN
//   ✗ Does NOT auto-retry on failure
//   ✗ Does NOT run queue planner

export const maxDuration = 60;

import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '@/lib/recruiterAuth';
import { db } from '@/lib/db';
import {
  isFacebookPagePostEnabled,
  getFacebookPageAdapter,
} from '@/lib/logistikklubbPublisher';
import {
  evaluatePublishability,
  DRY_RUN_CREATED_BY_PREFIX,
} from '@/lib/content/facebookPublishPolicy';
import { adaptForFacebook } from '@/lib/content/facebookTextAdapter';
import {
  getQueueEntryByCardId,
  createQueueEntry,
  markEligible,
  markPublished,
  markFailed,
  getPublishConfig,
  getFbPostsToday,
  getFbPostsThisWeek,
  getFbCtaThisWeek,
  getRecentTopicSignatures,
} from '@/lib/content/facebookPublishQueue';
import { logAction } from '@/lib/systemActions';
import type { CampaignCard } from '@/lib/content/types';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  // ── Gate check ─────────────────────────────────────────────────────────────
  if (!isFacebookPagePostEnabled()) {
    return NextResponse.json(
      {
        ok:      false,
        reason:  'gate_disabled',
        message: 'FACEBOOK_PAGE_API_ENABLED is not true — connect Meta credentials first',
      },
      { status: 503 },
    );
  }

  // ── Body validation ────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'bad_request', message: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { card_id, confirm } = body as Record<string, unknown>;

  if (!card_id || typeof card_id !== 'string') {
    return NextResponse.json(
      { ok: false, reason: 'bad_request', message: 'card_id is required and must be a string' },
      { status: 400 },
    );
  }
  if (confirm !== true) {
    return NextResponse.json(
      { ok: false, reason: 'bad_request', message: 'confirm: true is required — explicit founder intent' },
      { status: 400 },
    );
  }

  // ── Fetch card ─────────────────────────────────────────────────────────────
  const { data: cardRow, error: cardError } = await db
    .from('content_campaign_cards')
    .select('*')
    .eq('id', card_id)
    .single();

  if (cardError || !cardRow) {
    return NextResponse.json(
      { ok: false, reason: 'not_found', message: `Card not found: ${card_id}` },
      { status: 404 },
    );
  }

  const card = cardRow as unknown as CampaignCard & { draft_text?: string | null; hashtag_set?: string[] };

  // ── Dry-run guard ──────────────────────────────────────────────────────────
  if (card.created_by?.startsWith(DRY_RUN_CREATED_BY_PREFIX)) {
    return NextResponse.json(
      { ok: false, reason: 'dry_run_card', message: 'Dry-run cards cannot be published via this route' },
      { status: 422 },
    );
  }

  // ── Existing queue entry check ─────────────────────────────────────────────
  const existing = await getQueueEntryByCardId(card_id);
  if (existing) {
    return NextResponse.json(
      {
        ok:      false,
        reason:  'already_queued',
        message: `Card already has an active queue entry in status '${existing.publish_status}'`,
        entry:   existing,
      },
      { status: 409 },
    );
  }

  // ── Fetch publish context ──────────────────────────────────────────────────
  const [config, postsToday, postsThisWeek, ctaThisWeek, recentSigs] = await Promise.all([
    getPublishConfig(),
    getFbPostsToday(),
    getFbPostsThisWeek(),
    getFbCtaThisWeek(),
    getRecentTopicSignatures(14),
  ]);

  const ctx = {
    emergency_pause:         config.emergency_pause,
    paused_pillars:          config.paused_pillars,
    paused_angles:           config.paused_angles,
    fb_posts_today:          postsToday,
    fb_posts_this_week:      postsThisWeek,
    fb_cta_this_week:        ctaThisWeek,
    max_posts_per_day:       config.max_posts_per_day,
    max_posts_per_week:      config.max_posts_per_week,
    max_cta_per_week:        config.max_cta_per_week,
    recent_topic_signatures: recentSigs,
  };

  // ── Policy evaluation ──────────────────────────────────────────────────────
  const decision = evaluatePublishability(card, null, ctx);
  if (!decision.eligible) {
    return NextResponse.json(
      {
        ok:      false,
        reason:  decision.policy_rule ?? 'policy_block',
        message: decision.blocked_reason ?? 'Card is not eligible for publishing',
      },
      { status: 422 },
    );
  }

  // ── Text adaptation ────────────────────────────────────────────────────────
  let fbCopy: ReturnType<typeof adaptForFacebook>;
  try {
    fbCopy = adaptForFacebook(card);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, reason: 'adapter_error', message: msg },
      { status: 422 },
    );
  }

  // ── Create queue entry ─────────────────────────────────────────────────────
  let entry = await createQueueEntry(card_id, 'founder');

  try {
    entry = await markEligible(entry.id, fbCopy.text, fbCopy.hashtags);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, reason: 'queue_error', message: msg, entry },
      { status: 500 },
    );
  }

  // ── Publish ────────────────────────────────────────────────────────────────
  const adapter = getFacebookPageAdapter();
  const result  = await adapter.publish(entry.id, fbCopy.text);

  if (result.ok) {
    const published = await markPublished(entry.id, result.postId ?? '');
    await logAction({
      action_type:  'content_facebook_post_published',
      triggered_by: 'founder_first_post',
      target_type:  'content_facebook_queue_entry',
      target_id:    entry.id,
      status:       'completed',
      result: {
        card_id,
        facebook_post_id: result.postId ?? null,
        method:           result.method,
        is_cta:           String(card.cta_type !== 'none'),
        topic_signature:  card.topic_signature,
      },
    });
    return NextResponse.json({ ok: true, facebook_post_id: result.postId ?? '', entry: published });
  }

  const failReason = `Facebook API: ${result.message}`;
  const failed = await markFailed(entry.id, failReason);
  await logAction({
    action_type:  'content_facebook_post_failed',
    triggered_by: 'founder_first_post',
    target_type:  'content_facebook_queue_entry',
    target_id:    entry.id,
    status:       'failed',
    error:        failReason,
    result:       { card_id, failure_reason: result.reason },
  });
  return NextResponse.json(
    { ok: false, reason: result.reason ?? 'api_error', message: failReason, entry: failed },
    { status: 502 },
  );
}
