# DriverNord — Email Triage Agent Implementation Roadmap

**Date:** 2026-05-17
**Current stage:** Stage 0 — Documentation and scaffolding

---

## Stage 0 — Documentation and Scaffolding (CURRENT)

**Status: IN PROGRESS — 2026-05-17**

**What is done:**
- `lib/emailTriageAgent.ts` — pure TypeScript module (no external deps, no Zoho connection)
- `tests/emailTriageAgent.test.ts` — vitest test suite
- 8 documentation files in `docs/business/email-agent/`
- Operating model, taxonomy, compliance rules, and integration options documented

**What is not done:**
- No Zoho connection
- No real email reading
- No sending
- No Supabase schema
- No approval UI

**Blockers:**
- hej@drivernord.com incoming mail test still pending (founder action)
- hej@drivernord.com outgoing mail test still pending (founder action)
- DMARC record not yet added
- No Zoho app password created (not needed yet)
- `@anthropic-ai/sdk` not installed (agent uses heuristic classification for now)

---

## Stage 1 — Mock Email Classification Tests

**Goal:** Validate that the heuristic classifier correctly handles the test email scenarios defined in `email-agent-test-plan.md`.

**What is required:**
- `lib/emailTriageAgent.ts` complete ✓ (done in Stage 0)
- `tests/emailTriageAgent.test.ts` passing ✓ (done in Stage 0)
- Founder runs mock scenarios manually and reviews outputs

**What is not required:**
- Zoho connection
- Real emails
- Any credentials

**Exit criteria:**
- All test scenarios in `email-agent-test-plan.md` produce expected classifications
- Compliance flags trigger correctly
- `shouldAutoSend` is always false
- `requiresHumanApproval` is always true
- No forbidden claims appear in any draft

**Estimated effort:** 1–2 hours to review mock outputs

---

## Stage 2 — Copy-Paste Testing with Real Emails (Phase A Integration)

**Goal:** Test the agent on real emails received in hej@drivernord.com by manually copying email content into the agent.

**What is required:**
- hej@drivernord.com incoming mail test passed (founder action)
- A simple CLI harness or Next.js test page that accepts email input and calls `triageEmail()`
- First real emails in the inbox

**What is not required:**
- Zoho IMAP credentials
- Any automated connection to Zoho
- Any approval UI

**Procedure:**
1. Founder opens Zoho Mail in browser
2. For each new email: copies from, subject, body
3. Pastes into CLI/test page
4. Reviews agent output (classification, draft, flags)
5. Notes errors or misclassifications
6. Improves heuristics in `lib/emailTriageAgent.ts` if needed

**Exit criteria:**
- At least 10 real emails processed
- Founder agrees classification accuracy is acceptable for their use case
- No compliance violations in any draft

**Estimated effort:** 30 minutes to set up, ongoing as emails arrive

---

## Stage 3 — Simple Approval CLI or Test Harness

**Goal:** Give the founder a minimal interface to process emails and record decisions.

**What is required:**
- A simple Next.js page (admin-protected behind `recruiter_session` cookie) or CLI script
- Input: paste email → output: triage result
- Actions: Approve / Edit / Escalate / Ignore
- Log to file or console

**What is not required:**
- Zoho IMAP
- Supabase (log to file in V1)
- Any automated processing

**Estimated effort:** 4–8 hours

---

## Stage 4 — Zoho IMAP Read-Only Connection (Phase B Integration)

**Goal:** Agent automatically fetches new emails from hej@drivernord.com via IMAP — no manual copy-paste.

**Prerequisites:**
- Stage 2 complete and classification validated
- Zoho app password created and stored securely
- `ZOHO_APP_PASSWORD` added to `.env.local` (not committed)
- Founder explicitly authorizes IMAP integration
- `imapflow` or similar IMAP library installed

**New code:**
- `lib/email/zohoImapFetcher.ts` — IMAP client
- Poll interval: configurable via `ZOHO_IMAP_POLL_INTERVAL_SECONDS`

**Exit criteria:**
- New emails automatically fetched and classified
- Founder reviews in the Stage 3 UI
- No emails missed, no duplicates

**Estimated effort:** 8–16 hours

---

## Stage 5 — Draft Generation and Founder Approval Workflow

**Goal:** Approved drafts are surfaced clearly to the founder in a review interface. Founder edits and confirms with one click.

**Prerequisites:**
- Stage 4 complete
- Approval UI from Stage 3 extended to support email-level review
- Draft quality validated on 50+ real emails

**New code:**
- Extended approval UI
- Log approved/rejected status to file or Supabase

**Estimated effort:** 8–16 hours

---

## Stage 6 — Optional: SMTP Draft Creation (Phase C Integration)

**Goal:** Approved drafts are created as Draft emails in Zoho, so the founder only needs to open Zoho and click Send — no copy-paste required.

**Prerequisites:**
- Stage 5 complete
- Founder explicitly authorizes SMTP draft creation
- Nodemailer or equivalent SMTP library installed

**New code:**
- `lib/email/zohoDraftSender.ts`
- SMTP credentials reuse `ZOHO_APP_PASSWORD`

**Safety invariant:** `shouldAutoSend: false` — draft creation does not trigger sending.

**Estimated effort:** 4–8 hours

---

## Stage 7 — Optional: AI API Classification (Anthropic)

**Goal:** Replace heuristic classifier with Claude API calls for higher accuracy on ambiguous emails, especially Swedish language nuance.

**Prerequisites:**
- `@anthropic-ai/sdk` installed
- Anthropic API key stored securely
- Email body sanitization before API call (no PII in API payload)
- GDPR legal basis confirmed for sending email summaries to Anthropic

**New code:**
- `lib/email/aiClassifier.ts` — wraps Anthropic API with sanitization
- Fallback to heuristic classifier if API call fails

**Estimated effort:** 8–16 hours

---

## Stage 8 — Optional: Supabase Email Log

**Goal:** Persist triage results, approval decisions, and sent status in Supabase for analytics, GDPR audit trail, and future CRM features.

**Prerequisites:**
- Production Supabase deployment authorized
- Migration for `email_triage_log` table created and reviewed
- GDPR retention policy decided (how long to store email records)
- Founder explicitly authorizes Supabase email logging

**Proposed schema (future — do not create migration yet):**
```sql
email_triage_log (
  id            uuid primary key,
  received_at   timestamptz not null,
  from_address  text not null,
  subject       text,
  category      text not null,
  confidence    text not null,
  language      text not null,
  compliance_flags  text[],
  status        text not null,
  sent_at       timestamptz,
  founder_note  text,
  created_at    timestamptz default now()
)
```

**Note:** Raw email body should NOT be stored in Supabase in the initial version — only metadata. GDPR requires a legal basis and retention policy for storing personal communications.

**Estimated effort:** 4–8 hours

---

## Summary Timeline

| Stage | Description | Effort | Blocker |
|-------|-------------|--------|---------|
| 0 | Docs + scaffolding | DONE | — |
| 1 | Mock tests | 1–2h | None |
| 2 | Real email copy-paste | Ongoing | Mail tests must pass |
| 3 | Approval CLI/UI | 4–8h | None |
| 4 | IMAP read-only | 8–16h | App password, founder authorization |
| 5 | Approval workflow | 8–16h | Stage 4 |
| 6 | SMTP draft creation | 4–8h | Stage 5, founder auth |
| 7 | AI API classifier | 8–16h | SDK install, GDPR review |
| 8 | Supabase log | 4–8h | Production deploy, GDPR policy |

---

*Version 1.0 — 2026-05-17 — Roadmap only. Stage 0 in progress.*
