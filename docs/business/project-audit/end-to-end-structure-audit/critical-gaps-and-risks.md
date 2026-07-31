# Critical Gaps and Risks

**Audit date:** 2026-05-16
**Scope:** Consolidated risk register from all 8 sub-audits. Ranked by operational severity. Includes gaps (missing things) and risks (things that could go wrong).
**Purpose:** Single reference for prioritizing what to fix next.

---

## Risk Classification

| Level | Meaning |
|-------|---------|
| CRITICAL | Blocks commercial operation or creates immediate legal liability |
| HIGH | Blocks key features, creates serious compliance gaps, or creates data loss risk |
| MEDIUM | Creates operational friction, brand inconsistency, or future technical debt |
| LOW | Minor issues with no near-term impact |

---

## CRITICAL Risks (must fix before any commercial operation)

### CRIT-01: Migration 013 Not Applied to Production

**Category:** Database / GDPR compliance
**Source audit:** database-and-supabase-audit.md

**What:** The production Supabase database is missing 10 columns from migration 013: consent fields, all 5 UTM fields, landing_page_url, referrer_url. Any driver who registers through the production chat today completes the GDPR consent step but the consent record silently fails to save.

**Impact:** Drivers appear to have consented, but no consent timestamp, version, or scope is stored. This is a GDPR Art. 7 violation in production. UTM attribution for all social campaigns is completely lost.

**Who fixes:** Founder applies migration 013 to production Supabase. Claude Code cannot do this.
**Effort:** 10 minutes.
**Blocker for:** Every other part of the operational plan.

---

### CRIT-02: No Executed DPA with Company Clients

**Category:** Legal / GDPR Art. 28
**Source audit:** legal-and-gdpr-readiness-audit.md

**What:** Sharing a driver profile with a transport company requires a Data Processing Agreement executed before the first share. The DPA template exists as an unreviewed Claude Code draft. No DPA has been reviewed by a Swedish lawyer, let alone signed with any client.

**Impact:** Sharing a driver profile without a signed DPA is a GDPR Art. 28 violation. The first commercial transaction (Package 4: urgent introduction, 8,000–10,000 SEK) cannot legally occur without this.

**Who fixes:** Founder commissions Swedish GDPR lawyer to review and confirm DPA template. Then: signed DPA with each client before any sharing.
**Effort:** Weeks (legal review timeline). Start immediately.
**Blocker for:** First revenue.

---

### CRIT-03: SMS Not Configured in Production

**Category:** Operational pipeline
**Source audit:** codebase-and-routes-audit.md

**What:** `SMS_PROVIDER=46elks` is not configured. All SMS in contactAgent and followUpAgent is simulated with `console.log`. A driver who registers receives no SMS confirmation. Follow-up messages are never sent. The matching pipeline completes but drivers don't know they've been matched.

**Impact:** The core value proposition to drivers ("we contact you") is broken in production. Even if drivers register, they receive no feedback, which destroys trust and increases drop-off.

**Who fixes:** Founder sets `SMS_PROVIDER=46elks` in Vercel environment variables and funds the 46elks account.
**Effort:** 30 minutes.
**Blocker for:** Any driver actually receiving communication.

---

### CRIT-04: Zero Drivers in Production Database

**Category:** Commercial readiness
**Source audit:** full-project-structure-audit.md

**What:** The production Supabase database has zero driver records. No company can be introduced to a driver because there are no drivers. The entire acquisition strategy is premised on having a supply of qualified drivers.

**Impact:** DriverNord cannot generate revenue until there are drivers. Package 4 (urgent introduction, 8,000–10,000 SEK) requires at least 1 matching driver. Package 2 (shortlist, 15,000 SEK) requires at least 3–5 qualified matches.

**Who fixes:** Founder creates Facebook Page → posts organic content → drivers register → supply grows.
**Effort:** Weeks (organic acquisition). First priority after CRIT-01 and CRIT-03.
**Blocker for:** First revenue.

---

