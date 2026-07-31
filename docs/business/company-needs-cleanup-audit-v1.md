# company_needs Cleanup Audit — v1

**Audited:** 2026-05-19  
**Method:** Full table scan of `company_needs` + JOIN with `companies`  
**Rows inspected:** 19 company_needs / 19 companies  
**Real companies found:** 0

---

## Summary

| Classification | Count | SMS Safe | Matchable |
|---------------|-------|----------|-----------|
| REAL_COMPANY   | 0     | —        | —         |
| SIMULATION     | 15    | NO       | NO        |
| TEST           | 4     | NO       | NO        |
| **TOTAL**      | **19**| **NO**   | **NO**    |

**Verdict: Zero real company rows exist. All matching is currently against fake data. SMS must remain disabled.**

---

## Full Classified Table

### SIMULATION rows (prefix: "SIMULATION …" or "SIM-FP-v2 …")

These were inserted during funnel pipeline testing. They appear in three batches (2026-05-05, 2026-05-05 duplicate batch, 2026-05-06 SIM-FP-v2 batch).

| need_id (short) | company_name | license | domain | urgency | status | created | risk |
|-----------------|-------------|---------|--------|---------|--------|---------|------|
| 6fa629ee | SIMULATION Stockholm Distribution AB | CE | distribution | urgent | open | 2026-05-05 | HIGH |
| b5249c6b | SIMULATION ByggLogistik Sverige | C | schakt_bygg | standard | open | 2026-05-05 | HIGH |
| 35ab4ffd | SIMULATION Nordic Long Haul | CE | fjarrtransport | urgent | open | 2026-05-05 | HIGH |
| e8032c81 | SIMULATION City Passenger Transport | D | budtransport | standard | open | 2026-05-05 | HIGH |
| a0d3a125 | SIMULATION Stockholm Flexible Fleet | CE | distribution | **emergency** | open | 2026-05-05 | CRITICAL |
| dd45a54f | SIMULATION Stockholm Distribution AB (dup) | CE | distribution | urgent | open | 2026-05-05 | HIGH |
| ef0fbf46 | SIMULATION ByggLogistik Sverige (dup) | C | schakt_bygg | standard | open | 2026-05-05 | HIGH |
| 6088788c | SIMULATION Nordic Long Haul (dup) | CE | fjarrtransport | urgent | open | 2026-05-05 | HIGH |
| f582aa3b | SIMULATION City Passenger Transport (dup) | D | budtransport | standard | open | 2026-05-05 | HIGH |
| 844ca3b5 | SIMULATION Stockholm Flexible Fleet (dup) | CE | distribution | **emergency** | open | 2026-05-05 | CRITICAL |
| 3430afe3 | SIM-FP-v2 Stockholm Distribution AB | CE | distribution | urgent | open | 2026-05-06 | HIGH |
| bf124457 | SIM-FP-v2 ByggLogistik Sverige | C | schakt_bygg | standard | open | 2026-05-06 | HIGH |
| 8dac25b8 | SIM-FP-v2 Nordic Long Haul | CE | fjarrtransport | urgent | open | 2026-05-06 | HIGH |
| 45e82396 | SIM-FP-v2 City Passenger Transport | D | budtransport | standard | open | 2026-05-06 | HIGH |
| 36d01813 | SIM-FP-v2 Stockholm Flexible Fleet | CE | distribution | **emergency** | open | 2026-05-06 | CRITICAL |

**Notes:**
- 3 rows have `urgency = emergency`. If 46elks activates, these get 3-day dedup window and highest contact priority — against a fake company.
- Two complete duplicate sets (same 5 archetypes inserted twice on 2026-05-05, then again as SIM-FP-v2 on 2026-05-06).

---

### TEST rows (names contain "Test", "Probe", "Auth")

