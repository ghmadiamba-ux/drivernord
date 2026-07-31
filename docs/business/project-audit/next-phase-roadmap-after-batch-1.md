# DriverNord — Next Phase Roadmap (Post Batch 1)
**Created:** 2026-05-26  
**Based on:** Phase-close audit findings  
**Contact Agent V1:** Operational (local SMTP)  
**Batch 1:** Sent 7/7

---

## Immediate — Within 24 Hours

| Action | Owner | Why |
|--------|-------|-----|
| **Rotate Zoho app password** | Founder | App password exposed in chat session |
| **Check hej@drivernord.com inbox** | Founder | Batch 1 was sent ~21:18 Stockholm; replies may already arrive |
| **Confirm Batch 1 send tracker is complete** | Claude | Verify manual-zoho-send-tracker-batch-1.md is accurate |
| **Verify Supabase migration 018 is applied** | Founder | Check Supabase SQL editor |

---

## Next 3 Days (by 2026-05-29)

| Action | Owner | Why |
|--------|-------|-----|
| **Define reply classification process** | Founder + Claude | Without this, positive replies go nowhere |
| **Define commercial response for INTERESTED reply** | Founder | Package 4 (8,000–10,000 SEK)? Direct call? Who does what? |
| **Classify any Batch 1 replies received** | Founder + Claude | INTERESTED / NOT_NOW / DO_NOT_CONTACT / BOUNCE |
| **Prepare Batch 2 prospect list** | Claude | Ask: "Génère les prospects Batch 2 dans contact-agent-queue-v2.json" |
| **Sync Batch 1 to Supabase** | Claude (SQL) | INSERT 7 rows into outreach_email_queue with status=sent |
| **Confirm CRON_SECRET whitespace resolved** | Founder | Check Vercel env vars |

---

## Next 7 Days (by 2026-06-02)

| Action | Owner | Why |
|--------|-------|-----|
| **Send Batch 2** | Founder runs `py contact_agent_smtp_runner.py --run` | Next outreach wave |
| **Follow up Batch 1 non-repliers** | Claude drafts, founder approves | Follow-up window opens 2026-06-02 |
| **Start ADR/tanker driver recruitment** | Founder decision | Canoil may respond; 0 drivers in pool |
| **Start kylfrys driver recruitment** | Founder decision | KOF may respond; 0 drivers in pool |
| **Add cockpit visibility for SMTP-sent emails** | Claude | Batch 1 invisible in cockpit now |
| **Document commercial conversion steps** | Founder + Claude | Package 4 pitch → intake → shortlist → invoice |
| **Add do_not_contact persistent list** | Claude | Currently JPC only (hardcoded) |

---

## Next 30 Days (by 2026-06-26)

| Action | Owner | Why |
|--------|-------|-----|
| **Complete GDPR documentation** | Founder + legal | B2B outreach legal basis; data retention |
| **Resume OAuth path for inbox automation** | Claude | Required for automatic reply reading |
| **Build reply classification UI in cockpit** | Claude | Manual tracking does not scale |
| **Batch 3 outreach (10+ companies)** | Claude + founder | After Batch 2 results known |
| **Add Python tests for Contact Agent V1** | Claude | No test coverage for SMTP runner |
| **Supply gap closure** | Founder | 0 ADR/tanker, 0 kylfrys — market gap if those companies convert |
| **Package 4 / Package 2 commercial template** | Claude | Pitch document for interested companies |
| **Cockpit dispatch button** | Claude | Production-trigger for approved queue items |
| **Market agent output review** | Founder | Validate that daily scans produce actionable leads |
| **Legal review of outreach consent** | External lawyer | GDPR Art. 6 basis for B2B cold email |

---

## What To Avoid

| Risk | Mitigation |
|------|------------|
| Sending Batch 2 before Batch 1 replies are classified | Wait for reply window to close (2026-06-04) or send only to new prospects |
| Overpromising supply to Canoil / KOF | Recruit ADR/tanker and kylfrys drivers before accepting their business |
| Restarting OAuth before SMTP is validated at scale | SMTP is working; prioritize Batch 2 first |
| Using Zoho API without rotating the exposed app password | Rotate today |
| Letting cockpit-DB mismatch grow | Sync Batch 1 this week |
