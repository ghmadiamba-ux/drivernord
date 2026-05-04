import { db } from '../lib/db.ts';

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000';
const TAG = `E2E_${Date.now()}`;
const MATCH_API_KEY = process.env.MATCH_API_KEY ?? '';

// ─── Result tracking ──────────────────────────────────────────────────────────

interface SectionResult { section: string; passed: boolean; note: string }
const results: SectionResult[] = [];

function pass(section: string, note: string): void {
  results.push({ section, passed: true, note });
  console.log(`  ✓ [${section}] ${note}`);
}

function fail(section: string, note: string): void {
  results.push({ section, passed: false, note });
  console.error(`  ✗ [${section}] ${note}`);
}

// ─── Cleanup state ────────────────────────────────────────────────────────────

const created = {
  driverId:    null as string | null,
  companyId:   null as string | null,
  needId:      null as string | null,
  shortlistId: null as string | null,
};

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function httpPost(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    JSON.stringify(body),
  });
  let parsed: unknown;
  try { parsed = await res.json(); } catch { parsed = null; }
  return { status: res.status, body: parsed };
}

async function httpGet(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE_URL}${path}`);
  let parsed: unknown;
  try { parsed = await res.json(); } catch { parsed = null; }
  return { status: res.status, body: parsed };
}

// ─── Section A: Environment variables ────────────────────────────────────────

function checkEnvironment(): void {
  console.log('\n[A] Environment checks');
  const missing: string[] = [];
  if (!process.env.SUPABASE_URL)              missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.MATCH_API_KEY)             missing.push('MATCH_API_KEY');

  if (missing.length > 0) {
    fail('A', `Missing env vars: ${missing.join(', ')}`);
  } else {
    pass('A', 'All required environment variables are set');
  }
}

// ─── Section B: Supabase schema ───────────────────────────────────────────────

async function checkSchema(): Promise<void> {
  console.log('\n[B] Supabase schema checks');

  const tables = [
    'drivers', 'companies', 'company_needs',
    'ingested_drivers', 'shortlists', 'shortlist_entries',
  ] as const;

  for (const table of tables) {
    const { error } = await db.from(table).select('id').limit(0);
    if (error && error.code !== 'PGRST116') {
      fail('B', `Table "${table}" inaccessible: ${error.message}`);
      return;
    }
  }

  // Confirm drivers.domain and drivers.shift_preference columns exist
  const { error: colErr } = await db.from('drivers').select('domain, shift_preference').limit(0);
  if (colErr) {
    fail('B', `drivers.domain / shift_preference columns missing: ${colErr.message}`);
    return;
  }

  pass('B', 'All 6 tables present; drivers.domain and drivers.shift_preference exist');
}

// ─── Section C: POST /api/company-needs — valid ───────────────────────────────

async function createCompanyNeed(): Promise<void> {
  console.log('\n[C] POST /api/company-needs — valid payload');

  const payload = {
    company_name:       `${TAG}_Trucking AB`,
    license_required:   'CE',
    domain_required:    'fjarrtransport',
    domain_preferred:   ['distribution', 'adr'],
    location_region:    'stockholm',
    relocation_allowed: false,
    shift_type:         'day',
    urgency:            'standard',
  };

  const { status, body } = await httpPost('/api/company-needs', payload);

  if (status !== 201) {
    fail('C', `Expected 201, got ${status}. Body: ${JSON.stringify(body)}`);
    return;
  }

  const resp = body as { company?: { id?: string }; need?: { id?: string } };
  created.companyId = resp.company?.id ?? null;
  created.needId    = resp.need?.id    ?? null;

  if (!created.companyId || !created.needId) {
    fail('C', `Missing company.id or need.id in response: ${JSON.stringify(body)}`);
    return;
  }

  pass('C', `company_id=${created.companyId}  need_id=${created.needId}`);
}

// ─── Section D: POST /api/company-needs — invalid validation ─────────────────

async function checkCompanyNeedValidation(): Promise<void> {
  console.log('\n[D] POST /api/company-needs — domain_preferred contains domain_required');

  const payload = {
    company_name:       `${TAG}_Invalid Co`,
    license_required:   'CE',
    domain_required:    'distribution',
    domain_preferred:   ['distribution'],   // rule violation
    location_region:    'stockholm',
    relocation_allowed: false,
    shift_type:         'day',
    urgency:            'standard',
  };

  const { status } = await httpPost('/api/company-needs', payload);

  if (status !== 400) {
    fail('D', `Expected 400, got ${status}`);
    return;
  }

  pass('D', 'Correctly rejected with 400');
}

// ─── Section E: Direct Supabase insert — ready_for_ingestion driver ───────────

async function insertTestDriver(): Promise<void> {
  console.log('\n[E] Direct Supabase insert — ready_for_ingestion driver');

  const id  = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error } = await db.from('drivers').insert({
    id,
    created_at:        now,
    completed_at:      now,
    last_step_reached: 7,
    lang:              'sv',
    region:            'stockholm',
    relocate:          null,
    license:           'CE',
    ykb:               'valid',
    driver_card:       'valid',
    availability:      'now',
    domain:            'fjarrtransport',
    shift_preference:  'day',
    first_name:        `${TAG}_Erik`,
    phone:             '+46701234567',
    email:             null,
    lead_status:       'ready_for_ingestion',
    lead_priority:     'HIGH',
    follow_up_sent:    false,
    follow_up_at:      null,
    follow_up_reason:  null,
  });

  if (error) {
    fail('E', `Insert failed: ${error.message}`);
    return;
  }

  created.driverId = id;
  pass('E', `driver_id=${id}`);
}

// ─── Section F: GET /api/leads/:id/score ─────────────────────────────────────

async function checkScoreGet(): Promise<void> {
  console.log('\n[F] GET /api/leads/:id/score');

  if (!created.driverId) {
    fail('F', 'Skipped — no driver_id (section E failed)');
    return;
  }

  const { status, body } = await httpGet(`/api/leads/${created.driverId}/score`);

  if (status !== 200) {
    fail('F', `Expected 200, got ${status}. Body: ${JSON.stringify(body)}`);
    return;
  }

  const resp = body as { score?: { total?: number; tier?: string } };
  if (typeof resp.score?.total !== 'number' || !resp.score?.tier) {
    fail('F', `score.total or score.tier missing. Body: ${JSON.stringify(body)}`);
    return;
  }

  pass('F', `total=${resp.score.total}  tier=${resp.score.tier}`);
}

// ─── Section G: POST /api/leads/:id/score ────────────────────────────────────

async function checkScorePost(): Promise<void> {
  console.log('\n[G] POST /api/leads/:id/score — ingest + score');

  if (!created.driverId) {
    fail('G', 'Skipped — no driver_id (section E failed)');
    return;
  }

  const { status, body } = await httpPost(`/api/leads/${created.driverId}/score`, {});

  if (status !== 200) {
    fail('G', `Expected 200, got ${status}. Body: ${JSON.stringify(body)}`);
    return;
  }

  // Verify the row landed in ingested_drivers
  const { data, error } = await db
    .from('ingested_drivers')
    .select('id')
    .eq('id', created.driverId)
    .single();

  if (error || !data) {
    fail('G', `Score returned 200 but ingested_drivers row missing: ${error?.message ?? 'no data'}`);
    return;
  }

  const resp = body as { score?: { total?: number; tier?: string } };
  pass('G', `Ingested and scored. total=${resp.score?.total}  tier=${resp.score?.tier}`);
}

// ─── Section H: POST /api/match — missing API key ────────────────────────────

async function checkMatchNoKey(): Promise<void> {
  console.log('\n[H] POST /api/match — no API key');

  const { status } = await httpPost('/api/match', { need_id: '00000000-0000-0000-0000-000000000000' });

  if (status !== 401) {
    fail('H', `Expected 401, got ${status}`);
    return;
  }

  pass('H', 'Correctly rejected with 401');
}

// ─── Section I: POST /api/match — success ────────────────────────────────────

async function checkMatchSuccess(): Promise<void> {
  console.log('\n[I] POST /api/match — valid key + need_id');

  if (!created.needId) {
    fail('I', 'Skipped — no need_id (section C failed)');
    return;
  }

  const { status, body } = await httpPost(
    '/api/match',
    { need_id: created.needId },
    { 'x-api-key': MATCH_API_KEY },
  );

  if (status !== 200) {
    fail('I', `Expected 200, got ${status}. Body: ${JSON.stringify(body)}`);
    return;
  }

  const resp = body as {
    shortlist_id?:      string;
    totalShortlisted?:  number;
    totalCandidates?:   number;
  };

  created.shortlistId = resp.shortlist_id ?? null;

  if (!created.shortlistId) {
    fail('I', `shortlist_id missing in response: ${JSON.stringify(body)}`);
    return;
  }

  pass('I', `shortlist_id=${created.shortlistId}  shortlisted=${resp.totalShortlisted ?? '?'}/${resp.totalCandidates ?? '?'}`);
}

// ─── Section J: POST /api/match — wrong need_id ──────────────────────────────

async function checkMatchWrongId(): Promise<void> {
  console.log('\n[J] POST /api/match — valid key + non-existent need_id');

  const { status } = await httpPost(
    '/api/match',
    { need_id: '00000000-0000-0000-0000-000000000099' },
    { 'x-api-key': MATCH_API_KEY },
  );

  if (status !== 404) {
    fail('J', `Expected 404, got ${status}`);
    return;
  }

  pass('J', 'Correctly returned 404');
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup(): Promise<void> {
  console.log('\n[Cleanup] Removing test data (FK-safe reverse order)');

  if (created.shortlistId) {
    await db.from('shortlist_entries').delete().eq('shortlist_id', created.shortlistId);
    await db.from('shortlists').delete().eq('id', created.shortlistId);
  }
  if (created.driverId) {
    await db.from('ingested_drivers').delete().eq('id', created.driverId);
    await db.from('drivers').delete().eq('id', created.driverId);
  }
  if (created.needId)    await db.from('company_needs').delete().eq('id', created.needId);
  if (created.companyId) await db.from('companies').delete().eq('id', created.companyId);

  console.log('  Done');
}

// ─── Report ───────────────────────────────────────────────────────────────────

function printReport(): void {
  const passed = results.filter(r => r.passed).length;
  const total  = results.length;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  E2E Backend Verification Report');
  console.log('═══════════════════════════════════════════════════════════');
  for (const r of results) {
    const label = r.passed ? 'PASS' : 'FAIL';
    console.log(`  [${label}] ${r.section.padEnd(2)}  ${r.note}`);
  }
  console.log('───────────────────────────────────────────────────────────');
  console.log(`  ${passed}/${total} sections passed`);
  if (created.driverId)    console.log(`  driver_id    = ${created.driverId}`);
  if (created.companyId)   console.log(`  company_id   = ${created.companyId}`);
  if (created.needId)      console.log(`  need_id      = ${created.needId}`);
  if (created.shortlistId) console.log(`  shortlist_id = ${created.shortlistId}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (passed < total) process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\nE2E backend verification  TAG=${TAG}`);
  console.log('Make sure Next.js dev server is running on http://localhost:3000\n');

  checkEnvironment();
  await checkSchema();
  await createCompanyNeed();
  await checkCompanyNeedValidation();
  await insertTestDriver();
  await checkScoreGet();
  await checkScorePost();
  await checkMatchNoKey();
  await checkMatchSuccess();
  await checkMatchWrongId();
  await cleanup();
  printReport();
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
