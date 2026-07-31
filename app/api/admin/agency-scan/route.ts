import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '@/lib/recruiterAuth';
import {
  getChronicUnfilledReport,
  getAllAgencySignals,
  syncAgencyDraftsToSignals,
} from '@/lib/agencyScanAgent';

// GET /api/admin/agency-scan
// Returns chronic unfilled agencies and all active agency signals.
// Gracefully handles migration 018 not yet applied.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [chronic, all] = await Promise.all([
      getChronicUnfilledReport(),
      getAllAgencySignals(),
    ]);
    return NextResponse.json({ chronic_unfilled: chronic, all_signals: all });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('does not exist') || msg.includes('relation')) {
      return NextResponse.json({
        chronic_unfilled:   [],
        all_signals:        [],
        migration_required: true,
      });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/admin/agency-scan
// Body: { "action": "sync" }
// Scans existing company_need_drafts for staffing agencies and upserts to agency_posting_signals.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = (body as Record<string, unknown>)?.action as string | undefined;
  if (action !== 'sync') {
    return NextResponse.json(
      { error: 'invalid_action', hint: 'send { "action": "sync" }' },
      { status: 400 },
    );
  }

  try {
    const result = await syncAgencyDraftsToSignals();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('does not exist') || msg.includes('relation')) {
      return NextResponse.json({ error: 'migration_018_not_applied' }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
