# DriverNord — Roadmap: Next Phases

*Last updated: 2026-05-14 (full reorder based on project audit + monetization strategy + market reality research)*

> **Doctrine update 2026-06-16:** Several sections of this roadmap have been superseded by the current strategic doctrine. Specifically: (1) "Lager/warehouse/forklift — not in target market" is superseded — all logistics worker categories are now in scope. (2) "No bemanning, no subscription, no success fee until shortlist model validated" is partially superseded — bemanning is now a planned commercial path with its own transition plan. (3) The "9+, 24–36 months, capital required" bemanning phase estimate is superseded. The operative doctrine document is `docs/business/strategy/current-driverNord-doctrine.md`. This roadmap is preserved as historical context.

---

## Governing Principles

1. **AI-driven end to end.** Every phase must specify what AI does, what humans do, and what tools execute. Never design a phase as "go do X manually."
2. **Sequence matters.** Workers must exist before clients are approached. Legal must be in place before profiles are shared. Operational readiness before commercial activity.
3. ~~**Do not expand scope prematurely.** No bemanning, no subscription, no success fee until the shortlist model is validated with 3 successful introductions.~~ *Superseded 2026-06-16: scope expands when market evidence supports it, not only after internal milestones.*
4. **Speed window.** Förartjänst.se is rebuilding in 2026. The competitive window for establishing market presence is this year.

---

## Current Readiness Assessment

| Capability | Ready? | Blocker |
|-----------|--------|---------|
| Driver self-registration (/chat) | YES | — |
| Automated classification + ingestion | YES | — |
| Automated matching (buildShortlist) | YES | — |
| Shortlist creation | YES | — |
| Human approval cockpit | YES | — |
| Messaging provider abstraction | YES — infrastructure built | SMS_PROVIDER not configured |
| **Real contact delivery to drivers** | **NO** | 46elks credentials not configured |
| **Driver database (supply side)** | **EMPTY** | No driver acquisition campaign run |
| **Legal: Privacy policy** | **PRELIMINARY** | No GDPR Art. 6 basis stated; lawyer review needed |
| **Legal: DPA template** | **DOES NOT EXIST** | Required before any profile sharing |
| **Legal: Service agreement** | **DOES NOT EXIST** | Required before any commercial invoice |
| **hej@drivernord.se** | **UNCONFIRMED** | Monitoring status not verified |
| Invoicing tool | **NOT CONFIGURED** | Fortnox or equivalent needed |
| Company self-service intake | NO | Phase 3 item |

---

## Phase 0 — Immediate Founder Actions (Hours, Not Days)

**Goal:** Close the three cheapest blockers that are blocking everything downstream.

These are not AI tasks — they require human action.

| Action | Effort | Who | Unblocks |
|--------|--------|-----|---------|
| Configure 46elks SMS credentials in environment | 30 minutes | Founder | All real driver contact; urgent package delivery |
| Verify hej@drivernord.se inbox is active and monitored | 10 minutes | Founder | GDPR compliance; inbound commercial inquiries |
| Decide driver acquisition budget (0 / 5,000 / 15,000 SEK/month) | Decision | Founder | Phase 1 can begin |

**Do these before anything else. Total time: ~40 minutes.**

---

## Phase 1 — Legal and Compliance Foundation (Weeks 1–4, Parallel)

**Goal:** Have all legal documents reviewed and in place before any driver profile is shared with a client company.

All three documents are legally required before the first commercial transaction. They can be worked on in parallel with Phase 2 (driver acquisition).

### 1.1 Commission legal review of privacy policy

**What:** Engage a Swedish GDPR lawyer to review the current preliminary privacy policy.
**Required additions:** Explicit Art. 6(1)(a) consent basis for matching processing; retention periods; third-party data sharing disclosure.
**AI-executable:** Claude Code can prepare a pre-review draft with all flagged sections and legal citations. Human lawyer reviews and approves.
**Output:** Reviewed privacy policy; remove "Preliminär version" banner.
**Estimated time:** 2–4 weeks (external lawyer dependency).

### 1.2 Draft and commission DPA template

