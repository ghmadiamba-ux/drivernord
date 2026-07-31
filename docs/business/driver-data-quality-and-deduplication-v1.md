# Driver Data Quality & Deduplication — v1

**Status:** Active  
**Created:** 2026-05-20  
**Applies to:** All `ingested_drivers` records; enforced before 46elks activation

---

## Problem Summary

Two categories of data quality issues were identified in the ingested driver corpus:

**1. Duplicate phone numbers**  
Multiple `ingested_drivers` rows share the same phone number, meaning different form submissions likely represent the same person. Before 46elks activation, contacting both records would result in duplicate outreach to the same driver — a serious UX and trust problem.

**2. Name field contains phone number**  
Some drivers entered their phone number (or another numeric string) into the name field of the registration chat. This typically happens when the driver misreads the prompt or copy-pastes the wrong value. The name field is used in SMS templates and cockpit display — a phone number in that field would produce malformed outreach.

Both issues are silent: no validation error is raised at ingestion, no warning appears in the cockpit. The deduplication and data quality layer described in this document makes these issues visible, blockable, and auditable.

---

## Known Affected Records (as of 2026-05-20 scan)

### Duplicate pair — Samuel Saman / Samuel Rajabi

| Field | Canonical | Duplicate |
|---|---|---|
| `id` | `3349c272-15d2-4739-9eb6-8341b3aff559` | `876c1f26-a521-4983-bab5-ed2a885b83c2` |
| `firstName` | Samuel Saman | Samuel Rajabi |
| `phone` | `0733344130` | `0733344130` |

The canonical driver is the first-ingested record. The duplicate was flagged with a `driver_duplicate_detected` system action (triggered_by: `scan:dataQualityScan_v1`).

### Name = phone number — +46793055655

| Field | Value |
|---|---|
| `id` | `cb03d529-05bc-437e-84ce-fcd5dbeb1ae8` |
| `firstName` | `+46793055655` |
| `phone` | `+46793055655` |
| `email` | `+46793055655` |

This driver's name, phone, and email are all the same phone number string. Flagged with a `data_quality_issue` system action with `issues: ["name_is_phone_number", "email_is_phone_number"]`.

### Full scan results

The retroactive scan on 2026-05-20 processed **53 active ingested drivers** and produced:

- `new_duplicate_flagged`: 6  
- `new_dq_flagged`: 24  
- `already_flagged`: 0  
- `errors`: 0

---

## Safe Correction Model

No records are deleted or merged. The correction model is **flag-and-block**:

1. A `system_actions` row is inserted with the relevant issue type (`driver_duplicate_detected` or `data_quality_issue`).
2. The raw `ingested_drivers` record remains intact.
3. Any approval attempt via the contact approval API is blocked at the governance layer.
4. The audit trail is fully preserved.

This approach allows a human reviewer to inspect flagged records and override with `force: true` when appropriate.

---

## Duplicate Policy

### Detection

At ingestion time (`lib/ingestLead.ts`): if a phone number already exists in `ingested_drivers`, the new record is flagged immediately.

Retroactively (`lib/dataQualityScan.ts` → `scanAndLogExistingIssues()`): scans all active ingested drivers, builds a phone→ids map, and logs `driver_duplicate_detected` for each non-canonical entry that lacks an existing flag.

### System action schema

```json
{
  "action_type": "driver_duplicate_detected",
  "target_type": "ingested_driver",
  "target_id":   "<duplicate driver id>",
  "triggered_by": "scan:dataQualityScan_v1",
  "status": "completed",
  "input": {
    "phone":       "<shared phone number>",
    "existing_id": "<canonical driver id>",
    "new_id":      "<duplicate driver id>"
  }
}
```

### Canonical selection rule

The first-ingested driver (lowest index in the active driver list) is the canonical record. All subsequent drivers sharing the same phone are marked as duplicates.

### Approval block

`PATCH /api/admin/contacts/[id]` with `action: "approve"` queries `system_actions` for any `driver_duplicate_detected` row whose `input.phone` matches the contact action's phone. If found, the API returns:

