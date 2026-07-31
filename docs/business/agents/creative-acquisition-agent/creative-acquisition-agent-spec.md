# Creative & Acquisition Agent — Full Specification

**Date:** 2026-05-16
**Status:** Specification only. No implementation. No live connections.
**Version:** 1.0

---

## Mission

The Creative & Acquisition Agent exists to solve one problem: **DriverNord has no drivers without a steady acquisition pipeline, and building that pipeline manually is not sustainable.**

The agent's job is to generate, organize, test, and improve all content that attracts qualified CE, C, and D drivers in Stockholm and Mälardalen to register on DriverNord. It does this through organic social content first, then paid content later — always with the founder in the approval loop before anything goes live.

**What success looks like:**
A qualified CE driver in Stockholm, ready to work, sees a Facebook post. It speaks to something real in their work life. They click. They register. They appear in the pipeline as a HIGH priority driver. That is the full value chain this agent supports.

**The agent does not:**
- Post anything autonomously
- Launch, modify, or pause ad campaigns
- Contact drivers directly
- Make performance-based financial decisions
- Claim capabilities DriverNord does not have

---

## Agent Identity

| Attribute | Value |
|-----------|-------|
| Agent name | Creative & Acquisition Agent |
| Agent ID | `creative-acquisition` |
| Build phase | Phase 1 |
| Trigger modes | Weekly (Monday content refresh), on-demand (founder requests variants), event-driven (performance data import) |
| Primary model | Claude Sonnet (copy generation); Claude Haiku (classification and routing) |
| Autonomy level | GENERATE AND RECOMMEND — never publishes, never spends |
| Memory type | File-based (creative bank) + Supabase (`agent_outputs`, `pending_actions`) |

---

## Inputs

The agent reads these inputs before generating any output. Missing inputs degrade output quality — the agent must request them before proceeding.

| Input | Source | Required | When used |
|-------|--------|----------|-----------|
| Target persona | `driver-personas-and-pain-points.md` | YES | Every generation task |
| Content angle | `content-angle-library.md` | YES | Every generation task |
| Brand rules | `approval-gates-and-risk-rules.md` | YES | Every generation task (embedded in system prompt) |
| Existing creative bank | `creative-bank/` folder | YES | Avoid repeating angles and hooks |
| Performance log | `creative-bank/performance-log.md` | Preferred | Inform angle prioritization |
| UTM naming convention | `meta-ads-preparation-workflow.md` | YES for links | UTM construction |
| Supabase UTM data | `drivers.utm_content` column | Preferred | Correlate content to registrations |
| Channel spec | Founder-specified at trigger | YES | Format and copy length |
| Week number / date | Current date | YES | Content calendar positioning |
| Founder notes | Free text at trigger | Optional | Custom angle direction |

---

## Outputs

Every output is a draft. No output is published or sent without explicit founder approval.

| Output type | Format | Approval required | SLA |
|-------------|--------|-------------------|-----|
| Facebook post draft | Markdown (hook + body + CTA + link) | YES — AQ-03 | 48h |
| Instagram post draft | Markdown (caption + hashtags) | YES — AQ-03 | 48h |
| Hook variants (3–5 per angle) | Markdown list | YES before use | 72h |
| Short Reels script | Markdown (scene + spoken text + caption) | YES — AQ-03 | 72h |
| Story concept brief | Markdown (slide sequence + copy per slide) | YES — AQ-03 | 72h |
| Carousel concept | Markdown (slide count + copy per slide + CTA) | YES — AQ-03 | 72h |
| Visual brief (Canva) | Markdown (dimensions + layout + text + mood) | YES before production | 72h |
| Video script (CapCut) | Markdown (scene by scene, b-roll notes) | YES before recording | 72h |
| Ad copy variants | Markdown (headline + body + CTA, 3 variants) | YES — AQ-04 | 72h |
| Weekly content plan | Markdown table (date + channel + angle + format) | YES before execution | 48h |
| Performance analysis | Markdown (metrics + interpretation + recommendations) | Informational | N/A |
| Angle recommendation | Markdown (ranked angles + rationale) | Informational | N/A |

---

## Memory Architecture

### 1. Creative bank (file-based, git-versioned)

Location: `docs/business/agents/creative-acquisition-agent/creative-bank/`

```
creative-bank/
  angles/
    angle-01-frustration.md
    angle-02-ce-identity.md
    angle-03-consent-control.md
    angle-04-low-friction.md
    angle-05-no-agency.md
    angle-06-future-availability.md
    angle-07-trust-building.md
    angle-08-objection-handling.md
  posts/
    YYYY-MM-DD--[channel]--[angle-id]--[version].md
  hooks/
    [angle-id]--hooks.md
  briefs/
    YYYY-MM-DD--[format]--[angle-id]--brief.md
  performance-log.md
  content-calendar.md
```

Each post file contains: copy, UTM link, approval status, publish date, channel, and any performance data added after publication.

### 2. Performance log (file-based)

`creative-bank/performance-log.md` — a running markdown table that the founder (or agent) updates after each post:

| Date | Channel | Angle | Format | Reach | Engagements | Link clicks | Chat starts | Registrations | UTM content | Notes |
|------|---------|-------|--------|-------|-------------|-------------|-------------|---------------|-------------|-------|

