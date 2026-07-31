# DriverNord — Monetization Ladder Roadmap

**Date:** 2026-05-14  
**Purpose:** Define a phased monetization progression from zero to full-scale operation. Each phase has explicit go/no-go criteria to prevent premature advancement.  
**Governing rule:** No cold outreach as the immediate next step. No deployment. No Supabase changes. Documentation only.

---

## Ladder Overview

```
Phase 0: Public-data validation          [COMPLETE]
Phase 1: Driver database creation        [IN PROGRESS — 0 drivers]
Phase 2: Consented introduction model    [BLOCKED on Phase 1 + legal]
Phase 3: Shortlist / success-fee model   [BLOCKED on Phase 2]
Phase 4: Monthly pipeline subscription  [BLOCKED on Phase 3]
Phase 5: Managed recruitment service     [BLOCKED on Phase 4]
Phase 6: Bemanning / staffing feasibility [BLOCKED on Phase 5]
Phase 7: Full bemanning or EOR           [BLOCKED on Phase 6]
Phase 8: Nordic expansion                [BLOCKED on Phase 7]
```

Each phase gate is defined. Do not enter a new phase until the prior phase's go/no-go criteria are met.

---

## Phase 0 — Public-Data Validation

**Status: COMPLETE**

### Objective
Validate the market opportunity, identify target clients, map competitive landscape, and confirm that a pricing model is defensible — all without building a driver database or approaching a single company.

### What was accomplished
- 63 target companies assessed with V1 Fit and Market Proof scores
- Competitor pricing confirmed: Chaffis (4,995 SEK/year), Simplex staffing rates, agency fee benchmarks
- Structural CE driver shortage confirmed via 5 independent market signals
- 5 contact-ready companies identified with personal decision-maker emails
- Existing technical pipeline: fully built, tested, passing
- Verified that the "verified, tech-driven, low-cost" competitive quadrant is unoccupied

### Revenue model
None yet.

### Go/no-go to Phase 1
**MET.** Market is real; gap is confirmed; architecture is built.

### What must NOT be done in Phase 0
- Do not approach any company before drivers exist in the database
- Do not claim verification capability before verification is implemented
- Do not remove "Preliminär version" banners from legal pages

---

## Phase 1 — Driver Database Creation

**Status: ACTIVE — CURRENT BOTTLENECK**

### Objective
Build a minimum viable driver database: at least 20–50 qualified, consented CE/C/D drivers in the Stockholm/Mälardalen region, covering the license categories relevant to the top-10 target companies.

### Required assets
- SMS provider configured (46elks credentials in Vercel) — currently MISSING
- Driver acquisition campaign designed and executed (Meta Ads, Platsbanken, LinkedIn, direct outreach via transport networks)
- GDPR-compliant registration flow (hej@drivernord.se active; legal pages reviewed)
- The existing /chat intake flow (ALREADY BUILT)
- The existing ingestion + scoring pipeline (ALREADY BUILT)

### Required legal/compliance foundation
- Privacy policy reviewed by a Swedish lawyer: Art. 6(1)(a) consent basis stated explicitly
- Driver data retention schedule documented
- A valid consent record for each driver (timestamp + what they consented to)
- hej@drivernord.se monitored for data subject requests

### Required driver database size
**Target: 20 drivers minimum before Phase 2 begins**  
Breakdown: ≥10 CE drivers, ≥5 C drivers, ≥3 with YKB confirmed, ≥5 with "available_now" status confirmed within 7 days

### Required company demand proof
Already proven in Phase 0. No new proof required for Phase 1.

### Revenue model
**None yet.** Phase 1 is investment-only. All effort goes to driver acquisition.

### Operating costs in Phase 1
- Meta Ads driver acquisition: 5,000–15,000 SEK/month (HYPOTHESIS)
- Platsbanken ad: Free
- Legal review: 10,000–20,000 SEK one-time
- 46elks SMS: ~0.50–0.80 SEK/SMS for confirmations
- Total monthly cost estimate: 10,000–20,000 SEK

### Key risk
No drivers register despite the campaign. This means the acquisition channel or copy is wrong, not that the market is wrong. Pivot channel, not model.

