// scripts/batch1-company-detail.ts
// READ-ONLY: pulls full detail on 5 Batch 1 companies + supply crossmatch.
// Usage: npx tsx --env-file=.env.local scripts/batch1-company-detail.ts

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db  = createClient(url, key, { auth: { persistSession: false } });

const BATCH1_NAMES = [
  'Transportfirma Trabé',
  'Diamond Express Åkeri AB',
  'Alexis Bud & Transport AB',
  'Haninge Åkeri AB',
  'Sjölander Maskintransport AB',
];

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Batch 1 Company Detail — READ-ONLY');
  console.log('  Date:', new Date().toISOString());
  console.log('══════════════════════════════════════════════════════\n');

  // ─── Research targets ─────────────────────────────────────────────────────

  const { data: targets, error: terr } = await db
    .from('company_research_targets')
    .select('id, company_name, contact_email, phone, decision_maker_name, license_mentions, transport_domain');

  if (terr) { console.error('Targets error:', terr.message); }

  const batch1 = (targets ?? []).filter((t: Record<string,unknown>) =>
    BATCH1_NAMES.some(name =>
      (t.company_name as string ?? '').toLowerCase().includes(name.toLowerCase().split(' ')[0])
    )
  );

  console.log('━━━ Research Targets for Batch 1 ━━━\n');
  for (const t of targets ?? []) {
    if (!BATCH1_NAMES.some(n => (t.company_name as string ?? '').toLowerCase().includes(n.toLowerCase().split(' ')[0]))) continue;
    const lic = Array.isArray(t.license_mentions) ? (t.license_mentions as string[]).join(', ') : (t.license_mentions ?? '?');
    const dom = Array.isArray(t.transport_domain)  ? (t.transport_domain  as string[]).join(', ') : (t.transport_domain  ?? '?');
    console.log(`Company:      ${t.company_name}`);
    console.log(`  ID:         ${t.id}`);
    console.log(`  License:    ${lic}`);
    console.log(`  Domain:     ${dom}`);
    console.log(`  Contact:    ${t.decision_maker_name ?? '(unknown)'}`);
    console.log(`  Email:      ${t.contact_email ?? '(missing)'}`);
    console.log(`  Phone:      ${t.phone ?? '(missing)'}`);
    console.log('');
  }

  // ─── Pilot relationships ─────────────────────────────────────────────────

  const targetIds = (targets ?? [])
    .filter((t: Record<string,unknown>) =>
      BATCH1_NAMES.some(n => (t.company_name as string ?? '').toLowerCase().includes(n.toLowerCase().split(' ')[0]))
    )
    .map((t: Record<string,unknown>) => t.id as string);

  if (targetIds.length > 0) {
    const { data: rels, error: rerr } = await db
      .from('pilot_company_relationships')
      .select('target_id, relationship_status, do_not_contact_reason, first_email_sent_at, pilot_scope_notes')
      .in('target_id', targetIds);

    if (rerr) console.error('Pilot rels error:', rerr.message);

    if (rels && rels.length > 0) {
      console.log('━━━ Pilot Relationships (existing) ━━━\n');
      for (const r of rels) {
        const t = (targets ?? []).find((x: Record<string,unknown>) => x.id === r.target_id);
        console.log(`${t?.company_name ?? r.target_id}: status=${r.relationship_status}, DNC=${r.do_not_contact_reason ?? 'none'}, first_email=${r.first_email_sent_at ?? 'not sent'}`);
      }
    } else {
      console.log('━━━ Pilot Relationships: none for Batch 1 companies ━━━\n');
    }
  }

  // ─── Supply clusters ──────────────────────────────────────────────────────

  console.log('\n━━━ Relevant Supply Clusters ━━━\n');

  const { data: dqRows }  = await db.from('system_actions').select('target_id').eq('action_type', 'data_quality_issue');
  const { data: dupRows } = await db.from('system_actions').select('input').eq('action_type', 'driver_duplicate_detected');
  const dqIds  = new Set((dqRows  ?? []).map((r: Record<string,unknown>) => r.target_id as string).filter(Boolean));
  const dupIds = new Set((dupRows ?? []).map((r: Record<string,unknown>) => {
    const inp = (r.input ?? {}) as Record<string,unknown>;
    return inp.new_id as string;
  }).filter(Boolean));
  const blockedIds = new Set([...dqIds, ...dupIds]);

  const { data: allDrivers } = await db
    .from('ingested_drivers')
    .select('id, license, domain, region, availability, ykb, driver_card')
    .eq('simulation', false);

  const cleanDrivers = (allDrivers ?? []).filter((d: Record<string,unknown>) => !blockedIds.has(d.id as string));

  type Cluster = { count: number; nowCount: number };
  const clusters: Record<string, Cluster> = {};
  for (const d of cleanDrivers) {
    const lic = (d.license ?? 'unknown') as string;
    const dom = (d.domain  ?? 'unknown') as string;
    const avl = (d.availability ?? '') as string;
    const key = `${lic}/${dom}`;
    if (!clusters[key]) clusters[key] = { count: 0, nowCount: 0 };
    clusters[key].count++;
    if (avl === 'now') clusters[key].nowCount++;
    // CE+D also counts as CE
    if (lic === 'CE+D') {
      const ceKey = `CE/${dom}`;
      if (!clusters[ceKey]) clusters[ceKey] = { count: 0, nowCount: 0 };
      clusters[ceKey].count++;
      if (avl === 'now') clusters[ceKey].nowCount++;
    }
  }

  const relevantClusters = [
    'CE/distribution', 'C/distribution',
    'CE/schakt_bygg', 'C/schakt_bygg',
    'CE/fjarrtransport', 'CE/kran',
    'CE/adr', 'CE+D/adr',
  ];

  for (const ck of relevantClusters) {
    const cl = clusters[ck];
    if (cl) {
      console.log(`  ${ck.padEnd(22)} total=${cl.count}  available_now=${cl.nowCount}`);
    }
  }

  // Per-cluster top scores from shortlists
  console.log('\n━━━ Known Top Driver Scores per Cluster ━━━\n');
  console.log('  (from existing shortlist entries — only scored candidates shown)');

  const { data: entries } = await db
    .from('shortlist_entries')
    .select('driver_id, match_score')
    .order('match_score', { ascending: false });

  const driverScoreMap = new Map<string, number>();
  for (const e of entries ?? []) {
    const prev = driverScoreMap.get(e.driver_id as string) ?? 0;
    if ((e.match_score as number) > prev) driverScoreMap.set(e.driver_id as string, e.match_score as number);
  }

  // Get domains for scored drivers
  const scoredIds = [...driverScoreMap.keys()];
  if (scoredIds.length > 0) {
    const { data: scoredDrivers } = await db
      .from('ingested_drivers')
      .select('id, license, domain, region, availability')
      .in('id', scoredIds)
      .eq('simulation', false);

    const scored = (scoredDrivers ?? [])
      .filter((d: Record<string,unknown>) => !blockedIds.has(d.id as string))
      .map((d: Record<string,unknown>) => ({
        license:      d.license as string,
        domain:       d.domain  as string,
        region:       d.region  as string,
        availability: d.availability as string,
        score:        driverScoreMap.get(d.id as string) ?? 0,
      }))
      .sort((a, b) => b.score - a.score);

    for (const d of scored.slice(0, 12)) {
      const blocked = blockedIds.has(d.region) ? ' [BLOCKED]' : '';
      console.log(`  score=${d.score}  ${(d.license ?? '?').padEnd(6)} ${(d.domain ?? '?').padEnd(18)} ${d.region ?? '?'}  avail=${d.availability}${blocked}`);
    }
  }

  console.log('\n══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
