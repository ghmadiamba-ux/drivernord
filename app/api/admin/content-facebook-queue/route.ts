// app/api/admin/content-facebook-queue/route.ts
//
// Facebook Content Bridge V1 — Admin API
//
// Endpoints:
//   GET  /api/admin/content-facebook-queue?card_id=<uuid>
//        Returns the active queue entry for a card (or null if none)
//
//   GET  /api/admin/content-facebook-queue?status=<status>
//        Returns all queue entries with the given status
//
//   POST /api/admin/content-facebook-queue
//        Enqueues a card. Evaluates publishability, adapts copy, creates entry.
//        Body: { card_id: string, queued_by?: 'system' | 'founder' }
//
//   PATCH /api/admin/content-facebook-queue
//        Applies a control action to an existing entry.
//        Body: { entry_id: string, action: 'schedule' | 'recheck' | 'emergency_pause' | 'resume_pause' | 'pause_pillar' | 'resume_pillar', payload?: unknown }
//
// Security: requires recruiter session (admin cookie auth, same as other admin routes).
// Does NOT require founder approval per-card for routine low-risk publishing.

import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '@/lib/recruiterAuth';
import { db } from '../../../../lib/db';
import {
  createQueueEntry,
  getQueueEntryByCardId,
  getEntriesByStatus,
  markEligible,
  markBlocked,
  scheduleEntry,
  setEmergencyPause,
  setPausedPillars,
  getPublishConfig,
  getFbPostsToday,
  getFbPostsThisWeek,
  getFbCtaThisWeek,
  getRecentTopicSignatures,
  type FbPublishStatus,
} from '../../../../lib/content/facebookPublishQueue';
import { getNextPublishingSlots } from '../../../../lib/content/facebookQueuePlanner';
import {
  evaluatePublishability,
  type PublishContext,
} from '../../../../lib/content/facebookPublishPolicy';
import { adaptForFacebook } from '../../../../lib/content/facebookTextAdapter';
import { logAction } from '../../../../lib/systemActions';
import type { CampaignCard } from '../../../../lib/content/types';
import type { VisualProductionPlan } from '../../../../lib/content/visualTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchCard(cardId: string): Promise<(CampaignCard & { draft_text?: string | null; visual_plan?: unknown }) | null> {
  const { data, error } = await db
    .from('content_campaign_cards')
    .select('*')
    .eq('id', cardId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return data as CampaignCard & { draft_text?: string | null; visual_plan?: unknown };
}

