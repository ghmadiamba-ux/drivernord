# DriverNord — Email Triage Agent Executive Summary

**Date:** 2026-05-17
**Status:** EMAIL_AGENT_ARCHITECTURE_READY_HUMAN_IN_LOOP
**Audience:** Founder and future Claude Code sessions

---

## Why DriverNord Needs an Email Agent

`hej@drivernord.com` is DriverNord's only inbound communication channel during V1. It is referenced on every public page of the website (privacy, terms, contact, cookies, company). Every driver inquiry, every company inquiry, every GDPR request, and every complaint will arrive here.

Without automation, the founder reads every email manually, classifies it manually, drafts a reply manually, and logs nothing. At volume this breaks down. With a triage agent, every email is:

- immediately classified
- summarized
- risk-checked against compliance rules
- responded to with a safe, pre-approved draft
- logged as a structured record

The founder is not replaced — they remain in the decision loop. The agent reduces the cognitive load per email from 5–10 minutes to 30 seconds: read the classification, read the draft, approve or edit, send.

---

## Current Mailbox Status (2026-05-17)

| Item | Status |
|------|--------|
| Domain drivernord.com verified in Zoho | DONE |
| Mailbox hej@drivernord.com created | DONE |
| MX records added to Vercel DNS | DONE |
| SPF record added to Vercel DNS | DONE |
| DKIM record added to Vercel DNS | DONE |
| Zoho DNS record verification | DONE |
| Incoming mail test | PENDING — founder action required |
| Outgoing mail test | PENDING — founder action required |
| DMARC record added | PENDING |
| Zoho app password created | PENDING — not required yet |
| IMAP integration active | PENDING — future stage |

The mailbox exists and DNS is configured. The agent is being built in parallel with the final mail tests.

---

## What the Agent Will Do

The Email Triage Agent processes incoming emails from hej@drivernord.com and returns:

1. **Category** — classifies the email into one of 8 categories (driver inquiry, company inquiry, legal/admin, etc.)
2. **Language detection** — Swedish or English, to route to correct reply language
3. **Summary** — one-sentence summary of the email's content and intent
4. **Extracted fields** — structured data pulled from free text (driver license, company need, driver count, etc.)
5. **Compliance flags** — alerts when the email contains content requiring careful handling (data deletion request, complaint, bemanning inquiry, suspicious content)
6. **Suggested next action** — a concrete instruction for the founder (e.g. "Invite driver to /chat flow", "Request company need details", "Escalate to lawyer")
7. **Draft reply** — a safe, compliant, pre-written response in the appropriate language
8. **Human approval gate** — `requiresHumanApproval: true` always, `shouldAutoSend: false` always

---

## What the Agent Must Not Do

| Action | Why |
|--------|-----|
| Send any email automatically | No sending without founder approval — ever |
| Read real emails without authorization | IMAP integration is a future stage requiring explicit founder approval |
| Store Zoho credentials in code or documentation | Security |
| Claim DriverNord officially verifies CE/YKB | False — self-reported only |
| Guarantee a job to a driver | Legal — no employment relationship |
| Describe DriverNord as bemanning/staffing | Legal — incorrect model, LPAf exposure |
| Share driver personal data in reply drafts | GDPR — no PII in draft content sent outside DriverNord systems |
| Auto-close legal/admin emails | Legal/GDPR — always requires human |
| Generate enthusiastic replies to spam | Waste of founder time |

---

## Why Human Approval Is Mandatory at Launch

1. **Brand risk** — An incorrect or non-compliant auto-reply to a company or driver could damage DriverNord's reputation before it has any
2. **Legal risk** — A reply that implies employment, guarantees, or bemanning activity creates legal exposure under LPAf
3. **GDPR risk** — An incorrect reply to a data subject request could trigger a Data Protection Authority investigation
4. **Trust calibration** — The founder must read enough emails to understand what the inbox contains before trusting classification outputs

The target state is not full automation — it is a 30-second approval loop per email, not a 5-minute manual process.

---

## How It Fits the AI-Driven Model

```
Incoming email
  └─► AI classifies, extracts, drafts
        └─► Human reads classification + draft (30 seconds)
              └─► Human approves / edits / rejects
                    └─► Human sends manually (or later: system sends on approval)
                          └─► AI logs outcome as structured record
                                └─► AI observes patterns over time → improves drafts
```

This follows the same pattern as the contact and follow-up agents:
- **suggest mode** = AI prepares, human decides (current phase)
- **hybrid mode** = AI handles clear cases automatically, human reviews edge cases (future)
- **auto mode** = not applicable at launch — may never be appropriate for email

---

## How It Fits Existing Architecture

The Email Triage Agent follows the same structural pattern as `lib/classify.ts`:
- Pure TypeScript functions, no async, no external dependencies
- Input type → structured output type
- Fully testable without mocks
- Consistent with the suggest/auto mode pattern from `contactAgent.ts` and `followUpAgent.ts`

It does not require `@anthropic-ai/sdk` (not installed). Classification is heuristic/rule-based for V1, with the architecture designed for AI API augmentation in a future stage when the SDK is available.

---

*Version 1.0 — 2026-05-17 — Architecture and scaffolding only. No Zoho credentials. No real email access. No auto-send.*
