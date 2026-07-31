# Facebook Content Bridge V1

**Date:** 2026-06-25
**Status:** Implemented — migration 028 required before activation
**Scope:** Connects `content_campaign_cards` to the Facebook Page publisher via a dedicated publish queue.

---

## 1. Architecture

```
content_campaign_cards  (existing)
        │
        │  evaluatePublishability()  [lib/content/facebookPublishPolicy.ts]
        │  adaptForFacebook()        [lib/content/facebookTextAdapter.ts]
        ▼
content_facebook_publish_queue  (NEW — migration 028)
        │
        │  /api/cron/content-facebook-publisher  (NEW — runs 07:00 UTC daily)
        ▼
FacebookPagePublisherAdapter  (existing — lib/logistikklubbPublisher.ts)
        │
        ▼
Facebook Page API  (graph.facebook.com/v21.0/{pageId}/feed)
        │
        ▼
system_actions audit log  (existing)
```

### Key principle: two separate queues, one adapter

The existing `logistikklubb_scheduled_posts` queue (WhatsApp-origin content) and the new `content_facebook_publish_queue` (Campaign Card origin) are **independent**. They share the `FacebookPagePublisherAdapter` but have separate rate caps, separate cron routes, and separate `system_actions` action types. The WhatsApp machinery is untouched.

---

## 2. Files Created

| File | Purpose |
|------|---------|
| `lib/content/facebookPublishPolicy.ts` | Pure function — 16-rule publishability decision |
| `lib/content/facebookTextAdapter.ts` | Swedish Facebook copy adaptation (text-only) |
| `lib/content/facebookPublishQueue.ts` | DB operations for the publish queue |
| `app/api/cron/content-facebook-publisher/route.ts` | Cron dispatcher (07:00 UTC) |
| `app/api/admin/content-facebook-queue/route.ts` | Admin API (enqueue, pause, schedule) |
| `supabase/migrations/02800000_create_content_facebook_publish_queue.sql` | Schema |
| `tests/contentFacebookBridge.test.ts` | 46 regression tests |
| `docs/business/content-distribution-engine/facebook-content-bridge-v1.md` | This file |

### Files modified

| File | Change |
|------|--------|
| `app/admin/content/page.tsx` | Added Facebook publish section to each card panel |
| `vercel.json` | Added cron at `0 7 * * *` for `/api/cron/content-facebook-publisher` |
| `.env.local.example` | Added Facebook env var documentation (previous session) |

---

## 3. Schema — `content_facebook_publish_queue`

```sql
id              UUID PRIMARY KEY
card_id         UUID NOT NULL → content_campaign_cards(id)  [ON DELETE RESTRICT]
publish_status  TEXT  -- pending_check | eligible | blocked | queued | scheduled | due | published | failed
blocked_reason  TEXT  -- NULL when eligible
blocked_policy_rule TEXT  -- which of the 16 rules triggered block
facebook_copy   TEXT  -- Swedish Facebook-adapted text (distinct from card.draft_text)
facebook_hashtags TEXT[]
scheduled_at    TIMESTAMPTZ
due_at          TIMESTAMPTZ
facebook_post_id TEXT  -- returned by Meta on success
published_at    TIMESTAMPTZ
failure_reason  TEXT
failure_count   INTEGER DEFAULT 0
eligible_checked_at TIMESTAMPTZ
queued_by       TEXT DEFAULT 'system'
```

**Unique constraint:** only one active entry per card (published + failed entries are excluded).

### `content_facebook_publish_config` (single-row control table)

```sql
emergency_pause     BOOLEAN DEFAULT false
paused_pillars      TEXT[]
paused_angles       TEXT[]
max_posts_per_day   INTEGER DEFAULT 1
max_posts_per_week  INTEGER DEFAULT 3
max_cta_per_week    INTEGER DEFAULT 1
```

**Founder controls this via:** `PATCH /api/admin/content-facebook-queue` with action `emergency_pause` / `resume_pause` / `pause_pillar` / `resume_pillar`.

---

## 4. Publishability Lifecycle

