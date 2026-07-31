# Market Agent — Contactability Score Fix
**Date:** 2026-05-28  
**Status:** IMPLEMENTED — 1471/1471 tests passing

---

## Verdict

**MARKET_AGENT_CONTACTABILITY_FIXED**

---

## What Was Wrong

`buildScoreInputFromDraft()` in `lib/companyNeedMarketAgent.ts` hardcoded three contact fields that determine `contactability_score`:

| Field | Old value | Correct source |
|-------|-----------|----------------|
| `barrier_level` | `'medium'` (always) | `company_research_targets.barrier_level` |
| `contact_email_known` | `false` (always) | `company_research_targets.contact_email != null` |
| `decision_maker_known` | `false` (always) | `company_research_targets.decision_maker_name != null` |

The code contained a comment `// not stored in drafts — future: join with research_targets` acknowledging the gap. `evaluateDrafts()` already queried `company_research_targets` for company names but selected only `id, company_name`.

The consequence: every draft was scored as if it had a medium barrier and no known contact — regardless of how well-researched the target actually was. This made the contactability dimension systematically unreliable.

---

## Code Files Changed

| File | Change |
|------|--------|
| `lib/companyNeedMarketAgent.ts` | Added `ResearchTargetContactData` interface; updated `evaluateDrafts()` to select `barrier_level, contact_email, decision_maker_name` and build a contacts map; updated `buildScoreInputFromDraft()` signature to accept `ResearchTargetContactData | null` with safe fallbacks |
| `tests/companyNeedMarketAgent.test.ts` | Updated `setupDbResearchTargetsMock()` to accept extended fields; added 7 new tests in `contactability fix — research_targets join` suite |

No schema changes required. No new DB queries (the existing `company_research_targets` select was simply expanded).

---

## Tests Added / Updated

New test suite: `contactability fix — research_targets join` (7 tests)

| Test | What it proves |
|------|----------------|
| Known contact_email → higher contactability than no email | `contact_email_known` is now set from real data |
| Known decision_maker_name → higher contactability than no DM | `decision_maker_known` is now set from real data |
| Low barrier → higher contactability than high barrier | `barrier_level` is now read from target row |
| Missing research target → falls back safely | Drafts without a target row use medium/false/false defaults, no crash |
| Draft without target_id → no crash | Empty target_id edge case handled |
| enterprise_only barrier → lower than medium | Correct directionality for locked-down companies |
| Contact email/DM not logged in system_actions | PII safety: raw contact values never written to logs |

Full suite result: **1471 / 1471 tests passing**.

---

## Score Impact Table

**Assumptions:** scan_date = 2026-05-19 (9 days ago → freshness = 65). Metadata values stored as 0–10 scale.

| # | Company | Barrier | Email | DM | Old C-score | New C-score | Old Composite | New Composite | Delta | Lifecycle |
|---|---------|---------|-------|-----|------------|------------|---------------|---------------|-------|-----------|
| DN-001 | Canoil Transport AB | low | ✓ | ✓ | 41 | **73** | 60 | **65** | +5 | **ready_for_internal_promotion** |
| DN-002 | JPC Entreprenad AB ⚠️ | low | ✓ | ✓ | 41 | **72** | 60 | **65** | +5 | **ready_for_internal_promotion** |
| DN-003 | Edvardssons Last och Schakt | low | ✓ | ✓ | 41 | **72** | 60 | **65** | +5 | **ready_for_internal_promotion** |
| DN-004 | Kyl- och Frysexpressen | low | ✓ | ✓ | 41 | **72** | 56 | 60 | +4 | active_public_signal |
| DN-005 | Enskede Bilexpress AB | low | ✓ | ✓ | 41 | **72** | 63 | **68** | +5 | **ready_for_internal_promotion** |
| DN-006 | Thermobud AB | medium | ✓ | ✗ | 40 | 47 | 55 | 56 | +1 | research_discovered ¹ |
| DN-007 | Haninge Åkeri AB | low | ✓ | ✓ | 41 | **72** | 53 | 58 | +5 | research_discovered ¹ |
| DN-008 | Alexis Bud & Transport | low | ✓ | ✓ | 41 | **72** | 53 | 57 | +4 | active_public_signal |
| DN-009 | Sjölander Maskintransport | low | ✓ | ✓ | 41 | **72** | 53 | 58 | +5 | research_discovered ¹ |
| DN-010 | Transportfirma Trabé | low | ✓ | ✓ | 41 | 73 | 53 | 58 | +5 | rejected |
| DN-011 | Arena Personal (Jordbro) | high | ✗ | ✗ | 39 | **18** | 55 | 52 | **-3** | research_discovered ¹ |
| DN-012 | Dagab Inköp & Logistik | enterprise_only | ✓ | ✓ | 40 | **15** | 48 | 45 | **-3** | research_discovered ¹ |
| DN-013 | DHL Freight (Sweden) | enterprise_only | ✓ | ✓ | 40 | **15** | 48 | 45 | **-3** | research_discovered ¹ |
| DN-014 | Rekryteringsgruppen i Stockholm | medium | ✗ | ✗ | 40 | 40 | 45 | 45 | 0 | research_discovered ¹ |
| DN-015 | Diamond Express Åkeri | high | ✗ | ✗ | 40 | **19** | 53 | 50 | **-3** | research_discovered ¹ |
| DN-016 | CHRC Åkeri AB | high | ✗ | ✗ | 39 | **18** | 49 | 46 | **-3** | research_discovered ¹ |
| DN-017 | Simplex Bemanning (Årsta) | high | ✗ | ✗ | 40 | **19** | 52 | 49 | **-3** | research_discovered ¹ |

