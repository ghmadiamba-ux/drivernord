import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';
import { CommunityTracker } from '@/components/analytics/CommunityTracker';
import { WhatsAppCTAButton } from '@/components/community/WhatsAppCTAButton';

const WA_URL = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ?? 'https://chat.whatsapp.com/HC2QY2W32CYIIXpxawXSOG';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'DriverNord Logistikklubb — gratis nätverk för transport, lager och logistik i Sverige',
  description:
    'Gå med i DriverNord Logistikklubb — ett gratis WhatsApp-nätverk för förare, truckförare, lager- och logistikpersonal i Sverige. Snacka jobb, körningar, tips och branschfrågor.',
  openGraph: {
    title: 'DriverNord Logistikklubb',
    description:
      'Gratis nätverk för dig som jobbar inom transport, lager och logistik i Sverige.',
    url: 'https://drivernord.com/logistikklubb',
    siteName: 'DriverNord',
    locale: 'sv_SE',
    type: 'website',
  },
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-green-500 mb-4">
      {children}
    </p>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      className="w-5 h-5 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"
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
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-28 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-5">
          Gratis gemenskap för logistik-Sverige
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
          DriverNord Logistikklubb
        </h1>
        <p className="text-blue-200 text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
          Ett gratis nätverk för dig som jobbar inom transport, lager och logistik i Sverige.
          Här snackar vi om jobbet, vägarna, körningarna, vardagen, tipsen och framtida
          möjligheter i branschen.
        </p>
        <WhatsAppCTAButton
          url={WA_URL}
          label="Gå med i Logistikklubben"
          className="inline-flex items-center gap-2.5 bg-green-600 hover:bg-green-500 active:bg-green-700
                     text-white font-semibold text-base px-8 py-4 rounded-lg transition-colors shadow-md"
        />
        <p className="mt-5 text-blue-400 text-sm">
          Helt gratis. Du kan lämna gruppen när som helst.
        </p>
      </div>
    </section>
  );
}

// ─── Who it is for ────────────────────────────────────────────────────────────

const AUDIENCE = [
  {
    title: 'CE- och C-chaufförer',
    desc: 'Fjärrtransport, lokal distribution, kyl, tank, tipp — alla körningsstilar välkomna.',
  },
  {
    title: 'Truckförare och lagerarbetare',
    desc: 'Truckkort A, B, C eller D. Terminalarbete, gods- och lagerhantering.',
  },
  {
    title: 'Transportledare och logistikkoordinatorer',
    desc: 'Du som planerar, bokar och håller transporten rullande bakom kulisserna.',
  },
  {
    title: 'Yrkesförare under utbildning',
    desc: 'Studerar YKB, tar CE-kort eller är ny i branschen — välkommen att lyssna och lära.',
  },
  {
    title: 'Alla inom transport-Sverige',
    desc: 'Buss, gods, entreprenad, specialtransport — branschen är bred och alla hör hemma här.',
  },
];

function WhoItIsFor() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Vem är Logistikklubben till för?</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          Alla som jobbar med transport, lager och logistik i Sverige.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {AUDIENCE.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-5"
            >
              <p className="text-blue-900 font-semibold text-sm mb-1.5">{item.title}</p>
              <p className="text-gray-600 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Value ────────────────────────────────────────────────────────────────────

const VALUE_ITEMS = [
  'Snack om jobbet — körningar, åkerier, uppdrag och vardagen ute på vägarna',
  'Praktiska tips om YKB, körkortsfrågor, regler och rättigheter',
  'Erfarenheter och råd från kollegor som kör samma sträckor och körningar',
  'Marknadssignaler — var söks det förare, vad betalar de och vilka åkerier är bra att jobba för',
  'Branschfrågor, debatter och det som händer i transport-Sverige',
  'Information från DriverNord om möjligheter, öppna tjänster och matchningar',
];

function Value() {
  return (
    <section className="bg-blue-50 border-y border-blue-100">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Vad händer i Logistikklubben?</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-10">
          Branschsnack, tips och gemenskap — inte rekrytering.
        </h2>
        <ul className="space-y-4 max-w-2xl">
          {VALUE_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckIcon />
              <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Rules ────────────────────────────────────────────────────────────────────

const RULES = [
  'Respektfullt bemötande — alla är välkomna oavsett bakgrund, kön eller erfarenhetsnivå.',
  'Inget spam, ingen reklam och inga säljpitchar utan DriverNords godkännande.',
  'Inga personangrepp — kritisera gärna idéer men aldrig personen.',
  'Dela inte personuppgifter om andra utan deras medgivande.',
  'DriverNord modererar gruppen och förbehåller sig rätten att ta bort inlägg eller stänga av medlemmar som bryter mot reglerna.',
];

function Rules() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <Eyebrow>Regler och spelregler</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-10">
          En respektfull gemenskap för alla i branschen.
        </h2>
        <ul className="space-y-4 max-w-2xl">
          {RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                i
              </span>
              <span className="text-gray-700 text-sm leading-relaxed">{rule}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-gray-500 text-xs leading-relaxed max-w-xl">
          Frågor om gruppen? Kontakta oss på{' '}
          <a href="mailto:hej@drivernord.com" className="text-blue-600 hover:underline">
            hej@drivernord.com
          </a>
        </p>
      </div>
    </section>
  );
}

// ─── Bottom CTA ───────────────────────────────────────────────────────────────

function BottomCTA() {
  return (
    <section className="bg-blue-900">
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-24 text-center">
        <Eyebrow>Gratis — alltid</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Gå med i DriverNord Logistikklubb idag.
        </h2>
        <p className="text-blue-300 text-base leading-relaxed mb-10 max-w-lg mx-auto">
          Klicka på knappen nedan så öppnas WhatsApp direkt med en inbjudan till gruppen.
          Helt gratis, ingen registrering krävs.
        </p>
        <WhatsAppCTAButton
          url={WA_URL}
          label="Gå med via WhatsApp"
          className="inline-flex items-center gap-2.5 bg-green-600 hover:bg-green-500 active:bg-green-700
                     text-white font-semibold text-base px-8 py-4 rounded-lg transition-colors shadow-md"
        />
        <p className="mt-6 text-blue-500 text-xs">
          Är du CE- eller C-förare och vill bli matchad med åkerier?{' '}
          <Link href="/chat" className="text-blue-400 hover:text-white underline transition-colors">
            Registrera din profil här
          </Link>{' '}
          — tar 3 minuter.
        </p>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LogistikklubbPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <CommunityTracker />
      <PublicHeader />
      <main className="flex-1">
        <Hero />
        <WhoItIsFor />
        <Value />
        <Rules />
        <BottomCTA />
      </main>
      <LegalFooter />
    </div>
  );
}
