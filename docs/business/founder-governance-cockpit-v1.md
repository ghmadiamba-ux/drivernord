# Founder Governance Cockpit — V1

**Status:** Implemented  
**Created:** 2026-05-20  
**Route:** `/admin/cockpit`  
**Auth:** `x-recruiter-key` header or `recruiter_session` cookie

---

## Purpose

The Governance Cockpit is the founder's single view of the AI-driven acquisition pipeline. Its purpose is to surface what the agents have done, flag what requires human judgment, and make blocked or risky actions visible before external contact is ever attempted.

It does not replace the agents. It does not automate outreach. It surfaces decisions.

---

## Why a Cockpit Is Governance, Not Recruiting

DriverNord is agent-led. Matching, shortlisting, deduplication, and market scanning are all automated. The founder's role in the system is:

1. Confirm or skip contact suggestions before SMS goes live
2. Promote market scan drafts to active company needs
3. Review data quality flags before approving any contact
4. Monitor operational signals to detect system drift

The cockpit is not a recruiter CRM. It has no candidate search, no manual shortlisting, no message composition. All of that is handled by the agent layer. The cockpit surfaces decisions that only a human can make: override a governance block, promote a draft, confirm identity.

---

## Architecture Relationship

```
Market Agent    ──→ company_need_drafts (promotion candidates)
Matching Agent  ──→ shortlist_entries (per-need scores)
Contact Agent   ──→ system_actions contact_suggested (pending queue)
DQ Scanner      ──→ system_actions data_quality_issue / driver_duplicate_detected
                              │
                              ▼
              /admin/cockpit  ──→ reads, does not write agent state
                              ──→ founder actions go via /api/admin/contacts/[id]
                              ──→ draft promotion via /api/admin/drafts/[id]/promote
```

The cockpit reads from the system. It does not trigger matching, does not run scans, does not modify shortlists.

---

## Sections

### A. Intelligence Signals

Ten signal tiles at the top of the page. Each is green (ok), amber (warn), or red (block).

| Signal | Meaning | Action if wrong |
|---|---|---|
| Open needs | Count of real (non-simulation) open company_needs | Promote a draft via Section D |
| Matching blocked | True if simulation data exists or no matchable needs | Remove simulation needs; promote a draft |
| External contact blocked | True until at least one `outreach_approved` need exists | Separate founder action (not yet implemented) |
| SMS safe | False if simulation needs are in company_needs table | Run cleanup SQL from `company-needs-cleanup-audit-v1.md` |
| Pending contacts | Count of pending `contact_suggested` system_actions | Review in Section C |
| DQ flagged drivers | All-time count of `data_quality_issue` actions | Review in Section C |
| Duplicate phones | All-time count of `driver_duplicate_detected` actions | Review in Section C |
| Promotion candidates | Count of `ready_for_review` drafts | Promote in Section D |
| Stale signals | Count of `incomplete` drafts | Market Agent needs more data |
| Last market scan | Timestamp of last `company_need_daily_scan_completed` | Run triggered scan if stale |

**Current production state (2026-05-20):**
- Open needs: 3 (JPC, Edvardssons, Enskede Bilexpress)
- Matching blocked: NO
- External contact blocked: YES (no outreach_approved needs)
- SMS safe: YES (simulation data removed)
- Pending contacts: varies
- DQ flagged: 24
- Duplicate phones: 6

---

### B. Active Needs & Matching Overview

One card per real open company need. Sorted by clean candidate count (highest first), then top score.

Each card shows:
- Company name
- License / domain / region / urgency
- Top match score (from shortlist_entries)
- Shortlisted count / clean count / blocked count
- Whether the need is matching-eligible
- Whether outreach has been approved (always false until separately enabled)

**Green highlight ("BEST MATCH"):** Applied when `blocked_candidates = 0`, `clean_candidates > 0`, and `top_match_score ≥ 90`.

**Current top priority:**

| Company | License | Domain | Urgency | Top Score | Clean |
|---|---|---|---|---|---|
| Enskede Bilexpress | CE | distribution | standard | 97 (Samir) | 5+ |
| JPC | CE | schakt_bygg | urgent | ~95 | varies |
| Edvardssons | CE | schakt_bygg | urgent | ~92 | varies |

Enskede is the strongest internal pilot because Samir (score 97) is clean — no DQ or duplicate flags.

---

### C. Contact Suggested Queue

