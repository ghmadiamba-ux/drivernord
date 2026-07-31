# Founder Decision Brief — DriverNord Positioning and Pricing

**Research date:** 2026-05-21  
**Scope:** Concise recommendation synthesising the full global research set  
**Purpose:** Single document to inform the founder's next 3 commercial decisions

---

## What the Research Shows in One Paragraph

No company in Sweden — and no company globally with a Swedish CE/C/D driver focus — operates an AI-led, consent-based, governance-audited shortlist-introduction service at a flat fee per introduction. The closest analogues (O Trucking, LMDR) are in the US and do not serve Sweden. The only domestic competitor (Förartjänst.se) is mid-rebuild of a job-board product. DriverNord's architecture is uncontested in the Swedish market. The competitive window is open through at least end of 2026. The pricing anchors justify 15,000 SEK per shortlist. The supply exists to begin the pilot programme now.

---

## Decision 1: Which Business Model to Adopt

**Recommendation: Flat fee per introduction (Pattern 5), not success fee, not subscription, not job board.**

| Option | Verdict | Reason |
|---|---|---|
| Lead sale (raw contact) | Reject | Commoditises quality signal; no governance story |
| Job board (posting fee) | Reject | No differentiation from Arbetsförmedlingen |
| Percentage of salary | Reject | Collection disputes; requires salary disclosure |
| Success fee (pay on hire) | Reject | Collection latency; hire-confirmation disputes |
| Subscription (now) | Defer | Insufficient driver inventory; churn risk |
| **Flat fee per shortlist introduction** | **Adopt** | Pays on delivery; defensible vs. 63–105K anchor |

**The model to copy most closely: O Trucking's per-delivery trigger + LMDR's shortlist framing.**

---

## Decision 2: What Price to Charge

**Recommendation: 15,000 SEK per Package 2 (3-candidate shortlist). 9,500 SEK per Package 3 (urgent single introduction). 0 SEK for the 5 pilot engagements.**

### Why 15,000 SEK is the right post-pilot Package 2 price

1. 76–86% below traditional Swedish rekrytering (63,000–105,000 SEK) — primary anchor
2. Consistent with LMDR equivalent for a 3-candidate shortlist (~8,000–12,000 SEK)
3. Above the UK introduction market top end (~4,550 SEK for a single driver)
4. Below "feels like a lot" threshold for a 3-candidate curated service from a new provider
5. Leaves room to raise to 18,000–22,000 SEK once named case studies exist

### Why 9,500 SEK is the right urgent-single-introduction price

1. Reflects urgency premium over single-candidate pilot test
2. Employers with urgent needs have lower price sensitivity
3. Above O Trucking ($500 = ~5,200 SEK) for a comparable single verified introduction
4. Can be delivered same-day if clean candidate is in pool

### What to charge in the pilot phase

0 SEK. The pilot is not a discounted product. It is a proof-of-concept in exchange for feedback and reference rights. Frame it explicitly as a pilot — not a "free trial" and not a promotional discount.

---

## Decision 3: Which Pilot to Run First

**Recommendation: Enskede Bilexpress — CE, distribution, top match score 97 (Samir), 5+ clean candidates.**

### Why Enskede is the right first pilot

1. **Highest match score:** Samir at 97 is the strongest single candidate in the entire pool. Starting with the best match maximises the probability of a positive pilot outcome.
2. **Clean governance:** Samir has no DQ flag and no duplicate flag. The introduction can proceed without force-override governance overhead.
3. **Standard urgency:** Unlike JPC and Edvardssons (urgent), Enskede is standard — giving the founder time to run the process carefully rather than under time pressure.
4. **Distribution domain:** Clean B2B selling profile. Distribution companies have recurring CE hire needs — if Enskede becomes a repeat customer, the LTV is significant.

### Pilot readiness checklist for Enskede

Before the first pilot shortlist can be delivered, the following must be true:

