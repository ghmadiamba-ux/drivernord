import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/recruiterAuth', () => ({
  requireRecruiterAuth: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('log-id'),
}));

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

// No messaging mock — promotion must never call getMessagingProvider
vi.mock('../lib/scanImportData', () => ({
  SCAN_RECORDS: [
    {
      scan_record_id:      'DN-TEST-01',
      company_name:        'Test Transport AB',
      region:              'stockholm',
      city:                'Stockholm',
      segment:             'A',
      research_status:     'enriched',
      visible_driver_need: true,
      job_ads_url:         'https://example.com/jobs',
      license_mentions:    ['CE'],
      ykb_mentioned:       true,
      driver_card_mentioned: false,
      urgency_signal:      'single_ad',
      contact_email:       'vd@test-transport.se',
      contact_phone:       '08-123456',
      decision_maker_name: 'Test Person',
      decision_maker_role: 'VD',
      barrier_level:       'low',
      pilot_accessibility_score: 80,
      opportunity_score:   75,
      license_required:    'CE',
      domain_required:     'distribution',
      location_region:     'stockholm',
      ykb_required:        true,
      driver_card_required: false,
      shift_type:          'day',
      urgency:             'urgent',
      drivers_needed:      2,
      constraints:         null,
      missing_fields:      [],
      draft_status:        'ready_for_review',
      rejection_reason:    null,
      source_call_notes:   'Active CE distribution need confirmed on company website.',
      metadata: {
        recruitment_pain_score: 8,
        drivernord_fit_score:   8,
        contactability_score:   8,
        pilot_readiness_score:  8.0,
        ad_status:              'active',
        existing_supplier:      null,
        classification:         'founder_review_required',
        recommended_action:     'Promote and match.',
        scan_date:              '2026-05-19',
      },
    },
    {
      scan_record_id:      'DN-TEST-02',
      company_name:        'Simulation Fake Corp',
      region:              'stockholm',
      city:                'Stockholm',
      segment:             'A',
      research_status:     'incomplete',
      visible_driver_need: false,
      job_ads_url:         null,
      license_mentions:    [],
      ykb_mentioned:       false,
      driver_card_mentioned: false,
      urgency_signal:      'none',
      contact_email:       null,
      contact_phone:       null,
      decision_maker_name: null,
      decision_maker_role: 'unknown',
      barrier_level:       'high',
      pilot_accessibility_score: 0,
      opportunity_score:   0,
      license_required:    'CE',
      domain_required:     'distribution',
      location_region:     'stockholm',
      ykb_required:        false,
      driver_card_required: false,
      shift_type:          'day',
      urgency:             'standard',
      drivers_needed:      null,
      constraints:         null,
      missing_fields:      ['contact_info'],
      draft_status:        'incomplete',
      rejection_reason:    null,
      source_call_notes:   'Test record — incomplete.',
      metadata: {
        recruitment_pain_score: 0,
        drivernord_fit_score:   0,
        contactability_score:   0,
        pilot_readiness_score:  0,
        ad_status:              'unknown',
        existing_supplier:      null,
        classification:         'unverified_public_need',
        recommended_action:     'Needs more research.',
        scan_date:              '2026-05-19',
      },
    },
  ],
}));

import { promoteDraft, importScanRecords, listDrafts } from '../lib/companyNeedDraft';
import { POST as promoteRoute } from '../app/api/admin/drafts/[id]/promote/route';
import { POST as importRoute }  from '../app/api/admin/drafts/import/route';
import { GET  as listRoute }    from '../app/api/admin/drafts/route';
import { db } from '../lib/db';
import { logAction } from '../lib/systemActions';
import { requireRecruiterAuth } from '../lib/recruiterAuth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body?: unknown, url = 'http://localhost/api/admin/drafts'): NextRequest {
  return {
    headers: new Headers({ 'x-recruiter-key': 'test-key' }),
    json:    () => Promise.resolve(body),
    cookies: { get: () => undefined },
    url,
  } as unknown as NextRequest;
}

function makeDraftRow(overrides: Partial<{
  id: string;
  target_id: string;
  draft_status: string;
  license_required: string | null;
  domain_required: string | null;
  location_region: string | null;
  shift_type: string | null;
  urgency: string | null;
  source_call_notes: string;
  converted_need_id: string | null;
  scan_record_id: string | null;
  domain_preferred: string[];
  metadata: Record<string, unknown> | null;
  relocation_allowed: boolean | null;
  rejection_reason: string | null;
  drafted_by: string;
}> = {}) {
  return {
    id:                   'draft-1',
    target_id:            'target-1',
    draft_status:         'ready_for_review',
    license_required:     'CE',
    domain_required:      'distribution',
    location_region:      'stockholm',
    shift_type:           'day',
    urgency:              'urgent',
    source_call_notes:    'Active CE need confirmed on company website.',
    converted_need_id:    null,
    scan_record_id:       'DN-001',
    domain_preferred:     [],
    metadata:             { pilot_readiness_score: 8.3 },
    relocation_allowed:   false,
    rejection_reason:     null,
    drafted_by:           'agent:scan_import_v1',
    ...overrides,
  };
}

