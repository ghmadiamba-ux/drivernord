# DriverNord — GDPR Consent and Data Sharing Audit

**Status:** Audit complete — 2026-05-14
**Syfte:** Audit every processing activity in DriverNord's driver acquisition and matching flow against GDPR requirements. Identify gaps, confirm what is sound, and flag what requires lawyer confirmation.
**Source documents audited:** `privacy-policy-legal-basis-draft.md`, `driver-consent-language-v1.md`, `driver-sms-sequences.md`
**Legal basis:** GDPR, IMY guidance (verified public source), Art. 6 and Art. 7 principles

---

## Label Key

| Label | Meaning |
|-------|---------|
| SOUND — PUBLIC LAW | Consistent with verified GDPR requirements |
| REQUIRES LAWYER CONFIRMATION | Cannot be confirmed from public sources alone; legal opinion needed |
| RISK IDENTIFIED | Potential GDPR violation or compliance gap |
| REQUIRES FOUNDER DECISION | Operational/policy choice the founder must make |

---

## Audit A — Registration and Initial Data Collection (Stage 1)

**What happens:** Driver completes 13-step /chat registration. At step 13 (confirmation), driver sees consent text and completes registration.

**Data collected:** First name, phone number, email, license class (CE/C/D), YKB status, region, availability, shift preference, language preference, driver card status, domain preference.

### A1 — Legal Basis

| Question | Finding | Label |
|---------|---------|-------|
| Is Art. 6(1)(a) consent appropriate here? | YES — driver voluntarily registers and affirmatively completes step 13 | SOUND — PUBLIC LAW |
| Is the consent freely given? | YES — no pressure or benefit conditioned on consent; driver can close chat without consequence | SOUND — PUBLIC LAW |
| Is the consent specific? | PARTIALLY — the consent text must enumerate all processing purposes clearly. If the Stage 1 text only mentions "profil registreras" without specifying "vi delar din profil med transportföretag om du ger tillstånd per SMS," the specificity requirement is not fully met | REQUIRES LAWYER CONFIRMATION |
| Is the consent informed? | PARTIALLY — driver should see a link to the privacy policy or a brief summary during step 13. Whether the current consent text is sufficiently informative depends on the exact wording | REQUIRES LAWYER CONFIRMATION |
| Is the consent unambiguous? | YES — completing and submitting step 13 constitutes an affirmative action | SOUND — PUBLIC LAW |
| Is there proof of consent? | YES — `drivers.consent_registration_at` timestamp is stored in Supabase | SOUND — PUBLIC LAW |

**Gap:** The exact consent text at step 13 must be confirmed by a lawyer. The `driver-consent-language-v1.md` Stage 1 text provides a draft — but the final published text must clearly state: (1) what data is collected, (2) what it is used for, (3) who it may be shared with (and under what conditions), (4) how to withdraw.

### A2 — Data Minimization (Art. 5(1)(c))

| Data field | Necessary for matching? | Assessment |
|-----------|------------------------|-----------|
| First name | YES — for personalized SMS contact | SOUND |
| Phone number | YES — for SMS Stage 2 and Stage 3 | SOUND |
| Email | PARTIALLY — currently used for confirmation; may not be necessary if SMS is primary | LOW RISK — retain for GDPR communications (rights requests) |
| License class | YES — core matching criterion | SOUND |
| YKB status | YES — core matching criterion | SOUND |
| Region | YES — geographic matching | SOUND |
| Availability | YES — core matching criterion | SOUND |
| Shift preference | RELEVANT — used in scoring | SOUND |
| Driver card status | RELEVANT — affects profile completeness | SOUND |
| Domain preference | RELEVANT — used in matching | SOUND |
| Language preference | RELEVANT — for SMS language | SOUND |

**Assessment:** All fields collected have a plausible matching or communication purpose. No obvious excessive collection for V1.

---

## Audit B — Stage 2: Availability Confirmation SMS

**What happens:** `followUpAgent.ts` sends SMS to drivers when `follow_up_at <= now` and `follow_up_sent = false`. Driver replies JA or NEJ.

### B1 — Legal Basis for Stage 2 SMS

