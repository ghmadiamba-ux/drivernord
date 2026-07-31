# Organic Content Production Workflow

**Date:** 2026-05-16
**Purpose:** Define the exact step-by-step workflow for producing organic social content with the Creative Agent. This is what actually happens each week.
**Scope:** Facebook Page, Instagram, Facebook Groups. Does not cover paid ads (see `meta-ads-preparation-workflow.md`).

---

## Overview

The organic content workflow runs on a weekly cycle. The core loop:

```
Monday 07:00 — Agent runs weekly content plan generation (or founder triggers on-demand)
Monday–Tuesday — Founder reviews drafts in approval queue
Tuesday–Thursday — Founder publishes approved posts manually
Friday — Founder enters performance data from last week
Friday → next Monday — Agent uses data in next generation cycle
```

This cycle is sustainable at 2–4 posts per week. Do not try to run 7-posts-per-day without significant team support.

---

## Phase 0 — Setup (One-time, before first cycle)

These steps are done once before the workflow begins. They are founder actions.

### 0.1 Create the Facebook Page

- Page name: **DriverNord**
- Category: Business service or Human resources company — choose whichever is available; do NOT select "Staffing Agency" (inaccurate and may restrict targeting)
- Profile photo: DriverNord logo
- Cover photo: Professional transport image (truck on Swedish road, no people required)
- About text: Use the text from `facebook-page-and-business-manager-checklist.md`
- URL: `facebook.com/drivernord` (request custom username)

### 0.2 Create the creative bank folder structure

Claude Code creates this structure (no content yet):

```
docs/business/agents/creative-acquisition-agent/creative-bank/
  angles/         ← copies of angle library entries (read-only for agent)
  posts/          ← published and drafted post files
  hooks/          ← hook variant files per angle
  briefs/         ← visual briefs for Canva
  archived/       ← retired angles and posts
  performance-log.md  ← weekly data entry
  content-calendar.md ← active content schedule
```

### 0.3 Set up UTM structure

Add the canonical UTM naming convention to the creative bank:

```
utm_source: facebook | instagram | linkedin | facebook_groups
utm_medium: organic | story | reel | carousel
utm_campaign: driver_acquisition
utm_content: [angle-id]_[version]

Examples:
angle01_frustration_v1
angle02_ce_identity_v1
angle05_not_agency_v2
```

The UTM link always points to `https://drivernord.se/chat?utm_source=...`

### 0.4 Create the performance log template

`creative-bank/performance-log.md` starts as an empty table:

```markdown
# Performance Log

| Date published | Channel | Angle | Format | UTM content | Reach | Engagements | Link clicks | Chat starts | Registrations | High priority | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
```

---

## Weekly Cycle — Step by Step

### Step 1: Founder prepares trigger (Monday morning, 5 min)

The founder opens the terminal or triggers the agent via the API endpoint (Phase 1: Claude Code CLI; Phase 2: cockpit button).

**Trigger input (minimal):**
```
Channel: Facebook Page
Persona: CE (primary)
Week target: Week 21 2026
Special notes: None
```

**Optional enrichment (if founder has specific needs):**
```
Special notes: We got 2 registrations this week, both from angle01.
Test: I want to try angle07 (trust) this week.
Avoid: Do not repeat the "3 minuter" hook — used it last 2 weeks.
```

### Step 2: Agent reads context (automatic, ~30 sec)

The agent reads, in order:
1. `content-angle-library.md` — current angle status and performance scores
2. `creative-bank/performance-log.md` — last 4 weeks of data
3. `creative-bank/content-calendar.md` — what was published recently
4. `creative-bank/posts/` — recent post files to avoid hook repetition
5. `driver-personas-and-pain-points.md` — persona context
6. `approval-gates-and-risk-rules.md` — embedded in system prompt

### Step 3: Agent generates weekly content plan (automatic, ~60 sec)

Output: `creative-bank/content-calendar.md` (updated)

The plan specifies:
- Post 1: day, channel, angle, format, persona target
- Post 2: day, channel, angle, format, persona target
- Post 3 (optional): day, channel, angle, format (experiment)
- Rationale: why these angles were chosen this week
- What to test: the new or experimental element this week

