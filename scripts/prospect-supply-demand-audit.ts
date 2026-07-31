// scripts/prospect-supply-demand-audit.ts
// READ-ONLY: audits supply clusters vs. company targets for prospecting expansion.
// Usage: npx tsx --env-file=.env.local scripts/prospect-supply-demand-audit.ts
//
// Writes nothing to the database.

import { createClient } from '@supabase/supabase-js';

const url  = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db   = createClient(url, key, { auth: { persistSession: false } });

// ─── Supply ───────────────────────────────────────────────────────────────────

async function getCleanDrivers() {
  // Get all ingested real drivers first
  const { data: drivers, error } = await db
    .from('ingested_drivers')
    .select('id, license, domain, region, availability, ykb, driver_card, simulation')
    .eq('simulation', false);
  if (error) { console.error('Driver query error:', error.message); return []; }

  // Get blocked driver ids from DQ actions
  const { data: dqRows } = await db
    .from('system_actions')
    .select('target_id')
    .eq('action_type', 'data_quality_issue');
  const { data: dupRows } = await db
    .from('system_actions')
    .select('input')
    .eq('action_type', 'driver_duplicate_detected');

  const dqIds  = new Set((dqRows ?? []).map((r: Record<string,unknown>) => r.target_id as string).filter(Boolean));
  const dupIds = new Set(
    (dupRows ?? []).map((r: Record<string,unknown>) => {
      const inp = (r.input ?? {}) as Record<string,unknown>;
      return inp.new_id as string;
    }).filter(Boolean)
  );
  const blockedIds = new Set([...dqIds, ...dupIds]);

  return (drivers ?? []).filter(d => !blockedIds.has(d.id));
}

// ─── Demand ───────────────────────────────────────────────────────────────────

async function getActiveNeeds() {
  const { data, error } = await db
    .from('company_needs')
    .select('id, company_id, need_type, license_required, domain_required, location_region, urgency, companies(name)')
    .eq('status', 'open');
  if (error) { console.error('Active needs error:', error.message); return []; }
  // Filter out simulation/test need types in-app
  return (data ?? []).filter((n: Record<string,unknown>) =>
    n.need_type !== 'simulation_only' && n.need_type !== 'archived_test'
  );
}

async function getDrafts() {
  const { data, error } = await db
    .from('company_need_drafts')
    .select('id, draft_status, target_id, license_required, domain_required, location_region, urgency, missing_fields, rejection_reason, updated_at')
    .neq('draft_status', 'rejected')
    .order('updated_at', { ascending: false });
  if (error) { console.error('Drafts error:', error.message); return []; }
  return data ?? [];
}

async function getResearchTargets() {
  const { data, error } = await db
    .from('company_research_targets')
    .select('id, company_name, contact_email, phone, decision_maker_name, license_mentions, transport_domain');
  if (error) { console.error('Research targets error:', error.message); return []; }
  return data ?? [];
}

