import { describe, it, expect } from 'vitest';
import {
  classifySafety,
  classifyReply,
  isWorkingHours,
  scheduleBatch,
  createQueueItem,
  validateEmailBeforeSend,
  buildMarkSentUpdate,
  MIN_SPACING_MINUTES,
  WORK_HOUR_START_UTC,
  WORK_HOUR_END_UTC,
} from '../lib/agents/zohoOutreachAgent';
import type { OutreachTarget } from '../lib/outreachAgent';
import type { SupplyInfo } from '../lib/agents/zohoOutreachAgent';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseTarget: OutreachTarget = {
  company_name:          'Test Åkeri AB',
  contact_email:         'test@testakeri.se',
  decision_maker_name:   'Lars Svensson',
  transport_domain:      ['distribution'],
  license_mentions:      ['CE'],
  is_bankrupt:           false,
  do_not_contact_reason: null,
  readiness:             'READY',
};

const readySupply: SupplyInfo = {
  clean_driver_count:  5,
  available_now_count: 3,
  domain_verified:     true,
};

// ── classifySafety ────────────────────────────────────────────────────────────

describe('classifySafety — hard blocks', () => {
  it('blocks JPC Entreprenad by name', () => {
    const t = { ...baseTarget, company_name: 'JPC Entreprenad AB' };
    const r = classifySafety(t, readySupply);
    expect(r.safe_to_send).toBe(false);
    expect(r.block_reason).toBe('jpc_excluded');
  });

  it('blocks jpc (lowercase substring)', () => {
    const t = { ...baseTarget, company_name: 'jpc transport' };
    const r = classifySafety(t, readySupply);
    expect(r.safe_to_send).toBe(false);
    expect(r.block_reason).toBe('jpc_excluded');
  });

  it('blocks bankrupt company', () => {
    const t = { ...baseTarget, is_bankrupt: true };
    const r = classifySafety(t, readySupply);
    expect(r.safe_to_send).toBe(false);
    expect(r.block_reason).toBe('bankrupt');
  });

  it('blocks do_not_contact', () => {
    const t = { ...baseTarget, do_not_contact_reason: 'Owner request 2026-05-01' };
    const r = classifySafety(t, readySupply);
    expect(r.safe_to_send).toBe(false);
    expect(r.block_reason).toBe('do_not_contact');
    expect(r.risk_notes[0]).toContain('Owner request');
  });

  it('blocks missing email', () => {
    const t = { ...baseTarget, contact_email: undefined };
    const r = classifySafety(t, readySupply);
    expect(r.safe_to_send).toBe(false);
    expect(r.block_reason).toBe('missing_email');
  });

  it('prioritises jpc over bankrupt when both apply', () => {
    const t = { ...baseTarget, company_name: 'JPC Entreprenad AB', is_bankrupt: true };
    const r = classifySafety(t, readySupply);
    expect(r.block_reason).toBe('jpc_excluded');
  });
});

describe('classifySafety — readiness classification', () => {
  it('returns READY when ≥3 clean drivers, domain verified', () => {
    const r = classifySafety(baseTarget, { clean_driver_count: 5, available_now_count: 3, domain_verified: true });
    expect(r.readiness).toBe('READY');
    expect(r.safe_to_send).toBe(true);
  });

  it('returns THIN_BUT_USABLE for 1–2 drivers', () => {
    const r = classifySafety(baseTarget, { clean_driver_count: 2, available_now_count: 1, domain_verified: true });
    expect(r.readiness).toBe('THIN_BUT_USABLE');
    expect(r.safe_to_send).toBe(true);
  });

  it('adds risk note when THIN and 0 available now', () => {
    const r = classifySafety(baseTarget, { clean_driver_count: 1, available_now_count: 0, domain_verified: true });
    expect(r.readiness).toBe('THIN_BUT_USABLE');
    expect(r.risk_notes.some((n) => n.includes('available'))).toBe(true);
  });

  it('returns SUPPLY_GAP for 0 clean drivers', () => {
    const r = classifySafety(baseTarget, { clean_driver_count: 0, available_now_count: 0, domain_verified: true });
    expect(r.readiness).toBe('SUPPLY_GAP');
  });

  it('returns QUESTION_BASED when domain not verified', () => {
    const r = classifySafety(baseTarget, { clean_driver_count: 5, available_now_count: 3, domain_verified: false });
    expect(r.readiness).toBe('QUESTION_BASED');
  });
});

