# DriverNord — Recommended Agent Roster

**Date:** 2026-05-16
**Status:** Recommendations only. No implementation. No live connections.
**Purpose:** Define which agents to build, in what order, with what capabilities, tools, and constraints.

---

## Roster Overview

| # | Agent | Value delivered | Build phase | Complexity |
|---|-------|----------------|-------------|------------|
| 1 | Creative and Acquisition Agent | Copy generation, performance analysis | Phase 1 | Low |
| 2 | Performance and Reporting Agent | Weekly pipeline summary, anomaly detection | Phase 1 | Low |
| 3 | Communication Triage Agent | Email/SMS classification and routing | Phase 1 | Medium |
| 4 | Match Explanation Agent | Shortlist explanation, introduction drafting | Phase 1 | Low |
| 5 | Operator / Orchestrator Agent | Approval queue management, SLA monitoring, workflow coordination | Phase 2 | Medium |
| 6 | Cockpit AI Assistant | Natural language pipeline queries | Phase 2 | Medium |
| 7 | Demand Intelligence Agent | Market research, company demand monitoring | Phase 2 | High |
| 8 | Legal Compliance Monitor | Regulatory change monitoring | Phase 3 | Medium |

**Build Phase 1 first.** All four Phase 1 agents can be built as standalone Claude API functions with no orchestration layer. They are independent, low-risk, and deliver immediate value. Do not wait for a "perfect architecture" before building Phase 1.

---

## Agent 1: Creative and Acquisition Agent

**Build phase:** 1
**Priority:** HIGH — unlocks the entire Meta acquisition strategy

### What it does

Generates, manages, and analyzes all driver acquisition content. This is the AI layer on top of the organic content test plan and future paid campaigns.

### Capabilities

1. **Copy generation:** Given a content angle and compliance rules, generates 3–5 Facebook/Instagram post variants with headline, body, and CTA.
2. **Creative bank maintenance:** Updates structured Markdown files with new variants, performance notes, and archived/fatigued content.
3. **Performance analysis:** Given a Meta Insights export or manual metrics, identifies winning angles, flagging fatiguing creatives, and recommends next tests.
4. **Campaign structure recommendation:** Proposes ad set structure (audience, placement, objective, budget) for founder review.
5. **Visual brief writing:** Produces a Canva production brief describing the required image or video.

### System prompt design principles

- Must always include brand compliance rules (no tusentals chaufförer, no staffing language, no guaranteed jobs)
- Must include current creative bank as context (to avoid repetition)
- Must receive performance data as structured input
- Outputs are always in Markdown for structured review

### Tool access

| Tool | Access level | Purpose |
|------|-------------|---------|
| Supabase (read) | `drivers` table — utm_content, count, lead_priority | Correlate registrations to UTM content |
| File system (read/write) | `docs/business/meta-acquisition-integration/creative-bank/` | Read existing copy, write new variants |
| Meta Insights data | Read-only import (CSV or pasted data) | Performance analysis input |
| Claude API | Sonnet (copy generation) | Core generation |

### Constraints

- NEVER posts to Facebook or Instagram autonomously
- NEVER modifies campaign settings in Meta Ads Manager
- NEVER includes real driver data in creative outputs
- All outputs marked "DRAFT — FOUNDER APPROVAL REQUIRED"

### Trigger conditions

- Weekly (Monday morning): refresh creative bank, analyze previous week
- On-demand: founder requests new copy for a specific angle
- Event: founder pastes performance data → agent analyzes and recommends

### Success metric

Time from "I need new ad copy" to founder having 5 reviewed variants: under 10 minutes.

---

## Agent 2: Performance and Reporting Agent

**Build phase:** 1
**Priority:** HIGH — gives the founder operational visibility without manual SQL

### What it does

Aggregates pipeline data, writes a narrative weekly summary, and flags anomalies that require founder attention.

### Capabilities

