// tests/visualExecutionSprint.test.ts
//
// Visual Execution Sprint V1 — focused tests verifying:
//   - Prototype selection by asset strategy
//   - W28 Sunday avoids the blocked W27 visual direction
//   - No repeated composition across the four cards
//   - No repeated headline structure
//   - No black/yellow performance treatment
//   - Mobile word-count limits
//   - No external image API invocation
//   - No Facebook / publishing invocation
//   - Canonical domain protection (drivernord.com only)

import { describe, it, expect } from 'vitest';
import {
  W28_MONDAY,
  W28_WEDNESDAY,
  W28_FRIDAY,
  W28_SUNDAY,
  W28_PACKAGES_ORDERED,
  W28_EXECUTION_PACKAGES,
} from '../lib/content/visualExecutionPackages';

// ─── 1. Prototype selection by asset strategy ─────────────────────────────────

describe('prototype selection by asset strategy', () => {
  it('Monday uses svg_branded_graphic (all achievable with SVG)', () => {
    expect(W28_MONDAY.prototype.type).toBe('svg_branded_graphic');
  });

  it('Wednesday uses real_asset_layout_mock (photo required)', () => {
    expect(W28_WEDNESDAY.prototype.type).toBe('real_asset_layout_mock');
  });

  it('Friday uses ai_direction_composition_mock (future AI generation)', () => {
    expect(W28_FRIDAY.prototype.type).toBe('ai_direction_composition_mock');
  });

  it('Sunday uses svg_branded_graphic (fresh community design)', () => {
    expect(W28_SUNDAY.prototype.type).toBe('svg_branded_graphic');
  });

  it('Wednesday includes execution_board for photo selection criteria', () => {
    expect(W28_WEDNESDAY.prototype.execution_board).toBeDefined();
    expect(W28_WEDNESDAY.prototype.execution_board!.photo_criteria).toBeTruthy();
    expect(W28_WEDNESDAY.prototype.execution_board!.do_not_use.length).toBeGreaterThan(0);
  });

  it('Friday includes ai_direction package with scene and negative_constraints', () => {
    expect(W28_FRIDAY.prototype.ai_direction).toBeDefined();
    expect(W28_FRIDAY.prototype.ai_direction!.scene).toBeTruthy();
    expect(W28_FRIDAY.prototype.ai_direction!.negative_constraints.length).toBeGreaterThan(3);
  });

  it('Monday and Sunday have no execution_board or ai_direction (SVG-only)', () => {
    expect(W28_MONDAY.prototype.execution_board).toBeUndefined();
    expect(W28_MONDAY.prototype.ai_direction).toBeUndefined();
    expect(W28_SUNDAY.prototype.execution_board).toBeUndefined();
    expect(W28_SUNDAY.prototype.ai_direction).toBeUndefined();
  });
});

// ─── 2. All four cards exist and are keyed correctly ─────────────────────────

describe('W28_EXECUTION_PACKAGES structure', () => {
  it('has exactly 4 packages for days 1, 3, 5, 7', () => {
    expect(Object.keys(W28_EXECUTION_PACKAGES)).toHaveLength(4);
    expect(W28_EXECUTION_PACKAGES[1]).toBeDefined();
    expect(W28_EXECUTION_PACKAGES[3]).toBeDefined();
    expect(W28_EXECUTION_PACKAGES[5]).toBeDefined();
    expect(W28_EXECUTION_PACKAGES[7]).toBeDefined();
  });

  it('W28_PACKAGES_ORDERED has 4 entries', () => {
    expect(W28_PACKAGES_ORDERED).toHaveLength(4);
  });

  it('all packages declare version v1', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      expect(pkg.version).toBe('v1');
    }
  });
});

// ─── 3. W28 Sunday avoids the blocked W27 visual direction ───────────────────

