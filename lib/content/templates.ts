// lib/content/templates.ts
//
// Swedish content templates for DriverNord Content & Distribution Engine V1.
// Pure — no DB, no I/O, no external AI calls.
//
// Templates are organized by (ContentPillar, CreativeAngle).
// Each combination has 3–4 variants that rotate by week index.
// No company names. No salary figures. No verified-driver claims.
// DriverNord tone: direct, respectful, practical, credible, human, non-corporate.

import type { TemplateContext, ContentPillar, CreativeAngle } from './types';

// ─── Audience label helpers ───────────────────────────────────────────────────

const AUDIENCE_LABEL: Record<string, string> = {
  CE_drivers:             'CE-förare',
  C_drivers:              'C-förare',
  D_drivers:              'bussförare',
  YKB_holders:            'yrkesförare med YKB',
  night_shift_drivers:    'nattskiftsförare',
  distribution_drivers:   'distributionsförare',
  fjarrtransport_drivers: 'fjärrkörer',
  kylfrys_drivers:        'kylfrysförare',
  logistics_workers:      'logistikpersonal',
  all_drivers:            'yrkesförare',
};

function audienceLabel(ctx: TemplateContext): string {
  return AUDIENCE_LABEL[ctx.audience] ?? 'yrkesförare';
}

const CTA_LINE =
  '\n\n👉 Du kör. Vi hjälper dig hitta rätt uppdrag. → drivernord.com/chaufforer';

const COMMUNITY_CTA =
  '\n\n👥 Gå med i Logistikklubben → drivernord.com/logistikklubb';

function maybeCta(ctx: TemplateContext): string {
  if (!ctx.include_cta) return '';
  return CTA_LINE;
}

function maybeDriverNordLine(ctx: TemplateContext): string {
  if (!ctx.driverNord_line) return '';
  return '\n\nDu kör. Vi hjälper dig hitta rätt uppdrag.';
}

// ─── Template type ────────────────────────────────────────────────────────────

type TemplateFn = (ctx: TemplateContext) => string;

// ─── PRACTICAL — practical_advice ─────────────────────────────────────────────

const PRACTICAL_ADVICE_TEMPLATES: TemplateFn[] = [
  // Variant 0 — YKB renewal
  (ctx) => `YKB-tips till er ${audienceLabel(ctx)} 📋

Fortbildningen för YKB är 35 timmar och måste genomföras vart femte år. Det låter enkelt — men med populära utbildare bokade långt i förväg kan det vara tajt.

Praktiska tips:
✅ Boka minst 4–6 månader i förväg, speciellt för CE-kurser
✅ Sätt en påminnelse 6 månader innan förfallodatum
✅ Kontrollera att kursen täcker rätt kategorier för ditt körkort

Hur håller ni koll på era datum? Kommentera nedan 👇${maybeCta(ctx)}`,

  // Variant 1 — pre-trip inspection
  (ctx) => `Rondansvaret — vad säger lagen? ⚠️

Som ${audienceLabel(ctx)} är du ansvarig för fordonets skick innan körning. Rondkontrollen är inte bara en rutin — det är ett lagkrav.

Tre saker att alltid kontrollera:
🔍 Däcktryck och slitbana — underkänt däck kostar böter och kan orsaka olycka
🔍 Bromsar och belysning — snabbtest tar 2 minuter och kan rädda liv
🔍 Lastsäkring — felaktigt lastad bil är ett allvarligt brott

Har er arbetsgivare ett tydligt rondprotokoll? Hur funkar det i praktiken? 👇${maybeCta(ctx)}`,

  // Variant 2 — digital tachograph
  (ctx) => `Färdskrivaren — praktiska påminnelser 🕐

Digitalt färdskrivarkort är obligatoriskt för er ${audienceLabel(ctx)} som kör fordon som kräver det. Kortet gäller i 5 år och måste förnyas i god tid.

Viktigt att komma ihåg:
📌 Förnyelse tar upp till 8 veckor via Transportstyrelsen — räkna med tid
📌 Om kortet går ut mitt i ett uppdrag kan ni inte lagligen köra
📌 Tappad kort? Anmäl direkt till Transportstyrelsen — ni får ett tillfälligt tillstånd

Hur hanterar ni administrationen kring kortet? 👇${maybeCta(ctx)}`,

  // Variant 3 — route planning tips
  (ctx) => `Körning i Stockholm — tips för ${audienceLabel(ctx)} 🗺️

Stockholmstrafiken är sin egen konst. Några saker som gör skillnad i praktiken:

⏰ Peak-tider att undvika: 07:15–09:00 och 15:30–18:00 in mot city
🛣️ Essingeleden har 99% täckning av tung trafik — bra alternativ när E4 kör
🏙️ Stockholms innerstad: titta på restriktioner för tunga fordon — de ändras
🅿️ Boka leveransfönster i god tid i centrala områden

Vad är ert bästa tips för att köra smart i Stockholm? 👇${maybeCta(ctx)}`,
];

