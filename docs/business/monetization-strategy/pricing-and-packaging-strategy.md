# DriverNord — Pricing and Packaging Strategy

**Date:** 2026-05-14  
**Purpose:** Define clear, commercially defensible, legally cautious commercial packages for DriverNord.  
**Language note:** Package names are in Swedish (for market-facing use). Descriptions are in English (for internal documentation).  
**Governing rule:** Do not overpromise credential verification unless the verification process exists. Use "self-reported" and "document-uploaded" language where appropriate.

---

## Credential Honesty Framework

Before detailing packages, establish the honesty standard for all packaging:

| Credential claim | Current DriverNord capability | Correct public language |
|-----------------|-------------------------------|------------------------|
| CE/C/D license class | Self-reported by driver at registration; uploaded document option (not yet built) | "Självdeklarerat CE/C-körkort" (self-reported) |
| YKB status | Self-reported; expiry date not tracked | "Självdeklarerat YKB" — note expiry risk |
| ADR certificate | Self-reported; not verified against any registry | "Självdeklarerat ADR-intyg" |
| Availability | Self-reported at registration; freshness decays | "Angiven tillgänglighet [datum]" — with confirmation date |
| Identity | Not BankID-verified at this stage | Do not claim identity verification |
| Transportstyrelsen check | Not implemented | Do not imply official verification |

**Rule:** Any package that claims "verified" must specify what was verified and by what method. "Verifierad" without qualification is misleading. Use "granskad" (reviewed) or "kvalificerad" (qualified) as safer terms at V1.

---

## Package 1 — Snabb Introduktion

**English:** Quick Introduction  
**Swedish tag line:** "En kvalificerad förare — introducerad idag"

### Overview
A single named driver is introduced to the company within 24–72 hours. Designed for acute driver shortages where speed matters more than optionality.

| Field | Detail |
|-------|--------|
| **Target customer** | Åkeri with sudden driver absence (illness, resignation, termination); companies in a "start immediately" situation |
| **Ideal use case** | "Our driver called in sick this morning and we have a delivery tomorrow" |
| **Price hypothesis** | 8,000–12,000 SEK |
| **Payment timing** | Invoice sent on delivery of introduction; payment within 5 business days |
| **Deliverables** | One structured driver profile including: self-reported license class, self-reported YKB status, stated availability window, preferred contact channel, DriverNord's brief assessment note |
| **Guarantee / replacement logic** | If the introduced driver does not respond to the company's first contact within 24 hours, DriverNord will attempt one free replacement introduction. No cash refund once introduction is delivered. |
| **Operational burden** | LOW — one matching run; one human review; one profile document |
| **Legal caveats** | Credentials are self-reported. DriverNord is an introduction service; it does not guarantee driver performance, reliability, or employment suitability. [LEGAL REVIEW REQUIRED for service agreement wording.] |
| **Required driver DB size** | 3–5 drivers with fresh availability in the relevant category |
| **Recommended launch phase** | Phase 2 (earliest possible revenue) |
| **Risk of customer objection** | "8,000 SEK for one person's contact details seems expensive" |
| **Answer to objection** | "You're paying for a matched, available driver who has already agreed to be introduced to you — not a contact from a job board. We confirm availability before we invoice you. A Blocket ad that gets no qualified applicants also costs 3,000 SEK." |
| **AI automation opportunity** | Full automation: availability check → match → profile generation → introduction document. Human reviews before sending. |

---

## Package 2 — Verifierad Förarlista

**English:** Qualified Driver Shortlist  
**Swedish tag line:** "Tre till fem granskade förare — matchade mot er profil"

### Overview
A curated shortlist of 3–5 drivers who match the company's specific need (license class, YKB, region, specialisation). Each driver has confirmed consent to be introduced to this specific company. Payment on delivery of the shortlist.

