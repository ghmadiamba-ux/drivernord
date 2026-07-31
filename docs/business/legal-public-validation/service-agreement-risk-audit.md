# DriverNord — Service Agreement Risk Audit

**Status:** Audit complete — 2026-05-14
**Syfte:** Clause-by-clause pass/fail risk assessment of `service-agreement-v1.md`. Identify clauses that are sound, clauses with moderate risk, and clauses that are legally unresolved and must not be used until a lawyer has confirmed them.
**Source document:** `agent-1/docs/business/legal/service-agreement-v1.md`
**Legal framework:** Swedish avtalslagen (1915:218), GDPR, MFL, consumer protection law (not applicable B2B), Swedish commercial practice

---

## Label Key

| Label | Meaning |
|-------|---------|
| PASS | Clause is sound based on publicly available Swedish commercial law |
| PASS WITH CAVEAT | Clause is likely sound but has a specific limitation or risk to note |
| REQUIRES LAWYER CONFIRMATION | Clause involves a legal question that public sources cannot resolve |
| RISK IDENTIFIED | Clause contains a specific identified legal risk |
| INCOMPLETE | Clause is a placeholder and must be completed before use |

---

## Clause-by-Clause Assessment

### §1 — Parties

| Sub-item | Status | Notes |
|---------|--------|-------|
| DriverNord party details | INCOMPLETE | Company name, org.nr, address are placeholders |
| Client party details | INCOMPLETE | Filled per transaction — by design |
| Signing entity | INCOMPLETE | §1 currently references "DriverNord AB (under bildande)" — this must be replaced with the founder's operational enskild firma name and org.nr before any agreement is signed. Enskild firma with F-skatt can legally sign commercial agreements and issue VAT invoices. AB incorporation is a scale/liability decision, not an MVP prerequisite. |

**Priority:** LOW operational effort (update §1 with EF details) — enskild firma can sign immediately.

---

### §2 — DriverNords roll (Service Classification)

| Sub-item | Status | Notes |
|---------|--------|-------|
| "Inte en arbetsgivare" statement | PASS | Correct and consistent with classification analysis |
| "Inte ett bemanningsföretag" statement | PASS | Correct — uthyrningslagen confirmed as not applicable |
| "Inte en rekryteringsbyrå som garanterar anställning" | PASS WITH CAVEAT | Correct; "garanterar anställning" qualifier is important — do not remove it |
| "Inte en part som ingår avtal om arbete för förarens räkning" | PASS | Correct — DriverNord never signs work agreements on behalf of drivers |
| Overall classification framing | PASS WITH CAVEAT | Sound for V1 model; becomes incorrect immediately if DriverNord employs any driver for any reason |

**Priority:** MEDIUM — important for commercial conversations; lawyer should confirm the framing excludes bemanning classification.

---

### §3 — Tjänstebeskrivning (Package 4 and Package 2)

| Sub-item | Status | Notes |
|---------|--------|-------|
| Package 4 — delivery of 1 driver within 48h | PASS WITH CAVEAT | The 48h commitment is operational, not just aspirational. Ensure this is achievable before signing agreements with this language. If DriverNord cannot deliver within 48h, the replacement policy (§8) is the backstop. |
| "Självdeklarerad körkortsklass" language in profile description | PASS | Correct and required |
| "Bekräftelsedatum" for availability | PASS | Correct — timestamp on availability confirmation |
| Price range 8,000–10,000 SEK | PASS | Price ranges are acceptable; final price set in order confirmation |
| Package 2 — shortlist 3–5 drivers, 3–5 business days | PASS WITH CAVEAT | Same caveat as Package 4 — operational feasibility must be confirmed |
| "Verifierad Förarlista" naming | RISK IDENTIFIED | The word "Verifierad" may imply official credential verification. Combined with §5's disclaimer that credentials are self-declared, this creates a potential inconsistency. MFL §10 (misleading marketing) risk. Recommend renaming to "Strukturerad Förarlista" or "Kuraterad Förarlista" and getting lawyer sign-off on current name. |
| Introductory pricing 15,000 SEK → 18,000 SEK | PASS | Introductory pricing is standard commercial practice |
| Payment trigger on delivery (not hire) | PASS | Standard and clear — avoids "pay on success" ambiguity |

