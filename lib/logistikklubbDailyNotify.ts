// lib/logistikklubbDailyNotify.ts
//
// Twice-daily Swedish message generator for the Logistikklubb WhatsApp relay.
// Produces one morning message (06:00 Stockholm) and one evening message (18:00 Stockholm)
// per calendar day. The founder receives them privately and decides whether to copy
// the content into the Logistikklubben WhatsApp group.
//
// BOUNDARIES:
//   ✗ Does NOT post to WhatsApp groups or any public channel
//   ✗ Does NOT contain company names, driver names, or PII
//   ✗ Does NOT make live traffic, weather, or breaking-news claims
//   ✓ Pure functions — no DB access, no side effects
//   ✓ Deterministic: same Stockholm calendar date always returns same content per slot
//   ✓ Morning and evening pools are independent — same date always yields different content

export type DailySlot = 'morning' | 'evening';

export interface DailyNotifyMessage {
  slot:      DailySlot;
  category:  string;
  title:     string;
  post_text: string;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

// Returns today's date string in Europe/Stockholm timezone (format: YYYY-MM-DD).
// Used as part of the idempotency target_id in the cron route.
export function getStockholmDateString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
}

// Returns a numeric day index stable across the entire Stockholm calendar day.
// Increments at midnight Stockholm time regardless of UTC offset (CET/CEST).
// Pool selection: idx % pool.length — cycles deterministically through content.
export function getStockholmDateIndex(): number {
  const dateStr = getStockholmDateString();
  return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 86_400_000);
}

// ─── Content pools ────────────────────────────────────────────────────────────
// Constraints: Swedish only · ≤850 chars per post_text · no PII · no company names ·
// no live traffic/weather/news claims · no sales CTA by default.
//
// Morning tone: useful, grounded, professional start-of-day.
// Evening tone: reflective, discussion-oriented, work-life/logistics insight.

interface PoolEntry {
  category:  string;
  title:     string;
  post_text: string;
}

const MORNING_POOL: PoolEntry[] = [
  {
    category:  'morning_greeting',
    title:     'Förberedelse och fokus',
    post_text: `God morgon! ☀️

Innan du startar dagens körning — ta en minut att gå igenom rutten, lastningen och eventuella specialinstruktioner.

Erfarna förare vet att 5 minuters förberedelse sparar 30 minuter på vägen.

Hur startar ni er arbetsdag? Har ni rutiner som faktiskt fungerar? Dela gärna — det bästa är det vi lärt oss i praktiken. 👇`,
  },
  {
    category:  'weekly_tips',
    title:     'Håll koll på förfallodatum',
    post_text: `Morgontips ⚠️

Håll koll på era förfallodatum:
✅ YKB-fortbildning (vart 5:e år)
✅ Förarkort / digitalt färdskrivarkort
✅ Körkortet — olika giltighetstid per klass

Tips: Sätt en påminnelse 3 månader innan. Att bli stoppad vid en vägkontroll med ett förfallet YKB är dyrt — och det påverkar er anställningsbarhet direkt.

Hur håller ni koll? App, kalender, eller minns ni det utantill? 👇`,
  },
  {
    category:  'morning_greeting',
    title:     'Koncentration bakom ratten',
    post_text: `God morgon från Logistikklubben 🚛

En sak ni inte kan kompromissa med: koncentrationen bakom ratten.

Trötthet, stress, distraktioner — ni vet. Tips från erfarna: om du känner att du tappar fokus, pausa. En kopp kaffe och 15 minuter gör skillnaden. Tidspressen är sällan värd risken.

Vad är ert bästa knep för att hålla fokus under en lång tur? 👇`,
  },
  {
    category:  'morning_greeting',
    title:     'Logistik-Sverige behöver er idag',
    post_text: `God morgon! 📦

Sverige behöver er idag — lastbilar, terminalpersonal, truckförare, förare som kör ut mat, läkemedel, byggmaterial, e-handel.

Det syns inte i rubriker. Det händer varje dag, i alla väder, med höga krav på precision.

Stolt yrke. Viktig funktion.

En enkel fråga: vad är det bästa med ert jobb — i ett ord? 👇`,
  },
  {
    category:  'everyday_logistics',
    title:     'Teknik och fordon — morgonfråga',
    post_text: `Morgonfråga 🔧

Fordonstekniken förändras — fler automatväxellådor, GPS-ruttning, digitala körjournaler.

Vad tycker ni om utvecklingen? Gör det jobbet enklare, svårare, eller mest mer administration?

Och vad är det ni faktiskt vill att ny teknik ska lösa för er i praktiken? 👇`,
  },
  {
    category:  'morning_greeting',
    title:     'Yrkeskunskap som inte syns',
    post_text: `God morgon logistik-Sverige! 🌅

Oavsett om ni startar kl 04, 06 eller 08 — idag kör landet på era axlar.

Något som sällan sägs: yrkesförare och logistikpersonal lär sig mer om Sverige — vägar, orter, industrier, människor — än de flesta andra yrkesgrupper.

Det är en ovärderlig erfarenhet.

Hur länge har ni jobbat i branschen? Och vad lärde ni er det första året? 👇`,
  },
];

