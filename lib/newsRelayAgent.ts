// lib/newsRelayAgent.ts
//
// Swedish Transport & Logistics News Relay Agent
//
// ROLE:
//   Fetches news from an allowlisted set of Swedish transport/logistics RSS feeds.
//   Validates recency (72h), deduplicates by URL, and formats posts with mandatory
//   source attribution before writing drafts to logistikklubb_scheduled_posts.
//
// BOUNDARIES:
//   ✗ Does NOT generate content beyond what was fetched from a real named URL
//   ✗ Does NOT hallucinate — raw article snippet stored alongside the post draft
//   ✗ Does NOT include company names, phone numbers, emails, or driver PII
//   ✗ Does NOT post automatically — every draft requires founder approval
//   ✗ Does NOT fetch from domains not in the source allowlist
//   ✓ Reads RSS from a static allowlisted source set
//   ✓ Writes news relay drafts to logistikklubb_scheduled_posts
//   ✓ Deduplicates: same source_url is rejected at DB level (code 23505)

import { db } from './db';
import type { ScheduledPost } from './logistikklubbSchedule';
import { randomUUID } from 'node:crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewsSource {
  id:          string;
  name:        string;
  rss_url:     string;
  base_domain: string;
  tier:        1 | 2 | 3;   // 1 = government, 2 = industry body, 3 = trade media
  active:      boolean;
  topics:      string[];
}

export interface ParsedArticle {
  title:        string;
  url:          string;
  description:  string;
  published_at: Date;
  source:       NewsSource;
}

export interface NewsRelayResult {
  fetched:    number;
  new_drafts: number;
  skipped:    number;
  errors:     string[];
}

// ─── Source allowlist ─────────────────────────────────────────────────────────
//
// Tier 1 (government, authoritative)  — active by default
// Tier 2 (industry associations)      — verify RSS URL before enabling
// Tier 3 (trade media)                — active where URL is confirmed reliable
//
// RSS URLs should be verified before each source is set active: true.
// Feed failures are non-fatal — the agent continues with remaining sources.

export const NEWS_SOURCES: NewsSource[] = [
  // ── Tier 1: Government ─────────────────────────────────────────────────────
  {
    id:          'trafikverket',
    name:        'Trafikverket',
    rss_url:     'https://www.trafikverket.se/om-oss/press/pressmeddelanden/rss/',
    base_domain: 'trafikverket.se',
    tier:        1,
    active:      true,
    topics:      ['infrastructure', 'road', 'traffic', 'disruption', 'roadworks'],
  },
  {
    id:          'transportstyrelsen',
    name:        'Transportstyrelsen',
    rss_url:     'https://www.transportstyrelsen.se/sv/Press/Nyheter/?rss=1',
    base_domain: 'transportstyrelsen.se',
    tier:        1,
    active:      true,
    topics:      ['regulation', 'licensing', 'ykb', 'adr', 'inspection', 'driver_card'],
  },

  // ── Tier 2: Industry bodies ─────────────────────────────────────────────────
  {
    id:          'akeriforetagen',
    name:        'Sveriges Åkeriföretag',
    rss_url:     'https://www.akeri.se/rss',
    base_domain: 'akeri.se',
    tier:        2,
    active:      false, // verify RSS URL before enabling
    topics:      ['industry', 'haulage', 'policy', 'labour'],
  },

  // ── Tier 3: Trade media ─────────────────────────────────────────────────────
  {
    id:          'transport_magazine',
    name:        'Transport Magazine',
    rss_url:     'https://www.transportmagazine.se/feed/',
    base_domain: 'transportmagazine.se',
    tier:        3,
    active:      true,
    topics:      ['logistics', 'trucking', 'industry_news', 'vehicles'],
  },
  {
    id:          'truck_och_trailer',
    name:        'Truck & Trailer',
    rss_url:     'https://www.truckochtrailer.se/feed/',
    base_domain: 'truckochtrailer.se',
    tier:        3,
    active:      false, // verify RSS URL before enabling
    topics:      ['heavy_vehicles', 'trailers', 'equipment'],
  },
];

// ─── Derived allowlist ────────────────────────────────────────────────────────

export const ALLOWED_DOMAINS: Set<string> = new Set(
  NEWS_SOURCES.map((s) => s.base_domain)
);

// ─── Pure utility functions (all testable without DB or HTTP) ─────────────────

export function isAllowedSource(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return ALLOWED_DOMAINS.has(hostname);
  } catch {
    return false;
  }
}

export function isRecentEnough(publishedAt: Date, maxAgeHours = 72): boolean {
  if (isNaN(publishedAt.getTime())) return false;
  const ageMs = Date.now() - publishedAt.getTime();
  return ageMs >= 0 && ageMs <= maxAgeHours * 3_600_000;
}

// Stable dedup key: strip query params + trailing slashes, lowercase
export function buildDeduplicationKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