```json
{
  "error": "blocked_data_quality",
  "has_duplicate": true,
  "warning": "Driver phone matches a duplicate record. Multiple drivers share this phone number.",
  "force_available": true,
  "hint": "Resubmit with { \"action\": \"approve\", \"force\": true } to override this warning."
}
```

HTTP status: `422 Unprocessable Entity`.

To override: resubmit with `{ "action": "approve", "force": true }` after manually confirming the driver identity.

---

## Name = Phone Number Policy

### Detection

`lib/dataQuality.ts` → `detectDataQualityIssues()`: calls `looksLikePhoneNumber(firstName)`. A string "looks like" a phone number if it contains 7+ digits, optionally with spaces, dashes, or a leading `+`.

Also detects `email_is_phone_number` using the same heuristic applied to the email field.

### System action schema

```json
{
  "action_type": "data_quality_issue",
  "target_type": "ingested_driver",
  "target_id":   "<driver id>",
  "triggered_by": "scan:dataQualityScan_v1",
  "status": "completed",
  "input": {
    "issues": ["name_is_phone_number"]
  }
}
```

`issues` is an array and may contain multiple values if multiple fields are affected.

### Approval block

Same governance check as duplicates: if a `data_quality_issue` row exists for `target_id` matching the contact's `driver_id`, the API returns:

```json
{
  "error": "blocked_data_quality",
  "has_quality_issue": true,
  "warning": "Driver has a data quality issue (name contains phone number). Verify driver identity before approval.",
  "force_available": true
}
```

HTTP status: `422 Unprocessable Entity`.

`skip` and `needs_review` actions bypass the governance check entirely — they do not require DQ clearance.

---

## Cockpit Implications

### Contact approval queue (`/recruiter/contacts`)

Items in the queue are enriched with `has_quality_issue` and `has_duplicate` flags by `lib/contactApproval.ts → getContactApprovalQueue()`. The UI should surface these flags visually (warning badge) before the recruiter attempts to approve.

Approving a flagged item via the API will return 422. The cockpit must handle this gracefully and offer the `force: true` path with an explicit confirmation step.

### Operational Intelligence (`/api/admin/operational-intelligence`)

The OI payload includes a `contact_governance` section (all-time counts, not windowed to 24h):

```json
{
  "contact_governance": {
    "dq_flagged_driver_count":       24,
    "duplicate_flagged_phone_count":  6
  }
}
```

These counts reflect all `data_quality_issue` and `driver_duplicate_detected` system actions ever logged. They do not decrement when drivers are reviewed — they represent the size of the DQ backlog that entered the system.

---

## Before-46elks Checklist

The following must be true before 46elks is activated and SMS outreach begins:

- [ ] All `new_duplicate_flagged` drivers from the initial scan have been reviewed and either confirmed as canonical or permanently suppressed
- [ ] The `+46793055655` record (`cb03d529-...`) has been manually inspected — name field corrected or record suppressed
- [ ] Any `contact_suggested` action pointing to a duplicate or DQ-flagged driver has been set to `cancelled` or reviewed via `needs_review`
- [ ] Cockpit UI visually surfaces `has_quality_issue` and `has_duplicate` flags on pending approvals
- [ ] `force: true` approval path includes a manual confirmation dialog in the cockpit
- [ ] The retroactive scan endpoint (`POST /api/admin/data-quality/scan`) has been run at least once post-activation to catch any newly ingested drivers that slipped through ingestion-time checks
- [ ] hej@drivernord.com (Zoho) is configured — required for email-based identity verification of flagged drivers

---

## Next Internal Step

1. **Resolve the 6 duplicates and 24 DQ records** manually in the cockpit or via the scan API. For each: either mark canonical and suppress duplicates, or use `needs_review` to defer.

2. **Fix the `+46793055655` record**: this driver's name is their own phone number. If they can be reached via the phone number to confirm their real name, update the record. Otherwise suppress.

3. **Wire the cockpit UI** to the `has_quality_issue` / `has_duplicate` flags already returned by `getContactApprovalQueue()`. The API-level governance block is in place; the cockpit just needs to show it.

4. **Configure hej@drivernord.com (Zoho)** so that identity-verification emails can be sent to flagged drivers before outreach begins.

5. **Run the scan endpoint** (`POST /api/admin/data-quality/scan`) after every batch ingestion to catch new issues early.