function extractVisualPlan(card: { visual_plan?: unknown }): VisualProductionPlan | null {
  if (!card.visual_plan || typeof card.visual_plan !== 'object') return null;
  return card.visual_plan as VisualProductionPlan;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get('card_id');
  const status = searchParams.get('status');

  const global = searchParams.get('global');

  try {
    if (cardId) {
      const entry = await getQueueEntryByCardId(cardId);
      return NextResponse.json({ entry });
    }

    if (status) {
      const entries = await getEntriesByStatus(status as FbPublishStatus);
      return NextResponse.json({ entries });
    }

    if (global === 'true') {
      // Returns config + live queue stats for the cockpit autonomous status banner
      const [config, postsToday, postsThisWeek, ctaThisWeek, scheduledEntries] = await Promise.all([
        getPublishConfig(),
        getFbPostsToday(),
        getFbPostsThisWeek(),
        getFbCtaThisWeek(),
        getEntriesByStatus(['scheduled', 'queued', 'eligible', 'pending_check'] as FbPublishStatus[]),
      ]);

      const scheduledDates = scheduledEntries
        .filter(e => e.scheduled_at)
        .map(e => new Date(e.scheduled_at!));

      const nextSlots = getNextPublishingSlots(new Date(), 1, scheduledDates);

      return NextResponse.json({
        emergency_pause:    config.emergency_pause,
        paused_pillars:     config.paused_pillars,
        paused_angles:      config.paused_angles,
        max_posts_per_day:  config.max_posts_per_day,
        max_posts_per_week: config.max_posts_per_week,
        max_cta_per_week:   config.max_cta_per_week,
        posts_today:        postsToday,
        posts_this_week:    postsThisWeek,
        cta_this_week:      ctaThisWeek,
        scheduled_count:    scheduledEntries.length,
        next_slot:          nextSlots[0]?.toISOString() ?? null,
      });
    }

    return NextResponse.json({ error: 'Provide card_id, status, or global=true' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST — enqueue a card ────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  try {
    const body = await req.json() as { card_id?: string; queued_by?: string };
    const { card_id: cardId, queued_by: queuedBy = 'system' } = body;

    if (!cardId || typeof cardId !== 'string') {
      return NextResponse.json({ error: 'card_id is required' }, { status: 400 });
    }

    // 1. Fetch card
    const card = await fetchCard(cardId);
    if (!card) {
      return NextResponse.json({ error: `Card ${cardId} not found` }, { status: 404 });
    }

    // 2. Refuse to process dry-run cards immediately
    if (card.created_by?.startsWith('dry_run_')) {
      return NextResponse.json(
        { error: 'Dry-run cards cannot be enqueued for Facebook publishing' },
        { status: 422 },
      );
    }

    // 3. Check if active entry already exists
    const existing = await getQueueEntryByCardId(cardId);
    if (existing) {
      return NextResponse.json(
        { error: `Card ${cardId} already has an active queue entry (status: ${existing.publish_status})`, entry: existing },
        { status: 409 },
      );
    }

    // 4. Create entry in pending_check state
    const entry = await createQueueEntry(cardId, queuedBy as 'system' | 'founder');

    // 5. Build publish context
    const config  = await getPublishConfig();
    const ctx: PublishContext = {
      emergency_pause:         config.emergency_pause,
      paused_pillars:          config.paused_pillars,
      paused_angles:           config.paused_angles,
      fb_posts_today:          await getFbPostsToday(),
      fb_posts_this_week:      await getFbPostsThisWeek(),
      fb_cta_this_week:        await getFbCtaThisWeek(),
      max_posts_per_day:       config.max_posts_per_day,
      max_posts_per_week:      config.max_posts_per_week,
      max_cta_per_week:        config.max_cta_per_week,
      recent_topic_signatures: await getRecentTopicSignatures(),
    };

    // 6. Evaluate publishability
    const visual_plan = extractVisualPlan(card);
    const decision    = evaluatePublishability(card, visual_plan, ctx);

    if (!decision.eligible) {
      const blocked = await markBlocked(entry.id, decision.blocked_reason!, decision.policy_rule);
      await logAction({
        action_type:  'content_facebook_card_blocked',
        triggered_by: queuedBy,
        target_type:  'content_facebook_queue_entry',
        target_id:    entry.id,
        status:       'failed',
        result:       { card_id: cardId, reason: decision.blocked_reason, rule: decision.policy_rule },
      });
      return NextResponse.json({ entry: blocked, eligible: false, blocked_reason: decision.blocked_reason }, { status: 422 });
    }

    // 7. Adapt copy
    let fbCopy: { text: string; hashtags: string[] };
    try {
      const adapted = adaptForFacebook(card);
      fbCopy = { text: adapted.text, hashtags: adapted.hashtags };
    } catch (e) {
      const adapterError = e instanceof Error ? e.message : String(e);
      const blocked = await markBlocked(entry.id, `Text adaptation failed: ${adapterError}`, 'text_adapter_error');
      return NextResponse.json({ entry: blocked, eligible: false, blocked_reason: adapterError }, { status: 422 });
    }

    // 8. Mark eligible and schedule for next eligible slot
    const updated = await markEligible(entry.id, fbCopy.text, fbCopy.hashtags);

    // Auto-schedule for tomorrow 07:00 UTC (same time as cron)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(7, 0, 0, 0);
    const scheduled = await scheduleEntry(entry.id, tomorrow);

    await logAction({
      action_type:  'content_facebook_card_scheduled',
      triggered_by: queuedBy,
      target_type:  'content_facebook_queue_entry',
      target_id:    entry.id,
      status:       'completed',
      result:       { card_id: cardId, scheduled_at: tomorrow.toISOString() },
    });

    return NextResponse.json({ entry: scheduled, eligible: true, scheduled_at: tomorrow.toISOString() }, { status: 201 });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PATCH — control actions ──────────────────────────────────────────────────

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  try {
    const body = await req.json() as {
      action: string;
      entry_id?: string;
      payload?: unknown;
    };

    const { action, entry_id: entryId, payload } = body;

    switch (action) {

      case 'emergency_pause': {
        await setEmergencyPause(true, 'founder');
        await logAction({
          action_type:  'content_facebook_emergency_pause',
          triggered_by: 'founder',
          target_type:  'content_facebook_queue_entry',
          target_id:    null,
          status:       'completed',
          result:       { paused: true },
        });
        return NextResponse.json({ ok: true, emergency_pause: true });
      }

      case 'resume_pause': {
        await setEmergencyPause(false, 'founder');
        await logAction({
          action_type:  'content_facebook_emergency_pause',
          triggered_by: 'founder',
          target_type:  'content_facebook_queue_entry',
          target_id:    null,
          status:       'completed',
          result:       { paused: false },
        });
        return NextResponse.json({ ok: true, emergency_pause: false });
      }

      case 'pause_pillar': {
        const pillar = (payload as { pillar?: string })?.pillar;
        if (!pillar) return NextResponse.json({ error: 'payload.pillar required' }, { status: 400 });
        const config  = await getPublishConfig();
        const pillars = Array.from(new Set([...config.paused_pillars, pillar]));
        await setPausedPillars(pillars, 'founder');
        await logAction({
          action_type:  'content_facebook_category_paused',
          triggered_by: 'founder',
          target_type:  'content_facebook_queue_entry',
          target_id:    null,
          status:       'completed',
          result:       { paused_pillar: pillar, all_paused_pillars: pillars },
        });
        return NextResponse.json({ ok: true, paused_pillars: pillars });
      }

      case 'resume_pillar': {
        const pillar = (payload as { pillar?: string })?.pillar;
        if (!pillar) return NextResponse.json({ error: 'payload.pillar required' }, { status: 400 });
        const config  = await getPublishConfig();
        const pillars = config.paused_pillars.filter((p: string) => p !== pillar);
        await setPausedPillars(pillars, 'founder');
        return NextResponse.json({ ok: true, paused_pillars: pillars });
      }

      case 'schedule': {
        if (!entryId) return NextResponse.json({ error: 'entry_id required' }, { status: 400 });
        const at = (payload as { scheduled_at?: string })?.scheduled_at;
        const scheduledAt = at ? new Date(at) : (() => {
          const d = new Date(); d.setUTCDate(d.getUTCDate() + 1); d.setUTCHours(7, 0, 0, 0); return d;
        })();
        const updated = await scheduleEntry(entryId, scheduledAt);
        return NextResponse.json({ entry: updated });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
