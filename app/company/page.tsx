import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'DriverNord — Hitta kvalificerade chaufförer snabbare',
  description:
    'DriverNord samlar in och kvalificerar chaufförsprofiler med körkort C/CE/D och YKB. Du får ett strukturerat underlag — redo för kontakt.',
  openGraph: {
    title:       'DriverNord — Hitta kvalificerade chaufförer snabbare',
    description: 'DriverNord samlar in och kvalificerar chaufförsprofiler med körkort C/CE/D och YKB. Du får ett strukturerat underlag — redo för kontakt.',
    url:         'https://drivernord.com/company',
    siteName:    'DriverNord',
    locale:      'sv_SE',
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'DriverNord — Hitta kvalificerade chaufförer snabbare',
    description: 'DriverNord samlar in och kvalificerar chaufförsprofiler med körkort C/CE/D och YKB. Du får ett strukturerat underlag — redo för kontakt.',
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
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-28">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-5">
          För transportföretag
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
          Hitta kvalificerade chaufförer snabbare.
        </h1>
        <p className="text-blue-200 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
          DriverNord samlar in och kvalificerar chaufförsprofiler med rätt körkort, YKB och
          tillgänglighet. Du får ett strukturerat underlag — redo för kontakt.
        </p>
        <PrimaryButton href="mailto:hej@drivernord.com" label="Kom igång — kontakta oss" />
        <p className="mt-4 text-blue-400 text-sm">
          Inget abonnemang. Vi pratar om dina behov och sätter upp ett flöde.
        </p>
      </div>
    </section>
  );
}

// ─── Trust strip ──────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { stat: 'C / CE / D', label: 'Körkortsklass i fokus' },
  { stat: 'YKB-klassad', label: 'Giltig, pågående eller förfallen' },
  { stat: '~2 min', label: 'Chaufförsintag per profil' },
  { stat: 'Cockpit', label: 'Strukturerad rekryteringsöversikt' },
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

// ─── How it works ─────────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    n: '1',
    title: 'Vi tar in chaufförsprofilerna',
    body: 'Chaufförer registrerar sig via en mobilanpassad flödesintervju. Vi samlar körkortsklass, YKB-status, förarkort, tillgänglighet och region.',
  },
  {
    n: '2',
    title: 'Profilerna kvalificeras automatiskt',
    body: 'Varje profil klassificeras efter körkort, YKB och tillgänglighet. Du ser direkt vilka som är redo för kontakt — utan att manuellt läsa ansökningar.',
  },
  {
    n: '3',
    title: 'Du kontaktar rätt kandidater',
    body: 'Via cockpit-översikten ser du filtrerade profiler. Du väljer vem du vill kontakta och hör av dig direkt — inga mellanhänder.',
  },
];

