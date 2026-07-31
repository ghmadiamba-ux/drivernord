# DriverNord — Tool Stack Needed to Execute This Model

**Date:** 2026-05-14
**Purpose:** Map every tool required to operate the V1 monetization model (Package 2 + Package 4). Distinguish between tools already in place, tools required for Phase 1 launch, and tools needed in later phases. Tie each tool to the specific function it serves.
**Governing rule:** Tools that exist in the codebase are documented as-is. External tools are named. No deployment. No code changes. Documentation only.

---

## Tool Category Overview

| Category | Function | Phase 1 required? |
|----------|---------|------------------|
| **Driver acquisition** | Reach and convert CE drivers to registered profiles | YES |
| **Driver qualification** | Verify, score, and classify drivers | YES |
| **Communication** | Contact drivers (availability, consent, follow-up) | YES — critical blocker |
| **Matching and shortlist** | Match drivers to company needs; build shortlist | YES (implemented) |
| **Client delivery** | Send shortlist to client company | YES |
| **Legal / compliance** | GDPR, DPA, service agreement, consent chain | YES — critical blocker |
| **Commercial** | Invoicing, payment collection | YES |
| **CRM / sales** | Manage client pipeline and relationships | YES |
| **Analytics / reporting** | Track driver pool, match quality, revenue | Phase 2 |
| **Verification (external)** | Transportstyrelsen license validation | Phase 2 |
| **Subscription / recurring** | Portal access for repeat clients | Phase 4 |

---

## Tier 1 — Already Built or Configured in Codebase

These tools exist in the DriverNord codebase and are operational or near-operational. Source: CLAUDE.md and codebase review.

### 1. Driver Registration Chat (Next.js App)
**What it does:** Structured 13-step chat flow captures driver attributes (lang, region, license, YKB, availability, shift preference, contact information)
**Key files:** `hooks/useChat.ts`, `lib/applyStep.ts`, `lib/stepConfig.ts`, `lib/conversation.ts`
**Status:** IMPLEMENTED — functional in dev environment
**Limitation:** Tested locally; requires production deployment before real drivers can register

### 2. Lead Classification (`classify.ts`)
**What it does:** Pure function — assigns `LeadStatus` and `LeadPriority` from driver attributes
**Key files:** `lib/classify.ts`
**Status:** IMPLEMENTED with unit tests
**Strength:** Consistent, automated, not subject to manual judgment error

### 3. Lead Ingestion (`ingestLead.ts`)
**What it does:** Copies qualified `drivers` row to `ingested_drivers`; marks lead ingested
**Key files:** `lib/ingestLead.ts`
**Status:** IMPLEMENTED

### 4. Matching and Shortlist Builder (`matchingAgent.ts`, `buildShortlist()`)
**What it does:** Fetches active company needs and drivers; matches on license/region/availability/score; deduplication window 14 days (3 days emergency); persists shortlist
**Key files:** `lib/matchingAgent.ts`
**Status:** IMPLEMENTED — `buildShortlist()` confirmed functional
**Critical:** This is the core product delivery mechanism. Working.

### 5. Supabase Database (Local)
**What it does:** Stores all driver, company, shortlist, and action data
**Tables:** `drivers`, `ingested_drivers`, `company_needs`, `companies`, `shortlists`, `shortlist_entries`, `system_actions`
**Status:** LOCAL ONLY — production Supabase instance exists but is not to be touched until legal review complete
**Constraint:** NEVER run B2B_IMPORT_CONFIRM=true unless SUPABASE_URL contains 127.0.0.1

### 6. Contact Agent (`contactAgent.ts`)
**What it does:** Filters shortlist (score ≥ 60), deduplication, logs action
**Status:** SIMULATED — currently outputs to console.log only. No SMS/email sent.
**Limitation:** Cannot contact drivers or companies until 46elks is configured and GDPR documents are ready

### 7. Follow-Up Agent (`followUpAgent.ts`)
**What it does:** Queries drivers with follow_up_at ≤ now; sends follow-up
**Status:** SIMULATED — contact is console.log only
**Use case for Phase 1:** Pre-delivery availability refresh (contact drivers before shortlist delivery to confirm they are still available)

