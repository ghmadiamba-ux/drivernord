// lib/content/visualExecutionPackages.ts
//
// Visual Execution Sprint V1 — four polished internal execution packages for
// W28 Phase 4 cards (tag: dry_run_phase4_proven_reference_2026_W28).
//
// BOUNDARIES:
//   ✗ No Facebook, Meta, or image-generation API calls
//   ✗ No external publishing
//   ✗ No binary image assets stored in Supabase
//   ✗ No claims that any visual subject is a real DriverNord driver or client
//   ✓ Pure data — typed execution briefs, on-image copy, polished SVG prototypes
//   ✓ SVGs generated deterministically from text — no external dependencies
//   ✓ Canonical domain: drivernord.com only

import type {
  SprintExecutionPackage,
  SprintExecutionBoard,
  SprintAiDirectionPackage,
} from './visualTypes';

// ─── Shared disclaimer ────────────────────────────────────────────────────────

const DISCLAIMER_BRANDED =
  'INTERN FÖRHANDSVISNING — ej publicerad, ej slutproduktion. ' +
  'Grafiken är ett layoutmock. Personerna i eventuellt referensmaterial ' +
  'representerar inte verkliga DriverNord-förare eller -kunder.';

const DISCLAIMER_LAYOUT_MOCK =
  'INTERN LAYOUT MOCK — verklig foto krävs. Placering och textlager är ' +
  'indikativa. Ej publiceringsredo. Ingen extern bild använd.';

const DISCLAIMER_AI_DIRECTION =
  'INTERN KOMPOSITIONSPROTOTYP — AI-bildgenerering krävs. Silhuetten är ' +
  'kompositionsvägledning, inte slutlig bild. Ingen riktig person avbildad. ' +
  'Ingen AI-bild-API kopplad — denna prototyp är ett art-direction-dokument.';

// ─── Monday (Day 1) ───────────────────────────────────────────────────────────
// practical / practical_advice
// Mechanism: premium_brand_trust_visual
// Mode: trust_organic
// Visual family: operational_intelligence
// Asset strategy: branded_graphic (everything achievable with SVG now)
// Composition: information-first, calm educational card

const mondaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <rect width="400" height="500" fill="#1C1C2E" rx="8"/>
  <rect x="0" y="0" width="400" height="4" fill="#2563EB"/>
  <rect x="0" y="4" width="400" height="18" fill="#111122"/>
  <text x="200" y="16" text-anchor="middle" font-family="system-ui,sans-serif" font-size="7" fill="#374151" letter-spacing="1.5">INTERN FORHANDSVISNING - EJ PUBLICERAD</text>
  <text x="24" y="48" font-family="system-ui,sans-serif" font-size="9" fill="#2563EB" font-weight="600" letter-spacing="2">PRAKTISK TRANSPORT</text>
  <text x="24" y="80" font-family="system-ui,sans-serif" font-size="25" fill="#FFFFFF" font-weight="800">Glommer du</text>
  <text x="24" y="110" font-family="system-ui,sans-serif" font-size="25" fill="#FFFFFF" font-weight="800">fardskrivaren?</text>
  <text x="24" y="134" font-family="system-ui,sans-serif" font-size="13" fill="#94A3B8">3 regler de flesta missar</text>
  <line x1="24" y1="152" x2="376" y2="152" stroke="#2563EB" stroke-width="0.8" opacity="0.35"/>
  <rect x="24" y="168" width="4" height="42" fill="#2563EB" rx="2"/>
  <text x="40" y="183" font-family="system-ui,sans-serif" font-size="13" fill="#FFFFFF" font-weight="700">Rast efter 4,5 h korning</text>
  <text x="40" y="200" font-family="system-ui,sans-serif" font-size="11" fill="#64748B">Minst 45 min — 15 + 30 min accepteras</text>
  <rect x="24" y="228" width="4" height="42" fill="#2563EB" rx="2"/>
  <text x="40" y="243" font-family="system-ui,sans-serif" font-size="13" fill="#FFFFFF" font-weight="700">Dygnsvilotid — 11 timmar</text>
  <text x="40" y="260" font-family="system-ui,sans-serif" font-size="11" fill="#64748B">Kan sankas till 9 h — max 3 ggr/vecka</text>
  <rect x="24" y="288" width="4" height="42" fill="#2563EB" rx="2"/>
  <text x="40" y="303" font-family="system-ui,sans-serif" font-size="13" fill="#FFFFFF" font-weight="700">Veckovila — 45 timmar</text>
  <text x="40" y="320" font-family="system-ui,sans-serif" font-size="11" fill="#64748B">Kompensation vid fortortad vila</text>
  <text x="24" y="362" font-family="system-ui,sans-serif" font-size="9" fill="#374151" font-style="italic">* Regeloversikt — kontrollera aktuell lagstiftning.</text>
  <rect x="0" y="385" width="400" height="115" fill="#0D0D1E"/>
  <line x1="0" y1="385" x2="400" y2="385" stroke="#1E3A5F" stroke-width="1"/>
  <text x="24" y="425" font-family="system-ui,sans-serif" font-size="18" fill="#FFFFFF" font-weight="800">DriverNord</text>
  <text x="24" y="445" font-family="system-ui,sans-serif" font-size="11" fill="#475569">drivernord.com</text>
  <circle cx="370" cy="432" r="20" fill="#1E3A5F"/>
  <circle cx="370" cy="432" r="11" fill="#2563EB"/>
  <text x="200" y="492" text-anchor="middle" font-family="system-ui,sans-serif" font-size="7" fill="#374151" letter-spacing="1">INTERN FORHANDSVISNING</text>
