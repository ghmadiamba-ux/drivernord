import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'DriverNord Bemanning — bemanning för transport och logistik i Stockholm/Mälardalen',
  description:
    'DriverNord Bemanning hjälper transport-, lager- och logistikföretag i Stockholm/Mälardalen att snabbt täcka tillfälliga personalbehov med kontrollerade och uppdragsklara medarbetare — lagerarbetare, truckförare och C/CE-förare.',
  openGraph: {
    title:       'DriverNord Bemanning — bemanning för transport och logistik',
    description: 'Från lagergolv till förarplats — en leverantör, hela flödet. Lagerbemanning, förarbemanning och logistikbemanning i Stockholm/Mälardalen.',
    url:         'https://drivernord.com',
    siteName:    'DriverNord Bemanning',
    locale:      'sv_SE',
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'DriverNord Bemanning — bemanning för transport och logistik',
    description: 'Från lagergolv till förarplats — en leverantör, hela flödet.',
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

function CTAButtons() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a
        href="mailto:hej@drivernord.com?subject=Bemanningsbehov"
        className="inline-block bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                   text-white font-semibold text-base px-7 py-3.5 rounded-lg
                   transition-colors shadow-sm"
      >
        Beskriv ert bemanningsbehov
      </a>
      <Link
        href="/chaufforer"
        className="inline-block bg-transparent border border-blue-400 text-blue-100
                   hover:bg-blue-800 font-semibold text-base px-7 py-3.5 rounded-lg
                   transition-colors"
      >
        Registrera dig som arbetstagare
      </Link>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="bg-blue-900">
      <div className="max-w-4xl mx-auto px-5 py-20 md:py-28 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-5">
          Transport- och logistikbemanning i Stockholm/Mälardalen
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
          DriverNord Bemanning
        </h1>
        <p className="text-xl md:text-2xl font-semibold text-blue-100 leading-snug mb-6 max-w-2xl mx-auto">
          Från lagergolv till förarplats — en leverantör, hela flödet.
        </p>
        <p className="text-blue-200 text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
          Vi hjälper transport-, lager- och logistikföretag att snabbt täcka tillfälliga
          personalbehov med kontrollerade och uppdragsklara medarbetare — från
          lagerarbetare och truckförare till C/CE-förare.
        </p>
        <CTAButtons />
      </div>
    </section>
  );
}

// ─── Launch focus ─────────────────────────────────────────────────────────────

function LaunchFocus() {
  return (
    <section className="bg-white">
      <div className="max-w-3xl mx-auto px-5 py-16 md:py-20 text-center">
        <Eyebrow>Första lanseringsfokus: lagerluckor</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6">
          DriverNord Lagerlucka
        </h2>
        <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
          Vi börjar där behovet ofta är mest konkret: korta luckor inom lager, plock, pack,
          lastning, lossning och enklare terminalarbete. Därifrån bygger DriverNord Bemanning
          steg för steg mot hela flödet — från lagergolv till förarplats.
        </p>
        <Link
          href="/lagerlucka"
          className="inline-block bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                     text-white font-semibold text-base px-7 py-3.5 rounded-lg
                     transition-colors shadow-sm"
        >
          Har ni en lagerlucka?
        </Link>
      </div>
    </section>
  );
}

// ─── Trust strip ──────────────────────────────────────────────────────────────

const TRUST_POINTS = [
  'Lager + transport i samma flöde',
  'Korta och akuta uppdrag',
  'Kontrollerade medarbetare',
  'En kontaktperson',
];

function TrustStrip() {
  return (
    <section className="bg-blue-50 border-y border-blue-100">
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST_POINTS.map((point) => (
            <div key={point} className="flex items-start gap-2">
              <CheckIcon />
              <span className="text-blue-900 text-sm font-medium leading-snug">{point}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Value propositions ───────────────────────────────────────────────────────

const VALUE_CARDS = [
  {
    title: 'En leverantör för hela flödet',
    text: 'Ni slipper hantera separata lösningar för lager, terminal och transport. DriverNord Bemanning samlar lagerbemanning och förarbemanning i ett sammanhållet flöde.',
  },
  {
    title: 'När bemanningsluckan inte kan vänta',
    text: 'Vid sjukfrånvaro, arbetstoppar eller korta uppdrag hjälper vi er att snabbt hitta rätt typ av personal — utan lång rekryteringsprocess.',
  },
  {
    title: 'Kontrollerade och uppdragsklara medarbetare',
    text: 'Vi bygger en pool av medarbetare där kompetens, tillgänglighet och relevanta dokument kan följas innan uppdrag föreslås.',
  },
];

function ValuePropositions() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Varför DriverNord Bemanning</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Bemanning byggd för hela transport- och logistikflödet.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VALUE_CARDS.map((card) => (
            <div key={card.title} className="bg-blue-50 border border-blue-100 rounded-xl px-6 py-6">
              <p className="text-blue-900 font-semibold text-base mb-2">{card.title}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{card.text}</p>
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
    id:    'lagerbemanning',
    title: 'Lagerbemanning',
    text:  'Lagerarbetare, terminalpersonal, orderplockare, truckförare, packning och lastning/lossning.',
  },
  {
    id:    'forarbemanning',
    title: 'Förarbemanning',
    text:  'C- och CE-förare för distribution, fjärrtransport, schakt/bygg och andra transportuppdrag där rätt behörighet finns.',
  },
  {
    id:    'logistikbemanning',
    title: 'Logistikbemanning',
    text:  'Personal för enklare logistikstöd, flödesnära arbetsuppgifter och framtida operativa roller inom transport och lager.',
  },
];

function ServiceLines() {
  return (
    <section className="bg-blue-50 border-y border-blue-100">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Våra tjänster</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Våra bemanningsområden
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SERVICE_LINES.map((line) => (
            <div
              key={line.id}
              id={line.id}
              className="bg-white rounded-xl border border-blue-100 px-6 py-6 scroll-mt-20"
            >
              <p className="text-blue-900 font-bold text-lg mb-2">{line.title}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{line.text}</p>
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
          Beskriv ert behov — eller registrera dig som arbetstagare.
        </h2>
        <p className="text-blue-300 text-base leading-relaxed mb-8 max-w-lg mx-auto">
          Vi återkommer och pratar om vad som faktiskt behövs. Inget krångel, inget abonnemang.
        </p>
        <CTAButtons />
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

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type':    'WebSite',
  name:       'DriverNord Bemanning',
  url:        'https://drivernord.com',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <PublicHeader />
      <main className="flex-1">
        <Hero />
        <LaunchFocus />
        <TrustStrip />
        <ValuePropositions />
        <ServiceLines />
        <FinalCTA />
      </main>
      <LegalFooter />
    </div>
  );
}
