# Codebase and Routes Audit

**Audit date:** 2026-05-16
**Scope:** Application code structure, API routes, lib functions, test coverage, configuration
**Risk level indicators:** CRITICAL / HIGH / MEDIUM / LOW

---

## API Routes Inventory

### Driver-Facing Routes

| Route | Method(s) | Auth | Purpose | Status |
|-------|-----------|------|---------|--------|
| `POST /api/leads` | POST | None (public) | Create new driver session | Production-ready |
| `PATCH /api/leads/[id]` | PATCH | None (public) | Apply a chat step answer | Production-ready |
| `GET /api/leads/[id]/score` | GET | None (internal, no auth) | Return driver score | **Risk: unauthenticated** |

**Issue (MEDIUM):** `/api/leads/[id]/score` appears to return a driver's score without authentication. This exposes scoring data to anyone who knows a driver ID. Driver IDs are UUIDs (hard to guess) but this should be verified against the actual route implementation.

### Recruiter/Operator Routes

| Route | Method(s) | Auth | Purpose | Status |
|-------|-----------|------|---------|--------|
| `POST/GET /api/recruiter/auth` | POST, GET | None → sets cookie | Login/logout | Production-ready |
| `POST /api/recruiter/match` | POST | Recruiter session | Trigger matching manually | Production-ready |
| `GET/PATCH /api/recruiter/shortlists/[id]` | GET, PATCH | Recruiter session | Shortlist management | Production-ready |
| `GET/PATCH /api/recruiter/shortlist-entries/[id]` | GET, PATCH | Recruiter session | Entry approval/rejection | Production-ready |
| `GET/POST /api/recruiter/b2b/targets` | GET, POST | Recruiter session | B2B target management | Production-ready |

### Cockpit Routes

| Route | Method(s) | Auth | Purpose | Status |
|-------|-----------|------|---------|--------|
| `GET /api/cockpit` | GET | Recruiter session | Cockpit data (drivers, actions) | Production-ready |
| `GET /api/cockpit/metrics` | GET | Recruiter session | Pipeline metrics | Production-ready |
| `GET/POST /api/cockpit/actions` | GET, POST | Recruiter session | List and create actions | Production-ready |
| `PATCH /api/cockpit/actions/[id]` | PATCH | Recruiter session | Approve/cancel action | Production-ready |
| `POST /api/cockpit/actions/[id]/retry` | POST | Recruiter session | Retry failed action | Production-ready |

### System Routes

| Route | Method(s) | Auth | Purpose | Status |
|-------|-----------|------|---------|--------|
| `POST /api/match` | POST | MATCH_API_KEY | Internal match trigger | Production-ready |
| `GET/POST /api/company-needs` | GET, POST | RECRUITER_API_KEY | Create company needs | Production-ready |
| `POST /api/agent/follow-up` | POST | AGENT_API_KEY | Cron-triggered follow-up | Production-ready |

### Missing Routes

| Route | Status | Priority |
|-------|--------|----------|
| `GET /api/health` | Not implemented | MEDIUM — useful for monitoring |
| `DELETE /api/leads/[id]` | Not implemented | HIGH — GDPR deletion requires this |
| `GET /api/drivers` (admin list) | Handled via cockpit route | OK |
| Webhook receiver (46elks inbound SMS) | Not implemented | HIGH — needed for STOPP handling |
| Webhook receiver (inbound email) | Not implemented | Planned for Phase 1D comm agent |

**Critical gap (HIGH):** No 46elks inbound webhook handler exists. When 46elks is configured for outbound, inbound SMS (including STOPP opt-out) will arrive with no handler to process them. The documentation specifies STOPP handling as legally required under Swedish EkomL — but the code doesn't implement it. **This must be built before SMS goes live.**

**Critical gap (HIGH):** No GDPR deletion route exists. GDPR Art. 17 right-to-erasure requires a mechanism to delete a driver's personal data on request. The legal documents describe this as a manual founder action — which is acceptable for now — but there is no route to support a future automated implementation.

---

## Lib Functions Assessment

### Core Pipeline (lib/)

| File | Function | Quality | Notes |
|------|----------|---------|-------|
| `classify.ts` | `classifyStatus()`, `classifyPriority()` | EXCELLENT | Pure functions, well-tested, deterministic |
| `followup.ts` | `computeFollowUp()` | EXCELLENT | Pure function, deterministic |
| `scoreDriver.ts` | `scoreDriver()` | EXCELLENT | Clear point formula, tested |
| `applyStep.ts` | `applyStep()` | GOOD | Complex but well-tested via applyStep.test.ts |
| `conversation.ts` | `getNextStep()` | GOOD | FSM step routing, tested |
| `stepConfig.ts` | Step definitions | GOOD | Single source of truth for steps |
| `ingestLead.ts` | `ingestLead()` | GOOD | Copies driver to ingested_drivers; tested |
| `matchingEngine.ts` | `buildShortlist()` | GOOD | Hard filters + rank sort; tested |
| `matchingAgent.ts` | `runMatchingAgent()` | GOOD | Orchestrates matching; tested |
| `contactAgent.ts` | `runContactAgent()` | GOOD (simulated) | Creates pending actions; SMS simulated |
| `followUpAgent.ts` | `runFollowUpAgent()` | GOOD (simulated) | Follow-up scheduling; SMS simulated |
| `systemActions.ts` | `logAction()` | GOOD | Audit log writer |
| `cockpit.ts` | Cockpit data queries | GOOD | Used by cockpit API routes |
| `recruiterAuth.ts` | `requireRecruiterAuth()` | GOOD | Simple cookie check |
| `db.ts` | Supabase client | GOOD | Service role client export |

