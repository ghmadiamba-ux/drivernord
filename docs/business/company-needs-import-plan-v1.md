# Company Needs Import / Update Plan — v1

**Date:** 2026-05-19  
**Purpose:** Define how to safely update the `company_needs` and `companies` database  
**Governing principle:** No need is `contact_ready` until the founder explicitly validates it.  
**Related docs:** `company-needs-cleanup-audit-v1.md`, `company-needs-refresh-national-scan-v1.md`, `top-5-company-need-pilot-cases-v1.md`

---

## 1. Classification Model

The following classification model applies to all records in the `company_needs` research base. In the production database, status should remain `open` or `closed`. The classification is a research-layer concept tracked in documentation — not a database column (yet).

| Classification | Meaning | Contact allowed | Match engine | In DB |
|---------------|---------|----------------|--------------|-------|
| `simulation_only` | Created for funnel/pipeline testing | NEVER | Block | Yes (open — must close) |
| `archived_test` | Created for auth/API testing | NEVER | Block | Yes (open — must close) |
| `research_discovered` | Found in prior research pass; not yet live-verified | No | No | No |
| `unverified_public_need` | Found via public job ad scan; not yet founder-validated | No | No | No |
| `founder_review_required` | Strong evidence, ready for founder review and validation | No (not yet) | No | No |
| `contact_ready_candidate` | Founder validated need is real and current | Founder only (manual) | No | Yes (open) |
| `contact_ready` | All gates cleared: real need + real driver + DPA/agreement ready | Yes (automated) | Yes | Yes (open) |

**The key transition:** `contact_ready_candidate` → `contact_ready` requires:
1. A real driver in `ingested_drivers` that matches the need (license, region, availability)
2. A signed DPA between DriverNord and the company
3. The driver has explicitly consented to introduction with this company
4. 46elks is configured (or manual contact via founder workflow)
5. Simulation cleanup SQL has been executed (`sms_safe: true`)

---

## 2. What to Preserve

### 2.1 Simulation and test rows — PRESERVE, close
**Do NOT delete** any of the 19 existing simulation/test rows. They are part of the system's audit trail.

Action: Change `status` from `open` to `closed` for all 19 rows using the SQL in `company-needs-cleanup-audit-v1.md`.

After closure, these rows:
- Will no longer appear in `getOpenCompanyNeeds()` or `getMatchableOpenCompanyNeeds()`
- Will no longer trigger the `simulation_data_in_company_needs` warning
- Will remain in the database for historical reference

### 2.2 Research records in documentation
All records in `b2b-target-company-top-10-research.csv` and `company-needs-refresh-national-scan-v1.csv` are research documents, not database records. They should remain as-is. Do not delete research docs.

---

## 3. What to Update

### 3.1 Immediate: Close simulation rows (SQL already written)

```sql
-- FROM: company-needs-cleanup-audit-v1.md
-- Close all simulation and test company_needs (19 rows)
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
```

**Verification query:**
```sql
SELECT cn.id, c.name, cn.status
FROM company_needs cn
JOIN companies c ON c.id = cn.company_id
ORDER BY cn.status, c.name;
-- Expected: 0 rows with status='open', 19 with status='closed'
```

After this runs: `GET /api/admin/operational-intelligence` should return `sms_safe: true`.

### 3.2 Short-term: Add first real company need (founder action)

After founder validates one of the top 5 pilot candidates, add via API or Supabase:

**Option A — via API (preferred):**
```bash
curl -X POST https://drivernord.com/api/company/need \
  -H "x-recruiter-key: $RECRUITER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "JPC Entreprenad AB",
    "license_required": "CE",
    "domain_required": "schakt_bygg",
    "domain_preferred": ["distribution"],
    "location_region": "stockholm",
    "relocation_allowed": false,
    "shift_type": "day",
    "urgency": "urgent"
  }'
```

**Option B — direct Supabase insert (fallback):**
Insert into `companies` first (get the ID), then `company_needs` referencing that ID.

**Important:** Do not set `urgency = emergency` for any real company need in Phase 1. Emergency mode shortens the dedup window to 3 days and increases contact priority — use `urgent` or `standard` until the full contact workflow is validated.

---

## 4. What to Keep Research-Only

The following records from the national scan should remain in documentation only. Do not add to the production database:

| Company | Reason to keep research-only |
|---------|------------------------------|
| Transportfirma Trabé | Confirmed not hiring ("Vi söker inte chaufförer för tillfället") |
| Haninge Åkeri AB | Status unclear — no active job listing found |
| Sjölander Maskintransport AB | No active listing found in scan |
| Arena Personal (Jordbro client) | Underlying employer unnamed — staffing agency intermediary |
| Dagab / Axfood | Enterprise scale — not v1 pilot target |
| DHL Freight | Enterprise scale — not v1 pilot target |
| Rekryteringsgruppen | Staffing agency — partner track, not pilot client |
| Kraftsam Rekrytering | Ad recently expired; staffing agency |
| Diamond Express Åkeri | Decision-maker not confirmed |
| CHRC Åkeri AB | C-license only; DM not confirmed; small scale |
| Agil Arbetskraft AB | Staffing agency |
| Athletic Work Nordic | Staffing agency; seasonal roles |
| Jobwise (Spånga client) | Staffing agency; client unnamed |
| Submit Bemanning (Nacka) | Staffing agency; client unnamed |
| Simplex Bemanning (Årsta client) | Client unnamed; staffing intermediary |

