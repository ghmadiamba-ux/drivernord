// lib/content/visualQualityGate.ts
//
// Visual quality gate — evaluates a proposed visual plan against brand rules,
// content risk, text overlay limits, repetition rules, and brief quality.
//
// BOUNDARIES:
//   ✓ Pure function — no DB imports, no side effects
//   ✗ Does NOT call any external API
//   ✗ Does NOT access Facebook or any image service

import type {
  VisualProductionPlan,
  VisualGateResult,
  VisualGateOutcome,
  VisualMemoryEntry,
} from './visualTypes';
import {
  checkFamilyCooldown,
  checkConsecutiveFamily,
  checkSceneCooldown,
  conceptSimilarity,
  buildConceptSignature,
} from './visualFamilies';
import { validateTextOverlay, checkMobileReadability } from './compositionRules';
import { PROHIBITED_VISUAL_PATTERNS } from './creativeBible';

// Concept similarity thresholds (based on 4-component Jaccard)
const CONCEPT_BLOCK_THRESHOLD = 0.75; // 3 of 4 components match → block
const CONCEPT_WARN_THRESHOLD  = 0.50; // 2 of 4 components match → warn
const CONCEPT_LOOKBACK_DAYS   = 30;

// High-risk headline patterns (on-image text)
const HEADLINE_RISK_PATTERNS = [
  /vi söker/i,
  /ledigt jobb/i,
  /\d+[\s]*kr\/h/i,
  /verifierade förare/i,
  /\d+\s*%/,  // percentage claims
  /schenker|dhl|postnord|lernia|manpower|randstad/i,
];

type PlanInput = Omit<
  VisualProductionPlan,
  'id' | 'gate_outcome' | 'gate_findings' | 'visual_risk_level' | 'created_at' | 'updated_at'
>;

