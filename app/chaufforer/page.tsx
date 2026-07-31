import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';
import { ViewContentTracker } from '@/components/analytics/ViewContentTracker';
import { WhatsAppCTAButton } from '@/components/community/WhatsAppCTAButton';

const WA_URL = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ?? 'https://chat.whatsapp.com/HC2QY2W32CYIIXpxawXSOG';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'CE- och C-chaufförer i Stockholm — DriverNord',
  description:
    'Inte bemanning. DriverNord matchar CE- och C-chaufförer med transportföretag i Stockholm. 3 minuter, inget CV. Din profil delas aldrig utan ditt godkännande. Gratis för förare.',
  openGraph: {
    title:       'CE- och C-chaufförer i Stockholm — DriverNord',
    description: 'Inte bemanning. DriverNord matchar CE- och C-chaufförer med transportföretag i Stockholm. 3 minuter, inget CV. Din profil delas aldrig utan ditt godkännande.',
    url:         'https://drivernord.com/chaufforer',
    siteName:    'DriverNord',
    locale:      'sv_SE',
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'CE- och C-chaufförer i Stockholm — DriverNord',
    description: 'Inte bemanning. DriverNord matchar CE- och C-chaufförer med transportföretag i Stockholm. 3 minuter, inget CV. Din profil delas aldrig utan ditt godkännande.',
  },
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function CTAButton({ label = 'Starta registrering' }: { label?: string }) {
  return (
    <Link
      href="/chat"
      className="inline-block bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                 text-white font-semibold text-base px-7 py-3.5 rounded-lg
                 transition-colors shadow-sm"
    >
      {label}
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">
      {children}
    </p>
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
              CE · C · YKB · Stockholm
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
              Kör du CE eller C? Transportföretag söker din profil — inte tvärtom.
            </h1>
            <p className="text-blue-200 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
              DriverNord är inte ett bemanningsbolag. Vi matchar CE- och C-förare
              med åkerier i Stockholm som söker din specifika kompetens. Du anger
              vad du kör och när du är tillgänglig — vi hör av oss bara vid en
              konkret match.
            </p>
            <CTAButton />
            <p className="mt-4 text-blue-400 text-sm">
              3 minuter. Inget CV. Din profil delas aldrig utan ditt godkännande.
            </p>
          </div>

          {/* Image column — hidden on mobile, shown on desktop */}
          <div className="hidden lg:block">
            <div className="relative rounded-2xl overflow-hidden bg-blue-800/50 aspect-[3/4] max-w-sm ml-auto">
              <Image
                src="/images/driver-hero.jpg"
                alt="Yrkesförare i DriverNord-kläder vid lastbil i svensk logistikmiljö"
                fill
                className="object-cover object-center"
                priority
                sizes="(max-width: 1024px) 0vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Mobile hero image (below text on small screens) ─────────────────────────

function MobileHeroImage() {
  return (
    <section className="bg-blue-900 block lg:hidden">
      <div className="max-w-6xl mx-auto px-5 pb-10">
        <div className="relative rounded-2xl overflow-hidden bg-blue-800/50 aspect-[4/3]">
          <Image
            src="/images/driver-hero.jpg"
            alt="Yrkesförare i DriverNord-kläder vid lastbil i svensk logistikmiljö"
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}

// ─── Trust strip ──────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { stat: '3 minuter', label: 'Registreringstid' },
  { stat: 'Inget CV', label: 'krävs' },
  { stat: 'CE, C, YKB', label: 'i fokus — inte ett generellt CV' },
  { stat: 'Inte bemanning', label: 'vi tar aldrig en andel av din lön' },
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
              <span className="text-gray-600 text-sm leading-snug">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '1',
    title: 'Ange vad du kör och när du är tillgänglig',
    body: 'CE eller C, YKB-status, förarkort, region och tillgänglighet. Inga långa formulär — tar 3 minuter.',
  },
  {
    n: '2',
    title: 'Vi matchar baserat på kompetens — inte CV',
    body: 'DriverNord matchar din profil mot åkerier som söker exakt din körkortsklass, YKB och körningstyp. Inte hur bra du skriver.',
  },
  {
    n: '3',
    title: 'Du bestämmer om du vill gå vidare',
    body: 'Vi hör av oss bara när vi har en konkret match. Din profil delas aldrig med ett åkeri utan ditt separata godkännande.',
  },
];

function HowItWorks() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Så här fungerar det</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Från profil till match — utan CV-krångel.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {STEPS.map((step, i) => (
            <div key={step.n} className="flex flex-col">
              <div className="flex items-center mb-4 gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                  {step.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 border-t-2 border-dashed border-blue-200 hidden md:block" />
                )}
              </div>
              <h3 className="text-blue-900 font-semibold text-base mb-2">
                {step.title}
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Built for drivers ────────────────────────────────────────────────────────

const DRIVER_FIELDS = [
  { label: 'Körkortsklass', detail: 'C, CE eller D' },
  { label: 'YKB-status', detail: 'Giltig, under pågående, förfallen eller saknas' },
  { label: 'Förarkort', detail: 'Digitalt, papper, inget eller okänt' },
  { label: 'Tillgänglighet', detail: 'Omgående, 2 veckor, 1 månad eller inte ännu' },
  { label: 'Region', detail: 'Stockholm, övriga Sverige eller utomlands' },
  { label: 'Typ av körning', detail: 'Tipp, kyl, distribution, tankbil, skogstransport m.m.' },
];

function BuiltForDrivers() {
  return (
    <section className="bg-blue-50">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Vad vi frågar om</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-4">
          Körkortsklass, YKB, specialkompetens — inte ett CV.
        </h2>
        <p className="text-gray-600 text-base leading-relaxed mb-10 max-w-xl">
          DriverNord frågar om det som faktiskt avgör om du passar ett uppdrag
          och inget annat. Det tar 3 minuter.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DRIVER_FIELDS.map((field) => (
            <div
              key={field.label}
              className="bg-white rounded-lg border border-blue-100 px-5 py-4"
            >
              <p className="text-blue-900 font-semibold text-sm mb-1">
                {field.label}
              </p>
              <p className="text-gray-500 text-xs leading-snug">{field.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Comparison ───────────────────────────────────────────────────────────────

const TRADITIONAL = [
  'Bemanningsbolag tar 25–30% av vad du genererar',
  'Din kontaktinfo delas utan ditt godkännande',
  'Spekulativa samtal utan konkret match',
  'CV-krångel och långa ansökningsprocesser',
  'Alla förare behandlas likadant — din specialkompetens syns inte',
];

const DRIVERNORD = [
  'Gratis för förare — transportföretaget betalar',
  'Din profil delas aldrig utan ditt separata godkännande',
  'Vi hör av oss bara vid en konkret match',
  '3 minuter — inget CV, ingen ansökan',
  'Matchning på CE, C, YKB, HIAB, kyl, ADR — din faktiska kompetens',
];

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

function CrossIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Comparison() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Varför inte bemanning eller jobbsajter</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          DriverNord är inte ett bemanningsbolag.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Traditional */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-6">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
              Bemanningsbolag och jobbsajter
            </p>
            <ul className="space-y-3">
              {TRADITIONAL.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CrossIcon />
                  <span className="text-gray-600 text-sm leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* DriverNord */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-6">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-5">
              DriverNord
            </p>
            <ul className="space-y-3">
              {DRIVERNORD.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckIcon />
                  <span className="text-blue-900 text-sm leading-snug font-medium">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
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
              Branschnätverk för transport, lager och logistik i Sverige
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              En gratis WhatsApp-gemenskap för förare, truckförare och logistikpersonal.
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
        <Eyebrow>CE eller C med giltig YKB?</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Registrera din profil på 3 minuter.
        </h2>
        <p className="text-blue-300 text-base leading-relaxed mb-8 max-w-lg mx-auto">
          Ingen ansökan. Inget CV. Vi hör av oss när vi hittar rätt åkeri för
          din profil. Du bestämmer om du vill gå vidare.
        </p>
        <CTAButton />
        <p className="mt-5 text-blue-500 text-xs">
          Din profil delas aldrig med ett åkeri utan ditt separata godkännande.
          Du kan avregistrera dig när som helst.
        </p>
      </div>
    </section>
  );
}


// ─── Structured data ──────────────────────────────────────────────────────────

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'DriverNord',
  url: 'https://drivernord.com',
  telephone: '+46709385267',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+46709385267',
    email: 'hej@drivernord.com',
    contactType: 'customer service',
    availableLanguage: ['Swedish', 'English'],
  },
  sameAs: ['https://www.facebook.com/profile.php?id=61589564897204'],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'DriverNord',
  url: 'https://drivernord.com',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChaufflorerPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <ViewContentTracker />
      <PublicHeader />
      <main className="flex-1">
        <Hero />
        <MobileHeroImage />
        <TrustStrip />
        <HowItWorks />
        <BuiltForDrivers />
        <Comparison />
        <LogistikklubbCTA />
        <FinalCTA />
      </main>
      <LegalFooter />
    </div>
  );
}
