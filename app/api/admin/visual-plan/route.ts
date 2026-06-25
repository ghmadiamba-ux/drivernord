// app/api/admin/visual-plan/route.ts
//
// Visual Production Plan API
// Generates, retrieves, and updates visual plans for Campaign Cards.
//
// BOUNDARIES:
//   ✗ Does NOT connect to Facebook, Meta, or any image API
//   ✗ Does NOT publish anything externally
//   ✗ Does NOT send email/SMS/WhatsApp
//   ✓ Internal cockpit use only — service role DB access
//   ✓ All visual generation is deterministic and purely local

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { logAction } from '@/lib/systemActions';

import { selectVisualFamily, selectSceneType, selectCompositionDirection, selectMood, selectSubjectType, selectSetting, selectTimeOfDay, selectLightCondition, selectTransportContext, buildConceptSignature } from '@/lib/content/visualFamilies';
import { selectAssetStrategy, shouldSuppressVisual } from '@/lib/content/assetStrategySelector';
import { getFormatRecommendation, getRequiredBrandElements, getProhibitedElements, validateTextOverlay, getTextOverlayStructure } from '@/lib/content/compositionRules';
import { runVisualGate, determineVisualRiskLevel } from '@/lib/content/visualQualityGate';
import { generateVisualPreview } from '@/lib/content/visualPreview';
import { buildVisualMemoryEntry } from '@/lib/content/visualMemory';
import { selectProvenMechanism } from '@/lib/content/provenReferences';
import { selectCreativeMode, checkMechanismCooldown } from '@/lib/content/creativeMechanism';

import type { VisualProductionPlan, VisualMemoryEntry, VisualFeedbackSignal } from '@/lib/content/visualTypes';
import type { ContentPillar, CreativeAngle, PostFormat, RiskLevel } from '@/lib/content/types';

