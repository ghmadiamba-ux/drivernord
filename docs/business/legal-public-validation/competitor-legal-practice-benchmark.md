# DriverNord — Competitor Legal Practice Benchmark

**Status:** Research complete — 2026-05-14
**Syfte:** Document how comparable companies publicly position their legal model, GDPR compliance, and service classification. Used to calibrate whether DriverNord's draft documents are consistent with market practice.
**Varning:** Competitor practice does not make a practice legal. This document records what competitors do publicly, not whether it is legally sound. "Competitor X does it" is never a legal justification — it is an indicator of market convention. All conclusions should be reviewed by a lawyer.

---

## Label Key

| Label | Meaning |
|-------|---------|
| COMPETITOR PRACTICE | Observed directly in public competitor materials |
| STRONG INFERENCE | Inferred from clearly stated public positioning |
| NOT OBSERVED | Not found in public materials reviewed |
| UNCERTAIN | Ambiguous from available sources |

---

## 1. Tranpenad Group — Bemanning Benchmark

**What they are:** Sweden's largest private staffing company for transport/logistics drivers.
**Model:** Classic bemanningsföretag — Tranpenad employs drivers, deploys them to client transport companies.
**Source:** tranpenad.se/om-oss, tranpenad.se/jobbsokande

### Legal positioning observations:

| Aspect | Tranpenad Practice | Label |
|--------|-------------------|-------|
| Employment relationship | Explicitly states "anställning hos Tranpenad" — workers are Tranpenad employees | COMPETITOR PRACTICE |
| Kollektivavtal | References collective agreement coverage for deployed drivers | COMPETITOR PRACTICE |
| Privacy policy | Has a published privacy policy (standard corporate GDPR compliance) | COMPETITOR PRACTICE |
| Driver consent language | No specialized per-company consent SMS flow visible publicly | NOT OBSERVED |
| Service classification | Self-described as bemanningsföretag throughout | COMPETITOR PRACTICE |
| Liability for driver qualifications | Not explicitly addressed in public materials | NOT OBSERVED |

**Key insight for DriverNord:** Tranpenad's model is structurally distinct from DriverNord's. Where Tranpenad says "anställning hos oss," DriverNord must consistently say "introduktion, anställning sker direkt med transportföretaget." There should be zero language overlap with the employment framing.

---

## 2. Manpower Sweden — Rekrytering Benchmark

**What they are:** Global HR company operating both bemanning and rekrytering in Sweden.
**Model (rekrytering side):** Manpower finds candidates, facilitates introduction, client employs the candidate directly, Manpower charges a placement fee.
**Source:** manpower.se/om-oss

### Legal positioning observations:

| Aspect | Manpower Practice | Label |
|--------|------------------|-------|
| Bemanning vs rekrytering distinction | Explicitly separates the two models in public materials | COMPETITOR PRACTICE |
| Fee basis | Placement fee charged to employer; not disclosed publicly | STRONG INFERENCE |
| Candidate consent | No public per-candidate consent flow visible | NOT OBSERVED |
| Self-reported credentials | Not discussed in public materials | NOT OBSERVED |
| Service classification | Self-described as both bemanningsföretag AND rekryteringsbyrå depending on service | COMPETITOR PRACTICE |
| GDPR notices | Standard corporate privacy policy; no driver-specific consent flow visible | COMPETITOR PRACTICE |

**Key insight for DriverNord:** Manpower's rekrytering model (permanent placement, client employs directly) is structurally the closest large-company analog to DriverNord — but Manpower doesn't do driver-specific matching and doesn't use SMS consent flows. DriverNord's model is more niche and more consent-centric than anything Manpower offers.

---

## 3. Chaffis — Closest Direct Competitor

**What they are:** A Swedish driver matching platform with an employer-pays model for connecting CE/C/D drivers with transport companies.
**Model:** Drivers register for free; transport companies pay for access to matched profiles. Functionally identical to DriverNord's V1 model.
**Source:** chaffis.se (homepage only — GDPR documents not accessible)

### Legal positioning observations:

