// Publisher adapter abstraction for Logistikklubb Agent V2.
// Default: ManualPublisherAdapter (copy-and-post workflow).
// Facebook: FacebookPagePublisherAdapter (official Graph API — enabled by FACEBOOK_PAGE_API_ENABLED).
// WhatsApp: WhatsAppGroupsPublisherAdapter (stub — official Groups API not yet available).
//
// SECURITY RULES:
//   WhatsApp auto-posting: only when WHATSAPP_GROUPS_API_ENABLED=true
//   Facebook auto-posting: only when FACEBOOK_PAGE_API_ENABLED=true
//   Both gates are independent. Enabling one does NOT enable the other.
//   The WhatsApp stub always returns adapter_disabled regardless of the gate.

import { db }                      from './db';
import { postToFacebookPage }       from './facebookPageClient';
import type { FacebookPageClientConfig } from './facebookPageClient';

export type PublishMethod = 'manual' | 'whatsapp_api' | 'facebook_page_api';

export type PublishResult =
  | { ok: true;  method: PublishMethod; postId?: string }
  | { ok: false; reason: 'manual_mode' | 'adapter_disabled' | 'api_error'; message: string };

export interface CommunityPublisherAdapter {
  publish(postId: string, postText: string): Promise<PublishResult>;
}

export class ManualPublisherAdapter implements CommunityPublisherAdapter {
  async publish(_postId: string, _postText: string): Promise<PublishResult> {
    return {
      ok:     false,
      reason: 'manual_mode',
      message: 'Manual posting required — copy text and post to WhatsApp group',
    };
  }
}

export class WhatsAppGroupsPublisherAdapter implements CommunityPublisherAdapter {
  async publish(_postId: string, _postText: string): Promise<PublishResult> {
    // Stub — WhatsApp official Groups API for businesses is not yet available.
    // Do NOT implement using unofficial browser automation or personal account APIs.
    return {
      ok:     false,
      reason: 'adapter_disabled',
      message: 'WhatsApp Groups API adapter not yet implemented',
    };
  }
}

export function isAutoPostEnabled(): boolean {
  return process.env.WHATSAPP_GROUPS_API_ENABLED === 'true';
}

export function getPublisherAdapter(): CommunityPublisherAdapter {
  if (isAutoPostEnabled()) {
    return new WhatsAppGroupsPublisherAdapter();
  }
  return new ManualPublisherAdapter();
}

// ─── Facebook Page adapter ─────────────────────────────────────────────────────
//
// Gate: FACEBOOK_PAGE_API_ENABLED must equal 'true' exactly.
// Required env vars: FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_API_VERSION.
// Rate limiting is enforced by the cron route using getFacebookDailyPostCount +
// isRateLimitReached before calling publish(). The adapter itself is a thin HTTP wrapper.
//
// SECURITY: Does NOT post to Groups, Messenger, or Instagram.
//           Does NOT log or expose the raw access token.
//           Posts appear on the DriverNord Facebook Page only.

export function isFacebookPagePostEnabled(): boolean {
  return process.env.FACEBOOK_PAGE_API_ENABLED === 'true';
}

// Maximum Facebook Page posts per calendar day (UTC). Defaults to 1.
export function getFacebookMaxPostsPerDay(): number {
  const raw = parseInt(process.env.FACEBOOK_MAX_POSTS_PER_DAY ?? '1', 10);
  return isNaN(raw) || raw < 0 ? 1 : raw;
}

// Pure guard — does NOT query DB. Called with the count already fetched.
export function isRateLimitReached(currentCount: number, maxPerDay: number): boolean {
  return currentCount >= maxPerDay;
}

// Count how many Facebook Page posts were successfully published today (UTC midnight).
// Reads system_actions — non-throwing, returns 0 on DB error.
export async function getFacebookDailyPostCount(): Promise<number> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await db
    .from('system_actions')
    .select('*', { count: 'exact', head: true })
    .eq('action_type', 'logistikklubb_facebook_page_post_published')
    .gte('created_at', todayStart.toISOString());

  if (error) {
    console.error('[facebookPublisher] getFacebookDailyPostCount error:', error.message);
    return 0;
  }

  return count ?? 0;
}

export class FacebookPagePublisherAdapter implements CommunityPublisherAdapter {
  async publish(_postId: string, postText: string): Promise<PublishResult> {
    const pageId      = process.env.FACEBOOK_PAGE_ID          ?? '';
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? '';
    const apiVersion  = process.env.FACEBOOK_API_VERSION       ?? 'v21.0';

    if (!pageId || !accessToken) {
      return {
        ok:      false,
        reason:  'adapter_disabled',
        message: 'FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN not configured',
      };
    }

    const config: FacebookPageClientConfig = { pageId, accessToken, apiVersion };
    const result = await postToFacebookPage(postText, config);

    if (result.ok) {
      return { ok: true, method: 'facebook_page_api', postId: result.postId };
    }

    return {
      ok:      false,
      reason:  'api_error',
      message: `Facebook API error ${result.errorCode}: ${result.errorMessage}`,
    };
  }
}

export function getFacebookPageAdapter(): CommunityPublisherAdapter {
  if (isFacebookPagePostEnabled()) {
    return new FacebookPagePublisherAdapter();
  }
  return new ManualPublisherAdapter();
}