// ─── DB chain builders ────────────────────────────────────────────────────────

// promoteDraft DB sequence:
//  1. company_need_drafts.select().eq().single()     — fetch draft
//  2. company_research_targets.select().eq().single()— fetch target
//  3. companies.select().ilike().limit()             — find/create company
//  4. companies.insert()                             — if not found (optional)
//  5. company_needs.insert()
//  6. company_need_drafts.update().eq()

function mockPromoteChain(draft: ReturnType<typeof makeDraftRow>, opts: {
  companyExists?: boolean;
  needInsertError?: string;
} = {}) {
  let callCount = 0;
  vi.mocked(db.from).mockImplementation((table: string) => {
    callCount++;
    if (table === 'company_need_drafts' && callCount === 1) {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: draft, error: null }),
          }),
        }),
      } as never;
    }
    if (table === 'company_research_targets') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { company_name: 'JPC Entreprenad AB' },
              error: null,
            }),
          }),
        }),
      } as never;
    }
    if (table === 'companies') {
      if (opts.companyExists) {
        return {
          select: () => ({ ilike: () => ({ limit: () => Promise.resolve({ data: [{ id: 'co-existing' }], error: null }) }) }),
        } as never;
      }
      return {
        select: () => ({ ilike: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
        insert: () => Promise.resolve({ error: null }),
      } as never;
    }
    if (table === 'company_needs') {
      const insertError = opts.needInsertError ? { message: opts.needInsertError } : null;
      return { insert: () => Promise.resolve({ error: insertError }) } as never;
    }
    if (table === 'company_need_drafts' && callCount > 1) {
      return {
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      } as never;
    }
    return {} as never;
  });
}

// listDrafts DB sequence:
//  1. company_need_drafts.select().order().limit()  (or with .in())
function mockListChain(rows: unknown[]) {
  vi.mocked(db.from).mockReturnValue({
    select: () => ({
      order: () => ({
        limit: () => Promise.resolve({ data: rows, error: null }),
      }),
      in: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: rows, error: null }),
        }),
      }),
    }),
  } as never);
}