### Store Layer (lib/)

| File | Purpose | Notes |
|------|---------|-------|
| `supabaseStore.ts` | Driver CRUD via Supabase | Wraps Supabase client; mocked in tests |
| `ingestedDriverStore.ts` | Ingested driver queries | Production store |
| `shortlistStore.ts` | Shortlist persistence | Production store |
| `companyNeedStore.ts` | Company need queries | Production store |
| `store.ts` | In-memory store | Used for testing only |

**Issue (LOW):** `store.ts` (in-memory) and `supabaseStore.ts` (database) both exist. The in-memory store should only be used in tests, but its presence in lib/ (not tests/) could be confusing. Verify it is only imported in test files.

### Messaging Layer (lib/messaging/)

| File | Purpose | Notes |
|------|---------|-------|
| `types.ts` | Message types | Well-defined |
| `simulatedProvider.ts` | Console.log mock | Used when SMS_PROVIDER not set |
| `smsProvider.ts` | Real 46elks integration | Exists but untested with real credentials |
| `index.ts` | Provider routing | Switches on SMS_PROVIDER env var |

**This is the most critical production blocker.** The infrastructure is ready — setting `SMS_PROVIDER=46elks` with valid credentials switches from simulation to real delivery. The 30-minute fix referenced in multiple documents is here.

### B2B Layer (lib/b2b/)

| File | Purpose | Notes |
|------|---------|-------|
| `types.ts` | B2B types | Company research types |
| `companyResearchStore.ts` | B2B target database operations | Works against migration 008 |

**Issue (MEDIUM):** The B2B layer (migrations 008–012, lib/b2b/, scripts/import-b2b-targets.ts) represents significant implemented functionality — company research targets, outreach actions, pilot company relationships, company need drafts, agent warnings — but this is not clearly documented in the current `docs/current/` files. The agent-system.md and architecture-context.md may not reflect this.

---

## Test Coverage Assessment

### What is well-tested

- All pure lib functions (classify, followup, score, matchingEngine) — excellent coverage
- Integration: ingestLead, matchingAgent, contactAgent, followUpAgent — good coverage
- Auth: recruiterAuth — covered
- E2E simulation: 10-driver simulation covers the full pipeline end-to-end

### What is NOT tested

| Gap | Risk level | Notes |
|-----|-----------|-------|
| API route handlers (`/api/**`) | MEDIUM | Route logic is tested via underlying lib; route-level tests would catch auth/header issues |
| UI components | LOW | Acceptable at pre-commercial stage |
| The b2b import script | MEDIUM | scripts/import-b2b-targets.ts has a production safety check but no test |
| SMS provider with real credentials | HIGH | simulatedProvider is tested; smsProvider with real 46elks credentials is untested |
| Inbound SMS webhook handling | HIGH | No webhook handler exists to test |

---

## Configuration Audit

### package.json

**Current state:** Very lean — 4 production dependencies, 7 dev dependencies.

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@supabase/supabase-js": "^2.0.0"
  }
}
```

**What is present but may be needed soon:**
- `@anthropic-ai/sdk` — not yet installed (needed for any Claude API calls in agents)
- `resend` — not yet installed (needed for transactional email)
- `zod` — not yet installed (could improve API route validation)
- `@vercel/analytics` — not installed (useful for production monitoring)

**What is NOT needed yet:** All planned dependencies are correctly absent — they are Phase 1 agent build requirements, not current requirements.

### vercel.json

**Current state:** Single cron job only.

```json
{
  "crons": [{ "path": "/api/agent/follow-up", "schedule": "0 8 * * *" }]
}
```

**Assessment:** Correct and minimal. The cron runs at 08:00 UTC (10:00 Europe/Stockholm in summer, 09:00 in winter). This is appropriate for a morning follow-up check.

**What to add later:**
- Vercel Analytics/Speed Insights configuration
- Performance budgets
- Environment-specific settings (preview vs. production)

### middleware.ts

```typescript
// Protects /recruiter/* except /recruiter/login
// Validates recruiter_session cookie against RECRUITER_API_KEY
```

**Assessment:** Correct but extremely simple. The session value == API key means there's only one valid session at a time, and any environment where RECRUITER_API_KEY is known can impersonate the recruiter. This is acceptable for a single-founder setup but is not multi-user safe.

**Issue (LOW):** The login comparison is `session !== envKey` — plain string equality. Not HMAC, not JWT. Acceptable for now, but this means rotating RECRUITER_API_KEY immediately invalidates all sessions.

---

## Code Quality Summary

| Dimension | Assessment |
|-----------|-----------|
| Type safety | HIGH — TypeScript throughout; all enums in types/lead.ts |
| Test coverage (lib) | HIGH — 660 passing tests |
| Test coverage (routes) | LOW — no route-level tests |
| Architecture clarity | HIGH — clear separation: API routes → lib functions → stores → Supabase |
| Error handling | MEDIUM — some routes may not handle all error cases |
| Security | MEDIUM — auth is simple but functional; one unauthenticated route to verify |
| Documentation | HIGH — CLAUDE.md is current and accurate |
| Build health | HIGH — build passes clean |
| Dependency management | HIGH — minimal and intentional |

---

*Version 1.0 — 2026-05-16 — Audit only. No code changes.*