</svg>`;

export const W28_MONDAY: SprintExecutionPackage = {
  version: 'v1',
  day_label: 'Mandag',
  brief: {
    target_audience: 'CE/C-forare i aktiv yrkesverksamhet, logistikansvariga',
    objective:
      'Etablera DriverNord som en kunnig partner i vardaglig transportefterlevnad — ' +
      'anvandbar information forst, varumarka aterst.',
    central_visual_idea:
      'Ren, varumarkesprofilerad informationskort med tre nycklar kring fardskrivaren. ' +
      'Kanner som professionellt branschinnehall, inte en annons.',
    mobile_scroll_stop_intention:
      'Kontrasten av vit rubrik mot djup navy stannar scrollet — ' +
      'formatets rent informativa karaktar signalerar att det ar vart att lasa.',
    format_justification:
      'Fardskrivarregler ar komplexa; ett informationsfirst-grafik tjanar ' +
      'fortroende organiskt utan att kanna saljtryck. ' +
      'Premium brand trust visual-mekanismen passar exakt har.',
    emotional_tone: 'professionell_trygghet',
  },
  on_image_copy: {
    headline: 'Glomme du fardskrivaren?',
    support_line: '3 regler de flesta missar',
    word_count: 8,
  },
  prototype: {
    type: 'svg_branded_graphic',
    svg_content: mondaySvg,
    composition_notes:
      'Navy bakgrund #1C1C2E. Bla accentrad overst. Tre infoblock med bla ' +
      'sidolinje. Nedre DriverNord-remsa. Optimerat for mobilflode 1080x1350.',
    disclaimer: DISCLAIMER_BRANDED,
  },
  quality_review: {
    mobile_readability: 'Godkand — stor vit rubrik, hog kontrast, tydliga infoblock pa mobil',
    on_image_word_count: 8,
    visual_family_cooldown: 'Klar — operational_intelligence ej anvamd senaste 14 dagar',
    scene_repetition: 'Klar — infographic_education-scen ar unik for W28',
    composition_repetition: 'Klar — text_centered_minimal med informationslista ej upprepad',
    mechanism_cooldown: 'Klar — premium_brand_trust_visual ej anvamd senaste 14 dagar',
    gate_outcome: 'ready_for_internal_preview',
    founder_review_question:
      'Ar tonen tillrackligt nyttig och professionell — eller kanner den fortfarande som DriverNord-reklam?',
  },
  applied_at: new Date().toISOString(),
};

// ─── Wednesday (Day 3) ────────────────────────────────────────────────────────
// practical / operational_insight
// Mechanism: human_transport_realism
// Mode: trust_organic
// Visual family: reality_of_work
// Asset strategy: real_asset (authentic photo needed)
// Composition: photo slot layout mock + branded text zone

const wednesdaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <rect width="400" height="500" fill="#1A1F2E" rx="8"/>
  <rect x="0" y="0" width="400" height="300" fill="#1A1F2E"/>
  <line x1="0" y1="100" x2="400" y2="100" stroke="#252535" stroke-width="0.8"/>
  <line x1="0" y1="200" x2="400" y2="200" stroke="#252535" stroke-width="0.8"/>
  <line x1="133" y1="0" x2="133" y2="300" stroke="#252535" stroke-width="0.8"/>
  <line x1="267" y1="0" x2="267" y2="300" stroke="#252535" stroke-width="0.8"/>
  <rect x="155" y="92" width="90" height="72" rx="6" fill="#252540" stroke="#374151" stroke-width="1.5"/>
  <circle cx="200" cy="120" r="20" fill="#374151"/>
  <circle cx="200" cy="120" r="12" fill="#252540"/>
  <rect x="184" y="94" width="14" height="10" rx="3" fill="#374151"/>
  <text x="200" y="180" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#4B5563" font-weight="600" letter-spacing="1">REAL FOTO KRAVS</text>
  <text x="200" y="195" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#374151">Lastbil eller terminal, Sverige, 04:30</text>
  <text x="200" y="209" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#374151">Mork atmosfar, autentisk, ej poserad</text>
  <rect x="0" y="222" width="400" height="78" fill="#0A0A1A" opacity="0.82"/>
  <text x="24" y="265" font-family="system-ui,sans-serif" font-size="40" fill="#F59E0B" font-weight="800">04:30</text>
  <text x="24" y="291" font-family="system-ui,sans-serif" font-size="13" fill="#FFFFFF" font-weight="600">Fordonet rullar. Sverige vaknar.</text>
  <rect x="0" y="300" width="400" height="200" fill="#1C1C2E"/>
  <line x1="0" y1="300" x2="400" y2="300" stroke="#2563EB" stroke-width="2" opacity="0.5"/>
  <text x="24" y="330" font-family="system-ui,sans-serif" font-size="9" fill="#2563EB" letter-spacing="2" font-weight="600">DISTRIBUTIONSINSIKT</text>
  <text x="24" y="358" font-family="system-ui,sans-serif" font-size="18" fill="#FFFFFF" font-weight="700">En typisk distributionsmorgon</text>
  <text x="24" y="382" font-family="system-ui,sans-serif" font-size="12" fill="#94A3B8">Kl 04:30 — fordonet ar forberedda.</text>
  <text x="24" y="398" font-family="system-ui,sans-serif" font-size="12" fill="#94A3B8">Ruttstart, lastning, kontroll. Allt klart</text>
  <text x="24" y="414" font-family="system-ui,sans-serif" font-size="12" fill="#94A3B8">innan Stockholm vaknar.</text>
  <rect x="0" y="452" width="400" height="48" fill="#0D0D1E"/>
  <text x="24" y="478" font-family="system-ui,sans-serif" font-size="15" fill="#FFFFFF" font-weight="700">DriverNord</text>
  <text x="376" y="478" text-anchor="end" font-family="system-ui,sans-serif" font-size="10" fill="#475569">drivernord.com</text>
  <rect x="0" y="0" width="400" height="20" fill="#0A0A14" opacity="0.92"/>
  <text x="200" y="13" text-anchor="middle" font-family="system-ui,sans-serif" font-size="7" fill="#374151" letter-spacing="1.5">INTERN LAYOUT MOCK - REAL FOTO KRAVS</text>
</svg>`;

