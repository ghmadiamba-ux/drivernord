# DriverNord — Architecture Context

*Last updated: 2026-05-10*

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Tests | Vitest 1 |

---

## Project Layout

```
agent-1/
├── app/                     # Next.js App Router pages and API routes
│   ├── page.tsx             # Root → redirects to /chaufforer
│   ├── layout.tsx           # Root layout (font, viewport meta)
│   ├── chat/                # Driver registration flow (Client Component)
│   ├── chaufforer/          # Driver landing page (Server Component)
│   ├── company/             # B2B landing page (Server Component)
│   │   └── ai-agenter/      # Technical architecture detail page
│   ├── about/               # About page
│   ├── privacy/             # GDPR privacy policy
│   ├── terms/               # Terms of service
│   ├── cookies/             # Cookie policy
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
├── components/              # Shared UI (PublicHeader, LegalFooter)
├── hooks/                   # React hooks (useChat)
├── types/                   # Domain types (lead.ts)
├── tests/                   # Vitest test files
├── middleware.ts             # Edge middleware — /recruiter/* cookie check
├── next.config.js            # Redirects, Next.js config
└── vercel.json              # Cron schedule
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

### Matching chain

```
runMatchingAgent({ needId, triggeredBy })
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
        ├── fetchCompanyContext(shortlistId) → company name, region, domain, shift, urgency
        ├── fetch shortlist_entries
        ├── batch-fetch ingested_drivers ykb + availability (for guards)
        └── for each entry:
              → guard: score < 60 → skip silently
              → guard: no phone or no firstName → skip silently
              → guard: contact_status !== 'new' → skip silently
              → guard: ykb === in_progress → logAction(contact_skipped)
              → guard: availability === not_yet → logAction(contact_skipped)
              → dedup: contacted within 14d (3d for emergency) → logAction(contact_skipped)
              → mode=suggest: logAction(contact_suggested, pending)
              → mode=auto: SIMULATED SEND + updateShortlistEntry + logAction(contact_sent)
```

### Follow-up chain

```
Vercel Cron 08:00 UTC → POST /api/agent/follow-up (AGENT_API_KEY header)
  │
  └── runFollowUpAgent()
        → drivers WHERE follow_up_at ≤ now AND follow_up_sent = false
        → for each driver:
              → guard: no phone or no firstName → skip
              → dedup: contacted via shortlist within 7d → logAction(follow_up_skipped)
              → mode=suggest: logAction(follow_up_triggered, pending)
              → mode=auto: SIMULATED SEND + set follow_up_sent=true + logAction(follow_up_sent)
```

### Human approval chain

```
Recruiter sees pending action in /recruiter cockpit (15s poll)
  │
  ├── PATCH /api/cockpit/actions/{id} { action: 'approve' }
  │     → executeApproval()
  │         → contact_suggested: updateShortlistEntry(contacted) + logAction(contact_confirmed)
  │         → follow_up_triggered: set follow_up_sent=true + logAction(follow_up_confirmed)
  │
  └── PATCH /api/cockpit/actions/{id} { action: 'cancel' }
        → set status=cancelled + logAction(override_cancelled)
