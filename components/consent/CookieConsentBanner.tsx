'use client';

import { useState, useEffect } from 'react';
import {
  getCookieConsent,
  setCookieConsent,
  dispatchConsentChanged,
} from '@/lib/consent/cookieConsent';

/**
 * Cookie consent banner — appears on first visit when no consent is stored.
 * Swedish copy per cookie-banner-copy-sv.md (draft — pending GDPR lawyer review).
 *
 * "Acceptera alla"      → marketing=true, analytics=false → fires consentChanged event
 * "Endast nödvändiga"   → marketing=false, analytics=false → banner disappears
 *
 * Uses window event 'dn:consentChanged' so MetaPixel can react without page reload.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function acceptAll() {
    setCookieConsent(true, false);
    dispatchConsentChanged();
    setVisible(false);
  }

  function acceptNecessaryOnly() {
    setCookieConsent(false, false);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="dn-cookie-banner-title"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
    >
      <div className="max-w-5xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p
            id="dn-cookie-banner-title"
            className="text-sm font-semibold text-gray-900 mb-1"
          >
            Cookies på DriverNord
          </p>
          <p className="text-sm text-gray-600 leading-snug">
            Vi använder cookies för att förbättra vår tjänst och, om du godkänner, för att
            mäta hur vår marknadsföring fungerar med hjälp av Meta (Facebook). Vi delar inga
            personuppgifter om dig med Meta utan ditt samtycke.{' '}
            <a
              href="/privacy"
              className="underline text-blue-700 hover:text-blue-900"
            >
              Integritetspolicy
            </a>
            .
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            onClick={acceptNecessaryOnly}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Endast nödvändiga
          </button>
          <button
            onClick={acceptAll}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            Acceptera alla
          </button>
        </div>
      </div>
    </div>
  );
}