// ── isWorkingHours ────────────────────────────────────────────────────────────

describe('isWorkingHours', () => {
  const utcHour = (h: number) => new Date(`2026-05-27T${String(h).padStart(2, '0')}:00:00Z`);

  it('returns true at start of working window (UTC 06:00 = CEST 08:00)', () => {
    expect(isWorkingHours(utcHour(WORK_HOUR_START_UTC))).toBe(true);
  });

  it('returns true inside working window (UTC 10:00)', () => {
    expect(isWorkingHours(utcHour(10))).toBe(true);
  });

  it('returns false at UTC end boundary (14:00 = CEST 16:00)', () => {
    expect(isWorkingHours(utcHour(WORK_HOUR_END_UTC))).toBe(false);
  });

  it('returns false before working hours (UTC 05:00)', () => {
    expect(isWorkingHours(utcHour(5))).toBe(false);
  });

  it('returns false after working hours (UTC 15:00)', () => {
    expect(isWorkingHours(utcHour(15))).toBe(false);
  });

  it('returns false on Saturday', () => {
    const saturday = new Date('2026-05-30T09:00:00Z'); // UTC 09:00 = CEST 11:00
    expect(isWorkingHours(saturday)).toBe(false);
  });

  it('returns false on Sunday', () => {
    const sunday = new Date('2026-05-31T09:00:00Z');
    expect(isWorkingHours(sunday)).toBe(false);
  });
});

// ── scheduleBatch ─────────────────────────────────────────────────────────────

describe('scheduleBatch', () => {
  // Start within working hours: 2026-05-27 UTC 09:00 = CEST 11:00
  const workingStart = new Date('2026-05-27T09:00:00Z');

  it('returns empty array for 0 items', () => {
    expect(scheduleBatch(0, workingStart)).toEqual([]);
  });

  it('schedules 1 item at or after startFrom when already in working hours', () => {
    const [d] = scheduleBatch(1, workingStart);
    expect(d.getTime()).toBeGreaterThanOrEqual(workingStart.getTime());
    expect(isWorkingHours(d)).toBe(true);
  });

  it('advances startFrom to working hours if outside', () => {
    const beforeWork = new Date('2026-05-27T04:00:00Z'); // UTC 04:00 — before working hours
    const [d] = scheduleBatch(1, beforeWork);
    expect(isWorkingHours(d)).toBe(true);
    expect(d.getUTCHours()).toBeGreaterThanOrEqual(WORK_HOUR_START_UTC);
  });

  it('enforces minimum 30-minute spacing between items', () => {
    const times = scheduleBatch(3, workingStart);
    for (let i = 1; i < times.length; i++) {
      const gapMinutes = (times[i].getTime() - times[i - 1].getTime()) / 60_000;
      expect(gapMinutes).toBeGreaterThanOrEqual(MIN_SPACING_MINUTES);
    }
  });

  it('all scheduled items are within working hours', () => {
    const times = scheduleBatch(4, workingStart);
    for (const t of times) {
      expect(isWorkingHours(t)).toBe(true);
    }
  });

  it('throws when maxPerHour < 1', () => {
    expect(() => scheduleBatch(3, workingStart, 0)).toThrow();
  });

  it('schedules across working-hour boundary (items overflow to next day)', () => {
    // Start at UTC 13:00 (CEST 15:00) — only 1 slot before 16:00
    const lateStart = new Date('2026-05-27T13:00:00Z');
    const times = scheduleBatch(3, lateStart);
    expect(times).toHaveLength(3);
    for (const t of times) {
      expect(isWorkingHours(t)).toBe(true);
    }
  });
});

// ── createQueueItem ───────────────────────────────────────────────────────────

