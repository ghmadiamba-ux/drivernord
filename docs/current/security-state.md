# DriverNord — Security State

*Last updated: 2026-05-14 (rate limiting implemented — MVP; GDPR consent step implemented locally)*

---

## Summary

The most critical security issue from v2 (browser-visible recruiter key) has been resolved. The system is now in an acceptable security posture for pre-pilot operation with a single operator. Several medium-priority gaps remain — none are blocking for pre-pilot but should be addressed before driving real traffic. **One new critical gap has been identified with the commercial launch: sharing driver profiles with client companies requires a signed DPA, which does not exist yet.**

---

## Authentication Architecture

### Recruiter auth (cockpit + API)

**Mechanism:** HTTP-only cookie (`recruiter_session`)
- Set by `POST /api/recruiter/auth` after validating `key` against `RECRUITER_API_KEY` env var (server-only)
- Cookie properties: `httpOnly: true`, `secure: true` (production), `sameSite: lax`, `path: /`, `maxAge: 7 days`
- Middleware (`middleware.ts`) checks cookie on all `/recruiter/*` paths
- API routes call `requireRecruiterAuth(req)` — accepts: `recruiter_session` cookie OR `x-recruiter-key` header

**Key stored:** `RECRUITER_API_KEY` is a server-only env var. Never in browser bundle.

### Machine-to-machine auth
- `POST /api/match` — `x-api-key: MATCH_API_KEY`
- `POST /api/agent/follow-up` — `x-api-key: AGENT_API_KEY`
- Both keys are server-only env vars

### Driver routes (intentionally public)
`POST /api/leads` and `PATCH /api/leads/[id]` are public by design — drivers have no accounts and auth would create friction in the acquisition flow. This is an accepted design trade-off.

### SMS provider credentials
`SMS_API_KEY`, `SMS_API_SECRET`, `SMS_FROM_NUMBER` are server-only. Never prefixed with `NEXT_PUBLIC_`. `lib/messaging/smsProvider.ts` is server-only code.

---

## Current Risk Register

### CRITICAL — Commercial Launch Gap

**C1. No DPA template exists — BLOCKING for shortlist delivery to client companies**
- Every commercial transaction (delivering a driver profile shortlist to a client company) constitutes processing personal data on behalf of or in concert with the client company.
- GDPR Art. 26 (joint controllers) or Art. 28 (data processor) agreement is required before any driver's personal data is shared with a client company.
- Current state: No DPA or Controller-to-Controller agreement template exists.
- Risk: Sharing a shortlist without a DPA is a GDPR compliance violation. Exposure risk escalates with the number of transactions.
- Fix: Draft DPA template (AI can draft); commission legal review; require signature before first shortlist delivery.
- Status: **OPEN — BLOCKS FIRST COMMERCIAL TRANSACTION**

**C2. GDPR legal basis not explicitly stated in privacy policy — BLOCKING for driver data processing**
- The privacy policy page states the purpose (matching drivers to transport roles) but does not explicitly state the legal basis under GDPR Art. 6.
- Required: Art. 6(1)(a) consent basis for matching processing; Art. 6(1)(b) for contract performance.
- Current state: "Preliminär version" banner — not legally reviewed.
- Fix: Legal review of privacy policy; explicit Art. 6 basis added per processing activity.
- Status: **OPEN — LEGAL REVIEW REQUIRED**

### RESOLVED — Previously Critical

**H1. ~~GET /api/leads/[id] — PII without auth~~ — RESOLVED**
`requireRecruiterAuth` added to GET handler.

**H2. ~~GET/POST /api/leads/[id]/score — profile without auth~~ — RESOLVED**
Both GET and POST handlers protected.

**H3. ~~No database migration files~~ — RESOLVED**
`migrations/001`–`007` committed.

**H4. ~~Browser-visible NEXT_PUBLIC_RECRUITER_API_KEY~~ — RESOLVED**
Replaced with server-only `RECRUITER_API_KEY` + HTTP-only cookie.

### MEDIUM

**M1. ~~No rate limiting on POST /api/leads~~ — RESOLVED (MVP)**
- In-memory rate limiter implemented in `app/api/leads/route.ts`: 10 requests per IP per 10 minutes. Returns HTTP 429 `{ error: 'rate_limit_exceeded' }`.
- IP detection reads `x-forwarded-for` (Vercel), then `x-real-ip`, then falls back to `'unknown'`.
- **LIMITATION:** Not reliable across multiple Vercel serverless instances — each instance maintains independent state. Provides basic protection against naive single-instance bot spam only.
- Before high-volume Meta campaign: upgrade to Vercel Firewall IP rules (dashboard config, no code change) or `@upstash/ratelimit` with Redis.
- Status: **MVP RESOLVED — upgrade required before Meta campaign**

