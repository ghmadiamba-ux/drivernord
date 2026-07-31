# DriverNord — Agentic Architecture Executive Summary

**Date:** 2026-05-16
**Status:** Architecture document. No implementation. No live connections.
**Purpose:** Synthesize the full agentic OS analysis into a single decision-ready document for the founder. Includes explicit evaluation of the proposed 10-agent roster.

---

## What This Analysis Covers

Six supporting documents establish the full architecture:

| Document | What it answers |
|----------|----------------|
| `automation-vs-agent-map.md` | For each pipeline area: automation, AI agent, hybrid, or human-only? |
| `driverNord-agentic-architecture-v1.md` | How agents, humans, and systems interact as a whole |
| `recommended-agent-roster.md` | Which agents to build, in what order, with what specs |
| `tools-and-software-recommendations.md` | Which tools to use for each function |
| `human-approval-and-risk-gates.md` | Where humans must remain in the loop and why |
| `implementation-roadmap.md` | What to build when, and what never to build |

This document summarizes the findings and resolves the specific agent roster question.

---

## The Core Architectural Decision

DriverNord operates two fundamentally different zones:

**Zone 1 — Driver Pipeline (supply side)**
The chat intake, classification, scoring, and matching engine is **deterministic and must remain so**. Rules-based logic protects GDPR compliance, ensures audit trails, and prevents inconsistent driver treatment. LLMs have no role in the core qualification or matching rules — only at the edges (explanation, communication, enrichment).

**Zone 2 — Growth and Intelligence Layer (demand side)**
Market research, creative production, performance analysis, and company outreach are inherently unstructured. This is where AI agents create real leverage. Humans retain control over spend, outreach initiation, and external publishing.

**The boundary between zones is the matching engine.** AI can explain and present a match. AI cannot make or modify a match decision.

---

## Explicit 10-Agent Roster Evaluation

The following evaluates each proposed agent against DriverNord's actual needs, current stage, and build-versus-automate test.

---

### 1. Driver Acquisition Agent

**Decision: KEEP — Build in Phase 1. Rename "Creative and Acquisition Agent".**

This is the highest-leverage Phase 1 agent. DriverNord has no creative production capacity without it. The acquisition funnel depends entirely on Facebook/Instagram content, and manually writing 5 copy variants per angle per week is not sustainable.

**What it does:** Generates organic post copy, ad copy variants, Canva production briefs, and campaign structure recommendations. Analyzes Meta Insights exports to identify winning angles and fatiguing creatives. Updates the creative bank.

**What it does NOT do:** Publish content. Launch campaigns. Spend money. Any of these require founder action.

**Implementation:** `lib/agents/creativeAgent.ts` + file system write to `docs/business/meta-acquisition-integration/creative-bank/`. On-demand and weekly scheduled trigger.

---

### 2. Driver Qualification Agent

**Decision: CONVERT TO AUTOMATION — Do NOT build as an AI agent.**

Driver qualification is already implemented as a deterministic rules engine in `lib/classifyLead.ts` and `lib/scoreDriver.ts`. It is fast, auditable, legally clean, and correct. Replacing or wrapping it in an AI agent would introduce:
- Non-determinism in a legally sensitive classification process
- Slower processing
- Unpredictable behavior that could misclassify GDPR consent eligibility
- An audit trail that cannot be trusted in a regulatory dispute

The only AI-appropriate addition here is the **Match Explanation Agent** — which explains a match that was already made by the deterministic engine. The qualifier itself stays deterministic.

**Build status:** Already built. Do not modify with AI.

---

### 3. Data Enrichment Agent

**Decision: POSTPONE — Do not build in Phase 1 or Phase 2.**

Data enrichment adds value only when the driver database has enough records to justify the enrichment cost and when there are specific enrichment gaps the current schema cannot fill. At launch, the driver profile is sufficient for matching (license, YKB, region, availability, shift preference). There is no identified enrichment need that justifies a dedicated agent.

**When to reconsider:** If the database grows beyond 100 drivers and recruiters identify specific data gaps (e.g., vehicle type experience, employer history) that cannot be collected in the chat flow. At that point, a lightweight enrichment step (public LinkedIn lookup, phone validation) could be added.

**Do not build speculatively.** An enrichment agent with nothing to enrich wastes token cost and adds operational complexity.

---

### 4. Matching Agent

**Decision: CONVERT TO AUTOMATION for core matching — Build AI explanation layer as Phase 1 agent (Agent 4: Match Explanation Agent).**

