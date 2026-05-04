import { describe, it, expect } from 'vitest';
import { buildIngestedDriver } from '../lib/ingestedDriver';
import type { DriverProfile } from '../lib/driverProfile';

const base = (overrides: Partial<DriverProfile> = {}): DriverProfile => ({
  id: 'test-id',
  qualification: { isQualified: true, status: 'ready_for_ingestion' },
  priority: 'HIGH',
  license: 'CE',
  ykb: 'valid',
  driverCard: 'valid',
  location: { region: 'stockholm', willingToRelocate: null },
  availability: 'now',
  domain: null,
  shiftPreference: null,
  contact: { firstName: 'Erik', phone: '+46701234567', email: null },
  readiness: { readyToCall: true, needsFollowUp: false, followUpAt: null, followUpReason: null },
  createdAt: new Date('2026-05-01T10:00:00.000Z'),
  completedAt: new Date('2026-05-01T11:00:00.000Z'),
  ...overrides,
});

// ─── happy path ───────────────────────────────────────────────────────────────

describe('buildIngestedDriver — happy path', () => {
  it('returns ok:true for a fully qualified profile', () => {
    const result = buildIngestedDriver(base());
    expect(result.ok).toBe(true);
  });

  it('maps id', () => {
    const result = buildIngestedDriver(base({ id: 'abc-123' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.id).toBe('abc-123');
  });

  it('sets ingestedAt from completedAt', () => {
    const completedAt = new Date('2026-05-01T11:00:00.000Z');
    const result = buildIngestedDriver(base({ completedAt }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.ingestedAt).toEqual(completedAt);
  });

  it('maps professional credentials', () => {
    const result = buildIngestedDriver(base({ license: 'C', ykb: 'in_progress', driverCard: 'expired' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.license).toBe('C');
    expect(result.driver.ykb).toBe('in_progress');
    expect(result.driver.driverCard).toBe('expired');
  });

  it('maps location with willingToRelocate null for Stockholm', () => {
    const result = buildIngestedDriver(base({
      location: { region: 'stockholm', willingToRelocate: null },
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.location.region).toBe('stockholm');
    expect(result.driver.location.willingToRelocate).toBeNull();
  });

  it('maps location with willingToRelocate for non-Stockholm driver', () => {
    const result = buildIngestedDriver(base({
      location: { region: 'other_sweden', willingToRelocate: true },
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.location.region).toBe('other_sweden');
    expect(result.driver.location.willingToRelocate).toBe(true);
  });

  it('maps contact fields including null email', () => {
    const result = buildIngestedDriver(base({
      contact: { firstName: 'Anna', phone: '0701111111', email: null },
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.contact).toEqual({ firstName: 'Anna', phone: '0701111111', email: null });
  });

  it('maps contact with email present', () => {
    const result = buildIngestedDriver(base({
      contact: { firstName: 'Anna', phone: '0701111111', email: 'anna@example.com' },
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.contact.email).toBe('anna@example.com');
  });

  it('maps priority', () => {
    const result = buildIngestedDriver(base({ priority: 'MEDIUM' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.priority).toBe('MEDIUM');
  });

  it('maps availability', () => {
    const result = buildIngestedDriver(base({ availability: 'not_yet' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.availability).toBe('not_yet');
  });

  it('domain is passed through when set', () => {
    const result = buildIngestedDriver(base({ domain: 'adr' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.domain).toBe('adr');
  });

  it('domain is null when not collected', () => {
    const result = buildIngestedDriver(base({ domain: null }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.domain).toBeNull();
  });

  it('shiftPreference is passed through when set', () => {
    const result = buildIngestedDriver(base({ shiftPreference: 'flexible' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.shiftPreference).toBe('flexible');
  });

  it('shiftPreference is null when not collected', () => {
    const result = buildIngestedDriver(base({ shiftPreference: null }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.shiftPreference).toBeNull();
  });

  it('maps needsFollowUp and follow-up fields', () => {
    const followUpAt = new Date('2026-06-01T10:00:00.000Z');
    const result = buildIngestedDriver(base({
      readiness: {
        readyToCall: true,
        needsFollowUp: true,
        followUpAt,
        followUpReason: 'ykb_in_progress',
      },
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.needsFollowUp).toBe(true);
    expect(result.driver.followUpAt).toEqual(followUpAt);
    expect(result.driver.followUpReason).toBe('ykb_in_progress');
  });
});

// ─── not_ready_for_ingestion ──────────────────────────────────────────────────

describe('buildIngestedDriver — not_ready_for_ingestion', () => {
  it('incomplete_lead → not_ready_for_ingestion', () => {
    const result = buildIngestedDriver(base({
      qualification: { isQualified: true, status: 'incomplete_lead' },
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('not_ready_for_ingestion');
  });

  it('disqualified → not_ready_for_ingestion', () => {
    const result = buildIngestedDriver(base({
      qualification: { isQualified: false, status: 'disqualified' },
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('not_ready_for_ingestion');
  });

  it('anonymous_dropoff → not_ready_for_ingestion', () => {
    const result = buildIngestedDriver(base({
      qualification: { isQualified: true, status: 'anonymous_dropoff' },
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('not_ready_for_ingestion');
  });
});

// ─── missing_required_field ───────────────────────────────────────────────────

describe('buildIngestedDriver — missing_required_field', () => {
  it('missing phone → missing_required_field', () => {
    const result = buildIngestedDriver(base({
      contact: { firstName: 'Erik', phone: null, email: null },
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_required_field');
  });

  it('missing firstName → missing_required_field', () => {
    const result = buildIngestedDriver(base({
      contact: { firstName: null, phone: '+46701234567', email: null },
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_required_field');
  });

  it('missing license → missing_required_field', () => {
    const result = buildIngestedDriver(base({ license: null }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_required_field');
  });

  it('missing ykb → missing_required_field', () => {
    const result = buildIngestedDriver(base({ ykb: null }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_required_field');
  });

  it('missing driverCard → missing_required_field', () => {
    const result = buildIngestedDriver(base({ driverCard: null }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_required_field');
  });

  it('missing region → missing_required_field', () => {
    const result = buildIngestedDriver(base({
      location: { region: null, willingToRelocate: null },
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_required_field');
  });

  it('missing availability → missing_required_field', () => {
    const result = buildIngestedDriver(base({ availability: null }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_required_field');
  });

  it('priority null → missing_required_field', () => {
    const result = buildIngestedDriver(base({ priority: null }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_required_field');
  });

  it('missing completedAt → missing_required_field', () => {
    const result = buildIngestedDriver(base({ completedAt: null }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_required_field');
  });
});
