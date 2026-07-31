# DriverNord — Full Project Structure Audit

**Audit date:** 2026-05-16
**Auditor:** Claude Sonnet 4.6
**Scope:** Complete structural inventory and health assessment across all project areas
**Prior audits:** project-audit-v2.md (2026-05-06), project-audit-v3.md (2026-05-10), driverNord-full-project-audit.md (2026-05-14)
**Constraint:** Read-only audit. No code changes. No deployment. No production Supabase contact.

---

## Audit Verdict

**Technical infrastructure: STRONG.** The core driver pipeline is architecturally complete, tested, and deterministic. 660/660 tests pass. The build is clean.

**Operational readiness: NOT READY.** The pipeline cannot send real communications. The database is empty. Migration 013 has not been applied to production. Legal documents are unreviewed.

**Documentation: INCONSISTENT.** 160+ files across 30+ folders. Multiple versions of overlapping content. Domain name inconsistency (`.com` vs `.se`) persists in older files. The doc system has grown faster than it has been curated.

**Agent system: SPECIFIED, NOT BUILT.** All agent architecture documents are complete and high quality. Zero agent code has been written. The agentic OS is a design document, not an operating system.

---

## Component Inventory

### 1. Application Code

| Area | Files | Status | Notes |
|------|-------|--------|-------|
| App pages | 12 pages | Production-ready | /chat, /recruiter, /chaufforer, /company, /company/ai-agenter, /about, /privacy, /terms, /cookies, /contact, /recruiter/login |
| App layouts | 3 layouts | Production-ready | root, company, ai-agenter |
| API routes | 14 routes | Production-ready (simulated send) | leads, cockpit, match, company-needs, auth, score, follow-up, b2b targets, shortlists |
| Middleware | 1 file | Production-ready | Cookie-based recruiter auth |
| Lib core | 25 files | Production-ready | Full pipeline implemented |
| Lib messaging | 4 files | Infrastructure ready; SMS simulated | smsProvider, simulatedProvider, index, types |
| Lib company | 3 files | Production-ready | company content, types, translations |
| Lib b2b | 2 files | Present but incompletely documented | companyResearchStore, types |
| Components | 30 files | Production-ready | Chat UI, public layout, company sections |
| Types | 1 file | Production-ready | types/lead.ts — all domain enums |
| Hooks | 1 file | Production-ready | useChat.ts |

### 2. Database

| Area | Count | Status | Notes |
|------|-------|--------|-------|
| Migrations (canonical) | 13 | 001–012 committed and presumably in production; 013 written but NOT applied to production | Two copies: /migrations/ and /supabase/migrations/ |
| Tables (after all 13 migrations) | ~12 tables | Designed; production state of 008–013 tables unknown | See database audit |
| Supabase config | 1 toml | Present | Local dev config |

### 3. Tests

| File | Tests | Status |
|------|-------|--------|
| classify.test.ts | Present | Pass |
| followup.test.ts | Present | Pass |
| store.test.ts | Present | Pass |
| scoreDriver.test.ts | Present | Pass |
| driverProfile.test.ts | Present | Pass |
| ingestedDriver.test.ts | Present | Pass |
| scoringPipeline.test.ts | Present | Pass |
| matchScore.test.ts | Present | Pass |
| matchingEngine.test.ts | Present | Pass |
| companyNeed.test.ts | Present | Pass |
| ingestLead.test.ts | Present | Pass |
| contactWorkflow.test.ts | Present | Pass |
| systemActions.test.ts | Present | Pass |
| matchingAgent.test.ts | Present | Pass |
| followUpAgent.test.ts | Present | Pass |
| contactAgent.test.ts | Present | Pass |
| recruiterAuth.test.ts | Present | Pass |
| messaging.test.ts | Present | Pass |
| cockpitApproval.test.ts | Present | Pass |
| b2bTargetRegistry.test.ts | Present | Pass |
| conversation.test.ts | Present | Pass |
| applyStep.test.ts | Present | Pass |
| e2e-10-driver-simulation.test.ts | 82 tests | Pass |
| **Total** | **660/660** | **All passing** |

**Coverage gap:** No tests for API route handlers, UI components, or the cockpit page. API routes and pages are untested at the route level — only the underlying lib functions are tested. This is acceptable for a pre-commercial project but should be noted.

### 4. Configuration

