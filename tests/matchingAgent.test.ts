import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/companyNeedStore', () => ({
  getMatchableOpenCompanyNeeds: vi.fn(),
}));

vi.mock('../lib/ingestedDriverStore', () => ({
  getActiveIngestedDrivers: vi.fn(),
}));

vi.mock('../lib/matchingEngine', () => ({
  buildShortlist: vi.fn(),
}));

vi.mock('../lib/shortlistStore', () => ({
  createShortlist: vi.fn(),
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('action-id'),
}));

vi.mock('../lib/contactAgent', () => ({
  runContactAgent: vi.fn().mockResolvedValue({ suggested: 0, contacted: 0, skipped: 0, errors: 0 }),
}));

import { runMatchingAgent } from '../lib/matchingAgent';
import { getMatchableOpenCompanyNeeds } from '../lib/companyNeedStore';
import { getActiveIngestedDrivers } from '../lib/ingestedDriverStore';
import { buildShortlist } from '../lib/matchingEngine';
import { createShortlist } from '../lib/shortlistStore';
import { logAction } from '../lib/systemActions';
import { runContactAgent } from '../lib/contactAgent';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NEED_ROW = {
  id:                 'need-1',
  company_id:         'co-1',
  created_at:         new Date(),
  license_required:   'CE',
  domain_required:    'distribution',
  domain_preferred:   [],
  location_region:    'stockholm',
  relocation_allowed: false,
  shift_type:         'day',
  urgency:            'standard',
  status:             'open',
};

const DRIVER = {
  id:           'driver-1',
  ingestedAt:   new Date(),
  priority:     'HIGH',
  license:      'CE',
  ykb:          'valid',
  driverCard:   'valid',
  location:     { region: 'stockholm', willingToRelocate: null },
  availability: 'now',
  domain:       'distribution',
  shiftPreference: 'day',
  needsFollowUp: false,
  followUpAt:   null,
  followUpReason: null,
  contact: { firstName: 'Erik', phone: '+46700000001', email: null },
};

const SHORTLIST_RESULT = {
  shortlisted:      [{ driver: DRIVER, score: { total: 98, breakdown: {}, flags: [], summary: 'Strong match' } }],
  rejected:         [],
  totalCandidates:  1,
  totalShortlisted: 1,
  summary:          '1 of 1 candidates shortlisted',
};

const CREATE_RESULT = {
  shortlistId:        'sl-1',
  entryIdsByDriverId: { 'driver-1': 'entry-1' },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([NEED_ROW] as never);
  vi.mocked(getActiveIngestedDrivers).mockResolvedValue([DRIVER] as never);
  vi.mocked(buildShortlist).mockReturnValue(SHORTLIST_RESULT as never);
  vi.mocked(createShortlist).mockResolvedValue(CREATE_RESULT);
});

// ─── Success path ─────────────────────────────────────────────────────────────

