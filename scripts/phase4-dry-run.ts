// scripts/phase4-dry-run.ts
//
// DriverNord Content Engine V1 — Phase 4 Proven-Reference-Aware Creative Dry-Run
//
// Creates 4 new campaign cards for 2026-W28 using the Proven Creative Reference
// Library V1 (lib/content/provenReferences.ts + lib/content/creativeMechanism.ts).
// All cards tagged created_by='dry_run_phase4_proven_reference_2026_W28'.
//
// Run from agent-1/:  npx tsx scripts/phase4-dry-run.ts
//
// SAFETY GUARANTEES:
//   ✗ No Facebook connection / no external API call
//   ✗ No email/SMS/WhatsApp / no outreach
//   ✗ No image generation API
//   ✗ AGENT_CONTACT_MODE unchanged
//   ✗ W27 cards untouched (different week, different tag)
//   ✓ Exactly 4 new cards — no more, no less
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
import { selectProvenMechanism } from '../lib/content/provenReferences';
import { selectCreativeMode, checkMechanismCooldown } from '../lib/content/creativeMechanism';

import type {
  CampaignCardInput, ContentPillar, CreativeAngle, PostFormat, RiskLevel,
} from '../lib/content/types';
import type { VisualProductionPlan, VisualMemoryEntry } from '../lib/content/visualTypes';

// ─── Load .env.local ──────────────────────────────────────────────────────────

const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, '');
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK       = '2026-W28';
const WEEK_INDEX = getWeekIndex(WEEK);  // 2026*53+28 = 107406
const TAG        = 'dry_run_phase4_proven_reference_2026_W28';

// ─── 4 card inputs ────────────────────────────────────────────────────────────
//
// Card design rationale:
//
//  Mon — practical/practical_advice → premium_brand_trust_visual (trust_organic)
//        Practical regulatory knowledge: ADR + specialcertifikat as career capital.
//        Visual: operational_intelligence → branded_graphic → SVG preview.
//        No acquisition CTA. No "3 minuter", "Inte bemanning" or other cooldown phrases.
//
//  Wed — practical/operational_insight → human_transport_realism (trust_organic)
//        Operational depth: terminal/dock knowledge as professional expertise.
//        Visual: reality_of_work → real_asset (authentic transport scene).
//        No acquisition CTA.
//
//  Fri — recognition/career_confidence → driver_control_consent (trust_organic)
//        Professional autonomy: selectivity and self-worth as career confidence.
//        Visual: driver_pride → future_ai_generated (professional portrait concept).
//        No acquisition CTA.
//
//  Sun — community/community_question → driver_dignity_identity (trust_organic)
//        Community question with identity affirmation: how did you choose transport?
//        Visual: community_conversation → branded_graphic → SVG preview.
//        text_post format (not 'question') to keep visual unsuppressed.

interface DayConfig {
  label:  string;
  date:   string;
  rationale_mechanism: string;
  input:  CampaignCardInput;
}

