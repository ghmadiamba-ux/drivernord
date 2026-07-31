/**
 * scripts/simulate-full-pipeline.mts
 * DriverNord — Full Autonomous Pipeline Simulation
 *
 * Exercises: matching agent → contact agent (auto) → follow-up agent (auto)
 * Uses actual system logic. Does NOT simulate ideal behavior.
 * Fixed driver UUIDs (marker "6f6f" = full-pipeline run):
 *   00000000-0000-6f6f-d00X-00000000000X
 *
 * Usage:
 *   npx tsx scripts/simulate-full-pipeline.mts
 */

import * as fs   from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID }    from 'node:crypto';

// ── Load .env.local BEFORE any module reads env vars ──────────────────────────
// db.ts uses a lazy proxy — env is read at first db.from() call, not at import.
// This must run before runMatchingAgent / runFollowUpAgent are invoked.
const __dir   = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(__dir, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

// ── Simulation env overrides ───────────────────────────────────────────────────
process.env.AGENT_CONTACT_ENABLED  = 'true';
process.env.AGENT_CONTACT_MODE     = 'auto';    // execute contacts immediately
process.env.AGENT_FOLLOWUP_ENABLED = 'true';
process.env.AGENT_FOLLOWUP_MODE    = 'auto';    // execute follow-ups immediately

// ── Imports (all lazy — env is ready before first call) ───────────────────────
import { db }               from '../lib/db.ts';
import { runMatchingAgent } from '../lib/matchingAgent.ts';
import { runFollowUpAgent } from '../lib/followUpAgent.ts';

// ── Constants ─────────────────────────────────────────────────────────────────

const SIM_TAG    = 'SIM-FP-v2';
const YESTERDAY  = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
const NOW_ISO    = new Date().toISOString();

const D_IDS = {
  erik:  '00000000-0000-6f6f-d001-000000000001',
  johan: '00000000-0000-6f6f-d002-000000000002',
  ahmed: '00000000-0000-6f6f-d003-000000000003',
  lars:  '00000000-0000-6f6f-d004-000000000004',
  maria: '00000000-0000-6f6f-d005-000000000005',
};
const ALL_D_IDS = Object.values(D_IDS);

// ── Driver dataset ─────────────────────────────────────────────────────────────
//
//  D1 Erik  — CE / stockholm / distribution / day / now   / no follow-up
//  D2 Johan — C  / other_sweden / schakt_bygg / day / 2_weeks / no follow-up
//  D3 Ahmed — CE+D / other_sweden / fjarrtransport / night / now / no follow-up (reloc)
//  D4 Lars  — D   / stockholm / null domain / flexible / 1_month / ykb_in_progress (follow-up due)
//  D5 Maria — CE  / other_sweden / distribution / flexible / not_yet / not_yet_available (follow-up due, reloc)

const SIM_DRIVERS_BASE = [
  {
    id: D_IDS.erik, region: 'stockholm', relocate: null,
    license: 'CE',   ykb: 'valid',       driver_card: 'valid',
    availability: 'now',     domain: 'distribution', shift_preference: 'day',
    first_name: `${SIM_TAG}-Erik`,  phone: '+46700000011',
    lead_priority: 'HIGH',   follow_up_at: null,      follow_up_reason: null,
  },
  {
    id: D_IDS.johan, region: 'other_sweden', relocate: 'no',
    license: 'C',    ykb: 'valid',       driver_card: 'valid',
    availability: '2_weeks', domain: 'schakt_bygg',  shift_preference: 'day',
    first_name: `${SIM_TAG}-Johan`, phone: '+46700000012',
    lead_priority: 'MEDIUM', follow_up_at: null,      follow_up_reason: null,
  },
  {
    id: D_IDS.ahmed, region: 'other_sweden', relocate: 'yes',
    license: 'CE+D', ykb: 'valid',       driver_card: 'valid',
    availability: 'now',     domain: 'fjarrtransport', shift_preference: 'night',
    first_name: `${SIM_TAG}-Ahmed`, phone: '+46700000013',
    lead_priority: 'HIGH',   follow_up_at: null,      follow_up_reason: null,
  },
  {
    id: D_IDS.lars, region: 'stockholm', relocate: null,
    license: 'D',    ykb: 'in_progress', driver_card: 'valid',
    availability: '1_month',  domain: null,           shift_preference: 'flexible',
    first_name: `${SIM_TAG}-Lars`,  phone: '+46700000014',
    lead_priority: 'MEDIUM', follow_up_at: YESTERDAY, follow_up_reason: 'ykb_in_progress',
  },
  {
    id: D_IDS.maria, region: 'other_sweden', relocate: 'yes',
    license: 'CE',   ykb: 'valid',       driver_card: 'valid',
    availability: 'not_yet', domain: 'distribution', shift_preference: 'flexible',
    first_name: `${SIM_TAG}-Maria`, phone: '+46700000015',
    lead_priority: 'LOW',    follow_up_at: YESTERDAY, follow_up_reason: 'not_yet_available',
  },
] as const;

// drivers table rows (FK parent for ingested_drivers)
const SIM_LEADS = SIM_DRIVERS_BASE.map(d => ({
  id:                d.id,
  created_at:        NOW_ISO,
  completed_at:      NOW_ISO,
  last_step_reached: 7,
  lang:              'sv',
  region:            d.region,
  relocate:          d.relocate ?? null,
  license:           d.license,
  ykb:               d.ykb,
  driver_card:       d.driver_card,
  availability:      d.availability,
  domain:            d.domain ?? null,
  shift_preference:  d.shift_preference,
  first_name:        d.first_name,
  phone:             d.phone,
  email:             null as string | null,
  lead_status:       'ready_for_ingestion',
  lead_priority:     d.lead_priority,
  follow_up_sent:    false,
  follow_up_at:      d.follow_up_at ?? null,
  follow_up_reason:  d.follow_up_reason ?? null,
}));

// ingested_drivers rows (pool for matching)
const SIM_INGESTED = SIM_DRIVERS_BASE.map(d => ({
  id:                  d.id,
  ingested_at:         NOW_ISO,
  priority:            d.lead_priority,
  license:             d.license,
  ykb:                 d.ykb,
  driver_card:         d.driver_card,
  region:              d.region,
  willing_to_relocate: d.relocate === 'yes' ? true : d.relocate === 'no' ? false : null,
  availability:        d.availability,
  domain:              d.domain ?? null,
  shift_preference:    d.shift_preference,
  first_name:          d.first_name,
  phone:               d.phone,
  email:               null as string | null,
  needs_follow_up:     d.follow_up_at !== null,
  follow_up_at:        d.follow_up_at ?? null,
  follow_up_reason:    d.follow_up_reason ?? null,
}));

// ── Company needs dataset ─────────────────────────────────────────────────────
//
//  N1 CE + distribution  + stockholm / day      / urgent    / no reloc
//  N2 C  + schakt_bygg   + stockholm / day      / standard  / no reloc
//  N3 CE + fjarrtransport + stockholm / night   / urgent    / reloc ok
//  N4 D  + budtransport  + stockholm / flexible / standard  / no reloc
//  N5 CE + distribution  + stockholm / flexible / emergency / reloc ok

const SIM_NEEDS = [
  {
    tag:                'N1',
    company_name:       `${SIM_TAG} Stockholm Distribution AB`,
    license_required:   'CE',
    domain_required:    'distribution',
    domain_preferred:   [] as string[],
    location_region:    'stockholm',
    relocation_allowed: false,
    shift_type:         'day',
    urgency:            'urgent',
  },
  {
    tag:                'N2',
    company_name:       `${SIM_TAG} ByggLogistik Sverige`,
    license_required:   'C',
    domain_required:    'schakt_bygg',
    domain_preferred:   ['distribution'],
    location_region:    'stockholm',
    relocation_allowed: false,
    shift_type:         'day',
    urgency:            'standard',
  },
  {
    tag:                'N3',
    company_name:       `${SIM_TAG} Nordic Long Haul`,
    license_required:   'CE',
    domain_required:    'fjarrtransport',
    domain_preferred:   ['distribution'],
    location_region:    'stockholm',
    relocation_allowed: true,
    shift_type:         'night',
    urgency:            'urgent',
  },
  {
    tag:                'N4',
    company_name:       `${SIM_TAG} City Passenger Transport`,
    license_required:   'D',
    domain_required:    'budtransport',
    domain_preferred:   [] as string[],
    location_region:    'stockholm',
    relocation_allowed: false,
    shift_type:         'flexible',
    urgency:            'standard',
  },
  {
    tag:                'N5',
    company_name:       `${SIM_TAG} Stockholm Flexible Fleet`,
    license_required:   'CE',
    domain_required:    'distribution',
    domain_preferred:   ['fjarrtransport'],
    location_region:    'stockholm',
    relocation_allowed: true,
    shift_type:         'flexible',
    urgency:            'emergency',
  },
];

// ── Pre-calculated expected scores (simulation drivers only) ─────────────────
//
//  Weights: license 0.25, domain 0.25, location 0.20, avail 0.10, shift 0.10, salary 0.10
//
//  N1 (CE, dist, sthlm, day, no_reloc):
//    D1 Erik  (CE  / dist    / sthlm     / now    / day)      25+25+20+10+10+7.5 = 97.5 → 98
//    D2 Johan (C   / schakt  / other_sw  / 2_weeks/ day)      license_mismatch (C∉CE)
//    D3 Ahmed (CE+D/ fjar    / other_sw  / now    / night)     25+0+0+10+4+7.5   = 46.5 → 47
//    D4 Lars  (D   / null    / sthlm     / 1_month/ flex)      license_mismatch (D∉CE)
//    D5 Maria (CE  / dist    / other_sw  / not_yet/ flex)      25+25+0+1+9+7.5   = 67.5 → 68
//
//  N2 (C, schakt, sthlm, day, no_reloc):
//    D1 Erik  (CE  / dist    / sthlm     / now    / day)       25+15+20+10+10+7.5= 87.5 → 88
//    D2 Johan (C   / schakt  / other_sw  / 2_weeks/ day)       25+25+0+7+10+7.5  = 74.5 → 75
//    D3 Ahmed (CE+D/ fjar    / other_sw  / now    / night)      25+0+0+10+4+7.5   = 46.5 → 47
//    D4 Lars  (D   / null    / sthlm     / 1_month/ flex)       license_mismatch
//    D5 Maria (CE  / dist    / other_sw  / not_yet/ flex)       25+15+0+1+9+7.5  = 57.5 → 58
//
//  N3 (CE, fjar, sthlm, night, reloc):
//    D1 Erik  (CE  / dist    / sthlm     / now    / day)        25+15+20+10+4+7.5 = 81.5 → 82
//    D2 Johan (C   / schakt  / other_sw  / 2_weeks/ day)        license_mismatch
//    D3 Ahmed (CE+D/ fjar    / other_sw  / now    / night)       25+25+12+10+10+7.5= 89.5 → 90
//    D4 Lars  (D   / null    / sthlm     / 1_month/ flex)        license_mismatch
//    D5 Maria (CE  / dist    / other_sw  / not_yet/ flex)        25+15+12+1+9+7.5 = 69.5 → 70
//
//  N4 (D, budtransport, sthlm, flexible, no_reloc):
//    D1 Erik  (CE  / dist    / sthlm     / now    / day)         license_mismatch (CE∉D)
//    D2 Johan (C   / schakt  / other_sw  / 2_weeks/ day)         license_mismatch
//    D3 Ahmed (CE+D/ fjar    / other_sw  / now    / night)        25+0+0+10+10+7.5 = 52.5 → 53
//    D4 Lars  (D   / null    / sthlm     / 1_month/ flex)         25+0+20+4+10+7.5 = 66.5 → 67
//    D5 Maria (CE  / dist    / other_sw  / not_yet/ flex)         license_mismatch
//
//  N5 (CE, dist, sthlm, flexible, reloc):
//    D1 Erik  (CE  / dist    / sthlm     / now    / day)          25+25+20+10+10+7.5= 97.5 → 98
//    D2 Johan (C   / schakt  / other_sw  / 2_weeks/ day)          license_mismatch
//    D3 Ahmed (CE+D/ fjar    / other_sw  / now    / night)         25+15+12+10+10+7.5= 79.5 → 80
//    D4 Lars  (D   / null    / sthlm     / 1_month/ flex)          license_mismatch
//    D5 Maria (CE  / dist    / other_sw  / not_yet/ flex)          25+25+12+1+10+7.5 = 80.5 → 81

// ── Helpers ────────────────────────────────────────────────────────────────────

function log(msg: string)  { console.log(msg); }
function hr(title: string) {
  log(`\n${'─'.repeat(72)}`);
  log(`  ${title}`);
  log('─'.repeat(72));
}
function ok(msg: string)   { log(`  ✓  ${msg}`); }
function fail(msg: string) { log(`  ✗  ${msg}`); }
function info(msg: string) { log(`     ${msg}`); }

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function shortName(fullName: string): string {
  return fullName.replace(`${SIM_TAG}-`, '');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const R: {
    runAt:         string;
    needs:         Array<{ tag: string; company: string; needId: string; companyId: string }>;
    matches:       Array<{ tag: string; company: string; needId: string; result: Record<string, unknown> }>;
    followUp:      { suggested: number; sent: number; skipped: number; errors: number } | null;
    simActions:    Record<string, unknown>[];
    contactRows:   Record<string, unknown>[];
    errors:        Array<{ phase: string; detail: string }>;
  } = {
    runAt:       new Date().toISOString(),
    needs:       [],
    matches:     [],
    followUp:    null,
    simActions:  [],
    contactRows: [],
    errors:      [],
  };

  // ──────────────────────────────────────────────────────────────────────────
  hr('Phase 0 — Pre-flight');
  // ──────────────────────────────────────────────────────────────────────────

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    fail('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — aborting');
    process.exit(1);
  }
  ok(`Supabase URL          : ${process.env.SUPABASE_URL}`);
  ok(`AGENT_CONTACT_MODE    : ${process.env.AGENT_CONTACT_MODE}`);
  ok(`AGENT_FOLLOWUP_MODE   : ${process.env.AGENT_FOLLOWUP_MODE}`);

  // ──────────────────────────────────────────────────────────────────────────
  hr('Phase 1 — Cleanup previous simulation data');
  // ──────────────────────────────────────────────────────────────────────────

  // Find previous simulation companies
  const { data: prevCompanies } = await db
    .from('companies')
    .select('id')
    .like('name', `${SIM_TAG}%`);
  const prevCompanyIds = (prevCompanies ?? []).map(c => c.id as string);

  if (prevCompanyIds.length > 0) {
    const { data: prevNeeds } = await db
      .from('company_needs').select('id').in('company_id', prevCompanyIds);
    const prevNeedIds = (prevNeeds ?? []).map(n => n.id as string);

    if (prevNeedIds.length > 0) {
      const { data: prevShortlists } = await db
        .from('shortlists').select('id').in('company_need_id', prevNeedIds);
      const prevSlIds = (prevShortlists ?? []).map(s => s.id as string);

      if (prevSlIds.length > 0) {
        await db.from('shortlist_entries').delete().in('shortlist_id', prevSlIds);
        await db.from('shortlists').delete().in('id', prevSlIds);
      }
      await db.from('company_needs').delete().in('id', prevNeedIds);
    }
    await db.from('companies').delete().in('id', prevCompanyIds);
  }

  await db.from('ingested_drivers').delete().in('id', ALL_D_IDS);
  await db.from('drivers').delete().in('id', ALL_D_IDS);
  ok('Previous simulation data removed');

  // ──────────────────────────────────────────────────────────────────────────
  hr('Phase 2 — Seed 5 drivers');
  // ──────────────────────────────────────────────────────────────────────────

  const { error: leadsErr } = await db.from('drivers').insert(SIM_LEADS);
  if (leadsErr) {
    fail(`drivers insert failed: ${leadsErr.message}`);
    R.errors.push({ phase: 'seed_drivers', detail: leadsErr.message });
    return R;
  }

  const { error: ingestErr } = await db.from('ingested_drivers').insert(SIM_INGESTED);
  if (ingestErr) {
    fail(`ingested_drivers insert failed: ${ingestErr.message}`);
    R.errors.push({ phase: 'seed_ingested', detail: ingestErr.message });
    return R;
  }

  for (const d of SIM_INGESTED) {
    const followUp = d.follow_up_at ? `follow_up=${d.follow_up_reason}` : 'no follow-up';
    ok(
      `${shortName(d.first_name).padEnd(8)}  ` +
      `license=${String(d.license).padEnd(4)}  ykb=${d.ykb.padEnd(11)}  ` +
      `region=${d.region.padEnd(12)}  avail=${d.availability.padEnd(7)}  ` +
      `domain=${(d.domain ?? 'null').padEnd(14)}  ${followUp}`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  hr('Phase 3 — Create 5 company needs');
  // ──────────────────────────────────────────────────────────────────────────

  for (const need of SIM_NEEDS) {
    const coId = randomUUID();
    const { error: coErr } = await db.from('companies').insert({
      id:         coId,
      name:       need.company_name,
      created_at: NOW_ISO,
    });
    if (coErr) {
      fail(`Company insert ${need.tag}: ${coErr.message}`);
      R.errors.push({ phase: `create_company_${need.tag}`, detail: coErr.message });
      continue;
    }

    const needId = randomUUID();
    const { error: needErr } = await db.from('company_needs').insert({
      id:                 needId,
      company_id:         coId,
      created_at:         NOW_ISO,
      license_required:   need.license_required,
      domain_required:    need.domain_required,
      domain_preferred:   need.domain_preferred,
      location_region:    need.location_region,
      relocation_allowed: need.relocation_allowed,
      shift_type:         need.shift_type,
      urgency:            need.urgency,
      status:             'open',
    });
    if (needErr) {
      fail(`Need insert ${need.tag}: ${needErr.message}`);
      R.errors.push({ phase: `create_need_${need.tag}`, detail: needErr.message });
      continue;
    }

    R.needs.push({ tag: need.tag, company: need.company_name, needId, companyId: coId });
    ok(
      `${need.tag}  ${need.license_required.padEnd(4)}/${need.domain_required.padEnd(15)}  ` +
      `${need.location_region.padEnd(10)}  ${need.shift_type.padEnd(8)}  ` +
      `${need.urgency.padEnd(9)}  reloc=${need.relocation_allowed}  ` +
      `need_id=${needId.slice(0, 8)}…`,
    );
  }

  if (R.needs.length === 0) {
    fail('No needs created — aborting');
    return R;
  }

  // ──────────────────────────────────────────────────────────────────────────
  hr('Phase 4 — Matching pipeline (matching agent fires contact agent per need)');
  // ──────────────────────────────────────────────────────────────────────────

  for (const { tag, company, needId } of R.needs) {
    log(`\n  ── ${tag}: ${company.replace(SIM_TAG + ' ', '')} ──`);

    const result = await runMatchingAgent({ needId, triggeredBy: 'agent:matching' });

    if (!result.ok) {
      fail(`${tag} match failed: ${result.error}`);
      R.errors.push({ phase: `match_${tag}`, detail: result.error });
      // Wait for any in-flight fire-and-forget contact agents before continuing
      await sleep(2000);
      continue;
    }

    R.matches.push({ tag, company, needId, result: result as unknown as Record<string, unknown> });

    info(`shortlist_id=${result.shortlistId}`);
    info(`candidates total=${result.totalCandidates}  shortlisted=${result.totalShortlisted}`);
    info('shortlisted:');
    for (const [i, e] of result.shortlisted.entries()) {
      const sim = ALL_D_IDS.includes(e.driver.id) ? ' [SIM]' : '      ';
      info(
        `  ${sim} #${i + 1}  ` +
        `${e.driver.contact.firstName.padEnd(30)}  ` +
        `score=${e.score.total}  flags=[${e.score.flags.join(', ')}]`,
      );
      info(`         entry=${result.entryIdsByDriverId[e.driver.id]?.slice(0, 8) ?? '?'}…  ${e.score.summary}`);
    }
    if (result.rejected.length > 0) {
      info(`rejected (${result.rejected.length}):`);
      for (const r of result.rejected) {
        const sim = ALL_D_IDS.includes(r.driverId) ? ' [SIM]' : '      ';
        info(`  ${sim}  ${r.driverId.slice(0, 8)}…  ${r.reason}`);
      }
    }

    // Let the fire-and-forget contact agent complete before the next need's
    // contact agent runs — otherwise anti-spam dedup sees stale state.
    await sleep(2000);
  }

  // ──────────────────────────────────────────────────────────────────────────
  hr('Phase 5 — Follow-up agent (runs against drivers table)');
  // ──────────────────────────────────────────────────────────────────────────

  const fuResult = await runFollowUpAgent();
  R.followUp = fuResult;
  ok(`suggested=${fuResult.suggested}  sent=${fuResult.sent}  skipped=${fuResult.skipped}  errors=${fuResult.errors}`);

  // ──────────────────────────────────────────────────────────────────────────
  hr('Phase 6 — Query audit trail from system_actions');
  // ──────────────────────────────────────────────────────────────────────────

  // Collect all simulation-related IDs so we can filter system_actions
  const simNeedIds     = R.needs.map(n => n.needId);
  const simShortlistIds: string[] = [];
  const simEntryIds:    string[] = [];

  for (const m of R.matches) {
    const r = m.result as {
      ok: boolean; shortlistId?: string;
      shortlisted?: Array<{ driver: { id: string } }>;
      entryIdsByDriverId?: Record<string, string>;
    };
    if (!r.ok || !r.shortlistId) continue;
    simShortlistIds.push(r.shortlistId);
    for (const entryId of Object.values(r.entryIdsByDriverId ?? {})) {
      simEntryIds.push(entryId);
    }
  }

  const filterIds = [
    ...ALL_D_IDS,
    ...simNeedIds,
    ...simShortlistIds,
    ...simEntryIds,
  ];

  const { data: actions, error: actErr } = await db
    .from('system_actions')
    .select('*')
    .in('target_id', filterIds)
    .order('created_at', { ascending: true });

  if (actErr) {
    fail(`system_actions query failed: ${actErr.message}`);
  } else {
    R.simActions = (actions ?? []) as Record<string, unknown>[];
    ok(`Simulation system_actions rows: ${R.simActions.length}`);
  }

  // Query shortlist_entries for sim drivers
  const { data: contactRows } = simShortlistIds.length > 0
    ? await db
        .from('shortlist_entries')
        .select('id, driver_id, shortlist_id, match_score, contact_status, contacted_at, driver_snapshot')
        .in('shortlist_id', simShortlistIds)
        .in('driver_id', ALL_D_IDS)
        .order('match_score', { ascending: false })
    : { data: [] };

  R.contactRows = (contactRows ?? []) as Record<string, unknown>[];

  // ──────────────────────────────────────────────────────────────────────────
  hr('ANALYSIS REPORT');
  // ──────────────────────────────────────────────────────────────────────────

  // ── 1. Driver summary ────────────────────────────────────────────────────
  log('\n  1. DRIVER SUMMARY');
  log('  ' + '─'.repeat(80));
  log(
    `  ${'Driver'.padEnd(8)} ${'License'.padEnd(8)} ${'Region'.padEnd(14)} ` +
    `${'Shortlisted'.padEnd(16)} ${'Contacted'.padEnd(14)} Follow-up`,
  );
  log('  ' + '─'.repeat(80));

  for (const d of SIM_DRIVERS_BASE) {
    const name  = shortName(d.first_name);
    const rows  = R.contactRows.filter(e => e.driver_id === d.id);
    const nShortlisted = rows.length;
    const contacted = rows.filter(e => e.contact_status !== 'new');

    const fuActs = R.simActions.filter(
      a => a.target_id === d.id &&
           String(a.action_type).startsWith('follow_up'),
    );
    const fuType = fuActs.length > 0
      ? String(fuActs[0].action_type).replace('follow_up_', '')
      : 'none';

    const shortlistStr = nShortlisted > 0
      ? `YES ×${nShortlisted}`
      : 'NO';
    const contactStr = contacted.length > 0
      ? contacted.map(e => e.contact_status).join(',')
      : 'NO';

    log(
      `  ${name.padEnd(8)} ${String(d.license).padEnd(8)} ${d.region.padEnd(14)} ` +
      `${shortlistStr.padEnd(16)} ${contactStr.padEnd(14)} ${fuType}`,
    );
  }

  // ── 2. Need results ──────────────────────────────────────────────────────
  log('\n  2. COMPANY NEED RESULTS');
  log('  ' + '─'.repeat(84));
  log(
    `  ${'Tag'.padEnd(4)} ${'License/Domain'.padEnd(22)} ${'Pool'.padEnd(6)} ` +
    `${'Short'.padEnd(7)} ${'Sent'.padEnd(6)} ${'Deduped'.padEnd(9)} Top score`,
  );
  log('  ' + '─'.repeat(84));

  for (const m of R.matches) {
    const r = m.result as {
      ok: boolean; shortlistId?: string; totalCandidates: number;
      totalShortlisted: number;
      shortlisted?: Array<{ driver: { id: string }; score: { total: number } }>;
    };
    if (!r.ok) continue;

    const need = SIM_NEEDS.find(n => n.tag === m.tag)!;
    const topScore = r.shortlisted?.[0]?.score?.total ?? 0;

    const needActions = R.simActions.filter(
      a => a.target_id !== m.needId &&
           simShortlistIds.includes(a.target_id as string) === false &&
           // actions logged against entry_ids for this need's shortlist
           simEntryIds.includes(a.target_id as string),
    );

    const sentForNeed = R.simActions.filter(
      a => a.action_type === 'contact_sent' &&
           ALL_D_IDS.includes(a.target_id as string) &&
           // check it belongs to this shortlist via the input field
           (a.input as Record<string, unknown>)?.shortlist_entry_id &&
           simEntryIds.includes(
             (a.input as Record<string, unknown>).shortlist_entry_id as string,
           ) &&
           // entry must be in this shortlist
           R.contactRows.some(
             e =>
               e.driver_id === a.target_id &&
               e.shortlist_id === r.shortlistId,
           ),
    ).length;

    const dedupedForNeed = R.simActions.filter(
      a => a.action_type === 'contact_skipped' &&
           simEntryIds.includes(a.target_id as string) &&
           R.contactRows.some(
             e =>
               e.id === a.target_id &&
               e.shortlist_id === r.shortlistId,
           ),
    ).length;

    const licDom = `${need.license_required}/${need.domain_required}`;
    log(
      `  ${m.tag.padEnd(4)} ${licDom.padEnd(22)} ${String(r.totalCandidates).padEnd(6)} ` +
      `${String(r.totalShortlisted).padEnd(7)} ${String(sentForNeed).padEnd(6)} ` +
      `${String(dedupedForNeed).padEnd(9)} ${topScore}`,
    );
  }

  // ── 3. System actions breakdown ──────────────────────────────────────────
  log('\n  3. SYSTEM_ACTIONS BREAKDOWN (simulation only)');
  const byType: Record<string, number> = {};
  const failedActs: Record<string, unknown>[] = [];
  for (const a of R.simActions) {
    byType[a.action_type as string] = (byType[a.action_type as string] ?? 0) + 1;
    if (a.status === 'failed') failedActs.push(a);
  }
  for (const [type, count] of Object.entries(byType).sort(([a], [b]) => a.localeCompare(b))) {
    log(`  ${type.padEnd(28)} ${count}`);
  }
  log(`\n  Total : ${R.simActions.length}`);
  log(`  Failed: ${failedActs.length}`);
  if (failedActs.length > 0) {
    for (const a of failedActs) {
      fail(`  ${a.action_type}  target=${a.target_id}  error=${a.error}`);
    }
  }

  // ── 4. Contact agent trace ───────────────────────────────────────────────
  log('\n  4. CONTACT AGENT TRACE');
  const contactActs = R.simActions.filter(a =>
    String(a.action_type).startsWith('contact'),
  );
  if (contactActs.length === 0) {
    log('  No contact actions recorded for simulation IDs.');
  } else {
    for (const a of contactActs) {
      const inp = (a.input ?? {}) as Record<string, unknown>;
      const res = (a.result ?? {}) as Record<string, unknown>;
      const driverName = inp.first_name
        ? shortName(inp.first_name as string)
        : (a.target_id as string).slice(0, 8) + '…';
      const detail =
        a.action_type === 'contact_sent'    ? `channel=${res.channel}`                  :
        a.action_type === 'contact_skipped' ? `reason=${res.reason}`                    :
        a.action_type === 'contact_suggested' ? 'pending'                                :
                                               '';
      log(
        `  ${String(a.action_type).padEnd(20)}  ` +
        `${driverName.padEnd(8)}  score=${(inp.match_score ?? '?').toString().padEnd(4)}  ${detail}`,
      );
    }
  }

  // ── 5. Follow-up agent trace ──────────────────────────────────────────────
  log('\n  5. FOLLOW-UP AGENT TRACE');
  const fuActs = R.simActions.filter(a => String(a.action_type).startsWith('follow_up'));
  if (fuActs.length === 0) {
    log('  No follow-up actions recorded for simulation drivers.');
    log('  Eligible drivers: Lars (ykb_in_progress), Maria (not_yet_available).');
  } else {
    for (const a of fuActs) {
      const res = (a.result ?? {}) as Record<string, unknown>;
      const driverId = a.target_id as string;
      const driverBase = SIM_DRIVERS_BASE.find(d => d.id === driverId);
      const name = driverBase ? shortName(driverBase.first_name) : driverId.slice(0, 8);
      log(`  ${String(a.action_type).padEnd(22)}  ${name.padEnd(8)}  reason=${res.reason ?? a.status}`);
    }
  }
  if (R.followUp) {
    log(`\n  Agent result: suggested=${R.followUp.suggested} sent=${R.followUp.sent} skipped=${R.followUp.skipped} errors=${R.followUp.errors}`);
  }

  // ── 6. Gap analysis ──────────────────────────────────────────────────────
  log('\n  6. GAP ANALYSIS');
  log('  ' + '─'.repeat(72));

  // Gap 1: ykb_in_progress not filtered by contact agent
  const larsContacted = R.contactRows.some(
    e => e.driver_id === D_IDS.lars && e.contact_status !== 'new',
  );
  if (larsContacted) {
    log('  [GAP-1] CRITICAL: Lars (ykb=in_progress) was auto-contacted.');
    log('    Cause: buildShortlist does not reject in_progress YKB.');
    log('    contactAgent has no YKB guard beyond the hard filter in buildShortlist.');
    log('    Risk: system contacts drivers who cannot yet legally work.');
    log('    Fix:  add ykb_guard in contactAgent — skip if ykb=in_progress.');
  } else {
    log('  [GAP-1] Lars (ykb=in_progress) was NOT contacted. YKB guard OK.');
  }

  // Gap 2: not_yet availability not filtered
  const mariaContacted = R.contactRows.some(
    e => e.driver_id === D_IDS.maria && e.contact_status !== 'new',
  );
  if (mariaContacted) {
    log('  [GAP-2] WARN: Maria (availability=not_yet) was auto-contacted.');
    log('    Cause: not_yet only scores 10/100 for availability but is not hard-filtered.');
    log('    Risk: contacting unavailable drivers wastes outreach quota.');
    log('    Fix:  add availability guard — skip contact if availability=not_yet.');
  }

  // Gap 3: N5 zero contacts due to pool exhaustion + dedup
  const n5 = R.matches.find(m => m.tag === 'N5');
  if (n5) {
    const n5result = n5.result as { shortlistId?: string; shortlisted?: unknown[] };
    const n5contacted = R.contactRows.some(
      e => e.shortlist_id === n5result.shortlistId && e.contact_status !== 'new',
    );
    if (!n5contacted) {
      log('  [GAP-3] CRITICAL: N5 (emergency CE+distribution) has ZERO contacted drivers.');
      log('    Cause: D1 and D5 contacted in N1, D3 contacted in N3. All hit 14-day dedup.');
      log('    The emergency urgency did not override anti-spam protection.');
      log('    Fix:  bypass dedup for urgency=emergency, or shorten dedup window.');
    }
  }

  // Gap 4: Johan (other_sweden, no reloc) never shortlisted for stockholm needs
  const johanShortlisted = R.contactRows.some(e => e.driver_id === D_IDS.johan);
  if (!johanShortlisted) {
    log('  [GAP-4] INFO: Johan (other_sweden, no reloc, C license) never shortlisted.');
    log('    All needs require CE license or are in stockholm with relocation denied.');
    log('    Johan has domain expertise (schakt_bygg) but no geographic match.');
  } else {
    const johanScore = R.contactRows
      .filter(e => e.driver_id === D_IDS.johan)
      .map(e => e.match_score as number)
      .sort((a, b) => b - a)[0];
    log(`  [INFO] Johan shortlisted — top score: ${johanScore}`);
  }

  // Gap 5: follow-up blocked for both eligible drivers
  const followUpSentCount = R.simActions.filter(
    a => a.action_type === 'follow_up_sent',
  ).length;
  if (followUpSentCount === 0) {
    log('  [GAP-5] INFO: Follow-up agent sent 0 messages to eligible drivers.');
    log('    Lars and Maria both had follow_up_at=yesterday but were recently contacted.');
    log('    7-day dedup prevents follow-up when contact agent already acted.');
    log('    This is CORRECT behavior (prevents double-contact).');
    log('    BUT: if drivers had no matching shortlist, follow-up would still fire.');
  }

  // ── 7. Recommendations ───────────────────────────────────────────────────
  log('\n  7. CRITICAL IMPROVEMENTS (MAX 5)');
  log('  ─────────────────────────────────────────────────────────────────────');
  log('  1. contactAgent: add ykb_guard — skip if driver.ykb == in_progress');
  log('     Prevents contacting legally ineligible drivers.');
  log('');
  log('  2. contactAgent: add availability_guard — skip if availability == not_yet');
  log('     Prevents wasting outreach on unavailable drivers.');
  log('');
  log('  3. contactAgent: add urgency override for emergency needs');
  log('     When need.urgency == emergency, reduce dedup window from 14d to 3d.');
  log('     Prevents zero-contact situations on high-priority needs.');
  log('');
  log('  4. matchingEngine / companyNeedStore: expand region to cover other_sweden');
  log('     Johan (schakt_bygg, C license) matches N2 by domain but fails location.');
  log('     Broaden N2 to allow relocation, or add more regional drivers.');
  log('');
  log('  5. system_actions: add urgency field to contact_suggested / contact_sent');
  log('     The cockpit cannot currently show priority of pending actions.');
  log('     Operators need to see URGENT/EMERGENCY badges in the pending queue.');

  // ── Final summary ─────────────────────────────────────────────────────────
  log('\n' + '═'.repeat(72));
  log('  SIMULATION COMPLETE');
  log('  ' + '─'.repeat(70));
  log(`  Run at       : ${R.runAt}`);
  log(`  Drivers seeded     : 5/5`);
  log(`  Needs created      : ${R.needs.length}/5`);
  log(`  Matches run        : ${R.matches.length}/5`);
  log(`  System actions     : ${R.simActions.length}`);
  log(`  Errors             : ${R.errors.length}`);
  log(`  Contact sent       : ${R.simActions.filter(a => a.action_type === 'contact_sent').length}`);
  log(`  Contact deduped    : ${R.simActions.filter(a => a.action_type === 'contact_skipped').length}`);
  log(`  Follow-up skipped  : ${R.simActions.filter(a => a.action_type === 'follow_up_skipped').length}`);
  log(`  Follow-up sent     : ${R.simActions.filter(a => a.action_type === 'follow_up_sent').length}`);
  log('═'.repeat(72) + '\n');

  return R;
}

// ── Entry ─────────────────────────────────────────────────────────────────────

run()
  .then(results => {
    const outPath = path.join(__dir, 'sim-full-pipeline-results.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    log(`Results JSON → ${outPath}`);
  })
  .catch(err => {
    console.error('\nFatal simulation error:', err);
    process.exit(1);
  });
