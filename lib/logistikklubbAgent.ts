// lib/logistikklubbAgent.ts
//
// Logistikklubb Agent V1
//
// ROLE:
//   Generates draft community posts for DriverNord Logistikklubb (WhatsApp).
//   Reads market signals from the existing DB in read-only mode.
//   Returns typed draft sequences for the founder to copy and post manually.
//
// BOUNDARIES:
//   ✗ Does NOT post to WhatsApp or any channel automatically
//   ✗ Does NOT expose driver PII (name, phone, email)
//   ✗ Does NOT name specific companies in output
//   ✗ Does NOT trigger SMS, email, or outreach
//   ✓ Reads aggregated signal counts from DB (read-only SELECT)
//   ✓ Returns draft post sequences — founder copies and posts manually
//   ✓ Falls back to static Swedish content if no live signals available

import { db } from './db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostCategory =
  | 'morning_greeting'
  | 'market_signal'
  | 'discussion_question'
  | 'everyday_logistics'
  | 'poll'
  | 'weekly_tips'
  | 'soft_cta';

export interface DraftPost {
  id: string;
  day: number;
  title: string;
  category: PostCategory;
  text: string;
  suggested_time: string;
  risk_note: string | null;
  is_market_signal: boolean;
  is_cta: boolean;
}

// Aggregated market signal summary — NO company names, NO PII
// All fields are boolean trend indicators or safe aggregate counts
export interface MarketSignalSummary {
  ce_distribution_active: boolean;
  fjarrtransport_active: boolean;
  kylfrys_active: boolean;
  adr_tank_active: boolean;
  stockholm_demand: boolean;
  total_active_signals: number;
  supply_gap_domains: string[];
  last_scan_at: string | null;
}

export interface ContentRatio {
  value_pct: number;
  market_pct: number;
  cta_pct: number;
}

export interface FiveDaySequence {
  generated_at: string;
  week_theme: string;
  days: DraftPost[];
  content_ratio: ContentRatio;
  signal_basis: 'live_signals' | 'static_fallback' | 'mixed';
}

// ─── Week helpers ─────────────────────────────────────────────────────────────

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const WEEK_THEMES = [
  'Gemenskap och körningarna',
  'Marknadssignaler och branschen',
  'Tips och tricks för yrkesförare',
  'Frågor, stämning och framtid',
  'Sommarsäsongen i logistik-Sverige',
  'Branschen inifrån',
];

function selectWeekTheme(weekIndex: number): string {
  return WEEK_THEMES[weekIndex % WEEK_THEMES.length];
}

// ─── Market signal reader — read-only DB ──────────────────────────────────────

export async function readMarketSignalSummary(): Promise<MarketSignalSummary> {
  try {
    const [draftsRes, needsRes, lastScanRes, driversRes] = await Promise.all([
      db
        .from('company_need_drafts')
        .select('license_required, domain_required, location_region, draft_status')
        .not('draft_status', 'in', '("rejected","promoted")')
        .limit(50),
      db
        .from('company_needs')
        .select('license_required, domain_required, location_region')
        .eq('status', 'open')
        .limit(30),
      db
        .from('system_actions')
        .select('created_at')
        .in('action_type', ['company_need_daily_scan_completed', 'company_need_weekly_scan_completed'])
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1),
      db
        .from('ingested_drivers')
        .select('domain')
        .limit(200),
    ]);

    const allSignals = [...(draftsRes.data ?? []), ...(needsRes.data ?? [])];

    const domains = allSignals.map((s) => (s as Record<string, unknown>).domain_required as string | null).filter(Boolean) as string[];
    const regions = allSignals.map((s) => (s as Record<string, unknown>).location_region as string | null).filter(Boolean) as string[];
    const licenses = allSignals.map((s) => (s as Record<string, unknown>).license_required as string | null).filter(Boolean) as string[];

    const driverDomains = new Set(
      (driversRes.data ?? []).map((d) => (d as Record<string, unknown>).domain as string | null).filter(Boolean)
    );

    const supply_gap_domains: string[] = [];
    for (const gap of ['kylfrys', 'tanker', 'adr']) {
      if (!driverDomains.has(gap)) supply_gap_domains.push(gap);
    }

    return {
      ce_distribution_active:
        (licenses.includes('CE') || licenses.includes('CE+D')) &&
        domains.includes('distribution'),
      fjarrtransport_active: domains.includes('fjarrtransport'),
      kylfrys_active:
        domains.includes('kylfrys') ||
        domains.includes('livsmedelskyla') ||
        supply_gap_domains.includes('kylfrys'),
      adr_tank_active: domains.includes('adr') || domains.includes('tanker'),
      stockholm_demand: regions.some((r) => r.includes('stockholm')),
      total_active_signals: allSignals.length,
      supply_gap_domains,
      last_scan_at: ((lastScanRes.data ?? [])[0] as Record<string, unknown> | undefined)?.created_at as string | null ?? null,
    };
  } catch {
    return {
      ce_distribution_active: false,
      fjarrtransport_active: false,
      kylfrys_active: false,
      adr_tank_active: false,
      stockholm_demand: false,
      total_active_signals: 0,
      supply_gap_domains: [],
      last_scan_at: null,
    };
  }
}

