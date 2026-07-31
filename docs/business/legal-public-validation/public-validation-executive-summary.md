# DriverNord — Public Validation Executive Summary

**Status:** Final — 2026-05-14
**Syfte:** Consolidated Go/No-Go verdict for 6 commercial actions, based on the full public-validation audit. Single decision document for the founder.
**Based on:** All 7 files in `docs/business/legal-public-validation/`
**Varning:** This is an AI-generated summary of an AI-generated audit based on public sources. It is not legal advice. All Go/No-Go decisions with a "Conditional GO" or "NO-GO" verdict must be confirmed with a Swedish lawyer before acting.

---

## The Audit in 30 Seconds

DriverNord's legal draft documents and commercial model are **structurally sound**. The model classification (matchningstjänst, not bemanning) is correct. The consent architecture (Stage 1 → Stage 2 → Stage 3 per-company SMS) is above market standard. The service agreement's core commercial structure is conventional.

**The problem is not what the documents say — it is what hasn't been confirmed yet.** Specifically: company formation, lawyer confirmation of consent text, Supabase DPA, and "Verifierad Förarlista" naming. These are resolvable in 1–4 weeks, not months.

---

## Go/No-Go Table: 6 Commercial Actions

| Action | Verdict | Blockers |
|--------|---------|---------|
| 1. Collect driver data via /chat registration | **NO-GO** | Supabase DPA not signed; Stage 1 consent text not lawyer-confirmed. *Note: enskild firma with F-skatt can operate; AB incorporation is not a blocker here.* |
| 2. Send SMS to registered drivers (Stage 2 availability) | **NO-GO** | 46elks not configured; LEK compliance of Stage 2 SMS not lawyer-confirmed; depends on Action 1 |
| 3. Share driver profiles with client companies (Stage 3) | **NO-GO** | DPA with client not signed; Art. 26/28/C2C structure not lawyer-determined; depends on Actions 1 and 2 |
| 4. Run Meta Ads campaign | **Conditional GO** | Requires: integritetspolicy live; /chat live in production; Meta campaign configured as Employment category; "tusentals" claim removed from ad copy; Meta account verified. Copy variants 1–4, 6, 7, 9 are compliant. |
| 5. Post on Platsbanken | **Conditional GO** | Requires: /chat live in production; arbetsgivarkonto created; Platsbanken eligibility for matchningstjänst confirmed (founder action or lawyer action) |
| 6. Sign Package 4 or Package 2 service agreement | **NO-GO** | Service agreement §§10, 13 incomplete; liability cap not finalized by lawyer; "Verifierad" naming risk unresolved. *Note: enskild firma with F-skatt can sign agreements; AB incorporation is not a blocker.* |

---

## What the Audit Confirmed as Sound

These items do NOT need further work before commercial use — they are correctly drafted and consistent with Swedish law and market practice:

1. **Model classification:** DriverNord V1 is a matchningstjänst / introduktionstjänst. NOT a bemanningsföretag. Uthyrningslagen (2012:854) does not apply. No special license required.

2. **Stage 3 consent architecture:** Requiring per-company SMS consent before sharing any driver profile is legally sound, above market standard, and consistent with GDPR Art. 6(1)(a). No competitor does this publicly.

3. **Self-declared credentials disclaimer:** Explicitly stating credentials are self-declared (§5 and §6 of service agreement, and throughout ad copy) is legally correct and protective. Consistent with how DriverNord should position itself.

4. **Facebook posts Inlägg 1, 2, 3, 5, 6, 7:** Compliant as drafted. No problematic claims. Can be used immediately once /chat is live.

5. **Meta Ads Variants 1, 2, 3, 4, 6, 7, 9:** Compliant claims. No false statistics. No illegal verification claims. Ready for production once campaign is configured correctly.

6. **Service agreement §§1–9, 11–12, 14–15 (core structure):** Legally conventional. Payment terms (15-day net), delivery definition (profile received, not hire), liability exclusions (no guarantee of hire, no verification of credentials) are all sound for a Swedish B2B service agreement.

7. **The "bemanning" firewall:** Every document in the execution kit and legal package correctly distinguishes DriverNord from a bemanningsföretag. No risky language found in acquisition copy. The language wall is holding.

---

## What the Audit Identified as Needing Resolution

### Critical (blocks everything):
- **C-F3/F4:** Supabase and Vercel DPAs not signed → cannot collect personal data in production
- **C-L1/L2:** GDPR legal basis and Stage 1 consent text not lawyer-confirmed → cannot legally collect driver data
- *Note: C-F0 (AB incorporation) is no longer a critical blocker. Founder's enskild firma with F-skatt can sign service agreements, execute DPAs, and issue invoices for V1 matchningstjänst. Update §1 of service-agreement-v1.md to reflect the enskild firma name and org.nr.*

