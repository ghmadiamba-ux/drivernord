# DriverNord — Legal Document Package: Readiness Summary

**Date:** 2026-05-14
**Purpose:** Summarize the legal document package created in this session, what remains unresolved, and what must not happen until lawyer review is complete.
**Language:** English
**Status:** All documents are drafts. None have been reviewed by a lawyer. None are legally binding.

---

## 1. Files Created

| File | Purpose | Language | Status |
|------|---------|---------|--------|
| `privacy-policy-legal-basis-draft.md` | Defines the GDPR legal basis (Art. 6) for all driver data processing; covers data categories, retention, rights, and contact routes | Swedish | Draft — lawyer review required |
| `driver-consent-language-v1.md` | Exact Swedish consent text for each of the 4 consent stages: registration, availability confirmation, per-company introduction, withdrawal | Swedish (with English implementation notes) | Draft — lawyer review required |
| `dpa-template-v1.md` | Data sharing agreement between DriverNord and client companies (transport operators); covers driver data categories, client obligations, breach notification, retention, deletion | Swedish | Draft — structural question unresolved (Art. 26 vs Art. 28) |
| `service-agreement-v1.md` | Commercial agreement governing Package 4 and Package 2 transactions; defines DriverNord's role, delivery, pricing, replacement policy, limitation of liability, re-engagement clause | Swedish | Draft — re-engagement clause and liability cap are placeholders |
| `legal-review-brief-for-lawyer.md` | One-document brief for the Swedish lawyer; describes DriverNord, the products, the documents, and 10 specific legal questions requiring judgment | Swedish | Ready to send once founder reviews and adds contact details |
| `legal-readiness-summary.md` | This file — summary of the package, what remains unresolved, and go/no-go table | English | Complete |

All files are located at: `agent-1/docs/business/legal/`

---

## 2. What Each Document Is For

### privacy-policy-legal-basis-draft.md
Provides the missing legal foundation for DriverNord's existing privacy policy page (`/privacy`). The current page has a "Preliminär version" banner and does not explicitly state the GDPR Art. 6 legal basis. This draft adds: Art. 6(1)(a) consent basis, data categories table, retention schedule proposal, subject rights, and contact routes. It must be inserted into the public privacy policy after lawyer confirmation — not before.

### driver-consent-language-v1.md
The most operationally critical document. It defines the exact SMS and UI text that must appear at each of the 4 driver consent stages. Without this language being finalized and implemented:
- Stage 1 (registration) consent may be legally insufficient
- Stage 3 (per-company) consent — which is the legal gate before any profile sharing — cannot be implemented
Includes database field suggestions for consent record storage.

### dpa-template-v1.md
Required before the first shortlist delivery. Every commercial transaction in which DriverNord shares a driver profile with a client company requires either:
- A signed GDPR Art. 28 Data Processing Agreement, or
- A GDPR Art. 26 Joint-Controller arrangement, or
- A Controller-to-Controller data transfer agreement
The lawyer must determine which structure applies. The draft covers the core obligations for all three models and requires structural adjustment after the lawyer's determination.

### service-agreement-v1.md
Required before the first invoice. Defines what DriverNord sells, what the fee trigger is (delivery of shortlist or profile, not hire), and what DriverNord explicitly does not guarantee (credential verification, employment outcome). Critically, it establishes DriverNord as an introduction service — not a staffing or bemanning company — a distinction that has legal and regulatory implications under Swedish law.

### legal-review-brief-for-lawyer.md
A practical briefing document the founder sends to the lawyer along with the four draft documents. Contains 10 specific legal questions (GDPR structure, bemanning classification, ad compliance, self-reported credential risk, retention periods, re-engagement clause enforceability, and more). Formatted to minimize the lawyer's time investment in understanding the context.

---

## 3. What Remains Unresolved

The following issues were intentionally left as open questions because they require legal judgment — not additional drafting by AI:

| Issue | Location in documents | Risk level |
|-------|----------------------|-----------|
| Art. 26 vs. Art. 28 vs. Controller-to-Controller structure | dpa-template-v1.md §2 | HIGH — determines the entire legal architecture of profile sharing |
| Whether SMS opt-in is sufficient consent evidence under GDPR | driver-consent-language-v1.md, all stages | HIGH — determines legal validity of entire consent chain |
| Whether the service agreement avoids bemanning classification | service-agreement-v1.md §2 | HIGH — incorrect classification requires regulatory registration |
| Re-engagement clause enforceability | service-agreement-v1.md §10 | MEDIUM — affects commercial model post-introduction |
| Liability cap formulation | service-agreement-v1.md §13 | MEDIUM — draft is a placeholder only |
| Data retention periods | privacy-policy-legal-basis-draft.md §7 | MEDIUM — proposed periods are suggestions; lawyer must confirm |
| Sub-processor agreements (Supabase, Vercel, 46elks) | privacy-policy-legal-basis-draft.md §6 | MEDIUM — third-party DPAs may need review |
| Third-country transfers (US-based services) | privacy-policy-legal-basis-draft.md §6 | MEDIUM — Supabase and Vercel may process data outside EEA |
| Meta Ads Special Ad Category compliance for employment ads | legal-review-brief-for-lawyer.md Q7 | MEDIUM — may restrict Meta targeting options |
| Whether "Verifierad Förarlista" product name is misleading | legal-review-brief-for-lawyer.md Q8 | LOW-MEDIUM — "verifierad" may imply external verification |

