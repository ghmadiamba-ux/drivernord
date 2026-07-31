# Acquisition Pipeline — Final Launch Status

**Date:** 2026-05-18
**Scope:** Technical readiness for first Meta campaign test (V1)
**Basis:** Full code audit of /chat flow, API routes, Supabase integration, SMS layer, UTM capture, consent, analytics

---

## Summary Status

| Component | Status |
|-----------|--------|
| /chat flow | READY |
| Supabase | READY (post-restoration) |
| Migration 013 | NOT READY — 1 founder action required |
| UTM attribution | READY WITH LIMITATIONS |
| SMS (46elks) | NOT READY — requires account + env vars |
| Mobile UX | READY (pending founder manual test) |
| Meta Pixel | READY WITH LIMITATIONS |
| Meta launch | READY WITH LIMITATIONS |

---

## 1. /chat Flow Status — READY

Full end-to-end audit complete. No blockers found.

**Flow verified:**
- `lang` step → `POST /api/leads` → creates `drivers` row with attribution → returns `{ id, next_step }`
- Steps 2–12 → `PATCH /api/leads/{id}` → `applyStep()` → `updateLead()` → returns `{ next_step, lead_status, lead_priority }`
- `consent` step → `applyStep()` writes `consent_registration_at`, `consent_registration_version`, `consent_scope` → transitions to `ready_for_ingestion`
- `confirmation` screen → `confirmLead()` fires fire-and-forget PATCH → returns `lead_priority` for display
- Pixel events: `DriverChatStarted` on mount, `DriverConsentAccepted` at consent click (pre-PATCH, intentional), `DriverRegistrationCompleted` + `QualifiedDriverLead` + `HighPriorityDriverLead` at confirmation
- Error state: shown on question steps and consent step, hidden on terminal steps — correct
- Loading state: all buttons disabled during network requests — correct
- Double-fire guards: `confirmedRef` prevents double `confirmLead()`, `chatStartedFired` and `registrationFired` refs prevent duplicate pixel events

**Minor issues (non-blocking):**
- Phone number field accepts any string — no format validation. A driver entering a malformed number won't be stopped. The contact agent will fail to send SMS to that number later. Acceptable for V1.
- Email is optional and not validated — `onSkip` allows null. Correct by design.
- Rate limiting is in-memory per Vercel function instance. Effective for low-traffic V1 but will not block a coordinated multi-instance attack. Acceptable for V1.

**Step flow:** `lang → region → (relocate if not stockholm) → license → ykb → driver_card → domain → availability → shift_preference → phone → email → name → consent → confirmation`

Non-stockholm drivers get the `relocate` step. `license = none` routes to `disqualified` (terminal). All routing is correct and tested.

---

## 2. Supabase Status — READY (post-restoration)

Supabase project `iwawdnfrbwhfrfibeqlp` was paused (free-tier inactivity) during the previous session. As of this session, the project is confirmed active again.

**Connection config:**
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are read via `lib/db.ts`
- BOM stripping (`clean()`) handles pasted env var edge cases — confirmed in code
- Lazy proxy: DB connection deferred to first call — misconfiguration is caught in route handler try/catch, not at module load time

**Fallback behavior:**
- `supabaseStore.ts` has unconditional fallback: any error on first INSERT/UPDATE triggers a retry without Migration 013 columns
- If migration 013 is NOT yet applied: first attempt fails (column not found), retry succeeds without consent/attribution columns — registration completes, consent and attribution not stored
- If migration 013 IS applied: first attempt succeeds, no fallback triggered
- If Supabase is unreachable: first attempt fails with `TypeError: fetch failed`, retry also fails, API returns 500

**Action required:** Apply Migration 013 (see `final-migration-013-execution.md`). Until then, consent timestamps and UTM data are not persisted.

---

## 3. Migration 013 Status — NOT READY

**One founder action required before launch:**
Execute `migrations/013_add_consent_and_attribution_to_drivers.sql` in the Supabase SQL editor.

