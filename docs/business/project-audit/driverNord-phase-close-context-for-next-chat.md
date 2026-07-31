# DriverNord — Context File for Next Claude Code Session

**Last updated:** 2026-05-26  
**Phase:** Post Batch 1 — Contact Agent V1 operational (local)

Paste this file or its contents at the start of any new Claude Code session to resume correctly.

---

## Project Identity

**DriverNord** — AI-driven / agent-led matching service for Swedish transport companies.  
- NOT bemanning (staffing agency)  
- NOT a job board  
- Model D: verified professional introduction at flat fee  
- Domain: https://drivernord.com (never drivernord.se — does not exist)  
- Signature: **Ghislain Alexander Mad**  
- From email: hej@drivernord.com  

---

## Founder Preferences (Critical)

- **Language for Claude Code prompts:** English  
- **Language for strategic discussion:** French with ChatGPT, English with Claude Code  
- **Market-facing copy:** Swedish only  
- **Workflow preference:** AI-driven/agent-led — not manual recruiter operations  
- **Autonomy granted:** All Claude-executable technical tasks should proceed with autonomy  
- **No-code founder:** Cannot code; relies fully on Claude Code for implementation  
- **No cold calling / manual interviews** unless founder explicitly decides otherwise  
- **Batch send mode:** Founder enters password in terminal; Claude prepares everything else  

---

## Project Root

```
C:\Users\Adam8\driver -acquisition-agent\agent-1\
```

---

## What Is Currently Operational

| Component | Status |
|-----------|--------|
| drivernord.com on Vercel | LIVE |
| Driver intake form (/chaufforer) | OPERATIONAL |
| Lead classify + score | OPERATIONAL |
| Founder cockpit (/admin/cockpit) | OPERATIONAL |
| Market agent cron (daily/weekly) | OPERATIONAL |
| Zoho SMTP delivery | VALIDATED — smtppro.zoho.eu:587 STARTTLS |
| Batch 1 outreach (7 emails) | SENT 2026-05-26 |
| Contact Agent V1 (local) | OPERATIONAL — local Python runner |
| 44 test files, ~1,373 passing | PASSING |

---

## What Is NOT Operational

| Component | Status |
|-----------|--------|
| Zoho OAuth / API path | BLOCKED — 5 env vars missing |
| Reply monitoring (auto) | NOT BUILT — manual inbox only |
| Batch 1 in Supabase | NOT SYNCED — sent outside DB queue |
| Batch 2 queue | NOT CREATED — template ready |
| Cockpit dispatch button | NOT BUILT |
| Reply classification UI | NOT BUILT |
| ADR/tanker drivers | 0 in pool |
| Kylfrys drivers | 0 in pool |

---

## SMTP Configuration

| Setting | Value |
|---------|-------|
| Primary host | smtppro.zoho.eu |
| Port | 587 |
| Security | STARTTLS |
| Fallbacks | smtp.zoho.eu:587, both hosts :465 SSL |
| From | hej@drivernord.com (DriverNord) |
| Username | hej@drivernord.com |
| Password | Founder enters via getpass — NEVER stored |

---

## Contact Agent V1

**Script:** `scripts/contact_agent_smtp_runner.py`

```bash
# Validate queue (no password, no send)
py scripts/contact_agent_smtp_runner.py --dry-run

# Internal test to hej@drivernord.com
py scripts/contact_agent_smtp_runner.py --test

# Progressive send (approved rows only)
py scripts/contact_agent_smtp_runner.py --run --limit 2
py scripts/contact_agent_smtp_runner.py --run --override-interval
```

**Queue files:**
- Batch 2+: `docs/business/outreach-agent/contact-agent-queue-v2.json` (does NOT exist yet — create it)
- Template: `docs/business/outreach-agent/contact-agent-queue-template.json`
- Batch 1 (historical): `docs/business/outreach-agent/manual-smtp-batch-1-emails.json`

**To make an email sendable in the queue JSON:**
```json
{
  "status": "approved",
  "approved_by_founder": true,
  "send_mode": "live"
}
```

---

## Batch 1 — Final Status

- **7/7 sent** on 2026-05-26 ~21:18–21:19 Stockholm
- Via smtppro.zoho.eu:587 STARTTLS
- No failures, no JPC
- Replies: none yet — monitor until 2026-06-04
- Follow-up window opens: 2026-06-02

