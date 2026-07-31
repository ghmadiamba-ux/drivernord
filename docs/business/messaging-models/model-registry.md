# DriverNord Messaging Model Registry

*Registry of all approved outreach models. Agents must check this registry before suggesting or constructing any outreach message.*

**Last updated:** 2026-06-16

---

## Registry Rules

1. Every outreach model used by DriverNord must have a registered entry here.
2. Models with `auto_send: NO` must never be sent by an agent without explicit founder approval.
3. Models with `status: draft` must not be used until promoted to `validated_manual_send_only` or higher.
4. New models require a standalone file in `docs/business/messaging-models/` and an entry in this registry.

---

## Registered Models

| Model ID | Name | Status | Channel | Target type | Auto-send | Founder approval | File |
|----------|------|--------|---------|-------------|-----------|-----------------|------|
| DN-MODEL-DC-REFERENCE-001 | Direct Client Concrete Need Outreach — Transport & Logistics Capacity | `validated_manual_send_only` | Email | Direct transport/logistics client | NO | YES | [direct-client-reference-model.md](direct-client-reference-model.md) |

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| `draft` | Model exists but is not yet validated. Do not use. |
| `validated_manual_send_only` | Model approved for manual sending by founder only. No agent automation. |
| `validated_agent_suggest_only` | Agent may propose the model for founder review. Agent cannot send. |
| `validated_agent_send_authorized` | Agent may send within the authorized dispatch gate configuration. Requires full automation infrastructure to be in place. |
| `deprecated` | Model superseded. Do not use. |

---

## Models Not Yet Created (Required)

| Model ID | Name | Priority | Notes |
|----------|------|----------|-------|
| DN-MODEL-AGENCY-REFERENCE-001 | Agency/Bemanning Partner Outreach | HIGH | Required before approaching Rekryteringsgruppen; see `agency-partnership-model.md` |
| DN-MODEL-FOLLOWUP-001 | Follow-Up After Unanswered Direct Client Email | MEDIUM | Short follow-up variant for 7-day no-reply sequences |
| DN-MODEL-POSTCALL-001 | Post-Call Confirmation Email — Direct Client | MEDIUM | After a successful call; current versions exist in List 1 files but no consolidated model |
| DN-MODEL-DRIVER-ACQUISITION-001 | Driver Acquisition — Registration Invitation | LOW | For organic/paid acquisition campaigns; Facebook/Meta + Logistikklubb |