**Risk of launching without it:**
- Registration flow continues working (fallback handles it)
- All consent timestamps are lost — GDPR audit trail is incomplete
- All UTM attribution is lost — ad performance cannot be measured at the driver level
- Campaign ROAS cannot be calculated from database data

**This is the single most important pre-launch action.** It takes < 5 minutes to execute and has zero risk of data loss.

See `final-migration-013-execution.md` for exact SQL, expected output, and validation checklist.

---

## 4. UTM Attribution Status — READY WITH LIMITATIONS

**What works:**
- UTM capture is implemented correctly in `hooks/useChat.ts` `readAttribution()`
- All 7 fields captured: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `landing_page_url`, `referrer_url`
- Capture happens at lang step (first user action) — correct timing
- Sanitization prevents injection (trimmed, length-limited)
- Handles missing params gracefully (null if absent)
- Swedish URL-encoded characters (å ä ö) decoded correctly by `URLSearchParams`

**Limitation:**
- UTM data only persists to DB after Migration 013 is applied. Without it, the fallback strips the columns and UTMs are silently lost.
- No server-side URL validation — if a driver manually edits the URL before clicking, they can submit arbitrary UTM values. Acceptable for V1 (values are capped at 500 chars).
- `referrer_url` is unreliable for Facebook in-app browser traffic. `utm_source=facebook` is the reliable signal.

**Campaign URL convention to use:**
```
https://drivernord.com/chat?utm_source=facebook&utm_medium=paid_social&utm_campaign=p2-ce-stockholm-v1&utm_content={ad_creative_id}&utm_term=ce-employed
```

See `utm-validation-checklist.md` for full validation procedure.

---

## 5. SMS Status — NOT READY

**Current state:** Simulated only. No SMS will be sent to any driver.

**Contact agent default mode:** `suggest` — the agent logs a `contact_suggested` action to `system_actions` but does not call `sendMessage()`. Even with real credentials configured, SMS will not fire until `AGENT_CONTACT_MODE=auto` is also set.

**What's missing:**
- 46elks account creation and business verification
- Swedish sender number or registered alphanumeric ID
- 4 env vars in Vercel (`SMS_PROVIDER`, `SMS_API_KEY`, `SMS_API_SECRET`, `SMS_FROM_NUMBER`)
- `AGENT_CONTACT_MODE` changed from `suggest` to `auto`

**Estimated setup:** 1.5 hours (excluding 46elks verification wait, which may take longer)

**Launch implication:** The first Meta campaign can run without SMS. Drivers will register, be ingested, and be shortlisted. The recruiter can view shortlist entries in the system. Manual outreach (phone call, WhatsApp) is possible before SMS automation is wired. SMS is required before any automated driver contact can happen.

See `46elks-readiness-audit.md` for full setup procedure.

---

## 6. Mobile UX Status — READY (pending founder test)

**Code audit findings:**
- Dark navy background (`#0b1d35`) applied to all screens including terminal steps
- White floating card max-width 448px (`max-w-md`) — correct for mobile and tablet
- Progress bar: `h-[3px]`, smooth CSS transition, `role="progressbar"` with aria attributes
- Touch targets: all buttons `min-h-[52px]` or `min-h-[54px]` — above iOS minimum (44px)
- Input: `autoFocus` on text inputs, `inputMode` set correctly (`tel`, `email`, `text`)
- `autoComplete` set: `tel`, `email`, `given-name` — enables native keyboard suggestions on iOS/Android
- `onKeyDown Enter` submits text inputs — correct for mobile keyboard "Go" button
- Trust copy persistent on every step below the card
- `Läs mer` link to `/chaufforer` available on all question steps (step > 0)
- Consent screen renders as a separate full-screen component — not inside QuestionCard — correct

**Pending founder action:**
- Complete a full end-to-end registration on a real mobile device (iPhone or Android)
- Verify: keyboard appears correctly for phone field, progress bar renders, no layout issues at small screen sizes, consent step is clear and legible

---

## 7. Meta Pixel Status — READY WITH LIMITATIONS

