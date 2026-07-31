# DriverNord — Cash-Flow-First Business Model

**Date:** 2026-05-14  
**Purpose:** Design the optimal early cash-flow model for DriverNord — the simplest, lowest-risk, fastest-to-revenue commercial model that the current architecture can support.  
**Governing rule:** No cold outreach. No deployment. No Supabase. Documentation only.

---

## Framework: What Makes a Good V1 Monetization Model?

Before comparing options, establish the criteria a good V1 model must satisfy:

| Criterion | Minimum standard |
|-----------|-----------------|
| Explainability | A transport company owner must understand it in 30 seconds |
| Legal risk | No ambiguity about what DriverNord is selling vs. employing |
| Operational burden | Deliverable by one person + the existing automated pipeline |
| Cash-flow timing | Revenue received before or on delivery — not months after |
| Driver DB dependency | Viable with 20–50 drivers in database |
| Price defensibility | Justified by existing market price benchmarks |
| GDPR compliance | Aligned with DriverNord's existing consent chain design |
| Architecture fit | Compatible with the current Next.js + Supabase + agent pipeline |

---

## The 5 Early Cash-Flow Options — Side-by-Side Comparison

---

### Option 1: Pay-per-Consented Driver Introduction

**Swedish name:** Verifierad Introduktionsavgift

| Field | Detail |
|-------|--------|
| **Price suggestion** | 4,000–8,000 SEK per introduction (one driver, one company) |
| **What customer receives** | A formal introduction to one specific driver who has: (a) confirmed availability, (b) declared their license class and YKB, (c) explicitly consented to be introduced to this specific company |
| **When customer pays** | On delivery of the introduction (before or on the day the introduction is made) |
| **What DriverNord must deliver** | One structured introduction package: driver profile (self-reported credentials), availability window, preferred contact method, DriverNord's assessment notes |
| **Refund / replacement logic** | No refund on introduction delivery — but if the driver does not respond to the company's contact within 5 business days, DriverNord provides one free replacement introduction |
| **Minimum driver DB size required** | 5–10 drivers in the relevant category and region |
| **Legal caveats** | Credentials are self-reported at this stage. DriverNord is an introduction service, not a staffing agency. [LEGAL REVIEW REQUIRED for service agreement wording] |
| **Why suitable for V1** | Lowest operational complexity; GDPR-cleanest model (per-company consent already in the existing consent chain design); no hire dependency; fast cash; scales naturally to shortlist model |
| **Why NOT suitable** | Price feels high per single introduction to a buyer accustomed to job board ads; buyer may want a shortlist, not one driver |

**V1 verdict:** SUITABLE — secondary model. Works best as an urgency product or as a low-barrier entry for first clients.

---

### Option 2: Paid Shortlist of 3–5 Qualified Drivers

**Swedish name:** Verifierad Förarlista

| Field | Detail |
|-------|--------|
| **Price suggestion** | 12,000–18,000 SEK for a shortlist of 3–5 drivers |
| **What customer receives** | A curated list of 3–5 drivers who match the company's need (license, YKB, region, availability), each with a structured profile including self-reported credentials and availability |
| **When customer pays** | On delivery of the shortlist — before the company contacts any driver |
| **What DriverNord must deliver** | A PDF or structured document with: driver profiles, license class declared, YKB status declared, availability window, preferred contact, DriverNord's ranking rationale |
| **Refund / replacement logic** | If fewer than 3 drivers can be matched (database limitation), the shortlist is not delivered and no charge is made. If a shortlisted driver becomes unavailable after delivery, one free replacement is provided within 7 days. |
| **Minimum driver DB size required** | 15–30 drivers covering the relevant category and region |
| **Legal caveats** | All drivers on shortlist must have explicitly consented to introduction to this specific company. [LEGAL REVIEW REQUIRED] Credentials are self-reported unless verification infrastructure exists. Use language: "self-reported license class CE as of [date]." |
| **Why suitable for V1** | Clear deliverable; easy for buyer to understand; price is easily justified (18,000 SEK = 1 Blocket ad × 3 with zero verified results; DriverNord delivers 3 pre-screened candidates); decouples revenue from hire outcome |
| **Why NOT suitable** | Requires a larger driver database per category than Options 1 or 4; first shortlist quality is unknown — if 3 drivers are poor quality, first sale destroys trust |

**V1 verdict:** BEST PRIMARY MODEL. Clear deliverable, fair price, immediate payment, GDPR-compliant, fully supported by existing architecture.

---

### Option 3: Success Fee After Hire

**Swedish name:** Anställningsarvode (vid anställning)