// ─── PRACTICAL — market_education ─────────────────────────────────────────────

const MARKET_EDUCATION_TEMPLATES: TemplateFn[] = [
  // Variant 0 — how CE demand works
  (ctx) => `Hur fungerar CE-marknaden i Sverige? 📊

Kort förklaring för er ${audienceLabel(ctx)} som funderar på hur marknaden ser ut:

CE-körkortet ger tillgång till ett brett spektrum av uppdrag — distribution, fjärrtransport, kylfrys, lastväxlare. Varje kategori har sin egen efterfrågedynamik.

Det vi ser i Stockholmsregionen:
→ Distribution (CE dag) är stabil och återkommande
→ Kylfrys (CE + kylkunnande) är ett av de svårare att hitta rätt kompetens för
→ Fjärrtransport varierar mer med säsong och konjunktur

Hur upplever ni marknaden just nu? 👇${maybeCta(ctx)}`,

  // Variant 1 — YKB as market signal
  (ctx) => `YKB — mer än ett krav, också en signal 📋

YKB är inte bara ett lagkrav för er ${audienceLabel(ctx)} — det är också ett marknadssignal.

Vad vi menar med det:
→ Åkerier och bemanningsföretag prioriterar förare med giltigt YKB i sina sökningar
→ Förfallet YKB stänger dörrar som kan ta 3–6 månader att öppna igen (utbildningstid + administration)
→ YKB kombinerat med nischkunnande (kyl, ADR, kran) ger fler valmöjligheter

Hade ni koll på det? Vad är er erfarenhet av hur arbetsgivare hanterar YKB-krav? 👇${maybeCta(ctx)}`,

  // Variant 2 — seasonal demand patterns
  (ctx) => `Säsongsvariation i transportbranschen — vad kan ni förvänta er? 📅

För er ${audienceLabel(ctx)} kan det vara värt att känna till det grundläggande mönstret:

🌱 Vår: Byggbranschen startar igång — C-distribution byggmaterial ökar
☀️ Sommar: Semestrar skapar hål i bemanningen — flexibla förare är i extra hög kurs
🍂 Höst: E-handelssäsongen startar — lager och distribution accelererar
❄️ Vinter: Utmanande körförhållanden + julhandel = topptryck på distribution

Hur planerar ni era arbetsperioder kring säsongen? 👇${maybeCta(ctx)}`,
];

// ─── PRACTICAL — myth_vs_reality ─────────────────────────────────────────────

