import { describe, it, expect } from 'vitest';
import { buildDriverProfile } from '../lib/driverProfile';
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

// ─── qualification ────────────────────────────────────────────────────────────

describe('buildDriverProfile — qualification', () => {
  it('ready_for_ingestion → isQualified = true', () => {
    const profile = buildDriverProfile(base({ lead_status: 'ready_for_ingestion' }));
    expect(profile.qualification.isQualified).toBe(true);
  });

  it('disqualified → isQualified = false', () => {
    const profile = buildDriverProfile(base({ lead_status: 'disqualified' }));
    expect(profile.qualification.isQualified).toBe(false);
  });

  it('incomplete_lead → isQualified = true', () => {
    const profile = buildDriverProfile(base({ lead_status: 'incomplete_lead' }));
    expect(profile.qualification.isQualified).toBe(true);
  });

  it('anonymous_dropoff → isQualified = true', () => {
    const profile = buildDriverProfile(base({ lead_status: 'anonymous_dropoff' }));
    expect(profile.qualification.isQualified).toBe(true);
  });

  it('status is preserved on the profile', () => {
    const profile = buildDriverProfile(base({ lead_status: 'disqualified' }));
    expect(profile.qualification.status).toBe('disqualified');
  });
});

// ─── readiness ────────────────────────────────────────────────────────────────

describe('buildDriverProfile — readiness', () => {
  it('ready_for_ingestion + phone → readyToCall = true', () => {
    const profile = buildDriverProfile(base({
      lead_status: 'ready_for_ingestion',
      phone: '+46701234567',
    }));
    expect(profile.readiness.readyToCall).toBe(true);
  });

  it('missing phone → readyToCall = false', () => {
    const profile = buildDriverProfile(base({
      lead_status: 'ready_for_ingestion',
      phone: null,
    }));
    expect(profile.readiness.readyToCall).toBe(false);
  });

  it('incomplete_lead + follow_up_at → needsFollowUp = true', () => {
    const profile = buildDriverProfile(base({
      lead_status: 'incomplete_lead',
      phone: '+46701234567',
      follow_up_at: new Date('2026-05-02T10:00:00.000Z'),
      follow_up_reason: 'incomplete_lead',
    }));
    expect(profile.readiness.needsFollowUp).toBe(true);
  });

  it('follow_up_sent = true → needsFollowUp = false', () => {
    const profile = buildDriverProfile(base({
      lead_status: 'incomplete_lead',
      follow_up_at: new Date('2026-05-02T10:00:00.000Z'),
      follow_up_sent: true,
    }));
    expect(profile.readiness.needsFollowUp).toBe(false);
  });

  it('no follow_up_at → needsFollowUp = false', () => {
    const profile = buildDriverProfile(base({
      lead_status: 'ready_for_ingestion',
      phone: '+46701234567',
      follow_up_at: null,
    }));
    expect(profile.readiness.needsFollowUp).toBe(false);
  });

  it('disqualified → readyToCall = false, needsFollowUp = false', () => {
    const profile = buildDriverProfile(base({ lead_status: 'disqualified' }));
    expect(profile.readiness.readyToCall).toBe(false);
    expect(profile.readiness.needsFollowUp).toBe(false);
  });

  it('followUpAt and followUpReason are forwarded', () => {
    const followUpAt = new Date('2026-06-01T10:00:00.000Z');
    const profile = buildDriverProfile(base({
      follow_up_at: followUpAt,
      follow_up_reason: 'ykb_in_progress',
    }));
    expect(profile.readiness.followUpAt).toEqual(followUpAt);
    expect(profile.readiness.followUpReason).toBe('ykb_in_progress');
  });
});

// ─── location ─────────────────────────────────────────────────────────────────

describe('buildDriverProfile — location', () => {
  it('relocate:yes → willingToRelocate = true', () => {
    const profile = buildDriverProfile(base({ region: 'other_sweden', relocate: 'yes' }));
    expect(profile.location.willingToRelocate).toBe(true);
  });

  it('relocate:no → willingToRelocate = false', () => {
    const profile = buildDriverProfile(base({ region: 'other_sweden', relocate: 'no' }));
    expect(profile.location.willingToRelocate).toBe(false);
  });

  it('relocate:null (Stockholm driver) → willingToRelocate = null', () => {
    const profile = buildDriverProfile(base({ region: 'stockholm', relocate: null }));
    expect(profile.location.willingToRelocate).toBeNull();
  });

  it('region is forwarded', () => {
    const profile = buildDriverProfile(base({ region: 'other_sweden' }));
    expect(profile.location.region).toBe('other_sweden');
  });
});

// ─── field mapping ────────────────────────────────────────────────────────────

describe('buildDriverProfile — field mapping', () => {
  it('maps all contact fields', () => {
    const profile = buildDriverProfile(base({
      first_name: 'Erik',
      phone: '+46701234567',
      email: 'erik@example.com',
    }));
    expect(profile.contact).toEqual({
      firstName: 'Erik',
      phone: '+46701234567',
      email: 'erik@example.com',
    });
  });

  it('contact fields are null when not collected', () => {
    const profile = buildDriverProfile(base());
    expect(profile.contact).toEqual({ firstName: null, phone: null, email: null });
  });

  it('maps license, ykb, driverCard, availability', () => {
    const profile = buildDriverProfile(base({
      license: 'CE',
      ykb: 'valid',
      driver_card: 'valid',
      availability: 'now',
    }));
    expect(profile.license).toBe('CE');
    expect(profile.ykb).toBe('valid');
    expect(profile.driverCard).toBe('valid');
    expect(profile.availability).toBe('now');
  });

  it('domain is forwarded from lead', () => {
    const profile = buildDriverProfile(base({ domain: 'kylfrys' }));
    expect(profile.domain).toBe('kylfrys');
  });

  it('shiftPreference is forwarded from lead.shift_preference', () => {
    const profile = buildDriverProfile(base({ shift_preference: 'night' }));
    expect(profile.shiftPreference).toBe('night');
  });

  it('domain and shiftPreference are null when not collected', () => {
    const profile = buildDriverProfile(base());
    expect(profile.domain).toBeNull();
    expect(profile.shiftPreference).toBeNull();
  });

  it('maps priority', () => {
    const profile = buildDriverProfile(base({ lead_priority: 'HIGH' }));
    expect(profile.priority).toBe('HIGH');
  });

  it('preserves id and timestamps', () => {
    const created = new Date('2026-05-01T10:00:00.000Z');
    const completed = new Date('2026-05-01T11:00:00.000Z');
    const profile = buildDriverProfile(base({
      id: 'abc-123',
      created_at: created,
      completed_at: completed,
    }));
    expect(profile.id).toBe('abc-123');
    expect(profile.createdAt).toEqual(created);
    expect(profile.completedAt).toEqual(completed);
  });
});
