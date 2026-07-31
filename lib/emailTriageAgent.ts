// Email Triage Agent — pure, synchronous, no external deps, no Zoho connection.
// Follows the same pattern as lib/classify.ts — heuristic rule-based classification.
// shouldAutoSend is hardcoded false. requiresHumanApproval is hardcoded true.
// These values are type-level constants, not configurable by env vars.

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailCategory =
  | 'DRIVER_INQUIRY'
  | 'COMPANY_INQUIRY'
  | 'META_LEAD_RESPONSE'
  | 'SUPPORT_REQUEST'
  | 'LEGAL_ADMIN'
  | 'PARTNERSHIP'
  | 'SPAM_OR_IRRELEVANT'
  | 'UNKNOWN';

export type EmailConfidence = 'high' | 'medium' | 'low';
export type EmailLanguage   = 'sv' | 'en' | 'unknown';

export type EmailStatus =
  | 'NEW'
  | 'CLASSIFIED'
  | 'DRAFTED'
  | 'NEEDS_FOUNDER_REVIEW'
  | 'APPROVED_TO_SEND'
  | 'SENT'
  | 'ESCALATED'
  | 'CLOSED'
  | 'IGNORED';

export type EmailSource = 'zoho_manual' | 'zoho_imap' | 'zoho_api' | 'mock';

export interface EmailTriageInput {
  from:       string;
  to:         string;
  subject:    string;
  body:       string;
  receivedAt: string;
  source:     EmailSource;
}

export interface ExtractedDriverFields {
  licenseCategory?: string;
  ykb?:             boolean;
  city?:            string;
  availability?:    string;
  preferredWorkType?: string;
}

export interface ExtractedCompanyFields {
  companyName?:     string;
  contactPerson?:   string;
  location?:        string;
  licenseRequired?: string;
  urgency?:         string;
  numberOfDrivers?: number;
  shiftType?:       string;
}

