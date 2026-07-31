# DriverNord — Driver Acquisition Execution Readiness

**Date:** 2026-05-14
**Purpose:** Translate the driver acquisition plan into a practical launch-control checklist. Determine what is blocking campaign launch, who owns each blocker, what AI can execute, and what the founder must authorize.
**Scope:** Documentation and operational planning only. No deployment, no outreach, no production Supabase, no driver or company contact.

---

## 1. Executive Readiness Verdict

**VERDICT: NOT READY**

DriverNord cannot safely launch a driver acquisition campaign today. The technical pipeline is built and functional. The strategy is documented and sound. The market gap is confirmed. But 6 critical blockers prevent a legally safe, operationally effective launch.

**The shortest path to launch is approximately 1–3 days for operational readiness (founder-executed tasks) + 2–4 weeks for legal readiness (external lawyer).**

The operational tasks (46elks, inbox, deployment) can be resolved within 24–48 hours of the founder acting. Legal tasks (privacy policy review, DPA, service agreement) run in parallel but will take longer and cannot be skipped before driver profiles are shared with companies.

**Partial readiness is possible within 48 hours** if the founder completes the 3 operational tasks (Steps 1–3 in Section 10) and the `/chat` route is deployed to production. That partial state would allow: running ads, collecting registrations, and building the driver database — but NOT contacting drivers via SMS, and NOT sharing profiles with companies, until legal documents are reviewed.

**Summary:**
- Collecting registrations (web form): PARTIALLY BLOCKED (needs production deployment + legal basis clarified)
- Contacting registered drivers via SMS: BLOCKED (46elks not configured)
- Sharing driver profiles with companies: BLOCKED (no DPA)
- Selling Package 4: BLOCKED (0 of 8 required conditions met)
- Selling Package 2: BLOCKED (0 of 5 additional conditions met)

---

## 2. Current Commercial Readiness Scorecard

| Area | Current Status | Readiness | Why It Matters | Required Next Action | Owner | Can AI Execute? |
|------|---------------|-----------|----------------|---------------------|-------|----------------|
| Production `/chat` availability | Not confirmed deployed to production | BLOCKED | Without production deployment, real drivers cannot register; all ad traffic has nowhere to go | Founder must confirm production deployment status and authorize if not live | Founder | Partial — AI can verify local build; deployment is founder-authorized |
| 46elks SMS | Credentials not set; all sends are `console.log` only | BLOCKED | Without SMS, no driver can be contacted for availability confirmation, consent, or follow-up; Package 4 48h promise is impossible | Configure 46elks account; add SMS_PROVIDER + SMS_API_KEY + SMS_API_SECRET + SMS_FROM_NUMBER to env | Founder | No — requires account creation and credential configuration |
| hej@drivernord.se monitoring | Status unconfirmed | UNKNOWN | All inbound inquiries, GDPR access/deletion requests, and commercial communications route here; GDPR Art. 17 requires response within 30 days | Founder must confirm inbox is live and actively monitored | Founder | No — founder must verify and confirm |
| Privacy policy | Preliminary version; Art. 6 legal basis not explicitly stated | BLOCKED | Cannot legally collect driver personal data at commercial scale without a lawful basis declared in an accessible privacy policy | Commission Swedish GDPR lawyer review; add Art. 6(1)(a) consent basis and data retention periods | Lawyer (commissioned by Founder) | Partial — AI can draft legal-basis section for lawyer review |
| DPA template | Does not exist | BLOCKED | Sharing a driver profile with a company without a Data Processing Agreement is a GDPR violation under Art. 28 | AI drafts DPA template → lawyer reviews → founder approves | AI draft + Lawyer review + Founder approval | Partial — AI drafts; lawyer reviews |
| Service agreement template | Does not exist | BLOCKED | Cannot issue a legally valid invoice or create a binding commercial relationship without a service agreement | AI drafts template → lawyer reviews → founder signs off | AI draft + Lawyer review | Partial — AI drafts; lawyer reviews |
| Consent chain implementation | Consent fields captured in driver chat; Stage 3 per-company consent logic designed but not fully implemented for SMS delivery | PARTIAL | GDPR requires active, specific, recorded consent before introducing a driver to a specific company | Confirm consent event is stored in Supabase per driver; implement Stage 3 per-company consent via SMS when 46elks is live | Claude Code (design spec) + Founder (authorize) | Partial — AI can audit consent storage; SMS consent requires 46elks |
| Driver database | Empty — 0 drivers registered | BLOCKED | Without drivers in the database, no shortlist can be built; no Package 4 or Package 2 can be delivered | Launch acquisition campaign once all other readiness gates are met | Founder (campaign execution) + AI (materials prepared) | Partial — AI has prepared all campaign materials; execution requires founder |
| Recruiter dashboard | Implemented and functional locally | PARTIAL | Required for founder to review incoming registrations, approve shortlists, and authorize driver contact before any introduction | Confirm dashboard is accessible in production; test login with RECRUITER_API_KEY | Founder | Partial — AI can verify local functionality; production access is founder-confirmed |
| Supabase safety | Local Supabase at 127.0.0.1 in use; production Supabase exists but must not be used without authorization | READY (for dev) | Using production Supabase accidentally could expose real driver data or corrupt production records | Maintain current practice: never use SUPABASE_URL containing supabase.co without explicit authorization | Claude Code + Founder | Yes — AI enforces this rule in all operations |
| Meta Ads readiness | No confirmed Meta Business account; no Pixel on /chat; no creatives uploaded | BLOCKED | Meta Ads is the primary driver acquisition channel; without account and Pixel, no campaign can run | Founder sets up Meta Business account; installs Meta Pixel on /chat; uploads creatives (prepared by AI in driver-acquisition-plan.md) | Founder | Partial — AI has written all ad copy and creative briefs; account setup is founder task |
| Platsbanken readiness | No employer account confirmed; no posting drafted | PARTIAL | Free acquisition channel with high-intent applicants (active job seekers); can run in parallel with Meta | AI drafts Platsbanken posting; founder reviews and posts with employer account | AI (draft) + Founder (post) | Partial — AI drafts; founder submits |
| Facebook group readiness | Groups not identified or joined; no posts drafted | PARTIAL | Free channel with peer-trusted reach into CE driver communities | AI identifies posting approach; founder joins groups and posts | AI (draft) + Founder (join + post) | Partial — AI drafts; founder executes |
| Fortnox / invoicing | Not configured | BLOCKED | Cannot issue a VAT-correct invoice without a Swedish invoicing tool; cannot receive legal payment | Founder activates Fortnox account; adds company details and VAT number | Founder | No — requires financial account setup |
| Package 4 readiness | 0/8 required conditions met | BLOCKED | No urgent driver introduction can be sold or delivered; the 48h promise cannot be kept | Resolve all 8 conditions — see Section 8 | Mixed | Partial — AI monitors thresholds; human resolves blockers |
| Package 2 readiness | 0/5 required conditions met | BLOCKED | No shortlist can be sold or delivered | Resolve all Package 4 conditions first; then add 15+ drivers | Mixed | Partial — AI monitors thresholds; human resolves blockers |

