# DriverNord — Current Project State

*Last updated: 2026-05-14 (GDPR consent step, UTM attribution capture, and rate limiting implemented locally; migration 013 ready for production; 10-driver E2E simulation completed — 660/660 tests passing)*

---

## What DriverNord Is

> **Doctrine update 2026-06-16:** The positioning below reflects the state as of 2026-05-14. Current doctrine supersedes it. See `docs/business/strategy/current-driverNord-doctrine.md` for the governing definition. Key updates: scope expanded to all logistics workers (not only CE/C/D drivers); three commercial paths now defined (Matchning, Rekrytering, Bemanning); bemanning is a planned commercial path, not a Phase 9+ item; "not a staffing/bemanning company" is historical — DriverNord is preparing for bemanning as a future offer.

DriverNord is an **AI-first logistics capacity network** for professional driver and logistics worker acquisition, qualification, matching, and consented introduction in the Swedish market. It is not a traditional recruitment agency and not a manual job board.

**Operating model:** AI executes and prepares → human validates and authorizes → system executes and logs → AI monitors.

**Target segment:** All logistics workers — CE/C/D drivers, distribution drivers, truckförare, lagerpersonal, terminalpersonal, orderplock, lastning/lossning — with Stockholm as the initial supply geography.

**Three commercial paths (current):**
- **A. Matchning / Kortlist** — qualified shortlist, flat fee (8,000–15,000 SEK)
- **B. Rekrytering / Introduktion** — recruitment introduction, direct hire by client
- **C. Bemanning / Logistikpersonal** — logistics staffing capacity (planned; founder handles operational prerequisites before first mission)

**Immediate entry products:**
- Package 4 "Akut Förarsökning" — 8,000–10,000 SEK per urgent introduction (1 worker, 48h delivery)
- Package 2 "Verifierad Förarlista" — 15,000 SEK introductory (3–5 verified workers)

**Stage:** Pre-commercial. Technical pipeline substantially complete. No paying customers. Worker database is empty. Real driver contact not yet possible (SMS simulated).

---

## Commercial Readiness Assessment

### Critical Blockers (Nothing commercial can proceed without these)

| Blocker | Status | Estimated effort | Who |
|---------|--------|-----------------|-----|
| Driver database — currently empty | **BLOCKING** | 4–8 weeks campaign | Founder decision + AI planning |
| 46elks SMS credentials not configured | **BLOCKING** | 30 minutes | Founder |
| hej@drivernord.se monitoring unconfirmed | **BLOCKING** | 10 minutes | Founder |
| Privacy policy not legally reviewed (Art. 6 basis not stated) | **BLOCKING for sharing profiles** | Weeks (external) | Swedish GDPR lawyer |
| DPA template does not exist | **BLOCKING for sharing profiles** | Weeks (external + AI draft) | Swedish lawyer + AI draft |
| Service agreement template does not exist | **BLOCKING for first invoice** | Days (AI draft + lawyer review) | AI draft + lawyer review |

### Technical Pipeline Status

| Stage | Status | Notes |
|-------|--------|-------|
| Driver intake (/chat) | Production-ready (local) | Bilingual (sv/en), mobile-first, structured. GDPR affirmative consent step implemented locally — requires deployment + lawyer confirmation of consent text before production use at scale. Stress-tested via 10-driver E2E simulation (all 82 simulation tests pass). |
| Lead classification (classify.ts) | Production-ready | Deterministic — license, YKB, region, availability |
| Lead ingestion (ingestLead.ts) | Production-ready | Auto-triggers on ready_for_ingestion |
| Scoring (scoreDriver) | Production-ready | 100-point model |
| Matching trigger (on driver or need) | Production-ready | Fire-and-forget from both directions |
| Shortlist creation (buildShortlist) | Production-ready | Hard filters + rank-sort; limit 5 |
| Contact suggestion (suggest mode) | Production-ready | Logs pending action for human approval |
| Contact send (auto mode) | **SIMULATED** | Infrastructure ready; SMS_PROVIDER not configured |
| Cockpit approval → real send | Production-ready | Approval triggers real provider send (when configured) |
| Follow-up scheduling | Production-ready | computeFollowUp sets follow_up_at |
| Follow-up trigger (cron 08:00 UTC) | Production-ready | Vercel cron configured |
| Follow-up send (auto mode) | **SIMULATED** | Same status as contact send |
| Human approval cockpit | Production-ready | Approve/cancel/retry; 15s polling |
| Recruiter auth | Production-ready | HTTP-only cookie, 7-day session |

---

## What IS Working Today

1. **Full driver intake pipeline** — a driver completes `/chat`, is classified, ingested, scored, and placed in the matching pool. All automated.
2. **Fully autonomous matching pipeline** — from driver completion to shortlist creation runs without human intervention.
3. **Human governance cockpit** — recruiter observes all system actions in real time, approves or cancels pending contact suggestions, retries failed actions.
4. **Company need creation** — authenticated POST creates a company + need and immediately triggers matching against all ingested drivers.
5. **Follow-up scheduling** — drivers who are not yet available or have YKB in progress are scheduled for follow-up automatically.
6. **Public website** — driver landing (/chaufforer), company landing (/company), technical architecture (/company/ai-agenter), and all legal pages are live.

---