## HIGH Risks (fix before production scale)

### HIGH-01: STOPP Opt-Out Not Implemented

**Category:** Legal / EkomL compliance
**Source audit:** legal-and-gdpr-readiness-audit.md, codebase-and-routes-audit.md

**What:** Swedish Lagen om elektronisk kommunikation (EkomL) legally requires that when a recipient sends "STOPP" by SMS, all further SMS communications must immediately cease. There is no inbound SMS webhook handler in the codebase. The STOPP requirement is documented in `human-approval-and-risk-gates.md` as a LOG ONLY automation, but no code exists to receive or act on inbound STOPP messages.

**Impact:** As soon as any real SMS is sent (which requires CRIT-03 to be resolved), DriverNord is in immediate breach of EkomL if any driver replies "STOPP" and further messages are sent. This is a legal violation, not just a UX issue.

**Who fixes:** Claude Code builds the inbound SMS webhook handler (`/api/webhooks/sms-inbound/route.ts`) before 46elks is configured in production.
**Effort:** 4–6 hours (Claude Code).
**Blocker for:** SMS going live.

---

### HIGH-02: No GDPR Deletion Route (Right to Erasure)

**Category:** Legal / GDPR Art. 17
**Source audit:** legal-and-gdpr-readiness-audit.md

**What:** GDPR Art. 17 grants data subjects the right to erasure. There is no `DELETE /api/leads/[id]` route in the codebase. There is no deletion mechanism for the `ingested_drivers` table. There is no procedure for handling a deletion request.

**Impact:** If any driver requests deletion of their data, there is no system-level way to fulfill the request. Manually deleting from Supabase is error-prone and leaves no audit trail. A documented deletion request that is not fulfilled within GDPR SLA creates regulatory exposure.

**Who fixes:** Claude Code builds the deletion route and procedure.
**Effort:** 3–4 hours (Claude Code).
**Blocker for:** GDPR compliance at scale.

---

### HIGH-03: Privacy Policy Not Lawyer-Reviewed

**Category:** Legal / GDPR Art. 13
**Source audit:** legal-and-gdpr-readiness-audit.md, web-pages-and-ux-audit.md

**What:** The privacy policy at `/privacy` is a preliminary draft that explicitly has not been reviewed by a Swedish GDPR lawyer. It is live on the production website. The Art. 6 legal basis is not confirmed. The Art. 13 required disclosures (data recipients, retention period, rights) may be incomplete.

**Impact:** Drivers are making consent decisions based on a privacy policy that may not accurately reflect their legal rights. This creates GDPR Art. 13 exposure and undermines the validity of consent captured under it.

**Who fixes:** Founder sends `legal-review-brief-for-lawyer.md` to a Swedish GDPR lawyer immediately.
**Effort:** External (lawyer timeline). Start immediately.
**Blocker for:** Production scale, any profile sharing.

---

### HIGH-04: Consent Text Not Lawyer-Confirmed

**Category:** Legal / GDPR Art. 7
**Source audit:** legal-and-gdpr-readiness-audit.md

**What:** The GDPR consent text used in the `/chat` flow (step 13 of 14) is implemented in `applyStep.ts` and defined in `driver-consent-language-v1.md`. It has not been reviewed by a Swedish GDPR lawyer to confirm all Art. 13 required elements are present.

**Impact:** Consent captured without confirmed Art. 13 disclosures may be invalid. Invalid consent means all subsequent data processing — ingestion, matching, profile sharing — lacks legal basis.

**Who fixes:** Lawyer review as part of HIGH-03 legal review brief.
**Effort:** External (lawyer timeline).
**Blocker for:** Production scale.

---

### HIGH-05: No Cookie Consent Banner

**Category:** Legal / ePrivacy / GDPR
**Source audit:** web-pages-and-ux-audit.md, meta-and-social-readiness-audit.md