**Configuration:** Pixel fires only when both `NEXT_PUBLIC_META_PIXEL_ENABLED=true` AND `NEXT_PUBLIC_META_PIXEL_ID` are set in Vercel env vars.

**Events implemented and consent-safe:**

| Event | When fired | Consent state |
|-------|-----------|---|
| `DriverChatStarted` | Page mount (first render) | Before consent — fires for all users |
| `DriverConsentAccepted` | User clicks "Jag samtycker" | At consent action (pre-PATCH) |
| `DriverRegistrationCompleted` | Step transitions to `confirmation` | Post-consent |
| `QualifiedDriverLead` | Confirmation + MEDIUM or HIGH priority | Post-consent |
| `HighPriorityDriverLead` | Confirmation + HIGH priority only | Post-consent |

**Limitation:** `DriverChatStarted` fires before GDPR consent. This is technically PII-adjacent (it identifies a device that visited /chat) but does not include any personal data in the payload. Whether this requires prior consent under Swedish DPA interpretation is a legal question, not a technical one. Consult the privacy policy and legal guidance before activating the pixel for real campaigns.

**Payload safety:** All pixel payloads are sanitized — `FORBIDDEN_PAYLOAD_FIELDS` blocks name, phone, email, and related fields from ever being sent to Meta.

**To activate the pixel:**
1. Add `NEXT_PUBLIC_META_PIXEL_ENABLED=true` to Vercel env vars
2. Add `NEXT_PUBLIC_META_PIXEL_ID=<your pixel id>` to Vercel env vars
3. Redeploy (env var changes require redeployment in Vercel)
4. Verify in browser console: `window.fbq` should be a function
5. Use Meta Pixel Helper Chrome extension to verify event firing in /chat

---

## 8. Risk Level — LOW TO MEDIUM

**Low risk factors:**
- Registration flow is production-hardened (fallback logic, unconditional retry)
- No user-visible errors on DB fallback (consent/attribution silently lost, registration succeeds)
- No hardcoded localhost URLs found anywhere in production code paths
- No stack traces or internal details exposed in error responses
- Rate limiting (10 req / 10 min per IP) prevents naive bot spam
- Pixel events are consent-aware and payload-sanitized
- SMS is simulated-only — no accidental real messages possible in current state

**Medium risk factors:**
- Migration 013 not applied = no UTM data = campaign performance is unmeasurable at driver level (Meta aggregate stats still work via Pixel)
- In-memory rate limiter doesn't scale across Vercel instances — effective for V1 volume, not for scaled attack
- Phone number input has no format validation — a wrong number silently fails when SMS is eventually activated
- `DriverConsentAccepted` pixel fires on user action, not server confirmation — if consent PATCH fails and user retries, the pixel may fire twice. Minor data quality issue.

---

## 9. Recommended Launch Scope

**V1 test campaign scope:**
- Platform: Facebook Feed (desktop and mobile) + Instagram Feed
- Geography: Stockholm + Mälardalen (Meta geographic targeting)
- Audience: P2 — employed CE/C drivers (transport interest cluster, 27–50, mobile)
- Timing: Sunday evening delivery slot (19:00–22:00) as primary
- Ad volume: 2–3 creative variations maximum
- Campaign objective: Traffic to `/chat` (not Conversions — insufficient data volume for conversion campaign optimization in early phase)

**What to measure from Day 1:**
- Click-through rate from Meta ad → /chat
- Lang step completion rate (% who select a language after landing)
- Registration completion rate (% who reach confirmation)
- Qualified lead rate (% of completed registrations with `lead_status = ready_for_ingestion`)
- UTM-attributed rows in `drivers` table (requires Migration 013)

---

## 10. Recommended Daily Budget Ceiling

**5 SEK × estimated 100 daily impressions** is not the right framing for Facebook ad campaigns. Facebook requires minimum daily budgets per ad set.

**Recommended V1 test budget:**
- Daily budget per ad set: **150–200 SEK/day** (Facebook minimum effective test threshold for traffic campaigns in Sweden)
- Number of ad sets: 1 (P2 Sunday) in first week
- Test duration: 7 days minimum before evaluation
- Total test budget: **1,000–1,400 SEK for first week**