| File | Status | Notes |
|------|--------|-------|
| package.json | Minimal, correct | Only 4 production deps: next, react, react-dom, supabase-js |
| vercel.json | Minimal | Only cron job for follow-up at 08:00 UTC |
| tsconfig.json | Present | @ alias configured |
| tailwind.config.ts | Present | Standard config |
| next.config.js | Present | Homepage redirect to /chaufforer |
| middleware.ts | Production-ready | Protects /recruiter/* routes |
| .gitignore | Present | Should exclude .env.local files |

**Risk:** 4 `.env.local*` files exist (`.env.local`, `.env.local.example`, `.env.local.prod-backup`, `.env.local.supabase-local`). The `.env.local.prod-backup` name suggests it may contain real production credentials. This is a **HIGH** security risk if not in .gitignore. See security audit.

### 5. Scripts

| File | Purpose | Status |
|------|---------|--------|
| scripts/e2e-backend-check.mts | Backend health check | Development utility |
| scripts/simulate-e2e.js | E2E pipeline simulation | Development utility |
| scripts/simulate-full-pipeline.mts | Full pipeline simulation | Development utility |
| scripts/simulate-full-pipeline.ts | Full pipeline simulation (TS version) | Redundant with .mts version |
| scripts/import-b2b-targets.ts | B2B target import from CSV | Has production safety check |
| scripts/sim-results.json | Simulation output | Generated artifact |
| scripts/sim-full-pipeline-results.json | Full simulation output | Generated artifact |

**Issue:** Two versions of simulate-full-pipeline (.mts and .ts) exist. One should be removed. The .json result files should be in .gitignore.

### 6. Documentation

**Total document count: 160+ files across 30+ folders**

| Category | Folder | Files | Quality |
|----------|--------|-------|---------|
| Current state | docs/current/ | 10 | HIGH — authoritative, recently updated |
| Agentic OS | docs/business/agents/agentic-operating-system/ | 8 | HIGH — comprehensive, internally consistent |
| Creative Agent | docs/business/agents/creative-acquisition-agent/ | 9 | HIGH — complete specification |
| Meta integration | docs/business/meta-acquisition-integration/ | 10 | HIGH — v1.1, updated with domain decision |
| Legal | docs/business/legal/ | 6 | MEDIUM — unreviewed drafts |
| Legal validation | docs/business/legal-public-validation/ | 8 | HIGH — rigorous analysis |
| Market research | docs/business/market-entry-research/ | 50+ | HIGH — comprehensive |
| Monetization | docs/business/monetization-strategy/ | 16 | HIGH — confirmed and audited |
| B2B | docs/business/b2b-* | 10 | MEDIUM — partially outdated |
| Driver acquisition (old) | docs/business/driver-acquisition-execution-kit/ | 7 | LOW — superseded by new agent docs |
| Driver acquisition (new) | docs/business/driver-acquisition-technical-readiness/ | 4 | HIGH |
| Driver acquisition (pre-meta) | docs/business/driver-acquisition-pre-meta-technical-readiness/ | 8 | HIGH |
| Previous audits | docs/audits/ + docs/business/project-audit/ | 8 | MEDIUM — partially outdated |
| Root docs | docs/ | 4 | LOW — some outdated |

### 7. Public Assets

| File | Status | Notes |
|------|--------|-------|
| public/images/driver-hero.jpg | Present | Driver landing page hero |
| public/images/company-hero.jpg | Present | Company landing page hero |
| public/images/company-trust.jpg | Present | Company trust section |
| public/images/about-portrait.jpg | Present | About page |
| public/images/README.md | Present | Image documentation |

**Issue:** No favicon configured. No og:image for root `/` page (only /chaufforer and /company have opengraph-image.tsx). Missing for /recruiter (internal, acceptable) but missing for root is a SEO gap.

---

## Cross-Cutting Issues

### Issue 1: Duplicate migration directories (MEDIUM)

Both `/migrations/` and `/supabase/migrations/` contain identical content. The canonical location for Supabase migrations should be `/supabase/migrations/`. The `/migrations/` folder may be legacy. **One should be designated canonical and the other removed.**

### Issue 2: Domain inconsistency (MEDIUM)

Older documents (project-state.md, some legal docs) reference `drivernord.com` and `hej@drivernord.com`. The canonical domain decision (2026-05-14) established `drivernord.se` as primary. Several older documents have not been updated.

**Email address inconsistency found:**
- `project-state.md`: `hej@drivernord.com`
- Meta docs (v1.1): `hej@drivernord.se`
- The correct address per domain decision: `hej@drivernord.se`

### Issue 3: TASK_COMPLETED_READY_TO_SHUTDOWN.txt (LOW)

A file named `TASK_COMPLETED_READY_TO_SHUTDOWN.txt` exists in the master-opportunity-database folder. This is an artifact from an AI session and should be deleted. It adds noise to the documentation structure.

### Issue 4: `.env.local.prod-backup` security risk (HIGH)

A file named `.env.local.prod-backup` exists at the project root. If this contains real production credentials (`SUPABASE_URL` with `supabase.co`, real API keys), it is a security risk in the repository. Verify it is in `.gitignore` before any git operations.

### Issue 5: Driver acquisition doc duplication (MEDIUM)

The older `docs/business/driver-acquisition-execution-kit/` (7 files: meta-ads-copy-bank, facebook-groups-posts, driver-sms-sequences, platsbanken-posting-draft, etc.) overlaps significantly with the new `docs/business/agents/creative-acquisition-agent/` spec (9 files). The old folder is not superseded — it contains operational copy that the new spec points to as examples — but the relationship is unclear.

### Issue 6: Simulated SMS is the production blocker (CRITICAL)

All SMS and communication is simulated (`console.log` only). This is a single environment variable configuration away from being resolved. It is the most important technical blocker with the lowest technical effort to fix.

---

## Risk Register

| Risk | Severity | Area | Status |
|------|----------|------|--------|
| SMS not configured — pipeline cannot reach real drivers | CRITICAL | Operations | Open |
| Migration 013 not in production — consent + UTM columns missing | CRITICAL | Database | Open |
| Driver database empty — product has no supply | CRITICAL | Business | Open |
| `.env.local.prod-backup` may contain real credentials | HIGH | Security | Unverified |
| Legal documents unreviewed — cannot share driver profiles | HIGH | Legal | Open |
| `hej@drivernord.com` vs `.se` inconsistency | MEDIUM | Brand | Open |
| Duplicate migration directories | MEDIUM | Code | Open |
| Old driver acquisition docs not clearly archived | MEDIUM | Docs | Open |
| No favicon configured | LOW | UX/SEO | Open |
| Script artifacts (.json results) in repository | LOW | Code | Open |

---

*Version 1.0 — 2026-05-16 — Audit only. No code changes. No live connections.*
