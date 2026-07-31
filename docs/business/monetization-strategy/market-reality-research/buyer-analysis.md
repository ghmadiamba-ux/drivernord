# DriverNord — Buyer Analysis

**Date:** 2026-05-14
**Purpose:** Map who the actual buyers of driver introduction services are, what pain they experience, how they currently solve it, what they are willing to pay, and which companies within the DriverNord opportunity database are the best first targets.
**Governing rule:** Public data only. Named companies from the top-10-notes.md database included where documented. No contact. No cold outreach as immediate next step.

---

## Buyer Landscape Overview

The buyer for DriverNord's V1 product is a company that:
1. Employs or wishes to hire professional CE/C/D drivers (not rent from a staffing agency)
2. Has an active, unfilled driver need right now or regularly
3. Is not large enough to have a dedicated in-house recruitment function
4. Is willing to pay a flat fee for qualified driver introductions

**Key insight:** The buyer is not "all companies that need drivers." The buyer is a company that has decided to hire rather than staff, and that finds existing solutions (agency recruitment, job boards, self-recruitment) either too slow, too expensive, or too unqualified.

---

## Buyer Segment A — Small Regional Transport Operators (Primary)

**Profile:**
- 5–50 employees
- 1–15 CE trucks/vehicles
- Stockholm region (primary); regional hubs secondary
- SNI 49410 (road freight) or adjacent (construction logistics, food delivery, materials)
- Owner-operator or small management team; no dedicated HR
- CE driver shortage is an acute operational problem — unfilled positions cost money in rejected loads or subcontractor fees

**Pain point:**
- One unfilled CE driver position can mean 1–3 rejected loads per week at 5,000–15,000 SEK per load (STRONG INFERENCE from industry context)
- Agency fees at 15–30% of salary (~63,000–126,000 SEK) are prohibitive for a small operator
- Yrkesförarjobb.se ads at 5,900 SEK get applications but not necessarily from qualified, available drivers
- Chaffis.se at 4,995/year gives access to a directory but no guarantee of finding the right person
- Arbetsförmedlingen (public employment service) has long lead times and quality variability

**Decision-making process:**
- Owner or operations manager makes the hiring decision
- Budget authority is informal — no procurement process, no vendor approval committee
- Purchase decision made in days, not weeks
- Will act quickly when facing an acute shortage

**Willingness to pay:**
- Will pay for a demonstrably faster, more qualified solution
- 8,000–15,000 SEK is below the psychological threshold of "expensive" for an operator facing a 50,000+ SEK/month revenue impact from one unfilled position
- Package 4 (8,000–10,000 SEK) for one urgent introduction: HIGH willingness to pay if driver is genuinely available
- Package 2 (15,000 SEK) for 3–5 shortlisted drivers: HIGH willingness to pay if quality is verified

**Best entry package:** Package 4 (Akut Förarsökning) — urgent need, simple decision, immediate value delivery

**Named companies from DriverNord opportunity database:**

| Company | Location | Why they fit Segment A | Notes |
|---------|----------|----------------------|-------|
| Canoil Sverige AB | Stockholm | Regional transport operator; documented CE driver need | Identified as first-contact candidate |
| Trabé Åkeri AB | Stockholm region | Small åkeri; unfilled CE positions visible | Identified in top-10-notes.md |
| Edvardssons Åkeri | Stockholm/Uppsala | Regional; likely owner-managed | Identified in top-10-notes.md |
| JPC Transport | Stockholm | Smaller operator | Identified in top-10-notes.md |
| Enskede Transport | Stockholm | Local operator; Enskede district | Identified in top-10-notes.md |

**Priority:** Highest. These are the first commercial conversations when ≥20 drivers are in the database.

---

## Buyer Segment B — Mid-Size Logistics Companies (Secondary)

**Profile:**
- 50–500 employees
- Regional or national distribution operations
- May have an HR team, but transport hiring is specialized and often outsourced
- Use agencies for temporary staffing but also hire permanent drivers
- SNI 49410 primary; also 49310 (urban transport), 49420 (removal), 52292 (freight forwarding)

**Pain point:**
- High driver turnover (industry-wide average: 30–40% annual turnover for CE drivers — STRONG INFERENCE)
- Ongoing need to replace departing drivers
- Agency recruitment (Model B) takes 3–8 weeks — too slow when a driver leaves unexpectedly
- Large agencies (Manpower, Randstad) not optimized for transport; smaller agencies limited in driver pool depth

**Decision-making process:**
- HR manager or transport operations director is the decision-maker
- May require a vendor approval process (small but real procurement friction)
- Likely to run multiple parallel solutions: job board + agency + DriverNord simultaneously
- Will evaluate based on time-to-hire and quality of candidates

**Willingness to pay:**
- Familiar with agency fees (15–30% of salary); 15,000 SEK per shortlist is compelling by comparison
- Success-fee model (pay on hire) more familiar to this segment than shortlist fee
- Package 2 (15,000 SEK shortlist) requires a trust bridge: "Why should I pay before I even interview them?"
- Package 3 (success fee on hire, 35,000–45,000 SEK) may convert better after first shortlist experience

**Best entry package:** Package 4 or Package 2; upsell to Package 3 after successful first hire

**Named companies from DriverNord opportunity database:** Not yet documented at this scale. See master-opportunity-database for future targets.

---

## Buyer Segment C — Construction and Specialized Transport (Adjacent)

