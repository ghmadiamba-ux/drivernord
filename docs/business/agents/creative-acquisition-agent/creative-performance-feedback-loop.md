# Creative Performance Feedback Loop

**Date:** 2026-05-16
**Purpose:** Define how the Creative Agent learns from real performance data, improves its recommendations over time, and avoids wasting effort on angles that do not work.

---

## Why a Feedback Loop

Content generation without measurement is guessing. The Creative Agent starts with hypotheses (angle 01 will resonate because CE drivers are frustrated with slow processes). Those hypotheses must be validated, falsified, or refined by actual behavior data.

The feedback loop converts behavioral data (clicks, registrations) back into better content strategy. Without it, the agent would keep generating from the same angles with no basis for improving.

---

## Data Sources

### Primary sources (what to track)

| Data source | What it measures | Collected by |
|-------------|-----------------|--------------|
| Meta Insights (per post) | Reach, impressions, engagements, link clicks | Founder (manual export or manual entry) |
| Supabase `drivers.utm_content` | Which UTM tag drove each registration | Automatic (already tracked in pipeline) |
| Supabase `drivers.lead_priority` | Quality of registrations per angle | Automatic |
| Supabase chat session start count (by UTM) | How many people started the chat per content piece | Requires UTM to persist through chat flow |
| Approval queue rejections | How many agent outputs the founder rejected and why | `pending_actions` table |
| Founder notes in performance log | Qualitative feedback on tone, resonance, complaints | Manual entry |

### Secondary sources (useful but not critical at Phase 1)

| Data source | What it measures |
|-------------|-----------------|
| Facebook Page follower growth | Awareness build-up over time |
| Comment sentiment | Qualitative signal about how posts land |
| Story completion rate | Did people watch all the way through? |
| Profile visits from posts | Intent signal even if no click |

---

## What the Agent Tracks Per Piece of Content

Every published post file contains a performance section that is filled in after publication:

```markdown
## Performance Data

- Published: 2026-05-20
- Channel: Facebook Page
- Angle: angle01_frustration
- Format: text_medium
- UTM content: angle01_frustration_v1

### Organic Metrics (from Meta Insights — enter after 7 days)
- Reach: 
- Impressions: 
- Engagements: 
- Link clicks: 
- Link click rate (%): 

### Pipeline Metrics (from Supabase — enter after 14 days)
- Chat starts (UTM-attributed): 
- Registrations (UTM-attributed): 
- High priority registrations: 

### Approval
- Status: APPROVED
- Rejection reason (if rejected): N/A
- Founder notes: 
```

---

## The Weekly Learning Cycle

### Friday — Data entry (Founder, ~10 min)

The founder opens Meta Business Suite Insights and for each post published in the last 7 days records: reach, engagements, link clicks into `performance-log.md`.

The founder also checks Supabase (or the cockpit) for UTM-attributed chat starts and registrations from the same period.

**Shortcut for Supabase query:**
```sql
SELECT utm_content, lead_priority, COUNT(*) as count
FROM drivers
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND utm_content IS NOT NULL
GROUP BY utm_content, lead_priority
ORDER BY count DESC;
```

This returns: which UTM content tags drove registrations this week, and at what priority level.

### Monday — Agent processes data before generating new content

Before generating the weekly content plan, the agent reads the performance log and produces a brief internal summary:

```markdown
## Weekly Performance Summary — Week [N]

Top performer: angle01_frustration_v2 (42 link clicks, 2 chat starts, 1 HIGH registration)
Worst performer: angle07_trust_v1 (8 link clicks, 0 chat starts)
New tests: angle03_consent was published for the first time — 24 link clicks, 1 chat start

Angle scores updated:
- angle01_frustration: 8.2/10 → PROVEN
- angle03_consent: 5.1/10 → DEVELOPING (one data point, continue testing)
- angle07_trust: 2.3/10 → UNDERPERFORMING (one data point — test different hook)

Recommendation for this week:
- Lead with angle01 (new hook variant — avoid "Trött på att skicka in ansökan")
- Continue angle03 (different format — try Instagram)
- Retry angle07 with a transparency/behind-the-scenes hook instead of FAQ
```

This summary is shown to the founder before the content plan is generated. The founder can override recommendations.

---

## Angle Scoring Algorithm

Each angle receives a composite score updated weekly:

```
Score = (Link click rate score × 0.40)
      + (Chat start rate score × 0.35)
      + (Registration rate score × 0.25)
```

### Score calculation

**Link click rate score:**
| Link click rate | Score |
|-----------------|-------|
| ≥ 5% of reach | 10 |
| 3–4.9% | 8 |
| 2–2.9% | 6 |
| 1–1.9% | 4 |
| < 1% | 1 |

**Chat start rate score (chat starts per 100 link clicks):**
| Chat starts per 100 clicks | Score |
|---------------------------|-------|
| ≥ 20 | 10 |
| 10–19 | 7 |
| 5–9 | 5 |
| 1–4 | 3 |
| 0 | 0 |

