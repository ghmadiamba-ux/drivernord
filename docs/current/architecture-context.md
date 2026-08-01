# DriverNord — Architecture Context

*Last updated: 2026-05-14 (synchronized with project audit and monetization strategy)*

---

## AI-Driven Operating Principle

DriverNord is designed as an AI-first infrastructure. Every workflow follows this model:

**AI executes and prepares → human validates and authorizes → system executes and logs → AI monitors.**

The architecture reflects this: agents run autonomously, humans observe via the cockpit, and every action is logged to `system_actions` for audit and approval. The default mode (`suggest`) ensures humans approve high-stakes actions before they execute. `auto` mode is reserved for when the pipeline has a validated track record.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Database | Supabase (PostgreSQL) — LOCAL ONLY for development |
| Hosting | Vercel |
| Tests | Vitest 1 |
| SMS | 46elks (configured via SMS_PROVIDER env var — currently simulated) |

---

## Project Layout

```
DriverNord/                  # project root (C:\PROJECT\DriverNord)
├── app/                     # Next.js App Router pages and API routes
│   ├── page.tsx             # Root → redirects to /chaufforer
│   ├── layout.tsx           # Root layout (font, viewport meta, metadataBase)
│   ├── chat/                # Driver registration flow (Client Component)
│   ├── chaufforer/          # Driver landing page (Server Component)
│   ├── company/             # B2B landing page (Server Component)
│   │   └── ai-agenter/      # Technical architecture detail page
│   ├── about/               # About page
│   ├── privacy/             # GDPR privacy policy (PRELIMINARY — not legally reviewed)
│   ├── terms/               # Terms of service (PRELIMINARY — not legally reviewed)
│   ├── cookies/             # Cookie policy (PRELIMINARY — not legally reviewed)
│   ├── contact/             # Contact page
│   ├── recruiter/           # Operator cockpit (Client Component, cookie-protected)
│   │   └── login/           # Recruiter login
│   └── api/                 # API routes (all server-side)
│       ├── leads/           # Driver intake (POST) + step PATCH
│       ├── company-needs/   # Company need management (recruiter-auth)
│       ├── match/           # Internal match trigger (MATCH_API_KEY)
│       ├── recruiter/       # Recruiter-specific routes (auth, match, shortlists)
│       ├── cockpit/         # Cockpit data + action approval (cookie-auth)
│       └── agent/           # Cron-triggered agent routes
├── lib/                     # Business logic (pure + DB-coupled)
│   ├── messaging/           # SMS provider abstraction (46elks implemented, simulated by default)
│   ├── matchingEngine.ts    # buildShortlist() — core product delivery function
│   ├── matchingAgent.ts     # runMatchingAgent() — orchestrates matching
│   ├── contactAgent.ts      # runContactAgent() — driver contact (simulated)
│   ├── followUpAgent.ts     # runFollowUpAgent() — scheduled follow-up (simulated)
│   ├── classify.ts          # Pure: LeadStatus + LeadPriority from driver attributes
│   └── followup.ts          # Pure: follow_up_at from ykb/availability state
├── components/              # Shared UI (PublicHeader, LegalFooter)
├── hooks/                   # React hooks (useChat)
├── types/                   # Domain types (lead.ts)
├── tests/                   # Vitest test files (556/556 passing)
├── migrations/              # 001–007 idempotent SQL migrations
├── middleware.ts             # Edge middleware — /recruiter/* cookie check
├── next.config.js            # Redirects, Next.js config
└── vercel.json              # Cron schedule (follow-up: 0 8 * * *)
```

---

## Core Data Flow

### Driver path (end-to-end)

