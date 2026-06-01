// lib/marketScanConnectors/platsbanken.ts
//
// Live connector for Platsbanken / Arbetsförmedlingen via the Jobtech Dev
// public API. No credentials required.
//
// Primary URL:   https://jobsearch.api.jobtechdev.se/search
// Fallback URL:  https://jobs.api.jobtechdev.se/search
//
// Uses Node.js https module (not global fetch) for reliable DNS resolution
// in Vercel/AWS serverless environments.
//
// Enabled by environment variable: PLATSBANKEN_SCAN_ENABLED=true

import * as https from 'https';
import type { NormalizedMarketSignal } from '../marketSignalTypes';
import type { MarketScanConnector, ConnectorFetchResult } from './types';
import { extractLicense, extractDomain, normalizeRegion } from '../marketSignalImport';

// Jobtech Dev public search API — no credentials
// Primary URL is the newer jobsearch subdomain; falls back to legacy jobs subdomain
const JOBTECH_SEARCH_URLS = [
  'https://jobsearch.api.jobtechdev.se/search',
  'https://jobs.api.jobtechdev.se/search',
];

// Swedish terms for CE/C/D driver roles — covers DriverNord's primary domains
const SEARCH_QUERIES = [
  'CE chaufför',
  'C chaufför lastbil',
  'lastbilschaufför',
  'fjärrtransport chaufför',
  'distributionschaufför',
  'kylbilschaufför',
  'kyltransport chaufför',
  'schaktförare',
  'tankbilschaufför ADR',
];

const MAX_PER_QUERY = 20; // Keep total volume manageable for V1

interface JobtechHit {
  id:                 string;
  headline:           string;
  employer?:          { name?: string; organization_number?: string };
  workplace_address?: { municipality?: string; region?: string };
  publication_date?:  string;
  description?:       { text?: string };
  application_details?: { email?: string; url?: string };
  webpage_url?:       string;
}

interface JobtechResponse {
  total?: { value?: number };
  hits?:  JobtechHit[];
}

function normalizeHit(hit: JobtechHit, query: string, fetchedAt: string): NormalizedMarketSignal | null {
  const companyName = hit.employer?.name?.trim();
  if (!companyName) return null;

  const rawText   = `${hit.headline ?? ''} ${hit.description?.text ?? ''}`;
  const regionRaw = hit.workplace_address?.municipality ?? hit.workplace_address?.region ?? null;
  // Accept all Swedish locations — let scoring and supply-aware evaluation handle prioritization
  const region = normalizeRegion(regionRaw) as string | null;

  const license = extractLicense(rawText) ?? extractLicense(hit.headline);
  const domain  = extractDomain(rawText) ?? extractDomain(hit.headline);

  const stableId = `platsbanken:${hit.id}`;

  return {
    stable_signal_id:    stableId,
    source_type:         'platsbanken',
    source_url:          `${JOBTECH_SEARCH_URLS[0]}?q=${encodeURIComponent(query)}`,
    job_url:             hit.webpage_url ?? hit.application_details?.url ?? null,
    scan_date:           fetchedAt,
    signal_date:         hit.publication_date ?? null,
    company_name:        companyName,
    organization_number: hit.employer?.organization_number ?? null,
    role_title:          hit.headline ?? null,
    description_snippet: hit.description?.text ? hit.description.text.slice(0, 500) : null,
    license_required:    license,
    domain_required:     domain,
    region_required:     regionRaw,
    shift_preference:    null,
    urgency_signal:      'single_ad',
    contact_email:       hit.application_details?.email ?? null,
    phone:               null,
    decision_maker_name: null,
    decision_maker_role: null,
    confidence_score:    license ? 65 : 40,  // higher when license is explicit
    raw_metadata:        { jobtech_id: hit.id, query, headline: hit.headline },
  };
}

export class PlatsbankenConnector implements MarketScanConnector {
  readonly name        = 'platsbanken';
  readonly source_type = 'platsbanken';

  get enabled(): boolean {
    return process.env.PLATSBANKEN_SCAN_ENABLED === 'true';
  }

