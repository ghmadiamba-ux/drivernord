# MVP Implementation Plan — Creative & Acquisition Agent

**Date:** 2026-05-16
**Status:** Plan only. No code written yet. No APIs connected.
**Purpose:** Define exactly what Claude Code builds, in what order, to make the Creative Agent operational. This is the implementation handoff document.

---

## What "MVP" Means Here

The MVP Creative Agent is operational when:

1. The founder can type a request ("Give me 3 Facebook post drafts for the frustration angle, CE persona") and receive production-ready Swedish copy in under 10 minutes
2. The drafts are stored in the creative bank with correct file naming
3. The UTM links are correctly constructed and appended
4. The drafts enter the approval queue (or a simple file-based review equivalent)
5. The performance log exists and the agent reads it before generating new content

**What MVP does NOT include:**
- Supabase `pending_actions` integration (file-based review is sufficient for Phase 1)
- Automatic weekly trigger (on-demand only for MVP)
- Meta Insights CSV import (manual data entry only for MVP)
- n8n orchestration

The MVP is a Claude API function + file system + a single API route. That is all. Complexity is added after the basic loop is validated.

---

## Phase 0 — Prerequisites (Founder Actions, Before Any Code)

These steps cannot be done by Claude Code. They block Phase 1.

| Action | Time estimate | Blocks |
|--------|--------------|--------|
| Create Facebook Page "DriverNord" | 30–60 min | Organic publishing |
| Connect Facebook Page to Business Manager | 15 min | Ad preparation |
| Verify `drivernord.se` is the live production domain | 5 min (already done) | UTM links |
| Confirm `hej@drivernord.se` monitoring is active | 5 min | Comment/DM responses |
| Confirm Supabase production is live (migration 013 applied) | 10 min | UTM attribution from registrations |
| Create `docs/business/agents/creative-acquisition-agent/creative-bank/` folder structure | 5 min (Claude Code does this) | Creative bank reads |

**Exit criterion:** Facebook Page exists and is connected to Business Manager. Production Supabase is live. Founder can see incoming drivers in the cockpit.

---

## Phase 1 — Build the Agent (Claude Code, ~3–5 days)

### Step 1.1 — Create the creative bank folder structure

Claude Code creates all folders and stub files:

```
docs/business/agents/creative-acquisition-agent/creative-bank/
  angles/
    angle-01-frustration.md     ← copy from content-angle-library.md
    angle-02-ce-identity.md
    angle-03-consent-control.md
    angle-04-low-friction.md
    angle-05-not-agency.md
    angle-06-future-availability.md
    angle-07-trust.md
    angle-08-objections.md
  posts/                        ← empty, populated by agent
  hooks/
    angle-01--hooks.md          ← stub
    angle-02--hooks.md          ← stub
    ...
  briefs/                       ← empty, populated by agent
  archived/                     ← empty
  performance-log.md            ← empty table (template)
  content-calendar.md           ← empty table (template)
```

### Step 1.2 — Build the agent function

File: `lib/agents/creativeAgent.ts`

**Function signature:**
```typescript
interface CreativeAgentInput {
  persona: 'ce_experienced' | 'c_flexible' | 'd_bus' | 'passive';
  angle: string;              // e.g., 'angle01_frustration'
  channel: 'facebook_page' | 'instagram' | 'facebook_groups' | 'linkedin';
  format: 'text_short' | 'text_medium' | 'image_caption' | 'reels_script' | 'story_sequence' | 'carousel' | 'ad_copy';
  hookVariants?: number;      // default 3
  founderNotes?: string;      // optional context
  weekNumber?: number;        // for content calendar positioning
}

interface CreativeAgentOutput {
  postDraft: string;          // full copy, ready to use
  hookVariants: string[];     // alternative opening lines
  utmLink: string;            // constructed UTM link
  visualBrief?: string;       // Canva brief if format requires image
  videoScript?: string;       // CapCut script if format is video
  hashtags?: string[];        // for Instagram posts
  filePath: string;           // where the output was saved
  complianceCheck: {
    passed: boolean;
    flags: string[];          // any compliance concerns found
  };
}

async function runCreativeAgent(input: CreativeAgentInput): Promise<CreativeAgentOutput>
```

**Internal logic:**
1. Read and assemble system prompt (brand rules + persona + current creative bank summary + performance log)
2. Call Claude API (Sonnet) with the assembled prompt and input
3. Parse response into structured output
4. Run compliance check (Haiku) — verify no forbidden phrases are present
5. Construct UTM link
6. Write output to creative bank file
7. Write to `agent_outputs` table (if Supabase is live)
8. Return output

### Step 1.3 — Build the system prompt assembly function

File: `lib/agents/creativeSystemPrompt.ts`

The system prompt is assembled dynamically from:
1. **Static core** (brand rules, DriverNord identity, forbidden claims) — always included; benefits from prompt caching
2. **Persona context** — read from `driver-personas-and-pain-points.md`
3. **Angle context** — read from the relevant angle file in `creative-bank/angles/`
4. **Creative bank summary** — last 4 recent posts (titles and hooks only, not full text — keep token count manageable)
5. **Performance summary** — top 3 performing angles and current scores from `performance-log.md`
6. **Channel constraints** — format rules for the specified channel

