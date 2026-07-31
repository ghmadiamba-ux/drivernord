import { db } from './db';

// ─── Status types ─────────────────────────────────────────────────────────────

export type PilotRelationshipStatus =
  | 'researched'
  | 'outreach_ready'
  | 'contacted'
  | 'replied'
  | 'call_booked'
  | 'needs_collected'
  | 'pilot_agreed'
  | 'pilot_lost'
  | 'nurture_later'
  | 'do_not_contact'
  | 'shortlist_preparing'
  | 'shortlist_delivered'
  | 'feedback_pending'
  | 'pilot_completed';

export type PilotUpdateAction =
  | 'mark_email_sent'
  | 'mark_replied_interested'
  | 'mark_replied_not_now'
  | 'mark_need_confirmed'
  | 'mark_shortlist_preparing'
  | 'mark_shortlist_delivered'
  | 'mark_feedback_pending'
  | 'mark_pilot_completed'
  | 'mark_closed_lost'
  | 'mark_do_not_contact'
  | 'add_note';

// ─── Entry interface ──────────────────────────────────────────────────────────

export interface PilotOutreachEntry {
  id:                    string;
  target_id:             string;
  company_name:          string;
  observed_need:         string;
  contact_person:        string | null;
  contact_email:         string | null;
  phone:                 string | null;
  status:                PilotRelationshipStatus;
  first_email_sent_at:   string | null;
  email_subject:         string | null;
  follow_up_due_at:      string | null;
  is_followup_overdue:   boolean;
  next_action:           string | null;
  reply_summary:         string | null;
  reply_sentiment:       string | null;
  pilot_scope_notes:     string | null;
  do_not_contact_reason: string | null;
  is_do_not_contact:     boolean;
  risk_warnings:         string[];
  updated_at:            string;
}

// ─── Valid actions per status ─────────────────────────────────────────────────

export const PILOT_VALID_ACTIONS: Partial<Record<PilotRelationshipStatus, PilotUpdateAction[]>> = {
  researched:          ['mark_email_sent', 'mark_do_not_contact', 'add_note'],
  outreach_ready:      ['mark_email_sent', 'mark_do_not_contact', 'add_note'],
  contacted:           ['mark_replied_interested', 'mark_replied_not_now', 'mark_closed_lost', 'mark_do_not_contact', 'add_note'],
  replied:             ['mark_need_confirmed', 'mark_replied_not_now', 'mark_closed_lost', 'add_note'],
  call_booked:         ['mark_need_confirmed', 'mark_closed_lost', 'add_note'],
  needs_collected:     ['mark_shortlist_preparing', 'mark_closed_lost', 'add_note'],
  pilot_agreed:        ['mark_shortlist_preparing', 'mark_closed_lost', 'add_note'],
  shortlist_preparing: ['mark_shortlist_delivered', 'mark_closed_lost', 'add_note'],
  shortlist_delivered: ['mark_feedback_pending', 'mark_pilot_completed', 'mark_closed_lost', 'add_note'],
  feedback_pending:    ['mark_pilot_completed', 'mark_closed_lost', 'add_note'],
  pilot_completed:     ['mark_closed_lost', 'add_note'],
  nurture_later:       ['mark_email_sent', 'mark_closed_lost', 'add_note'],
  pilot_lost:          ['add_note'],
  do_not_contact:      ['add_note'],
};

// ─── Display ordering ─────────────────────────────────────────────────────────

const STATUS_ORDER: PilotRelationshipStatus[] = [
  'feedback_pending',
  'shortlist_delivered',
  'shortlist_preparing',
  'needs_collected',
  'pilot_agreed',
  'replied',
  'call_booked',
  'contacted',
  'outreach_ready',
  'researched',
  'nurture_later',
  'pilot_completed',
  'pilot_lost',
  'do_not_contact',
];

// ─── Action → new status map ──────────────────────────────────────────────────

