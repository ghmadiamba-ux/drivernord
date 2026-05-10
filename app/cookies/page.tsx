import type { Metadata } from 'next';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'Cookiepolicy — DriverNord',
  description: 'Information om hur DriverNord använder cookies.',
};

const COOKIES_TABLE = [
  {
    name: 'recruiter_session',
    purpose: 'Autentisering för rekryteringsverktyget (cockpit)',
    duration: '7 dagar',
    type: 'Nödvändig',
    notes: 'HTTP-only. Sätts aldrig på chaufförsflödet. Används aldrig för spårning.',
  },
];

const SECTIONS = [
  {
    heading: '1. Vad är cookies?',
    body: 'Cookies är små textfiler som lagras i din webbläsare när du besöker en webbplats. De används för att komma ihåg information mellan sidbesök — till exempel att du är inloggad.',
  },
  {
    heading: '2. Cookies vi använder',
    body: 'DriverNord använder ett minimum av cookies. Vi använder inga analytics-cookies, inga marknadsföringscookies och inga spårningscookies. Se tabellen nedan.',
  },
  {
    heading: '3. Tekniska cookies (Next.js)',
    body: 'Ramverket vi bygger med (Next.js) kan sätta kortlivade tekniska cookies för routning och sidnavigation. Dessa lagrar ingen personlig information och är inte spårningscookies.',
  },
  {
    heading: '4. Tredjeparts-cookies',
    body: 'DriverNord integrerar för närvarande inga tredjepartstjänster (Google Analytics, Facebook Pixel, etc.) som sätter egna cookies. Om detta förändras uppdateras denna policy och en samtyckesbanner läggs till.',
  },
  {
    heading: '5. Hantera cookies',
    body: 'Du kan när som helst rensa cookies i din webbläsares inställningar. Att rensa recruiter_session-cookien loggar ut dig från cockpit. Att rensa tekniska cookies påverkar inte din upplevelse som chaufför.',
  },
  {
    heading: '6. Ändringar',
    body: 'Vi förbehåller oss rätten att uppdatera denna cookiepolicy. Senaste version finns alltid på drivernord.com/cookies.',
  },
];

export default function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1 bg-white">
        <div className="max-w-3xl mx-auto px-5 py-16 md:py-20">

          {/* Header */}
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-3">
              Juridik
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Cookiepolicy</h1>
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <span className="text-amber-700 text-xs font-semibold">Preliminär version</span>
              <span className="text-amber-600 text-xs">— uppdateras löpande</span>
            </div>
          </div>

          {/* Cookie table */}
          <div className="mb-12 overflow-x-auto">
            <p className="text-sm font-semibold text-gray-900 mb-3">Aktiva cookies</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2.5 pr-4 font-semibold text-gray-700">Namn</th>
                  <th className="text-left py-2.5 pr-4 font-semibold text-gray-700">Syfte</th>
                  <th className="text-left py-2.5 pr-4 font-semibold text-gray-700">Livslängd</th>
                  <th className="text-left py-2.5 pr-4 font-semibold text-gray-700">Typ</th>
                </tr>
              </thead>
              <tbody>
                {COOKIES_TABLE.map((c) => (
                  <tr key={c.name} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-mono text-blue-700">{c.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{c.purpose}</td>
                    <td className="py-3 pr-4 text-gray-600">{c.duration}</td>
                    <td className="py-3 pr-4 text-gray-600">{c.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">
              Ingen av DriverNords cookies används för spårning eller marknadsföring.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-10">
            {SECTIONS.map((s) => (
              <section key={s.heading}>
                <h2 className="text-base font-semibold text-gray-900 mb-2">{s.heading}</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{s.body}</p>
              </section>
            ))}
          </div>

          {/* Contact callout */}
          <div className="mt-14 border-t border-gray-100 pt-8">
            <p className="text-sm text-gray-500 leading-relaxed">
              Frågor om cookies:{' '}
              <a
                href="mailto:hej@drivernord.com"
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                hej@drivernord.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
