import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { runTriggeredCompanyNeedScan } from '../../../../../lib/companyNeedMarketAgent';

export const dynamic = 'force-dynamic';

// POST /api/admin/company-need-agent/triggered-scan
//
// Runs a targeted company-side scan triggered by a driver supply change.
// The trigger describes what changed on the driver side. The scan only
// produces company-side intelligence — it does NOT perform matching.
//
// Body: { trigger: { type, domain?, region?, count? } }
//
// Example trigger types:
//   driver_cluster  — 3+ drivers appeared in the same domain/region
//   ce_threshold    — 5+ CE drivers now active
//   rare_domain     — a rare domain (kran, ADR, kylfrys) appeared in the pool
//
// Protected: requires x-recruiter-key header.
//
// SAFETY: produces only internal intelligence. No SMS, no email, no contact.

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  let body: { trigger?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.trigger || typeof body.trigger !== 'object') {
    return NextResponse.json(
      { error: 'trigger is required — provide { trigger: { type, ... } }' },
      { status: 400 },
    );
  }

  const validTypes = ['driver_cluster', 'ce_threshold', 'rare_domain'];
  if (!validTypes.includes(body.trigger.type as string)) {
    return NextResponse.json(
      { error: `trigger.type must be one of: ${validTypes.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const result = await runTriggeredCompanyNeedScan(body.trigger);
    return NextResponse.json({
      ok:                    true,
      scan_type:             result.scan_type,
      scanned_at:            result.scanned_at,
      trigger:               result.trigger,
      drafts_evaluated:      result.drafts_evaluated,
      stale_detected:        result.stale_detected,
      promotion_recommended: result.promotion_recommended,
      expired_detected:      result.expired_detected,
      scan_action_id:        result.scan_action_id,
      signals: result.signals.map((s) => ({
        company_name:          s.company_name,
        draft_id:              s.draft_id,
        lifecycle:             s.lifecycle,
        composite:             s.scores.composite,
        promotion_recommended: s.promotion_recommended,
        is_stale:              s.is_stale,
        recommended_action:    s.recommended_action,
      })),
    });
  } catch (err) {
    console.error('[company-need-agent/triggered-scan] failed:', err);
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 });
  }
}