1. **Pipeline metrics snapshot:** Counts of drivers by status, priority, region, availability, license class.
2. **Funnel analysis:** Conversion rate from chat start → consent → ingestion → shortlisted.
3. **UTM attribution summary:** Which channels and angles are producing the most and highest-quality drivers.
4. **Anomaly detection:** Identifies statistically significant deviations (e.g., sudden drop in HIGH priority drivers, spike in disqualifications, zero registrations for 3+ days).
5. **Revenue pipeline estimate:** Open company needs × package value = addressable revenue if filled.
6. **Weekly narrative:** 150–300 word natural language summary of the pipeline status for the founder.

### Delivery format

Weekly email to founder (Resend or Gmail) containing:
- Key metrics table (7 numbers)
- AI narrative summary
- Top 3 action items (flagged, not decided)
- Link to cockpit for detail

### Tool access

| Tool | Access level | Purpose |
|------|-------------|---------|
| Supabase (read-only) | All tables | Data source |
| Resend or Gmail | Send | Weekly report delivery |
| system_actions (read) | Agent action log | Audit what happened this week |
| Vercel Cron | Trigger | Weekly schedule |
| Claude API | Haiku (data summary) + Sonnet (narrative) | Generation |

### Constraints

- NEVER modifies any database record
- NEVER makes recommendations that would require autonomous action
- Report is informational; all decisions are founder's

### Trigger conditions

- Scheduled: every Monday at 07:00 Europe/Stockholm
- On-demand: founder types "pipeline report" in cockpit

### Success metric

Founder gets full pipeline visibility in under 60 seconds of reading. Zero manual SQL required.

---

## Agent 3: Communication Triage Agent

**Build phase:** 1
**Priority:** HIGH — enables founder to step back from email triage

### What it does

Reads inbound messages (email to `hej@drivernord.se`, inbound SMS), classifies intent, drafts response for appropriate emails, and escalates sensitive topics to the founder.

### Intent classification taxonomy

| Intent class | Auto-respond? | Example |
|-------------|--------------|---------|
| FAQ — how it works | YES (with audit log) | "Hur fungerar DriverNord?" |
| FAQ — driver registration | YES | "Var kan jag anmäla mig?" |
| FAQ — what happens after registration | YES | "Vad händer sen?" |
| Opt-out / STOPP | AUTOMATION (not AI) | "Avregistrera mig" |
| GDPR data request | NO — escalate to founder | "Jag vill ha ut mina uppgifter" |
| GDPR deletion request | NO — escalate to founder | "Radera mina uppgifter" |
| Driver complaint | NO — escalate to founder | "Jag är missnöjd med..." |
| Company inquiry | NO — escalate to founder | "Vi söker CE-chaufförer, hur fungerar..." |
| Commercial complaint / invoice dispute | NO — escalate to founder | Any payment or billing topic |
| Ambiguous / low confidence | NO — route to review queue | Agent confidence < 0.8 |

### Auto-response rules

- Auto-responses are sent only for FAQ intents with confidence ≥ 0.85
- Every auto-response is logged to `system_actions` with intent classification and confidence score
- Auto-response templates are reviewed and approved by the founder before agent is activated
- Response language matches the detected language of the inbound message (sv/en)

### Tool access

| Tool | Access level | Purpose |
|------|-------------|---------|
| Gmail API or Resend (inbound webhook) | Read | Receive emails |
| 46elks webhook | Read | Receive inbound SMS |
| Supabase (read) | `drivers` table | Look up driver by phone |
| Gmail API or Resend (send) | Send (restricted) | FAQ auto-responses only |
| system_actions (write) | Append only | Audit log of all actions |
| Claude API | Haiku (classification) + Sonnet (response draft) | Core AI |

### Constraints

- NEVER auto-responds to any GDPR, complaint, or commercial topic
- NEVER modifies driver records
- NEVER sends a response without logging it to system_actions
- All responses are in the language of the original message
- Opt-out must be handled by deterministic automation (STOPP detection), not AI