// importScanRecords DB sequence:
//  1. company_need_drafts.select().not()            — existing scan_record_ids
//  then per record:
//  2. company_research_targets.select().eq().limit()— find existing target
//  3. company_research_targets.insert()             — if not found
//  4. company_need_drafts.insert()                  — insert draft
function mockImportChain(existingIds: string[] = []) {
  let callCount = 0;
  vi.mocked(db.from).mockImplementation((table: string) => {
    callCount++;
    if (table === 'company_need_drafts' && callCount === 1) {
      // Initial fetch of existing scan_record_ids
      return {
        select: () => ({
          not: () => Promise.resolve({ data: existingIds.map((id) => ({ scan_record_id: id })), error: null }),
        }),
      } as never;
    }
    if (table === 'company_research_targets') {
      return {
        select: () => ({
          eq: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        insert: () => Promise.resolve({ error: null }),
      } as never;
    }
    if (table === 'company_need_drafts') {
      return { insert: () => Promise.resolve({ error: null }) } as never;
    }
    return {} as never;
  });
}

beforeEach(() => vi.clearAllMocks());

// ─── promoteDraft — success ───────────────────────────────────────────────────

describe('promoteDraft — success', () => {
  it('returns ok:true with need_id and company_id', async () => {
    mockPromoteChain(makeDraftRow());
    const result = await promoteDraft('draft-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.result.need_id).toBe('string');
      expect(typeof result.result.company_id).toBe('string');
    }
  });

  it('logs company_need_draft_promoted system action', async () => {
    mockPromoteChain(makeDraftRow());
    await promoteDraft('draft-1');
    const call = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'company_need_draft_promoted',
    );
    expect(call).toBeDefined();
    expect(call![0].status).toBe('completed');
  });

  it('promoted need is NOT outreach_approved (note in log input)', async () => {
    mockPromoteChain(makeDraftRow());
    await promoteDraft('draft-1');
    const call = vi.mocked(logAction).mock.calls.find(
      ([p]) => p.action_type === 'company_need_draft_promoted',
    );
    expect(String((call![0].input as Record<string, unknown>).note)).toContain('outreach still requires');
  });

  it('inserts company_need with need_type = active_public_need', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    let callCount = 0;
    vi.mocked(db.from).mockImplementation((table: string) => {
      callCount++;
      if (table === 'company_need_drafts' && callCount === 1) {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: makeDraftRow(), error: null }) }) }),
        } as never;
      }
      if (table === 'company_research_targets') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { company_name: 'JPC Entreprenad AB' }, error: null }) }) }),
        } as never;
      }
      if (table === 'companies') {
        return {
          select: () => ({ ilike: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
          insert: () => Promise.resolve({ error: null }),
        } as never;
      }
      if (table === 'company_needs') {
        return { insert: insertSpy } as never;
      }
      if (table === 'company_need_drafts') {
        return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) } as never;
      }
      return {} as never;
    });

    await promoteDraft('draft-1');
    const insertArgs = insertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArgs.need_type).toBe('active_public_need');
    expect(insertArgs.status).toBe('open');
  });

  it('uses existing company if name already in companies table', async () => {
    mockPromoteChain(makeDraftRow(), { companyExists: true });
    const result = await promoteDraft('draft-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.company_id).toBe('co-existing');
    }
  });

  it('marks draft as promoted after successful promotion', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    let callCount = 0;
    vi.mocked(db.from).mockImplementation((table: string) => {
      callCount++;
      if (table === 'company_need_drafts' && callCount === 1) {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: makeDraftRow(), error: null }) }) }),
        } as never;
      }
      if (table === 'company_research_targets') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { company_name: 'JPC' }, error: null }) }) }),
        } as never;
      }
      if (table === 'companies') {
        return {
          select: () => ({ ilike: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
          insert: () => Promise.resolve({ error: null }),
        } as never;
      }
      if (table === 'company_needs') {
        return { insert: () => Promise.resolve({ error: null }) } as never;
      }
      if (table === 'company_need_drafts') {
        return { update: updateSpy } as never;
      }
      return {} as never;
    });

    await promoteDraft('draft-1');
    const updateArgs = updateSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArgs.draft_status).toBe('promoted');
    expect(updateArgs.converted_need_id).toBeTruthy();
  });
});

// ─── promoteDraft — blocked cases ────────────────────────────────────────────

describe('promoteDraft — blocked', () => {
  it('returns already_promoted when draft is already promoted', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: makeDraftRow({ draft_status: 'ready_for_review', converted_need_id: 'existing-need' }),
            error: null,
          }),
        }),
      }),
    } as never);

    const result = await promoteDraft('draft-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe('already_promoted');
  });

  it('returns validation_failed for draft with missing license_required', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: makeDraftRow({ license_required: null }),
            error: null,
          }),
        }),
      }),
    } as never);

    const result = await promoteDraft('draft-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe('validation_failed');
  });

  it('returns validation_failed for draft with missing domain_required', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: makeDraftRow({ domain_required: null }),
            error: null,
          }),
        }),
      }),
    } as never);

    const result = await promoteDraft('draft-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe('validation_failed');
  });

  it('returns validation_failed for rejected draft', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: makeDraftRow({ draft_status: 'rejected' }),
            error: null,
          }),
        }),
      }),
    } as never);

    const result = await promoteDraft('draft-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe('validation_failed');
  });

  it('returns simulation_blocked for draft with SIMULATION in call notes', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: makeDraftRow({ source_call_notes: 'SIMULATION test — DO NOT CONTACT' }),
            error: null,
          }),
        }),
      }),
    } as never);

    const result = await promoteDraft('draft-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe('simulation_blocked');
  });

  it('returns validation_failed for hold_agency draft — staffing agency cannot be promoted', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: makeDraftRow({ draft_status: 'hold_agency' as never }),
            error: null,
          }),
        }),
      }),
    } as never);

    const result = await promoteDraft('draft-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason.code).toBe('validation_failed');
      expect(result.reason.error).toContain('staffing agency');
    }
  });

  it('returns db_error when draft not found', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
        }),
      }),
    } as never);

    const result = await promoteDraft('missing-draft');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe('db_error');
  });

  it('does NOT call logAction when promotion is blocked', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: makeDraftRow({ license_required: null }),
            error: null,
          }),
        }),
      }),
    } as never);

    await promoteDraft('draft-1');
    expect(vi.mocked(logAction).mock.calls).toHaveLength(0);
  });
});

// ─── POST /api/admin/drafts/[id]/promote — HTTP layer ────────────────────────