### Go/no-go to Phase 2
- ≥ 20 drivers registered, ingested, and scored
- ≥ 3 drivers per relevant category (CE, C, YKB)
- Reviewed privacy policy live (not "Preliminär version")
- DPA template drafted (first version, even if not yet finalized)
- hej@drivernord.se confirmed active
- 46elks SMS configured and verified working

### What Claude Code can automate
- Driver acquisition campaign planning and ad copy drafting
- A/B test copy variants for registration ads
- Analysis of registration funnel (which steps lose drivers)
- Scoring and flagging all registered drivers
- Monthly database health reports (active/lapsed/available)

### External tools required
- 46elks (SMS, credentials needed)
- Meta Ads Manager (for driver acquisition campaign)
- Platsbanken (free driver job posting)
- Vercel Analytics (funnel drop-off analysis)
- Sentry (to detect ingestion failures before drivers are lost)

### What must NOT be done too early
- Do not approach client companies before ≥ 20 drivers are ingested
- Do not offer the shortlist product before ≥ 15 drivers per relevant category
- Do not advertise "verified credentials" before Transportstyrelsen verification is implemented

---

## Phase 2 — Consented Introduction Model

**Status: BLOCKED — requires Phase 1 completion**

### Objective
Generate first commercial revenue by selling individual consented driver introductions to the top-5 contact-ready companies. Validate willingness to pay. Stress-test the per-company consent workflow.

### Required assets
- ≥ 20 drivers in database
- At least 3 drivers with fresh availability confirmation
- Service agreement template (1-page, clear fee trigger and terms)
- Reviewed privacy policy and first DPA draft
- The contact agent pipeline (ALREADY BUILT — requires 46elks active)

### Required legal/compliance foundation
- Service agreement signed by client company before introducing any driver
- Per-company consent confirmed for each driver introduced (Stage 3 consent in existing design)
- DPA in place before any driver profile data is shared with a client company [LEGAL REVIEW REQUIRED]

### Required driver database size
5–10 drivers per category × geography combination relevant to early clients

### Revenue model
**Akut Förarsökning (Option 4):** 8,000–12,000 SEK per urgent introduction  
**Verifierad Introduktionsavgift (Option 1):** 4,000–8,000 SEK per standard introduction

### Price range
8,000–12,000 SEK per introduction (urgency premium) or 4,000–8,000 SEK standard

### Operating cost
Very low — mostly pipeline automation costs (SMS, compute)

### Expected gross margin
80–90%

### Key risk
Driver fails to respond to company contact after introduction. Damages first client relationship. Mitigate with driver communication SLA.

### Go/no-go to Phase 3
- ≥ 1 successful introduction (driver interviewed by company)
- ≥ 1 paid invoice collected
- Service agreement template tested and signed by at least 1 company
- Company feedback collected on introduction quality

### What Claude Code can automate
- Matching driver to company need
- Drafting the introduction document for each introduction
- Drafting the service agreement with company-specific terms
- Flagging drivers whose availability has gone stale

### External tools required
- 46elks (active)
- Fortnox or Visma (or simple invoicing tool) for first invoice
- Scrive (for signing service agreement digitally — optional at Phase 2)

### What must NOT be done too early
- Do not offer replacement guarantees before ≥ 3 drivers per category exist
- Do not claim "AI-verified credentials" before verification is real
- Do not sign a client retainer before the DPA is reviewed by a lawyer

---

## Phase 3 — Shortlist / Success-Fee Model

**Status: BLOCKED — requires Phase 2 completion**

### Objective
Scale to the shortlist product (3–5 drivers per company need), introduce optional success-fee for clients who prefer no-win/no-fee. Establish first 3–5 paying clients. Reach monthly revenue of 50,000–100,000 SEK.

### Required assets
- ≥ 50 active drivers in database
- ≥ 5–10 drivers per major category (CE+YKB, C, specialty)
- Shortlist delivery process (automated matching + human review + PDF/document format)
- Success-fee service agreement with explicit hire trigger clause
- Company need intake form (even a simple email intake is fine at Phase 3)

### Required legal/compliance foundation
- Reviewed privacy policy live
- Finalized DPA template signed by each new client company before delivery
- Service agreement for success-fee model with 90-day hire trigger clause [LEGAL REVIEW REQUIRED]
- GDPR deletion mechanism operational (automated or near-automated)