### Trigger conditions

- Event-driven: new email received at `hej@drivernord.se`
- Event-driven: new inbound SMS via 46elks webhook

### Success metric

Founder spends zero time on FAQ emails. Zero GDPR or complaint topics are auto-responded to incorrectly.

---

## Agent 4: Match Explanation and Introduction Agent

**Build phase:** 1
**Priority:** MEDIUM — enhances existing matching, not required before first match

### What it does

After `buildShortlist()` produces a ranked list of driver-company matches, this agent generates human-readable explanations of each match and drafts the introduction communication.

### Capabilities

1. **Match explanation (cockpit):** 1–2 sentence explanation of why this driver matches this need. Displayed in the recruiter cockpit next to each shortlist entry.

   *Example:* "SimLeif Johansson holds a CE license with valid YKB, is available immediately, and is based in Stockholm — meeting all of PilotCompany's stated requirements. Score: 98/100."

2. **Company introduction draft:** 3–5 paragraph professional introduction of the driver (or driver group) to the company. References skills, availability, and consent — no personal data beyond what was consented for sharing.

3. **Driver notification draft:** If a match is made and the driver has consented, draft the notification to the driver ("Vi har hittat ett möjligt uppdrag som matchar din profil — vill du gå vidare?").

### Tool access

| Tool | Access level | Purpose |
|------|-------------|---------|
| Supabase (read) | `shortlist_entries`, `ingested_drivers`, `company_needs`, `companies` | Input data |
| system_actions (write) | Append only | Log introduction draft creation |
| Claude API | Sonnet | Generation |

### Constraints

- NEVER includes raw PII in the introduction draft (no last name, no phone, no email)
- Driver introduction uses consented data only (license, YKB, region, availability, shift preference)
- Introduction is always labeled "DRAFT — RECRUITER APPROVAL REQUIRED"
- Recruiter must approve before any communication reaches company or driver

### Trigger conditions

- Event-driven: new shortlist entry created in `shortlist_entries`

### Success metric

Recruiter sees a ready-to-review introduction within 60 seconds of shortlist creation. No manual drafting required.

---

## Agent 5: Operator / Orchestrator Agent

**Build phase:** 2
**Priority:** HIGH once Phase 1 agents are running — without it, the approval queue becomes unmanageable as output volume grows

### What it does

Coordinates the other agents by maintaining the state of all pending agent outputs, surfacing items that require founder attention, detecting workflows that are blocked or approaching SLA expiry, and retrying failed agent calls where safe to do so.

### The problem it solves

In Phase 1, each of the 4 agents deposits outputs into the cockpit approval queue ad hoc. The founder manually checks what is pending. At low volume this works. As output volume grows (more drivers, more company needs, more creative variants), the approval queue becomes a backlog that the founder cannot efficiently prioritize without help. The Orchestrator Agent becomes the cockpit's inbox management layer.

### Capabilities

1. **Approval queue prioritization:** Reads all items in `pending_actions`, ranks by urgency (SLA proximity, action type, blocking dependency), and presents a prioritized list to the founder.

2. **SLA monitoring:** Tracks the deadline for each pending action (e.g., introduction draft SLA = 4 hours). Sends alerts when items are at 50% and 90% of their SLA window.

3. **Blocked workflow detection:** Identifies workflows where a downstream action is blocked because an upstream approval has not been granted. Example: "Driver introduction to CompanyX cannot proceed — match approval (AQ-05) has been pending 6 hours."

4. **Retry coordination:** For agent actions that failed due to transient errors (API timeout, temporary Supabase unavailability), triggers a retry after a configurable backoff. After 3 failed retries, escalates to the founder with full error context.

5. **Daily digest:** Each morning, sends a structured digest to the founder: items approved (yesterday), items rejected, items still pending, items expired without decision, and failed agent actions from the last 24 hours.

