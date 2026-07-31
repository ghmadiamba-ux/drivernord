import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OperationalIntelligencePayload } from '../app/api/admin/operational-intelligence/route';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

vi.mock('../lib/warnings', () => ({
  getSystemWarnings: vi.fn(),
}));

vi.mock('../lib/companyNeedDraft', () => ({
  listDrafts: vi.fn(),
}));

import { GET } from '../app/api/admin/operational-intelligence/route';
import { db } from '../lib/db';
import { getSystemWarnings } from '../lib/warnings';
import { listDrafts } from '../lib/companyNeedDraft';
import type { CompanyNeedDraftRow } from '../lib/companyNeedDraft';
import { NextRequest } from 'next/server';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const RECRUITER_KEY = 'test-key-abc';

function makeRequest(key = RECRUITER_KEY): NextRequest {
  return new NextRequest('http://localhost/api/admin/operational-intelligence', {
    headers: { 'x-recruiter-key': key },
  });
}

// Pattern A: .select().gte()  — used for drivers, ingested_drivers, system_actions (first call)
function makeSelectGte(result: unknown) {
  return { select: () => ({ gte: () => Promise.resolve(result) }) };
}

// Pattern B: .select().eq().eq()  — used for the pending contact_suggested count
function makeSelectEqEq(result: unknown) {
  return { select: () => ({ eq: () => ({ eq: () => Promise.resolve(result) }) }) };
}

// Pattern C: .select()  — used for company_needs (terminating select)
function makeSelect(result: unknown) {
  return { select: () => Promise.resolve(result) };
}

// Pattern D: .select().eq()  — used for all-time contact_governance counts (DQ, dup)
function makeSelectEq(result: unknown) {
  return { select: () => ({ eq: () => Promise.resolve(result) }) };
}

const DEFAULT_COMPANY_NEED = { id: 'cn-default', status: 'open', need_type: 'active_public_need' };

function setupDbMocks({
  drivers = [] as Record<string, unknown>[],
  ingested = [] as Record<string, unknown>[],
  systemActions = [] as Record<string, unknown>[],
  pendingCount = 0,
  companyNeeds = [DEFAULT_COMPANY_NEED] as Record<string, unknown>[],
  drafts = [] as CompanyNeedDraftRow[],
  dqFlaggedCount = 0,
  dupFlaggedCount = 0,
} = {}) {
  let saCount = 0;

  vi.mocked(db.from).mockImplementation((table: string) => {
    if (table === 'drivers') {
      return makeSelectGte({ data: drivers, error: null }) as never;
    }
    if (table === 'ingested_drivers') {
      return makeSelectGte({ data: ingested, error: null }) as never;
    }
    if (table === 'system_actions') {
      saCount += 1;
      if (saCount === 1) return makeSelectGte({ data: systemActions, error: null })             as never;
      if (saCount === 2) return makeSelectEqEq({ count: pendingCount,    error: null })         as never;
      if (saCount === 3) return makeSelectEq  ({ count: dqFlaggedCount,  error: null })         as never;
      return              makeSelectEq  ({ count: dupFlaggedCount, error: null })                as never;
    }
    if (table === 'company_needs') {
      return makeSelect({ data: companyNeeds, error: null }) as never;
    }
    return makeSelectGte({ data: [], error: null }) as never;
  });

  // listDrafts() is now used instead of db.from('company_need_drafts') directly
  vi.mocked(listDrafts).mockResolvedValue(drafts);
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe('GET /api/admin/operational-intelligence — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RECRUITER_API_KEY', RECRUITER_KEY);
    vi.mocked(getSystemWarnings).mockResolvedValue([]);
    setupDbMocks();
  });

  it('rejects missing key with 401', async () => {
    const req = new NextRequest('http://localhost/api/admin/operational-intelligence');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('rejects wrong key with 401', async () => {
    const req = makeRequest('wrong-key');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('accepts correct key with 200', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });
});

// ─── Payload shape tests ──────────────────────────────────────────────────────

describe('GET /api/admin/operational-intelligence — payload shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RECRUITER_API_KEY', RECRUITER_KEY);
    vi.mocked(getSystemWarnings).mockResolvedValue([]);
    setupDbMocks();
  });

  it('returns all required top-level fields', async () => {
    const body = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;

    expect(body).toHaveProperty('generated_at');
    expect(body).toHaveProperty('window_hours', 24);
    expect(body).toHaveProperty('funnel');
    expect(body).toHaveProperty('ingested_drivers');
    expect(body).toHaveProperty('high_priority_leads');
    expect(body).toHaveProperty('needs_founder_review');
    expect(body).toHaveProperty('data_quality_warnings');
    expect(body).toHaveProperty('duplicate_warnings');
    expect(body).toHaveProperty('pending_contact_suggested');
    expect(body).toHaveProperty('campaign_breakdown');
    expect(body).toHaveProperty('top_regions');
    expect(body).toHaveProperty('top_licenses');
    expect(body).toHaveProperty('top_domains');
    expect(body).toHaveProperty('ingestion_timeline');
    expect(body).toHaveProperty('system_warnings');
    expect(body).toHaveProperty('sms_safe');
    expect(body).toHaveProperty('matching_blocked');
    expect(body).toHaveProperty('urgent_actions');
  });

  it('funnel is zero when no drivers', async () => {
    const { funnel } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(funnel.total_sessions).toBe(0);
    expect(funnel.completed).toBe(0);
    expect(funnel.completion_rate_pct).toBe(0);
  });

  it('ingested_drivers has contactable field', async () => {
    const { ingested_drivers } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(ingested_drivers).toHaveProperty('contactable');
  });

  it('generated_at is a valid ISO timestamp', async () => {
    const { generated_at } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(() => new Date(generated_at).toISOString()).not.toThrow();
  });
});

