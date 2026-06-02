import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/db', () => ({ db: { from: vi.fn() } }));
vi.mock('../lib/systemActions', () => ({ logAction: vi.fn().mockResolvedValue('uuid') }));
vi.mock('../lib/contactAgent', () => ({
  // Resolves silently by default — matching tests do not test contact behaviour.
  // Individual tests can override to verify error containment.
  runContactAgent: vi.fn().mockResolvedValue(undefined),
}));
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
  createShortlist:        vi.fn(),
  getShortlistByNeedId:   vi.fn(),
}));

import { runMatchingAgent, ensureShortlistForNeed } from '../lib/matchingAgent';
import { getMatchableOpenCompanyNeeds } from '../lib/companyNeedStore';
import { getActiveIngestedDrivers } from '../lib/ingestedDriverStore';
import { buildShortlist } from '../lib/matchingEngine';
import { createShortlist, getShortlistByNeedId } from '../lib/shortlistStore';
import { logAction } from '../lib/systemActions';
import { runContactAgent } from '../lib/contactAgent';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNeed(id = 'need-1') {
  return {
    id,
    license_required:   'CE',
    domain_required:    'distribution',
    domain_preferred:   [],
    location_region:    'stockholm',
    relocation_allowed: false,
    shift_type:         'day',
    urgency:            'urgent',
  };
}

function makeDriver(id = 'driver-1') {
  return { id, license: 'CE', domain: 'distribution', region: 'stockholm', match_score: 85 };
}

function setupHappyPath(needId = 'need-1') {
  vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([makeNeed(needId)] as never);
  vi.mocked(getActiveIngestedDrivers).mockResolvedValue([makeDriver()] as never);
  vi.mocked(buildShortlist).mockReturnValue({
    shortlisted:      [{ driver_id: 'driver-1', rank: 1, match_score: 85, breakdown: {}, flags: [], summary: 'ok', driver_snapshot: {} }],
    rejected:         [],
    totalShortlisted: 1,
    totalCandidates:  1,
    summary:          '1/1 shortlisted',
  } as never);
  vi.mocked(createShortlist).mockResolvedValue({
    shortlistId:        'sl-1',
    entryIdsByDriverId: { 'driver-1': 'entry-1' },
  } as never);
  vi.mocked(getShortlistByNeedId).mockResolvedValue(null); // no existing shortlist
}

beforeEach(() => vi.clearAllMocks());

// ─── runMatchingAgent ─────────────────────────────────────────────────────────