All pending `contact_suggested` system_actions, grouped by governance status.

**Groups displayed in priority order:**

1. **Clean** — no DQ or duplicate flags. Confirm / Review / Skip available.
2. **Data quality flagged** — name contains phone number. Warning shown. Force override available after manual identity verification.
3. **Duplicate phone** — phone shared with another driver. Warning shown. Force override available after confirming canonical driver.
4. **DQ + Duplicate** — both flags present. Do not approve without full manual verification.

**Governance block flow:**
1. Founder clicks "Confirm" on a flagged candidate
2. API returns `422 blocked_data_quality`
3. Cockpit shows the block warning and a "Force confirm (identity verified)" button
4. Force confirm submits `{ action: "approve", force: true }` to `/api/admin/contacts/[id]`
5. Force approval is logged in `system_actions` as `contact_confirmed`

**What "Confirm" does:** Logs `contact_confirmed` in `system_actions`. No SMS is sent. No email is sent. The confirmation marks the candidate as approved pending 46elks activation.

**What "Skip" does:** Sets the `contact_suggested` action to `cancelled`. Logs `contact_skipped_by_founder`.

**What "Review" does:** Sets the action to `needs_review`. Logs `contact_needs_review`.

---

### D. Market Agent Recommendations

Four sub-groups derived from `company_need_drafts`:

1. **Ready to promote** — `draft_status = 'ready_for_review'`. Inline "Promote" button triggers `POST /api/admin/drafts/[id]/promote`. Creates a `company_need` with `need_type = 'active_public_need'`. No outreach is triggered.

2. **Recently promoted (last 7 days)** — `draft_status = 'promoted'`, `updated_at ≥ now - 7d`. Shown as done items.

3. **Stale / incomplete** — `draft_status = 'incomplete'`. Market Agent needs more data (missing fields listed).

4. **Rejected** — `draft_status = 'rejected'`. Informational. Rejection reason shown.

**What "Promote to active need" does:**
- Creates a `company_need` row with `need_type = 'active_public_need'`
- Sets the draft status to `promoted`
- Logs `company_need_draft_promoted` in `system_actions`
- Does NOT set `outreach_approved`
- Does NOT trigger driver contact
- Matching runs on the next agent cycle

---

## Data Flow

```
GET /api/admin/cockpit-summary
  ├─ company_needs (open, all types)       → active needs + simulation check
  ├─ system_actions (data_quality_issue)   → DQ driver IDs
  ├─ system_actions (driver_duplicate)     → dup driver IDs
  ├─ system_actions (contact_suggested)    → pending count
  ├─ company_need_drafts                   → market recommendations
  ├─ system_actions (daily_scan)           → last scan time
  ├─ shortlists (for each real need)       → shortlist IDs
  ├─ company_research_targets              → draft company names
  └─ shortlist_entries (for shortlists)    → match scores per driver

GET /api/admin/contacts
  └─ system_actions (contact_suggested)   → pending queue with DQ/dup enrichment
```

Total: ~9 queries. All read-only except the force-approve path.

---

## Action Rules

| Action | Triggers SMS | Triggers email | Modifies production | Requires governance clearance |
|---|---|---|---|---|
| Confirm (clean candidate) | NO | NO | system_actions only | NO |
| Confirm (flagged candidate) | NO | NO | Returns 422 | YES — must be blocked |
| Force confirm | NO | NO | system_actions only | YES — explicit override |
| Skip | NO | NO | system_actions status=cancelled | NO |
| Review | NO | NO | system_actions status=needs_review | NO |
| Promote draft | NO | NO | company_needs insert | NO |

---

## Blocked Actions