| Field | Detail |
|-------|--------|
| **Price suggestion** | 35,000–45,000 SEK flat fee; or 10–12% of annual salary (~42,000–50,400 SEK for a CE driver at 35,000 SEK/month) |
| **What customer receives** | Access to DriverNord's matched shortlist + ongoing support until a hire is confirmed |
| **When customer pays** | After the company confirms it has hired a driver introduced by DriverNord |
| **What DriverNord must deliver** | Shortlist delivery + hire confirmation tracking; optional interview support |
| **Refund / replacement logic** | If hired driver leaves within 90 days, DriverNord provides a free replacement shortlist |
| **Minimum driver DB size required** | 20–40 drivers; replacement guarantee requires depth per specialty |
| **Legal caveats** | Service agreement must define the "hire trigger" precisely. Key clause: "Any employment offer made to a driver introduced by DriverNord within 90 days of introduction triggers the fee." Without this, collection is not enforceable. [LEGAL REVIEW REQUIRED] |
| **Why suitable for V1** | Removes the biggest buyer objection ("I won't pay until I know it works"); highest possible ticket price; aligns incentives |
| **Why NOT suitable** | CASH FLOW RISK — DriverNord may deliver the shortlist in week 1, client deliberates for 4 weeks, hires in week 6, pays in week 7. Working capital burden. Collection risk if client disputes the trigger. Cannot guarantee replacement unless database is deep. |

**V1 verdict:** NOT SUITABLE as primary V1 model. Use only as an optional premium upgrade for clients who specifically ask for no-win/no-fee terms. Require a signed service agreement with the trigger clause before offering.

---

### Option 4: Urgent Driver Search Package

**Swedish name:** Akut Förarsökning

| Field | Detail |
|-------|--------|
| **Price suggestion** | 8,000–15,000 SEK for a single urgent introduction within 24–48 hours |
| **What customer receives** | One pre-selected driver with confirmed availability and relevant credentials, introduced within the agreed time window |
| **When customer pays** | Prepayment or on confirmation of introduction (same day) |
| **What DriverNord must deliver** | One specific driver introduced with profile, contact, and availability confirmation; driver has confirmed "available now" within the past 7 days |
| **Refund / replacement logic** | If DriverNord cannot deliver an available driver within the agreed time window, the package is refunded in full. If the introduced driver declines the conversation, one free alternative is attempted. |
| **Minimum driver DB size required** | 3–5 drivers with "available_now" confirmed and availability freshness within 7 days |
| **Legal caveats** | "Available now" must be based on driver-confirmed status, not stale registration data. Do not overpromise. [LEGAL REVIEW REQUIRED] |
| **Why suitable for V1** | Highest willingness to pay (acute pain); very low driver DB requirement; fast to execute; premium price justified by urgency premium |
| **Why NOT suitable** | Highly dependent on having fresh "available now" data; if no driver is actually available at the moment of purchase, DriverNord must refund — poor experience; not scalable as primary model |

**V1 verdict:** SUITABLE — excellent secondary model alongside the shortlist. Acts as a premium urgency product. Should be activated only when the driver availability data is genuinely fresh (≤7 days).

---

### Option 5: Monthly SME Åkeri Subscription

**Swedish name:** Månadsabonnemang för Förarpipeline

| Field | Detail |
|-------|--------|
| **Price suggestion** | 2,500 SEK/month (billed monthly) or 1,800 SEK/month (billed annually = 21,600 SEK/year) |
| **What customer receives** | Monthly: up to 2 new matched driver profiles delivered proactively, even without an active vacancy. Access to urgency introductions at a discounted rate. Priority queue in DriverNord's matching system. |
| **When customer pays** | Monthly, in advance (subscription billing) |
| **What DriverNord must deliver** | 2 new driver profiles each month that match the company's profile (license, region, specialisation); plus one discounted urgent introduction per quarter |
| **Refund / replacement logic** | If fewer than 2 matched profiles can be delivered in a month (database limitation), the month is credited. |
| **Minimum driver DB size required** | 100+ active drivers to reliably deliver 2 fresh, non-duplicate profiles monthly to each subscriber |
| **Legal caveats** | Subscription does not grant open database access — each delivered profile still requires that driver's per-company consent. [LEGAL REVIEW REQUIRED] |
| **Why suitable for V1** | Recurring revenue; predictable cash flow; builds long-term client relationships |
| **Why NOT suitable** | PREMATURE at small driver database. If DriverNord has 20 drivers and 5 subscribers, running out of fresh profiles in month 2 destroys the subscription value. The monthly delivery promise requires continuous driver acquisition. Do not launch until the driver acquisition flow is established. |

**V1 verdict:** NOT SUITABLE as V1 primary model. Require: (a) 100+ drivers in active database, (b) consistent monthly driver registration inflow, (c) company-facing portal for profile delivery. Strong Phase 4 model.

---

## Comparison Matrix

