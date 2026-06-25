// lib/content/riskClassifier.ts
//
// Content risk classification for DriverNord Content & Distribution Engine V1.
// Pure — no DB, no I/O.
//
// LOW-RISK: eligible for future autonomous publishing
// HIGH-RISK: must be held for founder review before any publication
//
// High-risk triggers:
//   • Named real companies (beyonds DriverNord itself)
//   • Named job opportunities ("ledigt jobb", "vi söker", "platsannons")
//   • Salary claims / numeric compensation references
//   • Claims about available drivers, verified profiles, partnerships
//   • Legal, medical, political, discriminatory content
//   • Company-specific commercial offers
//   • Statistics with no approved grounding ("X% of drivers...")

import type { CampaignCardInput, RiskLevel, ContentPillar, CreativeAngle } from './types';

// ─── High-risk pattern library ────────────────────────────────────────────────

// Swedish keywords / phrases that indicate high-risk content
// All lowercased; matched against lowercased draft text
const HIGH_RISK_PATTERNS: Array<{ pattern: string | RegExp; reason: string }> = [
  // Job offers
  { pattern: 'vi söker',          reason: 'job offer language' },
  { pattern: 'ledigt jobb',       reason: 'job offer language' },
  { pattern: 'platsannons',       reason: 'job offer language' },
  { pattern: 'lediga tjänster',   reason: 'job offer language' },
  { pattern: 'rekryterar nu',     reason: 'job offer language' },
  { pattern: 'ansök nu',         reason: 'job application CTA' },
  { pattern: 'skicka cv',        reason: 'job application CTA' },
  // Salary / compensation claims
  { pattern: /\d+[\s]*kr\/h/,           reason: 'specific hourly rate claim' },
  { pattern: /\d+[\s]*kr\/timme/,       reason: 'specific hourly rate claim' },
  { pattern: /löne?span/,               reason: 'salary range reference' },
  { pattern: /genomsnittslön/,          reason: 'average salary claim' },
  { pattern: /median ?lön/,             reason: 'median salary claim' },
  { pattern: /[\d]+[\s]*000[\s]*kr/,    reason: 'specific salary figure (SEK)' },
  // Availability / driver claims
  { pattern: 'verifierade förare',       reason: 'verified driver availability claim' },
  { pattern: 'verifierade profiler',     reason: 'verified profile claim' },
  { pattern: 'förare tillgängliga',      reason: 'driver availability claim' },
  { pattern: 'förare redo',             reason: 'driver readiness claim' },
  // Partnership / client claims
  { pattern: 'partnerskap med',          reason: 'named partnership claim' },
  { pattern: 'samarbete med',            reason: 'named collaboration claim' },
  { pattern: 'klient',                   reason: 'client reference' },
  // Statistics without grounding
  { pattern: /\d+[\s]*%[\s]*(av|förare|chaufförer)/i, reason: 'ungrounded percentage statistic' },
  { pattern: /\d+[\s]*(förare|chaufförer)[\s]*(är|har|saknar)/i, reason: 'ungrounded driver statistic' },
  // Medical / legal
  { pattern: 'sjukskrivning',            reason: 'medical reference' },
  { pattern: 'diskriminering',           reason: 'discrimination reference' },
  { pattern: 'fackförbund',             reason: 'union/political reference (requires care)' },
  { pattern: 'strejk',                  reason: 'labor action reference' },
  // Sensitive personal
  { pattern: 'personnummer',             reason: 'personal identity reference' },
  { pattern: 'folkbokföring',           reason: 'registration data reference' },
];

// Known major company name fragments that should NOT appear in autonomous content
const KNOWN_COMPANY_FRAGMENTS: string[] = [
  'ahlsell', 'ica logistik', 'schenker', 'dhl', 'postnord', 'bring',
  'lernia', 'uniflex', 'manpower', 'randstad', 'adecco', 'jobzone',
  'axfood', 'thermobud', 'ragn-sells', 'ragnsells', 'nsr', 'renova',
  'martin & servera', 'kyl-och-frys', 'kodfys',
  'transdev', 'keolis', 'arriva', 'nobina',
  'ikea', 'volvo', 'scania', 'mercedes',
];

