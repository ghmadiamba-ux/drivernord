# DriverNord — Project Audit v3

*Date: 2026-05-10*
*Auditor: Claude Sonnet 4.6 (automated code audit — read-only)*
*Prior audit: docs/audits/project-audit-v2.md (2026-05-06)*

---

## 1. Executive Summary

**Verdict: Materially improved since v2. Three of the five critical v2 gaps are now closed. The pipeline is now fully autonomous end-to-end. The most critical security gap (browser-exposed recruiter key) is resolved. Two significant gaps remain: SMS sending is still simulated, and database migrations are not in version control.**

### What changed since v2 (2026-05-06)

| v2 Critical Gap | Status |
|-----------------|--------|
| Ingestion-to-matching trigger missing | **FIXED** — `triggerMatchingForAllNeeds()` fires fire-and-forget after `ingestLead()` |
| `POST /api/company-needs` had no auth | **FIXED** — `requireRecruiterAuth` added; also logs `need_ingested` and triggers matching |
| `NEXT_PUBLIC_RECRUITER_API_KEY` browser exposure | **FIXED** — cockpit now uses HTTP-only cookie session, no browser-visible key |
| `next.config.js` missing | **FIXED** — added with `/` → `/chaufforer` redirect |
| Driver landing page missing | **FIXED** — `/chaufforer` page fully implemented |
| Privacy/Terms/Cookies/About/Contact pages missing | **FIXED** — all 5 pages exist |

### Remaining significant gaps

| Gap | Priority | Status |
|-----|----------|--------|
| Migrations not in version control | HIGH | Still absent |
| Contact/follow-up sending is simulated | HIGH | Still console.log only — no SMS provider |
| `GET /api/leads/[id]` returns full PII with no auth | HIGH | Still unprotected |
| `GET/POST /api/leads/[id]/score` has no auth | HIGH | Still unprotected |
| `recruiterAuth.test.ts` — 4 test failures | MEDIUM | Test mock stale after cookie auth migration |
| `getOpenCompanyNeeds()` missing company_name join | MEDIUM | Still missing |
| Match cooldown guard | LOW | Not implemented |

---

## 2. Build Result

**Command:** `npm run build`
**Result: PASS — 0 TypeScript errors**

```
✓ Compiled successfully
✓ Generating static pages (19/19)
```

**Route manifest (30 routes):**

| Route | Type |
|-------|------|
| `/` | Static — 307 redirect to /chaufforer |
| `/about` | Static |
| `/chat` | Static (client component) |
| `/chaufforer` | Static |
| `/company` | Static |
| `/company/ai-agenter` | Static |
| `/contact` | Static |
| `/cookies` | Static |
| `/privacy` | Static |
| `/recruiter` | Static (client component) |
| `/recruiter/login` | Static (client component) |
| `/terms` | Static |
| `/chaufforer/opengraph-image` | Dynamic (edge) |
| `/company/opengraph-image` | Dynamic (edge) |
| `/api/agent/follow-up` | Dynamic |
| `/api/cockpit` | Dynamic |
| `/api/cockpit/actions` | Dynamic |
| `/api/cockpit/actions/[id]` | Dynamic |
| `/api/cockpit/actions/[id]/retry` | Dynamic |
| `/api/cockpit/metrics` | Dynamic |
| `/api/company-needs` | Dynamic |
| `/api/leads` | Dynamic |
| `/api/leads/[id]` | Dynamic |
| `/api/leads/[id]/score` | Dynamic |
| `/api/match` | Dynamic |
| `/api/recruiter/auth` | Dynamic |
| `/api/recruiter/match` | Dynamic |
| `/api/recruiter/shortlist-entries/[id]` | Dynamic |
| `/api/recruiter/shortlists/[id]` | Dynamic |

**Warnings in build output:**
- `⚠ Using edge runtime on a page currently disables static generation` — from OG image routes, expected and correct.
- `⚠ metadataBase property in metadata export is not set` — on some pages; social sharing images will fall back to localhost URL. Low priority until domain is fully stable.

---

## 3. Test Result

**Command:** `npm test`
**Result: PARTIAL PASS — 518/522 tests pass, 4 fail**

**Pass summary:** 18 of 19 test files pass.

**Failures: `tests/recruiterAuth.test.ts` — 4 tests**

```
TypeError: Cannot read properties of undefined (reading 'get')
  at requireRecruiterAuth lib/recruiterAuth.ts:16:33
```

