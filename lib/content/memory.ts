// lib/content/memory.ts
//
// Anti-repetition logic for DriverNord Content & Distribution Engine V1.
// Pure — no DB, no I/O. All functions take history arrays as input.
//
// Rules enforced:
//   • 14-day topic cooldown (same topic_signature)
//   • 7-day CTA cooldown (any CTA other than 'none')
//   • 30-day copy cooldown (Jaccard similarity ≥ 0.35 on full text)
//   • Format rotation: same format max once every 3 posts in the same pillar
//   • Global cadence: ≤ 4 posts/week, ≤ 1 post/day, ≤ 1 CTA/week

import type {
  ContentMemoryEntry,
  AntiRepetitionViolation,
  CampaignCardInput,
  ContentPillar,
  PostFormat,
  CtaType,
} from './types';

// ─── Jaccard similarity ───────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-zåäö0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(Math.round((b - a) / 86_400_000));
}

function isSameISOWeek(dateA: string, dateB: string): boolean {
  const d1 = new Date(dateA);
  const d2 = new Date(dateB);
  // Start of ISO week (Monday)
  const startOfWeek = (d: Date): Date => {
    const day = d.getDay(); // 0=Sun … 6=Sat
    const diff = (day === 0 ? -6 : 1 - day);
    const result = new Date(d);
    result.setDate(d.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  };
  return startOfWeek(d1).getTime() === startOfWeek(d2).getTime();
}

function isSameDay(dateA: string, dateB: string): boolean {
  return dateA.slice(0, 10) === dateB.slice(0, 10);
}

// ─── Anti-repetition checker ──────────────────────────────────────────────────

export interface AntiRepetitionCheckInput {
  card: Pick<CampaignCardInput, 'content_pillar' | 'cta_type' | 'format'> & {
    topic_signature: string;
    draft_text?: string;
  };
  planned_date: string; // ISO date YYYY-MM-DD
  recent_history: ContentMemoryEntry[]; // all history entries (any age)
}

export interface AntiRepetitionResult {
  pass: boolean;
  violations: AntiRepetitionViolation[];
  warnings: AntiRepetitionViolation[];
}

export function checkAntiRepetition(input: AntiRepetitionCheckInput): AntiRepetitionResult {
  const { card, planned_date, recent_history } = input;
  const violations: AntiRepetitionViolation[] = [];
  const warnings: AntiRepetitionViolation[] = [];

  // ── Rule 1: 14-day topic cooldown ────────────────────────────────────────────
  for (const entry of recent_history) {
    if (entry.topic_signature === card.topic_signature) {
      const days = daysBetween(entry.planned_date, planned_date);
      if (days < 14) {
        violations.push({
          rule: 'topic_cooldown_14d',
          message: `Topic "${card.topic_signature}" used ${days} day(s) ago — 14-day cooldown required`,
          severity: 'block',
        });
        break;
      }
    }
  }

  // ── Rule 2: 7-day CTA cooldown ────────────────────────────────────────────────
  if (card.cta_type !== 'none') {
    for (const entry of recent_history) {
      if (entry.cta_type !== 'none') {
        const days = daysBetween(entry.planned_date, planned_date);
        if (days < 7) {
          violations.push({
            rule: 'cta_cooldown_7d',
            message: `CTA used ${days} day(s) ago — 7-day cooldown required (last: ${entry.cta_type})`,
            severity: 'block',
          });
          break;
        }
      }
    }
  }

  // ── Rule 3: 30-day copy similarity (Jaccard ≥ 0.35) ─────────────────────────
  if (card.draft_text) {
    for (const entry of recent_history) {
      if (!entry.post_text) continue;
      const days = daysBetween(entry.planned_date, planned_date);
      if (days > 30) continue;
      const sim = jaccardSimilarity(card.draft_text, entry.post_text);
      if (sim >= 0.35) {
        violations.push({
          rule: 'copy_similarity_30d',
          message: `Draft text is ${(sim * 100).toFixed(0)}% similar to a post from ${days} day(s) ago — 30-day cooldown on ≥35% similarity`,
          severity: 'block',
        });
        break;
      } else if (sim >= 0.25) {
        warnings.push({
          rule: 'copy_similarity_30d_warn',
          message: `Draft text is ${(sim * 100).toFixed(0)}% similar to a post from ${days} day(s) ago (< 35% threshold, warn only)`,
          severity: 'warn',
        });
      }
    }
  }

  // ── Rule 4: Format rotation — same format max once per 3 posts in same pillar ─
  const sameFormatSamePillar = recent_history.filter(
    (e) => e.format === card.format && e.content_pillar === card.content_pillar
  ).sort((a, b) => (a.planned_date > b.planned_date ? -1 : 1));
  if (sameFormatSamePillar.length > 0) {
    const samePillarAll = recent_history
      .filter((e) => e.content_pillar === card.content_pillar)
      .sort((a, b) => (a.planned_date > b.planned_date ? -1 : 1));
    const lastSameFormatIdx = samePillarAll.findIndex(
      (e) => e.format === card.format
    );
    if (lastSameFormatIdx !== -1 && lastSameFormatIdx < 2) {
      warnings.push({
        rule: 'format_rotation_3_posts',
        message: `Format "${card.format}" used within last 2 ${card.content_pillar} posts — consider rotating`,
        severity: 'warn',
      });
    }
  }

  // ── Rule 5: Cadence — ≤ 4 posts/week ──────────────────────────────────────────
  const postsThisWeek = recent_history.filter((e) =>
    isSameISOWeek(e.planned_date, planned_date)
  );
  if (postsThisWeek.length >= 4) {
    violations.push({
      rule: 'cadence_max_4_per_week',
      message: `Week already has ${postsThisWeek.length} post(s) — maximum is 4 posts/week`,
      severity: 'block',
    });
  }

  // ── Rule 6: Cadence — ≤ 1 post/day ───────────────────────────────────────────
  const postsToday = recent_history.filter((e) =>
    isSameDay(e.planned_date, planned_date)
  );
  if (postsToday.length >= 1) {
    violations.push({
      rule: 'cadence_max_1_per_day',
      message: `Date ${planned_date} already has a post scheduled — maximum 1 post/day`,
      severity: 'block',
    });
  }

  // ── Rule 7: Cadence — ≤ 1 CTA/week ───────────────────────────────────────────
  if (card.cta_type !== 'none') {
    const ctaThisWeek = recent_history.filter(
      (e) => isSameISOWeek(e.planned_date, planned_date) && e.cta_type !== 'none'
    );
    if (ctaThisWeek.length >= 1) {
      violations.push({
        rule: 'cadence_max_1_cta_per_week',
        message: `Week already has a CTA post — maximum 1 CTA/week`,
        severity: 'block',
      });
    }
  }

  return {
    pass: violations.length === 0,
    violations,
    warnings,
  };
}

// ─── Topic & angle signature builders ────────────────────────────────────────

export function buildTopicSignature(
  pillar: ContentPillar,
  angle: string,
  driverInsight: string
): string {
  const normalizedInsight = driverInsight
    .toLowerCase()
    .replace(/[^a-zåäö0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join('_');
  return `${pillar}:${angle}:${normalizedInsight}`;
}

export function buildAngleSignature(
  pillar: ContentPillar,
  angle: string,
  audience: string
): string {
  return `${pillar}:${angle}:${audience}`;
}

// ─── Memory filter helpers ────────────────────────────────────────────────────

// Returns entries within the last N days relative to a reference date
export function filterWithinDays(
  history: ContentMemoryEntry[],
  referenceDate: string,
  days: number
): ContentMemoryEntry[] {
  return history.filter((e) => daysBetween(e.planned_date, referenceDate) <= days);
}

// Returns the most recently used CTA type from history, or null
export function lastCtaUsed(history: ContentMemoryEntry[]): CtaType | null {
  const withCta = history
    .filter((e) => e.cta_type !== 'none')
    .sort((a, b) => (a.planned_date > b.planned_date ? -1 : 1));
  return withCta.length > 0 ? withCta[0]!.cta_type : null;
}

// Returns formats used in the last N posts for a given pillar
export function recentFormatsForPillar(
  history: ContentMemoryEntry[],
  pillar: ContentPillar,
  limit: number = 3
): PostFormat[] {
  return history
    .filter((e) => e.content_pillar === pillar)
    .sort((a, b) => (a.planned_date > b.planned_date ? -1 : 1))
    .slice(0, limit)
    .map((e) => e.format);
}

// Returns topic signatures used in the last N days
export function recentTopicSignatures(
  history: ContentMemoryEntry[],
  referenceDate: string,
  days: number = 14
): string[] {
  return filterWithinDays(history, referenceDate, days).map(
    (e) => e.topic_signature
  );
}

// Builds a ContentMemoryEntry from a published/scheduled card snapshot
export function buildMemoryEntry(params: {
  topic_signature: string;
  angle_signature: string;
  content_pillar: ContentPillar;
  format: PostFormat;
  cta_type: CtaType;
  hashtag_set: string[];
  post_text: string;
  planned_date: string;
}): ContentMemoryEntry {
  return {
    topic_signature:  params.topic_signature,
    angle_signature:  params.angle_signature,
    content_pillar:   params.content_pillar,
    format:           params.format,
    cta_type:         params.cta_type,
    hashtag_set:      params.hashtag_set,
    post_text:        params.post_text,
    planned_date:     params.planned_date,
  };
}
