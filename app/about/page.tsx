import type { Metadata } from 'next';
import Image from 'next/image';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'Om DriverNord — matchningstjänst för chaufförer och transportföretag',
  description:
    'DriverNord matchar professionella CE-, C- och D-chaufförer med transportföretag i Sverige. Ingen bemanning — direktkontakt med kvalificerade förare med giltig YKB.',
  openGraph: {
    title: 'Om DriverNord — matchningstjänst för chaufförer och transportföretag',
    description: 'DriverNord matchar professionella CE-, C- och D-chaufförer med transportföretag i Sverige. Ingen bemanning — direktkontakt med kvalificerade förare med giltig YKB.',
    url: 'https://drivernord.com/about',
    siteName: 'DriverNord',
    locale: 'sv_SE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Om DriverNord — matchningstjänst för chaufförer och transportföretag',
    description: 'DriverNord matchar professionella CE-, C- och D-chaufförer med transportföretag i Sverige. Ingen bemanning — direktkontakt med kvalificerade förare med giltig YKB.',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1">

        {/* Hero */}
        <section className="bg-blue-900">
          <div className="max-w-3xl mx-auto px-5 py-20 md:py-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-5">
              Om oss
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
              Vi förenklar rekrytering av yrkeschaufförer.
            </h1>
            <p className="text-blue-200 text-base md:text-lg leading-relaxed max-w-xl">
              DriverNord är en svensk matchningstjänst för professionella chaufförer och
              transportföretag. Vi samlar in och kvalificerar chaufförsprofiler — utan CV-krångel.
            </p>
          </div>
        </section>

        {/* Vad vi gör */}
        <section className="bg-white">
          <div className="max-w-3xl mx-auto px-5 py-16 md:py-20">
            <h2 className="text-xl font-bold text-blue-900 mb-6">Vad vi gör</h2>
            <div className="space-y-5 text-gray-700 text-base leading-relaxed">
              <p>
                Via ett kort frågeflöde samlar DriverNord in det som faktiskt spelar roll för en
                rekryterare inom tung transport: körkortsklass (C, CE, D), YKB-status, typ av
                körning, region och tillgänglighet. Ingen cv-uppladdning. Inget konto.
              </p>
              <p>
                Transportföretag som söker kvalificerade chaufförer kan ta del av strukturerade
                profiler via DriverNords plattform. Varje profil är klassificerad och klar för
                direktkontakt.
              </p>
              <p>
                Vi är ett litet team under aktiv utveckling. Tjänsten expanderar löpande.
              </p>
            </div>
          </div>
        </section>

        {/* Portrait — human moment between Vad vi gör and Varför vi finns */}
        <section className="bg-white">
          <div className="max-w-3xl mx-auto px-5 pb-4">
            <div className="relative rounded-2xl overflow-hidden bg-blue-100 aspect-[16/7]">
              <Image
                src="/images/about-portrait.jpg"
                alt="DriverNord-team i svensk transport- och logistikmiljö"
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 768px"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-900/15 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* Varför vi finns */}
        <section className="bg-blue-50 border-y border-blue-100">
          <div className="max-w-3xl mx-auto px-5 py-16 md:py-20">
            <h2 className="text-xl font-bold text-blue-900 mb-8">Varför vi finns</h2>
            <ul className="space-y-5">
              {[
                {
                  heading: 'Transportbranschen är inte byggd för vanliga jobbsajter.',
                  body:
                    'En CE-chaufför söker inte jobb via Monster. Branschens rekrytering sker via nätverk, bemanningsbyråer och direktkontakter — DriverNord gör det mer strukturerat.',
                },
                {
                  heading: 'Rekryterare lägger för mycket tid på fel saker.',
                  body:
                    'Att läsa ostrukturerade CV:n och kontakta kandidater som saknar YKB eller rätt körkort tar tid. Vi standardiserar profilen så att rekryteraren ser vad som spelar roll — direkt.',
                },
                {
                  heading: 'Chaufförer vill registrera sig snabbt, på mobilen.',
                  body:
                    'Registreringen tar cirka 2 minuter. Inget cv-skrivande. Profilen är klar för matchning direkt.',
                },
              ].map((item) => (
                <li key={item.heading} className="flex gap-4">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5" />
                  <div>
                    <p className="font-semibold text-blue-900 text-sm mb-1">{item.heading}</p>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Status */}
        <section className="bg-white">
          <div className="max-w-3xl mx-auto px-5 py-16 md:py-20">
            <h2 className="text-xl font-bold text-blue-900 mb-4">Status</h2>
            <p className="text-gray-600 text-base leading-relaxed mb-8">
              DriverNord är under aktiv utveckling. Vi tar in chaufförsprofiler, expanderar
              geografiskt och förbättrar matchningsflödet kontinuerligt.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-6 py-5">
              <p className="text-blue-900 font-semibold text-sm mb-2">Kontakt</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-1">
                Frågor om tjänsten, samarbeten eller din profil:{' '}
                <a
                  href="mailto:hej@drivernord.com"
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  hej@drivernord.com
                </a>
              </p>
              <p className="text-gray-600 text-sm leading-relaxed">
                Telefon:{' '}
                <a
                  href="tel:+46709385267"
                  className="text-blue-600 hover:text-blue-800 transition-colors font-medium"
                >
                  070-938 52 67
                </a>
              </p>
            </div>
          </div>
        </section>

      </main>

      <LegalFooter />
    </div>
  );
}
