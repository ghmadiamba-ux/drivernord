# DriverNord — Legal Readiness Correction Plan

**Status:** Complete — 2026-05-14
**Syfte:** Ordered action plan addressing every gap identified across all 5 audit documents in this folder. Each item is classified by who must act, when it must be resolved, and what it unblocks.
**Source audits:** public-law-source-map.md, competitor-legal-practice-benchmark.md, driverNord-model-classification-analysis.md, gdpr-consent-and-data-sharing-audit.md, service-agreement-risk-audit.md, marketing-and-ads-compliance-audit.md

---

## Priority Classification

| Priority | Definition |
|---------|-----------|
| P0 — Launch blocker | Must be resolved before ANY driver data is collected via /chat |
| P1 — Commercial blocker | Must be resolved before first Package 4 or Package 2 sale |
| P2 — Legal hygiene | Should be resolved within 30 days of launch; not an immediate blocker |
| P3 — Future state | Needed for scale or FAS 2 features; not needed for V1 launch |

---

## Immediate Actions — Founder (No Lawyer Needed)

### C-F1 — Remove "tusentals CE-chaufförer" from ad copy
**Priority:** P0
**Who:** Founder
**What:** In `meta-ads-copy-bank.md`, Variant 5 and Hook 2 contain a claim about "tusentals" drivers. This claim is false at launch (zero drivers in database). Remove or replace with attributable industry statistics before any ad goes live.
**Replacement:** Use "Sverige har en av Europas mest dokumenterade brister på CE-chaufförer" or "Tusentals öppna CE-tjänster i Sverige" with an industry source citation (e.g., Transportarbetareförbundet report).
**Unblocks:** All Meta Ads

### C-F2 — Confirm Supabase EU Region
**Priority:** P0
**Who:** Founder
**What:** Verify that the production Supabase project is configured to use an EU data region (not US). If US region is selected, driver personal data is transferred to a third country without an adequate transfer mechanism.
**How:** Check Supabase dashboard → Project Settings → Infrastructure → Region. Must show an EU region (e.g., eu-west-1 / Ireland).
**If US region found:** Either migrate to EU region (Supabase supports this) or contact Supabase to sign DPA with Standard Contractual Clauses for US transfer before going live.
**Unblocks:** GDPR Art. 44 compliance for all data collection

### C-F3 — Sign Supabase Data Processing Agreement
**Priority:** P0
**Who:** Founder
**What:** Supabase offers a standard DPA. Sign it before any production data is collected.
**How:** Available in Supabase dashboard → Organization → Legal / Compliance → DPA.
**Unblocks:** Art. 28 GDPR (processor DPA requirement)

### C-F4 — Sign Vercel Data Processing Agreement
**Priority:** P0
**Who:** Founder
**What:** Vercel offers a standard DPA. Sign it before any production data is collected.
**How:** Available at vercel.com/legal/privacy-policy (DPA section) or Vercel dashboard under Team Settings → Legal.
**Unblocks:** Art. 28 GDPR (processor DPA requirement)

### C-F5 — Configure Meta Special Ad Category: Employment
**Priority:** P1 (blocks Meta Ads launch)
**Who:** Founder
**What:** When creating the Meta Ads campaign, select "Employment" as the Special Ad Category. This changes the targeting options (no age/gender/ZIP targeting) but ensures policy compliance.
**How:** In Meta Ads Manager → Campaign level → Special Ad Categories → Select "Employment."
**Unblocks:** Meta Ads campaign launch

### C-F6 — Remove Inlägg 4 from active Facebook rotation (or add disclosure)
**Priority:** P2
**Who:** Founder (decision required)
**What:** Facebook post Inlägg 4 positions the founder as an outsider "who found" the service. If used, the founder must be prepared to immediately disclose their role as founder if asked. The safest approach is to use Inlägg 1 (transparent founder-style) instead.
**Decision options:**
- (a) Never use Inlägg 4 — use Inlägg 1 or 2 as default
- (b) Use Inlägg 4 in specific groups but always disclose connection if asked
**Unblocks:** Facebook group posting (when production is live)

---

## Lawyer Review Actions — Must Go to Lawyer

### C-L1 — Confirm GDPR Legal Basis Architecture
**Priority:** P0
**Who:** Lawyer + Founder
**What:** Lawyer must review and confirm:
1. Art. 6(1)(a) consent as primary basis for registration, matching, Stage 2 SMS, and Stage 3 sharing
2. Whether Art. 6(1)(b) (contract) applies alongside or instead of consent for the registration itself
3. Whether a Legitimate Interest Assessment is needed for any processing activity
4. That the legal basis is documented before /chat goes live (not retroactively assigned)
**Document to send:** `legal-review-brief-for-lawyer.md` (Question 1)
**Unblocks:** All GDPR compliance; /chat registration flow

