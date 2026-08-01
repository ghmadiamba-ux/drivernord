# DriverNord Global System Audit

**Date:** 2026-08-01
**Scope:** Full-system audit of the canonical working root (`C:\PROJECT\DriverNord`) after the Aug 2026 workspace consolidation. Audit only — no deploys, no production migrations, no credential changes, no outreach/publishing performed.
**Method:** Static code/doc review across 6 parallel research passes (website, WhatsApp, Facebook, agents/automation, database/migrations, admin+email+security) plus local test/build/audit runs.

---

## A. Executive Summary

DriverNord's codebase is in materially better shape than its "prototype" framing in older docs suggests. The full test suite passes (2663/2663), the production build compiles cleanly with zero type errors, and the automation architecture is built around a consistent "propose, don't act" default: every channel that reaches a human outside the company (SMS/WhatsApp to drivers, email to companies, WhatsApp/Facebook group posts) is dry-run/simulated/manual by default and requires an explicit env-var flip or human confirmation to go live.

The system's real risk is not "does it work" but **"is the safety architecture uniformly enforced."** It mostly is, with three concrete exceptions found this audit: (1) a confirmed logic bug in the Facebook cron publisher that corrupts CTA-count reporting, (2) two unauthenticated admin API routes that can write to the database without a session, and (3) an unresolved split between `migrations/` and `supabase/migrations/` where application code already depends on schema that may or may not exist in the live database. None of these are catastrophic, but all three should be fixed before treating any of Facebook automation, admin tooling, or the Supabase schema as fully trustworthy.

Distribution readiness is uneven: Facebook Page publishing is real and semi-autonomous (with the caveat above); WhatsApp is fully-built but deliberately inert (zero live sends, by design, pending Meta business verification); the founder-relay doctrine (no direct group bot) is correctly and consistently implemented everywhere it was checked.

## B. Overall System Maturity

**Classification: Operational MVP, with select subsystems (Facebook publisher, content engine, matching pipeline) approaching Early Production.**

| Layer | Maturity |
|---|---|
| A. Website | Early Production |
| B. Driver acquisition (chat flow) | Early Production |
| C. Company/operator acquisition | Internal MVP |
| D. Matching | Early Production |
| E. Logistikklubb | Operational MVP |
| F. WhatsApp community layer | Internal MVP (built, not activated) |
| G. Facebook automation | Operational MVP (gated, one confirmed bug) |
| H. Outreach/email | Internal MVP (human-in-the-loop by design) |
| I. Admin cockpit | Operational MVP (two auth gaps) |
| J. Data/DB foundation | Internal MVP (migration authority unresolved) |
| K. Agent supervision/Hermès readiness | Internal MVP (system_actions is a solid audit trail; no supervisory layer on top of it yet) |

## C. Website Status

**Complete:** All public routes render and are cross-linked correctly — `/`→`/chaufforer` redirect, `/chaufforer`, `/company`, `/company/ai-agenter`, `/chat`, `/logistikklubb`, `/recruiter` (+`/login`), `/about`, `/privacy`, `/terms`, `/cookies`, `/contact`. No broken routes, no empty/placeholder pages. `/recruiter/*` and `/admin/*` page routes are protected by `middleware.ts` via `recruiter_session` cookie. Per-page SEO metadata (title/description/OG/Twitter, JSON-LD on `/chaufforer` and `/company`) is present and well-crafted. Cookie consent banner (`components/consent/CookieConsentBanner.tsx`) and Meta Pixel gating (`components/analytics/MetaPixel.tsx`) correctly require marketing consent before the pixel or any tracking event fires. Mobile nav, responsive grids, and a mobile-specific hero image swap are implemented. Phone (`+46709385267`) and email (`hej@drivernord.com`) are consistent across every public page.

**Partially complete:**
- `/logistikklubb` is reachable only from the mobile hamburger nav, not the desktop header, and is missing from `public/sitemap.xml`.
- `LegalFooter.tsx` and `/privacy`/`/cookies` promise a "Hantera cookieinställningar" (manage cookie settings) link that does not exist in the footer — a broken cross-reference, not just a missing feature.
- `LegalFooter.tsx` still shows `Org.nr: [kommer snart]` and `Adress: [kommer snart]` placeholders, and a hardcoded `© 2025` copyright.
- Root `app/layout.tsx` fallback metadata ("Driver Registration" / English) leaks onto any page without its own metadata export (e.g. `/chat`), breaking the otherwise-consistent Swedish voice.
- `/recruiter` cockpit UI is entirely in English — acceptable for an internal tool but worth a decision.

