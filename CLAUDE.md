# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## DriverNord Doctrine Summary

Read this before any task. Older documents may contradict it — this section governs.

**DriverNord is a logistics capacity network, not a driver-leads-only business.**

- Three commercial paths: Matchning/Kortlist · Rekrytering/Introduktion · Bemanning/Logistikpersonal
- **Bemanning is a legitimate planned commercial offer.** The system must prepare for it. The founder handles legal/operational prerequisites (Kollektivavtal, Fora, payroll) before the first live staffed mission.
- **Worker scope covers all logistics workers**, not only CE/C/D drivers: lagerpersonal, truckförare, terminalpersonal, orderplock, lastning/lossning, distribution drivers, fjärr, schakt/bygg, kyl/frys, ADR/tank.
- **Staffing/bemanning companies are NOT normal client prospects.** They are market signal sources and belong in `agency_posting_signals` with `draft_status = hold_agency`. This is enforced in code — do not route agency drafts through the normal client pipeline.
- **Distribution must run in parallel with product.** Every technical task should connect to supply, trust, distribution, commercial trigger, monetization, or simplification.
- **Facebook/Meta organic posting is required**, not optional. Logistikklubb content must expand to all logistics worker categories.
- **Every market scan must produce** at least one of: business action, supply gap signal, prospecting target, community/content signal, or staffing/partner intelligence signal.
- **The founder has ~20 employees of prior experience** in Sweden. Do not over-index on basic employer/legal warnings in documentation.
- **Strategy is adaptive.** Older roadmap items that say "not in target market" or "Phase 9+" for bemanning/warehouse are superseded. See `docs/business/strategy/current-driverNord-doctrine.md`.

**Operative doctrine documents (in priority order):**
1. `docs/business/strategy/current-driverNord-doctrine.md` — governing doctrine
2. `docs/business/strategy/commercial-offer-model.md` — three commercial paths
3. `docs/business/distribution/distribution-doctrine.md` — distribution rules
4. `docs/business/logistikbemanning/scope-and-transition-plan.md` — worker scope + bemanning transition

**Safety constraints (always apply regardless of doctrine):**
- No outreach (email/SMS/WhatsApp) without explicit founder approval
- No production database changes without explicit founder authorization
- No secrets exposed
- AGENT_CONTACT_MODE must not be changed automatically

## Commands

```bash
npm run dev          # local dev server (Next.js)
npm run build        # production build
npm test             # run all tests (vitest)
npm run test:watch   # vitest watch mode
npx vitest run tests/classify.test.ts  # run a single test file
```

## Architecture

This is a **Next.js 14 App Router** project. The working directory is `agent-1/`.

### Lead acquisition pipeline

```
Driver fills chat → POST /api/leads → PATCH /api/leads/{id} (per step)
  → applyStep() [validate + classify + computeFollowUp]
  → on ready_for_ingestion: ingestLead() → triggerMatchingForAllNeeds() [fire-and-forget]
    → matchingAgent → buildShortlist() → contactAgent [fire-and-forget]
```

- `hooks/useChat.ts` — client state machine; calls POST then PATCH per step; fire-and-forget on confirmation
- `lib/applyStep.ts` — validates answers, updates lead fields, re-runs classify + followup, returns next_step
- `lib/classify.ts` — pure function: LeadStatus + LeadPriority from license/ykb/availability/region
- `lib/followup.ts` — pure function: computes follow_up_at from ykb/availability state
- `lib/ingestLead.ts` — copies `drivers` row to `ingested_drivers`, marks lead ingested
- `lib/matchingAgent.ts` — fetches all active needs + drivers, calls buildShortlist(), persists, triggers contactAgent
- `lib/contactAgent.ts` — filters shortlist by score ≥ 60, dedup window 14d (3d emergency), logs action; **contact is SIMULATED** (console.log only, no SMS provider)
- `lib/followUpAgent.ts` — queries drivers with follow_up_at ≤ now AND follow_up_sent = false; **also SIMULATED**

### Step routing

Full flow: `lang → region → (relocate) → license → ykb → driver_card → domain → availability → shift_preference → phone → email → name → consent → confirmation`

- `region=stockholm` skips the `relocate` step
- `license=none` routes directly to `disqualified` (terminal)

Logic lives in `lib/conversation.ts` (`getNextStep`). Step definitions in `lib/stepConfig.ts`.

### Agent configuration (env vars)

| Var | Default | Values |
|-----|---------|--------|
| `AGENT_CONTACT_MODE` | suggest | suggest / auto / hybrid |
| `AGENT_CONTACT_ENABLED` | — | true/false |
| `AUTO_CONTACT_THRESHOLD` | 85 | score threshold for auto mode |
| `AGENT_FOLLOWUP_MODE` | suggest | suggest / auto |
| `AGENT_FOLLOWUP_ENABLED` | — | true/false |

Score threshold for any contact: `CONTACT_MIN_SCORE = 60` (hard-coded in contactAgent).

### Auth

- `middleware.ts` — protects `/recruiter/*` routes; reads `recruiter_session` HTTP-only cookie
- `app/api/recruiter/auth/route.ts` — sets cookie on valid key (`RECRUITER_API_KEY` env var)
- API routes call `requireRecruiterAuth()` for protected endpoints

### Database (Supabase)

Tables: `drivers`, `ingested_drivers`, `company_needs`, `companies`, `shortlists`, `shortlist_entries`, `system_actions`

Client: `lib/db.ts` exports `supabase` (service role). All agent actions logged to `system_actions` via `logAction()` in `lib/systemActions.ts`.

### Public website

- `/chaufforer` — driver landing page (Server Component)
- `/company` — B2B landing page (Server Component)
- `/company/ai-agenter` — technical architecture detail page
- `/chat` — driver registration chat (Client Component, `'use client'`)
- `/recruiter` — protected recruiter cockpit
- `/about`, `/privacy`, `/terms`, `/cookies`, `/contact` — info/legal pages

Shared layout components: `components/PublicHeader.tsx` (`'use client'` for mobile nav), `components/LegalFooter.tsx`.

Homepage (`/`) redirects to `/chaufforer` via `next.config.js` redirects (generates proper HTTP `Location:` header — do not use `redirect()` in page.tsx for this, as static rendering produces a JS-only redirect).

### Path alias

`@/*` maps to the project root (`agent-1/`). Defined in `tsconfig.json`.

### Cron

`/api/agent/follow-up` runs daily at `0 8 * * *` via `vercel.json`. Calls `runFollowUpAgent()`.

### Tests

Only `lib/classify.ts` and `lib/followup.ts` have unit tests (they are pure functions). All other lib files interact with Supabase or external services and are not unit-tested.

### Domain types

All domain enums and types in `types/lead.ts`: `License`, `Ykb`, `Availability`, `Region`, `Relocate`, `LeadStatus`, `LeadPriority`, etc.
