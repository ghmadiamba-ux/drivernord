import { describe, it, expect } from 'vitest';
import { classifyStatus, classifyPriority, type ClassifyInput } from '../lib/classify';

const base = (overrides: Partial<ClassifyInput> = {}): ClassifyInput => ({
  license: 'CE',
  phone: '+46701234567',
  last_step_reached: 7,
  region: 'stockholm',
  relocate: null,
  ykb: 'valid',
  availability: 'now',
  ...overrides,
});

// ─── classifyStatus ──────────────────────────────────────────────────────────

describe('classifyStatus', () => {
  it('returns disqualified when license is none', () => {
    expect(classifyStatus(base({ license: 'none', phone: '+46701234567' }))).toBe('disqualified');
  });

  it('returns disqualified even when phone is present', () => {
    expect(classifyStatus(base({ license: 'none', phone: '+46701234567', last_step_reached: 7 }))).toBe('disqualified');
  });

  it('returns anonymous_dropoff when phone is null', () => {
    expect(classifyStatus(base({ phone: null }))).toBe('anonymous_dropoff');
  });

  it('returns anonymous_dropoff when phone is empty string', () => {
    expect(classifyStatus(base({ phone: '' }))).toBe('anonymous_dropoff');
  });

  it('returns ready_for_ingestion when flow is complete and phone present', () => {
    expect(classifyStatus(base({ last_step_reached: 7 }))).toBe('ready_for_ingestion');
  });

  it('returns ready_for_ingestion for last_step_reached above 7', () => {
    expect(classifyStatus(base({ last_step_reached: 8 }))).toBe('ready_for_ingestion');
  });

  it('returns incomplete_lead when phone is present but flow is not finished', () => {
    expect(classifyStatus(base({ last_step_reached: 5 }))).toBe('incomplete_lead');
  });

  it('returns incomplete_lead at step 6 (phone just collected)', () => {
    expect(classifyStatus(base({ last_step_reached: 6 }))).toBe('incomplete_lead');
  });

  it('disqualified takes precedence over anonymous_dropoff', () => {
    expect(classifyStatus(base({ license: 'none', phone: null }))).toBe('disqualified');
  });
});

// ─── classifyPriority ────────────────────────────────────────────────────────

describe('classifyPriority', () => {
  it('returns null for disqualified lead', () => {
    expect(classifyPriority(base({ license: 'none' }))).toBeNull();
  });

  it('returns null for anonymous_dropoff lead', () => {
    expect(classifyPriority(base({ phone: null }))).toBeNull();
  });

  it('returns LOW for driver outside Stockholm who refuses to relocate', () => {
    expect(classifyPriority(base({ region: 'other_sweden', relocate: 'no' }))).toBe('LOW');
  });

  it('returns LOW for driver abroad who refuses to relocate', () => {
    expect(classifyPriority(base({ region: 'abroad', relocate: 'no' }))).toBe('LOW');
  });

  it('returns HIGH for Stockholm driver with valid YKB available now', () => {
    expect(classifyPriority(base({ region: 'stockholm', ykb: 'valid', availability: 'now' }))).toBe('HIGH');
  });

  it('returns HIGH for Stockholm driver with valid YKB available within 2 weeks', () => {
    expect(classifyPriority(base({ region: 'stockholm', ykb: 'valid', availability: '2_weeks' }))).toBe('HIGH');
  });

  it('returns HIGH for outside-Stockholm driver willing to relocate with valid YKB available now', () => {
    expect(classifyPriority(base({
      region: 'other_sweden',
      relocate: 'yes',
      ykb: 'valid',
      availability: 'now',
    }))).toBe('HIGH');
  });

  it('returns HIGH for abroad driver willing to relocate with valid YKB within 2 weeks', () => {
    expect(classifyPriority(base({
      region: 'abroad',
      relocate: 'yes',
      ykb: 'valid',
      availability: '2_weeks',
    }))).toBe('HIGH');
  });

  it('returns MEDIUM for Stockholm driver with expired YKB', () => {
    expect(classifyPriority(base({ ykb: 'expired' }))).toBe('MEDIUM');
  });

  it('returns MEDIUM for Stockholm driver with YKB in progress', () => {
    expect(classifyPriority(base({ ykb: 'in_progress' }))).toBe('MEDIUM');
  });

  it('returns MEDIUM for Stockholm driver with no YKB', () => {
    expect(classifyPriority(base({ ykb: 'none' }))).toBe('MEDIUM');
  });

  it('returns MEDIUM for Stockholm driver with unknown YKB', () => {
    expect(classifyPriority(base({ ykb: 'unknown' }))).toBe('MEDIUM');
  });

  it('returns MEDIUM for driver with valid YKB but availability of 1 month', () => {
    expect(classifyPriority(base({ availability: '1_month' }))).toBe('MEDIUM');
  });

  it('returns MEDIUM for driver with valid YKB but not yet available', () => {
    expect(classifyPriority(base({ availability: 'not_yet' }))).toBe('MEDIUM');
  });

  it('returns MEDIUM for outside-Stockholm driver willing to relocate but YKB not valid', () => {
    expect(classifyPriority(base({
      region: 'other_sweden',
      relocate: 'yes',
      ykb: 'expired',
      availability: 'now',
    }))).toBe('MEDIUM');
  });

  it('returns MEDIUM for incomplete lead with unknown region and ykb', () => {
    expect(classifyPriority(base({
      last_step_reached: 6,
      region: null,
      ykb: null,
      availability: null,
    }))).toBe('MEDIUM');
  });

  it('handles C license the same as CE for status and priority', () => {
    expect(classifyStatus(base({ license: 'C' }))).toBe('ready_for_ingestion');
    expect(classifyPriority(base({ license: 'C' }))).toBe('HIGH');
  });

  it('handles D license the same as CE for status and priority', () => {
    expect(classifyPriority(base({ license: 'D' }))).toBe('HIGH');
  });

  it('handles CE+D license', () => {
    expect(classifyPriority(base({ license: 'CE+D' }))).toBe('HIGH');
  });
});