### 8. Recruiter Dashboard (`/recruiter` route)
**What it does:** Protected interface for viewing driver profiles, shortlists, company needs
**Status:** IMPLEMENTED — protected by `recruiter_session` cookie and `RECRUITER_API_KEY`
**Phase 1 use:** Founder uses this to review shortlists before delivery to client

### 9. Cron Job (`/api/agent/follow-up`)
**What it does:** Runs `runFollowUpAgent()` daily at 08:00
**Status:** IMPLEMENTED in `vercel.json` — requires deployment to activate

---

## Tier 2 — Required for Phase 1 Launch (Not Yet Configured)

These tools are referenced in the codebase or documented as requirements but are not yet operational.

### 10. 46elks SMS (Communication — CRITICAL BLOCKER)
**What it does:** Sends SMS to drivers for: availability confirmation, consent requests (Stage 3), follow-up messages, shortlist notification
**Current status:** Credentials referenced in codebase; **NOT configured** (confirmed in founder-decision-brief.md)
**Action required:** Configure 46elks account; set SMS credentials in environment variables; test send/receive
**Priority:** CRITICAL — without SMS, no real driver contact is possible; no availability confirmation; no consent workflow
**Estimated time to configure:** 30 minutes (per founder-decision-brief.md)
**How to obtain:** 46elks.com — Swedish SMS provider; pay-as-you-go pricing; approximately 0.49 SEK/SMS

### 11. Email — hej@drivernord.com (Communication — CRITICAL)
**What it does:** Receives: inbound company inquiries, driver GDPR requests (deletion, access), operational communications
**Current status:** Domain exists; email address documented; monitoring status UNCONFIRMED
**Action required:** Confirm the inbox is active and monitored; test receive functionality
**Priority:** CRITICAL — every commercial relationship and GDPR request routes through this address
**Estimated time to verify:** 10 minutes

### 12. Transactional Email Provider (Communication)
**What it does:** Sends automated emails to drivers (confirmation, follow-up) and companies (shortlist delivery, invoices)
**Current status:** Not configured
**Recommended:** Postmark, Mailgun, or Resend — all have Swedish-accessible APIs
**Priority:** HIGH — shortlists can be delivered by email; this is the delivery mechanism
**Phase 1 use:** Deliver shortlist PDF or structured email to client company on payment receipt

### 13. Invoicing Tool (Commercial — REQUIRED)
**What it does:** Issues commercial invoices to client companies; tracks payment; provides Bankgiro or Swish payment option
**Recommended:** Fortnox (Swedish-native, standard for small businesses; integrates with Swedish banking), or Bokio
**Current status:** Not configured
**Priority:** CRITICAL — cannot legally request payment for services without issuing a VAT-correct invoice
**Action required:** Activate Fortnox account; configure company details; create invoice template for Package 2 and Package 4
**VAT note:** Swedish F-skatt registration required to issue VAT invoices. [LEGAL REVIEW REQUIRED — confirm registration status]

### 14. Payment Collection (Commercial)
**What it does:** Receives payment from client companies
**Options:** Bankgiro (standard B2B), Swish Handel (for smaller amounts), Stripe (international)
**Recommended for Phase 1:** Bankgiro via Fortnox — standard for Swedish B2B
**Priority:** HIGH — without a payment mechanism, the commercial model is theoretically functional but practically broken

---

## Tier 3 — Required for Legal Compliance (Not Yet in Place)

These are not tools per se but documents and processes that must be in place before launch. See `founder-decision-brief.md` for full list.

### 15. GDPR-Reviewed Privacy Policy
**What it does:** Legally documents the basis for processing driver data; required for GDPR Art. 6(1)(a) consent
**Current status:** "Preliminär version" — not legally reviewed
**Action required:** Swedish GDPR lawyer review; confirm consent basis, retention periods, third-party data sharing disclosure
**Priority:** CRITICAL — cannot legally register drivers without a lawful privacy policy

### 16. Service Agreement Template
**What it does:** Governs the commercial relationship with client companies: what DriverNord delivers, fee trigger, payment terms, limitation of liability
**Current status:** Not in place
**Action required:** Draft 1-page template; legal review [LEGAL REVIEW REQUIRED]
**Priority:** CRITICAL — every commercial transaction requires a signed service agreement

