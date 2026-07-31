// lib/agents/zohoOutreachAgent.ts
// Zoho Outreach Agent — orchestrates email generation, queueing, scheduling, and reply classification.
// Never sends emails without founder approval. Default: dry_run = true.
// Uses canonical email patterns from lib/outreachAgent.ts (founder-approved style).

import {
  generateEmail,
  validateEmailContent,
  isWithinRateLimit,
  type OutreachTarget,
  type OutreachReadiness,
} from '../outreachAgent';
import type { NewQueueItem, QueueStatus, SendMode } from '../outreachQueue';
import { hasMojibake } from '../outreachEncoding';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SupplyInfo {
  clean_driver_count:  number;
  available_now_count: number;
  domain_verified:     boolean;
}

export type ReplyClassification =
  | 'interested'
  | 'call_requested'
  | 'not_now'
  | 'not_interested'
  | 'wrong_contact'
  | 'auto_reply'
  | 'bounced'
  | 'unclear';

export interface SafetyAssessment {
  readiness:     OutreachReadiness;
  safe_to_send:  boolean;
  block_reason:  string | null;
  risk_notes:    string[];
}

export interface ValidationResult {
  valid:  boolean;
  errors: string[];
}

// Working hours: 08:00–16:00 Stockholm time (UTC+2 in summer / CEST).
export const WORK_HOUR_START_UTC = 6;  // 08:00 CEST
export const WORK_HOUR_END_UTC   = 14; // 16:00 CEST
export const MIN_SPACING_MINUTES = 30;
export const MAX_PER_HOUR        = 2;

// ── Safety classifier ─────────────────────────────────────────────────────────

export function classifySafety(
  target: OutreachTarget,
  supply: SupplyInfo,
): SafetyAssessment {
  const risks: string[] = [];

  // Hard blocks — checked in same priority order as generateEmail block logic
  const nameLower = target.company_name.toLowerCase();
  if (['jpc entreprenad', 'jpc'].some((id) => nameLower.includes(id))) {
    return { readiness: 'SUPPLY_GAP', safe_to_send: false, block_reason: 'jpc_excluded', risk_notes: ['JPC Entreprenad AB — do not contact'] };
  }
  if (target.is_bankrupt) {
    return { readiness: 'SUPPLY_GAP', safe_to_send: false, block_reason: 'bankrupt', risk_notes: ['Company is bankrupt'] };
  }
  if (target.do_not_contact_reason !== null) {
    return { readiness: 'SUPPLY_GAP', safe_to_send: false, block_reason: 'do_not_contact', risk_notes: [target.do_not_contact_reason] };
  }
  if (!target.contact_email) {
    return { readiness: 'SUPPLY_GAP', safe_to_send: false, block_reason: 'missing_email', risk_notes: ['No verified recipient email'] };
  }

  // Readiness determination from supply info
  let readiness: OutreachReadiness;

  if (!supply.domain_verified) {
    readiness = 'QUESTION_BASED';
    risks.push('Domain not verified — no confirmed supply in this cluster');
  } else if (supply.clean_driver_count === 0) {
    readiness = 'SUPPLY_GAP';
    risks.push('0 clean drivers in this domain');
  } else if (supply.clean_driver_count <= 2) {
    readiness = 'THIN_BUT_USABLE';
    if (supply.available_now_count === 0) {
      risks.push('No drivers available immediately — only future availability');
    }
  } else {
    readiness = 'READY';
  }

  return { readiness, safe_to_send: true, block_reason: null, risk_notes: risks };
}

// ── Scheduling ─────────────────────────────────────────────────────────────────

export function isWorkingHours(dt: Date): boolean {
  const utcHour = dt.getUTCHours();
  const utcDay  = dt.getUTCDay(); // 0=Sunday, 6=Saturday
  if (utcDay === 0 || utcDay === 6) return false;
  return utcHour >= WORK_HOUR_START_UTC && utcHour < WORK_HOUR_END_UTC;
}

function advanceToWorkingHours(dt: Date): Date {
  let candidate = new Date(dt.getTime());
  // Move in 15-min steps until inside working hours
  let iterations = 0;
  while (!isWorkingHours(candidate)) {
    candidate = new Date(candidate.getTime() + 15 * 60 * 1000);
    if (++iterations > 10_000) break; // safety guard
  }
  return candidate;
}