The matching algorithm (`buildShortlist()`) is correctly implemented as deterministic weighted scoring. It must stay that way for the same reasons as the Qualification Agent: GDPR auditability, legal defensibility, and consistency.

The AI opportunity is in **explaining and presenting** the match output — not in generating the match itself. This is the Match Explanation and Introduction Agent:

- Reads shortlist entries + driver profile + company need
- Generates 1–2 sentence match explanation for recruiter cockpit
- Drafts company introduction and driver notification for recruiter review
- Never modifies the match score or shortlist order

**Build status:** Core matching is already built. Match Explanation Agent is Phase 1 build.

---

### 5. Company Demand Research Agent

**Decision: KEEP — Build in Phase 2. Called "Demand Intelligence Agent".**

This is a high-value Phase 2 agent, but it has a hard prerequisite: **≥5 qualified drivers must exist in the database before any company research begins.** Researching companies before supply exists wastes opportunities (you cannot follow up a prospect who asks about drivers if you have none to offer).

**What it does:** Monitors Arbetsförmedlingen/Jobtech API, Blocket Jobb, and company websites for CE/C/D driver demand signals. Scores companies by demand urgency, recency, and SME profile. Produces weekly "top 5 outreach candidates" report for founder review.

**What it does NOT do:** Contact companies. Create company records. Initiate outreach. All outreach remains founder-initiated.

**Legal prerequisite:** Confirm Jobtech API terms allow commercial use before activating. All scraping restricted to public pages with no authentication requirement.

---

### 6. Operator / Founder Cockpit Agent

**Decision: KEEP — Build in Phase 2. Called "Cockpit AI Assistant".**

The cockpit assistant eliminates the need for manual SQL queries when the founder wants to understand pipeline state. It is pure information retrieval — no writes, no actions, no external effects.

**What it does:** Accepts natural language questions in Swedish or English ("How many HIGH priority CE drivers registered this week?"), generates a read-only Supabase SELECT via Claude tool use, and returns a formatted natural language answer.

**Why Phase 2 and not Phase 1:** Phase 1 has only a handful of drivers. SQL queries are simple and the founder can read them directly. The cockpit assistant becomes valuable when the database is complex enough that natural language is faster than SQL. That complexity emerges in Phase 2.

**Security requirement:** Executes via a read-only Supabase service role key. No INSERT, UPDATE, DELETE. All queries logged.

---

### 7. Support & Customer Success Agent

**Decision: MERGE with Communication Triage Agent — Build as single agent in Phase 1.**

Support and customer success for DriverNord is inbound communication handling: email to `hej@drivernord.se`, inbound SMS, and (eventually) social media DMs. There is no distinction between "support" and "customer success" at the current stage — they are the same problem: classifying and routing inbound messages.

The Communication Triage Agent handles this entirely:
- Reads inbound email and SMS
- Classifies intent (7 categories)
- Auto-drafts Gmail responses for FAQ intents (founder reviews before sending in Phase 1; auto-sends in Phase 2 after validation)
- Escalates GDPR requests, complaints, and commercial inquiries to founder immediately

**Do not build a separate "Customer Success Agent."** At current scale, the founder is customer success. The agent's role is to remove triage friction, not to replace relationship-building.

---

### 8. Growth, Social Media & Creative Strategist Agent

**Decision: MERGE with Driver Acquisition Agent — They are the same agent.**

The "Growth, Social Media & Creative Strategist" and the "Driver Acquisition Agent" described in the roster perform identical functions: generate acquisition content, analyze performance, recommend creative strategy, and support the organic and paid content pipeline.

Building two separate agents for this function would duplicate system prompts, split the creative bank context, and create coordination overhead with no benefit.

**Merged implementation:** The Creative and Acquisition Agent (Agent 1 in the roster) covers all of this:
- Organic Facebook/Instagram post generation (social media function)
- Ad copy variants for paid campaigns (growth function)
- Performance analysis and angle recommendations (strategist function)
- Creative bank maintenance (system memory function)

One agent, one system prompt, one context window, one build task.

---

### 9. Reporting & Intelligence Agent

**Decision: KEEP — Build in Phase 1. Called "Performance and Reporting Agent".**

This is the founder's operational visibility layer. Without it, understanding pipeline state requires manual Supabase queries. The reporting agent delivers a weekly email summary with metrics, narrative, and flagged anomalies — requiring zero manual SQL.

