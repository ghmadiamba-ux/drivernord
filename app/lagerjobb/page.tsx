import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';
import { WhatsAppCTAButton } from '@/components/community/WhatsAppCTAButton';

const WA_URL = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ?? 'https://chat.whatsapp.com/HC2QY2W32CYIIXpxawXSOG';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'Jobba inom lager, plock eller pack — DriverNord Bemanning',
  description:
    'DriverNord Bemanning söker lagerpersonal, orderplockare och packpersonal i Stockholm/Mälardalen för korta uppdrag inom plock, pack, lastning, lossning och enklare terminalarbete. Ingen yrkesförarutbildning krävs.',
  keywords: [
    'DriverNord Bemanning',
    'lagerpersonal',
    'orderplockare',
    'packpersonal',
    'lastning lossning',
    'enklare terminalarbete',
    'lagerbemanning Stockholm',
    'Stockholm Mälardalen',
  ],
  openGraph: {
    title:       'Vill du jobba inom plock, pack eller lager? — DriverNord Bemanning',
    description: 'Korta uppdrag inom lager, orderplock, packning, lastning, lossning och enklare terminalarbete i Stockholm/Mälardalen. Du behöver inte vara yrkesförare.',
    url:         'https://drivernord.com/lagerjobb',
    siteName:    'DriverNord Bemanning',
    locale:      'sv_SE',
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Vill du jobba inom plock, pack eller lager? — DriverNord Bemanning',
    description: 'Korta uppdrag inom lager, orderplock, packning, lastning, lossning och enklare terminalarbete i Stockholm/Mälardalen.',
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
  'mailto:hej@drivernord.com?subject=Intresseanmalan%20-%20lager%2Fplock%2Fpack&body=Hej%2C%0A%0AJag%20%C3%A4r%20intresserad%20av%20uppdrag%20inom%20lager%2C%20plock%20eller%20pack.%0A%0A-%20Namn%3A%0A-%20Ort%3A%0A-%20Tillg%C3%A4nglighet%3A%0A-%20Telefon%3A%0A%0A%2F%20';

function CTAButton({ label = 'Anmäl intresse' }: { label?: string }) {
  return (
    <a
      href={MAILTO_HREF}
      className="inline-block bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                 text-white font-semibold text-base px-7 py-3.5 rounded-lg
                 transition-colors shadow-sm"
    >
      {label}
    </a>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="bg-blue-900">
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-28 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-5">
          Jobba extra inom lager
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
          Vill du jobba inom plock, pack eller lager?
        </h1>
        <p className="text-blue-200 text-base md:text-lg leading-relaxed mb-6 max-w-2xl mx-auto">
          DriverNord Bemanning söker personer i Stockholm/Mälardalen som vill ta korta uppdrag
          inom lager, orderplock, packning, lastning, lossning och enklare terminalarbete.
        </p>
        <p className="text-blue-100 text-base md:text-lg font-medium leading-relaxed mb-10 max-w-2xl mx-auto">
          Du behöver inte vara yrkesförare för dessa uppdrag. Det viktigaste är att du är
          pålitlig, arbetsvillig, tillgänglig, kontaktbar och har rätt att arbeta i Sverige.
        </p>
        <CTAButton />
        <p className="mt-4 text-blue-400 text-sm">
          Det här är en intresseanmälan — inget CV, inget konto.
        </p>
      </div>
    </section>
  );
}

// ─── What matters ─────────────────────────────────────────────────────────────

const WHAT_MATTERS = [
  'Pålitlig — du dyker upp när du sagt att du kommer',
  'Arbetsvillig — redo att ta i där det behövs',
  'Tillgänglig — du vet ungefär när du kan jobba',
  'Kontaktbar — vi kan nå dig snabbt vid en match',
  'Rätt att arbeta i Sverige',
];

function WhatMatters() {
  return (
    <section className="bg-blue-50 border-y border-blue-100">
      <div className="max-w-5xl mx-auto px-5 py-16 md:py-20">
        <Eyebrow>Låg tröskel in — men tydlig kontroll</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-8">
          Det här är det som faktiskt spelar roll.
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {WHAT_MATTERS.map((item) => (
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

// ─── What the work looks like ─────────────────────────────────────────────────

const WORK_CARDS = [
  { title: 'Orderplock', text: 'Plocka och färdigställa order enligt lagrets rutiner.' },
  { title: 'Packning', text: 'Packa gods för vidare transport eller leverans.' },
  { title: 'Lastning/lossning', text: 'Lasta och lossa gods vid mottagning eller utleverans.' },
  { title: 'Enklare terminalarbete', text: 'Sortering, godshantering och andra flödesnära uppgifter.' },
];

function WorkTypes() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Vad uppdragen innebär</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Korta, konkreta uppdrag — inte ett fast schema du binder dig till.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WORK_CARDS.map((card) => (
            <div key={card.title} className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-5">
              <p className="text-blue-900 font-semibold text-sm mb-1">{card.title}</p>
              <p className="text-gray-600 text-xs leading-snug">{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works / honest disclosure ─────────────────────────────────────────

function HowItWorks() {
  return (
    <section className="bg-blue-50 border-y border-blue-100">
      <div className="max-w-3xl mx-auto px-5 py-16 md:py-20">
        <Eyebrow>Så går det till</Eyebrow>
        <h2 className="text-xl font-bold text-blue-900 mb-6">
          Just nu är det här en intresseanmälan.
        </h2>
        <div className="space-y-4 text-gray-700 text-base leading-relaxed">
          <p>
            Du anmäler ditt intresse med namn, ort, tillgänglighet och telefonnummer. Vi hör
            av oss om ditt intresse matchar ett konkret uppdrag hos ett lager eller
            logistikföretag — inte förr.
          </p>
          <p>
            Vår fullständiga digitala registrering är i första hand byggd för chaufförsspåret.
            Vill du jobba inom lager, plock eller pack hanterar vi din intresseanmälan manuellt
            tills dess att en dedikerad registrering för lagerspåret finns på plats.
          </p>
          <p>Det kostar inget att anmäla sig, och du bestämmer själv om ett uppdrag passar dig.</p>
        </div>
      </div>
    </section>
  );
}

// ─── Cross-link to driver track ───────────────────────────────────────────────

function DriverCrossLink() {
  return (
    <section className="bg-white">
      <div className="max-w-3xl mx-auto px-5 py-12 text-center">
        <p className="text-gray-600 text-sm">
          Kör du C/CE eller vill bli truckförare?{' '}
          <Link href="/chaufforer" className="text-blue-600 hover:underline font-medium">
            Läs mer om chaufförsspåret
          </Link>
        </p>
      </div>
    </section>
  );
}

// ─── Logistikklubb community CTA ──────────────────────────────────────────────

function LogistikklubbCTA() {
  return (
    <section className="bg-white border-y border-blue-100">
      <div className="max-w-5xl mx-auto px-5 py-14">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-2">
              DriverNord Logistikklubb
            </p>
            <h3 className="text-blue-900 font-bold text-xl mb-2 leading-snug">
              Branschnätverk för lager, terminal och logistik i Sverige
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              En gratis WhatsApp-gemenskap för lagerpersonal, plockare och logistikpersonal.
              Inte för att söka jobb — för att vara del av branschen.{' '}
              <a href="/logistikklubb" className="text-blue-600 hover:underline">
                Läs mer
              </a>
            </p>
          </div>
          <div className="flex-shrink-0">
            <WhatsAppCTAButton
              url={WA_URL}
              label="Gå med gratis"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 active:bg-green-700
                         text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors shadow-sm"
            />
          </div>
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
        <Eyebrow>Lager, plock eller pack?</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Anmäl intresse.
        </h2>
        <p className="text-blue-300 text-base leading-relaxed mb-8 max-w-lg mx-auto">
          Ingen ansökan, inget CV. Vi hör av oss när ett uppdrag matchar det du beskriver.
        </p>
        <CTAButton />
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LagerjobbPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <PublicHeader />
      <main className="flex-1">
        <Hero />
        <WhatMatters />
        <WorkTypes />
        <HowItWorks />
        <DriverCrossLink />
        <LogistikklubbCTA />
        <FinalCTA />
      </main>
      <LegalFooter />
    </div>
  );
}