---

## 3. Critical Blockers Before Any Campaign

### Blocker 1 — Production Deployment of `/chat` Not Confirmed

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL |
| **Risk if ignored** | Ad spend produces clicks with no destination; no driver can register; entire acquisition budget is wasted |
| **Resolution path** | Founder confirms current production deployment status; if not live, authorizes Vercel deployment |
| **AI role** | Verify local build is clean; confirm no TypeScript or test failures; document deployment steps |
| **Human role** | Authorize and execute production deployment; confirm production URL is accessible |
| **External tool** | Vercel (deployment) |
| **Estimated effort** | 30–60 minutes if deployment is ready; longer if environment variable setup is incomplete |

---

### Blocker 2 — 46elks SMS Not Configured

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL |
| **Risk if ignored** | Drivers can register but can never be contacted for availability confirmation or consent; Package 4 48h promise cannot be kept; follow-up agents are permanently simulated |
| **Resolution path** | Create 46elks account at 46elks.com; add SMS_PROVIDER=46elks, SMS_API_KEY, SMS_API_SECRET, SMS_FROM_NUMBER to production environment variables; test send/receive |
| **AI role** | Provide implementation guide; verify codebase SMS provider configuration; confirm contactAgent.ts will route correctly once credentials are set |
| **Human role** | Create account; add credentials to Vercel environment variables; authorize test SMS send |
| **External tool** | 46elks (Swedish SMS provider; ~0.49 SEK/SMS; pay-as-you-go) |
| **Estimated effort** | 30 minutes (per canonical project documentation) |

---

### Blocker 3 — hej@drivernord.se Not Confirmed Active

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL |
| **Risk if ignored** | Inbound company inquiries go unanswered; GDPR deletion/access requests not received within 30-day window → legal exposure under Art. 17; commercial relationships cannot begin |
| **Resolution path** | Founder sends a test email to hej@drivernord.se and confirms receipt; confirms monitoring cadence (at minimum: checked daily) |
| **AI role** | None — this is a human verification task |
| **Human role** | Send test, confirm receipt, commit to monitoring |
| **External tool** | Email provider (existing) |
| **Estimated effort** | 10 minutes |

---

### Blocker 4 — Privacy Policy Not Legally Reviewed

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL (before any commercial-scale data collection) |
| **Risk if ignored** | Collecting driver personal data without a lawful, lawyer-reviewed basis = GDPR Art. 6 violation; regulatory fine risk; reputational damage |
| **Resolution path** | AI drafts Art. 6(1)(a) consent section + data retention policy → founder commissions Swedish GDPR lawyer for review → lawyer confirms or amends → founder approves final version → "Preliminär version" banner removed |
| **AI role** | Draft legal-basis section with correct Art. 6 and Art. 9 references; prepare retention period schedule; prepare deletion/withdrawal process |
| **Human role** | Commission lawyer; approve final version; remove preliminary banner after confirmed review |
| **External tool / Legal** | Swedish GDPR lawyer [LEGAL REVIEW REQUIRED] |
| **Estimated effort** | AI draft: 2–4 hours. Lawyer review: 1–3 weeks depending on engagement speed |

---

### Blocker 5 — DPA Template Does Not Exist

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL (before any driver profile is shared with a company) |
| **Risk if ignored** | Sharing a driver's personal data with a client company without a signed DPA = GDPR Art. 28 violation; every commercial transaction (shortlist delivery) is legally incomplete |
| **Resolution path** | AI drafts DPA template v1 → lawyer reviews → founder approves → DPA signed by each client company before any profile sharing |
| **AI role** | Draft full DPA template with standard Art. 28 clauses, data categories, processing purposes, sub-processor disclosures, and breach notification provisions |
| **Human role** | Commission lawyer; approve template; obtain client signatures before each shortlist delivery |
| **External tool / Legal** | Swedish GDPR/commercial lawyer [LEGAL REVIEW REQUIRED] |
| **Estimated effort** | AI draft: 3–6 hours. Lawyer review: 1–2 weeks |

---

### Blocker 6 — Service Agreement Template Does Not Exist

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL (before any invoice is issued) |
| **Risk if ignored** | No binding commercial relationship exists; fee trigger is undefined; no limitation of liability; no dispute resolution mechanism; invoice has no legal basis |
| **Resolution path** | AI drafts 1-page service agreement → lawyer reviews → founder approves → signed by each client before shortlist delivery or invoice |
| **AI role** | Draft service agreement covering: fee trigger (on shortlist delivery), payment terms, what DriverNord delivers, limitation of liability, dispute resolution |
| **Human role** | Commission lawyer; approve; obtain client signature before each transaction |
| **External tool / Legal** | Swedish commercial lawyer [LEGAL REVIEW REQUIRED] |
| **Estimated effort** | AI draft: 2–4 hours. Lawyer review: 1–2 weeks |

---

