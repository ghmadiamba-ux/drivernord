import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import {
  schedulePost,
  getScheduledPosts,
  computeDefaultScheduledTimes,
} from '../../../../../lib/logistikklubbSchedule';
import { logAction } from '../../../../../lib/systemActions';

// POST /api/admin/logistikklubb-schedule/schedule
// Body: { id: string; scheduled_at: string } — schedule one post at specific time
//    OR { sequence_id: string; use_defaults: true } — schedule all approved posts with default times
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    id?: string;
    scheduled_at?: string;
    sequence_id?: string;
    use_defaults?: boolean;
  };

  if (body.sequence_id && body.use_defaults) {
    // Schedule all approved posts in this sequence with default times
    const posts = await getScheduledPosts({ status: 'approved' });
    const targets = posts
      .filter((p) => p.sequence_id === body.sequence_id)
      .sort((a, b) => a.day_number - b.day_number);

    if (targets.length === 0) {
      return NextResponse.json({ error: 'No approved posts found for this sequence' }, { status: 400 });
    }

    const defaultTimes = computeDefaultScheduledTimes(new Date());
    const results = await Promise.allSettled(
      targets.map((p, idx) => {
        const time = defaultTimes[idx] ?? defaultTimes[defaultTimes.length - 1]!;
        return schedulePost(p.id, time);
      })
    );

    const scheduled = results.filter((r) => r.status === 'fulfilled').length;
    const failed    = results.filter((r) => r.status === 'rejected').length;

    await logAction({
      action_type:  'logistikklubb_posts_scheduled',
      triggered_by: 'founder',
      target_type:  'logistikklubb_scheduled_post',
      target_id:    body.sequence_id,
      status:       failed > 0 ? 'failed' : 'completed',
      result:       { scheduled, failed },
    });

    return NextResponse.json({ ok: true, scheduled, failed });
  }

  if (!body.id || !body.scheduled_at) {
    return NextResponse.json({ error: 'id and scheduled_at required' }, { status: 400 });
  }

  const scheduledAt = new Date(body.scheduled_at);
  if (isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduled_at date' }, { status: 400 });
  }

  try {
    const post = await schedulePost(body.id, scheduledAt);

    await logAction({
      action_type:  'logistikklubb_posts_scheduled',
      triggered_by: 'founder',
      target_type:  'logistikklubb_scheduled_post',
      target_id:    body.id,
      status:       'completed',
      result:       { post_id: body.id, scheduled_at: scheduledAt.toISOString() },
    });

    return NextResponse.json({ ok: true, post });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
