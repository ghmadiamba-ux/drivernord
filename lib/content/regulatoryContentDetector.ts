// lib/content/regulatoryContentDetector.ts
//
// Detects content that references specific driving-time rules, rest obligations,
// tachograph requirements, licence validity rules, or Transportstyrelsen mandates.
//
// Such content must not be published without grounding in an approved official source.
// The gate uses `lifecycle_status = 'held'` with a REGULATORY_CONTENT blocked_reason
// prefix in the content_campaign_cards table.
//
// BOUNDARIES:
//   ✓ Pure function — no DB imports, no side effects
//   ✗ Does NOT call any external API

// ─── Detection patterns ───────────────────────────────────────────────────────
//
// Matches Swedish and English terms for regulatory driving/rest obligations.
// Each pattern has a human-readable label for reporting.

interface RegulatoryPattern {
  label: string;
  pattern: RegExp;
}

const REGULATORY_PATTERNS: RegulatoryPattern[] = [
  { label: 'tachograph/färdskrivare',    pattern: /f[äa]rdskrivar|tachograph/i },
  { label: 'driving time rules',         pattern: /k[öo]rtid|k[öo]rning[,\s]+(\d|rast)/i },
  { label: 'rest period rules',          pattern: /vilotid|dygnsvilotid|veckovila/i },
  { label: 'mandatory break duration',   pattern: /rast\s*(efter|p[åa])\s*\d/i },
  { label: 'specific hour rule (4.5h)',  pattern: /4[,.]5\s*(h|timm)/i },
  { label: 'specific rest (11h)',        pattern: /11\s*(h|timm)/i },
  { label: 'specific rest (45h)',        pattern: /45\s*(h|timm)/i },
  { label: 'Transportstyrelsen',         pattern: /transportstyrel/i },
  { label: 'EU regulation reference',   pattern: /EU-f[öo]rordning|EG\s*\d+\/\d+|561\/2006/i },
  { label: 'ADR dangerous goods',        pattern: /\bADR\b/ },
  { label: 'licence validity rules',     pattern: /k[öo]rkorts?(giltighe|f[öo]rny)/i },
];

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RegulatoryDetectionResult {
  is_regulatory: boolean;
  matched_labels: string[];
  blocked_reason_prefix: string;
}

export const REGULATORY_BLOCKED_REASON_PREFIX = 'REGULATORY_CONTENT — requires_official_source_review:';

/**
 * Detects whether `text` contains specific regulatory claims about driving time,
 * rest obligations, tachograph use, or Transportstyrelsen requirements.
 *
 * Cards flagged as regulatory must have lifecycle_status = 'held' with
 * blocked_reason starting with REGULATORY_BLOCKED_REASON_PREFIX.
 */
export function detectsRegulatoryContent(text: string): RegulatoryDetectionResult {
  const matched: string[] = [];
  for (const { label, pattern } of REGULATORY_PATTERNS) {
    if (pattern.test(text)) matched.push(label);
  }
  return {
    is_regulatory:         matched.length > 0,
    matched_labels:        matched,
    blocked_reason_prefix: REGULATORY_BLOCKED_REASON_PREFIX,
  };
}

/**
 * Returns true if a blocked_reason string signals a regulatory hold.
 * Used to detect regulatory-held cards from existing DB data.
 */
export function isRegulatoryHold(blockedReason: string | null | undefined): boolean {
  return typeof blockedReason === 'string' &&
         blockedReason.startsWith(REGULATORY_BLOCKED_REASON_PREFIX);
}

/**
 * Builds the full blocked_reason string for a regulatory hold,
 * incorporating the specific matched labels.
 */
export function buildRegulatoryBlockedReason(matchedLabels: string[]): string {
  return (
    `${REGULATORY_BLOCKED_REASON_PREFIX} ` +
    `Card contains specific regulatory content: ${matchedLabels.join(', ')}. ` +
    `Must be linked to an approved official source (Transportstyrelsen or EU-regulation) ` +
    `before this card may be approved or published. ` +
    `Do not generate a polished publishing-ready visual prototype until grounded.`
  );
}
