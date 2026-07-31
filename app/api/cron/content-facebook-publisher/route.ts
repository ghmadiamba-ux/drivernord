// app/api/cron/content-facebook-publisher/route.ts
//
// Facebook Content Bridge V1 — Cron Dispatcher
//
// Runs at 09:00 UTC daily (= 11:00 CEST in summer / 10:00 CET in winter).
// Peak organic reach window for the Swedish professional audience.
// Also accepts POST for manual founder trigger.
//
// TWO PHASES per run:
//   Phase 1 — PLANNING (autonomous queue planner)
//     Scans content_campaign_cards, applies all 19 publishability rules,
//     queues eligible low-risk cards for upcoming slots.
//     No founder approval required. Dry-run/held/regulatory cards excluded.
//
//   Phase 2 — PUBLISHING
//     Fetches queue entries where scheduled_at ≤ now, publishes via
//     FacebookPagePublisherAdapter, logs result to system_actions.
//
// WHAT IT DOES NOT DO:
//   ✗ Does NOT require founder pre-approval for routine low-risk cards
//   ✗ Does NOT modify content_campaign_cards
//   ✗ Does NOT touch logistikklubb_scheduled_posts
//   ✗ Does NOT bypass CRON_SECRET
//   ✗ Does NOT activate if FACEBOOK_PAGE_API_ENABLED is not 'true'
//
// SECURITY:
//   CRON_SECRET is ALWAYS required. If unset, returns 401 for all callers.
//   This is stricter than logistikklubb-scheduler (which had a legacy bypass).
//   Facebook Page publishing is an irreversible external action.

export const maxDuration = 60;

import { type NextRequest, NextResponse } from 'next/server';
import {
  getDueEntries,
  getPublishConfig,
  getFbPostsToday,
  markDue,
  markPublished,
  markFailed,
} from '../../../../lib/content/facebookPublishQueue';
import {
  isFacebookPagePostEnabled,
  getFacebookPageAdapter,
} from '../../../../lib/logistikklubbPublisher';
import { planFacebookQueue } from '../../../../lib/content/facebookQueuePlanner';
import { logAction } from '../../../../lib/systemActions';

// ─── Auth ────────────────────────────────────────────────────────────────────

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // always required — no legacy bypass
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function handlePublish(): Promise<NextResponse> {
  try {
    // Gate check — no work at all if Facebook is disabled
    if (!isFacebookPagePostEnabled()) {
      return NextResponse.json({
        ok:      true,
        skipped: true,
        reason:  'FACEBOOK_PAGE_API_ENABLED is not true — no planning or publishing attempted',
        planned:   0,
        published: 0,
        failed:    0,
      });
    }

    // ── Phase 1: Autonomous queue planning ────────────────────────────────────

    const planResult = await planFacebookQueue();

    await logAction({
      action_type:  'content_facebook_queue_plan_run',
      triggered_by: 'cron',
      target_type:  'content_facebook_queue_entry',
      target_id:    null,
      status:       'completed',
      result: {
        queued:                  planResult.queued,
        skipped:                 planResult.skipped,
        already_queued:          planResult.already_queued,
        errors:                  planResult.errors,
        week_budget_remaining:   planResult.week_budget_remaining,
        skipped_emergency_pause: planResult.skipped_emergency_pause,
      },
    });

    // ── Phase 2: Publish due entries ──────────────────────────────────────────

    // Config — emergency pause and caps
    const config = await getPublishConfig();
    if (config.emergency_pause) {
      await logAction({
        action_type:  'content_facebook_emergency_pause',
        triggered_by: 'cron',
        target_type:  'content_facebook_queue_entry',
        target_id:    null,
        status:       'cancelled',
        result:       { reason: 'Emergency pause is active', posts_blocked: 0 },
      });
      return NextResponse.json({
        ok:      true,
        skipped: true,
        reason:  'Emergency pause is active — all publishing suspended',
        planned:   planResult.queued,
        published: 0,
        failed:    0,
      });
    }

    const dueEntries = await getDueEntries();
    if (dueEntries.length === 0) {
      return NextResponse.json({
        ok: true, planned: planResult.queued, processed: 0, published: 0, failed: 0,
      });
    }

    const adapter    = getFacebookPageAdapter();
    let postsToday   = await getFbPostsToday();
    const maxPerDay  = config.max_posts_per_day;

    let published = 0;
    let failed    = 0;

    for (const entry of dueEntries) {
      if (postsToday >= maxPerDay) {
        await logAction({
          action_type:  'content_facebook_cap_hit',
          triggered_by: 'cron',
          target_type:  'content_facebook_queue_entry',
          target_id:    entry.id,
          status:       'cancelled',
          result:       { card_id: entry.card_id, posts_today: postsToday, limit: maxPerDay },
        });
        continue;
      }

      await markDue(entry.id);

      const copy = entry.facebook_copy ?? '';
      if (!copy.trim()) {
        const reason = 'Queue entry has no facebook_copy — cannot publish';
        await markFailed(entry.id, reason);
        await logAction({
          action_type:  'content_facebook_post_failed',
          triggered_by: 'cron',
          target_type:  'content_facebook_queue_entry',
          target_id:    entry.id,
          status:       'failed',
          error:        reason,
          result:       { card_id: entry.card_id },
        });
        failed++;
        continue;
      }

      const result = await adapter.publish(entry.id, copy);

      if (result.ok) {
        postsToday++;
        await markPublished(entry.id, result.postId ?? '');
        await logAction({
          action_type:  'content_facebook_post_published',
          triggered_by: 'cron',
          target_type:  'content_facebook_queue_entry',
          target_id:    entry.id,
          status:       'completed',
          result: {
            card_id:          entry.card_id,
            facebook_post_id: result.postId ?? null,
            method:           result.method,
            is_cta:           String((entry as unknown as Record<string, unknown>).cta_type !== 'none'),
            topic_signature:  null,
          },
        });
        published++;
      } else {
        const reason = `Facebook API: ${result.message}`;
        await markFailed(entry.id, reason);
        await logAction({
          action_type:  'content_facebook_post_failed',
          triggered_by: 'cron',
          target_type:  'content_facebook_queue_entry',
          target_id:    entry.id,
          status:       'failed',
          error:        reason,
          result:       { card_id: entry.card_id, failure_reason: result.reason },
        });
        failed++;
      }
    }

    return NextResponse.json({
      ok:                true,
      planned:           planResult.queued,
      processed:         dueEntries.length,
      published,
      failed,
      posts_today_after: postsToday,
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[content-facebook-publisher] unhandled error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return handlePublish();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return handlePublish();
}