describe('createQueueItem', () => {
  it('creates a draft item for a valid READY target', () => {
    const item = createQueueItem(baseTarget);
    expect(item.status).toBe('draft');
    expect(item.readiness_category).toBe('READY');
    expect(item.send_mode).toBe('dry_run');
    expect(item.approved_by_founder).toBe(false);
    expect(item.created_by_agent).toBe(true);
    expect(item.recipient_email).toBe(baseTarget.contact_email);
  });

  it('creates a skipped item for a blocked target (JPC)', () => {
    const jpc = { ...baseTarget, company_name: 'JPC Entreprenad AB' };
    const item = createQueueItem(jpc);
    expect(item.status).toBe('skipped');
    expect(item.subject).toContain('[BLOCKED:');
    expect(item.body).toBe('');
  });

  it('creates a skipped item for a target with missing email', () => {
    const noEmail = { ...baseTarget, contact_email: undefined };
    const item = createQueueItem(noEmail);
    expect(item.status).toBe('skipped');
  });

  it('honours send_mode option', () => {
    const item = createQueueItem(baseTarget, { send_mode: 'founder_approval' });
    expect(item.send_mode).toBe('founder_approval');
  });

  it('includes risk_notes when supplied', () => {
    const item = createQueueItem(baseTarget, { risk_notes: ['0 available now', 'new domain'] });
    expect(item.risk_notes).toContain('0 available now');
    expect(item.risk_notes).toContain('new domain');
  });
});

// ── validateEmailBeforeSend ───────────────────────────────────────────────────

describe('validateEmailBeforeSend', () => {
  const validItem = {
    company_name_snapshot: 'Test Åkeri AB',
    recipient_email:       'test@example.se',
    subject:               'CE-chaufförer för distribution',
    body:                  'Vi är varken bemanning eller en traditionell jobbtavla.',
    approved_by_founder:   true,
    send_mode:             'founder_approval' as const,
    status:                'approved' as const,
    readiness_category:    'READY',
  };

  it('passes a valid founder_approval approved item', () => {
    const r = validateEmailBeforeSend(validItem);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('rejects an invalid email address', () => {
    const r = validateEmailBeforeSend({ ...validItem, recipient_email: 'not-an-email' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('email'))).toBe(true);
  });

  it('rejects empty subject', () => {
    const r = validateEmailBeforeSend({ ...validItem, subject: '   ' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('Subject'))).toBe(true);
  });

  it('rejects empty body', () => {
    const r = validateEmailBeforeSend({ ...validItem, body: '' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('Body'))).toBe(true);
  });

  it('rejects skipped items', () => {
    const r = validateEmailBeforeSend({ ...validItem, status: 'skipped' as const });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('skipped'))).toBe(true);
  });

  it('rejects dry_run send_mode', () => {
    const r = validateEmailBeforeSend({ ...validItem, send_mode: 'dry_run' as const });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('dry_run'))).toBe(true);
  });

  it('rejects when approved_by_founder is false', () => {
    const r = validateEmailBeforeSend({ ...validItem, approved_by_founder: false });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('approved_by_founder'))).toBe(true);
  });

  it('rejects founder_approval mode without approval (redundant gate)', () => {
    const r = validateEmailBeforeSend({ ...validItem, send_mode: 'founder_approval' as const, approved_by_founder: false });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('approved_by_founder'))).toBe(true);
  });

  it('rejects mojibake in body', () => {
    const r = validateEmailBeforeSend({ ...validItem, body: 'Hej Lars,\n\nVi har uppmÃ¤rksammat...' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('mojibake'))).toBe(true);
  });

  it('rejects mojibake in subject', () => {
    const r = validateEmailBeforeSend({ ...validItem, subject: 'CE-chauffÃ¶rer fÃ¶r distribution' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('mojibake'))).toBe(true);
  });

  it('rejects JPC company name', () => {
    const r = validateEmailBeforeSend({ ...validItem, company_name_snapshot: 'JPC Entreprenad AB' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('JPC'))).toBe(true);
  });

  it('rejects jpc lowercase substring', () => {
    const r = validateEmailBeforeSend({ ...validItem, company_name_snapshot: 'jpc transport' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('JPC'))).toBe(true);
  });

  it('rejects SUPPLY_GAP email with offer language', () => {
    const r = validateEmailBeforeSend({
      ...validItem,
      readiness_category: 'SUPPLY_GAP',
      body: 'Vi erbjuder detta utan startkostnad för er.',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('utan startkostnad'))).toBe(true);
  });

  it('rejects QUESTION_BASED email with offer language', () => {
    const r = validateEmailBeforeSend({
      ...validItem,
      readiness_category: 'QUESTION_BASED',
      body: 'Vi erbjuder detta utan startkostnad för er.',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('utan startkostnad'))).toBe(true);
  });

  it('allows READY email with offer language', () => {
    const r = validateEmailBeforeSend({
      ...validItem,
      readiness_category: 'READY',
      body: 'Vi erbjuder detta utan startkostnad för er.',
    });
    expect(r.errors.some((e) => e.includes('utan startkostnad'))).toBe(false);
  });

  it('rejects body with forbidden word "AI"', () => {
    const r = validateEmailBeforeSend({ ...validItem, body: 'Driven by AI technology.' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('AI'))).toBe(true);
  });
});