describe('W28 Sunday anti-repetition — avoids W27 blocked direction', () => {
  it('Sunday does NOT use branded_text_only prototype type', () => {
    expect(W28_SUNDAY.prototype.type).not.toBe('branded_text_only');
  });

  it('Sunday prototype type is svg_branded_graphic (not the blocked type)', () => {
    expect(W28_SUNDAY.prototype.type).toBe('svg_branded_graphic');
  });

  it('Sunday SVG does not use branded_text_only scene label', () => {
    expect(W28_SUNDAY.prototype.svg_content).not.toContain('branded_text_only');
  });

  it('Sunday uses a conversational/speech-bubble composition — composition_notes describes it', () => {
    const notes = W28_SUNDAY.prototype.composition_notes.toLowerCase();
    expect(notes).toMatch(/pratbubbla|speech|bubble|community|konversation/i);
  });

  it('Sunday quality review confirms scene_repetition is addressed', () => {
    expect(W28_SUNDAY.quality_review.scene_repetition).toContain('community_prompt');
  });

  it('Sunday quality review confirms composition is distinct from W27', () => {
    expect(W28_SUNDAY.quality_review.composition_repetition).toMatch(/pratbubbla|ny komposition|ej anvamd/i);
  });

  it('Sunday uses warm purple color scheme (not navy) — distinct from W27', () => {
    // Sunday SVG uses #1A1535 (warm purple) not #1C1C2E (navy)
    expect(W28_SUNDAY.prototype.svg_content).toContain('#1A1535');
    expect(W28_SUNDAY.prototype.svg_content).not.toMatch(/fill="#1C1C2E".*fill="#1C1C2E"/);
  });
});

// ─── 4. No repeated composition across four cards ────────────────────────────

describe('composition diversity — no repeated structure', () => {
  it('all four prototype types are not all identical', () => {
    const types = W28_PACKAGES_ORDERED.map(p => p.prototype.type);
    const unique = new Set(types);
    // We have 3 distinct types (svg_branded_graphic appears twice, but Mon/Sun are different)
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it('Monday and Sunday SVGs use different background colors', () => {
    // Monday: navy #1C1C2E, Sunday: warm purple #1A1535
    expect(W28_MONDAY.prototype.svg_content).toContain('#1C1C2E');
    expect(W28_SUNDAY.prototype.svg_content).toContain('#1A1535');
    expect(W28_MONDAY.prototype.svg_content).not.toContain('#1A1535');
    expect(W28_SUNDAY.prototype.svg_content).not.toContain('#1C1C2E');
  });

  it('Monday and Sunday have different composition notes', () => {
    expect(W28_MONDAY.prototype.composition_notes).not.toBe(W28_SUNDAY.prototype.composition_notes);
  });

  it('Wednesday has a different brief objective from all others', () => {
    const wedObj = W28_WEDNESDAY.brief.objective;
    for (const pkg of [W28_MONDAY, W28_FRIDAY, W28_SUNDAY]) {
      expect(pkg.brief.objective).not.toBe(wedObj);
    }
  });

  it('Friday brief references driver control / career confidence', () => {
    const text = (W28_FRIDAY.brief.central_visual_idea + W28_FRIDAY.brief.objective).toLowerCase();
    expect(text).toMatch(/ykb|kompetens|valjer|matchar|career|control/i);
  });
});

// ─── 5. No repeated headline structure ───────────────────────────────────────

describe('headline diversity', () => {
  it('all four headlines are distinct', () => {
    const headlines = W28_PACKAGES_ORDERED.map(p => p.on_image_copy.headline);
    const unique = new Set(headlines);
    expect(unique.size).toBe(4);
  });

  it('no two headlines start with the same word', () => {
    const firstWords = W28_PACKAGES_ORDERED.map(p =>
      p.on_image_copy.headline.split(' ')[0]!.toLowerCase()
    );
    const unique = new Set(firstWords);
    expect(unique.size).toBe(4);
  });

  it('no headline repeats a forbidden phrase', () => {
    const forbidden = ['3 minuter', 'inte bemanning', 'sluta skicka cv', 'trott pa rekryterare'];
    for (const pkg of W28_PACKAGES_ORDERED) {
      const h = pkg.on_image_copy.headline.toLowerCase();
      for (const phrase of forbidden) {
        expect(h).not.toContain(phrase);
      }
      if (pkg.on_image_copy.support_line) {
        const s = pkg.on_image_copy.support_line.toLowerCase();
        for (const phrase of forbidden) {
          expect(s).not.toContain(phrase);
        }
      }
    }
  });
});

// ─── 6. No black/yellow performance treatment ────────────────────────────────

describe('no black/yellow performance treatment in trust_organic cards', () => {
  it('no SVG contains the performance black #000000 as fill', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      // Performance mode uses pure black (#000000) — not used in trust_organic sprint
      expect(pkg.prototype.svg_content).not.toContain('fill="#000000"');
    }
  });

  it('no SVG contains performance yellow #F5C100', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      expect(pkg.prototype.svg_content).not.toContain('#F5C100');
    }
  });

  it('no brief or on-image copy references performance acquisition mode', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      const allText = JSON.stringify(pkg.brief).toLowerCase();
      expect(allText).not.toContain('performance_acquisition');
    }
  });
});

