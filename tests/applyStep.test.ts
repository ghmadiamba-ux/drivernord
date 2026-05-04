import { describe, it, expect } from 'vitest';
import { applyStep } from '../lib/applyStep';
import type { Lead } from '../types/lead';

const base = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'test-id',
  created_at: new Date('2026-05-01T10:00:00.000Z'),
  completed_at: null,
  last_step_reached: 0,
  lang: 'sv',
  region: null,
  relocate: null,
  license: null,
  ykb: null,
  driver_card: null,
  availability: null,
  domain: null,
  shift_preference: null,
  first_name: null,
  phone: null,
  email: null,
  lead_status: 'anonymous_dropoff',
  lead_priority: null,
  follow_up_sent: false,
  follow_up_at: null,
  follow_up_reason: null,
  ...overrides,
});

// ─── region ──────────────────────────────────────────────────────────────────

describe('applyStep — region', () => {
  it('stockholm → next_step is license (relocate skipped)', () => {
    const result = applyStep(base(), 'region', 'stockholm');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next_step).toBe('license');
    expect(result.lead.region).toBe('stockholm');
  });

  it('other_sweden → next_step is relocate', () => {
    const result = applyStep(base(), 'region', 'other_sweden');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next_step).toBe('relocate');
  });

  it('abroad → next_step is relocate', () => {
    const result = applyStep(base(), 'region', 'abroad');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next_step).toBe('relocate');
  });

  it('null answer → missing_answer error', () => {
    const result = applyStep(base(), 'region', null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_answer');
  });

  it('invalid value → invalid_answer error', () => {
    const result = applyStep(base(), 'region', 'paris');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('invalid_answer');
  });
});

// ─── license ─────────────────────────────────────────────────────────────────

describe('applyStep — license', () => {
  it('CE → next_step is ykb, status remains anonymous_dropoff (no phone yet)', () => {
    const result = applyStep(base({ region: 'stockholm' }), 'license', 'CE');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next_step).toBe('ykb');
    expect(result.lead.lead_status).toBe('anonymous_dropoff');
    expect(result.lead.license).toBe('CE');
  });

  it('none → next_step is disqualified, status is disqualified', () => {
    const result = applyStep(base({ region: 'stockholm' }), 'license', 'none');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next_step).toBe('disqualified');
    expect(result.lead.lead_status).toBe('disqualified');
    expect(result.lead.lead_priority).toBeNull();
  });

  it('all valid license values are accepted', () => {
    for (const lic of ['C', 'CE', 'D', 'C+D', 'CE+D']) {
      const result = applyStep(base(), 'license', lic);
      expect(result.ok).toBe(true);
    }
  });

  it('null answer → missing_answer', () => {
    const result = applyStep(base(), 'license', null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_answer');
  });
});

// ─── phone ───────────────────────────────────────────────────────────────────

describe('applyStep — phone', () => {
  it('providing phone changes status from anonymous_dropoff to incomplete_lead', () => {
    const lead = base({ region: 'stockholm', license: 'CE', last_step_reached: 5 });
    const result = applyStep(lead, 'phone', '+46701234567');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.lead_status).toBe('incomplete_lead');
    expect(result.lead.phone).toBe('+46701234567');
    expect(result.next_step).toBe('email');
  });

  it('null phone → missing_answer', () => {
    const result = applyStep(base(), 'phone', null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_answer');
  });

  it('empty string phone → missing_answer', () => {
    const result = applyStep(base(), 'phone', '');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_answer');
  });
});

// ─── domain ──────────────────────────────────────────────────────────────────