**What it does:** Runs every Monday at 07:00 Europe/Stockholm via Vercel Cron. Queries all Supabase tables (read-only). Generates a 7-number metrics table, a 150–300 word AI narrative, and a top-3 action items list. Detects anomalies (zero registrations for 48h, disqualification spike, etc.).

**What it does NOT do:** Make decisions. Modify data. Take actions. The report is informational; all decisions remain with the founder.

**Model choice:** Haiku for data summarization (cheap, fast); Sonnet for the narrative paragraph (higher quality).

---

### 10. Legal/GDPR Guardrails Agent

**Decision: CONVERT — Not a standalone agent. Two separate implementations required.**

"Legal/GDPR Guardrails" is not one thing — it has two completely different implementations:

**Part A — Runtime compliance enforcement (CONVERT TO AUTOMATION):**
GDPR consent capture, STOPP opt-out processing, and data handling rules must be deterministic automations, not AI agents. These are already implemented (`lib/applyStep.ts` consent enforcement, STOPP detection). An AI agent cannot be trusted to make GDPR compliance decisions in real-time. Deterministic code is the only appropriate implementation.

**Part B — Regulatory monitoring (KEEP but Phase 3 — Legal Compliance Monitor):**
Monitoring IMY, EUR-Lex, and EDPB for regulatory changes affecting DriverNord is a legitimate AI task. This is low-frequency (weekly scan), informational (never takes action), and well-suited to an AI that reads and summarizes regulatory publications. It is Phase 3 because it adds no value before the first paying client — at that point, compliance exposure becomes material.

**What it does NOT do:** Interpret law. Advise on legal strategy. Provide compliance guarantees. Every output carries the mandatory caveat: "REQUIRES LAWYER REVIEW BEFORE ACTION."

---

## Consolidated Roster Decision Table

| # | Agent Name (as proposed) | Decision | Phase | Maps to |
|---|--------------------------|----------|-------|---------|
| 1 | Driver Acquisition Agent | **KEEP** | 1 | Creative and Acquisition Agent |
| 2 | Driver Qualification Agent | **CONVERT TO AUTOMATION** | Already built | `lib/classifyLead.ts`, `lib/scoreDriver.ts` |
| 3 | Data Enrichment Agent | **POSTPONE** | 3+ | Only when >100 drivers and specific gap identified |
| 4 | Matching Agent | **CONVERT TO AUTOMATION** (core) + **KEEP** (explanation) | Already built (core) / Phase 1 (explanation) | `buildShortlist()` + Match Explanation Agent |
| 5 | Company Demand Research Agent | **KEEP** | 2 | Demand Intelligence Agent |
| 6 | Operator/Founder Cockpit Agent | **KEEP + EXPAND** | 2 | Cockpit AI Assistant + **Operator/Orchestrator Agent** (separate) |
| 7 | Support & Customer Success Agent | **MERGE** with Communication Triage | 1 | Communication Triage Agent |
| 8 | Growth, Social Media & Creative Strategist | **MERGE** with Driver Acquisition Agent | 1 | Creative and Acquisition Agent |
| 9 | Reporting & Intelligence Agent | **KEEP** | 1 | Performance and Reporting Agent |
| 10 | Legal/GDPR Guardrails Agent | **SPLIT**: runtime → AUTOMATION; monitoring → Phase 3 | Now (runtime) / Phase 3 (monitor) | `lib/applyStep.ts` + Legal Compliance Monitor |

**Result:** 10 proposed agents → 4 independent agents (Phase 1) + 3 agents (Phase 2, including new Orchestrator Agent) + 1 monitor (Phase 3). Three agents converted to existing automation. Two merged into one. One postponed. The Operator/Founder Cockpit concept expanded into two distinct Phase 2 agents: the Cockpit AI Assistant (query answering) and the Operator/Orchestrator Agent (approval queue management and coordination).

---

## Phase 1 Build List (Finalized)

These are the only 4 agents to build in Phase 1, in parallel after Phase 0 (pipeline operational):

| Agent | Files | Est. build time |
|-------|-------|-----------------|
| Creative and Acquisition Agent | `lib/agents/creativeAgent.ts`, `/api/agent/creative/route.ts` | 3–5 days |
| Performance and Reporting Agent | `lib/agents/performanceAgent.ts`, `/api/agent/weekly-report/route.ts` | 3–5 days |
| Communication Triage Agent | `lib/agents/communicationAgent.ts`, `lib/gmail.ts`, `/api/agent/triage/route.ts` | 4–6 days |
| Match Explanation Agent | `lib/agents/matchExplanationAgent.ts`, migration 014 | 2–3 days |