**Root cause:** `requireRecruiterAuth` was updated to support cookie-based auth in addition to header-based auth. It now calls `req.cookies.get('recruiter_session')`. The test file mocks `req` with only a `headers` object — `cookies` is `undefined`. The test mock was not updated when cookie auth was added.

**This is a stale test, not a code defect.** The production implementation is correct. The four failing cases are:
- returns 401 when header is missing (test passes wrong type of mock)
- returns 401 when header is wrong (same)
- returns 401 when header is empty string (same)
- case-sensitive check — wrong case returns 401 (same)

All four fail for the same reason. The fix is to update the mock in `recruiterAuth.test.ts` to include `cookies: { get: () => undefined }`. This is a documentation-only audit — not fixing code.

**Test coverage across 19 files:**
- `classify.test.ts` (pure function) — covers all license/ykb/region/relocate priority logic
- `followup.test.ts` (pure function) — covers follow_up_at scheduling
- `scoreDriver.test.ts` — covers all 4 score dimensions + tier caps + flags
- `matchScore.test.ts` — covers license coverage hierarchy + domain matching
- `matchingEngine.test.ts` — covers buildShortlist hard filters + ranking
- `conversation.test.ts` — covers step routing including Stockholm shortcut and disqualified path
- `applyStep.test.ts` — covers applyStep validate + classify + computeFollowUp
- `driverProfile.test.ts` — covers buildDriverProfile
- `ingestedDriver.test.ts` — covers buildIngestedDriver
- `ingestLead.test.ts` — covers ingestLead (mocked Supabase)
- `store.test.ts` — covers createLead/getLead/updateLead (mocked)
- `companyNeed.test.ts` — covers validateCompanyNeedInput
- `recruiterAuth.test.ts` — 4 failures (stale mock)
- `systemActions.test.ts` — covers logAction
- `matchingAgent.test.ts` — covers runMatchingAgent (mocked)
- `contactAgent.test.ts` — covers all guards, modes (suggest/auto/hybrid), dedup
- `followUpAgent.test.ts` — covers suggest/auto modes, dedup, kill switch
- `scoringPipeline.test.ts` — integration-style: classify → score → shortlist
- `contactWorkflow.test.ts` — integration-style: shortlist → contact → approve

---

## 4. Pipeline Audit — Post-v2 State

The full autonomous pipeline is now implemented end-to-end. This is the most significant change since v2.

```
Driver completes /chat
  └─► PATCH /api/leads/[id] (final step)
        └─► applyStep() → lead_status = ready_for_ingestion
        └─► ingestLead(lead.id) → ingested_drivers row + scoreDriver()
        └─► [fire-and-forget] triggerMatchingForAllNeeds()
              └─► logAction(driver_ingested, completed)
              └─► getOpenCompanyNeeds()
              └─► for each need: void runMatchingAgent({ needId, triggeredBy: 'agent:driver_ingestion' })
                    └─► buildShortlist() → shortlist + entries persisted
                    └─► logAction(match_run, completed)
                    └─► logAction(shortlist_created, completed)
                    └─► [fire-and-forget] runContactAgent({ shortlistId })
                          └─► guards: score≥60, not recently contacted, YKB, availability
                          └─► suggest mode (default): logAction(contact_suggested, pending)
                          └─► auto mode: SIMULATED SEND + logAction(contact_sent, completed)

Company need created via POST /api/company-needs [now auth-protected]
  └─► requireRecruiterAuth
  └─► createCompany() + createCompanyNeed()
  └─► [fire-and-forget] triggerMatchingForNeed(needId)
        └─► logAction(need_ingested, completed)
        └─► void runMatchingAgent({ needId, triggeredBy: 'agent:company_need_ingestion' })

Cron 08:00 UTC → POST /api/agent/follow-up [AGENT_API_KEY]
  └─► runFollowUpAgent()
        └─► drivers WHERE follow_up_at ≤ now AND follow_up_sent = false
        └─► dedup: skip if shortlist_entry contacted within 7 days
        └─► suggest mode: logAction(follow_up_triggered, pending)
        └─► auto mode: SIMULATED SEND + logAction(follow_up_sent, completed)

Recruiter (cockpit) approves pending action
  └─► PATCH /api/cockpit/actions/[id] { action: 'approve' }
        └─► executeApproval() → updates shortlist_entry to contacted / sets follow_up_sent
        └─► logAction(contact_confirmed or follow_up_confirmed, completed)
```

**Pipeline automation status:**

