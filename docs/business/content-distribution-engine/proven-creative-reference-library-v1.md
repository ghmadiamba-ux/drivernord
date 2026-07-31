# Proven Creative Reference Library V1

**Phase 3 upgrade to the DriverNord Content & Distribution Engine**

Internal learning layer that encodes 9 proven persuasion mechanics from historically successful DriverNord static ad creatives. Not a publishing system. Not an image library. A typed reference layer that informs content direction.

---

## Strategic Purpose

Convert founder knowledge of what works into structured, reusable creative direction — without copying existing ads verbatim and without storing binary image assets.

**What this is:**
- A code-based taxonomy of proven persuasion mechanics
- A cooldown-aware selector that chooses the right mechanism per content slot
- A visual mode system (two distinct expression modes)
- A feedback loop so the founder can signal which mechanisms work

**What this is not:**
- A media library
- A Facebook publishing connector
- An image generation system
- A guaranteed performance model

> **DISCLAIMER**: All 9 mechanisms carry evidence status `founder_reported_historical_success`. This is founder-assessed historical success, not independently measured causal performance data. Use these as creative direction guardrails, not as guaranteed conversion formulas.

---

## Architecture

```
Content & Distribution Engine
         ↓
selectProvenMechanism(pillar, angle, weekIndex, history)
         ↓  [lib/content/provenReferences.ts]
ProvenCreativeReference  ←  PROVEN_REFERENCES array (9 records)
         ↓
selectCreativeMode(pillar, channel, mechanismId)
         ↓  [lib/content/creativeMechanism.ts]
CreativeMode: trust_organic | performance_acquisition
         ↓
VisualProductionPlan {
  reference_mechanism_id,
  creative_mode,
  mechanism_selection_reason,
  channel_fit_recommendation,
  mechanism_cooldown_warnings,
  ...existing fields...
}
         ↓
visual_plan JSONB (content_campaign_cards)
         ↓
/admin/content cockpit  ←  mechanism display + new feedback signals
```

**No new DB migration required.** All new fields live inside the existing `visual_plan JSONB` column (migration 027).

---

## The 9 Proven Mechanisms

| ID | Name | Channel | CTA |
|----|------|---------|-----|
| `pain_led_recruitment_friction` | Pain-Led Recruitment Friction | paid_acquisition, organic_facebook | direct |
| `radical_simplification_promise` | Radical Simplification Promise | paid_acquisition, organic_facebook, website | medium |
| `explicit_differentiation` | Explicit Differentiation | paid_acquisition, organic_facebook, website, retargeting | soft |
| `driver_control_consent` | Driver Control & Consent | retargeting, website, organic_facebook | soft |
| `driver_dignity_identity` | Driver Dignity & Identity | organic_facebook, community, retargeting | none |
| `mobile_native_simulation` | Mobile-Native Conversation Simulation | paid_acquisition, organic_facebook | direct |
| `premium_brand_trust_visual` | Premium Brand / Trust Visual | organic_facebook, website, retargeting, community | soft |
| `performance_ad_visual` | Performance Ad Visual | paid_acquisition | direct |
| `human_transport_realism` | Human Transport Realism | organic_facebook, community, website, retargeting | none |

---

## Visual Modes

Two distinct visual expression modes. Selection is automatic based on pillar + channel + mechanism.

### trust_organic (default)
- **Colors**: `#1C1C2E` navy primary / `#FFFFFF` secondary / `#2563EB` accent
- **Use**: Organic content, community, recognition, trust-building
- **Hook intensity**: Low
- **CTA intensity**: Soft
- **Frequency**: Unlimited

### performance_acquisition
- **Colors**: `#000000` black primary / `#F5C100` yellow / `#FFFFFF` accent
- **Use**: Paid acquisition; max 1 per week in organic channel
- **Hook intensity**: High
- **CTA intensity**: Direct
- **Auto-trigger conditions**: `pillar === 'acquisition'` OR `channel === 'paid_acquisition'` OR `channel === 'retargeting'` OR performance mechanism on non-organic channel

---

## Cooldown Rules

| Rule | Threshold | Applies to |
|------|-----------|------------|
| Same mechanism | 14 days | All mechanisms |
| Same hook phrase | 30 days | Hook copy |
| `black_yellow_performance` visual | Max 1/week | Organic channel |
| `"3 minuter"` phrase | 21 days | Any draft text |
| `"inte bemanning"` phrase | 21 days | Any draft text |
| `chat_simulation` format | 14 days | Organic channel |
| Driver-truck portrait scene | 21 days | Visual plan |

---

## Mechanism Selection Logic

```
selectProvenMechanism(pillar, angle, weekIndex, history)
  → filter by compatible_pillars + compatible_angles
  → fallback: filter by compatible_pillars only
  → exclude mechanisms used in last 14 days (prefer fresh)
  → rotate using weekIndex % pool.length
```

`selectCreativeMode()` priority:
1. acquisition pillar → `performance_acquisition`
2. paid_acquisition channel → `performance_acquisition`
3. retargeting channel → `performance_acquisition`
4. performance mechanism on non-organic channel → `performance_acquisition`
5. All other cases → `trust_organic`

---

## Taxonomy

### Tag types