**Broken/missing:** Nothing structurally broken. `lib/conversation.ts` includes a `bemanning_open` step between `consent` and `confirmation` that CLAUDE.md's documented flow does not mention — a doc/code drift, not a bug.

**Priority next steps:** fix the cookie-settings link (broken promise to users is a GDPR-adjacent trust issue), add `/logistikklubb` to sitemap + desktop nav, resolve the `Org.nr`/address placeholders before treating `/privacy` and `/terms` as final.

## D. WhatsApp Driver Platform Status

**Maturity: Dry-run / built-but-inert.** No WhatsApp message has ever been sent live ("No outreach has been made" — `docs/business/whatsapp-architecture-review.md`).

**Doctrine compliance: confirmed safe.** No code path posts directly into a WhatsApp group anywhere in the repo. `lib/whatsappClient.ts` explicitly documents the relay pattern and hard-allowlists sends to `WHATSAPP_FOUNDER_PHONE` only, using a Meta-approved 1:1 template — never free-form, never group. `lib/logistikklubbPublisher.ts`'s `WhatsAppGroupsPublisherAdapter` is a hardcoded stub that always returns `adapter_disabled` regardless of its own feature flag, with an explicit comment against unofficial browser-automation approaches. Default posting path is `ManualPublisherAdapter` — founder copies text and posts by hand. No WAPI/Twilio/Baileys/unofficial-automation residue was found; the architecture review doc explicitly records rejecting that path.

**What works now:** production-grade Meta Cloud API client code (real HTTP calls, token redaction, DB-backed daily rate cap), a founder-notification cron (`logistikklubb-scheduler`) and a twice-daily WhatsApp-only relay ping (`logistikklubb-daily-notify`), and a manual test route (`app/api/admin/whatsapp-test`) gated behind recruiter-auth/CRON_SECRET + explicit confirm flag.

**What's blocked:** live sending needs (1) a registered Meta Cloud API sender number, (2) WhatsApp Business Account creation + Meta Business Verification, (3) approval of the `logistikklubb_post_due` template, (4) env vars set in Vercel (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_FOUNDER_PHONE` — all present-but-empty in `.env.local.example`), (5) founder flip of `FOUNDER_WHATSAPP_ENABLED=true`. None are set.

**Recommended next step:** activate the already-built SMTP founder-notification path first (3 env vars, no Meta dependency) as the primary "needs action" channel; WhatsApp relay can follow once Meta business verification completes.

## E. Facebook Automation Status

**Status: semi-autonomous and gated, not fully autonomous.** Requires `FACEBOOK_PAGE_API_ENABLED=true` (Vercel-side, unverifiable from code) plus `CRON_SECRET`, with a DB-backed `emergency_pause` kill switch. `lib/facebookPageClient.ts` is a clean, token-redacting `fetch` wrapper to the Graph API with a 10s timeout; no plaintext token was found logged anywhere, including `system_actions` payloads.

**CTA counting bug — confirmed live, not fixed.** The `content_facebook_publish_queue` table (migration `02800000`) and its matching TS interface `FbQueueEntry` have **no `cta_type` column**. Yet `app/api/cron/content-facebook-publisher/route.ts:178` logs `is_cta: String(entry.cta_type !== 'none')` via an `as unknown as Record<string, unknown>` cast that hides the missing field from TypeScript. Since `entry.cta_type` is always `undefined`, this expression is always `true` — **every cron-published post is logged as a CTA post**, regardless of whether it actually is one. This inflates the weekly CTA counter (`getFbCtaThisWeek()`) that gates `max_cta_per_week`, which means the practical failure mode is **over-blocking** (the CTA cap trips prematurely), not CTA overposting — but every cron-published post's audit record is factually wrong. The founder-triggered manual "first post" route (`content-facebook-first-post/route.ts:211`) is unaffected — it correctly reads `card.cta_type` from `content_campaign_cards`, which does have that column.

**Risk level: Medium.** No data loss, no runaway CTA publishing, no credential exposure — but CTA cadence reporting/analytics on the autonomous path cannot be trusted until fixed, and the bug is untested (no test asserts `is_cta` for the cron route).

