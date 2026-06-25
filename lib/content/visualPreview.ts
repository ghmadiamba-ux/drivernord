// lib/content/visualPreview.ts
//
// Visual preview specification generator.
//
// For branded_graphic visuals: generates a branded SVG mock (deterministic,
// pure text-in/SVG-out, no external calls, no image downloads).
//
// For real_asset and future_ai_generated: returns a structured concept
// description that the operator uses to brief the visual production.
//
// BOUNDARIES:
//   ✗ Does NOT call any external API
//   ✗ Does NOT connect to Facebook, Meta, or any image service
//   ✓ SVG is generated purely from text inputs — no binary data, no fetches
//   ✓ All previews labeled INTERN FÖRHANDSVISNING

import type { VisualProductionPlan, VisualPreviewSpec } from './visualTypes';
import { BRAND_COLORS, BRAND_NAME, BRAND_LINE } from './creativeBible';

// Preview dimensions: 30% scale of 1080×1350 portrait (primary format)
const PREVIEW_W = 324;
const PREVIEW_H = 405;

// ─── Main entry point ─────────────────────────────────────────────────────────

export function generateVisualPreview(
  campaignCardId: string,
  plan: VisualProductionPlan,
): VisualPreviewSpec {
  if (plan.asset_strategy === 'no_visual_needed') {
    return noVisualSpec(campaignCardId, plan.id);
  }

  const concept    = buildConceptDescription(plan);
  const compNotes  = buildCompositionNotes(plan);
  const copyHier   = buildCopyHierarchy(plan);
  const formatNote = buildFormatNote(plan);

  if (plan.asset_strategy === 'branded_graphic') {
    const svg = generateBrandedGraphicSvg({
      headline:     plan.proposed_headline,
      support_line: plan.proposed_support_line,
      family:       plan.visual_family,
      scene:        plan.scene_type,
    });
    return {
      campaign_card_id:    campaignCardId,
      visual_plan_id:      plan.id,
      is_internal_only:    true,
      preview_type:        'branded_graphic_svg',
      svg_content:         svg,
      concept_description: concept,
      composition_notes:   compNotes,
      copy_hierarchy:      copyHier,
      format_notes:        formatNote,
      disclaimer:
        'INTERN FÖRHANDSVISNING — Ingen extern publicering. ' +
        'Grafiken är ett layoutmock, inte slutproduktion.',
    };
  }

  // real_asset or future_ai_generated
  return {
    campaign_card_id:    campaignCardId,
    visual_plan_id:      plan.id,
    is_internal_only:    true,
    preview_type:        'concept_description',
    concept_description: concept,
    composition_notes:   compNotes,
    copy_hierarchy:      copyHier,
    format_notes:        formatNote,
    disclaimer:
      plan.asset_strategy === 'future_ai_generated'
        ? 'INTERN — Kräver framtida AI-bildgenerering. Ingen bild existerar ännu.'
        : 'INTERN — Kräver verklig tillgångsbild. Grundaren väljer passande foto manuellt.',
  };
}

// ─── Branded graphic SVG generator ───────────────────────────────────────────
// Deterministic SVG from text inputs only. No external calls.

interface SvgParams {
  headline?:    string;
  support_line?: string;
  family: string;
  scene:  string;
}

