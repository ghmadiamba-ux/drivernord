# Market Scanning Agent — Modus Operandi
**Date:** 2026-05-28  
**Status:** Current — reflects contactability fix applied 2026-05-28

---

## What the Market Agent Is

The Market Agent (`lib/companyNeedMarketAgent.ts`) is a **daily draft evaluator**, not a live web scanner.

It does not browse the internet. It does not call external APIs. It reads the 17 pre-seeded `company_need_drafts` rows from Supabase, scores them against a composite scoring model, classifies their lifecycle, and writes recommendations to `system_actions`. All output is internal intelligence only.

---

## Data Flow

```
SCAN_RECORDS (lib/scanImportData.ts)
     │ (one-time import via importScanRecords())
     ▼
company_need_drafts (Supabase)          ←─── Market Agent reads these
     │                                         │
     ├── target_id → company_research_targets ─┘
     │                (barrier_level, contact_email, decision_maker_name)
     │
     ▼
scoring + lifecycle classification (in-process, pure functions)
     │
     ▼
system_actions (Supabase)
     + MarketScanResult returned to caller
```

The agent does NOT write back to `company_need_drafts` or `company_needs`. Promotion requires explicit founder confirmation via `promoteDraft()`.

---

## Scoring Model

The composite score (0–100) is a weighted combination of four dimensions:

| Dimension | Weight | Source |
|-----------|--------|--------|
| Recruitment pain | 35% | urgency signal + urgency level + license type + YKB + driver card |
| DriverNord fit | 25% | analyst score from draft metadata (0–10 scale) |
| Freshness | 25% | days since scan_date in metadata |
| Contactability | 15% | barrier_level + contact_email_known + decision_maker_known (joined from research_targets) + analyst contactability score |

### Promotion threshold

A draft with composite ≥ 65 and no `missing_fields` is classified `ready_for_internal_promotion`. This triggers a `company_need_promotion_recommended` log entry. **It does not automatically promote the draft.** Founder must call `promoteDraft(draftId)` explicitly.

---

## Lifecycle States

| State | Meaning |
|-------|---------|
| `research_discovered` | Has `missing_fields` — data gaps block promotion |
| `active_public_signal` | Complete, fresh, composite < 65 — monitor |
| `needs_refresh` | scan_date > 14 days ago — re-verify before acting |
| `expired` | scan_date > 45 days ago — signal too stale |
| `ready_for_internal_promotion` | Complete + fresh + composite ≥ 65 — founder review recommended |
| `promoted` | Already promoted to `company_needs` |
| `rejected` | Explicitly rejected (e.g., Trabé: confirmed not hiring) |

---

## Contactability Scoring (Post-Fix 2026-05-28)

Before the fix, `buildScoreInputFromDraft()` hardcoded:
- `barrier_level = 'medium'`
- `contact_email_known = false`
- `decision_maker_known = false`

After the fix, these are read from `company_research_targets` via the `target_id` foreign key:

```typescript
barrier_level:        target?.barrier_level ?? 'medium',
contact_email_known:  (target?.contact_email ?? null) !== null,
decision_maker_known: (target?.decision_maker_name ?? null) !== null,
```

The fix improved scores for low-barrier, well-researched companies by +4 to +5 composite points, and reduced scores for high/enterprise-only barrier companies by −3 composite points. Raw contact values (email addresses, names) are never written to logs.

See [market-agent-contactability-score-fix-2026-05-28.md](market-agent-contactability-score-fix-2026-05-28.md) for the full before/after table.

---

## Explicit Boundaries

| Action | Does the Market Agent do it? |
|--------|------------------------------|
| Live web scraping | ✗ No |
| Driver–company matching | ✗ No — matchingAgent.ts |
| Sending SMS or email | ✗ No — contactAgent.ts |
| Setting outreach_approved | ✗ No — cockpit / founder only |
| Creating outreach queue entries | ✗ No |
| Auto-promoting drafts | ✗ No |
| Writing company-side scores | ✓ Yes |
| Recommending internal promotion | ✓ Yes (to system_actions, not to external) |
| Detecting stale / expired signals | ✓ Yes |

---

## Scan Entry Points

| Endpoint | Schedule | Function |
|----------|----------|----------|
| `POST /api/admin/company-need-agent/daily-scan` | Daily 06:00 | `runDailyCompanyNeedScan()` |
| `POST /api/admin/company-need-agent/weekly-scan` | Monday 05:00 | `runWeeklyCompanyNeedDeepScan()` |
| `POST /api/admin/company-need-agent/triggered-scan` | On demand | `runTriggeredCompanyNeedScan(trigger)` |

All three call the same internal `evaluateDrafts()` function. The only difference is the logged `action_type` and whether a trigger payload is attached.

---

## Current State of the 17 Drafts (2026-05-28)

| Lifecycle | Count | Companies |
|-----------|-------|-----------|
| ready_for_internal_promotion | 4 | DN-001 Canoil, DN-002 JPC⚠️, DN-003 Edvardssons, DN-005 Enskede |
| active_public_signal | 2 | DN-004 Kyl-och-Frys, DN-008 Alexis Bud |
| research_discovered | 9 | DN-006, DN-007, DN-009, DN-011 to DN-017 |
| rejected | 1 | DN-010 Trabé |
| promoted | 0 | — |

⚠️ JPC reportedly bankrupt as of 2026-05 — do not promote despite crossing threshold.

All 4 promotion candidates were included in Batch 1 outreach (sent 2026-05-26). No net-new outreach candidates follow from the current data set.

---

## Known Remaining Limitations

1. **Metadata scale mismatch** — pain/contactability scores stored as 0–10 but treated as 0–100, making the metadata blend near-negligible. Fix: multiply by 10 in `buildScoreInputFromDraft()`.

2. **`active_rolling` maps to `single_ad`** — rolling/chronic hiring signals aren't recognized by `deriveUrgencySignal()`. Fix: add 'rolling' to the repeated_ads keyword list.

3. **LinkedIn URL not used** — `company_research_targets.linkedin_url` is a contactability signal but currently unused.

4. **No real database in tests** — all tests use mocked DB responses via `vi.mock('../lib/db')`. Schema drift between mock and real Supabase tables cannot be caught by the test suite.
