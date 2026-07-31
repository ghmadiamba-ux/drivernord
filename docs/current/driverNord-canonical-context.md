# DriverNord — Canonical Context

*Last updated: 2026-05-16*
*Purpose: Single source of truth for all Claude Code sessions. Read this file first at the start of every new session.*

---

## 1. Project Identity

**DriverNord** is an AI-first infrastructure platform for professional driver acquisition, qualification, matching, and consented introduction in the Swedish heavy transport market.

- **Not** a traditional recruitment agency
- **Not** a staffing/bemanning company
- **Not** a manual job board
- **Is** an autonomous pipeline that prepares driver supply for human-approved commercial delivery

**Target drivers:** CE/C/D license + YKB, Stockholm region primary. Outside-Stockholm with willingness to relocate also captured.

**Target clients:** Swedish transport SMEs (5–50 trucks), regional logistics companies, construction transport operators — particularly small operators who cannot afford agency fees (63,000–126,000 SEK) but have a real CE driver need.

---

## 2. Operating Model

**AI executes and prepares → human validates and authorizes → system executes and logs → AI monitors.**

Human work is limited to: legal approval, financial setup, final commercial decisions, sensitive communication authorization, production deployment, GDPR validation, and exceptional judgment calls.

---

## 3. Current Architecture State

**Stack:** Next.js 14 (App Router), TypeScript 5, Tailwind CSS 3, Supabase (PostgreSQL), Vercel, Vitest.

**What is built and working:**
- Driver registration chat (`/chat`) — 14-step bilingual structured intake (including GDPR affirmative consent step)
- Automated classification (`classify.ts`) and scoring (`scoreDriver`)
- Automated matching (`buildShortlist()` in `lib/matchingEngine.ts`)
- Shortlist creation and persistence
- Human approval cockpit (`/recruiter`)
- Follow-up scheduling (cron at 08:00 UTC via Vercel)
- 660/660 tests passing (includes 82-test 10-driver E2E simulation)
- Migrations 001–013 committed (013 adds consent + attribution columns — NOT yet applied to production)
- 10-driver E2E simulation completed — all 10 driver profiles validated, all edge cases pass

**What is NOT operational:**
- SMS delivery — SIMULATED (`console.log` only). `SMS_PROVIDER=46elks` not configured.
- Driver database — EMPTY. No real drivers registered.
- B2B commercial delivery — manual only. No automated delivery of shortlists to client companies.

**Critical constraint:** LOCAL SUPABASE ONLY. Never use production Supabase (`supabase.co`) without explicit founder authorization. Never run `B2B_IMPORT_CONFIRM=true` unless `SUPABASE_URL` contains `127.0.0.1`.

---

## 4. Current Business State

**Stage:** Pre-commercial. Technical pipeline complete. No paying customers. No driver supply. Legal documents not in place.

**Confirmed market gap:** The verified-consented-introduction model (paying a flat fee for a shortlist of pre-verified, available, consent-confirmed CE drivers) does not currently exist as a marketed Swedish transport product. This is the gap DriverNord occupies.

**Sweden CE driver shortage:** ~5,000 drivers/year structural shortfall. Demand is persistent.

**Competitive window:** Förartjänst.se is rebuilding in 2026. When it relaunches with its claimed 20,000+ drivers, the competitive landscape changes. 2026 is the window to establish market presence.

---

## 5. Current Monetization Recommendation

### V1 Product Sequence

| Package | Product | Price | When |
|---------|---------|-------|------|
| Package 4 | Akut Förarsökning (urgent, 1 driver, 48h delivery) | 8,000–10,000 SEK | First commercial product (≥5 available drivers) |
| Package 2 | Verifierad Förarlista (3–5 drivers, 3–5 day delivery) | 15,000 SEK introductory; 18,000 SEK after 3 sales | After ≥15 available drivers |
| Package 3 | Success fee (on hire) | 35,000–45,000 SEK | After 3 successful Package 2 sales |
| Package 5 | Monthly subscription | 2,500 SEK/month | After ≥100 drivers + 3 repeat clients |
| Bemanning | Staffing/hourly deployment | — | Phase 9+; 24–36 months; capital required |

**Payment model:** On delivery of the shortlist — not on hire. This ensures cash flow and eliminates collection risk.