// ─── Content pools ────────────────────────────────────────────────────────────

// Day 1 — Community welcome (static — always the same opening post)
const DAY1_POST: Omit<DraftPost, 'day'> = {
  id: 'day1-community-welcome',
  title: 'Välkommen & Community Identity',
  category: 'morning_greeting',
  text: `God morgon Logistikklubben! 🚛

Välkommen till DriverNord Logistikklubb — ett gratis nätverk för alla som jobbar inom transport, lager och logistik i Sverige.

Här pratar vi om körningarna, vägarna, jobbet och vardagen i branschen. Inga säljpitchar, inget CV-krångel — bara gemenskap mellan folk som förstår branschen inifrån.

Presentera gärna dig själv kort:
👉 Vad kör/jobbar du med? (CE, C, truck, lager, terminal, planering?)
👉 Var i Sverige är du baserad?
👉 Hur länge har du jobbat i branschen?

Välkommen ombord! 🙌`,
  suggested_time: '07:30 – 08:00',
  risk_note: null,
  is_market_signal: false,
  is_cta: false,
};

// Day 2 — Market signal (4 variants based on live signals)
function buildDay2Post(signals: MarketSignalSummary): DraftPost {
  let title: string;
  let text: string;

  if (signals.ce_distribution_active && signals.stockholm_demand) {
    title = 'CE Distribution Stockholm — Marknadssignal';
    text = `Marknadssignal från veckans skanningar 📊

Vi ser fler signaler kring CE-distribution i Stockholmsområdet just nu. Åkerier söker aktivt och det verkar handla om löpande behov — inte bara tillfälliga.

Fråga till er som kör CE i Stockholm:
Hur upplever ni arbetsmarknaden just nu — är det lätt att hitta rätt uppdrag, eller fortfarande lite segt?

Och för er som är öppna för nya möjligheter: distributionskörning i Stockholm är ett av de vanligaste uppdragen vi ser just nu. Dela gärna era erfarenheter nedan. 👇`;
  } else if (signals.kylfrys_active) {
    title = 'Kylfrystransport — Marknadssignal';
    text = `Marknadssignal: Kylfrys i fokus 🧊

Kylfrystransport är ett av de segmenten där vi ser stark och stabil efterfrågan — och ett av de svårare att hitta rätt kompetens för.

Fråga till er i gruppen som kör kyl:
Vad är det som lockar med kylkörning jämfört med vanlig distribution? Och vad är de största utmaningarna?

Dela gärna era erfarenheter — det hjälper kollegor som funderar på att byta körningstyp. 👇`;
  } else if (signals.fjarrtransport_active) {
    title = 'Fjärrtransport — Marknadssignal';
    text = `Marknadssignal: Fjärrtransport 🛣️

Vi ser signaler kring fjärrtransport i vår marknadsscanning — det finns behov av CE-förare som gillar långa sträckor och självständigt arbete.

Fråga till er fjärrkörer:
Vilken sträcka är er favorit att köra i Sverige — och varför? Bra vägar, lugnt flöde, snygg natur eller bra rastplatser?

Kommentera nedan 👇`;
  } else {
    // Static fallback
    title = 'Sommarsäsongen — Marknadssignal';
    text = `Marknadssignal — Sommarsäsongen 📅

Varje juni-juli ser vi samma mönster i transportbranschen: efterfrågan ökar medan semestern skapar hål i bemanningen. Det skapar möjligheter för er som är flexibla och tillgängliga.

Fråga till er i gruppen:
Har ni märkt någon förändring i arbetsmarknaden den senaste månaden — mer att göra, bättre villkor, eller tvärtom?

Delade erfarenheter hjälper alla att förstå var branschen är just nu. 👇`;
  }

  return {
    id: 'day2-market-signal',
    day: 2,
    title,
    category: 'market_signal',
    text,
    suggested_time: '10:00 – 11:00',
    risk_note: 'Inga företagsnamn omnämns. Aggregerade formuleringar används.',
    is_market_signal: true,
    is_cta: false,
  };
}

