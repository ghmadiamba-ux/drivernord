import { describe, it, expect } from 'vitest';
import type { Lead } from '../types/lead';
import { buildDriverProfile } from '../lib/driverProfile';
import { buildIngestedDriver } from '../lib/ingestedDriver';
import { scoreDriver } from '../lib/scoreDriver';

// A fully completed lead as it would exist in Supabase after confirmation
const readyLead = (): Lead => ({
  id: 'pipeline-test-id',
  created_at: new Date('2026-05-01T10:00:00.000Z'),
  completed_at: new Date('2026-05-01T11:00:00.000Z'),
  last_step_reached: 7,
  lang: 'sv',
  region: 'stockholm',
  relocate: null,
  license: 'CE',
  ykb: 'valid',
  driver_card: 'valid',
  availability: 'now',
  domain: null,
  shift_preference: null,
  first_name: 'Erik',
  phone: '+46701234567',
  email: null,
  lead_status: 'ready_for_ingestion',
  lead_priority: 'HIGH',
  follow_up_sent: false,
  follow_up_at: null,
  follow_up_reason: null,
});

// ─── happy path ───────────────────────────────────────────────────────────────

describe('scoring pipeline — Lead → DriverProfile → IngestedDriver → DriverScore', () => {
  it('full pipeline succeeds for a ready_for_ingestion lead', () => {
    const profile = buildDriverProfile(readyLead());
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    const score = scoreDriver(ingested.driver);
    expect(score.total).toBe(98); // CE(33)+valid(25)+now(20)+stockholm(20)
    expect(score.tier).toBe('HIGH');
  });

  it('id is preserved through the pipeline', () => {
    const profile = buildDriverProfile(readyLead());
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    expect(ingested.driver.id).toBe('pipeline-test-id');
  });

  it('ingestedAt matches completed_at from the lead', () => {
    const lead = readyLead();
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    expect(ingested.driver.ingestedAt).toEqual(lead.completed_at);
  });

  it('contact fields are preserved through the pipeline', () => {
    const profile = buildDriverProfile(readyLead());
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    expect(ingested.driver.contact.firstName).toBe('Erik');
    expect(ingested.driver.contact.phone).toBe('+46701234567');
    expect(ingested.driver.contact.email).toBeNull();
  });

  it('score breakdown matches expected dimension values', () => {
    const profile = buildDriverProfile(readyLead());
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    const score = scoreDriver(ingested.driver);
    expect(score.breakdown).toEqual({ license: 33, ykb: 25, availability: 20, location: 20 });
  });

  it('no flags for clean Stockholm CE driver with valid credentials', () => {
    const profile = buildDriverProfile(readyLead());
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    const score = scoreDriver(ingested.driver);
    expect(score.flags).toEqual([]);
  });

  it('summary is a non-empty string', () => {
    const profile = buildDriverProfile(readyLead());
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    const score = scoreDriver(ingested.driver);
    expect(typeof score.summary).toBe('string');
    expect(score.summary.length).toBeGreaterThan(0);
  });
});

// ─── domain and shift_preference passthrough ─────────────────────────────────

describe('scoring pipeline — domain and shift_preference passthrough', () => {
  it('domain and shiftPreference are present on IngestedDriver when set on lead', () => {
    const lead: Lead = { ...readyLead(), domain: 'fjarrtransport', shift_preference: 'night' };
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    expect(ingested.driver.domain).toBe('fjarrtransport');
    expect(ingested.driver.shiftPreference).toBe('night');
    const score = scoreDriver(ingested.driver);
    expect(score.tier).toBe('HIGH');
  });

  it('pipeline succeeds with domain and shiftPreference both null (skipped)', () => {
    const lead: Lead = { ...readyLead(), domain: null, shift_preference: null };
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    expect(ingested.driver.domain).toBeNull();
    expect(ingested.driver.shiftPreference).toBeNull();
    const score = scoreDriver(ingested.driver);
    expect(score.total).toBe(98);
  });
});

// ─── pipeline rejection ───────────────────────────────────────────────────────

describe('scoring pipeline — rejection cases', () => {
  it('incomplete_lead is rejected by buildIngestedDriver', () => {
    const lead: Lead = {
      ...readyLead(),
      lead_status: 'incomplete_lead',
      completed_at: null,
      last_step_reached: 6,
    };
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(false);
    if (ingested.ok) return;
    expect(ingested.error).toBe('not_ready_for_ingestion');
  });

  it('disqualified lead is rejected by buildIngestedDriver', () => {
    const lead: Lead = {
      ...readyLead(),
      lead_status: 'disqualified',
      license: 'none',
      completed_at: null,
    };
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(false);
    if (ingested.ok) return;
    expect(ingested.error).toBe('not_ready_for_ingestion');
  });

  it('anonymous_dropoff (no phone) is rejected by buildIngestedDriver', () => {
    const lead: Lead = {
      ...readyLead(),
      lead_status: 'anonymous_dropoff',
      phone: null,
      completed_at: null,
    };
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(false);
    if (ingested.ok) return;
    expect(ingested.error).toBe('not_ready_for_ingestion');
  });
});

// ─── full profile variants ────────────────────────────────────────────────────

describe('scoring pipeline — full profile variants', () => {
  it('non-Stockholm + relocate:yes driver flows through correctly', () => {
    const lead: Lead = {
      ...readyLead(),
      region: 'other_sweden',
      relocate: 'yes',
    };
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    const score = scoreDriver(ingested.driver);
    // CE(33)+valid(25)+now(20)+other_sweden relocate:yes(13) = 91
    expect(score.total).toBe(91);
    expect(score.tier).toBe('HIGH');
    expect(score.flags).toContain('relocation_required');
  });

  it('D license driver is capped at MEDIUM despite high numeric score', () => {
    const lead: Lead = { ...readyLead(), license: 'D' };
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    const score = scoreDriver(ingested.driver);
    expect(score.tier).toBe('MEDIUM');
    expect(score.flags).toContain('bus_segment');
  });

  it('driver with follow-up (ykb in_progress) flows through with correct flag', () => {
    const followUpAt = new Date('2026-07-01T10:00:00.000Z');
    const lead: Lead = {
      ...readyLead(),
      ykb: 'in_progress',
      follow_up_at: followUpAt,
      follow_up_reason: 'ykb_in_progress',
    };
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    expect(ingested.driver.needsFollowUp).toBe(true);
    expect(ingested.driver.followUpReason).toBe('ykb_in_progress');
    const score = scoreDriver(ingested.driver);
    expect(score.flags).toContain('ykb_in_progress');
  });
});