**Price comparison:**
- Agency recruitment: 63,000–126,000 SEK per hire (15–30% of annual salary)
- Chaffis directory: 4,995 SEK/year (no verification, no consent)
- Yrkesförarjobb job ad: 5,900 SEK/ad (impressions only, no screening)
- DriverNord Package 2: 15,000 SEK for 5 verified, available, consented drivers

---

## 6. Current Blockers

| Blocker | Severity | Effort | Who |
|---------|----------|--------|-----|
| Driver database empty | CRITICAL | 4–8 weeks campaign | Founder decision + AI planning |
| 46elks SMS not configured | CRITICAL | 30 minutes | Founder |
| hej@drivernord.se unconfirmed | CRITICAL | 10 minutes | Founder |
| Privacy policy not legally reviewed | CRITICAL (before sharing profiles) | Weeks (external) | Swedish GDPR lawyer |
| DPA template does not exist | CRITICAL (before sharing profiles) | Weeks (draft + review) | AI draft + lawyer review |
| Service agreement not legally reviewed | CRITICAL (before first invoice) | Days (draft ready; needs lawyer review) | AI draft exists; lawyer must review |
| Invoicing tool not configured | HIGH | Hours | Founder (Fortnox) |
| DriverNord AB not yet formed | NOT BLOCKING V1 | Months | Founder (scale decision) — enskild firma with F-skatt can invoice and sign agreements for V1 matchningstjänst |

---

## 7. Market Reality Findings (2026-05-14)

Confirmed from public data research:

| Finding | Confidence |
|---------|-----------|
| Model D (verified consented introduction at flat fee) does not exist in Sweden as a marketed product | STRONG INFERENCE |
| Chaffis.se: 4,995 SEK/year, no verification, no consent | VERIFIED |
| Yrkesförarjobb.se: 5,900 SEK/ad, impressions only | VERIFIED |
| Swedish agency recruitment: 15–30% of annual salary (63,000–126,000 SEK for CE driver) | VERIFIED |
| Förartjänst.se: rebuilding in 2026; 20,000+ drivers claimed; zero live functionality | VERIFIED |
| Simplex Bemanning: 389 MSEK revenue; pure staffing, not placement | VERIFIED |
| CE driver shortage in Sweden: ~5,000/year structural | VERIFIED |
| Bad hire cost in Sweden: ~700,000 SEK per incident | VERIFIED |
| DriverNord pricing (8,000–18,000 SEK) is competitive: below agency, above directory | STRONG INFERENCE |
| Five pilot-ready companies identified with documented CE driver needs | VERIFIED (public data) |

**Named pilot-ready companies (do not approach before drivers exist):** Canoil Sverige AB, Transportfirma Trabé, Edvardssons Last, JPC Entreprenad, Enskede Bilexpress.

---

## 8. Roadmap Priority Order

1. Configure 46elks SMS (30 min, founder)
2. Verify hej@drivernord.se inbox (10 min, founder)
3. Decide driver acquisition budget (founder decision)
4. AI drafts 30-day driver acquisition plan → founder reviews and launches
5. Legal review commissioned (privacy policy, DPA, service agreement)
6. Driver database reaches ≥5 available drivers → first Package 4 possible
7. Driver database reaches ≥15 available drivers → Package 2 available
8. First commercial transaction (Package 4 with a pilot company)
9. Operational improvements (rate limiting, failure logging, etc.)
10. Package 2 scale; then success fee; then subscription; then bemanning (much later)

---

## 9. AI-Driven Operating Constraints

### Things Claude Code should always do
- Maximize AI execution before requesting human action
- Use public data only for research
- Label all claims with confidence levels (VERIFIED FACT / STRONG INFERENCE / INFERRED / LEGAL REVIEW REQUIRED)
- Treat all legal document drafts as for-lawyer-review-only
- Default to `suggest` mode for any agent contact decisions

### Things Claude Code must never do
- Deploy to production without explicit founder authorization
- Run against production Supabase (any URL containing `supabase.co`)
- Run `B2B_IMPORT_CONFIRM=true` unless SUPABASE_URL contains `127.0.0.1`
- Send emails, SMS, or make phone calls
- Contact companies or drivers on behalf of DriverNord
- Present legal drafts as final
- Remove "Preliminär version" banners without lawyer confirmation
- Recommend cold outreach as immediate next step
- Recommend bemanning as current next step
- Redesign DriverNord as a manual recruitment agency

---

## 10. Next Best Task for Claude Code

