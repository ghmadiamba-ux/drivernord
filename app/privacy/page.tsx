import type { Metadata } from 'next';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'Integritetspolicy — DriverNord',
  description:
    'Hur DriverNord samlar in, använder och skyddar dina personuppgifter. GDPR-rättigheter, cookieanvändning och hantering av chaufförsprofiler förklaras här.',
  openGraph: {
    title: 'Integritetspolicy — DriverNord',
    description: 'Hur DriverNord samlar in, använder och skyddar dina personuppgifter i enlighet med GDPR.',
    url: 'https://drivernord.com/privacy',
    siteName: 'DriverNord',
    locale: 'sv_SE',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Integritetspolicy — DriverNord',
    description: 'Hur DriverNord samlar in, använder och skyddar dina personuppgifter i enlighet med GDPR.',
  },
};

const SECTIONS = [
  {
    heading: '1. Personuppgiftsansvarig',
    body: 'DriverNord ansvarar för behandlingen av personuppgifter som samlas in via tjänsten. Organisationsnummer och registrerad adress publiceras här när det finns tillgängligt. Kontakt: hej@drivernord.com.',
  },
  {
    heading: '2. Uppgifter vi samlar in',
    body: 'När du registrerar din profil som chaufför samlar vi in: förnamn, telefonnummer, e-postadress (frivillig), körkortsklass (C, CE eller D), YKB-status, förarkortstyp, tillgänglighet och region/stad. Vi samlar inte in personnummer, CV-dokument eller annan känslig information.',
  },
  {
    heading: '3. Hur vi använder dina uppgifter',
    body: 'Dina uppgifter används för att matcha din profil mot transportföretag som söker kvalificerade chaufförer. Vi kan dela din profil med relevanta transportföretag i matchningssyfte. Vi skickar inte reklam till dig. Kontakt sker av DriverNords koordinatorer eller av transportföretaget direkt.',
  },
  {
    heading: '4. SMS och kontakt',
    body: 'DriverNord har för närvarande inget aktivt automatiserat SMS-system. Kontakt med registrerade chaufförer sker via koordinatorer baserat på profil och matchning. Om detta förändras uppdateras denna policy.',
  },
  {
    heading: '5. Lagringstid',
    body: 'Dina uppgifter sparas tills du begär radering. Vi utvärderar löpande om uppgifterna fortfarande är relevanta för matchningssyftet. Uppgifter som inte längre är relevanta raderas.',
  },
  {
    heading: '6. Dina rättigheter (GDPR)',
    body: 'Du har rätt att begära tillgång till de uppgifter vi har om dig, rätt till rättelse av felaktiga uppgifter, rätt att begära radering ("rätten att bli bortglömd"), rätt att invända mot behandling samt rätt att inge klagomål till Integritetsskyddsmyndigheten (IMY). Kontakta oss via hej@drivernord.com för alla GDPR-ärenden. Vi svarar inom 30 dagar.',
  },
  {
    heading: '7. Tredjeparter',
    body: 'Dina profiluppgifter (körkortsklass, region, tillgänglighet) delas med transportföretag i matchningssyfte. Inga uppgifter säljs. Om du godkänner marknadsföringscookies används Meta Pixel (Meta Platforms Ireland Ltd) för att mäta effekten av vår marknadsföring — inga personuppgifter från din chaufförsprofil skickas till Meta. Teknisk infrastruktur levereras av externa leverantörer inom EU/EES eller med adekvata skyddsåtgärder.',
  },
  {
    heading: '8. Cookies och spårning',
    body: 'Vi frågar om ditt samtycke innan vi använder icke-nödvändiga cookies. Nödvändiga cookies krävs för att tjänsten ska fungera. Om du godkänner marknadsföringscookies via vår cookiebanner används Meta Pixel — ett spårningsverktyg från Meta Platforms Ireland Ltd (Facebook/Instagram) — för att mäta hur vår marknadsföring fungerar. Meta Pixel registrerar besök och händelser på vår webbplats och skickar dessa som anonyma mätdata till Meta. Ditt namn, telefonnummer eller e-postadress skickas inte till Meta. Du kan när som helst ändra dina cookieinställningar via länken "Hantera cookieinställningar" i sidfoten. Se även /cookies för detaljer.',
  },
  {
    heading: '9. Ändringar',
    body: 'Vi förbehåller oss rätten att uppdatera denna integritetspolicy. Senaste version finns alltid på drivernord.com/privacy. Väsentliga ändringar kommuniceras via e-post till registrerade användare som lämnat sin e-postadress.',
  },
];

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Integritetspolicy</h1>
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
              Frågor om denna policy eller GDPR-ärenden:{' '}
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