## What is NOT Operational (Gaps)

1. **Real SMS/message delivery is not configured** — all sends are `console.log` only. No driver can actually be reached. Configure `SMS_PROVIDER=46elks` + credentials. 30-minute task. CRITICAL.

2. **Driver database is empty** — the commercial product depends entirely on a supply-side asset that does not exist. This is the most time-intensive gap. Requires a planned driver acquisition campaign (Meta Ads + other channels targeting Stockholm CE drivers).

3. **Legal/GDPR documents not in place** — privacy policy is preliminary, DPA template does not exist, service agreement does not exist. Every commercial transaction is legally incomplete without a DPA. Cannot share driver profiles with companies without one. *Note: GDPR affirmative consent step is implemented in code locally (pending deployment); lawyer confirmation of consent text is still required before scale.*

4. **hej@drivernord.se monitoring unconfirmed** — all inbound contact routes here; GDPR requests must be answered within 30 days. Status must be verified.

5. **No company self-service intake** — companies cannot submit needs without recruiter mediation. All needs must be created via API by the recruiter.

6. **No invoicing tool configured** — Fortnox or equivalent needed before any invoice can be issued.

---

## Market Reality (from market-reality-research/ 2026-05-14)

**Market gap confirmed:** The verified-consented-introduction model (DriverNord's Package 2/4) does not currently exist as a marketed Swedish transport product. Chaffis offers unverified directory access; agencies offer staffing or classic recruitment; job boards offer impressions. DriverNord's proposed niche is genuinely unoccupied.

**Competitive window:** Förartjänst.se is rebuilding in 2026. When it relaunches with its claimed 20,000+ drivers, the competitive landscape changes. The time to establish market presence is 2026.

**Pricing confirmed competitive:** 8,000–15,000 SEK is far below agency recruitment (63,000–126,000 SEK per hire) and justifiably above self-service alternatives (4,995–5,900 SEK).

**Sweden CE driver shortage:** ~5,000 drivers/year structural shortfall. Demand is persistent and not seasonal.

---

## Research Assets Completed

All of the following have been researched and documented in `docs/business/`:

| Asset | Location | Status |
|-------|----------|--------|
| Full project audit (6 files) | docs/business/project-audit/ | Complete 2026-05-14 |
| Monetization strategy (8 files) | docs/business/monetization-strategy/ | Complete 2026-05-14 |
| Market reality research (8 files) | docs/business/monetization-strategy/market-reality-research/ | Complete 2026-05-14 |
| 63-company opportunity database | docs/business/market-entry-research/ai-public-data-validation/ | Complete |
| Top-10 pilot-ready company notes | docs/business/b2b-target-company-top-10-notes.md | Complete |

---

## Environment Variables Required

| Variable | Purpose | Required |
|----------|---------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | DB access (bypasses RLS) | Yes |
| `MATCH_API_KEY` | Protects POST /api/match | Yes |
| `RECRUITER_API_KEY` | Protects cockpit + company-needs POST | Yes |
| `AGENT_API_KEY` | Protects POST /api/agent/follow-up (Vercel Cron) | Yes |
| `SMS_PROVIDER` | `46elks` — currently not set → simulated | **CONFIGURE NOW** |
| `SMS_API_KEY` | 46elks API username | Required when SMS_PROVIDER set |
| `SMS_API_SECRET` | 46elks API password | Required when SMS_PROVIDER set |
| `SMS_FROM_NUMBER` | Sender number or alphanumeric ID | Required when SMS_PROVIDER set |
| `AGENT_CONTACT_MODE` | suggest / auto / hybrid (default: suggest) | Optional |
| `AGENT_CONTACT_ENABLED` | Kill switch (default: enabled) | Optional |
| `AUTO_CONTACT_THRESHOLD` | Score threshold for auto in hybrid mode (default: 85) | Optional |
| `AGENT_FOLLOWUP_MODE` | suggest / auto (default: suggest) | Optional |
| `AGENT_FOLLOWUP_ENABLED` | Kill switch (default: enabled) | Optional |

---

## Local Development Constraint

**NEVER run `B2B_IMPORT_CONFIRM=true` unless `SUPABASE_URL` contains `127.0.0.1`.**
**NEVER touch production Supabase without explicit founder authorization.**
All development and testing uses local Supabase only.

---

## Key Design Decisions (Retained)

- **Suggest mode as default** — agents create pending actions; human approves. Correct for pre-pilot with zero track record.
- **Stockholm-first geography** — scoring and step routing prioritize Stockholm region.
- **No CV, structured intake** — differentiation from traditional job boards. YKB and license captured before any PII.
- **HTTP-only cookie auth** — no browser-visible secrets.
- **Flat-fee, payment on delivery** — Package 2 and Package 4 are paid on shortlist delivery, not on hire.
- **Bemanning: planned commercial path** — ~~"No bemanning"~~ superseded 2026-06-16. Bemanning (logistics staffing) is a legitimate future commercial offer. Founder handles Kollektivavtal, Fora insurance, employment contracts, and payroll before first live staffed mission. The system prepares for it now. See `docs/business/logistikbemanning/scope-and-transition-plan.md`.
- **AI-driven end to end** — AI researches, structures, scores, matches, and prepares; humans validate, approve, and authorize.
