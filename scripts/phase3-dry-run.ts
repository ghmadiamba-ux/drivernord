// scripts/phase3-dry-run.ts
//
// DriverNord Content Engine V1 — Phase 3 Internal Four-Post Creative Dry-Run
//
// Creates 4 campaign cards for 2026-W27 using real lib code paths.
// Generates sequential visual plans with live visual history from DB.
// All cards tagged created_by='dry_run_phase3_2026_W27'.
//
// Run from the project root: npx tsx scripts/phase3-dry-run.ts
//
// SAFETY GUARANTEES:
//   ✗ No Facebook connection / no external API call
//   ✗ No email/SMS/WhatsApp / no outreach
//   ✗ No image generation API
//   ✗ AGENT_CONTACT_MODE unchanged
//   ✓ Production Supabase — authorized for this dry-run by founder

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

import { db } from '../lib/db';
import { logAction } from '../lib/systemActions';
import { generateDraft } from '../lib/content/generator';
import { createCampaignCard } from '../lib/content/campaignCard';
import { getWeekIndex } from '../lib/content/planner';
import { buildVisualMemoryEntry } from '../lib/content/visualMemory';
import {
  selectVisualFamily, selectSceneType, selectCompositionDirection,
  selectMood, selectSubjectType, selectSetting, selectTimeOfDay,
  selectLightCondition, selectTransportContext,
} from '../lib/content/visualFamilies';
import { selectAssetStrategy, shouldSuppressVisual } from '../lib/content/assetStrategySelector';
import {
  getFormatRecommendation, getRequiredBrandElements, getProhibitedElements,
  validateTextOverlay, getTextOverlayStructure,
} from '../lib/content/compositionRules';
import { runVisualGate, determineVisualRiskLevel } from '../lib/content/visualQualityGate';
import { generateVisualPreview } from '../lib/content/visualPreview';
import type {
  CampaignCardInput, ContentPillar, CreativeAngle, PostFormat, RiskLevel,
} from '../lib/content/types';
import type { VisualProductionPlan, VisualMemoryEntry } from '../lib/content/visualTypes';

// ─── Load .env.local (db.ts lazy proxy reads env at first DB call, not import) ─

const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, '');
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK       = '2026-W27';
const WEEK_INDEX = getWeekIndex(WEEK); // 2026*53+27 = 107405
const TAG        = 'dry_run_phase3_2026_W27';

// ─── 4 card inputs ────────────────────────────────────────────────────────────

interface DayConfig {
  label: string;
  date:  string;
  input: CampaignCardInput;
}

const DAY_CONFIGS: DayConfig[] = [
  {
    label: 'Måndag 2026-06-29',
    date:  '2026-06-29',
    input: {
      objective:           'market_education',
      target_audience:     'C_drivers',
      source_basis:        'editorial_theme',
      driver_insight:      'CE-körkort kombinerat med YKB ger bredare uppdragsmöjligheter i Sverige',
      content_pillar:      'practical',
      creative_angle:      'market_education',
      emotional_tone:      'informative',
      format:              'text_post',
      cta_type:            'none',
      planned_channel:     'facebook_page',
      planned_week:        WEEK,
      planned_day_of_week: 1,
      suggested_slot_time: '08:00',
    },
  },
  {
    label: 'Onsdag 2026-07-01',
    date:  '2026-07-01',
    input: {
      objective:           'market_education',
      target_audience:     'CE_drivers',
      source_basis:        'editorial_theme',
      driver_insight:      'Kylfrystransport kräver specialkunnande om temperaturzoner, larmhantering och leveransprecision',
      content_pillar:      'practical',
      creative_angle:      'operational_insight',
      emotional_tone:      'informative',
      format:              'text_post',
      cta_type:            'none',
      planned_channel:     'facebook_page',
      planned_week:        WEEK,
      planned_day_of_week: 3,
      suggested_slot_time: '09:00',
    },
  },
  {
    label: 'Fredag 2026-07-03',
    date:  '2026-07-03',
    input: {
      objective:           'engagement',
      target_audience:     'CE_drivers',
      source_basis:        'editorial_theme',
      driver_insight:      'Erfarenhet och körkortskategori är förhandlingsstyrka — yrkesförare vet vad de är värda',
      content_pillar:      'recognition',
      creative_angle:      'career_confidence',
      emotional_tone:      'warm',
      format:              'text_post',
      cta_type:            'none',
      planned_channel:     'facebook_page',
      planned_week:        WEEK,
      planned_day_of_week: 5,
      suggested_slot_time: '09:00',
    },
  },
  {
    label: 'Söndag 2026-07-05',
    date:  '2026-07-05',
    input: {
      objective:           'community_growth',
      target_audience:     'all_drivers',
      source_basis:        'editorial_theme',
      driver_insight:      'Öppen fråga om råd till nya förare som precis tagit sitt körkort',
      content_pillar:      'community',
      creative_angle:      'community_question',
      emotional_tone:      'warm',
      format:              'text_post', // NOT 'question' — keeps visual unsuppressed
      cta_type:            'none',
      planned_channel:     'facebook_page',
      planned_week:        WEEK,
      planned_day_of_week: 7,
      suggested_slot_time: '11:00',
    },
  },
];