---

## 5. What Needs Founder Review Before DB Entry

These five companies are ready for founder review. Each one needs a quick founder validation step before entering the production database:

| Company | Founder validation step | Time required |
|---------|------------------------|---------------|
| Canoil Transport AB | Visit canoil.se/jobb/tankbilschauffor/ — is listing still live? | 2 minutes |
| JPC Entreprenad AB | Visit jpcentreprenad.se/sok-jobb/ — are roles still listed? | 2 minutes |
| Edvardssons Last och Schakt AB | Check LinkedIn job ID 4096694551 — still active? | 2 minutes |
| Kyl- och Frysexpressen Mälardalen AB | Visit kylofrysexpressen.se/karriar/lediga-jobb/ — still active? | 2 minutes |
| Enskede Bilexpress AB | Check LinkedIn for current CE ad — still active? | 2 minutes |

**Total time for all 5 validations: ~10 minutes.**

After validation: add confirmed active companies to production `company_needs` with classification `contact_ready_candidate`.

---

## 6. What Must Never Be Contactable

| Record type | Reason | Gate |
|-------------|--------|------|
| All SIMULATION rows | Fake jobs — no real company behind them | `ENABLE_SIMULATION_MATCHING=false` (code-level) + `status='closed'` (DB-level) |
| All TEST rows | API test artefacts — no real company behind them | Same as above |
| Any need with `status='closed'` | Explicitly deactivated | `getOpenCompanyNeeds()` only returns `status='open'` rows |
| Staffing agency intermediaries | Cannot have a DPA with a company that isn't the actual employer | Policy level |
| Enterprise companies (DHL, Dagab, PostNord) | Procurement processes — no direct pilot possible | Policy level |
| Any need before DPA is signed | GDPR — driver data cannot be shared without DPA | Process level (founder gate) |

---

## 7. How to Update the Database Reversibly

### Principle: Never delete. Always close or update.

**Safe operations:**
```sql
-- SAFE: Change status to closed (reversible)
UPDATE company_needs SET status = 'closed' WHERE id = '...';

-- SAFE: Change urgency (no contact implications)
UPDATE company_needs SET urgency = 'standard' WHERE id = '...';

-- SAFE: Add a new company need (no deletion of history)
INSERT INTO companies (name) VALUES ('Real Transport AB');
INSERT INTO company_needs (...) VALUES (...);
```

**Unsafe operations (never do without explicit founder confirmation):**
```sql
-- NEVER: DELETE removes audit trail
DELETE FROM company_needs WHERE ...;
DELETE FROM companies WHERE ...;

-- NEVER: Changing to emergency without full contact workflow validation
UPDATE company_needs SET urgency = 'emergency' WHERE ...;
```

### Recovery if a wrong row was modified:
Because we never delete, recovery is always possible:
```sql
-- Reopen a need that was incorrectly closed
UPDATE company_needs SET status = 'open' WHERE id = '...';
```

---

## 8. What Conditions Are Required Before a Need Becomes `contact_ready`

A `company_need` transitions from `contact_ready_candidate` to operationally active when ALL of the following are true:

| Condition | How to verify | Current status |
|-----------|--------------|----------------|
| Need is based on a real company (founder validated) | Founder checked job listing or spoke to company | NOT DONE — pending scan validation |
| At least 1 driver in `ingested_drivers` matches the need | `GET /api/admin/operational-intelligence` → `high_priority_leads` contains matching license/region | UNKNOWN — depends on driver acquisition campaign |
| `sms_safe: true` in operational intelligence | Run simulation cleanup SQL, then check endpoint | NOT YET — simulation rows still open |
| `matching_blocked: false` | Follows from `sms_safe: true` | NOT YET |
| DPA signed between DriverNord and the company | Physical/digital document signed | NOT IN PLACE — template doesn't exist yet |
| Service agreement signed or scoped | Physical/digital document | NOT IN PLACE — template doesn't exist yet |
| Driver has given per-company consent | Driver SMS response "JA" or phone confirmation captured in shortlist_entry | Depends on 46elks configuration |
| `AGENT_CONTACT_MODE` is not `auto` (for first pilot) | Check Vercel env vars | Currently `suggest` — correct |
| 46elks configured (if automated) OR founder manual contact workflow (if manual) | Either 46elks env vars set OR founder has used manual workflow | NOT YET for automated; manual workflow available |

**Summary: For the first manual pilot, minimum conditions are:**
1. Simulation cleanup SQL executed (`sms_safe: true`)
2. At least 1 CE+YKB driver in `ingested_drivers` with `availability = now` or `week`
3. DPA draft ready (even if not fully lawyer-reviewed) for founder to present to company
4. Founder has verified the specific company's need is current

---

