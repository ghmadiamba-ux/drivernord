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
  title: 'Jobba med DriverNord Bemanning — lager, terminal, logistik och transport i Stockholm',
  description:
    'DriverNord Bemanning söker lagerarbetare, terminalpersonal, truckförare och C/CE-förare i Stockholm/Mälardalen. 3 minuter, inget CV. Din profil delas aldrig utan ditt godkännande.',
  openGraph: {
    title:       'Jobba med DriverNord Bemanning — lager, terminal, logistik och transport',
    description: 'DriverNord Bemanning söker lagerarbetare, terminalpersonal, truckförare och C/CE-förare i Stockholm/Mälardalen. 3 minuter, inget CV.',
    url:         'https://drivernord.com/chaufforer',
    siteName:    'DriverNord Bemanning',
    locale:      'sv_SE',
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Jobba med DriverNord Bemanning — lager, terminal, logistik och transport',
    description: 'DriverNord Bemanning söker lagerarbetare, terminalpersonal, truckförare och C/CE-förare i Stockholm/Mälardalen.',
  },
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function CTAButton({ label = 'Registrera ditt intresse' }: { label?: string }) {
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
              Lager · Terminal · Logistik · Transport · Stockholm
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
              Jobba med DriverNord Bemanning.
            </h1>
            <p className="text-blue-200 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
              Vi söker personer som vill arbeta inom lager, terminal, logistik och transport —
              från lagerarbetare och truckförare till C/CE-förare. Du anger vad du kan och vill
              jobba med och när du är tillgänglig.
            </p>
            <CTAButton />
            <p className="mt-4 text-blue-400 text-sm">
              3 minuter. Inget CV. Du kan registrera ditt intresse så att vi kan kontakta dig
              när ett relevant uppdrag matchar din profil.
            </p>
          </div>

          {/* Image column — hidden on mobile, shown on desktop */}
          <div className="hidden lg:block">
            <div className="relative rounded-2xl overflow-hidden bg-blue-800/50 aspect-[3/4] max-w-sm ml-auto">
              <Image
                src="/images/driver-hero.jpg"
                alt="Medarbetare i DriverNord Bemanning-kläder vid lastbil i svensk logistikmiljö"
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
            alt="Medarbetare i DriverNord Bemanning-kläder vid lastbil i svensk logistikmiljö"
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
  { stat: 'Lager & terminal', label: 'lagerarbetare, truckförare, orderplock' },
  { stat: 'Förare', label: 'C, CE, distribution, fjärr' },
  { stat: '3 minuter', label: 'registreringstid' },
  { stat: 'Inget CV', label: 'krävs' },
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
    title: 'Ange vad du kan och vill jobba med',
    body: 'Lager, terminal, truck, körkort eller kombination — samt tillgänglighet. Tar 3 minuter.',
  },
  {
    n: '2',
    title: 'Vi matchar dig mot uppdrag som passar',
    body: 'Vi utgår från din faktiska kompetens och tillgänglighet — inte hur bra du skriver ett CV.',
  },
  {
    n: '3',
    title: 'Du bestämmer om du vill gå vidare',
    body: 'Vi hör av oss bara när vi har ett relevant uppdrag. Din profil delas aldrig utan ditt separata godkännande.',
  },
];

function HowItWorks() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Så här fungerar det</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Från profil till uppdrag — utan CV-krångel.
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

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Lagerarbetare', detail: 'Plock, packning, mottagning och lastning/lossning' },
  { label: 'Terminalpersonal', detail: 'Terminalarbete, sortering och godshantering' },
  { label: 'Truckförare', detail: 'Truckkort A/B/C/D, lagerlogistik' },
  { label: 'C/CE-förare', detail: 'Distribution, fjärr, schakt/bygg, kyl' },
  { label: 'Logistikpersonal', detail: 'Enklare logistikstöd och flödesnära uppgifter' },
];

function Categories() {
  return (
    <section className="bg-blue-50">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Vad vi söker</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-4">
          Roller inom lager, terminal, logistik och transport.
        </h2>
        <p className="text-gray-600 text-base leading-relaxed mb-10 max-w-xl">
          Oavsett om du jobbar i ett lager, kör truck eller kör CE — registrera dig och ange
          vad som stämmer på dig. Det tar 3 minuter.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.label}
              className="bg-white rounded-lg border border-blue-100 px-5 py-4"
            >
              <p className="text-blue-900 font-semibold text-sm mb-1">
                {cat.label}
              </p>
              <p className="text-gray-500 text-xs leading-snug">{cat.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why register ─────────────────────────────────────────────────────────────

const WHY_ITEMS = [
  'Det kostar inget att registrera dig.',
  'Du väljer om ett uppdrag passar dig — vi hör av oss bara vid en konkret match.',
  'Din profil delas aldrig utan ditt separata godkännande.',
  'Uppdrag inom lager, terminal, logistik och transport — inte bara en kategori.',
];

function WhyRegister() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Varför registrera dig</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-10">
          Enkelt, kontrollerat, utan krångel.
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
        <Eyebrow>Lager, terminal, logistik eller transport?</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Registrera ditt intresse.
        </h2>
        <p className="text-blue-300 text-base leading-relaxed mb-8 max-w-lg mx-auto">
          Ingen ansökan. Inget CV. Du kan registrera ditt intresse så att vi kan kontakta
          dig när ett relevant uppdrag matchar din profil.
        </p>
        <CTAButton />
        <p className="mt-5 text-blue-500 text-xs">
          Din profil delas aldrig utan ditt separata godkännande.
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
  name: 'DriverNord Bemanning',
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
  name: 'DriverNord Bemanning',
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
        <Categories />
        <WhyRegister />
        <LogistikklubbCTA />
        <FinalCTA />
      </main>
      <LegalFooter />
    </div>
  );
}
