# DriverNord — Agentic OS Implementation Roadmap

**Date:** 2026-05-16
**Status:** Roadmap only. No implementation started. No live connections.
**Purpose:** Sequence the implementation of agents and automations in a pragmatic order that delivers value early and avoids over-engineering.

---

## Guiding Principles for the Roadmap

1. **Production pipeline first.** Before building any agent, the production pipeline must be running (46elks configured, migration 013 applied, deployment authorized). Agents built on a non-operational pipeline are useless.

2. **No agent is better than a broken pipeline.** Agent 1 is worthless if SMS doesn't send, the database is empty, or the domain is not verified.

3. **Ship the simplest version first.** Each agent has a minimal viable implementation. Build that. Resist adding features before you know which agents actually get used.

4. **Measure before you scale.** Before adding more agents, verify the existing ones work. An agent that runs but produces unused outputs is waste.

5. **Human gates are permanent.** The roadmap does not progress by removing human gates. It progresses by making the agent outputs good enough that human review takes 30 seconds instead of 5 minutes.

---

## Phase 0 — Pipeline Operational (Founder actions, not Claude Code)

**Goal:** The live production pipeline is running before any agent work begins.

**Duration estimate:** 1–2 weeks (founder-dependent)

| Action | Who | Time | Blocks |
|--------|-----|------|--------|
| Apply migration 013 to production Supabase | Founder | 10 min | Consent + attribution in production |
| Configure 46elks SMS credentials | Founder | 30 min | All SMS automation |
| Confirm `hej@drivernord.se` monitoring | Founder | 10 min | Communication triage |
| Decide and configure canonical domain (`drivernord.se`) | Founder | 5 min | DONE |
| Update `app/layout.tsx` metadataBase | Claude Code | 5 min | Production metadata |
| Authorize production deployment | Founder | Decision | Everything |
| Verify Facebook Page created | Founder | 2–4 hours | Organic content, Meta |
| Commission GDPR lawyer review | Founder | External | Pixel activation |

**Exit criterion:** A real driver can complete the `/chat` flow on `drivernord.se`, receive an SMS, appear in the Supabase database, and be visible in the recruiter cockpit.

---

## Phase 1 — Foundation Agents (Claude Code builds, Founder validates)

**Goal:** Build 4 independent, low-risk agents that work without an orchestration layer.

**Duration estimate:** 2–3 weeks (after Phase 0 complete)

**Prerequisite:** Phase 0 complete. All 4 agents can be built in parallel.

---

### Phase 1A: Performance and Reporting Agent

**Build time:** 3–5 days

**What to build:**
1. Supabase query function that extracts pipeline metrics (driver counts by status, priority, region, license)
2. Claude API call that generates narrative weekly summary from metrics
3. Vercel Cron route (`/api/agent/weekly-report`) that runs every Monday at 07:00 Europe/Stockholm
4. Resend email delivery to founder

**Files to create:**
- `lib/agents/performanceAgent.ts` — data extraction + AI summary generation
- `app/api/agent/weekly-report/route.ts` — Vercel Cron endpoint
- `templates/weekly-report.ts` — email template

**Tests to write:**
- performanceAgent: correct metric extraction from mock Supabase data
- performanceAgent: AI summary generation with mocked Claude response
- Cron route: returns 200, triggers agent correctly

**Validation:** Founder receives first weekly report and confirms it is accurate and useful.

---

### Phase 1B: Creative and Acquisition Agent

**Build time:** 3–5 days

**What to build:**
1. Creative bank file structure in `docs/business/meta-acquisition-integration/creative-bank/`
2. Claude API function that generates copy variants given an angle + compliance rules
3. CLI script or `/api/agent/creative` endpoint that founder can trigger on-demand
4. Performance analysis function that reads imported Meta data and produces recommendations

**Files to create:**
- `lib/agents/creativeAgent.ts` — copy generation + performance analysis
- `app/api/agent/creative/route.ts` — on-demand trigger endpoint (protected)
- `docs/business/meta-acquisition-integration/creative-bank/README.md` — bank index
- First angle files (angles 1–6 from organic content test plan)

**Tests to write:**
- creativeAgent: generates copy variants in correct format
- creativeAgent: compliance rules enforced (banned phrases rejected)
- creativeAgent: performance analysis produces ranked recommendations

**Validation:** Founder runs the agent, reviews 5 copy variants for Angle 1, and confirms at least 3 are usable with minor editing.

---

### Phase 1C: Match Explanation Agent

**Build time:** 2–3 days

**What to build:**
1. Claude API function that reads shortlist entry + driver profile + company need → generates match explanation
2. Hook into existing `buildShortlist()` flow: after shortlist is created, agent generates explanation for each entry
3. Store explanation in `shortlist_entries` as a new `ai_explanation` column (new migration)
4. Display explanation in recruiter cockpit next to each shortlist entry

**Files to create:**
- `lib/agents/matchExplanationAgent.ts` — explanation generation
- `migrations/014_add_ai_explanation_to_shortlist_entries.sql`

**Tests to write:**
- matchExplanationAgent: generates accurate explanation from test data
- matchExplanationAgent: never includes raw PII in explanation
- matchExplanationAgent: handles missing driver fields gracefully

