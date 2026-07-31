import { type NextRequest, NextResponse } from 'next/server';
import { findDuePosts, markPostDue } from '../../../../lib/logistikklubbSchedule';
import {
  getPublisherAdapter,
  isAutoPostEnabled,
  isFacebookPagePostEnabled,
  getFacebookPageAdapter,
  getFacebookMaxPostsPerDay,
  getFacebookDailyPostCount,
  isRateLimitReached,
} from '../../../../lib/logistikklubbPublisher';
import { logAction } from '../../../../lib/systemActions';
import {
  isFounderNotificationsEnabled,
  notifyFounderPostDue,
  isFounderWhatsAppEnabled,
  notifyFounderWhatsApp,
} from '../../../../lib/founderNotifier';

// GET /api/cron/logistikklubb-scheduler
// Called daily at 06:00 UTC by Vercel cron (vercel.json). Vercel sends GET requests.
// Checks for scheduled posts whose scheduled_at has passed and marks them 'due'.
// In manual mode (default), this is the only action — founder copies and posts manually.
//
// Also accepts POST for manual founder trigger.
//
// Auto-posting is disabled unless WHATSAPP_GROUPS_API_ENABLED=true.
// SECURITY: Do not enable auto-posting without a verified official WhatsApp adapter.

async function handleSchedule(): Promise<NextResponse> {
  try {
    const duePosts = await findDuePosts();

    if (duePosts.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No due posts' });
    }

    const adapter     = getPublisherAdapter();
    const autoEnabled = isAutoPostEnabled();
    let processed     = 0;

    for (const post of duePosts) {
      // Transition to 'due' status regardless of auto/manual mode
      await markPostDue(post.id);

      if (autoEnabled) {
        const result = await adapter.publish(post.id, post.post_text);
        if (result.ok) {
          await logAction({
            action_type:  'logistikklubb_post_due',
            triggered_by: 'cron',
            target_type:  'logistikklubb_scheduled_post',
            target_id:    post.id,
            status:       'completed',
            result:       { method: result.method, day_number: post.day_number },
          });
        } else {
          await logAction({
            action_type:  'logistikklubb_auto_post_blocked_manual_mode',
            triggered_by: 'cron',
            target_type:  'logistikklubb_scheduled_post',
            target_id:    post.id,
            status:       'failed',
            error:        result.message,
            result:       { reason: result.reason, day_number: post.day_number },
          });
        }
      } else {
        await logAction({
          action_type:  'logistikklubb_post_due',
          triggered_by: 'cron',
          target_type:  'logistikklubb_scheduled_post',
          target_id:    post.id,
          status:       'pending',
          result:       { day_number: post.day_number, manual_action_required: true },
        });
      }

      // ── Founder email notification ────────────────────────────────────────
      // Non-blocking: a failure here never stops due-processing.
      // Requires FOUNDER_NOTIFICATIONS_ENABLED=true and FOUNDER_NOTIFICATION_EMAIL.
      if (isFounderNotificationsEnabled()) {
        const notifyResult = await notifyFounderPostDue(post);
        await logAction({
          action_type:  notifyResult.sent || notifyResult.dry_run
            ? 'founder_notification_sent'
            : 'founder_notification_failed',
          triggered_by: 'cron',
          target_type:  'logistikklubb_scheduled_post',
          target_id:    post.id,
          status:       notifyResult.sent
            ? 'completed'
            : notifyResult.dry_run
            ? 'pending'
            : 'failed',
          ...(notifyResult.error ? { error: notifyResult.error } : {}),
          result: {
            day_number: post.day_number,
            channel:    'email',
            dry_run:    notifyResult.dry_run,
          },
        });
      }

      // ── Founder WhatsApp notification ──────────────────────────────────────
      // Independent of email — both channels run on the same post.
      // Non-blocking: failure never stops markPostDue() or email notification.
      // Requires FOUNDER_WHATSAPP_ENABLED=true, WHATSAPP_FOUNDER_PHONE, WHATSAPP_ACCESS_TOKEN.
      if (isFounderWhatsAppEnabled()) {
        const waResult = await notifyFounderWhatsApp(post);
        await logAction({
          action_type:  waResult.sent || waResult.dry_run
            ? 'founder_notification_sent'
            : 'founder_notification_failed',
          triggered_by: 'cron',
          target_type:  'logistikklubb_scheduled_post',
          target_id:    post.id,
          status:       waResult.sent
            ? 'completed'
            : waResult.dry_run
            ? 'pending'
            : 'failed',
          ...(waResult.error ? { error: waResult.error } : {}),
          result: {
            day_number: post.day_number,
            channel:    'whatsapp',
            dry_run:    waResult.dry_run,
          },
        });
      }

      processed++;
    }

    // ── Facebook Page publishing pass ──────────────────────────────────────────
    // Independently gated from WhatsApp. Posts to the DriverNord Facebook Page
    // only when FACEBOOK_PAGE_API_ENABLED=true. Does NOT change post status —
    // post remains 'due' so the founder can still copy to WhatsApp manually.
    // Token is never logged. Rate cap enforced per UTC calendar day.
    if (isFacebookPagePostEnabled()) {
      const fbAdapter   = getFacebookPageAdapter();
      const fbMaxPerDay = getFacebookMaxPostsPerDay();
      let   fbToday     = await getFacebookDailyPostCount();

      for (const post of duePosts) {
        if (isRateLimitReached(fbToday, fbMaxPerDay)) {
          await logAction({
            action_type:  'logistikklubb_facebook_rate_limit_hit',
            triggered_by: 'cron',
            target_type:  'logistikklubb_scheduled_post',
            target_id:    post.id,
            status:       'cancelled',
            result:       { posts_today: fbToday, limit: fbMaxPerDay, day_number: post.day_number },
          });
          continue;
        }

        const fbResult = await fbAdapter.publish(post.id, post.post_text);

        if (fbResult.ok) {
          fbToday++;
          await logAction({
            action_type:  'logistikklubb_facebook_page_post_published',
            triggered_by: 'cron',
            target_type:  'logistikklubb_scheduled_post',
            target_id:    post.id,
            status:       'completed',
            result:       {
              method:           fbResult.method,
              day_number:       post.day_number,
              facebook_post_id: fbResult.postId ?? null,
            },
          });
        } else {
          await logAction({
            action_type:  'logistikklubb_facebook_page_post_failed',
            triggered_by: 'cron',
            target_type:  'logistikklubb_scheduled_post',
            target_id:    post.id,
            status:       'failed',
            error:        fbResult.message,
            result:       { reason: fbResult.reason, day_number: post.day_number },
          });
        }
      }
    }

    return NextResponse.json({
      ok:                    true,
      processed,
      auto_mode:             autoEnabled,
      facebook_enabled:      isFacebookPagePostEnabled(),
      notifications_enabled: isFounderNotificationsEnabled(),
      whatsapp_enabled:      isFounderWhatsAppEnabled(),
      message:               autoEnabled
        ? `${processed} posts processed via adapter`
        : `${processed} posts marked due — manual posting required`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleSchedule();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleSchedule();
}
