# DriverNord — Agentic Architecture V1

**Date:** 2026-05-16
**Status:** Architecture document. No implementation. No live connections.
**Purpose:** Define the full agent architecture for DriverNord — how agents, automations, and humans interact as a coherent operating system.

---

## Core Design Principle

DriverNord's pipeline has two fundamentally different zones:

**Zone 1 — The Driver Pipeline (supply side)**
Structured intake → rules-based qualification → deterministic scoring → automated matching.
This zone must stay deterministic, auditable, and legally clean. LLMs do not belong in the core rules engine. Introduce AI only at the edges (explanation, communication, enrichment).

**Zone 2 — The Growth and Intelligence Layer (demand + acquisition side)**
Company research → market intelligence → ad creative → content strategy → performance optimization.
This zone is inherently unstructured and judgment-dependent. AI agents create real value here. Humans remain in the loop for spend authorization and outreach initiation.

**The boundary between these zones is the matching engine.** Matching uses deterministic rules to protect drivers and companies from inconsistent decisions, and AI to explain, present, and communicate those decisions.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GROWTH INTELLIGENCE LAYER                         │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Demand       │  │ Content &    │  │ Performance              │  │
│  │ Research     │  │ Creative     │  │ Analysis                 │  │
│  │ Agent        │  │ Agent        │  │ Agent                    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
│         │                 │                        │                  │
│         └─────────────────┴────────────────────────┘                │
│                            │ outputs → approval queue                │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────────┐
│                 OPERATOR / ORCHESTRATOR AGENT (Phase 2)               │
│  Routes outputs → approval queue │ Retries failures │ Detects blocks  │
│  Manages workflow state │ Surfaces alerts │ Logs all agent actions    │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ surfaced items
┌────────────────────────────▼─────────────────────────────────────────┐
│                    FOUNDER / RECRUITER COCKPIT                        │
│    approve / reject / edit / schedule │ approval queue UI             │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ authorized actions
┌────────────────────────────▼─────────────────────────────────────────┐
│                    DRIVER PIPELINE (DETERMINISTIC)                    │
│                                                                       │
│  /chat intake → classify → score → ingest → match → shortlist        │
│                                                                       │
│  ┌──────────────────┐  ┌────────────────┐  ┌────────────────────┐   │
│  │ Consent & GDPR   │  │ Communication  │  │ Follow-up          │   │
│  │ Automation       │  │ Agent          │  │ Automation         │   │
│  └──────────────────┘  └────────────────┘  └────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────────┐
│                    DATA LAYER (Supabase)                               │
│  drivers / ingested_drivers / shortlists / company_needs /            │
│  system_actions / agent_outputs / pending_actions / companies         │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Agent Definitions

### Agent 1: Acquisition and Creative Agent

**Purpose:** Generate, test, and optimize all driver acquisition content — organic posts, ad copy, creative briefs, and campaign structure.

**Trigger modes:**
- Scheduled (weekly creative bank refresh)
- On-demand (founder requests new copy variants)
- Event-driven (performance data import triggers analysis)

**Inputs:**
- Creative bank (structured Markdown files)
- Meta Insights export (CSV)
- Supabase driver registration data (by `utm_content`)
- Content angle library
- Brand compliance rules

**Outputs:**
- New ad copy variants (Markdown → creative bank)
- Performance analysis report
- Creative brief for visual production (Canva brief)
- Campaign structure recommendation (for founder review)
- Angle fatigue alerts

**Autonomy level:** GENERATE AND RECOMMEND. Never publishes, never spends, never launches campaigns.

**Tools:**
- Claude API (Sonnet for copy generation, Opus for strategy analysis)
- Supabase read access (UTM data, registration metrics)
- File system write (creative bank files)
- Meta Insights data (read-only import)

**Human gate:** Founder approves all content before publishing. Founder authorizes all budget changes.

---

### Agent 2: Demand Intelligence Agent

**Purpose:** Monitor the Swedish transport market for company demand signals, competitor activity, and market conditions. Prepare research packages for potential company outreach.

**Trigger modes:**
- Scheduled (daily monitoring, weekly deep research)
- On-demand (founder requests company profile)

**Inputs:**
- Public Swedish job boards (Arbetsförmedlingen/Jobtech API, Blocket Jobb)
- Company websites (public pages only)
- Bolagsverket (company registration data)
- Transport Gruppen publications
- Google News (Swedish transport sector)
- Existing `company_needs` table (to avoid researching already-known companies)

**Outputs:**
- Company demand signal report (structured: company, signal, confidence, source)
- Company profile package (for pre-outreach preparation)
- Market intelligence weekly summary
- Competitor activity report

