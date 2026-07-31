'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics/metaPixel';

export function CommunityTracker() {
  useEffect(() => {
    trackEvent('DriverCommunityViewed');
  }, []);

  return null;
}