export function scheduleBatch(
  itemCount:   number,
  startFrom:   Date = new Date(),
  maxPerHour   = MAX_PER_HOUR,
): Date[] {
  if (maxPerHour < 1) throw new Error('maxPerHour must be >= 1');
  if (itemCount <= 0) return [];

  const scheduled: Date[] = [];

  for (let i = 0; i < itemCount; i++) {
    let candidate: Date;

    if (scheduled.length === 0) {
      candidate = advanceToWorkingHours(startFrom);
    } else {
      const prev = scheduled[scheduled.length - 1];
      candidate  = advanceToWorkingHours(
        new Date(prev.getTime() + MIN_SPACING_MINUTES * 60 * 1000),
      );
    }

    scheduled.push(candidate);
  }

  return scheduled;
}

// ── Email generation ───────────────────────────────────────────────────────────

export function generateEmailFromCanonicalPattern(
  target:    OutreachTarget,
  readiness?: OutreachReadiness,
) {
  const effective = readiness ? { ...target, readiness } : target;
  return generateEmail(effective, { dry_run: true });
}

// ── Queue item creation ────────────────────────────────────────────────────────

export function createQueueItem(
  target:  OutreachTarget,
  options: {
    send_mode?:        SendMode;
    risk_notes?:       string[];
    safe_claim_used?:  string;
    scheduled_send_at?: string;
    target_id?:        string;
  } = {},
): NewQueueItem {
  const result = generateEmail(target, { dry_run: true });

  if (result.blocked) {
    return {
      target_id:             options.target_id ?? null,
      company_name_snapshot: target.company_name,
      recipient_email:       target.contact_email ?? '',
      recipient_name:        target.decision_maker_name ?? null,
      subject:               `[BLOCKED: ${result.block_reason}]`,
      body:                  '',
      readiness_category:    target.readiness,
      safe_claim_used:       null,
      risk_notes:            `Blocked: ${result.block_reason}`,
      status:                'skipped' as QueueStatus,
      provider:              'zoho',
      provider_message_id:   null,
      scheduled_send_at:     null,
      sent_at:               null,
      reply_detected_at:     null,
      reply_classification:  null,
      created_by_agent:      true,
      approved_by_founder:   false,
      automation_used:       false,
      send_mode:             options.send_mode ?? 'dry_run',
    };
  }

  return {
    target_id:             options.target_id ?? null,
    company_name_snapshot: result.company_name,
    recipient_email:       result.to,
    recipient_name:        target.decision_maker_name ?? null,
    subject:               result.subject,
    body:                  result.body,
    readiness_category:    result.readiness,
    safe_claim_used:       options.safe_claim_used ?? null,
    risk_notes:            (options.risk_notes ?? []).join('; ') || null,
    status:                'draft' as QueueStatus,
    provider:              'zoho',
    provider_message_id:   null,
    scheduled_send_at:     options.scheduled_send_at ?? null,
    sent_at:               null,
    reply_detected_at:     null,
    reply_classification:  null,
    created_by_agent:      true,
    approved_by_founder:   false,
    automation_used:       false,
    send_mode:             options.send_mode ?? 'dry_run',
  };
}

// ── Pre-send validation ────────────────────────────────────────────────────────

export function validateEmailBeforeSend(
  item: Pick<NewQueueItem, 'recipient_email' | 'subject' | 'body' | 'approved_by_founder' | 'send_mode' | 'status' | 'company_name_snapshot' | 'readiness_category'>,
): ValidationResult {
  const errors: string[] = [];

  if (!item.recipient_email?.includes('@')) errors.push('Invalid recipient email');
  if (!item.subject?.trim())                errors.push('Subject is empty');
  if (!item.body?.trim())                   errors.push('Body is empty');
  if (item.status === 'skipped')            errors.push('Item is skipped — cannot send');

  if (item.send_mode === 'dry_run') {
    errors.push('Cannot send — send_mode is dry_run');
  }

  if (!item.approved_by_founder) {
    errors.push('Cannot send — approved_by_founder is false');
  }

  if (hasMojibake(item.subject) || hasMojibake(item.body)) {
    errors.push('Cannot send — mojibake detected in subject or body');
  }

  const nameLower = (item.company_name_snapshot ?? '').toLowerCase();
  if (['jpc entreprenad', 'jpc'].some((id) => nameLower.includes(id))) {
    errors.push('Cannot send — JPC Entreprenad AB is excluded');
  }

  const unverifiedReadiness = item.readiness_category === 'SUPPLY_GAP' || item.readiness_category === 'QUESTION_BASED';
  if (unverifiedReadiness && (item.body ?? '').toLowerCase().includes('utan startkostnad')) {
    errors.push('Cannot send — offer language (utan startkostnad) in unverified/gap supply email');
  }

  if (item.send_mode === 'founder_approval' && !item.approved_by_founder) {
    errors.push('founder_approval mode requires approved_by_founder = true');
  }

  const violations = validateEmailContent(item.body ?? '');
  for (const v of violations) errors.push(`Forbidden content: ${v}`);

  return { valid: errors.length === 0, errors };
}

