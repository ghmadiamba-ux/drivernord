# 46elks Activation Readiness — v1

**Audited:** 2026-05-19  
**Current status: NOT READY — 3 hard blockers must be resolved first**

---

## Current integration state

The 46elks integration exists in code and is complete at the implementation level. The provider, message format, auth, and logging are all built. Nothing is wired to live credentials.

### What IS implemented

| Component | File | Status |
|-----------|------|--------|
| 46elks REST call | `lib/messaging/smsProvider.ts` | Done |
| Provider selection via env var | `lib/messaging/index.ts` | Done |
| Message template | `lib/contactAgent.ts:buildMessage()` | Done |
| Contact mode logic | `lib/contactAgent.ts:getMode()` | Done |
| Auto threshold | `lib/contactAgent.ts:getAutoThreshold()` | Done |
| Kill switch | `lib/contactAgent.ts:isEnabled()` | Done |
| 14-day dedup window | `lib/contactAgent.ts:wasRecentlyContacted()` | Done |
| 3-day emergency dedup | `lib/contactAgent.ts` | Done |
| Min score filter (60) | `lib/contactAgent.ts` | Done |
| YKB guard | `lib/contactAgent.ts` | Done |
| Availability guard | `lib/contactAgent.ts` | Done |
| contact_suggested logging | `lib/contactAgent.ts` | Done |
| contact_sent logging (success + failure) | `lib/contactAgent.ts` | Done |
| contact_skipped logging | `lib/contactAgent.ts` | Done |
| Simulation company safety gate | `lib/warnings.ts` + operational intelligence | Done |
| Matching filter (ENABLE_SIMULATION_MATCHING) | `lib/companyNeedStore.ts` | Done |

---

## Env vars required for activation

| Var | Purpose | Current value | Required |
|-----|---------|---------------|----------|
| `SMS_PROVIDER` | Selects provider; must be `46elks` | **not set** | YES |
| `SMS_API_KEY` | 46elks API key | **not set** | YES |
| `SMS_API_SECRET` | 46elks API secret | **not set** | YES |
| `SMS_FROM_NUMBER` | Sender number (must be a 46elks number) | **not set** | YES |
| `AGENT_CONTACT_MODE` | `suggest` / `auto` / `hybrid` | `suggest` | Change to `auto` when ready |
| `AGENT_CONTACT_ENABLED` | Kill switch | `true` (default) | Keep |
| `AUTO_CONTACT_THRESHOLD` | Min score for auto-send in hybrid mode | `85` (default) | Tune |
| `ENABLE_SIMULATION_MATCHING` | Allow simulation company matching | `false` (default) | Keep false |

---

## Hard blockers (must resolve before ANY activation)

### Blocker 1 — Simulation data in company_needs

**Status:** ACTIVE BLOCKER  
**Risk:** All 19 open company_needs point to simulation/test companies. Activating SMS would contact real drivers about jobs that do not exist.

**Resolution:** Run the SQL in `docs/business/company-needs-cleanup-audit-v1.md` to close all simulation needs. Then add at least one real company need.

**Test:** After cleanup, `GET /api/admin/operational-intelligence` must return `sms_safe: true`.

---

### Blocker 2 — pending contact_suggested backlog

**Status:** ACTIVE BLOCKER  
**Risk:** There is an existing backlog of `contact_suggested` system_actions with status `pending`. These were generated against simulation company needs. If `AGENT_CONTACT_MODE=auto` is set, the first match run will attempt to send all of them.

**Resolution:** Before setting `AGENT_CONTACT_MODE=auto`, cancel all pending actions referencing simulation company needs:

```sql
-- Cancel pending contact_suggested actions for simulation company shortlists
UPDATE system_actions
SET status = 'cancelled'
WHERE action_type = 'contact_suggested'
  AND status = 'pending'
  AND input->>'company_need_id' IN (
    SELECT cn.id
    FROM company_needs cn
    JOIN companies c ON c.id = cn.company_id
    WHERE c.name ILIKE '%SIMULATION%'
       OR c.name ILIKE 'SIM-%'
       OR c.name ILIKE '%Test%'
       OR c.name ILIKE '%Probe%'
       OR c.name ILIKE '%Auth%'
  );
```

**Verify:** `GET /api/admin/operational-intelligence` must return `pending_contact_suggested: 0`.

---

### Blocker 3 — UX data quality issue not fixed

**Status:** ACTIVE BLOCKER  
**Risk:** ~40% of first registrations have `first_name` = phone number. The auto SMS would send "Hej +46701234567" to real drivers — unprofessional and trust-destroying. Once you damage trust with a driver, they won't respond to follow-up.

**Resolution:** Fix the chat UX so the name field cannot accept phone-number-formatted input. Deploy the fix. Verify `data_quality_warnings` drops to near zero for new registrations.

**Test:** `GET /api/admin/operational-intelligence` → `data_quality_warnings` should be empty or near-zero.

---

## Activation checklist (in order)

Complete each item before proceeding to the next.

### Phase 1 — Database cleanup
- [ ] Run cleanup SQL to close simulation company_needs (see audit doc)
- [ ] Verify `sms_safe: true` in operational intelligence payload
- [ ] Cancel pending contact_suggested backlog (SQL above)
- [ ] Verify `pending_contact_suggested: 0` in operational intelligence payload
- [ ] Verify `matching_blocked: false` in operational intelligence payload