Companies sent:
1. Enskede Bilexpress — david.sjolund@enskedebilexpress.se (READY)
2. Edvardssons / FMB Central — gabriel@fmbcentral.se (READY)
3. Alexis Bud & Transport AB — alexis.transport@hotmail.com (THIN_BUT_USABLE)
4. Sjölander Maskintransport AB — info@sjolander.se (QUESTION_BASED)
5. Canoil Transport — tf@canoil.se (SUPPLY_GAP — demand mapping only)
6. Kyl- och Frysexpressen — info@kof.se (SUPPLY_GAP — demand mapping only)
7. Haninge Åkeri AB — joachim@ytterstene.se (QUESTION_BASED)

**IMPORTANT:** Canoil and KOF have NO drivers in pool (0 ADR/tanker, 0 kylfrys). If they reply positively, do NOT promise a shortlist without first recruiting suitable drivers.

---

## Security Actions Required

1. **URGENT: Rotate Zoho app password** — exposed in chat session 2026-05-26
   - Zoho Account → Security → App Passwords → revoke old → generate new
2. All other secrets (Supabase, RECRUITER_API_KEY, CRON_SECRET) are stored in Vercel only — NOT in repo

---

## Driver Supply (Last Known State — 2026-05-26)

| Category | Total | Available Now |
|----------|-------|---------------|
| CE fjärrtransport | 12 | 4 |
| CE schakt/bygg | 4 | 1 |
| CE distribution | 3 | 2 |
| C distribution | 2 | 2 |
| C schakt/bygg | 2 | 1 |
| ADR/tanker | 0 | 0 |
| Kylfrys | 0 | 0 |
| **Total clean** | **24** | ~10 |

---

## Key File Paths

| Purpose | Path |
|---------|------|
| Contact Agent V1 | scripts/contact_agent_smtp_runner.py |
| Batch sender (legacy) | scripts/send_driverNord_smtp_batch.py |
| Batch 1 queue | docs/business/outreach-agent/manual-smtp-batch-1-emails.json |
| Send tracker | docs/business/outreach-agent/manual-zoho-send-tracker-batch-1.md |
| Agent V1 spec | docs/business/outreach-agent/contact-agent-v1-smtp-spec.md |
| Queue template | docs/business/outreach-agent/contact-agent-queue-template.json |
| Batch 2 workflow | docs/business/outreach-agent/batch-2-contact-agent-workflow.md |
| Run logs | docs/business/outreach-agent/contact-agent-runs/ |
| Phase audit | docs/business/project-audit/driverNord-end-to-end-system-audit-2026-05-26.md |
| Risk register | docs/business/project-audit/driverNord-risk-register-current.md |
| Current state JSON | docs/business/project-audit/driverNord-current-state.json |
| Outreach email gen | lib/outreachAgent.ts |
| Queue DB layer | lib/outreachQueue.ts |
| Safety validation | lib/agents/zohoOutreachAgent.ts |
| Market agent | lib/companyNeedMarketAgent.ts |
| Cockpit | app/admin/cockpit/page.tsx |
| Queue API | app/api/admin/outreach-queue/route.ts |

---

## Absolute No-Go Rules

These rules are permanent and must never be overridden:

1. **Never send to JPC Entreprenad AB** — bankrupt, hardcoded exclusion
2. **Never contact drivers** — no outbound to driver leads
3. **Never store SMTP password** — getpass only, never in file or env
4. **Never use Zoho OAuth until all 5 env vars are set**
5. **Never activate 46elks**
6. **Never change AGENT_CONTACT_MODE** without explicit founder instruction + documentation
7. **Never send emails with mojibake, "gratis", "0 kr", or "AI"**
8. **Never bypass approved_by_founder=true gate**
9. **Never send outside an approved queue batch**
10. **Never run --send without founder terminal confirmation per email**

---

## Recommended Next Actions for This Session

Paste one of these to continue:

**To prepare Batch 2:**
> "Generate Batch 2 prospects and email drafts into contact-agent-queue-v2.json. Use the template at docs/business/outreach-agent/contact-agent-queue-template.json. Research new Stockholm-area transport companies with CE/C driver needs. Status=draft, approved_by_founder=false, send_mode=dry_run."

**To sync Batch 1 to Supabase:**
> "Write a SQL insert script to add the 7 Batch 1 sent emails to public.outreach_email_queue with status=sent, send_mode=dry_run->live correction, sent_at=2026-05-26T19:18:00Z. Do not execute — write the SQL for founder to run in Supabase SQL editor."

**To classify a reply:**
> "A reply was received from [company]. Here is the text: [paste text]. Classify the intent and propose a response draft."

**To run Batch 2 after approval:**
> Open terminal: `cd "C:\Users\Adam8\driver -acquisition-agent\agent-1"` then: `py scripts/contact_agent_smtp_runner.py --run --limit 2`