```
Browser → /chat (Client Component, useChat hook)
  │
  ├── POST /api/leads { lang }
  │     → creates drivers row (anonymous_dropoff)
  │     → returns { id, next_step, lead_status }
  │
  ├── PATCH /api/leads/{id} × N (one per step)
  │     → applyStep(lead, step, answer)
  │         → validates answer
  │         → updates lead fields
  │         → classifyStatus() → classifyPriority()
  │         → computeFollowUp() → follow_up_at
  │     → updateLead(lead)
  │     → if lead_status === ready_for_ingestion:
  │           → ingestLead(id) → ingested_drivers row + scoreDriver()
  │           → [fire-and-forget] triggerMatchingForAllNeeds()
  │                 → logAction(driver_ingested)
  │                 → for each open need: runMatchingAgent(needId)
  │     → returns { id, next_step, lead_status, lead_priority }
  │
  └── Confirmation screen shown based on lead_priority
```

### Commercial matching chain (Package 2 / Package 4 delivery)

```
Company need entered by recruiter (POST /api/company-needs)
  │
  └── runMatchingAgent({ needId, triggeredBy })
        │
        ├── getOpenCompanyNeeds() → find need by needId
        ├── getActiveIngestedDrivers() → full driver pool
        ├── buildShortlist(drivers, need, limit=5)
        │     → hard filters: license coverage, ykb not null/unknown, driver_card not no/unknown
        │     → matchScore(driver, need) for each eligible driver
        │     → sort descending, take top 5
        ├── createShortlist(needId, result) → shortlists + shortlist_entries rows
        ├── logAction(match_run, completed)
        ├── logAction(shortlist_created, completed)
        └── [fire-and-forget] runContactAgent({ shortlistId })
              │
              ├── fetchCompanyContext(shortlistId)
              ├── fetch shortlist_entries
              ├── batch-fetch ingested_drivers ykb + availability (live DB state)
              └── for each entry (guards applied):
                    → mode=suggest: logAction(contact_suggested, pending)
                    → mode=auto: SIMULATED SEND (until SMS_PROVIDER configured)

Human gate: Recruiter reviews shortlist in cockpit before delivery to client company
  → If shortlist quality approved: founder delivers shortlist to client (Package 2)
  → If individual driver approved: cockpit approval sends SMS to driver (contact_confirmed)
```

### Human approval chain

```
Recruiter sees pending action in /recruiter cockpit (15s poll)
  │
  ├── PATCH /api/cockpit/actions/{id} { action: 'approve' }
  │     → executeApproval()
  │         → contact_suggested: updateShortlistEntry(contacted) + logAction(contact_confirmed)
  │           + calls getMessagingProvider().sendMessage() → real SMS (when configured)
  │         → follow_up_triggered: set follow_up_sent=true + logAction(follow_up_confirmed)
  │
  └── PATCH /api/cockpit/actions/{id} { action: 'cancel' }
        → set status=cancelled + logAction(override_cancelled)
```

---

## Human-in-the-Loop Gates

The following decisions require explicit human action — AI prepares but does not execute:

| Gate | AI prepares | Human action |
|------|-----------|-------------|
| Driver shortlist quality | buildShortlist() generates ranked shortlist | Recruiter reviews in cockpit before delivery to client |
| Contact approval (suggest mode) | Agent builds message, logs pending action | Recruiter approves or cancels in cockpit |
| Company need creation | Company need schema validated | Recruiter POSTs to API with human-vetted company data |
| Commercial shortlist delivery to client | Shortlist built and reviewed | Founder delivers to client (no automated B2B delivery yet) |
| Invoice issuance | AI can prepare invoice draft | Founder issues via Fortnox |
| Production deployment | Not applicable | Founder approval required; NEVER by Claude Code |
| SMS provider configuration | Documentation prepared | Founder sets env vars |

---

## Authentication Model

### Driver routes (public by design)
- `POST /api/leads` — no auth (anonymous driver intake — reducing friction is intentional)
- `PATCH /api/leads/[id]` — no auth (step progression)
- `GET /api/leads/[id]` — **recruiter-auth required** (PII)
- `GET/POST /api/leads/[id]/score` — **recruiter-auth required** (PII + score)

