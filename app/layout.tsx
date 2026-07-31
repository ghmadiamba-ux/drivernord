import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MetaPixel } from '@/components/analytics/MetaPixel';
import { CookieConsentBanner } from '@/components/consent/CookieConsentBanner';

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'Driver Registration',
  description: 'Register as a professional driver in Sweden',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <MetaPixel />
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