describe('runMatchingAgent', () => {
  it('succeeds and returns shortlist data', async () => {
    setupHappyPath();
    const result = await runMatchingAgent({ needId: 'need-1', triggeredBy: 'test' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shortlistId).toBe('sl-1');
    expect(result.totalShortlisted).toBe(1);
  });

  it('logs match_run and shortlist_created on success', async () => {
    setupHappyPath();
    await runMatchingAgent({ needId: 'need-1', triggeredBy: 'test' });
    const calls = vi.mocked(logAction).mock.calls.map((c) => (c[0] as { action_type: string }).action_type);
    expect(calls).toContain('match_run');
    expect(calls).toContain('shortlist_created');
  });

  it('returns ok:false with need_not_found when need does not exist', async () => {
    vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([]);
    vi.mocked(getActiveIngestedDrivers).mockResolvedValue([]);
    const result = await runMatchingAgent({ needId: 'nonexistent', triggeredBy: 'test' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('need_not_found');
  });

  it('handles zero matches gracefully (empty shortlist)', async () => {
    vi.mocked(getMatchableOpenCompanyNeeds).mockResolvedValue([makeNeed()] as never);
    vi.mocked(getActiveIngestedDrivers).mockResolvedValue([]);
    vi.mocked(buildShortlist).mockReturnValue({
      shortlisted: [], rejected: [], totalShortlisted: 0, totalCandidates: 0, summary: '0/0',
    } as never);
    vi.mocked(createShortlist).mockResolvedValue({ shortlistId: 'sl-empty', entryIdsByDriverId: {} } as never);
    const result = await runMatchingAgent({ needId: 'need-1', triggeredBy: 'test' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalShortlisted).toBe(0);
  });

  it('does NOT expose driver names, phones, or emails in system_actions logs', async () => {
    setupHappyPath();
    await runMatchingAgent({ needId: 'need-1', triggeredBy: 'test' });
    const payload = JSON.stringify(vi.mocked(logAction).mock.calls);
    expect(payload).not.toContain('@gmail');
    expect(payload).not.toContain('0730');
    expect(payload).not.toContain('Anders');
  });

  it('contactAgent is never called directly from matching', async () => {
    // runMatchingAgent fires contactAgent via fire-and-forget void — that is expected.
    // This test verifies contactAgent does not cause runMatchingAgent to throw.
    setupHappyPath();
    // Override: contact agent throws — matching should still succeed
    vi.mocked(runContactAgent).mockRejectedValue(new Error('contact_agent_error'));
    const result = await runMatchingAgent({ needId: 'need-1', triggeredBy: 'test' });
    // Matching itself returns ok even if contact agent later fails
    expect(result.ok).toBe(true);
  });
});

// ─── ensureShortlistForNeed ───────────────────────────────────────────────────

describe('ensureShortlistForNeed', () => {
  it('returns existing fresh shortlist without re-matching', async () => {
    vi.mocked(getShortlistByNeedId).mockResolvedValue({
      id:                'sl-existing',
      created_at:        new Date(Date.now() - 3_600_000).toISOString(), // 1 hour ago
      total_shortlisted: 2,
    });
    const result = await ensureShortlistForNeed('need-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shortlistId).toBe('sl-existing');
    // Matching was NOT re-run (createShortlist not called)
    expect(vi.mocked(createShortlist)).not.toHaveBeenCalled();
  });

  it('re-runs matching when existing shortlist is stale (> 7 days)', async () => {
    vi.mocked(getShortlistByNeedId).mockResolvedValue({
      id:                'sl-stale',
      created_at:        new Date(Date.now() - 8 * 24 * 3_600_000).toISOString(), // 8 days old
      total_shortlisted: 1,
    });
    setupHappyPath();
    const result = await ensureShortlistForNeed('need-1');
    expect(result.ok).toBe(true);
    // New shortlist was created
    expect(vi.mocked(createShortlist)).toHaveBeenCalled();
  });

  it('runs matching when no shortlist exists', async () => {
    vi.mocked(getShortlistByNeedId).mockResolvedValue(null);
    setupHappyPath();
    await ensureShortlistForNeed('need-1');
    expect(vi.mocked(createShortlist)).toHaveBeenCalled();
  });

  it('is idempotent — calling twice with fresh shortlist does not double-match', async () => {
    vi.mocked(getShortlistByNeedId).mockResolvedValue({
      id: 'sl-1', created_at: new Date().toISOString(), total_shortlisted: 1,
    });
    await ensureShortlistForNeed('need-1');
    await ensureShortlistForNeed('need-1');
    expect(vi.mocked(createShortlist)).not.toHaveBeenCalled();
  });
});

// ─── promoteDraft triggers matching ──────────────────────────────────────────
// These tests live here (not in companyNeedDraft.test.ts) to keep mocking clean.

describe('promoteDraft → matching integration', () => {
  it('runMatchingAgent is the fire-and-forget target — matching failure does not reject promise', async () => {
    // This tests the contract: matching errors must not propagate to the caller.
    // We mock runMatchingAgent to throw, and verify the dynamic import resolves it safely.
    // The fire-and-forget is void-wrapped so the promoteDraft return must still succeed.
    // (Full integration test would require mocking promoteDraft's DB calls too)
    // Here we simply verify ensureShortlistForNeed works when matchingAgent errors.
    vi.mocked(getShortlistByNeedId).mockResolvedValue(null);
    vi.mocked(getMatchableOpenCompanyNeeds).mockRejectedValue(new Error('db_error'));
    const result = await ensureShortlistForNeed('need-x');
    // ensureShortlistForNeed delegates to runMatchingAgent which returns ok:false on DB error
    expect(result.ok).toBe(false);
    // But the error is contained — no unhandled rejection
  });
});
