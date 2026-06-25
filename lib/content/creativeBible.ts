// lib/content/creativeBible.ts
//
// DriverNord Creative Bible — brand rules as typed constants.
// Used by visual production pipeline to enforce brand integrity.
//
// BOUNDARIES:
//   ✓ Pure constants — no DB imports, no side effects
//   ✗ Does NOT connect to any external service
//   ✗ Does NOT generate or store images

// ─── Brand identity ───────────────────────────────────────────────────────────

export const BRAND_LINE  = 'Du kör. Vi hjälper dig hitta rätt uppdrag.';
export const BRAND_NAME  = 'DriverNord';
export const BRAND_DOMAIN = 'drivernord.com';

export const BRAND_PURPOSE =
  'DriverNord är ett logistiknätverk som matchar skickliga chaufförer och ' +
  'logistikarbetare med rätt uppdrag — snabbt, transparent och på dina villkor.';

// ─── Color tokens ─────────────────────────────────────────────────────────────
// CSS-compatible values; no proprietary font or asset files required.

export const BRAND_COLORS = {
  primary_dark:         '#1C1C2E',   // Deep navy — authority, transport sector
  accent_blue:          '#2563EB',   // Blue-600 — active elements, links
  accent_light:         '#EFF6FF',   // Blue-50 — light backgrounds
  text_on_dark:         '#FFFFFF',
  text_on_light:        '#1C1C2E',
  support_warm:         '#F59E0B',   // Amber-500 — warmth, highlight
  neutral_mid:          '#6B7280',   // Gray-500
  success:              '#16A34A',   // Green-600
  // Performance acquisition mode (black/yellow) — paid ads only by default
  performance_black:    '#000000',
  performance_yellow:   '#F5C100',
  performance_white:    '#FFFFFF',
} as const;

// ─── Visual modes ─────────────────────────────────────────────────────────────
// Two distinct visual expression modes from the Proven Creative Reference Library V1.
// Full specs live in creativeMechanism.ts (VISUAL_MODE_SPECS).

export const VISUAL_MODES = {
  trust_organic: {
    primary:    '#1C1C2E',   // navy
    secondary:  '#FFFFFF',
    accent:     '#2563EB',
    use:        'Organic, community, recognition, trust content',
  },
  performance_acquisition: {
    primary:    '#000000',   // black
    secondary:  '#F5C100',   // yellow
    accent:     '#FFFFFF',
    use:        'Paid acquisition; max 1/week in organic channel',
  },
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
// No proprietary font files — system font stack only.

export const BRAND_TYPOGRAPHY = {
  heading_family:        'system-ui, -apple-system, sans-serif',
  body_family:           'system-ui, -apple-system, sans-serif',
  headline_max_words:    6,    // max words in on-image headline
  support_max_words:     10,   // max words in on-image support line
  max_on_image_words:    16,   // absolute maximum words on any single visual
  min_contrast_ratio:    4.5,  // WCAG AA minimum
} as const;

// ─── Visual tone — DO / DON'T ─────────────────────────────────────────────────

export const VISUAL_TONE_RULES = {
  do: [
    'Visa verkliga transporthändelser eller trovärdiga representationer av dem',
    'Prioritera naturlig professionell posering — inte överproducerad eller glamourös',
    'Använd verklig svensk transportmiljö som referenspunkt för scener',
    'Håll bildtext kort, lättläst och mobiloptimerad',
    'Välj bilder som känns igenkännbara för en erfaren CE-chaufför',
    'Visa stolthet och kompetens — inte stress eller problem',
    'Inkludera alltid DriverNord-namn eller logotyp, oavsett format',
  ],
  dont: [
    'Visa logotyper eller varumärken från externa företag',
    'Inkludera specifika fordonsnummer, registreringsskyltar eller identifierbar utrustning',
    'Visa förare i riskabla eller ovanliga situationer',
    'Använda generiska stock-bilder som inte känns som svensk transport',
    'Lova jobb, löner, partnerskap eller kapacitet som inte är verifierad',
    'Visa ansikten på personer utan dokumenterat godkännande',
    'Använda AI-genererade bilder utan tydlig intern märkning som "AI-genererad"',
    'Lägga mer än 16 ord totalt på en bild',
    'Replikera konkurrenters visuella identitet',
    'Använda procentstatistik eller marknadsdata utan källa',
  ],
} as const;

// ─── Prohibited visual content patterns ──────────────────────────────────────
// Any visual containing these must be held for founder review.

export const PROHIBITED_VISUAL_PATTERNS = [
  'external_company_logos',              // Schenker, DHL, PostNord, Lernia, etc.
  'identifiable_license_plates',         // Vehicle registration visible
  'identifiable_persons_no_consent',     // Real people without explicit consent
  'salary_or_rate_claims',               // "X kr/h" or similar
  'job_vacancy_claims',                  // "Vi söker" or equivalent
  'verified_driver_claims',              // "Verifierade förare" or similar
  'statistical_claims_without_source',   // Percentages, statistics, market facts
  'competitor_references',               // Any reference to competing services
  'ai_generated_faces_unmarked',         // AI-generated photorealistic people without label
  'generic_non_swedish_stock',           // Obvious stock imagery not matching Swedish logistics
  'accident_or_risk_depictions',         // Dangerous driving or work situations
  'discriminatory_imagery',              // Content that excludes or demeans any group
] as const;

// ─── Required brand elements ──────────────────────────────────────────────────
// Every public-facing visual must include these.

export const REQUIRED_BRAND_ELEMENTS = [
  'brand_name_or_logo',    // "DriverNord" text or logo visible somewhere
  'brand_color_presence',  // At least one BRAND_COLORS token used
] as const;

// ─── Optional brand elements ──────────────────────────────────────────────────
// Included on premium / campaign visuals, optional on regular content.

export const OPTIONAL_BRAND_ELEMENTS = [
  'brand_line_text',           // "Du kör. Vi hjälper dig hitta rätt uppdrag."
  'domain_url',                // drivernord.com
  'logistikklubb_reference',   // Logistikklubb mention
] as const;

// ─── Accessibility ────────────────────────────────────────────────────────────

export const ACCESSIBILITY_RULES = {
  min_font_size_px:      16,   // Minimum on-image text size for mobile legibility
  min_contrast_ratio:    4.5,  // WCAG AA
  max_text_lines_mobile: 4,    // Max lines of text visible on mobile without cropping
} as const;
