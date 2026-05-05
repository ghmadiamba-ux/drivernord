import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Lead } from '../types/lead';

vi.mock('../lib/supabaseStore', () => ({
  getLead: vi.fn(),
}));

vi.mock('../lib/ingestedDriverStore', () => ({
  createIngestedDriver: vi.fn(),
}));

import { ingestLead } from '../lib/ingestLead';
import { getLead } from '../lib/supabaseStore';
import { createIngestedDriver } from '../lib/ingestedDriverStore';

const readyLead = (): Lead => ({
  id: 'test-lead-id',
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

const incompleteLead = (): Lead => ({
  ...readyLead(),
  lead_status: 'incomplete_lead',
  completed_at: null,
  last_step_reached: 4,
  phone: null,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── happy path ───────────────────────────────────────────────────────────────

describe('ingestLead — happy path', () => {
  it('returns ok:true with driver, score, and persisted:true', async () => {
    vi.mocked(getLead).mockResolvedValue(readyLead());
    vi.mocked(createIngestedDriver).mockResolvedValue(undefined);

    const result = await ingestLead('test-lead-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.persisted).toBe(true);
    expect(result.driver.id).toBe('test-lead-id');
    expect(result.score.total).toBeGreaterThan(0);
    expect(result.score.tier).toBe('HIGH');
  });

  it('calls createIngestedDriver with the built driver', async () => {
    vi.mocked(getLead).mockResolvedValue(readyLead());
    vi.mocked(createIngestedDriver).mockResolvedValue(undefined);

    await ingestLead('test-lead-id');

    expect(vi.mocked(createIngestedDriver)).toHaveBeenCalledOnce();
    const calledWith = vi.mocked(createIngestedDriver).mock.calls[0][0];
    expect(calledWith.id).toBe('test-lead-id');
    expect(calledWith.license).toBe('CE');
  });

  it('preserves domain and shiftPreference through the pipeline', async () => {
    vi.mocked(getLead).mockResolvedValue({
      ...readyLead(),
      domain: 'adr',
      shift_preference: 'night',
    });
    vi.mocked(createIngestedDriver).mockResolvedValue(undefined);

    const result = await ingestLead('test-lead-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.driver.domain).toBe('adr');
    expect(result.driver.shiftPreference).toBe('night');
  });
});

// ─── lead_not_found ───────────────────────────────────────────────────────────

describe('ingestLead — lead_not_found', () => {
  it('returns lead_not_found when getLead returns null', async () => {
    vi.mocked(getLead).mockResolvedValue(null);

    const result = await ingestLead('nonexistent-id');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('lead_not_found');
  });
});

// ─── supabase_error ───────────────────────────────────────────────────────────

describe('ingestLead — supabase_error', () => {
  it('returns supabase_error when getLead throws', async () => {
    vi.mocked(getLead).mockRejectedValue(new Error('connection refused'));

    const result = await ingestLead('test-lead-id');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('supabase_error');
  });

  it('returns supabase_error when createIngestedDriver throws', async () => {
    vi.mocked(getLead).mockResolvedValue(readyLead());
    vi.mocked(createIngestedDriver).mockRejectedValue(new Error('insert failed'));

    const result = await ingestLead('test-lead-id');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('supabase_error');
  });

  it('does not call createIngestedDriver when getLead throws', async () => {
    vi.mocked(getLead).mockRejectedValue(new Error('db error'));

    await ingestLead('test-lead-id');

    expect(vi.mocked(createIngestedDriver)).not.toHaveBeenCalled();
  });
});

// ─── not_ready_for_ingestion ──────────────────────────────────────────────────

describe('ingestLead — not_ready_for_ingestion', () => {
  it('returns not_ready_for_ingestion with lead_status for an incomplete lead', async () => {
    vi.mocked(getLead).mockResolvedValue(incompleteLead());

    const result = await ingestLead('test-lead-id');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('not_ready_for_ingestion');
    expect(result.lead_status).toBe('incomplete_lead');
  });

  it('does not call createIngestedDriver for an incomplete lead', async () => {
    vi.mocked(getLead).mockResolvedValue(incompleteLead());

    await ingestLead('test-lead-id');

    expect(vi.mocked(createIngestedDriver)).not.toHaveBeenCalled();
  });
});

// ─── missing_required_field ───────────────────────────────────────────────────

describe('ingestLead — missing_required_field', () => {
  it('returns missing_required_field with lead_status when phone is absent', async () => {
    // Simulate an inconsistent state: status says ready but phone was never collected
    vi.mocked(getLead).mockResolvedValue({
      ...readyLead(),
      phone: null,
    });

    const result = await ingestLead('test-lead-id');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('missing_required_field');
    expect(result.lead_status).toBe('ready_for_ingestion');
  });
});