**Example output:**

```markdown
## Week 21 — Content Plan

Post 1 — Tuesday Facebook Page
- Angle: 01 Frustrationen (proven approach)
- Format: Medium-form text post (150–200 words)
- Hook variant: New hook, avoiding "Trött på att skicka in ansökan"
- Rationale: Best-performing angle to date; need a new hook to avoid fatigue

Post 2 — Thursday Instagram
- Angle: 03 Kontrollen (test)
- Format: Short caption + visual brief for static image
- Rationale: Consent angle not yet tested on Instagram; low-cost experiment

Post 3 — Friday Facebook Page (optional — publish if time permits)
- Angle: 07 Förtroendet
- Format: FAQ-style post (objection handling format)
- Rationale: Trust-building post to balance the week
```

### Step 4: Agent generates post drafts (automatic, 2–3 min)

For each post in the plan, the agent generates:

1. **Post draft** — full copy, ready to copy-paste into Meta Business Suite
2. **UTM link** — constructed from naming convention
3. **Hook variants** — 2–3 alternative opening lines the founder can swap in
4. **Visual brief** — Canva brief if the post requires an image (format, dimensions, layout, copy overlay, mood)
5. **Instagram hashtags** — 5–10 relevant Swedish transport hashtags

Each draft is saved to `creative-bank/posts/YYYY-MM-DD--[channel]--[angle-id]--v1.md`

### Step 5: Drafts enter the approval queue

Each post draft creates a `pending_actions` entry:

```json
{
  "action_type": "content_draft",
  "agent_id": "creative-acquisition",
  "content": {
    "post_text": "...",
    "utm_link": "...",
    "channel": "facebook_page",
    "angle_id": "angle01_frustration",
    "format": "text_medium",
    "visual_brief": "..."
  },
  "status": "PENDING",
  "sla_deadline": "48h from creation"
}
```

In Phase 1, the founder sees these in the cockpit or in the `creative-bank/posts/` folder (whichever is implemented first).

### Step 6: Founder reviews drafts (Monday–Tuesday, ~10 min per draft)

For each draft, the founder decides:
- **APPROVE** — copy is good as-is. Publish as scheduled.
- **EDIT and APPROVE** — make minor changes, then approve.
- **REJECT** — not suitable. Add a short note explaining why (helps agent learn).
- **HOLD** — keep for later, not this week.

Founder does NOT need to fix grammar or rewrite entirely. If a draft needs heavy rewriting, that is feedback for the agent (the system prompt or angle needs refinement).

### Step 7: Founder produces visuals (if required, ~20–30 min per image)

If the post requires an image or Reel:
- Founder opens Canva or CapCut
- Reads the visual brief from the draft file
- Produces the image or short video
- Downloads and stores locally

Visual production is 100% manual in Phase 1. The agent provides the brief; the founder produces.

### Step 8: Founder publishes manually in Meta Business Suite

