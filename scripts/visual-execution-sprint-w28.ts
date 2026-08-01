// scripts/visual-execution-sprint-w28.ts
//
// Visual Execution Sprint V1 — applies polished execution packages to the four
// W28 Phase 4 dry-run cards in production Supabase.
//
// Run from the project root: npx tsx scripts/visual-execution-sprint-w28.ts
//
// BOUNDARIES:
//   ✗ Does NOT connect Facebook, Meta, or any image API
//   ✗ Does NOT publish anything externally
//   ✗ Does NOT alter Supabase schema
//   ✗ Does NOT delete or overwrite W27 cards
//   ✓ Updates visual_plan JSONB only on Phase 4 W28 dry-run cards
//   ✓ Reads .env.local for DB credentials (never exposed)

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ─── Load env ─────────────────────────────────────────────────────────────────

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)/);
  if (m) process.env[m[1]!.trim()] = m[2]!.trim().replace(/^['"]|['"]$/g, '');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

// ─── Import execution packages ─────────────────────────────────────────────────

import { W28_EXECUTION_PACKAGES } from '../lib/content/visualExecutionPackages.js';

// ─── Main ─────────────────────────────────────────────────────────────────────

const SPRINT_TAG = 'dry_run_phase4_proven_reference_2026_W28';
const WEEK = '2026-W28';

async function main() {
  console.log('=== Visual Execution Sprint V1 — W28 Phase 4 ===');
  console.log(`Tag:  ${SPRINT_TAG}`);
  console.log(`Week: ${WEEK}`);
  console.log('');

  // 1. Fetch Phase 4 cards
  const { data: cards, error: fetchErr } = await db
    .from('content_campaign_cards')
    .select('id, planned_day_of_week, content_pillar, creative_angle, visual_plan')
    .eq('planned_week', WEEK)
    .eq('created_by', SPRINT_TAG)
    .order('planned_day_of_week', { ascending: true });

  if (fetchErr || !cards) {
    console.error('ERROR fetching W28 Phase 4 cards:', fetchErr?.message);
    process.exit(1);
  }

  console.log(`Found ${cards.length} Phase 4 cards:`);
  for (const c of cards) {
    console.log(`  Day ${c.planned_day_of_week}: ${c.content_pillar}/${c.creative_angle} [${c.id.slice(0, 8)}]`);
  }
  console.log('');

  if (cards.length === 0) {
    console.error('ERROR: No Phase 4 cards found. Has the phase4 dry-run been executed?');
    process.exit(1);
  }

  // 1b. Safety guard: abort if any day has more than one tagged candidate.
  //     A Sprint package must map to exactly one card. If duplicates exist
  //     (same created_by + same day), the mapping is ambiguous and the script
  //     must not proceed automatically.
  const daysSeen = new Map<number, string[]>();
  for (const c of cards) {
    const d = c.planned_day_of_week as number;
    const ids = daysSeen.get(d) ?? [];
    ids.push(c.id as string);
    daysSeen.set(d, ids);
  }
  const duplicateDays: number[] = [];
  for (const [day, ids] of daysSeen.entries()) {
    if (ids.length > 1) duplicateDays.push(day);
  }
  if (duplicateDays.length > 0) {
    console.error(
      `ERROR: Multiple cards with tag "${SPRINT_TAG}" found for day(s): ${duplicateDays.join(', ')}.\n` +
      `Sprint packages cannot be applied automatically when day-slot is ambiguous.\n` +
      `Supply explicit card IDs or remove the duplicate cards before re-running.`
    );
    process.exit(1);
  }

  // 2. Apply packages
  const results: { day: number; id: string; ok: boolean; err?: string }[] = [];

  for (const card of cards) {
    const day = card.planned_day_of_week as number;
    const pkg = W28_EXECUTION_PACKAGES[day];

    if (!pkg) {
      console.warn(`  SKIP Day ${day}: no execution package defined`);
      results.push({ day, id: card.id as string, ok: false, err: 'No package for this day' });
      continue;
    }

    // Merge sprint_execution into existing visual_plan
    const existingPlan = (card.visual_plan as Record<string, unknown>) ?? {};
    const updatedPlan = {
      ...existingPlan,
      sprint_execution: {
        ...pkg,
        applied_at: new Date().toISOString(),
      },
    };

    const { error: updateErr } = await db
      .from('content_campaign_cards')
      .update({
        visual_plan: updatedPlan,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', card.id)
      .eq('created_by', SPRINT_TAG); // safety: only update sprint cards

    if (updateErr) {
      console.error(`  ERROR Day ${day} [${card.id.slice(0, 8)}]:`, updateErr.message);
      results.push({ day, id: card.id as string, ok: false, err: updateErr.message });
    } else {
      console.log(`  OK Day ${day} (${pkg.day_label}) [${card.id.slice(0, 8)}]: sprint_execution applied`);
      results.push({ day, id: card.id as string, ok: true });
    }
  }

  console.log('');

  // 3. Summary
  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;

  console.log(`=== Sprint V1 complete: ${ok} applied, ${fail} failed ===`);

  if (fail > 0) {
    for (const r of results.filter(x => !x.ok)) {
      console.error(`  Day ${r.day}: ${r.err}`);
    }
    process.exit(1);
  }

  console.log('');
  console.log('Founder review path:');
  console.log('  1. Open https://drivernord.com/admin/content');
  console.log('  2. Select week 2026-W28');
  console.log('  3. Click "Ladda vecka"');
  console.log('  4. Expand each Dry-run card (indigo badge)');
  console.log('  5. In "Visuell plan" section — plan loads automatically');
  console.log('  6. See execution brief, polished SVG prototype, quality review');
  console.log('  7. Use visual feedback controls to signal quality judgement');
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