describe('applyStep — domain', () => {
  it('valid domain stores the value and advances to availability', () => {
    const result = applyStep(base(), 'domain', 'distribution');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.domain).toBe('distribution');
    expect(result.next_step).toBe('availability');
  });

  it('"skip" stores null and advances to availability', () => {
    const result = applyStep(base(), 'domain', 'skip');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.domain).toBeNull();
    expect(result.next_step).toBe('availability');
  });

  it('invalid domain value returns invalid_answer', () => {
    const result = applyStep(base(), 'domain', 'tanker_truck');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('invalid_answer');
  });

  it('null answer returns missing_answer', () => {
    const result = applyStep(base(), 'domain', null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_answer');
  });

  it('all 15 DomainTag values are accepted', () => {
    const domains = [
      'tipp','kran','kylfrys','silo','flatbed','tanker','ekipage',
      'schakt_bygg','distribution','livsmedelskyla','avfall',
      'skogstransport','adr','fjarrtransport','budtransport',
    ];
    for (const d of domains) {
      const result = applyStep(base(), 'domain', d);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.lead.domain).toBe(d);
    }
  });
});

// ─── shift_preference ─────────────────────────────────────────────────────────

describe('applyStep — shift_preference', () => {
  it('valid shift stores the value and advances to phone', () => {
    const result = applyStep(base(), 'shift_preference', 'day');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.shift_preference).toBe('day');
    expect(result.next_step).toBe('phone');
  });

  it('"skip" stores null and advances to phone', () => {
    const result = applyStep(base(), 'shift_preference', 'skip');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.shift_preference).toBeNull();
    expect(result.next_step).toBe('phone');
  });

  it('invalid shift value returns invalid_answer', () => {
    const result = applyStep(base(), 'shift_preference', 'morning');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('invalid_answer');
  });

  it('null answer returns missing_answer', () => {
    const result = applyStep(base(), 'shift_preference', null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_answer');
  });

  it('all four ShiftPreference values are accepted', () => {
    for (const s of ['day', 'night', 'weekend', 'flexible']) {
      const result = applyStep(base(), 'shift_preference', s);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.lead.shift_preference).toBe(s);
    }
  });
});

// ─── email ───────────────────────────────────────────────────────────────────

describe('applyStep — email', () => {
  it('null email (skip) is accepted', () => {
    const result = applyStep(base(), 'email', null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.email).toBeNull();
    expect(result.next_step).toBe('name');
  });

  it('string email is stored and advances to name', () => {
    const result = applyStep(base(), 'email', 'driver@example.com');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.email).toBe('driver@example.com');
    expect(result.next_step).toBe('name');
  });
});

// ─── confirmation ─────────────────────────────────────────────────────────────

describe('applyStep — confirmation', () => {
  it('marks lead as ready_for_ingestion when phone is present', () => {
    const lead = base({
      region: 'stockholm',
      license: 'CE',
      ykb: 'valid',
      driver_card: 'valid',
      availability: 'now',
      phone: '+46701234567',
      first_name: 'Erik',
      last_step_reached: 6,
    });
    const result = applyStep(lead, 'confirmation', null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.lead_status).toBe('ready_for_ingestion');
    expect(result.lead.completed_at).not.toBeNull();
    expect(result.next_step).toBeNull();
  });

  it('sets last_step_reached to 7 after confirmation', () => {
    const lead = base({ phone: '+46701234567', last_step_reached: 6 });
    const result = applyStep(lead, 'confirmation', null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.last_step_reached).toBe(7);
  });

  it('does not set completed_at when lead lacks phone (not ready_for_ingestion)', () => {
    const lead = base({ last_step_reached: 6 }); // phone: null
    const result = applyStep(lead, 'confirmation', null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.lead_status).not.toBe('ready_for_ingestion');
    expect(result.lead.completed_at).toBeNull();
  });

  it('completed_at is idempotent — second confirmation does not overwrite it', () => {
    const existing = new Date('2026-05-01T12:00:00.000Z');
    const lead = base({
      phone: '+46701234567',
      last_step_reached: 6,
      completed_at: existing,
    });
    const result = applyStep(lead, 'confirmation', null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.completed_at).toEqual(existing);
  });
});

// ─── lead_priority ───────────────────────────────────────────────────────────

