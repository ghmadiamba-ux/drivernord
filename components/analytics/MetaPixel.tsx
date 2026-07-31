'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { isPixelEnabled } from '@/lib/analytics/metaPixel';
import { hasMarketingConsent } from '@/lib/consent/cookieConsent';

/**
 * Mounts the Meta Pixel base code and fires the initial PageView.
 *
 * Loads only when ALL three conditions are true:
 *   1. NEXT_PUBLIC_META_PIXEL_ENABLED === 'true'
 *   2. NEXT_PUBLIC_META_PIXEL_ID is set
 *   3. Visitor has given marketing cookie consent (dn_cookie_consent.marketing === true)
 *
 * Consent is read from localStorage via hasMarketingConsent() after mount.
 * Listens for 'dn:consentChanged' so the Pixel activates without a page reload
 * when the visitor accepts the cookie banner mid-session.
 *
 * Mount once in app/layout.tsx.
 */
export function MetaPixel() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    function checkConsent() {
      setConsentGranted(hasMarketingConsent());
    }
    checkConsent();
    window.addEventListener('dn:consentChanged', checkConsent);
    return () => window.removeEventListener('dn:consentChanged', checkConsent);
  }, []);

  if (!isPixelEnabled() || !consentGranted) return null;

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID as string;

  return (
    <>
      <Script
        id="meta-pixel-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s){
              if(f.fbq)return;
              n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
              t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)
            }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${pixelId}');
            fbq('track','PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
