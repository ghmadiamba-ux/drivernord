# Cockpit Governance Hardening — V1

**Status:** Implemented  
**Created:** 2026-05-20  
**Depends on:** `founder-governance-cockpit-v1.md`

---

## Summary of Changes

This document describes the governance hardening layer applied to the Founder Governance Cockpit after the initial V1 build. It covers five changes:

1. Force override requires a written reason
2. Driver mini-profile view (email added, governance status label)
3. Clean vs blocked clarity labels
4. Future outreach approval gate (concept, not implemented)
5. Tests covering the above

---

## 1. Force Override Reason Requirement

### What changed

`PATCH /api/admin/contacts/[id]` now requires a `force_reason` field in the request body whenever `force: true` is submitted.

**Minimum length:** 10 characters (trimmed). Constant: `FORCE_REASON_MIN_LENGTH = 10` in `app/api/admin/contacts/[id]/route.ts`.

**Validation timing:** The reason is checked BEFORE the governance block query. This means `{ force: true }` always requires a reason, even if the founder cannot yet know whether the candidate would be governance-blocked. This is intentional — the reason documents why the founder believed they had grounds to override before submitting.

**Error response (400):**
```json
{
  "error":   "force_reason_required",
  "message": "A written reason (minimum 10 characters) is required to force-approve a governance-blocked candidate.",
  "hint":    "Add \"force_reason\": \"...\" to the request body explaining why the governance block is being bypassed."
}
```

**Persistence:** On successful force approval, `logAction` records:
- `input.force_override: true`
- `input.force_reason: "<trimmed reason>"`
- `input.note: "force_approved_without_sms — <trimmed reason>"`

This creates an audit trail in `system_actions` for every override.

### UI changes

Both `/admin/contacts` (`ContactCard`) and `/admin/cockpit` (`QueueItemRow`) now show a textarea when the governance block is triggered:

- Textarea is required before the "Force approve (identity verified)" button executes
- Client-side validation: `< 10 chars` → error shown inline, button does not fire
- Textarea state (`forceReason`) is forwarded as `force_reason` in the PATCH body

---

## 2. Driver Mini-Profile View

### What changed

`ContactApprovalItem` interface and `getContactApprovalQueue()` now include `email: string | null`.

The `ingested_drivers` select query was updated:
```typescript
// Before
.select('id, license, ykb, region, availability, domain')

// After
.select('id, license, ykb, region, availability, domain, email')
```

### UI display

Both contact pages now show the driver's email address (if present) beneath the phone number in the mini-profile header. The email is shown in `text-slate-600` monospace, distinguishing it from the phone.

**Fields visible in the mini-profile:**
- Name (with governance status badge)
- Phone (monospace)
- Email (monospace, if present)
- Company + need ID
- Governance status label (see §3)
- Match score
- License, domain, region, YKB, availability (chip row)

---

## 3. Clean vs Blocked Clarity Labels

### Label definitions

| State | Label | Color |
|---|---|---|
| No flags | `Clean / Review-ready` | emerald-400 |
| DQ flag only | `Blocked: data quality` | yellow-400 |
| Duplicate phone only | `Blocked: duplicate phone` | orange-400 |
| Both flags | `Blocked: DQ + duplicate` | red-400 |

Labels are derived by the `governanceLabel(hasQuality, hasDuplicate)` helper, present in both UI pages.

### Border colors

Cards and rows now use border colors that match the governance state:
- Clean: `border-slate-800`
- DQ blocked: `border-yellow-800`
- Duplicate blocked: `border-orange-800`
- Both blocked: `border-red-800`

Previously, all flagged cards used a single yellow border regardless of the type of block.

---

## 4. Future Outreach Approval Gate (Concept)

**This section documents a planned feature. Nothing here has been implemented.**

### Context

After 46elks activation, the system will be capable of sending SMS to drivers. Before that can happen, at least one company need must have `need_type = 'outreach_approved'`. This flag is the outreach gate.

Currently, `outreach_approved` can only be set via direct database update. The cockpit does not expose this action and cannot set it.

### Planned flow (not yet built)

```
Founder (cockpit) → POST /api/admin/needs/[id]/approve-outreach
  → validates need has real candidates (clean, shortlisted)
  → sets need_type = 'outreach_approved' on company_need
  → logs need_outreach_approved in system_actions
  → does NOT trigger contact agent immediately
  → matching agent picks up on next cycle (or triggered scan)
```

### Safeguards to implement

1. **Confirmation step required** — must be a two-step action (confirm intent, then approve), not a single click
2. **Candidate count validation** — cannot approve outreach if `clean_candidates = 0` for the need
3. **One-way gate** — once `outreach_approved`, downgrading to `matching_eligible` should require an explicit separate action
4. **Audit log** — every state change logged to `system_actions`
5. **No bulk approval** — only one need approved per action; prevents accidental mass outreach

### Why it is not implemented now

- 46elks is not configured. No SMS can be sent regardless.
- Setting `outreach_approved` without a working SMS provider has no effect except enabling the SMS send path, which is currently simulated.
- The cockpit's role before 46elks activation is to build the approval queue and verify candidate quality. Outreach approval is a separate decision that should be made when the communication layer is ready.

### When to implement

Implement the outreach approval gate at the same time as (or immediately before) 46elks activation. The implementation must be tested against a non-production Supabase environment before any production use.

---

## 5. Tests

### New tests added (`tests/contactApproval.test.ts`)

| Test | What it verifies |
|---|---|
| `returns 400 when force=true but force_reason is missing` | force without reason is rejected before governance check |
| `returns 400 when force_reason is shorter than 10 characters` | minimum length enforced |
| `approve succeeds with force: true + valid reason despite quality issue` | valid force reason allows override |
| `approve succeeds with force: true + valid reason despite duplicate phone` | same, for duplicate block |
| `persists force_reason in contact_confirmed log entry` | reason stored in `system_actions.input` with `force_override: true` |

### Updated tests

Existing force-approve tests were updated to include `force_reason: 'Called driver, identity confirmed'` (or similar ≥10 char string) so they remain valid after the reason requirement was added.

### Test count

- `contactApproval.test.ts`: 34 tests (up from 29)
- All test files: 1128 tests passing

---

## Non-Negotiable Constraints (Unchanged)

These constraints remain in effect after hardening:

- No SMS is sent
- No email is sent
- No contact with companies
- No contact with drivers
- 46elks is not activated
- `outreach_approved` is not set automatically
- Driver profiles are not shared externally
- Production data is not hard-deleted
- Meta campaigns are not modified
- Contact Governance is not bypassed
- The cockpit does not perform matching
- The cockpit does not send external contact by itself
