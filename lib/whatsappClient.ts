// lib/whatsappClient.ts
//
// Meta WhatsApp Cloud API client for 1-to-1 founder relay notifications.
// Sends approved Meta template messages to a single configured recipient.
//
// RELAY PATTERN (current intended use):
//   The SENDER is a Meta Cloud API registered number (WHATSAPP_PHONE_NUMBER_ID).
//   The RECIPIENT (WHATSAPP_FOUNDER_PHONE) is the official DriverNord company
//   WhatsApp number (+46 70 938 52 67 / 46709385267, in WhatsApp Business app).
//   The sender and recipient are DIFFERENT numbers — the company number does NOT
//   need to be migrated to Cloud API to receive messages from a Cloud API sender.
//   The founder reads the relay message on the company WhatsApp, then manually
//   copies and posts to the Logistikklubben group.
//
// BOUNDARIES:
//   ✓ Sends ONLY to WHATSAPP_FOUNDER_PHONE (allowlist enforced in code)
//   ✓ Uses approved Meta utility template — no free-form business-initiated messages
//   ✓ Redacts WHATSAPP_ACCESS_TOKEN from all error output before returning
//   ✗ Does NOT send to WhatsApp groups
//   ✗ Does NOT expose or log WHATSAPP_ACCESS_TOKEN
//   ✗ Does NOT use unofficial WhatsApp Web automation
//   ✗ Never throws — all errors are caught and returned as WhatsAppSendResult
//
// Required env vars:
//   WHATSAPP_PHONE_NUMBER_ID  — Meta phone number ID for the Cloud API sender number
//                               (a separate registered number — NOT the company number)
//   WHATSAPP_ACCESS_TOKEN     — Meta system user token (long-lived; never log or return)
//   WHATSAPP_FOUNDER_PHONE    — relay recipient, international format without '+'.
//                               Set to 46709385267 for the company WhatsApp number.
//
// Optional env vars:
//   WHATSAPP_TEMPLATE_NAME      — defaults to 'logistikklubb_post_due'
//   WHATSAPP_TEMPLATE_LANGUAGE  — defaults to 'sv'
//   WHATSAPP_MAX_DAILY          — max notifications per UTC day (default: 10)

import { db } from './db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhatsAppSendInput {
  to:            string;
  template_name: string;
  language:      string;
  body_params:   string[];
}

export interface WhatsAppSendResult {
  success:    boolean;
  message_id: string | null;
  dry_run:    boolean;
  error:      string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const META_API_VERSION = 'v21.0';

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_ACCESS_TOKEN    &&
    process.env.WHATSAPP_FOUNDER_PHONE
  );
}

export function getWhatsAppFounderPhone(): string {
  return process.env.WHATSAPP_FOUNDER_PHONE ?? '';
}

export function getWhatsAppTemplateName(): string {
  return process.env.WHATSAPP_TEMPLATE_NAME ?? 'logistikklubb_post_due';
}

export function getWhatsAppTemplateLanguage(): string {
  return process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'sv';
}

export function getWhatsAppMaxDaily(): number {
  const raw = parseInt(process.env.WHATSAPP_MAX_DAILY ?? '10', 10);
  return isNaN(raw) || raw < 0 ? 10 : raw;
}

// ─── Rate guard ───────────────────────────────────────────────────────────────
// Counts WhatsApp founder_notification_sent entries in system_actions for today (UTC).
// Returns 0 on any DB error so that rate-limit failures are non-blocking.

export async function getWhatsAppTodayCount(): Promise<number> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  try {
    const { count, error } = await db
      .from('system_actions')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'founder_notification_sent')
      .gte('created_at', todayStart.toISOString())
      .filter('result->>channel', 'eq', 'whatsapp');

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Replaces the access token with [REDACTED] if it appears in an error string.
// Called on all strings before returning them to callers.
function redactToken(text: string): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token || !text.includes(token)) return text;
  return text.replace(token, '[REDACTED]');
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export async function sendWhatsAppTemplate(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
  if (!isWhatsAppConfigured()) {
    return {
      success:    false,
      message_id: null,
      dry_run:    true,
      error:      'WhatsApp not configured — dry_run active. Set WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_FOUNDER_PHONE.',
    };
  }

  // Allowlist guard — only the configured founder phone may receive messages
  const allowedPhone = getWhatsAppFounderPhone();
  if (input.to !== allowedPhone) {
    return {
      success:    false,
      message_id: null,
      dry_run:    false,
      error:      'Recipient not in allowlist — send blocked',
    };
  }

  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    const url = `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`;

    const components = input.body_params.length > 0 ? [
      {
        type:       'body',
        parameters: input.body_params.map((text) => ({ type: 'text', text })),
      },
    ] : [];

    const payload = {
      messaging_product: 'whatsapp',
      to:   input.to,
      type: 'template',
      template: {
        name:     input.template_name,
        language: { code: input.language },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        success:    false,
        message_id: null,
        dry_run:    false,
        error:      `Meta API HTTP ${res.status}: ${redactToken(text)}`,
      };
    }

    const data = await res.json() as { messages?: Array<{ id: string }> };
    const messageId = data.messages?.[0]?.id ?? null;

    return {
      success:    true,
      message_id: messageId,
      dry_run:    false,
      error:      null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success:    false,
      message_id: null,
      dry_run:    false,
      error:      redactToken(message),
    };
  }
}