describe('applyStep — lead_priority computed correctly', () => {
  it('HIGH: Stockholm + valid YKB + available now + phone', () => {
    const lead = base({
      region: 'stockholm',
      license: 'CE',
      ykb: 'valid',
      availability: 'now',
      phone: '+46701234567',
      last_step_reached: 6,
    });
    const result = applyStep(lead, 'confirmation', null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.lead_priority).toBe('HIGH');
  });

  it('MEDIUM: Stockholm + expired YKB + phone', () => {
    const lead = base({
      region: 'stockholm',
      license: 'CE',
      ykb: 'expired',
      availability: 'now',
      phone: '+46701234567',
      last_step_reached: 6,
    });
    const result = applyStep(lead, 'confirmation', null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.lead_priority).toBe('MEDIUM');
  });

  it('LOW: outside Stockholm + relocate:no + phone', () => {
    const lead = base({
      region: 'other_sweden',
      relocate: 'no',
      license: 'CE',
      ykb: 'valid',
      availability: 'now',
      phone: '+46701234567',
      last_step_reached: 6,
    });
    const result = applyStep(lead, 'confirmation', null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.lead_priority).toBe('LOW');
  });
});

// ─── follow_up_at ────────────────────────────────────────────────────────────

describe('applyStep — follow_up computed correctly', () => {
  it('ykb in_progress on complete lead → +60 days follow-up', () => {
    const lead = base({
      region: 'stockholm',
      license: 'CE',
      availability: 'now',
      phone: '+46701234567',
      first_name: 'Erik',
      last_step_reached: 6,
    });
    const result = applyStep(lead, 'ykb', 'in_progress');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // lead is still incomplete_lead here, so 24h wins over 60 days
    expect(result.lead.follow_up_reason).toBe('incomplete_lead');
  });

  it('ykb in_progress on a ready_for_ingestion lead → follow_up_reason is ykb_in_progress', () => {
    const lead = base({
      region: 'stockholm',
      license: 'CE',
      ykb: 'in_progress',
      availability: 'now',
      phone: '+46701234567',
      first_name: 'Erik',
      last_step_reached: 6,
    });
    const result = applyStep(lead, 'confirmation', null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.follow_up_reason).toBe('ykb_in_progress');
    const expectedDiff = 60 * 24 * 60 * 60 * 1000;
    expect(result.lead.follow_up_at!.getTime() - lead.created_at.getTime()).toBe(expectedDiff);
  });

  it('availability not_yet on complete lead → follow_up_reason is not_yet_available', () => {
    const lead = base({
      region: 'stockholm',
      license: 'CE',
      ykb: 'valid',
      availability: 'not_yet',
      phone: '+46701234567',
      first_name: 'Erik',
      last_step_reached: 6,
    });
    const result = applyStep(lead, 'confirmation', null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.follow_up_reason).toBe('not_yet_available');
    const expectedDiff = 30 * 24 * 60 * 60 * 1000;
    expect(result.lead.follow_up_at!.getTime() - lead.created_at.getTime()).toBe(expectedDiff);
  });
});

// ─── last_step_reached ───────────────────────────────────────────────────────

describe('applyStep — last_step_reached', () => {
  it('advances to the step index of the answered step', () => {
    const result = applyStep(base(), 'region', 'stockholm');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.last_step_reached).toBe(1);
  });

  it('does not decrease last_step_reached for earlier steps', () => {
    const lead = base({ last_step_reached: 4 });
    const result = applyStep(lead, 'ykb', 'valid');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.last_step_reached).toBe(4);
  });

  it('disqualified step does not update last_step_reached', () => {
    const lead = base({ last_step_reached: 2 });
    const result = applyStep(lead, 'license', 'none');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.last_step_reached).toBe(2);
  });
});

// ─── unknown step ────────────────────────────────────────────────────────────

describe('applyStep — unknown step', () => {
  it('returns invalid_answer for an unrecognised step', () => {
    // @ts-expect-error — intentionally passing invalid step for testing
    const result = applyStep(base(), 'favourite_colour', 'blue');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('invalid_answer');
  });
});