**Total Phase 1 build time:** 2–3 weeks (all 4 can be built in parallel).

## Phase 2 Build List

Three agents to build in Phase 2, after Phase 1 agents are validated:

| Agent | Files | Est. build time | Prerequisite |
|-------|-------|-----------------|--------------|
| Operator / Orchestrator Agent | `lib/agents/orchestratorAgent.ts`, `/api/agent/orchestrate/route.ts`, migration 015 (`pending_actions` table) | 3–5 days | Phase 1 agents running and producing output |
| Cockpit AI Assistant | Chat UI in `/recruiter`, `lib/agents/cockpitAgent.ts` | 4–6 days | Mature driver database |
| Demand Intelligence Agent | `lib/agents/demandAgent.ts`, Jobtech API integration, `research_reports` table | 5–7 days | ≥5 drivers in database; legal review of data sources |

**Social media publishing evolution (Phase 2):** When the Orchestrator Agent and Meta Graph API integration are live, the approval queue for content publishing (AQ-03) gains a "schedule for publish" action — founder approves and sets a publish time, system publishes automatically. The approval gate remains; only the post-approval step changes from manual to automated.

---

## What the Founder Needs to Do First (Phase 0)

No agent is worth building until the pipeline is operational. Phase 0 blocks are:

| Blocker | Owner | Est. time |
|---------|-------|-----------|
| Apply migration 013 to production Supabase | Founder | 10 min |
| Configure 46elks SMS credentials | Founder | 30 min |
| Confirm `hej@drivernord.se` monitoring | Founder | 10 min |
| Authorize production deployment | Founder | Decision |
| Verify Facebook Page created | Founder | 2–4 hours |
| Commission GDPR lawyer review | Founder | External |

**Until Phase 0 is complete, agent development is the wrong priority.** An agent built on a non-operational pipeline produces no value.

---

## What NOT to Build (at any phase)

| Item | Decision |
|------|----------|
| Driver Qualification as AI agent | NEVER — use deterministic rules |
| Matching as AI agent | NEVER for core matching — AI for explanation only |
| Autonomous ad campaign management | NEVER — financial decisions require human |
| Autonomous GDPR decision-making | NEVER — deterministic enforcement only |
| Custom vector database | NOT NOW — Supabase pgvector if ever needed |
| Custom LLM or fine-tuned model | NOT NOW — no training data volume to justify |
| Voice interface | NOT RELEVANT at current stage |
| Mobile app | NOT RELEVANT — web cockpit is sufficient |
| Data Enrichment Agent | NOT YET — no identified gap at current driver volume |

---

## Founder Time Commitment at Launch

The agentic OS is designed to fit in under 2 hours of founder attention per week:

| Activity | Frequency | Time |
|----------|-----------|------|
| Review organic content drafts | 2–3×/week | 5 min each |
| Review weekly pipeline report | Weekly | 10 min |
| Review HIGH priority driver alerts | As needed | 2 min each |
| Approve driver introduction drafts | Per match | 15 min each |
| Review and approve company outreach | Per outreach | 20 min each |

All other agent actions are either automated (STOPP opt-out, registration SMS confirmation, daily metrics snapshot) or batched into the weekly report.

---

## Recommended Next Step

**Phase 0 is the bottleneck.** Claude Code cannot unblock Phase 0 — it requires founder action on production systems.

While Phase 0 is being actioned:

1. Claude Code can build Agent 1 (Creative and Acquisition Agent) and Agent 2 (Performance and Reporting Agent) against the local development environment — they require no 46elks, no production Supabase writes, and no external webhooks.

2. The creative bank file structure can be initialized immediately (`docs/business/meta-acquisition-integration/creative-bank/`) with the first 6 angle files ready for Agent 1 to read.

3. Migration 014 (`add_ai_explanation_to_shortlist_entries`) can be written and tested locally before production Supabase is authorized.

**The single highest-priority action:** Founder authorizes production deployment (Phase 0, HG-03). Everything else is blocked or limited without a live pipeline.

---

*Version 1.1 — 2026-05-16 — Added Operator/Orchestrator Agent to Phase 2. Added Phase 2 build list. Updated roster decision table. Added social media publishing evolution note.*