**What:** There is no cookie consent banner component in the codebase. The Meta Pixel is disabled (`NEXT_PUBLIC_META_PIXEL_ENABLED=false`) as required. But when it is time to enable the Pixel, there is no mechanism to obtain visitor consent before the Pixel loads.

**Impact:** Activating the Meta Pixel without a consent banner is an ePrivacy Directive violation. Sweden's IMY (Integritetsskyddsmyndigheten) has issued fines for exactly this. The Pixel cannot go live without this component.

**Who fixes:** Claude Code builds the banner after lawyer provides direction on cookie consent approach.
**Effort:** 2–4 hours (Claude Code) — after lawyer guidance on consent design.
**Blocker for:** Meta Pixel activation, paid campaigns.

---

### HIGH-06: `.env.local.prod-backup` in Repo

**Category:** Security
**Source audit:** full-project-structure-audit.md

**What:** The file `.env.local.prod-backup` exists in the repository. This file may contain production Supabase service role keys, RECRUITER_API_KEY, or other production secrets. If it contains real secrets and is tracked by git (or was ever committed), this is a security incident.

**Impact:** If the production service role key is in this file and this file was ever committed to git history, the key should be considered compromised and rotated immediately.

**Who verifies:** Founder reads the file and checks git log for whether it was ever committed. Claude Code must NOT read this file as it may contain production credentials.
**Effort:** 10 minutes (founder).
**Immediate action required.**

---

### HIGH-07: Facebook Page Does Not Exist

**Category:** Operational / acquisition pipeline
**Source audit:** meta-and-social-readiness-audit.md

**What:** The Facebook Page for DriverNord does not exist. All organic and paid social acquisition depends on this Page existing.

**Impact:** Zero organic content can be published. No paid campaigns can be launched. No Instagram account can be connected. The content strategy is fully specified but cannot be executed.

**Who fixes:** Founder creates the Facebook Page.
**Effort:** 2–4 hours.
**Blocker for:** Entire social acquisition strategy.

---

## MEDIUM Risks (fix before full operational scale)

### MED-01: Domain Name Inconsistency (`.com` vs `.se`)

**Category:** Brand / documentation
**Source audit:** documentation-consistency-audit.md

**Files affected:** `docs/current/project-state.md`, possibly `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/contact/page.tsx`, `app/cookies/page.tsx`

**What:** The canonical domain was decided as `drivernord.se` on 2026-05-14. Some documentation and possibly some web pages still reference `hej@drivernord.com` or `drivernord.com`.

**Impact:** If drivers or companies see `drivernord.com` on the website but are told `drivernord.se`, this undermines trust. If the contact email is wrong, driver and company inquiries may be lost.

**Who fixes:** Claude Code updates all `.com` references in documentation and app pages.
**Effort:** 1–2 hours.

---

### MED-02: Duplicate Migration Directories

**Category:** Technical
**Source audit:** database-and-supabase-audit.md

**What:** Two directories contain identical 13 migration files: `/migrations/` (sequential naming) and `/supabase/migrations/` (Supabase CLI timestamp naming). Running migrations from both would cause constraint errors.

**Impact:** Any developer (or future Claude Code session) unfamiliar with the project could run migrations from the wrong directory, causing duplicate table creation errors.

**Who fixes:** Claude Code adds a CLAUDE.md note clarifying that `/supabase/migrations/` is canonical. Optionally add a README to `/migrations/` directing to the canonical dir.
**Effort:** 30 minutes.

---

### MED-03: B2B Infrastructure vs. Agent Architecture Disconnect

**Category:** Documentation
**Source audit:** documentation-consistency-audit.md, agentic-system-readiness-audit.md

**What:** Migrations 008–012 and `lib/b2b/` represent significant B2B infrastructure (company research, outreach tracking, pilot relationships) that was built earlier in the project. The agentic OS roadmap treats company demand research as a Phase 2 greenfield build, not acknowledging this existing infrastructure.

**Impact:** Future development work may rebuild what already exists, or may miss the existing tables and fail to use them correctly.

