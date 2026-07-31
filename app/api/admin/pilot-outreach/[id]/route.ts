import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { logAction } from '../../../../../lib/systemActions';
import { db } from '../../../../../lib/db';
import {
  PILOT_VALID_ACTIONS,
  ACTION_STATUS_MAP,
  REASON_REQUIRED_ACTIONS,
  AUDIT_ACTION_MAP,
  type PilotUpdateAction,
  type PilotRelationshipStatus,
} from '../../../../../lib/pilotOutreach';

const REASON_MIN_LENGTH = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function followUpDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

// ─── Build DB update payload per action ──────────────────────────────────────

function buildUpdate(
  action: PilotUpdateAction,
  newStatus: PilotRelationshipStatus | null,
  body:      Record<string, unknown>,
  currentStatus: PilotRelationshipStatus,
): Record<string, unknown> {
  const ts = now();
  const base: Record<string, unknown> = { updated_at: ts, last_interaction_date: ts };

  if (newStatus) base.relationship_status = newStatus;

  switch (action) {
    case 'mark_email_sent':
      base.first_email_sent_at = ts;
      base.next_action_date    = followUpDate(2); // 48h follow-up window
      if (body.email_subject) base.email_subject     = String(body.email_subject).trim();
      if (body.note)          base.call_notes        = buildNoteAppend('', String(body.note), ts);
      // Set first_contact_date only once
      base.first_contact_date = ts;
      break;

    case 'mark_replied_interested':
      base.reply_sentiment  = 'positive';
      base.next_action_date = null; // clear follow-up; need_confirmed is next
      if (body.reply_summary) base.reply_summary = String(body.reply_summary).trim();
      break;

    case 'mark_replied_not_now':
      base.reply_sentiment     = 'neutral';
      base.nurture_resume_date = followUpDate(60);
      base.next_action_date    = followUpDate(60);
      if (body.reply_summary) base.reply_summary = String(body.reply_summary).trim();
      break;

    case 'mark_shortlist_delivered':
      // 14-day feedback window
      base.next_action_date = followUpDate(14);
      if (body.note) base.pilot_scope_notes = String(body.note).trim();
      break;

    case 'mark_closed_lost':
      base.pilot_lost_reason = String(body.reason).trim();
      base.next_action_date  = null;
      break;

    case 'mark_do_not_contact':
      base.do_not_contact_reason = String(body.reason).trim();
      base.next_action_date      = null;
      break;

    case 'add_note': {
      // We need current call_notes to append — handled after fetch
      break;
    }

    default:
      break;
  }

  void currentStatus; // used by caller for validation only
  return base;
}

// Append a timestamped note to an existing notes string.
function buildNoteAppend(existing: string | null, note: string, ts: string): string {
  const line = `[${ts}] ${note.trim()}`;
  return existing ? `${existing}\n${line}` : line;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req:     NextRequest,
  context: { params: { id: string } },
) {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const relationshipId = context.params.id;
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* empty body ok */ }

  const action = body?.action as PilotUpdateAction | undefined;
  if (!action) {
    return NextResponse.json({ error: 'action_required', message: 'Provide an "action" field.' }, { status: 400 });
  }

  // ─── Reason validation (before DB read) ───────────────────────────────────
  if (REASON_REQUIRED_ACTIONS.has(action)) {
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length < REASON_MIN_LENGTH) {
      return NextResponse.json({
        error:   'reason_required',
        message: `A written reason (minimum ${REASON_MIN_LENGTH} characters) is required for "${action}".`,
      }, { status: 400 });
    }
  }

  // ─── Fetch current row ────────────────────────────────────────────────────
  const { data: row, error: fetchErr } = await db
    .from('pilot_company_relationships')
    .select('id, relationship_status, call_notes, target_id')
    .eq('id', relationshipId)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const currentStatus = (row as Record<string, unknown>).relationship_status as PilotRelationshipStatus;

  // ─── do_not_contact is a hard block ───────────────────────────────────────
  if (currentStatus === 'do_not_contact' && action !== 'add_note') {
    return NextResponse.json({
      error:   'do_not_contact_blocked',
      message: 'This company is marked do-not-contact. No status transitions are permitted.',
    }, { status: 403 });
  }

  // ─── Validate action is permitted for current status ─────────────────────
  const validActions = PILOT_VALID_ACTIONS[currentStatus] ?? [];
  if (!validActions.includes(action)) {
    return NextResponse.json({
      error:          'invalid_transition',
      current_status: currentStatus,
      attempted:      action,
      valid_actions:  validActions,
    }, { status: 422 });
  }

  const newStatus = ACTION_STATUS_MAP[action];

  // ─── Build update payload ─────────────────────────────────────────────────
  const update = buildUpdate(action, newStatus, body, currentStatus);

  // Handle add_note specially: append to existing call_notes
  if (action === 'add_note') {
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (note.length === 0) {
      return NextResponse.json({ error: 'note_required', message: 'Provide a non-empty "note" field.' }, { status: 400 });
    }
    const existing = (row as Record<string, unknown>).call_notes as string | null;
    update.call_notes = buildNoteAppend(existing, note, now());
  }

  // ─── Apply update ─────────────────────────────────────────────────────────
  const { error: updateErr } = await db
    .from('pilot_company_relationships')
    .update(update)
    .eq('id', relationshipId);

  if (updateErr) {
    return NextResponse.json({ error: 'db_error', message: updateErr.message }, { status: 500 });
  }

  // ─── Audit log ────────────────────────────────────────────────────────────
  const auditActionType = AUDIT_ACTION_MAP[action];
  if (auditActionType) {
    const targetId = (row as Record<string, unknown>).target_id as string;
    await logAction({
      action_type:  auditActionType as Parameters<typeof logAction>[0]['action_type'],
      triggered_by: 'human',
      target_type:  'pilot_company_relationship',
      target_id:    targetId,
      status:       'completed',
      input: {
        relationship_id: relationshipId,
        action,
        from_status: currentStatus,
        to_status:   newStatus ?? currentStatus,
        ...(body.reason        ? { reason:        String(body.reason).trim() }        : {}),
        ...(body.email_subject ? { email_subject: String(body.email_subject).trim() } : {}),
        ...(body.reply_summary ? { reply_summary: String(body.reply_summary).trim() } : {}),
        source: 'founder_governance_cockpit_v1',
      },
    });
  }

  return NextResponse.json({
    ok:         true,
    id:         relationshipId,
    action,
    new_status: newStatus ?? currentStatus,
    note:       'No SMS or email has been sent. This is an internal status update only.',
  });
}