export const ACTION_STATUS_MAP: Record<PilotUpdateAction, PilotRelationshipStatus | null> = {
  mark_email_sent:           'contacted',
  mark_replied_interested:   'replied',
  mark_replied_not_now:      'nurture_later',
  mark_need_confirmed:       'needs_collected',
  mark_shortlist_preparing:  'shortlist_preparing',
  mark_shortlist_delivered:  'shortlist_delivered',
  mark_feedback_pending:     'feedback_pending',
  mark_pilot_completed:      'pilot_completed',
  mark_closed_lost:          'pilot_lost',
  mark_do_not_contact:       'do_not_contact',
  add_note:                  null, // status unchanged
};

// ─── Actions that require a written reason ────────────────────────────────────

export const REASON_REQUIRED_ACTIONS = new Set<PilotUpdateAction>([
  'mark_closed_lost',
  'mark_do_not_contact',
]);

// ─── Actions that log to system_actions ──────────────────────────────────────

export const AUDIT_ACTION_MAP: Partial<Record<PilotUpdateAction, string>> = {
  mark_email_sent:         'pilot_outreach_email_logged',
  mark_replied_interested: 'pilot_company_replied',
  mark_replied_not_now:    'pilot_company_replied',
  mark_need_confirmed:     'pilot_need_confirmed',
  mark_shortlist_delivered:'pilot_shortlist_delivered',
  mark_pilot_completed:    'pilot_closed',
  mark_closed_lost:        'pilot_closed',
  mark_do_not_contact:     'pilot_closed',
};

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function buildPilotOutreachList(): Promise<PilotOutreachEntry[]> {
  const { data, error } = await db
    .from('pilot_company_relationships')
    .select(`
      id,
      target_id,
      relationship_status,
      first_email_sent_at,
      email_subject,
      next_action,
      next_action_date,
      reply_summary,
      reply_sentiment,
      pilot_scope_notes,
      do_not_contact_reason,
      updated_at,
      company_research_targets (
        company_name,
        contact_email,
        phone,
        decision_maker_name,
        license_mentions,
        transport_domain
      )
    `)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];

  const now = new Date();

  const entries = (data as unknown as Record<string, unknown>[]).map((row) => {
    const crt            = (row.company_research_targets ?? {}) as Record<string, unknown>;
    const status         = row.relationship_status as PilotRelationshipStatus;
    const nextActionDate = (row.next_action_date as string | null) ?? null;

    const licenseMentions  = (crt.license_mentions  as string[] | null) ?? [];
    const transportDomain  = (crt.transport_domain  as string[] | null) ?? [];
    const observedNeed     = [...new Set([...licenseMentions, ...transportDomain])].join(' / ') || '—';

    const isFollowupOverdue =
      status === 'contacted' &&
      nextActionDate !== null &&
      new Date(nextActionDate) < now;

    const riskWarnings: string[] = [];
    if (status === 'do_not_contact') {
      const reason = (row.do_not_contact_reason as string | null) ?? 'Marked do-not-contact';
      riskWarnings.push(reason);
    }

    return {
      id:                    row.id                       as string,
      target_id:             row.target_id                as string,
      company_name:          (crt.company_name as string) ?? '(unknown)',
      observed_need:         observedNeed,
      contact_person:        (crt.decision_maker_name as string | null) ?? null,
      contact_email:         (crt.contact_email       as string | null) ?? null,
      phone:                 (crt.phone               as string | null) ?? null,
      status,
      first_email_sent_at:   (row.first_email_sent_at as string | null) ?? null,
      email_subject:         (row.email_subject        as string | null) ?? null,
      follow_up_due_at:      nextActionDate,
      is_followup_overdue:   isFollowupOverdue,
      next_action:           (row.next_action          as string | null) ?? null,
      reply_summary:         (row.reply_summary        as string | null) ?? null,
      reply_sentiment:       (row.reply_sentiment      as string | null) ?? null,
      pilot_scope_notes:     (row.pilot_scope_notes    as string | null) ?? null,
      do_not_contact_reason: (row.do_not_contact_reason as string | null) ?? null,
      is_do_not_contact:     status === 'do_not_contact',
      risk_warnings:         riskWarnings,
      updated_at:            row.updated_at             as string,
    } satisfies PilotOutreachEntry;
  });

  return entries.sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );
}