### Recruiter routes (cookie-protected)
- Middleware (`middleware.ts`) checks `recruiter_session` cookie for all `/recruiter/*` paths
- Cookie set by `POST /api/recruiter/auth` on successful key entry
- All `/api/cockpit/*` and `/api/recruiter/*` routes call `requireRecruiterAuth(req)`

### Machine-to-machine routes
- `POST /api/match` — requires `x-api-key: MATCH_API_KEY`
- `POST /api/agent/follow-up` — requires `x-api-key: AGENT_API_KEY`

---

## Scoring Model

### Lead priority (classifyPriority — intake)

| Condition | Priority |
|-----------|----------|
| license=none | disqualified (null) |
| no phone | anonymous_dropoff (null) |
| outside Stockholm AND relocate=no | LOW |
| reachable AND ykb=valid AND available now/2_weeks | HIGH |
| everything else | MEDIUM |

"Reachable" = region=stockholm OR relocate=yes

### Driver score (scoreDriver — matching)

| Dimension | Max Points | Details |
|-----------|-----------|---------|
| License | 35 | CE+D=35, CE=33, C+D=31, C=28, D=18, none=0 |
| YKB | 25 | valid=25, in_progress=14, expired=7, none/unknown=0 |
| Availability | 20 | now=20, 2_weeks=14, 1_month=7, not_yet=2 |
| Location | 20 | stockholm=20, other_sweden+relocate=13, other_sweden=5, abroad+relocate=7, abroad=1 |

Contact guard: `CONTACT_MIN_SCORE = 60` — entries below this score are skipped silently.

---

## Step Routing Logic

Full step sequence:
`lang → region → (relocate) → license → ykb → driver_card → domain → availability → shift_preference → phone → email → name → confirmation`

Special routing:
- `region=stockholm` → skip `relocate` step
- `license=none` → route to `disqualified` (terminal)

---

## Simulated vs. Operational Areas

| Area | Status | What's needed |
|------|--------|--------------|
| Driver intake pipeline | **OPERATIONAL** | — |
| Classification + scoring | **OPERATIONAL** | — |
| Matching + shortlist creation | **OPERATIONAL** | — |
| Cockpit + human approval | **OPERATIONAL** | — |
| SMS contact delivery | **SIMULATED** | `SMS_PROVIDER=46elks` + credentials |
| SMS follow-up delivery | **SIMULATED** | Same |
| B2B commercial delivery | **MANUAL** | Founder delivers shortlist; no automated B2B delivery yet |
| Company self-service intake | **NOT BUILT** | Phase 7 |
| Driver verification (Transportstyrelsen) | **NOT BUILT** | Phase 2+ (external API) |
| Invoicing | **NOT INTEGRATED** | Fortnox or equivalent |

---

## Database (Local Supabase Only During Development)

**CONSTRAINT: Never run against production Supabase without explicit founder authorization. Never run `B2B_IMPORT_CONFIRM=true` unless `SUPABASE_URL` contains `127.0.0.1`.**

Tables: `drivers`, `ingested_drivers`, `company_needs`, `companies`, `shortlists`, `shortlist_entries`, `system_actions`

Client: `lib/db.ts` exports `supabase` (service role). All agent actions logged to `system_actions` via `logAction()` in `lib/systemActions.ts`.

Full schema in `docs/current/database-schema.md`.

---

## Cron

`/api/agent/follow-up` runs daily at `0 8 * * *` via `vercel.json`. Calls `runFollowUpAgent()`.

## Tests

556/556 passing. Only `lib/classify.ts` and `lib/followup.ts` have unit tests (pure functions). All other lib files interact with Supabase or external services and are not unit-tested.

## Domain Types

All domain enums and types in `types/lead.ts`: `License`, `Ykb`, `Availability`, `Region`, `Relocate`, `LeadStatus`, `LeadPriority`, etc.

## Path Alias

`@/*` maps to the project root. Defined in `tsconfig.json`.
