# DriverNord — Founder Decision Brief

**Date:** 2026-05-14  
**Audience:** Founder  
**Purpose:** One clear recommendation on how to monetize DriverNord in the next 90 days, what to avoid, and what decisions need to be made now.  
**Governing rule:** Analytical, not motivational. Separated by confidence level. No cold outreach as immediate next step.

---

## One-Sentence Summary

**Build 20–50 qualified drivers into the database first; then sell the shortlist product at 15,000 SEK with the urgent search product as the entry point — and do not touch bemanning, subscriptions, or success-fee-only models until 3 successful introductions are complete.**

---

## Recommended V1 Monetization Model

**Primary: Verifierad Förarlista (Package 2) — Paid Shortlist**  
**Price: 15,000 SEK for delivery of 3–5 matched, consent-confirmed drivers**  
**Payment timing: On delivery of the shortlist — before the company contacts any driver**

**Secondary entry: Akut Förarsökning (Package 4) — Urgent Search**  
**Price: 8,000–10,000 SEK for one urgent introduction within 48 hours**  
**Purpose: Generate first revenue before the shortlist database is fully populated**

### Why this model is best now

**1. Payment on delivery, not on hire.**  
The success-fee model (pay on hire) sounds appealing because it removes buyer objection. But it creates a working capital problem, a collection risk, and a tracking burden — none of which DriverNord has the legal or operational infrastructure to handle yet. The shortlist model generates immediate, clean revenue with no downstream uncertainty.

**2. It matches what the architecture already delivers.**  
`buildShortlist()` exists. The consent chain design is documented. The matching pipeline is tested. The shortlist product is the most direct path from the current codebase to a commercial invoice.

**3. The price is defensible against every identified market alternative.**  
15,000 SEK is below the target range of 18,000 SEK — intentionally underpriced for the first 3 sales to reduce buyer friction. Compare:
- Agency fee: 63,000–113,000 SEK for one hire (VERIFIED FACT)
- Recruitive.se flat fee: 74,900 SEK (VERIFIED FACT)
- Yrkesförarjobb.se social ad: 5,900 SEK for impressions, no qualified outcomes
- DriverNord at 15,000 SEK: 5 matched, available, consent-confirmed drivers

**4. The urgent package (Package 4 at 8,000–10,000 SEK) requires only 3–5 drivers.**  
This means first revenue is possible very early — before the full 20-driver shortlist threshold is reached. Use Package 4 to generate cash and trust with the first clients, then offer Package 2 when the database is ready.

---

## What NOT to Monetize Yet

| Model | Why not now |
|-------|------------|
| **Success fee only (Package 3)** | No collection mechanism; requires signed service agreement with trigger clause; working capital delay; not legally designed yet. Offer only after 3 successful shortlist sales establish trust. |
| **Monthly subscription (Package 5)** | Requires 100+ active drivers; monthly delivery promise is not fulfillable at small scale; subscription churn from a thin database destroys trust. Not until Phase 4. |
| **Bemanning/staffing** | Requires Kollektivavtal, Fora insurance, 500,000–750,000 SEK payroll float, legal infrastructure. Do not enter before 500,000 SEK/month placement revenue and 2,000,000 SEK capital reserve. Not in the next 18–24 months unless external capital is raised. |
| **Subscription database access (Package 6 level)** | Requires a company-facing portal (not built), a much larger driver pool, and a complex consent design. Phase 4–5. |
| **Data intelligence reports** | Requires ≥ 50–100 drivers for meaningful signal. Phase 3. |
| **White-label / AI-as-a-service** | Requires product development investment not yet planned. Phase 5+. |

---

## When to Move to Next Phase

**Move from Phase 1 (driver acquisition) to Phase 2 (first commercial sale) when:**
- ≥ 20 drivers registered, ingested, and scored in system
- ≥ 3 drivers per relevant category (CE+YKB, Stockholm region)
- Privacy policy reviewed by a lawyer (not "Preliminär version")
- DPA template exists (first draft, even if not finalized)
- hej@drivernord.se confirmed active and monitored
- 46elks SMS configured and verified working

**Move from Phase 2 (first introductions) to Phase 3 (shortlist model) when:**
- ≥ 1 successful paid introduction
- ≥ 15–20 drivers in database across relevant categories
- Service agreement template tested and signed at least once
- At least 1 company reference (even informal: "would you use this again?")

**Move from Phase 3 to Phase 4 (subscription) when:**
- Monthly placement revenue ≥ 50,000 SEK for 2 consecutive months
- ≥ 100 active drivers with fresh availability data
- Driver registration inflow ≥ 10/month (sustainable pipeline)
- At least 3 paying clients who have returned for a second purchase

---

## Minimum Requirements Before First Sale

### Minimum driver database
**20 drivers total, with at least 3 per relevant category (CE+YKB Stockholm region)**  
The very first sale can be Package 4 (Akut Förarsökning) with just 3 available-now drivers. Package 2 (Shortlist) requires 15–20.

### Minimum legal documents
**Three documents are required before any driver data is shared with a client company:**
1. Reviewed privacy policy — with GDPR Art. 6(1)(a) consent basis stated explicitly [LEGAL REVIEW REQUIRED]
2. Service agreement template — one page, covering: what DriverNord delivers, fee trigger, payment terms, limitation of liability [LEGAL REVIEW REQUIRED]
3. Data Processing Agreement (DPA) template — for sharing driver profiles with client companies [LEGAL REVIEW REQUIRED]

**These are not optional.** Sharing a driver's profile with a company without a DPA is a GDPR compliance gap. Every commercial transaction is legally incomplete without it.

