import { describe, it, expect } from 'vitest';
import {
  isAllowedSource,
  isRecentEnough,
  buildDeduplicationKey,
  stripHtml,
  extractTag,
  parseRssXml,
  buildAttributionBlock,
  buildNewsRelayPostText,
  NEWS_SOURCES,
  ALLOWED_DOMAINS,
} from '../lib/newsRelayAgent';
import type { NewsSource, ParsedArticle } from '../lib/newsRelayAgent';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSource(overrides: Partial<NewsSource> = {}): NewsSource {
  return {
    id:          'test_source',
    name:        'Test Källa',
    rss_url:     'https://test.trafikverket.se/feed/',
    base_domain: 'trafikverket.se',
    tier:        1,
    active:      true,
    topics:      ['test'],
    ...overrides,
  };
}

function makeArticle(overrides: Partial<ParsedArticle> = {}): ParsedArticle {
  return {
    title:        'CE-brist i Stockholmsregionen',
    url:          'https://www.trafikverket.se/nyheter/2026/ce-brist',
    description:  'Trafikverket rapporterar ökad efterfrågan på CE-förare i Stockholmsregionen.',
    published_at: new Date(Date.now() - 3 * 3_600_000), // 3 hours ago
    source:       makeSource(),
    ...overrides,
  };
}