| Question | Finding | Label |
|---------|---------|-------|
| Is Stage 2 SMS covered by Stage 1 consent? | YES — if Stage 1 consent explicitly covers "vi kontaktar dig via SMS för att bekräfta din tillgänglighet." The current Stage 1 draft text includes this purpose | REQUIRES LAWYER CONFIRMATION |
| Is Stage 2 SMS "direct marketing" under LEK? | UNCERTAIN — availability confirmation is operational, not marketing per se. However, it also reinforces DriverNord's service. LEK interpretation depends on primary purpose | REQUIRES LAWYER CONFIRMATION |
| Does STOPP-response stop Stage 2 SMS immediately? | YES — opt-out via 46elks webhook should trigger `consent_withdrawn_at` and halt all outreach | SOUND — if webhook is correctly implemented |
| Is Stage 2 frequency appropriate? | YES — sent at `follow_up_at` (computed from availability dates), with max 2 contact attempts per cycle | SOUND |
| Is JA/NEJ response properly logged? | YES — `drivers.availability_confirmed_at` and `drivers.availability_confirmation_response` | SOUND |

**Gap:** Stage 2 legal basis depends on whether Stage 1 consent text explicitly names this purpose. Current draft in driver-consent-language-v1.md does include "tillgänglighetsbekräftelse" as a stated purpose at Stage 1. Lawyer must confirm text is sufficient.

---

## Audit C — Stage 3: Per-Company Introduction Consent

**What happens:** Before sharing a driver's profile with a specific transport company, DriverNord sends an SMS naming that company and asking for explicit consent ("JA = godkänn, NEJ = avböj"). Driver's profile is shared ONLY on JA.

This is DriverNord's most important GDPR control. It is the mechanism that distinguishes DriverNord from less consent-centric competitors.

### C1 — Stage 3 Legal Basis and Specificity

| Question | Finding | Label |
|---------|---------|-------|
| Is a separate Stage 3 consent required? | YES — sharing with a named company is a new processing purpose beyond Stage 1 consent. Art. 6(1)(a) requires specific consent for each distinct purpose | SOUND — PUBLIC LAW |
| Does the Stage 3 SMS name the company? | YES — Variant 3A: "DriverNord: Hej [Förnamn]! Vi har ett potentiellt uppdrag. [Företagsnamn] i [Stad] söker CE-förare. Får vi presentera din profil för dem? JA = godkänn, NEJ = avböj." | SOUND |
| Is the SMS consent "specific" under Art. 7? | PARTIALLY — names the company; does not specify: (a) what data will be shared, (b) how long the company retains it, (c) what the company will do with it. Whether this level of specificity is sufficient is a legal question | REQUIRES LAWYER CONFIRMATION |
| Is the SMS consent "informed" under Art. 7? | PARTIALLY — limited by 160-char SMS format. Driver may need to be directed to a privacy policy for full information. Adding "Läs mer: drivernord.se/privacy" to Stage 3 SMS would strengthen this | REQUIRES FOUNDER DECISION |
| Is JA treated as the only consent trigger? | YES — service agreement §4 and implementation notes confirm profile is shared ONLY after JA | SOUND |
| Is no-reply treated as NEJ? | YES — confirmed in implementation notes | SOUND — consistent with GDPR requirement that silence ≠ consent |
| Is Stage 3 consent timestamp stored? | YES — `shortlist_entries.consent_given_at` with `consent_company_id` | SOUND |
| Is Stage 3 consent company-specific? | YES — `consent_company_id` links to specific company | SOUND |

**Enhancement recommendation:** Stage 3 SMS Variant 3A should optionally add a link to a short explanation page (e.g., drivernord.se/om-introduktioner) that explains what data is shared and how to reach DriverNord with questions. This is not required by law but strengthens the "informed" element. [REQUIRES FOUNDER DECISION]

### C2 — What Happens After Stage 3 — Client Data Handling

