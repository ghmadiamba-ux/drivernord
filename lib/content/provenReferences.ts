// lib/content/provenReferences.ts
//
// DriverNord Proven Creative Reference Library V1.
// Encodes 9 proven persuasion mechanisms from historically successful DriverNord creatives.
//
// IMPORTANT DISCLAIMER:
// Evidence basis is founder-reported historical success.
// These are NOT independently measured causal performance proofs.
// Use as creative direction guardrails, not as guaranteed conversion formulas.
//
// BOUNDARIES:
//   ✓ Pure constants and selector functions — no DB, no I/O
//   ✗ Does NOT reproduce exact creative assets
//   ✗ Does NOT call any external service
//   ✗ Does NOT publish anything
//   ✗ Does NOT claim represented persons are real DriverNord drivers

import type { ContentPillar, CreativeAngle } from './types';
import type {
  ProvenMechanismId,
  ReferenceUseCase,
  ChannelFit,
  FormatTag,
  VisualLanguageTag,
  PainTag,
  PromiseTag,
  TrustTag,
  IdentityTag,
} from './creativeMechanism';

// ─── Reference data model ─────────────────────────────────────────────────────

export interface ProvenCreativeReference {
  id:           ProvenMechanismId;
  name:         string;
  source_type:  'founder_provided_successful_static_ad';
  use_case:     ReferenceUseCase[];
  target_audience:          string[];
  primary_tension:          string;
  primary_promise:          string;
  positioning_mechanism:    string;
  trust_mechanism:          string;
  emotional_tone:           string;
  visual_language:          VisualLanguageTag[];
  mobile_first_pattern:     FormatTag;
  cta_intensity:            'none' | 'soft' | 'medium' | 'direct';
  pain_tags:                PainTag[];
  promise_tags:             PromiseTag[];
  trust_tags:               TrustTag[];
  identity_tags:            IdentityTag[];
  reusable_principles:      string[];
  prohibited_overuse:       string[];
  channel_fit:              ChannelFit[];
  compatible_pillars:       ContentPillar[];
  compatible_angles:        CreativeAngle[];
  evidence_status:          'founder_reported_historical_success';
  notes:                    string;
  // Reserved for future measured performance data — never populated automatically.
  performance_evidence_placeholder: null;
}

// ─── The 9 proven mechanisms ──────────────────────────────────────────────────