const wednesdayBoard: SprintExecutionBoard = {
  photo_criteria:
    'Autentisk distributionslastbil eller logistikterminal i Sverige. ' +
    'Tidig morgon, kl 04:00-06:00. Foraren synlig fran sidan eller bakifran — ej poserad. ' +
    'Lordig verklighet ok. Mork, tung atmosfar.',
  crop_direction:
    'Bred vinkel som inkluderar fordon och miljo. Foraren i bildkanten, ' +
    'inte centrerad. Lagg tyngden pa miljon, inte subjektet.',
  text_overlay_placement:
    'Nedre 30% av bilden. Dark gradient overlay. ' +
    '04:30-textens bas pa ca 70% av bildens hojd.',
  color_contrast_direction:
    'Naturliga morka toner i bilden. Amber (#F59E0B) for tidsangivelsen — ' +
    'hog kontrast mot mork bakgrund. Vit text for tagline.',
  swedish_environment_requirements:
    'Svensk lastbil (CE/C-kategori), garna med svenska skyltar eller terminalmiljo. ' +
    'Vintervader eller tidig morgon-dimma prioriterat for autenticitet.',
  do_not_use: [
    'Poserade "hero pose"-bilder',
    'Solskensbilder med leende forare',
    'Utlandska fordon utan svenska nummerplatar',
    'Studiebilder eller stockfoton med uppenbart stagd belysning',
    'Lagerinomhus utan logistikkontext',
  ],
};

