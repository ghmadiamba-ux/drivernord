# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Full flow: `lang → region → (relocate) → license → ykb → driver_card → domain → availability → shift_preference → phone → email → name → confirmation`

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