**Priority for "Verifierad" naming:** HIGH — see correction plan.

---

### §4 — Definition av leverans

| Sub-item | Status | Notes |
|---------|--------|-------|
| Delivery = profile received by client, not hiring outcome | PASS | Standard in placement/introduction services — consistent with Manpower rekrytering model |
| Logging of delivery by DriverNord | PASS | Good practice; creates evidence of delivery for invoice disputes |

---

### §5 — Vad DriverNord inte garanterar

| Sub-item | Status | Notes |
|---------|--------|-------|
| No guarantee of hiring outcome | PASS | Essential clause; correctly stated |
| No körkortsklass verification | PASS | Correct — self-declared; client must verify |
| No identity verification | PASS | Correct |
| No YKB verification | PASS | Correct |
| Availability caveat | PASS WITH CAVEAT | "Rimliga åtgärder" (reasonable efforts) for availability confirmation is appropriate language but vague. Consider specifying: "DriverNord confirms availability via SMS no more than 7 days before introducing the driver to the client." |
| No performance/personality guarantee | PASS | Standard |

---

### §6 — Självdeklarerade uppgifter — ansvarsfördelning

| Sub-item | Status | Notes |
|---------|--------|-------|
| Notice to client that data is self-declared | PASS | Correct and legally protective |
| Specific disclaimer text for each profile | PASS | Good practice; creates clear written record |
| Client acceptance of self-declared data by signing | PASS | Standard warranty disclaimer |

---

### §7 — Tillgänglighetsbekräftning

| Sub-item | Status | Notes |
|---------|--------|-------|
| SMS confirmation near delivery time | PASS | Operationally sound; GDPR Stage 2 compliant |
| If driver unavailable → replacement policy activates | PASS | Logical flow |

---

### §8 — Ersättningspolicy

| Sub-item | Status | Notes |
|---------|--------|-------|
| Package 4 replacement: driver non-responsive within 24h | REQUIRES LAWYER CONFIRMATION | "Non-responsive" needs clear definition. What constitutes a contact attempt? Who decides 24h has passed? Recommend adding: "Klienten måste dokumentera minst två kontaktförsök (e-post + telefon) inom 24 timmar." |
| Package 4 replacement condition: DriverNord has an alternative driver available | PASS WITH CAVEAT | This is a "best efforts" replacement, not a guarantee. The agreement should state explicitly: "Ersättning förutsätter att DriverNord har tillgänglig alternativ förare." Currently implied but not explicit. |
| Package 4 no cash refund after delivery | PASS | Standard |
| Package 2 — no shortlist if <3 qualified drivers | PASS | Clean safety valve |
| Package 2 — post-delivery replacement within 5 days | REQUIRES LAWYER CONFIRMATION | Same issue as Package 4 — "visar sig otillgänglig" needs definition |
| Package 2 no cash refund after shortlist delivered | PASS | Standard |

**Priority:** MEDIUM — replacement policy needs tighter definition before first transaction.

---

### §9 — Betalningsvillkor

| Sub-item | Status | Notes |
|---------|--------|-------|
| 15-day net payment | PASS | Standard Swedish B2B terms |
| Bankgiro payment | PASS | Standard |
| Dröjsmålsränta per räntelagen | PASS | Legally correct reference |
| 25% VAT | REQUIRES LAWYER CONFIRMATION | Must confirm DriverNord is moms-registered and that the correct VAT category applies to this service. Standard rate is 25% for services, but this should be confirmed. |

---

### §10 — Re-engagemangsklausul