async function getPilotRelationships() {
  const { data, error } = await db
    .from('pilot_company_relationships')
    .select('target_id, relationship_status, do_not_contact_reason, next_action_date, pilot_scope_notes');
  if (error) { console.error('Pilot relationships error:', error.message); return []; }
  return data ?? [];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  DriverNord — Prospect Supply/Demand Audit (READ-ONLY)');
  console.log('  Date:', new Date().toISOString());
  console.log('══════════════════════════════════════════════════════════════\n');

  const [drivers, activeNeeds, drafts, targets, pilotRels] = await Promise.all([
    getCleanDrivers(),
    getActiveNeeds(),
    getDrafts(),
    getResearchTargets(),
    getPilotRelationships(),
  ]);

  type Cluster = Record<string, number>;

  // ─── Supply analysis ──────────────────────────────────────────────────────

  console.log('━━━ SUPPLY: Clean Driver Pool Clusters ━━━\n');
  console.log(`Total clean real drivers: ${drivers.length}`);

  const byLicense: Cluster = {};
  const byDomain:  Cluster = {};
  const byRegion:  Cluster = {};
  const byAvail:   Cluster = {};
  const clusterLicDom: Cluster = {};

  for (const d of drivers) {
    const lic = d.license      ?? 'unknown';
    const dom = d.domain       ?? 'unknown';
    const reg = d.region       ?? 'unknown';
    const avl = d.availability ?? 'unknown';
    byLicense[lic]          = (byLicense[lic]       ?? 0) + 1;
    byDomain[dom]           = (byDomain[dom]        ?? 0) + 1;
    byRegion[reg]           = (byRegion[reg]        ?? 0) + 1;
    byAvail[avl]            = (byAvail[avl]         ?? 0) + 1;
    clusterLicDom[`${lic}/${dom}`] = (clusterLicDom[`${lic}/${dom}`] ?? 0) + 1;
    // CE+D counts as CE capability too
    if (lic === 'CE+D') {
      clusterLicDom[`CE/${dom}`] = (clusterLicDom[`CE/${dom}`] ?? 0) + 1;
    }
  }

  console.log('\nBy License:');
  for (const [k, v] of Object.entries(byLicense).sort((a,b) => b[1]-a[1]))
    console.log(`  ${k.padEnd(10)} ${v}`);
  console.log('\nBy Domain:');
  for (const [k, v] of Object.entries(byDomain).sort((a,b) => b[1]-a[1]))
    console.log(`  ${k.padEnd(18)} ${v}`);
  console.log('\nBy Region:');
  for (const [k, v] of Object.entries(byRegion).sort((a,b) => b[1]-a[1]))
    console.log(`  ${k.padEnd(18)} ${v}`);
  console.log('\nBy Availability:');
  for (const [k, v] of Object.entries(byAvail).sort((a,b) => b[1]-a[1]))
    console.log(`  ${k.padEnd(18)} ${v}`);

  console.log('\nTop License/Domain Clusters (all):');
  for (const [k, v] of Object.entries(clusterLicDom).sort((a,b) => b[1]-a[1]).slice(0,16))
    console.log(`  ${k.padEnd(26)} ${v}`);

  const nowDrivers = drivers.filter(d => d.availability === 'now');
  const nowClusters: Cluster = {};
  for (const d of nowDrivers) {
    const k = `${d.license ?? 'unknown'}/${d.domain ?? 'unknown'}`;
    nowClusters[k] = (nowClusters[k] ?? 0) + 1;
  }
  console.log('\nClusters available NOW only:');
  for (const [k, v] of Object.entries(nowClusters).sort((a,b) => b[1]-a[1]))
    console.log(`  ${k.padEnd(26)} ${v}`);

  // ─── Demand analysis ──────────────────────────────────────────────────────

  console.log('\n\n━━━ DEMAND: Active Company Needs ━━━\n');
  for (const n of activeNeeds) {
    const co = n.companies as { name?: string } | null;
    console.log(`  [ACTIVE] ${(co?.name ?? n.company_id ?? '?').toString().padEnd(38)} | ${n.license_required}/${n.domain_required} | ${n.urgency}`);
  }
  if (!activeNeeds.length) console.log('  (none)');

  console.log('\n\n━━━ DEMAND: Company Need Drafts ━━━\n');
  // Fetch target names for drafts
  const draftTargetIds = [...new Set(drafts.map(d => d.target_id as string).filter(Boolean))];
  let draftTargetNames: Map<string, string> = new Map();
  if (draftTargetIds.length > 0) {
    const { data: tns } = await db.from('company_research_targets').select('id, company_name').in('id', draftTargetIds);
    draftTargetNames = new Map((tns ?? []).map((t: Record<string,unknown>) => [t.id as string, t.company_name as string]));
  }

  for (const d of drafts) {
    const name    = draftTargetNames.get(d.target_id as string) ?? '(unknown target)';
    const missing = Array.isArray(d.missing_fields) ? (d.missing_fields as string[]).join(', ') : '';
    console.log(`  [${(d.draft_status as string).toUpperCase().padEnd(24)}] ${name.padEnd(38)} | ${d.license_required ?? '?'}/${d.domain_required ?? '?'} | ${d.urgency ?? 'std'} | missing=[${missing}]`);
  }
  if (!drafts.length) console.log('  (none)');

  console.log('\n\n━━━ DEMAND: All Research Targets (scored) ━━━\n');
  const pilotRelMap = new Map(pilotRels.map(p => [p.target_id as string, p]));

  for (const t of targets) {
    const pr     = pilotRelMap.get(t.id as string);
    const status = pr ? ` | PILOT:${(pr.relationship_status as string)}` : '';
    const dnc    = pr?.do_not_contact_reason ? ` [DNC:${pr.do_not_contact_reason}]` : '';
    const lic    = Array.isArray(t.license_mentions) ? (t.license_mentions as string[]).join('+') : (t.license_mentions ?? '?');
    const dom    = Array.isArray(t.transport_domain) ? (t.transport_domain as string[]).join('+') : (t.transport_domain ?? '?');
    console.log(`  ${String(t.company_name ?? '(unnamed)').padEnd(40)} | ${lic}/${dom}${status}${dnc}`);
    if (t.contact_email || t.decision_maker_name) {
      console.log(`    contact: ${t.decision_maker_name ?? '?'} <${t.contact_email ?? '?'}> ${t.phone ?? ''}`);
    }
  }
  if (!targets.length) console.log('  (none)');

  // ─── Crossmatch ───────────────────────────────────────────────────────────

  console.log('\n\n━━━ CROSSMATCH: Readiness vs. Research Targets ━━━\n');
  console.log('  READY     = 3+ clean drivers matching need');
  console.log('  THIN      = 1–2 clean drivers matching');
  console.log('  ADJACENT  = no exact match, but CE/fjarrtransport adjacent');
  console.log('  GAP       = 0 matching supply\n');

  // Use drafts for crossmatch since research targets have no lifecycle/score
  for (const d of drafts) {
    const name = draftTargetNames.get(d.target_id as string) ?? '(unknown)';
    const pr   = pilotRels.find(p => {
      const rel = pilotRelMap.get(p.target_id as string);
      return rel && draftTargetNames.get(p.target_id as string) === name;
    });
    if (pr?.do_not_contact_reason) continue;

    const lic  = (d.license_required ?? 'CE') as string;
    const dom  = (d.domain_required  ?? 'unknown') as string;

    const exact    = clusterLicDom[`${lic}/${dom}`] ?? 0;
    const ceAdj    = clusterLicDom['CE/fjarrtransport'] ?? 0;
    const ceDist   = clusterLicDom['CE/distribution']   ?? 0;
    const adjacent = exact === 0 ? Math.max(ceAdj, ceDist) : 0;

    const readiness =
      exact   >= 3 ? 'READY    ' :
      exact   >= 1 ? 'THIN     ' :
      adjacent > 0 ? 'ADJACENT ' :
                     'GAP      ';

    const already = pr ? `[pilot:${pr.relationship_status}]` : '';
    const status  = d.draft_status as string;
    console.log(`  ${readiness} exact=${exact} adj=${adjacent} | ${name.padEnd(40)} | ${lic}/${dom} [${status}] ${already}`);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  console.log('\n\n━━━ SUMMARY ━━━\n');
  const contacted   = pilotRels.filter(p => (p.relationship_status as string) === 'contacted').length;
  const dnc         = pilotRels.filter(p => p.do_not_contact_reason).length;
  console.log(`  Clean real drivers:        ${drivers.length}`);
  console.log(`  Available NOW:             ${nowDrivers.length}`);
  console.log(`  Research targets:          ${targets.length}`);
  console.log(`  Non-rejected drafts:       ${drafts.length}`);
  console.log(`  Active company needs:      ${activeNeeds.length}`);
  console.log(`  Pilot rels tracked:        ${pilotRels.length}`);
  console.log(`    - status=contacted:      ${contacted}`);
  console.log(`    - do_not_contact:        ${dnc}`);

  console.log('\n  Top supply clusters:');
  for (const [k, v] of Object.entries(clusterLicDom).sort((a,b) => b[1]-a[1]).slice(0,10))
    console.log(`    ${k.padEnd(26)} ${v} drivers`);

  console.log('\n══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
