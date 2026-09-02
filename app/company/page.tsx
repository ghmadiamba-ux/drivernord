import type { Metadata } from 'next';
import Image from 'next/image';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'Bemanning för transport, lager och logistik i Stockholm/Mälardalen — DriverNord Bemanning',
  description:
    'DriverNord Bemanning hjälper transport-, lager- och logistikföretag i Stockholm/Mälardalen att snabbt täcka tillfälliga personalbehov med kontrollerade och uppdragsklara medarbetare — lagerarbetare, truckförare och C/CE-förare.',
  openGraph: {
    title:       'Bemanning för transport, lager och logistik — DriverNord Bemanning',
    description: 'DriverNord Bemanning hjälper företag att täcka tillfälliga personalbehov inom lager, terminal och transport.',
    url:         'https://drivernord.com/company',
    siteName:    'DriverNord Bemanning',
    locale:      'sv_SE',
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Bemanning för transport, lager och logistik — DriverNord Bemanning',
    description: 'DriverNord Bemanning hjälper företag att täcka tillfälliga personalbehov inom lager, terminal och transport.',
  },
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">
      {children}
    </p>
  );
}

function PrimaryButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-block bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                 text-white font-semibold text-base px-7 py-3.5 rounded-lg
                 transition-colors shadow-sm"
    >
      {label}
    </a>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}


// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="bg-blue-900">
      <div className="max-w-6xl mx-auto px-5 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Text column */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-5">
              För transport-, lager- och logistikföretag
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
              Hitta rätt bemanning snabbare.
            </h1>
            <p className="text-blue-200 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
              DriverNord Bemanning hjälper er att täcka tillfälliga personalbehov inom
              lager, terminal och transport — med kontrollerade och uppdragsklara medarbetare,
              från lagerarbetare och truckförare till C/CE-förare.
            </p>
            <PrimaryButton href="mailto:hej@drivernord.com?subject=Bemanningsbehov" label="Beskriv ert bemanningsbehov" />
            <p className="mt-4 text-blue-400 text-sm">
              Inget abonnemang. Vi pratar om era behov och sätter upp ett flöde.
            </p>
          </div>

          {/* Visual column — hidden on mobile, shown on desktop */}
          <div className="hidden lg:block">
            <div className="relative rounded-2xl overflow-hidden bg-blue-800/50 aspect-[4/3] max-w-lg ml-auto">
              <Image
                src="/images/company-hero.jpg"
                alt="Transportansvarig granskar bemanningsbehov och ruttplanering hos DriverNord Bemanning"
                fill
                className="object-cover object-center"
                priority
                sizes="(max-width: 1024px) 0vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Trust strip ──────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { stat: 'Lager + transport', label: 'i samma flöde' },
  { stat: 'Korta uppdrag', label: 'inga långa kontrakt krävs' },
  { stat: 'Dokumentkontroll', label: 'innan uppdrag föreslås' },
  { stat: 'En kontaktperson', label: 'hela vägen' },
];