```

---

## Authentication Model

### Driver routes (public by design)
- `POST /api/leads` — no auth (anonymous driver intake)
- `PATCH /api/leads/[id]` — no auth (drive-in step progression)
- `GET /api/leads/[id]` — no auth (risk: returns full PII — see security docs)
- `GET/POST /api/leads/[id]/score` — no auth (risk: returns full profile + score)

### Recruiter routes (cookie-protected)
- Middleware (`middleware.ts`) checks `recruiter_session` cookie for all `/recruiter/*` paths
- Cookie set by `POST /api/recruiter/auth` on successful key entry
- All `/api/cockpit/*` and `/api/recruiter/*` routes call `requireRecruiterAuth(req)` which accepts either `x-recruiter-key` header OR `recruiter_session` cookie
- `POST /api/company-needs` also requires recruiter auth

### Machine-to-machine routes
- `POST /api/match` — requires `x-api-key: MATCH_API_KEY`
- `POST /api/agent/follow-up` — requires `x-api-key: AGENT_API_KEY`

---

## Database Schema (inferred — no migration files)

### `drivers`
Primary lead table. Contains all drivers at any status level.

Key fields: `id`, `lang`, `region`, `relocate`, `license`, `ykb`, `driver_card`, `domain`, `availability`, `shift_preference`, `phone`, `email`, `first_name`, `lead_status`, `lead_priority`, `last_step_reached`, `completed_at`, `follow_up_at`, `follow_up_reason`, `follow_up_sent`

### `ingested_drivers`
The matchable pool. Only drivers with `lead_status = ready_for_ingestion`.

Key fields: `id` (FK → drivers.id), `ingested_at`, `priority`, `license`, `ykb`, `driver_card`, `domain`, `region`, `availability`, `shift_preference`, `willing_to_relocate`, contact fields

### `companies`
Key fields: `id`, `name`, `created_at`

### `company_needs`
Key fields: `id`, `company_id` (FK), `license_required`, `domain_required`, `domain_preferred` (array), `location_region`, `relocation_allowed`, `shift_type`, `urgency`, `status`, `created_at`

### `shortlists`
Key fields: `id`, `company_need_id` (FK), `total_candidates`, `total_shortlisted`, `summary`, `created_at`

### `shortlist_entries`
Key fields: `id`, `shortlist_id` (FK), `driver_id` (FK), `rank`, `match_score`, `breakdown` (JSONB), `flags` (array), `summary`, `driver_snapshot` (JSONB), `contact_status`, `recruiter_note`, `contacted_at`, `updated_at`, `created_at`

`contact_status` values: `new`, `contacted`, `interested`, `not_interested`

### `system_actions`
Audit log and pending approval queue.

Key fields: `id`, `action_type`, `triggered_by`, `target_type`, `target_id`, `status`, `input` (JSONB), `result` (JSONB), `error`, `created_at`, `completed_at`

`action_type` values (14): `driver_ingested`, `need_ingested`, `match_run`, `shortlist_created`, `contact_suggested`, `contact_sent`, `contact_skipped`, `contact_confirmed`, `follow_up_triggered`, `follow_up_confirmed`, `follow_up_sent`, `follow_up_skipped`, `override_cancelled`, `override_retried`

`status` values: `pending`, `approved`, `completed`, `failed`, `cancelled`

---

## Scoring Model

### Lead priority (classifyPriority — intake)
Applied during chat, determines the driver's confirmation screen badge.

| Condition | Priority |
|-----------|----------|
| license=none | disqualified (null) |
| no phone | anonymous_dropoff (null) |
| outside Stockholm AND relocate=no | LOW |
| reachable AND ykb=valid AND available now/2_weeks | HIGH |
| everything else | MEDIUM |

"Reachable" = region=stockholm OR relocate=yes

### Driver score (scoreDriver — matching)
Applied at ingestion, used for shortlist ranking and contact guard.

| Dimension | Max Points | Details |
|-----------|-----------|---------|
| License | 35 | CE+D=35, CE=33, C+D=31, C=28, D=18, none=0 |
| YKB | 25 | valid=25, in_progress=14, expired=7, none/unknown=0 |
| Availability | 20 | now=20, 2_weeks=14, 1_month=7, not_yet=2 |
| Location | 20 | stockholm=20, other_sweden+relocate=13, other_sweden=5, abroad+relocate=7, abroad=1 |

Tier caps: `bus_segment` (D only) or `ykb_missing` downgrades HIGH → MEDIUM.

Contact guard: `CONTACT_MIN_SCORE = 60` — entries below this score are skipped silently.

---

## Step Routing Logic

Full step sequence:
`lang → region → (relocate) → license → ykb → driver_card → domain → availability → shift_preference → phone → email → name → confirmation`

Special routing:
- `region=stockholm` → skip `relocate` step (Stockholm drivers don't need to answer)
- `license=none` → route to `disqualified` (terminal, no further steps)

`last_step_reached` is incremented per step. `last_step_reached >= 7` (i.e., through availability) sets `ready_for_ingestion`.
