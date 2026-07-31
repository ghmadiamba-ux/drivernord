// lib/zohoMailClient.ts
// Zoho Mail API client (OAuth2, Zoho EU data center).
// Safe default: all functions return dry_run results when ZOHO_CLIENT_ID is not configured.
//
// Required env vars (Vercel + .env.local):
//   ZOHO_CLIENT_ID        — OAuth2 client ID from Zoho API Console
//   ZOHO_CLIENT_SECRET    — OAuth2 client secret
//   ZOHO_REFRESH_TOKEN    — long-lived refresh token (founder generates once)
//   ZOHO_ACCOUNT_ID       — Zoho mail account ID (numeric, from /api/accounts)
//   ZOHO_FROM_EMAIL       — hej@drivernord.com
//   ZOHO_FROM_NAME        — Ghislain Alexander Mad

export type ZohoEmailSource = 'zoho_api' | 'zoho_imap' | 'zoho_manual' | 'stub';

export interface ZohoSendInput {
  to:           string;
  subject:      string;
  body:         string;
  from_email:   string;
  from_name:    string;
  in_reply_to?: string;
  thread_id?:   string;
}

export interface ZohoSendResult {
  success:    boolean;
  message_id: string | null;
  dry_run:    boolean;
  error:      string | null;
}

export interface ZohoInboxMessage {
  message_id:  string;
  from:        string;
  subject:     string;
  body_text:   string;
  received_at: string;
  in_reply_to: string | null;
  thread_id:   string | null;
}

// Shape returned by Zoho Mail API GET /messages/view
interface ZohoApiMessage {
  messageId:    string;
  fromAddress:  string;
  subject:      string;
  summary?:     string;
  receivedTime: string;
  inReplyTo?:   string;
  threadId?:    string;
}

// Shape returned by Zoho Mail API POST /messages (send response)
interface ZohoSendApiResponse {
  data?: {
    messageId?: string;
  };
  status?: {
    code:        number;
    description: string;
  };
}

// Shape returned by Zoho Mail API GET /messages/view
interface ZohoMessagesApiResponse {
  data?: ZohoApiMessage[];
  status?: {
    code:        number;
    description: string;
  };
}

// ── Configuration ─────────────────────────────────────────────────────────────

const REQUIRED_ZOHO_ENV = [
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  'ZOHO_REFRESH_TOKEN',
  'ZOHO_ACCOUNT_ID',
  'ZOHO_FROM_EMAIL',
  'ZOHO_FROM_NAME',
] as const;

export interface ZohoConfigStatus {
  configured: boolean;
  missing_env: string[];
}

export function getZohoConfigStatus(): ZohoConfigStatus {
  const missing = REQUIRED_ZOHO_ENV.filter((k) => !process.env[k]);
  return { configured: missing.length === 0, missing_env: [...missing] };
}

export function isZohoConfigured(): boolean {
  return Boolean(
    process.env.ZOHO_CLIENT_ID &&
    process.env.ZOHO_CLIENT_SECRET &&
    process.env.ZOHO_REFRESH_TOKEN &&
    process.env.ZOHO_ACCOUNT_ID,
  );
}

export function getZohoFromEmail(): string {
  return process.env.ZOHO_FROM_EMAIL ?? 'hej@drivernord.com';
}

export function getZohoFromName(): string {
  return process.env.ZOHO_FROM_NAME ?? 'Ghislain Alexander Mad';
}

// ── OAuth2 token refresh ───────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     process.env.ZOHO_CLIENT_ID!,
    client_secret: process.env.ZOHO_CLIENT_SECRET!,
    refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
  });

  const res = await fetch('https://accounts.zoho.eu/oauth/v2/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho OAuth token refresh failed: HTTP ${res.status} — ${text}`);
  }

  const data = await res.json() as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) {
    throw new Error(
      `Zoho OAuth: no access_token in response — ${data.error ?? 'unknown'}: ${data.error_description ?? ''}`,
    );
  }

  return data.access_token;
}

// ── Send ──────────────────────────────────────────────────────────────────────

export async function sendEmailViaZoho(input: ZohoSendInput): Promise<ZohoSendResult> {
  if (!isZohoConfigured()) {
    return {
      success:    false,
      message_id: null,
      dry_run:    true,
      error:      'Zoho not configured — dry_run active. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ACCOUNT_ID in env.',
    };
  }

  try {
    const accessToken = await getAccessToken();
    const accountId   = process.env.ZOHO_ACCOUNT_ID!;

    const payload: Record<string, string> = {
      fromAddress: input.from_email,
      toAddress:   input.to,
      subject:     input.subject,
      content:     input.body,
      mailFormat:  'plaintext',
    };
    if (input.in_reply_to) payload['inReplyTo'] = input.in_reply_to;

    const res = await fetch(
      `https://mail.zoho.eu/api/accounts/${accountId}/messages`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return {
        success:    false,
        message_id: null,
        dry_run:    false,
        error:      `Zoho send failed: HTTP ${res.status} — ${text}`,
      };
    }

    const data = await res.json() as ZohoSendApiResponse;
    const messageId = data?.data?.messageId ?? null;

    return {
      success:    true,
      message_id: messageId,
      dry_run:    false,
      error:      null,
    };
  } catch (err) {
    return {
      success:    false,
      message_id: null,
      dry_run:    false,
      error:      err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Read inbox ────────────────────────────────────────────────────────────────

export async function readInboxReplies(since?: string): Promise<ZohoInboxMessage[]> {
  if (!isZohoConfigured()) return [];

  try {
    const accessToken = await getAccessToken();
    const accountId   = process.env.ZOHO_ACCOUNT_ID!;

    const params = new URLSearchParams({ folder: 'INBOX', limit: '50', sortorder: 'desc' });
    if (since) {
      params.set('receivedTime', String(new Date(since).getTime()));
    }

    const res = await fetch(
      `https://mail.zoho.eu/api/accounts/${accountId}/messages/view?${params.toString()}`,
      {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
      },
    );

    if (!res.ok) return [];

    const data = await res.json() as ZohoMessagesApiResponse;
    return (data?.data ?? []).map((m) => ({
      message_id:  m.messageId,
      from:        m.fromAddress,
      subject:     m.subject,
      body_text:   m.summary ?? '',
      received_at: m.receivedTime,
      in_reply_to: m.inReplyTo ?? null,
      thread_id:   m.threadId ?? null,
    }));
  } catch {
    return [];
  }
}

// ── Thread matching ───────────────────────────────────────────────────────────

export function isReplyToSentEmail(
  incoming: ZohoInboxMessage,
  sentMessageId: string,
): boolean {
  return incoming.in_reply_to === sentMessageId || incoming.thread_id === sentMessageId;
}