```
pending_check ──→ eligible ──→ queued ──→ scheduled ──→ due ──→ published ✓
      │                │                       │               │
      └──→ blocked ←───┘                  failed ←────────────┘
                                              │
                                         scheduled (retry)
```

All status transitions enforce the state machine. Published is terminal.

---

## 5. Publishability Policy — 16 Rules

Evaluated in order. Short-circuit on first failure.

| # | Rule | Policy key |
|---|------|-----------|
| 1 | Emergency pause active | `emergency_pause` |
| 2 | `created_by` starts with `dry_run_` | `dry_run_card` |
| 3 | `lifecycle_status` is `held` or `archived` | `ineligible_lifecycle` |
| 4 | `lifecycle_status` is not `ready` | `not_ready` |
| 5 | `risk_level` is not `low` | `high_risk_card` |
| 6 | `blocked_reason` is a regulatory hold | `regulatory_hold` |
| 7 | Any `blocked_reason` present | `blocked_reason_present` |
| 8 | `draft_text` is null or empty | `no_draft_text` |
| 9 | Personal data in text (phone, personnummer, email) | `personal_data` |
| 10 | Named company in text (DHL, PostNord, `*AB`, etc.) | `named_company` |
| 11 | Unsafe claim in text (salary, current client, wrong domain) | `unsafe_claim` |
| 12 | Card `content_pillar` is paused | `pillar_paused` |
| 13 | Card `creative_angle` is paused | `angle_paused` |
| 14 | Daily cap reached | `daily_cap` |
| 15 | Weekly cap reached | `weekly_cap` |
| 16 | Weekly CTA cap reached (for CTA cards) | `cta_weekly_cap` |
| 17 | Topic signature recently published | `topic_repetition` |
| 18 | Visual plan gate blocks publishing | `visual_asset_blocked` |
| 19 | Visual asset strategy unsupported at launch (real_asset / future_ai_generated) | `visual_asset_strategy_unsupported` |

**Autonomous publishing by default:** Rules 1–19 are automatic. No founder approval step exists for routine low-risk content. Founder corrects after publication.

---

## 6. Text-Only vs Media Launch

### Text-only (launch-ready ✓)

- `adaptForFacebook()` converts `card.draft_text` to Facebook-ready Swedish copy
- Strips WhatsApp formatting (`*bold*`, `_italic_`, `~strikethrough~`)
- Appends hashtags as a block (max 5)
- Appends CTA line per `cta_type` (all point to drivernord.com, never WhatsApp)
- Hard cap: 800 chars (truncates with `…`)
- Forbidden content throws and causes the entry to be blocked (watermarks, drivernord.se)

### Media / branded graphic (deferred — Bridge V2)

Current launch is **text-only**. Image publishing is NOT available because:

1. The Graph API needs `multipart/form-data` or a URL-hosted image. The current adapter sends JSON `{ message }` only.
2. W28 SVG previews contain "INTERN FÖRHANDSVISNING" watermarks and cannot be published directly.
3. Branded graphic SVGs are at 400×500 preview scale, not production 1080×1350.
4. No CDN or image hosting is configured.

Cards with `asset_strategy: 'real_asset'` or `'future_ai_generated'` are **blocked** by policy rule 19.

Cards with `asset_strategy: 'branded_graphic'` are **not blocked** — their text is published without the graphic. When Bridge V2 adds image support, the graphic can be added.

**To unlock media publishing (Bridge V2):**
- Add image upload endpoint (upload SVG/PNG to a CDN, return URL)
- Extend `postToFacebookPage()` to accept optional `image_url` parameter
- Add `published_image_url` column to `content_facebook_publish_queue`
- Add rule to strip watermarks and verify production dimensions before queuing

---

## 7. Caps and Scheduling

| Cap | Default | Controlled by |
|-----|---------|---------------|
| Max posts per day | 1 | `content_facebook_publish_config.max_posts_per_day` |
| Max posts per week | 3 | `content_facebook_publish_config.max_posts_per_week` |
| Max CTA posts per week | 1 | `content_facebook_publish_config.max_cta_per_week` |
| Post cooldown (topic signature) | 14 days | `getRecentTopicSignatures(14)` in queue library |

