import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module mocks (dependencies of matchingAgent — NOT matchingAgent itself) ──

vi.mock('../lib/companyNeedStore', () => ({
  getMatchableOpenCompanyNeeds: vi.fn(),
  getCompanyNamesForIds:        vi.fn(),
}));

vi.mock('../lib/shortlistStore', () => ({
  getShortlistByNeedId: vi.fn(),
  createShortlist:      vi.fn(),
}));

vi.mock('../lib/ingestedDriverStore', () => ({
  getActiveIngestedDrivers: vi.fn(),
}));

vi.mock('../lib/matchingEngine', () => ({
  buildShortlist: vi.fn(),
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('action-id'),
}));

vi.mock('../lib/contactAgent', () => ({
  runContactAgent: vi.fn().mockResolvedValue({ suggested: 0, contacted: 0, skipped: 0, errors: 0 }),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { refreshStaleShortlists } from '../lib/matchingAgent';
import { getMatchableOpenCompanyNeeds, getCompanyNamesForIds } from '../lib/companyNeedStore';
import { getShortlistByNeedId, createShortlist } from '../lib/shortlistStore';
import { getActiveIngestedDrivers } from '../lib/ingestedDriverStore';
import { buildShortlist } from '../lib/matchingEngine';
import { logAction } from '../lib/systemActions';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function staleDate(): string {
  return new Date(Date.now() - SEVEN_DAYS_MS - 60_000).toISOString();
}
function freshDate(): string {
  return new Date(Date.now() - 60_000).toISOString();
}

const NEED_1 = {
  id:                 'need-1',
  company_id:         'co-1',
  created_at:         new Date(),
  license_required:   'CE',
  domain_required:    'distribution',
  domain_preferred:   [],
  location_region:    'stockholm',
  relocation_allowed: false,
  shift_type:         'day',
  urgency:            'urgent',
  status:             'open',
  need_type:          'active_public_need',
  source_draft_id:    null,
  metadata:           null,
};

const NEED_JPC = { ...NEED_1, id: 'need-jpc', company_id: 'co-jpc' };

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
  needsFollowUp:   false,
  followUpAt:      null,
  followUpReason:  null,
  contact: { firstName: 'Erik', phone: '+46700000001', email: null },
};

const SHORTLIST_RESULT = {
  shortlisted:      [{ driver: DRIVER, score: { total: 95, breakdown: {}, flags: [], summary: 'Match' } }],
  rejected:         [],
  totalCandidates:  1,
  totalShortlisted: 1,
  summary:          '1 of 1',
};

const CREATE_RESULT = { shortlistId: 'sl-new', entryIdsByDriverId: { 'driver-1': 'entry-1' } };

// ─── Default happy-path setup ─────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([NEED_1] as never);
  vi.mocked(getCompanyNamesForIds).mockResolvedValue({ 'co-1': 'Enskede Bilexpress AB' });
  vi.mocked(getShortlistByNeedId).mockResolvedValue({
    id: 'sl-old', created_at: staleDate(), total_shortlisted: 1,
  });
  vi.mocked(getActiveIngestedDrivers).mockResolvedValue([DRIVER] as never);
  vi.mocked(buildShortlist).mockReturnValue(SHORTLIST_RESULT as never);
  vi.mocked(createShortlist).mockResolvedValue(CREATE_RESULT);
});

// ─── Result shape ─────────────────────────────────────────────────────────────

describe('refreshStaleShortlists — result shape', () => {
  it('returns run_type: shortlist_refresh', async () => {
    const r = await refreshStaleShortlists();
    expect(r.run_type).toBe('shortlist_refresh');
  });

  it('returns an errors array', async () => {
    const r = await refreshStaleShortlists();
    expect(Array.isArray(r.errors)).toBe(true);
  });

  it('reports needs_checked for all matchable needs', async () => {
    vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([NEED_1, { ...NEED_1, id: 'n2' }] as never);
    vi.mocked(getCompanyNamesForIds).mockResolvedValue({ 'co-1': 'Enskede AB' });
    const r = await refreshStaleShortlists();
    expect(r.needs_checked).toBe(2);
  });
});