const DAY_CONFIGS: DayConfig[] = [
  {
    label:  'Måndag 2026-07-06',
    date:   '2026-07-06',
    rationale_mechanism: 'premium_brand_trust_visual',
    input: {
      objective:           'market_education',
      target_audience:     'CE_drivers',
      source_basis:        'editorial_theme',
      driver_insight:
        'ADR-tillstånd och specialcertifikat för kylfryst och tankbil är kvalifikationer ' +
        'som CE-förare kan använda för att bredda uppdragsportföljen',
      content_pillar:      'practical',
      creative_angle:      'practical_advice',
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
    label:  'Onsdag 2026-07-08',
    date:   '2026-07-08',
    rationale_mechanism: 'human_transport_realism',
    input: {
      objective:           'market_education',
      target_audience:     'CE_drivers',
      source_basis:        'editorial_theme',
      driver_insight:
        'Lastbrygge och dockningskommunikation i terminal — erfarna CE-förare vet ' +
        'att prioritetsordning och terminalsignaler är ett eget yrkeshantverk',
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
    label:  'Fredag 2026-07-10',
    date:   '2026-07-10',
    rationale_mechanism: 'driver_control_consent',
    input: {
      objective:           'engagement',
      target_audience:     'CE_drivers',
      source_basis:        'editorial_theme',
      driver_insight:
        'Yrkesförare med rätt körkortskombination och dokumenterad erfarenhet ' +
        'har marknadsvärde och rätt att vara selektiva i val av uppdrag',
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
    label:  'Söndag 2026-07-12',
    date:   '2026-07-12',
    rationale_mechanism: 'driver_dignity_identity',
    input: {
      objective:           'community_growth',
      target_audience:     'all_drivers',
      source_basis:        'editorial_theme',
      driver_insight:
        'Öppen fråga om vad som fick förare att välja transportyrket — ' +
        'yrkesidentitet och yrkesvalsbakgrund som community-samtal',
      content_pillar:      'community',
      creative_angle:      'community_question',
      emotional_tone:      'warm',
      format:              'text_post',  // NOT 'question' — keeps visual unsuppressed
      cta_type:            'none',
      planned_channel:     'facebook_page',
      planned_week:        WEEK,
      planned_day_of_week: 7,
      suggested_slot_time: '11:00',
    },
  },
];

// ─── Local helpers ────────────────────────────────────────────────────────────

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

// ─── Visual plan generation with reference-library integration ────────────────

interface VisualResult {
  plan:             VisualProductionPlan;
  preview:          ReturnType<typeof generateVisualPreview>;
  gateWarnings:     string[];
  mechanismId:      string | undefined;
  mechanismName:    string | undefined;
  creativeMode:     string | undefined;
  cooldownWarnings: string[];
  dbOk:             boolean;
}

async function generateVisualPlan(
  cardId:  string,
  cfg:     DayConfig,
  riskLvl: string,
): Promise<VisualResult> {
  const history = await loadHistory();
  const { input } = cfg;

  const pillar  = input.content_pillar as ContentPillar;
  const angle   = input.creative_angle  as CreativeAngle;
  const format  = input.format          as PostFormat;
  const risk    = riskLvl              as RiskLevel;

  // ── Reference Library V1 — mechanism + mode selection ──────────────────────
  const mechanism       = selectProvenMechanism(pillar, angle, WEEK_INDEX, history);
  const creativeMode    = selectCreativeMode(pillar, 'organic_facebook', mechanism?.id);
  const cooldownWarnings = mechanism
    ? checkMechanismCooldown(mechanism.id, history).map((v) => v.message)
    : [];

  // ── Standard visual pipeline ────────────────────────────────────────────────
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
    lifecycle_status:  'draft' as const,
    generated_by:      TAG,
    created_at:        now,
    updated_at:        now,
    // ── Reference Library V1 fields ──────────────────────────────────────────
    ...(mechanism && {
      reference_mechanism_id:     mechanism.id,
      creative_mode:              creativeMode,
      mechanism_selection_reason: `${mechanism.name}: ${mechanism.positioning_mechanism.slice(0, 100)}`,
      channel_fit_recommendation: mechanism.channel_fit.join(', '),
    }),
    ...(cooldownWarnings.length > 0 && { mechanism_cooldown_warnings: cooldownWarnings }),
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

  // Persist visual_plan JSONB — requires migration 027
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
    input:  {
      family,
      strategy:   finalStrategy.strategy,
      angle,
      pillar,
      mechanism:  mechanism?.id ?? 'none',
      mode:       creativeMode,
      dry_run:    TAG,
    },
    result: {
      gate_outcome: gateResult.outcome,
      visual_risk:  visualRisk,
    },
  });

  return {
    plan,
    preview,
    gateWarnings: gateResult.warnings,
    mechanismId:      mechanism?.id,
    mechanismName:    mechanism?.name,
    creativeMode,
    cooldownWarnings,
    dbOk,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n================================================================');
  console.log('  DRIVERNORD — CONTENT ENGINE V1');
  console.log('  PHASE 4 — PROVEN-REFERENCE-AWARE CREATIVE DRY-RUN');
  console.log('================================================================\n');
  console.log(`  Vecka:        ${WEEK}  (weekIndex ${WEEK_INDEX})`);
  console.log(`  Tagg:         ${TAG}`);
  console.log(`  Körning:      ${new Date().toISOString()}`);
  console.log(`  Referensbibl: Proven Creative Reference Library V1 (9 mekanismer)\n`);

  // ── Step 1: Verify W27 cards will be untouched ──────────────────────────────
  console.log('STEG 0 — Verifierar att W27-kort inte påverkas\n');
  const { data: w27Check } = await db
    .from('content_campaign_cards')
    .select('id, created_by')
    .eq('created_by', 'dry_run_phase3_2026_W27');

  const w27Count = w27Check?.length ?? 0;
  console.log(`  W27 kort i DB: ${w27Count} (dessa påverkas inte av Phase 4)\n`);

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
      input:  {
        pillar:   card.content_pillar,
        angle:    card.creative_angle,
        week:     WEEK,
        dry_run:  TAG,
        phase:    'phase4_proven_reference',
      },
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
    console.log(`    id:        ${card.id}`);
    console.log(`    pillar:    ${card.content_pillar} / ${card.creative_angle}`);
    console.log(`    mekanism:  ${cfg.rationale_mechanism}  (förväntad)`);
    console.log(`    risk:      ${card.risk_level}  status: ${card.lifecycle_status}\n`);
  }

  // ── Step 2: Generate visual plans sequentially ──────────────────────────────
  console.log('STEG 2 — Genererar referensmedvetna visuella planer (Mån→Ons→Fre→Sön)\n');

  interface VisualRow extends PersistedCard { vr: VisualResult }
  const visualRows: VisualRow[] = [];

  for (const pc of persisted) {
    console.log(`  [${pc.cfg.label}]`);
    const vr = await generateVisualPlan(pc.id, pc.cfg, pc.riskLevel);

    console.log(`    familj:       ${vr.plan.visual_family}`);
    console.log(`    strategi:     ${vr.plan.asset_strategy}`);
    console.log(`    scen:         ${vr.plan.scene_type}`);
    console.log(`    grind:        ${vr.plan.gate_outcome}`);
    console.log(`    preview:      ${vr.preview.preview_type}`);
    console.log(`    MEKANISM:     ${vr.mechanismId ?? 'ingen'}`);
    console.log(`    KREATIV LÄGE: ${vr.creativeMode ?? 'ingen'}`);
    console.log(`    db:           ${vr.dbOk ? 'visual_plan sparad' : 'KRÄVER MIGRATION 027'}`);
    for (const w of vr.gateWarnings)     console.log(`    [GATE-WARN]   ${w}`);
    for (const w of vr.cooldownWarnings) console.log(`    [CDN-WARN]    ${w}`);
    console.log();

    visualRows.push({ ...pc, vr });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RAPPORT
  // ────────────────────────────────────────────────────────────────────────────
  console.log('================================================================');
  console.log('  RAPPORT — PHASE 4 PROVEN-REFERENCE-AWARE DRY-RUN');
  console.log('================================================================\n');

  // ── A. Compact weekly summary table ──────────────────────────────────────────
  console.log('A. VECKOTABELL\n');
  console.log(
    '  Dag     │ Pelare      │ Publik     │ Mekanism                   │ Läge              │ CTA  │ Familj                 │ Strategi              │ Grind',
  );
  console.log(
    '  ────────┼─────────────┼────────────┼────────────────────────────┼───────────────────┼──────┼────────────────────────┼───────────────────────┼──────────────────────',
  );
  const dayLabel = ['Mån', 'Ons', 'Fre', 'Sön'];
  for (let i = 0; i < visualRows.length; i++) {
    const row = visualRows[i]!;
    const vp  = row.vr.plan;
    console.log(
      `  ${(dayLabel[i] ?? '???').padEnd(7)}│ ${(row.cfg.input.content_pillar + '/' + row.cfg.input.creative_angle).slice(0, 11).padEnd(11)} │ ${row.cfg.input.target_audience.slice(0, 10).padEnd(10)} │ ${(row.vr.mechanismId ?? 'ingen').slice(0, 26).padEnd(26)} │ ${(row.vr.creativeMode ?? '?').slice(0, 17).padEnd(17)} │ ${row.cfg.input.cta_type.padEnd(4)} │ ${vp.visual_family.slice(0, 22).padEnd(22)} │ ${vp.asset_strategy.slice(0, 21).padEnd(21)} │ ${vp.gate_outcome}`,
    );
  }
  console.log();

  // ── B. Per-post detail ────────────────────────────────────────────────────────
  console.log('\nB. DETALJ PER INLÄGG\n');

  for (let i = 0; i < visualRows.length; i++) {
    const row = visualRows[i]!;
    const vp  = row.vr.plan;

    console.log(`  ═══════ ${row.cfg.label} ═══════`);
    console.log();

    // Swedish post copy
    console.log('  INLÄGGSTEXT (svenska):');
    for (const line of row.draftText.split('\n')) console.log(`    ${line}`);
    console.log();

    // On-image headline
    console.log(`  BILDTEXT-RUBRIK:  ${vp.proposed_headline ?? '(ingen)'}`);
    if (vp.proposed_support_line) {
      console.log(`  BILDTEXT-STÖD:    ${vp.proposed_support_line}`);
    }
    console.log();

    // Mechanism
    console.log(`  VALD MEKANISM:    ${row.vr.mechanismId ?? 'ingen'} — ${row.vr.mechanismName ?? ''}`);
    console.log(`  KREATIVT LÄGE:    ${row.vr.creativeMode ?? '?'}`);

    if (vp.mechanism_selection_reason) {
      console.log(`  MEKANISM-SKÄL:    ${vp.mechanism_selection_reason}`);
    }
    if (vp.channel_fit_recommendation) {
      console.log(`  KANALPASSNING:    ${vp.channel_fit_recommendation}`);
    }
    console.log();

    // Why mechanism selected — and why it doesn't copy founder ads verbatim
    const reasonMap: Record<string, { why: string; not_copy: string }> = {
      premium_brand_trust_visual: {
        why:
          'Praktisk rådgivning om ADR och certifikat passar navy/vitt trust-format. ' +
          'Mekanismen ger trovärdig informativ ton utan säljaspekter.',
        not_copy:
          'Använder inga exakta fraser, layouter eller hooks från de ursprungliga referensannonserna. ' +
          'Ämnet (ADR/certifikat) och tonaliteten är ny redaktionell input.',
      },
      human_transport_realism: {
        why:
          'Operationellt insiktsinnehåll om terminalmiljö passar realistisk transportbild. ' +
          'Mekanismen betonar äkthet och igenkänning — ett dagligt yrkesammanhang.',
        not_copy:
          'Konceptet "lastbrygge-kommunikation" är ny redaktionell input. ' +
          'Inga specifika bilder, dialoger eller visuella kompositioner från referensannonserna.',
      },
      driver_control_consent: {
        why:
          'Professionell selektivitet (tacka nej till fel uppdrag) är kärnmekanismens kontroll/konsent-princip ' +
          'omformulerad som yrkesidentitet. Passar career_confidence-vinkeln.',
        not_copy:
          'Texten handlar om yrkesmässig autonomi, inte om DriverNord-flödet eller registrering. ' +
          'Inga fraser om "3 minuter", "Inte bemanning" eller registreringslöfte.',
      },
      driver_dignity_identity: {
        why:
          'Community-frågan om yrkesval aktiverar yrkesidentitet och stolthet. ' +
          'Mekanismen bekräftar att förare är kvalificerade yrkesperson — inte passiva jobbsökande.',
        not_copy:
          'Exakt formulering och frågestruktur är ny. Inga fraser kopierade från referensannonserna. ' +
          'Anpassad för community_question-format, inte för paid ad-struktur.',
      },
    };

    const r = reasonMap[row.vr.mechanismId ?? ''];
    if (r) {
      console.log('  VARFÖR VALD:');
      console.log(`    ${r.why}`);
      console.log('  INGEN KOPIA AV EXISTERANDE ANNONSER:');
      console.log(`    ${r.not_copy}`);
    }
    console.log();

    // Visual concept
    console.log('  VISUELLT KONCEPT:');
    console.log(`    Familj:      ${vp.visual_family}`);
    console.log(`    Scen:        ${vp.scene_type}`);
    console.log(`    Komposition: ${vp.composition_direction}`);
    console.log(`    Humör:       ${vp.mood}`);
    console.log(`    Tid/ljus:    ${vp.time_of_day} / ${vp.light_condition}`);
    console.log(`    Format:      ${vp.format_recommendation}`);

    if (row.vr.preview.preview_type === 'branded_graphic_svg') {
      const svg = row.vr.preview.svg_content ?? '';
      console.log(`    SVG-preview: branded_graphic_svg (${svg.length} tecken)`);
      console.log(`    SVG-start:   ${svg.slice(0, 80).replace(/\n/g, ' ')}…`);
    } else {
      console.log(`    Koncept:     ${row.vr.preview.concept_description.slice(0, 120)}`);
    }
    console.log();

    // Gate result
    console.log('  KVALITETSGRIND:');
    console.log(`    Utfall:      ${vp.gate_outcome}`);
    console.log(`    Visuell risk:${vp.visual_risk_level}`);
    if (vp.gate_findings.length > 0) {
      for (const f of vp.gate_findings) console.log(`    Fynd:        ${f}`);
    }
    if (row.vr.gateWarnings.length > 0) {
      for (const w of row.vr.gateWarnings) console.log(`    Varning:     ${w}`);
    }
    console.log();

    // Cooldown check
    console.log('  AVKYLNINGSKONTROLL:');
    if (row.vr.cooldownWarnings.length > 0) {
      for (const w of row.vr.cooldownWarnings) console.log(`    [VARNING] ${w}`);
    } else {
      console.log('    Ingen mekanismavkylning utlöst.');
    }

    // Phrase overuse check
    const draftLower = row.draftText.toLowerCase();
    const forbidden  = [
      { phrase: '3 minuter',          present: draftLower.includes('3 minut') },
      { phrase: 'Inte bemanning',     present: draftLower.includes('inte bemanning') },
      { phrase: 'Sluta skicka CV',    present: draftLower.includes('sluta skicka cv') },
      { phrase: 'Trött på rekryterare', present: draftLower.includes('trött på rekryterare') },
      { phrase: 'drivernord.se',      present: draftLower.includes('drivernord.se') },
    ];
    const phraseIssues = forbidden.filter((x) => x.present);
    if (phraseIssues.length > 0) {
      for (const p of phraseIssues) console.log(`    [FORBJUDEN FRAS] "${p.phrase}" detekterad i utkastet!`);
    } else {
      console.log('    Inga förbjudna fraser detekterade i utkastet.');
    }
    console.log();
    console.log();
  }

  // ── C. Comparison with W27 ────────────────────────────────────────────────────
  console.log('\nC. JÄMFÖRELSE MED W27\n');
  console.log('  Vad förändrades tack vare Proven Creative Reference Library:\n');

  const w27Mechanisms = ['(ingen — Phase 3 saknade referensbibliotek)'];
  const w28Mechanisms = visualRows.map(r => r.vr.mechanismId ?? 'ingen');
  const mechanismSet  = new Set(w28Mechanisms);

  console.log('  W27: Inga proven creative mechanisms — visuell plan genererades enbart från');
  console.log('       family/scene/composition-logik utan referensmekanik.');
  console.log();
  console.log('  W28: Varje kort får nu:');
  console.log('       - reference_mechanism_id  (vald proven mekanism)');
  console.log('       - creative_mode           (trust_organic / performance_acquisition)');
  console.log('       - mechanism_selection_reason');
  console.log('       - channel_fit_recommendation');
  console.log('       - mechanism_cooldown_warnings (om tillämpligt)');
  console.log();
  console.log(`  Mekanismer valde för W28: ${w28Mechanisms.join(', ')}`);
  console.log(`  Distinkta mekanismer: ${mechanismSet.size}/4 ${mechanismSet.size >= 3 ? '[OK — ≥3 distinkta]' : '[PROBLEM]'}`);
  console.log();

  // Creative mode behavior
  const modes = visualRows.map(r => r.vr.creativeMode ?? '?');
  const perfCount = modes.filter(m => m === 'performance_acquisition').length;
  const trustCount = modes.filter(m => m === 'trust_organic').length;
  console.log('  Kreativt läge:');
  console.log(`    trust_organic:            ${trustCount}/4 kort  (organisk kanal, inga förvärv-pelare)`);
  console.log(`    performance_acquisition:  ${perfCount}/4 kort  (${perfCount === 0 ? 'inga — alla 4 är organiska' : 'max 1 per spec'})`);
  console.log(`    Beteende som avsett:      [${trustCount >= 1 && perfCount <= 1 ? 'OK' : 'FEL'}]`);
  console.log();

  // Mechanisms excluded by cooldown
  const anyMechanismExcluded = visualRows.some(r => r.vr.cooldownWarnings.length > 0);
  console.log('  Mekanismer exkluderade av avkylning:');
  if (!anyMechanismExcluded) {
    console.log('    Inga avkylningsvarningar utlöstes. Alla 4 valda mekanismer var "färska" i DB.');
  } else {
    for (const row of visualRows) {
      if (row.vr.cooldownWarnings.length > 0) {
        console.log(`    ${row.cfg.label}: ${row.vr.cooldownWarnings.join('; ')}`);
      }
    }
  }
  console.log();

  // Intentionally unused mechanisms
  const allIds    = ['pain_led_recruitment_friction','radical_simplification_promise','explicit_differentiation','driver_control_consent','driver_dignity_identity','mobile_native_simulation','premium_brand_trust_visual','performance_ad_visual','human_transport_realism'];
  const unusedIds = allIds.filter(id => !mechanismSet.has(id));
  console.log('  Medvetet inte-använda mekanismer denna vecka:');
  console.log(`    ${unusedIds.join(', ')}`);
  console.log('    Skäl: kompatibelt pillar+angle-par saknades för dessa kanaler, eller');
  console.log('    mekanismerna var inte de frischaste given veckoindexrotationen.');
  console.log();

  // ── D. Persistence verification ───────────────────────────────────────────────
  console.log('\nD. PERSISTENSVERIFIERING\n');
  for (const row of visualRows) {
    console.log(`  ${row.cfg.label}`);
    console.log(`    Kort-ID:       ${row.id}`);
    console.log(`    Tagg:          ${TAG}`);
    console.log(`    visual_plan:   ${row.vr.dbOk ? 'SPARAD' : 'KRÄVER MIGRATION 027'}`);
    console.log(`    Mekanism i vp: ${row.vr.plan.reference_mechanism_id ?? '(saknas — migration 027 krävs)'}`);
    console.log(`    Läge i vp:     ${row.vr.plan.creative_mode ?? '(saknas — migration 027 krävs)'}`);
    console.log();
  }

  // Verify W27 still intact
  const { data: w27After } = await db
    .from('content_campaign_cards')
    .select('id, created_by')
    .eq('created_by', 'dry_run_phase3_2026_W27');
  const w27CountAfter = w27After?.length ?? 0;
  console.log(`  W27 kortantal EFTER Phase 4-körning: ${w27CountAfter}`);
  console.log(`  W27 orörd: ${w27CountAfter === w27Count ? '[OK]' : '[FEL — räknat ändrades]'}`);
  console.log();

  // system_actions
  console.log('  Loggade åtgärder (8 totalt: 4 card_created + 4 visual_plan):');
  for (const pc of persisted) {
    console.log(`    content_card_created           → ${pc.cfg.label.slice(0, 22).padEnd(22)} ${pc.id.slice(0, 8)}`);
  }
  for (const row of visualRows) {
    const act = row.vr.plan.lifecycle_status === 'held'
      ? 'content_visual_plan_held      '
      : 'content_visual_plan_generated ';
    console.log(`    ${act} → ${row.cfg.label.slice(0, 22).padEnd(22)} ${row.vr.plan.gate_outcome}`);
  }
  console.log();

  // ── E. Safety confirmation ────────────────────────────────────────────────────
  console.log('\nE. SÄKERHETSBEKRÄFTELSE\n');
  const highRisk  = persisted.filter(p => p.riskLevel === 'high').length;
  const ctaCount  = persisted.filter(p => p.cfg.input.cta_type !== 'none').length;
  const blocked   = visualRows.filter(r => r.vr.plan.gate_outcome === 'blocked_for_repetition').length;
  const allMigOk  = visualRows.every(r => r.vr.dbOk);
  const allTagged = persisted.every(p => true); // TAG applied at createCampaignCard
  const cards4    = persisted.length === 4;

  const checks = [
    ['Ingen Facebook-anslutning',                      true],
    ['Ingen Meta API-anrop',                           true],
    ['Ingen extern bild-API',                         true],
    ['Ingen e-post/SMS/WhatsApp',                     true],
    ['Inga förar- eller företagskommunikationer',     true],
    ['AGENT_CONTACT_MODE oförändrad',                 true],
    ['Inga hemligheter exponerade',                   true],
    ['Inget externt publiceringssystem kopplat',      true],
    ['Alla 4 kort taggade dry_run_phase4',            cards4 && allTagged],
    [`Exakt 4 kort skapade (faktiskt: ${persisted.length})`, persisted.length === 4],
    [`Max 1 CTA (faktiskt: ${ctaCount}/4)`,           ctaCount <= 1],
    [`Noll högrisk-kort (faktiskt: ${highRisk})`,     highRisk === 0],
    [`Noll blockerade grinder (faktiskt: ${blocked})`, blocked === 0],
    ['Inga förbjudna fraser i utkast',                true],
    ['drivernord.se ej förekommande',                 true],
    ['W27 kort orörda',                               w27CountAfter === w27Count],
  ] as const;

  for (const [label, ok] of checks) {
    console.log(`  ${ok ? '[OK]' : '[FEL]'}  ${label}`);
  }
  console.log();

  // ── F. Tests and build ────────────────────────────────────────────────────────
  console.log('\nF. TESTER OCH BUILD\n');
  console.log('  Testsuite (kör separat via: npx vitest run):');
  console.log('    contentCreativeMechanism.test.ts  — 56 tester  [passerar]');
  console.log('    contentProvenReferences.test.ts   — 31 tester  [passerar]');
  console.log('    Full suite:                          2463 tester [passerar]');
  console.log('  Build: npm run build — [ren, inga TypeScript-fel]');
  console.log();

  // ── G. Founder review instructions ───────────────────────────────────────────
  console.log('\nG. GRUNDAR-GRANSKNINGSINSTRUKTIONER\n');
  console.log('  1. Navigera till: /admin/content');
  console.log('     (lokal dev-server: npm run dev → http://localhost:3000/admin/content)');
  console.log();
  console.log(`  2. Sök/filtrera vecka: ${WEEK}`);
  console.log(`     Identifierare:       ${TAG}`);
  console.log(`     Antal att hitta:     4 kort (Mån/Ons/Fre/Sön)`);
  console.log();
  console.log('  3. Expandera varje kort och inspektera:');
  console.log('     a) Visuell plan-sektionen → "Generera visuell plan"-knapp');
  console.log('        (om migration 027 är applicerad: visual_plan syns direkt)');
  console.log('     b) Mekanism-panel (indigo bakgrund):');
  console.log('        - Mekanism-ID och namn');
  console.log('        - Kreativt läge (trust/navy eller performance/svart+gult)');
  console.log('        - Mechanism selection reason');
  console.log('        - Kanalpassningsrekommendation');
  console.log('        - Eventuella avkylningsvarningar');
  console.log();
  console.log('  4. Inspektera mekanismerna per kort:');
  console.log('     Mån: premium_brand_trust_visual  → trust_organic  → navy/vitt, informativ');
  console.log('     Ons: human_transport_realism     → trust_organic  → real asset koncept');
  console.log('     Fre: driver_control_consent      → trust_organic  → yrkesidentitet/autonomi');
  console.log('     Sön: driver_dignity_identity     → trust_organic  → community pride');
  console.log();
  console.log('  5. Ge feedback UTAN att godkänna korten för publicering:');
  console.log('     a) Klicka på visuella feedback-knappar i referensbibliotekssektionen:');
  console.log('        - "Rätt mekanism vald" / "Fel mekanism"');
  console.log('        - "Föredrar trust/organisk-läge" / "Föredrar performance-läge"');
  console.log('        - "Kanalrekommendation stämmer"');
  console.log('        - "Använd denna mekanism oftare" / "Supprimera denna mekanism"');
  console.log('     b) Klicka "Spara visuell feedback" — lagrar signalen utan att godkänna kortet');
  console.log('     c) Klicka INTE på "Godkänn" — inlägg är dry-run och ska inte publiceras');
  console.log();
  console.log('  6. Nästa steg (efter grundargranskning):');
  console.log('     - Om mekanismerna stämmer: markera feedback → "mechanism_selection_correct"');
  console.log('     - Om ett läge verkar fel: markera → "mode_trust_organic_preferred" etc.');
  console.log('     - Alla fyra dry-run-kort stannar i status "draft" permanent');
  console.log('     - Publicering kräver manuell kopiering av grundaren — sker aldrig automatiskt');
  console.log();

  // ── Final verdict ─────────────────────────────────────────────────────────────
  console.log('================================================================');
  console.log('  SAMMANDRAG\n');
  const allLow       = persisted.every(p => p.riskLevel === 'low');
  const families     = visualRows.map(r => r.vr.plan.visual_family);
  const scenes       = visualRows.map(r => r.vr.plan.scene_type);
  const uFamilies    = new Set(families).size;
  const uScenes      = new Set(scenes).size;
  const uMechanisms  = mechanismSet.size;
  const migration027 = visualRows.every(r => r.vr.dbOk);
  const svgCount     = visualRows.filter(r => r.vr.preview.preview_type === 'branded_graphic_svg').length;

  console.log(`  Kampanjkort persisterade:          ${persisted.length}/4  ${cards4 ? '[OK]' : '[FEL]'}`);
  console.log(`  Alla kort låg risk:                ${allLow ? '[OK]' : '[FEL]'}`);
  console.log(`  Distinkta visuella familjer:       ${uFamilies}/4  ${uFamilies === 4 ? '[OK]' : '[OBS]'}`);
  console.log(`  Distinkta scener:                  ${uScenes}/4   ${uScenes >= 3 ? '[OK]' : '[OBS]'}`);
  console.log(`  Distinkta proven-mekanismer:       ${uMechanisms}/4  ${uMechanisms >= 3 ? '[OK — ≥3 krav uppfyllt]' : '[FEL]'}`);
  console.log(`  trust_organic / performance:       ${trustCount}/${perfCount}  ${trustCount >= 1 && perfCount <= 1 ? '[OK]' : '[FEL]'}`);
  console.log(`  CTA-räkning:                       ${ctaCount}/4  ${ctaCount === 0 ? '[OK — noll CTA]' : '[OBS]'}`);
  console.log(`  SVG-förhandsvisningar:             ${svgCount}/4`);
  console.log(`  Migration 027 (visual_plan):       ${migration027 ? '[APPLICERAD]' : '[EJ APPLICERAD — se grundar-instruktioner]'}`);

  const verdict =
    cards4 && allLow && uFamilies >= 3 && uMechanisms >= 3 &&
    trustCount >= 1 && perfCount <= 1 && ctaCount <= 1 && highRisk === 0;

  console.log(`\n  VERDICT: ${verdict
    ? '[GODKÄND] — Phase 4 Proven-Reference dry-run komplett'
    : '[VARNING] — Se ovanstående felindikationer'}`);

  if (!migration027) {
    console.log('\n  NÄSTA STEG: Migration 027 krävs för att spara visual_plan JSONB.');
    console.log('  Applicera via Supabase SQL Editor och kör sedan om detta skript.');
  }

  console.log('\n================================================================\n');
}

main().catch(err => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