| Question | Finding | Label |
|---------|---------|-------|
| Does DriverNord have a DPA with the client company? | DRAFT EXISTS (dpa-template-v1.md) — not yet signed | REQUIRES LAWYER CONFIRMATION |
| What is the legal relationship between DriverNord and client re: shared driver data? | Preliminary analysis: Controller-to-Controller (not processor-controller). Client becomes independent data controller for the driver's data after introduction | REQUIRES LAWYER CONFIRMATION |
| Does the client have obligations to the driver after receiving data? | YES — service agreement §11 requires client to: use data only for stated purpose, not share with third parties, delete data if no recruitment within 6 months, notify DriverNord of withdrawal requests | SOUND (contractual) |
| Does the driver have rights against the client after introduction? | YES — once client receives data, the client is (likely) a data controller and subject to GDPR rights requests from the driver directly | STRONG INFERENCE |

---

## Audit D — Stage 4: Withdrawal and Deletion

**What happens:** Driver sends STOPP via SMS, or emails hej@drivernord.com requesting deletion. DriverNord is obligated to honor the request under Art. 7(3) (withdrawal) and Art. 17 (erasure).

| Question | Finding | Label |
|---------|---------|-------|
| Is STOPP-response handled? | YES — 46elks webhook triggers opt-out; implementation should set `consent_withdrawn_at` | SOUND (when 46elks is configured) |
| Is erasure process documented? | PARTIALLY — legal-readiness-summary.md and checklist reference Art. 17; implementation not fully described | REQUIRES FOUNDER DECISION — document the actual deletion steps |
| Can DriverNord delete records that have been shared with client companies? | PARTIALLY — DriverNord can delete its own copy. Deletion from client systems requires client cooperation per service agreement §11 | SOUND (contractual obligation on client) |
| Is there a deletion confirmation to the driver? | YES — SMS 5 (Variant 5A and 5B) confirms deletion within 5 working days | SOUND |
| Is 5 business days compliant with Art. 17? | Art. 17 does not specify a timeline for deletion itself (only that it should be "without undue delay"). 5 days is reasonable. Response to the request should happen within 30 days (Art. 12) | SOUND |
| Are consent logs retained after profile deletion? | UNCERTAIN — the draft proposes retaining consent logs for 3 years. But if the underlying profile is deleted, orphaned consent logs may still contain personal data (name, timestamp). Retention must be legally justified | REQUIRES LAWYER CONFIRMATION |

---

## Audit E — Supabase, Vercel, 46elks as Data Processors

| Processor | DPA status | Known data residency | Transfer risk |
|-----------|-----------|---------------------|--------------|
| Supabase | No DPA in place yet | US-based (EU servers available but must be explicitly selected) | RISK — potential EEA transfer if US region selected |
| Vercel | No DPA in place yet | US-based (EU edge available but must be configured) | RISK — potential EEA transfer |
| 46elks | No DPA in place yet | Sweden-based (Swedish company — likely EEA) | LOW RISK |

**Critical finding:** If Supabase and Vercel process DriverNord data in US servers, DriverNord must have an adequacy or SCC (Standard Contractual Clauses) basis for the transfer under GDPR Art. 44–46. This is a common compliance requirement. Both Supabase and Vercel have Data Processing Agreements available — DriverNord must sign them.

**Label:** REQUIRES FOUNDER DECISION — confirm which Supabase region is in use. If US, sign Supabase DPA and ensure EU region is selected.

---

## Summary Scorecard

| Audit area | Status | Priority |
|-----------|--------|---------|
| Stage 1 consent text | Needs lawyer confirmation | HIGH |
| Stage 1 data minimization | Sound | LOW |
| Stage 2 SMS legal basis | Needs lawyer confirmation | HIGH |
| Stage 3 per-company consent | Sound architecture; specificity needs lawyer review | HIGH |
| Stage 3 client data handling | DPA draft exists; not signed | HIGH |
| Stage 4 withdrawal/deletion | Process documented; implementation pending | MEDIUM |
| Supabase/Vercel DPA | Not signed | HIGH |
| 46elks DPA | Not signed | MEDIUM |

**Items that BLOCK commercial launch:** Stage 1 consent text, Stage 3 specificity, Supabase DPA (if US region), client DPA.

---

*Version 1.0 — 2026-05-14 — AI audit against public GDPR law and IMY guidance. Not legal advice. Requires lawyer review before /chat registration goes live.*