| need_id (short) | company_name | license | domain | urgency | status | created | risk |
|-----------------|-------------|---------|--------|---------|--------|---------|------|
| 3da6ac6b | Test Logistics | C | distribution | standard | open | 2026-05-03 | HIGH |
| f2b627fe | Real Transport Test | C | distribution | standard | open | 2026-05-03 | HIGH |
| a0c8c41f | Auth Test Co | CE | distribution | standard | open | 2026-05-06 | HIGH |
| ffb22b13 | Probe Live | CE | distribution | standard | open | 2026-05-06 | HIGH |

**Notes:**
- "Real Transport Test" — the word "Real" in the name is misleading. The company name contains "Test" and was inserted during auth/API testing.
- "Probe Live" — inserted during live system probe. Not a real transport company.
- "Auth Test Co" — auth flow validation row.

---

## Risk Assessment

### Why these rows are dangerous

1. **SMS contact would reach real drivers about fake jobs.** The matching engine currently runs against these rows. Real drivers (HIGH priority) are being shortlisted against "SIMULATION Stockholm Distribution AB". If 46elks activates, those drivers would receive an SMS about a job that does not exist.

2. **Emergency urgency = shortest dedup window.** Three simulation rows have `urgency = emergency`. The contact agent uses a 3-day dedup window for emergency needs (vs 14 days for standard). Real drivers contacted for a fake emergency job would be blocked from re-contact for 3 days.

3. **Pending contact_suggested backlog may reference simulation needs.** All existing `contact_suggested` actions in `system_actions` were generated against these simulation company_needs. Activating 46elks would execute them all.

---

## Recommended Action Per Row

| Category | Recommended Action | Priority |
|----------|-------------------|----------|
| All SIMULATION rows (15) | Close status → `closed` in Supabase | Before any SMS activation |
| All TEST rows (4) | Close status → `closed` in Supabase | Before any SMS activation |
| All 19 corresponding companies | Leave in place (historical record) | No action needed |
| Existing `contact_suggested` system_actions | Review and cancel (set status → `cancelled`) | Before SMS activation |

**DO NOT DELETE any rows.** Closing status to `closed` is sufficient and reversible. Deletion destroys history.

---

## SQL to execute (confirm before running)

```sql
-- Step 1: Close all simulation and test company_needs
-- REVIEW before executing — this affects 19 rows

UPDATE company_needs
SET status = 'closed'
WHERE company_id IN (
  SELECT id FROM companies
  WHERE name ILIKE '%SIMULATION%'
     OR name ILIKE 'SIM-%'
     OR name ILIKE '%Test%'
     OR name ILIKE '%Probe%'
     OR name ILIKE '%Auth%'
);

-- Step 2: Verify result
SELECT cn.id, c.name, cn.status
FROM company_needs cn
JOIN companies c ON c.id = cn.company_id
ORDER BY cn.created_at;
```

**Expected result after Step 1:** 0 open company_needs, 19 closed.

---

## What happens after cleanup

1. `getOpenCompanyNeeds()` returns 0 rows → no matching runs until a real need is added
2. `simulation_data_in_company_needs` system warning disappears → `sms_safe` becomes `true`
3. `contact_suggested` pending backlog still exists but references closed needs → safe to cancel or leave

---

## How to add the first real company need

Use the `POST /api/company/need` endpoint (or direct Supabase insert) with a real transport company. The `ENABLE_SIMULATION_MATCHING=false` safety filter (implemented in code) will prevent accidentally matching against any remaining simulation rows even if they somehow remain open.

---

## Current matching safety status

| Gate | Status |
|------|--------|
| `sms_safe` flag in operational intelligence | BLOCKED (simulation data present) |
| `ENABLE_SIMULATION_MATCHING` env var | `false` (code filter added) |
| `AGENT_CONTACT_MODE` | `suggest` (no auto-send) |
| `SMS_PROVIDER` env var | not set (simulated provider only) |
| `46elks` credentials | not configured |

**SMS activation requires ALL gates to be green.**
