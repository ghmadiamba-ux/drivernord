# Company Need / Market Agent — Foundation V1

_Date: 2026-05-20 | Environment: DriverNord production_

---

## Strategic Purpose

The Market Agent is DriverNord's continuous company-side market radar. It detects, scores, classifies, and refreshes public-data signals about Swedish transport company driver demand. It feeds the internal intelligence layer so that the Matching Agent always has current, ranked, scored company needs to work against.

**It produces company-side data only. It never performs matching, contact, or outreach.**

---

## Exact Responsibilities

| Responsibility | Implemented in V1 |
|---------------|-------------------|
| Score company-side demand signals | ✅ `scoreMarketOpportunity()` |
| Classify draft lifecycle state | ✅ `classifyMarketLifecycle()` |
| Detect stale / expired signals | ✅ `isStale()`, `STALE_DAYS=14`, `EXPIRED_DAYS=45` |
| Recommend internal promotion | ✅ `recommendInternalPromotion()` |
| Run daily light scan | ✅ `runDailyCompanyNeedScan()` |
| Run weekly deep scan | ✅ `runWeeklyCompanyNeedDeepScan()` |
| Run triggered scan on driver supply change | ✅ `runTriggeredCompanyNeedScan(trigger)` |
| Log market intelligence events | ✅ `logMarketSignal()`, auto-logged in scan runners |
| Expose signals to Operational Intelligence | ✅ `market_intelligence` field in OI payload |
| Refresh draft evaluations without writes | ✅ `refreshCompanyNeedDrafts()` |

---

## Explicit Non-Responsibilities

| Out of scope | Owner |
|-------------|-------|
| Driver–company matching | `lib/matchingAgent.ts` |
| SMS / email contact | `lib/contactAgent.ts` |
| Outreach approval | Cockpit + founder only |
| Setting `outreach_approved` | Founder via cockpit |
| Driver profile sharing | Contact Governance |
| Following up with drivers | `lib/followUpAgent.ts` |
| Manual CRM features | Not in scope |
| Job board scraping (V2) | Future work |

---

## Boundary with Matching Agent

```
Market Agent
  ├── Scores company-side demand (pain, urgency, freshness, contactability, fit)
  ├── Classifies lifecycle (research_discovered → active_public_signal → ready_for_internal_promotion)
  ├── Recommends internal promotion (founder must confirm)
  └── Produces: MarketSignal[] with scores and lifecycle

Matching Agent
  ├── Consumes: active_public_need company_needs (promoted by Market Agent recommendation)
  ├── Consumes: real driver pool from Driver Acquisition layer
  ├── Runs: buildShortlist() → scores driver–company fit
  └── Produces: shortlists with per-driver scores

These agents operate on different data planes and must NOT be merged.
```

---

## Boundary with Contact Governance Agent

```
Market Agent
  └── Produces: promotion_recommended = true (internal flag)

Contact Governance
  ├── Receives: contact_suggested from Matching Agent
  ├── Deduplicates: 14-day window per driver
  └── Requires: founder approval before any SMS/email

Market Agent NEVER sets outreach_approved.
Market Agent NEVER calls runContactAgent().
```

---

## Input Data

The Market Agent reads from these sources:

| Source | Data used |
|--------|-----------|
| `company_need_drafts` | draft_status, urgency, license_required, ykb_required, driver_card_required, missing_fields, metadata (scores + scan_date + ad_status) |
| `company_research_targets` | company_name (joined via target_id) |
| `system_actions` | Last scan timestamps (for OI display) |

**No driver data is read by the Market Agent.**

---

## Output Data

| Output | Type | Written to |
|--------|------|-----------|
| `MarketSignal[]` | Computed in-memory | Not persisted (refreshCompanyNeedDrafts) |
| `market_signal_detected` | system_actions | On signal evaluation |
| `company_need_promotion_recommended` | system_actions | When draft scores above threshold |
| `company_need_refresh_needed` | system_actions | When draft is stale |
| `company_need_expired` | system_actions | When draft is expired |
| `company_need_daily_scan_completed` | system_actions | After each daily run |
| `company_need_weekly_scan_completed` | system_actions | After each weekly run |
| `company_need_triggered_scan_completed` | system_actions | After each triggered run |
| `market_intelligence` | OI payload field | At OI request time |