### Important (blocks commercial transactions):
- **C-L4:** DPA structure with clients (Art. 26/28/C2C) not determined → cannot share profiles legally
- **C-L5:** Bemanning exclusion not formally lawyer-confirmed → commercial risk in client conversations
- **C-L8:** Service agreement §13 (liability cap) is incomplete → cannot sign agreements
- **C-L9:** "Verifierad Förarlista" naming — MFL §10 risk if "Verifierad" implies official credential check
- **C-L11:** VAT classification not confirmed → cannot issue invoices correctly

### Lower priority (resolvable post-launch):
- **C-L7:** Re-engagement clause (§10) is a placeholder
- **C-F6:** Decision on Inlägg 4 identity transparency (Facebook)
- **C-L10:** Platsbanken eligibility for matchningstjänst
- **C-L6:** Stage 2 SMS LEK compliance confirmation

---

## What Competitors Reveal (and What It Means)

| Competitor finding | Implication for DriverNord |
|-------------------|--------------------------|
| Chaffis operates the same commercial model — employer pays, driver registers free | Model D (DriverNord's model) is occupied but not dominant. Competition exists. Speed matters. |
| Chaffis's GDPR documentation is not publicly accessible or well-surfaced | DriverNord can differentiate on compliance transparency — a clean, public-facing consent process is a competitive advantage with enterprise transport companies |
| No competitor demonstrates per-company SMS consent | DriverNord's Stage 3 architecture is above market standard — driver trust signal |
| Tranpenad and Manpower are in a structurally different category | DriverNord does not compete with bemanning — different price point, different value prop, different legal relationship |
| Yrkesförarjobb has simpler GDPR requirements (pure aggregator) | DriverNord's richer data collection requires proportionally more rigorous GDPR compliance |

---

## The Most Important Unknown

**The GDPR consent architecture has not been tested by IMY or Swedish courts for this specific model.**

DriverNord's combination of (1) chat-based self-declaration, (2) SMS-based Stage 3 per-company consent, and (3) controller-to-controller data sharing is novel enough that no public IMY ruling or court decision directly validates it.

**This does NOT mean it is illegal.** It is consistent with GDPR Art. 6(1)(a) principles as interpreted by IMY in public guidance. But:
- The specific implementation has not been pre-cleared by a regulator
- A lawyer's opinion provides a strong layer of protection but not certainty
- If IMY were ever to investigate DriverNord, the documentation of the legal basis decision-making process (the lawyer's signed opinion, the consent logs, the Stage 3 per-company records) would be the primary defense

**Recommendation:** Document everything. Keep all consent timestamps. Keep all Stage 3 JA records. If a lawyer confirms the architecture is sound, keep that opinion on file.

---

## Recommended Next 72-Hour Actions (Founder Only)

These are the highest-leverage actions the founder can take this week without waiting for a lawyer:

| # | Action | Time | What it unblocks |
|---|--------|------|-----------------|
| 1 | Verify Supabase region (EU?), sign Supabase DPA | 30 minutes | GDPR Art. 28 compliance |
| 2 | Sign Vercel DPA | 15 minutes | GDPR Art. 28 compliance |
| 3 | Send `legal-review-brief-for-lawyer.md` to a Swedish dataskyddsjurist | 30 minutes | Starts 1–3 week lawyer review clock |
| 4 | Remove "tusentals CE-chaufförer" from meta-ads-copy-bank.md variants 5 and Hook 2 | 10 minutes | Meta ads compliance (any launch) |
| 5 | Confirm Meta campaign configuration uses Employment Special Ad Category | 10 minutes (at campaign creation) | Meta policy compliance |
| 6 | Update service-agreement-v1.md §1 to use enskild firma name and org.nr | 5 minutes | Service agreement ready for lawyer review |

**Total founder time required this week:** ~1.5 hours.
**The rest is waiting on the lawyer.**

*Note on AB formation: DriverNord AB incorporation is recommended for scale, liability separation, investor readiness, and any future bemanning model — but it is NOT required for V1 matchningstjänst. The founder's operational enskild firma with F-skatt can sign agreements and invoice from day one.*

---

## Final Verdict

DriverNord's legal and commercial model is **viable and defensible** based on publicly available Swedish law and market practice. The draft documents are a solid foundation. The correction plan is concrete and executable.

**The single most important action:** Send the lawyer brief today. Everything else flows from there. *(AB incorporation is a scale decision, not an MVP prerequisite — the founder's enskild firma with F-skatt is sufficient for V1 operations.)*

**Nothing in this audit suggests the model is fundamentally flawed, illegal, or requires structural redesign.** The risks identified are common startup compliance gaps, not business model problems.

---

*Version 1.0 — 2026-05-14 — AI-generated executive summary of AI-generated audit. Based on public sources only. Not legal advice. Requires founder confirmation and lawyer review before any commercial action.*