The cockpit does not and cannot:
- Send SMS (46elks not configured)
- Send email (hej@drivernord.com not configured)
- Set `outreach_approved` on company_needs automatically
- Trigger driver contact
- Share driver profiles externally
- Run matching (that is the Matching Agent's job)
- Delete production data

---

## Force Override Policy

Force override is available only for the "Confirm" action when governance block returns `422 blocked_data_quality`.

**Conditions:**
1. The block warning must be visible (the first attempt must have returned 422)
2. The founder must click "Force confirm (identity verified)" — a separate, explicit button
3. The force confirm submits `{ "action": "approve", "force": true }` to the API
4. The API logs the approval in `system_actions` regardless of DQ/dup flags

**When to use force override:**
- You have called the driver and verbally confirmed their identity
- You are confident the DQ flag is a data entry error, not a different person
- For duplicates: you have confirmed which record is the canonical driver and the contact action points to the correct one

**When NOT to use force override:**
- You have not verified identity
- The name field is a phone number and you do not know the driver's real name
- The duplicate is truly a different person sharing a phone (family/shared phone)

---

## Relationship to Market Agent

The Market Agent scans job boards and public signals to discover company driver needs. It creates `company_need_drafts` with `ready_for_review` status. The cockpit surfaces these drafts in Section D.

The founder promotes drafts to live company_needs. This is the only manual step in the demand pipeline — everything else is automated.

---

## Relationship to Matching Agent

The Matching Agent runs automatically, fetches all matchable needs and ingested drivers, scores them, creates shortlists, and fires `contact_suggested` system_actions. The cockpit surfaces these suggestions in Section C.

The cockpit does not control when matching runs. It only surfaces what the agent produced.

---

## Relationship to Contact Governance

Contact Governance is the layer that blocks risky approvals:
- DQ-flagged drivers (`data_quality_issue` system action exists for driver_id)
- Duplicate-flagged drivers (`driver_duplicate_detected` system action exists for phone)

Implemented in `app/api/admin/contacts/[id]/route.ts`. The cockpit's "Confirm" button calls this API. The 422 response surfaces the block in the UI with a force override option.

---

## Before-46elks Role

The cockpit's primary role before 46elks activation is:

1. **Surface candidate quality** — show which candidates are clean vs. flagged before any SMS is possible
2. **Build the approval queue** — founders can pre-approve candidates so that when 46elks is activated, the queue is ready to execute
3. **Monitor DQ backlog** — 24 DQ flags and 6 duplicate flags are visible and actionable now
4. **Promote market demand** — ensure the right company needs are live before the contact wave begins

After 46elks activation, `AGENT_CONTACT_MODE` can be set to `auto` and pre-approved candidates will receive SMS automatically.

---

## Governance Hardening (applied after initial build)

See `docs/business/cockpit-governance-hardening-v1.md` for full details. Summary:

1. **Force override now requires a written reason** — `force_reason` (min 10 chars) is required in the PATCH body when `force: true`. Stored in `system_actions` audit log. Both UI pages show a textarea before the force button can fire.

2. **Email added to driver mini-profile** — `email` field added to `ContactApprovalItem` and displayed in contact cards beneath the phone number.

3. **Governance status labels** — each contact card now shows one of: `Clean / Review-ready`, `Blocked: data quality`, `Blocked: duplicate phone`, or `Blocked: DQ + duplicate`. Border color matches the status.

4. **Need-level outreach approval gate** — implemented. See `docs/business/need-level-outreach-approval-gate-v1.md`. `POST /api/admin/needs/[id]/approve-outreach` sets `need_type = 'outreach_approved'`, logs an audit action, and is surfaced in Section B of the cockpit.

---

## Remaining Limitations

1. **No outreach approval revocation.** `POST /api/admin/needs/[id]/approve-outreach` transitions to `outreach_approved` but there is no cockpit action to revert it. Direct DB update required.

2. **No full per-driver profile view.** The cockpit shows the mini-profile (name, phone, email, license, domain, region, YKB, availability, governance status, match score). Full driver profile requires direct DB access.

3. **Market Agent scan is not triggerable from the cockpit.** Section D shows the last scan time. To trigger a new scan, use `POST /api/admin/company-need-agent/triggered-scan`.

4. **OI signals in Section A are not real-time.** The cockpit fetches on load and on manual refresh. No auto-polling is implemented at page level (unlike `/recruiter` which polls every 15s).

5. **hej@drivernord.com not configured.** Identity verification emails cannot be sent until Zoho setup is complete.

---

## URLs

| URL | Purpose |
|---|---|
| `/admin/cockpit` | Governance Cockpit V1 (this page) |
| `/admin/contacts` | Full contact approval queue |
| `/api/admin/cockpit-summary` | JSON summary payload |
| `/api/admin/operational-intelligence` | Full OI JSON |
| `/api/admin/contacts` | Contact queue API |
| `/api/admin/contacts/[id]` | PATCH to approve/skip/review |
| `/api/admin/drafts/[id]/promote` | POST to promote a draft |
| `/api/admin/needs/[id]/approve-outreach` | POST to approve a need for future outreach |
| `/api/admin/data-quality/scan` | POST to run retroactive DQ scan |