// Day 3 — Everyday logistics (4 variants, rotates by week)
const DAY3_POOL: Array<Omit<DraftPost, 'day' | 'id'>> = [
  {
    title: 'Bästa rastplatsen i Sverige?',
    category: 'discussion_question',
    text: `Fråga till er som kör mycket på svenska vägar:

Vilket rastställe är faktiskt värt ett stopp? Det kan vara för kaffet, maten, parkeringen, läget eller utsikten — vad som helst.

Dela era favoriter 👇 Bra tips hjälper alla som kör samma sträckor.

(Och nej, "macken vid E4 utanför Jönköping" räknas som svar om ni vet vilket ni menar 😄)`,
    suggested_time: '07:30 – 08:00',
    risk_note: null,
    is_market_signal: false,
    is_cta: false,
  },
  {
    title: 'Trafikkoll & Sommartips',
    category: 'everyday_logistics',
    text: `Trafikkoll! 🚦

Kör någon av er på E4, E18, E6 eller Essingeleden idag? Hur är läget ute?

Sommartips för er som kör runt storstäderna: köerna brukar vara värst 15:30–18:00 på vardagar. Planera er paus eller alternativ rutt om ni kan.

Dela gärna om det är något värt att veta just nu! 🗺️`,
    suggested_time: '07:00 – 07:30',
    risk_note: null,
    is_market_signal: false,
    is_cta: false,
  },
  {
    title: 'YKB — Veckans tips',
    category: 'weekly_tips',
    text: `Kort men viktigt tips den här veckan ⚠️

YKB och kontroller:
Förfallet YKB kan ställa till det vid vägkontroller — och inga åkerier bokar en förare som inte har det i ordning.

Tips: Sätt en påminnelse 3 månader innan förfallodatum. Det tar tid att boka och genomföra fortbildningen, och ni vill inte bli tagna på sängen.

Hur håller ni koll på era YKB-datum? Har ni tips till kollegor? Kommentera nedan 👇`,
    suggested_time: '09:00 – 10:00',
    risk_note: null,
    is_market_signal: false,
    is_cta: false,
  },
  {
    title: 'Lastbilsparkering i Sverige',
    category: 'discussion_question',
    text: `En fråga som förtjänar ett ärligt svar:

Lastbilsparkering i Sverige — hur är det egentligen? Tillräckliga alternativ? Säkra platser? Rimliga priser?

Kring Stockholm och de större städerna verkar det vara ett återkommande bekymmer för långkörarna.

Hur löser ni det i praktiken? Egna favoritplatser, appar ni använder, eller tips från kollegor? 👇`,
    suggested_time: '12:00 – 13:00',
    risk_note: null,
    is_market_signal: false,
    is_cta: false,
  },
];

