import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'DriverNord Lagerlucka — snabb bemanning för akuta lagerluckor i Stockholm/Mälardalen',
  description:
    'DriverNord Bemanning hjälper lager och logistikföretag i Stockholm/Mälardalen att snabbt täcka en bemanningslucka — lagerpersonal, orderplockare, packpersonal och enklare terminalarbete. Tydligt besked snabbt, testa oss på ett konkret uppdrag 1–7 dagar.',
  keywords: [
    'DriverNord Bemanning',
    'lagerbemanning Stockholm',
    'lagerpersonal',
    'orderplockare',
    'packpersonal',
    'lastning lossning',
    'enklare terminalarbete',
    'bemanningslucka',
    'Stockholm Mälardalen',
  ],
  openGraph: {
    title:       'DriverNord Lagerlucka — har ni en lagerlucka de närmaste 7 dagarna?',
    description: 'Tydligt besked snabbt — ja, nej eller nästa möjliga steg. Testa DriverNord Bemanning på ett konkret lageruppdrag 1–7 dagar innan ni binder er långsiktigt.',
    url:         'https://drivernord.com/lagerlucka',
    siteName:    'DriverNord Bemanning',
    locale:      'sv_SE',
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'DriverNord Lagerlucka — har ni en lagerlucka de närmaste 7 dagarna?',
    description: 'Tydligt besked snabbt — ja, nej eller nästa möjliga steg.',
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

const MAILTO_HREF =
  'mailto:hej@drivernord.com?subject=Lagerlucka%20-%20behov&body=Hej%2C%0A%0AVi%20har%20en%20lagerlucka%20som%20ser%20ut%20s%C3%A5%20h%C3%A4r%3A%0A-%20Roll%2Fuppgift%3A%0A-%20Ort%2Fplats%3A%0A-%20Period%2Fantal%20dagar%3A%0A-%20N%C3%A4r%20beh%C3%B6ver%20ni%20t%C3%A4ckning%3A%0A%0A%2F%20';

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="bg-blue-900">
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-28 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-5">
          DriverNord Lagerlucka
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
          Har ni en lagerlucka de närmaste 7 dagarna?
        </h1>
        <p className="text-blue-200 text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
          DriverNord Bemanning hjälper lager och logistikföretag i Stockholm/Mälardalen att
          få snabb klarhet när en kort bemanningslucka uppstår inom plock, pack, lastning,
          lossning eller enklare terminalarbete.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={MAILTO_HREF}
            className="inline-block bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                       text-white font-semibold text-base px-7 py-3.5 rounded-lg
                       transition-colors shadow-sm"
          >
            Beskriv ert behov
          </a>
          <a
            href="#pilotupplagg"
            className="inline-block bg-transparent border border-blue-400 text-blue-100
                       hover:bg-blue-800 font-semibold text-base px-7 py-3.5 rounded-lg
                       transition-colors"
          >
            Se hur pilotupplägget fungerar
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Signal strip ─────────────────────────────────────────────────────────────

const SIGNAL_ITEMS = [
  'Korta lagerluckor',
  'Arbetstoppar',
  'Sjukfrånvaro',
  'Plock, pack och enklare terminalarbete',
];

function SignalStrip() {
  return (
    <section className="bg-blue-50 border-y border-blue-100">
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {SIGNAL_ITEMS.map((item) => (
            <div key={item} className="flex items-start gap-2">
              <CheckIcon />
              <span className="text-blue-900 text-sm font-medium leading-snug">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Promise ──────────────────────────────────────────────────────────────────

function Promise_() {
  return (
    <section className="bg-white">
      <div className="max-w-3xl mx-auto px-5 py-16 md:py-20 text-center">
        <Eyebrow>Vårt löfte</Eyebrow>
        <p className="text-2xl md:text-3xl font-bold text-blue-900 leading-snug">
          Tydligt besked snabbt — ja, nej eller nästa möjliga steg.
        </p>
        <p className="text-gray-600 text-base leading-relaxed mt-5 max-w-xl mx-auto">
          Det här är en kommunikationsgaranti, inte en leveransgaranti. Vi svarar snabbt och
          ärligt på om vi kan hjälpa till med er lucka — inte med löften vi inte kan hålla.
        </p>
      </div>
    </section>
  );
}

// ─── What we cover ────────────────────────────────────────────────────────────

const COVERAGE_CARDS = [
  {
    title: 'Plock och packning',
    text: 'Orderplock, packpersonal och enklare montering vid arbetstoppar eller sjukfrånvaro.',
  },
  {
    title: 'Lastning och lossning',
    text: 'Kortsiktig täckning vid lastning, lossning och godshantering — ett pass eller en kortare period.',
  },
  {
    title: 'Enklare terminalarbete',
    text: 'Terminalpersonal och enklare logistikarbete där ni behöver snabb, kontrollerad förstärkning.',
  },
];

function Coverage() {
  return (
    <section className="bg-blue-50 border-y border-blue-100">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Vad vi täcker just nu</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Fas 1: lager först.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COVERAGE_CARDS.map((card) => (
            <div key={card.title} className="bg-white border border-blue-100 rounded-xl px-6 py-6">
              <p className="text-blue-900 font-semibold text-base mb-2">{card.title}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pilot tiers ──────────────────────────────────────────────────────────────

const PILOT_TIERS = [
  {
    tag:   'Tier 0',
    title: 'Provpass',
    body:  'Ett enskilt arbetspass (~8h). Den minsta möjliga insatsen för att se hur vi jobbar — inget avtal, inget abonnemang.',
  },
  {
    tag:   'Tier 1',
    title: 'Pilotuppdrag',
    body:  'Testa oss på ett konkret lageruppdrag 1–7 dagar innan ni binder er långsiktigt. Tydlig prissättning direkt på förfrågan.',
    highlight: true,
  },
  {
    tag:   'Tier 2',
    title: 'Löpande bemanning',
    body:  'Ett standingupplägg — men bara efter att ett pilotuppdrag redan gått bra hos er specifikt.',
  },
];

function PilotTiers() {
  return (
    <section id="pilotupplagg" className="bg-white scroll-mt-16">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Så fungerar pilotupplägget</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-4">
          Testa oss på en konkret lagerlucka innan ni binder er långsiktigt.
        </h2>
        <p className="text-gray-600 text-base leading-relaxed mb-12 max-w-xl">
          Låg tröskel in — men tydlig kontroll. Vi kontrollerar tillgänglighet och relevanta
          förutsättningar innan en medarbetare föreslås, samtidigt som steget in är litet nog
          att testa direkt.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILOT_TIERS.map((tier) => (
            <div
              key={tier.tag}
              className={
                'rounded-xl border px-6 py-6 ' +
                (tier.highlight
                  ? 'bg-blue-900 border-blue-900'
                  : 'bg-blue-50 border-blue-100')
              }
            >
              <p
                className={
                  'text-xs font-semibold uppercase tracking-widest mb-3 ' +
                  (tier.highlight ? 'text-blue-300' : 'text-blue-500')
                }
              >
                {tier.tag}
              </p>
              <p className={'font-bold text-lg mb-2 ' + (tier.highlight ? 'text-white' : 'text-blue-900')}>
                {tier.title}
              </p>
              <p className={'text-sm leading-relaxed ' + (tier.highlight ? 'text-blue-200' : 'text-gray-600')}>
                {tier.body}
              </p>
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-sm mt-8 max-w-xl">
          Vi börjar på lagergolvet och bygger steg för steg mot hela flödet — från lagergolv
          till förarplats. Men det första steget är alltid en konkret lucka, inte ett avtal.
        </p>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Vi har redan ett bemanningsföretag — varför byta?',
    a: 'Ni behöver inte byta. Vi ber bara att få testa nästa gång ert nuvarande bolag inte kan täcka en lucka snabbt nog.',
  },
  {
    q: 'Vad kostar ett provpass eller pilotuppdrag?',
    a: 'Vi ger ett tydligt, direkt pris utifrån roll, ort och period när ni beskriver behovet — inget dolt och inget abonnemang.',
  },
  {
    q: 'Hur snabbt får vi besked?',
    a: 'Vårt löfte är ett tydligt besked snabbt — ja, nej, eller vad nästa steg blir. Vi lämnar er aldrig utan svar.',
  },
];

function FAQ() {
  return (
    <section className="bg-blue-50 border-y border-blue-100">
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Vanliga frågor</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Ärliga svar på praktiska frågor.
        </h2>
        <div className="space-y-8">
          {FAQ_ITEMS.map((item) => (
            <div key={item.q} className="border-b border-blue-100 pb-8 last:border-0 last:pb-0">
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
        <Eyebrow>Har ni en lucka just nu?</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Beskriv ert behov.
        </h2>
        <p className="text-blue-300 text-base leading-relaxed mb-8 max-w-lg mx-auto">
          Roll, ort och period räcker för att vi ska kunna ge ett tydligt besked snabbt.
        </p>
        <a
          href={MAILTO_HREF}
          className="inline-block bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                     text-white font-semibold text-base px-7 py-3.5 rounded-lg
                     transition-colors shadow-sm"
        >
          Beskriv ert behov
        </a>
        <p className="mt-5 text-blue-400 text-sm">
          Eller ring direkt:{' '}
          <a href="tel:+46709385267" className="font-semibold text-white hover:text-blue-200 transition-colors">
            070-938 52 67
          </a>
        </p>
        <p className="mt-6 text-blue-500 text-xs">
          Söker du själv jobb inom lager, plock eller pack?{' '}
          <Link href="/lagerjobb" className="underline hover:text-blue-300">
            Läs mer här
          </Link>{' '}
          — det här är sidan för företag.
        </p>
      </div>
    </section>
  );
}

// ─── Structured data ──────────────────────────────────────────────────────────

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type':    'Organization',
  name:       'DriverNord Bemanning',
  url:        'https://drivernord.com',
  telephone:  '+46709385267',
  contactPoint: {
    '@type':            'ContactPoint',
    telephone:          '+46709385267',
    email:              'hej@drivernord.com',
    contactType:        'customer service',
    availableLanguage:  ['Swedish', 'English'],
  },
  sameAs: ['https://www.facebook.com/profile.php?id=61589564897204'],
};

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

export default function LagerluckaPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <PublicHeader />
      <main className="flex-1">
        <Hero />
        <SignalStrip />
        <Promise_ />
        <Coverage />
        <PilotTiers />
        <FAQ />
        <FinalCTA />
      </main>
      <LegalFooter />
    </div>
  );
}