| Field | Detail |
|-------|--------|
| **Target customer** | SME åkeri with an active, confirmed driver vacancy; companies frustrated by job-board noise |
| **Ideal use case** | "We need a CE driver with YKB in Stockholm; we've posted 3 ads and got unqualified applicants" |
| **Price hypothesis** | 12,000–18,000 SEK for 3–5 matched drivers |
| **Payment timing** | Invoice sent when shortlist is delivered; payment within 7 business days |
| **Deliverables** | PDF shortlist document containing: company-specific matching rationale, driver profiles (self-reported credentials, availability, preference), DriverNord's ranking of candidates, suggested contact sequence |
| **Guarantee / replacement logic** | If DriverNord cannot deliver ≥ 3 matching drivers (database limitation), the shortlist is not delivered and no charge is made. If a shortlisted driver becomes unavailable before the company contacts them (within 5 business days), one free replacement is provided. |
| **Operational burden** | LOW-MEDIUM — matching is automated; human review before delivery; 1–2 hours per shortlist |
| **Legal caveats** | All drivers on shortlist have self-reported credentials as of the date noted on each profile. DriverNord has not verified credentials against Transportstyrelsen or any external registry at this stage. DriverNord is an introduction service. [LEGAL REVIEW REQUIRED] DPA must be signed before shortlist is delivered. |
| **Required driver DB size** | 15–30 drivers covering the requested category and region |
| **Recommended launch phase** | Phase 2–3 (primary revenue model) |
| **Risk of customer objection** | "Why should I pay 18,000 SEK before I know if any of these drivers are any good?" |
| **Answer to objection** | "You know before you pay: the shortlist is delivered with full driver profiles before you contact a single driver. You can review every profile and if you are not satisfied with the quality, you can dispute within 48 hours of receipt. Compare: a standard recruitment agency charges 63,000–113,000 SEK for one hire and doesn't refund if it doesn't work out. We charge 18,000 SEK for a pre-screened shortlist of five." |
| **AI automation opportunity** | `buildShortlist()` already implemented. Shortlist document generation automatable. Consent check automatable. |

---

## Package 3 — Anställningsarvode

**English:** Hire Success Fee  
**Swedish tag line:** "Betala först när ni hittat er förare"

### Overview
DriverNord introduces a curated shortlist and is paid a success fee only when the company confirms it has hired one of the introduced drivers. No upfront payment. Highest risk for DriverNord; highest buyer appeal.

| Field | Detail |
|-------|--------|
| **Target customer** | Companies that are skeptical of upfront fees; companies that have been burned by agencies; companies with longer hiring cycles |
| **Ideal use case** | "We like the concept but won't pay until we've actually hired" |
| **Price hypothesis** | 35,000–45,000 SEK flat fee; or 10% of first-year annual salary (~42,000 SEK for CE at 35k/month) |
| **Payment timing** | Invoice triggered when: (a) company confirms hire of a DriverNord-introduced driver; OR (b) introduced driver begins work with company — whichever comes first |
| **Deliverables** | Same as Package 2, plus hire outcome tracking (DriverNord follows up at 30 and 60 days to confirm hire status) |
| **Guarantee / replacement logic** | If the hired driver leaves within 90 days of start date, DriverNord provides one free replacement shortlist. No cash refund. [LEGAL REVIEW REQUIRED — guarantee triggers must be clearly defined in service agreement.] |
| **Operational burden** | MEDIUM — includes hire tracking, 90-day follow-up, replacement obligation |
| **Legal caveats** | Requires a signed service agreement with: (a) explicit trigger definition, (b) list of introduced drivers with introduction dates, (c) 90-day monitoring clause, (d) payment terms and late payment consequences. Without a signed agreement, this package is not commercially viable. [LEGAL REVIEW REQUIRED] |
| **Required driver DB size** | 25–40 drivers; enough for replacement guarantee |
| **Recommended launch phase** | Phase 3 (offer only after trust is established via Packages 1 or 2; always with signed agreement) |
| **Risk of customer objection** | "We'll use the shortlist and then claim we found the driver ourselves" |
| **Answer to objection** | "The service agreement includes a 90-day introduction window. Any hire of a named driver within 90 days of introduction triggers the fee — regardless of who made the first contact. We track this by driver name and introduction date." |
| **AI automation opportunity** | 90-day hire window tracking automatable; reminder emails for follow-up automatable |

---

## Package 4 — Akut Förarsökning

**English:** Urgent Driver Search  
**Swedish tag line:** "Snabbaste vägen till en tillgänglig förare"

### Overview
A crisis product. When a company needs a driver who can start within 48 hours, DriverNord activates its "available now" driver pool and attempts to deliver an introduction within the agreed time window. Premium price for urgency.

| Field | Detail |
|-------|--------|
| **Target customer** | Any åkeri facing an unplanned driver absence; cold chain or time-sensitive logistics companies |
| **Ideal use case** | "Driver ill; delivery at 06:00 tomorrow; we need a CE+YKB driver in Stockholm now" |
| **Price hypothesis** | 6,000–12,000 SEK per urgent introduction; higher price for specialist (ADR, kyl/frys) |
| **Payment timing** | Payment on delivery (or within 24 hours of delivery); pre-authorization of card or invoice with fast-pay terms |
| **Deliverables** | One driver introduction with: self-declared availability "confirmed within last 7 days," relevant self-reported credentials, contact details, DriverNord availability confirmation message |
| **Guarantee / replacement logic** | If DriverNord cannot deliver an available driver within the agreed time window, the package is refunded in full (no driver introduced = no charge). If the introduced driver cannot meet the timing requirement, one additional attempt is made at no extra cost. |
| **Operational burden** | LOW — single introduction; but requires fresh availability data. Never deliver this package on stale driver data. |
| **Legal caveats** | "Available now" is based on driver's self-declared status confirmed within 7 days. DriverNord is not responsible if a driver's circumstances have changed since their last confirmation. [LEGAL REVIEW REQUIRED] |
| **Required driver DB size** | 3–5 drivers with confirmed "available_now" within 7 days in the relevant category |
| **Recommended launch phase** | Phase 2 (earliest revenue possible) |
| **Risk of customer objection** | "This is too expensive for something that might not work" |
| **Answer to objection** | "We only invoice you if we deliver. If we can't find an available driver in your category within the time window, you pay nothing. The premium reflects the genuine urgency and the fact that we maintain an always-confirmed available-driver pool — not a job board where you don't know who's actually looking." |
| **AI automation opportunity** | Real-time filtering of available_now drivers; automated SMS availability confirmation; urgent match alert |

