'use strict';
/**
 * scripts/simulate-e2e.js
 * DriverNord E2E Simulation — 5 drivers × 5 company needs
 *
 * All simulation data is prefixed with SIMULATION.
 * Fixed driver UUIDs make the script idempotent (upsert on conflict).
 *
 * Usage:  node scripts/simulate-e2e.js
 * Reads SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

// ─── Load .env.local ──────────────────────────────────────────────────────────

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RECRUITER_KEY = '2fbc850ae95a65601379b5adabfc56ef2329a9dc286e7b13';
const API_BASE      = 'https://drivernord.com';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// ─── Domain mapping note ──────────────────────────────────────────────────────
// Simulation spec uses labels outside the system's valid DomainTag enum.
// Mappings applied (documented in the report):
//   construction → schakt_bygg     (Swedish: schakt/bygg = excavation/construction)
//   long_haul    → fjarrtransport  (Swedish: fjärrtransport = long-haul transport)
//   passenger    → null for drivers (no passenger domain in system — domain_missing flag expected)
//   passenger    → budtransport for company need (closest available)

// ─── Simulation dataset ───────────────────────────────────────────────────────
// Fixed UUIDs: 00000000-0000-4e2e-8XXX-000000000XXX  ("4e2e" = E2E marker)

const SIM_DRIVERS = [
  {
    id: '00000000-0000-4e2e-8001-000000000001',
    ingested_at: new Date().toISOString(),
    priority: 'HIGH',
    license: 'CE',
    ykb: 'valid',
    driver_card: 'valid',
    region: 'stockholm',
    willing_to_relocate: null,
    availability: 'now',
    domain: 'distribution',
    shift_preference: 'day',
    first_name: 'SIMULATION-Erik',
    phone: '+46700000001',
    email: 'sim-erik@simulation.test',
    needs_follow_up: false,
    follow_up_at: null,
    follow_up_reason: null,
  },
  {
    id: '00000000-0000-4e2e-8002-000000000002',
    ingested_at: new Date().toISOString(),
    priority: 'MEDIUM',
    license: 'C',
    ykb: 'valid',
    driver_card: 'valid',
    region: 'stockholm',
    willing_to_relocate: null,
    availability: '2_weeks',
    domain: 'schakt_bygg',
    shift_preference: 'day',
    first_name: 'SIMULATION-Johan',
    phone: '+46700000002',
    email: 'sim-johan@simulation.test',
    needs_follow_up: false,
    follow_up_at: null,
    follow_up_reason: null,
  },
  {
    id: '00000000-0000-4e2e-8003-000000000003',
    ingested_at: new Date().toISOString(),
    priority: 'HIGH',
    license: 'CE+D',
    ykb: 'valid',
    driver_card: 'valid',
    region: 'other_sweden',
    willing_to_relocate: true,
    availability: 'now',
    domain: 'fjarrtransport',
    shift_preference: 'night',
    first_name: 'SIMULATION-Ahmed',
    phone: '+46700000003',
    email: 'sim-ahmed@simulation.test',
    needs_follow_up: false,
    follow_up_at: null,
    follow_up_reason: null,
  },
  {
    id: '00000000-0000-4e2e-8004-000000000004',
    ingested_at: new Date().toISOString(),
    priority: 'MEDIUM',
    license: 'D',
    ykb: 'in_progress',
    driver_card: 'valid',
    region: 'stockholm',
    willing_to_relocate: null,
    availability: '1_month',
    domain: null,
    shift_preference: 'flexible',
    first_name: 'SIMULATION-Lars',
    phone: '+46700000004',
    email: 'sim-lars@simulation.test',
    needs_follow_up: false,
    follow_up_at: null,
    follow_up_reason: null,
  },
  {
    id: '00000000-0000-4e2e-8005-000000000005',
    ingested_at: new Date().toISOString(),
    priority: 'HIGH',
    license: 'CE',
    ykb: 'valid',
    driver_card: 'valid',
    region: 'abroad',
    willing_to_relocate: true,
    availability: 'now',
    domain: 'distribution',
    shift_preference: 'flexible',
    first_name: 'SIMULATION-Maria',
    phone: '+46700000005',
    email: 'sim-maria@simulation.test',
    needs_follow_up: false,
    follow_up_at: null,
    follow_up_reason: null,
  },
];

const SIM_NEEDS = [
  {
    company_name: 'SIMULATION Stockholm Distribution AB',
    license_required: 'CE',
    domain_required: 'distribution',
    domain_preferred: [],
    location_region: 'stockholm',
    relocation_allowed: false,
    shift_type: 'day',
    urgency: 'urgent',
    status: 'open',
  },
  {
    company_name: 'SIMULATION ByggLogistik Sverige',
    license_required: 'C',
    domain_required: 'schakt_bygg',
    domain_preferred: ['distribution'],
    location_region: 'stockholm',
    relocation_allowed: false,
    shift_type: 'day',
    urgency: 'standard',
    status: 'open',
  },
  {
    company_name: 'SIMULATION Nordic Long Haul',
    license_required: 'CE',
    domain_required: 'fjarrtransport',
    domain_preferred: ['distribution'],
    location_region: 'stockholm',
    relocation_allowed: true,
    shift_type: 'night',
    urgency: 'urgent',
    status: 'open',
  },
  {
    company_name: 'SIMULATION City Passenger Transport',
    license_required: 'D',
    domain_required: 'budtransport',
    domain_preferred: [],
    location_region: 'stockholm',
    relocation_allowed: false,
    shift_type: 'flexible',
    urgency: 'standard',
    status: 'open',
  },
  {
    company_name: 'SIMULATION Stockholm Flexible Fleet',
    license_required: 'CE',
    domain_required: 'distribution',
    domain_preferred: ['fjarrtransport'],
    location_region: 'stockholm',
    relocation_allowed: true,
    shift_type: 'flexible',
    urgency: 'emergency',
    status: 'open',
  },
];

// ─── API helper ───────────────────────────────────────────────────────────────

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type':    'application/json',
      'X-Recruiter-Key': RECRUITER_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

function log(msg) { console.log(msg); }
function hr(label) { log(`\n${'─'.repeat(60)}`); log(`  ${label}`); log('─'.repeat(60)); }

// ─── Simulation runner ────────────────────────────────────────────────────────

async function run() {
  const R = {
    runAt:           new Date().toISOString(),
    leadInsert:      {},
    driverInsert:    {},
    needs:           [],
    matches:         [],
    contactWorkflow: null,
    dashboardCheck:  null,
    errors:          [],
  };

  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── 0. Insert parent rows into drivers table (FK prerequisite) ────────────
  hr('Phase 0 — Upsert simulation rows into drivers (FK prerequisite)');

  const SIM_LEADS = SIM_DRIVERS.map(d => ({
    id:                d.id,
    created_at:        d.ingested_at,
    completed_at:      d.ingested_at,
    last_step_reached: 7,
    lang:              'sv',
    region:            d.region,
    relocate:          d.willing_to_relocate === true ? 'yes' : d.willing_to_relocate === false ? 'no' : null,
    license:           d.license,
    ykb:               d.ykb,
    driver_card:       d.driver_card,
    availability:      d.availability,
    domain:            d.domain,
    shift_preference:  d.shift_preference,
    first_name:        d.first_name,
    phone:             d.phone,
    email:             d.email,
    lead_status:       'ready_for_ingestion',
    lead_priority:     d.priority,
    follow_up_sent:    false,
    follow_up_at:      null,
    follow_up_reason:  null,
  }));

  const { data: leadsInserted, error: leadsErr } = await db
    .from('drivers')
    .upsert(SIM_LEADS, { onConflict: 'id' })
    .select('id, first_name, lead_status');

  if (leadsErr) {
    log(`  ERROR: ${leadsErr.message}`);
    R.errors.push({ phase: 'lead_insert', error: leadsErr.message });
    R.leadInsert = { ok: false, error: leadsErr.message };
    log('  ABORT — cannot insert ingested_drivers without parent rows');
    return R;
  } else {
    R.leadInsert = { ok: true, count: leadsInserted.length };
    for (const l of leadsInserted) {
      log(`  ✓  ${l.first_name.padEnd(24)}  id=${l.id.slice(0, 8)}…  status=${l.lead_status}`);
    }
  }

  // ── 1. Insert simulation drivers ──────────────────────────────────────────
  hr('Phase 1 — Insert simulation drivers into ingested_drivers');

  const { data: inserted, error: insertErr } = await db
    .from('ingested_drivers')
    .upsert(SIM_DRIVERS, { onConflict: 'id' })
    .select('id, first_name, license, region, domain');

  if (insertErr) {
    log(`  ERROR: ${insertErr.message}`);
    R.errors.push({ phase: 'driver_insert', error: insertErr.message });
    R.driverInsert = { ok: false, error: insertErr.message };
  } else {
    R.driverInsert = { ok: true, count: inserted.length, rows: inserted };
    for (const d of inserted) {
      log(`  ✓  ${d.first_name.padEnd(24)}  license=${d.license}  region=${d.region}  domain=${d.domain ?? 'null'}`);
    }
  }

  // ── 2. Create simulation company needs ────────────────────────────────────
  hr('Phase 2 — Create simulation company needs');

  for (const need of SIM_NEEDS) {
    const res = await api('/api/company-needs', { method: 'POST', body: need });
    if (!res.ok) {
      log(`  ERROR  ${need.company_name}: ${JSON.stringify(res.data)}`);
      R.errors.push({ phase: 'create_need', company: need.company_name, detail: res.data });
    } else {
      const row = { input: need, companyId: res.data.company?.id, needId: res.data.need?.id };
      R.needs.push(row);
      log(`  ✓  ${need.company_name.padEnd(44)}  need_id=${row.needId?.slice(0, 8)}…`);
    }
  }

  // ── 3. Run matching for each need ─────────────────────────────────────────
  hr('Phase 3 — Run matching (POST /api/recruiter/match)');

  await new Promise(r => setTimeout(r, 600)); // let upsert propagate

  for (const { input, needId, companyId } of R.needs) {
    const res = await api('/api/recruiter/match', { method: 'POST', body: { need_id: needId } });

    if (!res.ok) {
      log(`  ERROR  ${input.company_name}: ${JSON.stringify(res.data)}`);
      R.errors.push({ phase: 'match', company: input.company_name, needId, detail: res.data });
      continue;
    }

    const m = res.data;
    R.matches.push({ company: input.company_name, needId, companyId, result: m });

    log(`\n  ${input.company_name}`);
    log(`  shortlist_id  = ${m.shortlist_id}`);
    log(`  candidates    = ${m.totalCandidates}  shortlisted = ${m.totalShortlisted}`);
    log(`  shortlisted:`);
    for (const [i, e] of (m.shortlisted ?? []).entries()) {
      const sim = e.driver.id.startsWith('00000000-0000-4e2e') ? '[SIM]' : '     ';
      log(`    ${sim} #${i + 1}  ${e.driver.contact.firstName.padEnd(24)}  score=${e.score.total}  flags=[${e.score.flags.join(', ')}]`);
      log(`         entry_id=${e.shortlist_entry_id}`);
      log(`         ${e.score.summary}`);
    }
    log(`  rejected (${m.rejected?.length ?? 0}):`);
    for (const r of m.rejected ?? []) {
      const sim = r.driverId.startsWith('00000000-0000-4e2e') ? '[SIM]' : '     ';
      log(`    ${sim}  id=${r.driverId.slice(0, 8)}…  reason=${r.reason}`);
    }
  }

  // ── 4. Recruiter contact workflow ─────────────────────────────────────────
  hr('Phase 4 — Recruiter contact workflow (first shortlist with ≥2 entries)');

  const firstMatch = R.matches.find(m => (m.result.shortlisted?.length ?? 0) >= 2);
  if (!firstMatch) {
    log('  SKIP — no match has ≥2 shortlisted entries');
    R.contactWorkflow = { skipped: true, reason: 'insufficient_shortlist_entries' };
  } else {
    const sl        = firstMatch.result;
    const slId      = sl.shortlist_id;
    const e1        = sl.shortlisted[0];
    const e2        = sl.shortlisted[1];
    const e1Id      = e1.shortlist_entry_id;
    const e2Id      = e2.shortlist_entry_id;

    log(`  Company        : ${firstMatch.company}`);
    log(`  shortlist_id   : ${slId}`);
    log(`  Entry #1       : ${e1.driver.contact.firstName}  (${e1Id?.slice(0, 8)}…)`);
    log(`  Entry #2       : ${e2.driver.contact.firstName}  (${e2Id?.slice(0, 8)}…)`);

    // PATCH #1 → contacted
    const p1 = await api(`/api/recruiter/shortlist-entries/${e1Id}`, {
      method: 'PATCH',
      body: { contact_status: 'contacted' },
    });
    log(`\n  PATCH #1 → contacted      : HTTP ${p1.status}  ${p1.ok ? '✓' : '✗ ' + JSON.stringify(p1.data)}`);

    // PATCH #2 → interested + note
    const note = 'Strong candidate — called 2026-05-05, confirmed availability and salary expectations';
    const p2 = await api(`/api/recruiter/shortlist-entries/${e2Id}`, {
      method: 'PATCH',
      body: { contact_status: 'interested', recruiter_note: note },
    });
    log(`  PATCH #2 → interested+note: HTTP ${p2.status}  ${p2.ok ? '✓' : '✗ ' + JSON.stringify(p2.data)}`);

    await new Promise(r => setTimeout(r, 400));

    // GET shortlist → verify persistence
    const reload = await api(`/api/recruiter/shortlists/${slId}`);
    log(`\n  GET /api/recruiter/shortlists/${slId.slice(0, 8)}… : HTTP ${reload.status}`);

    let verified = false;
    let e1persisted, e2persisted;

    if (reload.ok) {
      e1persisted = reload.data.entries?.find(e => e.id === e1Id);
      e2persisted = reload.data.entries?.find(e => e.id === e2Id);

      verified =
        e1persisted?.contact_status === 'contacted' &&
        !!e1persisted?.contacted_at &&
        e2persisted?.contact_status === 'interested' &&
        !!e2persisted?.recruiter_note;

      log(`  Entry #1 persisted: status=${e1persisted?.contact_status}  contacted_at=${e1persisted?.contacted_at ? '✓ set' : '✗ null'}`);
      log(`  Entry #2 persisted: status=${e2persisted?.contact_status}  note="${(e2persisted?.recruiter_note ?? '').slice(0, 50)}"`);
      log(`  Persistence check: ${verified ? '✓ PASS' : '✗ FAIL'}`);
    } else {
      log(`  Reload failed: ${JSON.stringify(reload.data)}`);
      R.errors.push({ phase: 'contact_workflow_reload', detail: reload.data });
    }

    R.contactWorkflow = {
      shortlistId: slId,
      company:     firstMatch.company,
      entry1: { id: e1Id, driver: e1.driver.contact.firstName, patchStatus: p1.status, patchOk: p1.ok, persisted: e1persisted },
      entry2: { id: e2Id, driver: e2.driver.contact.firstName, patchStatus: p2.status, patchOk: p2.ok, note, persisted: e2persisted },
      reloadStatus: reload.status,
      reloadOk:     reload.ok,
      verified,
    };
  }

  // ── 5. Dashboard API check ────────────────────────────────────────────────
  hr('Phase 5 — Dashboard API check (GET /api/company-needs)');

  const needsRes = await api('/api/company-needs');
  const simNeedIds = new Set(R.needs.map(n => n.needId));
  const openNeeds  = needsRes.data.needs ?? [];
  const simVisible = openNeeds.filter(n => simNeedIds.has(n.id));

  log(`  GET /api/company-needs: HTTP ${needsRes.status}`);
  log(`  Total open needs visible: ${openNeeds.length}`);
  log(`  Simulation needs visible: ${simVisible.length}/5`);
  for (const n of simVisible) log(`    ✓  ${n.id.slice(0, 8)}…  ${n.company_id}`);

  R.dashboardCheck = {
    ok:            needsRes.ok,
    status:        needsRes.status,
    totalOpen:     openNeeds.length,
    simNeedsCount: simVisible.length,
  };

  // ── Summary ───────────────────────────────────────────────────────────────
  hr('Simulation summary');
  log(`  Lead rows seeded    : ${R.leadInsert.count ?? 0}/5`);
  log(`  Drivers inserted    : ${R.driverInsert.count ?? 0}/5`);
  log(`  Needs created       : ${R.needs.length}/5`);
  log(`  Matches run         : ${R.matches.length}/5`);
  log(`  Workflow verified   : ${R.contactWorkflow?.verified ? 'YES' : 'NO'}`);
  log(`  Errors              : ${R.errors.length}`);

  return R;
}

// ─── Entry ────────────────────────────────────────────────────────────────────

run().then(results => {
  const out = path.join(__dirname, 'sim-results.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  log(`\nResults written to ${out}`);
}).catch(err => {
  console.error('Simulation crashed:', err);
  process.exit(1);
});