export const PROVEN_REFERENCES: ProvenCreativeReference[] = [

  {
    id:          'pain_led_recruitment_friction',
    name:        'Pain-Led Recruitment Friction',
    source_type: 'founder_provided_successful_static_ad',
    use_case:    ['acquisition', 'conversion'],
    target_audience: ['CE_drivers', 'C_drivers', 'D_drivers'],
    primary_tension:
      'Trött på rekryterare som inte förstår ditt jobb? Sluta skicka CV.',
    primary_promise:
      'Enklare väg till rätt uppdrag — utan krångel.',
    positioning_mechanism:
      'Börja med en riktig chaufförsfrustration (CV-krav, okunniga rekryterare, ' +
      'matchningsproblem) innan DriverNord introduceras som kontrast.',
    trust_mechanism:
      'Igenkänning och bekräftelse av yrkesidentitet.',
    emotional_tone: 'Empatisk frustration → lättnad',
    visual_language:      ['high_contrast_hook', 'black_yellow_performance'],
    mobile_first_pattern: 'pain_led_static_ad',
    cta_intensity: 'direct',
    pain_tags:     ['anti_cv', 'anti_recruiter'],
    promise_tags:  ['no_cv', 'low_friction_registration'],
    trust_tags:    [],
    identity_tags: ['skilled_professional'],
    reusable_principles: [
      'Identifiera specifik friktionspunkt som föraren känner igen',
      'Bekräfta smärtan innan lösningen presenteras',
      'Håll tonen empatisk, aldrig skuldbeläggande',
    ],
    prohibited_overuse: [
      'Undvik att alltid börja med exakt "Trött på…"-formuleringen — variera hook-formuleringen',
      'Byt ut friktionspunkten — inte bara CV utan även ruttplanering, kontakt, väntetid',
    ],
    channel_fit:         ['paid_acquisition', 'organic_facebook'],
    compatible_pillars:  ['acquisition', 'practical'],
    compatible_angles:   ['low_freq_acquisition_cta', 'market_education'],
    evidence_status:     'founder_reported_historical_success',
    notes:               'Stark öppning för kall förvärv. Bör varieras — inte samma hook varje gång.',
    performance_evidence_placeholder: null,
  },

  {
    id:          'radical_simplification_promise',
    name:        'Radical Simplification Promise',
    source_type: 'founder_provided_successful_static_ad',
    use_case:    ['acquisition', 'conversion'],
    target_audience: ['CE_drivers', 'C_drivers', 'D_drivers', 'logistics_workers'],
    primary_tension:
      'Komplexa registreringsflöden och CV-krav skapar aktiveringsresistans.',
    primary_promise:
      '3 minuter. Inget CV. Inget krångel. Vi hör av oss när det är rätt.',
    positioning_mechanism:
      'Kommunicera den konkreta enkelheten direkt och omedelbart — ett löfte, ' +
      'inte en förklaring.',
    trust_mechanism:
      'Låg tröskel och konkret tidslöfte minskar aktiveringsresistans kraftigt.',
    emotional_tone: 'Lättnad och tydlighet',
    visual_language:      ['clean_premium_layout', 'navy_white_trust', 'high_contrast_hook'],
    mobile_first_pattern: 'pain_led_static_ad',
    cta_intensity: 'medium',
    pain_tags:     ['anti_cv', 'wrong_assignment_friction'],
    promise_tags:  ['three_minute_simplicity', 'no_cv', 'low_friction_registration'],
    trust_tags:    ['right_assignment'],
    identity_tags: [],
    reusable_principles: [
      'Konkret tidslöfte ("3 minuter") sänker inträdeshindret kraftigt',
      'Kombinera löftet med ett konsensugnande statement',
      'Håll copy extremt kort — max 3 nyckelmeningar',
    ],
    prohibited_overuse: [
      'Använd INTE "3 minuter" i mer än ett inlägg var 21:e dag',
      'Variera formuleringar — "5 frågor", "en minut", osv.',
    ],
    channel_fit:         ['paid_acquisition', 'organic_facebook', 'website'],
    compatible_pillars:  ['acquisition'],
    compatible_angles:   ['low_freq_acquisition_cta'],
    evidence_status:     'founder_reported_historical_success',
    notes:               '"3 minuter" och "inget CV" är konverteringsdrivare. Avkylning 21 dagar.',
    performance_evidence_placeholder: null,
  },

  {
    id:          'explicit_differentiation',
    name:        'Explicit Differentiation',
    source_type: 'founder_provided_successful_static_ad',
    use_case:    ['acquisition', 'brand'],
    target_audience: ['CE_drivers', 'C_drivers', 'D_drivers', 'logistics_workers'],
    primary_tension:
      'Förare förväxlar DriverNord med bemanning, jobbsajter eller mellanhänder.',
    primary_promise:
      'Inte bemanning. Inte jobbsajt. Inga mellanhänder. Direkt matchning.',
    positioning_mechanism:
      'Namnge det DriverNord INTE är innan det förklaras vad det faktiskt är.',
    trust_mechanism:
      'Ärlighet och tydlig distinktion skapar trovärdighet.',
    emotional_tone: 'Tydlig och direkt',
    visual_language:      ['clean_premium_layout', 'navy_white_trust'],
    mobile_first_pattern: 'pain_led_static_ad',
    cta_intensity: 'soft',
    pain_tags:     ['anti_staffing', 'anti_job_board', 'no_middlemen'],
    promise_tags:  ['direct_matching'],
    trust_tags:    ['driver_choice'],
    identity_tags: ['right_driver_right_assignment'],
    reusable_principles: [
      'Definiering via kontrast är mer minnesvärt än positiv beskrivning',
      'Lista minst tre "inte X" för att etablera eget kategoritänk',
      'Avsluta med vad DriverNord ÄR — inte bara vad det inte är',
    ],
    prohibited_overuse: [
      'Använd INTE "inte bemanning" i mer än ett inlägg var 21:e dag',
      'Variera kontrasten — bemanning/jobbsajt/mellanhänder/rekryterare',
    ],
    channel_fit:         ['paid_acquisition', 'organic_facebook', 'website', 'retargeting'],
    compatible_pillars:  ['acquisition', 'practical'],
    compatible_angles:   ['low_freq_acquisition_cta', 'market_education'],
    evidence_status:     'founder_reported_historical_success',
    notes:               'Positionerar DriverNord mot befintliga kategorier. Avkylning 21 dagar på "inte bemanning".',
    performance_evidence_placeholder: null,
  },

  {
    id:          'driver_control_consent',
    name:        'Driver Control & Consent',
    source_type: 'founder_provided_successful_static_ad',
    use_case:    ['trust', 'conversion'],
    target_audience: ['CE_drivers', 'C_drivers', 'D_drivers', 'logistics_workers'],
    primary_tension:
      'Förare är rädda för spam, oönskad kontakt och att tappa kontrollen.',
    primary_promise:
      'Du bestämmer. Din profil delas aldrig utan ditt samtycke. ' +
      'Vi kontaktar dig bara vid rätt uppdrag.',
    positioning_mechanism:
      'Placera kontrollen explicit hos föraren — DriverNord som tjänst som arbetar ' +
      'för föraren, inte för kunden.',
    trust_mechanism:
      'Konkreta integritetsgarantier och konsentbekräftelse minskar registreringsrädsla.',
    emotional_tone: 'Tryggt och respektfullt',
    visual_language:      ['navy_white_trust', 'clean_premium_layout'],
    mobile_first_pattern: 'premium_brand_hero',
    cta_intensity: 'soft',
    pain_tags:     ['wrong_assignment_friction'],
    promise_tags:  ['relevant_contact_only'],
    trust_tags:    ['consent_control', 'profile_privacy', 'driver_choice', 'no_spam'],
    identity_tags: ['driver_first'],
    reusable_principles: [
      'Nämn konkret vad som INTE händer utan samtycke',
      'Välj lugnande ton — aldrig säljande ton i konsent-copy',
      'Koppla kontrollprincipen till identitet: "Du bestämmer" stärker yrkeskänslan',
    ],
    prohibited_overuse: [
      'Kombinera INTE consent-budskapet med aggressiv CTA i samma inlägg',
      'Undvik att upprepa exakt "Din profil delas aldrig…" — variera formulering',
    ],
    channel_fit:         ['retargeting', 'website', 'organic_facebook'],
    compatible_pillars:  ['community', 'recognition', 'acquisition'],
    compatible_angles:   ['driver_recognition', 'career_confidence', 'low_freq_acquisition_cta'],
    evidence_status:     'founder_reported_historical_success',
    notes:               'Stark för retargeting och second-touch. Låg CTA-intensitet är kritisk.',
    performance_evidence_placeholder: null,
  },

  {
    id:          'driver_dignity_identity',
    name:        'Driver Dignity & Identity',
    source_type: 'founder_provided_successful_static_ad',
    use_case:    ['trust', 'brand', 'community'],
    target_audience: ['CE_drivers', 'C_drivers', 'D_drivers', 'logistics_workers', 'all_drivers'],
    primary_tension:
      'Förare behandlas som utbytbara resurser, inte som kvalificerade yrkespersoner.',
    primary_promise:
      '"Du är inte här för att skicka CV. Du är här för att köra. Rätt förare. Rätt uppdrag."',
    positioning_mechanism:
      'Positionera föraren som skicklig yrkesperson vars kompetens är värdefull — ' +
      'inte som passiv jobbsökande.',
    trust_mechanism:
      'Värdig bekräftelse av yrkesidentitet skapar emotionell resonans och lojalitet.',
    emotional_tone: 'Stolt och bekräftande',
    visual_language:      ['navy_white_trust', 'human_transport_realism', 'clean_premium_layout'],
    mobile_first_pattern: 'premium_brand_hero',
    cta_intensity: 'none',
    pain_tags:     ['anti_cv', 'anti_recruiter'],
    promise_tags:  [],
    trust_tags:    ['driver_choice'],
    identity_tags: ['driver_pride', 'skilled_professional', 'driver_first'],
    reusable_principles: [
      'Sätt aldrig föraren i en underordnad position — alltid som expert',
      'Variera formulering — känslan av värdighet är konstant, texten varieras',
      'Kombinera gärna med riktig transportbild för igenkänning',
    ],
    prohibited_overuse: [
      'Undvik att klona "Du är inte här för att skicka CV…" ordagrant',
      'Variera identitetsformerna: chaufför, förare, yrkesförare, logistikexpert',
    ],
    channel_fit:         ['organic_facebook', 'community', 'retargeting'],
    compatible_pillars:  ['recognition', 'community'],
    compatible_angles:   ['driver_recognition', 'career_confidence', 'community_question'],
    evidence_status:     'founder_reported_historical_success',
    notes:               'Stark för organisk community-building. Noll CTA-intensitet — ren identitetsbekräftelse.',
    performance_evidence_placeholder: null,
  },

  {
    id:          'mobile_native_simulation',
    name:        'Mobile-Native Conversation Simulation',
    source_type: 'founder_provided_successful_static_ad',
    use_case:    ['acquisition', 'conversion'],
    target_audience: ['CE_drivers', 'C_drivers', 'D_drivers'],
    primary_tension:
      'Traditionellt CV-krav känns okunnigt när man ser det formulerat som chattkrav.',
    primary_promise:
      'DriverNord = enkelt alternativ till rekryterarnas chat-baserade CV-begäran.',
    positioning_mechanism:
      'Visa rekryterare som ber om CV via mobil, förare som säger nej, ' +
      'DriverNord som enklare alternativ. Bekant chattformat gör skillnaden tydlig.',
    trust_mechanism:
      'Igenkänning av en verklig interaktionstyp — mobil-nativt format känns äkta.',
    emotional_tone: 'Lättsamt och humoristiskt men relevant',
    visual_language:      ['mobile_native_conversation', 'high_contrast_hook'],
    mobile_first_pattern: 'chat_simulation',
    cta_intensity: 'direct',
    pain_tags:     ['anti_cv', 'anti_recruiter'],
    promise_tags:  ['no_cv', 'low_friction_registration'],
    trust_tags:    [],
    identity_tags: ['driver_first'],
    reusable_principles: [
      'Håll dialogen realistisk — max 3–4 meddelanden',
      'Chatten bör sluta med ett DriverNord-alternativ, aldrig med ett olöst problem',
      'Variera chattformatet — SMS, WhatsApp-stil, eller generisk chattbubbla',
    ],
    prohibited_overuse: [
      'Max en gång per 14 dagar i organisk kanal',
      'Byt chattscenario varje gång — rekryterare, arbetsgivare, jobbsajt',
    ],
    channel_fit:         ['paid_acquisition', 'organic_facebook'],
    compatible_pillars:  ['acquisition'],
    compatible_angles:   ['low_freq_acquisition_cta'],
    evidence_status:     'founder_reported_historical_success',
    notes:               'Högt engagerande format. Avkylning 14 dagar i organisk kanal.',
    performance_evidence_placeholder: null,
  },

  {
    id:          'premium_brand_trust_visual',
    name:        'Premium Brand / Trust Visual',
    source_type: 'founder_provided_successful_static_ad',
    use_case:    ['brand', 'trust'],
    target_audience: ['CE_drivers', 'C_drivers', 'D_drivers', 'logistics_workers', 'all_drivers'],
    primary_tension:
      'Liten och okänd aktör upplevs som oseriös jämfört med etablerade aktörer.',
    primary_promise:
      'Professionell, trovärdig och modern logistikbrand — nordisk känsla och kvalitet.',
    positioning_mechanism:
      'Navy/vitt hero-layout, trovärdig logistikmiljö, modern och enkel visuell hierarki.',
    trust_mechanism:
      'Lugn, kompetent, professionell visuell signal bygger förtroende utan att sälja.',
    emotional_tone: 'Professionellt lugn',
    visual_language:      ['navy_white_trust', 'clean_premium_layout', 'human_transport_realism'],
    mobile_first_pattern: 'premium_brand_hero',
    cta_intensity: 'soft',
    pain_tags:     [],
    promise_tags:  [],
    trust_tags:    ['driver_choice', 'right_assignment'],
    identity_tags: ['skilled_professional'],
    reusable_principles: [
      'Navy/vitt är baslinjen för trovärdighetskommunikation',
      'Mänsklig transportbild stärker igenkänning',
      'Enkel hierarki — varumärke, rubrik, en mening, optional CTA',
    ],
    prohibited_overuse: [
      'Undvik att varje inlägg ser identiskt ut — variera scen, layout och kopia',
      'Kombinera inte navy/vitt med aggressivt säljtryck i samma format',
    ],
    channel_fit:         ['organic_facebook', 'website', 'retargeting', 'community'],
    compatible_pillars:  ['recognition', 'community', 'practical'],
    compatible_angles:   [
      'driver_recognition', 'career_confidence', 'community_question',
      'operational_insight', 'practical_advice',
    ],
    evidence_status:     'founder_reported_historical_success',
    notes:               'Baslinjen för trust-visual. Passar de flesta organiska inlägg.',
    performance_evidence_placeholder: null,
  },

  {
    id:          'performance_ad_visual',
    name:        'Performance Ad Visual',
    source_type: 'founder_provided_successful_static_ad',
    use_case:    ['acquisition', 'conversion'],
    target_audience: ['CE_drivers', 'C_drivers', 'D_drivers'],
    primary_tension:
      'Svagt visuellt intryck i betald kanal ger låg genomklickfrekvens.',
    primary_promise:
      'Stark visuell hook → smärta → lösning → förtroende → CTA.',
    positioning_mechanism:
      'Svart/gult/vitt hög kontrast, gigantisk hook-rubrik, ' +
      'strukturerad smärta-lösning-bevis-CTA-sekvens, mobil-first-layout.',
    trust_mechanism:
      'CTA-bevis: kvantitativt statement när verifierbart.',
    emotional_tone: 'Hög energi och direkt',
    visual_language:      ['black_yellow_performance', 'high_contrast_hook'],
    mobile_first_pattern: 'pain_led_static_ad',
    cta_intensity: 'direct',
    pain_tags:     ['anti_cv', 'anti_staffing', 'wrong_assignment_friction'],
    promise_tags:  ['low_friction_registration', 'no_cv'],
    trust_tags:    [],
    identity_tags: [],
    reusable_principles: [
      'Hook måste vara omedelbart relevant för målgruppen',
      'Svart/gult är reserverat primärt för betald förvärv',
      'Strukturera alltid: hook → problem-erkännande → lösning → CTA',
    ],
    prohibited_overuse: [
      'Max 1 inlägg per vecka i organisk kanal med black_yellow_performance',
      'Statistik-claims kräver verifiering — använd inga specifika siffror utan källa',
    ],
    channel_fit:         ['paid_acquisition'],
    compatible_pillars:  ['acquisition'],
    compatible_angles:   ['low_freq_acquisition_cta'],
    evidence_status:     'founder_reported_historical_success',
    notes:               'Primärt för betald kanal. I organisk kanal max 1/vecka och med lägre hook-intensitet.',
    performance_evidence_placeholder: null,
  },

  {
    id:          'human_transport_realism',
    name:        'Human Transport Realism',
    source_type: 'founder_provided_successful_static_ad',
    use_case:    ['brand', 'trust', 'community'],
    target_audience: ['CE_drivers', 'C_drivers', 'D_drivers', 'logistics_workers', 'all_drivers'],
    primary_tension:
      'Generiska kontorsstockbilder skapar avstånd för yrkesförare.',
    primary_promise:
      'Verklig arbetsmiljö — hytt, terminal, kaj, rutt — som föraren omedelbart känner igen.',
    positioning_mechanism:
      'Förare i hytt med telefon, förare vid lastbil i svensk transportmiljö, ' +
      'verklig arbetsutrustning, terminal, kaj, rutt.',
    trust_mechanism:
      'Omedelbar igenkänning skapar psykologisk närvaro och förtroende.',
    emotional_tone: 'Äkta och respektfullt',
    visual_language:      ['human_transport_realism', 'navy_white_trust'],
    mobile_first_pattern: 'in_cab_realism',
    cta_intensity: 'none',
    pain_tags:     [],
    promise_tags:  [],
    trust_tags:    ['driver_choice'],
    identity_tags: ['driver_pride', 'skilled_professional'],
    reusable_principles: [
      'Prioritera miljöer föraren direkt känner igen: hytt, terminal, lastbrygga, E4 om natten',
      'Undvik iscensatta bilder — realism är viktigare än perfektion',
      'Förare-framför-lastbil-porträtt är en kliché — variera scen och komposition',
    ],
    prohibited_overuse: [
      'Max en "förare framför lastbil"-komposition var 21:e dag',
      'Undvik repetitiva solnedgångsstämningsbilder — variera tid och ljusförhållanden',
      'Bilder på igenkännliga personer kräver dokumenterat godkännande',
    ],
    channel_fit:         ['organic_facebook', 'community', 'website', 'retargeting'],
    compatible_pillars:  ['recognition', 'community', 'practical'],
    compatible_angles:   [
      'driver_recognition', 'operational_insight', 'relatable_work_moment',
      'community_question', 'career_confidence',
    ],
    evidence_status:     'founder_reported_historical_success',
    notes:               'Baslinje för trovärdig visuell kommunikation. Avkylning per specifik scen, inte per familj.',
    performance_evidence_placeholder: null,
  },

];

