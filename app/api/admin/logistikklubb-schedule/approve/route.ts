import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { approvePost, getScheduledPosts } from '../../../../../lib/logistikklubbSchedule';
import { logAction } from '../../../../../lib/systemActions';

// POST /api/admin/logistikklubb-schedule/approve
// Body: { id: string } — approve one post
//    OR { approve_all: true, sequence_id: string } — approve all draft posts in a sequence
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { id?: string; approve_all?: boolean; sequence_id?: string };

  if (body.approve_all && body.sequence_id) {
    // Approve all draft posts in this sequence
    const posts = await getScheduledPosts({ status: 'draft' });
    const targets = posts.filter((p) => p.sequence_id === body.sequence_id);

    const results = await Promise.allSettled(targets.map((p) => approvePost(p.id)));
    const approved = results.filter((r) => r.status === 'fulfilled').length;
    const failed   = results.filter((r) => r.status === 'rejected').length;

    await logAction({
      action_type:  'logistikklubb_posts_approved',
      triggered_by: 'founder',
      target_type:  'logistikklubb_scheduled_post',
      target_id:    body.sequence_id,
      status:       failed > 0 ? 'failed' : 'completed',
      result:       { approved, failed },
    });

    return NextResponse.json({ ok: true, approved, failed });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id or approve_all+sequence_id required' }, { status: 400 });
  }

  try {
    const post = await approvePost(body.id);

    await logAction({
      action_type:  'logistikklubb_posts_approved',
      triggered_by: 'founder',
      target_type:  'logistikklubb_scheduled_post',
      target_id:    body.id,
      status:       'completed',
      result:       { post_id: body.id, sequence_id: post.sequence_id },
    });

    return NextResponse.json({ ok: true, post });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