export const W28_WEDNESDAY: SprintExecutionPackage = {
  version: 'v1',
  day_label: 'Onsdag',
  brief: {
    target_audience: 'Distributionsflorare, CE/C-forare i daglig verksamhet',
    objective:
      'Skapa igenkanning och autenticitet — "det dar ar precis min morgon." ' +
      'Forankra DriverNord i det verkliga transportyrket.',
    central_visual_idea:
      'Layout mock for ett autentiskt formorningsfoto fran svensk logistik, ' +
      'med amber tidsangivelse som visuell ankare. ' +
      'Textzonen under foton ger kontextuell distribution-insikt.',
    mobile_scroll_stop_intention:
      'Amber "04:30" mot mork bakgrund stannar scrollet omedelbart — ' +
      'det kanner bekant for alla som borjar tidigt. Autentisk miljo bekraftar.',
    format_justification:
      'Human transport realism-mekanismen kraver ett verkligt foto for trovardighet. ' +
      'Layout-mock visar exakt hur bilden ska integreras med textlagret. ' +
      'Ingen branded graphic kan ersatta autenticiteten har.',
    emotional_tone: 'autentisk_igenkanning',
  },
  on_image_copy: {
    headline: '04:30 — fordonet rullar',
    support_line: 'Distributions-Sverige startar tidigt',
    word_count: 7,
  },
  prototype: {
    type: 'real_asset_layout_mock',
    svg_content: wednesdaySvg,
    execution_board: wednesdayBoard,
    composition_notes:
      'Oversta 60% = fotoplats (mork, autentisk). Amber tidsangivelse over bildbotten. ' +
      'Navy textsone nedtill. Bla accentlinje separerar zoner. Mobiloptimerat.',
    disclaimer: DISCLAIMER_LAYOUT_MOCK,
  },
  quality_review: {
    mobile_readability: 'Godkand — stor amber 04:30 och vit rubrik laser bra pa mobil',
    on_image_word_count: 7,
    visual_family_cooldown: 'Klar — reality_of_work ej anvamd senaste 14 dagar',
    scene_repetition: 'Klar — early_morning_start-scen unik for W28',
    composition_repetition:
      'Klar — documentary_candid med fotoplats-overlay ar ny komposition',
    mechanism_cooldown:
      'Klar — human_transport_realism ej anvamd senaste 14 dagar',
    gate_outcome: 'requires_real_asset',
    founder_review_question:
      'Ar layout-mocket tillrackligt konkret for att hitta ratt foto? ' +
      'Ar amber 04:30 ett starkt nog visuellt ankare?',
  },
  applied_at: new Date().toISOString(),
};