const MYTH_VS_REALITY_TEMPLATES: TemplateFn[] = [
  // Variant 0 — experience needed
  (ctx) => `Myt vs verklighet: "Du behöver massor av erfarenhet för att hitta bra CE-jobb" 🚛

Myten: Utan 5–10 år bakom ratten är det svårt att komma in.

Verkligheten: ${audienceLabel(ctx)} med 1–2 år och rätt certifieringar (YKB, kylvana, ADR) är efterfrågade — speciellt om de kan starta snabbt och har bra referens från tidigare åkeri.

Vad som faktiskt spelar roll:
✓ Körkortet i ordning — inga anmärkningar
✓ YKB giltigt — absolut krav
✓ Ärlighet om vad man kan och vill köra
✓ Tillgänglighet i rätt region

Vad tyckte ni — stämmer myten med er erfarenhet? 👇`,

  // Variant 1 — license class switching
  (ctx) => `Myt: "Att ta CE-körkort när man har C är dyrt och krångligt" 🎓

Verkligheten är mer nyanserad:

Om ni redan har C-körkort och giltigt YKB (kategori 1):
→ CE-provet fokuserar på koppling av släp och manövrering
→ Teori och körprov — inte hela processen från noll
→ Kostnad beror på utbildare och ev. tilläggsmoment, men det är inte som att börja om

Och om ni funderar på om det lönar sig ekonomiskt:
→ CE öppnar fler uppdragskategorier än C
→ Kylfrys, fjärr, och specialtransport kräver ofta CE

Har ni tagit steget från C till CE? Hur var upplevelsen? 👇`,

  // Variant 2 — remote work myth
  (ctx) => `Myt: "Som ${audienceLabel(ctx)} är du alltid ensam och rycks runt hur som helst"

Verkligheten varierar kraftigt — och vet man vad man söker kan man styra mot bättre villkor:

✓ Fasta rutter vs. flexibla — båda finns, det är ett aktivt val
✓ Dagtidskörning vs. natt — de flesta åkerier har variation
✓ Regional vs. fjärr — CE ger valfrihet om man vet vad man vill

Att kommunicera tydligt vad man söker när man registrerar sig eller söker jobb gör skillnad.

Hur tydliga är ni med era preferenser när ni söker jobb? 👇`,
];

// ─── PRACTICAL — operational_insight ──────────────────────────────────────────

const OPERATIONAL_INSIGHT_TEMPLATES: TemplateFn[] = [
  // Variant 0 — a typical distribution morning
  (ctx) => `En typisk distributionsmorgon — inifrån 🌅

Kl 04:30 — Fordonet ska vara kör klart. Rond, kontroll, lastning. Allt ska stämma.
Kl 06:00 — Första stoppet. Tättbefolkade områden, smala gator, tidsfönster att hålla.
Kl 09:00 — Lunch är ett planeringsmoment, inte ett avbrott. Nästa runda är redan planerad.
Kl 14:00 — Avrapportering, fordonet tillbaka. Vad gick bra? Vad kan förbättras imorgon?

Det är det här arbetet som håller Sverige igång. Dagligen.

Känner ni igen er? Hur ser er distribution-morgon ut? 👇${maybeDriverNordLine(ctx)}`,

  // Variant 1 — kylfrys insight
  (ctx) => `Kylfrystransport — vad som skiljer det från vanlig distribution 🧊

För er som aldrig kört kyl, men funderar på det:

Tekniskt: Temperaturzoner, larmhantering, dokumentation för livsmedelskedjor.
Tidsmässigt: Leveransfönster är striktare — minutpassning till butiker.
Administrativt: Temperaturloggar och certifikat tillkommer.
Fysiskt: Lastning i kylt utrymme — kläder och handskar är inte valfria.

Det som lockar många: specialkunnandet ger fler valmöjligheter och bättre förhandlingsposition.

Kör ni kyl idag — vad är det ni gillar mest med det? 👇${maybeCta(ctx)}`,
];

// ─── RECOGNITION — driver_recognition ────────────────────────────────────────