// ── classifyReply ─────────────────────────────────────────────────────────────

describe('classifyReply', () => {
  const msg = (subject: string, body: string, from = 'contact@company.se') =>
    ({ from, subject, body });

  it('classifies bounced from mailer-daemon', () => {
    expect(classifyReply(msg('Delivery failure', 'undeliverable', 'mailer-daemon@mailhost.se'))).toBe('bounced');
  });

  it('classifies bounced from postmaster', () => {
    expect(classifyReply(msg('undeliverable', 'delivery failure notice', 'postmaster@host.se'))).toBe('bounced');
  });

  it('classifies bounced — Swedish delivery failure', () => {
    expect(classifyReply(msg('', 'levereringsfel för meddelandet', 'postmaster@host.se'))).toBe('bounced');
  });

  it('classifies auto_reply — frånvaromeddelande', () => {
    expect(classifyReply(msg('Frånvaromeddelande', 'Jag är inte på kontoret'))).toBe('auto_reply');
  });

  it('classifies auto_reply — out of office', () => {
    expect(classifyReply(msg('Out of office', 'I am currently out of the office'))).toBe('auto_reply');
  });

  it('classifies auto_reply — automatiskt svar', () => {
    expect(classifyReply(msg('Automatiskt svar', 'Detta är ett automatiskt svar'))).toBe('auto_reply');
  });

  it('classifies wrong_contact — fel person', () => {
    expect(classifyReply(msg('', 'Du har kontaktat fel person, vänligen kontakta HR'))).toBe('wrong_contact');
  });

  it('classifies not_interested — nej tack', () => {
    expect(classifyReply(msg('', 'Nej tack, vi är inte intresserade.'))).toBe('not_interested');
  });

  it('classifies not_interested — unsubscribe', () => {
    expect(classifyReply(msg('', 'Please unsubscribe me from your list.'))).toBe('not_interested');
  });

  it('classifies not_interested — avregistrera', () => {
    expect(classifyReply(msg('', 'Vänligen avregistrera oss'))).toBe('not_interested');
  });

  it('classifies not_now — just nu', () => {
    expect(classifyReply(msg('', 'Vi har inte behov just nu men kanske senare'))).toBe('not_now');
  });

  it('classifies not_now — för tillfället', () => {
    expect(classifyReply(msg('', 'Vi har inga behov för tillfället'))).toBe('not_now');
  });

  it('classifies call_requested — ring mig', () => {
    expect(classifyReply(msg('', 'Ring mig så kan vi prata om detta'))).toBe('call_requested');
  });

  it('classifies call_requested — boka', () => {
    expect(classifyReply(msg('', 'Kan vi boka ett möte?'))).toBe('call_requested');
  });

  it('classifies call_requested — möte + zoom', () => {
    expect(classifyReply(msg('', 'Absolut, kan vi ha ett möte på Zoom?'))).toBe('call_requested');
  });

  it('classifies interested — intressant', () => {
    expect(classifyReply(msg('', 'Det låter intressant, berätta mer!'))).toBe('interested');
  });

  it('classifies interested — gärna', () => {
    expect(classifyReply(msg('', 'Ja, gärna! Hur fungerar det?'))).toBe('interested');
  });

  it('classifies interested — vi är intresserade', () => {
    expect(classifyReply(msg('', 'Vi är intresserade, kan ni skicka mer info?'))).toBe('interested');
  });

  it('returns unclear for unrecognised text', () => {
    expect(classifyReply(msg('Hej', 'Tack för ditt mail.'))).toBe('unclear');
  });
});

// ── buildMarkSentUpdate ───────────────────────────────────────────────────────

describe('buildMarkSentUpdate', () => {
  it('returns correct shape with status=sent', () => {
    const u = buildMarkSentUpdate('zoho-msg-id-123');
    expect(u.status).toBe('sent');
    expect(u.provider_message_id).toBe('zoho-msg-id-123');
    expect(u.automation_used).toBe(false);
    expect(typeof u.sent_at).toBe('string');
    expect(new Date(u.sent_at).toISOString()).toBe(u.sent_at);
  });
});