export interface EmailTriageResult {
  category:              EmailCategory;
  confidence:            EmailConfidence;
  language:              EmailLanguage;
  summary:               string;
  extractedFields:       ExtractedDriverFields | ExtractedCompanyFields | Record<string, never>;
  complianceFlags:       string[];
  suggestedNextAction:   string;
  draftReply:            string;
  requiresHumanApproval: true;
  shouldAutoSend:        false;
  status:                EmailStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lower(s: string): string {
  return s.toLowerCase();
}

function contains(haystack: string, ...needles: string[]): boolean {
  const h = lower(haystack);
  return needles.some((n) => h.includes(lower(n)));
}

function combined(input: EmailTriageInput): string {
  return `${input.subject} ${input.body}`;
}

// ─── Language detection ───────────────────────────────────────────────────────

const SWEDISH_SIGNALS = [
  'hej', 'jag', 'och', 'är', 'att', 'med', 'för', 'av', 'vi', 'har',
  'inte', 'du', 'ni', 'det', 'den', 'sig', 'som', 'men', 'om', 'på',
  'körkort', 'chaufför', 'chaufförer', 'körning', 'tillgänglig',
  'erfarenhet', 'söker', 'behöver', 'företag', 'hälsningar',
];

const ENGLISH_SIGNALS = [
  'hello', 'dear', 'regards', 'please', 'thank you', 'i am', 'we are',
  'driver', 'license', 'available', 'experience', 'company', 'looking',
  'inquiry', 'request', 'question', 'sincerely', 'best',
];

export function detectLanguage(input: EmailTriageInput): EmailLanguage {
  const text = lower(combined(input));
  const svScore = SWEDISH_SIGNALS.filter((w) => text.includes(w)).length;
  const enScore = ENGLISH_SIGNALS.filter((w) => text.includes(w)).length;
  if (svScore === 0 && enScore === 0) return 'unknown';
  if (svScore > enScore) return 'sv';
  if (enScore > svScore) return 'en';
  return 'sv'; // default to Swedish for ambiguous content
}

// ─── Compliance flag detection ────────────────────────────────────────────────

export function detectComplianceFlags(input: EmailTriageInput): string[] {
  const flags: string[] = [];
  const text = combined(input);

  if (contains(text, 'bemanning', 'bemanningsbolag', 'hyr ut', 'hyr chaufförer', 'staffing agency', 'temp agency')) {
    flags.push('COMPLIANCE_BEMANNING_LANGUAGE');
  }
  if (contains(text, 'garanterat jobb', 'garanterar arbete', 'guaranteed job', 'guarantee work', 'guarantee placement')) {
    flags.push('COMPLIANCE_JOB_GUARANTEE');
  }
  if (contains(text, 'officiellt verifierad', 'officiell verifiering', 'officially verified', 'official verification')) {
    flags.push('COMPLIANCE_VERIFICATION_CLAIM');
  }
  if (contains(text, 'anställer chaufförer', 'vi anställer', 'drivernord employs', 'employs drivers')) {
    flags.push('COMPLIANCE_EMPLOYMENT_CLAIM');
  }
  if (contains(text,
    'gdpr', 'personuppgift', 'radera', 'delete my data', 'right to be forgotten',
    'subject access request', ' sar ', 'imy', 'datainspektionen',
    'rätt att bli glömd', 'rätt att bli bortglömd',
  )) {
    flags.push('LEGAL_GDPR_REQUEST');
  }
  if (contains(text, 'anmäler', 'anmälan', 'klagar', 'complaint', 'report to', 'konsumentverket', 'imy')) {
    if (!flags.includes('LEGAL_GDPR_REQUEST')) flags.push('LEGAL_COMPLAINT');
    else flags.push('LEGAL_COMPLAINT');
  }
  if (contains(text, 'hot', 'hotar', 'threat', 'rättslig åtgärd', 'legal action', 'lawsuit', 'stämmer er')) {
    flags.push('ESCALATE_THREAT');
  }

  return [...new Set(flags)];
}

// ─── Category classification ──────────────────────────────────────────────────

// Driver signals focus on FIRST-PERSON indicators — sender describes themselves as a driver.
// "chaufför" (singular) here is fine; "chaufförer" (plural) below is a company signal.
const DRIVER_SIGNALS_SV = [
  'jag är chaufför', 'jag är ce', 'jag är lastbilschaufför',
  'jag har ce', 'jag har c-körkort', 'jag har d-körkort',
  'jag söker jobb', 'jag söker körning', 'jag söker arbete',
  'söker jobb', 'söker arbete', 'jobbsöker',
  'registrera mig', 'kan man registrera',
  'bor i', 'är bosatt i',
  'ce-körkort', 'c-körkort', 'd-körkort', 'ce körkort',
  'jag är tillgänglig', 'tillgänglig omgående',
];

const DRIVER_SIGNALS_EN = [
  'i am a truck driver', 'i am a driver', 'i am a ce driver',
  'ce license', 'c license', 'd license',
  'truck driver', 'lorry driver', 'hgv driver', 'cpc card',
  'looking for work', 'looking for driving work',
  'available immediately', 'years of experience driving',
  'register as a driver', 'i am looking for',
];

// Company signals focus on ORGANIZATIONAL perspective — sender represents a company seeking drivers.
// "chaufförer" (plural) is a strong company indicator because companies refer to a pool of drivers.
const COMPANY_SIGNALS_SV = [
  'vi söker', 'vi behöver', 'vi är ett',
  'transportföretag', 'logistikföretag', 'åkeriföretag', 'åkeri',
  'chaufförer', 'förare',
  'anlita', 'anlitar',
  'hur fungerar er tjänst', 'vad kostar', 'prissättning',
  'hur går det till', 'vi vill anlita', 'vi vill hyra',
  'dagtid', 'nattskift',
];

const COMPANY_SIGNALS_EN = [
  'we need drivers', 'we are looking for drivers', 'we need truck drivers',
  'we are a company', 'transport company', 'logistics company',
  'how does your service work', 'pricing', 'how much does it cost',
  'we want to hire', 'we require', 'we are seeking',
];

const SPAM_SIGNALS = [
  'unsubscribe', 'click here to claim', 'you have won', 'congratulations',
  'lottery', 'prize', 'seo services', 'marketing services', 'buy now',
  'limited time offer', 'act now', 'free money', 'inheritance',
  'no-reply@', 'noreply@',
];

const LEGAL_SIGNALS = [
  'radera', 'delete my data', 'right to be forgotten', 'gdpr', 'personuppgift',
  'imy', 'datainspektionen', 'subject access request', 'sar',
  'rätt att bli', 'data deletion', 'privacy request', 'access request',
];

const PARTNERSHIP_SIGNALS = [
  'samarbete', 'partner', 'affiliate', 'press', 'media inquiry',
  'collaboration', 'partnership', 'vi erbjuder er', 'we offer you',
];

const META_SIGNALS = [
  'facebook', 'facebookmail', 'instagram', 'meta', 'utm_source', 'från annons',
  'saw your ad', 'your facebook page', 'via facebook',
];

const SUPPORT_SIGNALS = [
  'hur fungerar', 'vad innebär', 'hur registrerar', 'fråga om', 'förstår inte',
  'hjälp med', 'how does', 'what does', 'i have a question', 'confused about',
];

function scoreSignals(text: string, signals: string[]): number {
  return signals.filter((s) => lower(text).includes(lower(s))).length;
}

export function classifyCategory(input: EmailTriageInput): { category: EmailCategory; confidence: EmailConfidence } {
  const text = combined(input);
  const flags = detectComplianceFlags(input);

  // Legal/admin takes priority over everything
  if (flags.includes('LEGAL_GDPR_REQUEST') || flags.includes('LEGAL_COMPLAINT') || flags.includes('ESCALATE_THREAT')) {
    return { category: 'LEGAL_ADMIN', confidence: 'high' };
  }

  // Legal signals in body (independent of compliance flags)
  if (scoreSignals(text, LEGAL_SIGNALS) >= 1) {
    return { category: 'LEGAL_ADMIN', confidence: 'high' };
  }

  // Spam check
  const spamScore = scoreSignals(text, SPAM_SIGNALS);
  if (spamScore >= 2 || lower(input.from).includes('no-reply') || lower(input.from).includes('noreply')) {
    if (spamScore >= 1) return { category: 'SPAM_OR_IRRELEVANT', confidence: 'high' };
  }

  // Meta lead
  const metaScore = scoreSignals(text, META_SIGNALS);

  // Driver signals
  const driverSv = scoreSignals(text, DRIVER_SIGNALS_SV);
  const driverEn = scoreSignals(text, DRIVER_SIGNALS_EN);
  const driverScore = driverSv + driverEn;

  // Company signals
  const companySv = scoreSignals(text, COMPANY_SIGNALS_SV);
  const companyEn = scoreSignals(text, COMPANY_SIGNALS_EN);
  const companyScore = companySv + companyEn;

  // Partnership
  const partnerScore = scoreSignals(text, PARTNERSHIP_SIGNALS);

  // Support
  const supportScore = scoreSignals(text, SUPPORT_SIGNALS);

  // Spam (single signal)
  if (spamScore >= 1) {
    return { category: 'SPAM_OR_IRRELEVANT', confidence: spamScore >= 2 ? 'high' : 'medium' };
  }

  if (metaScore >= 1 && driverScore >= 1) {
    return { category: 'META_LEAD_RESPONSE', confidence: 'medium' };
  }

  if (metaScore >= 1 && companyScore >= 1) {
    return { category: 'META_LEAD_RESPONSE', confidence: 'medium' };
  }

  if (driverScore >= 2 && driverScore > companyScore) {
    return { category: 'DRIVER_INQUIRY', confidence: driverScore >= 3 ? 'high' : 'medium' };
  }

  if (companyScore >= 2 && companyScore > driverScore) {
    return { category: 'COMPANY_INQUIRY', confidence: companyScore >= 3 ? 'high' : 'medium' };
  }

  if (driverScore === 1 && companyScore === 0) {
    return { category: 'DRIVER_INQUIRY', confidence: 'low' };
  }

  if (companyScore === 1 && driverScore === 0) {
    return { category: 'COMPANY_INQUIRY', confidence: 'low' };
  }

  if (partnerScore >= 1) {
    return { category: 'PARTNERSHIP', confidence: partnerScore >= 2 ? 'high' : 'medium' };
  }

  if (supportScore >= 1) {
    return { category: 'SUPPORT_REQUEST', confidence: 'medium' };
  }

  return { category: 'UNKNOWN', confidence: 'low' };
}

// ─── Field extraction ─────────────────────────────────────────────────────────

const LICENSE_PATTERN = /\b(CE\+D|CE|C1E|C1|BE|C|D1|D)\b/i;
const CITY_PATTERN    = /\b(Stockholm|Göteborg|Malmö|Uppsala|Linköping|Örebro|Västerås|Helsingborg|Norrköping|Jönköping)\b/i;
const DRIVER_COUNT    = /\b(\d{1,2})\s*(st\.?|stycken|st )?\s*(ce[- ]?chaufförer?|chaufförer?|förare|truck drivers?|drivers?)\b/i;

export function extractDriverFields(input: EmailTriageInput): ExtractedDriverFields {
  const text = combined(input);
  const fields: ExtractedDriverFields = {};

  const licenseMatch = text.match(LICENSE_PATTERN);
  if (licenseMatch) fields.licenseCategory = licenseMatch[1].toUpperCase();

  if (contains(text, 'ykb', 'yrkeskompetensbevis', 'cpc')) fields.ykb = true;

  const cityMatch = text.match(CITY_PATTERN);
  if (cityMatch) fields.city = cityMatch[1];

  if (contains(text, 'omgående', 'immediately', 'tillgänglig nu', 'available now', 'direkt')) {
    fields.availability = 'omgående';
  } else if (contains(text, '2 veckor', 'two weeks', 'inom kort')) {
    fields.availability = '2_weeks';
  }

  if (contains(text, 'distribution', 'distributionskörning')) fields.preferredWorkType = 'distribution';
  else if (contains(text, 'fjärr', 'long distance', 'international')) fields.preferredWorkType = 'fjärr';
  else if (contains(text, 'tank', 'bulk')) fields.preferredWorkType = 'tank_bulk';

  return fields;
}

export function extractCompanyFields(input: EmailTriageInput): ExtractedCompanyFields {
  const text = combined(input);
  const fields: ExtractedCompanyFields = {};

  const licenseMatch = text.match(LICENSE_PATTERN);
  if (licenseMatch) fields.licenseRequired = licenseMatch[1].toUpperCase();

  const cityMatch = text.match(CITY_PATTERN);
  if (cityMatch) fields.location = cityMatch[1];

  const countMatch = text.match(DRIVER_COUNT);
  if (countMatch) fields.numberOfDrivers = parseInt(countMatch[1], 10);

  if (contains(text, 'omgående', 'asap', 'immediately', 'urgent', 'akut')) fields.urgency = 'urgent';
  else if (contains(text, 'måndag', 'monday', 'nästa vecka', 'next week')) fields.urgency = 'next_week';

  if (contains(text, 'dagskift', 'dagtid', 'day shift')) fields.shiftType = 'dag';
  else if (contains(text, 'nattskift', 'natt', 'night')) fields.shiftType = 'natt';
  else if (contains(text, 'helg', 'weekend')) fields.shiftType = 'helg';

  // Extract company name from email domain if not in signature
  const domainMatch = input.from.match(/@([^.]+)\./);
  if (domainMatch && !['gmail', 'hotmail', 'yahoo', 'outlook', 'live'].includes(domainMatch[1])) {
    fields.companyName = domainMatch[1];
  }

  return fields;
}

// ─── Summary generation ───────────────────────────────────────────────────────

export function generateSummary(input: EmailTriageInput, category: EmailCategory, language: EmailLanguage): string {
  const subject = input.subject.trim() || '(no subject)';
  switch (category) {
    case 'DRIVER_INQUIRY':
      return language === 'sv'
        ? `Chaufför söker kontakt — ${subject}`
        : `Driver inquiry — ${subject}`;
    case 'COMPANY_INQUIRY':
      return language === 'sv'
        ? `Företag söker chaufförer — ${subject}`
        : `Company looking for drivers — ${subject}`;
    case 'META_LEAD_RESPONSE':
      return `Meta/Facebook lead — ${subject}`;
    case 'LEGAL_ADMIN':
      return language === 'sv'
        ? `LEGAL/GDPR — kräver omedelbar eskalering — ${subject}`
        : `LEGAL/GDPR — requires immediate escalation — ${subject}`;
    case 'SUPPORT_REQUEST':
      return language === 'sv'
        ? `Supportfråga — ${subject}`
        : `Support question — ${subject}`;
    case 'PARTNERSHIP':
      return language === 'sv'
        ? `Samarbetsförslag — låg prioritet — ${subject}`
        : `Partnership inquiry — low priority — ${subject}`;
    case 'SPAM_OR_IRRELEVANT':
      return `Spam/irrelevant — no reply needed — ${subject}`;
    default:
      return `Okänd avsändare — manuell granskning krävs — ${subject}`;
  }
}

// ─── Next action suggestion ───────────────────────────────────────────────────

export function suggestNextAction(category: EmailCategory, flags: string[], confidence: EmailConfidence): string {
  if (flags.includes('LEGAL_GDPR_REQUEST')) {
    return 'Escalate — GDPR request received. Send acknowledgement only. Forward to lawyer if applicable. 30-day response window starts now.';
  }
  if (flags.includes('LEGAL_COMPLAINT')) {
    return 'Escalate — complaint received. Do not reply substantively without legal review.';
  }
  if (flags.includes('ESCALATE_THREAT')) {
    return 'Escalate — threatening language detected. Log and consider legal advice.';
  }

  switch (category) {
    case 'DRIVER_INQUIRY':
      return 'Invite driver to complete structured intake at drivernord.com/chat. Do not collect information by email.';
    case 'COMPANY_INQUIRY':
      if (flags.includes('COMPLIANCE_BEMANNING_LANGUAGE')) {
        return 'Clarify DriverNord model (matchning, not bemanning). Then invite to provide structured need.';
      }
      return 'Acknowledge inquiry. Request structured need: license, location, urgency, shift type, number of drivers, start date.';
    case 'META_LEAD_RESPONSE':
      return 'Classify sub-intent (driver or company), then follow that category action.';
    case 'LEGAL_ADMIN':
      return 'Escalate immediately. Send acknowledgement only. Do not handle independently.';
    case 'SUPPORT_REQUEST':
      return 'Founder answers question. If driver: invite to /chat. If company: invite to provide need.';
    case 'PARTNERSHIP':
      return 'Low priority. Founder decides whether to engage. Default: neutral acknowledgement.';
    case 'SPAM_OR_IRRELEVANT':
      return 'Mark as ignored — no reply needed.';
    default:
      if (confidence === 'low') return 'Read raw email and classify manually before any reply.';
      return 'Review and classify manually.';
  }
}

// ─── Draft reply generation ───────────────────────────────────────────────────

export function generateDraftReply(
  category:   EmailCategory,
  language:   EmailLanguage,
  flags:      string[],
  confidence: EmailConfidence,
): string {
  // Legal/GDPR — acknowledgement only
  if (flags.includes('LEGAL_GDPR_REQUEST') || category === 'LEGAL_ADMIN') {
    if (language === 'sv') {
      return (
        'Hej,\n\n' +
        'Tack för ditt meddelande. Vi bekräftar att vi har mottagit din förfrågan och kommer att ' +
        'behandla den i enlighet med gällande dataskyddslagstiftning (GDPR). ' +
        'Vi återkommer till dig inom 30 dagar.\n\n' +
        'Med vänliga hälsningar,\nDriverNord\nhej@drivernord.com'
      );
    }
    return (
      'Hello,\n\n' +
      'Thank you for your message. We confirm receipt of your request and will process it ' +
      'in accordance with applicable data protection law (GDPR). ' +
      'We will respond within 30 days.\n\n' +
      'Best regards,\nDriverNord\nhej@drivernord.com'
    );
  }

  // Spam — no draft
  if (category === 'SPAM_OR_IRRELEVANT') return '';

  // Unknown with low confidence — minimal draft
  if (category === 'UNKNOWN' || confidence === 'low') {
    if (language === 'sv') {
      return 'Hej,\n\nTack för ditt meddelande. Vi återkommer till dig.\n\nMed vänliga hälsningar,\nDriverNord';
    }
    return 'Hello,\n\nThank you for your message. We will get back to you.\n\nBest regards,\nDriverNord';
  }

  // Driver inquiry
  if (category === 'DRIVER_INQUIRY' || (category === 'META_LEAD_RESPONSE')) {
    if (language === 'sv') {
      return (
        'Hej,\n\n' +
        'Tack för ditt meddelande och ditt intresse för DriverNord!\n\n' +
        'För att vi ska kunna matcha dig med relevanta uppdrag behöver vi samla lite mer information. ' +
        'Det gör du enkelt via vårt strukturerade registreringsflöde:\n\n' +
        '→ https://drivernord.com/chat\n\n' +
        'Registreringen tar ca 3–5 minuter och du anger bland annat körkortskategori, YKB-status, ' +
        'tillgänglighet och önskad typ av körning.\n\n' +
        'Vi återkommer när vi har ett relevant uppdrag för dig.\n\n' +
        'Med vänliga hälsningar,\nDriverNord\nhej@drivernord.com'
      );
    }
    return (
      'Hello,\n\n' +
      'Thank you for your interest in DriverNord!\n\n' +
      'To match you with relevant opportunities, we need a bit more information. ' +
      'Please complete our structured registration:\n\n' +
      '→ https://drivernord.com/chat\n\n' +
      'It takes about 3–5 minutes and includes license category, CPC status, ' +
      'availability, and preferred work type.\n\n' +
      'We will reach out when we have a suitable match for you.\n\n' +
      'Best regards,\nDriverNord\nhej@drivernord.com'
    );
  }

  // Company inquiry
  if (category === 'COMPANY_INQUIRY') {
    const bemaningClarification = flags.includes('COMPLIANCE_BEMANNING_LANGUAGE')
      ? (language === 'sv'
          ? '\n\n⚠️ Obs: DriverNord är en matchningstjänst — vi är inte ett bemanningsföretag och hyr inte ut chaufförer. Vi introducerar kvalificerade chaufförer till relevanta företag baserat på kompetens och önskemål.\n'
          : '\n\n⚠️ Note: DriverNord is a matching/introduction service — we are not a staffing agency and do not supply drivers on contract. We introduce qualified drivers to companies based on competence and preferences.\n')
      : '';

    if (language === 'sv') {
      return (
        'Hej,\n\n' +
        'Tack för ditt meddelande och ert intresse för DriverNord!' +
        bemaningClarification + '\n\n' +
        'För att kunna hjälpa er behöver vi lite mer information om ert behov. ' +
        'Kan ni bekräfta följande:\n\n' +
        '1. Vilken körkortskategori krävs? (CE, C, D)\n' +
        '2. Var ska körningen ske? (stad/region)\n' +
        '3. Hur många chaufförer behöver ni?\n' +
        '4. Från och med vilket datum?\n' +
        '5. Skift/arbetstider (dag, natt, helg)?\n' +
        '6. Typ av körning (distribution, fjärr, tank, annan)?\n\n' +
        'Vi återkommer med ett svar när vi har all information.\n\n' +
        'Med vänliga hälsningar,\nDriverNord\nhej@drivernord.com'
      );
    }
    return (
      'Hello,\n\n' +
      'Thank you for your interest in DriverNord!' +
      bemaningClarification + '\n\n' +
      'To assist you, we need a bit more detail about your requirement:\n\n' +
      '1. Required license category (CE, C, D)\n' +
      '2. Location (city/region)\n' +
      '3. Number of drivers needed\n' +
      '4. Start date\n' +
      '5. Shift type (day, night, weekend)\n' +
      '6. Type of transport (distribution, long-distance, tanker, other)\n\n' +
      'We will follow up once we have all the details.\n\n' +
      'Best regards,\nDriverNord\nhej@drivernord.com'
    );
  }

  // Support
  if (category === 'SUPPORT_REQUEST') {
    if (language === 'sv') {
      return (
        'Hej,\n\n' +
        'Tack för din fråga. Vi hjälper dig gärna.\n\n' +
        '[Svara på specifik fråga här — ersätt detta med det faktiska svaret]\n\n' +
        'Hör av dig om du har fler frågor.\n\n' +
        'Med vänliga hälsningar,\nDriverNord\nhej@drivernord.com'
      );
    }
    return (
      'Hello,\n\n' +
      'Thank you for your question. We are happy to help.\n\n' +
      '[Answer the specific question here — replace this with the actual answer]\n\n' +
      'Feel free to reach out if you have further questions.\n\n' +
      'Best regards,\nDriverNord\nhej@drivernord.com'
    );
  }

  // Partnership — neutral only
  if (category === 'PARTNERSHIP') {
    if (language === 'sv') {
      return (
        'Hej,\n\n' +
        'Tack för ditt meddelande. Vi noterar ert intresse och återkommer om vi ser en möjlighet till samarbete.\n\n' +
        'Med vänliga hälsningar,\nDriverNord\nhej@drivernord.com'
      );
    }
    return (
      'Hello,\n\n' +
      'Thank you for reaching out. We have noted your message and will follow up if we see a potential fit.\n\n' +
      'Best regards,\nDriverNord\nhej@drivernord.com'
    );
  }

  // Fallback
  if (language === 'sv') {
    return 'Hej,\n\nTack för ditt meddelande. Vi återkommer till dig.\n\nMed vänliga hälsningar,\nDriverNord\nhej@drivernord.com';
  }
  return 'Hello,\n\nThank you for your message. We will be in touch.\n\nBest regards,\nDriverNord\nhej@drivernord.com';
}

// ─── Kill switch ──────────────────────────────────────────────────────────────

export function isEmailTriageEnabled(): boolean {
  return process.env.AGENT_EMAIL_TRIAGE_ENABLED !== 'false';
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function triageEmail(input: EmailTriageInput): EmailTriageResult {
  const language            = detectLanguage(input);
  const { category, confidence } = classifyCategory(input);
  const complianceFlags     = detectComplianceFlags(input);
  const summary             = generateSummary(input, category, language);
  const suggestedNextAction = suggestNextAction(category, complianceFlags, confidence);
  const draftReply          = generateDraftReply(category, language, complianceFlags, confidence);

  let extractedFields: ExtractedDriverFields | ExtractedCompanyFields | Record<string, never> = {};
  if (category === 'DRIVER_INQUIRY' || category === 'META_LEAD_RESPONSE') {
    extractedFields = extractDriverFields(input);
  } else if (category === 'COMPANY_INQUIRY') {
    extractedFields = extractCompanyFields(input);
  }

  const isSpam = category === 'SPAM_OR_IRRELEVANT';

  return {
    category,
    confidence,
    language,
    summary,
    extractedFields,
    complianceFlags,
    suggestedNextAction,
    draftReply,
    requiresHumanApproval: true,
    shouldAutoSend:        false,
    status:                isSpam ? 'IGNORED' : 'NEEDS_FOUNDER_REVIEW',
  };
}
