import Link from 'next/link';

export function LegalFooter() {
  return (
    <footer className="bg-blue-900 border-t border-blue-800">
      <div className="max-w-5xl mx-auto px-5 pt-12 pb-8">

        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/chaufforer" className="text-white font-bold text-base hover:text-blue-200 transition-colors">
              DriverNord
            </Link>
            <p className="text-blue-400 text-xs leading-relaxed mt-2">
              Matchning av yrkeschaufförer och transportföretag i Sverige.
            </p>
          </div>

          {/* Chaufförer */}
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-3">
              Chaufförer
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/chaufforer" className="text-blue-400 hover:text-white text-sm transition-colors">
                  För chaufförer
                </Link>
              </li>
              <li>
                <Link href="/chat" className="text-blue-400 hover:text-white text-sm transition-colors">
                  Registrera dig
                </Link>
              </li>
              <li>
                <Link href="/logistikklubb" className="text-blue-400 hover:text-white text-sm transition-colors">
                  Logistikklubb
                </Link>
              </li>
            </ul>
          </div>

          {/* Företag */}
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-3">
              Företag
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/company" className="text-blue-400 hover:text-white text-sm transition-colors">
                  För företag
                </Link>
              </li>
              <li>
                <Link href="/company/ai-agenter" className="text-blue-400 hover:text-white text-sm transition-colors">
                  AI-agenter
                </Link>
              </li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-3">
              Information
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-blue-400 hover:text-white text-sm transition-colors">
                  Om oss
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-blue-400 hover:text-white text-sm transition-colors">
                  Kontakt
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-blue-400 hover:text-white text-sm transition-colors">
                  Integritetspolicy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-blue-400 hover:text-white text-sm transition-colors">
                  Villkor
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-blue-400 hover:text-white text-sm transition-colors">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal bottom bar */}
        <div className="border-t border-blue-800 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-blue-500 text-xs space-y-0.5">
            <p>DriverNord © 2025</p>
            <p>
              Org.nr:{' '}
              <span className="italic text-blue-600">[kommer snart]</span>
            </p>
            <p>
              Adress:{' '}
              <span className="italic text-blue-600">[kommer snart]</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="tel:+46709385267"
              className="text-blue-400 hover:text-white text-xs transition-colors"
            >
              070-938 52 67
            </a>
            <a
              href="mailto:hej@drivernord.com"
              className="text-blue-400 hover:text-white text-xs transition-colors"
            >
              hej@drivernord.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