### Required driver database size
50 active drivers, monthly new registrations ≥ 5/month

### Required company demand proof
≥ 1 paid introduction from Phase 2

### Revenue model
**Verifierad Förarlista:** 12,000–18,000 SEK per shortlist  
**Anställningsarvode:** 35,000–45,000 SEK on confirmed hire

### Price range
12,000–18,000 SEK shortlist; 35,000–45,000 SEK success-fee

### Operating cost
Matching automation cost (near zero); human review time per shortlist (~1–2 hours); SMS per driver re-confirmation (~50 SEK)

### Expected gross margin
75–85% on shortlist; 60–75% on success-fee (working capital cost + collection uncertainty)

### Key risk
Shortlist quality is poor because drivers are low-quality registrations (incomplete data, stale availability, wrong license class). Mitigate: strict ingestion validation + availability freshness check.

### Go/no-go to Phase 4
- ≥ 3 shortlists sold and delivered
- ≥ 1 confirmed hire from DriverNord introduction (not necessarily paid success-fee — but demonstrated that the product leads to hires)
- Net Promoter Score equivalent: client willing to provide a reference quote
- Monthly revenue ≥ 50,000 SEK for 2 consecutive months

### What Claude Code can automate
- Shortlist generation and quality review
- Company need classification and matching
- Success-fee pipeline tracking (which introductions are in 90-day window)
- Weekly competitor pricing intelligence (are agency rates changing?)
- CRM-ready export of all company interactions

### External tools required
- Fortnox/Visma (invoicing)
- Pipedrive or HubSpot (basic CRM for client tracking — Phase 3 is the right time)
- Scrive (service agreement signing)
- Sentry (alert on pipeline failures)

### What must NOT be done too early
- Do not offer the replacement guarantee until database has ≥ 5 drivers per specialty
- Do not offer subscription pricing before consistent monthly driver inflow
- Do not approach enterprise clients (Dagab scale) — focus only on Segment A SME

---

## Phase 4 — Monthly Pipeline Subscription

**Status: BLOCKED — requires Phase 3 completion**

### Objective
Convert best clients to recurring revenue via a monthly subscription model. Reach monthly recurring revenue (MRR) of 50,000–100,000 SEK.

### Required assets
- ≥ 100 active drivers in database
- Consistent monthly driver registration inflow (≥ 10/month)
- Company-facing portal or structured delivery mechanism for monthly profiles
- Driver re-confirmation flow operational (availability freshness tracking)
- 3+ paying clients from Phase 3 who have seen the product work

### Required legal/compliance foundation
- Subscription agreement template with cancellation terms
- GDPR data retention fully documented and automated (or near-automated)
- Consent renewal process for drivers who have been in database > 12 months

### Required driver database size
100+ active, recently confirmed drivers

### Revenue model
**Månadsabonnemang:** 2,500–4,500 SEK/month per company  
**Regional premium:** 9,900 SEK/month for companies wanting broader Stockholm/Mälardalen pool access

### Price range
2,500–9,900 SEK/month

### Expected gross margin
85–93% (nearly pure automation revenue)

### Key risk
Driver database refresh rate is too slow — monthly delivery promise breaks after month 2. Mitigate: do not launch subscription until driver pipeline is proven.

### Go/no-go to Phase 5
- MRR ≥ 75,000 SEK for 3 consecutive months
- Churn rate < 20%/month on subscription clients
- Driver database growing, not shrinking
- At least 1 reference client willing to be named publicly

### What Claude Code can automate
- Monthly driver pool snapshot and delivery report
- Driver availability decay flagging
- Subscription renewal alerts
- Monthly company heatmap (which companies hired the most; which have biggest unmet need)

### What must NOT be done too early
- Do not offer enterprise contracts
- Do not begin bemanning planning until Phase 4 revenue is stable

---

## Phase 5 — Managed Recruitment Service

**Status: BLOCKED — requires Phase 4 completion**

### Objective
Offer a premium, managed recruitment service to companies that want DriverNord to own the entire driver sourcing, screening, and introduction process — not just deliver a shortlist. Requires dedicated operator capacity.

### Required assets
- ≥ 200 active drivers; ≥ 20 new registrations/month
- Human operator capacity (or highly automated replacement for intake management)
- White-label intake for client-branded driver registration
- Premium service agreement with SLA
- CRM with full pipeline tracking

