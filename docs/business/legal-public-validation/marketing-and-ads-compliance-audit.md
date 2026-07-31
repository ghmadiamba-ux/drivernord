# DriverNord — Marketing and Ads Compliance Audit

**Status:** Audit complete — 2026-05-14
**Syfte:** Audit all acquisition copy in the execution kit for compliance with Swedish Marknadsföringslagen (MFL), GDPR marketing rules, Meta platform policies, and Platsbanken policies. Flag specific problematic claims, confirm what is acceptable, and identify what requires modification.
**Source documents audited:** `meta-ads-copy-bank.md`, `platsbanken-posting-draft.md`, `facebook-groups-posts.md`
**Legal framework:** MFL (2008:486), GDPR Art. 21 (objection to direct marketing), Meta Special Ad Category policy (Employment), Arbetsförmedlingen Platsbanken policy

---

## Label Key

| Label | Meaning |
|-------|---------|
| COMPLIANT | Claim or practice is consistent with applicable law and policy |
| COMPLIANT WITH CAVEAT | Acceptable but requires a specific condition to remain true |
| REQUIRES LEGAL REVIEW | Claim raises a legal question that requires a lawyer's opinion |
| NON-COMPLIANT | Claim is problematic under current law or policy — must be modified |
| REQUIRES FOUNDER DECISION | Policy choice the founder must make before this copy is used |

---

## Part A — Meta Ads Copy Bank

### A1 — Forbidden Claims Listed in meta-ads-copy-bank.md

The compliance notes in the copy bank itself list 6 forbidden claims. Audit of whether these prohibitions are correctly identified:

| Forbidden claim | Prohibition correctly identified? | Assessment |
|----------------|----------------------------------|-----------|
| "Verifierade förare" without selbdeklarerat qualifier | YES | COMPLIANT — prohibition is correct under MFL §10 (misleading marketing) |
| "Kontrollerade mot Transportstyrelsen" | YES | COMPLIANT — prohibition is correct; verification doesn't exist in V1 |
| "Garanterat jobb" | YES | COMPLIANT — prohibition is correct; DriverNord guarantees introduction not employment |
| "100% säker" | YES | COMPLIANT — prohibition is correct; no identity or background check |
| "BankID-verifierad" | YES | COMPLIANT — prohibition is correct; not implemented |
| Driver volume statistics before documented | YES | COMPLIANT — MFL §18 requires verifiable statistics |

**Assessment:** The compliance notes in meta-ads-copy-bank.md correctly identify the 6 categories of forbidden claims. This is a sound self-audit.

---

### A2 — Claims in Meta Ad Variants 1–9

Checking for problematic claims in the 9 standard ad variants (Variant 10 is FAS 2 only — reviewed separately):

| Variant | Key claims | Assessment |
|---------|-----------|-----------|
| Variant 1 | "CE-licens? Vi hittar jobbet åt dig" — no verification claim; "3 minuter, gratis, ingen anmälan till arbetsgivare" | COMPLIANT |
| Variant 2 | "CE + YKB = prioriterad matchning" — factual (scoring criterion); "du väljer om vi får presentera dig" | COMPLIANT |
| Variant 3 | "Vi matchar dig mot faktiska vakanta tjänster" — CAVEAT: requires that DriverNord actually has active company needs to match against; cannot claim if no company needs exist | COMPLIANT WITH CAVEAT |
| Variant 4 | Step-by-step "hur det fungerar" — accurate description of the process | COMPLIANT |
| Variant 5 | Hook about "tusentals CE-chaufförer" | RISK — see A3 below |
| Variant 6 | "CE-förare söks av Stockholms åkerier" — general claim; no specific company named | COMPLIANT |
| Variant 7 | Urgency hook — "Det finns alltid åkerier som letar" | COMPLIANT WITH CAVEAT — only true if active company needs exist |
| Variant 8 | Testimonial format / social proof | REQUIRES LEGAL REVIEW — see A4 |
| Variant 9 | "Frihet att tacka nej" — consent-forward messaging | COMPLIANT |

---

### A3 — Variant 5 and Hook 2: "Tusentals CE-chaufförer"

**Claim location:** Variant 5 primary text and Hook 2
**Claim text (paraphrased):** References "tusentals CE-chaufförer" as a scale indicator

**Assessment:** NON-COMPLIANT for launch

**Reason:** MFL §18 — statistics and numerical claims must be verifiable and documented. At launch, DriverNord has zero drivers in the database. "Tusentals" is false at launch.

**Fix:** Remove this claim from any ad that runs before DriverNord has the documented statistics to support it. The copy bank compliance notes correctly flag this. Do not use until:
- A statistic source exists (e.g., industry data like "50,000 CE-driver shortage in Sweden" — attributable to a public source), OR
- DriverNord's own pool has reached a level where "hundratals" or "tusentals" is true

