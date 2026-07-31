# DriverNord — Prioritized Recommendations

**Audit date:** 2026-05-14  
**Source:** driverNord-full-project-audit.md  
**Governing rule:** Public data and AI-executable only. No deployment, no contact, no code changes from this document.

Each recommendation is labeled: **CRITICAL / HIGH / MEDIUM / LOW**, with an estimated effort and whether it is AI-executable.

---

## Group A: Critical — Before Any Real Driver or Company Data Enters the System

These are blocking issues. Running a real pilot with these gaps open creates legal, operational, or data-integrity risks that could harm drivers, harm client companies, or create GDPR liability.

---

### A1. Configure SMS/messaging credentials (46elks)

**Priority:** CRITICAL  
**Effort:** 30 minutes  
**AI-executable:** No — requires human action (account creation, API key)  
**Status:** Infrastructure built; `SMS_PROVIDER` env var unset  

Until this is done, the Contact Agent and Follow-up Agent are simulations. No driver can be reached. The system is technically complete but operationally dead.

**Action:** Create 46elks account, obtain API key, set `SMS_PROVIDER=46elks`, `ELKS_API_USER`, and `ELKS_API_PASSWORD` in Vercel production environment.

---

### A2. Commission external legal review of privacy policy, terms, and DPA template

**Priority:** CRITICAL  
**Effort:** Days to weeks (external task)  
**AI-executable:** Research + draft only (AI can draft; human lawyer must approve)  

Current state: Three legal pages are marked "Preliminär version." The privacy policy does not state which GDPR Art. 6 legal basis applies to which processing activity. No Data Processing Agreement template exists for sharing driver profiles with client companies.

**Three documents needed:**
1. Reviewed privacy policy with explicit Art. 6(1)(a) consent basis stated for matching processing, Art. 6(1)(b) stated for contract performance
2. Reviewed terms of service removing "Preliminär version" banner
3. DPA/Controller-to-Controller agreement template for client companies

**Note:** Every commercial transaction (delivering a driver shortlist to a client company) is currently legally incomplete without a signed DPA. This is not theoretical — it is a per-deal requirement.

---

### A3. Verify hej@drivernord.com inbox is active and monitored

**Priority:** CRITICAL  
**Effort:** 10 minutes  
**AI-executable:** No  

All public-facing CTAs, legal pages, and GDPR rights contact routes to this address. GDPR requires response to data subject requests within 30 days. An unmonitored inbox is a compliance failure vector and a driver/company contact black hole.

**Action:** Send a test email; verify receipt; confirm inbox is monitored at minimum daily during pilot phase.

---

### A4. Add GDPR deletion mechanism

**Priority:** HIGH (CRITICAL if scaling beyond 100 drivers)  
**Effort:** 1–2 days (engineering)  
**AI-executable:** Partial (can write migration and API spec; not deploying)  

Current state: No automated deletion path exists. Right to erasure (Art. 17 GDPR) requests are handled manually by routing email to hej@drivernord.com. Manual deletion is viable at <50 drivers; it breaks at scale.

**Required:**
- `DELETE /api/drivers/{id}` endpoint (recruiter-auth protected)
- Cascade deletion from `drivers`, `ingested_drivers`, `shortlist_entries`
- Anonymize audit log entries referencing deleted driver (replace with `[deleted]` marker)
- Log `driver_deleted` action to `system_actions`

---

### A5. Define and document data retention schedule

**Priority:** HIGH  
**Effort:** Half day (documentation + policy)  
**AI-executable:** Yes (draft only; legal review required)  

Current state: Privacy policy does not state retention periods for any data category. GDPR requires this.

**Draft retention schedule (to be reviewed by lawyer):**
- Active driver profiles: Retained while driver has active consent
- Inactive driver profiles (no login/contact for 12 months): Auto-flag for deletion review
- Ingested driver records: Retained while any open shortlist entry exists; then per active driver retention
- `system_actions` audit log: 3 years (standard for business records)
- `shortlists` / `shortlist_entries`: Until associated placement fee period expires + 3 years

---

## Group B: Before Driver Acquisition Campaign

These must be completed before running any marketing campaign to recruit CE/C/D drivers.

---

### B1. Design driver acquisition plan

**Priority:** HIGH  
**Effort:** 1–2 days (planning)  
**AI-executable:** Yes — AI can draft the plan based on existing research  

Current state: The demand side (companies) has a 63-company database with scoring and decision-maker contacts. The supply side (drivers) has no equivalent plan. This is the most critical asymmetry in the project.

**Required elements:**
- Channel selection: Which channels to use (social media, Platsbanken, trade associations, Transportstyrelsen mailing list if accessible, word-of-mouth via initial drivers)
- Targeting: Which license/YKB combinations to prioritize first (CE+YKB+Stockholm = highest matching value based on Quadrant A targets)
- Conversion path: From ad impression to /chat registration to ingested driver
- Volume targets: How many drivers needed for a credible shortlist (minimum 3 matching candidates per opening)
- GDPR communication at acquisition: Consent language must be clear before any driver data is collected