// ─── POST /api/admin/visual-plan ──────────────────────────────────────────────
// Generate a visual plan for a campaign card.
// Body: { card_id: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { card_id?: string };
    const { card_id } = body;

    if (!card_id) {
      return NextResponse.json({ error: 'card_id required' }, { status: 400 });
    }

    // 1. Load campaign card
    const { data: card, error: cardErr } = await db
      .from('content_campaign_cards')
      .select('*')
      .eq('id', card_id)
      .single();

    if (cardErr || !card) {
      return NextResponse.json(
        { error: cardErr?.message ?? 'Card not found' },
        { status: 404 },
      );
    }

    // 2. Load visual history from other cards' visual_plan JSONB
    const history = await loadVisualHistory();

    // 3. Select visual family
    const pillar  = card.content_pillar as ContentPillar;
    const angle   = card.creative_angle  as CreativeAngle;
    const format  = card.format          as PostFormat;
    const risk    = card.risk_level      as RiskLevel;

    // Determine week index for rotation (use planned_week or current week)
    const weekIndex = getWeekIndex(card.planned_week ?? getCurrentISOWeek());

    const family    = selectVisualFamily(pillar, angle);
    const strategy  = selectAssetStrategy(pillar, angle, risk);

    // Suppress visual for poll/question formats
    const finalStrategy = shouldSuppressVisual(format)
      ? { strategy: 'no_visual_needed' as const, reason_sv: 'Poll/frågeformat behöver ingen bild.' }
      : strategy;

    const scene       = selectSceneType(family, weekIndex, history);
    const composition = selectCompositionDirection(family, weekIndex);
    const mood        = selectMood(family, weekIndex);
    const subject     = selectSubjectType(family, weekIndex);
    const setting     = selectSetting(family, weekIndex);
    const timeOfDay   = selectTimeOfDay(family, weekIndex);
    const light       = selectLightCondition(family, weekIndex);
    const transport   = selectTransportContext(family, card.target_audience ?? '', weekIndex);
    const fmtRec      = getFormatRecommendation(pillar, family);

    // Generate a short on-image headline from driver_insight
    const headline    = deriveHeadline(card.driver_insight, pillar, angle);
    const supportLine = deriveSupportLine(pillar, family);

    const overlayStructure = getTextOverlayStructure(
      composition,
      !!headline,
      !!supportLine,
    );
    const overlayValidation = validateTextOverlay(headline, supportLine, fmtRec);
    const maxWords = overlayValidation.word_count;

    const planId = randomUUID();
    const now    = new Date().toISOString();

    // Select proven reference mechanism + creative mode
    const mechanism     = selectProvenMechanism(pillar, angle, weekIndex, history);
    const creativeMode  = selectCreativeMode(pillar, card.planned_channel ?? 'organic_facebook', mechanism?.id);
    const mechanismWarnings = mechanism
      ? checkMechanismCooldown(mechanism.id, history).map((v) => v.message)
      : [];

    const planBase: Omit<VisualProductionPlan, 'gate_outcome' | 'gate_findings' | 'visual_risk_level'> = {
      id:                      planId,
      campaign_card_id:        card_id,
      visual_objective:        `Visual support for ${angle} content targeting ${card.target_audience}`,
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
      text_overlay_structure:  overlayStructure,
      proposed_headline:       headline,
      proposed_support_line:   supportLine,
      max_word_count_on_image: maxWords,
      format_recommendation:   fmtRec,
      required_brand_elements: getRequiredBrandElements(family),
      prohibited_elements:     getProhibitedElements(family),
      provenance_status:       finalStrategy.strategy === 'branded_graphic' ? 'branded_graphic_ready' : 'unverified',
      lifecycle_status:        'draft',
      generated_by:            'system',
      created_at:              now,
      updated_at:              now,
      // Reference library V1
      ...(mechanism && {
        reference_mechanism_id:     mechanism.id,
        creative_mode:              creativeMode,
        mechanism_selection_reason: `${mechanism.name}: ${mechanism.positioning_mechanism.slice(0, 100)}`,
        channel_fit_recommendation: mechanism.channel_fit.join(', '),
      }),
      ...(mechanismWarnings.length > 0 && {
        mechanism_cooldown_warnings: mechanismWarnings,
      }),
    };

    // 4. Run quality gate
    const gateResult = runVisualGate(planBase as VisualProductionPlan, history);
    const visualRisk = determineVisualRiskLevel(gateResult);

    const plan: VisualProductionPlan = {
      ...planBase,
      gate_outcome:    gateResult.outcome,
      gate_findings:   gateResult.findings,
      visual_risk_level: visualRisk,
      similarity_warning: gateResult.warnings.length > 0
        ? gateResult.warnings[0]
        : undefined,
      lifecycle_status: gateResult.blocked_reasons.length > 0 ? 'held' : 'draft',
    };

    // 5. Generate preview
    const preview = generateVisualPreview(card_id, plan);

    // 6. Persist visual_plan JSONB on the campaign card
    const { error: updateErr } = await db
      .from('content_campaign_cards')
      .update({
        visual_plan: plan,
        updated_at:  now,
      })
      .eq('id', card_id);

    if (updateErr) {
      console.error('[visual-plan] DB update failed:', updateErr.message);
    }

    // 7. Log action
    const actionType = gateResult.blocked_reasons.length > 0
      ? 'content_visual_plan_held'
      : 'content_visual_plan_generated';

    await logAction({
      action_type:  actionType,
      triggered_by: 'founder',
      target_type:  'content_campaign_card',
      target_id:    card_id,
      status:       'completed',
      input:  { family, strategy: finalStrategy.strategy, angle, pillar },
      result: { gate_outcome: gateResult.outcome, visual_risk: visualRisk },
    });

    return NextResponse.json({ plan, preview });
  } catch (err) {
    console.error('[visual-plan] POST error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── GET /api/admin/visual-plan?card_id=... ───────────────────────────────────
// Load existing visual plan for a card.

export async function GET(req: NextRequest) {
  try {
    const card_id = req.nextUrl.searchParams.get('card_id');
    if (!card_id) {
      return NextResponse.json({ error: 'card_id required' }, { status: 400 });
    }

    const { data, error } = await db
      .from('content_campaign_cards')
      .select('id, visual_plan')
      .eq('id', card_id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    const plan = data?.visual_plan as VisualProductionPlan | null;
    if (!plan) {
      return NextResponse.json({ plan: null });
    }

    const preview = generateVisualPreview(card_id, plan);
    return NextResponse.json({ plan, preview });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── PATCH /api/admin/visual-plan ─────────────────────────────────────────────
// Update lifecycle_status or feedback_signals on a visual plan.
// Body: { card_id, lifecycle_status? } | { card_id, feedback_signals? }

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      card_id: string;
      lifecycle_status?: VisualProductionPlan['lifecycle_status'];
      feedback_signals?: VisualFeedbackSignal[];
    };

    const { card_id, lifecycle_status, feedback_signals } = body;
    if (!card_id) {
      return NextResponse.json({ error: 'card_id required' }, { status: 400 });
    }

    // Load current plan
    const { data, error: loadErr } = await db
      .from('content_campaign_cards')
      .select('visual_plan')
      .eq('id', card_id)
      .single();

    if (loadErr || !data?.visual_plan) {
      return NextResponse.json(
        { error: 'Visual plan not found — generate one first.' },
        { status: 404 },
      );
    }

    const current = data.visual_plan as VisualProductionPlan;
    const updated: VisualProductionPlan = {
      ...current,
      updated_at: new Date().toISOString(),
      ...(lifecycle_status !== undefined && { lifecycle_status }),
      ...(feedback_signals !== undefined && { feedback_signals }),
    };

    const { error: updateErr } = await db
      .from('content_campaign_cards')
      .update({ visual_plan: updated, updated_at: updated.updated_at })
      .eq('id', card_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await logAction({
      action_type:  'content_visual_plan_updated',
      triggered_by: 'founder',
      target_type:  'content_campaign_card',
      target_id:    card_id,
      status:       'completed',
      input: {
        ...(lifecycle_status !== undefined && { lifecycle_status }),
        ...(feedback_signals !== undefined && { feedback_signal_count: feedback_signals.length }),
      },
    });

    return NextResponse.json({ ok: true, visual_plan: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadVisualHistory(): Promise<VisualMemoryEntry[]> {
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

    // Approximate planned_date from planned_week + planned_day
    const planned_date = approximatePlannedDate(
      row.planned_week as string | null,
      row.planned_day_of_week as number | null,
    );

    entries.push(
      buildVisualMemoryEntry(vp, planned_date),
    );
  }
  return entries;
}

function approximatePlannedDate(
  planned_week: string | null,
  planned_day: number | null,
): string {
  if (!planned_week) return new Date().toISOString().slice(0, 10);
  // Parse "2026-W26" → Monday of that week + (planned_day - 1) days
  const match = planned_week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return new Date().toISOString().slice(0, 10);
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  const jan4  = new Date(year, 0, 4);
  const jan4d  = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - jan4d + 1 + (week - 1) * 7);
  monday.setDate(monday.getDate() + ((planned_day ?? 1) - 1));
  return monday.toISOString().slice(0, 10);
}

function deriveHeadline(
  driverInsight: string,
  pillar: ContentPillar,
  angle: CreativeAngle,
): string | undefined {
  if (angle === 'community_question') {
    // Community questions as headline
    const first = driverInsight.split(/[.!?]/)[0]?.trim() ?? '';
    const words = first.split(/\s+/);
    if (words.length <= 6) return first;
    return words.slice(0, 5).join(' ') + '…';
  }
  if (pillar === 'acquisition') {
    return 'Hitta rätt uppdrag';
  }
  if (angle === 'myth_vs_reality') {
    return 'Myt eller verklighet?';
  }
  // Default: distill first ~5 words of insight
  const words = driverInsight.trim().split(/\s+/);
  if (words.length <= 6) return driverInsight.trim();
  return words.slice(0, 5).join(' ') + '…';
}

function deriveSupportLine(
  pillar: ContentPillar,
  family: string,
): string | undefined {
  if (family === 'operational_intelligence') {
    return 'drivernord.com';
  }
  if (pillar === 'acquisition') {
    return 'drivernord.com/chaufforer';
  }
  return undefined;
}

function getWeekIndex(isoWeek: string): number {
  const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 53 + parseInt(match[2], 10);
}

function getCurrentISOWeek(): string {
  const now   = new Date();
  const jan4  = new Date(now.getFullYear(), 0, 4);
  const jan4d = jan4.getDay() || 7;
  const start = new Date(jan4);
  start.setDate(jan4.getDate() - jan4d + 1);
  const diff  = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  const week  = Math.floor(diff / 7) + 1;
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
