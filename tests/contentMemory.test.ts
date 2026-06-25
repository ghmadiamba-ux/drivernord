// tests/contentMemory.test.ts

import { describe, it, expect } from 'vitest';
import {
  jaccardSimilarity,
  checkAntiRepetition,
  buildTopicSignature,
  buildAngleSignature,
  filterWithinDays,
  lastCtaUsed,
  recentFormatsForPillar,
  recentTopicSignatures,
  buildMemoryEntry,
} from '../lib/content/memory';
import type { ContentMemoryEntry } from '../lib/content/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<ContentMemoryEntry> = {}): ContentMemoryEntry {
  return {
    topic_signature: 'practical:market_education:transportmarknaden_i_sverige',
    angle_signature: 'practical:market_education:CE_drivers',
    content_pillar:  'practical',
    format:          'text_post',
    cta_type:        'none',
    hashtag_set:     ['#LogistikSverige'],
    post_text:       'CE-förare i Sverige kör varje dag och bidrar till landets logistik.',
    planned_date:    '2026-06-10',
    ...overrides,
  };
}

// ─── Jaccard similarity ───────────────────────────────────────────────────────

describe('jaccardSimilarity', () => {
  it('returns 1 for identical text', () => {
    const text = 'Kör säkert och ha en bra dag på vägen';
    expect(jaccardSimilarity(text, text)).toBe(1);
  });

  it('returns 0 for completely different text', () => {
    expect(jaccardSimilarity('abc def', 'xyz uvw')).toBe(0);
  });

  it('returns between 0 and 1 for partial overlap', () => {
    const a = 'CE-förare kör lastbil i Sverige varje dag';
    const b = 'CE-förare med YKB är efterfrågade i hela landet';
    const sim = jaccardSimilarity(a, b);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it('is symmetric', () => {
    const a = 'yrkesförare håller Sverige igång';
    const b = 'förare med erfarenhet kör professionellt';
    expect(jaccardSimilarity(a, b)).toBeCloseTo(jaccardSimilarity(b, a), 10);
  });

  it('returns 1 for two empty strings', () => {
    expect(jaccardSimilarity('', '')).toBe(1);
  });

  it('returns 0 for one empty string', () => {
    expect(jaccardSimilarity('hello world', '')).toBe(0);
  });
});

// ─── Anti-repetition ──────────────────────────────────────────────────────────

describe('checkAntiRepetition', () => {
  const BASE_CARD = {
    content_pillar:  'practical' as const,
    cta_type:        'none' as const,
    format:          'text_post' as const,
    topic_signature: 'practical:market_education:transportmarknaden_i_sverige',
    draft_text:      'CE-förare i Sverige kör varje dag och bidrar till landets logistik.',
  };

  it('passes with empty history', () => {
    const result = checkAntiRepetition({
      card: BASE_CARD,
      planned_date: '2026-06-24',
      recent_history: [],
    });
    expect(result.pass).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('blocks on 14-day topic cooldown', () => {
    const history = [makeEntry({ planned_date: '2026-06-20' })]; // 4 days ago
    const result = checkAntiRepetition({
      card: BASE_CARD,
      planned_date: '2026-06-24',
      recent_history: history,
    });
    expect(result.pass).toBe(false);
    expect(result.violations.some((v) => v.rule === 'topic_cooldown_14d')).toBe(true);
  });

  it('passes after 14-day topic cooldown has expired', () => {
    const history = [makeEntry({ planned_date: '2026-06-09' })]; // 15 days ago
    const result = checkAntiRepetition({
      card: BASE_CARD,
      planned_date: '2026-06-24',
      recent_history: history,
    });
    // Only topic check matters here — other rules will depend on other history items
    const topicViolation = result.violations.find((v) => v.rule === 'topic_cooldown_14d');
    expect(topicViolation).toBeUndefined();
  });

  it('blocks on 7-day CTA cooldown', () => {
    const ctaHistory = [makeEntry({
      cta_type: 'soft_registration',
      planned_date: '2026-06-20', // 4 days ago
      topic_signature: 'different_topic',
    })];
    const ctaCard = {
      ...BASE_CARD,
      cta_type: 'community_join' as const,
      topic_signature: 'other_unique_topic',
    };
    const result = checkAntiRepetition({
      card: ctaCard,
      planned_date: '2026-06-24',
      recent_history: ctaHistory,
    });
    expect(result.violations.some((v) => v.rule === 'cta_cooldown_7d')).toBe(true);
  });

  it('blocks if same day already has a post', () => {
    const history = [makeEntry({
      topic_signature: 'different_topic',
      planned_date:    '2026-06-24',
    })];
    const result = checkAntiRepetition({
      card: { ...BASE_CARD, topic_signature: 'yet_another_topic' },
      planned_date: '2026-06-24',
      recent_history: history,
    });
    expect(result.violations.some((v) => v.rule === 'cadence_max_1_per_day')).toBe(true);
  });

  it('blocks if week already has 4 posts', () => {
    const history = [
      makeEntry({ topic_signature: 't1', planned_date: '2026-06-22' }),
      makeEntry({ topic_signature: 't2', planned_date: '2026-06-23' }),
      makeEntry({ topic_signature: 't3', planned_date: '2026-06-25' }),
      makeEntry({ topic_signature: 't4', planned_date: '2026-06-26' }),
    ];
    const result = checkAntiRepetition({
      card: { ...BASE_CARD, topic_signature: 'unique_new_topic' },
      planned_date: '2026-06-24',
      recent_history: history,
    });
    expect(result.violations.some((v) => v.rule === 'cadence_max_4_per_week')).toBe(true);
  });
});

// ─── Signature builders ───────────────────────────────────────────────────────

describe('buildTopicSignature', () => {
  it('returns a non-empty string', () => {
    const sig = buildTopicSignature('practical', 'market_education', 'CE-marknaden i Sverige');
    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const a = buildTopicSignature('practical', 'market_education', 'YKB-fortbildning');
    const b = buildTopicSignature('practical', 'market_education', 'YKB-fortbildning');
    expect(a).toBe(b);
  });

  it('includes pillar and angle', () => {
    const sig = buildTopicSignature('community', 'community_question', 'bästa rutten');
    expect(sig).toContain('community');
    expect(sig).toContain('community_question');
  });
});

describe('buildAngleSignature', () => {
  it('includes pillar, angle, and audience', () => {
    const sig = buildAngleSignature('recognition', 'driver_recognition', 'CE_drivers');
    expect(sig).toContain('recognition');
    expect(sig).toContain('driver_recognition');
    expect(sig).toContain('CE_drivers');
  });
});

// ─── Memory filter helpers ────────────────────────────────────────────────────

describe('filterWithinDays', () => {
  const history: ContentMemoryEntry[] = [
    makeEntry({ planned_date: '2026-06-24' }),
    makeEntry({ topic_signature: 'old', planned_date: '2026-05-01' }),
  ];

  it('returns only entries within the day limit', () => {
    const result = filterWithinDays(history, '2026-06-24', 7);
    expect(result).toHaveLength(1);
    expect(result[0]!.planned_date).toBe('2026-06-24');
  });
});

describe('lastCtaUsed', () => {
  it('returns null for history with no CTAs', () => {
    expect(lastCtaUsed([makeEntry({ cta_type: 'none' })])).toBeNull();
  });

  it('returns the most recent CTA type', () => {
    const history = [
      makeEntry({ cta_type: 'soft_registration', planned_date: '2026-06-20' }),
      makeEntry({ cta_type: 'community_join',    planned_date: '2026-06-10' }),
    ];
    expect(lastCtaUsed(history)).toBe('soft_registration');
  });
});

describe('recentFormatsForPillar', () => {
  it('returns formats for matching pillar only', () => {
    const history = [
      makeEntry({ content_pillar: 'practical', format: 'tip_list', planned_date: '2026-06-20' }),
      makeEntry({ content_pillar: 'recognition', format: 'text_post', planned_date: '2026-06-19' }),
    ];
    const result = recentFormatsForPillar(history, 'practical', 3);
    expect(result).toContain('tip_list');
    expect(result).not.toContain('text_post');
  });
});

describe('recentTopicSignatures', () => {
  it('returns signatures from within the last 14 days', () => {
    const history = [
      makeEntry({ topic_signature: 'recent_topic', planned_date: '2026-06-20' }),
      makeEntry({ topic_signature: 'old_topic',    planned_date: '2026-06-01' }),
    ];
    const result = recentTopicSignatures(history, '2026-06-24', 14);
    expect(result).toContain('recent_topic');
    expect(result).not.toContain('old_topic');
  });
});

describe('buildMemoryEntry', () => {
  it('returns a valid ContentMemoryEntry', () => {
    const entry = buildMemoryEntry({
      topic_signature: 'practical:market_education:test',
      angle_signature: 'practical:market_education:CE_drivers',
      content_pillar:  'practical',
      format:          'text_post',
      cta_type:        'none',
      hashtag_set:     ['#Test'],
      post_text:       'Test text',
      planned_date:    '2026-06-24',
    });
    expect(entry.topic_signature).toBe('practical:market_education:test');
    expect(entry.content_pillar).toBe('practical');
    expect(entry.cta_type).toBe('none');
  });
});
