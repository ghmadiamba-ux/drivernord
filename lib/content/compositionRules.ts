// lib/content/compositionRules.ts
//
// Brand composition rules — format specs, safe text zones, text overlay limits,
// mobile readability guidelines, required and prohibited brand elements.
//
// BOUNDARIES:
//   ✓ Pure constants and helper functions — no DB imports, no side effects

import type { ContentPillar } from './types';
import type {
  VisualFamily,
  VisualFormatRecommendation,
  CompositionDirection,
  TextOverlayStructure,
} from './visualTypes';
import { BRAND_TYPOGRAPHY } from './creativeBible';

// ─── Format specifications ────────────────────────────────────────────────────

export interface FormatSpec {
  width:  number;
  height: number;
  label:  string;
  aspect: string;
  // Safe zone fractions from edge (0–1)
  safe_top:    number;
  safe_bottom: number;
  safe_left:   number;
  safe_right:  number;
  // Font guidance (px at 1080-width production scale)
  max_headline_px:  number;
  max_support_px:   number;
  max_brand_px:     number;
  // Word limit for this format
  max_on_image_words: number;
}

export const FORMAT_SPECS: Record<VisualFormatRecommendation, FormatSpec> = {
  portrait_1080x1350: {
    width: 1080, height: 1350,
    label: '4:5 Portrait (primär)', aspect: '4:5',
    safe_top: 0.08, safe_bottom: 0.08, safe_left: 0.06, safe_right: 0.06,
    max_headline_px: 72, max_support_px: 36, max_brand_px: 28,
    max_on_image_words: 16,
  },
  square_1080x1080: {
    width: 1080, height: 1080,
    label: '1:1 Kvadrat (sekundär)', aspect: '1:1',
    safe_top: 0.10, safe_bottom: 0.10, safe_left: 0.08, safe_right: 0.08,
    max_headline_px: 68, max_support_px: 32, max_brand_px: 24,
    max_on_image_words: 14,
  },
  story_1080x1920: {
    width: 1080, height: 1920,
    label: '9:16 Story/Reel', aspect: '9:16',
    safe_top: 0.15, safe_bottom: 0.15, safe_left: 0.06, safe_right: 0.06,
    max_headline_px: 80, max_support_px: 40, max_brand_px: 32,
    max_on_image_words: 18,
  },
};

// ─── Format recommendation ────────────────────────────────────────────────────

export function getMaxWordCount(format: VisualFormatRecommendation): number {
  return FORMAT_SPECS[format].max_on_image_words;
}

export function getFormatRecommendation(
  pillar: ContentPillar,
  family: VisualFamily,
): VisualFormatRecommendation {
  if (family === 'community_conversation') return 'square_1080x1080';
  if (family === 'drivernord_campaign')    return 'portrait_1080x1350';
  if (pillar === 'acquisition')            return 'portrait_1080x1350';
  return 'portrait_1080x1350';  // primary default
}

// ─── Composition per family ───────────────────────────────────────────────────

const FAMILY_COMPOSITIONS: Record<VisualFamily, CompositionDirection[]> = {
  reality_of_work:         ['documentary_candid', 'vehicle_dominant', 'landscape_wide', 'close_up_detail', 'driver_subject_foreground'],
  driver_pride:            ['driver_subject_foreground', 'close_up_detail', 'documentary_candid'],
  operational_intelligence:['text_centered_minimal', 'split_horizontal'],
  community_conversation:  ['text_centered_minimal'],
  drivernord_campaign:     ['driver_subject_foreground', 'landscape_wide', 'text_centered_minimal'],
};

export function getCompositionForFamily(
  family: VisualFamily,
  weekIndex: number,
): CompositionDirection {
  const options = FAMILY_COMPOSITIONS[family];
  return options[weekIndex % options.length];
}

// ─── Text overlay structure per composition ───────────────────────────────────

export function getTextOverlayStructure(
  composition: CompositionDirection,
  hasHeadline: boolean,
  hasSupportLine: boolean,
): TextOverlayStructure {
  if (!hasHeadline && !hasSupportLine) return 'no_text';
  if (composition === 'text_centered_minimal') {
    return hasHeadline && hasSupportLine ? 'headline_plus_support' : 'text_only_minimal';
  }
  if (composition === 'split_horizontal') return 'headline_plus_support';
  if (hasHeadline && hasSupportLine) return 'headline_plus_support';
  if (hasHeadline) return 'single_headline';
  return 'no_text';
}

// ─── Text overlay validation ──────────────────────────────────────────────────

export interface TextOverlayValidation {
  valid: boolean;
  word_count: number;
  issues: string[];
}

export function validateTextOverlay(
  headline: string | undefined,
  support_line: string | undefined,
  format: VisualFormatRecommendation,
): TextOverlayValidation {
  const issues: string[] = [];
  const spec = FORMAT_SPECS[format];
  let total = 0;

  if (headline) {
    const hw = headline.trim().split(/\s+/).length;
    total += hw;
    if (hw > BRAND_TYPOGRAPHY.headline_max_words) {
      issues.push(`Rubrik ${hw} ord (max ${BRAND_TYPOGRAPHY.headline_max_words}).`);
    }
  }
  if (support_line) {
    const sw = support_line.trim().split(/\s+/).length;
    total += sw;
    if (sw > BRAND_TYPOGRAPHY.support_max_words) {
      issues.push(`Stödtext ${sw} ord (max ${BRAND_TYPOGRAPHY.support_max_words}).`);
    }
  }
  if (total > spec.max_on_image_words) {
    issues.push(`Total bildtext ${total} ord (max ${spec.max_on_image_words} för ${format}).`);
  }

  return { valid: issues.length === 0, word_count: total, issues };
}

// ─── Brand elements per family ────────────────────────────────────────────────

export function getRequiredBrandElements(family: VisualFamily): string[] {
  const base = ['brand_name_or_logo', 'brand_color_presence'];
  if (family === 'drivernord_campaign') {
    return [...base, 'brand_line_text', 'domain_url'];
  }
  return base;
}

export function getProhibitedElements(family: VisualFamily): string[] {
  const base = [
    'external_company_logos',
    'identifiable_license_plates',
    'salary_or_rate_claims',
    'job_vacancy_claims',
    'statistical_claims_without_source',
  ];
  if (family === 'reality_of_work' || family === 'driver_pride') {
    return [...base, 'generic_non_swedish_stock', 'ai_generated_faces_unmarked', 'identifiable_persons_no_consent'];
  }
  return [...base, 'identifiable_persons_no_consent'];
}

// ─── Mobile readability check ─────────────────────────────────────────────────

export interface MobileReadabilityResult {
  passes: boolean;
  warnings: string[];
}

export function checkMobileReadability(
  word_count: number,
  composition: CompositionDirection,
  format: VisualFormatRecommendation,
): MobileReadabilityResult {
  const warnings: string[] = [];
  const spec = FORMAT_SPECS[format];

  if (word_count > 12) {
    warnings.push(`${word_count} ord på bild kan vara svårläst på mobil. Rekommendation: max 12.`);
  }

  if (composition === 'split_horizontal' && format === 'portrait_1080x1350') {
    warnings.push('Split-layout i portrait-format kan ge trångt utrymme per panel — testa på mobil.');
  }

  return { passes: warnings.length === 0, warnings };
}
