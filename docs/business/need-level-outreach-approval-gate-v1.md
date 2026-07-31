# Need-Level Outreach Approval Gate — V1

**Status:** Implemented  
**Created:** 2026-05-20  
**Route:** `POST /api/admin/needs/[id]/approve-outreach`  
**Auth:** `x-recruiter-key` header or `recruiter_session` cookie  
**Cockpit:** `/admin/cockpit` → Section B: Active Needs

---

## Purpose

The Need-Level Outreach Approval Gate allows the founder to explicitly record that a company need is eligible for future external outreach. It is a governance checkpoint — not an action that sends anything.

Before this gate existed, there was no way to distinguish between:
- A need that is merely matching-eligible (shortlist exists but outreach not authorized)
- A need that the founder has reviewed and explicitly approved for contact

This gate creates that distinction.

---

## What It Does and Does Not Do

| What it DOES | What it DOES NOT do |
|---|---|
| Sets `need_type = 'outreach_approved'` | Send SMS |
| Logs `company_need_outreach_approved` in `system_actions` | Send email |
| Records reason, approver, timestamp, prior state | Contact drivers |
| Clears the `external_contact_blocked` signal | Contact companies |
| Shows "Outreach approved" badge in cockpit | Approve individual `contact_suggested` items |
| Requires a written reason (min 10 chars) | Bypass DQ or duplicate governance blocks |
| Requires RECRUITER_API_KEY authentication | Activate 46elks |
| Returns a note confirming no SMS was sent | Share driver profiles externally |

---

## Difference from Driver Contact Confirmation

These are two entirely separate governance layers:

| Layer | What it gates | Route | When |
|---|---|---|---|
| **Need-level outreach approval** | Whether a need is eligible for any external contact | `POST /api/admin/needs/[id]/approve-outreach` | Founder reviews need + candidates once |
| **Driver contact confirmation** | Whether a specific `contact_suggested` item is approved | `PATCH /api/admin/contacts/[id]` | Founder reviews each driver before SMS |

Need approval does not auto-confirm any `contact_suggested` items. Even after a need is `outreach_approved`, each driver contact still requires:
1. A clean governance check (no DQ flag, no duplicate flag)
2. An explicit founder confirmation in the contact queue

---

## Need-Type Lifecycle

```
active_public_need          ← promoted from draft
matching_eligible           ← internal state
contact_ready_candidate     ← contact preparation allowed
outreach_pending_approval   ← staged, waiting cockpit approval
        │
        ▼  POST /api/admin/needs/[id]/approve-outreach
outreach_approved           ← founder explicitly approved
```

All four pre-approval states can be approved via this gate:
- `active_public_need`
- `matching_eligible`
- `contact_ready_candidate`
- `outreach_pending_approval`

States that cannot be approved:

| State | Reason | HTTP code |
|---|---|---|
| `simulation_only` | Never contactable | 403 |
| `archived_test` | Never contactable | 403 |
| `expired` | Need no longer active | 422 |
| `contacted` | Outreach already happened | 409 |
| `outreach_approved` | Already approved | 409 |
| `status = 'closed'` | Need is closed | 422 |

---

## Request Format

```http
POST /api/admin/needs/{need_id}/approve-outreach
x-recruiter-key: {RECRUITER_API_KEY}
Content-Type: application/json

{
  "reason": "Samir (score 97) and two other clean CE drivers confirmed for Enskede. Verified no DQ or dup flags. Ready for contact wave once 46elks active."
}
```

**Reason rules:**
- Required. Must be at least 10 characters (trimmed).
- Stored in `system_actions.input.reason`.
- Intended to document why the founder considers this need ready for external outreach.

---

## Response

**200 OK — approval recorded:**
```json
{
  "ok": true,
  "need_id": "...",
  "need_type": "outreach_approved",
  "note": "Outreach approved for this need. No SMS or email has been sent. Driver contact requires a configured SMS provider and separate driver-level confirmation."
}
```

**400 — reason missing or too short:**
```json
{
  "error": "reason_required",
  "message": "A written reason (minimum 10 characters) is required...",
  "hint": "Add \"reason\": \"...\" to the request body..."
}
```

**403 — simulation or test need:**
```json
{
  "error": "blocked_need_type",
  "need_type": "simulation_only",
  "message": "Needs of type 'simulation_only' can never be approved for outreach."
}
```