  private async httpsGet(url: string): Promise<{ ok: boolean; status: number; body: string }> {
    return new Promise((resolve) => {
      const parsed = new URL(url);
      const options = {
        hostname: parsed.hostname,
        path:     parsed.pathname + parsed.search,
        method:   'GET',
        headers:  {
          'Accept':          'application/json',
          'User-Agent':      'DriverNord-MarketAgent/1.0 (+https://drivernord.com)',
          'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
        },
        timeout: 15000,
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => { body += d; });
        res.on('end', () => resolve({ ok: res.statusCode! >= 200 && res.statusCode! < 300, status: res.statusCode!, body }));
      });
      req.on('timeout', () => { req.destroy(new Error('request timeout')); });
      req.on('error', (err) => resolve({ ok: false, status: 0, body: err.message }));
      req.end();
    });
  }

  private async fetchFromUrl(baseUrl: string, query: string): Promise<{ hits: JobtechHit[]; error?: string }> {
    const url = `${baseUrl}?q=${encodeURIComponent(query)}&limit=${MAX_PER_QUERY}`;
    try {
      const res = await this.httpsGet(url);
      if (!res.ok) return { hits: [], error: `HTTP ${res.status}: ${res.body.slice(0, 100)}` };
      const body = JSON.parse(res.body) as JobtechResponse;
      return { hits: body.hits ?? [] };
    } catch (err) {
      return { hits: [], error: String(err) };
    }
  }

  async fetchSignals(): Promise<ConnectorFetchResult> {
    if (!this.enabled) {
      return { signals: [], sources_checked: 0, raw_found: 0, errors: [] };
    }

    const fetchedAt  = new Date().toISOString();
    const allSignals: NormalizedMarketSignal[] = [];
    const errors:     string[]                 = [];
    let   rawFound   = 0;
    let   checked    = 0;

    // Determine which base URL to use by probing the first query
    let baseUrl = JOBTECH_SEARCH_URLS[0];
    const probe = await this.fetchFromUrl(JOBTECH_SEARCH_URLS[0], 'CE chaufför');
    if (probe.error && JOBTECH_SEARCH_URLS.length > 1) {
      // Primary URL failed — try fallback
      const fallbackProbe = await this.fetchFromUrl(JOBTECH_SEARCH_URLS[1], 'CE chaufför');
      if (!fallbackProbe.error) {
        baseUrl = JOBTECH_SEARCH_URLS[1];
        // Count the probe as checked and process its results
        checked++;
        rawFound += fallbackProbe.hits.length;
        for (const hit of fallbackProbe.hits) {
          const signal = normalizeHit(hit, 'CE chaufför', fetchedAt);
          if (signal) allSignals.push(signal);
        }
      } else {
        errors.push(`primary (${JOBTECH_SEARCH_URLS[0]}): ${probe.error}`);
        errors.push(`fallback (${JOBTECH_SEARCH_URLS[1]}): ${fallbackProbe.error}`);
        return { signals: [], sources_checked: 0, raw_found: 0, errors };
      }
    } else if (!probe.error) {
      checked++;
      rawFound += probe.hits.length;
      for (const hit of probe.hits) {
        const signal = normalizeHit(hit, 'CE chaufför', fetchedAt);
        if (signal) allSignals.push(signal);
      }
    } else {
      errors.push(`platsbanken probe failed: ${probe.error}`);
      return { signals: [], sources_checked: 0, raw_found: 0, errors };
    }

    // Run remaining queries against the confirmed working URL
    for (const query of SEARCH_QUERIES.slice(1)) {
      const result = await this.fetchFromUrl(baseUrl, query);
      checked++;
      if (result.error) {
        errors.push(`platsbanken query "${query}": ${result.error}`);
        continue;
      }
      rawFound += result.hits.length;
      for (const hit of result.hits) {
        const signal = normalizeHit(hit, query, fetchedAt);
        if (signal) allSignals.push(signal);
      }
    }

    // Dedup by stable_signal_id across queries (same job ad can match multiple queries)
    const seen    = new Set<string>();
    const deduped = allSignals.filter((s) => {
      if (seen.has(s.stable_signal_id)) return false;
      seen.add(s.stable_signal_id);
      return true;
    });

    return { signals: deduped, sources_checked: checked, raw_found: rawFound, errors };
  }
}

export const platsbankenConnector = new PlatsbankenConnector();