// ─── Funnel calculation tests ─────────────────────────────────────────────────

describe('GET /api/admin/operational-intelligence — funnel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RECRUITER_API_KEY', RECRUITER_KEY);
    vi.mocked(getSystemWarnings).mockResolvedValue([]);
  });

  it('counts completed leads and calculates completion_rate_pct', async () => {
    setupDbMocks({
      drivers: [
        { id: '1', lead_status: 'ready_for_ingestion', license: 'CE', region: 'stockholm', utm_campaign: null, utm_source: null, utm_content: null },
        { id: '2', lead_status: 'ready_for_ingestion', license: 'C',  region: 'malmö',     utm_campaign: null, utm_source: null, utm_content: null },
        { id: '3', lead_status: 'incomplete_lead',     license: 'B',  region: 'göteborg',  utm_campaign: null, utm_source: null, utm_content: null },
        { id: '4', lead_status: 'anonymous_dropoff',   license: null, region: null,        utm_campaign: null, utm_source: null, utm_content: null },
      ],
    });

    const { funnel } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;

    expect(funnel.total_sessions).toBe(4);
    expect(funnel.completed).toBe(2);
    expect(funnel.incomplete).toBe(1);
    expect(funnel.anonymous_dropoff).toBe(1);
    expect(funnel.completion_rate_pct).toBe(50);
  });
});

// ─── Ingested driver counts ───────────────────────────────────────────────────

describe('GET /api/admin/operational-intelligence — ingested_drivers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RECRUITER_API_KEY', RECRUITER_KEY);
    vi.mocked(getSystemWarnings).mockResolvedValue([]);
  });

  it('counts HIGH/MEDIUM/LOW and populates high_priority_leads', async () => {
    setupDbMocks({
      ingested: [
        { id: 'a', priority: 'HIGH',   license: 'CE', region: 'stockholm', availability: 'now',   domain: null, first_name: 'Erik', phone: '+46701111111', ingested_at: new Date().toISOString() },
        { id: 'b', priority: 'HIGH',   license: 'C',  region: 'malmö',     availability: 'week',  domain: null, first_name: 'Lars', phone: '+46702222222', ingested_at: new Date().toISOString() },
        { id: 'c', priority: 'MEDIUM', license: 'B',  region: 'göteborg',  availability: 'month', domain: null, first_name: 'Anna', phone: '+46703333333', ingested_at: new Date().toISOString() },
      ],
    });

    const body = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;

    expect(body.ingested_drivers.total).toBe(3);
    expect(body.ingested_drivers.high).toBe(2);
    expect(body.ingested_drivers.medium).toBe(1);
    expect(body.ingested_drivers.low).toBe(0);
    expect(body.high_priority_leads).toHaveLength(2);
  });

  it('contactable excludes drivers with data quality issues', async () => {
    const now = new Date().toISOString();
    setupDbMocks({
      ingested: [
        { id: 'a', priority: 'HIGH',   license: 'CE', region: 'stockholm', availability: 'now', domain: null, first_name: 'Erik', phone: '+46701111111', ingested_at: now },
        { id: 'b', priority: 'MEDIUM', license: 'C',  region: 'malmö',     availability: 'now', domain: null, first_name: 'Lars', phone: '+46702222222', ingested_at: now },
      ],
      systemActions: [
        { action_type: 'data_quality_issue', target_id: 'a', input: { issues: ['name_is_phone_number'], first_name: '+46701111111', phone: '+46701111111' } },
      ],
    });

    const body = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    // 'a' has quality issue → only 'b' is contactable
    expect(body.ingested_drivers.contactable).toBe(1);
  });
});

