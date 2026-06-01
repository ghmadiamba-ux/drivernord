import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

vi.mock('../lib/recruiterAuth', () => ({
  requireRecruiterAuth: vi.fn().mockReturnValue({
    ok: false, body: { error: 'unauthorized' }, status: 401,
  }),
}));

import { buildCockpitSummary } from '../lib/cockpitSummary';
import { db } from '../lib/db';
import { requireRecruiterAuth } from '../lib/recruiterAuth';

// ─── Chain builders ───────────────────────────────────────────────────────────
// Each matches the exact Supabase query chain used in buildCockpitSummary.

// db.from(...).select(...).eq(...)  → used by company_needs, DQ, dup
function chainSelectEq(result: unknown) {
  return { select: () => ({ eq: () => Promise.resolve(result) }) };
}

// db.from(...).select(...).eq(...).eq(...)  → pending contact_suggested count
function chainSelectEqEq(result: unknown) {
  return { select: () => ({ eq: () => ({ eq: () => Promise.resolve(result) }) }) };
}

// db.from(...).select(...).eq(...).eq(...).order(...).limit(...)  → last scan time
function chainLastScan(result: unknown) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve(result),
          }),
        }),
      }),
    }),
  };
}

// db.from(...).select(...).order(...).limit(...)  → company_need_drafts
function chainSelectOrderLimit(result: unknown) {
  return { select: () => ({ order: () => ({ limit: () => Promise.resolve(result) }) }) };
}

// db.from(...).select(...).in(...)  → shortlists, shortlist_entries, company_research_targets
function chainSelectIn(result: unknown) {
  return { select: () => ({ in: () => Promise.resolve(result) }) };
}

// db.from(...).select(...)  → used by pilot_company_relationships
function chainSelectOnly(result: unknown) {
  return { select: () => Promise.resolve(result) };
}

// ─── Helper: need row with embedded companies ─────────────────────────────────

function makeNeedRow(overrides: Partial<{
  id:               string;
  need_type:        string;
  license_required: string;
  domain_required:  string;
  location_region:  string;
  urgency:          string;
  company_name:     string;
}> = {}) {
  return {
    id:               overrides.id               ?? 'need-a',
    need_type:        overrides.need_type         ?? 'active_public_need',
    license_required: overrides.license_required  ?? 'CE',
    domain_required:  overrides.domain_required   ?? 'distribution',
    location_region:  overrides.location_region   ?? 'stockholm',
    urgency:          overrides.urgency            ?? 'standard',
    companies:        { name: overrides.company_name ?? 'Acme AB' },
  };
}

// ─── Main mock setup ──────────────────────────────────────────────────────────