**Who fixes:** Claude Code reviews the B2B table schemas and updates the agentic OS documentation to reference the existing infrastructure.
**Effort:** 2–3 hours.

---

### MED-04: No Phone Number Format Constraint

**Category:** Data quality
**Source audit:** database-and-supabase-audit.md

**What:** The `phone` column on the `drivers` table is stored as raw TEXT with no E.164 normalization or uniqueness constraint. Deduplication logic depends on phone normalization that is not enforced at the database level.

**Impact:** Duplicate driver records are possible if the same phone number is registered with different formatting (e.g., `0701234567` vs `+46701234567`). The matching pipeline could contact the same driver multiple times.

**Who fixes:** Claude Code adds a database function for phone normalization and a normalized phone column or unique constraint.
**Effort:** 2–3 hours.

---

### MED-05: `/company/ai-agenter` May Be Outdated

**Category:** Brand / accuracy
**Source audit:** web-pages-and-ux-audit.md

**What:** The technical architecture page at `/company/ai-agenter` describes the DriverNord AI system. This page was written before the new agentic OS documentation (May 2026). The new architecture has 7–8 agents planned with different boundaries than the original design.

**Impact:** A company meeting with DriverNord may be directed to this page. If it claims specific agent capabilities or counts that differ from the current architecture, it damages credibility.

**Who fixes:** Founder reviews the page content. Claude Code updates the page to match the current agentic OS architecture.
**Effort:** 1–2 hours.

---

### MED-06: No `robots.txt` or Sitemap

**Category:** SEO / security
**Source audit:** web-pages-and-ux-audit.md

**What:** No `robots.txt` exists to block crawlers from `/recruiter`. No `sitemap.xml` exists to help search engines index the public pages.

**Impact:** The recruiter cockpit (even though it requires cookie auth) is visible to search engine crawlers. This is not a security risk (the cookie check is enforced in middleware), but it is unnecessary crawler exposure.

**Who fixes:** Claude Code creates `public/robots.txt` and a Next.js sitemap route.
**Effort:** 1 hour.

---

### MED-07: No Data Retention Schedule

**Category:** Legal / GDPR Art. 5(1)(e)
**Source audit:** legal-and-gdpr-readiness-audit.md

**What:** GDPR Art. 5(1)(e) requires data to be kept "no longer than necessary." No data retention schedule is defined anywhere in the documentation. How long are `anonymous_dropoff` records kept? How long are disqualified drivers kept? When are `system_actions` audit logs purged?

**Impact:** Without a defined retention schedule, DriverNord cannot demonstrate Art. 5(1)(e) compliance. The lawyer review brief should request legal guidance on appropriate retention periods.

**Who fixes:** Founder defines retention schedule (with lawyer input), then Claude Code documents it and implements automated deletion if required.
**Effort:** Requires legal input first.

---

### MED-08: Recruiter Cockpit Missing Agent Output Review UI

**Category:** Technical
**Source audit:** web-pages-and-ux-audit.md, agentic-system-readiness-audit.md

**What:** When Phase 1 agents (Creative Agent, Communication Triage Agent) begin producing output, the founder needs a UI in the cockpit to review and approve pending agent actions from the `pending_actions` table. This view does not exist.

**Impact:** Without the approval UI, the founder cannot fulfill the human oversight role that the agentic OS requires. Agent outputs will pile up with no review mechanism.

**Who fixes:** Claude Code builds the pending_actions review view in `/recruiter` as part of Phase 1 agent implementation.
**Effort:** 4–6 hours (Claude Code, part of Phase 1 build).

---

## LOW Risks

### LOW-01: No Favicon

**Source audit:** web-pages-and-ux-audit.md
**What:** No favicon.ico or favicon.png in `/public`. Browser tabs show default browser icon.
**Effort:** Upload image + 30 min to link in layout.

### LOW-02: No Root-Level OpenGraph Image