// ─── Stale shortlist refreshed ────────────────────────────────────────────────

describe('refreshStaleShortlists — stale shortlist', () => {
  it('refreshes a shortlist older than 7 days', async () => {
    const r = await refreshStaleShortlists();
    expect(r.stale_needs_found).toBe(1);
    expect(r.shortlists_refreshed).toBe(1);
    expect(r.skipped_fresh).toBe(0);
    expect(r.errors).toHaveLength(0);
  });

  it('calls createShortlist to write the fresh shortlist', async () => {
    await refreshStaleShortlists();
    expect(vi.mocked(createShortlist)).toHaveBeenCalled();
  });
});

// ─── Fresh shortlist skipped ──────────────────────────────────────────────────

describe('refreshStaleShortlists — fresh shortlist', () => {
  it('skips a shortlist younger than 7 days', async () => {
    vi.mocked(getShortlistByNeedId).mockResolvedValue({
      id: 'sl-fresh', created_at: freshDate(), total_shortlisted: 2,
    });

    const r = await refreshStaleShortlists();

    expect(r.skipped_fresh).toBe(1);
    expect(r.stale_needs_found).toBe(0);
    expect(r.shortlists_refreshed).toBe(0);
  });

  it('does not call createShortlist for a fresh shortlist', async () => {
    vi.mocked(getShortlistByNeedId).mockResolvedValue({
      id: 'sl-fresh', created_at: freshDate(), total_shortlisted: 1,
    });
    await refreshStaleShortlists();
    expect(vi.mocked(createShortlist)).not.toHaveBeenCalled();
  });
});

// ─── No existing shortlist → treated as stale ─────────────────────────────────

describe('refreshStaleShortlists — need with no shortlist', () => {
  it('treats a need with no shortlist as stale and refreshes it', async () => {
    vi.mocked(getShortlistByNeedId).mockResolvedValue(null);
    const r = await refreshStaleShortlists();
    expect(r.stale_needs_found).toBe(1);
    expect(r.shortlists_refreshed).toBe(1);
  });
});

// ─── Do-not-contact guard ─────────────────────────────────────────────────────

describe('refreshStaleShortlists — do_not_contact guard', () => {
  it('skips JPC Entreprenad AB by company name', async () => {
    vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([NEED_JPC] as never);
    vi.mocked(getCompanyNamesForIds).mockResolvedValue({ 'co-jpc': 'JPC Entreprenad AB' });

    const r = await refreshStaleShortlists();

    expect(r.skipped_do_not_contact).toBe(1);
    expect(r.shortlists_refreshed).toBe(0);
    expect(r.stale_needs_found).toBe(0);
  });

  it('does not call createShortlist for a DNC company', async () => {
    vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([NEED_JPC] as never);
    vi.mocked(getCompanyNamesForIds).mockResolvedValue({ 'co-jpc': 'JPC Entreprenad AB' });

    await refreshStaleShortlists();

    expect(vi.mocked(createShortlist)).not.toHaveBeenCalled();
  });

  it('skips lowercase jpc entreprenad variant', async () => {
    vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([NEED_JPC] as never);
    vi.mocked(getCompanyNamesForIds).mockResolvedValue({ 'co-jpc': 'jpc entreprenad' });

    const r = await refreshStaleShortlists();
    expect(r.skipped_do_not_contact).toBe(1);
  });

  it('does not skip a clean non-excluded company', async () => {
    const r = await refreshStaleShortlists();
    expect(r.skipped_do_not_contact).toBe(0);
    expect(r.shortlists_refreshed).toBe(1);
  });
});

// ─── Mixed batch ──────────────────────────────────────────────────────────────

