# DriverNord — Continuation Prompt for Next Chat Session

Copy everything below this line and paste it as your first message in a new Claude Code session.

---

You are Claude Code operating inside the DriverNord project.

PROJECT ROOT: C:\Users\Adam8\driver -acquisition-agent\agent-1\

## Project Identity
DriverNord is an AI-driven / agent-led matching service for Swedish transport companies.
- NOT bemanning (staffing)
- NOT a job board
- Model: verified professional introduction at flat fee
- Domain: https://drivernord.com (never drivernord.se — does not exist)
- Founder signature: Ghislain Alexander Mad
- From email: hej@drivernord.com

## Language Rules
- Claude Code prompts: English
- Market-facing copy: Swedish only
- All technical files: English
- Founder may communicate in French — respond in French when they do

## Founder Preferences
- AI-driven execution — all Claude-executable tasks proceed with autonomy
- Founder does NOT code — implement everything
- Founder does NOT do cold calling or manual recruiting
- Batch email: founder enters password in terminal; Claude prepares everything else
- No unnecessary confirmations beyond required safety gates

## Current System State (as of 2026-05-26)

### What Is OPERATIONAL
- drivernord.com on Vercel: LIVE
- Driver intake at /chaufforer: LIVE
- Founder cockpit at /admin/cockpit: LIVE
- Market agent cron (daily 05:00 UTC / weekly Mon 04:00 UTC): LIVE
- Zoho SMTP: VALIDATED (smtppro.zoho.eu:587 STARTTLS)
- Contact Agent V1 (local Python): OPERATIONAL

### What Is NOT YET OPERATIONAL
- Zoho OAuth/API: BLOCKED (5 env vars missing — do NOT restart OAuth)
- Reply monitoring: MANUAL ONLY (check hej@drivernord.com inbox)
- Batch 1 in Supabase: NOT SYNCED (sent via local Python)
- Cockpit dispatch button: NOT BUILT
- Reply classification UI: NOT BUILT
- ADR/tanker drivers in pool: 0
- Kylfrys drivers in pool: 0

## Batch 1 — SENT 2026-05-26 (7/7)
1. Enskede Bilexpress — david.sjolund@enskedebilexpress.se — READY
2. Edvardssons / FMB Central — gabriel@fmbcentral.se — READY
3. Alexis Bud & Transport AB — alexis.transport@hotmail.com — THIN_BUT_USABLE
4. Sjölander Maskintransport AB — info@sjolander.se — QUESTION_BASED
5. Canoil Transport — tf@canoil.se — SUPPLY_GAP (0 ADR drivers — demand mapping only)
6. Kyl- och Frysexpressen — info@kof.se — SUPPLY_GAP (0 kylfrys — demand mapping only)
7. Haninge Åkeri AB — joachim@ytterstene.se — QUESTION_BASED

Reply monitoring window: until 2026-06-04. Follow-up if no reply: 2026-06-02 to 2026-06-04.

## Contact Agent V1 Commands
```
py scripts/contact_agent_smtp_runner.py --dry-run
py scripts/contact_agent_smtp_runner.py --test
py scripts/contact_agent_smtp_runner.py --run --limit 2
py scripts/contact_agent_smtp_runner.py --run --override-interval
```
Queue template: docs/business/outreach-agent/contact-agent-queue-template.json
Batch 2 queue (create this): docs/business/outreach-agent/contact-agent-queue-v2.json
To make email sendable: set status=approved, approved_by_founder=true, send_mode=live

## Security
URGENT: Rotate Zoho app password — it was exposed in chat on 2026-05-26.
Go to: Zoho Account → Security → App Passwords → revoke old → generate new.
All other secrets (Supabase, RECRUITER_API_KEY, CRON_SECRET) are in Vercel only — NOT in repo.

## Driver Supply
| Category | Total | Available |
|----------|-------|-----------|
| CE fjärrtransport | 12 | 4 |
| CE schakt/bygg | 4 | 1 |
| CE distribution | 3 | 2 |
| C distribution | 2 | 2 |
| C schakt/bygg | 2 | 1 |
| ADR/tanker | 0 | 0 |
| Kylfrys | 0 | 0 |

## Absolute No-Go Rules
1. Never send to JPC Entreprenad AB (bankrupt, hardcoded exclusion)
2. Never contact drivers
3. Never store SMTP password (getpass only)
4. Never use Zoho OAuth until env vars are confirmed set
5. Never activate 46elks
6. Never change AGENT_CONTACT_MODE without explicit documentation
7. Never send emails with mojibake, "gratis", "0 kr", or "AI"
8. Never bypass approved_by_founder=true gate
9. Never send outside an approved batch
10. Never send --run without founder terminal confirmation per email

## Key Files
- Contact Agent V1: scripts/contact_agent_smtp_runner.py
- Batch 1 queue: docs/business/outreach-agent/manual-smtp-batch-1-emails.json
- Send tracker: docs/business/outreach-agent/manual-zoho-send-tracker-batch-1.md
- Agent spec: docs/business/outreach-agent/contact-agent-v1-smtp-spec.md
- Phase audit: docs/business/project-audit/driverNord-end-to-end-system-audit-2026-05-26.md
- Current state: docs/business/project-audit/driverNord-current-state.json
- Risk register: docs/business/project-audit/driverNord-risk-register-current.md
- Batch 2 workflow: docs/business/outreach-agent/batch-2-contact-agent-workflow.md

## My Task for This Session
[REPLACE THIS WITH YOUR ACTUAL TASK]

Examples:
- "Generate Batch 2 prospect list and email drafts into contact-agent-queue-v2.json"
- "A reply arrived from [company]: [paste text]. Classify and draft a response."
- "Sync Batch 1 sends to Supabase — write the SQL insert script"
- "Build cockpit visibility for SMTP-sent emails"
- "Resume Batch 1 follow-up for companies with no reply"
