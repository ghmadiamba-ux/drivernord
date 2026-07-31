# DriverNord — Risk Register
**Date:** 2026-05-26  
**Status:** Active — updated post Batch 1 execution

---

## Risk Table

| ID | Risk | Severity | Likelihood | Score | Owner | Status | Mitigation |
|----|------|----------|------------|-------|-------|--------|------------|
| R01 | Zoho app password exposed in chat | HIGH | CONFIRMED | 🔴 Critical | Founder | OPEN | Revoke immediately at Zoho Account → Security → App Passwords |
| R02 | No reply monitoring system | HIGH | HIGH | 🔴 Critical | Claude | OPEN | Manual inbox check until IMAP path built |
| R03 | Supply gap — 0 ADR/tanker drivers | HIGH | HIGH | 🔴 Critical | Founder | OPEN | Canoil may reply — cannot deliver. Recruit now or decline |
| R04 | Supply gap — 0 kylfrys drivers | HIGH | HIGH | 🔴 Critical | Founder | OPEN | KOF may reply — cannot deliver. Recruit now or decline |
| R05 | No commercial conversion flow | HIGH | MEDIUM | 🟠 High | Founder | OPEN | Define what happens when company says "yes" before first reply |
| R06 | Batch 1 not in Supabase | MEDIUM | CONFIRMED | 🟠 High | Claude | OPEN | Manual SQL sync needed; cockpit state incorrect |
| R07 | GDPR legal basis for B2B cold email | HIGH | MEDIUM | 🟠 High | Founder + legal | OPEN | Document processing basis; consider lawyer review |
| R08 | No persistent do_not_contact list | MEDIUM | MEDIUM | 🟡 Medium | Claude | OPEN | JPC hardcoded only; any other company reply "stop" has no system |
| R09 | Overpromise risk to SUPPLY_GAP companies | HIGH | LOW | 🟡 Medium | Claude | MITIGATED | Email copy carefully worded — no shortlist offer sent |
| R10 | Stale driver availability data | MEDIUM | HIGH | 🟡 Medium | Founder | OPEN | 24 clean drivers documented; availability not live |
| R11 | Contact Agent V1 local-only | MEDIUM | CONFIRMED | 🟡 Medium | Claude | KNOWN | Production dispatch not built; manual terminal run required |
| R12 | Cockpit/DB state mismatch | MEDIUM | CONFIRMED | 🟡 Medium | Claude | OPEN | Batch 1 invisible in Section H |
| R13 | CRON_SECRET whitespace issue | MEDIUM | LOW | 🟡 Medium | Founder | VERIFY | Check Vercel env var has no trailing whitespace |
| R14 | Migration 018 not in production | MEDIUM | MEDIUM | 🟡 Medium | Founder | VERIFY | Check Supabase SQL editor |
| R15 | Founder friction from manual approval | MEDIUM | MEDIUM | 🟡 Medium | Claude | ONGOING | Streamline Batch 2 flow; cockpit dispatch eventually |
| R16 | No rate limit enforcement in production | LOW | LOW | 🟢 Low | Claude | MITIGATED | Runner enforces 2/hour; no production route to bypass |
| R17 | Duplicate company outreach | LOW | LOW | 🟢 Low | Claude | MITIGATED | JPC blocked; manual queue review before each batch |
| R18 | Python not in PATH for some environments | LOW | LOW | 🟢 Low | Founder | MITIGATED | Confirmed working 2026-05-26 with `py` launcher |
| R19 | Reply arrives while founder unavailable | MEDIUM | LOW | 🟡 Medium | Founder | OPEN | No automated triage; urgency depends on content |
| R20 | Market agent producing stale data | MEDIUM | MEDIUM | 🟡 Medium | Founder | OPEN | Cron runs but output not validated against real hiring state |

---

## Critical Immediate Actions (R01–R05)

### R01 — Rotate Zoho App Password
```
Zoho Account → Security → App Passwords
→ Delete: the password used during 2026-05-26 session
→ Generate: new password named "drivernord-smtp-batch2"
→ Use only in terminal when Contact Agent V1 prompts
```

### R02 — Reply Monitoring
```
Daily: check hej@drivernord.com inbox
For each reply: classify → update tracker → decide next action
Follow-up window closes: 2026-06-04
```

### R03 + R04 — Supply Gaps
```
Before accepting Canoil or KOF as clients:
→ Recruit at least 2 verified ADR/tanker drivers
→ Recruit at least 2 verified kylfrys drivers
OR
→ Send polite "we are evaluating capacity" response
→ Do NOT promise a shortlist that cannot be delivered
```

### R05 — Commercial Conversion
```
Define:
→ What does "interested reply" trigger?
→ Package 4 (8,000–10,000 SEK): what does it include?
→ Package 2 (15,000 SEK): what is the shortlist format?
→ Who does the intake call?
→ What contract is used?
```

---

## Risk Score Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical (act today) | 5 |
| 🟠 High (act this week) | 3 |
| 🟡 Medium (act this month) | 8 |
| 🟢 Low (monitor) | 4 |
| **Total** | **20** |