¹ Lifecycle capped at `research_discovered` due to `missing_fields` — composite score improvement/decline does not change promotion eligibility until gaps are filled.

---

## New Promotion Candidates

Four drafts now cross composite ≥ 65 (threshold for `ready_for_internal_promotion`):

| Draft | Company | New Score | Status |
|-------|---------|-----------|--------|
| DN-001 | Canoil Transport AB | 65 | **In Batch 1** — already contacted 2026-05-26; supply gap (0 ADR drivers) |
| DN-002 | JPC Entreprenad AB | 65 | **Reportedly bankrupt** — do not promote; slot 2 vacant in Pilot Wave 1 |
| DN-003 | Edvardssons Last och Schakt | 65 | **In Batch 1** — already contacted 2026-05-26 |
| DN-005 | Enskede Bilexpress AB | 68 | **In Batch 1** — already contacted 2026-05-26 |

**Net-new promotion candidates: 0.** All companies that gained enough to cross the threshold were already included in Batch 1 or are disqualified. No new automated outreach follows from this fix.

---

## Directionality Is Correct

The fix improves scores for well-researched, accessible companies and reduces scores for locked-down ones:

- **Low barrier + known contact** (DN-001 to DN-005, DN-007 to DN-009): contactability +31 to +32 points, composite +4 to +5 points
- **Medium barrier + partial contact** (DN-006): contactability +7, composite +1
- **High barrier, no contact** (DN-011, DN-015, DN-016, DN-017): contactability −21 to −22, composite −3
- **Enterprise-only barrier** (DN-012, DN-013): contactability −25, composite −3
- **Medium barrier, no contact** (DN-014): 0 delta (medium/no-contact was the old default)

---

## Remaining Limitations

### 1. Metadata score scale mismatch (not fixed here)
`metadata.recruitment_pain_score`, `metadata.drivernord_fit_score`, and `metadata.contactability_score` are stored as 0–10 integers in `SCAN_RECORDS` but the `ScoreInput` interface declares them as 0–100 for pain and contactability. This causes the metadata blend contribution to be near-negligible (e.g., a pain score of 9 contributes as 9 out of 100, not 90). Until this is corrected the blended scores lean heavily on signal-derived values.

### 2. `active_rolling` ad status maps to `single_ad`
`deriveUrgencySignal('active_rolling')` returns `'single_ad'` because the string doesn't match any special-case pattern. Canoil and Kyl-och-Frys both have rolling/chronic hiring but are scored as single_ad rather than `repeated_ads`. A keyword list extension would fix this.

### 3. No real-time join (by design)
The agent fetches contact data from DB at scan time. If a target row is later enriched (contact email found, barrier lowered), the score improves on the next scan automatically. No manual intervention required.

### 4. `company_research_targets.linkedin_url` not used
LinkedIn URL is a contactability signal but currently unused. It could contribute a small bonus for targets where `contact_email` is absent but a LinkedIn profile exists.

---

## Next Fix

**Priority: Fix metadata score scale (0–10 → 0–100)**

In `buildScoreInputFromDraft()`:
```typescript
// Current (wrong):
metadata_pain_score:     Number(meta.recruitment_pain_score)  || 50,
metadata_contactability: Number(meta.contactability_score)    || 50,

// Should be:
metadata_pain_score:     Math.min(100, (Number(meta.recruitment_pain_score) || 5) * 10),
metadata_contactability: Math.min(100, (Number(meta.contactability_score)  || 5) * 10),
```

This will make analyst scores carry their intended 40% / 30% blend weight. Expected composite shift: +10 to +20 points for well-scored companies like DN-001 (pain=9→90, contactability=9→90), pushing them clearly above the threshold; −10 to −20 for low-quality signals.

---

## Safety Verdict

| Check | Status |
|-------|--------|
| No emails sent | ✓ |
| No companies contacted | ✓ |
| No drivers contacted | ✓ |
| No matching auto-triggered | ✓ |
| No outreach queue created | ✓ |
| No secrets exposed | ✓ |
| AGENT_CONTACT_MODE unchanged | ✓ |
| contact_email / decision_maker_name not logged | ✓ (test verified) |
