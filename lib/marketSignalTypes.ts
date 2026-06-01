// lib/marketSignalTypes.ts
//
// Canonical type for normalized market signals flowing into DriverNord's
// Market Agent import pipeline.
//
// Any source (Platsbanken live API, CSV, manual entry, future connectors)
// must normalize its output to NormalizedMarketSignal before import.
// This type is the contract between signal sources and the DB import layer.

// ─── Source types ─────────────────────────────────────────────────────────────

export type MarketSignalSourceType =
  | 'platsbanken'   // Jobtech Dev public API — Swedish public employment service
  | 'manual_csv'    // Founder-prepared CSV import
  | 'manual_entry'  // Single manual record entered via API
  | 'web_scrape'    // Future: headless browser / Firecrawl
  | 'partner_feed'; // Future: third-party data partner

// ─── Normalized market signal ─────────────────────────────────────────────────

export interface NormalizedMarketSignal {
  // Stable dedup key — must be unique per source for the same signal.
  // Format: "{source_type}:{external_id}" e.g. "platsbanken:a1b2c3d4"
  // For CSV: "manual_csv:{scan_record_id}"
  // For manual: deterministic hash of company_name:region:role
  stable_signal_id: string;

  // ── Source provenance ─────────────────────────────────────────────────────
  source_type:  MarketSignalSourceType;
  source_url:   string | null; // URL of source page / search result
  job_url:      string | null; // URL of specific job ad (if different from source_url)
  scan_date:    string;        // ISO — when this signal was retrieved by DriverNord
  signal_date:  string | null; // ISO — when the original ad/signal was published

  // ── Company identity ──────────────────────────────────────────────────────
  company_name:         string;
  organization_number:  string | null; // Swedish org number (10 digits)

  // ── Role/need details ─────────────────────────────────────────────────────
  role_title:          string | null;
  description_snippet: string | null;  // First ~500 chars of job description
  license_required:    string | null;  // 'CE' | 'C' | 'D' | 'BE' | null
  domain_required:     string | null;  // DriverNord domain taxonomy
  region_required:     string | null;  // 'stockholm' | 'stockholm_region' | etc.
  shift_preference:    string | null;  // 'day' | 'flexible' | 'shift' | null
  urgency_signal:      'none' | 'single_ad' | 'repeated_ads' | 'stated_urgency';

  // ── Contact data (will not be logged) ─────────────────────────────────────
  contact_email:         string | null;
  phone:                 string | null;
  decision_maker_name:   string | null;
  decision_maker_role:   string | null;

  // ── Signal quality ────────────────────────────────────────────────────────
  // 0–100 — connector assigns this based on data completeness and source quality
  confidence_score: number;

  // ── Raw source payload ────────────────────────────────────────────────────
  // Original API response or CSV row. Never logged in system_actions or prompts.
  raw_metadata: Record<string, unknown>;
}

// ─── Import run summary ───────────────────────────────────────────────────────

export interface ImportRunSummary {
  run_type:           'import_run' | 'live_scan';
  started_at:         string;
  completed_at:       string;
  source_types:       MarketSignalSourceType[];

  // ── Signal counts ─────────────────────────────────────────────────────────
  signals_received:   number;
  signals_valid:      number;
  signals_imported:   number;  // new company_need_drafts created
  signals_updated:    number;  // existing drafts refreshed
  signals_skipped_duplicate: number;
  signals_skipped_invalid:   number;
  errors:             string[];

  // ── Post-import evaluation ────────────────────────────────────────────────
  evaluation_run:     boolean;
  drafts_evaluated:   number;
  supply_gap_blocked: number;
  supply_ready_promotable: number;
  stale_count:        number;

  // ── Live scan specific ────────────────────────────────────────────────────
  live_scan_attempted: boolean;
  live_sources_checked: number;  // number of connector queries made
  live_signals_found:   number;  // signals returned before filtering/dedup
}

// ─── Refresh run summary ──────────────────────────────────────────────────────

export interface RefreshRunSummary {
  run_type:            'refresh_run';
  started_at:          string;
  stale_drafts_found:  number;
  refresh_attempted:   number;  // 0 if no live connector available
  refresh_succeeded:   number;
  refresh_skipped:     number;
  live_connector_available: boolean;
  evaluation_run:      boolean;
}