## 9. What Should Block SMS/Contact Automation

These conditions, in order of priority, block any automated contact:

| Blocker | Current state | Resolves when |
|---------|---------------|---------------|
| `sms_safe: false` | ACTIVE — simulation rows open | Simulation cleanup SQL executed |
| `SMS_PROVIDER` not set | ACTIVE — no provider configured | 46elks credentials set in Vercel |
| `AGENT_CONTACT_MODE=suggest` | Active — all contacts stay pending | Changed to `hybrid` or `auto` (only after all other gates clear) |
| No real `company_needs` with `status='open'` | ACTIVE — 0 real needs | First real need added post-founder validation |
| No `ingested_drivers` with matching profile | ACTIVE (likely) — depends on campaign | Driver acquisition campaign produces matching drivers |
| No DPA | ACTIVE — template doesn't exist | Legal templates created + signed |
| `AGENT_CONTACT_ENABLED=false` kill switch | Not currently active — remains available | Only activate if emergency stop needed |

---

## 10. Agentic Continuation — Company Need Discovery & Validation Agent

### Vision

This scan was performed manually (single-session research). The next evolution is an autonomous **Company Need Discovery & Validation Agent** that:

1. **Runs on a schedule** (weekly or on demand)
2. **Scans public sources**: Platsbanken API, Vakanser.se, LinkedIn job search, Indeed Sweden, company career pages for the known target list
3. **Detects recruitment pain signals**: repeated ads, urgency language, role count, specialist requirements
4. **Scores opportunities** using the same 3-dimension model (pain × fit × contactability)
5. **Refreshes existing records**: marks previously active needs as expired if ads no longer found; upgrades previously unclear records if new evidence appears
6. **Flags top candidates**: writes new rows to `company_need_drafts` table (migration 011) with classification `founder_review_required`
7. **Escalates to founder** via system_actions (action_type `need_ingested` or a new `need_candidate_flagged`)
8. **Separates research-useful from contact-ready**: never touches `company_needs` directly — only `company_need_drafts`
9. **Does not contact any company**: research only; contact remains in the manual founder workflow or contact approval cockpit

### Agent design (future spec)

```typescript
// Proposed: lib/agents/companyNeedDiscoveryAgent.ts

interface CompanyNeedCandidate {
  company_name:           string;
  source_url:             string;
  license_required:       License;
  domain_required:        Domain;
  location_region:        Region;
  urgency:                'standard' | 'urgent' | 'emergency';
  ad_status:              'active' | 'expired' | 'rolling';
  recruitment_pain_score: number; // 1–10
  drivernord_fit_score:   number; // 1–10
  contactability_score:   number; // 1–10
  classification:         'unverified_public_need' | 'founder_review_required';
  evidence_summary:       string; // human-readable rationale
  scan_date:              string;
}

// Step 1: scan public sources
async function scanPublicSources(): Promise<CompanyNeedCandidate[]>

// Step 2: score against current driver pool
async function scoreAgainstDriverPool(candidates: CompanyNeedCandidate[]): Promise<ScoredCandidate[]>

// Step 3: write to company_need_drafts (never to company_needs directly)
async function writeToStagingTable(candidates: ScoredCandidate[]): Promise<void>

// Step 4: log system action for founder review
async function flagForFounderReview(topCandidates: ScoredCandidate[]): Promise<void>
```

### Data sources the agent should scan

| Source | Type | Access method | Update frequency |
|--------|------|--------------|-----------------|
| Platsbanken API | Job listings | REST API (af.se) | Daily |
| Vakanser.se | Job listings | HTML scrape / RSS | Weekly |
| se.indeed.com | Job listings | Search index | Weekly |
| Known company career pages | Direct employer | HTTP GET per URL | Bi-weekly |
| LinkedIn Jobs (indexed) | Job listings | Search via Google site: | Weekly |
| TYA Trendindikator | Industry reports | Annual PDF | Annually |
| Transportföretagen publications | Industry data | RSS/website | Quarterly |

### Foundation tables already in place

- `company_need_drafts` (migration 011) — staging table for unvalidated needs
- `company_research_targets` (migration 008) — company-level research records
- `company_outreach_actions` (migration 009) — outreach tracking
- `pilot_company_relationships` (migration 010) — pilot relationship tracking
- `b2b_agent_warnings` (migration 012) — warnings for the B2B pipeline

The Company Need Discovery Agent would write to `company_need_drafts`, not `company_needs`. Only the founder (via Contact Approval Cockpit or Supabase) can promote a draft to an active company need.

### When to build this agent

**Build when:** The manual workflow becomes a bottleneck (i.e., after the first 3 pilot needs are validated and the founder is spending >30 minutes/week on company research).

**Do not build before:** The first real pilot company need is validated and the first real shortlist is delivered. The manual workflow documented in this scan is sufficient for Phase 1.

**Estimated complexity:** Medium. Web scraping + scoring logic + DB write + logAction. No LLM required for core function; LLM can be added for evidence summarization.

---

*Import plan v1 — 2026-05-19. All classification recommendations are advisory. Only the founder can authorize production database changes.*
