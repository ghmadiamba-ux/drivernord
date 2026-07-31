// app/api/admin/content-facebook-queue/plan/route.ts
//
// Facebook Content Bridge V1 — Manual Planner Trigger
//
// Allows the founder to trigger the autonomous queue planner on demand,
// outside of the daily cron window (09:00 UTC).
//
// POST /api/admin/content-facebook-queue/plan
//   → runs planFacebookQueue()
//   → returns PlannerRunResult
//
// Security: requires recruiter session auth.
// No body required. No card_id required.
// Does NOT connect Meta. Does NOT publish.

import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '@/lib/recruiterAuth';
import { planFacebookQueue } from '@/lib/content/facebookQueuePlanner';
import { logAction } from '@/lib/systemActions';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  try {
    const planResult = await planFacebookQueue();

    await logAction({
      action_type:  'content_facebook_queue_plan_run',
      triggered_by: 'founder_manual',
      target_type:  'content_facebook_queue_entry',
      target_id:    null,
      status:       'completed',
      result: {
        queued:                planResult.queued,
        skipped:               planResult.skipped,
        already_queued:        planResult.already_queued,
        errors:                planResult.errors,
        week_budget_remaining: planResult.week_budget_remaining,
        skipped_emergency_pause: planResult.skipped_emergency_pause,
      },
    });

    return NextResponse.json(planResult, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