---

## Lifecycle States

### company_need_drafts (Market Agent classification)

These are computed classifications derived from existing DB state — not new DB columns. They map existing draft data to actionable market intelligence states.

| State | Condition | Action |
|-------|-----------|--------|
| `research_discovered` | `missing_fields.length > 0` | Complete research before promoting |
| `active_public_signal` | Fresh + complete + composite < threshold | Monitor |
| `needs_refresh` | scan_date > 14 days old | Re-verify public sources |
| `ready_for_internal_promotion` | Complete + composite ≥ 65 + fresh | Promote via cockpit (founder confirms) |
| `promoted` | `draft_status = 'promoted'` | Check matching results |
| `expired` | scan_date > 45 days old (known date) | Archive or reject |
| `rejected` | `draft_status = 'rejected'` | No action |

**Priority order**: promoted > rejected > research_discovered > expired > needs_refresh > ready_for_internal_promotion > active_public_signal

### company_needs (existing NeedType — unchanged)

| need_type | Matchable | Contactable |
|-----------|-----------|-------------|
| `active_public_need` | ✅ Yes | ❌ No (requires outreach_approved) |
| `matching_eligible` | ✅ Yes | ❌ No |
| `contact_ready_candidate` | ✅ Yes | ❌ No |
| `outreach_pending_approval` | ✅ Yes | Pending founder approval |
| `outreach_approved` | ✅ Yes | ✅ Yes (46elks required) |
| `simulation_only` | ❌ No | ❌ Never |
| `archived_test` | ❌ No | ❌ Never |
| `expired` | ❌ No | ❌ No |

**Rule**: `matching_eligible` ≠ `outreach_approved`. A need used internally for matching does not automatically authorize external contact.

---

## Scoring Model

All scoring functions are **pure** (no DB access, deterministic, unit-tested).

### `scoreRecruitmentPain(input)` → 0–100

| Signal | Weight |
|--------|--------|
| urgency_signal: stated_urgency | +95 base |
| urgency_signal: repeated_ads | +75 base |
| urgency_signal: single_ad | +50 base |
| urgency_signal: none | +20 base |
| urgency: emergency | +15 |
| urgency: urgent | +8 |
| license_required: CE / CE+D | +5 |
| ykb_required | +3 |
| driver_card_required | +2 |
| Blended 60/40 with analyst's scan pain score | |

### `scoreUrgency(input)` → 0–100

Base: emergency=100, urgent=70, standard=30. Bonus from urgency_signal.

### `scoreFreshness(scanDateIso)` → 0–100

| Days since scan | Score |
|----------------|-------|
| 0–3 | 100 |
| 4–7 | 85 |
| 8–14 | 65 |
| 15–30 | 35 |
| 31–60 | 15 |
| > 60 | 0 |
| Unknown (null) | 50 |

### `scoreContactability(input)` → 0–100

| Barrier level | Base |
|--------------|------|
| low | 80 |
| medium | 55 |
| high | 25 |
| enterprise_only | 0 |

+10 if contact email known. +10 if decision maker name known. Blended 70/30 with analyst's contactability score.

### `scoreComposite(pain, fit10, freshness, contactability)` → 0–100

Weighted composite:

| Component | Weight |
|-----------|--------|
| recruitment_pain_score | 35% |
| drivernord_fit_score (×10 to normalize) | 25% |
| freshness_score | 25% |
| contactability_score | 15% |

### Promotion threshold

`composite >= 65` → `ready_for_internal_promotion`

---

## Frequency Model

### 1. Daily Light Scan

**Purpose**: Refresh freshness scores, detect stale signals, log staleness events.

**Endpoint**: `POST /api/admin/company-need-agent/daily-scan`

**Auth**: `x-recruiter-key`

**Recommended cron**: `0 6 * * *` (06:00 daily)