| Criterion | Option 1: Intro fee | Option 2: Shortlist | Option 3: Success fee | Option 4: Urgent | Option 5: Subscription |
|-----------|--------------------|--------------------|----------------------|-----------------|----------------------|
| Explainability | HIGH | VERY HIGH | HIGH | VERY HIGH | HIGH |
| Legal risk | LOW | LOW | MEDIUM-HIGH | LOW | MEDIUM |
| Operational burden | LOW | LOW | MEDIUM | LOW | MEDIUM-HIGH |
| Cash-flow timing | IMMEDIATE | IMMEDIATE | DELAYED (weeks-months) | IMMEDIATE | RECURRING |
| Driver DB minimum | 5–10 | 15–30 | 20–40 | 3–5 | 100+ |
| Price range | 4–8k SEK | 12–18k SEK | 35–45k SEK | 8–15k SEK | 2.5k SEK/month |
| Gross margin | 80–90% | 80–90% | 60–80% | 80–90% | 85–95% (at scale) |
| V1 verdict | Secondary | **PRIMARY** | Not V1 primary | Secondary | Not yet |
| Risk of failed first sale | LOW | MEDIUM | HIGH | MEDIUM | HIGH |

---

## Primary V1 Recommendation: The Shortlist Model

**Recommended primary model:** Option 2 — Verifierad Förarlista (Paid Shortlist), 15,000–18,000 SEK.

**Reasoning:**
1. Clear deliverable — the company knows exactly what it receives before paying
2. Payment on delivery — no working capital burden; no collection risk
3. The price is justified by three public benchmarks:
   - Chaffis (4,995 SEK/year) gives raw, unverified access — DriverNord delivers curated, consented profiles
   - Yrkesförarjobb.se (5,900 SEK) delivers social ad impressions — DriverNord delivers verified candidates
   - General agency recruitment (63,000–113,000 SEK) — DriverNord is 75–85% cheaper
4. The existing `buildShortlist()` function already handles the matching; the delivery is a human-reviewed document
5. The shortlist model naturally upgrades to success-fee when trust is established
6. The per-company consent requirement is satisfied by the existing consent chain design

**Minimum requirements before first shortlist sale:**
- ≥ 15 drivers registered and ingested with self-reported credentials
- ≥ 3 drivers matching the specific need (license, region, YKB)
- Each driver on the shortlist has given Stage 3 consent for this specific company
- A signed service agreement with the client (one page is enough at V1)
- GDPR-compliant privacy policy (reviewed, not "Preliminär version") [LEGAL REVIEW REQUIRED]
- hej@drivernord.se inbox confirmed active

---

## Secondary V1 Model: Urgent Driver Access

**Recommended secondary model:** Option 4 — Akut Förarsökning, 8,000–12,000 SEK.

**Reasoning:**
1. Lowest driver database requirement (3–5 available drivers)
2. Highest urgency = highest willingness to pay = lowest sales resistance
3. Can generate first revenue before the shortlist database is fully populated
4. The urgent model creates a natural gateway to the shortlist: "We found you one driver urgently. Would you like a full shortlist of 5 for future planning?"

**Minimum requirements before first urgent sale:**
- ≥ 3 drivers with "available_now" confirmed within 7 days
- Availability freshness tracking is essential — do not sell urgent access on stale data
- A simple confirmation message to drivers: "We have a potential opportunity in [region]. Are you still available this week? Reply YES or NO" (via SMS once 46elks is configured)

---

## Revenue Projection for V1

These projections are HYPOTHETICAL and depend entirely on achieving the driver database minimums.

**Conservative scenario (base case):**
- Month 1–2: 0 revenue (driver acquisition phase)
- Month 3: First shortlist sale — 15,000 SEK
- Month 4–5: 2 shortlist sales + 1 urgent introduction — 30,000 + 10,000 = 40,000 SEK
- Month 6: 3 shortlist sales — 45,000 SEK
- **90-day revenue from first sale: ~100,000 SEK**

**Optimistic scenario:**
- Month 3: 2 shortlists + 1 urgent — 46,000 SEK
- Month 4–5: 4 shortlists + 2 urgent — 92,000 SEK
- Month 6: 5 shortlists + 1 success fee from month 3 client — 115,000 SEK
- **90-day revenue from first sale: ~253,000 SEK**

**These projections are HYPOTHETICAL.** They require:
1. A functioning driver acquisition campaign
2. 46elks SMS configured
3. Legal pages reviewed and DPA template ready
4. At least 1 signed commercial client

---

## The Cash-Flow Bridge

The shortlist model generates enough margin to fund the next phase:

| Revenue event | Amount | Rough margin | Cash generated |
|--------------|--------|-------------|----------------|
| 5 shortlist sales | 90,000 SEK | 80% | 72,000 SEK |
| 2 urgent introductions | 20,000 SEK | 85% | 17,000 SEK |
| 1 success fee | 40,000 SEK | 70% | 28,000 SEK |
| **First 90-day total (base)** | **150,000 SEK** | — | **117,000 SEK** |

This margin can fund:
- Legal review of privacy policy + DPA template: ~10,000–20,000 SEK
- 46elks SMS costs at pilot scale: ~500–1,000 SEK/month
- Meta Ads for driver acquisition: ~5,000–15,000 SEK/month
- Allabolag Pro subscription: ~2,000 SEK/month
- Sentry error monitoring: free tier

The shortlist model is self-funding from first revenue.

---

*All prices are hypothetical starting points. First client price should be treated as a test — observe willingness to pay before locking in the price architecture. All legal assessments require external review.*
