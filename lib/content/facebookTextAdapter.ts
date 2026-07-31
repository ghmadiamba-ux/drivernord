// lib/content/facebookTextAdapter.ts
//
// Facebook Content Bridge V1 — Swedish Text Adapter
//
// Converts a campaign card's draft_text into Facebook Page-ready Swedish copy.
// Facebook text differs from WhatsApp copy:
//   - No SMS/chat formatting (no asterisks for bold, no WhatsApp emoji overuse)
//   - Shorter paragraphs; 2–3 lines max per block
//   - Hashtags appended as a distinct block (not inline)
//   - CTA references drivernord.com, never WhatsApp links
//   - Public number 070-938 52 67 if contact info is appropriate
//   - Character limit: 63,206 (API), but keep to ≤ 500 for organic reach
//
// BOUNDARIES:
//   ✓ Pure function — no DB imports, no API calls, no side effects
//   ✗ Does NOT call the Graph API
//   ✗ Does NOT validate publishability (see facebookPublishPolicy.ts)

import type { CampaignCard, CtaType } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

// Hard cap at which Facebook copy is truncated (with ellipsis).
// Organic posts perform better under 500 chars; we allow up to 800 for richness.
export const FB_MAX_CHARS = 800;

// Hashtag caps
const MAX_HASHTAGS = 5;
const MIN_HASHTAG_CHARS = 2;

// CTA lines per cta_type
const CTA_LINES: Record<CtaType, string | null> = {
  none:             null,
  soft_registration:'Kör du lastbil? Registrera dig gratis på drivernord.com/chaufforer 🚚',
  community_join:   'Gå med i Logistikklubb på drivernord.com/logistikklubb',
  website_visit:    'Läs mer på drivernord.com',
  follow_page:      'Följ oss för fler transportnyheter.',
  profile_update:   'Har din tillgänglighet ändrats? Uppdatera din profil på drivernord.com/chaufforer',
};

// Patterns in source text that should never appear in published Facebook copy.
// If detected, the adapter throws so the caller is forced to block the entry.
const FORBIDDEN_IN_OUTPUT: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /drivernord\.se/i,             description: 'wrong domain (drivernord.se)' },
  { pattern: /\b07[0-9][-\s]\d{3}\s\d{2}\s\d{2}\b/, description: 'Swedish phone number' },
  { pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, description: 'email address' },
  { pattern: /INTERN FÖRHANDSVISNING/i,     description: 'internal preview watermark' },
  { pattern: /INTERN FORHANDSVISNING/i,     description: 'internal preview watermark (no diacritic)' },
];

// WhatsApp/SMS formatting artifacts to strip before publishing
const FORMATTING_CLEANUP: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\*([^*]+)\*/g,   replacement: '$1' },  // *bold* → plain
  { pattern: /_([^_]+)_/g,     replacement: '$1' },  // _italic_ → plain
  { pattern: /~([^~]+)~/g,     replacement: '$1' },  // ~strikethrough~ → plain
  { pattern: /`([^`]+)`/g,     replacement: '$1' },  // `code` → plain
  { pattern: /\n{3,}/g,        replacement: '\n\n' }, // collapse triple+ newlines
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FacebookCopy {
  text:      string;       // full post body including CTA and hashtags
  body:      string;       // just the adapted body (no CTA, no hashtags)
  cta_line:  string | null;
  hashtags:  string[];     // formatted with '#' prefix
  char_count: number;
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

/**
 * Adapts a campaign card's draft_text into Facebook Page-ready Swedish copy.
 *
 * Throws if forbidden content is detected in the output — callers must handle
 * this by blocking the queue entry.
 *
 * Returns FacebookCopy with the full post text and its constituent parts.
 */
export function adaptForFacebook(
  card: Pick<CampaignCard, 'draft_text' | 'hashtag_set' | 'cta_type'> & { draft_text?: string | null },
): FacebookCopy {
  const raw = (card.draft_text ?? '').trim();
  if (!raw) {
    throw new Error('adaptForFacebook: card.draft_text is empty — cannot adapt');
  }

  // 1. Strip WhatsApp/SMS formatting artifacts
  let body = raw;
  for (const { pattern, replacement } of FORMATTING_CLEANUP) {
    body = body.replace(pattern, replacement);
  }
  body = body.trim();

  // 2. Truncate body if needed (leave room for CTA + hashtags)
  const ctaLine = CTA_LINES[card.cta_type as CtaType] ?? null;
  const ctaLength = ctaLine ? ctaLine.length + 2 : 0; // +2 for "\n\n"
  const maxBodyChars = FB_MAX_CHARS - ctaLength - 80; // 80 reserved for hashtags
  if (body.length > maxBodyChars) {
    body = body.slice(0, maxBodyChars - 3).trimEnd() + '...';
  }

  // 3. Build hashtag block
  const rawTags = (card.hashtag_set ?? [])
    .filter(t => typeof t === 'string' && t.length >= MIN_HASHTAG_CHARS)
    .slice(0, MAX_HASHTAGS);

  // Ensure each tag starts with '#' and contains no spaces
  const hashtags = rawTags.map(t => {
    const clean = t.replace(/^#+/, '').replace(/\s+/g, '').trim();
    return `#${clean}`;
  }).filter(t => t.length > 1);

  // 4. Assemble full text
  const parts: string[] = [body];
  if (ctaLine) parts.push('', ctaLine);
  if (hashtags.length > 0) parts.push('', hashtags.join(' '));

  const text = parts.join('\n');

  // 5. Safety: scan output for forbidden content
  for (const { pattern, description } of FORBIDDEN_IN_OUTPUT) {
    if (pattern.test(text)) {
      throw new Error(`adaptForFacebook: forbidden content in output — ${description}`);
    }
  }

  return {
    text,
    body,
    cta_line: ctaLine,
    hashtags,
    char_count: text.length,
  };
}

/**
 * Returns true if the adapted text is within Facebook's practical organic length.
 * Texts over FB_MAX_CHARS were already truncated; this is a post-adaptation check.
 */
export function isWithinFacebookLimit(copy: FacebookCopy): boolean {
  return copy.char_count <= FB_MAX_CHARS;
}

/**
 * Formats a list of hashtag strings for display (e.g. in cockpit UI).
 * Deduplicates and normalises casing.
 */
export function formatHashtagsForDisplay(hashtags: string[]): string {
  return hashtags.join(' ');
}
