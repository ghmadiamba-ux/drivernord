'use client';

import { useState } from 'react';
import Link from 'next/link';

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-blue-100">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 leading-tight whitespace-nowrap">
          <span className="text-blue-900 font-bold text-base">DriverNord</span>{' '}
          <span className="text-blue-600 font-semibold text-base">Bemanning</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5 text-sm" aria-label="Huvudnavigation">
          <Link href="/company" className="text-gray-600 hover:text-blue-900 transition-colors">
            För företag
          </Link>
          <Link href="/lagerlucka" className="text-gray-600 hover:text-blue-900 transition-colors">
            Lagerlucka
          </Link>
          <Link href="/chaufforer" className="text-gray-600 hover:text-blue-900 transition-colors">
            För arbetstagare
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-blue-900 transition-colors">
            Kontakt
          </Link>
        </nav>

        {/* CTA + hamburger */}
        <div className="flex items-center gap-2">
          <Link
            href="/chaufforer"
            className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex-shrink-0"
          >
            Registrera dig
          </Link>
          <button
            className="md:hidden p-1.5 text-gray-500 hover:text-blue-900 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Stäng meny' : 'Öppna meny'}
            aria-expanded={open}
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden border-t border-blue-100 bg-white px-5 py-2 flex flex-col" aria-label="Mobilnavigation">
          <Link
            href="/company"
            className="text-sm text-gray-700 hover:text-blue-900 py-3 border-b border-gray-100 transition-colors"
            onClick={() => setOpen(false)}
          >
            För företag
          </Link>
          <Link
            href="/lagerlucka"
            className="text-sm text-gray-700 hover:text-blue-900 py-3 border-b border-gray-100 transition-colors"
            onClick={() => setOpen(false)}
          >
            Lagerlucka
          </Link>
          <Link
            href="/chaufforer"
            className="text-sm text-gray-700 hover:text-blue-900 py-3 border-b border-gray-100 transition-colors"
            onClick={() => setOpen(false)}
          >
            För arbetstagare
          </Link>
          <Link
            href="/lagerjobb"
            className="text-sm text-gray-700 hover:text-blue-900 py-3 border-b border-gray-100 transition-colors"
            onClick={() => setOpen(false)}
          >
            Lagerjobb
          </Link>
          <Link
            href="/contact"
            className="text-sm text-gray-700 hover:text-blue-900 py-3 border-b border-gray-100 transition-colors"
            onClick={() => setOpen(false)}
          >
            Kontakt
          </Link>
          <Link
            href="/logistikklubb"
            className="text-sm text-gray-700 hover:text-blue-900 py-3 transition-colors"
            onClick={() => setOpen(false)}
          >
            Logistikklubb
          </Link>
        </nav>
      )}
    </header>
  );
}