Cron fires at 07:00 UTC (09:00 CEST in summer). For manual triggers:
```
POST /api/cron/content-facebook-publisher
Authorization: Bearer {CRON_SECRET}
```

**Note:** The `logistikklubb-scheduler` cron also has a Facebook pass (for Logistikklubb posts). Its rate cap (`FACEBOOK_MAX_POSTS_PER_DAY`) is separate from the content bridge cap. Both use `FacebookPagePublisherAdapter` but log to different `action_type` values. The two caps do not currently cross-check each other — this is a known limitation to address in Bridge V2.

---

## 8. Cron Authentication

The `content-facebook-publisher` cron route is **stricter** than the Logistikklubb scheduler:

- `CRON_SECRET` is **always required** — if unset, all callers receive 401
- This is because Facebook Page publishing is an irreversible external action
- The Logistikklubb scheduler had a bypass when `CRON_SECRET` was unset (legacy behavior, still present)

---

## 9. Emergency Pause and Correction Workflow

**If a post is published that should not have been:**

1. `PATCH /api/admin/content-facebook-queue` → `{ action: 'emergency_pause' }`
   - Stops all further content-bridge publishing immediately
2. Go to the Facebook Page and delete the post manually (Meta does not support deletion via basic Graph API with Page token alone — use Meta Business Suite)
3. In Supabase, find the `content_facebook_publish_queue` entry and note the `facebook_post_id`
4. Find the originating card in `content_campaign_cards` and set `lifecycle_status = 'held'` with an appropriate `blocked_reason`
5. `PATCH /api/admin/content-facebook-queue` → `{ action: 'resume_pause' }` when safe to resume
6. Record feedback signal `avoid_topic` on the card

**If a category should be paused:**

```
PATCH /api/admin/content-facebook-queue
{ action: 'pause_pillar', payload: { pillar: 'acquisition' } }
```

Or for an angle:
```
PATCH /api/admin/content-facebook-queue
{ action: 'pause_pillar', payload: { pillar: 'practical' } }
```

---

## 10. Founder Activation Steps

After Bridge V1 is deployed, the following steps are required before live publishing:

**Step 1 — Apply migration 028**
In Supabase SQL Editor, paste and run `supabase/migrations/02800000_create_content_facebook_publish_queue.sql`.
Verify: `SELECT id, emergency_pause FROM content_facebook_publish_config;` should return one row.

**Step 2 — Deploy**
`vercel deploy --prod` (the cron at 07:00 UTC will be registered by Vercel automatically after deployment).

**Step 3 — Set Facebook Vercel vars** (see `docs/business/meta-acquisition-integration/meta-env-and-security-plan.md`)
- `FACEBOOK_PAGE_ID` — numeric Facebook Page ID
- `FACEBOOK_PAGE_ACCESS_TOKEN` — long-lived Page token or System User token
- `FACEBOOK_PAGE_API_ENABLED` — set to `true` last

**Step 4 — Set CRON_SECRET** (if not already set)
Generate: `openssl rand -hex 32`. Set in Vercel → Environment Variables.

**Step 5 — Generate content cards**
Use `/admin/content` → Generate plan for the current week. Review cards, approve (set `lifecycle_status = 'ready'`), then click "Köa för Facebook" on each card.

**Step 6 — Test manually**
```
POST https://drivernord.com/api/cron/content-facebook-publisher
Authorization: Bearer {CRON_SECRET}
```
Check `system_actions` for `content_facebook_post_published`. Check the Facebook Page.

---

## 11. Backward Compatibility

The following systems are **unchanged**:

- `logistikklubb_scheduled_posts` table — untouched
- `logistikklubb-scheduler` cron — untouched (still runs at 06:00 UTC)
- `FacebookPagePublisherAdapter` — untouched (shared, not modified)
- All existing Facebook adapter tests — still pass
- W27/W28 campaign cards — untouched (dry-run cards are permanently blocked by policy)
- WhatsApp manual workflow — untouched
- Contact agent, follow-up agent, matching engine — untouched

---

*Version 1.0 — 2026-06-25 — Bridge built. Migration 028 not yet applied. FACEBOOK_PAGE_API_ENABLED not set. No content published.*