// ─── Friday (Day 5) ───────────────────────────────────────────────────────────
// recognition / career_confidence
// Mechanism: driver_control_consent
// Mode: trust_organic
// Visual family: driver_pride
// Asset strategy: future_ai_generated
// Composition: premium portrait composition mock

const fridaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <defs>
    <linearGradient id="bgF" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1A2744"/>
      <stop offset="100%" stop-color="#0D0D1E"/>
    </linearGradient>
    <linearGradient id="ovF" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0D0D1E" stop-opacity="0"/>
      <stop offset="100%" stop-color="#0D0D1E" stop-opacity="0.96"/>
    </linearGradient>
  </defs>
  <rect width="400" height="500" fill="url(#bgF)" rx="8"/>
  <rect x="0" y="0" width="400" height="18" fill="#080814"/>
  <text x="200" y="12" text-anchor="middle" font-family="system-ui,sans-serif" font-size="7" fill="#374151" letter-spacing="1.5">KOMPOSITIONSPROTOTYP - AI-BILD KRAVS</text>
  <rect x="60" y="30" width="280" height="320" rx="4" fill="#1E2A44" stroke="#2563EB" stroke-width="1" stroke-dasharray="5,4" opacity="0.55"/>
  <text x="200" y="55" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#2563EB" letter-spacing="1" opacity="0.75">SUBJEKTZON — CE-FORARE</text>
  <circle cx="200" cy="132" r="42" fill="#1A2640" stroke="#2563EB" stroke-width="1.5"/>
  <circle cx="200" cy="127" r="30" fill="#111E33"/>
  <path d="M 135 185 Q 158 173 200 178 Q 242 173 265 185 L 272 330 L 128 330 Z" fill="#1A2640" stroke="#2563EB" stroke-width="1"/>
  <text x="200" y="316" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" fill="#2563EB" opacity="0.65">ARBETSKLADER, NATURLIG POSE, EJ ARMKORS</text>
  <line x1="80" y1="335" x2="320" y2="335" stroke="#1E3A5F" stroke-width="6" opacity="0.4"/>
  <text x="200" y="349" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" fill="#374151">NEUTRAL BAKGRUND ELLER FORDON</text>
  <rect x="0" y="340" width="400" height="160" fill="url(#ovF)"/>
  <line x1="24" y1="378" x2="376" y2="378" stroke="#2563EB" stroke-width="0.6" opacity="0.4"/>
  <text x="24" y="410" font-family="system-ui,sans-serif" font-size="22" fill="#FFFFFF" font-weight="800">Din YKB oppnar dorrar</text>
  <text x="24" y="435" font-family="system-ui,sans-serif" font-size="13" fill="#93C5FD">Du valjer — vi matchar ratt</text>
  <text x="24" y="458" font-family="system-ui,sans-serif" font-size="11" fill="#2563EB">drivernord.com</text>
  <rect x="0" y="470" width="400" height="30" fill="#080814"/>
  <text x="24" y="489" font-family="system-ui,sans-serif" font-size="12" fill="#FFFFFF" font-weight="700">DriverNord</text>
  <text x="376" y="489" text-anchor="end" font-family="system-ui,sans-serif" font-size="9" fill="#374151">Intern kompositionsprototyp</text>