**Validation:** Recruiter sees AI explanation in cockpit next to a shortlist entry. Explanation is accurate and useful.

---

### Phase 1D: Communication Triage Agent (Simplified)

**Build time:** 4–6 days (more complex due to Gmail API integration)

**What to build (simplified Phase 1 version):**
1. Gmail API integration to read incoming emails to `hej@drivernord.se`
2. Claude API intent classification (7 intent categories)
3. For FAQ intents: auto-draft response in Gmail Draft (founder reviews and sends manually — not yet auto-send)
4. For sensitive intents: create a task in Supabase `support_queue` table for founder review
5. Daily digest email: summary of incoming messages + intent classifications

**Note:** In Phase 1, the triage agent creates Gmail Drafts only — it does NOT send automatically. Auto-send is a Phase 2 feature after the draft quality is validated.

**Files to create:**
- `lib/agents/communicationAgent.ts` — intent classification + draft generation
- `lib/gmail.ts` — Gmail API integration
- `app/api/agent/triage/route.ts` — webhook receiver
- New Supabase migration: `support_queue` table

**Validation:** Founder receives 20 classified inbound messages. Agent correctly classifies ≥18/20. Zero GDPR or complaint topics are misclassified as FAQ.

---

## Phase 2 — Operational Intelligence (3–4 weeks after Phase 1)

**Goal:** Add the Demand Intelligence Agent and Cockpit AI Assistant. Introduce n8n as the orchestration layer.

**Prerequisites:**
- Phase 1 agents running and validated for at least 2 weeks
- At least 5 real drivers in the database
- 46elks SMS operational
- First organic content campaign underway

---

### Phase 2A: n8n Setup and Migration

**Build time:** 3–5 days

**What to build:**
1. Deploy n8n on Hetzner or DigitalOcean (Docker compose)
2. Migrate Performance Agent cron from Vercel Cron to n8n schedule
3. Set up n8n webhook receivers for 46elks inbound SMS and Gmail inbound email
4. Set up n8n error alerting (email to founder on any workflow failure)
5. Create `pending_actions` table migration (migration 015) — schema for approval queue items

**Why:** Centralizing workflow orchestration in n8n makes it easier to chain agents, add retry logic, and monitor all automation in one place.

---

### Phase 2B: Operator / Orchestrator Agent

**Build time:** 3–5 days

**What to build:**
1. `pending_actions` Supabase table: `id`, `action_type`, `agent_id`, `content` (JSONB), `status` (PENDING/APPROVED/REJECTED/EXPIRED/FAILED), `sla_deadline`, `retry_count`, `created_at`, `resolved_at`, `resolved_by`
2. Claude API function that reads queue state and generates a prioritized action list
3. SLA monitoring: alerts at 50% and 90% of each item's deadline
4. Blocked workflow detection: identifies items where downstream actions cannot proceed
5. Retry logic: re-triggers failed agent calls (max 3 attempts with exponential backoff)
6. Daily digest email: summary of pending, approved, rejected, and failed items from the previous 24 hours
7. n8n schedule: Orchestrator scan every 15 minutes

**Files to create:**
- `lib/agents/orchestratorAgent.ts` — queue reading, prioritization, SLA calculation, retry logic
- `app/api/agent/orchestrate/route.ts` — triggered by n8n on schedule and on `pending_actions` events
- `migrations/015_pending_actions.sql`

**Relationship to n8n:** n8n handles deterministic routing (webhook → agent → queue). The Orchestrator Agent handles judgment-based coordination (what is urgent, what is blocked, what needs founder attention). They are complementary — do not conflate.

**Validation:** Founder receives first daily digest and confirms all pending items are accurately surfaced. SLA alert fires correctly when a test item exceeds its deadline.

---

### Phase 2C: Demand Intelligence Agent

**Build time:** 5–7 days

**What to build:**
1. Jobtech API integration — fetch daily CE/C/D driver job postings from Swedish companies
2. Company demand signal scoring algorithm
3. Claude API synthesis: given raw job postings, produce structured company demand report
4. Founder-facing report: weekly email with "top 5 companies to consider approaching"
5. Supabase `research_reports` table for storing outputs

**Legal prerequisite:** Confirm Jobtech API terms allow commercial use (they are publicly released under open license — confirm this holds for commercial applications).

**Do NOT build before:** ≥5 drivers exist. Approaching companies before supply exists wastes opportunities.

---

### Phase 2D: Cockpit AI Assistant

**Build time:** 4–6 days

**What to build:**
1. Chat UI component in `/recruiter` cockpit (text input + response area)
2. Claude API with tool use: `query_database` tool that executes read-only Supabase SELECT
3. Natural language → SQL → result → natural language answer pipeline
4. Query history (within session — no persistence required)
5. "Suggested questions" UI element for common queries

**Security:** The `query_database` tool must execute queries via a read-only Supabase service role key. No INSERT, UPDATE, DELETE allowed. All queries logged to `system_actions`.

---

### Phase 2E: Social Media Scheduled Publishing (Phase 1 upgrade)

**Build time:** 2–3 days