**Profile:**
- 10–200 employees
- CE trucks for heavy construction material transport, concrete mixers, cranes, specialized loads
- CE driver need is specific: often requires ADR certificate, specialized body experience, or specific regional routes
- Seasonal peaks (construction season: spring–autumn)
- SNI codes: 41200 (construction), 43120 (site preparation), 49410 (transport subsidiary)

**Pain point:**
- Seasonal surge demand is predictable but hard to plan for
- Drivers with specialized certificates (ADR, crane operation) are rarer and harder to find
- Arbetsförmedlingen does not have adequate supply of specialized CE drivers
- Construction companies typically use temporary staffing for peaks, but this is expensive

**Willingness to pay:**
- Higher than general transport operators when specialization is needed
- 15,000–25,000 SEK for a shortlist of 5 ADR-certified CE drivers is realistic
- Specialized Package variant (future) could be priced at a premium

**Best entry package:** Package 2 with specialist filter as differentiation; future specialized package

**Note:** This segment requires DriverNord to tag specialized certifications in the driver profile (ADR, crane). Currently the intake flow captures CE/C/D and YKB. ADR is not captured in the current schema.

---

## Buyer Segment D — Food Distribution and Cold Chain (Adjacent)

**Profile:**
- Regional food distributors, dairy, retail FMCG distribution
- CE drivers for refrigerated trucks (kylbil) — requires specific experience, sometimes ADR
- Partners of Förartjänst.se: ICA, Martin Servera, HAVI — these companies have documented driver needs
- Night and weekend shift availability is common requirement

**Pain point:**
- Refrigerated transport is time-critical — driver absence directly causes spoiled product or service failure
- Shift patterns (night, weekend) limit the pool of willing drivers
- Regular turnover creates a recurring need, not a one-time hire

**Willingness to pay:**
- High — the cost of one spoiled delivery route is several times the DriverNord fee
- This segment is a strong candidate for Package 5 (monthly subscription) in later phases

**Best entry package:** Package 4 for urgent single introduction; Package 2 for proactive shortlisting

**Note:** DriverNord's intake flow captures shift preference (night, weekend, flexible). This data is the differentiator for this segment.

---

## Buyer Segment E — Companies Already Using Staffing Agencies (Conversion Target)

**Profile:**
- Any transport company currently using Simplex, Tranpenad, or similar for temporary drivers
- They are paying 450 SEK/h+ for a driver they could hire permanently for 215 SEK/h
- The permanent hire converts a 832,500 SEK/year staffing cost to ~450,000 SEK/year employment cost

**Pain point:**
- Staffing cost is 83% more than direct employment for full-time use
- But making the switch requires finding a qualified driver to hire — which is the problem DriverNord solves

**Decision-making process:**
- Finance director or owner notices the cost differential
- Approaches DriverNord (or equivalent) to find a permanent hire to replace the staffed position
- Will pay 15,000–45,000 SEK for the introduction that saves 200,000–400,000 SEK/year in staffing fees

**Willingness to pay:** HIGH — strongest financial justification of any segment

**Best entry package:** Package 2 (Verifierad Förarlista) with ROI framing — "Replace your 450 SEK/h staffed driver with a 15,000 SEK permanent introduction"

---

## Buyer Readiness Matrix

| Segment | Urgency | Budget availability | Decision speed | Best Package | Priority |
|---------|---------|--------------------|--------------|-----------|----|
| A — Small regional transport | HIGH (operational need) | Medium | Fast (days) | Package 4 → Package 2 | **1** |
| B — Mid-size logistics | MEDIUM (ongoing need) | High | Medium (weeks) | Package 2 → Package 3 | **2** |
| C — Construction specialized | SEASONAL HIGH | High | Fast when urgent | Package 2 specialist | **3** |
| D — Food distribution | HIGH (critical operations) | High | Fast | Package 4 → Package 5 | **4** |
| E — Staffing conversion | MEDIUM (financial motivation) | Very High | Medium | Package 2 with ROI | **2** |

---

## Anti-Buyers (Do Not Pursue in Phase 1)

| Segment | Why not |
|---------|---------|
| Large national carriers (DB Schenker, Bring, DHL) | Use enterprise agencies with existing relationships; long procurement cycles; not accessible |
| Companies wanting staffed drivers (not hired) | Wrong product — DriverNord is not a staffing company |
| Companies outside Stockholm region | Driver database not yet built outside Stockholm; cannot deliver a credible shortlist |
| Companies wanting ADR specialists | ADR not captured in current driver intake; cannot filter or verify |
| Companies with <3 month runway | Cannot afford any paid service; would not pay on delivery |

---

## Buyer Education Requirement

One material challenge is that **buyers have never purchased a "verified driver shortlist."** This product does not exist in the market today. Buyers are accustomed to:
- Job board ads (pay for impressions)
- Agency recruitment (pay on hire)
- Staffing (pay hourly)

The "pay 15,000 SEK on delivery of shortlist, before you contact the drivers" model requires education. The buyer must understand:
1. What they are buying (3–5 verified, available, consented drivers — not raw applications)
2. Why they pay before contacting (the delivery event is the shortlist, not the hire)
3. What happens if drivers are unavailable or unresponsive (guarantee mechanism needed)

**Implication for sales process:** The first 3 clients will require a longer explanation. The founder should have a one-page product sheet ready before any commercial conversation. After 3 successful sales, client references do the education work.

---

*Named companies from top-10-notes.md and master-opportunity-database. All other company characterizations are from public market data and documented demand signals. No companies were contacted. No buyer behavior data comes from primary research — all from documented market patterns.*