</svg>`;

const fridayAiDirection: SprintAiDirectionPackage = {
  scene:
    'Professionell CE-forare i naturlig arbetsmiljo — inte poserad. ' +
    'Bredvid eller nara fordon, eller i terminal/parkering.',
  subject:
    'Man eller kvinna, 30-50 ar, i typisk CE-forare-klading. ' +
    'Avspand, kompetent, sjalvsaker utan att vara stram eller "hero-poserad". ' +
    'Lat subjektet titta lite bort fran kameran — inte direkt i linsen.',
  wardrobe:
    'Funktionella arbetsklader: reflex- eller varselklader, praktisk jacka, ' +
    'arbetshandskar i handen eller i fickan. Inga kostymer, inga logotyper pa klader.',
  environment:
    'Svensk logistikterminalmiljo eller parkeringsyta for tunga fordon. ' +
    'Kvall eller tidig morgon — naturligt ljus med nagot varmt.',
  swedish_transport_realism:
    'CE-lastbil delvis synlig i bakgrunden eller i bildkanten. ' +
    'Europeiska nummerplatar accepteras men svenska foredraget. ' +
    'Kall skandinavisk belysning — overmulet eller gyllene timme.',
  composition:
    'Subjekt i bildens ovre tva tredjedelar. Undre tredjedel fri for textovertag. ' +
    'Djup-av-falt bakgrund (bokeh) for premiumkansla. ' +
    'Lagg inte subjektet i exakt mitten — lite off-center ar starkare.',
  camera_framing:
    'Halvbild (midja upp) eller trekvartsvy. Portrattlansformatet 4:5 (1080x1350). ' +
    'Inga extrema vidvinklar. Kameran i ogonh jd eller svagt nerifraan.',
  lighting:
    'Mjukt naturligt ljus — gyllene timme fore eller efter solnedgang. ' +
    'Alternativt: overmulet dagsljus med jamnt, flat belysning. ' +
    'Undvik harda skuggor och studieljus.',
  negative_constraints: [
    'Inte armarna i kors framfor brostet',
    'Inte foraren stende rakt upp med lastbilen bakom — kliche',
    'Inga stockfoton-leenden',
    'Ingen forare som tittar in i kameran med bredt leende',
    'Ingen overredigerad HDR-look',
    'Inga synliga varumarka pa fordon eller klader',
    'Inte en buss eller C-lastbil — specifikt CE-fordon',
    'Ingen stadsmiljo utan logistikkontext',
  ],
  on_image_copy_placement:
    'Textovertag i nedre 30% av bilden. Mork, halvsransparent gradient overlay. ' +
    'H1 "Din YKB oppnar dorrar" i fet vit text, storlek ca 22pt pa 1080px-bred bild. ' +
    'H2 "Du valjer — vi matchar ratt" i ljusbla, storlek ca 14pt. ' +
    'DriverNord-logotyp och drivernord.com langst ned.',
};

export const W28_FRIDAY: SprintExecutionPackage = {
  version: 'v1',
  day_label: 'Fredag',
  brief: {
    target_audience:
      'Erfarna CE-forare med giltig YKB som funderar pa sina karriarmojligheter',
    objective:
      'Igenkanna forarens kompetens och skapa dragningskraft mot DriverNords ' +
      'matchningstjanst — med betoningen att foraren sjalv valjer.',
    central_visual_idea:
      'Premium portrait-stil: en professionell CE-forare i naturlig arbetskontext, ' +
      'med ett textovertag som bekraftar kompetensens varde. ' +
      'Control & consent-mekanismen: du valjer, vi matchar.',
    mobile_scroll_stop_intention:
      'Manniskoansiktet (eller halvfiguren) i kombination med ' +
      '"Din YKB oppnar dorrar" stoppar scrollet — direkt igenkanning ' +
      'for alla med YKB + CE-kort.',
    format_justification:
      'Driver control & consent-mekanismen fungerar bast med ett mankskligt, ' +
      'varmdigt motiv som signalerar respekt for forarens val. ' +
      'AI-genererad premium portrait ar ratt niva — verklig foto or bast men ' +
      'art-direction-paketet mojliggor framtida AI-generering med precision.',
    emotional_tone: 'professionell_stolthet_med_kontroll',
  },
  on_image_copy: {
    headline: 'Din YKB oppnar dorrar',
    support_line: 'Du valjer — vi matchar ratt',
    word_count: 8,
  },
  prototype: {
    type: 'ai_direction_composition_mock',
    svg_content: fridaySvg,
    ai_direction: fridayAiDirection,
    composition_notes:
      'Djupbla gradient bakgrund. Forar-silhuett i subjektzon (oversta 2/3). ' +
      'Mork gradient overlay over nedre tredjedel. Textovertag med bla accentlinje. ' +
      'drivernord.com som canonical domain i copy.',
    disclaimer: DISCLAIMER_AI_DIRECTION,
  },
  quality_review: {
    mobile_readability:
      'Godkand — stor vit rubrik "Din YKB oppnar dorrar" och bla support-line ' +
      'laser bra pa mobil mot mork overlay',
    on_image_word_count: 8,
    visual_family_cooldown:
      'Klar — driver_pride ej anvamd senaste 14 dagar',
    scene_repetition:
      'Klar — driver_portrait med premium-komposition ej upprepad i W27/W28',
    composition_repetition:
      'Klar — driver_subject_foreground med textovertag-zonen ar unik for sprint',
    mechanism_cooldown:
      'Klar — driver_control_consent ej anvamd senaste 14 dagar',
    gate_outcome: 'requires_future_ai_generation',
    founder_review_question:
      'Ar art-direction-paketet specifikt nog for att generera ratt bild? ' +
      'Ar "Du valjer — vi matchar ratt" tillrackligt tydlig som control-signal?',
  },
  applied_at: new Date().toISOString(),
};

// ─── Sunday (Day 7) ───────────────────────────────────────────────────────────
// community / community_question
// Mechanism: driver_dignity_identity
// Mode: trust_organic
// Visual family: community_conversation (FRESH DIRECTION)
// Asset strategy: branded_graphic
// Composition: speech-bubble discussion prompt (NOT branded_text_only scene,
//              NOT the W27 Sunday structure — warm purple, conversational)

const sundaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <rect width="400" height="500" fill="#1A1535" rx="8"/>
  <rect x="0" y="0" width="400" height="18" fill="#110F28"/>
  <text x="200" y="12" text-anchor="middle" font-family="system-ui,sans-serif" font-size="7" fill="#374151" letter-spacing="1.5">INTERN FORHANDSVISNING - EJ PUBLICERAD</text>
  <rect x="24" y="30" width="108" height="22" rx="11" fill="#6D28D9" opacity="0.3"/>
  <text x="78" y="45" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#A78BFA" font-weight="600">Logistikgruppen</text>
  <text x="200" y="182" text-anchor="middle" font-family="system-ui,sans-serif" font-size="158" fill="#6D28D9" opacity="0.07" font-weight="900">?</text>
  <rect x="20" y="192" width="360" height="142" rx="20" fill="#231D48"/>
  <polygon points="58,334 80,334 69,352" fill="#231D48"/>
  <text x="200" y="228" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" fill="#FFFFFF" font-weight="700">Hur hanterar ni stress</text>
  <text x="200" y="254" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" fill="#FFFFFF" font-weight="700">under hog belastning?</text>
  <line x1="40" y1="270" x2="360" y2="270" stroke="#6D28D9" stroke-width="0.8" opacity="0.5"/>
  <text x="200" y="295" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#A78BFA">Dela i kommentarerna</text>
  <text x="200" y="315" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#6B5FA6">Alla erfarenheter valkomnas</text>
  <text x="200" y="378" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#4B4570">Logistik- och transportyrket</text>
  <text x="200" y="395" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#4B4570">stresshantering i praktiken</text>
  <rect x="0" y="428" width="400" height="72" fill="#110F28"/>
  <line x1="0" y1="428" x2="400" y2="428" stroke="#6D28D9" stroke-width="1" opacity="0.3"/>
  <text x="24" y="460" font-family="system-ui,sans-serif" font-size="16" fill="#FFFFFF" font-weight="700">DriverNord</text>
  <text x="24" y="478" font-family="system-ui,sans-serif" font-size="10" fill="#4B4570">drivernord.com</text>
  <circle cx="370" cy="460" r="20" fill="#6D28D9" opacity="0.2"/>
  <circle cx="370" cy="460" r="11" fill="#6D28D9" opacity="0.6"/>
  <text x="200" y="496" text-anchor="middle" font-family="system-ui,sans-serif" font-size="7" fill="#2D2B50" letter-spacing="1">INTERN FORHANDSVISNING</text>
</svg>`;