function setupDbMocks({
  needRows             = [] as Record<string, unknown>[],
  dqActions            = [] as Record<string, unknown>[],
  dupActions           = [] as Record<string, unknown>[],
  pendingCount         = 0,
  draftRows            = [] as Record<string, unknown>[],
  lastScanRows         = [] as Record<string, unknown>[],
  lastWeeklyScanRows   = [] as Record<string, unknown>[],
  shortlistRows        = [] as Record<string, unknown>[],
  researchTargetRows   = [] as Record<string, unknown>[],
  entryRows            = [] as Record<string, unknown>[],
  pilotRows            = [] as Record<string, unknown>[],
  pilotError           = null as { message: string } | null,
  outreachQueueError   = null as { message: string } | null,
  outreachQueueRows    = [] as Record<string, unknown>[],
} = {}) {
  let saCount = 0;

  vi.mocked(db.from).mockImplementation((table: string) => {
    // ── company_needs ──────────────────────────────────────────────────────
    if (table === 'company_needs') {
      return chainSelectEq({ data: needRows, error: null }) as never;
    }

    // ── system_actions (6 calls in Phase 1 Promise.all) ───────────────────
    if (table === 'system_actions') {
      saCount++;
      if (saCount === 1) return chainSelectEq     ({ data: dqActions, error: null })          as never; // DQ
      if (saCount === 2) return chainSelectEq     ({ data: dupActions, error: null })          as never; // dup
      if (saCount === 3) return chainSelectEqEq   ({ count: pendingCount, error: null })       as never; // pending
      if (saCount === 4) return chainLastScan     ({ data: lastScanRows, error: null })        as never; // daily scan
      if (saCount === 5) return chainLastScan     ({ data: lastWeeklyScanRows, error: null })  as never; // weekly scan
      return               chainLastScan          ({ data: [], error: null })                  as never; // last scan result
    }

    // ── company_need_drafts ────────────────────────────────────────────────
    if (table === 'company_need_drafts') {
      return chainSelectOrderLimit({ data: draftRows, error: null }) as never;
    }

    // ── shortlists ─────────────────────────────────────────────────────────
    if (table === 'shortlists') {
      return chainSelectIn({ data: shortlistRows, error: null }) as never;
    }

    // ── company_research_targets ───────────────────────────────────────────
    if (table === 'company_research_targets') {
      return chainSelectIn({ data: researchTargetRows, error: null }) as never;
    }

    // ── shortlist_entries ──────────────────────────────────────────────────
    if (table === 'shortlist_entries') {
      return chainSelectIn({ data: entryRows, error: null }) as never;
    }

    // ── pilot_company_relationships ────────────────────────────────────────
    if (table === 'pilot_company_relationships') {
      return chainSelectOnly({ data: pilotError ? null : pilotRows, error: pilotError }) as never;
    }

    // ── outreach_email_queue (migration 017 probe + batch-1 follow-up check)
    if (table === 'outreach_email_queue') {
      return chainSelectOnly({
        data:  outreachQueueError ? null : outreachQueueRows,
        error: outreachQueueError,
      }) as never;
    }

    return {} as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Signals ──────────────────────────────────────────────────────────────────

describe('buildCockpitSummary — signals', () => {
  it('real_open_needs excludes simulation and archived_test types', async () => {
    setupDbMocks({
      needRows: [
        makeNeedRow({ id: 'a', need_type: 'active_public_need' }),
        makeNeedRow({ id: 'b', need_type: 'simulation_only' }),
        makeNeedRow({ id: 'c', need_type: 'archived_test' }),
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.real_open_needs).toBe(1);
  });

  it('matching_blocked is false when at least one matchable need exists', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ need_type: 'active_public_need' })],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.matching_blocked).toBe(false);
  });

  it('matching_blocked is true when no matchable needs', async () => {
    setupDbMocks({ needRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.matching_blocked).toBe(true);
  });

  it('sms_safe is false when simulation needs exist', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ need_type: 'simulation_only' })],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.sms_safe).toBe(false);
    expect(result.signals.matching_blocked).toBe(true); // also blocked
  });

  it('sms_safe is true when no simulation needs', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ need_type: 'active_public_need' })],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.sms_safe).toBe(true);
  });

  it('external_contact_blocked is true when no outreach_approved needs', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ need_type: 'active_public_need' })],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.external_contact_blocked).toBe(true);
  });

  it('external_contact_blocked is false when an outreach_approved need exists', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ need_type: 'outreach_approved' })],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.external_contact_blocked).toBe(false);
  });

  it('dq_flagged_count reflects all data_quality_issue actions', async () => {
    setupDbMocks({
      dqActions: [{ target_id: 'driver-1' }, { target_id: 'driver-2' }],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.dq_flagged_count).toBe(2);
  });

  it('duplicate_flagged_count reflects all driver_duplicate_detected actions', async () => {
    setupDbMocks({
      dupActions: [
        { input: { new_id: 'd1', phone: '070', existing_id: 'd0' } },
        { input: { new_id: 'd2', phone: '071', existing_id: 'd0' } },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.duplicate_flagged_count).toBe(2);
  });

  it('pending_contact_suggested reflects pending count', async () => {
    setupDbMocks({ pendingCount: 7 });
    const result = await buildCockpitSummary();
    expect(result.signals.pending_contact_suggested).toBe(7);
  });

  it('last_daily_scan_at is null when no scan events', async () => {
    setupDbMocks({ lastScanRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.last_daily_scan_at).toBeNull();
  });

  it('last_daily_scan_at is the most recent scan timestamp', async () => {
    setupDbMocks({ lastScanRows: [{ created_at: '2026-05-20T08:00:00Z' }] });
    const result = await buildCockpitSummary();
    expect(result.signals.last_daily_scan_at).toBe('2026-05-20T08:00:00Z');
  });

  it('promotion_candidates count comes from ready_for_review drafts', async () => {
    setupDbMocks({
      draftRows: [
        { id: 'd1', draft_status: 'ready_for_review', target_id: 't1', updated_at: '2026-05-20T00:00:00Z', missing_fields: [] },
        { id: 'd2', draft_status: 'incomplete',       target_id: 't2', updated_at: '2026-05-19T00:00:00Z', missing_fields: ['urgency'] },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.promotion_candidates).toBe(1);
    expect(result.signals.stale_signals).toBe(1);
  });

  it('outreach_approved_needs is 0 when no outreach_approved needs exist', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ need_type: 'active_public_need' })],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.outreach_approved_needs).toBe(0);
  });

  it('outreach_approved_needs counts only outreach_approved need_type', async () => {
    setupDbMocks({
      needRows: [
        makeNeedRow({ id: 'a', need_type: 'outreach_approved' }),
        makeNeedRow({ id: 'b', need_type: 'outreach_approved' }),
        makeNeedRow({ id: 'c', need_type: 'active_public_need' }),
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.outreach_approved_needs).toBe(2);
  });

  it('outreach_approved_needs excludes simulation_only needs', async () => {
    setupDbMocks({
      needRows: [
        makeNeedRow({ id: 'a', need_type: 'outreach_approved' }),
        makeNeedRow({ id: 'b', need_type: 'simulation_only' }),
      ],
    });
    const result = await buildCockpitSummary();
    // simulation_only is excluded from realNeeds, so only the outreach_approved one counts
    expect(result.signals.outreach_approved_needs).toBe(1);
  });

  it('outreach_approved_needs is present in GovernanceSignals shape', async () => {
    setupDbMocks({ needRows: [] });
    const result = await buildCockpitSummary();
    expect('outreach_approved_needs' in result.signals).toBe(true);
  });

  it('last_weekly_scan_at is null when no weekly scan events exist', async () => {
    setupDbMocks({ lastWeeklyScanRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.last_weekly_scan_at).toBeNull();
  });

  it('last_weekly_scan_at is the most recent weekly scan timestamp', async () => {
    setupDbMocks({ lastWeeklyScanRows: [{ created_at: '2026-05-19T04:00:00Z' }] });
    const result = await buildCockpitSummary();
    expect(result.signals.last_weekly_scan_at).toBe('2026-05-19T04:00:00Z');
  });

  it('daily_scan_overdue is true when no daily scan has ever run', async () => {
    setupDbMocks({ lastScanRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.daily_scan_overdue).toBe(true);
  });

  it('daily_scan_overdue is false when scan ran recently', async () => {
    const recentScan = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
    setupDbMocks({ lastScanRows: [{ created_at: recentScan }] });
    const result = await buildCockpitSummary();
    expect(result.signals.daily_scan_overdue).toBe(false);
  });

  it('weekly_scan_overdue is true when no weekly scan has ever run', async () => {
    setupDbMocks({ lastWeeklyScanRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.weekly_scan_overdue).toBe(true);
  });

  it('weekly_scan_overdue is false when weekly scan ran within 8 days', async () => {
    const recentWeekly = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days ago
    setupDbMocks({ lastWeeklyScanRows: [{ created_at: recentWeekly }] });
    const result = await buildCockpitSummary();
    expect(result.signals.weekly_scan_overdue).toBe(false);
  });

  it('agent_contact_mode defaults to suggest when env var not set', async () => {
    setupDbMocks({ needRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.agent_contact_mode).toBe('suggest');
  });

  it('sms_configured is false when SMS_API_KEY is not set', async () => {
    setupDbMocks({ needRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.sms_configured).toBe(false);
  });

  it('migration_016_applied is false when pilot select returns column-missing error', async () => {
    setupDbMocks({
      needRows: [],
      pilotError: { message: 'column pilot_company_relationships.do_not_contact_reason does not exist' },
    });
    const result = await buildCockpitSummary();
    expect(result.signals.migration_016_applied).toBe(false);
  });

  it('migration_016_applied is true when pilot select succeeds with no error', async () => {
    setupDbMocks({ needRows: [], pilotRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.migration_016_applied).toBe(true);
  });

  it('migration_017_applied is false when outreach_email_queue returns relation-does-not-exist error', async () => {
    setupDbMocks({
      needRows: [],
      outreachQueueError: { message: 'relation "public.outreach_email_queue" does not exist' },
    });
    const result = await buildCockpitSummary();
    expect(result.signals.migration_017_applied).toBe(false);
  });

  it('migration_017_applied is true when outreach_email_queue select returns no error', async () => {
    setupDbMocks({ needRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.migration_017_applied).toBe(true);
  });

  it('queue_batch1_followup_due is false when queue is empty', async () => {
    setupDbMocks({ needRows: [], outreachQueueRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.queue_batch1_followup_due).toBe(false);
  });

  it('queue_batch1_followup_due is false when batch-1 row has a reply', async () => {
    setupDbMocks({
      needRows: [],
      outreachQueueRows: [{
        status:           'sent',
        risk_notes:       'MANUAL_SMTP_BATCH_1 — Sent manually via Zoho 2026-05-26.',
        scheduled_send_at: new Date(Date.now() + 1000).toISOString(), // within 3 days
        reply_detected_at: '2026-05-29T10:00:00Z',                   // reply received
      }],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.queue_batch1_followup_due).toBe(false);
  });

  it('queue_batch1_followup_due is false when scheduled_send_at is more than 3 days away', async () => {
    setupDbMocks({
      needRows: [],
      outreachQueueRows: [{
        status:           'sent',
        risk_notes:       'MANUAL_SMTP_BATCH_1 — Sent manually via Zoho 2026-05-26.',
        scheduled_send_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days away
        reply_detected_at: null,
      }],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.queue_batch1_followup_due).toBe(false);
  });

  it('queue_batch1_followup_due is true when batch-1 sent row has upcoming follow-up and no reply', async () => {
    setupDbMocks({
      needRows: [],
      outreachQueueRows: [{
        status:           'sent',
        risk_notes:       'MANUAL_SMTP_BATCH_1 — Sent manually via Zoho 2026-05-26.',
        scheduled_send_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days away
        reply_detected_at: null,
      }],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.queue_batch1_followup_due).toBe(true);
  });

  it('queue_batch1_followup_due is false when row status is not sent', async () => {
    setupDbMocks({
      needRows: [],
      outreachQueueRows: [{
        status:           'draft',
        risk_notes:       'MANUAL_SMTP_BATCH_1 — should not trigger',
        scheduled_send_at: new Date(Date.now() + 1000).toISOString(),
        reply_detected_at: null,
      }],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.queue_batch1_followup_due).toBe(false);
  });
});

// ─── Active needs ─────────────────────────────────────────────────────────────

describe('buildCockpitSummary — active needs', () => {
  it('returns empty array when no real open needs', async () => {
    setupDbMocks({ needRows: [] });
    const result = await buildCockpitSummary();
    expect(result.active_needs).toHaveLength(0);
  });

  it('resolves company name from embedded companies join', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ id: 'n1', company_name: 'Enskede Bilexpress' })],
    });
    const result = await buildCockpitSummary();
    expect(result.active_needs[0].company_name).toBe('Enskede Bilexpress');
  });

  it('uses (unknown) when companies join is null', async () => {
    setupDbMocks({
      needRows: [{
        id: 'n1', need_type: 'active_public_need', license_required: 'CE',
        domain_required: 'distribution', location_region: 'stockholm', urgency: 'standard',
        companies: null,
      }],
    });
    const result = await buildCockpitSummary();
    expect(result.active_needs[0].company_name).toBe('(unknown)');
  });

  it('top_match_score is null when no shortlist entries', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ id: 'n1' })],
      shortlistRows: [],
    });
    const result = await buildCockpitSummary();
    expect(result.active_needs[0].top_match_score).toBeNull();
  });

  it('top_match_score is the highest score among shortlist entries', async () => {
    setupDbMocks({
      needRows:      [makeNeedRow({ id: 'n1' })],
      shortlistRows: [{ id: 'sl1', company_need_id: 'n1' }],
      entryRows: [
        { shortlist_id: 'sl1', driver_id: 'drv-a', match_score: 97 },
        { shortlist_id: 'sl1', driver_id: 'drv-b', match_score: 82 },
        { shortlist_id: 'sl1', driver_id: 'drv-c', match_score: 74 },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.active_needs[0].top_match_score).toBe(97);
  });

  it('shortlisted_count reflects number of shortlist entries', async () => {
    setupDbMocks({
      needRows:      [makeNeedRow({ id: 'n1' })],
      shortlistRows: [{ id: 'sl1', company_need_id: 'n1' }],
      entryRows: [
        { shortlist_id: 'sl1', driver_id: 'drv-a', match_score: 97 },
        { shortlist_id: 'sl1', driver_id: 'drv-b', match_score: 82 },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.active_needs[0].shortlisted_count).toBe(2);
  });

  it('clean_candidates excludes drivers with DQ or dup flags', async () => {
    setupDbMocks({
      needRows:      [makeNeedRow({ id: 'n1' })],
      dqActions:     [{ target_id: 'drv-dq' }],
      dupActions:    [{ input: { new_id: 'drv-dup', phone: '070', existing_id: 'drv-x' } }],
      shortlistRows: [{ id: 'sl1', company_need_id: 'n1' }],
      entryRows: [
        { shortlist_id: 'sl1', driver_id: 'drv-clean', match_score: 90 },
        { shortlist_id: 'sl1', driver_id: 'drv-dq',    match_score: 85 },
        { shortlist_id: 'sl1', driver_id: 'drv-dup',   match_score: 78 },
      ],
    });
    const result = await buildCockpitSummary();
    const need = result.active_needs[0];
    expect(need.clean_candidates).toBe(1);
    expect(need.blocked_candidates).toBe(2);
  });

  it('matching_eligible is true for active_public_need type', async () => {
    setupDbMocks({ needRows: [makeNeedRow({ need_type: 'active_public_need' })] });
    const result = await buildCockpitSummary();
    expect(result.active_needs[0].matching_eligible).toBe(true);
  });

  it('matching_eligible is false for outreach_approved type', async () => {
    setupDbMocks({ needRows: [makeNeedRow({ need_type: 'outreach_approved' })] });
    const result = await buildCockpitSummary();
    // outreach_approved is not in MATCHABLE_NEED_TYPES
    expect(result.active_needs[0].matching_eligible).toBe(false);
  });

  it('outreach_approved is false for active_public_need', async () => {
    setupDbMocks({ needRows: [makeNeedRow({ need_type: 'active_public_need' })] });
    const result = await buildCockpitSummary();
    expect(result.active_needs[0].outreach_approved).toBe(false);
  });

  it('outreach_approved is true for outreach_approved need_type', async () => {
    setupDbMocks({ needRows: [makeNeedRow({ need_type: 'outreach_approved' })] });
    const result = await buildCockpitSummary();
    expect(result.active_needs[0].outreach_approved).toBe(true);
  });
});

// ─── Market recommendations ───────────────────────────────────────────────────

describe('buildCockpitSummary — market recommendations', () => {
  const now = new Date().toISOString();
  const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago

  it('promotion_candidates contains only ready_for_review drafts', async () => {
    setupDbMocks({
      draftRows: [
        { id: 'd1', draft_status: 'ready_for_review', target_id: 't1', updated_at: now, missing_fields: [] },
        { id: 'd2', draft_status: 'incomplete',       target_id: 't2', updated_at: now, missing_fields: ['urgency'] },
        { id: 'd3', draft_status: 'rejected',         target_id: 't3', updated_at: now, missing_fields: [], rejection_reason: 'dup' },
      ],
      researchTargetRows: [
        { id: 't1', company_name: 'Beta AB' },
        { id: 't2', company_name: 'Gamma' },
        { id: 't3', company_name: 'Delta' },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.market.promotion_candidates).toHaveLength(1);
    expect(result.market.promotion_candidates[0].id).toBe('d1');
    expect(result.market.promotion_candidates[0].company_name).toBe('Beta AB');
  });

  it('recently_promoted only includes promoted drafts updated within last 7 days', async () => {
    setupDbMocks({
      draftRows: [
        { id: 'd1', draft_status: 'promoted', target_id: 't1', updated_at: now,     missing_fields: [] },
        { id: 'd2', draft_status: 'promoted', target_id: 't2', updated_at: oldDate, missing_fields: [] },
      ],
      researchTargetRows: [
        { id: 't1', company_name: 'Recent' },
        { id: 't2', company_name: 'Old' },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.market.recently_promoted).toHaveLength(1);
    expect(result.market.recently_promoted[0].company_name).toBe('Recent');
  });

  it('stale_drafts contains incomplete drafts', async () => {
    setupDbMocks({
      draftRows: [
        { id: 'd1', draft_status: 'incomplete', target_id: 't1', updated_at: now, missing_fields: ['urgency', 'domain_required'] },
      ],
      researchTargetRows: [{ id: 't1', company_name: 'Stale Co' }],
    });
    const result = await buildCockpitSummary();
    expect(result.market.stale_drafts).toHaveLength(1);
    expect(result.market.stale_drafts[0].missing_fields).toContain('urgency');
  });

  it('rejected_drafts contains rejected drafts with reason', async () => {
    setupDbMocks({
      draftRows: [
        { id: 'd1', draft_status: 'rejected', target_id: 't1', updated_at: now, missing_fields: [], rejection_reason: 'duplicate company' },
      ],
      researchTargetRows: [{ id: 't1', company_name: 'Reject Co' }],
    });
    const result = await buildCockpitSummary();
    expect(result.market.rejected_drafts).toHaveLength(1);
    expect(result.market.rejected_drafts[0].rejection_reason).toBe('duplicate company');
  });

  it('uses (unknown) company name when research target not found', async () => {
    setupDbMocks({
      draftRows: [
        { id: 'd1', draft_status: 'ready_for_review', target_id: 't-missing', updated_at: now, missing_fields: [] },
      ],
      researchTargetRows: [], // no matching target
    });
    const result = await buildCockpitSummary();
    expect(result.market.promotion_candidates[0].company_name).toBe('(unknown)');
  });
});

// ─── Route protection ─────────────────────────────────────────────────────────

describe('GET /api/admin/cockpit-summary — auth', () => {
  it('returns 401 without recruiter key', async () => {
    const { GET } = await import('../app/api/admin/cockpit-summary/route');
    const { NextRequest } = await import('next/server');
    // requireRecruiterAuth default mock returns 401
    const req = new NextRequest('http://localhost/api/admin/cockpit-summary', {
      headers: {},
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid recruiter key', async () => {
    setupDbMocks({ needRows: [makeNeedRow()] });
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({ ok: true } as never);
    const { GET }         = await import('../app/api/admin/cockpit-summary/route');
    const { NextRequest } = await import('next/server');
    const req = new NextRequest('http://localhost/api/admin/cockpit-summary', {
      headers: { 'x-recruiter-key': 'test-key' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('signals');
    expect(body).toHaveProperty('active_needs');
    expect(body).toHaveProperty('market');
  });
});

// ─── No SMS / no outreach ─────────────────────────────────────────────────────

describe('buildCockpitSummary — no external action side effects', () => {
  it('never includes action_type=contact_sent or follow_up_sent in output', async () => {
    setupDbMocks({
      needRows: [makeNeedRow()],
      dqActions: [{ target_id: 'drv-1' }],
      dupActions: [{ input: { new_id: 'drv-2', phone: '070', existing_id: 'drv-0' } }],
    });
    const result = await buildCockpitSummary();
    // The payload contains no fields that indicate SMS was sent
    const json = JSON.stringify(result);
    expect(json).not.toContain('contact_sent');
    expect(json).not.toContain('follow_up_sent');
    expect(json).not.toContain('sms_sent');
  });

  it('external_contact_blocked is always true in default state (no outreach_approved needs)', async () => {
    setupDbMocks({ needRows: [makeNeedRow({ need_type: 'active_public_need' })] });
    const result = await buildCockpitSummary();
    expect(result.signals.external_contact_blocked).toBe(true);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('buildCockpitSummary — edge cases', () => {
  it('handles empty database gracefully', async () => {
    setupDbMocks();
    const result = await buildCockpitSummary();
    expect(result.signals.real_open_needs).toBe(0);
    expect(result.active_needs).toHaveLength(0);
    expect(result.market.promotion_candidates).toHaveLength(0);
    expect(result.signals.dq_flagged_count).toBe(0);
    expect(result.signals.duplicate_flagged_count).toBe(0);
  });

  it('generated_at is a valid ISO timestamp', async () => {
    setupDbMocks();
    const result = await buildCockpitSummary();
    expect(() => new Date(result.generated_at)).not.toThrow();
    expect(isNaN(new Date(result.generated_at).getTime())).toBe(false);
  });

  it('multiple shortlists per need are all counted', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ id: 'n1' })],
      shortlistRows: [
        { id: 'sl1', company_need_id: 'n1' },
        { id: 'sl2', company_need_id: 'n1' },
      ],
      entryRows: [
        { shortlist_id: 'sl1', driver_id: 'drv-a', match_score: 90 },
        { shortlist_id: 'sl2', driver_id: 'drv-b', match_score: 70 },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.active_needs[0].shortlisted_count).toBe(2);
    expect(result.active_needs[0].top_match_score).toBe(90);
  });

  it('Enskede scenario: clean candidates surface, score 97', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ id: 'enskede', company_name: 'Enskede Bilexpress', domain_required: 'distribution' })],
      shortlistRows: [{ id: 'sl-e', company_need_id: 'enskede' }],
      entryRows: [
        { shortlist_id: 'sl-e', driver_id: 'samir-id', match_score: 97 },
        { shortlist_id: 'sl-e', driver_id: 'other-id', match_score: 74 },
      ],
      // no DQ, no dup flags
    });
    const result = await buildCockpitSummary();
    const need = result.active_needs[0];
    expect(need.company_name).toBe('Enskede Bilexpress');
    expect(need.top_match_score).toBe(97);
    expect(need.clean_candidates).toBe(2);
    expect(need.blocked_candidates).toBe(0);
  });

  it('Samuel Rajabi scenario: duplicate driver shows as blocked', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ id: 'jpc' })],
      dupActions: [
        { input: { new_id: 'rajabi-id', phone: '0733344130', existing_id: 'saman-id' } },
      ],
      shortlistRows: [{ id: 'sl-j', company_need_id: 'jpc' }],
      entryRows: [
        { shortlist_id: 'sl-j', driver_id: 'rajabi-id', match_score: 82 },
        { shortlist_id: 'sl-j', driver_id: 'clean-drv', match_score: 90 },
      ],
    });
    const result = await buildCockpitSummary();
    const need = result.active_needs[0];
    expect(need.clean_candidates).toBe(1);
    expect(need.blocked_candidates).toBe(1);
  });

  it('name=phone driver shows as DQ-blocked', async () => {
    setupDbMocks({
      needRows: [makeNeedRow({ id: 'n1' })],
      dqActions: [{ target_id: 'phone-name-driver' }],
      shortlistRows: [{ id: 'sl1', company_need_id: 'n1' }],
      entryRows: [
        { shortlist_id: 'sl1', driver_id: 'phone-name-driver', match_score: 75 },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.active_needs[0].blocked_candidates).toBe(1);
    expect(result.active_needs[0].clean_candidates).toBe(0);
  });
});

// ─── Pilot company signals ────────────────────────────────────────────────────

describe('buildCockpitSummary — pilot_companies_active', () => {
  it('is 0 when no pilot rows exist', async () => {
    setupDbMocks({ pilotRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.pilot_companies_active).toBe(0);
  });

  it('counts non-terminal statuses as active', async () => {
    setupDbMocks({
      pilotRows: [
        { relationship_status: 'researched',      next_action_date: null },
        { relationship_status: 'outreach_ready',  next_action_date: null },
        { relationship_status: 'contacted',       next_action_date: null },
        { relationship_status: 'replied',         next_action_date: null },
        { relationship_status: 'call_booked',     next_action_date: null },
        { relationship_status: 'needs_collected', next_action_date: null },
        { relationship_status: 'pilot_agreed',    next_action_date: null },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.pilot_companies_active).toBe(7);
  });

  it('excludes terminal statuses: pilot_lost, pilot_completed, do_not_contact, nurture_later', async () => {
    setupDbMocks({
      pilotRows: [
        { relationship_status: 'pilot_lost',      next_action_date: null },
        { relationship_status: 'pilot_completed', next_action_date: null },
        { relationship_status: 'do_not_contact',  next_action_date: null },
        { relationship_status: 'nurture_later',   next_action_date: null },
        { relationship_status: 'contacted',       next_action_date: null }, // active
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.pilot_companies_active).toBe(1);
  });

  it('is 0 when all rows are terminal', async () => {
    setupDbMocks({
      pilotRows: [
        { relationship_status: 'pilot_lost',      next_action_date: null },
        { relationship_status: 'pilot_completed', next_action_date: null },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.pilot_companies_active).toBe(0);
  });
});

describe('buildCockpitSummary — pilot_followup_overdue', () => {
  const pastDate   = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ahead

  it('is 0 when no pilot rows exist', async () => {
    setupDbMocks({ pilotRows: [] });
    const result = await buildCockpitSummary();
    expect(result.signals.pilot_followup_overdue).toBe(0);
  });

  it('counts contacted rows with next_action_date in the past', async () => {
    setupDbMocks({
      pilotRows: [
        { relationship_status: 'contacted', next_action_date: pastDate },
        { relationship_status: 'contacted', next_action_date: pastDate },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.pilot_followup_overdue).toBe(2);
  });

  it('does not count contacted rows with future next_action_date', async () => {
    setupDbMocks({
      pilotRows: [
        { relationship_status: 'contacted', next_action_date: futureDate },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.pilot_followup_overdue).toBe(0);
  });

  it('does not count contacted rows with null next_action_date', async () => {
    setupDbMocks({
      pilotRows: [
        { relationship_status: 'contacted', next_action_date: null },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.pilot_followup_overdue).toBe(0);
  });

  it('does not count non-contacted rows even with past next_action_date', async () => {
    setupDbMocks({
      pilotRows: [
        { relationship_status: 'replied',   next_action_date: pastDate },
        { relationship_status: 'researched', next_action_date: pastDate },
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.pilot_followup_overdue).toBe(0);
  });

  it('mixed rows: only overdue contacted rows are counted', async () => {
    setupDbMocks({
      pilotRows: [
        { relationship_status: 'contacted',  next_action_date: pastDate   }, // overdue ✓
        { relationship_status: 'contacted',  next_action_date: futureDate }, // not yet
        { relationship_status: 'contacted',  next_action_date: null       }, // no date
        { relationship_status: 'replied',    next_action_date: pastDate   }, // wrong status
        { relationship_status: 'pilot_lost', next_action_date: pastDate   }, // terminal
      ],
    });
    const result = await buildCockpitSummary();
    expect(result.signals.pilot_followup_overdue).toBe(1);
  });

  it('both signals are present in GovernanceSignals shape', async () => {
    setupDbMocks({ pilotRows: [] });
    const result = await buildCockpitSummary();
    expect('pilot_companies_active' in result.signals).toBe(true);
    expect('pilot_followup_overdue' in result.signals).toBe(true);
  });
});
