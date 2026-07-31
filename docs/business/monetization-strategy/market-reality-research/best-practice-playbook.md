# DriverNord — Best Practice Playbook

**Date:** 2026-05-14
**Purpose:** Extract the operational, commercial, and product practices that the best-performing companies in this space use — and specify how DriverNord should adopt them. Drawn from verified competitor behavior and documented market patterns.
**Governing rule:** Only practices derived from verified or strongly inferred evidence. No generic advice.

---

## Practice Area 1: Driver Acquisition

### Best practice 1.1 — Multi-channel driver sourcing
**Observed in:** Manpower (250,000 CVs; 10,000 new/month), Lernia (education + staffing), Förartjänst (20,000+ claimed)
**What the best do:** Build driver supply from multiple channels simultaneously — paid ads, job boards, referrals, YKB school partnerships, driver community presence.
**What this means for DriverNord:** Meta Ads alone are not sufficient for a resilient driver supply. Phase 2 onwards: add Arbetsförmedlingen integration, partnerships with Swedish YKB training centers, driver referral incentive program.

### Best practice 1.2 — Active recruitment, not passive registration
**Observed in:** Simplex, Rekryteringsgruppen, Tranpenad (all have active sourcing operations)
**What the best do:** Do not wait for drivers to find the platform. Reach out through industry channels — trade shows, trucking forums, union-adjacent communities (Transport fackförbund).
**What this means for DriverNord:** Meta Ads target drivers actively; this is correct. But supplement with presence in driver community forums (Truckers.se or equivalent), Facebook groups for CE drivers, and LinkedIn transport networks.

### Best practice 1.3 — Capture availability at registration and refresh regularly
**Observed in:** Rekryteringsgruppen (90-minute urgent response capability implies constant availability tracking), Driver Require UK ("driver not performing — replacement same day")
**What the best do:** Know which drivers are available right now, not just which ones registered 6 months ago.
**What this means for DriverNord:** The current system captures availability at intake but does not have a systematic refresh mechanism. Before any urgent shortlist is delivered, availability must be confirmed within 7 days. `followUpAgent` is designed to handle follow-up — use it for availability refresh, not just engagement.

---

## Practice Area 2: Driver Qualification

### Best practice 2.1 — Verify credentials against official sources, not self-report
**Observed in:** Staffing agencies (employer obligation to verify before deployment), Driver Require UK (tachograph compliance monitoring)
**What the best do:** License validity, YKB expiry, and driving record are verified against official registries before any driver is presented to a client.
**What this means for DriverNord:** Current limitation — YKB and license are self-reported in intake. No Transportstyrelsen API integration exists. This is a Phase 2 priority. Until then, DriverNord must be transparent that qualification is structured self-report, not official verification. Once Transportstyrelsen verification is added, this becomes a unique differentiator.
**Action required:** Research Transportstyrelsen API access requirements. This may require Datainspektionen consultation given personal data implications. [LEGAL REVIEW REQUIRED]

### Best practice 2.2 — Score drivers, do not simply qualify/reject
**Observed in:** DriverNord's own design (classify.ts LeadPriority tiers) — this is ahead of every identified competitor
**What the best do (future state):** Continuous scoring based on license freshness, YKB expiry, response rate, placement success rate.
**What this means for DriverNord:** The `classify()` function already exists. Extend it over time to incorporate response rate data, availability refresh patterns, and introduction success rates. This generates a proprietary driver quality score that no competitor has.

### Best practice 2.3 — Capture specialized certificates from day one
**Observed in:** Construction transport buyers need ADR; food distribution needs refrigerated transport experience; Rekryteringsgruppen claims sector specialization
**What the best do:** Know which drivers have ADR certification, crane operator experience, or refrigerated transport experience before a buyer asks.
**What this means for DriverNord:** Current intake captures CE/C/D license and YKB. ADR certificate capture is not in the current flow. Add ADR as an optional field in the chat step after `driver_card` step. This unlocks the construction and hazmat transport buyer segments.

---

## Practice Area 3: Client Delivery and Guarantee