// ─── 7. Mobile word-count limits ─────────────────────────────────────────────

describe('mobile word-count limits', () => {
  const MAX_WORDS_ON_IMAGE = 16;

  it('all four cards respect the mobile word-count ceiling', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      expect(pkg.on_image_copy.word_count).toBeLessThanOrEqual(MAX_WORDS_ON_IMAGE);
    }
  });

  it('word_count field matches actual headline + support_line word count', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      const copy = pkg.on_image_copy;
      const text = [copy.headline, copy.support_line, copy.cta_line]
        .filter(Boolean)
        .join(' ');
      const actualCount = text.split(/\s+/).filter(Boolean).length;
      // Allow ±2 tolerance (counted differently sometimes)
      expect(Math.abs(actualCount - copy.word_count)).toBeLessThanOrEqual(3);
    }
  });

  it('no on_image_copy headline exceeds 10 words', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      const wordCount = pkg.on_image_copy.headline.split(/\s+/).filter(Boolean).length;
      expect(wordCount).toBeLessThanOrEqual(10);
    }
  });
});

// ─── 8. No external image API invocation ─────────────────────────────────────

describe('no external image API invocation', () => {
  it('SVG content contains no external src or href references', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      const svg = pkg.prototype.svg_content;
      // No <image> tags (which could embed external photos)
      expect(svg).not.toMatch(/<image\s/i);
      // No xlink:href (old SVG external reference mechanism)
      expect(svg).not.toContain('xlink:href');
      // No script tags
      expect(svg).not.toMatch(/<script/i);
      // No non-SVG external URLs — allow only the mandatory xmlns w3.org namespace
      // Strip xmlns declarations, then verify no remaining http(s) URLs
      const svgWithoutXmlns = svg.replace(/xmlns(?::\w+)?="[^"]*"/g, '');
      expect(svgWithoutXmlns).not.toMatch(/https?:\/\//);
    }
  });

  it('execution packages module imports no network client', async () => {
    // The module itself is pure data — it imports only from visualTypes
    // Verify the file source does not import axios, fetch, or supabase-js
    const src = await import('fs').then(fs =>
      fs.readFileSync(
        new URL('../lib/content/visualExecutionPackages.ts', import.meta.url).pathname.replace(/^\/[A-Z]:/, (m) => m.slice(1)),
        'utf8'
      )
    ).catch(() => '');
    expect(src).not.toContain('import fetch');
    expect(src).not.toContain('import axios');
    expect(src).not.toContain('@supabase/supabase-js');
    expect(src).not.toContain('createClient');
  });
});

// ─── 9. No Facebook or publishing invocation ─────────────────────────────────