**Autonomy level:** RESEARCH ONLY. Never contacts companies. Never sends emails. Never creates company records without human review.

**Tools:**
- Claude API (with web search via Brave API or similar)
- Playwright MCP (browser automation for public page research)
- Supabase read access (existing companies)
- File system write (research output files)

**Human gate:** Founder reviews demand signal report. Founder authorizes any outreach preparation.

---

### Agent 3: Communication Agent

**Purpose:** Handle inbound communication from drivers and companies, classify intent, draft responses, and route to appropriate action.

**Trigger modes:**
- Event-driven (new email to `hej@drivernord.se`, new inbound SMS, new DM)

**Inputs:**
- Inbound email content
- Inbound SMS content (via 46elks webhook)
- Driver record (Supabase lookup by phone)
- FAQ knowledge base
- Communication history

**Outputs:**
- Intent classification (GDPR request / support question / complaint / opt-out / application)
- Draft response (for human review if sensitive)
- Automated response (for low-sensitivity FAQ queries, with audit log)
- Opt-out flag update (automation, not AI)
- Escalation alert to founder (for GDPR requests, complaints)

**Autonomy level:** TRIAGE + DRAFT. Can auto-respond to clearly low-risk FAQ queries. All sensitive topics (GDPR, complaints, commercial) route to human review.

**Tools:**
- Claude API (Haiku for intent classification, Sonnet for response drafting)
- 46elks webhook (SMS receive)
- Gmail API or Resend (email)
- Supabase (driver lookup, communication log)

**Human gate:** Any GDPR, complaint, or commercial topic requires founder to review before response is sent.

---

### Agent 4: Match Explanation and Introduction Agent

**Purpose:** Generate natural language explanations of why a driver matches a company need, and draft the introduction communication that the recruiter will review before sending.

**Trigger modes:**
- Event-driven (new shortlist created by `buildShortlist`)

**Inputs:**
- Shortlist entries (`shortlist_entries` with score breakdown)
- Driver profile (from `ingested_drivers`)
- Company need (from `company_needs`)
- Introduction template library

**Outputs:**
- Match explanation (1–2 sentences per driver, for cockpit display)
- Company introduction draft (full text, for recruiter review)
- Driver notification draft (if consent given, recruiter approves)

**Autonomy level:** DRAFT ONLY. Recruiter sees AI-generated explanation in cockpit. Recruiter approves introduction before any communication is sent.

**Tools:**
- Claude API (Sonnet)
- Supabase read access (all required tables)
- System_actions write (log introduction draft creation)

**Human gate:** Recruiter must approve each introduction before sending. No autonomous driver-company contact.

---

### Agent 5: Performance and Reporting Agent

**Purpose:** Aggregate pipeline metrics, detect anomalies, generate weekly summary reports, and produce the data foundation for business decisions.

**Trigger modes:**
- Scheduled (daily metric snapshot, weekly summary report)
- On-demand (founder requests current pipeline status)

**Inputs:**
- Supabase (all tables — read-only)
- Meta Insights export (when available)
- Fortnox data (invoice and payment status — when integrated)
- system_actions audit log

**Outputs:**
- Pipeline dashboard data (driver counts by status/priority/region)
- Weekly email summary (data + AI narrative)
- Anomaly alerts (sudden drop in registrations, spike in disqualifications)
- Revenue pipeline forecast (open needs × package value)
- Meta campaign cost-per-driver analysis

**Autonomy level:** ANALYZE AND REPORT. Sends scheduled reports to founder email. Never modifies data. Never makes decisions.

**Tools:**
- Claude API (Haiku for data summarization, Sonnet for narrative)
- Supabase read-only access
- Resend or Gmail (send weekly report)
- Vercel Cron (scheduling trigger)

**Human gate:** Report is informational. Any action based on the report requires founder decision.

---

### Agent 6: Operator / Orchestrator Agent

**Purpose:** Coordinate the other agents, manage the approval queue lifecycle, detect blocked or stalled workflows, surface alerts to the founder, and maintain a unified audit trail of all agent-generated actions.

**Build phase:** 2 — After Phase 1 agents are operational, the coordination layer becomes necessary. In Phase 1, each agent is triggered independently and outputs are reviewed ad hoc. In Phase 2, volume and complexity require a single agent that knows the state of all pending outputs.

**Trigger modes:**
- Scheduled (every 15 minutes): scan `pending_actions` for items requiring attention
- Event-driven: new agent output written to `agent_outputs` table
- Event-driven: approval queue item status changes (approved / rejected / expired)
- On-demand: founder asks "what is waiting for my review?"

