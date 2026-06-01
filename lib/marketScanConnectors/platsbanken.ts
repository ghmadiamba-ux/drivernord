// lib/marketScanConnectors/platsbanken.ts
//
// Live connector for Platsbanken / Arbetsförmedlingen via the Jobtech Dev
// public API (https://jobs.api.jobtechdev.se). No credentials required.
//
// Enabled by environment variable: PLATSBANKEN_SCAN_ENABLED=true
// If not set (or set to anything other than 'true'), fetchSignals() returns
// an empty result without error — connector is silently disabled.
//
// Search terms cover all CE/C/D driver roles relevant to DriverNord.

import type { NormalizedMarketSignal } from '../marketSignalTypes';
import type { MarketScanConnector, ConnectorFetchResult } from './types';
import { extractLicense, extractDomain, normalizeRegion, generateStableSignalId } from '../marketSignalImport';

// Jobtech Dev public search API — no credentials
const JOBTECH_SEARCH_URL = 'https://jobs.api.jobtechdev.se/search';

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
  const region = normalizeRegion(regionRaw) as string | null;

  // Only include Stockholm and surrounding areas for V1
  if (region !== 'stockholm' && region !== 'stockholm_region') return null;

  const license = extractLicense(rawText) ?? extractLicense(hit.headline);
  const domain  = extractDomain(rawText) ?? extractDomain(hit.headline);

  const stableId = `platsbanken:${hit.id}`;

  return {
    stable_signal_id:    stableId,
    source_type:         'platsbanken',
    source_url:          `${JOBTECH_SEARCH_URL}?q=${encodeURIComponent(query)}`,
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

  async fetchSignals(): Promise<ConnectorFetchResult> {
    if (!this.enabled) {
      return { signals: [], sources_checked: 0, raw_found: 0, errors: [] };
    }

    const fetchedAt  = new Date().toISOString();
    const allSignals: NormalizedMarketSignal[] = [];
    const errors:     string[]                 = [];
    let   rawFound   = 0;
    let   checked    = 0;

    for (const query of SEARCH_QUERIES) {
      try {
        const url = `${JOBTECH_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=${MAX_PER_QUERY}`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'DriverNord-MarketAgent/1.0' },
          signal:  AbortSignal.timeout(10_000),
        });
        checked++;

        if (!res.ok) {
          errors.push(`platsbanken query "${query}": HTTP ${res.status}`);
          continue;
        }

        const body = await res.json() as JobtechResponse;
        const hits  = body.hits ?? [];
        rawFound   += hits.length;

        for (const hit of hits) {
          const signal = normalizeHit(hit, query, fetchedAt);
          if (signal) allSignals.push(signal);
        }
      } catch (err) {
        errors.push(`platsbanken query "${query}": ${String(err)}`);
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
