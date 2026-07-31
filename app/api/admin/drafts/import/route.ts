import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { importScanRecords } from '../../../../../lib/companyNeedDraft';

export const dynamic = 'force-dynamic';

// POST /api/admin/drafts/import
// Triggers import of the national scan records into company_need_drafts.
// Idempotent: records already imported (by scan_record_id) are skipped.
// No outreach triggered. No company_needs row created.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  try {
    const result = await importScanRecords();
    return NextResponse.json({
      ok:       true,
      imported: result.imported,
      skipped:  result.skipped,
      errors:   result.errors,
    });
  } catch (err) {
    console.error('[POST /api/admin/drafts/import] failed:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