### Blocker 7 — Driver Database Is Empty

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL (no commercial product possible) |
| **Risk if ignored** | No shortlist can be built; no Package 4 or Package 2 can be delivered; all other readiness work is irrelevant without supply |
| **Resolution path** | Launch the 30-day acquisition campaign documented in driver-acquisition-plan.md: Meta Ads (Scenario B: 5,000 SEK) + Platsbanken + Facebook groups |
| **AI role** | All campaign materials are prepared. AI monitors registration counts, qualification rates, and package readiness thresholds via Supabase queries |
| **Human role** | Authorize budget; create Meta Business account; upload creatives; post on Platsbanken; post in Facebook groups |
| **External tool** | Meta Ads (5,000 SEK budget); Platsbanken (free); Facebook groups (free) |
| **Estimated effort** | 4–8 weeks to reach ≥15 qualified available drivers; ≥5 available possibly within 2–3 weeks |

---

### Blocker 8 — No Operational Monitoring Process

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **Risk if ignored** | Campaign runs without visibility; founder does not know when package readiness thresholds are met; driver pool quality degrades without follow-up |
| **Resolution path** | AI prepares monitoring SQL queries + weekly report template → founder runs daily package readiness check during acquisition phase |
| **AI role** | Write and maintain all monitoring queries; generate weekly acquisition report on request; flag threshold crossings |
| **Human role** | Run queries; review reports; act on AI flags |
| **External tool** | Supabase SQL (local for development); production Supabase query (founder only) |
| **Estimated effort** | AI deliverable: <2 hours. Monitoring is a recurring 5-minute daily task for the founder |

---

## 4. Legal and GDPR Readiness

All items marked [LEGAL REVIEW REQUIRED] require review by a Swedish GDPR and commercial lawyer before use. AI-drafted versions are templates for review, not final legal instruments.

### A. Before Collecting Driver Data

| Requirement | Status | Notes |
|-------------|--------|-------|
| Privacy policy with explicit Art. 6(1)(a) consent basis | NOT MET — preliminary version | [LEGAL REVIEW REQUIRED] — consent must be freely given, specific, informed, and unambiguous |
| Data categories documented (name, phone, email, license, YKB, region, availability) | PARTIAL — captured in system but not clearly listed in policy | Add explicit data inventory to privacy policy |
| Data retention periods defined | NOT MET | [LEGAL REVIEW REQUIRED] — must specify how long each category is retained |
| Withdrawal process documented and accessible | PARTIAL — privacy page exists; deletion mechanism not documented from driver perspective | Add clear "How to request deletion" instructions accessible from /privacy |
| Contact for GDPR requests confirmed active | UNKNOWN — hej@drivernord.se unconfirmed | Founder must confirm inbox is monitored before any data collection at scale |
| Right to erasure (Art. 17) process in place | NOT MET — no confirmed deletion workflow | [LEGAL REVIEW REQUIRED] — manual deletion process is acceptable for Phase 1; must be documented |
| Credentials described as self-reported | PARTIAL — system captures self-reported data; policy must make this clear | Add explicit language: "All license and YKB information is self-reported by drivers and has not been independently verified by DriverNord" |

### B. Before Contacting Registered Drivers

| Requirement | Status | Notes |
|-------------|--------|-------|
| 46elks SMS configured | NOT MET | Operational blocker — cannot send any SMS without this |
| Consent to be contacted via SMS recorded at registration | PARTIAL — consent implied in chat flow; must be explicit and stored | Confirm consent event is stored in Supabase with timestamp; add explicit SMS consent step if not present |
| Marketing communications comply with GDPR and Swedish Marknadsföringslagen | UNKNOWN | [LEGAL REVIEW REQUIRED] — SMS contact for availability confirmation is not marketing; but consent still required |
| Opt-out mechanism for SMS | NOT MET | Must provide a way to stop SMS (reply STOP or equivalent); 46elks supports this natively |

### C. Before Sharing a Driver Profile With a Company

| Requirement | Status | Notes |
|-------------|--------|-------|
| DPA signed with client company | NOT MET — template does not exist | [LEGAL REVIEW REQUIRED] — GDPR Art. 28 requires DPA before any personal data transfer to a third party acting as processor or controller |
| Stage 3 consent: driver explicitly consents to introduction to this specific company | NOT MET — per-company consent workflow designed but not implemented via SMS | Implement Stage 3 consent: send driver an SMS naming the specific company; record consent before delivery |
| Shortlist contains only consented drivers | ARCHITECTURAL — buildShortlist() does not currently enforce per-company consent check | Claude Code can add a consent filter to buildShortlist() once Stage 3 consent is implemented |
| Profile described with "self-reported credentials" language | NOT MET — delivery template does not exist yet | Add standard disclaimer: "License class CE and YKB status are self-reported by the driver as of [date]. DriverNord has not independently verified these credentials." |
| No claim of "official verification" unless Transportstyrelsen check is implemented | NOT MET for Transportstyrelsen | Do not use language like "verified CE license" without external verification; use "self-reported and consent-confirmed" |

### D. Before Invoicing a Company

| Requirement | Status | Notes |
|-------------|--------|-------|
| Service agreement signed | NOT MET — template does not exist | [LEGAL REVIEW REQUIRED] — invoicing without a service agreement creates payment dispute risk |
| Fee trigger clearly defined | NOT MET | Must state: "Fee is due on delivery of the driver shortlist, not on hire" |
| VAT registration confirmed (Swedish F-skatt) | UNKNOWN | [LEGAL REVIEW REQUIRED] — confirm DriverNord has F-skatt and is registered for moms (VAT) |
| Invoicing tool configured (Fortnox) | NOT MET | Cannot issue compliant Swedish invoice without proper tool |
| Payment terms defined | NOT MET | Recommend: 15 or 30 days net; add to service agreement |
| Limitation of liability clause | NOT MET | [LEGAL REVIEW REQUIRED] — must cap DriverNord's liability to the fee received |

### E. Before Publishing Ads That Mention Job Opportunities