**What:** A Data Processing Agreement (or Controller-to-Controller Agreement under GDPR Art. 26) governing the sharing of driver personal data with client companies when a shortlist is delivered.
**Why critical:** Sharing a driver's profile with a company without a signed DPA is a GDPR compliance violation. Every shortlist delivery requires a signed DPA.
**AI-executable:** Claude Code drafts the template (citing GDPR Art. 26, Swedish DPA precedent). Human lawyer reviews.
**Recommended AI next task:** Draft this document as `docs/business/legal/dpa-template-v1.md`.
**Output:** DPA template ready to send to first client.

### 1.3 Draft service agreement template

**What:** A one-page commercial service agreement covering: what DriverNord delivers, the fee trigger (on shortlist delivery), payment terms (30 days), limitation of liability.
**AI-executable:** Claude Code drafts the template. Human lawyer reviews.
**Output:** Service agreement template ready to send to first client.

### 1.4 Add GDPR deletion mechanism (engineering)

**What:** `DELETE /api/recruiter/drivers/{id}` — cascade delete from `drivers`, `ingested_drivers`, `shortlist_entries`; anonymize `system_actions` audit log entries.
**AI-executable:** Yes — Claude Code can write the spec and implement.
**Effort:** 1–2 days engineering.
**Status:** Not started.

---

## Phase 2 — Driver Acquisition Campaign (Weeks 1–8, Priority)

**Goal:** Reach ≥ 20 registered, scored drivers (≥ 3 per relevant category/region). This is the supply-side prerequisite for the commercial product.

**This is the most time-sensitive gap. Without drivers, there is no product.**

### 2.1 AI-driven driver acquisition plan

**What:** A 30-day campaign plan specifying: channel selection (Meta Ads, Arbetsförmedlingen, Platsbanken, Facebook groups for CE drivers), targeting parameters, ad copy variants (A/B test), consent language, expected conversion rates based on market data.
**AI-executable:** YES — Claude Code can produce this entirely.
**Recommended AI next task:** Draft `docs/business/driver-acquisition-plan.md`.
**Output:** A founder-ready acquisition plan that can be launched immediately after approval.

### 2.2 Meta Ads campaign (founder launch)

**What:** Launch targeted Meta (Facebook/Instagram) ads targeting CE+YKB drivers in Stockholm region. Campaign designed in Phase 2.1.
**AI-executable:** Planning and copy: YES. Actual ad account launch: NO (requires founder account).
**Trigger:** Launch after Phase 2.1 plan is approved and 46elks is configured.
**Budget:** 5,000–15,000 SEK/month depending on founder decision.

### 2.3 Multi-channel supplementation (AI-monitored)

**Channels to activate after Meta Ads:**
- Arbetsförmedlingen (free; post role descriptions targeting CE drivers)
- Platsbanken (free; reach drivers who search job boards)
- Facebook groups for Swedish CE drivers (organic post with /chaufforer link)
- YKB training school partnerships (contact schools that train CE drivers)
- Driver referral incentive (existing drivers refer others)

**AI-executable:** Claude Code can draft all copy, targeting specs, and channel-specific content.

### 2.4 Driver database quality monitoring (AI)

**What:** Weekly review of registration data — track: total registered, score distribution, license breakdown, YKB status, availability distribution, region breakdown.
**AI-executable:** YES — Claude Code can query the local Supabase instance and generate a quality report.
**Output:** Weekly driver database quality report to founder.

---

## Phase 3 — First Commercial Transaction (Weeks 8–12, After ≥ 5 Available Drivers)

**Goal:** Execute the first Package 4 (Akut Förarsökning) introduction to a client company. Generate first revenue.

**Prerequisite gates (all must be true before any commercial conversation):**
- [ ] ≥ 5 drivers confirmed available in database (for Package 4)
- [ ] 46elks SMS configured and tested
- [ ] hej@drivernord.se confirmed active
- [ ] DPA template reviewed by lawyer
- [ ] Service agreement template reviewed by lawyer
- [ ] Invoicing tool configured (Fortnox)
- [ ] Pre-delivery availability confirmation process in place

### 3.1 First client approach