| Stage | Automated? | Notes |
|-------|------------|-------|
| Driver intake | YES | /chat → PATCH /api/leads/[id] |
| Lead classification | YES | classifyStatus/Priority in applyStep |
| Lead ingestion | YES | Auto-triggers on ready_for_ingestion |
| Ingestion logging | YES | driver_ingested logged to system_actions |
| Matching trigger (on driver) | YES | Fires for all open needs after ingestion |
| Matching trigger (on need) | YES | Fires for new need after creation |
| Shortlist creation | YES | buildShortlist + createShortlist |
| Contact suggestion | YES (suggest mode) | Logged as pending, awaiting human approval |
| Contact send | SIMULATED ONLY | No real SMS/WhatsApp provider |
| Follow-up scheduling | YES | computeFollowUp sets follow_up_at |
| Follow-up trigger | YES (cron) | Daily 08:00 UTC |
| Follow-up send | SIMULATED ONLY | No real SMS provider |
| Human approval | YES | /recruiter cockpit approve/cancel/retry |

---

## 5. Security Audit

### Resolved since v2

**[FIXED] Cockpit auth — no browser-visible key**
The `/recruiter` page no longer contains `process.env.NEXT_PUBLIC_RECRUITER_API_KEY`. Auth flow:
1. `/recruiter/login` — user enters key
2. POST to `/api/recruiter/auth` — validates against `RECRUITER_API_KEY` env var (server-only)
3. Sets `recruiter_session` HTTP-only cookie (7 days, secure in production, sameSite=lax)
4. Middleware intercepts all `/recruiter/*` — redirects to login if cookie absent or invalid
5. All cockpit fetch calls rely on the cookie — no key in request headers from browser
6. `requireRecruiterAuth` accepts both header (`x-recruiter-key`) and cookie (`recruiter_session`) — allows both server-to-server API calls and browser sessions

**[FIXED] POST /api/company-needs auth**
The POST handler now calls `requireRecruiterAuth(req)` at the top. Unauthenticated requests receive 401.

### Remaining

**[HIGH] GET /api/leads/[id] — returns full PII, no auth**
Any caller with a lead UUID can retrieve phone, email, first_name, and all step answers. There is no ownership check and no auth.

**[HIGH] GET/POST /api/leads/[id]/score — no auth**
GET returns the computed driver profile + score (includes contact fields). POST manually ingests and scores a lead. Both return contact.phone and contact.email. No auth.

**[MEDIUM] Phone number in system_actions.input JSONB**
`contact_suggested` actions store `phone` in the input field. This is returned via `/api/cockpit/actions` and `/api/cockpit`. The cockpit is now protected by cookie auth, so the exposure surface is limited to authenticated sessions. Still — PII in an audit log row is not ideal.

**[MEDIUM] No rate limiting on POST /api/leads**
No friction on lead creation. A bot could spam the driver pool. Acceptable for pre-pilot stage, but needed before public traffic campaigns.

**[MEDIUM] Supabase service role key used for all operations**
All DB access bypasses Row Level Security. Correct for server-only use. No client component imports `lib/db.ts` currently.

**[LOW] GET /api/leads/[id] ownership — UUID is the only access control**
Even if auth were added, UUID-as-token is weak (no rotation, no expiry). A dedicated session token per lead creation is the correct fix.

**[LOW] No Content Security Policy headers**
`next.config.js` has only redirects, no custom headers. Low risk given no user-generated content rendering.

---

## 6. API Audit

| Route | Auth | PII in response | Status |
|-------|------|-----------------|--------|
| `POST /api/leads` | None (public) | None | Acceptable — driver intake |
| `GET /api/leads/[id]` | None | HIGH — full lead incl. phone/email | RISK |
| `PATCH /api/leads/[id]` | None (public) | Low — metadata only | Acceptable |
| `GET /api/leads/[id]/score` | None | HIGH — full driver profile + contact | RISK |
| `POST /api/leads/[id]/score` | None | HIGH — same as GET | RISK |
| `GET /api/company-needs` | recruiterAuth | None | Good |
| `POST /api/company-needs` | recruiterAuth ✓ FIXED | None | Good |
| `POST /api/match` | MATCH_API_KEY | Medium — driver snapshots in response | Acceptable |
| `POST /api/recruiter/match` | recruiterAuth | Medium — driver snapshots | Acceptable |
| `POST /api/recruiter/auth` | Public (validates key) | None | Good |
| `DELETE /api/recruiter/auth` | None (clears cookie) | None | Good |
| `GET /api/recruiter/shortlists/[id]` | recruiterAuth | Medium — driver snapshots | Acceptable |
| `PATCH /api/recruiter/shortlist-entries/[id]` | recruiterAuth | None | Good |
| `GET /api/cockpit` | recruiterAuth (cookie) | Medium — phone in pending input JSONB | Acceptable |
| `GET /api/cockpit/actions` | recruiterAuth (cookie) | Medium — same | Acceptable |
| `PATCH /api/cockpit/actions/[id]` | recruiterAuth (cookie) | None | Good |
| `POST /api/cockpit/actions/[id]/retry` | recruiterAuth (cookie) | None | Good |
| `GET /api/cockpit/metrics` | recruiterAuth (cookie) | None | Good |
| `POST /api/agent/follow-up` | AGENT_API_KEY | None | Good |

