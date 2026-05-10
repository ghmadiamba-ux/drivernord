# DriverNord — Current Project State

*Last updated: 2026-05-10 (messaging infrastructure added)*

---

## What DriverNord is

DriverNord is a driver acquisition infrastructure platform for the Swedish heavy transport market. It operates as an autonomous matching pipeline — not a job board, not a staffing agency.

**Target segment:** Professional truck drivers with C, CE, or D license + YKB in the Stockholm region. Outside-Stockholm drivers with willingness to relocate are also captured.

**Business model (planned):** Charge transport companies for access to qualified driver profiles and/or successful placement.

**Stage:** Pre-pilot. The technical pipeline is built and operational. No paying customers. No real contacts sent to drivers (simulated only).

---

## Current Pipeline Status

| Stage | Status | Notes |
|-------|--------|-------|
| Driver intake (/chat) | Production-ready | Bilingual (sv/en), mobile-first, no CV |
| Lead classification | Production-ready | Deterministic — license, YKB, region, availability |
| Lead ingestion | Production-ready | Auto-triggers on ready_for_ingestion |
| Scoring | Production-ready | 100-point model — license(35) + YKB(25) + availability(20) + location(20) |
| Ingestion → matching trigger | Production-ready | Fires for all open needs after driver completes /chat |
| Need → matching trigger | Production-ready | Fires on POST /api/company-needs |
| Shortlist creation | Production-ready | Hard filters + rank-sort |
| Contact suggestion (suggest mode) | Production-ready | Logs pending action, awaits human approval |
| Contact send (auto mode) | Provider-ready | Uses getMessagingProvider() — simulated by default, real SMS when SMS_PROVIDER configured |
| Cockpit approval → real send | Production-ready | Approval triggers actual provider send (not just status update) |
| Follow-up scheduling | Production-ready | computeFollowUp sets follow_up_at |
| Follow-up trigger | Production-ready | Cron at 08:00 UTC |
| Follow-up send (auto mode) | Provider-ready | Uses getMessagingProvider() — same abstraction as contact agent |
| Human approval cockpit | Production-ready | Approve/cancel/retry, 15s polling |
| Recruiter auth | Production-ready | HTTP-only cookie, 7-day session |

---

## What Works Today

1. **Full driver intake** — a driver can complete `/chat`, get classified (HIGH/MEDIUM/LOW/disqualified), and receive a meaningful confirmation screen with priority badge.

2. **Fully autonomous pipeline** — from driver completion to shortlist creation runs without human intervention. The chain is: intake → classify → ingest → score → match → shortlist → contact suggestion (pending).

3. **Human governance cockpit** — recruiter can observe all system actions in real time, approve or cancel pending contact suggestions, retry failed actions.

4. **Company need creation** — authenticated POST creates a company + need and immediately triggers matching against all ingested drivers.

5. **Follow-up scheduling** — drivers who are not yet available or have YKB in progress are scheduled for follow-up automatically. The cron runs daily at 08:00 UTC.

6. **Public website** — driver landing (/chaufforer), company landing (/company), technical architecture (/company/ai-agenter), and all legal pages (/privacy, /terms, /cookies, /about, /contact) are live and accurate.

---

## What is NOT Working (Gaps)

1. **Real SMS delivery is not yet configured** — the messaging abstraction is built and ready (`lib/messaging/`). To enable real sends: set `SMS_PROVIDER=46elks` (or future provider) + credentials. Without configuration, all sends remain simulated (console.log). This is the single remaining blocker for pilot readiness.

2. **No company need intake for companies** — there is no self-service form for transport companies. All company needs must be created by the recruiter via API call. The public company site directs to `hej@drivernord.com`.

3. ~~**No database migration files**~~ — resolved. Files exist in `migrations/001`–`007`.

4. ~~**Lead PII endpoints unprotected**~~ — resolved. All three score/lead GET endpoints now require auth.

5. ~~**Test suite failures**~~ — resolved. 556/556 pass.

---

## Environment Variables Required

| Variable | Purpose | Required |
|----------|---------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | DB access (bypasses RLS) | Yes |
| `MATCH_API_KEY` | Protects POST /api/match | Yes |
| `RECRUITER_API_KEY` | Protects cockpit + company-needs POST | Yes |
| `AGENT_API_KEY` | Protects POST /api/agent/follow-up (Vercel Cron) | Yes |
| `AGENT_CONTACT_MODE` | suggest / auto / hybrid | Optional (default: suggest) |
| `AGENT_CONTACT_ENABLED` | Kill switch | Optional (default: enabled) |
| `AUTO_CONTACT_THRESHOLD` | Score threshold for auto in hybrid mode | Optional (default: 85) |
| `AGENT_FOLLOWUP_MODE` | suggest / auto | Optional (default: suggest) |
| `AGENT_FOLLOWUP_ENABLED` | Kill switch | Optional (default: enabled) |
| `SMS_PROVIDER` | SMS provider name (`46elks`) | Optional (default: simulated) |
| `SMS_API_KEY` | Provider API key / username | Required when SMS_PROVIDER set |
| `SMS_API_SECRET` | Provider API secret / password | Required when SMS_PROVIDER set |
| `SMS_FROM_NUMBER` | Sender phone number or alphanumeric ID | Required when SMS_PROVIDER set |

---

## Key Decisions Made

- **Suggest mode as default** — agents create pending actions, human approves. Correct for pre-pilot with zero track record. Switch to hybrid/auto only after manual validation confirms accuracy.
- **Stockholm-first geography** — scoring and step routing prioritize Stockholm region. Outside-Stockholm drivers with relocate=yes are captured but score lower.
- **No CV, structured intake** — differentiation from traditional job boards. YKB and license captured before any PII.
- **HTTP-only cookie auth** — no browser-visible secrets. Cockpit is protected by session cookie, not header token.
- **No lager/warehouse expansion** — scope is heavy transport (C/CE/D + YKB). Bus (D license) is captured but flagged separately.
