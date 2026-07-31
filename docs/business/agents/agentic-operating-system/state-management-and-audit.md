# DriverNord — Agent State Management and Audit Architecture

**Date:** 2026-05-16
**Status:** Architecture document. No implementation. No live connections.
**Purpose:** Define how the system tracks the state of all agent-generated outputs, manages approval queues, handles blocked workflows and retry logic, and maintains a complete audit trail.

---

## Why State Management Matters

Each agent produces outputs that are not immediately consumed. A creative variant sits in a queue until the founder reviews it. An introduction draft waits until a recruiter approves it. A failed API call needs to be retried or escalated. Without explicit state management:

- The founder has no single view of what is waiting for their attention
- Failed actions disappear silently
- SLA commitments to clients cannot be tracked
- The audit trail is incomplete — regulators or clients cannot verify what happened and when

State management is not a feature. It is the connective tissue between agent outputs and human decisions.

---

## State Model Overview

Every agent output that requires a human decision or an external action passes through a state machine:

```
PENDING → APPROVED → EXECUTING → COMPLETED
    │                    │
    ├─→ REJECTED          └─→ FAILED → (retry) → COMPLETED
    │                                │
    └─→ EXPIRED                      └─→ DEAD_LETTER (after max retries)
```

| State | Meaning | Who can transition out |
|-------|---------|----------------------|
| PENDING | Agent has produced output. Awaiting human decision. | Human (approve/reject) or system (expire on SLA breach) |
| APPROVED | Founder/recruiter approved. Awaiting execution. | System (execution begins) |
| EXECUTING | System is performing the authorized action (sending SMS, publishing post, etc.). | System (on completion or failure) |
| COMPLETED | Action successfully executed. Terminal state. | None |
| REJECTED | Founder/recruiter rejected. No action taken. Terminal state. | None (item archived) |
| EXPIRED | SLA deadline passed without human decision. Escalated. | Founder (can reopen and decide) |
| FAILED | Execution attempt failed (API error, delivery failure). Retry scheduled. | System (retry) or human (manual override) |
| DEAD_LETTER | Maximum retries exhausted. Requires manual resolution. | Human only |

---

## Supabase Schema: `pending_actions`

This table is the approval queue and the workflow state store. It is the single source of truth for all agent outputs that require human review or produce external effects.

```sql
CREATE TABLE pending_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type     TEXT NOT NULL,        -- see Action Type Registry below
  agent_id        TEXT NOT NULL,        -- which agent produced this
  content         JSONB NOT NULL,       -- structured output (draft, report, etc.)
  status          TEXT NOT NULL DEFAULT 'PENDING',
  priority        TEXT NOT NULL DEFAULT 'NORMAL', -- URGENT / HIGH / NORMAL / LOW
  sla_deadline    TIMESTAMPTZ,          -- when this item expires if no decision
  retry_count     INTEGER DEFAULT 0,
  max_retries     INTEGER DEFAULT 3,
  next_retry_at   TIMESTAMPTZ,          -- null if not in retry state
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     TEXT,                 -- founder_id or 'system' for automated transitions
  error_log       JSONB DEFAULT '[]',   -- array of error objects from failed attempts
  related_id      UUID,                 -- FK to shortlist_entries, company_needs, etc.
  related_type    TEXT                  -- 'shortlist_entry', 'company_need', 'driver', etc.
);

CREATE INDEX ON pending_actions (status, sla_deadline);
CREATE INDEX ON pending_actions (agent_id, status);
CREATE INDEX ON pending_actions (related_id, related_type);
```

**No PII in `content`:** The `content` JSONB column stores agent-generated text, recommendations, and metadata. It must never store raw driver personal data (name, phone, email). References to drivers use the driver's `id` (UUID), which must be resolved via a separate authenticated query.

---

## Action Type Registry

Each action type has a defined SLA, default priority, and allowed transitions.