**Workaround:** Use the industry statistic framing instead: "Brist på CE-chaufförer är ett av Sveriges mest dokumenterade kompetensbrister" — this is attributable to industry reports without making a claim about DriverNord's own pool.

---

### A4 — Variant 8 and Testimonial / UGC Formats

**Claim type:** Testimonials, UGC formats (Video 3, UGC 1–4 in the copy bank)

**Assessment:** REQUIRES LEGAL REVIEW

**Reason:** MFL §§5 and 10 — testimonials and endorsements must:
1. Be genuine (not staged)
2. Represent the actual experience of a real person
3. Not be compensated without disclosure of the commercial relationship

**Video 3 and UGC 1–4** are scripted formats for testimonials. If these are performed by actors or by drivers compensated for making the testimonial, they must be disclosed as sponsored content. If they are genuine testimonials from real drivers, they must be documented.

**Fix:**
- Do not use testimonial formats until actual satisfied drivers exist and have given documented consent to their testimonial being used in ads
- If compensation is offered for testimonials, include a disclosure ("betald rekommendation" / "sponsored")
- This is a FAS 2 matter — correctly noted as such in the copy bank

---

### A5 — Static Concept 5: Comparative Advertising

**Claim type:** Comparative advertising — comparing DriverNord's approach to traditional job boards or recruiters

**Assessment:** REQUIRES LEGAL REVIEW

**Reason:** MFL §12 — comparative advertising is allowed if:
1. Products/services are comparable
2. Comparison is on objectively verifiable characteristics
3. Comparison is not misleading

Comparing DriverNord to "traditional job searching" (sending CVs, job boards) is a soft comparison with no named competitor and may be acceptable. Comparing DriverNord to a named competitor (e.g., "Bättre än Yrkesförarjobb") would require stronger legal review.

**Current draft status:** Static 5 is already flagged for MFL review in the copy bank. Ensure the comparison remains generic ("traditionell jobbsökning") and does not name specific competitors.

---

### A6 — Meta Special Ad Category: Employment

**Policy:** Meta classifies driver recruiting / job opportunity ads as Employment Special Ad Category

**Assessment:** REQUIRES FOUNDER DECISION

**Reason:** All DriverNord Meta ads almost certainly qualify as Employment category based on Meta's definition (ads that promote employment opportunities or workers for hire).

**What this means operationally:**
- Cannot target by age, gender, ZIP code, or certain interest categories
- Cannot use lookalike audiences based on existing "leads"
- Must select "Employment" when creating the ad campaign in Meta Ads Manager
- Targeting will be broader; CPR (cost per registration) may increase

**Mitigation:** The copy bank compliance notes correctly flag this. Founder must configure Meta campaign as Special Ad Category: Employment. The ad copy itself does not need to change — only the campaign settings.

---

## Part B — Platsbanken Posting Audit

### B1 — Overall Compliance

| Item | Status | Notes |
|------|--------|-------|
| Job title options | COMPLIANT | All 4 options are factual and non-misleading |
| DriverNord identified as matchningstjänst, not employer | COMPLIANT | Correctly stated in both short and long versions |
| No guarantee of employment | COMPLIANT | Copy is clear that DriverNord facilitates introduction |
| Registration link to drivernord.se/chaufförer | COMPLIANT WITH CAVEAT | Only compliant if the link works in production at time of posting |
| No false YKB verification claim | COMPLIANT | Copy uses "Har du CE-körkort och YKB?" as a filter question, not a verification claim |
| Salary not stated | COMPLIANT WITH CAVEAT | Matchningstjänst ads don't dictate salary; however, Platsbanken may require some salary indication depending on their current form requirements. CHECK at time of posting. |

### B2 — Platsbanken Policy Risk

**Risk:** Whether Platsbanken allows a matchningstjänst (as opposed to an employer or bemanningsföretag) to post ads

**Assessment:** REQUIRES LAWYER CONFIRMATION

**Reason:** Platsbanken is designed for employers and authorized intermediaries. A matchningstjänst that is not acting as an agent for a specific employer may face questions about whether it qualifies to post. The current posting draft is clear that DriverNord is not the employer — this transparency is good but may surface the platform policy question.

**Mitigation in draft:** The compliance notes in platsbanken-posting-draft.md correctly flag this. The posting should not go live until the founder or lawyer has confirmed Platsbanken accepts this posting type.

---

## Part C — Facebook Group Posts Audit

### C1 — Overall Compliance