### C-L2 — Confirm Stage 1 Consent Text
**Priority:** P0
**Who:** Lawyer + Founder
**What:** Lawyer must review the exact text shown to drivers at step 13 of /chat registration. The consent text must be sufficiently specific, informed, and clear to meet Art. 7 requirements.
**Document to send:** `driver-consent-language-v1.md` Stage 1 section
**Unblocks:** /chat registration launch

### C-L3 — Confirm Stage 3 SMS Consent Specificity
**Priority:** P1
**Who:** Lawyer + Founder
**What:** Lawyer must confirm that the Stage 3 SMS format (naming the company, asking JA/NEJ in 160 chars) is sufficient to meet GDPR Art. 6(1)(a) specificity requirements for per-company sharing consent.
**Enhancement option:** Lawyer may recommend adding a URL link to a short privacy notice page in the Stage 3 SMS to strengthen the "informed" element.
**Document to send:** `driver-consent-language-v1.md` Stage 3, `driver-sms-sequences.md` SMS 3 variants
**Unblocks:** Stage 3 consent flow; Package 4 and Package 2 commercial delivery

### C-L4 — Confirm DPA Structure (Art. 26 vs. Art. 28 vs. Controller-to-Controller)
**Priority:** P1
**Who:** Lawyer
**What:** Lawyer must determine the correct GDPR data relationship between DriverNord and client companies when driver profiles are shared. The three options are:
- Art. 28: Client is a processor acting on DriverNord's instructions (unlikely)
- Art. 26: Joint controllers (possible if both parties determine purpose and means)
- Controller-to-Controller: Each party is an independent controller (preliminary AI analysis suggests this is most likely)
The DPA template must be finalized based on this determination.
**Document to send:** `dpa-template-v1.md`, `gdpr-consent-and-data-sharing-audit.md` Audit C2
**Unblocks:** Sharing driver profiles with any client company

### C-L5 — Confirm bemanning classification exclusion
**Priority:** P1
**Who:** Lawyer
**What:** Lawyer must formally confirm that DriverNord V1 (no employment of drivers, flat-fee introduction service) falls outside the scope of uthyrningslagen and does not require Kompetensföretagen membership or Bemanningsavtalet compliance.
**Document to send:** `service-agreement-v1.md` §2, `driverNord-model-classification-analysis.md`
**Unblocks:** Confidence in commercial model; ability to respond to client questions about classification

### C-L6 — Confirm Stage 2 SMS Legal Basis under LEK
**Priority:** P1
**Who:** Lawyer
**What:** Lawyer must confirm that Stage 2 availability confirmation SMS is covered by Stage 1 consent and does not constitute "unsolicited commercial communications" under Lag (2022:482) om elektronisk kommunikation requiring separate LEK-specific consent.
**Document to send:** `driver-consent-language-v1.md`, `driver-sms-sequences.md` SMS 2 variants
**Unblocks:** followUpAgent.ts SMS sending (when 46elks configured)

### C-L7 — Finalize Service Agreement §10 (Re-engagement clause)
**Priority:** P2
**Who:** Lawyer + Founder
**What:** The re-engagement clause (§10) is a placeholder. Lawyer must write the final text, confirm enforceability under Swedish avtalslagen, and ensure it does not restrict individual driver freedom of work.
**Consideration:** Is this clause commercially important enough to potentially deter early clients? Founder may decide to remove for V1 and add in V2.
**Document to send:** `service-agreement-v1.md` §10
**Unblocks:** Service agreement finalization

### C-L8 — Finalize Service Agreement §13 (Liability cap)
**Priority:** P1
**Who:** Lawyer
**What:** The liability cap (§13) is partially written. Lawyer must complete the full liability limitation clause, confirm the cap (fee received for the transaction) is enforceable under Swedish law for this type of service, and add any required carve-outs (e.g., gross negligence, willful misconduct).
**Document to send:** `service-agreement-v1.md` §13
**Unblocks:** Service agreement finalization for any transaction