6. **Agent health monitoring:** Verifies that each Phase 1 agent ran on schedule. If the weekly report agent did not fire on Monday at 07:00, the Orchestrator alerts the founder within 30 minutes.

### System prompt design principles

- Must have full visibility into `pending_actions` schema and all action types
- Must know the SLA for each action type (introduction: 4h; FAQ draft: 24h; content approval: 48h)
- Must know the retry policy: max 3 retries, exponential backoff (5min → 15min → 45min)
- Must never approve its own items or take actions on pending queue entries
- Outputs are always structured: item type, priority, age, SLA remaining, blocking status

### Tool access

| Tool | Access level | Purpose |
|------|-------------|---------|
| Supabase (read/write) | `pending_actions`, `agent_outputs`, `system_actions` | Queue state management |
| Supabase (read-only) | All other tables | Context for prioritization decisions |
| Resend or Gmail | Send | SLA alerts and daily digest |
| n8n webhook | Trigger | Scheduled queue scan every 15 minutes |
| Claude API | Haiku (routing/prioritization) + Sonnet (digest narrative) | Core AI |

### Constraints

- NEVER approves or rejects items on behalf of the founder
- NEVER sends external communications (SMS, email to drivers or companies)
- NEVER modifies driver records, shortlists, or company needs
- Retry limit: 3 attempts maximum per failed action before escalating
- All Orchestrator actions logged to `system_actions` with `agent_id = 'orchestrator'`

### Trigger conditions

- Scheduled: every 15 minutes (n8n cron)
- Event-driven: new item written to `pending_actions`
- Event-driven: item status changes to APPROVED or REJECTED
- Daily: 07:30 Europe/Stockholm — generate and send daily digest

### Success metric

Founder spends zero time scanning the approval queue to find urgent items. All SLA breaches are caught before they occur. No agent failure goes undetected for more than 30 minutes.

---

## Agent 6: Cockpit AI Assistant

**Build phase:** 2
**Priority:** MEDIUM — quality of life improvement for founder

### What it does

A conversational interface in the recruiter cockpit that lets the founder ask natural language questions about the pipeline without needing to know SQL.

### Example queries and responses

| Query | Response type |
|-------|--------------|
| "Hur många HIGH priority CE-förare har registrerat sig den här veckan?" | Number + breakdown by day |
| "Vilken UTM-källa ger bäst leads?" | Table: UTM content → registrations → HIGH priority count |
| "Visa alla tillgängliga CE-förare i Stockholm som inte har introducerats till något företag ännu" | List of drivers |
| "Vad är pipeline-värdet om alla öppna behov fylls?" | Revenue estimate |
| "Hur många förare har samtyckt men inte ingesterats?" | Number with explanation |

### Tool access

| Tool | Access level | Purpose |
|------|-------------|---------|
| Supabase (read-only) | All tables | Query execution |
| Claude API with tool use | Sonnet | Natural language → SQL → answer |
| system_actions (read) | Agent audit log | "What happened this week?" type queries |

### Constraints

- NEVER writes to the database
- NEVER executes DELETE, UPDATE, or INSERT
- If a query would require a write, responds: "This action requires manual execution or recruiter authorization."
- All SQL executed is logged

### Implementation approach

Use Claude's tool use capability. Define a `query_database` tool that accepts a SQL SELECT statement. Claude generates the SELECT statement from natural language, executes it via Supabase read-only client, and formats the result into a natural language answer.

---

## Agent 7: Demand Intelligence Agent

**Build phase:** 2
**Priority:** HIGH when ready for company outreach — not needed before ≥5 drivers exist

### What it does

Continuously monitors the Swedish transport market for company demand signals, prepares company research packages, and identifies the best potential clients for DriverNord.

### Monitoring sources