### Best practice 3.1 — Define the guarantee before the first sale
**Observed in:** Rekryteringsgruppen (10-day free replacement guarantee), Driver Require UK (same-day replacement), agency standard (3–6 month warranty)
**What the best do:** Every credible operator in this space offers some form of guarantee. The absence of a guarantee is a material objection for any buyer familiar with agency services.
**What this means for DriverNord:** Design a guarantee policy before the first commercial conversation. Recommended V1 guarantee:
- "If a driver in the shortlist is unavailable within 24 hours of delivery, DriverNord will replace that driver within 5 business days at no additional charge."
- This is achievable once the database has ≥20 drivers.
- A guarantee is a commitment, not a marketing claim — only offer it when the database can support it.

### Best practice 3.2 — Deliver a shortlist, not a single candidate
**Observed in:** All agencies deliver 3–5 candidates; buyer interviews and selects
**What the best do:** Give the buyer choice. A single candidate forces a binary accept/reject decision. 3–5 gives the buyer a sense of selection without decision fatigue.
**What this means for DriverNord:** Package 2 (3–5 drivers) is correctly designed. Package 4 (1 driver) is the urgent exception — acceptable because urgency justifies reduced choice. Do not expand Package 4 to be the primary offer.

### Best practice 3.3 — Confirm availability within 48 hours of delivery
**Observed in:** Rekryteringsgruppen urgency response; Driver Require same-day deployment
**What the best do:** Before delivering a shortlist, re-confirm each driver's current availability. Delivering a profile of a driver who accepted another job last week destroys trust.
**What this means for DriverNord:** Build a pre-delivery confirmation step into the process: SMS/email drivers on the shortlist 48 hours before delivery to confirm they are still available and still interested. The 46elks SMS integration is the mechanism for this. This step is impossible until 46elks is configured.

---

## Practice Area 4: GDPR and Consent Design

### Best practice 4.1 — Per-company consent before any introduction
**Observed in:** Förartjänst.se (best documented consent model in Swedish market: driver profile private by default; driver approves per-company)
**What the best do:** Drivers explicitly approve before their profile is shared with any specific company.
**What this means for DriverNord:** The Stage 3 consent design is the right approach and already documented. This is ahead of every other identified Swedish competitor (no other company publicly documents per-company consent). Implement and market this explicitly — it is a differentiator for GDPR-conscious buyers (especially larger companies with compliance functions).

### Best practice 4.2 — Separate DPA from service agreement
**Observed in:** Standard GDPR compliance for data-sharing businesses [LEGAL REVIEW REQUIRED]
**What the best do:** Use a service agreement to govern the commercial relationship (what DriverNord delivers, fee, payment terms) and a separate DPA to govern data sharing (what driver data is shared, basis, retention, deletion).
**What this means for DriverNord:** Both documents are required before any shortlist is shared with a client company. Not optional. See `founder-decision-brief.md` — Legal Review Required.

### Best practice 4.3 — Driver data deletion on request — process must exist
**Observed in:** GDPR Art. 17 requirement; hej@drivernord.com is the stated channel
**What the best do:** Have a clear, documented process for responding to driver deletion requests within 30 days. The process must be tested before launch.
**What this means for DriverNord:** hej@drivernord.com must be monitored daily from day 1. The deletion process (remove driver from `drivers`, `ingested_drivers`, `shortlist_entries`) must be tested in the local Supabase environment before launch.

---

## Practice Area 5: Commercial and Pricing Practices

### Best practice 5.1 — Publish your price
**Observed in:** Chaffis.se (4,995 SEK/year — only Swedish competitor to publish), Leadgamp (per-lead and per-hire pricing), CDL Lead Source (per-list pricing)
**What the best do (in accessible markets):** Transparent pricing removes the "I need a quote" friction and attracts self-service buyers who are ready to purchase.
**What this means for DriverNord:** Publishing the Package 2 and Package 4 prices on the company page removes objection friction. It also signals confidence in the pricing. Agencies don't publish because their prices are high and vary by negotiation. DriverNord's fixed price is an advantage — use it.

### Best practice 5.2 — Payment on delivery, not on hire
**Observed in:** No Swedish competitor does this explicitly — all either charge upfront (Chaffis) or on hire (agency model). DriverNord's proposed "on shortlist delivery" is a novel payment structure.
**What the best do:** Agencies charge on hire because they can — they have leverage. DriverNord at Phase 1 doesn't have leverage yet. "Pay on delivery of the shortlist" is the correct structure because it:
- Gives the buyer a clear trigger (they receive the shortlist)
- Gives DriverNord cash flow before the hire happens (can be weeks later)
- Avoids the collection complexity of the success-fee model
**Risk:** Buyer may refuse to pay if they consider the shortlist quality insufficient. Mitigate with guarantee policy (Practice 3.1).

