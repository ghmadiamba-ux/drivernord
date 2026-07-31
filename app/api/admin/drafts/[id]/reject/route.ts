import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../../lib/recruiterAuth';
import { rejectDraft } from '../../../../../../lib/companyNeedDraft';

export const dynamic = 'force-dynamic';

// POST /api/admin/drafts/[id]/reject
//
// Marks a company_need_draft as rejected with an explicit reason.
// Use for duplicates, ineligible companies, or founder vetoes.
// Logs a company_need_draft_rejected system_action for audit trail.
//
// Safety: promoted drafts cannot be rejected (409).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  let reason = 'no_reason_given';
  try {
    const body = await req.json();
    if (typeof body?.reason === 'string' && body.reason.trim()) {
      reason = body.reason.trim();
    }
  } catch { /* reason stays at default */ }

  const outcome = await rejectDraft(id, reason);

  if (!outcome.ok) {
    const status = outcome.error.includes('promoted') ? 409 : 422;
    return NextResponse.json({ error: outcome.error }, { status });
  }

  return NextResponse.json({
    ok:       true,
    draft_id: outcome.result.draft_id,
    reason:   outcome.result.reason,
    note:     'draft marked rejected — no matching, no contact triggered',
  });
}