**Prerequisites:** Orchestrator Agent (Phase 2B) operational. Meta Graph API access authorized by founder. Facebook Page connected to Business Manager.

**What to build:**
1. Meta Graph API integration for scheduled post publishing (`lib/metaGraphApi.ts`)
2. Approval queue action: "approve + schedule" — founder selects publish time at point of approval
3. Orchestrator triggers publish at the scheduled time via Meta Graph API
4. Delivery confirmation: post published → status updated in `pending_actions` → logged to `system_actions`

**Gate:** Approval gate (AQ-03) is permanent and unchanged. This upgrade automates the post-approval step only. The founder always approves before any post is published.

**What does NOT change:** The founder must still review and approve every draft. No post is ever published autonomously.

---

### Phase 2F: Communication Agent Auto-Send (Phase 1 upgrade)

**Build time:** 2–3 days

**What to build:**
After 4 weeks of Phase 1D validation (all 7 intent categories achieving ≥95% classification accuracy on real inbound messages), upgrade the Communication Agent to auto-send responses for FAQ intents.

**Gate:** Founder must explicitly enable auto-send by setting `COMMS_AGENT_AUTO_SEND=true` in environment variables. Default remains `false`.

---

## Phase 3 — Market Expansion (After first commercial transaction)

**Goal:** Add Meta Pixel/CAPI, advanced creative automation, Fortnox integration, and the Legal Compliance Monitor.

**Prerequisites:**
- First paying client (Package 4 delivery)
- Lawyer has confirmed GDPR basis for Meta Pixel
- Cookie consent banner live
- Budget for Meta advertising allocated

---

### Phase 3A: Meta Pixel and CAPI Integration

Per `docs/business/meta-acquisition-integration/pixel-event-architecture.md` and `conversions-api-architecture.md`. Implement Option C (env-gated Pixel + CAPI).

### Phase 3B: Fortnox Invoice Integration

Build invoice generation pipeline:
- Input: completed introduction delivery (company need ID + drivers introduced)
- Output: draft invoice in Fortnox (via API)
- Human gate: founder confirms in Fortnox before sending

### Phase 3C: Legal Compliance Monitor

Low-priority. IMY and EDPB monitoring. Weekly regulatory scan. Relevant for GDPR compliance at scale.

### Phase 3D: HeyGen AI Video (Optional)

Only if organic video content strategy shows strong ROAS. Not a priority until paid campaign is producing measurable results.

---

## Phase 4 — Scale (After 100+ drivers, 3+ recurring clients)

At this stage, the architecture can be revisited for:
- Multi-tenant cockpit (recruiter team, not just founder)
- More sophisticated vector search for driver-company matching
- Automated shortlist refreshing as driver availability changes
- Company self-service intake portal
- Subscription billing management

**Do not design for Phase 4 now.** The requirements will be clearer after Phase 1–3 reveal what actually matters.

---

## Timeline Summary (conditional on founder Phase 0 actions)

| Phase | Start | Duration | Key deliverable |
|-------|-------|----------|----------------|
| 0 — Pipeline operational | Now | 1–2 weeks (founder) | Real driver can register and appear in DB |
| 1 — Foundation agents | After Phase 0 | 2–3 weeks | 4 agents running: reporting, creative, match explanation, communication triage |
| 2 — Operational intelligence | 5–6 weeks | 3–4 weeks | Demand research, cockpit assistant, n8n orchestration |
| 3 — Market expansion | First client | 4–6 weeks | Meta Pixel, Fortnox, legal monitor |
| 4 — Scale | 100+ drivers | TBD | Multi-user, advanced matching, self-service portal |

---

## What NOT to Build (at any phase)

| Item | Why not |
|------|---------|
| Custom vector database | Supabase pgvector handles this when needed |
| Custom orchestration engine | n8n is sufficient; build custom only after n8n proves insufficient |
| Autonomous ad campaign management | Never. Financial decisions require human. |
| Autonomous legal document publishing | Never. Lawyer gate is non-negotiable. |
| Custom LLM or fine-tuned model | No training data volume to justify. Use Claude API. |
| Voice interface | No use case at current stage. |
| Mobile app | Web cockpit is sufficient. Native app adds cost with no material benefit. |
| Blockchain or NFT elements | Not relevant to any DriverNord problem. |

---

## Decision Points for Founder

| Decision | When | What to decide |
|----------|------|---------------|
| Authorize Phase 0 deployment | Now | Is the production pipeline ready to go live? |
| Enable Communication Agent auto-send | After 4 weeks of Phase 1D | Is classification accuracy ≥95%? |
| Authorize Meta paid campaign | After Phase 3A + lawyer approval | Are all prerequisites met? |
| Expand to full demand outreach | After ≥5 drivers in DB | Is the supply sufficient to make a credible offer? |
| Hire first employee | Phase 3–4 | Is the volume enough to justify a human CS or sales role? |

---

*Version 1.1 — 2026-05-16 — Added Phase 2B (Operator/Orchestrator Agent) and Phase 2E (Social Media Scheduled Publishing). Renumbered Phase 2 sections. Added pending_actions migration to Phase 2A.*