**Inputs:**
- `pending_actions` table — all agent outputs awaiting human decision
- `agent_outputs` table — structured outputs from all agents
- `system_actions` audit log — history of completed and failed actions
- `company_needs`, `shortlists` — pipeline state for blocked workflow detection
- Agent health metrics (last run timestamp, error count, last output quality)

**Outputs:**
- Cockpit notification: "3 items waiting for your approval" with prioritized list
- Blocked workflow alert: "This introduction has been pending approval for >4 hours — SLA at risk"
- Retry trigger: re-invokes a failed agent call after transient error
- Daily digest to founder: summary of all pending items, approved items, and failures from last 24 hours
- Expiry notices: items that have exceeded their approval SLA and require escalation
- Agent health report: which agents ran, which produced output, which failed or produced no output

**Autonomy level:** COORDINATE AND ALERT. The Orchestrator never takes actions that require human authorization. It routes, surfaces, retries, and reports. All external effects (send SMS, post content, share driver profile) remain gated on human approval.

**Tools:**
- Supabase (read/write to `pending_actions`, `agent_outputs`, `system_actions`)
- Resend or Gmail (deliver approval queue digests and SLA alerts)
- Claude API (Haiku for routing decisions; Sonnet for digest summarization)
- n8n (Phase 2 trigger mechanism for scheduled scans)

**Human gate:** The Orchestrator itself does not require human approval to run — it is a coordination utility. All actions it surfaces to humans are gates on the actions of other agents, not on the Orchestrator's own behavior.

**What the Orchestrator does NOT do:**
- It does not approve its own items
- It does not modify driver records or shortlists
- It does not trigger outreach without a prior human approval being on record
- It does not retry a permanently failed action more than 3 times without alerting the founder

---

### Agent 7: Cockpit AI Assistant (Conversational)

**Purpose:** Allow the founder/recruiter to ask natural language questions about the pipeline and get structured, data-backed answers without needing to write SQL.

**Trigger modes:**
- On-demand (founder types a question in cockpit)

**Examples of queries:**
- "How many HIGH priority CE drivers registered this week?"
- "Which UTM source is bringing the best-quality drivers?"
- "What is the current pipeline value if all open needs were filled?"
- "Show me drivers in Stockholm who are available now but not yet introduced to any company."

**Inputs:**
- Supabase (read-only, query executed based on natural language)
- system_actions log
- Previous conversation context

**Outputs:**
- Structured answer with numbers and context
- Optional: table or list of relevant records
- Optional: suggested next action (for founder to decide on)

**Autonomy level:** ANSWER ONLY. No writes. No actions. Pure information retrieval and synthesis.

**Tools:**
- Claude API (Sonnet with tool use for Supabase queries)
- Supabase MCP or direct read-only API access

**Human gate:** Answers are informational. All actions remain human-initiated.

---

## Data Flow Between Agents

```
Demand Intelligence Agent
  ↓ research reports
Founder reviews → authorizes outreach prep
  ↓ authorization
Communication Agent (draft outreach)
  ↓ draft
Founder approves → sends

Acquisition Agent
  ↓ copy variants
Founder reviews → publishes organically
  ↓ registration (driver clicks link)
/chat intake → Driver Pipeline (deterministic)
  ↓ classification, scoring, ingestion
Match Explanation Agent
  ↓ introduction draft
Recruiter approves → Communication Agent sends

Performance Agent
  ↓ weekly reports
Founder reviews → adjusts strategy
  ↓ strategy direction
Acquisition Agent (next cycle)
```

---

## Orchestration Architecture

### Phase 1: Direct invocation (no orchestration layer)

Each agent is called directly via Claude API, triggered by Vercel Cron, webhook, or on-demand from the cockpit. Agents do not communicate with each other. All data flows through Supabase. Approval queue management is handled manually — the founder checks the cockpit.

This is the correct starting point. Build it first. Orchestration complexity before multiple agents are running is premature.

### Phase 2: Operator/Orchestrator Agent + n8n

Once Phase 1 agents are operational (4 agents running, approval queue growing), introduce two complementary layers:

**n8n (workflow automation):**
- Manages trigger scheduling (replaces Vercel Cron for multi-step workflows)
- Routes webhooks (46elks inbound SMS → Communication Agent → pending_actions)
- Handles inter-agent data passing (Demand Agent output → Orchestrator → approval queue)
- Provides retry logic for transient API failures with configurable backoff