export function runVisualGate(
  plan: PlanInput,
  history: VisualMemoryEntry[],
): VisualGateResult {
  const blocked_reasons: string[] = [];
  const warnings: string[] = [];
  const findings: string[] = [];

  // ── 1. No visual needed ───────────────────────────────────────────────────
  if (plan.asset_strategy === 'no_visual_needed') {
    findings.push('Ingen bild planeras — textbaserat inlägg.');
    return { outcome: 'no_visual_needed', findings, blocked_reasons: [], warnings };
  }

  // ── 2. Text overlay length and mobile readability ─────────────────────────
  const overlayValidation = validateTextOverlay(
    plan.proposed_headline,
    plan.proposed_support_line,
    plan.format_recommendation,
  );
  for (const issue of overlayValidation.issues) {
    blocked_reasons.push(issue);
  }

  const mobileCheck = checkMobileReadability(
    overlayValidation.word_count,
    plan.composition_direction,
    plan.format_recommendation,
  );
  for (const w of mobileCheck.warnings) {
    warnings.push(w);
  }

  // ── 3. Headline risk scan ─────────────────────────────────────────────────
  if (plan.proposed_headline) {
    for (const pattern of HEADLINE_RISK_PATTERNS) {
      if (pattern.test(plan.proposed_headline)) {
        blocked_reasons.push(
          `Bildtext innehåller riskinnehåll ("${plan.proposed_headline}") — hålls för granskning.`
        );
        break;
      }
    }
  }

  // ── 4. Visual family cooldown ─────────────────────────────────────────────
  const familyViolations = [
    ...checkFamilyCooldown(history, plan.visual_family),
    ...checkConsecutiveFamily(history, plan.visual_family),
  ];
  for (const v of familyViolations) {
    if (v.severity === 'block') blocked_reasons.push(v.message);
    else warnings.push(v.message);
  }

  // ── 5. Scene cooldown (14 days) ───────────────────────────────────────────
  const sceneViolations = checkSceneCooldown(history, plan.scene_type);
  for (const v of sceneViolations) {
    if (v.severity === 'block') blocked_reasons.push(v.message);
    else warnings.push(v.message);
  }

  // ── 6. Concept similarity (30 days) ───────────────────────────────────────
  const proposedSig = buildConceptSignature(
    plan.visual_family,
    plan.scene_type,
    plan.composition_direction,
    plan.mood,
  );
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CONCEPT_LOOKBACK_DAYS);

  let maxSim = 0;
  let maxSimDate = '';
  for (const entry of history) {
    if (new Date(entry.planned_date) < cutoff) continue;
    const sim = conceptSimilarity(proposedSig, entry.concept_signature);
    if (sim > maxSim) { maxSim = sim; maxSimDate = entry.planned_date; }
  }

  if (maxSim >= CONCEPT_BLOCK_THRESHOLD) {
    blocked_reasons.push(
      `Konceptlikhet ${(maxSim * 100).toFixed(0)}% med inlägg ${maxSimDate} — för likt, undvik upprepning inom 30 dagar.`
    );
  } else if (maxSim >= CONCEPT_WARN_THRESHOLD) {
    warnings.push(
      `Konceptlikhet ${(maxSim * 100).toFixed(0)}% med inlägg ${maxSimDate}.`
    );
  }

  // ── 7. Generic concept mismatch ───────────────────────────────────────────
  if (
    plan.scene_type === 'branded_text_only' &&
    plan.visual_family === 'reality_of_work'
  ) {
    warnings.push(
      'Scen "branded_text_only" passar sällan familj "reality_of_work" — överväg "community_conversation" eller "operational_intelligence".'
    );
  }

  // ── 8. Required brief quality check ──────────────────────────────────────
  if (
    (plan.visual_family === 'driver_pride' || plan.visual_family === 'reality_of_work') &&
    plan.asset_strategy === 'real_asset' &&
    !plan.proposed_headline
  ) {
    warnings.push(
      'Verklig bild utan bildtext — överväg att lägga till en rubrik för att guida betraktarens uppmärksamhet.'
    );
  }

  // ── 9. Unverified real asset ──────────────────────────────────────────────
  if (
    plan.asset_strategy === 'real_asset' &&
    plan.provenance_status === 'unverified'
  ) {
    findings.push('Verklig bild krävs — ingen godkänd tillgång finns ännu.');
    if (blocked_reasons.length === 0) {
      return { outcome: 'requires_real_asset', findings, blocked_reasons: [], warnings };
    }
  }

  // ── 10. Future AI generation ──────────────────────────────────────────────
  if (plan.asset_strategy === 'future_ai_generated') {
    findings.push('Fotorealistisk AI-bild krävs — köad för när bildpipeline öppnas.');
    if (blocked_reasons.length === 0) {
      return { outcome: 'requires_future_ai_generation', findings, blocked_reasons: [], warnings };
    }
  }

  // ── Final outcome ─────────────────────────────────────────────────────────
  if (blocked_reasons.length > 0) {
    const outcome: VisualGateOutcome = determineBlockOutcome(plan, blocked_reasons);
    return { outcome, findings, blocked_reasons, warnings };
  }

  findings.push('Klarad granskning — visuell plan godkänd för intern förhandsvisning.');
  return { outcome: 'ready_for_internal_preview', findings, blocked_reasons: [], warnings };
}

function determineBlockOutcome(
  plan: PlanInput,
  reasons: string[],
): VisualGateOutcome {
  if (reasons.some((r) => r.includes('riskinnehåll'))) return 'held_for_risk';
  if (reasons.some((r) => r.includes('Konceptlikhet') || r.includes('avkylning') || r.includes('Familj'))) {
    return 'blocked_for_repetition';
  }
  if (reasons.some((r) => r.includes('ord') || r.includes('läst'))) return 'needs_better_brief';
  return 'held_for_risk';
}

// ─── Determine visual risk level ──────────────────────────────────────────────

export function determineVisualRiskLevel(
  gateResult: VisualGateResult,
): 'low' | 'medium' | 'high' {
  if (gateResult.blocked_reasons.length > 0) return 'high';
  if (gateResult.warnings.length > 2)       return 'medium';
  return 'low';
}

// Re-export prohibited patterns for tests
export { PROHIBITED_VISUAL_PATTERNS };