### 3. Supabase (structured, Phase 2)

When Supabase is connected, the agent reads `drivers.utm_content` to correlate content pieces directly to driver registrations and priority levels. This becomes the ground truth for performance data.

### 4. Agent outputs (Supabase, `agent_outputs` table)

Every generation session is logged: agent ID, output type, model used, tokens consumed, timestamp, and link to the `pending_actions` approval queue item.

---

## Feedback Loop

The agent improves output quality through a weekly learning cycle:

```
1. OBSERVE
   Founder enters last week's performance data into performance-log.md
   (or imports from Meta Insights CSV)

2. EXTRACT
   Agent reads performance log + UTM Supabase data
   Identifies: top-performing angles, bottom-performing angles, hook patterns that work

3. ADAPT
   Agent updates angle library with performance scores
   Promotes high-performing hooks to "proven" status
   Flags low-performing angles as "under-performing — consider retiring"
   Generates next week's content plan weighted toward proven angles

4. TEST
   Each week includes at least one new angle or hook variant
   New tests are clearly labeled as experiments in the content plan

5. SCALE
   After 3 weeks of consistently strong performance, an angle graduates to the paid campaign preparation queue
```

The feedback loop runs weekly on Monday morning — the same trigger as content plan generation.

---

## Tool Access

| Tool | Access level | Purpose |
|------|-------------|---------|
| Claude API (Sonnet) | Write (generate) | Copy generation, analysis, visual briefs |
| Claude API (Haiku) | Write (classify) | Hook classification, compliance check |
| File system (read) | `creative-bank/`, angle library, personas, brand rules | Context for generation |
| File system (write) | `creative-bank/posts/`, `creative-bank/performance-log.md` | Store outputs |
| Supabase (read-only) | `drivers` table (`utm_content`, `lead_priority`, `created_at`) | UTM-to-registration correlation |
| Meta Insights CSV | Read (import) | Performance data input (Phase 1: manual import) |
| `pending_actions` (write) | Supabase | Queue output for founder approval |
| `agent_outputs` (write) | Supabase | Log all generation sessions |

**What the agent does NOT have access to:**
- Meta Ads Manager API (no campaign creation, no spend)
- Meta Graph API for publishing (no autonomous posting)
- Any driver personal data (reads UTM aggregate counts, not individual records)
- Email or SMS sending
- Payment or billing systems

---

## Human Supervision Model

The founder interacts with this agent in three modes:

**1. Weekly production review (Monday, ~30 min)**
- Agent generates weekly content plan and first drafts
- Founder reviews 5–7 posts in the approval queue
- Approves, edits, or rejects each one
- Publishes approved posts manually in Meta Business Suite
- Enters last week's performance data into performance log

**2. On-demand generation (as needed, ~10 min)**
- Founder specifies: "I need 3 hooks for the CE identity angle, Facebook format"
- Agent generates
- Founder reviews immediately or routes to approval queue
- Use case: new campaign prep, fresh content mid-week, angle test

**3. Performance analysis (monthly, ~20 min)**
- Agent produces full analysis: which angles are winning, which are fatiguing, what to test next
- Founder reads analysis and decides strategic direction for next month
- Agent does not make strategy decisions — it surfaces data and recommends; founder decides

---

## System Prompt Design Principles

The agent's system prompt must be loaded with:

1. **Brand rules (embedded, not referenced):** What DriverNord is and is not, forbidden claims, tone guidelines. See `approval-gates-and-risk-rules.md`.
2. **Current creative bank summary:** A digest of existing angles and recent posts so the agent does not repeat hooks that have already been used.
3. **Performance context:** Which angles are currently performing well and which are underperforming.
4. **Target persona:** Which persona is the current generation target.
5. **Channel constraints:** Format rules for the specified channel (Facebook vs. Instagram vs. LinkedIn).

The system prompt is long and largely static — it benefits from Anthropic prompt caching to reduce cost on repeat generation sessions.

---

## Success Metrics

| Metric | Target (Phase 1, weeks 1–4) | How measured |
|--------|---------------------------|-------------|
| Posts published per week | 2–4 organic posts | Manual count |
| Link clicks per post (Facebook) | ≥20 | Meta Insights |
| Chat starts per week | ≥3 | Supabase (chat sessions opened) |
| Driver registrations per week | ≥1 | Supabase (drivers created) |
| HIGH priority registrations per month | ≥2 | Supabase (`lead_priority = HIGH`) |
| Time from "I need copy" to 5 reviewed variants | ≤10 minutes | Founder assessment |
| Agent outputs rejected due to compliance issues | 0 | Approval queue log |

---

## What This Agent Does NOT Replace

- **The founder's judgment** on what to publish. Every post requires human approval.
- **The matching engine**. This agent is upstream of the pipeline — it fills the top of the funnel. What happens after a driver registers is handled by the deterministic pipeline.
- **Visual production**. The agent writes Canva briefs and CapCut scripts, but the founder produces all visuals.
- **Strategy**. The agent recommends. The founder decides direction.

---

*Version 1.0 — 2026-05-16 — Specification only. No implementation. No live connections.*