**Candidates (from top-10-notes.md):** Canoil Sverige AB, Transportfirma Trabé, Edvardssons Last, JPC Entreprenad, Enskede Bilexpress.
**Package:** Package 4 (Akut Förarsökning) at 8,000 SEK — lowest friction, clearest value.
**Process:** Approach after availability of shortlist is confirmed. Do not approach before drivers exist.
**AI-executable:** Claude Code can prepare all outreach material, talking points, product sheet, and pricing comparison. Human makes the contact.

### 3.2 AI-prepared commercial materials

**What Claude Code prepares before the first client conversation:**
- Product one-pager (Package 2 + Package 4) in Swedish
- Pricing comparison sheet (DriverNord vs. agency vs. job board)
- ROI calculator (staffing conversion: 15,000 SEK vs. 350,000 SEK annual saving)
- Draft service agreement and DPA cover letter
- Personalized brief for each of the top-5 pilot companies

### 3.3 Invoicing

**What:** Issue a VAT-correct invoice on delivery of the shortlist (not on hire).
**Tool required:** Fortnox or equivalent — must be configured before the first invoice.
**AI-executable:** Invoice design and template preparation: YES. Account setup: NO (founder).

---

## Phase 4 — Package 2 Scale (Weeks 10–16, After ≥ 15 Available Drivers)

**Goal:** Transition from urgent Package 4 introductions to the full shortlist Package 2 product.

**Prerequisite:** ≥ 15 drivers confirmed available across relevant categories.

### 4.1 Verifierad Förarlista (Package 2) delivery

**First 3 sales at 15,000 SEK.** After 3 successful sales:
- Raise price to 17,000 SEK
- Test 18,000 SEK after 5+ successful sales
- Observe negotiation patterns per price testing rule (founder-decision-brief.md)

### 4.2 Client reference building

**What:** After each successful introduction, request permission to display company name/logo or obtain a brief testimonial.
**First reference = significant trust multiplier for all subsequent sales.**

### 4.3 Guarantee policy (must be designed before Package 2 is offered)

**What:** Define the replacement guarantee: "If a driver in the shortlist is unavailable within 24 hours of delivery, DriverNord will replace that driver within 5 business days at no additional charge."
**AI-executable:** Policy design: YES. Must be documented before first Package 2 offer.

---

## Phase 5 — Success Fee Introduction (After 3 Successful Package 2 Sales)

**Goal:** Offer Package 3 (success fee on hire) to clients who have already experienced a successful shortlist.

**Price:** 35,000–45,000 SEK on confirmed hire.
**Required:** Service agreement with clear fee trigger clause. Legal review of trigger mechanism. 3+ client references demonstrating product quality.
**AI role:** Draft updated service agreement; prepare success fee calculation sheet.

---

## Phase 6 — Operational Improvements (Parallel with Phases 3–5)

These engineering items improve operational safety but do not block commercial launch.

| Item | Effort | AI-executable | Priority |
|------|--------|---------------|---------|
| Rate limiting on POST /api/leads | 1 day | Partial | HIGH (before public Meta campaigns) |
| Match cooldown guard (prevent duplicate shortlists) | 2 hours | YES | MEDIUM |
| Ingest failure logging to system_actions | 30 minutes | YES | HIGH |
| Add company_name to getOpenCompanyNeeds() | 30 minutes | YES | MEDIUM |
| Run Match button in cockpit | 1 day | YES | MEDIUM |
| Shortlist browse view in cockpit | 1–2 days | YES | MEDIUM |
| Driver pool browse in cockpit | 2 days | YES | LOW |

---

## Phase 7 — Company Self-Service Intake (After First 3 Commercial Sales)

**Goal:** Companies can express hiring needs without recruiter mediation.

**What:** Web form at `/company/behov` capturing: company name, contact, license required, domain, region, urgency. Routes to a company intake queue (not directly to `POST /api/company-needs` — requires human validation step).
**AI-executable:** Spec + code: YES. Deployment: requires founder approval.
**Effort:** 2–3 days engineering.

---

## Phase 8 — Subscription Product (After ≥ 100 Drivers + 3 Repeat Clients)

