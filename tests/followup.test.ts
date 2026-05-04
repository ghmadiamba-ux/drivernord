import { describe, it, expect } from 'vitest';
import { computeFollowUp, type ComputeFollowUpInput } from '../lib/followup';

const NOW = new Date('2026-05-01T10:00:00.000Z');

const base = (overrides: Partial<ComputeFollowUpInput> = {}): ComputeFollowUpInput => ({
  lead_status: 'ready_for_ingestion',
  phone: '+46701234567',
  availability: 'now',
  ykb: 'valid',
  created_at: NOW,
  ...overrides,
});

const hoursAfter = (h: number) => new Date(NOW.getTime() + h * 60 * 60 * 1000);
const daysAfter = (d: number) => new Date(NOW.getTime() + d * 24 * 60 * 60 * 1000);

// ─── No follow-up cases ───────────────────────────────────────────────────────

describe('computeFollowUp — no follow-up', () => {
  it('returns null for a complete lead with no trigger conditions', () => {
    const result = computeFollowUp(base());
    expect(result.follow_up_at).toBeNull();
    expect(result.follow_up_reason).toBeNull();
  });

  it('returns null for a disqualified lead', () => {
    const result = computeFollowUp(base({ lead_status: 'disqualified', availability: null, ykb: null }));
    expect(result.follow_up_at).toBeNull();
    expect(result.follow_up_reason).toBeNull();
  });

  it('returns null for an anonymous_dropoff', () => {
    const result = computeFollowUp(base({ lead_status: 'anonymous_dropoff', phone: null }));
    expect(result.follow_up_at).toBeNull();
    expect(result.follow_up_reason).toBeNull();
  });

  it('does not trigger 24h follow-up for incomplete_lead without phone', () => {
    const result = computeFollowUp(base({ lead_status: 'incomplete_lead', phone: null }));
    expect(result.follow_up_at).toBeNull();
    expect(result.follow_up_reason).toBeNull();
  });

  it('returns null for ready_for_ingestion with 1_month availability and valid YKB', () => {
    const result = computeFollowUp(base({ availability: '1_month' }));
    expect(result.follow_up_at).toBeNull();
    expect(result.follow_up_reason).toBeNull();
  });
});

// ─── Single trigger cases ─────────────────────────────────────────────────────

describe('computeFollowUp — single trigger', () => {
  it('schedules +24h for incomplete_lead with phone', () => {
    const result = computeFollowUp(base({ lead_status: 'incomplete_lead' }));
    expect(result.follow_up_at).toEqual(hoursAfter(24));
    expect(result.follow_up_reason).toBe('incomplete_lead');
  });

  it('schedules +30 days for ready_for_ingestion with availability not_yet', () => {
    const result = computeFollowUp(base({ availability: 'not_yet' }));
    expect(result.follow_up_at).toEqual(daysAfter(30));
    expect(result.follow_up_reason).toBe('not_yet_available');
  });

  it('schedules +60 days for ready_for_ingestion with ykb in_progress', () => {
    const result = computeFollowUp(base({ ykb: 'in_progress' }));
    expect(result.follow_up_at).toEqual(daysAfter(60));
    expect(result.follow_up_reason).toBe('ykb_in_progress');
  });
});

// ─── Multiple trigger cases — earliest wins ───────────────────────────────────

describe('computeFollowUp — multiple triggers, earliest wins', () => {
  it('picks +24h over +30 days when incomplete_lead and not_yet availability', () => {
    const result = computeFollowUp(base({
      lead_status: 'incomplete_lead',
      availability: 'not_yet',
    }));
    expect(result.follow_up_at).toEqual(hoursAfter(24));
    expect(result.follow_up_reason).toBe('incomplete_lead');
  });

  it('picks +24h over +60 days when incomplete_lead and ykb in_progress', () => {
    const result = computeFollowUp(base({
      lead_status: 'incomplete_lead',
      ykb: 'in_progress',
    }));
    expect(result.follow_up_at).toEqual(hoursAfter(24));
    expect(result.follow_up_reason).toBe('incomplete_lead');
  });

  it('picks +30 days over +60 days when not_yet availability and ykb in_progress', () => {
    const result = computeFollowUp(base({
      availability: 'not_yet',
      ykb: 'in_progress',
    }));
    expect(result.follow_up_at).toEqual(daysAfter(30));
    expect(result.follow_up_reason).toBe('not_yet_available');
  });

  it('picks +24h when all three triggers are active', () => {
    const result = computeFollowUp(base({
      lead_status: 'incomplete_lead',
      availability: 'not_yet',
      ykb: 'in_progress',
    }));
    expect(result.follow_up_at).toEqual(hoursAfter(24));
    expect(result.follow_up_reason).toBe('incomplete_lead');
  });
});

// ─── Date accuracy ────────────────────────────────────────────────────────────

describe('computeFollowUp — date accuracy', () => {
  it('24h is exactly 86400 seconds after created_at', () => {
    const result = computeFollowUp(base({ lead_status: 'incomplete_lead' }));
    const diff = result.follow_up_at!.getTime() - NOW.getTime();
    expect(diff).toBe(86400 * 1000);
  });

  it('30 days is exactly 30 * 86400 seconds after created_at', () => {
    const result = computeFollowUp(base({ availability: 'not_yet' }));
    const diff = result.follow_up_at!.getTime() - NOW.getTime();
    expect(diff).toBe(30 * 86400 * 1000);
  });

  it('60 days is exactly 60 * 86400 seconds after created_at', () => {
    const result = computeFollowUp(base({ ykb: 'in_progress' }));
    const diff = result.follow_up_at!.getTime() - NOW.getTime();
    expect(diff).toBe(60 * 86400 * 1000);
  });
});
