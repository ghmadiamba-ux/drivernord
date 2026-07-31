# Content & Distribution Engine V1 — Phase 1

**Status:** Internal foundation built — no external publishing connected  
**Scope:** Internal draft generation, planning, and cockpit review  
**Date completed:** 2026-06-24

---

## What was built

Phase 1 creates the internal content planning foundation. It extends the existing Logistikklubb system and does not create a parallel platform.

---

## File inventory

### Core library (all pure — no DB, no I/O)

| File | Purpose |
|------|---------|
| `lib/content/types.ts` | All TypeScript types for content engine |
| `lib/content/pillars.ts` | Pillar taxonomy, rotation functions, weekly slot defaults |
| `lib/content/riskClassifier.ts` | Low/high risk classification for generated text |
| `lib/content/templates.ts` | Swedish content templates for all 10 creative angles |
| `lib/content/memory.ts` | Anti-repetition logic (Jaccard similarity, cooldown rules) |
| `lib/content/campaignCard.ts` | Campaign card creation, validation, lifecycle transitions |
| `lib/content/generator.ts` | Deterministic Swedish draft generation from CampaignCard |
| `lib/content/planner.ts` | Weekly content planner (4-slot Mon/Wed/Fri/Sun schedule) |

### Infrastructure

| File | Purpose |
|------|---------|
| `supabase/migrations/02400000_create_content_campaign_cards.sql` | New table for campaign cards |
| `supabase/migrations/02500000_add_content_memory_to_scheduled_posts.sql` | Extends existing scheduled_posts for anti-repetition history |
| `lib/systemActions.ts` | Extended with 10 content engine action types + 2 target types |

### Cockpit

| File | Purpose |
|------|---------|
| `app/api/admin/content-planner/route.ts` | POST (generate plan), GET (load week), PATCH (update card/feedback) |
| `app/admin/content/page.tsx` | Internal cockpit — weekly plan view, card approval, feedback |

### Tests (all passing)

| File | Tests |
|------|-------|
| `tests/contentTypes.test.ts` | 7 — pillar taxonomy integrity |
| `tests/contentPillars.test.ts` | 15 — rotation, ratio, angle validation |
| `tests/contentRiskClassifier.test.ts` | 14 — pattern detection, card-level risk |
| `tests/contentMemory.test.ts` | 26 — Jaccard, anti-repetition rules, helpers |
| `tests/contentCampaignCard.test.ts` | 20 — validation, creation, lifecycle |
| `tests/contentGenerator.test.ts` | 12 — draft generation, enrichment, length |
| `tests/contentPlanner.test.ts` | 15 — weekly plan generation, summary |

**Total suite: 2215 tests passing across 67 files. Build: clean.**

---

## Content model

### Pillars and target ratios

| Pillar | Target | Slot(s) |
|--------|--------|---------|
| `practical` | 50% | Monday (market_education), Wednesday (practical_advice) |
| `recognition` | 20% | Friday (driver_recognition) — unless replaced by acquisition |
| `community` | 20% | Sunday (community_question) |
| `acquisition` | 10% | Friday on even week indices only (~every other week) |

### Creative angles (10 total)

Practical: `practical_advice`, `market_education`, `myth_vs_reality`, `operational_insight`  
Recognition: `driver_recognition`, `relatable_work_moment`, `career_confidence`, `safe_light_humor`  
Community: `community_question`, `relatable_work_moment`, `safe_light_humor`  
Acquisition: `low_freq_acquisition_cta`, `practical_advice`

### Template coverage

Every (pillar × angle) combination that appears in the default weekly schedule has 3–4 template variants. Templates rotate by week index for variety. All templates:
- Are written in natural Swedish
- Contain no company names other than DriverNord
- Contain no salary claims, verified-driver claims, or ungrounded statistics
- Include conditional CTA lines (only when `include_cta = true`)
- Include conditional "Du kör. Vi hjälper dig hitta rätt uppdrag." line for recognition posts

---

## Anti-repetition rules

| Rule | Severity |
|------|---------|
| Same `topic_signature` within 14 days | Block |
| Any CTA (`cta_type ≠ none`) within 7 days | Block |
| Jaccard similarity ≥ 35% to any post within 30 days | Block |
| Same format within last 2 posts in same pillar | Warn |
| > 4 posts in same ISO week | Block |
| > 1 post on same day | Block |
| > 1 CTA in same ISO week | Block |

---

## Risk classification

**Low risk** (eligible for manual copy): general recognition, practical tips, community questions, Logistikklubb CTAs  
**High risk** (held for founder review): any named company, job offers, salary figures, driver availability claims, partnership claims, statistics without approved source

All generated drafts are automatically scanned. High-risk cards are set to `lifecycle_status: 'held'` and require explicit founder approval before use.

---

## Campaign card lifecycle

```
draft → ready       (founder approves)
draft → held        (risk or anti-repetition block)
draft → archived    (cancelled)
ready → held        (founder holds after approval)
ready → archived    (cancelled)
held  → draft       (reset for re-review)
held  → archived    (cancelled)
```

---

## Weekly schedule

Default 4 posts per week:

| Day | Pillar | Angle | Format | Time |
|-----|--------|-------|--------|------|
| Monday | practical | market_education | text_post | 08:00 |
| Wednesday | practical | practical_advice | tip_list | 09:00 |
| Friday | recognition | driver_recognition | text_post | 09:00 |
| Sunday | community | community_question | question | 11:00 |

**CTA replacement:** On even week indices, Friday's recognition slot is replaced with acquisition (`low_freq_acquisition_cta`, `cta` format, `manual` channel). This yields approximately 10% CTA rate over time and respects the ≤1 CTA/week rule.

---

## Cockpit usage

1. Go to `/admin/content`
2. Enter the ISO week (e.g. `2026-W27`)
3. Click **Generera ny plan** to generate 4 cards for that week
4. Cards appear with draft text, hashtag set, risk badge, and lifecycle status
5. For each card: **Godkänn** (approve → ready), **Pausa** (hold), or **Arkivera** (archive)
6. Select feedback signals and save them — these are logged to `system_actions`
7. Cards in status "Redo" are approved for manual copy-paste by the founder

**Nothing is published automatically. No Facebook connection is active.**

---

## Safety constraints (enforced)

- No Facebook API calls — channel `facebook_page` is a label only, no adapter connected
- No external outreach of any kind
- No secrets exposed or required by any content engine file
- `AGENT_CONTACT_MODE` not referenced or changed
- All generated text is internal-only until manually posted by the founder
- CTA posts must not target `facebook_page` (validated at card creation)
- All risk-flagged cards are blocked from `ready` status until founder clears them

---

## What Phase 2 would add

Phase 2 is not in scope and has not been built. Possible extensions:
- DB-driven memory (query `logistikklubb_scheduled_posts` for actual published history)
- Manual "publish to scheduled_posts" action from cockpit (extend existing Logistikklubb flow)
- Feedback-driven template suppression (avoid angles with repeated `weak_creative_angle` signals)
- WhatsApp manual copy helper
