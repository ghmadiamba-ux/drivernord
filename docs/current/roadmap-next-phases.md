# DriverNord — Roadmap: Next Phases

*Last updated: 2026-05-10 (Phase 1 sub-items 1.2–1.5 completed; B2B research phase active)*

---

## Guiding Principles

1. **Do not expand scope prematurely.** The next phases address what is needed to run a real pilot with real companies and real drivers. No warehouse/lager/bus expansion until the core transport segment is validated.
2. **Pipeline automation is built; contact delivery is the last missing link.** The priority is getting real messages to real drivers, not adding more features.
3. **Pilot readiness before scale.** Each phase below should unlock a specific capability needed before moving to the next.

---

## Current Readiness Assessment

| Capability | Ready? |
|-----------|--------|
| Driver self-registration | YES |
| Automated classification + ingestion | YES |
| Automated matching (on driver or need creation) | YES |
| Shortlist creation | YES |
| Human approval cockpit | YES |
| Messaging provider abstraction | YES — `lib/messaging/` built and tested |
| Actual contact delivery to drivers | PARTIAL — infrastructure ready, needs `SMS_PROVIDER` + credentials configured |
| Cockpit approval → real send | YES — approval now calls provider, not just marks contacted |
| Database migrations in version control | YES — `migrations/001`–`007` committed |
| PII routes protected (leads, score) | YES — `requireRecruiterAuth` on all three endpoints |
| Test suite clean | YES — 556/556 pass (recruiterAuth mock updated) |
| OG metadata base URL | YES — `metadataBase: new URL('https://drivernord.com')` set in `app/layout.tsx` |
| Human visuals deployed | YES — `public/images/` (about, company hero, company trust, driver hero) |
| Company need self-service intake | NO — recruiter-only via API |
| Real company engagement | NOT YET — email-only (`hej@drivernord.com`) |
| Pilot with first company | BLOCKED by SMS_PROVIDER credentials only |

---

## Phase 1 — Pilot Readiness (Blocking)

**Goal:** Be able to run a real pilot with at least one transport company. A driver fills `/chat`, is matched, and actually receives a message.

### 1.1 Real contact delivery — SMS or WhatsApp

**Status: INFRASTRUCTURE COMPLETE. Credential configuration remaining.**

The messaging abstraction (`lib/messaging/`) is built and tested. The provider is selected at runtime via `SMS_PROVIDER`. 46elks (Swedish provider) is implemented. To activate real sends:

1. Sign up for a 46elks account (or another provider — extend `lib/messaging/smsProvider.ts`)
2. Set in `.env.local` (and Vercel environment):
   ```
   SMS_PROVIDER=46elks
   SMS_API_KEY=<your 46elks API username>
   SMS_API_SECRET=<your 46elks API password>
   SMS_FROM_NUMBER=<registered number or alphanumeric sender>
   ```
3. Deploy. Existing `console.log` simulated mode becomes real SMS.

No code changes required. The cockpit approval flow already triggers real sends via the provider.

**WhatsApp:** Not yet implemented. The `MessageChannel` type includes `'whatsapp'` as a reserved value. Add a new provider branch in `lib/messaging/smsProvider.ts` when ready.

**Effort remaining:** 30 minutes (provider account + env var configuration)
**Effort already done:** Provider abstraction, 46elks integration, approval-sends flow, failure handling, 16 new tests

### ~~1.2 Fix recruiterAuth test suite~~ — DONE

**What:** ~~Update `tests/recruiterAuth.test.ts` — add `cookies: { get: vi.fn().mockReturnValue(undefined) }` to mock objects. 4-line fix. Unblocks clean `npm test`.~~

**Status:** Completed. `cookies: { get: () => undefined }` added to mock. All tests pass.

### ~~1.3 Commit database migration files~~ — DONE

**Status:** Completed. `migrations/` directory exists with all 7 idempotent files:
- `001_create_drivers.sql`
- `002_add_domain_shift_preference_to_drivers.sql`
- `003_create_companies_and_company_needs.sql`
- `004_create_ingested_drivers.sql`
- `005_create_shortlists.sql`
- `006_add_contact_workflow_to_shortlist_entries.sql`
- `007_create_system_actions.sql`

All verified column-by-column against store files and types. See `docs/current/database-schema.md` for full schema reference.

### ~~1.4 Set metadataBase in root layout~~ — DONE

**Status:** Completed. `metadataBase: new URL('https://drivernord.com')` confirmed in `app/layout.tsx:5`. OG image URLs now resolve correctly for all pages.

### ~~1.5 Add auth to PII-exposing endpoints~~ — DONE

**Status:** Completed. `requireRecruiterAuth` verified in all three handlers:
- `GET /api/leads/[id]` — protected (`app/api/leads/[id]/route.ts:52`)
- `GET /api/leads/[id]/score` — protected (`app/api/leads/[id]/score/route.ts:49`)
- `POST /api/leads/[id]/score` — protected (`app/api/leads/[id]/score/route.ts:62`)

---

