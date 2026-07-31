import type { Metadata } from 'next';
import { PublicHeader } from '@/components/PublicHeader';
import { LegalFooter } from '@/components/LegalFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'Kontakt — DriverNord',
  description: 'Kontakta DriverNord med frågor om chaufförsregistrering, matchning av transportförare eller GDPR-ärenden. Ring 070-938 52 67 eller maila hej@drivernord.com.',
  openGraph: {
    title: 'Kontakt — DriverNord',
    description: 'Kontakta DriverNord via telefon eller e-post. Ring 070-938 52 67 eller maila hej@drivernord.com.',
    url: 'https://drivernord.com/contact',
    siteName: 'DriverNord',
    locale: 'sv_SE',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Kontakt — DriverNord',
    description: 'Kontakta DriverNord via telefon eller e-post. Ring 070-938 52 67 eller maila hej@drivernord.com.',
  },
};

const TOPIC_ITEMS = [
  {
    label: 'Chaufförer',
    description:
      'Frågor om din registrering, hur matchning fungerar, eller om du vill uppdatera eller radera din profil.',
  },
  {
    label: 'Transportföretag',
    description:
      'Frågor om tillgång till chaufförsprofiler, upplägg och kostnader. Vi berättar mer om hur ett samarbete ser ut.',
  },
  {
    label: 'Integritet och GDPR',
    description:
      'Begäran om tillgång till dina uppgifter, rättelse eller radering. Vi behandlar alla GDPR-ärenden inom 30 dagar.',
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
              Du kan kontakta oss via telefon eller e-post. Vi svarar vanligtvis inom 1–2 arbetsdagar.
            </p>
          </div>
        </section>

        {/* Primary contact channels */}
        <section className="bg-white">
          <div className="max-w-3xl mx-auto px-5 py-12 md:py-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">

              {/* Phone */}
              <a
                href="tel:+46709385267"
                className="group flex items-start gap-4 border border-blue-200 rounded-xl px-6 py-6 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <div>
                  <p className="text-blue-900 font-semibold text-sm mb-1">Telefon</p>
                  <p className="text-blue-700 font-bold text-lg">070-938 52 67</p>
                  <p className="text-gray-500 text-xs mt-1 leading-snug">
                    Om vi inte kan svara direkt, lämna ett kort meddelande — vi återkommer.
                  </p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:hej@drivernord.com"
                className="group flex items-start gap-4 border border-blue-200 rounded-xl px-6 py-6 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-blue-900 font-semibold text-sm mb-1">E-post</p>
                  <p className="text-blue-700 font-bold text-lg">hej@drivernord.com</p>
                  <p className="text-gray-500 text-xs mt-1 leading-snug">
                    Vi svarar inom 1–2 arbetsdagar. Ingen fråga är för liten.
                  </p>
                </div>
              </a>
            </div>

            {/* Topic breakdown */}
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Vad gäller det?
            </p>
            <div className="space-y-3">
              {TOPIC_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="border border-gray-200 rounded-xl px-6 py-5"
                >
                  <p className="text-blue-900 font-semibold text-sm mb-1">{item.label}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <LegalFooter />
    </div>
  );
}