// Day 4 — Poll / Domain preference (3 variants, rotates by week)
const DAY4_POOL: Array<Omit<DraftPost, 'day' | 'id'>> = [
  {
    title: 'Poll: Vilken körningstyp föredrar du?',
    category: 'poll',
    text: `Poll till er i gruppen 📊

Vilken typ av körning föredrar ni om ni fick välja fritt?

🚛 Fjärrtransport — långa sträckor, färre stopp
🏙️ Distribution — lokalt/regionalt, fler stopp
🧊 Kylfrys/tempererat
🏗️ Schakt och anläggning
📦 Lager och terminal
🚐 Annat (buss, specialtransport, kranbil etc.)

Kommentera gärna nedan — och berätta varför ni valde som ni valde! 👇`,
    suggested_time: '12:00 – 13:00',
    risk_note: null,
    is_market_signal: false,
    is_cta: false,
  },
  {
    title: 'Poll: Skift och arbetstider',
    category: 'poll',
    text: `Snabb poll till er som kör 🕐

Vilka arbetstider funkar bäst i praktiken?

☀️ Dagtid — klassiska kontorstider ungefär
🌙 Natt/tidig morgon — när vägarna är lugna
🔄 Skiftarbete — variation är bra
🤷 Spelar ingen roll — man anpassar sig

Kommentera gärna — är det familjeliv, ekonomi, vägförhållanden eller helt enkelt vana som avgör? 👇`,
    suggested_time: '12:00 – 13:00',
    risk_note: null,
    is_market_signal: false,
    is_cta: false,
  },
  {
    title: 'Vad saknas i branschen?',
    category: 'discussion_question',
    text: `En lite mer allvarlig fråga till er i gruppen 🤔

Vad tycker ni saknas mest i transportbranschen i Sverige idag?

💰 Bättre löner och villkor
🅿️ Fler och säkrare parkeringsplatser
📋 Tydligare information om regler och rättigheter
🤝 Mer samhällelig respekt för yrket
🔧 Bättre fordon och utrustning
Annat — berätta nedan

Dela era tankar. Det är viktigt att vi pratar om det som faktiskt behöver förbättras. 👇`,
    suggested_time: '12:00 – 13:00',
    risk_note: null,
    is_market_signal: false,
    is_cta: false,
  },
];

// Day 5 — Soft CTA (3 variants, rotates by week)
const DAY5_POOL: Array<Omit<DraftPost, 'day' | 'id'>> = [
  {
    title: 'Soft CTA: Tipsa en kollega',
    category: 'soft_cta',
    text: `Veckans tanke 💭

Känner ni kollegor som kör CE eller C och som kanske funderar på att hitta bättre uppdrag — eller bara är öppna om rätt möjlighet dyker upp?

Tipsa dem om DriverNord. Registreringen tar 3 minuter, kräver inget CV, och vi hör bara av oss om vi hittar en konkret match. Gratis för förare, alltid.

👉 drivernord.com/chaufforer

Och för er som redan är registrerade: se till att er profil visar rätt tillgänglighet. Det gör stor skillnad när vi letar efter rätt match. 🙌`,
    suggested_time: '09:00 – 10:00',
    risk_note: 'Behåll mjuk ton. Inte ett säljsamtal — en tjänst till kollegor.',
    is_market_signal: false,
    is_cta: true,
  },
  {
    title: 'Soft CTA: Logistikklubb-inbjudan',
    category: 'soft_cta',
    text: `Är vi fler i gruppen nu? 📱

Kul! Ju fler vi är, desto bättre och rikare blir diskussionerna.

Om ni känner någon i branschen — förare, truckförare, lagerarbetare, transportledare — tipsa dem om Logistikklubben.

Länken hittar ni på drivernord.com/logistikklubb

Och om ni inte redan är registrerade i DriverNords förarpool: det tar 3 minuter och kräver inget CV.
👉 drivernord.com/chaufforer

Ha en bra fortsättning! 🚛`,
    suggested_time: '09:00 – 10:00',
    risk_note: 'Behåll mjuk ton.',
    is_market_signal: false,
    is_cta: true,
  },
  {
    title: 'Soft CTA: Uppdatera din profil',
    category: 'soft_cta',
    text: `Tips inför helgen 👋

För er som är registrerade i DriverNord:

Uppdatera er tillgänglighets-status om något har förändrats. Om ni är redo för nytt uppdrag nu men profilen säger "om 1 månad" — kan vi missa rätt match för er.

Och för er kollegor som inte är registrerade ännu: det tar 3 minuter.
👉 drivernord.com/chaufforer

Ha en skön helg! ☀️`,
    suggested_time: '09:00 – 10:00',
    risk_note: 'Behåll mjuk ton.',
    is_market_signal: false,
    is_cta: true,
  },
];

