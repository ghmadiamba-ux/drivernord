# DriverNord — Email Triage Agent Operating Model

**Date:** 2026-05-17
**Status:** Documented — not yet active

---

## Processing Flow

```
Incoming email (hej@drivernord.com)
  │
  ▼
[1] INGESTION
  Capture: from, to, subject, body, receivedAt, source
  Source options: zoho_manual (copy-paste), zoho_imap (future), zoho_api (future), mock (testing)
  │
  ▼
[2] LANGUAGE DETECTION
  Detect: Swedish (sv) / English (en) / Unknown
  Used to: select correct reply template language
  │
  ▼
[3] CLASSIFICATION
  Assign: EmailCategory
  Output: category + confidence (high / medium / low)
  │
  ▼
[4] INTENT EXTRACTION
  Parse: structured fields from free text
  Driver emails → ExtractedDriverFields
  Company emails → ExtractedCompanyFields
  Other → empty record
  │
  ▼
[5] COMPLIANCE CHECK
  Scan: body + subject for compliance triggers
  Flag: legal risks, GDPR requests, complaints, forbidden claims
  Output: string[] of complianceFlags
  │
  ▼
[6] DRAFT RESPONSE
  Generate: safe, compliant draft reply in detected language
  Rules: no forbidden claims, no PII in drafts, no promises
  │
  ▼
[7] HUMAN APPROVAL GATE
  requiresHumanApproval: true  (always)
  shouldAutoSend: false        (always — hardcoded)
  │
  ▼
[8] FOUNDER DECISION
  Options: approve / edit / reject / escalate / ignore
  Status transitions: CLASSIFIED → DRAFTED → NEEDS_FOUNDER_REVIEW → APPROVED_TO_SEND / ESCALATED / IGNORED
  │
  ▼
[9] SEND (manual at launch)
  Founder copies approved reply into Zoho and sends manually
  Future: APPROVED_TO_SEND status triggers sending via SMTP/API
  │
  ▼
[10] OUTCOME LOG
  Record: email_id, category, action taken, sent_at
  Log target: console / file (V1), system_actions table (future when Supabase integration enabled)
```

---

## Agent Responsibilities

### Always performed (every email)

| Responsibility | Output field |
|---------------|-------------|
| Classify into 1 of 8 categories | `category` |
| Assign confidence level | `confidence` |
| Detect language | `language` |
| Produce one-line summary | `summary` |
| Flag compliance issues | `complianceFlags` |
| Suggest next action | `suggestedNextAction` |
| Generate draft reply | `draftReply` |
| Gate on human approval | `requiresHumanApproval: true` |
| Block auto-send | `shouldAutoSend: false` |

### Performed when category warrants it

| Trigger | Additional action |
|---------|-----------------|
| DRIVER_INQUIRY | Extract driver fields (license, YKB, city, availability) |
| COMPANY_INQUIRY | Extract company fields (need, drivers required, urgency, start date) |
| LEGAL_ADMIN | Escalate immediately — suggest founder forwards to lawyer |
| SPAM_OR_IRRELEVANT | Set status IGNORED — do not generate enthusiastic draft |
| Compliance flag raised | Inject warning header into draft: "⚠️ Compliance flag: [reason]" |

---

## Routing Decisions

| Category | Route to | Draft posture |
|----------|---------|--------------|
| DRIVER_INQUIRY | Driver intake: invite to drivernord.com/chat | Warm, Swedish, invite to structured flow |
| COMPANY_INQUIRY | Company intake: request structured need | Professional, collect need details |
| META_LEAD_RESPONSE | Depends on content — may be driver or company | Classify sub-intent |
| SUPPORT_REQUEST | Founder → answer or escalate | Acknowledge, set expectations |
| LEGAL_ADMIN | Founder → lawyer if applicable | Acknowledge receipt, 30-day response commitment |
| PARTNERSHIP | Low priority, founder decides | Neutral acknowledgement only |
| SPAM_OR_IRRELEVANT | No reply | Mark IGNORED |
| UNKNOWN | Founder reviews raw email | Minimal draft: "Vi återkommer" |

---

## Environment Variable Controls

Consistent with existing agent pattern:

| Variable | Default | Effect |
|----------|---------|--------|
| `AGENT_EMAIL_TRIAGE_ENABLED` | `true` | Kill switch — set to `false` to disable all triage |
| `AGENT_EMAIL_MODE` | `suggest` | `suggest` = human approval required; `auto` = future only |

`auto` mode is never activated at launch regardless of this variable. The `shouldAutoSend` field is hardcoded to `false` in the TypeScript implementation.

---

## What the Agent Does Not Do

- Does not connect to Zoho or any email server
- Does not read from any inbox
- Does not send any email
- Does not write to Supabase (V1 — logs to console only)
- Does not use an AI API (V1 — heuristic classification consistent with lib/classify.ts)
- Does not store any credentials
- Does not share personal data from extracted fields with external services

---

*Version 1.0 — 2026-05-17 — Operating model for human-in-the-loop V1.*
