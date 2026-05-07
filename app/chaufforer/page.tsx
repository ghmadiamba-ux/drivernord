import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Chaufförsjobb utan CV-krångel | DriverNord',
  description:
    'Registrera dig som chaufför på cirka 2 minuter. DriverNord matchar din profil med relevanta transportuppdrag baserat på körkort, YKB och tillgänglighet.',
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

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-blue-100">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/chaufforer" className="text-blue-900 font-bold text-lg">
          DriverNord
        </Link>
        <Link
          href="/chat"
          className="text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors"
        >
          Starta registrering →
        </Link>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="bg-blue-900">
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-28">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-5">
          För professionella chaufförer
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
          Chaufförsjobb utan CV-krångel.
        </h1>
        <p className="text-blue-200 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
          Registrera dig på cirka 2 minuter. Vi frågar om körkort, YKB och
          tillgänglighet — sedan matchar DriverNord din profil med relevanta
          transportuppdrag.
        </p>
        <CTAButton />
        <p className="mt-4 text-blue-400 text-sm">
          Inget konto. Inget CV först. Mobilanpassat.
        </p>
      </div>
    </section>
  );
}

// ─── Trust strip ──────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { stat: '~2 min', label: 'Registreringstid' },
  { stat: 'Inget CV', label: 'krävs i första steget' },
  { stat: 'YKB & körkort', label: 'i fokus' },
  { stat: 'Tydligt', label: 'nästa steg' },
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
    title: 'Svara på några frågor',
    body: 'Körkortsklass, YKB-status, förarkort, var du befinner dig och när du kan börja. Inga långa formulär.',
  },
  {
    n: '2',
    title: 'Systemet klassificerar din profil',
    body: 'DriverNord sorterar din profil baserat på kvalifikationer och tillgänglighet — inte hur bra du skriver.',
  },
  {
    n: '3',
    title: 'Du matchas när rätt uppdrag finns',
    body: 'Vi kontaktar dig direkt när ett relevant transportuppdrag matchar din profil. Ingen väntan i kö.',
  },
];

function HowItWorks() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Så här fungerar det</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Tre steg från registrering till matchning.
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
          Byggt för professionella chaufförer.
        </h2>
        <p className="text-gray-600 text-base leading-relaxed mb-10 max-w-xl">
          DriverNord frågar om det som faktiskt avgör om du passar ett uppdrag.
          Inget mer. Inget CV.
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
  'Långa ansökningsformulär',
  'CV-uppladdning krävs',
  'Generella platsannonser',
  'Vänta på manuell granskning',
  'Inga garantier på återkoppling',
];

const DRIVERNORD = [
  'Strukturerad chaufförsprofil på 2 min',
  'Inget CV i första steget',
  'Transportspecifik matchning',
  'Automatisk profilklassificering',
  'Direkt kontakt när match finns',
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
        <Eyebrow>Varför inte vanliga jobbsajter</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          DriverNord är inte en jobbsajt.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Traditional */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-6">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
              Traditionella jobbsajter
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

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="bg-blue-900">
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-24 text-center">
        <Eyebrow>Redo att komma igång?</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Registrera dig på circa 2 minuter.
        </h2>
        <p className="text-blue-300 text-base leading-relaxed mb-8 max-w-lg mx-auto">
          Inget konto. Inget CV först. Vi frågar om det som faktiskt spelar roll
          och matchar dig mot relevanta transportuppdrag.
        </p>
        <CTAButton />
        <p className="mt-5 text-blue-500 text-xs">
          Dina uppgifter delas inte med tredje part. Du kan avregistrera dig
          när som helst.
        </p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-blue-900 border-t border-blue-800">
      <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-blue-400 text-sm">DriverNord © 2025</p>
        <div className="flex items-center gap-5 text-sm">
          <Link
            href="/company"
            className="text-blue-300 hover:text-white transition-colors"
          >
            För transportföretag
          </Link>
          <Link
            href="/chat"
            className="text-blue-300 hover:text-white transition-colors"
          >
            Registrera dig
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChaufflorerPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <BuiltForDrivers />
        <Comparison />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
