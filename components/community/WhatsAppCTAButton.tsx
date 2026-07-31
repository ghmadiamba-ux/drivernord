'use client';

import { trackEvent } from '@/lib/analytics/metaPixel';
import type { PixelEvent } from '@/lib/analytics/metaPixel';

interface Props {
  url: string;
  label?: string;
  className?: string;
  eventName?: Extract<PixelEvent, 'DriverCommunityClicked' | 'DriverCommunityCTAAfterIntakeClicked'>;
}

export function WhatsAppCTAButton({
  url,
  label = 'Gå med i DriverNord Logistikklubb',
  className,
  eventName = 'DriverCommunityClicked',
}: Props) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent(eventName)}
      className={className}
    >
      {label}
    </a>
  );
}