// ─── Top domains ─────────────────────────────────────────────────────────────

describe('GET /api/admin/operational-intelligence — top_domains', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RECRUITER_API_KEY', RECRUITER_KEY);
    vi.mocked(getSystemWarnings).mockResolvedValue([]);
  });

  it('counts domains from ingested drivers', async () => {
    const now = new Date().toISOString();
    setupDbMocks({
      ingested: [
        { id: 'a', priority: 'HIGH', license: 'CE', region: 'stockholm', availability: 'now', domain: 'distribution', first_name: 'Erik', phone: '+46701111111', ingested_at: now },
        { id: 'b', priority: 'HIGH', license: 'CE', region: 'malmö',     availability: 'now', domain: 'distribution', first_name: 'Lars', phone: '+46702222222', ingested_at: now },
        { id: 'c', priority: 'LOW',  license: 'C',  region: 'stockholm', availability: 'now', domain: 'schakt_bygg',  first_name: 'Anna', phone: '+46703333333', ingested_at: now },
      ],
    });

    const { top_domains } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(top_domains[0].domain).toBe('distribution');
    expect(top_domains[0].count).toBe(2);
  });
});

// ─── Ingestion timeline ───────────────────────────────────────────────────────

describe('GET /api/admin/operational-intelligence — ingestion_timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RECRUITER_API_KEY', RECRUITER_KEY);
    vi.mocked(getSystemWarnings).mockResolvedValue([]);
  });

  it('buckets ingested drivers by hour', async () => {
    setupDbMocks({
      ingested: [
        { id: 'a', priority: 'HIGH', license: 'CE', region: 'stockholm', availability: 'now', domain: null, first_name: 'Erik', phone: '+46701111111', ingested_at: '2026-05-19T10:15:00Z' },
        { id: 'b', priority: 'HIGH', license: 'CE', region: 'malmö',     availability: 'now', domain: null, first_name: 'Lars', phone: '+46702222222', ingested_at: '2026-05-19T10:45:00Z' },
        { id: 'c', priority: 'LOW',  license: 'C',  region: 'stockholm', availability: 'now', domain: null, first_name: 'Anna', phone: '+46703333333', ingested_at: '2026-05-19T11:05:00Z' },
      ],
    });

    const { ingestion_timeline } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(ingestion_timeline).toHaveLength(2);
    const hour10 = ingestion_timeline.find((h) => h.hour.includes('T10'));
    expect(hour10?.count).toBe(2);
  });
});

// ─── needs_founder_review ─────────────────────────────────────────────────────

describe('GET /api/admin/operational-intelligence — needs_founder_review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RECRUITER_API_KEY', RECRUITER_KEY);
    vi.mocked(getSystemWarnings).mockResolvedValue([]);
  });

  it('flags HIGH priority drivers with data quality issues', async () => {
    const now = new Date().toISOString();
    setupDbMocks({
      ingested: [
        { id: 'a', priority: 'HIGH', license: 'CE', region: 'stockholm', availability: 'now', domain: null, first_name: '+46701111111', phone: '+46701111111', ingested_at: now },
        { id: 'b', priority: 'HIGH', license: 'CE', region: 'malmö',     availability: 'now', domain: null, first_name: 'Lars',         phone: '+46702222222', ingested_at: now },
      ],
      systemActions: [
        { action_type: 'data_quality_issue', target_id: 'a', input: { issues: ['name_is_phone_number'], first_name: '+46701111111', phone: '+46701111111' } },
      ],
    });

    const body = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;

    expect(body.needs_founder_review).toHaveLength(1);
    expect(body.needs_founder_review[0].id).toBe('a');
    expect(body.needs_founder_review[0].has_quality_issue).toBe(true);
    // 'b' is clean — appears in high_priority_leads but not needs_founder_review
    const bInReview = body.needs_founder_review.find((l) => l.id === 'b');
    expect(bInReview).toBeUndefined();
  });
});

// ─── matching_blocked ─────────────────────────────────────────────────────────