| Post | Key claims | Assessment |
|------|-----------|-----------|
| Inlägg 1 (Grundarstil) | Transparent; no false claims; identifies founder as creator | COMPLIANT |
| Inlägg 2 (Förmånsfokus) | Uses checkmarks for features — all claims are factual (free to register, consent before sharing, 3 minutes) | COMPLIANT |
| Inlägg 3 (Passiv jobbsökare) | No false claims; accurate description of the process | COMPLIANT |
| Inlägg 4 (Moderatorsäkert) | Positioned as "someone who found this service" — see C2 below | REQUIRES FOUNDER DECISION |
| Inlägg 5 (Frustrations-hook) | Describes a real market problem; no false statistics | COMPLIANT |
| Inlägg 6 (C- och D-förare) | Inclusive; no overclaiming | COMPLIANT |
| Inlägg 7 (Egenföretagare) | Accurate; addresses freelancers correctly | COMPLIANT |
| Inlägg 8 (Referral) | FAS 2 only — CORRECT to flag as FAS 2 | NOT FOR LAUNCH |

### C2 — Inlägg 4: Identity Transparency Issue

**Post text:** "Har ni sett DriverNord? (Ny matchningstjänst för CE-förare) — Hittade den här tjänsten som verkar annorlunda..."

**Internal note in copy bank:** "Denna variant positionerar dig som en utomstående som 'hittade' tjänsten, inte som grundare. Använd den bara om du inte vill identifiera dig som grundare i just den gruppen."

**Assessment:** REQUIRES FOUNDER DECISION — with a legal note

**Legal note:** MFL §5 (god marknadsföringssed — good marketing practice) requires that sponsored or commercially interested content be transparent. If the founder posts Inlägg 4 while being the founder of DriverNord without disclosing this connection when directly asked, this would be deceptive. The copy bank correctly states: "Var aldrig oärlig om din koppling om du direkt tillfrågas."

**Recommendation:** Founder should either:
(a) Post Inlägg 1 (transparent founder-style) in most groups, or
(b) Use Inlägg 4 only in groups where the founder genuinely has low name recognition, but disclose immediately if asked about their connection to DriverNord.

**Never use Inlägg 4 if you plan to deny or obfuscate your connection to DriverNord when asked.** This is consistent with the note already in the copy bank.

### C3 — Reply Templates for Skeptics

All 6 reply templates (cost, data selling, legitimacy, bemanning confusion, already employed, company names) are:
- Factually accurate
- Non-misleading
- Appropriately hedged ("vi är i tidig fas")

**Assessment: COMPLIANT** — reply templates are well-drafted.

---

## Risky Terms Grep Results (Across All Acquisition Materials)

A search was conducted across all acquisition materials for the following terms: "bemanning," "uthyrning," "anställer chaufförer," "garanterar jobb," "verifierad av Transportstyrelsen," "officiellt verifierad," "garanterad anställning."

**Findings in acquisition materials (`driver-acquisition-execution-kit/`):**
- No instances of these terms in risky contexts found in the 6 execution kit files
- The terms "bemanning" and "uthyrning" appear only in the compliance notes and in contexts that explicitly state DriverNord is NOT these things
- "Garanterar jobb" appears only in the FORBIDDEN CLAIMS section of meta-ads-copy-bank.md

**Conclusion:** The acquisition copy is clean of the most dangerous misclassification language. No red flags identified in the grepped materials.

---

## Summary: Copy Readiness for Launch

| Material | Status | Blocker? |
|---------|--------|---------|
| Meta Ads Variants 1–4, 6, 7, 9 | COMPLIANT — ready for production once legal review done | NO (post-legal-review) |
| Meta Ads Variant 5 (tusentals) | NON-COMPLIANT at launch | YES — remove or replace |
| Meta Ads Variant 8 (testimonial) | REQUIRES LEGAL REVIEW — FAS 2 only | YES for launch |
| Static Concept 5 (comparative) | REQUIRES LEGAL REVIEW | YES — get legal clearance |
| UGC formats, Video 3 | REQUIRES LEGAL REVIEW — FAS 2 only | YES for launch |
| Meta Special Ad Category | REQUIRES FOUNDER DECISION (campaign setting) | YES — configure before launch |
| Platsbanken posting | COMPLIANT WITH CAVEAT — needs Platsbanken policy confirmation | YES |
| Facebook Inlägg 1, 2, 3, 5, 6, 7 | COMPLIANT | NO |
| Facebook Inlägg 4 (identity ambiguity) | REQUIRES FOUNDER DECISION | FOUNDER |
| Facebook Inlägg 8 (referral) | FAS 2 only | YES for launch |
| Facebook reply templates | COMPLIANT | NO |

**Variants cleared for immediate use after legal review:** Variants 1, 2, 3, 4, 6, 7, 9 from Meta ads; Facebook posts 1, 2, 3, 5, 6, 7; all reply templates.

---

*Version 1.0 — 2026-05-14 — AI compliance audit against publicly available Swedish law and platform policies. Not legal advice. Testimonial/UGC formats and comparative ads require lawyer review before use.*