// ─── Text-level risk scanner ──────────────────────────────────────────────────

export interface RiskFinding {
  reason: string;
  matched: string;
}

export function scanTextForRisk(text: string): RiskFinding[] {
  const lower = text.toLowerCase();
  const findings: RiskFinding[] = [];

  for (const { pattern, reason } of HIGH_RISK_PATTERNS) {
    if (typeof pattern === 'string') {
      if (lower.includes(pattern)) {
        findings.push({ reason, matched: pattern });
      }
    } else {
      const m = lower.match(pattern);
      if (m) {
        findings.push({ reason, matched: m[0] });
      }
    }
  }

  for (const fragment of KNOWN_COMPANY_FRAGMENTS) {
    if (lower.includes(fragment)) {
      findings.push({ reason: `named company reference: ${fragment}`, matched: fragment });
    }
  }

  return findings;
}

// ─── Card-level risk classifier ───────────────────────────────────────────────

export interface RiskClassification {
  risk_level: RiskLevel;
  findings: RiskFinding[];
  reason: string;
}

// High-risk creative angles (require care regardless of text)
const HIGH_RISK_ANGLES: CreativeAngle[] = [];

// High-risk pillars (acquisition is still low-risk if text passes)
const INHERENTLY_HIGH_RISK_PILLARS: ContentPillar[] = [];

export function classifyCardRisk(
  card: Pick<CampaignCardInput, 'content_pillar' | 'creative_angle' | 'driver_insight' | 'cta_type'>,
  draftText?: string
): RiskClassification {
  const findings: RiskFinding[] = [];

  // Check driver_insight field
  findings.push(...scanTextForRisk(card.driver_insight));

  // Check draft text if provided
  if (draftText) {
    findings.push(...scanTextForRisk(draftText));
  }

  // Structural checks
  if (HIGH_RISK_ANGLES.includes(card.creative_angle)) {
    findings.push({
      reason: `creative angle '${card.creative_angle}' requires founder review`,
      matched: card.creative_angle,
    });
  }

  if (INHERENTLY_HIGH_RISK_PILLARS.includes(card.content_pillar)) {
    findings.push({
      reason: `pillar '${card.content_pillar}' is inherently high-risk`,
      matched: card.content_pillar,
    });
  }

  if (findings.length > 0) {
    return {
      risk_level: 'high',
      findings,
      reason: findings.map((f) => f.reason).join('; '),
    };
  }

  return {
    risk_level: 'low',
    findings: [],
    reason: 'No high-risk patterns detected',
  };
}

// ─── Low-risk content categories (future autonomous publishing) ───────────────

export const LOW_RISK_CONTENT_EXAMPLES = [
  'General profession recognition — celebrating the CE driver role',
  'General practical driver tips — YKB renewal, route planning',
  'Neutral YKB or availability reminders',
  'Community questions — open-ended, no company names',
  'Non-company-specific market education — how the licensing system works',
  'Neutral Logistikklubb content — community welcome, discussion',
  'Carefully limited general DriverNord CTA — registration link only',
] as const;

// ─── High-risk content categories (require founder review) ────────────────────

export const HIGH_RISK_CONTENT_EXAMPLES = [
  'Named companies — any company other than DriverNord',
  'Named job opportunities — specific vacancies or assignments',
  'Salary claims or market statistics without approved grounding',
  'Claims about available drivers, verified profiles, or client relationships',
  'Legal, political, discriminatory, medical, or sensitive personal-data content',
  'Company-specific commercial offers',
  'Statistics with no approved source ("X% of CE drivers...")',
] as const;