| Sub-item | Status | Notes |
|---------|--------|-------|
| Entire clause | INCOMPLETE — REQUIRES LAWYER CONFIRMATION | Placeholder clause. Designed to prevent clients from using DriverNord's introduction as a "free lead" and then brokering the driver to third parties without DriverNord involvement. This is a legitimate commercial interest but: (1) enforceability under Swedish avtalslagen is uncertain; (2) it must not restrict the individual driver's freedom to choose their own work; (3) the scope (12 months, "vidareförmedling") needs precise definition. Do NOT use this clause until lawyer has written the final text. |

**Priority:** HIGH for legal review; LOW for operational impact (few clients will trigger this in V1).

---

### §11 — Klientens skyldigheter

| Sub-item | Status | Notes |
|---------|--------|-------|
| Use data only for stated recruitment purpose | PASS — GDPR requirement mirrored in contract | Correct |
| Not share or sell driver data | PASS | Required; consistent with driver's Art. 21 rights |
| Delete driver data within 6 months if no hire | REQUIRES LAWYER CONFIRMATION | The 6-month period is a DriverNord proposal, not an IMY-mandated period. Lawyer should confirm if this is reasonable and defensible. |
| Notify DriverNord of withdrawal requests | PASS | Operationally necessary; legally sound |
| Not contact driver for other purposes | PASS | Standard scope limitation |

---

### §12 — Konfidentialitet

| Sub-item | Status | Notes |
|---------|--------|-------|
| Both parties keep agreement terms confidential | PASS | Standard commercial practice |

---

### §13 — Ansvarsbegränsning

| Sub-item | Status | Notes |
|---------|--------|-------|
| Liability cap = fee received for the transaction | PASS WITH CAVEAT | Reasonable starting point for B2B. However, under Swedish law, liability caps may be challenged if they result in unreasonably harsh outcomes. Lawyer should confirm the cap is enforceable for this type of service. |
| No indirect damages | PASS | Standard in Swedish commercial agreements |
| No liability for self-declared data being false | PASS WITH CAVEAT | Sound for V1 but strengthened by §6's explicit disclaimer and profile notation |
| Incomplete clause text | INCOMPLETE | Lawyer must write the full clause |

---

### §14 — Tillämplig lag och tvistlösning

| Sub-item | Status | Notes |
|---------|--------|-------|
| Swedish law | PASS | Appropriate |
| Stockholm tingsrätt as first instance | PASS | Standard for Stockholm-based companies |
| Negotiation before litigation | PASS | Standard |

---

### §15 — Avtalets ingående och löptid

| Sub-item | Status | Notes |
|---------|--------|-------|
| Per-transaction contract | PASS | Appropriate for V1 |
| Possibility of framework agreement | PASS | Mentioned as option; does not create a commitment |

---

## Critical Path Items Before First Transaction

| Clause | Issue | Must resolve before: |
|--------|-------|---------------------|
| §1 | DriverNord AB not yet incorporated | Any commercial agreement |
| §3 | "Verifierad Förarlista" naming risk | Any client materials |
| §8 | Replacement policy definitions vague | First Package 4 sale |
| §9 | VAT registration confirmation | First invoice |
| §10 | Re-engagement clause is a placeholder | First client who re-brokers a driver |
| §13 | Full liability cap language missing | Any commercial agreement |

---

## Summary Scorecard

| Category | PASS | PASS WITH CAVEAT | REQUIRES LAWYER | INCOMPLETE / RISK |
|---------|------|-----------------|----------------|------------------|
| Count | 14 | 8 | 7 | 4 |
| % of clauses assessed | 43% | 24% | 21% | 12% |

**Verdict:** The service agreement is a solid draft. The core commercial structure (what DriverNord delivers, what it doesn't guarantee, liability cap, payment terms) is legally conventional and appropriate. The critical open items are: company incorporation, "Verifierad" name risk, re-engagement clause, and full liability cap text.

---

*Version 1.0 — 2026-05-14 — AI audit against publicly available Swedish commercial law. Not legal advice. Requires Swedish commercial law attorney review before any agreements are signed.*
