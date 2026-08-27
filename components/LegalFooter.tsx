import Link from 'next/link';

export function LegalFooter() {
  return (
    <footer className="bg-blue-900 border-t border-blue-800">
      <div className="max-w-5xl mx-auto px-5 pt-12 pb-8">

        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-white font-bold text-base hover:text-blue-200 transition-colors">
              DriverNord Bemanning
            </Link>
            <p className="text-blue-400 text-xs leading-relaxed mt-2">
              Snabb och kontrollerad bemanning för transport och logistik — från lagergolv till förarplats.
            </p>
          </div>

          {/* Bemanning */}
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-3">
              Bemanning
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/#lagerbemanning" className="text-blue-400 hover:text-white text-sm transition-colors">
                  Lagerbemanning
                </Link>
              </li>
              <li>
                <Link href="/#forarbemanning" className="text-blue-400 hover:text-white text-sm transition-colors">
                  Förarbemanning
                </Link>
              </li>
              <li>
                <Link href="/#logistikbemanning" className="text-blue-400 hover:text-white text-sm transition-colors">
                  Logistikbemanning
                </Link>
              </li>
            </ul>
          </div>

          {/* Arbetstagare */}
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-3">
              Arbetstagare
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/chaufforer" className="text-blue-400 hover:text-white text-sm transition-colors">
                  För arbetstagare
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
                  Så arbetar vi
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
            <p>DriverNord Bemanning © 2026</p>
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