---

## 7. Website Audit

### Pages present (as of 2026-05-10)

| Page | Purpose | Status |
|------|---------|--------|
| `/` | Redirect → /chaufforer | Good — proper HTTP 307 via next.config.js |
| `/chaufforer` | Driver acquisition landing page | Complete — hero, trust, how-it-works, comparison, CTA |
| `/chat` | Driver registration flow | Production-ready — bilingual, mobile-first, no CV |
| `/company` | B2B landing page | Complete — professional, AI-infrastructure positioning |
| `/company/ai-agenter` | Technical architecture detail | Complete — accurate to code, includes "simulated contact" banner |
| `/about` | Team/mission page | Present — content appropriate for early stage |
| `/privacy` | GDPR privacy policy | Present — marked "Preliminär version," covers data categories, rights, retention |
| `/terms` | Terms of service | Present — marked "Preliminär version," covers scope, disclaimers |
| `/cookies` | Cookie policy | Present — accurate: lists only `recruiter_session` cookie, no tracking |
| `/contact` | Contact page | Present — 3 cards: drivers, companies, GDPR. All point to hej@drivernord.com |
| `/recruiter` | Operator cockpit | Functional — observation panel, 15s polling, approve/cancel/retry |
| `/recruiter/login` | Recruiter auth | Working — HTTP-only cookie session |

### Shared components

- `PublicHeader` — sticky, responsive (hamburger on mobile), `'use client'` for nav toggle
- `LegalFooter` — 4-column grid, all legal links populated

### Email address status

All public pages and contact cards use `hej@drivernord.com`. Status of this inbox is unknown from code — must be verified operationally.

### Open Graph

- `/chaufforer/opengraph-image` — edge route, OG image generated
- `/company/opengraph-image` — edge route, OG image generated
- Other pages use metadata but no OG image route → falls back to default
- `metadataBase` warning from build: social images use localhost URL if `metadataBase` not set in layout — needs fix before meta campaigns

---

## 8. Gap Analysis — Comparison to v2

### Critical (resolved since v2)

| Gap | v2 Status | v3 Status |
|-----|-----------|-----------|
| Ingestion-to-matching trigger | MISSING | **FIXED** |
| POST /api/company-needs auth | UNPROTECTED | **FIXED** |
| NEXT_PUBLIC_RECRUITER_API_KEY browser exposure | CRITICAL | **FIXED** |
| next.config.js missing | ABSENT | **FIXED** |
| Driver landing page | ABSENT | **FIXED** |
| Privacy/Terms/Legal pages | ABSENT | **FIXED** |

### Remaining gaps

| Gap | Severity | Evidence |
|-----|----------|----------|
| Migrations not in version control | HIGH | No `migrations/` dir exists |
| SMS/WhatsApp contact provider | HIGH | `console.log('[contactAgent] SIMULATED SEND')` |
| `GET /api/leads/[id]` PII, no auth | HIGH | No auth check in GET handler |
| `GET/POST /api/leads/[id]/score` no auth | HIGH | No auth check in either handler |
| recruiterAuth.test.ts 4 failures | MEDIUM | Mock missing `cookies` property |
| company_name not joined in getOpenCompanyNeeds | MEDIUM | SELECT * without join to companies |
| No shortlist list endpoint | LOW | No GET /api/recruiter/shortlists |
| Match cooldown guard | LOW | Not in matchingAgent.ts |
| metadataBase not set in root layout | LOW | Social OG images use localhost fallback |

---

## 9. Document Audit

| Document | Date | Accuracy |
|----------|------|---------|
| `autonomous-system-audit-v1.md` | 2026-05-05 | Now historical — describes pre-agent state. Main recommendations have been implemented. |
| `e2e-simulation-5x5-v1.md` | 2026-05-05 | Still accurate for scoring logic. Pipeline automation section is outdated (triggers now exist). |
| `operator-cockpit-design-v1.md` | 2026-05-05 | Mostly implemented. Missing: `/api/cockpit/pipeline` endpoint, shortlist list endpoint, `MATCH_COOLDOWN_MINUTES` guard. |
| `company-site-handover-v1.md` | 2026-05-03 | Partially outdated — mentions section-driven CMS architecture (`lib/company/content.ts`) that was replaced by a direct Server Component rewrite. |
| `project-audit-v2.md` | 2026-05-06 | Still accurate for remaining gaps. Three of five critical items resolved. |