---

## Package 5 — Månatlig Förarpipeline

**English:** Monthly Driver Pipeline Subscription  
**Swedish tag line:** "Kontinuerlig tillgång till nya, matchade förarkandidater"

### Overview
A monthly subscription where DriverNord proactively delivers 2–3 new, fresh driver profiles each month that match the company's standing profile — even before a vacancy opens. Companies stay ahead of their hiring needs.

| Field | Detail |
|-------|--------|
| **Target customer** | Medium åkeri with regular driver turnover (5+ hires/year); companies with structural, ongoing driver needs |
| **Ideal use case** | "We hire 6–8 drivers per year. We're always scrambling. We want a pipeline, not a crisis product." |
| **Price hypothesis** | 2,500 SEK/month (basic, 2 profiles/month) or 4,500 SEK/month (premium, 4 profiles/month + 1 urgent introduction per quarter) |
| **Payment timing** | Monthly billing, in advance |
| **Deliverables** | Monthly: 2–4 fresh driver profiles matching company's standing requirements. Each profile: self-reported credentials, availability, preference, DriverNord match score. One urgent introduction per quarter (premium tier). |
| **Guarantee / replacement logic** | If fewer than 2 matching profiles are available in any given month (database limitation), that month is credited or the delivery is made the following month. |
| **Operational burden** | MEDIUM — requires automated monthly matching + profile delivery workflow |
| **Legal caveats** | Subscription does not grant open database access. Each delivered profile still requires that specific driver's consent to be shared with this company. Subscription is for the delivery of consented profiles — not a database access right. [LEGAL REVIEW REQUIRED for subscription agreement terms.] |
| **Required driver DB size** | 100+ active drivers with regular new registrations (≥ 10/month) |
| **Recommended launch phase** | Phase 4 |
| **Risk of customer objection** | "2,500 SEK/month sounds okay, but what if you only send me drivers I've already seen or who aren't relevant?" |
| **Answer to objection** | "The subscription only delivers fresh profiles — drivers who have not previously been introduced to your company and who meet your current standing profile. If we cannot deliver ≥ 2 fresh matches in any month, we credit that month." |
| **AI automation opportunity** | Monthly matching run automatable; profile delivery document generation automatable; subscription renewal and credit tracking automatable |

---

## Package 6 — Premium Rekryteringspartner

**English:** Premium Recruitment Partner  
**Swedish tag line:** "Er dedikerade förarrekryteringspartner — från profil till anställning"

### Overview
A fully managed recruitment engagement for companies that want DriverNord to own the entire driver acquisition process: define the role, search, shortlist, coordinate conversations, support offer stage, and follow up for 6 months post-hire. The most complete product and the highest ticket.

| Field | Detail |
|-------|--------|
| **Target customer** | Growing transport companies (20–100 trucks) who are scaling but have no internal HR capacity; owner-operated companies where the founder manages both operations and hiring |
| **Ideal use case** | "We need to hire 5 CE drivers over the next 6 months for our fleet expansion. We don't have time to manage the process." |
| **Price hypothesis** | 8,000–12,000 SEK/month retainer (covers the managed process) + 25,000–35,000 SEK success fee per confirmed hire |
| **Payment timing** | Retainer billed monthly in advance; success fee invoiced on each confirmed hire |
| **Deliverables** | Dedicated sourcing effort for the company's profile; monthly pipeline reports; coordinated driver conversations; offer facilitation support; 6-month post-hire follow-up; replacement service if any hire leaves within 90 days |
| **Guarantee / replacement logic** | Full replacement shortlist at no additional charge for any hire that leaves within 90 days. Retainer continues during replacement search. |
| **Operational burden** | HIGH — requires either human recruiter capacity or very sophisticated automation |
| **Legal caveats** | At Phase 3–4, DriverNord lacks the headcount to fully deliver the "managed" element without automation. Do not promise human account management unless the capacity exists. Frame at Phase 3 as "AI-driven sourcing with human review and delivery." [LEGAL REVIEW REQUIRED] |
| **Required driver DB size** | 100+ drivers; 20+ new registrations/month to support ongoing pipeline |
| **Recommended launch phase** | Phase 5 (only after automation is mature and human capacity is available or substituted) |
| **Risk of customer objection** | "We've tried recruitment partners before and they just sent us CVs. What's different here?" |
| **Answer to objection** | "Every driver in our system has registered specifically for truck driving opportunities in your region and category. You're not getting unsolicited CVs — you're getting drivers who have said they want this type of role. We maintain their availability data and only introduce you to drivers who are currently open to a conversation." |
| **AI automation opportunity** | Very high — sourcing, matching, profile delivery, pipeline tracking all automatable. The "managed" element is the human review and client communication layer. |

