# DriverNord — Email Agent Compliance Rules

**Date:** 2026-05-17
**Authority:** These rules are non-negotiable and must be enforced in every version of the agent.

---

## Why Compliance Rules Exist

DriverNord operates in a legally sensitive space:

- **LPAf (Lag om privat arbetsförmedling)** — regulates private employment mediation. DriverNord must not present itself as a staffing agency or imply it employs or deploys drivers.
- **Marknadsföringslagen (MFL)** — prohibits misleading marketing claims. Volume claims, verification claims, and guarantee claims must be true and provable.
- **GDPR (Dataskyddsförordningen)** — data subjects have rights including access, deletion, and correction. These requests have mandatory 30-day response windows.
- **GDPR Art. 5** — personal data processed must be minimal and not shared without purpose.

A non-compliant email reply sent to a driver, company, or regulator could result in:
- Regulatory investigation (IMY, Konsumentverket)
- Civil liability
- Reputational damage before DriverNord has any clients

---

## Absolute Rules (Never Violated)

### Rule 1 — Never claim official CE/YKB verification

DriverNord collects self-reported license and YKB data from drivers. DriverNord does not contact Transportstyrelsen, issue official certificates, or perform independent verification.

**Forbidden in any draft reply:**
- "officiellt verifierad"
- "officiell CE-verifiering"
- "bekräftad av myndighet"
- "verified by authority"
- "officially verified"

**Correct framing:** "Chaufförer registrerar och rapporterar sina egna uppgifter. DriverNord samlar och kvalificerar profiler — vi utför inte officiell verifiering."

---

### Rule 2 — Never guarantee a job or employment

DriverNord introduces drivers to companies. It does not guarantee that an introduction leads to employment, assignment, or payment.

**Forbidden in any draft reply:**
- "garanterat jobb"
- "du kommer att få ett uppdrag"
- "vi garanterar arbete"
- "guaranteed placement"
- "we guarantee work"

**Correct framing:** "Vi matchar och presenterar lämpliga chaufförer för relevanta företag. Vi kan inte garantera utfall — det beslutet fattas av företaget."

---

### Rule 3 — Never describe DriverNord as bemanning or staffing

DriverNord is a matchningstjänst / introduktionstjänst. It is not a staffing agency, bemanningsföretag, or temp agency. Using these terms incorrectly could trigger LPAf compliance requirements that DriverNord does not currently meet.

**Forbidden in any draft reply as description of DriverNord:**
- "bemanningsföretag"
- "staffing agency"
- "temp agency"
- "vi hyr ut chaufförer"
- "we hire out drivers"
- "we supply drivers on contract"

**Correct framing:** "DriverNord är en matchningstjänst — vi kopplar samman kvalificerade chaufförer med relevanta företag som introduktion. Vi är inte ett bemanningsföretag."

---

### Rule 4 — Never share driver personal data without consent

No draft reply to a company may contain a driver's name, phone number, email address, personal identity number, or any personally identifying information — even if that data was received via email from the driver.

The introduction of a driver to a company requires:
1. The driver's profile to be in the system
2. A matching company need to exist
3. The driver's explicit consent step to have been completed
4. The introduction to be reviewed and approved by the founder

This process does not happen via email reply.

---

### Rule 5 — Legal/Admin emails must always be escalated

Emails containing GDPR requests, deletion requests, access requests, complaints, or regulatory references must:
1. Be classified as `LEGAL_ADMIN` regardless of other content
2. Receive an acknowledgement draft only — no substantive reply
3. Be flagged for immediate founder review
4. Never be marked IGNORED or auto-closed

The GDPR 30-day response window starts from receipt. Missing it has regulatory consequences.

---

### Rule 6 — Sensitive personal data must not be sent to external tools

In future stages where an AI API (Anthropic, OpenAI) is used to classify or draft email content, the raw email body must be sanitized before being sent to the API:

- Driver names → "[NAME]"
- Phone numbers → "[PHONE]"
- Email addresses → "[EMAIL]"
- Personal identity numbers → "[PERSONNUMMER]"
- Specific addresses → "[ADDRESS]"

This sanitization must happen before any external API call. Not required in V1 (heuristic classifier uses no external API).

---

### Rule 7 — Complaints must never receive dismissive or defensive auto-replies

If an email contains complaint language (`complianceFlags` includes `LEGAL_COMPLAINT`):
- Do not generate a dismissive draft
- Do not auto-classify as SPAM
- Generate an acknowledgement-only draft
- Flag for immediate founder review
- Suggest whether the complaint should be forwarded to a lawyer

---

### Rule 8 — Spam emails must not trigger business engagement

If classification is `SPAM_OR_IRRELEVANT`:
- `draftReply` must be empty string or contain only a warning
- `suggestedNextAction` must be "Mark as ignored — no reply needed"
- Status must be IGNORED
- Do not generate a friendly or curious reply

---

### Rule 9 — All first-phase replies require human approval

`requiresHumanApproval: true` is not configurable. It is hardcoded in the TypeScript implementation and must remain so until:
1. The agent has been tested on at least 50 real emails
2. Classification accuracy has been measured and validated
3. The founder has explicitly authorized a category for auto-approval
4. A legal review of auto-reply content has been completed

---

### Rule 10 — No unattended sending at any stage

`shouldAutoSend: false` is hardcoded in the TypeScript implementation and must remain false in V1 and V2. Even when SMTP integration is live, sending must be triggered by a deliberate founder action, not by the agent itself.

---

## Draft Reply Content Checklist

Before any draft reply reaches the founder approval stage, it must satisfy all of the following:

- [ ] Contains no job guarantee
- [ ] Contains no official verification claim
- [ ] Contains no staffing/bemanning description of DriverNord
- [ ] Contains no driver PII
- [ ] Contains no price commitments (unless explicitly provided by founder)
- [ ] Contains no unverified statistics ("tusentals chaufförer" etc.)
- [ ] Is in the correct language (Swedish or English matching the incoming email)
- [ ] Ends with correct sender: "Med vänliga hälsningar / Best regards, DriverNord"

---

## Escalation Decision Tree

```
Is the email a GDPR/legal/deletion request?
  YES → LEGAL_ADMIN → ESCALATE → forward to lawyer
  NO  ↓

Is the email threatening or containing a complaint?
  YES → LEGAL_ADMIN or note LEGAL_COMPLAINT flag → ESCALATE
  NO  ↓

Does any complianceFlag apply?
  YES → Inject compliance warning into draft → NEEDS_FOUNDER_REVIEW
  NO  ↓

Is confidence LOW?
  YES → Mark NEEDS_FOUNDER_REVIEW → do not auto-progress
  NO  ↓

Normal flow: CLASSIFIED → DRAFTED → NEEDS_FOUNDER_REVIEW → founder approves → APPROVED_TO_SEND
```

---

*Version 1.0 — 2026-05-17 — Compliance rules for human-in-the-loop V1. Non-negotiable.*