export const W28_SUNDAY: SprintExecutionPackage = {
  version: 'v1',
  day_label: 'Sondag',
  brief: {
    target_audience:
      'Alla logistik- och transportarbetare i Logistikklubb-gemenskapen — ' +
      'CE/C/D-forare, lagerarbetare, terminalpersonal',
    objective:
      'Trigga autentisk diskussion i kommentarerna kring stresshantering i yrket. ' +
      'Positionera DriverNord-kanalen som en plats for genuina yrkessamtal, ' +
      'inte bara jobbannonsering.',
    central_visual_idea:
      'Samtalsorienterad pratbubbla-grafik i varm lila — ' +
      'fragans format kanner konversationellt och inbjudande, ' +
      'inte som en annons. ' +
      'Driver dignity & identity: forarens erfarenhet ar varden att dela.',
    mobile_scroll_stop_intention:
      'Det stora fragemarkestecknet i bakgrunden fanger blicken. ' +
      'Pratbubblan signalerar omedelbart att nagot fragar dig — ' +
      'utloper den naturliga impulsen att svara.',
    format_justification:
      'Community question-inlagg prestera bast nar de kanner informella ' +
      'och diskussionsorienterade. Pratbubbla-formatet bryter den branded-grafik-mall ' +
      'som blockerats for W28 Sondag (likhet med W27). ' +
      'Varm lila sarSkiljer fran Monday-navy och Friday-gradientblatt.',
    emotional_tone: 'varmt_inkluderande_genuint',
  },
  on_image_copy: {
    headline: 'Hur hanterar ni stress under hog belastning?',
    support_line: 'Dela i kommentarerna',
    word_count: 10,
  },
  prototype: {
    type: 'svg_branded_graphic',
    svg_content: sundaySvg,
    composition_notes:
      'Varm lila bakgrund #1A1535 (distinkt fran navy). Pratbubbla-element ' +
      'med fraga inuti. Stort tonat "?" som bakgrundselement. ' +
      'Lila accentfarg — ny visuell familj jamfort med Mandag-bla och Fredag-marinbla. ' +
      'Diskussions-first, ej annons-first.',
    disclaimer: DISCLAIMER_BRANDED,
  },
  quality_review: {
    mobile_readability:
      'Godkand — vit fragetext pa mork lila pratbubbla laser bra pa mobil',
    on_image_word_count: 10,
    visual_family_cooldown:
      'Klar — community_conversation anvamd men ny komposition (pratbubbla) skiljer sig fran W27',
    scene_repetition:
      'Godkand — community_prompt ar vald istallet for branded_text_only ' +
      '(som blockerats for W28 Sondag). Pratbubbla-komposition ar ny scen.',
    composition_repetition:
      'Klar — pratbubbla med fragemarkebakgrund ej anvamd tidigare. ' +
      'Sarskild fran W27 Sondag (text-centered-minimal + navy).',
    mechanism_cooldown:
      'Klar — driver_dignity_identity ej anvamd senaste 14 dagar',
    gate_outcome: 'ready_for_internal_preview',
    founder_review_question:
      'Kanner pratbubbla-formatet tillrackligt informellt och diskussionsinbjudande? ' +
      'Ar lila farg tillrackligt distinkt fran Mandags navy?',
  },
  applied_at: new Date().toISOString(),
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export const W28_EXECUTION_PACKAGES: Record<number, SprintExecutionPackage> = {
  1: W28_MONDAY,
  3: W28_WEDNESDAY,
  5: W28_FRIDAY,
  7: W28_SUNDAY,
};

// Ordered array for iteration
export const W28_PACKAGES_ORDERED: SprintExecutionPackage[] = [
  W28_MONDAY,
  W28_WEDNESDAY,
  W28_FRIDAY,
  W28_SUNDAY,
];