## Phase 1.5 — B2B Research and Barrier-to-Entry Assessment (ACTIVE)

**Goal:** Identify realistic Swedish transport/logistics pilot targets and understand barriers to entry before building any company intake form. This phase is research-only — no code.

**Why before Phase 2:** Building a company intake form before understanding how target companies actually engage with vendors risks building the wrong entry point (wrong form fields, wrong trust signals, wrong contact flow).

**Core research principle:** Do not only look for companies with driver needs. Look for companies with:
- visible driver need
- **+** low barrier to entry
- **+** accessible decision-maker
- **+** realistic pilot feasibility

### Target segments (priority order)

1. **Swedish transport SMEs and regional operators** — companies with 5–50 trucks, recurring C/CE hiring needs, owner or transport manager as decision-maker. No procurement panel. Stockholm region first.
2. **Transport-specialist staffing agencies** — Rekryteringsgruppen, Simplex Bemanning, Submit AB — as potential supplier clients. DriverNord supplies pre-qualified driver profiles; agency places them. Bypasses employer-direct complexity.
3. **Regional logistics operators** with visible driver ads on Arbetsförmedlingen or Blocket Jobb.

### Large accounts — benchmarks only, not immediate targets

PostNord, DHL, Bring, DB Schenker and similar groups have multi-month supplier approval processes, procurement systems, HR vendor panels, GDPR/insurance requirements. Research their processes as benchmarks and long-term strategic accounts. Do not approach as pilot candidates.

### Barrier dimensions to assess per company

| Dimension | What to check |
|-----------|---------------|
| Procurement / supplier approval | Is there a formal vendor approval process? How long? |
| Existing staffing contracts | Do they have an exclusivity clause with a bemanning company? |
| GDPR / data processor agreement | Do they require a DPA before sharing driver data? |
| Insurance / liability | Does the non-employer model require explicit clarification? |
| Decision-maker accessibility | Owner / transport manager vs. HR vs. procurement department |
| Current driver urgency | Are they actively advertising for C/CE drivers right now? |

### Output of this phase

A ranked shortlist of 5–10 pilot candidates with:
- company name, segment, size
- current hiring signal (where seen)
- estimated barrier-to-entry level (low / medium / high)
- identified or inferred decision-maker role
- recommended first contact approach

This shortlist informs Phase 2 form design and B2B outreach strategy.

---

## Phase 2 — Real Company Need Capture

**Goal:** Transport companies can express hiring needs without recruiter mediation.

**Why this matters:** Currently, all company needs must be created by the recruiter via a direct API call. This creates a bottleneck — companies cannot self-register interest, and the recruiter must handle all intake manually. This is incompatible with the autonomous infrastructure vision.

### 2.1 Company need intake form

**What:** A web form at `/company/kontakt` or `/company/behov` where a transport company representative can submit a hiring need.

Fields to collect:
- Company name (text)
- Contact name + email
- License required (C / CE / D — select)
- Domain required (select from domain taxonomy)
- Region preference (Stockholm / other)
- Relocation tolerance (yes/no)
- Shift type (day / night / both)
- Urgency (standard / emergency)
- Additional notes (optional)

**Backend:** The form POSTs to `POST /api/company-needs` (already has auth + matching trigger). Either:
a. Add a separate unauthenticated route for company-submitted needs (with email notification to recruiter)
b. Keep `POST /api/company-needs` recruiter-protected and use a separate unprotected `POST /api/company-leads` that sends an email and logs the inquiry without creating a need directly

**Recommended:** Option b — log the inquiry, notify recruiter via email, recruiter creates the official need via API after vetting. Keeps the automated pipeline gated by human validation of company intent.

**Effort:** 2–3 days

### 2.2 Add company_name to getOpenCompanyNeeds()

**What:** Update `lib/companyNeedStore.ts` `getOpenCompanyNeeds()` to JOIN the `companies` table and return `company_name`.

**Why:** The cockpit shows `company_need_id` UUIDs but no human-readable company name. Operators must cross-reference separately.

**Effort:** 30 minutes

---

## Phase 3 — Observability and Operational Safety

**Goal:** Make the system safe and understandable to operate without deep technical knowledge.

### 3.1 Add rate limiting to POST /api/leads

**What:** Implement IP-based rate limiting before the driver intake endpoint.

Options:
- Vercel middleware with in-memory rate limiting (simple, not persistent across instances)
- Upstash Redis + `@upstash/ratelimit` (recommended for production)
- Limit: e.g., 5 leads per IP per hour

**Why:** Before any public Meta campaigns, the intake endpoint needs protection against bot submissions that would pollute the driver pool.

**Effort:** 1 day

### 3.2 Add match cooldown guard

**What:** Add a cooldown check in `runMatchingAgent` — if a shortlist was created for this `needId` within the last N minutes, skip the run.

**Where:** `lib/matchingAgent.ts` — after validating the needId, check `shortlists WHERE company_need_id = needId AND created_at > now() - interval 'MATCH_COOLDOWN_MINUTES'`.