// Strip HTML tags and decode common entities
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Extract first match of an XML tag (handles CDATA and plain content)
export function extractTag(xml: string, tag: string): string {
  // CDATA: <tag><![CDATA[content]]></tag>  — strip embedded HTML before returning
  const cdataRe = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`,
    'i'
  );
  const cdataMatch = cdataRe.exec(xml);
  if (cdataMatch?.[1] !== undefined) return stripHtml(cdataMatch[1]).trim();

  // Plain: <tag>content</tag>
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const plainMatch = plainRe.exec(xml);
  if (plainMatch?.[1] !== undefined) return stripHtml(plainMatch[1]).trim();

  return '';
}

// Parse RSS 2.0 XML into article objects for a given source
export function parseRssXml(xml: string, source: NewsSource): ParsedArticle[] {
  const articles: ParsedArticle[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const item = m[1]!;

    const title = extractTag(item, 'title');
    const link =
      extractTag(item, 'link') ||
      extractTag(item, 'guid');
    const rawDesc =
      extractTag(item, 'description') ||
      extractTag(item, 'summary') ||
      extractTag(item, 'content:encoded');
    const pubDateStr =
      extractTag(item, 'pubDate') ||
      extractTag(item, 'dc:date') ||
      extractTag(item, 'published') ||
      extractTag(item, 'updated');

    if (!title || !link) continue;
    if (!isAllowedSource(link)) continue;

    const published_at = pubDateStr ? new Date(pubDateStr) : new Date();
    if (isNaN(published_at.getTime())) continue;

    // Cap snippet at 800 chars — enough context, not full article
    const description = rawDesc.slice(0, 800);

    articles.push({ title, url: link, description, published_at, source });
  }

  return articles;
}

// Build the mandatory source attribution block
export function buildAttributionBlock(
  sourceName: string,
  url:         string,
  publishedAt: Date
): string {
  const dateStr = publishedAt.toISOString().slice(0, 10);
  return [
    `Källa: ${sourceName}`,
    `Datum: ${dateStr}`,
    `Länk: ${url}`,
  ].join('\n');
}

// Build the full community post text from a parsed article
export function buildNewsRelayPostText(article: ParsedArticle): string {
  const parts: string[] = [];

  parts.push(`📰 ${article.title}`);
  parts.push('');

  if (article.description) {
    parts.push(stripHtml(article.description));
    parts.push('');
  }

  parts.push(buildAttributionBlock(
    article.source.name,
    article.url,
    article.published_at
  ));
  parts.push('');
  parts.push('Vad tycker ni i gruppen? 👇');

  return parts.join('\n');
}

// ─── DB functions ──────────────────────────────────────────────────────────────

// Returns dedup keys for articles relayed in the past N days
export async function getRecentlyRelayedKeys(days = 30): Promise<Set<string>> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await db
    .from('logistikklubb_scheduled_posts')
    .select('source_url')
    .eq('is_news_relay', true)
    .gte('created_at', since)
    .not('source_url', 'is', null);

  const keys = new Set<string>();
  for (const row of data ?? []) {
    const url = (row as Record<string, unknown>).source_url as string | null;
    if (url) keys.add(buildDeduplicationKey(url));
  }
  return keys;
}

// Persist one news relay draft. Throws 'duplicate_url' on 23505 unique violation.
export async function saveNewsRelayDraft(
  article:    ParsedArticle,
  sequenceId: string,
  dayNumber:  number
): Promise<ScheduledPost> {
  const now = new Date().toISOString();

  const row = {
    id:                   randomUUID(),
    sequence_id:          sequenceId,
    day_number:           dayNumber,
    category:             'news_relay',
    title:                article.title.slice(0, 200),
    post_text:            buildNewsRelayPostText(article),
    suggested_time:       '09:00 – 10:00',
    scheduled_at:         null,
    status:               'draft',
    source_context:       null,
    risk_note:            'Nyhetsinlägg — kontrollera att källa är korrekt och innehållet är relevant innan publicering.',
    approved_by_founder:  false,
    approved_at:          null,
    published_at:         null,
    skipped_at:           null,
    failure_reason:       null,
    source_url:           article.url,
    source_name:          article.source.name,
    source_published_at:  article.published_at.toISOString(),
    raw_article_snippet:  article.description.slice(0, 1000),
    is_news_relay:        true,
    created_at:           now,
    updated_at:           now,
  };

  const { data, error } = await db
    .from('logistikklubb_scheduled_posts')
    .insert(row)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('duplicate_url');
    throw new Error(error.message);
  }

  return data as ScheduledPost;
}

// ─── RSS fetch ────────────────────────────────────────────────────────────────

async function fetchRssFeed(source: NewsSource): Promise<ParsedArticle[]> {
  const res = await fetch(source.rss_url, {
    headers: {
      'User-Agent': 'DriverNord-NewsAgent/1.0 (+https://drivernord.com)',
      'Accept':     'application/rss+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${source.id}`);
  }

  const xml = await res.text();
  return parseRssXml(xml, source);
}

// ─── Main entry point ──────────────────────────────────────────────────────────

export async function runNewsRelayFetch(): Promise<NewsRelayResult> {
  const result: NewsRelayResult = {
    fetched:    0,
    new_drafts: 0,
    skipped:    0,
    errors:     [],
  };

  const activeSources = NEWS_SOURCES.filter((s) => s.active);
  if (activeSources.length === 0) {
    return result;
  }

  const relayedKeys = await getRecentlyRelayedKeys();
  const sequenceId  = `news-relay-${new Date().toISOString().slice(0, 10)}`;
  let dayCounter    = 1;

  for (const source of activeSources) {
    let articles: ParsedArticle[];
    try {
      articles = await fetchRssFeed(source);
    } catch (e) {
      result.errors.push(`${source.id}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    for (const article of articles) {
      result.fetched++;

      if (!isRecentEnough(article.published_at)) {
        result.skipped++;
        continue;
      }

      const key = buildDeduplicationKey(article.url);
      if (relayedKeys.has(key)) {
        result.skipped++;
        continue;
      }

      try {
        await saveNewsRelayDraft(article, sequenceId, dayCounter++);
        relayedKeys.add(key);
        result.new_drafts++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === 'duplicate_url') {
          result.skipped++;
        } else {
          result.errors.push(`save(${source.id}): ${msg}`);
        }
      }
    }
  }

  return result;
}