| Requirement | Status | Notes |
|-------------|--------|-------|
| Ad copy does not mislead about employment | PARTIAL — draft copy is accurate; no employment guarantee implied | Review each ad variant before publishing to confirm no accidental employment claim |
| Privacy policy URL accessible in ad or linked page | PARTIAL — privacy page exists at /privacy | Confirm URL is included in Meta Ads fine print |
| Meta Ads policies for recruitment complied with | UNKNOWN | Review Meta's Special Ad Category rules for employment ads; may require declaring "Employment" category, which limits certain targeting options |
| Platsbanken posting accurately represents DriverNord's role | NOT MET — wording not yet approved | DriverNord is not an employer; posting must be framed as "join our driver pool" not "apply for a job" |
| No claim of official job offer when none exists | MET — draft copy does not make employment guarantee | Maintain this standard in all published ad copy |

---

## 5. Tool Readiness

| Tool | Purpose | Required before launch? | Current Status | Setup Owner | AI Can Help How | Risk If Missing |
|------|---------|------------------------|---------------|-------------|----------------|----------------|
| Vercel (production) | Hosts Next.js app and `/chat` registration flow | YES — Day 1 | Status unconfirmed | Founder | AI can verify local build is clean; document env var requirements | All campaign traffic has no destination; zero registrations |
| Supabase (production) | Stores all driver data, shortlists, actions | YES — needs to be authorized | NEVER touch without authorization; local is operational | Founder authorizes when ready | AI enforces local-only rule; flags production URL if detected | No data persistence for production registrations |
| 46elks | SMS delivery to drivers (availability, consent, follow-up) | YES | Not configured | Founder | AI can provide integration documentation; verify code routing | No driver contact possible; Package 4 48h promise impossible |
| Meta Business Manager | Run Facebook/Instagram driver acquisition ads | YES — Week 1 | Not confirmed active | Founder | AI has written all ad copy and creative briefs in driver-acquisition-plan.md | Primary acquisition channel unavailable |
| Meta Pixel | Track conversions on `/chat`; build retargeting audiences | YES — before ads launch | Not installed | Founder | AI can write Pixel implementation code for founder to deploy | No conversion tracking; no retargeting; blind ad spend |
| Platsbanken / Arbetsförmedlingen | Free job posting for active job seekers | YES — Week 1 | No employer account confirmed | Founder | AI drafts posting text | Secondary acquisition channel unavailable; free volume missed |
| Facebook groups | Free peer-trusted driver outreach | YES — Week 1 | Groups not yet identified or joined | Founder | AI has written post variants; founder identifies groups | Free channel missed |
| LinkedIn | Driver and B2B brand presence | No — supplemental | Not configured | Founder | AI can write LinkedIn post copy | Marginal impact if missing in Month 1 |
| Fortnox or Bokio | Swedish VAT invoicing | YES — before first sale | Not configured | Founder | AI can prepare invoice template content; cannot configure tool | Cannot issue legal invoice; no revenue collection |
| hej@drivernord.se | All inbound — company inquiries, GDPR requests, commercial | YES — Day 1 | Unconfirmed | Founder | None — purely human operational task | GDPR requests unanswered; commercial opportunities missed |
| Sentry (error monitoring) | Catch application errors in production | No — Phase 2 | Not configured | Founder | AI can prepare Sentry configuration guide | Silent failures in production; harder to debug driver registration issues |
| Vercel Analytics | Track traffic to landing pages; acquisition channel attribution | No — useful for optimization | Not confirmed | Founder | AI can interpret analytics data when available | Limited visibility into which channel drives registrations |
| Google Sheets or Notion (manual tracker) | Track active client prospects, driver pipeline, deal stage | Yes — before first client conversation | Not set up | Founder | AI can create tracker template now | No visibility into commercial pipeline for first 3 clients |

---

## 6. AI-Driven Execution Model

### Core Principle

**AI prepares → Human approves → System executes → AI monitors.**

Human time is reserved for: legal authorization, financial decisions, account creation, production deployment, final commercial approval, and sensitive communication authorization. Every other step in the acquisition and qualification chain is AI-executed or AI-monitored.

### AI-Prepares / Human-Approves / System-Executes Model

| Step | AI Prepares | Human Approves | System Executes | AI Monitors |
|------|------------|---------------|----------------|-------------|
| Ad copy and creative briefs | All 5 copy variants, 5 hooks, 3 static concepts, 3 video concepts, 3 UGC concepts | Founder reviews and authorizes | Meta Ads (founder uploads) | AI reviews CTR/CPR data on request |
| Platsbanken posting | Draft text in Swedish | Founder reviews and posts | Platsbanken (founder submits) | AI reviews registration source data |
| Facebook group post variants | 2–3 draft variants | Founder reviews, selects, posts | Facebook (founder manually posts) | None — no tracking possible |
| Driver registration flow | Existing — built | No action needed | Next.js + Supabase auto-pipeline | AI monitors completion rates via Supabase |
| Driver qualification scoring | `classify.ts` runs automatically on each registration | No approval needed for classification | Supabase `drivers` table updated | AI reports qualification rate weekly |
| Driver ingestion | `ingestLead.ts` runs automatically on `ready_for_ingestion` | No approval needed | Supabase `ingested_drivers` table | AI monitors ingestion lag |
| Shortlist creation | `buildShortlist()` triggers automatically on new need or new driver | Founder reviews in `/recruiter` before delivery | Supabase `shortlists` table | AI flags when shortlist is ready for review |
| Stage 3 consent (per-company) | Contact agent prepares SMS message naming specific company | Founder approves before SMS send | 46elks sends SMS; response stored in Supabase | AI confirms consent recorded before delivery |
| Shortlist delivery to client | AI prepares delivery email with self-reported-credentials language | Founder reviews and sends | Email (founder sends) | AI confirms delivery logged |
| Weekly acquisition report | AI queries Supabase; prepares structured report | Founder reads and acts | None | AI generates report on schedule |
| Package 4 threshold alert | AI runs readiness query; flags ≥5 available qualified drivers | Founder decides to begin commercial conversations | None — this is a decision point | AI monitors count daily |
| Package 2 threshold alert | AI runs readiness query; flags ≥15 available qualified drivers | Founder decides to begin Package 2 offers | None | AI monitors count daily |
| Invoice generation | AI prepares invoice data (company name, fee, deliverable, date) | Founder reviews and issues in Fortnox | Fortnox sends invoice | AI notes invoice issuance in project tracking |

