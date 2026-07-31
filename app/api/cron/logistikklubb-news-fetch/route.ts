import { type NextRequest, NextResponse } from 'next/server';
import { runNewsRelayFetch } from '../../../../lib/newsRelayAgent';
import { logAction } from '../../../../lib/systemActions';

// GET /api/cron/logistikklubb-news-fetch
// Called daily by Vercel cron (see vercel.json). Vercel sends GET requests.
//
// Fetches new articles from allowlisted Swedish transport/logistics RSS feeds,
// deduplicates, validates recency, and writes approved-pending drafts.
// Founder must approve each draft before it enters the schedule.
//
// Also accepts POST for manual founder trigger (admin panel "Fetch now" button).

async function handleFetch(): Promise<NextResponse> {
  try {
    const result = await runNewsRelayFetch();

    await logAction({
      action_type:  'logistikklubb_news_relay_completed',
      triggered_by: 'cron',
      target_type:  'logistikklubb_scheduled_post',
      target_id:    `news-relay-${new Date().toISOString().slice(0, 10)}`,
      status:       result.errors.length === 0 ? 'completed' : 'completed',
      result:       result as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true, ...result });
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
  return handleFetch();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleFetch();
}
