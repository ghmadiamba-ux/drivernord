import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { db } from '../../../../lib/db';

// GET /api/admin/outreach-queue
// Returns all outreach queue items ordered by created_at DESC.
// Gracefully handles migration 017 not yet applied.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await db
    .from('outreach_email_queue')
    .select('id, company_name_snapshot, recipient_email, recipient_name, subject, body, readiness_category, status, send_mode, provider_message_id, scheduled_send_at, sent_at, reply_detected_at, reply_classification, approved_by_founder, automation_used, risk_notes, created_by_agent, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    // Migration 017 not yet applied
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      return NextResponse.json({ items: [], migration_required: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [], migration_required: false });
}

// PATCH /api/admin/outreach-queue/:id — approve a queue item
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { id?: string; action?: string };
  if (!body.id || body.action !== 'approve') {
    return NextResponse.json({ error: 'id and action=approve required' }, { status: 400 });
  }

  const { error } = await db
    .from('outreach_email_queue')
    .update({
      approved_by_founder: true,
      status:              'approved',
      updated_at:          new Date().toISOString(),
    })
    .eq('id', body.id)
    .in('status', ['draft']); // Only draft items can be approved

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