### What AI Must Never Execute Without Human Approval

- Any SMS send to a driver or company
- Any email to a driver or company
- Any shortlist delivery to a client company
- Any production deployment
- Any production Supabase operation
- Any commercial offer, invoice, or payment collection
- Any public posting (ad, Platsbanken, Facebook group)
- Any legal document presented as final

---

## 7. Launch Gates

### Gate A — Allowed to Collect Driver Registrations

| Condition | Required | Status Today |
|-----------|----------|-------------|
| `/chat` deployed to production | YES | UNKNOWN — confirm |
| Privacy policy legally reviewed | YES [LEGAL REVIEW REQUIRED] | NOT MET |
| GDPR consent basis stated in policy | YES | NOT MET |
| hej@drivernord.se confirmed active | YES | UNKNOWN |
| Withdrawal/deletion process documented | YES | PARTIAL |

**Required documents:** Reviewed privacy policy with Art. 6(1)(a) basis
**Required tools:** Production deployment (Vercel), Supabase (production, authorized)
**Required data threshold:** None — this is the first step
**Who approves:** Founder + Lawyer (legal review)
**Go/No-Go today:** NO-GO — production deployment unconfirmed; privacy policy not reviewed

---

### Gate B — Allowed to Contact Registered Drivers

| Condition | Required | Status Today |
|-----------|----------|-------------|
| Gate A met | YES | NOT MET |
| 46elks SMS configured | YES | NOT MET |
| Consent to SMS contact recorded at registration | YES | PARTIAL |
| Opt-out mechanism implemented | YES | NOT MET |
| Stage 3 per-company consent workflow implemented | YES (before introduction) | NOT MET |

**Required documents:** Reviewed privacy policy
**Required tools:** 46elks (configured and tested)
**Required data threshold:** ≥1 registered driver
**Who approves:** Founder (each contact batch in suggest mode)
**Go/No-Go today:** NO-GO — 46elks not configured

---

### Gate C — Allowed to Launch Meta Ads

| Condition | Required | Status Today |
|-----------|----------|-------------|
| Gate A partially met (production deployment live) | YES | UNKNOWN |
| Privacy policy accessible at /privacy | YES | PARTIAL — page exists; legal review pending |
| Meta Business account active | YES | UNKNOWN |
| Meta Pixel installed on /chat | YES | NOT MET |
| Ad copy reviewed and approved by founder | YES | NOT MET (materials prepared; approval pending) |
| Ad budget authorized | YES | NOT MET |
| Meta Special Ad Category compliance checked | YES [LEGAL REVIEW REQUIRED] | UNKNOWN |

**Required documents:** Privacy policy accessible (may launch with preliminary; legal review strongly recommended)
**Required tools:** Meta Business Manager, Meta Pixel
**Required data threshold:** None — ads drive traffic to registration
**Who approves:** Founder (budget, creative, targeting decisions)
**Go/No-Go today:** NO-GO — production unconfirmed; Meta account unconfirmed; Pixel not installed

---

### Gate D — Allowed to Publish Platsbanken Post

| Condition | Required | Status Today |
|-----------|----------|-------------|
| Gate A partially met | YES | UNKNOWN |
| Arbetsförmedlingen employer account active | YES | UNKNOWN |
| Posting text approved by founder | YES | NOT MET (draft not yet written) |
| Posting accurately describes DriverNord's role (not employment claim) | YES | NOT MET (draft needed) |

**Required documents:** None beyond policy
**Required tools:** Arbetsförmedlingen employer account
**Required data threshold:** None
**Who approves:** Founder
**Go/No-Go today:** NO-GO — employer account unconfirmed; post not drafted

---

### Gate E — Allowed to Post in Facebook Groups

| Condition | Required | Status Today |
|-----------|----------|-------------|
| Gate A partially met | YES | UNKNOWN |
| Group identified and joined | YES | NOT MET |
| Group rules read and complied with | YES | NOT MET |
| Post variant selected and approved by founder | YES | NOT MET (drafts prepared in acquisition plan; approval pending) |

**Required documents:** None
**Required tools:** Facebook personal or company account
**Required data threshold:** None
**Who approves:** Founder
**Go/No-Go today:** NO-GO — groups not joined; post not approved

---

### Gate F — Allowed to Prepare Package 4 Commercial Offer

| Condition | Required | Status Today |
|-----------|----------|-------------|
| ≥5 available qualified CE + YKB drivers in database | YES | NOT MET — 0 drivers |
| 46elks configured (to confirm availability within 48h) | YES | NOT MET |
| Service agreement template exists (draft acceptable for preparation) | YES | NOT MET |
| Founder available to respond to company inquiry within 2 hours | YES | Human readiness — UNKNOWN |
| Product sheet / one-page brief prepared | STRONGLY RECOMMENDED | NOT MET |

**Required documents:** Service agreement draft
**Required tools:** 46elks, Recruiter dashboard (production)
**Required data threshold:** ≥5 available high-priority drivers
**Who approves:** Founder
**Go/No-Go today:** NO-GO — 0 drivers; 46elks not configured

---

### Gate G — Allowed to Sell Package 4

| Condition | Required | Status Today |
|-----------|----------|-------------|
| Gate F met | YES | NOT MET |
| Privacy policy legally reviewed | YES [LEGAL REVIEW REQUIRED] | NOT MET |
| DPA signed with client company | YES | NOT MET |
| Service agreement signed with client company | YES | NOT MET |
| Stage 3 driver consent recorded for this specific company | YES | NOT MET |
| Invoicing tool configured (Fortnox) | YES | NOT MET |
| Delivery promise verified (driver available within 48h) | YES | NOT MET — no drivers |