**Scale decision trigger:** If cost per `/chat` session start (tracked via UTM or Pixel) is below 50 SEK, increase budget. If above 150 SEK, pause and revise creative before scaling.

---

## 11. Kill Conditions

Stop the campaign immediately if:

1. **Supabase returns errors at volume** — monitor Vercel function logs for `[supabaseStore] Retrying` or `supabaseStore.createLead failed` errors. More than 5% error rate = stop.

2. **Consent flow fails silently** — if Supabase is reachable but the consent step PATCH is returning 400/500, drivers complete the flow but consent is not stored. Check `system_actions` for `driver_ingested` events — if registrations complete but nothing appears in ingested_drivers, the consent step is broken.

3. **Unexpected SMS fires** — if anyone reports receiving an unsolicited SMS from DriverNord, immediately set `AGENT_CONTACT_ENABLED=false` in Vercel env vars (no redeployment required — env var is read at runtime). Investigate `system_actions` for `contact_sent` rows.

4. **Negative Facebook group post** — if a post appears in "Lastbilsförare i Sverige" or similar groups with complaints about DriverNord data practices, pause all ads immediately. Do not respond in kind. Respond directly to the poster with a personal message (not a brand account message).

5. **Rate limit exhaustion from a single IP** — if the same IP is creating dozens of `/chat` sessions (bot test), the 10 req / 10 min limiter will kick in and return 429. Monitor for this in Vercel logs. If real bots appear, add Vercel Firewall rules.

---

## 12. Recommended Next Technical Fix After Launch

Priority order based on impact:

**Priority 1 (do before first campaign goes live):**
- Apply Migration 013 — 5 minutes. Zero risk. Unlocks UTM tracking and consent audit trail.

**Priority 2 (do within first week of campaign):**
- Set up 46elks — 1.5 hours. Unlocks SMS notifications to matched drivers. Required before the first real client match.

**Priority 3 (do before scaling budget):**
- Add phone number format validation to the `phone` step in `applyStep.ts` — Swedish phone numbers follow `+46XXXXXXXXX` format. A simple regex catches the most common errors. Prevents silent SMS failures.

**Priority 4 (do before 50 registrations):**
- Confirm Meta Pixel is firing correctly in production — use Meta Pixel Helper in Chrome while completing a test registration. Verify `DriverConsentAccepted` and `DriverRegistrationCompleted` appear in Events Manager.

**Priority 5 (do before scaling to 500 SEK/day):**
- Replace in-memory rate limiter with Upstash Redis or Vercel KV — current limiter is per-instance and won't hold under multi-instance load. Not a V1 blocker at low budget, but a real gap at scale.

---

## Pre-Launch Checklist (Consolidated)

**Founder must do:**
- [ ] Apply Migration 013 in Supabase SQL editor (< 5 minutes)
- [ ] Verify Supabase `drivers` table has 10 new columns (verification query in `final-migration-013-execution.md`)
- [ ] Complete full end-to-end mobile registration test (iPhone or Android, real browser)
- [ ] Confirm `consent_registration_at` is populated in test row
- [ ] Confirm UTM values appear in test row (use test URL from `utm-validation-checklist.md`)
- [ ] Verify Meta Pixel is configured in Vercel env vars (`NEXT_PUBLIC_META_PIXEL_ENABLED=true`, `NEXT_PUBLIC_META_PIXEL_ID=...`) if using Pixel-based conversion tracking
- [ ] Set final campaign destination URL following UTM convention in `utm-validation-checklist.md`
- [ ] Confirm `/chat` loads without errors on mobile browser

**System is ready for first ad when:**
1. Supabase is active ✓ (confirmed restored)
2. Migration 013 is applied ☐
3. Mobile test passed ☐
4. UTM test URL validated ☐

SMS, 46elks, and advanced Pixel tracking are V1 post-launch items that do not block the first campaign test.