| Action Type | Agent | SLA | Priority | Description |
|-------------|-------|-----|----------|-------------|
| `introduction_draft` | Match Explanation | 4 hours | HIGH | Introduction of driver(s) to a company. Recruiter must approve before sending. |
| `driver_notification_draft` | Match Explanation | 4 hours | HIGH | Notification to driver that a match has been proposed. |
| `content_draft` | Creative | 48 hours | NORMAL | Facebook/Instagram post draft. Founder reviews and approves for publishing. |
| `ad_copy_variant` | Creative | 72 hours | NORMAL | Ad copy variants. Founder selects before uploading to Meta Ads Manager. |
| `company_outreach_draft` | Communication | No SLA | NORMAL | Draft first contact email to a company. No outreach before ≥5 drivers. |
| `faq_auto_response` | Communication | N/A | LOG_ONLY | Auto-sent FAQ responses. Logged for audit; no human approval required in Phase 2. |
| `demand_research_report` | Demand Intelligence | 168 hours (1 week) | NORMAL | Weekly company demand signal report. Founder reviews before any outreach prep. |
| `weekly_pipeline_report` | Performance | N/A | LOG_ONLY | Emailed to founder automatically. No approval required. |
| `anomaly_alert` | Performance | 2 hours | URGENT | Statistically significant pipeline deviation. Founder investigates. |
| `scheduled_post` | Orchestrator (post-approval) | Per publish time | HIGH | Approved content awaiting scheduled publish via Meta Graph API. |
| `agent_failure_alert` | Orchestrator | 30 minutes | URGENT | An agent failed to run or produced no output. Founder notified. |

---

## Approval Queue: What the Founder Sees

The cockpit approval queue surfaces all PENDING and EXPIRED items, sorted by priority then SLA proximity. Each item shows:

- **Action type** (e.g., "Introduction Draft")
- **Agent that produced it** (e.g., "Match Explanation Agent")
- **Time pending** (e.g., "2h 14m")
- **SLA remaining** (e.g., "1h 46m remaining" — shown in red when <30 min)
- **Preview** (first 200 characters of the content, or a structured summary)
- **Related record** (e.g., "CE driver match for TruckCo AB")
- **Actions:** Approve / Reject / Edit and Approve / Snooze (extend SLA by 2h, once only)

Items marked URGENT (anomaly alerts, agent failures) appear in a separate "Requires Immediate Attention" section above the main queue.

---

## SLA Monitoring

The Orchestrator Agent runs every 15 minutes and evaluates all PENDING items against their SLA deadline.

### Alert thresholds

| Threshold | Action |
|-----------|--------|
| SLA at 50% elapsed | Item is highlighted in the cockpit queue (no notification sent) |
| SLA at 90% elapsed | Push notification or email alert to founder: "Introduction draft for TruckCo AB expires in 24 minutes" |
| SLA at 100% (expired) | Item status → EXPIRED. Escalation alert sent to founder. Item moves to "Overdue" section in cockpit. |
| EXPIRED item not resolved within 24h | Second escalation. Item added to next daily digest with "OVERDUE — requires decision" flag. |

### SLA suspension

The founder can snooze a single item once (extends SLA by 2 hours). If the item expires again after snooze, it goes directly to EXPIRED without a second snooze option. This prevents indefinite deferral.

---

## Blocked Workflow Detection

Some actions cannot proceed because they depend on a prior action that is still PENDING. The Orchestrator Agent detects these dependency chains and surfaces them explicitly.

### Known dependency chains

| Blocked action | Blocking action | Detection rule |
|----------------|----------------|----------------|
| Driver notification sent to driver | Introduction draft approved (AQ-05) | `driver_notification_draft` PENDING + matching `introduction_draft` PENDING for same `related_id` |
| Scheduled post published | Content approved (AQ-03) | `scheduled_post` PENDING + no APPROVED `content_draft` for same content |
| Company outreach sent | Demand research reviewed by founder | `company_outreach_draft` PENDING + `demand_research_report` still PENDING for that company |

### Blocked workflow alert format

```
BLOCKED WORKFLOW — Action cannot proceed

Blocked: Driver notification to driver #a3f2... (CE, Stockholm)
Waiting on: Introduction draft for TruckCo AB — PENDING for 3h 12m (SLA in 48 min)

The driver cannot be notified until the introduction draft is approved.
→ Review introduction draft [link]
```

---

## Retry Logic

When an agent-generated action fails at the execution stage (e.g., SMS delivery failure, Meta Graph API timeout), the system retries automatically up to the configured maximum.

### Retry schedule (exponential backoff)

| Attempt | Wait before retry |
|---------|------------------|
| 1st retry | 5 minutes |
| 2nd retry | 15 minutes |
| 3rd retry | 45 minutes |
| After 3rd failure | Status → DEAD_LETTER. Founder alert sent. No further automatic retries. |

### What triggers a retry

- HTTP 5xx response from an external API (46elks, Meta Graph API, Resend)
- Supabase connection timeout on a write operation
- Claude API rate limit (429) — retried after the specified `retry-after` header value

### What does NOT trigger a retry

- HTTP 4xx responses (except 429) — these indicate a data or configuration error, not a transient failure. Retrying will not help. Immediately → DEAD_LETTER with error details.
- Claude API generating content that fails a validation check (e.g., compliance rule violation detected by post-generation check) — this requires human review, not a retry.
- Any action that has already been marked APPROVED where the external service confirmed receipt — do not retry confirmed deliveries.