export function generateBrandedGraphicSvg(params: SvgParams): string {
  const bg      = BRAND_COLORS.primary_dark;
  const accent  = BRAND_COLORS.accent_blue;
  const fg      = BRAND_COLORS.text_on_dark;
  const warm    = BRAND_COLORS.support_warm;

  const headlineText  = params.headline ?? '';
  const familyLabel   = params.family.replace(/_/g, ' ').toUpperCase();
  const sceneLabel    = params.scene.replace(/_/g, ' ');

  const headlineLines = headlineText ? wrapText(headlineText, 20) : [];
  const baselineY     = headlineLines.length > 0 ? 155 : 185;

  const headlineSvg = headlineLines
    .map((line, i) =>
      `  <text x="${PREVIEW_W / 2}" y="${baselineY + i * 34}" text-anchor="middle" ` +
      `font-family="system-ui,sans-serif" font-size="21" font-weight="700" fill="${fg}">${escapeXml(line)}</text>`
    )
    .join('\n');

  const supportY     = baselineY + headlineLines.length * 34 + 18;
  const supportSvg   = params.support_line
    ? `  <text x="${PREVIEW_W / 2}" y="${supportY}" text-anchor="middle" ` +
      `font-family="system-ui,sans-serif" font-size="12" fill="${fg}" opacity="0.8">${escapeXml(params.support_line)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_W}" height="${PREVIEW_H}" viewBox="0 0 ${PREVIEW_W} ${PREVIEW_H}">
  <!-- Background -->
  <rect width="${PREVIEW_W}" height="${PREVIEW_H}" fill="${bg}" rx="8"/>
  <!-- Accent bar -->
  <rect x="0" y="0" width="${PREVIEW_W}" height="4" fill="${accent}"/>
  <!-- Scene / family label (internal only) -->
  <text x="${PREVIEW_W / 2}" y="22" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" fill="${accent}" opacity="0.7" letter-spacing="1">${escapeXml(familyLabel)}</text>
  <text x="${PREVIEW_W / 2}" y="34" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" fill="${fg}" opacity="0.4">${escapeXml(sceneLabel)}</text>
  <!-- Divider -->
  <line x1="32" y1="44" x2="${PREVIEW_W - 32}" y2="44" stroke="${accent}" stroke-width="0.5" opacity="0.3"/>
${headlineSvg}
${supportSvg}
  <!-- Brand line -->
  <text x="${PREVIEW_W / 2}" y="${PREVIEW_H - 40}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="${warm}" opacity="0.85">${escapeXml(BRAND_LINE)}</text>
  <!-- Brand name -->
  <text x="${PREVIEW_W / 2}" y="${PREVIEW_H - 22}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="${fg}" opacity="0.55">${escapeXml(BRAND_NAME)}</text>
  <!-- Watermark -->
  <text x="${PREVIEW_W / 2}" y="${PREVIEW_H - 7}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="6" fill="${fg}" opacity="0.25">INTERN FÖRHANDSVISNING</text>
</svg>`;
}

// ─── Concept description (for non-branded-graphic types) ─────────────────────

function buildConceptDescription(plan: VisualProductionPlan): string {
  const family   = label(plan.visual_family);
  const scene    = label(plan.scene_type);
  const setting  = label(plan.setting);
  const mood     = label(plan.mood);
  const context  = plan.transport_context !== 'none' ? `, ${label(plan.transport_context)}` : '';
  const time     = plan.time_of_day !== 'not_applicable'
    ? `, ${label(plan.time_of_day)}`
    : '';
  const light    = plan.light_condition !== 'not_applicable'
    ? `, ${label(plan.light_condition)}`
    : '';

  return (
    `Familj: ${family}. ` +
    `Scen: ${scene} i ${setting}${time}${light}. ` +
    `Stämning: ${mood}${context}.`
  );
}

function buildCompositionNotes(plan: VisualProductionPlan): string {
  const comp  = label(plan.composition_direction);
  const subj  = label(plan.subject_type);
  return `Komposition: ${comp}. Subjekt: ${subj}.`;
}

function buildCopyHierarchy(plan: VisualProductionPlan): string {
  const parts: string[] = [];
  if (plan.proposed_headline)    parts.push(`H1: "${plan.proposed_headline}"`);
  if (plan.proposed_support_line) parts.push(`H2: "${plan.proposed_support_line}"`);
  return parts.length > 0 ? parts.join(' | ') : 'Ingen bildtext planerad.';
}

function buildFormatNote(plan: VisualProductionPlan): string {
  const notes: Record<string, string> = {
    portrait_1080x1350: '1080×1350 (4:5) — primärt mobilflödesformat',
    square_1080x1080:   '1080×1080 (1:1) — universellt format',
    story_1080x1920:    '1080×1920 (9:16) — Story/Reel-format',
  };
  return notes[plan.format_recommendation] ?? plan.format_recommendation;
}

function noVisualSpec(cardId: string, planId: string): VisualPreviewSpec {
  return {
    campaign_card_id:    cardId,
    visual_plan_id:      planId,
    is_internal_only:    true,
    preview_type:        'concept_description',
    concept_description: 'Inget visuellt element — textbaserat inlägg utan bild.',
    composition_notes:   'Ej tillämpligt.',
    copy_hierarchy:      'Ej tillämpligt.',
    format_notes:        'Textinlägg.',
    disclaimer:          'INTERN — Ingen bild planeras för detta innehåll.',
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function label(s: string): string {
  return s.replace(/_/g, ' ');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