**Verdict:** Non-CTA autonomous publishing can reasonably continue (matches prior guidance). CTA-flagged cron publishing should stay treated with skepticism until `route.ts:178` is fixed to join `card.cta_type` from `content_campaign_cards` instead of reading it off the queue entry. Not yet "production operational" in the strict sense — it's operational with a known, bounded reporting defect.

## F. Agent-by-Agent Status Table

| Agent | Purpose | Status | Prod-ready | Key gate | Blocker/Note |
|---|---|---|---|---|---|
| Market Scanning Agent | Score/classify company need signals | Mature, pure-function core, well tested | High (evaluation); depends on connector creds for live scan | `PLATSBANKEN_SCAN_ENABLED` | Falls back to evaluation-only if unset — safe |
| Matching Agent | Build driver shortlists per need | Mature, deterministic, tested | High | `AGENT_CONTACT_ENABLED`/`AGENT_CONTACT_MODE` | Fire-and-forgets into Contact Agent — no independent kill switch beyond contact's own gate |
| Logistikklubb Agent | Draft WhatsApp community posts | Functional, manual-post default | Medium | `WHATSAPP_GROUPS_API_ENABLED`-style auto-post flag | Auto-post path exists but explicitly commented "do not enable without a verified official adapter" |
| News Relay Agent | RSS → draft posts | Functional, strict allowlist + 72h recency + dedup | Medium | n/a (always draft-only) | Only 3/5 configured sources currently active |
| Content & Distribution Engine | Generate/plan campaign content | Large, mature subsystem; hands off to gated queue, never publishes directly | Medium-High | n/a | Deeper content-safety review of `generator.ts`/`riskClassifier.ts` recommended separately |
| Facebook Publisher | Post to FB Page | Real, gated, semi-autonomous | Medium (see §E) | `FACEBOOK_PAGE_API_ENABLED` | CTA-count bug (§E) |
| Founder Notification | Email/WhatsApp founder pings | Solid, PII-free by design, never throws | High for what it covers | `FOUNDER_NOTIFICATIONS_ENABLED`/`FOUNDER_WHATSAPP_ENABLED` | Narrow coverage — only Logistikklubb post-due events wire into it; contact-approval queue has no push notification |
| Outreach Agent | Generate outreach email content | Content-gen only; sending is explicitly out of scope of this module | High for content-gen; sending is manual | n/a | Header comment: "This module never sends" — actual sending is the Python CLI scripts |
| Contact Approval / Queue | Surface pending contact suggestions | Read-model only (synthesized from `system_actions`), no write path found in this pass | Unclear | n/a | Approve/reject route not located in this audit pass — verify it exists and is auth-gated |
| Data Quality Agent | Detect dupes/bad data | Solid pure logic, idempotent scan | Medium | n/a | No dedicated cron route found — appears admin-triggered only; scheduling gap |
| Agency Scan Agent | Route staffing agencies away from client pipeline | **Doctrine enforced at 2 independent chokepoints** (classification + promotion block) | High | n/a | `agency_posting_signals` / `hold_agency` correctly implemented per doctrine |
| DoNotContact | Block excluded contacts | Functional but **duplicated**: `lib/doNotContact.ts` and `lib/outreachAgent.ts`'s `resolveBlock()` maintain separate, drifting JPC exclusion lists | Medium | n/a | No automated opt-out ingestion — "Avregistrera" replies require a human to update DNC manually |
| system_actions logging | System-wide audit trail | Consistent, comprehensive, PII-conscious | High | n/a | Closest thing to a supervision/Hermès substrate today |

**Top automation safety concerns:**
1. "Simulated" SMS is a runtime default, not a structural lock — `lib/messaging/index.ts` switches to a real 46elks provider the moment `SMS_PROVIDER` is set; combined with `AGENT_CONTACT_MODE=auto`, this is one config change from real mass SMS.
2. Duplicated DNC logic between `lib/doNotContact.ts` and `lib/outreachAgent.ts` risks drift.
3. `scripts/send_wave1_phase1_prospecting.py` (untracked) hardcodes real prospect names/emails directly in source — should be committed-then-deleted or moved into the reviewed queue-file pattern the other two SMTP scripts use.

## G. Database / Supabase Status

**Migration risk level: HIGH** (not critical — all changes found are additive/`IF NOT EXISTS`, no destructive SQL).

Two parallel migration directories exist and have diverged from `migrations/016` / `supabase/migrations/01600000` onward:

- `migrations/013–019` and `supabase/migrations/01300000–01500000` are functionally identical (renumbering only).
- From 016 onward they implement **different features on different branches** — e.g. `migrations/016` adds a `simulation` column to `ingested_drivers`, while `supabase/migrations/01600000` extends `pilot_company_relationships`; `supabase/migrations/01700000–02800000` (Logistikklubb scheduled posts, agency posting signals, bemanning consent, news relay columns, system_actions constraint fixes, Facebook publish queue) have **no counterpart at all** in `migrations/`.
- A prior reconciliation pass already exists and reaches the same conclusion: `docs/architecture/migration-reconciliation-report.md` (committed 2026-07-31).
- `supabase/config.toml` confirms the Supabase CLI's default source is `supabase/migrations/`, meaning `migrations/013–019`'s changes (simulation flag, system_actions constraint patches) would **not** be picked up by `supabase db push` unless applied manually.
- **Confirmed dependency:** already-committed application code (`lib/ingestedDriverStore.ts`, `lib/logistikklubbSchedule.ts`, `lib/newsRelayAgent.ts`, `lib/agencyScanAgent.ts`, `lib/companyNeedDraft.ts`, `lib/content/facebookPublishQueue.ts`, `lib/companyNeedMarketAgent.ts`, `lib/pilotOutreach.ts`) actively depends on the entire `supabase/migrations/016000–028000` range — this is not a hypothetical risk, it's load-bearing for features already shipped in code.

**Must be verified manually in the Supabase dashboard before trusting any of this further:**
- `ingested_drivers.simulation` column exists
- `logistikklubb_scheduled_posts` table + `is_news_relay`/source columns exist
- `agency_posting_signals` table + `commercial_classification` column exist
- `company_need_drafts.draft_status` includes `hold_agency`
- widened `system_actions` CHECK constraints (market agent, contact/draft, logistikklubb/founder, content-engine, Facebook action types) are live
- `content_facebook_publish_queue` / `content_facebook_publish_config` tables exist

**Safe to commit as-is:** nothing new pending reconciliation — committing either directory's untracked files as canonical risks silently dropping the other's features.

## H. Admin / Cockpit Status

**Works:** `/admin/cockpit`, `/admin/contacts`, `/admin/content`, `/admin/logistikklubb` page routes are protected by `middleware.ts` (recruiter session cookie). Cron/agent API routes correctly use `CRON_SECRET`/`AGENT_API_KEY` bearer auth instead of recruiter auth. All "test"/"send"-named routes found (`zoho/internal-test-send`, `whatsapp-test`, `outreach-queue/[id]/send`) are well-gated with recruiter auth plus additional confirm/rate-limit/status checks — the outreach send route in particular stacks 7 sequential gates.

**Protected but with a real gap:** `middleware.ts`'s route matcher covers `/admin/*` and `/recruiter/*` **page routes only**, not `/api/admin/*`. Each API route must self-enforce via `requireRecruiterAuth()`. Two do not:
- `app/api/admin/content-planner/route.ts` — POST/GET/PATCH, **no auth check**, writes `content_campaign_cards`.
- `app/api/admin/visual-plan/route.ts` — POST/GET/PATCH, **no auth check**, writes `visual_plan` JSONB.

Both are DB-writing endpoints reachable by anyone who discovers the URL. Neither performs an outreach/publish action directly, but this is still an authentication gap that should be closed.

**Incomplete/unclear:** the contact-approval write path (approve/reject) was not located in this pass — worth confirming it exists and is auth-gated. Data Quality Agent has no confirmed scheduled trigger.

**Dangerous if misconfigured:** `app/api/cron/logistikklubb-news-fetch` and `logistikklubb-daily-notify` only enforce `CRON_SECRET` **if it is set** — fail-open, not fail-closed, if the env var is ever missing in an environment.

## I. Email / Outreach Status

**Readiness: good, blocked by default at three independent layers.**
1. Server-side: `lib/zohoMailClient.ts` and `lib/smtpMailClient.ts` both return `dry_run:true` unless every required `ZOHO_*`/SMTP env var is set.
2. API layer: `outreach-queue/[id]/send` stacks auth + config + status + dry-run + content-validation + rate-limit + working-hours gates.
3. Script layer: the three Python send scripts (`contact_agent_smtp_runner.py`, `send_driverNord_smtp_batch.py`, `send_wave1_phase1_prospecting.py`) all default to `--dry-run`, require an interactively-typed app password (never env/file-stored), per-email confirmation prompts, forbidden-content validation, and DNC/JPC blocking. None can run unattended.

