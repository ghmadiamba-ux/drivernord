// tests/w28AlignmentAndSafety.test.ts
//
// Regression tests for:
//   A. Sprint card alignment (created_by tag, no duplicate-day ambiguity)
//   B. Regulatory content detection and hold classification
//   C. SVG body-text minimum readability (font-size floor)

import { describe, it, expect } from 'vitest';
import {
  detectsRegulatoryContent,
  isRegulatoryHold,
  buildRegulatoryBlockedReason,
  REGULATORY_BLOCKED_REASON_PREFIX,
} from '../lib/content/regulatoryContentDetector';
import { checkSprintSvgReadability } from '../lib/content/compositionRules';
import { W28_MONDAY, W28_WEDNESDAY, W28_FRIDAY, W28_SUNDAY, W28_PACKAGES_ORDERED, W28_EXECUTION_PACKAGES } from '../lib/content/visualExecutionPackages';

// ─── A. Sprint card alignment guard ──────────────────────────────────────────
//
// The sprint script filters by `created_by = SPRINT_TAG` and then checks that
// no day-slot has more than one matching card. This set of tests validates
// the guard logic that would be applied during script execution.

describe('sprint card alignment — duplicate-day safety guard', () => {
  const SPRINT_TAG = 'dry_run_phase4_proven_reference_2026_W28';

  it('SPRINT_TAG is a non-empty string that starts with dry_run_', () => {
    expect(SPRINT_TAG.startsWith('dry_run_')).toBe(true);
    expect(SPRINT_TAG.length).toBeGreaterThan(0);
  });

  it('duplicate-day detection: identifies days with multiple cards', () => {
    // Simulate the guard logic from the sprint script
    const cards = [
      { id: 'a', planned_day_of_week: 1, created_by: SPRINT_TAG },
      { id: 'b', planned_day_of_week: 1, created_by: SPRINT_TAG }, // duplicate day 1
      { id: 'c', planned_day_of_week: 3, created_by: SPRINT_TAG },
    ];

    const daysSeen = new Map<number, string[]>();
    for (const c of cards) {
      const d = c.planned_day_of_week;
      const ids = daysSeen.get(d) ?? [];
      ids.push(c.id);
      daysSeen.set(d, ids);
    }
    const duplicateDays = [...daysSeen.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([day]) => day);

    expect(duplicateDays).toContain(1);
    expect(duplicateDays).not.toContain(3);
    expect(duplicateDays.length).toBe(1);
  });

  it('duplicate-day detection: clean set produces no duplicates', () => {
    const cards = [
      { id: 'a', planned_day_of_week: 1 },
      { id: 'b', planned_day_of_week: 3 },
      { id: 'c', planned_day_of_week: 5 },
      { id: 'd', planned_day_of_week: 7 },
    ];

    const daysSeen = new Map<number, string[]>();
    for (const c of cards) {
      const d = c.planned_day_of_week;
      const ids = daysSeen.get(d) ?? [];
      ids.push(c.id);
      daysSeen.set(d, ids);
    }
    const duplicateDays = [...daysSeen.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([day]) => day);

    expect(duplicateDays).toHaveLength(0);
  });

  it('sprint packages cover only days 1, 3, 5, 7 — no ambiguous days', () => {
    const days = Object.keys(W28_EXECUTION_PACKAGES).map(Number);
    // All days are unique
    expect(new Set(days).size).toBe(days.length);
    // All days are the expected set
    expect(days.sort()).toEqual([1, 3, 5, 7]);
  });
});

// ─── B. Regulatory content detector ──────────────────────────────────────────
//
// Catches: driving-time rules, rest period rules, tachograph/färdskrivare
// references, specific regulatory durations, Transportstyrelsen mentions.

describe('regulatory content detector — detection accuracy', () => {
  it('detects färdskrivare (Swedish tachograph)', () => {
    const result = detectsRegulatoryContent('Digitalt färdskrivarkort är obligatoriskt.');
    expect(result.is_regulatory).toBe(true);
    expect(result.matched_labels).toContain('tachograph/färdskrivare');
  });

  it('detects tachograph (English)', () => {
    const result = detectsRegulatoryContent('EU tachograph rules apply.');
    expect(result.is_regulatory).toBe(true);
  });

  it('detects veckovila (weekly rest reference)', () => {
    const result = detectsRegulatoryContent('Veckovila — 45 timmar.');
    expect(result.is_regulatory).toBe(true);
    expect(result.matched_labels.some(l => l.includes('rest'))).toBe(true);
  });

  it('detects dygnsvilotid (daily rest reference)', () => {
    const result = detectsRegulatoryContent('Dygnsvilotid — 11 timmar.');
    expect(result.is_regulatory).toBe(true);
  });

  it('detects 4.5h driving rule', () => {
    const result = detectsRegulatoryContent('Rast efter 4,5 h körning.');
    expect(result.is_regulatory).toBe(true);
    expect(result.matched_labels).toContain('specific hour rule (4.5h)');
  });

  it('detects 11-hour rest rule', () => {
    const result = detectsRegulatoryContent('Minst 11 timmar dygnsvilotid.');
    expect(result.is_regulatory).toBe(true);
    expect(result.matched_labels).toContain('specific rest (11h)');
  });

  it('detects 45-hour weekly rest', () => {
    const result = detectsRegulatoryContent('Veckovila 45 timmar.');
    expect(result.is_regulatory).toBe(true);
    expect(result.matched_labels).toContain('specific rest (45h)');
  });

  it('detects Transportstyrelsen mention', () => {
    const result = detectsRegulatoryContent('Enligt Transportstyrelsen gäller...');
    expect(result.is_regulatory).toBe(true);
    expect(result.matched_labels).toContain('Transportstyrelsen');
  });

  it('does NOT flag generic driver content as regulatory', () => {
    const result = detectsRegulatoryContent('Er YKB och CE öppnar dörrar. Registrera dig hos DriverNord.');
    expect(result.is_regulatory).toBe(false);
  });

  it('does NOT flag community questions as regulatory', () => {
    const result = detectsRegulatoryContent('Hur hanterar ni stress under högsäsong?');
    expect(result.is_regulatory).toBe(false);
  });

  it('does NOT flag distribution morning content as regulatory', () => {
    const result = detectsRegulatoryContent('Kl 04:30 — Fordonet ska vara körklart. En typisk distributionsmorgon.');
    expect(result.is_regulatory).toBe(false);
  });
});