**Operator/Orchestrator Agent (AI coordination layer):**
- Reads the current state of `pending_actions` and `agent_outputs`
- Reasons about which items need founder attention, which are blocked, which have expired SLAs
- Generates the daily approval queue digest
- Detects blocked workflows that n8n's rule-based logic cannot identify
- Surfaces prioritized action items to the cockpit

n8n handles deterministic routing. The Orchestrator Agent handles judgment-based coordination. They are complementary, not duplicates.

### Phase 3+: Extended orchestration

After the Phase 2 layer is validated, consider:
- Multi-agent chains where output from Agent A is automatically passed to Agent B after human approval
- Orchestrator managing creative bank refresh cycles end-to-end
- Company research pipeline: Demand Agent → Orchestrator → approval queue → Communication Agent (draft) → Founder sends

Do not design the Phase 3 orchestration layer until Phase 2 reveals what the actual bottlenecks are.

---

## Agent Memory Architecture

Agents need persistent context to be effective. Two memory approaches:

**Structured memory (Supabase):**
- Agent outputs stored in dedicated tables (`agent_outputs`, `pending_actions`, `research_reports`, `creative_bank`)
- `pending_actions` holds approval queue items: output type, content, status, SLA deadline, created_at, resolved_at, resolved_by
- Queryable, auditable, version-controlled
- Recommended for all structured agent outputs

**Conversational memory (rolling context):**
- Cockpit AI assistant uses conversation history from the current session
- No long-term memory needed for simple Q&A

**File-based memory (for creative bank):**
- Creative bank lives as Markdown files in `docs/business/`
- AI reads and writes these files
- Git provides version history

Do not implement a vector database or embedding-based memory until there is a clear use case that structured memory cannot solve. Premature vector stores are a common over-engineering trap.

---

## Failure Modes and Resilience

| Agent | Failure mode | Mitigation |
|-------|-------------|------------|
| Acquisition Agent | Generates off-brand or compliance-violating copy | Human review gate before any publish. Brand rules in system prompt. |
| Demand Intelligence Agent | Scrapes stale or incorrect data | Confidence scoring on outputs. Human validation before acting. |
| Communication Agent | Auto-responds to a sensitive query | Hard classification: GDPR / complaint / commercial → always route to human. |
| Match Explanation Agent | Generates inaccurate match explanation | Recruiter reviews explanation before it appears in any external communication. |
| Performance Agent | Anomaly detection false positive | Report is informational. Founder investigates before acting. |
| Orchestrator Agent | Misclassifies urgency of a pending item | Items are surfaced for human review — not acted on. Urgency misjudgment means a notification arrives at the wrong priority, not that the wrong action is taken. |
| Cockpit Assistant | Returns incorrect data | Always show source query. Founder can verify against Supabase directly. |

**General rule:** All agent outputs that trigger external actions (send SMS, send email, publish content, spend money) must pass through a human approval gate before execution. Agent failure should never produce an autonomous harmful external action.

---

## Infrastructure Requirements

| Component | Tool | Phase | Notes |
|-----------|------|-------|-------|
| AI backbone | Claude API (Anthropic) | Phase 1 | Sonnet for most tasks; Haiku for classification; Opus for strategic analysis |
| Secondary AI | OpenAI GPT-4o | Phase 2+ | Fallback for specific tasks where Claude is rate-limited |
| Orchestration | n8n (self-hosted or cloud) | Phase 2 | Handles deterministic routing, scheduling, and retries |
| Orchestrator Agent | Claude API (Haiku + Sonnet) | Phase 2 | AI coordination layer: approval queue management, SLA alerts, digest |
| Database | Supabase | Now | Already in use |
| SMS | 46elks | Phase 1 (after setup) | Already selected |
| Email (transactional) | Resend | Phase 1 | Simple API, generous free tier, excellent deliverability |
| Email (outbound sales) | Gmail + MCP | Phase 2 | Only after legal review of outreach approach |
| Browser automation | Playwright MCP | Phase 2 | For demand research agent |
| Monitoring | Sentry | Phase 1 | Already in stack |
| Invoicing | Fortnox | Phase 2 | Standard Swedish accounting |
| Scheduling | Vercel Cron + n8n | Phase 1 / 2 | Vercel Cron for simple scheduled tasks; n8n for complex multi-step |
| Meta integration | Meta Conversions API | Phase 3 | After cookie consent + legal confirmation |

---

*Version 1.1 — 2026-05-16 — Added Operator/Orchestrator Agent (Phase 2). Updated architecture diagram. Clarified two-layer Phase 2 orchestration (n8n + Orchestrator Agent). Added pending_actions to data layer and memory architecture.*
