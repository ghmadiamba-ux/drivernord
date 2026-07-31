import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { markPostPublished } from '../../../../../lib/logistikklubbSchedule';
import { logAction } from '../../../../../lib/systemActions';

// POST /api/admin/logistikklubb-schedule/mark-published
// Body: { id: string }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { id?: string };
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const post = await markPostPublished(body.id);

    await logAction({
      action_type:  'logistikklubb_post_marked_published',
      triggered_by: 'founder',
      target_type:  'logistikklubb_scheduled_post',
      target_id:    body.id,
      status:       'completed',
      result:       { post_id: body.id, published_at: post.published_at },
    });

    return NextResponse.json({ ok: true, post });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
