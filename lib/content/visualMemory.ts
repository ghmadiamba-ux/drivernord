// lib/content/visualMemory.ts
//
// Visual memory — tracks visual production history for anti-repetition checks.
// Builds memory entries, filters history, checks repetition violations.
//
// BOUNDARIES:
//   ✓ Pure functions — no DB imports, no side effects

import type {
  VisualProductionPlan,
  VisualMemoryEntry,
  VisualAntiRepetitionViolation,
  VisualAntiRepetitionResult,
  VisualFeedbackSignal,
  VisualFamily,
  SceneType,
} from './visualTypes';
import {
  buildConceptSignature,
  checkFamilyCooldown,
  checkConsecutiveFamily,
  checkSceneCooldown,
} from './visualFamilies';

// ─── Anti-repetition input ────────────────────────────────────────────────────

export interface VisualAntiRepetitionInput {
  proposed: {
    visual_family:        VisualProductionPlan['visual_family'];
    scene_type:           VisualProductionPlan['scene_type'];
    composition_direction:VisualProductionPlan['composition_direction'];
    text_overlay_structure:VisualProductionPlan['text_overlay_structure'];
    mood:                 VisualProductionPlan['mood'];
    asset_strategy:       VisualProductionPlan['asset_strategy'];
  };
  history: VisualMemoryEntry[];
}

// ─── Main anti-repetition check ───────────────────────────────────────────────

export function checkVisualAntiRepetition(
  input: VisualAntiRepetitionInput,
): VisualAntiRepetitionResult {
  const violations: VisualAntiRepetitionViolation[] = [];

  // Family cooldown (max 2 uses in 7 days; no consecutive same family)
  violations.push(
    ...checkFamilyCooldown(input.history, input.proposed.visual_family),
    ...checkConsecutiveFamily(input.history, input.proposed.visual_family),
  );

  // Scene cooldown (14 days)
  violations.push(
    ...checkSceneCooldown(input.history, input.proposed.scene_type),
  );

  // Text overlay structure cooldown (same structure max 2 times in 14 days)
  const recentSameOverlay = input.history.filter(
    (e) =>
      e.text_overlay_structure === input.proposed.text_overlay_structure &&
      daysSince(e.planned_date) <= 14
  ).length;
  if (recentSameOverlay >= 2) {
    violations.push({
      rule: 'text_overlay_structure_14d',
      message: `Textöverläggsstruktur "${input.proposed.text_overlay_structure}" upprepades ${recentSameOverlay} gånger på 14 dagar (max 2).`,
      severity: 'warn',
    });
  }

  const blocked = violations.some((v) => v.severity === 'block');
  const blocked_reason = blocked
    ? violations
        .filter((v) => v.severity === 'block')
        .map((v) => v.message)
        .join('; ')
    : undefined;

  return { blocked, violations, blocked_reason };
}

// ─── Memory entry builder ─────────────────────────────────────────────────────

export function buildVisualMemoryEntry(
  plan: VisualProductionPlan,
  planned_date: string,
): VisualMemoryEntry {
  return {
    visual_family:          plan.visual_family,
    scene_type:             plan.scene_type,
    subject_type:           plan.subject_type,
    setting:                plan.setting,
    composition_direction:  plan.composition_direction,
    text_overlay_structure: plan.text_overlay_structure,
    transport_context:      plan.transport_context,
    concept_signature: buildConceptSignature(
      plan.visual_family,
      plan.scene_type,
      plan.composition_direction,
      plan.mood,
    ),
    gate_outcome:   plan.gate_outcome,
    planned_date,
    asset_strategy: plan.asset_strategy,
    // Reference library V1 — carry through when present
    ...(plan.reference_mechanism_id && { reference_mechanism_id: plan.reference_mechanism_id }),
    ...(plan.creative_mode          && { creative_mode: plan.creative_mode }),
  };
}

// ─── History filters ──────────────────────────────────────────────────────────

export function filterVisualHistory(
  history: VisualMemoryEntry[],
  days: number,
): VisualMemoryEntry[] {
  return history.filter((e) => daysSince(e.planned_date) <= days);
}

export function filterByFamily(
  history: VisualMemoryEntry[],
  family: VisualFamily,
): VisualMemoryEntry[] {
  return history.filter((e) => e.visual_family === family);
}

export function filterByScene(
  history: VisualMemoryEntry[],
  scene: SceneType,
): VisualMemoryEntry[] {
  return history.filter((e) => e.scene_type === scene);
}

// ─── Feedback analysis ────────────────────────────────────────────────────────

export function extractPausedFamilies(
  planFeedback: Array<{ visual_family: VisualFamily; signals: VisualFeedbackSignal[] }>,
): VisualFamily[] {
  const paused = new Set<VisualFamily>();
  for (const { visual_family, signals } of planFeedback) {
    if (signals.includes('avoid_this_visual_family')) {
      paused.add(visual_family);
    }
  }
  return [...paused];
}

export function extractPausedScenes(
  planFeedback: Array<{ scene_type: SceneType; signals: VisualFeedbackSignal[] }>,
): SceneType[] {
  const paused = new Set<SceneType>();
  for (const { scene_type, signals } of planFeedback) {
    if (signals.includes('avoid_this_scene_type')) {
      paused.add(scene_type);
    }
  }
  return [...paused];
}

export function hasStrongPositiveSignal(signals: VisualFeedbackSignal[]): boolean {
  return (
    signals.includes('excellent_visual_pattern') ||
    signals.includes('reuse_this_visual_direction') ||
    signals.includes('future_campaign_candidate')
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function daysSince(isoDate: string): number {
  const d = new Date(isoDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}