---

## Pricing Architecture Summary

| Package | Swedish name | V1 price | Launch phase | Payment trigger | Primary buyer pain |
|---------|-------------|----------|-------------|----------------|-------------------|
| Paket 1 | Snabb Introduktion | 8,000–12,000 SEK | Phase 2 | On delivery | Acute crisis |
| Paket 2 | Verifierad Förarlista | 12,000–18,000 SEK | Phase 2 | On delivery | Active vacancy, low quality applicants |
| Paket 3 | Anställningsarvode | 35,000–45,000 SEK | Phase 3 | On hire | Skeptical buyer; risk aversion |
| Paket 4 | Akut Förarsökning | 6,000–12,000 SEK | Phase 2 | On delivery (fast) | Emergency 24–48h need |
| Paket 5 | Månatlig Förarpipeline | 2,500–4,500 SEK/month | Phase 4 | Monthly in advance | Ongoing structural need |
| Paket 6 | Premium Rekryteringspartner | 8,000–12,000 SEK/month + fee | Phase 5 | Retainer + on hire | Scale hiring without HR |

---

## Package Sequencing Logic

The packages are designed as a natural progression within a client relationship:

```
First contact
└─► Paket 4 (Akut) — if urgency exists
    └─► Paket 1 (Snabb Introduktion) — standard single introduction
        └─► Paket 2 (Verifierad Förarlista) — next vacancy
            └─► Paket 3 (Anställningsarvode) — for clients wanting no-risk
                └─► Paket 5 (Månadspipeline) — after first successful hire
                    └─► Paket 6 (Premium Partner) — for scaling clients
```

A client who starts with Package 4 (urgent, crisis) and is satisfied converts to Package 2 for their next hire. After 2 successful hires, they are a natural candidate for Package 5 (subscription). After 5+ hires, Package 6 is the pitch.

---

## Competitor Price Anchoring

Use this table in any commercial discussion to justify DriverNord pricing:

| Competitor / alternative | Cost | What the buyer gets | DriverNord advantage |
|--------------------------|------|--------------------|--------------------|
| Blocket Jobb × 3 ads | 9,000–15,000 SEK | 0–10 unverified applicants | Paket 2 at 18k delivers 5 self-declared qualified candidates |
| Yrkesförarjobb.se social ad | 5,900 SEK | 5,000–10,000 impressions | Paket 1 at 8k delivers one named, available driver |
| Chaffis annual subscription | 4,995 SEK/year | Unverified driver directory; self-service | Paket 5 at 2,500/month delivers matched, fresh profiles — not a directory |
| Swedish agency (15–25% of salary) | 63,000–105,000 SEK | 1 hire (agency fee whether it works or not) | Paket 3 at 40k is 40–60% cheaper for a comparable hire guarantee |
| Recruitive.se (2.2× monthly) | ~77,000 SEK | 1 hire | Paket 3 is 48% cheaper |
| Headscout.se flat fee | 74,900 SEK | 1 hire (generalist) | Paket 3 is 47% cheaper with transport specialisation |

---

## First Price Test Recommendation

**Test price for first sale:** Paket 2 at **15,000 SEK**

This is below the target range of 18,000 SEK intentionally. Reasons:
1. First client needs a reason to take the risk on an unproven product
2. 15,000 SEK is a price that can be approved without a procurement process by an SME owner
3. If the client is satisfied, the second sale can be at 18,000 SEK — position it as "introductory pricing for our first pilot clients"
4. If the client is not satisfied, the refund at 15,000 SEK is less painful than at 18,000 SEK

Alternatively: offer Package 4 (Snabb Introduktion, 8,000–10,000 SEK) as the very first transaction — it has a lower absolute price, lower DB requirement, and is easier to sell as "a test before a larger engagement."

---

*All prices are hypothetical starting points. Test willingness to pay with first 1–3 clients before committing to a published price list. Legal review required before any package is sold commercially.*