---

## 10. Top 10 Findings

1. **The autonomous pipeline is now complete end-to-end.** Driver → ingest → match → contact suggestion → human approval — all stages implemented and chained. The system is architecturally ready for pilot.

2. **Cookie-based auth is a genuine security improvement.** The HTTP-only cookie pattern is correct: no key in browser bundle, no JS-accessible token, middleware-enforced on all `/recruiter/*` paths. Recruiter cockpit is now properly protected.

3. **Contact and follow-up sending is still simulated.** Both agents write `channel: 'simulated'` to system_actions and console.log the message. No real SMS/WhatsApp provider is integrated. The system cannot reach drivers.

4. **No database migrations exist in the repository.** If the Supabase project is lost, recreated, or needs to be reproduced, there is no SQL source of truth. The schema exists only in a running database and in design documents.

5. **Three API routes return full driver PII without authentication.** `GET /api/leads/[id]`, `GET /api/leads/[id]/score`, and `POST /api/leads/[id]/score` all return phone and email without any auth or ownership check. These are low-risk for now (UUIDs are not guessable) but must be addressed before the driver pool scales.

6. **4 test failures in recruiterAuth.test.ts.** The test mock predates the cookie auth migration and passes an object without a `cookies` property. The production code is correct — this is a documentation/maintenance gap in the test suite.

7. **The build is clean and the route structure is correct.** 30 routes, 0 TypeScript errors, all pages generating without build failures. The codebase is technically sound.

8. **system_actions now has 14 action types including driver_ingested and need_ingested.** All agent operations are logged. The audit trail is complete for the stages that run.

9. **metadataBase is not set in the root layout.** Social sharing images for most pages will fall back to `http://localhost:3000` as the base URL. This affects OG previews when pages are shared — must be set to `https://drivernord.com` before campaigns.

10. **The legal pages are preliminary drafts.** `/privacy`, `/terms`, `/cookies` are all marked "Preliminär version" in amber banners. They are structurally correct but need legal review before public-facing use at scale.

---

## 11. Top 10 Next Actions

1. **Integrate a real SMS or WhatsApp provider.** Contact and follow-up agents have the message-building and mode infrastructure. The only missing piece is the actual send call. Priority: required for first real pilot.

2. **Commit migration SQL files to `migrations/`.** Write SQL DDL for all tables (`drivers`, `ingested_drivers`, `companies`, `company_needs`, `shortlists`, `shortlist_entries`, `system_actions`) with all constraints. Required for reproducibility and team collaboration.

3. **Fix `recruiterAuth.test.ts` — update mock to include `cookies`.** 4-line fix. Unblocks a clean test suite. Not a production risk but a maintenance debt.

4. **Add auth to `GET /api/leads/[id]`.** At minimum require `requireRecruiterAuth`. Longer term: issue a session token at lead creation and validate ownership.

5. **Add auth to `GET/POST /api/leads/[id]/score`.** These are development/admin endpoints — require recruiter auth or remove from production build.

6. **Set `metadataBase` in `app/layout.tsx`** to `https://drivernord.com`. Fixes OG image URLs for all pages.

7. **Verify `hej@drivernord.com` inbox is active and monitored.** All contact CTAs and GDPR requests route here. If unmonitored, all inbound company and driver inquiries are lost.

8. **Add `company_name` join to `getOpenCompanyNeeds()`.** The cockpit and matching logic work with `company_id` only — no human-readable company name in the observation feed.

9. **Have legal review `/privacy`, `/terms`, `/cookies`.** Remove the "Preliminär version" banners only after review. Current content is structurally correct but not legally reviewed.

10. **Set `AUTO_CONTACT_THRESHOLD`, `AGENT_CONTACT_MODE`, `AGENT_FOLLOWUP_MODE` in Vercel production.** Default is `suggest` mode for both agents — correct for pilot. Document the intended production values and confirm they are set.

---

*Audit generated from read-only code analysis. No application code was modified.*
*Build: `npm run build` → PASS (0 errors)*
*Tests: `npm test` → 518/522 pass, 4 fail (recruiterAuth.test.ts — stale mock)*