const DRIVER_RECOGNITION_TEMPLATES: TemplateFn[] = [
  // Variant 0 — critical infrastructure
  (ctx) => `Utan er kör ingenting ✊

${audienceLabel(ctx).charAt(0).toUpperCase() + audienceLabel(ctx).slice(1)} i Sverige är en del av den kritiska infrastrukturen. Det är ingen överdrift.

Butikshyllorna fylls. Byggnadsplatsen får material. Sjukhuset får sina leveranser. Restaurangen kan servera mat. Allt det möjliggörs av förare som klev upp tidigt, körde rätt, och levererade i tid.

Det är arbete som kräver precision, ansvar och fysisk närvaro — varje dag.

Det förtjänar mer erkännande än det ofta får.${maybeDriverNordLine(ctx)}`,

  // Variant 1 — night shift
  (ctx) => `Nattens förare — de som håller Sverige igång när alla andra sover 🌙

Kl 02:00 — Mottagning på terminalen. Lastning. Körning.
Kl 06:00 — Leveranser klara innan staden vaknar.
Kl 08:00 — Hem. Sov. Gör om imorgon.

Nattskiftsförare är bland de mest professionella i branschen — de arbetar utan publik, utan bekräftelse, utan att det syns.

Till er som kör natten: ni gör ett viktigt jobb. Det är värt att säga. 🙌${maybeDriverNordLine(ctx)}`,

  // Variant 2 — skill appreciation
  (ctx) => `CE-körning är ett hantverk 🚛

Det är lätt att underskatta vad det innebär att köra CE professionellt:

→ 18+ meter fordon i stadsmiljö
→ Lastsäkring som är korrekt, inte ungefär
→ Ekonomisk körning som sparar bränsle och minskar slitage
→ Kommunikation med terminaler, åkerier, mottagare
→ Säkerhet — alltid

Det tar år att bli riktigt bra. Och de flesta ${audienceLabel(ctx)} är det.

Vad är ni stolta över i ert yrke? 👇${maybeDriverNordLine(ctx)}`,

  // Variant 3 — experience years
  (ctx) => `Erfarenhet syns inte i körkortet — men den märks i körningen 🛣️

Varje ${audienceLabel(ctx)} som kört i fem år eller mer har en kunskapsbank som inte finns i någon lärobok:

→ Vilka rutter fungerar vid snöväder
→ Hur man läser en lastplanerare och förstår prioriteringar
→ Vilka terminaler som kräver extra tid
→ Hur man hanterar en stressad mottagare

Den kunskapen är värdefull — för arbetsgivare, för kollegor, för branschen.

Hur lång erfarenhet har ni? Och vad är det ni verkligen lärt er av den? 👇`,
];

// ─── RECOGNITION — relatable_work_moment ─────────────────────────────────────

const RELATABLE_WORK_MOMENT_TEMPLATES: TemplateFn[] = [
  // Variant 0 — morning coffee ritual
  (ctx) => `Det första kaffet kl 04:45 ☕

Ni som kör tidiga morgnar vet vad vi menar. Det är inte bara kaffe — det är starten av en ritual.

Fordonet kollas. Kaffet hälls upp. Rutten är redan i huvudet.

Världen sover fortfarande. Men ni är redo.

Vad är er morgonrutin innan körningen drar igång? 👇`,

  // Variant 1 — tight parking spot
  (ctx) => `Att backa in en CE i ett trångt lastutrymme — utan att röra kantstenen 🎯

Det finns ett speciellt tillfredsställelse i det. Ni vet vilket vi menar.

Kollegan från personbilssidan förstår det inte. Men ni ${audienceLabel(ctx)} som kört ett tag — ni vet exakt vad den känslan är.

Berättat om er svåraste parkeringsmanöver. Vi är nyfikna. 👇`,

  // Variant 2 — unexpected bond at terminal
  (ctx) => `Rasterna på terminalen är mer värdefulla än de verkar 🤝

Det verkar kanske som ett slöseri med tid att sitta kvar vid kaffe en stund. Men de flesta ${audienceLabel(ctx)} som jobbat länge vet att det är där man lär sig mer om branschen än i någon kurs.

Tips om rutter. Uppdateringar om regler. Vem som är en bra arbetsgivare. Hur en specifik typ av last funkar bäst.

Kollegialt utbyte är en underskattad kompetensresurs.

Vad är det bästa tipset ni fått av en kollega på en rast? 👇`,

  // Variant 3 — GPS vs local knowledge
  (ctx) => `GPS vs lokal kännedom — ni vet vad som vinner 🗺️

Det finns rutter som kartan aldrig visar rätt. Höjdbegränsningar som inte är uppdaterade. Gator som ser framkomliga ut men inte är det för CE.

Erfarna ${audienceLabel(ctx)} navigerar med GPS i ena handen och 5 år av lokal kunskap i den andra.

Vilken GPS/kart-app använder ni, och vad är ert bästa lokalkännedoms-tips? 👇`,
];

// ─── RECOGNITION — career_confidence ─────────────────────────────────────────