// Sample RSS XML for parsing tests
const SAMPLE_RSS_CDATA = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title><![CDATA[Ny vägarbete på E4]]></title>
      <link>https://www.trafikverket.se/nyheter/2026/e4-vagarbete</link>
      <description><![CDATA[Vägarbete på E4 norr om Stockholm startar 15 juni.]]></description>
      <pubDate>Thu, 12 Jun 2026 08:00:00 +0000</pubDate>
    </item>
    <item>
      <title><![CDATA[Uppdaterade YKB-regler]]></title>
      <link>https://www.transportstyrelsen.se/nyheter/2026/ykb-regler</link>
      <description><![CDATA[Transportstyrelsen meddelar förändringar i YKB-kraven.]]></description>
      <pubDate>Wed, 11 Jun 2026 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const SAMPLE_RSS_PLAIN = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Bränslepriserna stiger</title>
      <link>https://www.trafikverket.se/nyheter/2026/bransle</link>
      <description>Dieselpriset har ökat med 3% den senaste veckan.</description>
      <pubDate>Thu, 12 Jun 2026 06:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const SAMPLE_RSS_HTML_DESC = `<rss version="2.0">
  <channel>
    <item>
      <title>Test artikel</title>
      <link>https://www.trafikverket.se/nyheter/2026/test</link>
      <description><![CDATA[<p>Paragraf med <strong>HTML</strong> och <a href="#">länk</a>.</p>]]></description>
      <pubDate>Thu, 12 Jun 2026 07:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

// ─── isAllowedSource ──────────────────────────────────────────────────────────

describe('isAllowedSource', () => {
  it('allows trafikverket.se URLs', () => {
    expect(isAllowedSource('https://www.trafikverket.se/nyheter/2026/test')).toBe(true);
  });

  it('allows transportstyrelsen.se URLs', () => {
    expect(isAllowedSource('https://www.transportstyrelsen.se/sv/press/nyheter/1234')).toBe(true);
  });

  it('allows transportmagazine.se URLs', () => {
    expect(isAllowedSource('https://www.transportmagazine.se/artikel/ce-brist')).toBe(true);
  });

  it('rejects unknown domains', () => {
    expect(isAllowedSource('https://www.aftonbladet.se/nyheter/transport')).toBe(false);
  });

  it('rejects arbitrary external URLs', () => {
    expect(isAllowedSource('https://example.com/article')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isAllowedSource('not-a-url')).toBe(false);
  });

  it('strips www prefix when checking domain', () => {
    expect(isAllowedSource('https://trafikverket.se/nyheter/test')).toBe(true);
  });

  it('ALLOWED_DOMAINS contains all source base_domains', () => {
    for (const source of NEWS_SOURCES) {
      expect(ALLOWED_DOMAINS.has(source.base_domain)).toBe(true);
    }
  });
});

// ─── isRecentEnough ───────────────────────────────────────────────────────────

describe('isRecentEnough', () => {
  it('returns true for articles published 1 hour ago', () => {
    const d = new Date(Date.now() - 3_600_000);
    expect(isRecentEnough(d)).toBe(true);
  });

  it('returns true for articles published 71 hours ago', () => {
    const d = new Date(Date.now() - 71 * 3_600_000);
    expect(isRecentEnough(d)).toBe(true);
  });

  it('returns false for articles published 73 hours ago', () => {
    const d = new Date(Date.now() - 73 * 3_600_000);
    expect(isRecentEnough(d)).toBe(false);
  });

  it('returns false for future dates', () => {
    const d = new Date(Date.now() + 3_600_000);
    expect(isRecentEnough(d)).toBe(false);
  });

  it('returns false for invalid Date', () => {
    expect(isRecentEnough(new Date('not-a-date'))).toBe(false);
  });

  it('respects custom maxAgeHours', () => {
    const d = new Date(Date.now() - 25 * 3_600_000);
    expect(isRecentEnough(d, 24)).toBe(false);
    expect(isRecentEnough(d, 48)).toBe(true);
  });
});

// ─── buildDeduplicationKey ────────────────────────────────────────────────────

describe('buildDeduplicationKey', () => {
  it('produces same key for URL with and without trailing slash', () => {
    const a = buildDeduplicationKey('https://trafikverket.se/nyheter/123/');
    const b = buildDeduplicationKey('https://trafikverket.se/nyheter/123');
    expect(a).toBe(b);
  });

  it('strips query params for stable key', () => {
    const a = buildDeduplicationKey('https://trafikverket.se/nyheter/123?utm_source=rss');
    const b = buildDeduplicationKey('https://trafikverket.se/nyheter/123');
    expect(a).toBe(b);
  });

  it('is case-insensitive', () => {
    const a = buildDeduplicationKey('https://Trafikverket.SE/Nyheter/ABC');
    const b = buildDeduplicationKey('https://trafikverket.se/nyheter/abc');
    expect(a).toBe(b);
  });

  it('handles invalid URLs gracefully', () => {
    expect(() => buildDeduplicationKey('not-a-url')).not.toThrow();
    expect(buildDeduplicationKey('not-a-url')).toBe('not-a-url');
  });
});

// ─── stripHtml ────────────────────────────────────────────────────────────────

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('decodes HTML entities', () => {
    expect(stripHtml('CE &amp; C')).toBe('CE & C');
    expect(stripHtml('&lt;tag&gt;')).toBe('<tag>');
    expect(stripHtml('&quot;quoted&quot;')).toBe('"quoted"');
  });

  it('collapses multiple whitespace', () => {
    expect(stripHtml('word1   word2\n\nword3')).toBe('word1 word2 word3');
  });

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });
});

// ─── extractTag ───────────────────────────────────────────────────────────────

describe('extractTag', () => {
  it('extracts CDATA-wrapped content', () => {
    const xml = '<title><![CDATA[Ny regel om YKB]]></title>';
    expect(extractTag(xml, 'title')).toBe('Ny regel om YKB');
  });

  it('extracts plain content', () => {
    const xml = '<pubDate>Thu, 12 Jun 2026 08:00:00 +0000</pubDate>';
    expect(extractTag(xml, 'pubDate')).toBe('Thu, 12 Jun 2026 08:00:00 +0000');
  });

  it('strips HTML from plain content', () => {
    const xml = '<description><p>Text <b>bold</b></p></description>';
    expect(extractTag(xml, 'description')).toBe('Text bold');
  });

  it('returns empty string for missing tag', () => {
    const xml = '<title>Something</title>';
    expect(extractTag(xml, 'author')).toBe('');
  });

  it('is case-insensitive for tag names', () => {
    const xml = '<Title><![CDATA[Test]]></Title>';
    expect(extractTag(xml, 'title')).toBe('Test');
  });
});

// ─── parseRssXml ─────────────────────────────────────────────────────────────

describe('parseRssXml', () => {
  const source = makeSource({ base_domain: 'trafikverket.se' });

  it('parses all items from CDATA RSS', () => {
    // trafikverket.se item passes, transportstyrelsen.se item is filtered (not in source)
    const trafikSource = makeSource({ base_domain: 'trafikverket.se' });
    const articles = parseRssXml(SAMPLE_RSS_CDATA, trafikSource);
    const trafikArticles = articles.filter((a) => a.url.includes('trafikverket'));
    expect(trafikArticles.length).toBeGreaterThanOrEqual(1);
  });

  it('parses items from plain-content RSS', () => {
    const articles = parseRssXml(SAMPLE_RSS_PLAIN, source);
    expect(articles.length).toBeGreaterThanOrEqual(1);
    expect(articles[0]!.title).toBe('Bränslepriserna stiger');
  });

  it('strips HTML from descriptions', () => {
    const htmlSource = makeSource({ base_domain: 'trafikverket.se' });
    const articles = parseRssXml(SAMPLE_RSS_HTML_DESC, htmlSource);
    expect(articles.length).toBeGreaterThanOrEqual(1);
    expect(articles[0]!.description).not.toMatch(/<[a-z]/i);
  });

  it('returns empty array for empty RSS', () => {
    const articles = parseRssXml('<rss><channel></channel></rss>', source);
    expect(articles).toHaveLength(0);
  });

  it('skips items with no title or link', () => {
    const xml = `<rss><channel><item><description>No title or link</description></item></channel></rss>`;
    expect(parseRssXml(xml, source)).toHaveLength(0);
  });

  it('each parsed article has required fields', () => {
    const articles = parseRssXml(SAMPLE_RSS_PLAIN, source);
    for (const a of articles) {
      expect(a.title).toBeTruthy();
      expect(a.url).toBeTruthy();
      expect(a.published_at).toBeInstanceOf(Date);
      expect(a.source).toBeDefined();
    }
  });
});

// ─── buildAttributionBlock ────────────────────────────────────────────────────

describe('buildAttributionBlock', () => {
  it('includes source name, date, and URL', () => {
    const block = buildAttributionBlock(
      'Trafikverket',
      'https://trafikverket.se/nyheter/123',
      new Date('2026-06-12T08:00:00Z')
    );
    expect(block).toContain('Källa: Trafikverket');
    expect(block).toContain('Datum: 2026-06-12');
    expect(block).toContain('Länk: https://trafikverket.se/nyheter/123');
  });

  it('formats date as YYYY-MM-DD', () => {
    const block = buildAttributionBlock('Test', 'https://trafikverket.se/t', new Date('2026-01-05T00:00:00Z'));
    expect(block).toMatch(/Datum: 2026-01-05/);
  });
});

// ─── buildNewsRelayPostText ───────────────────────────────────────────────────

describe('buildNewsRelayPostText', () => {
  const article = makeArticle({
    title:       'CE-brist i Stockholmsregionen',
    description: 'Trafikverket rapporterar ökad efterfrågan på CE-förare.',
    url:         'https://www.trafikverket.se/nyheter/2026/ce-brist',
  });

  it('contains the headline', () => {
    const text = buildNewsRelayPostText(article);
    expect(text).toContain('CE-brist i Stockholmsregionen');
  });

  it('contains the description', () => {
    const text = buildNewsRelayPostText(article);
    expect(text).toContain('Trafikverket rapporterar');
  });

  it('contains source attribution', () => {
    const text = buildNewsRelayPostText(article);
    expect(text).toContain('Källa:');
    expect(text).toContain('Länk:');
    expect(text).toContain('Datum:');
  });

  it('contains community engagement prompt', () => {
    const text = buildNewsRelayPostText(article);
    expect(text).toContain('👇');
  });

  it('does not contain HTML tags', () => {
    const article2 = makeArticle({ description: '<p>Formatted <b>text</b></p>' });
    const text = buildNewsRelayPostText(article2);
    expect(text).not.toMatch(/<[a-z]/i);
  });
});

// ─── PII and safety checks ────────────────────────────────────────────────────

describe('buildNewsRelayPostText — no PII in output', () => {
  const article = makeArticle();

  it('no email addresses in post text', () => {
    const text = buildNewsRelayPostText(article);
    expect(text).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  });

  it('no Swedish phone numbers in post text', () => {
    const text = buildNewsRelayPostText(article);
    expect(text).not.toMatch(/07[0-9]{8}/);
    expect(text).not.toMatch(/\+46[0-9]{8,}/);
  });

  it('no Swedish org numbers in post text', () => {
    const text = buildNewsRelayPostText(article);
    expect(text).not.toMatch(/\d{6}-\d{4}/);
  });
});

// ─── NEWS_SOURCES config sanity ───────────────────────────────────────────────

describe('NEWS_SOURCES config', () => {
  it('every source has required fields', () => {
    for (const source of NEWS_SOURCES) {
      expect(source.id).toBeTruthy();
      expect(source.name).toBeTruthy();
      expect(source.rss_url).toBeTruthy();
      expect(source.base_domain).toBeTruthy();
      expect([1, 2, 3]).toContain(source.tier);
      expect(typeof source.active).toBe('boolean');
    }
  });

  it('every source rss_url uses https', () => {
    for (const source of NEWS_SOURCES) {
      expect(source.rss_url).toMatch(/^https:\/\//);
    }
  });

  it('every source base_domain is in ALLOWED_DOMAINS', () => {
    for (const source of NEWS_SOURCES) {
      expect(ALLOWED_DOMAINS.has(source.base_domain)).toBe(true);
    }
  });

  it('has at least one active source', () => {
    expect(NEWS_SOURCES.some((s) => s.active)).toBe(true);
  });

  it('Tier 1 sources are authoritative government sources', () => {
    const tier1 = NEWS_SOURCES.filter((s) => s.tier === 1);
    expect(tier1.length).toBeGreaterThanOrEqual(2);
    const domains = tier1.map((s) => s.base_domain);
    expect(domains).toContain('trafikverket.se');
    expect(domains).toContain('transportstyrelsen.se');
  });
});
