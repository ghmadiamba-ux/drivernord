// lib/facebookPageClient.ts
//
// Low-level Facebook Graph API client for Page feed publishing.
// Used exclusively by FacebookPagePublisherAdapter in logistikklubbPublisher.ts.
//
// BOUNDARIES:
//   ✓ POSTs text messages to a Facebook Page feed via /v{version}/{pageId}/feed
//   ✓ Redacts access token from all error output before returning
//   ✗ Does NOT read comments, reactions, or any user data
//   ✗ Does NOT post to Groups, Messenger, Instagram, or any other channel
//   ✗ Does NOT store or log the raw access token
//
// No external dependencies — uses the native fetch API only.

export interface FacebookPageClientConfig {
  pageId:      string;
  accessToken: string;
  apiVersion:  string;
}

export type FacebookPostResult =
  | { ok: true;  postId: string }
  | { ok: false; errorCode: number; errorMessage: string };

// POST /v{apiVersion}/{pageId}/feed
// Publishes a text message to the Facebook Page.
// Timeout: 10 seconds. Token is never included in returned error messages.
export async function postToFacebookPage(
  message: string,
  config:  FacebookPageClientConfig,
): Promise<FacebookPostResult> {
  const { pageId, accessToken, apiVersion } = config;
  const url = `https://graph.facebook.com/${apiVersion}/${pageId}/feed`;

  let response: Response;
  try {
    response = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body:   JSON.stringify({ message }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return {
      ok:           false,
      errorCode:    0,
      errorMessage: redactToken(raw, accessToken),
    };
  }

  if (response.ok) {
    let postId = '';
    try {
      const body = await response.json() as { id?: string };
      postId = body.id ?? '';
    } catch {
      // JSON parse failure after a 2xx — treat as success with empty postId
    }
    return { ok: true, postId };
  }

  // HTTP error — parse Meta error body when possible
  let errorCode    = response.status;
  let errorMessage = `HTTP ${response.status}`;
  try {
    const body = await response.json() as {
      error?: { code?: number; message?: string };
    };
    if (body.error) {
      errorCode    = body.error.code    ?? response.status;
      errorMessage = body.error.message ?? errorMessage;
    }
  } catch {
    // Body is not JSON — keep HTTP status defaults
  }

  return {
    ok:           false,
    errorCode,
    errorMessage: redactToken(errorMessage, accessToken),
  };
}

// Remove the raw token value from any string before it leaves this module.
// Called on all error paths where the token might appear.
export function redactToken(text: string, token: string): string {
  if (!token || !text.includes(token)) return text;
  return text.split(token).join('[REDACTED]');
}