const CAREER_CONFIDENCE_TEMPLATES: TemplateFn[] = [
  // Variant 0 — know your value
  (ctx) => `Er YKB + CE är värd mer än ni kanske tror 💡

Förare med giltigt CE och YKB är efterfrågade i hela landet — inte bara Stockholm. Det ger en rörlighet som är värdefull i förhandlingar.

Tre saker ni har rätt att fråga om när ni pratar med en ny arbetsgivare:
→ Vad är ordinarie arbetstid och övertidshantering?
→ Hur ser fordonsstocken ut — underhåll, ålder, utrustning?
→ Finns det fast rutt eller varierar det?

Ni kör lastbil professionellt. Det är en kvalifikation som förtjänar tydliga svar.${maybeDriverNordLine(ctx)}`,

  // Variant 1 — switching employers
  (ctx) => `Att byta arbetsgivare som ${audienceLabel(ctx)} — vad är värt att tänka på? 🔄

Det är vanligt att byta — men det finns saker som gör skillnad:

📋 Kontrollera att eventuell konkurrensklausul faktiskt är tillämplig (den är sällan det för förare)
📋 Dokumentera er YKB och körkortsstatus — det är ert — inte arbetsgivarens
📋 Fråga om prova-på-period om ni är osäkra — det är rimligt att be om
📋 Referens från förra arbetsgivaren: se till att lämna på bra villkor

Har ni bytt åkeri nyligen? Vad var det som avgjorde? 👇`,

  // Variant 2 — regional mobility
  (ctx) => `Lokal förare eller öppen för uppdrag utanför staden? Det är ett aktivt val 🌍

Många ${audienceLabel(ctx)} begränsar sig till sin hemregion — och det är fullt rimligt. Men det är värt att veta att mobiliteten är en tillgång om man väljer att använda den.

Förare som kan acceptera uppdrag i mer än ett region har fler alternativ — och bättre förhandlingsposition.

Det behöver inte innebära att flytta. Pendling, kortare kontrakt, projektbaserat — det finns varianter.

Hur tänker ni kring regionalt rörlighet i ert yrkesliv? 👇`,
];

// ─── RECOGNITION — safe_light_humor ──────────────────────────────────────────

const SAFE_LIGHT_HUMOR_TEMPLATES: TemplateFn[] = [
  // Variant 0 — things only truck drivers understand
  (ctx) => `Saker som bara ${audienceLabel(ctx)} förstår 😄

🚛 Att automatiskt räkna bron/tunnelns höjd innan man ens ser skylten
🚛 Känslan av att hitta en ledig lastbilsparkering i Stockholm city
🚛 GPS:en som "räknar om rutten" precis när man minst vill det
🚛 Det kollektiva igenkänningandet när man möter en kollega på rast
🚛 Att förklara för familjen vad ett ekipage är — tre gånger

Vad är det ni lade till på er lista? 👇`,

  // Variant 1 — the rules of the rest stop
  (ctx) => `De oskrivna reglerna på rastplatsen 🛑

Ni som kör mycket vet att det finns ett parallellt socialt protokoll på svenska rastplatser som ingen kurs lär ut men alla vet:

☕ Det äldsta kaffet i termosen är alltid det man delar med grannen
🅿️ Man hjälper till om någon kör fast — det är underförstått
📻 Ingen frågar vad radion spelar i andras hytter
🌧️ Tar man skydd under ett lastbilstak i regn — det är okej

Vad skulle ni lägga till i listan? 👇`,

  // Variant 2 — Monday morning
  (ctx) => `Måndag morgon i distribution 🌅

05:30 — Kaffet är klart men hjärnan är inte riktigt med.
05:45 — Ronden är gjord. Allt stämmer. Bättre.
06:00 — Motorn startar. Nu börjar veckan faktiskt.

Det är ingenting romantiskt med det — men det är ett professionellt val att göra det bra varje dag. Och de flesta ${audienceLabel(ctx)} gör det utan att tänka på det.

Ha en bra vecka alla. Kör säkert. 🙏`,
];

// ─── COMMUNITY — community_question ──────────────────────────────────────────

