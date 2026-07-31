# Operational Intelligence Layer — v1

**Built:** 2026-05-19  
**Status:** Live — deployed with campaign traffic

---

## What was built

A minimal, read-only intelligence layer that answers three questions every morning:

1. **Who registered** — funnel metrics, lead counts by priority, high-priority leads with phone + region
2. **What is broken** — data quality issues, duplicate registrations, system warnings, SMS safety gate
3. **What needs action** — ranked list of urgent actions with counts and plain-language instructions

No agents were activated. No SMS was sent. No production data was modified.

---

## Files changed

| File | Type | What it does |
|------|------|-------------|
| `lib/dataQuality.ts` | New | Pure functions: `looksLikePhoneNumber`, `detectDataQualityIssues` |
| `lib/systemActions.ts` | Modified | Added 3 action types: `driver_duplicate_detected`, `data_quality_issue`, `high_priority_lead_detected` |
| `lib/ingestedDriverStore.ts` | Modified | Added `findIngestedDriverByPhone` for duplicate detection |
| `lib/ingestLead.ts` | Rewritten | Duplicate check → insert → quality flag → priority alert |
| `lib/warnings.ts` | Modified | Added `isSimulationCompanyName` + simulation company warning |
| `app/api/admin/operational-intelligence/route.ts` | New | Protected GET endpoint |
| `tests/dataQuality.test.ts` | New | 27 tests for pure detection functions |
| `tests/operationalIntelligence.test.ts` | New | 12 tests for the endpoint (auth, shape, funnel, SMS safety, urgent actions) |

---

## Endpoint

```
GET /api/admin/operational-intelligence
```

**Auth:** `x-recruiter-key: <RECRUITER_API_KEY>` header (or `recruiter_session` cookie)  
**Window:** last 24 hours for funnel + ingestion data; pending backlog is all-time

### Response shape

```typescript
{
  generated_at:          string;       // ISO timestamp
  window_hours:          24;
  funnel: {
    total_sessions:      number;
    completed:           number;       // lead_status = 'ready_for_ingestion'
    incomplete:          number;
    disqualified:        number;
    anonymous_dropoff:   number;
    completion_rate_pct: number;
  };
  ingested_drivers: {
    total: number;
    high:  number;
    medium: number;
    low:   number;
  };
  high_priority_leads:   HighPriorityLead[];   // sorted newest first
  data_quality_warnings: DataQualityWarning[]; // from system_actions
  duplicate_warnings:    DuplicateWarning[];
  pending_contact_suggested: number;           // all-time backlog
  campaign_breakdown:    CampaignSummary[];    // by utm_campaign / utm_source / utm_content
  top_regions:           { region: string; count: number }[];
  top_licenses:          { license: string; count: number }[];
  system_warnings:       Warning[];            // from lib/warnings.ts
  sms_safe:              boolean;              // false if simulation data in company_needs
  urgent_actions:        UrgentAction[];       // sorted by criticality
}
```

### Urgent action types

| type | trigger |
|------|---------|
| `contact_high_priority_manually` | HIGH priority drivers in last 24h |
| `clean_simulation_company_needs` | simulation company data detected |
| `review_data_quality` | drivers with name/email = phone number |
| `review_duplicate_registrations` | duplicate phone registrations skipped |
| `pending_contact_actions` | contact_suggested backlog > 0 |

---

## How ingestLead now works

```
getLead(id)
  → buildDriverProfile()
  → buildIngestedDriver()
  → scoreDriver()
  → findIngestedDriverByPhone()   ← NEW: blocks duplicates
      if duplicate: log driver_duplicate_detected, return { persisted: false }
  → createIngestedDriver()        ← only if not duplicate
  → detectDataQualityIssues()     ← NEW: fire-and-forget
      if not clean: log data_quality_issue
  → if priority === HIGH:         ← NEW: fire-and-forget
      log high_priority_lead_detected
  → return { ok: true, persisted: true }
```

Post-insert logging is fire-and-forget (`.catch(() => {})`) — a logging failure never blocks ingestion.

---

## SMS safety gate

The `sms_safe` field in the payload is `false` whenever the `simulation_data_in_company_needs` system warning is present. This warning fires if any open `company_needs` row links to a company whose name matches one of:

```
SIMULATION, SIM-, Test, Probe, Auth Test
```

**Do not activate 46elks while `sms_safe === false`.**

---

## Known risks as of 2026-05-19

| Risk | Status |
|------|--------|
| Simulation companies in `company_needs` | Active — all open needs point to test companies. Blocks SMS. |
| ~40% of first-day drivers entered phone number in name/email field | Detected and logged. `data_quality_issue` actions in `system_actions`. |
| Duplicate phone registrations | Blocked from ingestion. `driver_duplicate_detected` logged. |
| 46elks not configured | `AGENT_CONTACT_MODE=suggest` — all contact stays pending. |

---

## How to use it

**Daily check (founder):**
```bash
curl https://drivernord.com/api/admin/operational-intelligence \
  -H "x-recruiter-key: $RECRUITER_API_KEY" | jq .
```

Check `urgent_actions` first. If `sms_safe` is `false`, do not activate 46elks.  
If `high_priority_leads` is non-empty, contact those drivers manually (phone or WhatsApp) before the automated SMS backlog is processed.

---

## What this does NOT do

- No SMS sent (46elks not configured)
- No production data deleted or modified
- No Meta campaign changes
- No agent activation

---

## Next steps

1. **Clean `company_needs`** — remove or archive simulation/test rows so `sms_safe` becomes `true`
2. **Fix the UX flow** — the name/email fields need placeholder text or validation to prevent phone number entry
3. **Admin dashboard UI** — surface this endpoint in the cockpit (`/admin`) so the founder doesn't need curl
4. **48h re-contact dedup** — once SMS is live, prevent re-contacting the same driver within 48h
5. **Automated daily digest** — email or Slack summary of the intelligence payload each morning
