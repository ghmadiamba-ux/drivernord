import type { Metadata } from 'next';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'Kontakt — DriverNord',
  description: 'Kontakta DriverNord för frågor om chaufförsregistrering, transportrekrytering eller integritetsfrågor.',
};

const CONTACT_ITEMS = [
  {
    label: 'Chaufförer',
    description:
      'Frågor om din registrering, hur matchning fungerar, eller om du vill uppdatera eller radera din profil.',
    cta: 'hej@drivernord.com',
  },
  {
    label: 'Transportföretag',
    description:
      'Frågor om tillgång till chaufförsprofiler, upplägg och kostnader. Vi svarar och berättar mer om hur ett samarbete ser ut.',
    cta: 'hej@drivernord.com',
  },
  {
    label: 'Integritet och GDPR',
    description:
      'Begäran om tillgång till dina uppgifter, rättelse eller radering. Vi behandlar alla GDPR-ärenden inom 30 dagar.',
    cta: 'hej@drivernord.com',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1">

        {/* Hero */}
        <section className="bg-blue-900">
          <div className="max-w-3xl mx-auto px-5 py-20 md:py-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-5">
              Kontakt
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
              Kontakta DriverNord.
            </h1>
            <p className="text-blue-200 text-base leading-relaxed">
              Vi svarar vanligtvis inom 1–2 arbetsdagar.
            </p>
          </div>
        </section>

        {/* Contact cards */}
        <section className="bg-white">
          <div className="max-w-3xl mx-auto px-5 py-16 md:py-20">
            <div className="space-y-4">
              {CONTACT_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="border border-gray-200 rounded-xl px-6 py-6"
                >
                  <p className="text-blue-900 font-semibold text-sm mb-2">{item.label}</p>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {item.description}
                  </p>
                  <a
                    href={`mailto:${item.cta}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {item.cta}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Note */}
        <section className="bg-blue-50 border-t border-blue-100">
          <div className="max-w-3xl mx-auto px-5 py-10">
            <p className="text-sm text-gray-500 leading-relaxed">
              DriverNord är ett litet team under aktiv uppbyggnad. Vi har inget telefonkontor och
              svarar på alla ärenden via e-post. Ingen fråga är för liten.
            </p>
          </div>
        </section>

      </main>

      <LegalFooter />
    </div>
  );
}