describe('regulatory content detector — isRegulatoryHold', () => {
  it('returns true for blocked_reason starting with prefix', () => {
    const reason = `${REGULATORY_BLOCKED_REASON_PREFIX} Some explanation.`;
    expect(isRegulatoryHold(reason)).toBe(true);
  });

  it('returns false for non-regulatory blocked reasons', () => {
    expect(isRegulatoryHold('Similarity block — too close to W27 content.')).toBe(false);
    expect(isRegulatoryHold('Manual hold pending review.')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isRegulatoryHold(null)).toBe(false);
    expect(isRegulatoryHold(undefined)).toBe(false);
  });

  it('buildRegulatoryBlockedReason starts with the correct prefix', () => {
    const reason = buildRegulatoryBlockedReason(['tachograph/färdskrivare', 'rest period rules']);
    expect(reason.startsWith(REGULATORY_BLOCKED_REASON_PREFIX)).toBe(true);
    expect(reason).toContain('tachograph/färdskrivare');
    expect(reason).toContain('rest period rules');
  });
});

describe('regulatory hold — W28 färdskrivaren draft text flags correctly', () => {
  const FARDSKRIVAREN_DRAFT =
    'Färdskrivaren — praktiska påminnelser. Rast efter 4,5 h körning. ' +
    'Dygnsvilotid — 11 timmar. Veckovila — 45 timmar.';

  it('detects the W28 färdskrivaren card draft as regulatory', () => {
    const result = detectsRegulatoryContent(FARDSKRIVAREN_DRAFT);
    expect(result.is_regulatory).toBe(true);
    expect(result.matched_labels.length).toBeGreaterThanOrEqual(3);
  });

  it('buildRegulatoryBlockedReason for W28 card includes key terms', () => {
    const result = detectsRegulatoryContent(FARDSKRIVAREN_DRAFT);
    const reason = buildRegulatoryBlockedReason(result.matched_labels);
    expect(isRegulatoryHold(reason)).toBe(true);
    expect(reason).toContain('official source');
  });
});

// ─── C. SVG body-text readability ─────────────────────────────────────────────
//
// Sprint SVGs must have body text ≥ 9px at the 400×500 preview scale
// (equivalent to ≥ 24px at production 1080×1350).

describe('SVG sprint prototype body-text readability', () => {
  it('W28 Monday SVG passes font-size floor', () => {
    const result = checkSprintSvgReadability(W28_MONDAY.prototype.svg_content);
    expect(result.violations).toHaveLength(0);
    expect(result.passes).toBe(true);
  });

  it('W28 Wednesday SVG passes font-size floor', () => {
    const result = checkSprintSvgReadability(W28_WEDNESDAY.prototype.svg_content);
    expect(result.violations).toHaveLength(0);
    expect(result.passes).toBe(true);
  });

  it('W28 Friday SVG passes font-size floor', () => {
    const result = checkSprintSvgReadability(W28_FRIDAY.prototype.svg_content);
    expect(result.violations).toHaveLength(0);
    expect(result.passes).toBe(true);
  });

  it('W28 Sunday SVG passes font-size floor', () => {
    const result = checkSprintSvgReadability(W28_SUNDAY.prototype.svg_content);
    expect(result.violations).toHaveLength(0);
    expect(result.passes).toBe(true);
  });

  it('detects an SVG with tiny body text (font-size=5) as a violation', () => {
    const badSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
      <text x="200" y="100" font-size="22" fill="#fff">HEADLINE</text>
      <text x="200" y="130" font-size="5" fill="#ccc">Tiny explanatory line</text>
    </svg>`;
    const result = checkSprintSvgReadability(badSvg);
    expect(result.passes).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]).toContain('font-size="5"');
  });

  it('watermark text with letter-spacing attribute is exempt from floor check', () => {
    const watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
      <text x="200" y="100" font-size="22" fill="#fff">HEADLINE</text>
      <text x="200" y="490" font-size="6" fill="#aaa" letter-spacing="1">INTERN FORHANDSVISNING</text>
    </svg>`;
    const result = checkSprintSvgReadability(watermarkSvg);
    expect(result.passes).toBe(true);
  });

  it('headline-scale font-size (≥18) is exempt from the floor check', () => {
    const headlineSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
      <text x="200" y="100" font-size="28" fill="#fff">HEADLINE</text>
      <text x="200" y="130" font-size="18" fill="#ccc">Sub-heading</text>
    </svg>`;
    const result = checkSprintSvgReadability(headlineSvg);
    expect(result.passes).toBe(true);
  });

  it('body text exactly at floor (font-size=8) passes', () => {
    const borderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
      <text x="200" y="100" font-size="22" fill="#fff">HEADLINE</text>
      <text x="200" y="130" font-size="8" fill="#aaa">Just-passing body</text>
    </svg>`;
    const result = checkSprintSvgReadability(borderSvg);
    expect(result.passes).toBe(true);
  });
});