**Source audit:** web-pages-and-ux-audit.md
**What:** Direct links to `https://drivernord.se` show no social preview image. Only `/chaufforer` and `/company` have `opengraph-image.tsx`.
**Effort:** 1 hour (Claude Code).

### LOW-03: `TASK_COMPLETED_READY_TO_SHUTDOWN.txt` Artifact

**Source audit:** documentation-consistency-audit.md
**What:** An AI session artifact file in `docs/business/market-entry-research/ai-public-data-validation/master-opportunity-database/`. Has no documentation value.
**Effort:** Delete file. 1 minute.

### LOW-04: Bemanning Folder Premature

**Source audit:** documentation-consistency-audit.md
**What:** `docs/business/bemanning-driver-model/` contains an employment contract framework document for a model that is not current strategy until Phase 9+ (24–36 months out). Creates confusion.
**Effort:** Move to `docs/archive/`. 5 minutes.

### LOW-05: No Custom 404 Page

**Source audit:** web-pages-and-ux-audit.md
**What:** No `not-found.tsx`. Broken links show Next.js default 404.
**Effort:** 1 hour (Claude Code).

### LOW-06: Missing Indices for Future Scale

**Source audit:** database-and-supabase-audit.md
**What:** As the database grows, queries on `drivers(phone)` for dedup, `drivers(utm_content, lead_priority)` for Creative Agent analysis, and `system_actions(agent_id, created_at)` for audit log queries will benefit from indices.
**Not urgent until:** Database exceeds ~1,000 rows.
**Effort:** 30 min when needed.

---

## Risk Summary Table

| ID | Risk | Level | Who | Urgency |
|----|------|-------|-----|---------|
| CRIT-01 | Migration 013 not in production | CRITICAL | Founder | NOW |
| CRIT-02 | No executed DPA | CRITICAL | Founder + Lawyer | NOW |
| CRIT-03 | SMS not configured | CRITICAL | Founder | NOW |
| CRIT-04 | Zero drivers in DB | CRITICAL | Founder | NOW (ongoing) |
| HIGH-01 | STOPP opt-out not built | HIGH | Claude Code | Before SMS live |
| HIGH-02 | No GDPR deletion route | HIGH | Claude Code | Before scale |
| HIGH-03 | Privacy policy not reviewed | HIGH | Founder + Lawyer | NOW |
| HIGH-04 | Consent text not confirmed | HIGH | Founder + Lawyer | NOW |
| HIGH-05 | No cookie consent banner | HIGH | Claude Code | Before Pixel |
| HIGH-06 | `.env.local.prod-backup` risk | HIGH | Founder | IMMEDIATE |
| HIGH-07 | No Facebook Page | HIGH | Founder | NOW |
| MED-01 | Domain inconsistency | MEDIUM | Claude Code | Soon |
| MED-02 | Duplicate migration dirs | MEDIUM | Claude Code | Soon |
| MED-03 | B2B/agent architecture disconnect | MEDIUM | Claude Code | Before Phase 2 |
| MED-04 | No phone normalization | MEDIUM | Claude Code | Before scale |
| MED-05 | ai-agenter page outdated | MEDIUM | Claude Code | Before company meetings |
| MED-06 | No robots.txt/sitemap | MEDIUM | Claude Code | Soon |
| MED-07 | No data retention schedule | MEDIUM | Founder + Lawyer | Before scale |
| MED-08 | No agent approval UI in cockpit | MEDIUM | Claude Code | Phase 1 build |
| LOW-01 | No favicon | LOW | Claude Code | Anytime |
| LOW-02 | No root OG image | LOW | Claude Code | Anytime |
| LOW-03 | TASK_COMPLETED artifact | LOW | Anyone | Next session |
| LOW-04 | Bemanning folder premature | LOW | Anyone | Next session |
| LOW-05 | No custom 404 page | LOW | Claude Code | Anytime |
| LOW-06 | Missing future indices | LOW | Claude Code | When data grows |

---

*Version 1.0 — 2026-05-16 — Risk register only. No changes made. All risks require separate authorized actions.*
