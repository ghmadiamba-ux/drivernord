import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { generateAndSaveSequence } from '../../../../../lib/logistikklubbSchedule';
import { logAction } from '../../../../../lib/systemActions';

// POST /api/admin/logistikklubb-schedule/generate
// Generates a new 5-day sequence from market signals and saves as draft posts.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { sequence_id, posts } = await generateAndSaveSequence();

    await logAction({
      action_type:  'logistikklubb_sequence_generated',
      triggered_by: 'founder',
      target_type:  'logistikklubb_scheduled_post',
      target_id:    sequence_id,
      status:       'completed',
      result:       { sequence_id, post_count: posts.length },
    });

    return NextResponse.json({ ok: true, sequence_id, posts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
