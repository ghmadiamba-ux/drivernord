# Visual Production Pipeline V1

**Phase 2 of the DriverNord Content & Distribution Engine**

Internal planning and preview system for visual content production. No external publishing. No Facebook connection. No image API.

---

## Architecture

The visual pipeline is a pure-function layer (`lib/content/visual*.ts`) that sits on top of the Phase 1 Campaign Card system. Each Campaign Card can have one Visual Production Plan, stored as JSONB in the `content_campaign_cards.visual_plan` column.

```
Campaign Card (pillar, angle, risk, insight)
         ↓
selectVisualFamily()       → which of 5 visual families
selectAssetStrategy()      → how to produce the visual
selectSceneType()          → specific scene within family
selectCompositionDirection()
selectMood() / selectSetting() / etc.
         ↓
runVisualGate()            → quality gate evaluation
         ↓
generateVisualPreview()    → SVG mock or concept description
         ↓
visual_plan JSONB written to content_campaign_cards
         ↓
/admin/content cockpit     → founder reviews, approves, gives feedback
```

**Boundary guarantee**: No path in the system calls any external API, fetches any image, or connects to Facebook. The SVG preview is generated purely from text inputs using string concatenation — no binary data, no network calls.

---

## Creative Bible (lib/content/creativeBible.ts)

Core identity constants used throughout the visual pipeline:

- **Brand line**: "Du kör. Vi hjälper dig hitta rätt uppdrag."
- **Brand name**: DriverNord
- **Domain**: drivernord.com
- **Primary dark color**: #1C1C2E
- **Accent blue**: #2563EB
- **Typography**: system-ui, -apple-system, sans-serif (no proprietary font files)
- **Max on-image words**: 16
- **Headline max words**: 6
- **Support line max words**: 10
- **WCAG AA contrast minimum**: 4.5

### Prohibited visual patterns

Any visual containing these is automatically held for founder review:

- External company logos (Schenker, DHL, PostNord, Lernia, etc.)
- Identifiable license plates
- Persons without explicit consent
- Salary or rate claims ("X kr/h")
- Job vacancy claims ("Vi söker")
- Verified driver claims
- Statistical claims without source
- Competitor references
- Unmarked AI-generated faces
- Generic non-Swedish stock imagery
- Accident or risk depictions

---

## Visual Family Taxonomy (lib/content/visualFamilies.ts)

Five visual families with distinct character and use cases:

| Family | Swedish Name | Primary Use | Freq Weight |
|--------|-------------|-------------|-------------|
| `reality_of_work` | Transportens vardag | Practical + operational insight | 35% |
| `driver_pride` | Chaufförstolthet | Recognition + career confidence | 25% |
| `operational_intelligence` | Operationell intelligens | Education + infographic | 20% |
| `community_conversation` | Gemenskapsdialog | Community + discussion | 15% |
| `drivernord_campaign` | DriverNord kampanj | Premium brand + acquisition | 5% |

### Family selection logic

`selectVisualFamily(pillar, angle)` maps Campaign Card attributes to the most appropriate family. Key mappings:

- `practical + practical_advice` → `operational_intelligence`
- `recognition + driver_recognition` → `driver_pride`
- `community + community_question` → `community_conversation`
- `acquisition + low_freq_acquisition_cta` → `drivernord_campaign`
- `practical + operational_insight` → `reality_of_work`
- `recognition + relatable_work_moment` → `reality_of_work`

### Rotation rules (visual anti-repetition)

| Rule | Threshold | Severity |
|------|-----------|----------|
| Same family in 7 days | ≥ 2 uses | Block |
| Same family in 7 days | 1 use | Warn |
| Consecutive same family | Any | Warn |
| Same scene in 14 days | Any | Block |
| Same text overlay structure in 14 days | ≥ 2 uses | Warn |
| Concept similarity in 30 days | ≥ 75% Jaccard | Block |
| Concept similarity in 30 days | ≥ 50% Jaccard | Warn |