describe('GET /api/admin/operational-intelligence — matching_blocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RECRUITER_API_KEY', RECRUITER_KEY);
    setupDbMocks();
  });

  it('matching_blocked is false when no simulation warning', async () => {
    vi.mocked(getSystemWarnings).mockResolvedValue([]);
    const { matching_blocked } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(matching_blocked).toBe(false);
  });

  it('matching_blocked is true when simulation data warning present', async () => {
    vi.mocked(getSystemWarnings).mockResolvedValue([
      { type: 'simulation_data_in_company_needs', message: 'test', severity: 'error' },
    ]);
    const { matching_blocked } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(matching_blocked).toBe(true);
  });
});

// ─── SMS safety ───────────────────────────────────────────────────────────────

describe('GET /api/admin/operational-intelligence — sms_safe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RECRUITER_API_KEY', RECRUITER_KEY);
    setupDbMocks();
  });

  it('sms_safe is true when no simulation warning', async () => {
    vi.mocked(getSystemWarnings).mockResolvedValue([]);
    const { sms_safe } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(sms_safe).toBe(true);
  });

  it('sms_safe is false and urgent action added when simulation warning present', async () => {
    vi.mocked(getSystemWarnings).mockResolvedValue([
      { type: 'simulation_data_in_company_needs', message: 'test', severity: 'error' },
    ]);
    const body = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(body.sms_safe).toBe(false);
    expect(body.urgent_actions.some((a) => a.type === 'clean_simulation_company_needs')).toBe(true);
  });
});

// ─── Urgent actions ───────────────────────────────────────────────────────────

describe('GET /api/admin/operational-intelligence — urgent_actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RECRUITER_API_KEY', RECRUITER_KEY);
    vi.mocked(getSystemWarnings).mockResolvedValue([]);
  });

  it('generates contact_high_priority_manually when HIGH leads exist', async () => {
    setupDbMocks({
      ingested: [
        { id: 'a', priority: 'HIGH', license: 'CE', region: 'stockholm', availability: 'now', domain: null, first_name: 'Erik', phone: '+46701111111', ingested_at: new Date().toISOString() },
      ],
    });

    const { urgent_actions } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(urgent_actions.some((a) => a.type === 'contact_high_priority_manually')).toBe(true);
  });

  it('generates review_high_priority_data_quality when HIGH driver has quality issue', async () => {
    const now = new Date().toISOString();
    setupDbMocks({
      ingested: [
        { id: 'a', priority: 'HIGH', license: 'CE', region: 'stockholm', availability: 'now', domain: null, first_name: '+46701111111', phone: '+46701111111', ingested_at: now },
      ],
      systemActions: [
        { action_type: 'data_quality_issue', target_id: 'a', input: { issues: ['name_is_phone_number'], first_name: '+46701111111', phone: '+46701111111' } },
      ],
    });

    const { urgent_actions } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(urgent_actions.some((a) => a.type === 'review_high_priority_data_quality')).toBe(true);
  });

  it('no urgent_actions when data is clean', async () => {
    setupDbMocks({ drivers: [], ingested: [], systemActions: [], pendingCount: 0 });
    const { urgent_actions } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(urgent_actions).toHaveLength(0);
  });
});

// ─── contact_governance ───────────────────────────────────────────────────────

describe('GET /api/admin/operational-intelligence — contact_governance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RECRUITER_API_KEY', RECRUITER_KEY);
    vi.mocked(getSystemWarnings).mockResolvedValue([]);
  });

  it('contact_governance is present in response', async () => {
    setupDbMocks();
    const body = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(body).toHaveProperty('contact_governance');
    expect(body.contact_governance).toHaveProperty('dq_flagged_driver_count');
    expect(body.contact_governance).toHaveProperty('duplicate_flagged_phone_count');
  });

  it('reports dq_flagged_driver_count from all-time count', async () => {
    setupDbMocks({ dqFlaggedCount: 3 });
    const { contact_governance } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(contact_governance.dq_flagged_driver_count).toBe(3);
  });

  it('reports duplicate_flagged_phone_count from all-time count', async () => {
    setupDbMocks({ dupFlaggedCount: 2 });
    const { contact_governance } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(contact_governance.duplicate_flagged_phone_count).toBe(2);
  });

  it('both counts are 0 when no flags exist', async () => {
    setupDbMocks({ dqFlaggedCount: 0, dupFlaggedCount: 0 });
    const { contact_governance } = (await (await GET(makeRequest())).json()) as OperationalIntelligencePayload;
    expect(contact_governance.dq_flagged_driver_count).toBe(0);
    expect(contact_governance.duplicate_flagged_phone_count).toBe(0);
  });
});