### 17. Data Processing Agreement (DPA) Template
**What it does:** Governs the sharing of driver personal data with client companies under GDPR Art. 28
**Current status:** Not in place
**Action required:** Draft template; legal review [LEGAL REVIEW REQUIRED]
**Priority:** CRITICAL — sharing a driver profile with a company without a DPA is a GDPR violation

---

## Tier 4 — Recommended for Phase 2 (After First Commercial Sale)

### 18. CRM — HubSpot Free / Pipedrive
**What it does:** Tracks client prospects, conversations, pipeline stage, deal value
**Recommended:** HubSpot Free (sufficient for first 10–20 clients); Pipedrive at scale
**Why Phase 2:** Not needed until there are multiple simultaneous client conversations
**Phase 1 alternative:** A simple Notion or Google Sheets pipeline is sufficient for <5 active prospects

### 19. Document Signing — Scrive or DocuSign
**What it does:** Digital signing of service agreements and DPAs with client companies
**Recommended:** Scrive (Swedish-native; BankID integration; standard for Swedish B2B)
**Why Phase 2:** Once legal documents are ready, digital signing accelerates commercial process
**Phase 1 alternative:** PDF + email + wet signature is acceptable for first 3 deals

### 20. Analytics — Posthog or Mixpanel
**What it does:** Tracks driver registration funnel, step drop-off, completion rates
**Why Phase 2:** Essential for optimizing the driver acquisition funnel once meaningful volume exists
**Phase 1 alternative:** Supabase query data is sufficient for small volume

### 21. Transportstyrelsen Verification (External License Check)
**What it does:** Verifies CE/C/D license validity and YKB status against the official Swedish registry
**Current status:** Not implemented; API availability needs confirmation
**Priority:** Phase 2 — this moves the qualification from self-report to verified, which is a significant product differentiator
**Action required:** Research Transportstyrelsen's data access options for third-party verification. [LEGAL REVIEW REQUIRED]

---

## Tier 5 — Phase 3+ Tools

| Tool | Function | Phase |
|------|---------|-------|
| Stripe / Klarna B2B | Online payment for subscription products | Phase 4 |
| Intercom or Crisp | Live chat on company-facing page | Phase 3 |
| Retool or Metabase | Internal dashboards for driver quality metrics | Phase 3 |
| Zapier or n8n | Workflow automation between CRM, invoicing, Supabase | Phase 3 |
| Bemanningsbolag license application | If entering staffing | Phase 7 |
| Fora insurance registration | If employing drivers | Phase 7 |

---

## Phase 1 Tool Stack — Minimum Viable

For the first commercial sale, the minimum required tool stack is:

| Tool | Status | Action |
|------|--------|--------|
| 46elks SMS | Not configured | Configure today — 30-minute task |
| hej@drivernord.com | Unconfirmed | Verify today — 10-minute task |
| Fortnox invoicing | Not configured | Set up before first invoice |
| GDPR privacy policy (reviewed) | Preliminary | Commission legal review |
| Service agreement template | Not in place | Draft + legal review |
| DPA template | Not in place | Draft + legal review |
| Recruiter dashboard | Implemented | Use for shortlist review |
| buildShortlist() | Implemented | Core product delivery mechanism |
| Local Supabase | Operational | Development + testing only |

**Tools that are NOT required for the first sale:**
- CRM (a spreadsheet is fine for <5 prospects)
- Digital signing (PDF is fine for first 3 deals)
- Analytics (too little volume to be meaningful)
- Transportstyrelsen verification (Phase 2)
- Subscription portal (Phase 4)

---

## Single Biggest Tool Gap

**46elks SMS is unconfigured. This single gap blocks:**
1. Confirming driver availability before any shortlist is delivered
2. Sending Stage 3 consent requests to drivers before any introduction
3. Following up with unresponsive drivers
4. The entire urgent package (Package 4) — if a driver can't be contacted in 48 hours, the 48-hour promise cannot be kept

Every other tool gap can be worked around in Phase 1. The SMS gap cannot. Configure 46elks before any commercial conversation begins.

---

*All tool assessments based on CLAUDE.md codebase review and documented project requirements. Tool recommendations are based on standard Swedish market practices for comparable businesses. No tools have been deployed or configured by this research process.*