| Aspect | Chaffis Practice | Label |
|--------|-----------------|-------|
| Service classification | "Matchningsplattform" — not staffing, not placement guarantee | COMPETITOR PRACTICE |
| Employer-pays model | Employer pays; driver registration is free | COMPETITOR PRACTICE |
| Driver consent for sharing | Not publicly documented (GDPR docs inaccessible) | NOT OBSERVED |
| Privacy policy | Referenced but not accessible at time of research | NOT OBSERVED |
| Per-company consent SMS | Not visible in public materials | NOT OBSERVED |
| Self-reported credentials disclaimer | Not visible in public materials | NOT OBSERVED |

**Key insight for DriverNord:** Chaffis operates the same commercial model as DriverNord. Their GDPR documentation is not publicly accessible or well-surfaced. DriverNord has an opportunity to differentiate on compliance transparency — a clearly documented, consent-first approach that Chaffis does not publicly demonstrate. This is both a legal risk management advantage AND a competitive differentiator with enterprise-conscious transport companies.

---

## 4. Yrkesförarjobb.se — Aggregator Benchmark

**What they are:** A niche job listing aggregator for professional drivers in Sweden.
**Model:** Pure aggregator — transport companies post job ads, drivers browse and apply. No matching, no data collection for matching purposes.
**Source:** yrkesförarjobb.se (homepage, cookie banner)

### Legal positioning observations:

| Aspect | Yrkesförarjobb Practice | Label |
|--------|------------------------|-------|
| Service classification | Job listing aggregator — no matching claim | COMPETITOR PRACTICE |
| Driver data collection | Collects only newsletter/contact data, not matching profiles | COMPETITOR PRACTICE |
| Cookie consent | Has a 11-month cookie consent mechanism | COMPETITOR PRACTICE |
| GDPR privacy policy | Has a privacy policy (footer link) | COMPETITOR PRACTICE |
| Per-company consent | Not applicable to their model | N/A |

**Key insight for DriverNord:** Yrkesförarjobb's simpler model means simpler GDPR requirements. DriverNord's collection of richer profile data (license, YKB, availability, phone, email) and its profile-sharing with client companies creates materially more complex GDPR obligations than a pure aggregator.

---

## 5. Market Convention Summary

Based on the competitor scan, the following are **market norms** in the Swedish driver matching/staffing space:

| Practice | Market norm | DriverNord approach | Assessment |
|---------|------------|---------------------|-----------|
| Service classification language | Varies — bemanningsföretag, rekryteringsbyrå, matchningsplattform | Matchningstjänst / Introduktionstjänst | CONSISTENT WITH MARKET |
| Employer-pays model | Used by Manpower (rekrytering), Chaffis | Yes — 8,000–15,000 SEK per introduction | CONSISTENT WITH MARKET |
| Driver registration is free | Standard (Tranpenad jobs, Chaffis, Yrkesförarjobb) | Yes | CONSISTENT WITH MARKET |
| Published GDPR privacy policy | Universal | Draft exists; marked PRELIMINARY | CONSISTENT (needs finalization) |
| Per-company consent SMS | NOT OBSERVED in any competitor | Yes — Stage 3 consent | ABOVE MARKET STANDARD |
| Self-reported credentials disclaimer | NOT OBSERVED explicitly in competitors | Explicit disclaimer in service agreement | ABOVE MARKET STANDARD |
| Consent withdrawal mechanism | Standard opt-out in privacy policy | STOPP SMS + email deletion request | CONSISTENT WITH MARKET |

**Conclusion:** DriverNord's consent architecture (Stage 3 per-company SMS consent) and self-reported credentials disclaimer are **above market standard**. No competitor publicly demonstrates this level of per-introduction consent specificity. This is a legal risk management advantage, not a competitive disadvantage.

---

## 6. What Competitors Do NOT Demonstrate Publicly

The following legal practices are NOT observed in any competitor's public materials — meaning DriverNord has no benchmark to follow or deviate from:

1. **Per-company consent SMS text** — no competitor shows this
2. **Explicit "selvrapporterade uppgifter" disclaimer** in service agreement — not found
3. **Stage-by-stage consent architecture** with 4 GDPR stages — not found
4. **DPA template pre-configured for driver profile sharing** — not found
5. **Legal review brief template** for the lawyer — not applicable to competitors (they have in-house legal)

For all 5 items, DriverNord must rely on legal principles and IMY guidance rather than market practice. This is noted as a **gap in the benchmark**, not a compliance problem.

---

*Version 1.0 — 2026-05-14 — Competitor observations from public sources only. Does not constitute legal advice. Competitor behavior does not establish legality.*
