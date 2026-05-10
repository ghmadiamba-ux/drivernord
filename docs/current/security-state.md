# DriverNord — Security State

*Last updated: 2026-05-10 (messaging provider security added)*

---

## Summary

The most critical security issue from v2 (browser-visible recruiter key) has been resolved. The system is now in an acceptable security posture for pre-pilot operation with a single operator. Several medium-priority gaps remain — none are blocking for pre-pilot but should be addressed before driving real traffic.

---

## Authentication Architecture

### Recruiter auth (cockpit + API)

**Mechanism:** HTTP-only cookie (`recruiter_session`)
- Set by `POST /api/recruiter/auth` after validating `key` against `RECRUITER_API_KEY` env var (server-only)
- Cookie properties: `httpOnly: true`, `secure: true` (production), `sameSite: lax`, `path: /`, `maxAge: 7 days`
- Middleware (`middleware.ts`) checks cookie on all `/recruiter/*` paths — redirects to `/recruiter/login?next=...` if absent or invalid
- API routes call `requireRecruiterAuth(req)` which accepts: `recruiter_session` cookie OR `x-recruiter-key` header
- The header option exists for server-to-server calls (scripts, curl) — acceptable

**Key stored:** `RECRUITER_API_KEY` is a server-only env var. Never in browser bundle.

**Session lifetime:** 7 days, then user must re-enter key.

**What changed from v2:** Previously used `NEXT_PUBLIC_RECRUITER_API_KEY` (browser-visible). Now removed — only `RECRUITER_API_KEY` (server-only).

### Machine-to-machine auth

- `POST /api/match` — `x-api-key: MATCH_API_KEY`
- `POST /api/agent/follow-up` — `x-api-key: AGENT_API_KEY`
- Both keys are server-only env vars

### Driver routes (intentionally public)

`POST /api/leads` and `PATCH /api/leads/[id]` are public by design — drivers have no accounts and auth would create friction in the acquisition flow. This is an accepted design trade-off.

---

## Current Risk Register

### HIGH

**H1. ~~GET /api/leads/[id] — PII without auth~~ — RESOLVED**
- `requireRecruiterAuth` added to GET handler. Phone, email, first_name now require cookie or header auth.
- `PATCH /api/leads/[id]` intentionally remains public (driver flow).

**H2. ~~GET/POST /api/leads/[id]/score — profile without auth~~ — RESOLVED**
- Both GET and POST handlers now protected by `requireRecruiterAuth`.

**H3. ~~No database migration files~~ — RESOLVED**
- `migrations/001`–`007` committed. Schema is reproducible from SQL.

### NEW — Messaging Provider Security

**M0. SMS provider credentials must not appear in client bundle**
- `lib/messaging/` is server-only code — never imported by client components or pages
- `SMS_API_KEY`, `SMS_API_SECRET`, `SMS_FROM_NUMBER` are never prefixed with `NEXT_PUBLIC_`
- Verified: `grep -r 'NEXT_PUBLIC.*SMS' app/` returns no matches
- `lib/messaging/smsProvider.ts` only calls `process.env.*` inside `sendMessage()` (server runtime)
- Status: Confirmed safe

### MEDIUM

**M1. No rate limiting on POST /api/leads**
- A bot can create unlimited driver leads with no friction
- Pollutes the `drivers` and eventually `ingested_drivers` tables with fake records
- Scoring and matching will be skewed by fake high-scoring leads
- Fix: Add IP-based rate limiting (Vercel middleware or Upstash Redis)
- Status: Open

**M2. Phone number in system_actions.input JSONB**
- `contact_suggested` actions include `phone` in the `input` field
- This is returned in full via `GET /api/cockpit` and `GET /api/cockpit/actions`
- The cockpit is now properly cookie-protected, so exposure requires an authenticated session
- Still: PII in an audit log row is a future compliance concern
- Fix: Hash or mask phone in `input` before logging; add reveal toggle if needed
- Status: Acceptable for single-operator; fix before multi-user

**M3. Supabase service role key bypasses RLS**
- `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security policies
- Correct for server-only use (Next.js API routes, not client components)
- Risk: If a future developer imports `lib/db.ts` in a client component, the key would be exposed in the bundle
- Current use: verified server-only — no client component imports `lib/db.ts`
- Status: Acceptable with discipline

**M4. No CSRF protection on mutation endpoints**
- API routes that mutate state (`PATCH /api/cockpit/actions/[id]`, `PATCH /api/recruiter/shortlist-entries/[id]`) are not CSRF-protected
- Auth is cookie-based with `sameSite: lax` — this provides partial CSRF protection (lax blocks cross-origin top-level POSTs but not all scenarios)
- Risk: Low for current single-operator usage. Increases with public traffic.
- Fix: Add `sameSite: strict` or verify `Origin` header on mutation endpoints
- Status: Low priority for single-operator

### LOW

**L1. No Content Security Policy headers**
- `next.config.js` has only redirects. No custom headers.
- CSP would prevent XSS if any user-generated content were rendered. Currently no such content.
- Fix: Add security headers in `next.config.js` headers() function
- Status: Low priority — no user-generated content

**L2. Cookie security flag is environment-dependent**
- `recruiter_session` cookie has `secure: process.env.NODE_ENV === 'production'`
- In development (non-production): cookie is not marked secure — can be sent over HTTP
- This is correct for local development but means the developer key is transmitted in plaintext locally
- Status: Expected behavior — acceptable

---

## GDPR Compliance Assessment

**Data collected:** Full driver profiles including phone number, email, first name, license class, YKB status, driver card status, domain preferences, availability, shift preference, region

**Legal basis:** Not specified in code — the privacy policy page states the purpose (matching drivers to transport roles) but does not explicitly state legal basis (legitimate interest vs. consent). This should be reviewed.

**Data subject rights:** The privacy policy states GDPR rights and a 30-day response window. No automated deletion or export mechanism exists in code — these are manual operations.

**Third parties:** No third-party tracking, analytics, or advertising cookies exist. The cookie policy is accurate. No data shared with third parties in current implementation (contact is simulated).

**Retention:** No automated retention policy or deletion schedule. Data sits in Supabase indefinitely.

**Consent at intake:** Driver confirmation screen says "Dina uppgifter delas inte med tredje part. Du kan avregistrera dig när som helst." — adequate for the current pre-pilot phase.

**Gaps:**
- No legal basis explicitly stated in privacy policy
- No automated data deletion
- No opt-out mechanism in code (manual only — contact `hej@drivernord.com`)
- Legal pages are preliminary drafts, not reviewed

---

## Recommended Security Actions (Prioritized)

1. ~~Add auth to GET /api/leads/[id]~~ — **DONE**
2. ~~Add auth to GET/POST /api/leads/[id]/score~~ — **DONE**
3. ~~Commit database migrations~~ — **DONE**
4. **Add rate limiting to POST /api/leads** — before any public traffic campaigns.
5. **Set `sameSite: strict` on recruiter_session cookie** — tighter CSRF protection.
6. **Add security headers in next.config.js** — `X-Content-Type-Options`, `X-Frame-Options`, basic CSP.
7. **Hash phone in system_actions.input before logging** — GDPR hygiene in audit log. Note: `contact_suggested.input.message` now also contains the full message text — consider whether the message (which may reference the driver's name and location) constitutes PII in the audit log.
