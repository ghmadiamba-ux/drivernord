import { type NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import {
  selectDailyMessage,
  getStockholmDateString,
  type DailySlot,
} from '../../../../lib/logistikklubbDailyNotify';
import {
  notifyFounderWhatsApp,
  isFounderWhatsAppEnabled,
} from '../../../../lib/founderNotifier';
import { logAction } from '../../../../lib/systemActions';
import type { PostDuePayload } from '../../../../lib/founderNotifier';

// GET  /api/cron/logistikklubb-daily-notify  — called by Vercel cron
// POST /api/cron/logistikklubb-daily-notify  — manual founder trigger (accepts { slot })
//
// Generates one Swedish Logistikklubb message and delivers it privately to the
// founder's WhatsApp via the existing relay. The founder decides manually whether
// to copy it into the Logistikklubben group.
//
// Slot determination (GET, automatic):
//   UTC hour < 12  → morning  (fires at 05:00 UTC = 06:00 CET / 07:00 CEST)
//   UTC hour >= 12 → evening  (fires at 17:00 UTC = 18:00 CET / 19:00 CEST)
//
// Idempotency: skips the slot if already successfully sent today (Stockholm date).
// All existing WhatsApp gates apply: FOUNDER_WHATSAPP_ENABLED, phone allowlist, rate limit.
// Response never includes WHATSAPP_FOUNDER_PHONE or WHATSAPP_ACCESS_TOKEN.

// ─── Idempotency ─────────────────────────────────────────────────────────────

async function hasAlreadySent(targetId: string): Promise<boolean> {
  try {
    const { count, error } = await db
      .from('system_actions')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'logistikklubb_daily_notify_sent')
      .eq('target_id', targetId)
      .eq('status', 'completed');
    if (error) return false;
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

// ─── Core handler ─────────────────────────────────────────────────────────────

async function handleDailyNotify(overrideSlot?: DailySlot): Promise<NextResponse> {
  try {
    const utcHour       = new Date().getUTCHours();
    const slot: DailySlot = overrideSlot ?? (utcHour < 12 ? 'morning' : 'evening');
    const stockholmDate = getStockholmDateString();
    const targetId      = `daily-${slot}-${stockholmDate}`;

    if (await hasAlreadySent(targetId)) {
      return NextResponse.json({
        ok:      true,
        skipped: true,
        reason:  'already_sent',
        slot,
        date:    stockholmDate,
      });
    }

    const msg = selectDailyMessage(slot);
    const post: PostDuePayload = {
      id:             targetId,
      day_number:     0,
      title:          msg.title,
      category:       msg.category,
      post_text:      msg.post_text,
      suggested_time: null,
    };

    const waResult = await notifyFounderWhatsApp(post);

    await logAction({
      action_type:  waResult.sent
        ? 'logistikklubb_daily_notify_sent'
        : 'logistikklubb_daily_notify_failed',
      triggered_by: 'cron',
      target_type:  'logistikklubb_daily_notify',
      target_id:    targetId,
      status:       waResult.sent    ? 'completed'
                  : waResult.dry_run ? 'pending'
                  :                    'failed',
      result: {
        slot,
        date:       stockholmDate,
        channel:    'whatsapp',
        dry_run:    waResult.dry_run,
        message_id: waResult.message_id,
        title:      msg.title,
      },
      ...(waResult.error ? { error: waResult.error } : {}),
    });

    return NextResponse.json({
      ok:               waResult.sent || waResult.dry_run,
      sent:             waResult.sent,
      dry_run:          waResult.dry_run,
      slot,
      date:             stockholmDate,
      title:            msg.title,
      whatsapp_enabled: isFounderWhatsAppEnabled(),
      error:            waResult.error,
      message_id:       waResult.message_id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function checkCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return req.headers.get('authorization') === `Bearer ${cronSecret}`;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleDailyNotify();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await req.json() as Record<string, unknown>;
  } catch { /* no-op — body stays empty */ }

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: 'confirm: true required for manual trigger' },
      { status: 400 },
    );
  }

  let slot: DailySlot | undefined;
  if (body.slot === 'morning' || body.slot === 'evening') {
    slot = body.slot;
  }
  return handleDailyNotify(slot);
}
