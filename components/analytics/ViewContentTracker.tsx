'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics/metaPixel';

/**
 * Fires a ViewContent event on mount.
 *
 * Mount once inside the /chaufforer Server Component page.
 * The event fires only if the Pixel is enabled and fbq is available.
 * No PII is sent — only the content category and name.
 */
export function ViewContentTracker() {
  useEffect(() => {
    trackEvent('ViewContent', {
      content_name: 'driver-landing',
      content_category: 'driver-acquisition',
    });
  }, []);

  return null;
}
