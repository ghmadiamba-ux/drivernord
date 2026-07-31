# DriverNord — Zoho Integration Options

**Date:** 2026-05-17
**Current phase:** Phase 1 (documentation + mock email tests)

---

## Overview

The Email Triage Agent processes emails from hej@drivernord.com. There are four technical paths to connect the agent to the Zoho mailbox. Each adds capability and complexity. The recommended approach is phased — start with the safest option and advance only when the previous stage is validated.

---

## Option A — Manual Export / Copy-Paste

**Description:** The founder reads emails in Zoho Mail, copies the text, and pastes it into a CLI or UI test harness that calls the agent.

**How it works:**
1. Founder opens Zoho Mail, reads new email
2. Copies: from address, subject, body
3. Pastes into agent input (CLI, terminal, or a simple Next.js form)
4. Agent returns classification + draft
5. Founder approves draft, copies into Zoho reply, sends manually

**Credentials required:** None (no programmatic access to Zoho)

**Code required:** Agent module only — no Zoho integration code

**Risks:** Zero. No credentials. No automated access. No sending.

**Limitations:**
- Manual — does not scale beyond ~20 emails/day
- No automatic email ingestion
- Copy errors possible if founder misses part of the email body

**When to use:** Now. This is the current recommended phase for testing the agent's classification and draft quality on real emails.

**Status: CURRENT PHASE**

---

## Option B — IMAP Read-Only Integration

**Description:** The agent connects to Zoho via IMAP (read-only) and fetches new emails automatically. No sending. The agent reads, classifies, and drafts — but all sending is still manual.

**How it works:**
1. A scheduled process (cron, Next.js API route, or CLI script) polls the IMAP inbox
2. Each new email is fetched and passed to the email triage agent
3. Agent returns classification + draft
4. Results are displayed to the founder in a simple review UI or logged to file
5. Founder manually sends approved replies via Zoho UI

**Credentials required:**
- Zoho App Password (generated in Zoho Account → Security → App Passwords)
- Must be stored in `.env.local` or Vercel Environment Variables — never committed to git
- Variable name: `ZOHO_APP_PASSWORD`

**Code required:**
- IMAP client library (e.g., `imapflow` — Node.js compatible)
- Email fetcher module: `lib/email/zohoImapFetcher.ts`
- Scheduled poll or webhook trigger

**Risks:** Low. Read-only access. Compromise of the app password allows reading emails — not sending. App password can be revoked instantly.

**Prerequisites:**
- hej@drivernord.com incoming mail test passes
- Zoho app password created and stored securely
- Founder explicitly authorizes IMAP integration

**Limitations:**
- IMAP polling adds latency (poll interval = minutes, not real-time)
- For real-time, Zoho webhooks or API is needed (Option D)

**When to use:** After Option A validates classification quality on real emails.

---

## Option C — IMAP + SMTP Draft Generation

**Description:** Option B plus the ability to create email drafts in Zoho programmatically via SMTP. The draft sits in Zoho's Drafts folder — the founder reviews it in Zoho and clicks Send manually.

**How it works:**
1. Same as Option B for reading
2. Additionally: when the agent generates an approved draft, it creates a draft reply in Zoho via SMTP
3. Founder opens Zoho Drafts folder, reviews the pre-written reply, edits if needed, clicks Send

**Credentials required:**
- `ZOHO_APP_PASSWORD` — same as Option B
- SMTP host: `smtp.zoho.eu`, port 587 (STARTTLS) or 465 (SSL)
- The app password serves both IMAP and SMTP

**Code required:**
- Option B code plus
- SMTP client (e.g., `nodemailer`) for draft creation
- Draft creation module: `lib/email/zohoDraftSender.ts`

**Risks:** Medium. SMTP access allows sending. Must remain approval-gated — no auto-send in this phase. If credentials are compromised, an attacker could send emails as hej@drivernord.com.

**Safety invariant:** `shouldAutoSend: false` must be enforced in code. Draft creation ≠ sending. The founder must manually click Send in Zoho.

**Prerequisites:**
- Option B running successfully for at least 1 week
- Founder explicitly authorizes draft creation