function HowItWorks() {
  return (
    <section id="hur-det-fungerar" className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Hur det fungerar</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Från chaufförsintag till kvalificerat underlag.
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

// ─── Driver categories ────────────────────────────────────────────────────────

const DRIVER_CATEGORIES = [
  { label: 'CE-chaufförer', detail: 'Drag + släp, lång- och regionaltransport' },
  { label: 'Distributionstransport', detail: 'C-körkort, tätortskörning, morgon- och kvällsturer' },
  { label: 'Fjärrtransport', detail: 'Körtidsregler, nattkörning, YKB-krav' },
  { label: 'Kyltransport', detail: 'ADR-märkning, temperaturlogg, livsmedelsregler' },
  { label: 'Schakt & bygg', detail: 'CE tipp, terrängkörning, anläggningsprofil' },
  { label: 'Budtransport', detail: 'B eller C, snabbhet, stadsnavigation' },
];

function DriverCategories() {
  return (
    <section className="bg-blue-50">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Vad vi täcker</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-4">
          Chaufförer för hela transportspektrat.
        </h2>
        <p className="text-gray-600 text-base leading-relaxed mb-10 max-w-xl">
          DriverNord fokuserar på tunga transporter och yrkestrafik. Vi kvalificerar mot
          de faktorer som faktiskt avgör om en chaufför passar ett uppdrag.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DRIVER_CATEGORIES.map((cat) => (
            <div
              key={cat.label}
              className="bg-white rounded-lg border border-blue-100 px-5 py-4"
            >
              <p className="text-blue-900 font-semibold text-sm mb-1">{cat.label}</p>
              <p className="text-gray-500 text-xs leading-snug">{cat.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why DriverNord ───────────────────────────────────────────────────────────

const WHY_ITEMS = [
  'Du slipper granska ostrukturerade CV:n — varje profil är standardiserad.',
  'Du ser YKB-status direkt. Giltigt, pågående eller förfallet — inga gissningar.',
  'Tillgänglighet är inbyggd i profilen. Du vet när chaufförer kan börja.',
  'Inga mellanhänder. Du kontaktar kandidaterna direkt via deras telefonnummer.',
  'Cockpit-översikten låter dig filtrera och prioritera utan att byta verktyg.',
];

function WhyDriverNord() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Varför DriverNord</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-10">
          Strukturerat underlag. Direkt kontakt.
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
              alt="DriverNord-representanter diskuterar transportbehov i svensk logistikmiljö"
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
              Inga mellanhänder. Direktkontakt med rätt kandidat.
            </h2>
            <ul className="space-y-4">
              {[
                'Varje profil är standardiserad — du ser exakt vad du behöver veta.',
                'Du kontaktar kandidaterna direkt. Inga agenter, inga dolda avgifter.',
                'Vi jobbar med tunga transporter — CE, C och D med giltig YKB.',
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
  { n: '1', title: 'Kontakt', body: 'Vi pratar om dina behov — volym, körkortsklass, region, tidshorisont.' },
  { n: '2', title: 'Upplägg', body: 'Vi sätter upp ett intag anpassat till din organisation och dina volymer.' },
  { n: '3', title: 'Flödet startar', body: 'Chaufförer registrerar sig via mobilanpassad intervju. Profilering sker löpande.' },
  { n: '4', title: 'Kvalificering', body: 'Varje profil klassificeras. Prioritet sätts baserat på körkort, YKB och tillgänglighet.' },
  { n: '5', title: 'Du tar del av underlaget', body: 'Via cockpit-översikten ser du kvalificerade profiler, filtrerade efter dina kriterier.' },
  { n: '6', title: 'Direktkontakt', body: 'Du väljer kandidater och hör av dig direkt. Vi är inte i vägen när du rekryterar.' },
];

function OperationalProcess() {
  return (
    <section className="bg-blue-900">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Processen</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-12">
          Från kontakt till kandidat.
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
        <a
          href="mailto:hej@drivernord.com"
          className="flex-shrink-0 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
        >
          Skicka ett mail
        </a>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Hur snabbt kan vi komma igång?',
    a: 'Vanligtvis inom en vecka från första kontakt. Vi sätter upp flödet, testar intaget och börjar ta in profiler.',
  },
  {
    q: 'Vad kostar det?',
    a: 'Vi har inget fast abonnemang — kostnaden beror på volym och upplägg. Kontakta oss så ger vi ett konkret förslag.',
  },
  {
    q: 'Vilka körkort och transporter täcker ni?',
    a: 'Primärt C, CE och D med YKB. Vi täcker tunga transporter — lång- och regionaltransport, distribution, kyl, bygg och bud.',
  },
  {
    q: 'Kan vi se profiler innan vi bestämmer oss?',
    a: 'Ja. Vi kan visa ett anonymiserat urval av profiler från relevant region och körkortsklass så att du ser vad du får.',
  },
  {
    q: 'Hur hanteras GDPR?',
    a: 'Chaufförerna registrerar sig frivilligt och samtycker till att deras uppgifter används för matchning. Vi delar inte data med tredje part. Du kan be om radering av specifika profiler när som helst.',
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
          Berätta om dina behov.
        </h2>
        <p className="text-blue-300 text-base leading-relaxed mb-8 max-w-lg mx-auto">
          Vi svarar snabbt och ger ett konkret förslag utan krångel. Inget abonnemang,
          inget CRM — bara ett samtal om vad ni behöver.
        </p>
        <PrimaryButton href="mailto:hej@drivernord.com" label="Skicka ett mail till hej@drivernord.com" />
        <p className="mt-5 text-blue-500 text-xs">
          Eller ring oss direkt. Vi är tillgängliga på vardagar.
        </p>
      </div>
    </section>
  );
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompanyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <DriverCategories />
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