| Condition | Status as of 2026-05-20 | Action required |
|---|---|---|
| Company need is `outreach_approved` | NO — needs approval | Founder approves in cockpit Section B |
| 46elks configured | NO | Not required for pilot — shortlist can be delivered manually by email |
| hej@drivernord.com configured | NO | Not required — founder can send from personal email for pilot |
| Samir's contact_suggested confirmed | Pending | Confirm in cockpit Section C |
| 2 additional clean CE candidates for Enskede | Need to verify | Check shortlist in cockpit Section B |
| Written pilot terms prepared | NO | Prepare a 1-page pilot agreement |

**The pilot can begin before 46elks is configured.** The shortlist can be delivered as a formatted PDF or email with the 3 candidates' details, match rationale, and governance clearance status. 46elks is for automated SMS contact — the first pilot should be manually executed to give the founder direct control and learning.

---

## Key Risks and How to Mitigate

### Risk 1: Pilot employer contacts drivers before DriverNord confirms governance clearance

**Mitigation:** The shortlist must only be delivered after all three candidates in it are governance-cleared (Section C of cockpit, confirmed status). Do not deliver a shortlist containing flagged candidates. If only 1–2 of 3 are clean, hold the shortlist until the third is cleared or replaced.

### Risk 2: Pilot employer does not provide feedback

**Mitigation:** Build the 14-day feedback requirement into the pilot terms before delivery. Send a reminder at day 7 and day 14. Keep the feedback form to 3 questions maximum.

### Risk 3: Förartjänst.se relaunches before pilot is complete

**Mitigation:** The relaunch is not DriverNord's threat. Even with a relaunch, Förartjänst.se's model will remain job-board-first. The governance + AI matching differentiator holds. Monitor and adjust positioning language; do not delay the pilot for competitive reasons.

### Risk 4: Candidates are unreachable when employer contacts them

**Mitigation:** The governance system flags availability. Only include candidates with `availability = 'now'` or `'within_one_month'` in shortlists. Do not include `'within_three_months'` or `'not_available'` candidates in a paid or pilot shortlist.

### Risk 5: Pricing anchor erodes over time

**Mitigation:** Never lead with the price. Always lead with the savings anchor ("traditional recruiting costs 63,000–105,000 SEK"). Price should feel like a relief, not a barrier.

---

## The First Offer (Verbatim)

When contacting Enskede Bilexpress (or any first pilot employer):

> "Vi är DriverNord. Vi matchnar CE-chaufförer till transportföretag i Stockholm med hjälp av AI. Vi har tre chaufförer i vår databas som matchar era krav — CE-körkort, rätt region, tillgängliga nu. Vi erbjuder er att testa vår tjänst utan kostnad: ni får ett shortlist med tre kandidater som vi har kontrollerat för datakvalitet. Det enda vi ber om är feedback och rätten att referera till samarbetet anonymt. Är ni intresserade av ett möte?"

*(English: "We are DriverNord. We match CE drivers to transport companies in Stockholm using AI. We have three drivers in our database who match your requirements — CE licence, right region, available now. We offer you the chance to test our service at no cost: you receive a shortlist of three candidates that we have verified for data quality. All we ask is feedback and the right to reference the collaboration anonymously. Are you interested in a meeting?")*

---

## Decision Summary

| Decision | Recommendation |
|---|---|
| Business model | Flat fee per shortlist introduction (pay on delivery) |
| Package 2 price (post-pilot) | 15,000 SEK |
| Package 3 price (urgent, single) | 9,500 SEK |
| Pilot price | 0 SEK (pilot, not discount) |
| First pilot company | Enskede Bilexpress |
| Pre-pilot action required | Approve Enskede outreach in cockpit; confirm Samir in contact queue |
| When to run 46elks | After pilot 1 produces positive feedback; not before |
| Subscription launch trigger | After 1,000+ verified drivers in pool + 3 repeat employer customers |
| Competitor to watch | Förartjänst.se relaunch timing |

---

## What Success Looks Like in 90 Days

1. 5 pilot shortlists delivered
2. At least 2 employer reference contacts confirmed
3. At least 1 named case study drafted (subject to employer consent)
4. At least 1 employer has placed a post-pilot paid order
5. 46elks configured and tested with at least 1 non-production driver contact
6. DriverNord has a live, defensible answer to "who has used this before?"

That is the evidence base that makes every subsequent commercial conversation easier.