function TrustStrip() {
  return (
    <section className="bg-blue-50 border-y border-blue-100">
      <div className="max-w-5xl mx-auto px-5 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST_ITEMS.map((item) => (
            <div key={item.stat} className="flex flex-col gap-0.5">
              <span className="text-blue-900 font-bold text-lg leading-tight">
                {item.stat}
              </span>
              <span className="text-gray-600 text-sm leading-snug">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── DriverNord Lagerlucka ────────────────────────────────────────────────────

function LagerluckaSection() {
  return (
    <section id="lagerlucka" className="bg-blue-50 border-y border-blue-100 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-5 py-16 md:py-20">
        <Eyebrow>Första lanseringsfokus</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6">
          DriverNord Lagerlucka — testa oss på en konkret lucka
        </h2>
        <p className="text-gray-600 text-base leading-relaxed mb-8 max-w-2xl">
          För företag som behöver täcka korta luckor inom plock, pack, lastning, lossning eller
          enklare terminalarbete erbjuder vi ett första pilotupplägg: ett konkret behov, ett
          snabbt besked och möjlighet att testa DriverNord Bemanning på ett begränsat uppdrag.
        </p>
        <PrimaryButton href="/lagerlucka" label="Har ni en lagerlucka?" />
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    n: '1',
    title: 'Ni beskriver behovet',
    body: 'Roll, antal, ort, tidsperiod och krav (behörighet, truckkort, YKB, ADR med mera). Vi ställer de frågor som faktiskt avgör vem som passar.',
  },
  {
    n: '2',
    title: 'Vi matchar mot poolen',
    body: 'Vi kontrollerar tillgänglighet och relevanta dokument innan en medarbetare föreslås — inte efteråt.',
  },
  {
    n: '3',
    title: 'Uppdraget startar',
    body: 'Ni får en tydlig start och en kontaktperson under hela uppdraget — inte bara vid leverans.',
  },
];

function HowItWorks() {
  return (
    <section id="hur-det-fungerar" className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Hur det fungerar</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Från behov till bemannat uppdrag.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {HOW_STEPS.map((step, i) => (
            <div key={step.n} className="flex flex-col">
              <div className="flex items-center mb-4 gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                  {step.n}
                </div>
                {i < HOW_STEPS.length - 1 && (
                  <div className="flex-1 border-t-2 border-dashed border-blue-200 hidden md:block" />
                )}
              </div>
              <h3 className="text-blue-900 font-semibold text-base mb-2">{step.title}</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Service lines ────────────────────────────────────────────────────────────

const SERVICE_LINES = [
  {
    title: 'Lagerbemanning',
    detail: 'Lagerarbetare, terminalpersonal, orderplockare, truckförare, packning och lastning/lossning.',
  },
  {
    title: 'Förarbemanning',
    detail: 'C- och CE-förare för distribution, fjärrtransport, schakt/bygg och andra transportuppdrag där rätt behörighet finns.',
  },
  {
    title: 'Logistikbemanning',
    detail: 'Personal för enklare logistikstöd, flödesnära arbetsuppgifter och framtida operativa roller inom transport och lager.',
  },
];

function ServiceLines() {
  return (
    <section className="bg-blue-50">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Vad vi täcker</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-4">
          Våra bemanningsområden.
        </h2>
        <p className="text-gray-600 text-base leading-relaxed mb-10 max-w-xl">
          DriverNord Bemanning täcker hela flödet — inte bara ett enskilt yrke. Rätt profil
          kontrolleras mot era faktiska krav innan den föreslås.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SERVICE_LINES.map((line) => (
            <div
              key={line.title}
              className="bg-white rounded-lg border border-blue-100 px-5 py-4"
            >
              <p className="text-blue-900 font-semibold text-sm mb-1">{line.title}</p>
              <p className="text-gray-500 text-xs leading-snug">{line.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why DriverNord Bemanning ─────────────────────────────────────────────────

const WHY_ITEMS = [
  'En kontaktperson för hela flödet — lager, terminal och transport, inte flera leverantörer.',
  'Kompetens, tillgänglighet och relevanta dokument kontrolleras innan en medarbetare föreslås.',
  'Vi prioriterar korta och akuta uppdrag som andra bemanningsbolag ofta lägger lågt.',
  'Ingen lång rekryteringsprocess — ni beskriver behovet, vi återkommer med ett konkret förslag.',
];

function WhyDriverNord() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Varför DriverNord Bemanning</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-10">
          Kontrollerad bemanning. Ett flöde.
        </h2>
        <ul className="space-y-4 max-w-2xl">
          {WHY_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckIcon />
              <span className="text-gray-700 text-base leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Trust visual ─────────────────────────────────────────────────────────────

function TrustVisual() {
  return (
    <section className="bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden bg-blue-50 aspect-[4/3]">
            <Image
              src="/images/company-trust.jpg"
              alt="DriverNord Bemanning-representanter diskuterar personalbehov i svensk logistikmiljö"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/10 to-transparent pointer-events-none" />
          </div>

          {/* Copy */}
          <div>
            <Eyebrow>Direkt och transparent</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6">
              Tydligt ansvar. En kontaktperson.
            </h2>
            <ul className="space-y-4">
              {[
                'Ni har en kontaktperson hos DriverNord Bemanning genom hela uppdraget.',
                'Inga dolda avgifter — vi är tydliga med upplägg och kostnad innan uppdraget startar.',
                'Vi täcker både lager/terminal och tunga transporter — CE, C och D med giltig YKB.',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-gray-700 text-base leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Operational process ──────────────────────────────────────────────────────

const PROCESS_STEPS = [
  { n: '1', title: 'Kontakt', body: 'Vi pratar om era behov — roll, volym, region, tidshorisont.' },
  { n: '2', title: 'Upplägg', body: 'Vi sätter upp ett flöde anpassat till er organisation och era volymer.' },
  { n: '3', title: 'Matchning', body: 'Vi kontrollerar kompetens, tillgänglighet och dokument mot poolen.' },
  { n: '4', title: 'Förslag', body: 'Ni får ett konkret förslag på medarbetare för uppdraget.' },
  { n: '5', title: 'Uppstart', body: 'Uppdraget startar med en tydlig kontaktpunkt hos DriverNord Bemanning.' },
  { n: '6', title: 'Uppföljning', body: 'Vi följer upp under uppdraget — ni är aldrig utan en kontaktperson.' },
];

function OperationalProcess() {
  return (
    <section className="bg-blue-900">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Processen</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-12">
          Från behov till bemannat uppdrag.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROCESS_STEPS.map((step) => (
            <div key={step.n} className="bg-blue-800 rounded-xl px-5 py-5">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mb-3">
                {step.n}
              </div>
              <p className="text-white font-semibold text-sm mb-1">{step.title}</p>
              <p className="text-blue-300 text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Mid CTA ──────────────────────────────────────────────────────────────────

function MidCTA() {
  return (
    <section className="bg-blue-50 border-y border-blue-100">
      <div className="max-w-3xl mx-auto px-5 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-blue-900 font-bold text-base mb-1">
            Redo att se hur det fungerar?
          </p>
          <p className="text-gray-600 text-sm">
            Hör av dig så berättar vi mer om upplägg och kostnader.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <a
            href="mailto:hej@drivernord.com?subject=Bemanningsbehov"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors text-center"
          >
            Skicka ett mail
          </a>
          <a
            href="tel:+46709385267"
            className="inline-block bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-sm px-6 py-3 rounded-lg transition-colors text-center"
          >
            070-938 52 67
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Hur snabbt kan vi komma igång?',
    a: 'Det beror på vilken profil ni behöver och vad som finns tillgängligt just nu. Vi återkommer snabbt och är tydliga med vad som är realistiskt utifrån er förfrågan.',
  },
  {
    q: 'Vad kostar det?',
    a: 'Vi har inget fast abonnemang — kostnaden beror på roll, volym och uppdragslängd. Kontakta oss så ger vi ett konkret förslag.',
  },
  {
    q: 'Vilka roller täcker ni?',
    a: 'Lagerbemanning (lagerarbetare, terminalpersonal, orderplockare, truckförare), förarbemanning (C, CE med YKB) och logistikbemanning (enklare logistikstöd).',
  },
  {
    q: 'Hur kontrolleras medarbetarna?',
    a: 'Vi kontrollerar relevanta dokument (till exempel körkort, YKB, truckkort) och tillgänglighet innan en medarbetare föreslås för ett uppdrag.',
  },
  {
    q: 'Hur hanteras GDPR?',
    a: 'Medarbetare registrerar sig frivilligt och samtycker till att deras uppgifter används för bemanning och matchning. Vi delar inte data med tredje part utöver vad uppdraget kräver.',
  },
];

function FAQ() {
  return (
    <section id="faq" className="bg-white">
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Vanliga frågor</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Ärliga svar på praktiska frågor.
        </h2>
        <div className="space-y-8">
          {FAQ_ITEMS.map((item) => (
            <div key={item.q} className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
              <p className="text-blue-900 font-semibold text-base mb-2">{item.q}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="bg-blue-900">
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-24 text-center">
        <Eyebrow>Kom igång</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Berätta om era behov.
        </h2>
        <p className="text-blue-300 text-base leading-relaxed mb-8 max-w-lg mx-auto">
          Vi svarar snabbt och ger ett konkret förslag utan krångel. Inget abonnemang,
          bara ett samtal om vad ni behöver.
        </p>
        <PrimaryButton href="mailto:hej@drivernord.com?subject=Bemanningsbehov" label="Skicka ett mail till hej@drivernord.com" />
        <p className="mt-5 text-blue-400 text-sm">
          Eller ring direkt:{' '}
          <a href="tel:+46709385267" className="font-semibold text-white hover:text-blue-200 transition-colors">
            070-938 52 67
          </a>
        </p>
      </div>
    </section>
  );
}


// ─── Structured data ──────────────────────────────────────────────────────────

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompanyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <PublicHeader />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <LagerluckaSection />
        <HowItWorks />
        <ServiceLines />
        <WhyDriverNord />
        <TrustVisual />
        <OperationalProcess />
        <MidCTA />
        <FAQ />
        <FinalCTA />
      </main>
      <LegalFooter />
    </div>
  );
}