**Registration rate score (registrations per 100 chat starts):**
| Registrations per 100 chat starts | Score |
|----------------------------------|-------|
| ≥ 50 (1 in 2 converts) | 10 |
| 30–49 | 8 |
| 15–29 | 5 |
| 5–14 | 3 |
| < 5 | 1 |

**Note:** In the first 4 weeks, registration and chat start data will be sparse. Until an angle has ≥ 50 link clicks, weight the score only on what is available (link click rate) and label the score as "PRELIMINARY."

---

## What the Agent Learns and Changes

### When an angle is PROVEN (score ≥ 7):

1. Agent generates 3+ new variants with different hooks (avoiding repetition)
2. Agent prepares the angle for paid campaign consideration (see `meta-ads-preparation-workflow.md`)
3. Agent flags the hook patterns that seem to drive the performance for use in other angles

### When an angle is UNDERPERFORMING (score < 4 after ≥ 4 weeks):

1. Agent stops generating new variants in the standard weekly cycle
2. Agent proposes a "rescue test" — one final variant with a significantly different hook or format
3. If rescue test also underperforms, angle is archived and the library notes are updated

### When an angle is DEVELOPING (score 4–6.9):

1. Agent continues generating 1–2 variants per week
2. Agent recommends trying different formats (e.g., same angle as a Reel instead of text post)
3. Agent notes which specific hook variants within the angle performed better

### When a hook consistently outperforms others:

1. Agent adds that hook pattern to a "proven hook patterns" section in the angle file
2. Agent starts applying the pattern to other angles as a variant
3. Example: If questions outperform statements as hooks for CE drivers, that learning transfers

---

## Hook Pattern Learning

The agent tracks performance at the hook level, not just the angle level. Each hook variant that gets published receives a link click rate score. Patterns emerge:

| Hook type | Example | Hypothesis |
|-----------|---------|------------|
| Direct question to persona | "Du som kör CE — vet du vad du är värd?" | High relevance, personal |
| Problem statement | "Rekryteringsprocesser tar för lång tid." | Validation |
| Contradiction | "Vi är inte ett bemanningsbolag. Här är skillnaden." | Curiosity |
| Number claim | "3 minuter. Inga bindningar." | Low-effort framing |
| Industry-specific detail | "CE med YKB och chaufförskort." | Trust signal to professionals |

After 8+ weeks of data, the agent builds a hook pattern performance table and uses it to weight hook selection in new generations.

---

## Rejection Learning

Every time the founder rejects a draft, the rejection reason should be noted (even one word). The agent reads these over time:

| Common rejection reason | What to change |
|------------------------|---------------|
| "Feels like a staffing agency" | Remove any language that implies DriverNord employs drivers |
| "Too corporate" | Simplify language, remove abstract words, add specific details |
| "False promise" | Check that no implicit guarantee of job offers is made |
| "Tone is off" | Review persona document — may be targeting the wrong emotional register |
| "Seen this hook before" | Add hook variant tracking; don't repeat within 4 weeks |
| "Too long" | Reduce to short-form for this channel |

Rejection patterns that appear ≥ 3 times get added to the agent's system prompt as explicit constraints.

---

## Leading Indicators vs. Lagging Indicators

The agent tracks both but weights them differently for in-flight decisions:

| Metric | Type | Availability | Decision use |
|--------|------|-------------|-------------|
| Reach | Leading | 24h | Not used for quality decisions |
| Engagement rate | Leading | 48h | Signal of content resonance |
| Link click rate | Leading | 48–72h | Primary quality signal |
| Chat starts (UTM) | Mixed | 3–7 days | Strong quality signal |
| Registrations (UTM) | Lagging | 7–14 days | Definitive quality signal |
| HIGH priority registrations | Lagging | 7–14 days | Best quality signal |

**Practical implication:** The agent can make preliminary angle assessments after 48–72 hours (link click rate). Full scoring requires 14 days of data. Never retire an angle based on 48-hour data alone.

---

## Monthly Retrospective

Once per month, the Creative Agent produces a full performance retrospective:

1. **Angle performance table** — all angles ranked by composite score
2. **Hook pattern analysis** — which opening line patterns drive best click rates
3. **Format analysis** — which formats (text, image, video, carousel) are performing best
4. **Channel comparison** — Facebook Page vs. Instagram vs. Groups (when data available)
5. **Funnel conversion rates** — link click → chat start → registration → HIGH priority
6. **Cost per driver** — when paid campaigns are running: cost per qualified CE driver
7. **Recommendations** — which angles to scale, which to retire, which new angles to test
8. **System prompt update suggestions** — if the agent is consistently generating off-brand content, which constraints to add

The retrospective is ~500–800 words and is delivered as a draft to the founder for review. The founder decides which recommendations to act on.

---

## What the Agent Does NOT Decide Autonomously

- Which angles to retire (founder decides)
- When to start paid campaigns (founder decides)
- How much to spend on ads (founder decides)
- Whether to change the overall content strategy (founder decides)
- What performance counts as "good enough" (founder calibrates based on business goals)

The agent provides the data, the analysis, and the recommendation. The founder makes every strategy call.

---

*Version 1.0 — 2026-05-16 — Specification only. No implementation. No live connections.*
