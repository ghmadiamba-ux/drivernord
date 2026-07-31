// lib/outreachAgent.ts
// Canonical Zoho Outreach Agent — generates founder-approved long-form Swedish B2B emails.
// Default: dry_run=true. All output is queued for manual review.
// Actual sending is always founder-manual from Zoho. This module never sends.

export type OutreachReadiness = 'READY' | 'THIN_BUT_USABLE' | 'QUESTION_BASED' | 'SUPPLY_GAP';

export type TransportDomain =
  | 'distribution'
  | 'schakt_bygg'
  | 'fjarrtransport'
  | 'kran'
  | 'adr'
  | 'tanker'
  | 'kylfrys'
  | string;

export interface OutreachTarget {
  company_name: string;
  contact_email: string | null;
  decision_maker_name: string | null;
  transport_domain: TransportDomain[];
  license_mentions: string[];
  do_not_contact_reason: string | null;
  is_bankrupt?: boolean;
  readiness: OutreachReadiness;
}

export type BlockReason =
  | 'do_not_contact'
  | 'bankrupt'
  | 'missing_email'
  | 'jpc_excluded';

export interface QueuedEmail {
  to: string;
  subject: string;
  body: string;
  company_name: string;
  readiness: OutreachReadiness;
  dry_run: boolean;
  blocked: false;
  queued_at: string;
}

export interface BlockedEmail {
  company_name: string;
  readiness: OutreachReadiness;
  dry_run: boolean;
  blocked: true;
  block_reason: BlockReason;
}

export type EmailResult = QueuedEmail | BlockedEmail;

export const RATE_LIMIT_PER_HOUR = 2;

// Only patterns that are unconditionally forbidden in any context.
// "bemanning" is NOT here — it appears in the canonical negation clause "Vi är varken bemanning".
export const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bgratis\b/i, label: 'gratis' },
  { pattern: /\b0 kr\b/i,   label: '0 kr' },
  { pattern: /\bAI\b/,      label: 'AI' },
  { pattern: /\bAdam\b/,    label: 'Adam (wrong sender name)' },
];

const JPC_IDENTIFIERS = ['jpc entreprenad', 'jpc'];

// ── Domain copy ───────────────────────────────────────────────────────────────

function needPhrase(domain: TransportDomain): string {
  switch (domain) {
    case 'distribution':   return 'ett tydligt behov kopplat till förare inom distributionskörning';
    case 'schakt_bygg':    return 'ett behov av chaufförer för schakt och markarbete';
    case 'fjarrtransport': return 'ett behov av CE-chaufförer för fjärr- och regiontransport';
    case 'kran':           return 'ett behov kopplat till CE-chaufförer för tunga transporter och maskintransporter';
    case 'adr':
    case 'tanker':         return 'ett behov kopplat till förare inom tank- och farligtgodstransporter';
    case 'kylfrys':        return 'ett tydligt behov kopplat till förare inom kyl- och frystransporter';
    default:               return 'ett behov av certifierade yrkeschaufförer';
  }
}

function painParagraph(domain: TransportDomain): string {
  const opener = 'Det är en typ av rekrytering där det inte räcker att hitta \'en chaufför\'.';
  switch (domain) {
    case 'distribution':
      return `${opener} Det måste vara rätt behörighet, rätt kännedom om Stockholmsregionen och en förare med god vana av distributions- och lastbilsuppdrag.`;
    case 'schakt_bygg':
      return `${opener} Det måste vara rätt behörighet, rätt maskinvana och en förare med dokumenterad erfarenhet av schakt och markarbete.`;
    case 'fjarrtransport':
      return `${opener} Det måste vara rätt CE-behörighet, rätt körerfarenhet och en förare med bevisad vana av fjärr- eller regionaltransport.`;
    case 'kran':
      return `${opener} Det måste vara rätt CE-behörighet, rätt fordonstyp och dokumenterad erfarenhet av tunga transporter med specialfordon.`;
    case 'adr':
    case 'tanker':
      return `${opener} Det måste vara rätt ADR-certifiering, rätt tankbilsvana och en förare som faktiskt uppfyller alla krav för farligtgodstransport.`;
    case 'kylfrys':
      return `${opener} Det måste vara rätt behörighet, rätt tillgänglighet, rätt erfarenhet och en förare som faktiskt passar ett temperaturkänsligt transportuppdrag.`;
    default:
      return `${opener} Det måste vara rätt behörighet, rätt erfarenhet och en förare som faktiskt passar uppdragets specifika krav.`;
  }
}