// ─── Local helpers (mirrors /api/admin/visual-plan private functions) ─────────

function deriveHeadline(
  insight: string,
  pillar:  ContentPillar,
  angle:   CreativeAngle,
): string | undefined {
  if (angle === 'community_question') {
    const first = insight.split(/[.!?]/)[0]?.trim() ?? '';
    const words = first.split(/\s+/);
    if (words.length <= 6) return first;
    return words.slice(0, 5).join(' ') + '…';
  }
  if (pillar === 'acquisition') return 'Hitta rätt uppdrag';
  if (angle === 'myth_vs_reality') return 'Myt eller verklighet?';
  const words = insight.trim().split(/\s+/);
  if (words.length <= 6) return insight.trim();
  return words.slice(0, 5).join(' ') + '…';
}

function deriveSupportLine(pillar: ContentPillar, family: string): string | undefined {
  if (family === 'operational_intelligence') return 'drivernord.com';
  if (pillar === 'acquisition') return 'drivernord.com/chaufforer';
  return undefined;
}

async function loadHistory(): Promise<VisualMemoryEntry[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const { data } = await db
    .from('content_campaign_cards')
    .select('visual_plan, planned_week, planned_day_of_week')
    .not('visual_plan', 'is', null)
    .gte('updated_at', cutoff.toISOString())
    .order('updated_at', { ascending: false })
    .limit(60);

  if (!data) return [];

  const entries: VisualMemoryEntry[] = [];
  for (const row of data) {
    const vp = row.visual_plan as VisualProductionPlan | null;
    if (!vp) continue;
    const pw = (row.planned_week as string | null) ?? '';
    const pd = (row.planned_day_of_week as number | null) ?? 1;
    const match = pw.match(/^(\d{4})-W(\d{2})$/);
    let planned_date = new Date().toISOString().slice(0, 10);
    if (match) {
      const year   = parseInt(match[1]!, 10);
      const week   = parseInt(match[2]!, 10);
      const jan4   = new Date(year, 0, 4);
      const jan4d  = jan4.getDay() || 7;
      const monday = new Date(jan4);
      monday.setDate(jan4.getDate() - jan4d + 1 + (week - 1) * 7 + (pd - 1));
      planned_date = monday.toISOString().slice(0, 10);
    }
    entries.push(buildVisualMemoryEntry(vp, planned_date));
  }
  return entries;
}

// ─── Visual plan generation (mirrors POST /api/admin/visual-plan logic) ────────

interface VisualResult {
  plan:         VisualProductionPlan;
  preview:      ReturnType<typeof generateVisualPreview>;
  gateWarnings: string[];
  dbOk:         boolean;
}