### C-L9 — Review "Verifierad Förarlista" naming
**Priority:** P1
**Who:** Lawyer + Founder
**What:** The word "Verifierad" in Package 2's name may imply official credential verification that DriverNord does not perform. Lawyer must assess MFL §10 risk and recommend whether the name should be changed.
**Options:** "Strukturerad Förarlista," "Kuraterad Förarlista," "Matchad Förarlista," or retain "Verifierad" with strong disclaimer language
**Document to send:** `service-agreement-v1.md` §3.2, `meta-ads-copy-bank.md` compliance notes
**Unblocks:** Package 2 commercial materials

### C-L10 — Review Platsbanken posting eligibility
**Priority:** P2
**Who:** Founder + Lawyer (or Arbetsförmedlingen directly)
**What:** Confirm whether Platsbanken's terms allow a matchningstjänst (vs. an employer or licensed intermediary) to post job ads. If Platsbanken requires the poster to be the employer or a licensed arbetsförmedling, the Platsbanken channel may not be available.
**How to check:** Either ask Arbetsförmedlingen directly via their support channel, or have the lawyer confirm.
**Unblocks:** Platsbanken channel

### C-L11 — Confirm VAT classification for DriverNord's service
**Priority:** P1
**Who:** Lawyer or accountant
**What:** Confirm that DriverNord's introduction/matching service is correctly classified as a standard 25% VAT service in Sweden, and that moms-registration is required and in place.
**Unblocks:** First invoice

---

## Company Formation

### C-F0 — DriverNord AB incorporation
**Priority:** P2 (recommended for scale; NOT a P0 blocker for MVP)
**Who:** Founder
**What:** The founder currently operates a Swedish enskild firma with F-skatt (or FA-skatt), which CAN sign service agreements, issue VAT-correct invoices, and execute DPAs for V1 matchningstjänst operations. DriverNord AB (aktiebolag) is NOT required before the first commercial transaction.

**When AB becomes the right structure:**
- Liability separation becomes material (volume, contractual exposure)
- Investor or partner conversations
- Any future bemanning/staffing model (which requires employment infrastructure)
- Significant revenue requiring a separate legal entity

**Practical note for service agreement and DPA:** Replace "DriverNord AB (under bildande), org.nr: [PLACEHOLDER]" with the founder's enskild firma name and registered org.nr (personnummer-based for EF). Update §1 of service-agreement-v1.md accordingly.

**Current status:** Founder has operational enskild firma with F-skatt. MVP commercial operations can proceed without AB.
**Unblocks:** Nothing immediate — enskild firma already unblocks V1. AB is a scale decision.

---

## Ordered Correction Timeline

### Before /chat goes live (P0)
1. C-F2 — Confirm Supabase EU Region
3. C-F3 — Sign Supabase DPA
4. C-F4 — Sign Vercel DPA
5. C-L1 — Lawyer confirms GDPR legal basis
6. C-L2 — Lawyer confirms Stage 1 consent text

### Before first Package 4 or Package 2 sale (P1)
7. C-F1 — Remove "tusentals" claim from ad copy
8. C-F5 — Configure Meta Employment category
9. C-L3 — Lawyer confirms Stage 3 SMS consent
10. C-L4 — Lawyer confirms DPA structure (Art. 26/28/C2C)
11. C-L5 — Lawyer confirms bemanning exclusion
12. C-L6 — Lawyer confirms Stage 2 SMS under LEK
13. C-L8 — Finalize liability cap (§13)
14. C-L9 — Resolve "Verifierad" naming
15. C-L11 — Confirm VAT classification

### Within 30 days of launch (P2)
16. C-F6 — Decision on Facebook Inlägg 4 usage
17. C-L7 — Finalize re-engagement clause (§10)
18. C-L10 — Confirm Platsbanken posting eligibility

### FAS 2 / Scale (P3)
19. Sign 46elks DPA
20. Develop testimonial collection process (for UGC ad formats)
21. Build Art. 17 automated deletion pipeline

---

## Items That Require NO Further Action (Already Sound)

- Service agreement §§4, 6, 11, 12, 14, 15 — sound as drafted
- Facebook posts Inlägg 1, 2, 3, 5, 6, 7 — compliant as drafted
- Facebook reply templates — compliant as drafted
- Meta Ads Variants 1, 2, 3, 4, 6, 7, 9 — compliant (pending legal review of consent architecture)
- SMS Variants 1A, 1B, 2A, 2B, 3A — compliant (pending Stage 1/Stage 3 legal confirmation)
- DriverNord's classification as matchningstjänst — correctly described throughout all documents

---

*Version 1.0 — 2026-05-14 — Correction plan based on AI audit of public sources and internal draft documents. Priority assignments are AI recommendations — lawyer may adjust priorities after review. Not legal advice.*