function whySelected(companyName: string, domain: TransportDomain, licStr: string): string {
  switch (domain) {
    case 'distribution':
      return `Vi har valt ut ${companyName} eftersom ert behov ligger nära den typ av ${licStr}-profiler inom distribution som vi arbetar med i Stockholmsregionen.`;
    case 'schakt_bygg':
      return `Vi har valt ut ${companyName} eftersom ert behov matchar de ${licStr}-profiler inom schakt och markarbete som vi arbetar med i Stockholmsregionen.`;
    case 'fjarrtransport':
      return `Vi har valt ut ${companyName} eftersom ert behov matchar den typ av CE-chaufförer för fjärrtransport som vi arbetar aktivt med.`;
    case 'kran':
      return `Vi har valt ut ${companyName} eftersom er verksamhet kräver CE-kompetens för tunga transporter — en typ vi rekryterar aktivt.`;
    case 'adr':
    case 'tanker':
      return `Vi har valt ut ${companyName} eftersom ert behov av ADR-certifierade förare är en nisch vi prioriterat i vår pooluppbyggnad.`;
    case 'kylfrys':
      return `Vi har valt ut ${companyName} eftersom ert behov ligger nära den typ av ${licStr}-profiler inom distribution och kyl/frys som vi arbetar med i Stockholmsregionen.`;
    default:
      return `Vi har valt ut ${companyName} eftersom ert transportbehov matchar de förarprofiler vi arbetar med.`;
  }
}

function poolClaim(readiness: OutreachReadiness): string {
  switch (readiness) {
    case 'READY':            return 'I vår nuvarande pool finns redan förare som matchar den typen av behov.';
    case 'THIN_BUT_USABLE':  return 'I vår nuvarande pool finns förare som kan vara relevanta för den typen av behov.';
    case 'QUESTION_BASED':   return 'Vi arbetar med att kartlägga förare och behov inom detta område.';
    case 'SUPPLY_GAP':       return 'Vi kartlägger just nu förare inom detta område och vill förstå om behovet är återkommande hos er.';
  }
}

function deliveryLine(domain: TransportDomain, licStr: string): string {
  switch (domain) {
    case 'distribution':
      return `Det innebär att vi, om behovet fortfarande är aktuellt, kan ta fram en kortlist med relevanta ${licStr}-chaufförer för distribution i Stockholm/Mälardalen.`;
    case 'schakt_bygg':
      return `Det innebär att vi, om behovet fortfarande är aktuellt, kan ta fram en kortlist med relevanta ${licStr}-chaufförer för schakt och markarbete.`;
    case 'fjarrtransport':
      return 'Det innebär att vi, om behovet fortfarande är aktuellt, kan ta fram en kortlist med CE-chaufförer för fjärr- och regiontransport.';
    case 'kran':
      return 'Det innebär att vi, om behovet fortfarande är aktuellt, kan ta fram en kortlist med CE-chaufförer för tunga transporter.';
    case 'adr':
    case 'tanker':
      return 'Det innebär att vi, om behovet fortfarande är aktuellt, kan ta fram en kortlist med förare med relevant ADR-certifiering för tanktransport.';
    case 'kylfrys':
      return `Det innebär att vi, om behovet fortfarande är aktuellt, kan ta fram en kortlist med relevanta ${licStr}-förare för kyl- och frystransporter i Stockholm/Mälardalen.`;
    default:
      return `Det innebär att vi, om behovet fortfarande är aktuellt, kan ta fram en kortlist med relevanta ${licStr}-chaufförer.`;
  }
}

function ctaLine(domain: TransportDomain, licStr: string): string {
  switch (domain) {
    case 'distribution':
      return `Om behovet av ${licStr}-förare inom distribution fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.`;
    case 'schakt_bygg':
      return `Om behovet av ${licStr}-förare inom schakt och markarbete fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.`;
    case 'fjarrtransport':
      return 'Om behovet av CE-förare för fjärrtransport fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.';
    case 'kran':
      return 'Om behovet av CE-förare för tunga transporter fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.';
    case 'adr':
    case 'tanker':
      return 'Om behovet av ADR-certifierade förare fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.';
    case 'kylfrys':
      return `Om behovet av ${licStr}-förare inom kyl- och frystransporter fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.`;
    default:
      return 'Om behovet fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.';
  }
}