| Source | Data extracted | Frequency |
|--------|--------------|-----------|
| Arbetsförmedlingen/Jobtech API | CE/C/D driver job postings by company | Daily |
| Blocket Jobb | CE driver listings, company name, location | Daily |
| Monster.se, Indeed.se | CE driver listings | Weekly |
| Company websites | "Vi söker chaufförer" pages | Weekly |
| Google News (sv) | Transport sector news, company expansions | Daily |
| Transport Gruppen | Industry publications | Weekly |
| Bolagsverket | Company registration, F-skatt status | On-demand |

### Demand signal scoring

| Signal | Score contribution |
|--------|------------------|
| Active CE driver job posting | +40 |
| Multiple postings from same company | +20 per additional |
| Posting is < 7 days old | +15 (recency) |
| Company has 5–50 trucks (SME) | +20 |
| Stockholm/Mälardalen region | +15 |
| Company already in DriverNord system | +0 (known) |

Companies above threshold 60 → flagged to founder as "high priority outreach candidate."

### Tool access

| Tool | Access level | Purpose |
|------|-------------|---------|
| Jobtech API | Read (public API) | Job posting data |
| Playwright MCP | Browser read-only | Public page scraping |
| Brave Search API (or similar) | Read | Web search |
| Claude API | Sonnet | Research synthesis |
| Supabase (read) | `companies` table | Avoid duplicate research |
| Supabase (write) | `research_reports` table (new) | Store research output |

### Constraints

- NEVER contacts companies
- NEVER creates entries in `companies` or `company_needs` without human review
- NEVER scrapes pages that require login or are behind authentication
- Research reports are clearly labeled "UNVERIFIED — REQUIRES HUMAN VALIDATION"

---

## Agent 8: Legal Compliance Monitor

**Build phase:** 3
**Priority:** LOW initially — becomes important at scale

### What it does

Monitors Swedish and EU legal publications for changes relevant to DriverNord's legal exposure: GDPR updates, IMY guidance, EU AI Act requirements, transport sector regulations, and employment law relevant to introduction services.

### Sources monitored

- Integritetsskyddsmyndigheten (IMY) — GDPR guidance and enforcement notices
- EUR-Lex — EU AI Act implementation guidance
- Transportstyrelsen — Transport regulation updates
- Swedish government regulatory publications (riksdagen.se)
- European Data Protection Board (EDPB) opinions

### Outputs

- Weekly scan report: new publications + DriverNord relevance assessment
- Alert: when a change is likely to require DriverNord action (e.g., new GDPR guidance affects consent practices)
- Annual compliance checklist update

### Constraints

- Informational only — never advises on legal interpretation without lawyer review
- All alerts include caveat: "REQUIRES LAWYER REVIEW BEFORE ACTION"

---

## Build Order Rationale

**Build Agents 1 + 2 first.** They are the lowest-risk, highest-impact agents. Agent 1 (creative) unblocks the acquisition strategy. Agent 2 (reporting) gives the founder operational visibility. Both work without orchestration, without external webhooks, and without writing to the production database.

**Build Agents 3 + 4 second.** Agent 3 (communication triage) requires 46elks to be configured first. Agent 4 (match explanation) requires at least one real shortlist to test against.

**Build Agent 5 (Orchestrator) when Phase 1 agents are producing output.** The Orchestrator has nothing to coordinate until the approval queue has real items. Build it in Phase 2 alongside the n8n workflow layer. The Orchestrator and n8n are complementary: n8n for deterministic routing; Orchestrator for judgment-based queue management.

**Build Agents 6 + 7 together in Phase 2.** Cockpit assistant requires a more mature codebase. Demand intelligence requires careful scoping of the scraping approach and legal review of data sources.

**Build Agent 8 last.** Useful at scale, not critical before launch.

---

*Version 1.1 — 2026-05-16 — Added Operator/Orchestrator Agent (Agent 5, Phase 2). Renumbered subsequent agents. Updated build order rationale.*