**409 — already approved or already contacted:**
```json
{ "error": "already_approved" }
// or
{ "error": "already_contacted" }
// or
{ "error": "state_changed" }   // race condition: need_type changed between fetch and update
```

---

## Audit Log

Every successful approval writes to `system_actions`:

| Field | Value |
|---|---|
| `action_type` | `company_need_outreach_approved` |
| `triggered_by` | `human` |
| `target_type` | `company_need` |
| `target_id` | the need ID |
| `status` | `completed` |
| `input.reason` | trimmed reason from request |
| `input.approved_by` | `founder` |
| `input.approved_at` | ISO timestamp |
| `input.prior_need_type` | the need_type before approval |
| `input.source` | `founder_governance_cockpit_v1` |

The `prior_need_type` field provides a complete audit trail of what state the need was in before the founder approved it.

---

## Cockpit Integration

The "Active Needs & Matching" section (Section B) of `/admin/cockpit` shows an "Approve future outreach" button on each approvable need card.

**Button visibility rules:**
- Hidden if already `outreach_approved`
- Hidden if `simulation_only`, `archived_test`, `expired`, or `contacted`
- Shown for all other need types

**Approval flow in the UI:**
1. Founder clicks "Approve future outreach"
2. A form expands with:
   - Safety warning: "No SMS or email will be sent"
   - Textarea for the written reason (min 10 chars)
3. Founder clicks "Confirm outreach approval"
4. API call to `POST /api/admin/needs/[id]/approve-outreach`
5. On success: card shows "Outreach approved" green badge; form closes

**Cockpit signal tile:**
A new "Outreach approved" signal tile in Section A shows the count of currently approved needs. It is amber when 0, green when ≥1.

---

## Operational Intelligence

`GovernanceSignals` now includes:
- `outreach_approved_needs: number` — count of needs with `need_type = 'outreach_approved'`
- `external_contact_blocked: boolean` — already existed; `true` when `outreach_approved_needs === 0`

`external_contact_blocked` reflects the need-level gate only. It does NOT indicate that the SMS provider is configured or that 46elks is active. Even when `external_contact_blocked = false`, no SMS can be sent until 46elks is configured and `AGENT_CONTACT_MODE = auto`.

---

## Before-46elks Sequence

The correct sequence before any external outreach can occur:

1. **Promote drafts** → creates `active_public_need` (Section D, already working)
2. **Run matching cycle** → populates shortlist + match scores (automated)
3. **Review contact queue** → confirm clean drivers, skip or flag blocked ones (Section C)
4. **Approve outreach at need level** → `POST /api/admin/needs/[id]/approve-outreach` ← **this gate**
5. **Configure 46elks** → `ELKS_API_USERNAME` + `ELKS_API_PASSWORD` in env (not yet done)
6. **Set `AGENT_CONTACT_MODE=auto`** → contact agent will begin SMS send (not yet done)

Steps 1–4 can all be done now. Steps 5–6 are the actual activation.

---

## Safety Gates

The following DQ/duplicate governance blocks are NOT bypassed by outreach approval:

- A driver with `data_quality_issue` flag will still be blocked at the driver-level contact confirmation step
- A driver with `driver_duplicate_detected` flag will still be blocked at the driver-level step
- Need-level approval does not pre-approve any individual driver

The DQ/dup governance is enforced in `PATCH /api/admin/contacts/[id]` and is independent of `need_type`.

---

## Limitations

1. **No revocation endpoint.** Once a need is `outreach_approved`, it cannot be downgraded from the cockpit. To revert, use a direct DB update or a future "revoke outreach approval" endpoint (not yet implemented).

2. **No minimum candidate requirement.** The gate does not validate that the need has clean candidates before allowing approval. The UI shows candidate counts to inform the decision, but the API does not enforce a minimum. This is intentional — the founder may want to approve in advance of matching completing.

3. **One-step approval.** There is no `outreach_pending_approval` staging step in the current UI. The founder approves directly. The `outreach_pending_approval` enum value exists in the DB for future use.

4. **No expiry.** An `outreach_approved` need does not automatically expire. The founder must close or expire the need separately.

5. **`contacted` state cannot be approved.** If a need somehow reaches `contacted` state without going through `outreach_approved`, the approval gate will return 409. This is a safety guardrail — `contacted` means external contact already occurred.
