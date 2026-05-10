import type { Metadata } from 'next';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'Användarvillkor — DriverNord',
  description: 'Villkor för att använda DriverNords tjänster.',
};

const SECTIONS = [
  {
    heading: '1. Om tjänsten',
    body: 'DriverNord är en matchningstjänst som kopplar samman professionella chaufförer med transportföretag i Sverige. Tjänsten är tillgänglig via drivernord.com och är under aktiv utveckling.',
  },
  {
    heading: '2. Registrering som chaufför',
    body: 'Chaufförer registrerar sin profil frivilligt via tjänstens frågeflöde. Registreringen innebär att du godkänner att DriverNord sparar och använder dina uppgifter för matchning mot relevanta transportuppdrag. Du kan begära radering när som helst via hej@drivernord.com.',
  },
  {
    heading: '3. Krav på korrekthet',
    body: 'Du ansvarar för att de uppgifter du registrerar är korrekta och aktuella. Felaktiga uppgifter kan leda till att din profil inte matchas korrekt eller tas bort från systemet.',
  },
  {
    heading: '4. Ingen jobbgaranti',
    body: 'DriverNord är ett matchningssystem och kan inte garantera att du erbjuds ett uppdrag eller en anställning. Alla anställningar och uppdragsavtal tecknas direkt mellan chaufför och transportföretag. DriverNord är inte part i sådana avtal.',
  },
  {
    heading: '5. Tillgång till plattformen (företag)',
    body: 'Transportföretag som ges tillgång till DriverNords plattform och chaufförsprofiler gör det under förutsättning av ett separat avtal med DriverNord. Obehörig åtkomst eller missbruk av plattformen är förbjudet.',
  },
  {
    heading: '6. Ansvarsbegränsning',
    body: 'DriverNord är ett förmedlingssystem utan arbetsgivaransvar. Vi ansvarar inte för beslut som tas av transportföretag baserat på profiler i systemet, för uteblivna matchningar eller för eventuella avbrott i tjänsten under teknisk drift.',
  },
  {
    heading: '7. Ändringar av villkor',
    body: 'Vi förbehåller oss rätten att uppdatera dessa villkor. Senaste version finns alltid på drivernord.com/terms. Väsentliga ändringar kommuniceras via e-post till registrerade användare som lämnat sin e-postadress.',
  },
  {
    heading: '8. Tillämplig lag',
    body: 'Dessa villkor regleras av svensk rätt. Eventuella tvister ska i första hand lösas i samförstånd. I andra hand gäller svensk domstols behörighet.',
  },
  {
    heading: '9. Kontakt',
    body: 'Frågor om dessa villkor skickas till hej@drivernord.com.',
  },
];

export default function TermsPage() {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Användarvillkor</h1>
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <span className="text-amber-700 text-xs font-semibold">Preliminär version</span>
              <span className="text-amber-600 text-xs">— uppdateras löpande</span>
            </div>
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
              Frågor om dessa villkor:{' '}
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