// Day 5 — Value / Community closing (used on off-CTA weeks to keep CTA ≤ 10% average)
const DAY5_VALUE_POOL: Array<Omit<DraftPost, 'day' | 'id'>> = [
  {
    title: 'Veckans fråga: Vad gör ett bra åkeri?',
    category: 'discussion_question',
    text: `Avslutningsfråga för veckan 🤔

Vad gör ett åkeri till ett bra ställe att jobba på — ur förarens perspektiv?

Lönen, utrustningen, schemaflexibiliteten, hur de hanterar stress, möjlighet att faktiskt påverka sin situation?

Dela gärna era erfarenheter. Bra arbetsgivare förtjänar att höras om, och dåliga mönster hjälper oss alla att känna igen dem. 👇`,
    suggested_time: '09:00 – 10:00',
    risk_note: null,
    is_market_signal: false,
    is_cta: false,
  },
  {
    title: 'Tips: YKB och körkortsadministration',
    category: 'weekly_tips',
    text: `Administrativt tips inför helgen 📋

Körkortsärenden hanteras via Transportstyrelsen — handläggningstiderna varierar.

Viktigast att ha koll på:
✅ YKB-fortbildning (5 dagar, vart 5:e år)
✅ Förarkort (digitalt färdskrivarkort — förfaller och måste förnyas)
✅ Körkortet i sig — olika giltighetstider per klass

Tips: Boka YKB-fortbildning 4–6 månader i förväg om ni kör CE eller C. Populära utbildare fyller snabbt.

Har ni tips till kollegor om hur man håller koll på förfallodatum? 👇`,
    suggested_time: '09:00 – 10:00',
    risk_note: null,
    is_market_signal: false,
    is_cta: false,
  },
  {
    title: 'Helgfråga: Bästa minnet på vägarna?',
    category: 'discussion_question',
    text: `Lätt helgfråga 🌅

Vad är ert bästa minne från jobbet på vägarna?

Det kan vara en körning ni fortfarande minns, en kollega som hjälpte er ur knipa, en utsikt ni inte glömmer, eller ett uppdrag som faktiskt gick perfekt.

Vi pratar ofta om det som är svårt — men det finns faktiskt bra stunder ute på vägarna också. Dela gärna! 👇`,
    suggested_time: '09:00 – 10:00',
    risk_note: null,
    is_market_signal: false,
    is_cta: false,
  },
];

const EMPTY_SIGNALS: MarketSignalSummary = {
  ce_distribution_active: false,
  fjarrtransport_active: false,
  kylfrys_active: false,
  adr_tank_active: false,
  stockholm_demand: false,
  total_active_signals: 0,
  supply_gap_domains: [],
  last_scan_at: null,
};

// ─── Main generation function (pure — no DB, no side effects) ─────────────────

export function generateFiveDaySequence(
  signals?: MarketSignalSummary,
  weekIndex?: number
): FiveDaySequence {
  const week = weekIndex ?? getWeekNumber(new Date());
  const safeSignals = signals ?? EMPTY_SIGNALS;
  const hasMeaningfulSignals = safeSignals.total_active_signals > 0;

  // CTA on even weeks, value post on odd weeks → ~10% CTA average across sequences
  const isCTAWeek = week % 2 === 0;
  const pool3 = DAY3_POOL[week % DAY3_POOL.length];
  const pool4 = DAY4_POOL[week % DAY4_POOL.length];
  const pool5 = isCTAWeek
    ? DAY5_POOL[week % DAY5_POOL.length]
    : DAY5_VALUE_POOL[week % DAY5_VALUE_POOL.length];

  const days: DraftPost[] = [
    { ...DAY1_POST, day: 1 },
    buildDay2Post(safeSignals),
    { ...pool3, id: `day3-${pool3.category}-w${week}`, day: 3 },
    { ...pool4, id: `day4-${pool4.category}-w${week}`, day: 4 },
    { ...pool5, id: `day5-${isCTAWeek ? 'soft-cta' : pool5.category}-w${week}`, day: 5 },
  ];

  const ctaCount    = days.filter((d) => d.is_cta).length;
  const marketCount = days.filter((d) => d.is_market_signal).length;
  const valueCount  = days.length - ctaCount - marketCount;

  return {
    generated_at: new Date().toISOString(),
    week_theme: selectWeekTheme(week),
    days,
    content_ratio: {
      value_pct:  Math.round((valueCount  / days.length) * 100),
      market_pct: Math.round((marketCount / days.length) * 100),
      cta_pct:    Math.round((ctaCount    / days.length) * 100),
    },
    signal_basis: hasMeaningfulSignals ? 'live_signals' : 'static_fallback',
  };
}