function subjectLine(domain: TransportDomain, licStr: string, companyName: string): string {
  switch (domain) {
    case 'distribution':   return `${licStr}-chaufförer för distribution — ${companyName}`;
    case 'schakt_bygg':    return `${licStr}-chaufförer för schakt och markarbete — ${companyName}`;
    case 'fjarrtransport': return `CE-chaufförer för fjärrtransport — ${companyName}`;
    case 'kran':           return `CE-chaufförer för maskintransport — ${companyName}`;
    case 'adr':
    case 'tanker':         return `CE-chaufförer för tank- och transportuppdrag — ${companyName}`;
    case 'kylfrys':        return `${licStr}-chaufförer för kyl- och frystransporter — ${companyName}`;
    default:               return `CE-chaufförer — ${companyName}`;
  }
}

// ── Block logic ───────────────────────────────────────────────────────────────

function resolveBlock(target: OutreachTarget): BlockReason | null {
  const nameLower = target.company_name.toLowerCase();
  if (JPC_IDENTIFIERS.some(id => nameLower.includes(id))) return 'jpc_excluded';
  if (target.is_bankrupt) return 'bankrupt';
  if (target.do_not_contact_reason !== null) return 'do_not_contact';
  if (!target.contact_email) return 'missing_email';
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function validateEmailContent(body: string): string[] {
  return FORBIDDEN_PATTERNS
    .filter(({ pattern }) => pattern.test(body))
    .map(({ label }) => label);
}

export function isWithinRateLimit(sentInLastHour: number): boolean {
  return sentInLastHour < RATE_LIMIT_PER_HOUR;
}

export function generateEmail(
  target: OutreachTarget,
  options: { dry_run?: boolean } = {},
): EmailResult {
  const dry_run = options.dry_run ?? true;

  const blockReason = resolveBlock(target);
  if (blockReason) {
    return { company_name: target.company_name, readiness: target.readiness, dry_run, blocked: true, block_reason: blockReason };
  }

  const domain      = target.transport_domain[0] ?? 'distribution';
  const licStr      = target.license_mentions.length > 0
    ? target.license_mentions.slice(0, 2).join('/')
    : 'CE';
  const greeting    = target.decision_maker_name
    ? `Hej ${target.decision_maker_name},`
    : 'Hej,';

  // Steps 9–12 only for shortlist-capable categories
  const includeOffer = target.readiness === 'READY' || target.readiness === 'THIN_BUT_USABLE';

  const lines: string[] = [
    greeting,
    '',
    `Vi har uppmärksammat att ${target.company_name} har ${needPhrase(domain)}.`,
    '',
    painParagraph(domain),
    '',
    'DriverNord arbetar med matchning av yrkesförare inom transport.',
    '',
    'Vi är varken bemanning eller en traditionell jobbtavla. Vår modell bygger på det som redan fungerar på mer mogna transportmarknader: att leverera en kvalitetssäkrad kortlist med förare som matchar ett konkret transportbehov.',
    '',
    `${whySelected(target.company_name, domain, licStr)} ${poolClaim(target.readiness)}`,
    '',
  ];

  if (includeOffer) {
    lines.push(
      'Därför vill vi ge er ett särskilt erbjudande: en första matchningsleverans utan startkostnad.',
      '',
      deliveryLine(domain, licStr),
      '',
      'Erbjudandet går endast till ett fåtal utvalda transportföretag. När dessa platser är fyllda går DriverNord vidare till ordinarie kommersiella villkor.',
      '',
      'Som del av upplägget förväntar vi oss snabb återkoppling på matchningen och att samarbetet kan nämnas anonymt som en del av DriverNords referensarbete.',
      '',
    );
  }

  lines.push(
    ctaLine(domain, licStr),
    '',
    'Med vänliga hälsningar,',
    '',
    'Ghislain Alexander Mad',
    'DriverNord',
    'Matchning av yrkesförare för svenska transportföretag',
    '',
    'Webb: https://drivernord.com',
    'E-post: hej@drivernord.com',
    'Tel: 070-938 52 67',
  );

  const body = lines.join('\n');

  const violations = validateEmailContent(body);
  if (violations.length > 0) {
    // Structural invariant — generated body must never contain forbidden content
    throw new Error(`Generated email contains forbidden content: ${violations.join(', ')}`);
  }

  return {
    to:           target.contact_email!,
    subject:      subjectLine(domain, licStr, target.company_name),
    body,
    company_name: target.company_name,
    readiness:    target.readiness,
    dry_run,
    blocked:      false,
    queued_at:    new Date().toISOString(),
  };
}