**When to use:** After Option B is stable and draft quality is validated.

---

## Option D — Zoho API Integration

**Description:** Full programmatic integration using the Zoho Mail API (OAuth 2.0). More robust than IMAP/SMTP — supports webhooks (real-time), folder management, thread handling, read/unread tracking, and future CRM integration.

**How it works:**
1. OAuth 2.0 app is registered in Zoho Developer Console
2. Access token + refresh token are stored securely
3. Zoho webhooks push new emails to a Next.js API endpoint in real-time
4. Agent processes and drafts immediately on receipt
5. Sending still requires founder approval

**Credentials required:**
- `ZOHO_CLIENT_ID` — OAuth app client ID
- `ZOHO_CLIENT_SECRET` — OAuth app client secret
- `ZOHO_REFRESH_TOKEN` — Long-lived refresh token
- All stored in Vercel Environment Variables — never committed

**Code required:**
- OAuth client: `lib/email/zohoAuth.ts`
- API client: `lib/email/zohoApiClient.ts`
- Webhook handler: `app/api/email/webhook/route.ts`
- Account ID: required for Zoho Mail API paths

**Risks:** Higher — OAuth tokens allow full mailbox access (read, write, send). Compromise is more damaging than IMAP/SMTP. Requires proper token rotation, secure storage, and webhook signature validation.

**Prerequisites:**
- Zoho Mail API subscription (check Zoho plan level)
- OAuth app registered in Zoho Developer Console
- Founder explicitly authorizes API integration
- Legal review of data handling via API

**When to use:** Future phase when volume justifies real-time processing.

---

## Recommended Phased Approach

| Phase | Option | What's active | Credentials | Sending |
|-------|--------|--------------|-------------|---------|
| 1 — Now | A | Agent module only, mock tests | None | Manual only |
| 2 — After mail tests pass | A | Copy-paste from real Zoho inbox | None | Manual only |
| 3 — After ~50 emails reviewed | B | IMAP read-only | App password | Manual only |
| 4 — After B stable | B | IMAP + draft quality validated | App password | Manual only |
| 5 — After founder approval | C | IMAP + SMTP draft creation | App password | Draft in Zoho, founder sends |
| 6 — Future, if volume justifies | D | Zoho API + webhooks | OAuth tokens | Draft in Zoho, founder sends |

Skipping phases is not recommended. Each phase validates the previous before adding complexity and credential exposure.

---

## How to Create a Zoho App Password

1. Log into Zoho Account: https://accounts.zoho.eu
2. Navigate to: Security → App Passwords
3. Click **Generate New App Password**
4. Name: `DriverNord IMAP Agent`
5. Copy the generated password — shown once only
6. Store immediately in your password manager
7. Add to `.env.local` as `ZOHO_APP_PASSWORD=<value>` (never commit this file)
8. In future: add to Vercel Dashboard as a server-only environment variable

**Never store the app password in:**
- Any file in the repository
- Any documentation file
- Any commit message
- Any public channel

---

## Environment Variable Summary (All Phases)

| Variable | Phase | Description | Secret? |
|----------|-------|-------------|---------|
| `ZOHO_APP_PASSWORD` | B, C | IMAP/SMTP authentication | YES — never commit |
| `ZOHO_CLIENT_ID` | D | OAuth app client ID | YES |
| `ZOHO_CLIENT_SECRET` | D | OAuth app client secret | YES |
| `ZOHO_REFRESH_TOKEN` | D | Long-lived OAuth token | YES |
| `AGENT_EMAIL_TRIAGE_ENABLED` | All | Kill switch for email triage | No |
| `AGENT_EMAIL_MODE` | All | suggest / hybrid (auto not used) | No |
| `ZOHO_MAILBOX` | B+ | `hej@drivernord.com` | No |
| `ZOHO_IMAP_HOST` | B+ | `imap.zoho.eu` | No |
| `ZOHO_SMTP_HOST` | C+ | `smtp.zoho.eu` | No |

---

*Version 1.0 — 2026-05-17 — Integration options documented. No Zoho credentials added. No connection attempted.*