---

## 4. What Must Not Happen Until Lawyer Review Is Complete

The following actions are prohibited until the specified legal condition is met:

| Action | Condition to unlock | Documents needed |
|--------|--------------------|--------------------|
| Publish updated privacy policy (removing "Preliminär version") | Lawyer confirms Art. 6 basis is correctly stated | `privacy-policy-legal-basis-draft.md` reviewed |
| Implement Stage 1 consent text in production chat | Lawyer confirms consent language is sufficient | `driver-consent-language-v1.md` Stage 1 reviewed |
| Send Stage 3 per-company SMS to drivers | Lawyer confirms Stage 3 language meets Art. 6(1)(a) specificity | `driver-consent-language-v1.md` Stage 3 reviewed |
| Deliver any driver profile to a client company | Lawyer confirms DPA structure; DPA signed by client | `dpa-template-v1.md` reviewed + signed per transaction |
| Issue first commercial invoice | Lawyer confirms service agreement; service agreement signed | `service-agreement-v1.md` reviewed + signed |
| Publish Meta Ads | Privacy policy reviewed (Art. 6 basis stated); ad copy reviewed for compliance | `privacy-policy-legal-basis-draft.md` + `legal-review-brief-for-lawyer.md` Q7 |
| Publish Platsbanken posting | Posting wording approved for compliance | `legal-review-brief-for-lawyer.md` Q7 |

---

## 5. Go/No-Go Table

| Action | Go/No-Go today | Reason | What changes this |
|--------|---------------|--------|------------------|
| Collect driver data (web registration) | **CONDITIONAL NO-GO** | Privacy policy not legally reviewed; Art. 6 basis not publicly stated. Technically possible; legally premature at scale. | Lawyer reviews and approves privacy policy |
| Contact drivers via SMS | **NO-GO** | 46elks not configured (operational blocker); Stage 2 consent language not yet finalized | 46elks configured + consent language reviewed |
| Share driver profile with a company | **NO-GO** | DPA does not exist (not even signed); Stage 3 consent workflow not implemented | DPA template reviewed + signed per transaction; Stage 3 implemented |
| Sell Package 4 | **NO-GO** | Service agreement not reviewed or signed; DPA not in place; 0 qualified drivers in database; 46elks not configured | All four legal docs reviewed; operational blockers resolved; ≥5 qualified drivers in database |
| Sell Package 2 | **NO-GO** | All Package 4 blockers apply; additionally requires ≥15 qualified drivers | Same as Package 4, plus database depth |
| Publish Meta Ads | **CONDITIONAL NO-GO** | Production deployment unconfirmed; privacy policy not reviewed; Meta account and Pixel not configured | Production confirmed; privacy policy reviewed; Meta setup completed |

---

## 6. Recommended Next Step

**Send the legal review brief and all four draft documents to a Swedish GDPR and commercial lawyer.**

This is the single highest-leverage action available to the founder right now. The documents are complete enough for a lawyer to review, identify issues, and return corrected versions. The lawyer cannot begin until the brief is sent. Every day the brief is not sent is a day of legal review delay.

**Recommended lawyer profile:**
- Swedish GDPR/dataskyddsjurist with experience in B2B services and personal data platforms
- Understanding of Swedish labor law adjacent to staffing/bemanning distinctions (to confirm service agreement avoids that classification)
- Practical orientation — DriverNord needs corrections and approvals, not academic memos

**After legal review returns:**
1. Update each document with lawyer's corrections
2. Remove "Preliminär version" banners from approved documents
3. Remove [JURIDISK GRANSKNING KRÄVS] markers from confirmed sections
4. Update `privacy-policy-legal-basis-draft.md` → replace on `/privacy` page
5. Have DPA and service agreement ready to sign with first client

**Parallel action (can start now, does not depend on legal review):**
- Founder configures 46elks (30 minutes)
- Founder verifies hej@drivernord.se inbox (10 minutes)
- Founder authorizes Meta Ads budget
- AI drafts Meta Ads creative brief, Platsbanken posting, monitoring SQL queries

---

## 7. Confidence and Accuracy Notes

All four legal documents were drafted by Claude Code (an AI language model) on 2026-05-14, drawing on:
- DriverNord's project documentation (architecture, consent chain design, business model)
- Standard GDPR Art. 6, 7, 17, 26, 28 provisions
- Standard Swedish commercial contract conventions

These documents are **best-effort drafts** designed to give a lawyer a concrete starting point, not documents that can be used as-is. The AI has flagged every area of uncertainty with [JURIDISK GRANSKNING KRÄVS]. The drafts do not constitute legal advice.

No official verification of CE/YKB credentials is claimed anywhere in these documents. DriverNord is described consistently as an introduction and matching service. No documents state or imply that DriverNord is a staffing company, bemanning company, or employer. No documents recommend or authorize outreach, deployment, or production database operations.

---

*Document version: 1.0 — 2026-05-14*
*All legal documents in this package are preliminary drafts for lawyer review only.*