// ─── Selector ─────────────────────────────────────────────────────────────────

export function selectProvenMechanism(
  pillar:    ContentPillar,
  angle:     CreativeAngle,
  weekIndex: number,
  history:   Array<{ reference_mechanism_id?: string; planned_date: string }>,
): ProvenCreativeReference | null {
  // Primary: match pillar + angle
  let candidates = PROVEN_REFERENCES.filter(
    (r) =>
      r.compatible_pillars.includes(pillar) &&
      r.compatible_angles.includes(angle),
  );

  // Fallback: match pillar alone
  if (candidates.length === 0) {
    candidates = PROVEN_REFERENCES.filter((r) => r.compatible_pillars.includes(pillar));
  }

  if (candidates.length === 0) return null;

  // Prefer mechanisms not used in the last 14 days
  const recentIds = new Set(
    history
      .filter((e) => daysSince(e.planned_date) <= 14)
      .map((e) => e.reference_mechanism_id)
      .filter((id): id is string => !!id),
  );

  const fresh = candidates.filter((c) => !recentIds.has(c.id));
  const pool  = fresh.length > 0 ? fresh : candidates;

  return pool[weekIndex % pool.length] ?? null;
}

// ─── Memory extraction ────────────────────────────────────────────────────────

export function extractMechanismTags(
  ref: ProvenCreativeReference,
): { visual_language_tags: VisualLanguageTag[]; format_tag: FormatTag } {
  return {
    visual_language_tags: ref.visual_language,
    format_tag:           ref.mobile_first_pattern,
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function daysSince(isoDate: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000),
  );
}