**Why:** Multiple drivers completing `/chat` in quick succession all trigger matching for all open needs. This creates many shortlists for the same need, each with slightly different candidate pools.

**Effort:** 2 hours

### 3.3 Ingest failure logging

**What:** When `ingestLead()` fails in `PATCH /api/leads/[id]`, log a `driver_ingested` action with `status: 'failed'` to `system_actions`.

**Where:** `app/api/leads/[id]/route.ts` — in the `if (!ingestResult.ok)` block.

**Why:** Currently ingestion failures are invisible to the cockpit operator. A driver may complete `/chat` and show as classified but never appear in the matching pool, with no explanation.

**Effort:** 30 minutes

### 3.4 Add "Run Match" button to cockpit

**What:** Add a button in `/recruiter` that allows the operator to manually trigger a match run for a specific company need without using curl or the API directly.

**How:** Add a simple UI section showing open company needs (from `GET /api/company-needs`); each need has a "Run Match" button that POSTs to `POST /api/recruiter/match` with the `need_id`.

**Effort:** 1 day

### 3.5 Shortlist browse in cockpit

**What:** Add a shortlist list view to the cockpit — allows operator to see all past shortlists and click into entries without knowing a UUID.

**Backend:** `GET /api/recruiter/shortlists` (currently only `GET /api/recruiter/shortlists/[id]` exists)

**Effort:** 1 day (backend + UI)

---

## Phase 4 — Legal Completeness

**Goal:** Remove "Preliminär version" banners from all legal pages and operate with reviewed, final policy content.

### 4.1 Legal review of privacy policy, terms, cookies

**What:** Have a Swedish legal professional review `/privacy`, `/terms`, `/cookies`.

Key issues to address:
- Explicit legal basis for data processing (legitimate interest or consent)
- Retention periods — add specific durations
- Cross-border data transfer statement (if applicable — Supabase EU region)
- SMS/WhatsApp section in privacy policy: update when real provider is integrated

**After review:** Remove "Preliminär version" amber banner from each page.

**Effort:** External — depends on legal resource

### 4.2 Add data deletion mechanism

**What:** A recruiter-accessible endpoint or cockpit action to delete a driver's data on GDPR request.

Minimum: `DELETE /api/recruiter/drivers/[id]` that deletes from `drivers` and `ingested_drivers`, marks or removes `shortlist_entries`.

**Effort:** 1 day

---

## Phase 5 — Scale Preparation

**Goal:** The system can handle meaningful driver and company volumes without degrading.

### 5.1 Paginate recent actions in cockpit

**What:** `recentActions` is currently capped at 50 records. Add pagination to `GET /api/cockpit/actions` and to the cockpit UI.

**Effort:** 1 day

### 5.2 Add driver pool browse to cockpit

**What:** A view in the cockpit showing all ingested drivers with their score, status, and last activity. Allows recruiter to understand pool composition.

**Effort:** 2 days

### 5.3 Index critical query columns

**What:** Ensure Supabase has indexes on:
- `system_actions(status)` — for cockpit pending/failed queries
- `system_actions(created_at)` — for time-range queries
- `drivers(follow_up_at, follow_up_sent)` — for cron query
- `shortlist_entries(driver_id, contacted_at)` — for dedup checks

**Effort:** 1 hour (SQL migration)

### 5.4 Evaluate multi-region expansion

**When:** Only after Stockholm pilot validates the model. Next geography would be Göteborg or Malmö — not lager/warehouse segment.

---

## Phase Summary

| Phase | Goal | Blocks | Status |
|-------|------|--------|--------|
| 1.1 — SMS credentials | Real contact delivery | First real pilot | OPEN — infrastructure done, credentials pending |
| 1.2–1.5 — Pilot readiness tasks | Tests, migrations, auth, metadataBase | First real pilot | **DONE** |
| 1.5 — B2B Research | Pilot target selection + barrier mapping | Phase 2 form design | **ACTIVE** |
| 2 — Company Need Capture | Self-service company intake | Removing recruiter bottleneck | Not started — 3–4 days |
| 3 — Observability | Safe operation + rate limiting | Public campaigns | Not started — 3–4 days |
| 4 — Legal Completeness | Final legal pages | Public-facing at scale | Not started — external + 1 day |
| 5 — Scale Preparation | Volume capacity | Beyond pilot | Not started — 5–7 days |

---

## What Is Explicitly Out of Scope

- **Lager/warehouse driver segment** — not in the current target market (C/CE/D + YKB heavy transport). Do not add warehouse categories, forklift, or light vehicle domains.
- **Bus segment expansion** — D license is captured but not prioritized. Do not build bus-specific matching logic.
- **CV upload or storage** — the no-CV positioning is a core differentiator. Do not add CV parsing or storage at any phase.
- **Multi-recruiter access** — the system is designed for a single operator. Multi-user access requires a full auth overhaul (user accounts, per-user keys, audit log per user).
- **Real-time matching dashboard** — the 15s polling cockpit is sufficient for pre-scale. Do not add WebSocket complexity.