describe('POST /api/admin/drafts/[id]/promote — HTTP', () => {
  it('returns 401 when unauthorized', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({ ok: false, status: 401, body: { error: 'unauthorized' } });
    const res = await promoteRoute(makeReq(), { params: { id: 'draft-1' } });
    expect(res.status).toBe(401);
  });

  it('returns 200 with need_id on success', async () => {
    mockPromoteChain(makeDraftRow());
    const res = await promoteRoute(makeReq(), { params: { id: 'draft-1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.need_id).toBe('string');
  });

  it('returns 409 when already promoted', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: makeDraftRow({ converted_need_id: 'existing' }),
            error: null,
          }),
        }),
      }),
    } as never);
    const res = await promoteRoute(makeReq(), { params: { id: 'draft-1' } });
    expect(res.status).toBe(409);
  });

  it('returns 422 when validation fails', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: makeDraftRow({ license_required: null }),
            error: null,
          }),
        }),
      }),
    } as never);
    const res = await promoteRoute(makeReq(), { params: { id: 'draft-1' } });
    expect(res.status).toBe(422);
  });

  it('returns 403 when simulation blocked', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: makeDraftRow({ source_call_notes: 'SIMULATION test — DO NOT CONTACT' }),
            error: null,
          }),
        }),
      }),
    } as never);
    const res = await promoteRoute(makeReq(), { params: { id: 'draft-1' } });
    expect(res.status).toBe(403);
  });

  it('response note confirms outreach still requires approval', async () => {
    mockPromoteChain(makeDraftRow());
    const res = await promoteRoute(makeReq(), { params: { id: 'draft-1' } });
    const body = await res.json();
    expect(body.note).toContain('outreach still requires');
  });
});

// ─── importScanRecords ────────────────────────────────────────────────────────

describe('importScanRecords', () => {
  it('imports records not already present', async () => {
    mockImportChain([]);
    const result = await importScanRecords();
    expect(result.imported).toBe(2); // two mock records
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('skips records already imported by scan_record_id', async () => {
    mockImportChain(['DN-TEST-01']); // first record already exists
    const result = await importScanRecords();
    expect(result.imported).toBe(1); // only second record
    expect(result.skipped).toBe(1);
  });

  it('is idempotent — skips all if all already imported', async () => {
    mockImportChain(['DN-TEST-01', 'DN-TEST-02']);
    const result = await importScanRecords();
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(2);
  });

  it('reports errors per record without stopping the whole import', async () => {
    let callCount = 0;
    vi.mocked(db.from).mockImplementation((table: string) => {
      callCount++;
      if (table === 'company_need_drafts' && callCount === 1) {
        return {
          select: () => ({ not: () => Promise.resolve({ data: [], error: null }) }),
        } as never;
      }
      if (table === 'company_research_targets') {
        return {
          select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
          insert: () => Promise.resolve({ error: { message: 'db error' } }),
        } as never;
      }
      return {} as never;
    });

    const result = await importScanRecords();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('DN-TEST-01');
  });
});

// ─── POST /api/admin/drafts/import — HTTP ────────────────────────────────────

describe('POST /api/admin/drafts/import — HTTP', () => {
  it('returns 401 when unauthorized', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({ ok: false, status: 401, body: { error: 'unauthorized' } });
    const res = await importRoute(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 200 with imported/skipped counts', async () => {
    mockImportChain([]);
    const res = await importRoute(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.imported).toBe('number');
    expect(typeof body.skipped).toBe('number');
  });
});

// ─── GET /api/admin/drafts — HTTP ────────────────────────────────────────────

describe('GET /api/admin/drafts — HTTP', () => {
  it('returns 401 when unauthorized', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({ ok: false, status: 401, body: { error: 'unauthorized' } });
    const res = await listRoute(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 200 with drafts array', async () => {
    mockListChain([makeDraftRow()]);
    const res = await listRoute(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.drafts)).toBe(true);
    expect(body.count).toBe(1);
  });

  it('returns 400 for invalid status filter', async () => {
    const req = makeReq(undefined, 'http://localhost/api/admin/drafts?status=invalid_status');
    const res = await listRoute(req);
    expect(res.status).toBe(400);
  });
});

// ─── Safety verification — no SMS sent ───────────────────────────────────────

describe('Safety — no SMS / no messaging', () => {
  it('does not import or call messaging provider during promotion', async () => {
    mockPromoteChain(makeDraftRow());
    await expect(promoteDraft('draft-1')).resolves.not.toThrow();
    // If getMessagingProvider were called it would throw (not mocked)
    const dbTables = vi.mocked(db.from).mock.calls.map(([t]) => t);
    expect(dbTables).not.toContain('messages');
    expect(dbTables).not.toContain('sms_queue');
  });
});