Concept similarity uses a 4-component Jaccard: `family__scene__composition__mood`.

---

## Asset Strategy Selector (lib/content/assetStrategySelector.ts)

Deterministic mapping from Campaign Card to production strategy:

| Creative Angle | Strategy | Rationale |
|---------------|----------|-----------|
| `practical_advice` | `branded_graphic` | Infographic communicates clearly; immediately producible |
| `market_education` | `branded_graphic` | Structured visual explanation needed |
| `driver_recognition` | `real_asset` | Authentic photo builds trust |
| `community_question` | `branded_graphic` | Simple warm text graphic |
| `myth_vs_reality` | `branded_graphic` | Split-panel infographic |
| `operational_insight` | `real_asset` | Authenticity is central |
| `relatable_work_moment` | `future_ai_generated` | Photorealistic scene; queued |
| `career_confidence` | `future_ai_generated` | Professional portrait; queued |
| `safe_light_humor` | `branded_graphic` | Text-based; no photorealistic needed |
| `low_freq_acquisition_cta` | `branded_graphic` | Controlled brand-forward |
| **High-risk card** | `no_visual_needed` | Founder reviews text first |
| **Poll/question format** | `no_visual_needed` | Visual would distract |

---

## Composition Rules (lib/content/compositionRules.ts)

### Supported formats

| Format | Dimensions | Aspect | Primary use |
|--------|-----------|--------|-------------|
| `portrait_1080x1350` | 1080×1350 | 4:5 | Primary — mobile feed |
| `square_1080x1080` | 1080×1080 | 1:1 | Secondary — universal |
| `story_1080x1920` | 1080×1920 | 9:16 | Story / Reel |

**Default**: `portrait_1080x1350`. `community_conversation` defaults to `square_1080x1080`.

### Safe text zones (fraction from edge)

| Format | Top | Bottom | Left | Right |
|--------|-----|--------|------|-------|
| Portrait | 8% | 8% | 6% | 6% |
| Square | 10% | 10% | 8% | 8% |
| Story | 15% | 15% | 6% | 6% |

### Word count limits

| Format | Max words on image |
|--------|-------------------|
| Portrait | 16 |
| Square | 14 |
| Story | 18 |

Headline: max 6 words. Support line: max 10 words.

---

## Visual Quality Gate (lib/content/visualQualityGate.ts)

The gate evaluates a proposed visual plan against all rules and produces one of 7 outcomes:

| Outcome | Trigger |
|---------|---------|
| `ready_for_internal_preview` | Passes all checks |
| `held_for_risk` | Headline contains risk patterns |
| `blocked_for_repetition` | Family/scene/concept repeats within cooldown |
| `needs_better_brief` | Text overlay exceeds limits |
| `requires_real_asset` | Strategy is `real_asset`; no asset exists |
| `requires_future_ai_generation` | Strategy is `future_ai_generated` |
| `no_visual_needed` | Strategy is `no_visual_needed` |

**Gate checks (in order)**:
1. No visual needed → immediate return
2. Text overlay word count (headline > 6, support > 10, total > format max)
3. Headline risk scan (salary patterns, "vi söker", named companies, percentages)
4. Visual family cooldown (7-day max 2, no consecutive)
5. Scene cooldown (14-day)
6. Concept similarity (30-day Jaccard)
7. Generic concept mismatch detection
8. Asset strategy outcomes (real_asset unverified, future_ai_generated)

---

## Visual Memory (lib/content/visualMemory.ts)

Each published or approved visual plan is stored as a `VisualMemoryEntry`:

```typescript
{
  visual_family, scene_type, subject_type, setting,
  composition_direction, text_overlay_structure, transport_context,
  concept_signature,  // "family__scene__composition__mood"
  gate_outcome, planned_date, asset_strategy
}
```

Memory is loaded from `content_campaign_cards.visual_plan` (recent 30 days, max 60 entries) by the API route before generating a new plan.