Total expected system prompt length: 2,000–3,500 tokens. Cacheable.

### Step 1.4 — Build the compliance check function

File: `lib/agents/creativeComplianceCheck.ts`

A separate Claude Haiku call that takes the generated copy and checks it against the forbidden claims list from `approval-gates-and-risk-rules.md`.

Returns:
```typescript
{
  passed: boolean;
  flags: Array<{
    phrase: string;
    reason: string;
    severity: 'ERROR' | 'WARNING';
  }>;
}
```

`ERROR` severity = output should be rejected and regenerated with additional constraints.
`WARNING` severity = flag for founder review; do not auto-reject.

### Step 1.5 — Build the API route

File: `app/api/agent/creative/route.ts`

```typescript
// Protected endpoint — requires recruiter session auth
// POST /api/agent/creative

Request body: CreativeAgentInput
Response: CreativeAgentOutput

// Rate limit: max 10 requests per hour (prevent token runaway)
// Auth: requireRecruiterAuth()
```

This is the endpoint the founder calls from the cockpit (or directly via Claude Code CLI in Phase 1).

### Step 1.6 — Build the weekly content plan function

File: `lib/agents/weeklyContentPlan.ts`

Given: current week number, available angles, performance log data.
Returns: a weekly content plan Markdown document with 3–4 posts specified by day, channel, angle, and format.

This function is called first in the Monday workflow, before any draft generation.

### Step 1.7 — Build the performance analysis function

File: `lib/agents/creativePerformanceAnalysis.ts`

Given: performance log data (read from `performance-log.md`).
Returns: angle scores (per algorithm in `creative-performance-feedback-loop.md`), hook pattern analysis, and a natural language recommendations paragraph.

---

## Phase 2 — First Production Run (Week 1 After Phase 1 Complete)

### What happens in the first run

1. Founder triggers the weekly content plan endpoint (or Claude Code CLI command)
2. Agent generates a 3-post plan for Week 1
3. Agent generates drafts for all 3 posts
4. Founder reviews in the `creative-bank/posts/` folder
5. Founder approves, edits as needed
6. Founder produces visuals (if required) using Canva visual briefs
7. Founder publishes 2–3 posts over the week in Meta Business Suite
8. Founder enters performance data on Friday

### Week 1 targets (realistic, not aspirational)

| Metric | Target |
|--------|--------|
| Posts published | 2–3 |
| Total reach | ≥ 200 (Facebook Page with 0 followers will be low) |
| Link clicks | ≥ 10 total |
| Chat starts | ≥ 1 |
| Driver registrations | ≥ 1 (any priority) |

Week 1 is about learning the workflow, not achieving marketing targets. The goal is to complete one full cycle.

---

## Phase 3 — Iteration and Improvement (Weeks 2–8)

Each week after Phase 1:
- Agent performance improves as it reads more data
- Founder becomes faster at reviewing and publishing
- The most effective angles become clear
- The first "PROVEN" angle is identified (expected: week 4–6)
- Paid campaign preparation begins for the proven angle (expected: week 6–8)

---

## Tests to Write

### Unit tests

- `creativeAgent.ts`: Generates output in expected format for each combination of persona × channel × format
- `creativeComplianceCheck.ts`: Flags all forbidden phrases when present; passes clean copy
- `weeklyContentPlan.ts`: Returns valid plan structure for any week input
- `creativeSystemPrompt.ts`: Assembles prompt within token budget; includes all required sections

### Integration tests

- Full pipeline: trigger → agent reads creative bank → generates → saves to file → compliance check passes
- Compliance rejection: trigger with mock input containing forbidden phrase → check returns ERROR flag
- UTM link construction: correct format for all channel/angle combinations

### What NOT to test

- The quality of Claude's Swedish copy (subjective, not automatable)
- Whether the founder approves a specific post (human judgment)
- Meta platform behavior (outside the system boundary)

---

## Files to Create (Summary)

| File | Purpose |
|------|---------|
| `lib/agents/creativeAgent.ts` | Main agent function |
| `lib/agents/creativeSystemPrompt.ts` | System prompt assembly |
| `lib/agents/creativeComplianceCheck.ts` | Forbidden phrases check (Haiku) |
| `lib/agents/weeklyContentPlan.ts` | Weekly plan generation |
| `lib/agents/creativePerformanceAnalysis.ts` | Performance analysis |
| `app/api/agent/creative/route.ts` | API endpoint |
| `tests/creative-agent.test.ts` | Unit and integration tests |
| `creative-bank/` folder structure | Memory system (files) |

---

## Environment Variables Needed

```bash
# Already required:
ANTHROPIC_API_KEY=...

# No new environment variables needed for the Creative Agent MVP.
# The agent uses file system + Claude API only.
# Supabase integration uses existing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
```

---

## What the Creative Agent MVP Does NOT Build

- Automatic weekly trigger (Phase 2 — add after manual workflow is validated)
- Meta Insights CSV import (Phase 2 — manual entry is sufficient)
- `pending_actions` Supabase integration (Phase 2 — file-based review first)
- n8n integration (Phase 2)
- Social media scheduling automation (Phase 2 feature — requires Meta Graph API)
- Image generation (not in scope — Canva is manual)

---

*Version 1.0 — 2026-05-16 — Implementation plan only. No code written yet.*