**Required documents:** Reviewed privacy policy, signed DPA, signed service agreement
**Required tools:** 46elks, Fortnox, Recruiter dashboard
**Required data threshold:** ≥5 available high-priority CE + YKB drivers
**Who approves:** Founder (commercial decision + shortlist review + delivery authorization)
**Go/No-Go today:** NO-GO — 0/8 conditions met

---

### Gate H — Allowed to Sell Package 2

| Condition | Required | Status Today |
|-----------|----------|-------------|
| Gate G met | YES | NOT MET |
| ≥15 available qualified CE + YKB drivers in database | YES | NOT MET — 0 drivers |
| At least 1 successful Package 4 delivery (quality validation) | STRONGLY RECOMMENDED | NOT MET |
| Shortlist delivery format confirmed (structured email or PDF) | YES | NOT MET — template not built |
| Replacement policy documented and agreed | YES | NOT MET |
| 3–5 driver consent confirmations per delivery | YES | NOT MET |

**Required documents:** All Gate G documents; shortlist delivery template; replacement policy
**Required tools:** All Gate G tools
**Required data threshold:** ≥15 available high-priority drivers
**Who approves:** Founder
**Go/No-Go today:** NO-GO — 0/6 additional conditions met

---

## 8. Package 4 Readiness Checklist

**Package 4 — Akut Förarsökning:** 8,000–10,000 SEK for one named, available, CE+YKB-confirmed driver introduced within 48 hours. Payment on delivery of introduction.

| Requirement | Status | Notes |
|-------------|--------|-------|
| ≥5 CE + YKB drivers with `lead_status = available` in database | NOT MET — 0 drivers | Primary blocker; requires 2–4 weeks of acquisition campaign |
| Availability confirmed within last 7 days (contacted and responded) | NOT MET | Requires 46elks SMS to function |
| 46elks SMS configured and tested | NOT MET | 30-minute task; highest-urgency operational item |
| Stage 3 consent recorded — driver has consented to introduction to this specific company | NOT MET | Requires both 46elks and per-company consent workflow implementation |
| Privacy policy legally reviewed | NOT MET [LEGAL REVIEW REQUIRED] | External dependency; 1–3 weeks |
| DPA signed with the specific client company receiving the introduction | NOT MET [LEGAL REVIEW REQUIRED] | Template does not exist; required before any profile sharing |
| Service agreement signed with client company | NOT MET [LEGAL REVIEW REQUIRED] | Template does not exist; required before invoice |
| Fortnox (or equivalent) configured for invoicing | NOT MET | Required to issue VAT-correct invoice upon delivery |
| Founder available to deliver within 2-hour window of client acceptance | UNKNOWN | Operational readiness — founder must confirm capacity |
| Delivery format ready (structured driver profile document) | NOT MET | Template not written |
| Profile language uses "self-reported credentials" framing | NOT MET | Required in delivery document |
| No claim of external verification unless Transportstyrelsen check is implemented | CONDITIONAL — do not use "externally verified" language | Transportstyrelsen API integration is Phase 2; current claims are self-reported |

**Conclusion: Package 4 is NOT currently sellable.** Zero of 12 required conditions are fully met. The critical path runs through: (1) production deployment, (2) 46elks configuration, (3) legal document review, and (4) driver acquisition campaign reaching ≥5 available qualified drivers. Minimum realistic timeline to Package 4 readiness: 3–6 weeks.

---

## 9. Package 2 Readiness Checklist

**Package 2 — Verifierad Förarlista:** 15,000 SEK introductory (18,000 SEK after 3 sales) for 3–5 matched, available, consent-confirmed CE drivers delivered within 3–5 business days. Payment on shortlist delivery.

| Requirement | Status | Notes |
|-------------|--------|-------|
| All Package 4 conditions met | NOT MET | Package 2 requires all Package 4 prerequisites first |
| ≥15 CE + YKB drivers with `lead_status = available` in database | NOT MET — 0 drivers | Requires 4–8 weeks of acquisition campaign at standard conversion rates |
| Ability to deliver 3–5 non-overlapping profiles for this specific client need | NOT MET | Requires both database depth and deduplication window logic (14-day window in buildShortlist()) |
| All shortlisted drivers consent-confirmed for this specific company (Stage 3 consent) | NOT MET | Requires per-company consent workflow via SMS |
| Shortlist delivery format ready (PDF or structured email with profile cards) | NOT MET | Template not built; AI can draft |
| Replacement policy documented and agreed in service agreement | NOT MET [LEGAL REVIEW REQUIRED] | Must define: if a driver becomes unavailable post-delivery, replacement within 7 days |
| At least 1 successful Package 4 delivery | NOT MET | Strongly recommended before Package 2; validates driver quality and delivery process |
| Founder has reviewed all shortlist profiles before delivery | PROCESS DEFINED — not yet executable | Recruiter dashboard is built; process requires live driver data |
| Invoicing tool configured | NOT MET | Fortnox required before 15,000 SEK invoice is issued |
| 3–5 business day delivery promise is realistic given database depth | NOT MET | Cannot assess until database exists |

**Conclusion: Package 2 is NOT currently sellable.** Package 2 requires all Package 4 conditions to be met first, plus additional database depth (≥15 vs. ≥5) and a validated delivery process. Minimum realistic timeline to Package 2 readiness: 6–10 weeks from today.

---

## 10. Founder Action List

All items below are human-only tasks. They cannot be executed by Claude Code. Listed in strict priority order — resolve in sequence.

### Action 1 — Confirm Production Deployment Status of `/chat`

| Field | Detail |
|-------|--------|
| **Time estimate** | 15–60 minutes |
| **Why it matters** | Without production deployment, all ad traffic has no destination; zero driver registrations are possible regardless of campaign spend |
| **What happens if delayed** | Every day of delayed deployment = wasted acquisition window; ads cannot launch; Platsbanken and Facebook posts are pointless |
| **How to verify** | Navigate to drivernord.se/chat in a browser; attempt to start registration; confirm data appears in Supabase |

---

### Action 2 — Configure 46elks SMS