describe('runMatchingAgent — success', () => {
  it('returns ok:true with shortlistId and mapped entry IDs', async () => {
    const r = await runMatchingAgent({ needId: 'need-1', triggeredBy: 'human' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.shortlistId).toBe('sl-1');
    expect(r.entryIdsByDriverId).toEqual({ 'driver-1': 'entry-1' });
  });

  it('returns the shortlisted entries from buildShortlist', async () => {
    const r = await runMatchingAgent({ needId: 'need-1', triggeredBy: 'human' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.shortlisted).toHaveLength(1);
    expect(r.shortlisted[0].driver.id).toBe('driver-1');
  });

  it('returns totalCandidates and totalShortlisted', async () => {
    const r = await runMatchingAgent({ needId: 'need-1', triggeredBy: 'human' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalCandidates).toBe(1);
    expect(r.totalShortlisted).toBe(1);
  });
});

// ─── Logging ──────────────────────────────────────────────────────────────────

describe('runMatchingAgent — logging', () => {
  it('logs a completed match_run action', async () => {
    await runMatchingAgent({ needId: 'need-1', triggeredBy: 'human' });
    const calls = vi.mocked(logAction).mock.calls;
    const matchRun = calls.find(([p]) => p.action_type === 'match_run' && p.status === 'completed');
    expect(matchRun).toBeDefined();
    expect(matchRun![0].target_id).toBe('need-1');
    expect(matchRun![0].triggered_by).toBe('human');
  });

  it('logs a completed shortlist_created action', async () => {
    await runMatchingAgent({ needId: 'need-1', triggeredBy: 'human' });
    const calls = vi.mocked(logAction).mock.calls;
    const slLog = calls.find(([p]) => p.action_type === 'shortlist_created');
    expect(slLog).toBeDefined();
    expect(slLog![0].target_id).toBe('sl-1');
  });

  it('passes pool_size in the match_run log input', async () => {
    await runMatchingAgent({ needId: 'need-1', triggeredBy: 'human' });
    const calls = vi.mocked(logAction).mock.calls;
    const matchRun = calls.find(([p]) => p.action_type === 'match_run' && p.status === 'completed');
    expect((matchRun![0].input as Record<string, unknown>).pool_size).toBe(1);
  });
});

// ─── Contact agent trigger ────────────────────────────────────────────────────

describe('runMatchingAgent — contact agent trigger', () => {
  it('calls runContactAgent with the new shortlistId after success', async () => {
    await runMatchingAgent({ needId: 'need-1', triggeredBy: 'human' });
    // allow fire-and-forget microtask to flush
    await Promise.resolve();
    expect(vi.mocked(runContactAgent)).toHaveBeenCalledWith({ shortlistId: 'sl-1' });
  });
});

// ─── Error paths ──────────────────────────────────────────────────────────────

describe('runMatchingAgent — need not found', () => {
  it('returns ok:false with error need_not_found', async () => {
    vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([]);
    const r = await runMatchingAgent({ needId: 'missing', triggeredBy: 'human' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('need_not_found');
  });

  it('does not log a system action when need is not found', async () => {
    vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([]);
    await runMatchingAgent({ needId: 'missing', triggeredBy: 'human' });
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });
});

describe('runMatchingAgent — DB errors', () => {
  it('returns ok:false and logs failed match_run when getOpenCompanyNeeds throws', async () => {
    vi.mocked(getMatchableOpenCompanyNeeds).mockRejectedValue(new Error('DB timeout'));
    const r = await runMatchingAgent({ needId: 'need-1', triggeredBy: 'human' });
    expect(r.ok).toBe(false);
    const failLog = vi.mocked(logAction).mock.calls.find(([p]) => p.status === 'failed');
    expect(failLog).toBeDefined();
    expect(failLog![0].action_type).toBe('match_run');
  });

  it('returns ok:false and logs failed match_run when getActiveIngestedDrivers throws', async () => {
    vi.mocked(getActiveIngestedDrivers).mockRejectedValue(new Error('connection reset'));
    const r = await runMatchingAgent({ needId: 'need-1', triggeredBy: 'human' });
    expect(r.ok).toBe(false);
    const failLog = vi.mocked(logAction).mock.calls.find(([p]) => p.status === 'failed');
    expect(failLog).toBeDefined();
  });

  it('returns ok:false and logs failed match_run when createShortlist throws', async () => {
    vi.mocked(createShortlist).mockRejectedValue(new Error('insert failed'));
    const r = await runMatchingAgent({ needId: 'need-1', triggeredBy: 'human' });
    expect(r.ok).toBe(false);
    const failLog = vi.mocked(logAction).mock.calls.find(([p]) => p.status === 'failed');
    expect(failLog).toBeDefined();
  });

  it('does not call runContactAgent when matching fails', async () => {
    vi.mocked(createShortlist).mockRejectedValue(new Error('insert failed'));
    await runMatchingAgent({ needId: 'need-1', triggeredBy: 'human' });
    await Promise.resolve();
    expect(vi.mocked(runContactAgent)).not.toHaveBeenCalled();
  });
});