**For Facebook Page posts:**
1. Open [Meta Business Suite](https://business.facebook.com)
2. Go to: Posts & Stories → Create post
3. Copy-paste the approved text
4. Add image/video if produced
5. Add the UTM link in the post body or as a separate link button
6. Schedule for the planned publish time (or publish immediately)
7. Record in `content-calendar.md`: published, scheduled time, final text version

**For Instagram posts:**
1. Same flow in Meta Business Suite (cross-posting or separate)
2. Instagram captions are shorter — use the Instagram-specific draft, not the Facebook version

**Never schedule using third-party scheduling tools** unless the tool is Meta-authorized (Hootsuite, Buffer). Unauthorized schedulers may suppress organic reach.

### Step 9: Founder enters performance data (Friday, ~10 min)

At the end of each week, the founder opens Meta Business Suite Insights and records for each published post:

- Reach
- Engagements (likes + comments + shares)
- Link clicks
- (Optional) Profile visits

And from Supabase (the cockpit or a direct query):
- Chat starts with UTM source matching this week's posts
- Registrations with matching UTM content tag
- Lead priority of those registrations

This data is entered into `creative-bank/performance-log.md` directly.

In Phase 2: The agent reads this data automatically from Supabase (UTM data) and from an imported Meta Insights CSV. The founder still reviews the summary.

---

## Content Format Specifications

### Facebook Page — Text Post

| Element | Spec |
|---------|------|
| Opening hook | 1 line, max 12 words. Must create a reason to read more. |
| Body | 3–6 short paragraphs. Each paragraph 1–3 sentences. |
| CTA | 1 line. Direct action verb. Link on its own line. |
| Total length | 100–250 words (medium-form) or 40–80 words (short-form) |
| Hashtags | 0–3 for Facebook (hashtags are less effective on Facebook than Instagram) |
| Link | Placed at end of post or as a separate comment (test both) |

### Instagram — Caption Post

| Element | Spec |
|---------|------|
| Opening hook | First 125 characters must be compelling (shows before "more" cut) |
| Body | Concise — Instagram captions should be scannable. Use line breaks. |
| CTA | "Länk i bio." — always, since Instagram links are not clickable in captions |
| Hashtags | 5–10 relevant hashtags, placed after the caption text |
| Total length | 80–150 words |

### Facebook Reels / Instagram Reels

| Element | Spec |
|---------|------|
| Duration | 20–45 seconds |
| Opening | First 3 seconds must hook or they scroll past |
| Format | Vertical (9:16), shot on phone acceptable for authenticity |
| Script | 60–90 words of spoken text (~30 seconds at natural pace) |
| Caption overlay | Key message on screen in large text |
| CTA | Spoken + text overlay at end |

### Story Sequence

| Element | Spec |
|---------|------|
| Slides | 3–5 slides per story |
| Duration | 5–7 seconds per slide |
| Format | Vertical (9:16) |
| Text | Large, readable, high contrast |
| CTA slide | Final slide with "Swipe up" or "Link in bio" |

### Facebook Group Posts

Facebook Groups (trucking groups, Swedish transport groups) allow organic posting if:
- The founder is a group member
- Group rules allow business posts (check before posting)
- Content is framed as valuable/informative, not purely promotional

Group post format: Shorter, more conversational. Remove branded elements. Lead with the insight or value, mention DriverNord at the end.

**Do not spam groups.** One relevant post per group per 2–3 weeks maximum.

---

## File Naming Convention

```
posts/
  2026-05-20--facebook_page--angle01_frustration--v1.md     ← PENDING
  2026-05-20--facebook_page--angle01_frustration--v1--APPROVED.md
  2026-05-20--facebook_page--angle01_frustration--v1--PUBLISHED.md
  2026-05-20--facebook_page--angle01_frustration--v1--REJECTED.md

briefs/
  2026-05-20--static_image--angle03_consent--brief.md
  2026-05-22--reels--angle02_ce_identity--brief.md

hooks/
  angle01_frustration--hooks.md   ← all hook variants for this angle
  angle02_ce_identity--hooks.md
```

---

## On-Demand Generation

The founder can trigger the agent at any time (not just Monday) with a specific request:

**Example requests:**
- "Generate 3 Facebook hook variants for angle02 that don't start with 'Du som kör CE'"
- "Write a short Instagram caption for angle04 (low friction), test it with a question hook"
- "Generate a Reels script for a trust-building post — 30 seconds, founder on camera"
- "Give me 5 Swedish hashtags for CE driver content on Instagram"

On-demand requests skip the weekly plan step and go directly to generation → approval queue.

---

## What the Agent Does NOT Do

- Does not publish posts
- Does not schedule posts in Meta Business Suite
- Does not create Facebook Page, Business Manager account, or any Meta asset
- Does not access real-time Meta data (reads imported CSV or manual entries only in Phase 1)
- Does not post in Facebook Groups (founder posts manually after reviewing content)
- Does not write image or video captions in Swedish unless explicitly requested (it always writes in Swedish but assumes the founder will adapt tone if needed)

---

*Version 1.0 — 2026-05-16 — Workflow specification only. No implementation. No live connections.*