| Field | Detail |
|-------|--------|
| **Time estimate** | 30 minutes |
| **Why it matters** | Without SMS, no driver in the database can ever be contacted; Package 4's 48-hour promise is physically impossible |
| **What happens if delayed** | Driver database grows but is commercially useless — you cannot confirm availability or send consent requests |
| **Steps** | Create account at 46elks.com → add credits → set SMS_PROVIDER=46elks, SMS_API_KEY, SMS_API_SECRET, SMS_FROM_NUMBER in Vercel env → test by sending a test SMS |

---

### Action 3 — Verify hej@drivernord.se Is Active and Monitored

| Field | Detail |
|-------|--------|
| **Time estimate** | 10 minutes |
| **Why it matters** | GDPR requests must be answered within 30 days; all commercial inquiries route here; unmonitored inbox = missed revenue and legal exposure |
| **What happens if delayed** | First driver GDPR request or first company inquiry may go unanswered |
| **Steps** | Send a test email from a personal address; confirm receipt; commit to checking at minimum daily |

---

### Action 4 — Authorize Driver Acquisition Budget

| Field | Detail |
|-------|--------|
| **Time estimate** | 30–60 minutes decision time |
| **Why it matters** | Without a budget decision, no Meta Ads campaign can launch; driver acquisition stalls |
| **What happens if delayed** | Zero driver supply; no commercial product possible |
| **Decision:** | Recommended minimum: Scenario B (5,000 SEK for Month 1 Meta Ads). Reviewed in driver-acquisition-plan.md Section 15 |

---

### Action 5 — Commission Legal Review of Privacy Policy, DPA, and Service Agreement

| Field | Detail |
|-------|--------|
| **Time estimate** | 1–2 hours to find and brief a lawyer; 1–3 weeks for review |
| **Why it matters** | Without reviewed legal documents, no driver profile can legally be shared with a company; every shortlist delivery is legally incomplete |
| **What happens if delayed** | You can collect registrations but cannot convert them into commercial transactions; acquisition campaign produces supply that cannot be monetized |
| **Claude Code role:** | AI delivers drafts of all three documents; founder commissions lawyer to review |

---

### Action 6 — Set Up Fortnox (or Bokio) for Invoicing

| Field | Detail |
|-------|--------|
| **Time estimate** | 1–2 hours |
| **Why it matters** | Cannot issue a VAT-correct invoice without an invoicing tool; first revenue collection is impossible |
| **What happens if delayed** | First client is ready to pay but you have no mechanism to collect legally |
| **Steps** | Activate Fortnox account at fortnox.se; enter company details, F-skatt number, VAT registration; create Package 4 and Package 2 invoice templates |

---

### Action 7 — Confirm Access to Meta Business Manager

| Field | Detail |
|-------|--------|
| **Time estimate** | 15–30 minutes |
| **Why it matters** | Meta Business Manager is required to run paid campaigns on Facebook and Instagram |
| **What happens if delayed** | Primary acquisition channel unavailable; driver database stays empty longer |
| **Steps** | Log in to business.facebook.com; confirm payment method; confirm page linked; confirm ad account active |

---

### Action 8 — Review and Approve Ad Creatives

| Field | Detail |
|-------|--------|
| **Time estimate** | 60–90 minutes |
| **Why it matters** | Founder must approve all externally-published copy before it runs; AI has prepared all variants in driver-acquisition-plan.md |
| **What happens if delayed** | Ads cannot launch even after Meta Business account is confirmed |
| **Steps** | Read driver-acquisition-plan.md Section 5; select ad copy variants and static concepts; authorize upload |

---

### Action 9 — Approve Platsbanken Posting Wording

| Field | Detail |
|-------|--------|
| **Time estimate** | 30 minutes |
| **Why it matters** | Platsbanken is a free acquisition channel with high-intent applicants; must be framed accurately (driver pool, not employment offer) |
| **What happens if delayed** | Free channel missed during Month 1 |
| **Steps** | Review AI-drafted Platsbanken post (Section 11 deliverable); approve; submit via employer account |

---

### Action 10 — Approve Facebook Group Posting Rules

| Field | Detail |
|-------|--------|
| **Time estimate** | 60 minutes (group research + approval) |
| **Why it matters** | Facebook groups are a peer-trusted free channel; each group has its own moderation rules |
| **What happens if delayed** | Free channel missed; low impact on Month 1 if Meta Ads is live |
| **Steps** | Search Facebook for CE/transport driver groups in Sweden; join 2–3 groups; read rules; select AI-drafted post variant; post in first group |

---

## 11. Claude Code Action List

The following tasks are AI-executable without touching production, sending any communication, or modifying application code. Claude Code should complete these in the order listed. These are the deliverables that remove blockers before the founder executes.

**Do not execute these tasks now. List only — execution on separate instructions.**

1. **Draft privacy policy legal-basis section** — Add explicit GDPR Art. 6(1)(a) consent basis language, data categories list, retention periods, and withdrawal process to the existing privacy policy draft. Mark as "draft for lawyer review — not legally reviewed." Save to `docs/business/legal/privacy-policy-legal-basis-draft.md`.

2. **Draft DPA template v1** — Full Data Processing Agreement covering: parties, processing purposes, data categories, sub-processors, security obligations, breach notification, driver rights, and termination. Marked as "Preliminär version — [LEGAL REVIEW REQUIRED]." Save to `docs/business/legal/dpa-template-v1.md`.

3. **Draft service agreement template v1** — 1-page commercial agreement covering: fee trigger (shortlist delivery), payment terms (15 days net), what DriverNord delivers, limitation of liability (capped at fee received), self-reported credentials disclaimer, replacement policy, and governing law (Swedish law). Marked as "Preliminär version — [LEGAL REVIEW REQUIRED]." Save to `docs/business/legal/service-agreement-v1.md`.

4. **Draft Platsbanken posting** — Swedish-language posting accurately framing DriverNord's driver pool registration (not an employment offer). Include required fields: title, description, requirements (CE + YKB), location, application instruction (link to /chat). Save to `docs/business/acquisition-assets/platsbanken-post-draft.md`.