---

### B2. Add driver re-confirmation flow

**Priority:** MEDIUM (CRITICAL once first drivers register)  
**Effort:** 1–2 days (engineering)  
**AI-executable:** Partial  

Current state: No mechanism for drivers to update availability without re-registering. A driver who registered "available immediately" 90 days ago may now be employed. Stale data leads to shortlists with unavailable drivers, which destroys placement quality and client trust.

**Required:**
- Periodic (30-day or 60-day) re-confirmation SMS: "Are you still available for new CE driver opportunities? Reply YES or NO."
- On YES: update `availability` timestamp; keep profile active
- On NO: mark profile inactive; stop appearing in shortlists
- Log `availability_confirmed` or `availability_lapsed` to `system_actions`

---

### B3. Implement YKB expiry tracking

**Priority:** MEDIUM  
**Effort:** Half day  
**AI-executable:** Partial  

Current state: YKB is stored as a boolean (yes/no). YKB certificates expire every 5 years. A driver who registered with YKB=true may have an expired certificate by the time of placement.

**Required:**
- Add `ykb_expiry_date` column to `drivers` and `ingested_drivers` (nullable)
- Add to registration chat: "When does your YKB expire?" (optional, with skip)
- Flag drivers where YKB is marked true but no expiry date is on record
- Exclude or flag drivers in shortlists where `ykb_expiry_date < now + 30 days`

---

### B4. Add rate limiting to POST /api/leads

**Priority:** MEDIUM (HIGH before public ad campaigns)  
**Effort:** Half day  
**AI-executable:** Partial  

Current state: No rate limiting on the public driver intake endpoint. A bot could spam fake registrations, polluting the driver database with fictitious records.

**Minimum viable:** IP-based rate limiting (5 registrations per IP per hour using Vercel Edge middleware or a Redis-backed counter).

---

## Group C: Before Company-Side Landing Page (B2B Self-Service)

---

### C1. Build company self-service intake form

**Priority:** HIGH  
**Effort:** 3–4 days (engineering)  
**AI-executable:** Partial (can spec and draft code; not deploying)  

Current state: All company needs must be entered manually by the internal recruiter. This limits scale to what one person can manually manage.

**Required:**
- Public-facing form at `/company/get-started` or similar
- Collects: company name, org number, license type needed, location, specialisation, urgency, contact email
- Does NOT require login — company submits interest; DriverNord operator reviews and converts to company_need
- Sends auto-confirmation to company's email
- Internal notification to hej@drivernord.com of new inbound

**Not required yet:** Full company account, self-service need management, real-time shortlist access.

---

### C2. Create the DPA template (prerequisite to C3)

**See A2.** The DPA must exist before any company receives driver profile data.

---

## Group D: Before Live Matching Runs

---

### D1. Add company_name join to getOpenCompanyNeeds()

**Priority:** MEDIUM  
**Effort:** 30 minutes  
**AI-executable:** Yes  

Current state: `getOpenCompanyNeeds()` returns `company_id` but not `company_name`. The cockpit shows company IDs, not names. The matching log shows IDs in `triggeredBy`. Human operators cannot read the cockpit without cross-referencing a separate lookup.

**Fix:** Add a JOIN to the `companies` table in `getOpenCompanyNeeds()`.

---

### D2. Add match cooldown guard

**Priority:** MEDIUM  
**Effort:** Half day  
**AI-executable:** Yes  

Current state: No cooldown between matching runs for the same driver/need pair. Rapid re-ingestion could produce duplicate shortlist entries.

**Fix:** Before creating a new shortlist entry, check if a shortlist entry already exists for this driver×need pair within the last N hours (configurable via `MATCH_COOLDOWN_MINUTES` env var).

---

### D3. Add ingestion failure logging

**Priority:** MEDIUM  
**Effort:** 1 hour  
**AI-executable:** Yes  

Current state: If `ingestLead()` throws, the exception propagates but no `driver_ingestion_failed` action is logged. The driver is lost without a trace in `system_actions`.

**Fix:** Wrap `ingestLead()` in try/catch; on failure, log `driver_ingestion_failed` to `system_actions` with the lead_id and error message.

---

## Group E: Market Intelligence Improvements

---

### E1. Resolve hidden target identities (requires Allabolag Pro or Transportstyrelsen)

**Priority:** HIGH  
**Effort:** Half day once access is obtained  
**AI-executable:** Yes (once data access is available)  

Two hidden targets have Market Proof Scores of 85 and 75 respectively but no confirmed legal identity:
- WeStaff recycling/waste åkeri in Stockholm (SNI 38110, postcodes 194xx)
- Agil fjärr/bulk åkeri in Jordbro (SNI 49410, postcodes 136xx–137xx)

These companies cannot be commercially approached without a confirmed org number and entity name.

**Required access:** Allabolag Pro subscription or Transportstyrelsen yrkestrafiktillstånd database query.

