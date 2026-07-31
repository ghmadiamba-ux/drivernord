import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { getScheduledPosts } from '../../../../lib/logistikklubbSchedule';

// GET /api/admin/logistikklubb-schedule
// Returns all scheduled posts ordered by day_number.
// Gracefully handles migration 017 not yet applied.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const posts = await getScheduledPosts();
    return NextResponse.json({ posts, migration_required: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist') || msg.includes('relation')) {
      return NextResponse.json({ posts: [], migration_required: true });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
