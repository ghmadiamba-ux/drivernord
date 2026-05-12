/**
 * scripts/import-b2b-targets.ts
 * DriverNord — B2B Target CSV importer
 *
 * Reads docs/business/b2b-target-company-top-10-research.csv and upserts
 * rows into company_research_targets. Dry-run by default.
 *
 * Usage:
 *   npx tsx scripts/import-b2b-targets.ts            # dry-run (default)
 *   B2B_IMPORT_CONFIRM=true npx tsx scripts/import-b2b-targets.ts  # writes to DB
 */

import * as fs   from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Load .env.local before db.ts reads env vars ───────────────────────────────
const __dir   = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(__dir, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

// eslint-disable-next-line import/no-extraneous-dependencies
import { db } from '../lib/db';

const DRY_RUN = process.env['B2B_IMPORT_CONFIRM'] !== 'true';

// ── CSV parser ─────────────────────────────────────────────────────────────────

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCSVRow(lines[0]!);
  return lines.slice(1).map((line) => {
    const values = splitCSVRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] ?? '').trim();
    });
    return row;
  });
}

function splitCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Field mappers ──────────────────────────────────────────────────────────────

function parseBool(v: string): boolean | null {
  if (v === 'yes')  return true;
  if (v === 'no')   return false;
  return null;
}

function parseNullable(v: string, ...nullValues: string[]): string | null {
  if (!v || nullValues.includes(v)) return null;
  return v;
}

function parseIntNullable(v: string): number | null {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function parseArray(v: string, sep = ';'): string[] {
  return v ? v.split(sep).map((s) => s.trim()).filter(Boolean) : [];
}

function mapResearchStatus(v: string): string {
  if (v === 'complete') return 'enriched';
  return v || 'not_started';
}

function mapUrgencySignal(v: string): string | null {
  const map: Record<string, string> = {
    multiple_ads: 'repeated_ads',
    none:         'none',
    single_ad:    'single_ad',
    repeated_ads: 'repeated_ads',
    stated_urgency: 'stated_urgency',
  };
  return map[v] ?? null;
}

// CSV uses English "CEO"; DB CHECK constraint uses Swedish/mixed taxonomy (VD, owner, …).
// CEO → VD is the correct normalisation. Any other unrecognised value → 'unknown'.
const VALID_DECISION_ROLES = new Set([
  'owner', 'VD', 'transport_manager', 'driftchef',
  'operations_director', 'HR_manager', 'unknown',
]);

function mapDecisionMakerRole(v: string): string | null {
  if (!v || v === 'not_found') return null;
  if (v === 'CEO') return 'VD';
  if (VALID_DECISION_ROLES.has(v)) return v;
  return 'unknown';
}

// ── Row transformer ────────────────────────────────────────────────────────────

function transformRow(raw: Record<string, string>): Record<string, unknown> {
  return {
    company_name:             raw['company_name'] ?? '',
    website:                  parseNullable(raw['website'] ?? '', 'not_found', ''),
    region:                   parseNullable(raw['region'] ?? '', ''),
    city:                     parseNullable(raw['city'] ?? '', ''),
    company_size:             parseNullable(raw['company_size'] ?? '', ''),
    segment:                  parseNullable(raw['segment'] ?? '', ''),
    transport_domain:         parseArray(raw['transport_domain'] ?? ''),
    visible_driver_need:      parseBool(raw['visible_driver_need'] ?? ''),
    job_ads_url:              parseNullable(raw['job_ads_url'] ?? '', 'not_found', ''),
    license_mentions:         parseArray(raw['license_mentions'] ?? ''),
    ykb_mentioned:            parseBool(raw['YKB_mentions'] ?? ''),
    driver_card_mentioned:    parseBool(raw['driver_card_mentions'] ?? ''),
    urgency_signal:           mapUrgencySignal(raw['urgency_signal'] ?? ''),
    contact_email:            parseNullable(raw['contact_email'] ?? '', 'not_found', ''),
    phone:                    parseNullable(raw['phone'] ?? '', 'not_found', ''),
    linkedin_url:             parseNullable(raw['LinkedIn'] ?? '', 'not_found', ''),
    decision_maker_name:      parseNullable(raw['decision_maker_name'] ?? '', '', 'not_found'),
    decision_maker_role:      mapDecisionMakerRole(raw['decision_maker_role'] ?? ''),
    procurement_page:         parseNullable(raw['procurement_page'] ?? '', ''),
    supplier_requirements_url: parseNullable(raw['supplier_requirements_url'] ?? '', ''),
    barrier_level:            parseNullable(raw['barrier_level'] ?? '', ''),
    barrier_notes:            parseNullable(raw['barrier_notes'] ?? '', ''),
    pilot_accessibility_score: parseIntNullable(raw['pilot_accessibility_score'] ?? ''),
    opportunity_score:        parseIntNullable(raw['opportunity_score'] ?? ''),
    recommended_entry_point:  parseNullable(raw['recommended_entry_point'] ?? '', ''),
    next_action:              parseNullable(raw['next_action'] ?? '', ''),
    research_status:          mapResearchStatus(raw['research_status'] ?? ''),
    source_notes:             parseNullable(raw['source_notes'] ?? '', ''),
    last_checked_date:        parseNullable(raw['last_checked_date'] ?? '', ''),
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.join(__dir, '..', 'docs', 'business', 'b2b-target-company-top-10-research.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const raw  = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(raw);

  console.log(`Parsed ${rows.length} rows from CSV.`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN (set B2B_IMPORT_CONFIRM=true to write) ---\n');
  }

  for (const raw of rows) {
    const row = transformRow(raw);
    const name = row['company_name'] as string;

    if (DRY_RUN) {
      console.log(`  [DRY] Would upsert: ${name} (status=${row['research_status']}, score=${row['pilot_accessibility_score']})`);
      continue;
    }

    const { error } = await db
      .from('company_research_targets')
      .upsert(row, { onConflict: 'company_name' });

    if (error) {
      console.error(`  [ERROR] ${name}: ${error.message}`);
    } else {
      console.log(`  [OK]   ${name}`);
    }
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. No rows written.');
  } else {
    console.log(`\nImport complete. ${rows.length} rows processed.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