**What it does**:
- Evaluates all `company_need_drafts` (up to 200)
- Scores each draft with updated freshness (date-based, always current)
- Classifies lifecycle
- Logs `company_need_refresh_needed` for stale signals
- Logs `company_need_expired` for expired signals
- Logs `company_need_promotion_recommended` for qualified drafts
- Logs `company_need_daily_scan_completed`

**What it does NOT do**: no scraping, no matching, no contact, no outreach.

### 2. Weekly Deep Scan

**Purpose**: Full re-evaluation, national market summary, top opportunity ranking.

**Endpoint**: `POST /api/admin/company-need-agent/weekly-scan`

**Auth**: `x-recruiter-key`

**Recommended cron**: `0 5 * * 1` (Monday 05:00)

**What it does**: Same as daily + returns `top_opportunities` array ranked by composite score.

### 3. Triggered Scan

**Purpose**: Run targeted company-side search when driver supply changes materially.

**Endpoint**: `POST /api/admin/company-need-agent/triggered-scan`

**Auth**: `x-recruiter-key`

**Body**:
```json
{ "trigger": { "type": "driver_cluster", "domain": "schakt_bygg", "region": "stockholm", "count": 4 } }
```

**Trigger types**:

| Type | When to use |
|------|-------------|
| `driver_cluster` | 3+ drivers appeared in same domain/region |
| `ce_threshold` | 5+ CE drivers now active in pool |
| `rare_domain` | A rare domain appeared (kran, ADR, kylfrys, liftdumper) |

**CRITICAL**: The triggered scan produces company-side intelligence only. It does NOT run matching. The Matching Agent is a separate step triggered separately when a need is ready.

---

## Operational Intelligence Integration

The OI payload (`GET /api/admin/operational-intelligence`) includes an optional `market_intelligence` field:

```typescript
interface MarketIntelligenceSummary {
  last_daily_scan_at:    string | null; // ISO timestamp of last daily scan (within 24h window)
  last_weekly_scan_at:   string | null; // ISO timestamp of last weekly scan (within 24h window)
  promotion_candidates:  number;        // ready_for_review drafts not yet promoted
  stale_signals:         number;        // incomplete drafts with data gaps
  promoted_this_week:    number;        // drafts promoted in last 7 days
}
```

This field is computed from already-fetched data (no additional DB queries). It will be `undefined` until the first market scan runs.

---

## Safety Rules

| Rule | Enforcement |
|------|-------------|
| No SMS | Market Agent has no SMS provider dependency; AGENT_CONTACT_MODE irrelevant |
| No email | Not imported |
| No driver contact | Market Agent reads no driver data |
| No outreach_approved | Never set by this agent |
| No matching | `runMatchingAgent` not imported |
| No contactAgent call | `runContactAgent` not imported |
| Promotion recommendation ≠ promotion | Founder must explicitly call promoteDraft() |
| All output is internal | No external endpoints exposed |
| Auth on all routes | `requireRecruiterAuth()` on every handler |

**Test enforcement**: The test suite mocks `runMatchingAgent` and `runContactAgent` to throw errors. Any accidental call from within the Market Agent would fail the test.

---

## V1 Implementation Locations

| File | Purpose |
|------|---------|
| `lib/companyNeedMarketAgent.ts` | Core agent: scoring, lifecycle, scan runners, logging |
| `lib/systemActions.ts` | Extended: 7 new ActionTypes + 2 new TargetTypes |
| `app/api/admin/company-need-agent/daily-scan/route.ts` | POST endpoint |
| `app/api/admin/company-need-agent/weekly-scan/route.ts` | POST endpoint |
| `app/api/admin/company-need-agent/triggered-scan/route.ts` | POST endpoint |
| `app/api/admin/operational-intelligence/route.ts` | Extended: market_intelligence field |
| `tests/companyNeedMarketAgent.test.ts` | 92 tests across all functions |

---

## V1 Limitations (Known)