**Gate:** Monthly placement revenue ≥ 50,000 SEK for 2 consecutive months; ≥ 100 active drivers; ≥ 3 paying clients who have returned.

**Product:** Package 5 (monthly subscription, 2,500 SEK/month) — ongoing access to new drivers as they enter the database.
**Not before:** Subscription churn from a thin database destroys trust. Do not offer until the supply side is deep enough to fulfill monthly delivery commitments.

---

## Phase 9+ — Bemanning Feasibility (24–36 Months Out)

**Not in the next 90 days. Not in the next 12 months. Only after:**
- ≥ 500,000 SEK/month placement revenue for 3+ consecutive months
- ≥ 200 active drivers in database
- ≥ 2,000,000 SEK working capital reserve
- Signed Kollektivavtal + Fora insurance registration

**Bridge option (Phase 5–6):** Identify a bemanning partner to refer staffing inquiries to, earning a referral fee without operating staffing directly. See `bemanning-transition-analysis.md`.

---

## Phase Summary

| Phase | Goal | Status | Blocks |
|-------|------|--------|--------|
| **0** — Immediate founder actions | 46elks + inbox + budget decision | **OPEN — 40 minutes** | Everything |
| **1** — Legal foundation | DPA + service agreement + privacy review | **OPEN — weeks (external)** | Every commercial transaction |
| **2** — Driver acquisition | ≥20 drivers in database | **OPEN — weeks (campaign)** | Commercial product |
| **3** — First Package 4 sale | First revenue | **OPEN — after Phase 0+2+legal** | — |
| **4** — Package 2 scale | Verified shortlist product | After ≥15 drivers | — |
| **5** — Success fee | Package 3 | After 3 Package 2 sales | — |
| **6** — Operational improvements | Engineering items | Parallel | — |
| **7** — Company self-service | Remove recruiter bottleneck | After 3 commercial sales | — |
| **8** — Subscription | Package 5 | After 100+ drivers + 3 repeat clients | — |
| **9+** — Bemanning | Staffing model | 24–36 months; capital required | — |

---

## What is Explicitly Out of Scope (2026-05-14 version — partially superseded)

> Items marked ~~strikethrough~~ have been superseded by doctrine update 2026-06-16.

- ~~**Bemanning/staffing now** — requires Kollektivavtal, Fora, 500,000–750,000 SEK payroll float. Not in scope.~~ *Superseded: bemanning is a planned commercial path. See `docs/business/logistikbemanning/scope-and-transition-plan.md`.*
- **Cold outreach before workers exist** — approaching client companies without a deliverable product is harmful. Still applies.
- **Success fee model before trust is established** — no collection mechanism; no legal structure; wait until 3 sales. Still applies.
- **Subscription before 100+ workers** — cannot fulfill monthly delivery promise with thin database. Still applies.
- ~~**Lager/warehouse/forklift segment** — not in target market.~~ *Superseded: all logistics workers are in scope. See `docs/business/logistikbemanning/scope-and-transition-plan.md`.*
- **Bus segment (D license)** — D license captured but not prioritized. Still applies (low demand signal so far).
- **CV upload or storage** — no-CV positioning is a core differentiator. Still applies.
- **Multi-region before Stockholm is validated** — Stockholm first. Still applies.

---

## Recommended Immediate AI Tasks (Claude Code)

1. **Draft 30-day driver acquisition plan** → `docs/business/driver-acquisition-plan.md`
2. **Draft DPA template v1 (Swedish, GDPR Art. 26)** → `docs/business/legal/dpa-template-v1.md`
3. **Draft service agreement template v1** → `docs/business/legal/service-agreement-v1.md`
4. **Prepare Package 2 + Package 4 product one-pager (Swedish)** → `docs/business/commercial/product-one-pager-sv.md`
5. **Prepare personalized brief for each top-5 pilot company** → `docs/business/commercial/pilot-company-briefs/`
6. **Draft operator runbook** → `docs/current/operator-runbook.md`
7. **Spec ingestion failure logging** → `docs/current/engineering-spec-failure-logging.md`