### Minimum operational setup
1. **46elks SMS active** — drivers must be contactable before any "available now" claim is made
2. **hej@drivernord.se monitored** — every inbound inquiry and GDPR request routes here
3. **Invoicing tool** (Fortnox or equivalent) — to issue commercial invoices
4. **Availability freshness** — a process to confirm driver availability within 7 days before any urgent introduction

---

## Best Package to Launch First

**Package 4 (Akut Förarsökning) — Urgent Search — 8,000–10,000 SEK**

**Reason:** It has the lowest driver database requirement (3–5 available-now drivers), the highest buyer urgency (acute pain = highest willingness to pay), the clearest deliverable (one named driver, one introduction), and the lowest sales friction. If a driver is genuinely available and the company is in crisis, the sales conversation is short.

**Use Package 4 to:**
1. Generate first cash flow
2. Build first client relationship
3. Demonstrate the product quality
4. Create the template for a Package 2 upsell

---

## First Price to Test

**Package 4: 8,000 SEK**  
**Package 2: 15,000 SEK (introductory for first 3 clients)**  

These are below the target price range intentionally. The goal of the first 3 sales is trust and evidence, not maximum margin. After 3 successful sales, move Package 2 to 18,000 SEK and observe.

**Price testing rule:** If the first 2 buyers accept 15,000 SEK without any negotiation, the price is too low. Raise to 17,000 SEK and then 18,000 SEK in subsequent conversations. If buyers consistently negotiate down to 12,000–13,000 SEK, hold at 15,000 SEK.

---

## Expected First 90-Day Revenue Scenarios

All scenarios assume the following prerequisite timeline:
- Weeks 1–3: Legal review, SMS configuration, hej@ verification (cost only)
- Weeks 4–8: Driver acquisition campaign (cost only; 0 revenue)
- Week 9+: First drivers available; first commercial conversations possible

### Worst case
- 20 drivers acquired over 8 weeks
- 0 sales in weeks 9–12 (companies not ready; trust not established)
- 1 Package 4 sale in week 13 at 8,000 SEK
- **90-day revenue: 8,000 SEK**
- **Interpretation:** Driver acquisition worked but sales cycle is longer than expected. Not a failure — a timing adjustment.

### Base case
- 30 drivers acquired over 8 weeks
- 1 Package 4 sale (8,000 SEK) in week 10
- 2 Package 2 sales (15,000 SEK each = 30,000 SEK) in weeks 11–13
- 1 Package 2 sale (15,000 SEK) in week 14
- **90-day revenue from first contact: ~53,000 SEK**
- **Interpretation:** Validates the model; covers initial costs; funds Phase 3 preparation.

### Best case
- 50 drivers acquired over 6 weeks
- 1 Package 4 (10,000 SEK) in week 8
- 3 Package 2 sales (18,000 SEK = 54,000 SEK) in weeks 9–12
- 1 Package 3 success-fee conversion from week 9 Package 2 client (40,000 SEK) in week 15
- 1 Package 5 subscription start (2,500 SEK/month) from a satisfied client
- **90-day revenue: ~107,000 SEK**
- **Interpretation:** Strong first quarter; validates pricing; provides capital for Phase 3.

**All scenarios are HYPOTHETICAL.** They depend entirely on (a) driver acquisition succeeding, (b) legal documents being ready, (c) at least one commercial approach to a company producing a result.

---

## Key Founder Decisions Required Now

The following decisions must be made by the founder — they cannot be deferred and cannot be automated by AI:

| Decision | Why it's blocking | Decision options |
|----------|-----------------|-----------------|
| **Configure 46elks today** | Blocks all real contact; 30-minute task; currently open | Do it today or designate who does it today |
| **Verify hej@drivernord.se inbox** | Blocks GDPR compliance and inbound; 10-minute task | Do it today |
| **Allocate driver acquisition budget** | Phase 1 cannot begin without budget decision; Meta Ads cost 5,000–15,000 SEK/month | Decide: 0 (free channels only) / 5,000 SEK/month / 15,000 SEK/month |
| **Commission legal review** | Blocks commercial launch; DPA and privacy policy must be reviewed before first sale | Engage a Swedish GDPR lawyer; timeline: 2–4 weeks |
| **Define first commercial target** | Which company to approach first (Canoil, Trabé, Edvardssons, JPC, or Enskede) once drivers exist | Review top-10-notes.md; decide which company fits the first package best |
| **Accept or reject bemanning partnership opportunity** | If a client asks for staffing rather than placement, what do we say? | Decide: decline and redirect to placement / or identify a partner now as contingency |

---

## What Makes This Model Work or Fail

**The model works if:**
- Driver acquisition produces ≥ 20 qualified drivers within 6–8 weeks of campaign launch
- First shortlist quality is high — drivers respond, licenses are correct, availability is real
- First client is one of the 5 identified contact-ready companies (Canoil, Trabé, Edvardssons, JPC, Enskede) — these are the ones most likely to be low-friction pilots
- Legal documents are ready before the first sale

**The model fails if:**
- Driver acquisition produces too few, too slow, or too low-quality drivers
- 46elks remains unconfigured (can't confirm driver availability; can't send follow-up messages)
- First shortlist delivery disappoints (drivers unavailable, wrong category, unresponsive)
- Legal documents are not ready and the sale must be deferred

**The one variable that is both the most important and the most controllable:**  
**Driver quality on the first shortlist.**  

The first shortlist is the product. If it contains 5 real, available, correctly licensed, responsive drivers — the product sells itself and converts into a second sale. If it contains 3 unresponsive drivers and 2 wrong-category profiles — the model is falsified in the eyes of the buyer, and no amount of architecture will fix that perception.

---

*This brief is based on analysis of all project documentation and public market data. All legal assessments require external review. All revenue projections are hypothetical. The founder makes the final decisions.*