### Revenue model
**RaaS retainer:** 5,000–8,000 SEK/month + success fee on hire

### Expected gross margin
40–60% (requires human time or automated equivalent)

### What must NOT be done too early
- Do not enter managed service until automation covers ≥ 70% of the workflow
- Do not offer SLAs that require human response within hours — verify capacity first

---

## Phase 6 — Bemanning / Staffing Feasibility Assessment

**Status: FUTURE — requires Phase 5 stability**

### Objective
Formally assess whether to enter the staffing/bemanning market. Produce a go/no-go decision based on concrete financial and legal analysis. This is a planning phase, not an operational launch.

### What this phase produces
- Legal opinion on Kollektivavtal obligations for transport staffing
- Working capital model: what float is required for 10, 50, 100 staffed drivers
- Insurance cost model: Fora, workers' compensation, liability
- Partner mapping: identify existing licensed bemanning operators for potential partnership
- Decision framework: build internally vs. partner vs. license

### Minimum indicators before starting this assessment
- Monthly revenue ≥ 500,000 SEK from placement fees
- Proven driver pipeline with ≥ 200 active drivers
- At least 3 companies who have expressed interest in temp/staffing rather than placement
- Capital available for working capital float (minimum 1 MSEK for 10 staffed drivers)

### Go/no-go to Phase 7
Full legal clearance + financial model demonstrating viability + willing client for first staffed engagement

---

## Phase 7 — Full Bemanning or Employer-of-Record

**Status: FUTURE — major capital and legal milestone**

### Objective
Launch staffing/bemanning operations. DriverNord employs drivers and bills client companies at a markup. This is a fundamentally different business than the placement model.

### Capital requirement
Minimum 2–5 MSEK working capital (30–60-day payroll float for initial staffed headcount)

### Legal requirements
- Transport sector Kollektivavtal (union agreement)
- Fora insurance (mandatory for Swedish employers)
- Proper employment contracts for each staffed driver
- Bemanningslagens compliance (2023 reform — see bemanning-transition-analysis.md)

### What must be true
- Proven placement model generating ≥ 1 MSEK/month
- Legal entity setup for staffing operations (potentially separate entity from placement)
- Partnership or acquisition of existing licensed bemanning operator (faster than building from scratch)

---

## Phase 8 — Nordic Expansion

**Status: FUTURE — requires Phase 3+ proven model**

### Objective
Expand the proven Model A (placement fee) into Norway. The 2023 Norwegian bemanningslag reform explicitly bans temp work but permits permanent placement introductions — creating structural demand for exactly what DriverNord offers.

### Minimum requirements before Norway expansion
- Proven Swedish market with ≥ 50 successful placements
- Norwegian-language driver intake flow
- Norwegian legal entity or registered operating in Norway
- Understanding of Norwegian collective wage agreements (Transportarbeiderforbundet)
- Norwegian driver acquisition strategy

### Revenue model
Same as Swedish Phase 3: shortlist fee + success fee. Norwegian placement fee prices typically 20–30% above Swedish equivalents (~40,000–55,000 NOK per placement).

---

## Summary Ladder at a Glance

| Phase | Driver DB | Monthly Revenue Target | Gross Margin | Key Unlock |
|-------|-----------|----------------------|-------------|-----------|
| 0 | 0 | 0 | N/A | Market validated |
| 1 | 20–50 | 0 | N/A | Legal + SMS configured |
| 2 | 5–20 | 20,000–50,000 SEK | 80–90% | First paid introduction |
| 3 | 50+ | 50,000–150,000 SEK | 75–85% | 3 paying clients |
| 4 | 100+ | 75,000–200,000 SEK | 85–93% | MRR established |
| 5 | 200+ | 200,000–500,000 SEK | 40–60% | Managed service |
| 6 | 200+ | Assessment phase | N/A | Bemanning decision |
| 7 | 500+ | 500,000–2,000,000 SEK | 15–25% | Staffing operations |
| 8 | (Norway) | New market | 70–80% | Nordic placement |

---

*Phases are not time-bound by design — the rate of progression depends on driver database growth, which is the binding constraint. No phase should be entered before its go/no-go criteria are met.*