const EVENING_POOL: PoolEntry[] = [
  {
    category:  'discussion_question',
    title:     'Vad gick bra idag?',
    post_text: `Kvällen är här — ännu en arbetsdag avklarad. 🌆

En enkel fråga att avsluta med:

Vad gick bättre än förväntat idag? Inte det stora — en liten sak. En körning som löste sig, en kollega som hjälpte till, en rutt som fungerade.

Det är lätt att fokusera på det som krånglade. Men de små vinsterna är värda att notera.

Dela gärna — vad var er lilla vinst idag? 👇`,
  },
  {
    category:  'discussion_question',
    title:     'Löner och villkor i branschen',
    post_text: `Kvällsfråga 💭

En fråga som berör alla i branschen:

Vad tycker ni om löne- och anställningsvillkoren inom transport och logistik i Sverige? Rätt betalt för jobbet, eller finns det gap?

CE-förare, truckförare, terminalpersonal, lagerarbetare — villkoren varierar stort.

Delade erfarenheter hjälper alla att förstå vad som är rimligt att förvänta sig. 👇`,
  },
  {
    category:  'weekly_tips',
    title:     'Tips inför morgondagens tidiga start',
    post_text: `Kvällstips inför imorgon 📋

Tre saker erfarna förare gör kväll/natt innan en tidig start:

1. Kolla vädret och planera kläderna därefter
2. Bered fordonet om möjligt — sparar stress på morgonen
3. Sov tillräckligt — trötthetsolyckor inträffar oftast tidigt på morgonen

Låter enkelt. Är det inte alltid.

Vad är ert bästa tips inför en tidig start? 👇`,
  },
  {
    category:  'discussion_question',
    title:     'Yrkets status i samhället',
    post_text: `En reflektion till kvällen 🤔

Transportbranschen är samhällskritisk. Utan er stannar Sverige.

Ändå är statusen för yrkesförare och logistikpersonal ofta låg i den offentliga debatten — svårt att rekrytera, svårt att behålla folk, svårt att synas.

Vad tror ni behövs för att höja statusen på yrket?

Delade tankar är välkomna. 👇`,
  },
  {
    category:  'everyday_logistics',
    title:     'Vad har jobbet lärt dig om dig själv?',
    post_text: `Kvällsfråga till er med erfarenhet 🎓

Vad är det viktigaste ni lärt er av jobbet — inte om fordon eller rutter, utan om er själva?

Logistik lär er planering, stresshantering, beslut under tidspress, ansvar för tunga konsekvenser. Erfarenheter som är svåra att förklara för någon utifrån.

Vad borde en ny person i branschen veta redan från dag ett? 👇`,
  },
  {
    category:  'discussion_question',
    title:     'Vad är ni mest nöjda med?',
    post_text: `Slutet av en arbetsdag 🌇

Oavsett hur dagen gick — ni bidrog till att Sverige fungerade idag. Det är inte en liten sak.

En sak vi sällan pratar om: logistik är ett av de yrken där ni faktiskt ser resultatet direkt. Lasten kom fram, hyllan är fylld, paketet levererat.

Fråga till gruppen: vad är ni mest nöjda med från den här veckan? En körning, ett beslut, ett samarbete. 👇`,
  },
];

// ─── Pool access (exported for tests) ────────────────────────────────────────

export const MORNING_POOL_SIZE = MORNING_POOL.length;
export const EVENING_POOL_SIZE = EVENING_POOL.length;

// ─── Selection ────────────────────────────────────────────────────────────────

// Selects a daily message deterministically from the appropriate pool.
// dateIndex defaults to the current Stockholm calendar day index.
// Morning and evening use independent pools — same dateIndex always yields
// different content per slot, and different dates cycle through the pool.
export function selectDailyMessage(slot: DailySlot, dateIndex?: number): DailyNotifyMessage {
  const idx  = dateIndex ?? getStockholmDateIndex();
  const pool = slot === 'morning' ? MORNING_POOL : EVENING_POOL;
  const item = pool[idx % pool.length]!;
  return { slot, category: item.category, title: item.title, post_text: item.post_text };
}