### Feedback analysis

- `extractPausedFamilies()` — identifies families marked `avoid_this_visual_family`
- `extractPausedScenes()` — identifies scenes marked `avoid_this_scene_type`
- `hasStrongPositiveSignal()` — identifies patterns worth reproducing

---

## Visual Preview (lib/content/visualPreview.ts)

### Preview types

**`branded_graphic_svg`** (for `branded_graphic` strategy):
- Deterministic SVG generated entirely from text inputs
- Uses DriverNord brand colors from `creativeBible.ts`
- Shows proposed headline, support line, brand line, DriverNord name
- Displays internal family/scene label at top
- Watermarked "INTERN FÖRHANDSVISNING"
- Preview dimensions: 324×405px (30% scale of 1080×1350)
- **Zero external calls** — pure string concatenation

**`concept_description`** (for `real_asset`, `future_ai_generated`, `no_visual_needed`):
- Structured text spec describing the visual concept
- Includes: family, scene, setting, mood, time of day, light condition
- Composition notes: composition direction and subject type
- Copy hierarchy: proposed headline and support line
- Disclaimer specifying why no preview is generated

All previews include `is_internal_only: true` and a disclaimer. The SVG uses `xmlns="http://www.w3.org/2000/svg"` as a namespace declaration — this is not a network request.

---

## Migration 027

**File**: `supabase/migrations/02700000_add_visual_plan_to_content_cards.sql`

Adds:
1. `visual_plan JSONB` column to `content_campaign_cards` (nullable, idempotent `ADD COLUMN IF NOT EXISTS`)
2. Index `idx_content_cards_visual_plan` (partial, on non-null rows)
3. Extends `system_actions_action_type_check` with 3 new values (+77 total)

New action types: `content_visual_plan_generated`, `content_visual_plan_updated`, `content_visual_plan_held`

**Target type**: reuses existing `content_campaign_card` — no new target_type needed since visual plans are stored on the card.

**Apply**: Founder applies manually via Supabase SQL Editor. Idempotent — safe to re-run.

---

## API Route

**`POST /api/admin/visual-plan`**
- Body: `{ card_id: string }`
- Loads the card and visual history
- Runs the full selection → gate → preview pipeline
- Writes `visual_plan` JSONB to `content_campaign_cards`
- Logs `content_visual_plan_generated` or `content_visual_plan_held`
- Returns: `{ plan: VisualProductionPlan, preview: VisualPreviewSpec }`

**`GET /api/admin/visual-plan?card_id=...`**
- Loads existing visual plan for a card
- Regenerates preview spec on the fly
- Returns: `{ plan, preview }`

**`PATCH /api/admin/visual-plan`**
- Body: `{ card_id, lifecycle_status? }` or `{ card_id, feedback_signals? }`
- Updates the visual plan's lifecycle or feedback
- Logs `content_visual_plan_updated`

---

## Cockpit Integration (app/admin/content/page.tsx)

A "Visuell plan" section is appended to each CardRow's expanded view:

1. **Generate button** — triggers `POST /api/admin/visual-plan`
2. **Plan summary** — shows family badge, strategy badge, gate outcome badge
3. **Strategy reason** — explains why this strategy was selected
4. **Gate findings** — displays gate evaluation results
5. **Proposed copy** — shows headline and support line
6. **SVG preview** — inline SVG for `branded_graphic` plans (using `dangerouslySetInnerHTML` — safe, all content is internally generated)
7. **Concept description** — for non-branded-graphic plans
8. **Visual lifecycle actions** — Godkänn / Håll buttons
9. **Visual feedback** — 12 signal types with save button

The footer note remains: "Innehåll publiceras aldrig automatiskt. All publicering sker manuellt av grundaren."

---

## Founder Correction Workflow

When a visual plan doesn't match expectations:

1. Expand the card in `/admin/content`
2. Click "Visa" on the visual plan section
3. Select relevant feedback signals (e.g. "Svag svensk transportkänsla", "Undvik denna scen")
4. Click "Spara visuell feedback"
5. Click "Håll visuell plan" to prevent the direction from being reused
6. Next generation for the same angle will use `extractPausedScenes()` to avoid the flagged scene

Strong positive signals (`excellent_visual_pattern`, `reuse_this_visual_direction`) are tracked by `hasStrongPositiveSignal()` for future pattern reproduction.

---

## Visual Feedback Signals

| Signal | Meaning |
|--------|---------|
| `excellent_visual_pattern` | Reproduce this direction |
| `too_ai_looking` | Looks synthetic |
| `too_generic` | Non-specific, not Swedish transport |
| `weak_composition` | Poor framing |
| `weak_swedish_transport_realism` | Doesn't feel like Swedish logistics |
| `too_much_on_image_text` | Text overload |
| `poor_mobile_readability` | Hard to read on mobile |
| `brand_inconsistency` | Off-brand colors or typography |
| `avoid_this_visual_family` | Pause this family |
| `avoid_this_scene_type` | Avoid this scene |
| `reuse_this_visual_direction` | Worth repeating |
| `future_campaign_candidate` | Elevate to campaign quality |

---

## Test Coverage

| File | Tests | What's covered |
|------|-------|----------------|
| `tests/contentVisualFamilies.test.ts` | 30 | Taxonomy integrity, family selection, scene rotation, cooldown checks, concept similarity |
| `tests/contentVisualStrategy.test.ts` | 37 | Asset strategy for all 10 angles, high-risk override, format selection, text overlay validation, brand elements |
| `tests/contentVisualGate.test.ts` | 17 | Text limits, headline risk patterns (salary, "vi söker", companies), family/scene cooldown, real_asset/future_ai outcomes |
| `tests/contentVisualMemory.test.ts` | 21 | Anti-repetition checks, memory entry building, history filtering, feedback analysis |
| `tests/contentVisualPreview.test.ts` | 26 | SVG output validity, brand colors, watermark, no external URLs, no Facebook, XML escaping, concept descriptions |
| `tests/contentVisualSystemActions.test.ts` | 10 | All 3 visual plan action types forward correctly; no external fetch() call |

**Total Phase 2 tests**: 141 (passing). Combined with Phase 1: **2,376 tests across 74 files**.

---

## Intentionally Deferred

- **Real asset management**: No system for uploading or managing approved photos. Founder selects photos manually from their own library when plans show `requires_real_asset`.
- **AI image generation**: `future_ai_generated` plans are queued but no AI image API is connected. The pipeline is ready — activation requires connecting an image generation service and a new API route.
- **Automated publishing**: No automatic publishing. All content is copied manually by the founder. This is by design — see Phase 1 safety constraints.
- **Performance tracking**: `performance_placeholder` fields are reserved in the spec but not yet stored. Phase 3 can add engagement metric capture.
- **Multi-format SVG preview**: Current preview is portrait-only (324×405). Square and Story previews can be added with a `format` parameter to `generateBrandedGraphicSvg()`.

---

## Phase 3 Recommendation

When ready to connect real visual production:

1. **Real asset library**: Add a `visual_assets` table with file references and consent tracking. Gate `real_asset` plans to approved assets only.
2. **AI image generation**: Connect to an image generation API (e.g., Flux, DALL-E 3) via a new route `app/api/admin/generate-image`. The `future_ai_generated` queue is already defined — add a `process_queue` endpoint.
3. **Engagement signals**: Add a `content_performance` table tracking reach, engagement rate, and saves per published piece. Feed signals back into the planner for pillar ratio adjustments.
4. **Facebook Page Publisher**: The Phase 1 Facebook Page Publisher Adapter (already built) can be connected once a content approval workflow is finalized. Connect via `AGENT_CONTACT_MODE` equivalent for content.