### Best practice 5.3 — Upsell path from entry to relationship
**Observed in:** Rekryteringsgruppen (urgent staffing → permanent recruitment), agencies (one hire → retained account)
**What the best do:** The first sale is not the objective — the relationship is. Every Package 4 introduction should have a clear path to Package 2. Every Package 2 should have a clear path to Package 3 (success fee) or Package 5 (subscription).
**What this means for DriverNord:** After every successful shortlist delivery, the follow-up message is not "thank you for your business" but "you now have 3–5 qualified drivers to choose from. If you hire one, and need another in 6 months, our subscription option gives you ongoing access to new drivers as they enter our database."

---

## Practice Area 6: Speed and Urgency

### Best practice 6.1 — Define response time commitment and honor it
**Observed in:** Rekryteringsgruppen (90-minute urgent response), Driver Require UK (same-day), Simplex (dispatch model)
**What the best do:** Urgency is a buying trigger. Companies with acute driver shortages want a service that can respond fast.
**What this means for DriverNord:** Package 4's 48-hour promise must be operationally achievable before it is offered. If the database has fewer than 5 drivers, 48 hours is not achievable. Only offer Package 4 once the minimum driver threshold is met. A missed delivery promise on the first client is catastrophic.

### Best practice 6.2 — Separate urgent from planned offerings with different pricing
**Observed in:** Rekryteringsgruppen (urgent staffing vs. permanent placement — separate offerings), Driver Require (temp vs. permanent)
**What the best do:** Price urgency separately. Urgent delivery costs more because it consumes more operational capacity.
**What this means for DriverNord:** Package 4 (urgent, 8,000–10,000 SEK) vs. Package 2 (planned shortlist, 15,000 SEK) is correctly structured. The pricing difference signals quality-of-service, not just volume.

---

## Practice Area 7: Operational Trust-Building

### Best practice 7.1 — Reference clients as social proof
**Observed in:** Förartjänst (displays DSV, DHL, HAVI, ICA, Martin Servera logos), Simplex (DB Schenker, Bring, Dagab logos), Rekryteringsgruppen (sector case studies)
**What the best do:** Display client logos and case studies prominently. In B2B services, "who else uses this?" is the most powerful objection handler.
**What this means for DriverNord:** After the first successful client relationship, request permission to display the company's logo or a brief testimonial. Even one credible reference (a named Stockholm transport company) is worth more than all the positioning language combined.

### Best practice 7.2 — Respond to every inquiry within 2 hours during business hours
**Observed in:** Rekryteringsgruppen urgency positioning; Driver Require same-day
**What the best do:** Speed of response is itself a product signal. A buyer in acute need who emails at 10am and gets a response at 3pm has already partially decided the service is not urgent-capable.
**What this means for DriverNord:** hej@drivernord.com must have a <2 hour response SLA from day 1 of commercial operations. The founder must be reachable during business hours until there is a team.

---

## Summary — Priority Practices for Phase 1 (Next 90 Days)

| Practice | Priority | Blocker if ignored |
|---------|----------|-------------------|
| Confirm availability within 7 days of shortlist delivery | CRITICAL | Shortlist quality; buyer trust |
| Define and document the guarantee policy | HIGH | Buyer objection in every sales conversation |
| Per-company consent (Stage 3) before any introduction | CRITICAL | GDPR compliance gap |
| DPA template reviewed by lawyer | CRITICAL | Cannot legally share driver profiles |
| hej@ monitored with <2h response SLA | HIGH | First impression failure |
| 46elks SMS configured | CRITICAL | Cannot confirm availability; cannot send consent requests |
| Pre-delivery availability re-confirmation step | HIGH | Stale profiles damage trust |
| ADR field added to driver intake | MEDIUM | Misses construction/hazmat buyer segment |
| Publish Package 2 and Package 4 prices on website | MEDIUM | Missed self-service buyers; pricing friction |

---

*All practices derived from verified competitor behavior, documented market data, or strongly inferred from industry context. No practices are generic recommendations — each is tied to a specific observed market evidence. No companies were contacted.*
