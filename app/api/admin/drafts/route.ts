import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { listDrafts } from '../../../../lib/companyNeedDraft';
import type { DraftStatus } from '../../../../lib/companyNeedDraft';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');
  const limitParam  = url.searchParams.get('limit');

  const validStatuses: DraftStatus[] = [
    'draft_created', 'incomplete', 'ready_for_review',
    'approved_for_matching', 'rejected', 'promoted', 'hold_agency',
  ];

  let statusFilter: DraftStatus | DraftStatus[] | undefined;
  if (statusParam) {
    const requested = statusParam.split(',').map((s) => s.trim()) as DraftStatus[];
    const invalid = requested.filter((s) => !validStatuses.includes(s));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `invalid status values: ${invalid.join(', ')}` },
        { status: 400 },
      );
    }
    statusFilter = requested.length === 1 ? requested[0] : requested;
  }

  const limit = limitParam ? parseInt(limitParam, 10) : 100;
  if (isNaN(limit) || limit < 1 || limit > 500) {
    return NextResponse.json({ error: 'limit must be 1–500' }, { status: 400 });
  }

  try {
    const drafts = await listDrafts({ status: statusFilter, limit });
    return NextResponse.json({ drafts, count: drafts.length });
  } catch (err) {
    console.error('[GET /api/admin/drafts] failed:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