**Compliance:** `lib/doNotContact.ts` is consumed consistently across matching/outreach; `.env.local.example` documents every gate with explicit "DO NOT ACTIVATE until…" checklists.

**Gap:** no automated opt-out processing — "Avregistrera" replies require a human to manually flag DNC; and `send_wave1_phase1_prospecting.py` hardcodes real prospect PII directly in an untracked source file (data-hygiene issue, not a send risk given its confirmation gates).

**No email was sent during this audit.**

## J. Security / Compliance Status

**High risk:**
- Unauthenticated write endpoints `app/api/admin/content-planner` and `app/api/admin/visual-plan` (§H) — fix by adding `requireRecruiterAuth`.

**Medium risk:**
- `lib/recruiterAuth.ts` compares the API key with plain `===`, not constant-time comparison.
- Meta Pixel consent-gating is enforced by convention at call sites (`hooks/useChat.ts`) rather than a hard check inside the pixel utility itself.
- `app/api/admin/zoho/account-lookup` is a "temporary" route gated only by its own bearer secret — should be deleted once no longer needed.
- Duplicated DNC/JPC exclusion lists (§F) risk drift.

**Low risk:**
- `CRON_SECRET` fail-open behavior on two Logistikklubb cron routes when the var is unset (§H).

**Good practices confirmed:** `.gitignore` correctly excludes all `.env*` variants and `docs/private-holdback/` (verified via `git check-ignore`); no hardcoded secrets found via pattern search; no PII found logged via `console.log/error/warn`; tokens are explicitly never logged or returned (Zoho, Facebook, WhatsApp clients all redact).

## K. Test / Build / npm audit Status