// ── Reply classifier ───────────────────────────────────────────────────────────

interface IncomingReply {
  from:    string;
  subject: string;
  body:    string;
}

export function classifyReply(message: IncomingReply): ReplyClassification {
  const text = `${message.subject} ${message.body}`.toLowerCase();
  const from = message.from.toLowerCase();

  // Bounced — delivery failure from mail system
  if (
    from.includes('mailer-daemon') ||
    from.includes('postmaster') ||
    text.includes('delivery failure') ||
    text.includes('undeliverable') ||
    text.includes('delivery status notification') ||
    text.includes('levereringsfel') ||
    text.includes('kunde inte levereras') ||
    text.includes('this message could not be delivered')
  ) return 'bounced';

  // Auto-reply — out of office or automated acknowledgement
  if (
    text.includes('out of office') ||
    text.includes('frånvaromeddelande') ||
    text.includes('automatiskt svar') ||
    text.includes('auto-reply') ||
    text.includes('autosvar') ||
    text.includes('automatic reply') ||
    text.includes('abwesenheitsnotiz') ||
    text.includes('i am currently out') ||
    text.includes('will be out of the office')
  ) return 'auto_reply';

  // Wrong contact — redirecting to someone else
  if (
    text.includes('fel person') ||
    text.includes('wrong person') ||
    text.includes('please contact') ||
    text.includes('vänligen kontakta') ||
    text.includes('not the right') ||
    text.includes('du har kontaktat fel') ||
    text.includes('you should reach out to') ||
    text.includes('this is not my department')
  ) return 'wrong_contact';

  // Not interested — clear rejection
  if (
    text.includes('inte intresserade') ||
    text.includes('inte intresserad') ||
    text.includes('not interested') ||
    text.includes('no thank') ||
    text.includes('nej tack') ||
    text.includes('avregistrera') ||
    text.includes('unsubscribe') ||
    text.includes('ta bort oss') ||
    (text.includes('nej') && text.includes('tack'))
  ) return 'not_interested';

  // Not now — timing objection, not a rejection
  if (
    text.includes('inte just nu') ||
    text.includes('just nu') ||
    text.includes('för tillfället') ||
    text.includes('not at this time') ||
    text.includes('at the moment') ||
    text.includes('vi har inga behov') ||
    text.includes('no current need') ||
    (text.includes('later') && !text.includes('not interested')) ||
    (text.includes('senare') && !text.includes('inte intresserad'))
  ) return 'not_now';

  // Call requested — wants to discuss by phone or meeting
  if (
    text.includes('ring mig') ||
    text.includes('ringa') ||
    text.includes('call me') ||
    text.includes('phone call') ||
    text.includes('kan vi prata') ||
    text.includes('boka') ||
    text.includes('schedule a call') ||
    text.includes('möte') ||
    text.includes('meeting') ||
    text.includes('teams') ||
    text.includes('zoom') ||
    text.includes('samtal')
  ) return 'call_requested';

  // Interested — positive engagement or request for more information
  if (
    text.includes('intressant') ||
    text.includes('intresserad') ||
    text.includes('interested') ||
    text.includes('berätta mer') ||
    text.includes('tell me more') ||
    text.includes('mer information') ||
    text.includes('more information') ||
    text.includes('hur fungerar') ||
    text.includes('how does it work') ||
    text.includes('kan ni skicka') ||
    text.includes('please send') ||
    text.includes('absolut') ||
    text.includes('gärna') ||
    text.includes('vi är intresserade')
  ) return 'interested';

  return 'unclear';
}

// ── Mark sent builder (pure — actual DB update is in outreachQueue.ts) ─────────

export function buildMarkSentUpdate(providerMessageId: string): {
  status:              QueueStatus;
  provider_message_id: string;
  sent_at:             string;
  automation_used:     boolean;
} {
  return {
    status:              'sent',
    provider_message_id: providerMessageId,
    sent_at:             new Date().toISOString(),
    automation_used:     false,
  };
}

// Re-export isWithinRateLimit so callers only need this module
export { isWithinRateLimit, MAX_PER_HOUR as RATE_LIMIT_PER_HOUR };