5. **Draft Facebook group post variants** — 3 Swedish-language post variants at different lengths (short/medium/long) for different group tones. Include compliant language, no false claims, and link to /chat. Save to `docs/business/acquisition-assets/facebook-group-posts.md`.

6. **Draft Meta Ads creative brief** — One-page brief for a designer or the founder to produce the 3 static ad concepts documented in driver-acquisition-plan.md. Include dimensions, text overlays, color guidance, and file format requirements. Save to `docs/business/acquisition-assets/meta-ads-creative-brief.md`.

7. **Create weekly acquisition report template** — Standard format: date, total registrations, new this week, qualification rate, package readiness status, Meta Ads performance (CTR, CPR, total spend), Platsbanken yield, Facebook group yield, top dropout step, recommended action. Save to `docs/business/templates/weekly-acquisition-report-template.md`.

8. **Create Package 4 readiness report template** — Automated-friendly format: current count of `available + high priority + CE + YKB valid` drivers, trend vs. last week, estimated days to threshold at current rate, SMS readiness status, legal readiness status, go/no-go for first commercial conversation. Save to `docs/business/templates/package-4-readiness-report.md`.

9. **Create Package 2 readiness report template** — Same structure as Package 4 template but targeting ≥15 drivers, plus shortlist depth check (can we deliver 3–5 to this specific company without reusing recent shortlist entries?). Save to `docs/business/templates/package-2-readiness-report.md`.

10. **Write monitoring SQL queries** — Complete set of Supabase SQL queries for daily and weekly monitoring: funnel summary, qualification breakdown, package readiness check, dropout analysis by step, follow-up pipeline status. Save to `docs/business/templates/monitoring-sql-queries.md`.

11. **Draft shortlist delivery template** — Email template and attached PDF template for delivering a Package 4 (1 driver) and Package 2 (3–5 drivers) shortlist to a client company. Must include self-reported credentials disclaimer, consent confirmation statement, replacement policy reference, and DPA reference. Save to `docs/business/templates/shortlist-delivery-template.md`.

---

## 12. Recommended Next Claude Code Task

**Recommendation: Draft the three legal documents (DPA template, service agreement, privacy policy legal-basis section).**

**Why this is the highest-leverage next task:**

The legal documents are the rate-limiting step on the critical path to first revenue. Every other blocker has a clear, fast human resolution path:
- Production deployment: founder-authorized (hours)
- 46elks: 30-minute founder task
- hej@drivernord.se: 10-minute verification
- Meta Ads: founder-executed once creatives are approved
- Driver acquisition: campaign-driven (4–8 weeks)

But the legal documents require a lawyer, and a lawyer cannot review documents that do not exist yet. The founder must commission a lawyer. The lawyer cannot act until they have a draft to review. **Claude Code is the bottleneck — not the lawyer.** Every day without a draft is a day the legal review cannot progress.

Drafting all three documents creates the artifact the founder hands to a lawyer, which starts the clock on the 1–3 week review window. That review runs in parallel with the acquisition campaign. If the legal review and the driver acquisition campaign run in parallel, first revenue is achievable within 6–8 weeks.

If the legal documents are drafted after the driver database has been built, first revenue is delayed by the entire legal review period. Sequential execution wastes 2–4 weeks.

**Execution order:**
1. `docs/business/legal/dpa-template-v1.md` — highest urgency; blocks every single commercial transaction
2. `docs/business/legal/service-agreement-v1.md` — blocks invoicing; second-highest urgency
3. `docs/business/legal/privacy-policy-legal-basis-draft.md` — blocks legal data collection at scale; third-highest urgency

---

## 13. Final Go/No-Go Summary

| Question | Answer | Reason | What changes this |
|----------|--------|--------|------------------|
| Can we launch Meta Ads today? | NO | Production deployment unconfirmed; Meta account unconfirmed; Pixel not installed; privacy policy not reviewed | Founder: deploy, confirm Meta account, install Pixel; Lawyer: review privacy policy |
| Can we collect driver data today? | NO (technically possible; legally premature) | Privacy policy not legally reviewed; Art. 6 legal basis not stated; consent withdrawal process not documented | Lawyer reviews privacy policy; alternatively, run with preliminary policy for a small test batch at founder's legal risk [LEGAL REVIEW REQUIRED] |
| Can we contact drivers today? | NO | 46elks not configured; no SMS capability | Founder configures 46elks (30-minute task) |
| Can we sell Package 4 today? | NO | 0 drivers in database; 0 legal documents in place; SMS not configured; 0 of 8 conditions met | Requires 3–6 weeks minimum: deployment + legal review + acquisition campaign |
| Can we sell Package 2 today? | NO | All Package 4 blockers apply; additionally requires ≥15 drivers vs. ≥5 | Requires 6–10 weeks minimum; follows Package 4 readiness |
| What is the shortest path to first legal, operationally safe driver acquisition launch? | 3-step parallel execution | **Parallel Track 1 (Founder, 2–48 hours):** Confirm production deployment, configure 46elks, verify inbox, authorize budget, set up Meta account. **Parallel Track 2 (AI, 1–2 days):** Draft DPA, service agreement, privacy-policy legal-basis section for lawyer review. **Parallel Track 3 (External, 1–3 weeks):** Lawyer reviews and approves legal documents. During Track 3: launch acquisition campaign. When Tracks 1 + 2 + 3 all complete AND ≥5 qualified available drivers exist → Package 4 is sellable. | Immediate action on all three tracks simultaneously. |

**Critical path item:** The founder must take action today on Track 1 (operational setup) and commission Claude Code to deliver Track 2 (legal drafts). Neither track requires the other to start. Both run simultaneously. Legal review (Track 3) cannot start until Track 2 delivers. Every day of delay on Track 1 and Track 2 is a day of delay on first revenue.

---

*All confidence assessments: VERIFIED FACT where sourced from codebase or confirmed documentation; STRONG INFERENCE where derived from market research; INFERRED where based on logical extrapolation. All legal items marked [LEGAL REVIEW REQUIRED]. No deployment, outreach, SMS, email, or production database actions were performed in creating this document.*

*Document version: 1.0 — 2026-05-14*