const COMMUNITY_QUESTION_TEMPLATES: TemplateFn[] = [
  // Variant 0 — best route
  (_ctx) => `Fråga till gruppen 🗺️

Vilken sträcka eller rutt i Sverige är faktiskt värd att köra?

Det kan vara för utsikten, vägkvaliteten, bra rastmöjligheter, eller att det bara flyter på — vad som helst.

Vi är nyfikna på vad ni ${audienceLabel(_ctx)} som kört runt i landet tycker.

Kommentera nedan 👇`,

  // Variant 1 — best advice for new drivers
  (_ctx) => `Fråga till erfarna i gruppen 🎓

Om ni fick ge ett enda råd till en helt ny ${audienceLabel(_ctx)} som precis tagit körkortet — vad skulle det vara?

Inte det "officiella" svaret. Det faktiska rådet som faktiskt gör skillnad de första åren.

Dela gärna — det hjälper de som precis börjat sin karriär. 👇`,

  // Variant 2 — peak season stress
  (_ctx) => `Öppen fråga till gruppen 🤔

Hur hanterar ni stress under högsäsong — Q4, julhandel, sommarsemester?

Rutin, pauser, prioritering, eller bara bita ihop? Vi är genuint nyfikna på vad som faktiskt funkar i praktiken.

Dela era strategier — det är erfarenheter ni har som är svåra att lära sig ur böcker. 👇`,

  // Variant 3 — what non-drivers don't understand
  (_ctx) => `Fråga till er ${audienceLabel(_ctx)} 🚛

Vad är det som folk utanför branschen nästan aldrig förstår om ert jobb?

Det kan vara tekniskt, logistiskt, tidsmässigt, emotionellt — vad som helst som ni tänker "om de bara visste..."

Dela era erfarenheter nedan. Det är viktig kunskap om branschen som behöver komma ut. 👇`,
];

// ─── ACQUISITION — low_freq_acquisition_cta ──────────────────────────────────

const ACQUISITION_CTA_TEMPLATES: TemplateFn[] = [
  // Variant 0 — soft registration
  (ctx) => `Till er ${audienceLabel(ctx)} som inte är registrerade ännu 👋

DriverNord är en matchningstjänst — inte ett bemanningsföretag och inte en arbetsförmedling.

Det vi gör: Ni registrerar er (3 minuter, inget CV) och berättar vad ni kan och är öppna för. Vi hör bara av oss om vi hittar ett konkret uppdrag som faktiskt matchar.

Gratis för förare. Alltid.

Och om ingenting matchar — händer ingenting. Inga påringningar, inga påstötningar.

Du kör. Vi hjälper dig hitta rätt uppdrag.
👉 drivernord.com/chaufforer`,

  // Variant 1 — community join
  (_ctx) => `Logistikklubben är gratis och alltid öppen 📱

Om ni inte redan är med: DriverNord Logistikklubb är ett community för alla inom transport, lager och logistik i Sverige.

Inga säljpitchar. Inga krav. Bara diskussioner, tips och gemenskap mellan folk som förstår branschen inifrån.

Välkommen!
👉 drivernord.com/logistikklubb`,

  // Variant 2 — profile update
  (ctx) => `En snabb påminnelse till er som är registrerade 📋

Om er tillgänglighet har ändrats sedan ni registrerade er — uppdatera gärna er status.

Om ni är redo för nytt uppdrag nu men profilen säger "om 1 månad" — kan vi missa en match för er. Det vill vi inte.

Det tar 2 minuter.
👉 drivernord.com/chaufforer${maybeCta(ctx)}`,
];

// ─── Template registry ────────────────────────────────────────────────────────

type TemplateKey = `${ContentPillar}__${CreativeAngle}`;

const TEMPLATE_REGISTRY: Partial<Record<TemplateKey, TemplateFn[]>> = {
  'practical__practical_advice':          PRACTICAL_ADVICE_TEMPLATES,
  'practical__market_education':          MARKET_EDUCATION_TEMPLATES,
  'practical__myth_vs_reality':           MYTH_VS_REALITY_TEMPLATES,
  'practical__operational_insight':       OPERATIONAL_INSIGHT_TEMPLATES,
  'recognition__driver_recognition':      DRIVER_RECOGNITION_TEMPLATES,
  'recognition__relatable_work_moment':   RELATABLE_WORK_MOMENT_TEMPLATES,
  'recognition__career_confidence':       CAREER_CONFIDENCE_TEMPLATES,
  'recognition__safe_light_humor':        SAFE_LIGHT_HUMOR_TEMPLATES,
  'community__community_question':        COMMUNITY_QUESTION_TEMPLATES,
  'community__relatable_work_moment':     RELATABLE_WORK_MOMENT_TEMPLATES,
  'community__safe_light_humor':          SAFE_LIGHT_HUMOR_TEMPLATES,
  'acquisition__low_freq_acquisition_cta': ACQUISITION_CTA_TEMPLATES,
  'acquisition__practical_advice':        PRACTICAL_ADVICE_TEMPLATES,
};

