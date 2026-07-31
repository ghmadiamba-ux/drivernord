import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { runNewsRelayFetch, NEWS_SOURCES } from '../../../../lib/newsRelayAgent';
import { db } from '../../../../lib/db';
import { logAction } from '../../../../lib/systemActions';

// GET /api/admin/logistikklubb-news
// Returns recent news relay drafts and source configuration.
// Gracefully returns migration_required: true if migration 020 is not applied.

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await db
      .from('logistikklubb_scheduled_posts')
      .select('id, title, status, source_url, source_name, source_published_at, post_text, created_at, approved_by_founder')
      .eq('is_news_relay', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      if (error.message.includes('column') && error.message.includes('is_news_relay')) {
        return NextResponse.json({ drafts: [], migration_required: true, sources: NEWS_SOURCES });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({
      drafts:             data ?? [],
      migration_required: false,
      sources:            NEWS_SOURCES,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/admin/logistikklubb-news
// { action: "fetch" } — manually trigger a news relay fetch right now.
// Returns the same result shape as the cron route.

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.action !== 'fetch') {
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  }

  try {
    const result = await runNewsRelayFetch();

    await logAction({
      action_type:  'logistikklubb_news_relay_completed',
      triggered_by: 'founder',
      target_type:  'logistikklubb_scheduled_post',
      target_id:    `news-relay-${new Date().toISOString().slice(0, 10)}`,
      status:       'completed',
      result:       result as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