**Draft the 30-day driver acquisition plan.**

File: `docs/business/driver-acquisition-plan.md`

This is the single highest-priority AI task because:
1. The driver database is the primary commercial blocker
2. The acquisition plan can be executed by AI entirely (channel analysis, targeting specs, ad copy variants, consent language, expected conversion rates based on market data)
3. It enables the founder to take immediate action once 46elks is configured
4. Every other commercial action depends on drivers existing in the database

Secondary tasks in parallel:
- Draft DPA template v1: `docs/business/legal/dpa-template-v1.md`
- Draft service agreement template v1: `docs/business/legal/service-agreement-v1.md`

---

## 11. Documentation Map

**Canonical domain:** `drivernord.se`. All docs, app pages, and email addresses use `.se`.
**Canonical migration directory:** `/supabase/migrations/` — never run from `/migrations/`.

### Session-start reading (always current)

| File | Content | Last updated |
|------|---------|--------------|
| `docs/current/driverNord-canonical-context.md` | This file — project identity, blockers, rules | 2026-05-16 |
| `docs/current/project-state.md` | Technical + commercial status | 2026-05-14 |
| `docs/current/database-schema.md` | Full schema, migrations 001–013 | 2026-05-16 |
| `docs/current/agent-system.md` | 5 built agents + pointer to agentic OS | 2026-05-16 |
| `docs/current/claude-code-operating-rules.md` | What Claude Code must/must not do | 2026-05-14 |
| `docs/current/architecture-context.md` | Stack, data flow, human gates | 2026-05-14 |
| `docs/current/security-state.md` | Risk register + GDPR assessment | 2026-05-14 |
| `docs/current/website-state.md` | Public page inventory | 2026-05-14 |

### Agentic system (active design, not yet implemented)

| Folder | Content |
|--------|---------|
| `docs/business/agents/agentic-operating-system/` | 8-agent architecture, roadmap, state management, approval gates (7 files) |
| `docs/business/agents/creative-acquisition-agent/` | Complete Creative Agent spec — next to build (9 files) |

### Current audit (2026-05-16)

| Folder | Content |
|--------|---------|
| `docs/business/project-audit/end-to-end-structure-audit/` | 12-file end-to-end audit; `executive-summary.md` is the entry point |

### Business strategy (stable reference)

| Location | Content |
|----------|---------|
| `docs/business/monetization-strategy/` | Monetization strategy, pricing, market reality research (16 files) |
| `docs/business/market-entry-research/` | Market research corpus, company opportunity database |
| `docs/business/legal/` | Legal templates for lawyer review (DPA, service agreement, consent text, privacy policy) |
| `docs/business/legal-public-validation/` | GDPR and Swedish law analysis (8 files) |
| `docs/business/meta-acquisition-integration/` | Meta/Facebook integration plan, Pixel/CAPI architecture (10 files) |
| `docs/business/b2b-target-company-top-10-notes.md` | 5 pilot-ready companies (do not approach before drivers exist) |
| `docs/business/ACQUISITION-INDEX.md` | Navigation guide for the 5 driver acquisition content locations |
| `docs/business/google-drive-operational-guide.md` | Drive hierarchy, naming rules, GitHub↔Drive split, migration checklist, workflows |

### Superseded (historical only)

| Location | Why superseded |
|----------|---------------|
| `docs/audits/project-audit-v2.md` | 2026-05-06 — see end-to-end-structure-audit/ |
| `docs/audits/project-audit-v3.md` | 2026-05-10 — see end-to-end-structure-audit/ |
| `docs/business/project-audit/driverNord-full-project-audit.md` | 2026-05-14 — see end-to-end-structure-audit/ |
| `docs/archive/` | Archived material: bemanning model, pre-meta readiness, 5x5 simulation |

---

## 12. Strict No-Go Rules (Summary)

| Rule | Why |
|------|-----|
| No production Supabase | Irreversible data damage risk |
| No B2B_IMPORT_CONFIRM=true unless local | Prevents production data pollution |
| No outreach before drivers exist | No product = no credibility = lost opportunity |
| No bemanning now | Capital, legal, operational infrastructure missing |
| No success fee as first product | No collection mechanism; no legal structure |
| No subscription before 100 drivers | Cannot fulfill delivery promise with thin database |
| No legal finalization without lawyer | Legal exposure risk |
| No cold outreach as immediate recommendation | Sequence matters: supply before demand |