- **Tests:** `npm test` → **2663/2663 passed**, 81 test files, ~16s. All failures/errors visible in stderr output during the run are intentional (tests asserting graceful DB-failure handling, e.g. `systemActions.test.ts`'s "does not throw when DB insert fails").
- **Build:** `npm run build` → **succeeds cleanly**, zero type errors, 47 static pages + dynamic API routes generated correctly. No blocking warnings (one informational note about edge runtime disabling static generation on one page, expected).
- **Lint:** no `lint` script exists in `package.json` — not run, not configured.
- **npm audit:** **8 vulnerabilities (1 critical, 5 high, 2 moderate)** — all in dependencies, not app code: Next.js 14.2.35 (multiple advisories: XSS via CSP nonces, cache poisoning, SSRF, DoS), `nodemailer` ≤9.0.0 (SMTP command injection, CRLF injection, SSRF via raw option), `postcss` ≤8.5.17 (XSS, path traversal), `ws` 8.0.0–8.20.1 (memory exhaustion DoS). Fixes exist but all require `npm audit fix --force`, which would bump Next.js to v16 — a breaking major-version change not attempted in this audit.

**Overall: the system is stable.** Tests and build are trustworthy signals; the audit vulnerabilities are dependency-level and require a deliberate, tested upgrade rather than an autonomous fix.

## L. Critical Blockers

1. **Facebook cron CTA-counting bug** (`app/api/cron/content-facebook-publisher/route.ts:178`) — corrupts CTA audit trail and over-trips the weekly CTA cap. Fix is small and well-isolated.
2. **Two unauthenticated admin API routes** (`content-planner`, `visual-plan`) can write to the database without any session — add `requireRecruiterAuth`.
3. **Migration authority split** — application code depends on `supabase/migrations/016000–028000`, which has no confirmed live counterpart; must be verified in the Supabase dashboard before further schema work is trusted.

## M. Medium-Priority Gaps

- Duplicated DNC/JPC exclusion logic across `lib/doNotContact.ts` and `lib/outreachAgent.ts`.
- No automated opt-out ("Avregistrera") ingestion back into DNC status.
- `lib/recruiterAuth.ts` uses non-constant-time key comparison.
- Two Logistikklubb cron routes fail-open if `CRON_SECRET` is unset.
- Founder notification coverage is narrow — only Logistikklubb post-due events push proactively; contact-approval queue items require the founder to check the UI.
- Data Quality Agent has no confirmed scheduled trigger.
- Contact-approval write (approve/reject) path not located — verify it exists and is auth-gated.
- Broken "manage cookie settings" footer link referenced from `/privacy` and `/cookies`.
- `LegalFooter.tsx` placeholder `Org.nr`/address fields and stale `© 2025`.
- `/logistikklubb` missing from desktop nav and sitemap.xml.
- `zoho/account-lookup` route should be deleted once no longer needed.

## N. Low-Priority Cleanup

- Root `app/layout.tsx` English fallback metadata bleeding into pages without explicit metadata (e.g. `/chat`).
- CLAUDE.md's documented chat step order is missing the `bemanning_open` step present in `lib/conversation.ts`.
- `/recruiter` cockpit UI is English-only (acceptable, but worth a deliberate decision).
- Only 3/5 configured News Relay sources are currently active.
- `sim-results.json` / `sim-full-pipeline-results.json` are simulation output artifacts — should probably be gitignored rather than left as untracked working files.
- `scripts/record-outreach-sent-2026-06-24.ts` is a one-off reconciliation script — fine to keep, but not general-purpose tooling.
- npm audit dependency vulnerabilities (§K) — schedule a deliberate, tested Next.js major-version upgrade.

## O. Recommended Next 10 Actions, Ranked

1. Fix the Facebook cron CTA-counting bug (`content-facebook-publisher/route.ts:178`) — small, isolated, high-value.
2. Add `requireRecruiterAuth` to `content-planner` and `visual-plan` admin routes.
3. Manually verify in the Supabase dashboard which of the `supabase/migrations/016000–028000` schema objects actually exist live, and reconcile with `migrations/013–019`.
4. Make `CRON_SECRET` checks fail-closed on `logistikklubb-news-fetch` and `logistikklubb-daily-notify`.
5. Unify DNC/JPC exclusion logic into a single source of truth (`lib/doNotContact.ts`) consumed by `outreachAgent.ts` too.
6. Fix the broken "manage cookie settings" footer link (add the control, or remove the claim from `/privacy`/`/cookies`).
7. Switch `lib/recruiterAuth.ts` to constant-time comparison (`crypto.timingSafeEqual`).
8. Resolve `Org.nr`/address placeholders in `LegalFooter.tsx` before treating `/privacy`/`/terms` as final.
9. Locate/confirm the contact-approval write (approve/reject) path and its auth gating.
10. Decide the fate of `scripts/send_wave1_phase1_prospecting.py` (commit-with-review or delete) given it holds hardcoded real prospect PII in an untracked file.

## P. Founder Decisions Required

- Which migration directory (`migrations/` or `supabase/migrations/`) is canonical going forward, and how to reconcile the divergent 016+ history — this determines the next steps for Supabase schema work.
- Whether/when to proceed with Meta Business Verification for the WhatsApp Cloud API sender number (blocks WhatsApp automation entirely until decided).
- Whether to schedule the Next.js major-version upgrade needed to clear the npm audit findings (breaking change, needs planning).
- Whether `/recruiter` cockpit should be localized to Swedish.
- Disposition of `scripts/send_wave1_phase1_prospecting.py` (commit or delete).

## Q. What Claude Code Can Fix Autonomously Next

Small, well-isolated, low-blast-radius fixes with no schema/credential/production dependency:
- The Facebook CTA-counting bug (item O.1).
- Adding `requireRecruiterAuth` to the two unauthenticated admin routes (item O.2).
- Fail-closed `CRON_SECRET` checks (item O.4).
- Constant-time recruiter-auth comparison (item O.7).
- Unifying the DNC/JPC exclusion lists (item O.5).
- The broken cookie-settings footer link (item O.6).
- `/logistikklubb` sitemap + desktop nav additions.
- CLAUDE.md doc-drift fix for the `bemanning_open` step.

## R. What Must Not Be Touched Without Founder Approval

- Any Supabase production migration or schema change (per safety constraints — migration authority is unresolved; applying either directory could silently break the other's dependents).
- Any credential, provider setting, or env var flip that activates a previously-inert send channel (`SMS_PROVIDER`, `FOUNDER_WHATSAPP_ENABLED`, `FACEBOOK_PAGE_API_ENABLED`, Zoho SMTP password).
- `scripts/send_wave1_phase1_prospecting.py` and the other live-send-capable Python scripts — do not execute, even in `--dry-run`, without founder sign-off given they touch real prospect data.
- The Next.js major-version upgrade to clear npm audit findings — breaking change, needs a planned upgrade window.
- `AGENT_CONTACT_MODE`, `AGENT_CONTACT_ENABLED`, `AUTO_CONTACT_THRESHOLD` — per CLAUDE.md, must not be changed automatically.
