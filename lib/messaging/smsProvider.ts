// SMS provider abstraction.
// Provider is selected at runtime via SMS_PROVIDER env var.
// Currently supports: 46elks (https://46elks.com)
// Extend: add a new if-branch for your provider and handle credentials accordingly.
// Never called in client code — this file is server-only.

import type { MessagingProvider, SendMessageInput, SendMessageResult } from './types';

// ─── 46elks ──────────────────────────────────────────────────────────────────
// REST API: POST https://api.46elks.com/a1/sms
// Auth: HTTP Basic (API_KEY:API_SECRET)

async function sendVia46Elks(
  apiKey:     string,
  apiSecret:  string,
  fromNumber: string,
  { to, body }: SendMessageInput,
): Promise<SendMessageResult> {
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const formBody    = new URLSearchParams({ from: fromNumber, to, message: body });

  let res: Response;
  try {
    res = await fetch('https://api.46elks.com/a1/sms', {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });
  } catch (err) {
    return { ok: false, channel: 'sms', error: String(err) };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, channel: 'sms', error: `46elks HTTP ${res.status}: ${text}` };
  }

  const json = (await res.json()) as { id?: string };
  return { ok: true, channel: 'sms', messageId: json.id };
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createSmsProvider(): MessagingProvider {
  return {
    channel: 'sms',

    async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
      const provider   = process.env.SMS_PROVIDER;
      const apiKey     = process.env.SMS_API_KEY;
      const apiSecret  = process.env.SMS_API_SECRET;
      const fromNumber = process.env.SMS_FROM_NUMBER;

      if (!apiKey || !apiSecret || !fromNumber) {
        return { ok: false, channel: 'sms', error: 'missing_credentials' };
      }

      if (provider === '46elks') {
        return sendVia46Elks(apiKey, apiSecret, fromNumber, input);
      }

      return { ok: false, channel: 'sms', error: `unknown_provider: ${provider}` };
    },
  };
}