### Phase 2 — UX quality fix
- [ ] Fix chat flow to prevent phone number in name field
- [ ] Deploy and verify data quality warnings drop
- [ ] Monitor for 48h — confirm new registrations have clean names

### Phase 3 — First real company need
- [ ] Add at least one real company need via `/api/company/need` or Supabase
- [ ] Verify `getMatchableOpenCompanyNeeds()` returns the new need
- [ ] Run a test match: `POST /api/match` with the need ID
- [ ] Verify shortlist is created correctly
- [ ] Verify contact_suggested action is created (status = pending, not sent)

### Phase 4 — 46elks account setup
- [ ] Create 46elks account at 46elks.com
- [ ] Purchase a Swedish number or verify sender ID
- [ ] Get API key and API secret
- [ ] Test API with a manual curl to your own phone number:
  ```bash
  curl -u API_KEY:API_SECRET https://api.46elks.com/a1/sms \
    -d "from=+46XXXXXXXXX" \
    -d "to=+46YOUR_PHONE" \
    -d "message=DriverNord test"
  ```
- [ ] Verify delivery (check 46elks dashboard)

### Phase 5 — Staging test
- [ ] Set env vars on Vercel (production):
  - `SMS_PROVIDER=46elks`
  - `SMS_API_KEY=...`
  - `SMS_API_SECRET=...`
  - `SMS_FROM_NUMBER=+46XXXXXXXXX`
  - Keep `AGENT_CONTACT_MODE=suggest` for now
- [ ] Trigger a match run manually
- [ ] Confirm `contact_suggested` actions are created (not sent)
- [ ] Review the `input.message` in system_actions to confirm message looks correct
- [ ] Review `input.phone` to confirm it's a real phone number, not a fake

### Phase 6 — First live send (suggest → hybrid)
- [ ] Change `AGENT_CONTACT_MODE=hybrid` on Vercel
- [ ] Set `AUTO_CONTACT_THRESHOLD=90` (only send to very high matches)
- [ ] Trigger a match run for a real company need
- [ ] Verify at most 1–2 SMS are sent (to drivers with score ≥ 90)
- [ ] Confirm delivery in 46elks dashboard
- [ ] Confirm driver receives the message and it reads well
- [ ] Monitor for 24h — check for replies, unsubscribes, complaints

### Phase 7 — Full automation
- [ ] After successful hybrid test (3+ days)
- [ ] Change `AGENT_CONTACT_MODE=auto`
- [ ] Lower `AUTO_CONTACT_THRESHOLD` if needed (suggested: 72 = HIGH tier floor)
- [ ] Monitor `contact_sent` actions daily
- [ ] Monitor for 46elks delivery errors in `system_actions` (status = failed)

---

## Rollback plan

If SMS goes wrong at any point:

**Immediate stop (< 30 seconds):**
```
Vercel → Environment Variables → AGENT_CONTACT_ENABLED=false
Redeploy (or use instant rollback in Vercel)
```

**Revert specific contacts:**
- Check `system_actions` for `contact_sent` rows in the last hour
- Note `input.phone` values
- For any erroneously sent contacts, log manually and apologize if needed

**Revert to suggest mode:**
```
AGENT_CONTACT_MODE=suggest
```
This stops auto-sending but preserves all pending actions as suggested (not cancelled).

---

## Message template (current)

```
Hej [firstName] 👋

Vi har en match för dig i [region] ([domain], [shift_type]).

Vill du att vi kopplar dig direkt till företaget?
→ Svara JA så går vi vidare
```

**Issues to fix before activation:**
1. The template uses `firstName` — if `has_quality_issue = true`, this will be a phone number
2. The template currently has no unsubscribe mechanism (required for GDPR/CTIA)
3. "Vill du att vi kopplar dig direkt till företaget?" implies a specific company — do not say this until simulation data is cleaned

**Recommended addition before live:**
Add at the end: `Svara STOPP för att avregistrera dig.`

---

## Rate limiting

46elks has no built-in rate limiting per se — you pay per SMS. The contact agent processes entries sequentially, not in parallel. Maximum send rate is roughly 1 SMS per second (network I/O bound).

**Current safeguards:**
- 14-day dedup window (standard)
- 3-day dedup window (emergency)
- Min score = 60 filter
- YKB and availability guards
- `AGENT_CONTACT_ENABLED=false` kill switch

**What is NOT in place yet:**
- Daily send volume cap
- Per-campaign budget limit
- Unsubscribe list (GDPR requirement)

These must be added before large-scale activation.

---

## Founder safety checklist (print and use)

Before setting `AGENT_CONTACT_MODE=auto`:

- [ ] `sms_safe: true`
- [ ] `matching_blocked: false`
- [ ] `pending_contact_suggested: 0` (old backlog cleared)
- [ ] `data_quality_warnings` near zero for new registrations
- [ ] At least one REAL company need exists with status `open`
- [ ] 46elks API tested manually to your own number
- [ ] Message template reviewed and looks professional
- [ ] "STOPP" unsubscribe handling documented
- [ ] You can reach the Vercel dashboard to kill switch within 5 minutes