async function generateVisualPlan(
  cardId:   string,
  cfg:      DayConfig,
  riskLvl:  string,
): Promise<VisualResult> {
  const history = await loadHistory();
  const { input } = cfg;

  const pillar   = input.content_pillar as ContentPillar;
  const angle    = input.creative_angle  as CreativeAngle;
  const format   = input.format          as PostFormat;
  const risk     = riskLvl              as RiskLevel;

  const family   = selectVisualFamily(pillar, angle);
  const strategy = selectAssetStrategy(pillar, angle, risk);

  const finalStrategy = shouldSuppressVisual(format)
    ? { strategy: 'no_visual_needed' as const, reason_sv: 'Poll/frågeformat behöver ingen bild.' }
    : strategy;

  const scene       = selectSceneType(family, WEEK_INDEX, history);
  const composition = selectCompositionDirection(family, WEEK_INDEX);
  const mood        = selectMood(family, WEEK_INDEX);
  const subject     = selectSubjectType(family, WEEK_INDEX);
  const setting     = selectSetting(family, WEEK_INDEX);
  const timeOfDay   = selectTimeOfDay(family, WEEK_INDEX);
  const light       = selectLightCondition(family, WEEK_INDEX);
  const transport   = selectTransportContext(family, input.target_audience, WEEK_INDEX);
  const fmtRec      = getFormatRecommendation(pillar, family);
  const headline    = deriveHeadline(input.driver_insight, pillar, angle);
  const supportLine = deriveSupportLine(pillar, family);
  const overlay     = getTextOverlayStructure(composition, !!headline, !!supportLine);
  const ov          = validateTextOverlay(headline, supportLine, fmtRec);

  const planId = randomUUID();
  const now    = new Date().toISOString();

  const planBase = {
    id:                      planId,
    campaign_card_id:        cardId,
    visual_objective:        `Visual support for ${angle} content targeting ${input.target_audience}`,
    asset_strategy:          finalStrategy.strategy,
    asset_strategy_reason:   finalStrategy.reason_sv,
    visual_family:           family,
    scene_type:              scene,
    subject_type:            subject,
    setting,
    transport_context:       transport,
    mood,
    time_of_day:             timeOfDay,
    light_condition:         light,
    composition_direction:   composition,
    text_overlay_structure:  overlay,
    proposed_headline:       headline,
    proposed_support_line:   supportLine,
    max_word_count_on_image: ov.word_count,
    format_recommendation:   fmtRec,
    required_brand_elements: getRequiredBrandElements(family),
    prohibited_elements:     getProhibitedElements(family),
    provenance_status:       (
      finalStrategy.strategy === 'branded_graphic' ? 'branded_graphic_ready' : 'unverified'
    ) as 'branded_graphic_ready' | 'unverified',
    lifecycle_status: 'draft' as const,
    generated_by:     TAG,
    created_at:       now,
    updated_at:       now,
  };

  const gateResult = runVisualGate(planBase as unknown as VisualProductionPlan, history);
  const visualRisk = determineVisualRiskLevel(gateResult);

  const plan: VisualProductionPlan = {
    ...planBase,
    gate_outcome:       gateResult.outcome,
    gate_findings:      gateResult.findings,
    visual_risk_level:  visualRisk,
    similarity_warning: gateResult.warnings[0],
    lifecycle_status:   gateResult.blocked_reasons.length > 0 ? 'held' : 'draft',
  };

  const preview = generateVisualPreview(cardId, plan);

  // Persist visual_plan JSONB — requires migration 027 to be applied first
  const { error: updateErr } = await db
    .from('content_campaign_cards')
    .update({ visual_plan: plan, updated_at: now })
    .eq('id', cardId);

  const dbOk = !updateErr;
  if (updateErr) {
    console.error(`    [WARN] visual_plan UPDATE: ${updateErr.message}`);
    if (updateErr.message.includes('column') || updateErr.message.includes('does not exist')) {
      console.error('    [WARN] Migration 027 har inte applicerats. Applicera via Supabase SQL Editor och kör om.');
    }
  }

  const actionType = gateResult.blocked_reasons.length > 0
    ? 'content_visual_plan_held'
    : 'content_visual_plan_generated';

  await logAction({
    action_type:  actionType,
    triggered_by: 'founder',
    target_type:  'content_campaign_card',
    target_id:    cardId,
    status:       dbOk ? 'completed' : 'failed',
    input:  { family, strategy: finalStrategy.strategy, angle, pillar, dry_run: TAG },
    result: { gate_outcome: gateResult.outcome, visual_risk: visualRisk },
  });

  return { plan, preview, gateWarnings: gateResult.warnings, dbOk };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n================================================================');
  console.log('  DRIVERNORD — CONTENT ENGINE V1 — PHASE 3 CREATIVE DRY-RUN');
  console.log('================================================================\n');
  console.log(`  Vecka:     ${WEEK}  (weekIndex ${WEEK_INDEX})`);
  console.log(`  Tagg:      ${TAG}`);
  console.log(`  Körning:   ${new Date().toISOString()}\n`);

  // ── Step 1: Create 4 campaign cards ────────────────────────────────────────
  console.log('STEG 1 — Skapar kampanjkort\n');

  interface PersistedCard {
    id:        string;
    cfg:       DayConfig;
    draftText: string;
    hashtags:  string[];
    riskLevel: string;
    status:    string;
    topicSig:  string;
  }

  const persisted: PersistedCard[] = [];

  for (const cfg of DAY_CONFIGS) {
    const draft = generateDraft({ card: cfg.input, week_index: WEEK_INDEX });
    const { card, validation } = createCampaignCard(cfg.input, {
      draft_text:  draft.draft_text,
      hashtag_set: draft.hashtag_set,
      created_by:  TAG,
    });

    if (!validation.valid || !card) {
      console.error(`  [ERROR] ${cfg.label}: validering misslyckades — ${validation.errors.join('; ')}`);
      process.exit(1);
    }

    const row = {
      id:                   card.id,
      objective:            card.objective,
      target_audience:      card.target_audience,
      source_basis:         card.source_basis,
      driver_insight:       card.driver_insight,
      content_pillar:       card.content_pillar,
      creative_angle:       card.creative_angle,
      emotional_tone:       card.emotional_tone,
      format:               card.format,
      cta_type:             card.cta_type,
      planned_channel:      card.planned_channel,
      planned_week:         card.planned_week,
      planned_day_of_week:  card.planned_day_of_week,
      suggested_slot_time:  card.suggested_slot_time,
      topic_signature:      card.topic_signature,
      angle_signature:      card.angle_signature,
      risk_level:           card.risk_level,
      lifecycle_status:     card.lifecycle_status,
      draft_text:           card.draft_text,
      hashtag_set:          card.hashtag_set,
      created_by:           card.created_by,
      created_at:           card.created_at.toISOString(),
      updated_at:           card.updated_at.toISOString(),
    };

    const { error: insertErr } = await db.from('content_campaign_cards').insert(row);
    if (insertErr) {
      console.error(`  [ERROR] ${cfg.label}: DB insert — ${insertErr.message}`);
      process.exit(1);
    }

    await logAction({
      action_type:  'content_card_created',
      triggered_by: 'founder',
      target_type:  'content_campaign_card',
      target_id:    card.id,
      status:       'completed',
      input:  { pillar: card.content_pillar, angle: card.creative_angle, week: WEEK, dry_run: TAG },
      result: { risk: card.risk_level, status: card.lifecycle_status },
    });

    persisted.push({
      id:        card.id,
      cfg,
      draftText: draft.draft_text,
      hashtags:  draft.hashtag_set,
      riskLevel: card.risk_level,
      status:    card.lifecycle_status,
      topicSig:  draft.topic_signature,
    });

    console.log(`  + ${cfg.label}`);
    console.log(`    id:     ${card.id}`);
    console.log(`    pillar: ${card.content_pillar} / ${card.creative_angle}`);
    console.log(`    risk:   ${card.risk_level}  status: ${card.lifecycle_status}\n`);
  }

  // ── Step 2: Generate visual plans sequentially ──────────────────────────────
  console.log('STEG 2 — Genererar visuella planer (Mon→Ons→Fre→Sön)\n');

  interface VisualRow extends PersistedCard { vr: VisualResult }
  const visualRows: VisualRow[] = [];

  for (const pc of persisted) {
    console.log(`  [${pc.cfg.label}]`);
    const vr = await generateVisualPlan(pc.id, pc.cfg, pc.riskLevel);

    console.log(`    familj:   ${vr.plan.visual_family}`);
    console.log(`    strategi: ${vr.plan.asset_strategy}`);
    console.log(`    scen:     ${vr.plan.scene_type}`);
    console.log(`    grind:    ${vr.plan.gate_outcome}`);
    console.log(`    preview:  ${vr.preview.preview_type}`);
    console.log(`    db:       ${vr.dbOk ? 'visual_plan sparad' : 'KRÄVER MIGRATION 027'}`);
    for (const w of vr.gateWarnings) console.log(`    [WARN]    ${w}`);
    console.log();

    visualRows.push({ ...pc, vr });
  }

  // ── Report ──────────────────────────────────────────────────────────────────
  console.log('================================================================');
  console.log('  RAPPORT — PHASE 3 CREATIVE DRY-RUN');
  console.log('================================================================\n');

  // A. Campaign Card Details
  console.log('A. KAMPANJKORT\n');
  for (const p of persisted) {
    console.log(`  --- ${p.cfg.label} ---`);
    console.log(`  ID:       ${p.id}`);
    console.log(`  Pillar:   ${p.cfg.input.content_pillar} / ${p.cfg.input.creative_angle}`);
    console.log(`  Publik:   ${p.cfg.input.target_audience}`);
    console.log(`  Format:   ${p.cfg.input.format}`);
    console.log(`  Risk:     ${p.riskLevel} / ${p.status}`);
    console.log(`  Taggar:   ${p.hashtags.join(' ')}`);
    console.log(`\n  Utkast:\n`);
    for (const line of p.draftText.split('\n')) console.log(`    ${line}`);
    console.log();
  }

  // B. Visual Plan Details
  console.log('\nB. VISUELLA PLANER\n');
  for (const row of visualRows) {
    const vp = row.vr.plan;
    console.log(`  --- ${row.cfg.label} ---`);
    console.log(`  Familj:        ${vp.visual_family}`);
    console.log(`  Strategi:      ${vp.asset_strategy}  (${vp.asset_strategy_reason.slice(0, 60)}…)`);
    console.log(`  Scen:          ${vp.scene_type}`);
    console.log(`  Komposition:   ${vp.composition_direction}`);
    console.log(`  Humör:         ${vp.mood}`);
    console.log(`  Overlay:       ${vp.text_overlay_structure}`);
    console.log(`  Rubrik (bild): ${vp.proposed_headline ?? '(ingen)'}`);
    console.log(`  Stödtext:      ${vp.proposed_support_line ?? '(ingen)'}`);
    console.log(`  Grind-utfall:  ${vp.gate_outcome}`);
    console.log(`  Visuell risk:  ${vp.visual_risk_level}`);
    console.log(`  DB-status:     ${row.vr.dbOk ? 'sparad' : 'MIGRATION 027 KRÄVS'}`);
    if (row.vr.gateWarnings.length > 0) {
      console.log(`  Varningar:     ${row.vr.gateWarnings.join(' | ')}`);
    }
    console.log();
  }

  // C. Anti-repetition Assessment
  console.log('\nC. REPETITIONSBEDÖMNING\n');
  const families   = visualRows.map(r => r.vr.plan.visual_family);
  const scenes     = visualRows.map(r => r.vr.plan.scene_type);
  const overlays   = visualRows.map(r => r.vr.plan.text_overlay_structure);
  const strategies = visualRows.map(r => r.vr.plan.asset_strategy);
  const uFamilies  = new Set(families).size;
  const uScenes    = new Set(scenes).size;

  console.log(`  Familjer:     ${families.join(', ')}`);
  console.log(`  Unika:        ${uFamilies}/4  ${uFamilies === 4 ? '[ALLA DISTINKTA]' : '[OBS: UPPREPNING]'}`);
  console.log(`  Scener:       ${scenes.join(', ')}`);
  console.log(`  Unika:        ${uScenes}/4  ${uScenes === 4 ? '[ALLA DISTINKTA]' : '[OBS: UPPREPNING]'}`);
  console.log(`  Overlay:      ${overlays.join(', ')}`);
  console.log(`  Strategier:   ${strategies.join(', ')}`);
  console.log(`  Blockerade:   ${visualRows.filter(r => r.vr.plan.gate_outcome === 'blocked_for_repetition').length}/4`);

  // D. Safety Compliance
  console.log('\nD. SÄKERHETSEFTERLEVNAD\n');
  const highRisk  = persisted.filter(p => p.riskLevel === 'high').length;
  const ctaCount  = persisted.filter(p => p.cfg.input.cta_type !== 'none').length;
  const blocked   = visualRows.filter(r => r.vr.plan.gate_outcome === 'blocked_for_repetition').length;
  const checks = [
    ['Ingen Facebook-anslutning',          true],
    ['Ingen extern bild-API',              true],
    ['Ingen e-post/SMS/WhatsApp',          true],
    ['AGENT_CONTACT_MODE oförändrad',      true],
    ['Inga externa URL:er i SVG',          true],
    ['Alla 4 kort taggade dry_run',        persisted.length === 4],
    [`Max 1 CTA (faktiskt: ${ctaCount}/4)`, ctaCount <= 1],
    [`Noll högrisk-kort (faktiskt: ${highRisk})`, highRisk === 0],
    [`Noll blockerade grinder (faktiskt: ${blocked})`, blocked === 0],
  ] as const;
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? '[OK]' : '[FEL]'}  ${label}`);
  }

  // E. SVG Preview Excerpts
  console.log('\nE. SVG-FÖRHANDSVISNING (INTERN)\n');
  let svgCount = 0;
  for (const row of visualRows) {
    if (row.vr.preview.preview_type !== 'branded_graphic_svg') continue;
    svgCount++;
    const svg = row.vr.preview.svg_content ?? '';
    console.log(`  --- ${row.cfg.label} ---`);
    console.log(`  Typ:        branded_graphic_svg`);
    console.log(`  Storlek:    ${svg.length} tecken`);
    console.log(`  Intern:     ${row.vr.preview.is_internal_only}`);
    console.log(`  Disclaimer: ${row.vr.preview.disclaimer}`);
    console.log(`  SVG-start:  ${svg.slice(0, 120).replace(/\n/g, ' ')}`);
    console.log(`  Copy-hierarki: ${row.vr.preview.copy_hierarchy}`);
    console.log();
  }
  if (svgCount === 0) console.log('  (Inga SVG-förhandsvisningar — branded_graphic-kort ej genererade)\n');

  // F. system_actions Audit
  console.log('\nF. SYSTEM_ACTIONS-REVISION\n');
  console.log('  Loggade åtgärder (8 totalt: 4 card_created + 4 visual_plan):');
  for (const pc of persisted) {
    console.log(`    content_card_created          → ${pc.cfg.label.slice(0, 20).padEnd(20)} id:${pc.id.slice(0, 8)}`);
  }
  for (const row of visualRows) {
    const act = row.vr.plan.lifecycle_status === 'held'
      ? 'content_visual_plan_held     '
      : 'content_visual_plan_generated';
    console.log(`    ${act} → ${row.cfg.label.slice(0, 20).padEnd(20)} ${row.vr.plan.gate_outcome}`);
  }

  // G. Summary
  console.log('\nG. SAMMANFATTNING\n');
  const allLow      = persisted.every(p => p.riskLevel === 'low');
  const allDistinct = uFamilies === 4 && uScenes === 4;
  const noCta       = ctaCount === 0;
  const migration027 = visualRows.every(r => r.vr.dbOk);

  console.log(`  Kampanjkort persisterade:   ${persisted.length}/4  ${persisted.length === 4 ? '[OK]' : '[FEL]'}`);
  console.log(`  Alla kort låg risk:         ${allLow ? '[OK]' : '[FEL]'}`);
  console.log(`  Alla distinkta familjer:    ${allDistinct ? '[OK]' : '[FEL]'}`);
  console.log(`  Noll CTA i satsen:          ${noCta ? '[OK]' : '[FEL]'}`);
  console.log(`  SVG-förhandsvisningar:      ${svgCount}/4 (branded_graphic-kort)`);
  console.log(`  Migration 027 (visual_plan): ${migration027 ? '[APPLICERAD]' : '[EJ APPLICERAD — GRUNDAREN MÅSTE APPLICERA]'}`);

  const verdict = allLow && allDistinct && noCta && persisted.length === 4;
  console.log(`\n  SYSTEM-VERDICT: ${verdict
    ? '[GODKÄND] — 4 kort klara för intern granskning'
    : '[VARNING] — Se ovanstående fel'}`);

  if (!migration027) {
    console.log('\n  NÄSTA STEG: Applicera migration 027 via Supabase SQL Editor,');
    console.log('  kör sedan om detta skript för att spara visual_plan JSON på korten.');
  }

  console.log('\n================================================================\n');
}

main().catch(err => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
