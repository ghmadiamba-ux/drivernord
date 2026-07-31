# 46elks SMS Integration — Readiness Audit

**Date:** 2026-05-18
**Current state:** Simulated only (console.log). Real SMS will not send until founder completes setup.

---

## Integration Architecture

```
runContactAgent()
  → mode === 'auto' || (mode === 'hybrid' && score >= threshold)
  → getMessagingProvider()       ← lib/messaging/index.ts
      → SMS_PROVIDER set?
          yes → createSmsProvider()   ← lib/messaging/smsProvider.ts
          no  → simulatedProvider     ← lib/messaging/simulatedProvider.ts
  → provider.sendMessage({ to, body })
      → 46elks: POST https://api.46elks.com/a1/sms
         Basic auth: SMS_API_KEY:SMS_API_SECRET
         Body: from=SMS_FROM_NUMBER, to=<driver_phone>, message=<body>
```

---

## Current Simulated Behavior

When `SMS_PROVIDER` env var is **not set**, the system uses `simulatedProvider`. This:
- Logs the message to Vercel function console (visible in Vercel dashboard logs)
- Returns `{ ok: true, channel: 'simulated' }`
- Logs `contact_sent` action to `system_actions` table with `channel: 'simulated'`
- Does **not** make any network call to 46elks or any external service
- Does **not** send any message to the driver's phone

This is the safe default. The system will stay in simulated mode until all four env vars are configured AND `AGENT_CONTACT_MODE` is changed from `suggest`.

**Current default contact mode:** `suggest` (not `auto`). In suggest mode, the contact agent logs `contact_suggested` to `system_actions` but does NOT call `sendMessage()` at all — not even simulated. Real SMS sending requires `AGENT_CONTACT_MODE=auto` or `hybrid`.

---

## What Is Missing Before Real SMS Usage

### Required Env Vars (all must be set in Vercel)

| Var | Purpose | Where to get it |
|-----|---------|---|
| `SMS_PROVIDER` | Must be set to `46elks` | Just type this value |
| `SMS_API_KEY` | 46elks API key | 46elks dashboard → Account → API access |
| `SMS_API_SECRET` | 46elks API secret | Same location as API key |
| `SMS_FROM_NUMBER` | Sender number or alphanumeric ID | 46elks → Numbers (must purchase or register) |
| `AGENT_CONTACT_MODE` | Must be `auto` or `hybrid` | Set to `auto` for full automation |
| `AGENT_CONTACT_ENABLED` | Set to `true` | Currently defaults to enabled (absence = enabled) |

Without ALL of these set, no real SMS will fire. The system fails gracefully in every case:
- Missing credentials: logs `missing_credentials`, no crash
- Wrong provider name: logs `unknown_provider: <value>`, no crash
- Mode = suggest: never calls `sendMessage()` at all

### Required 46elks Account Actions

1. **Create a 46elks account** at 46elks.com
2. **Verify the account** (business verification required for Swedish SMS)
3. **Add credit** to the account (Swedish SMS costs approximately 0.50–0.80 SEK per message)
4. **Generate an API key** — go to Account → API access → Create new API key
5. **Configure a sender ID:**
   - **Option A (recommended for V1):** Use a purchased 46elks number as sender. Cost: ~50 SEK/month. Drivers can reply.
   - **Option B:** Use an alphanumeric sender ID (e.g., "DriverNord"). Free but limited — no replies, may be blocked by some carriers, requires registration with Swedish carriers for non-commercial use.
6. **Test the SMS API** using curl before connecting to the app (see test procedure below)

---

## Message Format

The message sent to drivers is built in `lib/contactAgent.ts` `buildMessage()`:

```
Hej {firstName} 👋

Vi har en match för dig i {region} ({domain}, {shiftType}).

Vill du att vi kopplar dig direkt till företaget?
→ Svara JA så går vi vidare
```

**Character count:** Approximately 120–150 characters depending on variable values. Fits in a single SMS (160 chars). No multi-part SMS risk for standard cases.

**Note:** The emoji (👋) uses 2 characters in GSM-7 extended alphabet. If the carrier or handset doesn't support it, the SMS may fall back to UCS-2 encoding (70-char limit per part). Consider removing the emoji if multi-part SMS billing is a concern.

**Sender field:** `SMS_FROM_NUMBER` — must be the purchased 46elks number or registered alphanumeric sender ID.

---

## Error Handling in Production

All failure modes are handled without crashing the system:

| Failure | What happens |
|---------|---|
| 46elks unreachable (network) | `sendResult.ok = false`, `error = String(err)`. Logged to `system_actions` with status `failed`. No retry. |
| 46elks returns non-200 | `sendResult.ok = false`, `error = '46elks HTTP 403: ...'`. Same logging. |
| Missing credentials | Caught before HTTP call: `{ ok: false, error: 'missing_credentials' }`. Logged. |
| Unknown SMS_PROVIDER value | `{ ok: false, error: 'unknown_provider: <value>' }`. Logged. |
| Driver phone number missing | Caught by contact agent filter BEFORE calling `sendMessage()`. Entry is skipped. |

In all failure cases, `result.errors++` is incremented in the `ContactAgentResult` return value. The matching pipeline continues for other entries.

**No automatic retry on failure.** If an SMS fails, the shortlist entry's `contact_status` remains `new`. The next run of the contact agent will re-evaluate it.

---

## Minimum Viable Production Readiness Checklist

- [ ] 46elks account created and business-verified
- [ ] Account has credit (minimum 50 SEK for testing — enough for ~60 test messages)
- [ ] API key and API secret generated and saved securely (NOT in git)
- [ ] Sender number purchased OR alphanumeric sender ID registered and confirmed active
- [ ] API tested directly with curl (see below)
- [ ] Env vars added to Vercel:
  - [ ] `SMS_PROVIDER` = `46elks`
  - [ ] `SMS_API_KEY` = (from 46elks dashboard)
  - [ ] `SMS_API_SECRET` = (from 46elks dashboard)
  - [ ] `SMS_FROM_NUMBER` = (number or alphanumeric ID)
  - [ ] `AGENT_CONTACT_MODE` = `auto` (or `hybrid` for score-gated automation)
- [ ] Test registration completed and first shortlist entry created
- [ ] `system_actions` table checked — `contact_suggested` or `contact_sent` logged

---

## Test Procedure

### Step 1 — Direct 46elks API test (curl)

Before connecting to the app, verify the credentials work:

```bash
curl -X POST https://api.46elks.com/a1/sms \
  -u "YOUR_API_KEY:YOUR_API_SECRET" \
  -d "from=YOUR_FROM_NUMBER" \
  -d "to=+46XXXXXXXXX" \
  -d "message=DriverNord test SMS - kan du läsa det här?"
```

Expected response (success):
```json
{"direction":"outgoing","from":"DriverNord","created":"2026-05-18T...","to":"+46...","cost":800,"status":"created","id":"s...","message":"DriverNord test SMS..."}
```

If this works, the credentials are valid.

### Step 2 — End-to-end app test (require a real company need first)

Real SMS via the contact agent only fires when:
1. A `company_needs` row exists (status: open, matching domain/region)
2. A driver has been ingested and shortlisted
3. The match score ≥ 60
4. `AGENT_CONTACT_MODE` = `auto`
5. The driver has `first_name` and `phone` set

For V1 testing, the recruiter must manually trigger the contact agent or create a test company need in Supabase. There is no UI for this yet.

### Step 3 — Check system_actions log

After triggering the contact agent, query the log:

```sql
SELECT action_type, status, result, created_at
FROM system_actions
WHERE action_type IN ('contact_sent', 'contact_suggested', 'contact_skipped')
ORDER BY created_at DESC
LIMIT 10;
```

A successful SMS shows:
```json
{
  "action_type": "contact_sent",
  "status": "completed",
  "result": { "channel": "sms", "message_id": "s...", "company_name": "...", "message_preview": "Hej Johan 👋..." }
}
```

---

## Estimated Setup Time

| Task | Time |
|------|------|
| Create 46elks account + business verification | 30–60 min (verification may take hours if manual review) |
| Purchase a number | 5 min |
| Generate API key | 5 min |
| Test with curl | 10 min |
| Add env vars to Vercel | 10 min |
| End-to-end SMS test in app | 20 min (requires a test registration + company need) |
| **Total (excluding 46elks verification wait)** | **~1.5 hours** |

---

## V1 SMS Contact Strategy Recommendation

For V1, keep `AGENT_CONTACT_MODE=suggest` until the first real company client is onboarded and a live need exists. This prevents accidental SMS to drivers before there is a real match to offer them.

When ready to activate real SMS:

1. Confirm a real company need is in the system
2. Confirm at least one ingested driver matches the need (score ≥ 60)
3. Set `AGENT_CONTACT_MODE=auto` in Vercel
4. Monitor `system_actions` for `contact_sent` entries
5. Verify the driver received the SMS (call them or ask them to confirm)

**Anti-spam safeguards already in code:**
- Minimum match score: 60 (hard-coded)
- Dedup window: 14 days (3 days for emergency urgency)
- YKB guard: `ykb = 'in_progress'` → skip
- Availability guard: `availability = 'not_yet'` → skip
- `AGENT_CONTACT_ENABLED=false` env var as kill switch (set this to immediately stop all SMS without redeployment)
