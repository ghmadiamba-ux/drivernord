import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../../lib/recruiterAuth';
import { promoteDraft } from '../../../../../../lib/companyNeedDraft';

export const dynamic = 'force-dynamic';

// POST /api/admin/drafts/[id]/promote
//
// Promotes a company_need_draft to a live company_need.
// The promoted need starts with need_type = 'active_public_need' (matching-eligible).
// It is NOT outreach_approved — driver contact still requires cockpit approval.
//
// Safety guarantees:
//   • Rejected and already-promoted drafts are blocked (409)
//   • Missing required fields are blocked (422)
//   • Simulation/test drafts are blocked (403)
//   • No SMS is sent. No external contact is triggered.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const outcome = await promoteDraft(id);

  if (!outcome.ok) {
    const { code, error } = outcome.reason;
    const status =
      code === 'already_promoted'  ? 409 :
      code === 'simulation_blocked' ? 403 :
      code === 'validation_failed'  ? 422 :
                                       500;
    return NextResponse.json({ error, code }, { status });
  }

  return NextResponse.json({
    ok:         true,
    need_id:    outcome.result.need_id,
    company_id: outcome.result.company_id,
    note: 'need is active_public_need — matching-eligible; outreach still requires cockpit approval per driver',
  });
}