---

### E2. Complete financial scoring for unscored SNI expansion companies

**Priority:** MEDIUM  
**Effort:** 2–3 hours (AI-executable web research)  
**AI-executable:** Yes  

Twelve SNI expansion companies (MK Transport, KÅAB, Järfälla Åkeri, Storstockholms Transport, Transport Cars Stockholm, BST Berges, and others) have confirmed org numbers but no retrieved financial data. V1 Fit scores cannot be calculated without this data.

**Action:** Run targeted Allabolag lookups for each company to retrieve revenue, employees, and profit data.

---

### E3. Monitor Transportjobb.se once accessible

**Priority:** MEDIUM (HIGH when accessible)  
**Effort:** Half day  
**AI-executable:** Yes  

Current state: Transportjobb.se returned 404 throughout monitoring. An estimated 50–60% of CE driver job ads in Stockholm/Mälardalen may not be captured.

**Action:** Re-run the repeat-ad detector against Transportjobb.se once it becomes accessible. Update Market Proof Scores for companies that appear there.

---

### E4. Resolve entity ambiguities in top-10 target list

**Priority:** HIGH (before outreach)  
**Effort:** 1–2 hours (AI-executable web research)  
**AI-executable:** Yes  

Specific open items:
- Alfta Frakt: job ad says "Alfta Frakt Distribution AB" but Allabolag entity is "Alfta Frakt Aktiebolag." Confirm these are the same entity before any commercial use.
- Thermobud AB: VD name not confirmed. Resolve via DGBN Holding AB (556702-6504) lookup.
- JPC Entreprenad: phone number discrepancy (website vs. Allabolag). Verify before calling.
- Kyl/Frysexpressen Mälardalen: Direct email for Robert Flodman not found. LinkedIn is primary channel.

---

## Group F: Technical Architecture

---

### F1. Add driver profile update path (re-ingestion)

**Priority:** HIGH (required before database grows)  
**Effort:** 1–2 days  
**AI-executable:** Partial  

Current state: A driver who re-registers (same phone/email) creates a duplicate row, not an update. Stale driver data is a placement quality risk.

**Required:**
- Upsert logic in `ingestLead()`: check for existing `ingested_drivers` record by phone or email; if found, update instead of insert
- Re-run `scoreDriver()` on the updated record
- Re-trigger matching for all open needs

---

### F2. Fix metadataBase in root layout

**Priority:** LOW  
**Effort:** 5 minutes  
**AI-executable:** Yes  

Current state: `metadataBase` is not set in `app/layout.tsx`. OG preview images for all pages except /chaufforer and /company use `http://localhost:3000` as the base URL.

**Fix:** Add `metadataBase: new URL('https://drivernord.com')` to the root layout metadata export.

---

### F3. Remove PII from system_actions.input

**Priority:** MEDIUM  
**Effort:** Half day  
**AI-executable:** Partial  

Current state: `contact_suggested` actions store `phone` in the `input` JSONB field. PII in an audit log is not best practice. The cockpit is auth-protected, limiting exposure — but it should be cleaned.

**Fix:** Replace `phone` in `input` with `driver_id`. Cockpit can join on driver_id when it needs to display contact info.

---

## Group G: Automation

---

### G1. Implement B2B Research Agent (Agent A)

**Priority:** HIGH (when B2B pipeline builds begin)  
**Effort:** 2–3 days  
**AI-executable:** Yes (primary Claude Code use case)  

Agent A is the highest-value B2B automation. It automates the AI-driven web research currently done manually in the `ai-public-data-validation/` folder. It should:
- Accept a company name and org number as input
- Run structured Allabolag lookups (revenue, employees, profit, payment remarks)
- Run web search for job ads (CE/C/D ads in the last 30 days)
- Run website analysis (contact pages, staff directory, decision-maker names)
- Output a structured JSON record in the CRM schema
- Log the research action to `system_actions`

---

### G2. Implement driver availability monitoring

**Priority:** MEDIUM  
**Effort:** 1 day  
**AI-executable:** Partial  

Current state: No mechanism to detect when previously unavailable drivers become available. A driver who answered "employed, not looking" at registration may become available 6 months later.

**Required:**
- Periodic re-contact flow for lapsed drivers (separate from the follow-up agent)
- Deep link or web form for drivers to update availability outside of re-registration

---

## Group H: External Tools

See `external-tools-and-saas-recommendations.md` for the full external tools assessment.

**Summary of highest-priority external tool needs:**
1. **Allabolag Pro** — required to resolve hidden target identities and expand the company universe beyond the current 15–20% coverage
2. **46elks API credentials** — required to enable real SMS contact (see A1)
3. **Legal review service** (Swedish GDPR/employment law) — required for A2
4. **Vercel production environment management** — confirm all env vars are set correctly

---

*Prioritized from driverNord-full-project-audit.md. No code changes from this document. All engineering recommendations require separate implementation planning.*