describe('refreshStaleShortlists — mixed batch (DNC + fresh + stale)', () => {
  it('correctly categorises all three cases in one run', async () => {
    const NEED_2 = { ...NEED_1, id: 'need-2', company_id: 'co-2' };
    const NEED_3 = { ...NEED_1, id: 'need-3', company_id: 'co-3' };

    vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue(
      [NEED_JPC, NEED_1, NEED_2, NEED_3] as never,
    );
    vi.mocked(getCompanyNamesForIds).mockResolvedValue({
      'co-jpc': 'JPC Entreprenad AB',
      'co-1':   'Enskede AB',
      'co-2':   'Edvardssons AB',
      'co-3':   'Trabé Transport',
    });
    vi.mocked(getShortlistByNeedId).mockImplementation(async (id: string) => {
      if (id === 'need-1') return { id: 'sl-1', created_at: staleDate(), total_shortlisted: 1 };
      if (id === 'need-2') return { id: 'sl-2', created_at: freshDate(), total_shortlisted: 2 };
      return null;
    });

    const r = await refreshStaleShortlists();

    expect(r.needs_checked).toBe(4);
    expect(r.skipped_do_not_contact).toBe(1);
    expect(r.skipped_fresh).toBe(1);
    expect(r.stale_needs_found).toBe(2);
    expect(r.shortlists_refreshed).toBe(2);
  });
});

// ─── System action logging ─────────────────────────────────────────────────────

describe('refreshStaleShortlists — logging', () => {
  it('logs a shortlist_refresh action on completion', async () => {
    await refreshStaleShortlists();
    const calls = vi.mocked(logAction).mock.calls;
    const log = calls.find(([p]) => p.action_type === 'shortlist_refresh');
    expect(log).toBeDefined();
    expect(log![0].status).toBe('completed');
    expect(log![0].triggered_by).toBe('cron:shortlist_refresh_v1');
  });

  it('log result contains only counts — no PII', async () => {
    await refreshStaleShortlists();
    const calls = vi.mocked(logAction).mock.calls;
    const log = calls.find(([p]) => p.action_type === 'shortlist_refresh');
    const result = log![0].result as Record<string, unknown>;
    expect(result).toHaveProperty('needs_checked');
    expect(result).toHaveProperty('shortlists_refreshed');
    expect(result).toHaveProperty('skipped_do_not_contact');
    expect(result).toHaveProperty('error_count');
    // Verify no PII present in log result
    const str = JSON.stringify(result);
    expect(str).not.toMatch(/@/);
    expect(str).not.toMatch(/\+46/);
  });

  it('logs failed status when getMatchableOpenCompanyNeeds throws', async () => {
    vi.mocked(getMatchableOpenCompanyNeeds).mockRejectedValue(new Error('DB timeout'));
    await refreshStaleShortlists();
    const calls = vi.mocked(logAction).mock.calls;
    const failLog = calls.find(([p]) => p.action_type === 'shortlist_refresh' && p.status === 'failed');
    expect(failLog).toBeDefined();
  });
});

// ─── Error resilience ─────────────────────────────────────────────────────────

describe('refreshStaleShortlists — error resilience', () => {
  it('collects error in errors array when createShortlist fails (non-throwing)', async () => {
    vi.mocked(createShortlist).mockRejectedValue(new Error('insert timeout'));
    const r = await refreshStaleShortlists();
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.shortlists_refreshed).toBe(0);
  });

  it('continues refreshing remaining needs when one fails', async () => {
    const NEED_2 = { ...NEED_1, id: 'need-2', company_id: 'co-2' };
    vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([NEED_1, NEED_2] as never);
    vi.mocked(getCompanyNamesForIds).mockResolvedValue({ 'co-1': 'AB A', 'co-2': 'AB B' });
    vi.mocked(getShortlistByNeedId).mockResolvedValue(null);

    let callCount = 0;
    vi.mocked(createShortlist).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('first insert failed');
      return CREATE_RESULT;
    });

    const r = await refreshStaleShortlists();
    expect(r.stale_needs_found).toBe(2);
    expect(r.shortlists_refreshed).toBe(1);
    expect(r.errors).toHaveLength(1);
  });
});