| Limitation | V2 Fix |
|-----------|--------|
| No real-time public source scraping (LinkedIn, Arbetsförmedlingen) | V2: external scraper module |
| `barrier_level` and `contact_email` not joined from research_targets in scoring | V2: join query in evaluateDrafts() |
| Scan freshness based only on `metadata.scan_date` from initial import | V2: update scan_date on each Market Agent scan |
| OI shows last scan times only within 24h window | V2: dedicated market_scans table or longer system_actions window |
| Triggered scan not automatically fired by driver ingestion events | V2: hook into `ingestLead.ts` post-ingestion |
| No cron scheduling (manual trigger only) | V2: `vercel.json` cron entries |
| No external scraping — drafts only refreshed from existing metadata | V2: integrate public job listing APIs |

---

## Implementation Roadmap

### V1 (current — 2026-05-20)

- [x] Pure scoring functions (pain, urgency, freshness, contactability, composite)
- [x] Lifecycle classification (7 states)
- [x] Promotion recommendation (threshold-based)
- [x] Daily / weekly / triggered scan runners
- [x] system_actions event types for all market events
- [x] API routes (3 POST endpoints, auth-protected)
- [x] OI integration (market_intelligence field)
- [x] Test suite (92 tests, 1064 total passing)
- [x] Documentation

### V2 (next — requires infra decisions)

- [ ] Real public source scanning (LinkedIn Scraping API, Arbetsförmedlingen open data, Google Jobs)
- [ ] Auto-trigger triggered scan from `ingestLead.ts` on driver cluster detection
- [ ] `vercel.json` cron entries for daily/weekly automation
- [ ] `last_checked_at` field update on company_research_targets after each scan
- [ ] Migration 017: add `market_lifecycle` computed cache column to `company_need_drafts`
- [ ] Migration 017: add `last_market_scan_at` to `company_needs`
- [ ] Join research_targets in scoring for real barrier_level / contact_email data
- [ ] Urgency keyword detection from source text (`omgående`, `snarast`, `akut`, `start omgående`)
- [ ] Repeated-ad detection across time (track ad seen dates)
- [ ] Domain pressure detection (multiple companies in same domain/region)

---

## Example API Calls

```bash
# Daily scan
curl -X POST http://localhost:3002/api/admin/company-need-agent/daily-scan \
  -H "x-recruiter-key: recruiter-local-dev"

# Weekly scan
curl -X POST http://localhost:3002/api/admin/company-need-agent/weekly-scan \
  -H "x-recruiter-key: recruiter-local-dev"

# Triggered scan — schakt_bygg cluster
curl -X POST http://localhost:3002/api/admin/company-need-agent/triggered-scan \
  -H "x-recruiter-key: recruiter-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"trigger":{"type":"driver_cluster","domain":"schakt_bygg","region":"stockholm","count":4}}'

# Triggered scan — CE threshold
curl -X POST http://localhost:3002/api/admin/company-need-agent/triggered-scan \
  -H "x-recruiter-key: recruiter-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"trigger":{"type":"ce_threshold","count":6}}'
```

---

## Example Response (daily scan)

```json
{
  "ok": true,
  "scan_type": "daily",
  "scanned_at": "2026-05-20T16:00:00.000Z",
  "drafts_evaluated": 17,
  "stale_detected": 0,
  "promotion_recommended": 6,
  "expired_detected": 0,
  "scan_action_id": "uuid",
  "signals": [
    {
      "company_name": "Edvardssons Last och Schakt AB",
      "draft_id": "53712577-...",
      "lifecycle": "promoted",
      "composite": 82,
      "promotion_recommended": false,
      "is_stale": false,
      "recommended_action": "Already promoted to active_public_need — check matching results"
    },
    {
      "company_name": "Canoil Transport AB",
      "draft_id": "uuid",
      "lifecycle": "ready_for_internal_promotion",
      "composite": 78,
      "promotion_recommended": true,
      "is_stale": false,
      "recommended_action": "Score 78 — promote to active_public_need; founder review before any outreach"
    }
  ]
}
```

---

_No external contact was made. All Market Agent output is internal intelligence only._
