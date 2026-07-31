// lib/smtpMailClient.ts
//
// Sends plain-text email via Zoho EU SMTP (smtppro.zoho.eu:587 STARTTLS).
// Uses a Zoho App Password — separate credential from OAuth; set independently.
//
// Required env var:
//   ZOHO_SMTP_PASSWORD — Zoho app password for hej@drivernord.com
//                        (Zoho Mail → Settings → Security → App Passwords)
//
// Optional env vars (inherit from existing Zoho config):
//   ZOHO_FROM_EMAIL   — defaults to hej@drivernord.com
//   ZOHO_FROM_NAME    — defaults to DriverNord
//
// Safe default: returns dry_run when ZOHO_SMTP_PASSWORD is not set.
// Never throws — all errors are caught and returned as SmtpSendResult.

import nodemailer from 'nodemailer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmtpSendInput {
  to:         string;
  subject:    string;
  body:       string;
  from_email: string;
  from_name:  string;
}

export interface SmtpSendResult {
  success:    boolean;
  message_id: string | null;
  dry_run:    boolean;
  error:      string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SMTP_HOST = 'smtppro.zoho.eu';
const SMTP_PORT = 587;

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.ZOHO_SMTP_PASSWORD);
}

export function getSmtpFromEmail(): string {
  return process.env.ZOHO_FROM_EMAIL ?? 'hej@drivernord.com';
}

export function getSmtpFromName(): string {
  return process.env.ZOHO_FROM_NAME ?? 'DriverNord';
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export async function sendEmailViaSmtp(input: SmtpSendInput): Promise<SmtpSendResult> {
  if (!isSmtpConfigured()) {
    return {
      success:    false,
      message_id: null,
      dry_run:    true,
      error:      'ZOHO_SMTP_PASSWORD not set — dry_run active. Add app password to env.',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host:   SMTP_HOST,
      port:   SMTP_PORT,
      secure: false,   // STARTTLS on 587 (same as Python batch runner)
      auth: {
        user: input.from_email,
        pass: process.env.ZOHO_SMTP_PASSWORD,
      },
      tls: { rejectUnauthorized: true },
    });

    const info = await transporter.sendMail({
      from:    `"${input.from_name}" <${input.from_email}>`,
      to:      input.to,
      subject: input.subject,
      text:    input.body,
    });

    return {
      success:    true,
      message_id: info.messageId ?? null,
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
