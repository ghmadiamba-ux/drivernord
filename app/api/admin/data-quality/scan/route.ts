import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { scanAndLogExistingIssues } from '../../../../../lib/dataQualityScan';

export const dynamic = 'force-dynamic';

// POST /api/admin/data-quality/scan
//
// Scans all non-simulation ingested_drivers for:
//   - Duplicate phone numbers (same phone on 2+ records)
//   - name=phone data quality issues
//
// Creates system_actions for newly discovered problems.
// Idempotent: re-running is safe and will not double-flag drivers.
//
// Run this:
//   - After applying migration 018 (to retroactively cover pre-018 records)
//   - Any time you suspect duplicate ingestion occurred
//   - Before 46elks activation (pre-flight check)
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const result = await scanAndLogExistingIssues();

  return NextResponse.json({
    ok:                    true,
    scanned:               result.scanned,
    new_duplicate_flagged: result.new_duplicate_flagged,
    new_dq_flagged:        result.new_dq_flagged,
    already_flagged:       result.already_flagged,
    errors:                result.errors,
    note: result.errors.length > 0
      ? 'scan completed with errors — check errors array'
      : 'scan complete — no errors',
  });
}