### Dead letter handling

When an item reaches DEAD_LETTER:

1. Orchestrator sends an urgent alert to the founder with full error context (action type, all 3 error responses, timestamps)
2. Item is visible in cockpit under "Requires Manual Resolution"
3. Founder can: Mark as resolved (abandon), trigger a manual retry (one-time override), or escalate for diagnosis
4. All dead letter items are included in the weekly pipeline report for pattern analysis

---

## Agent Output Status: `agent_outputs` Table

In addition to `pending_actions` (which tracks the approval workflow), the `agent_outputs` table records every structured output produced by any agent — regardless of whether it required human approval.

```sql
CREATE TABLE agent_outputs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      TEXT NOT NULL,
  output_type   TEXT NOT NULL,
  content       JSONB NOT NULL,
  model_used    TEXT,             -- e.g., 'claude-haiku-4-5', 'claude-sonnet-4-6'
  tokens_used   INTEGER,
  quality_score FLOAT,            -- optional post-hoc scoring (0.0 to 1.0)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pending_action_id UUID REFERENCES pending_actions(id)
);
```

This table provides:
- **Cost tracking:** `SUM(tokens_used)` per agent per week
- **Output volume:** How many outputs each agent is producing
- **Quality tracking:** If the founder rates outputs (thumbs up/down in cockpit), the score is stored here for prompt tuning
- **Audit trail:** Full history of everything the agents produced, even if never approved

---

## Audit Log: `system_actions` (existing table, extended)

The existing `system_actions` table already logs all agent actions. It should be extended with additional fields to support agent-specific audit requirements:

| Field to add | Type | Purpose |
|-------------|------|---------|
| `agent_id` | TEXT | Which agent performed this action |
| `pending_action_id` | UUID | Link to the approval queue item that authorized this action |
| `model_used` | TEXT | Which LLM model was used (if applicable) |
| `confidence_score` | FLOAT | For classification actions (e.g., Communication Agent intent classification) |
| `approved_by` | TEXT | ID of the human who approved this action (null for autonomous LOG_ONLY actions) |

### What every agent must log to `system_actions`

Every action an agent takes that produces an external effect or writes to any table must be logged. No exceptions. The log entry must include:

1. **What happened** — action type and outcome
2. **Who authorized it** — human approver ID or `'system'` for autonomous actions
3. **What model was used** — for Claude API calls
4. **When it happened** — timestamp
5. **What it produced** — reference to `agent_outputs.id` or the affected record ID

### GDPR-specific audit requirements

For any action involving driver personal data, the audit log entry must additionally record:

- **Consent version** in effect at the time of the action
- **Data scope accessed** — which fields were read (not the values, just the field names)
- **Purpose** — which legal basis applies (consent basis, legitimate interest, etc.)

This is required to demonstrate GDPR Art. 5(2) accountability in the event of a regulatory inquiry.

---

## Weekly Audit Review (Founder)

The Performance and Reporting Agent includes a weekly audit summary in the Monday report:

| Metric | What it shows |
|--------|--------------|
| Actions approved | Count and types of items approved last week |
| Actions rejected | Count and types rejected — pattern may indicate poor output quality |
| Items expired | Items that exceeded SLA without decision — indicates approval queue overload |
| Dead letter items | Failed actions requiring manual resolution |
| Agent outputs produced | Volume by agent — detects if an agent stopped running |
| Auto-actions taken | LOG_ONLY actions (FAQ responses, SMS confirmations) — volume check |
| Top rejection reason | Most common reason for rejection (if rejection notes are captured) |

If dead letter count > 0 or expired count > 3 in a single week, the Orchestrator generates a separate "Audit Health Alert" rather than including it in the standard report.

---

## What State Management Does NOT Cover

| Item | Why excluded |
|------|-------------|
| Driver chat session state | Managed by the existing `useChat` hook and `applyStep` flow. Not agent-generated. |
| Supabase Row Level Security | GDPR access control at the database layer. Separate from agent state. |
| n8n workflow execution logs | n8n maintains its own execution log. Do not duplicate into Supabase. |
| Error monitoring (Sentry) | Infrastructure errors are Sentry's domain. Agent logic errors go into `error_log` in `pending_actions`. |
| Long-term conversation memory | No agent in the current roster needs long-term conversational memory. Rolling session context is sufficient for the Cockpit AI Assistant. |

---

*Version 1.0 — 2026-05-16 — Architecture document. No implementation. No live connections.*