| Type | Tags |
|------|------|
| `PainTag` | anti_cv, anti_recruiter, anti_job_board, anti_staffing, no_middlemen, wrong_assignment_friction |
| `PromiseTag` | three_minute_simplicity, no_cv, low_friction_registration, relevant_contact_only, direct_matching |
| `TrustTag` | consent_control, profile_privacy, driver_choice, no_spam, right_assignment |
| `IdentityTag` | driver_pride, skilled_professional, right_driver_right_assignment, driver_first |
| `FormatTag` | chat_simulation, pain_led_static_ad, premium_brand_hero, driver_portrait, in_cab_realism, operational_brand_graphic |
| `VisualLanguageTag` | black_yellow_performance, navy_white_trust, human_transport_realism, mobile_native_conversation, high_contrast_hook, clean_premium_layout |

### Channel types

`paid_acquisition` · `organic_facebook` · `retargeting` · `website` · `community`

---

## Reference Learning Feedback Signals

7 new founder feedback signals added to `VisualFeedbackSignal` union and cockpit:

| Signal | Meaning |
|--------|---------|
| `mechanism_selection_correct` | Correct mechanism chosen for this content |
| `mechanism_selection_wrong` | Wrong mechanism — doesn't fit content |
| `mode_trust_organic_preferred` | Founder prefers trust_organic mode here |
| `mode_performance_preferred` | Founder prefers performance_acquisition here |
| `channel_fit_accurate` | Channel recommendation was accurate |
| `mechanism_add_to_rotation` | Use this mechanism more regularly |
| `mechanism_remove_from_rotation` | Suppress this mechanism for this angle |

---

## Files

| File | Status | Purpose |
|------|--------|---------|
| `lib/content/creativeMechanism.ts` | NEW | Taxonomy types, VISUAL_MODE_SPECS, MECHANISM_COOLDOWNS, selectCreativeMode(), cooldown check functions |
| `lib/content/provenReferences.ts` | NEW | PROVEN_REFERENCES array (9 records), selectProvenMechanism(), extractMechanismTags() |
| `lib/content/visualTypes.ts` | MODIFIED | Added CreativeMode type; extended VisualProductionPlan, VisualMemoryEntry, VisualFeedbackSignal |
| `lib/content/visualMemory.ts` | MODIFIED | buildVisualMemoryEntry carries reference_mechanism_id and creative_mode |
| `lib/content/creativeBible.ts` | MODIFIED | Added VISUAL_MODES constant, performance color tokens to BRAND_COLORS |
| `app/api/admin/visual-plan/route.ts` | MODIFIED | Mechanism + mode selected during POST; fields written to visual_plan JSONB |
| `app/admin/content/page.tsx` | MODIFIED | Mechanism display panel in visual plan section; 7 new feedback signals |
| `tests/contentProvenReferences.test.ts` | NEW | 31 tests |
| `tests/contentCreativeMechanism.test.ts` | NEW | 56 tests |

---

## Safety Constraints

All 10 original safety constraints remain enforced:

1. **No Facebook connection** — No API call to Meta/Facebook in any new or modified file
2. **No Meta API** — `selectProvenMechanism()` and `selectCreativeMode()` are pure functions, zero network calls
3. **No image generation API** — Library is text-only; no binary image assets
4. **No external publishing** — Nothing published externally; all output is internal JSONB
5. **No email/SMS/WhatsApp/driver communications** — Not touched
6. **AGENT_CONTACT_MODE unchanged** — Not touched
7. **No secrets exposed** — No new env vars; existing DB connection unchanged
8. **No parallel content system** — Reference library is an additive layer on the existing pipeline
9. **No heavy media library** — Zero binary image storage; all data is typed JSON
10. **No real persons claimed** — `performance_evidence_placeholder: null` on all records; disclaimer in module header; persons in any reference imagery not claimed as real DriverNord drivers

---

## Cockpit Integration

Mechanism display appears in the **Visuell plan** section of each expanded CardRow:

- Mechanism ID and name (indigo badge)
- Creative mode badge (yellow = performance, blue = trust)
- mechanism_selection_reason (first 100 chars of positioning_mechanism)
- channel_fit_recommendation (comma-separated list)
- mechanism_cooldown_warnings (amber warnings if applicable)
- 7 new feedback signal buttons in the visual feedback section

---

## Intentionally Deferred

- **Phrase cooldown checking from draft text**: The `checkPhraseOveruse()` function exists and is tested but is not wired into the route because the route does not load `draft_text` from card history (extra query overhead). Wire in a future iteration if over-use of "3 minuter" / "inte bemanning" becomes a real production concern.
- **Chat simulation format detection**: `checkChatSimulationCooldown()` exists but is not wired — the route does not know if the generated card will use a chat simulation visual. This can be inferred from `mechanism.mobile_first_pattern === 'chat_simulation'` in a future iteration.
- **Measured performance data**: `performance_evidence_placeholder: null` on all records. A future `content_performance` table with reach + engagement + conversion signals can populate real data here.
- **Mechanism weighting by past performance**: Current selector rotates by weekIndex. Future upgrade: weight candidates by measured `engagement_rate` from `content_performance`.

---

## Recommended Next Step

Run a second internal four-post weekly dry-run using the upgraded proven-reference-aware pipeline to validate that mechanism selection works end-to-end in the script context.

```bash
npx tsx agent-1/scripts/phase3-dry-run.ts
```

Verify that each of the 4 cards receives a `reference_mechanism_id` and `creative_mode` in their visual plan output.