**M2. Phone number in system_actions.input JSONB**
- `contact_suggested` actions include `phone` in the `input` field.
- Cockpit is cookie-protected so exposure requires authenticated session.
- Future: Hash or mask phone in `input` before logging.
- Status: Acceptable for single-operator; fix before multi-user.

**M3. Supabase service role key bypasses RLS**
- Correct for server-only use. Risk if imported in a client component.
- Current use: verified server-only.
- Status: Acceptable with discipline.

**M4. No CSRF protection on mutation endpoints**
- `sameSite: lax` provides partial protection. Not full CSRF protection.
- Status: Low priority for single-operator. Fix before multi-user.

**M5. No automated data retention policy**
- Driver data sits in Supabase indefinitely. No scheduled deletion.
- GDPR requires retention periods to be defined and honored.
- Fix: Define retention schedule; implement scheduled deletion cron.
- Status: Open — document retention policy before legal review; implement before scale.

**M6. No GDPR deletion mechanism in code**
- Right to erasure (Art. 17) requests handled manually.
- Manual deletion viable at <50 drivers; breaks at scale.
- Fix: `DELETE /api/recruiter/drivers/{id}` endpoint with cascade deletion.
- Status: Open — see Phase 1 roadmap item 1.4.

### LOW

**L1. No Content Security Policy headers**
- No user-generated content rendered; low current risk.
- Fix: Add security headers in `next.config.js` headers() function.
- Status: Low priority.

**L2. Cookie security flag is environment-dependent**
- `secure: process.env.NODE_ENV === 'production'` — expected behavior, acceptable.

---

## GDPR Compliance Assessment

**Data collected:** Full driver profiles including phone number, email, first name, license class, YKB status, driver card status, domain preferences, availability, shift preference, region.

**Legal basis:** NOT YET EXPLICITLY STATED in privacy policy. Must be added before commercial launch:
- Art. 6(1)(a) consent — for the matching and introduction processing activity
- Art. 6(1)(b) contract performance — for delivering the registration service the driver requested

**Data subject rights:** Privacy policy states GDPR rights and 30-day response window. No automated deletion or export mechanism exists in code — manual operations only.

**Third parties:**
- Current: No third-party tracking, analytics, or advertising cookies. No data shared with third parties (contact is simulated).
- **Future (commercial launch):** Driver profiles WILL be shared with client companies as shortlists. This is the primary new GDPR exposure. Requires DPA or Controller-to-Controller agreement per GDPR Art. 26 before any profile sharing.

**Retention:** No automated retention policy or deletion schedule. Data sits in Supabase indefinitely. Retention periods must be defined before legal review.

**Consent at intake:** Affirmative GDPR consent step (`consent`) implemented locally between `name` and `confirmation`. Driver must actively click "Jag samtycker" / "I agree" before registration completes. Stores `consent_registration_at` (timestamp), `consent_registration_version` (`driver-consent-v1-2026-05-14`), and `consent_scope`. **Consent text requires Swedish dataskyddsjurist confirmation (C-L2) before production use at scale.** Stage 3 per-company consent (before sharing a profile with a specific client company) is documented but not yet wired in code.

**hej@drivernord.se:** GDPR requests route to this address. Monitoring status unconfirmed — must be verified.

---

## Pre-Commercial Launch Security Checklist

Before the first shortlist is delivered to a client company, ALL of the following must be true:

- [ ] DPA / Controller-to-Controller agreement template exists and is legally reviewed
- [ ] Privacy policy legally reviewed with explicit Art. 6 basis stated
- [ ] Service agreement template reviewed (limits liability; defines fee trigger)
- [ ] Data retention schedule defined and documented
- [ ] hej@drivernord.se confirmed active and monitored daily
- [ ] GDPR deletion mechanism exists (manual is acceptable for first 50 drivers)
- [ ] Stage 3 per-company consent design documented and tested in intake flow
- [x] Rate limiting on POST /api/leads — MVP in-memory implemented; upgrade to distributed (Vercel Firewall or Upstash) before Meta campaign

---

## Recommended Security Actions (Prioritized)

1. **Commission legal review of privacy policy + DPA template + service agreement** — before any commercial transaction.
2. **Upgrade rate limiting on POST /api/leads to distributed** — MVP in-memory rate limiter is live; upgrade to Vercel Firewall IP rules or `@upstash/ratelimit` before any public Meta Ads campaign (in-memory is not reliable across multiple Vercel instances).
3. **Implement GDPR deletion endpoint** — before scale beyond 50 drivers.
4. **Define and document data retention schedule** — before legal review.
5. **Set `sameSite: strict` on recruiter_session cookie** — tighter CSRF protection.
6. **Add security headers in next.config.js** — `X-Content-Type-Options`, `X-Frame-Options`, basic CSP.
7. **Hash phone in system_actions.input before logging** — GDPR hygiene in audit log.
8. **Verify hej@drivernord.se monitoring** — immediate; 10-minute task.