// ─── Template lookup ──────────────────────────────────────────────────────────

export function getTemplate(
  pillar: ContentPillar,
  angle: CreativeAngle,
  ctx: TemplateContext
): string {
  const key: TemplateKey = `${pillar}__${angle}`;
  const templates = TEMPLATE_REGISTRY[key];
  if (!templates || templates.length === 0) {
    return generateFallbackText(pillar, angle, ctx);
  }
  const fn = templates[ctx.variant % templates.length]!;
  return fn(ctx);
}

// ─── Fallback for unknown combinations ───────────────────────────────────────

function generateFallbackText(
  pillar: ContentPillar,
  angle: CreativeAngle,
  ctx: TemplateContext
): string {
  const label = audienceLabel(ctx);
  return `Till er ${label} i Logistikklubben 🚛

Branschen förändras och vi vill höra era erfarenheter.

Vad ser ni som den viktigaste utmaningen för ${label} i Sverige just nu?

Kommentera nedan 👇${maybeDriverNordLine(ctx)}`;
}

// ─── Hashtag library ─────────────────────────────────────────────────────────

export const HASHTAG_SETS: Record<string, string[]> = {
  base:         ['#LogistikSverige', '#Förare', '#Transport'],
  CE_focused:   ['#CEförare', '#Lastbil', '#ChauffeurJobb'],
  C_focused:    ['#Cförare', '#Lastbil', '#Distribution'],
  D_focused:    ['#Buss', '#Kollektivtrafik', '#Bussförare'],
  community:    ['#Logistikklubb', '#DriverNord', '#LogistikGemenskap'],
  kylfrys:      ['#Kylfrys', '#Kyltransport', '#Kylbil'],
  YKB:          ['#YKB', '#Yrkeskompetens', '#Fortbildning'],
  career:       ['#Karriär', '#Logistikjobb', '#Yrkesförare'],
  recognition:  ['#Yrkesförare', '#Logistikhjältar', '#Transportsverige'],
  fjarr:        ['#Fjärrtransport', '#Långkörning', '#CEförare'],
};

export function buildHashtagSet(
  pillar: ContentPillar,
  audience: string,
  variant: number
): string[] {
  const base = HASHTAG_SETS['base']!;
  const comm = HASHTAG_SETS['community']!;

  const audienceTag: string[] = (() => {
    if (audience === 'CE_drivers')            return HASHTAG_SETS['CE_focused']!;
    if (audience === 'C_drivers')             return HASHTAG_SETS['C_focused']!;
    if (audience === 'D_drivers')             return HASHTAG_SETS['D_focused']!;
    if (audience === 'kylfrys_drivers')       return HASHTAG_SETS['kylfrys']!;
    if (audience === 'fjarrtransport_drivers') return HASHTAG_SETS['fjarr']!;
    if (audience === 'YKB_holders')           return HASHTAG_SETS['YKB']!;
    return HASHTAG_SETS['CE_focused']!;
  })();

  const pillarTag: string[] = (() => {
    if (pillar === 'recognition') return HASHTAG_SETS['recognition']!;
    if (pillar === 'acquisition') return comm;
    if (pillar === 'community')   return comm;
    return HASHTAG_SETS['career']!;
  })();

  // Rotate the secondary set by variant for hashtag bundle variety
  const sets = [audienceTag, pillarTag];
  const chosen = sets[variant % sets.length]!;
  return [...base, ...chosen.slice(0, 3)].slice(0, 6);
}

// ─── Template counts for tests ────────────────────────────────────────────────

export function getTemplateCount(pillar: ContentPillar, angle: CreativeAngle): number {
  const key: TemplateKey = `${pillar}__${angle}`;
  return TEMPLATE_REGISTRY[key]?.length ?? 0;
}