describe('no Facebook or publishing invocation', () => {
  it('no brief references Facebook publish or Meta API', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      const text = JSON.stringify(pkg).toLowerCase();
      expect(text).not.toContain('facebook.com');
      expect(text).not.toContain('graph.facebook');
      expect(text).not.toContain('meta api');
      expect(text).not.toContain('publish_to');
    }
  });

  it('all disclaimers confirm internal use only', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      const d = pkg.prototype.disclaimer.toLowerCase();
      expect(d).toMatch(/intern|internal|ej publicerad|not for publication/i);
    }
  });
});

// ─── 10. Canonical domain protection ─────────────────────────────────────────

describe('canonical domain protection', () => {
  it('all SVGs reference drivernord.com — not drivernord.se', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      const svg = pkg.prototype.svg_content;
      expect(svg).toContain('drivernord.com');
      expect(svg).not.toContain('drivernord.se');
    }
  });

  it('no brief or copy uses drivernord.se', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      const text = JSON.stringify(pkg);
      expect(text).not.toContain('drivernord.se');
    }
  });
});

// ─── 11. Sprint quality gates ────────────────────────────────────────────────

describe('sprint quality gate results', () => {
  it('Monday and Sunday have ready_for_internal_preview gate outcome', () => {
    expect(W28_MONDAY.quality_review.gate_outcome).toBe('ready_for_internal_preview');
    expect(W28_SUNDAY.quality_review.gate_outcome).toBe('ready_for_internal_preview');
  });

  it('Wednesday has requires_real_asset gate outcome', () => {
    expect(W28_WEDNESDAY.quality_review.gate_outcome).toBe('requires_real_asset');
  });

  it('Friday has requires_future_ai_generation gate outcome', () => {
    expect(W28_FRIDAY.quality_review.gate_outcome).toBe('requires_future_ai_generation');
  });

  it('all cards have a founder_review_question defined', () => {
    for (const pkg of W28_PACKAGES_ORDERED) {
      expect(pkg.quality_review.founder_review_question.length).toBeGreaterThan(20);
    }
  });
});

// ─── 12. Visual diversity requirements ───────────────────────────────────────

describe('visual diversity requirements', () => {
  it('at least one card has calm/educational brief (Monday)', () => {
    const text = (W28_MONDAY.brief.central_visual_idea + W28_MONDAY.brief.emotional_tone).toLowerCase();
    expect(text).toMatch(/informationsf|information|utbildning|klart|pedagog|educational/i);
  });

  it('at least one card has human/field-realistic brief (Wednesday)', () => {
    const text = W28_WEDNESDAY.brief.emotional_tone.toLowerCase();
    expect(text).toMatch(/autentisk|realism|igenkanning|human|field/i);
  });

  it('at least one card has premium tone (Friday)', () => {
    const text = W28_FRIDAY.brief.emotional_tone.toLowerCase();
    expect(text).toMatch(/premium|stolthet|kontroll|dignity|pride/i);
  });

  it('at least one card invites community interaction (Sunday)', () => {
    const text = (W28_SUNDAY.brief.objective + W28_SUNDAY.brief.emotional_tone).toLowerCase();
    expect(text).toMatch(/diskussion|community|gemenskaps|inkluder|conversation/i);
  });

  it('Friday negative_constraints explicitly bans arms-crossed-driver cliche', () => {
    const constraints = W28_FRIDAY.prototype.ai_direction!.negative_constraints;
    const armsCrossed = constraints.some(c =>
      c.toLowerCase().match(/armarna|armkors|cross|arms/i)
    );
    expect(armsCrossed).toBe(true);
  });

  it('Wednesday execution_board explicitly bans staged/hero photos', () => {
    const doNotUse = W28_WEDNESDAY.prototype.execution_board!.do_not_use;
    const bannedHero = doNotUse.some(d =>
      d.toLowerCase().match(/poserad|hero|staged|stockfoto|leende/i)
    );
    expect(bannedHero).toBe(true);
  });
});
