# Meta and Social Readiness Audit

**Audit date:** 2026-05-16
**Scope:** Facebook Page status, Meta Business Manager, Pixel infrastructure, CAPI architecture, organic content readiness, paid campaign prerequisites, and social media compliance
**Source:** All 10 files in `docs/business/meta-acquisition-integration/`, Creative Agent spec folder, legal audit

---

## Overall Assessment

**Organic social: READY to start — founder action blocking.** The documentation is complete. The content strategy is fully specified. The content angle library has 8 angles with Swedish example copy ready to use. The only blocker is that the Facebook Page does not yet exist — a founder action taking 2–4 hours.

**Pixel/CAPI integration: NOT STARTED — correctly deferred.** The architecture is fully designed and documented. The implementation has not begun because the prerequisite (Pixel ID + CAPI access token from founder) has not been received. This is the correct order of operations.

**Paid campaigns: NOT READY — multiple prerequisites unmet.** The documentation covers targeting, budget structure, campaign objectives, and ad copy. The prerequisites (cookie consent banner, lawyer confirmation, organic test data, domain verification) are not complete.

---

## Facebook Page Status

**Status: DOES NOT EXIST.**

This is the single highest-impact founder-side blocker for organic acquisition. The Facebook Page is required before:
- Any organic post can be published on the Facebook Page
- Instagram account can be connected (requires a Facebook Page)
- Business Manager can be properly configured
- Domain verification in Events Manager can proceed
- Any Meta ad campaign can be launched

**Estimated founder effort:** 2–4 hours

**Reference:** `docs/business/meta-acquisition-integration/facebook-page-and-business-manager-checklist.md`

---

## Meta Business Manager Status

**Status: NOT CONFIGURED.**

Required for:
- Connecting the Ad Account to the Page
- Creating the Events Manager Dataset (Pixel)
- Generating a CAPI System User access token
- Domain verification

**Note:** Business Manager is distinct from a personal Meta account. The founder must create a Business Manager at `business.facebook.com` and connect the DriverNord Facebook Page to it.

---

## Events Manager and Domain Verification

**Status: NOT STARTED.**

The domain `drivernord.se` was confirmed as canonical on 2026-05-14. All Meta documentation targets `drivernord.se`. The Events Manager Dataset has not been created and the domain has not been verified.

**Domain verification process** (from `domain-and-events-manager-checklist.md`):
1. Create Events Manager Dataset → receive Pixel ID
2. Add `drivernord.se` as a verified domain
3. Add DNS TXT record or Meta tag to the site (Claude Code can implement the meta tag method)
4. DNS propagation: up to 48 hours
5. Configure Aggregated Event Measurement event priority order

**Impact if not done:** Domain verification is required before the CAPI can attribute conversions to the correct domain. Without it, conversion tracking is unreliable.

---

## Meta Pixel Implementation Status

**Status: NOT IMPLEMENTED.**

The architecture is fully designed in `pixel-event-architecture.md`. The implementation awaits:
1. `NEXT_PUBLIC_META_PIXEL_ID` (requires Events Manager Dataset creation — founder)
2. Cookie consent banner live (legal requirement before Pixel loads)
3. Lawyer confirmation of GDPR Art. 6 legal basis for cookie tracking

**What is ready when prerequisites are met:**
- Environment variable schema defined (`meta-env-and-security-plan.md`)
- Event architecture specified (PageView, InitiateCheckout, Lead events)
- Deduplication strategy designed (event_id = UUID, matched with CAPI)
- Security rules documented (server-side token, no hardcoded values)

**Environment variable state (current):**
```
NEXT_PUBLIC_META_PIXEL_ID=         (empty — no Dataset created yet)
NEXT_PUBLIC_META_PIXEL_ENABLED=false  (correct default)
```

---

## Conversions API (CAPI) Status

**Status: NOT IMPLEMENTED.**

The architecture is fully designed in `conversions-api-architecture.md`.

**CAPI implementation plan (when prerequisites met):**
- Create `lib/metaCapi.ts` — server-side event sender
- Wire CAPI events into `app/api/leads/[id]/route.ts` at lead ingestion
- Hash PII (phone, email, first_name) with SHA-256 before sending
- Implement deduplication: same `event_id` UUID in browser Pixel + CAPI event
- Test with `META_TEST_EVENT_CODE` against Meta Test Events tool before production

**Prerequisites blocking CAPI implementation:**
1. `META_CAPI_ACCESS_TOKEN` — requires founder to generate from Business Manager
2. `META_CAPI_ENABLED=false` must remain until local testing is complete
3. Cookie consent banner must be live before CAPI Lead events are sent

**Security status:** The security plan is correctly designed. No tokens are hardcoded anywhere. The `.env.local.example` template shows empty values with `false` defaults. This is correct.

---

## Cookie Consent Banner Status

**Status: DOES NOT EXIST — HIGH RISK.**

The cookie consent banner is a legal prerequisite for:
- Activating `NEXT_PUBLIC_META_PIXEL_ENABLED=true`
- Loading any tracking pixel in Swedish/EU users' browsers
- GDPR ePrivacy compliance

**Current state:** The `/cookies` page exists (cookie policy). A separate interactive banner that allows users to accept/decline tracking cookies does NOT exist as a component in the codebase.

**What must be built (after lawyer guidance):**
- A banner component that appears on first visit to any page
- Accept/Decline options — declining must prevent Pixel from loading
- Persistence of choice in a first-party cookie (e.g., `cookie_consent=accepted|declined`)
- Link to `/cookies` page for full policy
- The `META_PIXEL_ENABLED` flag must be checked client-side AND consent cookie must be `accepted` before any Pixel code runs

**Design constraint:** The banner must appear before any `NEXT_PUBLIC_META_PIXEL_ENABLED` flag evaluation for first-time visitors. Pixel code must not load on first page load before consent is obtained.

---

## Organic Content Readiness

### Content Strategy Status

**Status: FULLY SPECIFIED, NOT YET EXECUTED.**

| Document | Status |
|----------|--------|
| `content-angle-library.md` (8 angles, Swedish copy) | COMPLETE |
| `organic-content-production-workflow.md` (weekly cycle) | COMPLETE |
| `driver-personas-and-pain-points.md` | COMPLETE |
| `organic-content-test-plan.md` (Meta integration docs) | COMPLETE (older, superseded by agent spec for operational use) |
| `approval-gates-and-risk-rules.md` | COMPLETE |
| Creative bank folder structure | NOT CREATED |

### Week 1 Content Ready to Publish (Once Page Exists)

The execution-summary.md has a 14-day content calendar. The first posts are:

| Post | Channel | Angle | Status |
|------|---------|-------|--------|
| Trust-building intro post | Facebook Page | Angle 07 (Trust) | Copy exists in angle library |
| Frustration hook | Facebook Page | Angle 01 (Frustration) | Copy exists in angle library |
| FAQ / objections post | Facebook Groups | Angle 08 (Objections) | Copy exists in angle library |

**Zero cost.** These posts require no paid budget. The Facebook Page is the only blocker.

### UTM Tracking Readiness for Organic Posts

UTM parameters are designed and ready. Every organic post link must include:
```
https://drivernord.se/chaufforer?utm_source=facebook&utm_medium=organic&utm_campaign=driver_acquisition&utm_content=angle01_frustration_v1
```

**Critical path:** UTM parameters capture from the `/chat` landing requires migration 013 to be applied to production. Without it, UTM data lands in the chat flow but is silently dropped.

---

## Paid Campaign Readiness

### Prerequisites for First Paid Campaign

| Prerequisite | Status | Blocks |
|-------------|--------|--------|
| Facebook Page exists | NOT DONE | Everything |
| Business Manager configured | NOT DONE | Ad account creation |
| Ad account created | NOT DONE | Campaign creation |
| Domain verified in Events Manager | NOT DONE | Conversion tracking |
| Cookie consent banner live | NOT DONE | Pixel activation |
| Meta Pixel implemented and tested locally | NOT DONE | Conversion data |
| CAPI implemented and tested locally | NOT DONE | Server-side tracking |
| Lawyer confirmed GDPR basis for Pixel | NOT DONE | Cookie consent design |
| ≥1 organic angle with ≥20 link clicks | NOT DONE | Campaign creative choice |
| Migration 013 in production | NOT DONE | UTM attribution |
| 46elks SMS configured | NOT DONE | Follow-up on leads |
| Founder explicit authorization | NOT DONE | Any paid spend |

**Zero of 12 paid campaign prerequisites are complete.**

### Campaign Architecture (Designed, Not Built)

From `meta-ads-preparation-workflow.md`:

- **Campaign objective:** Leads (not Conversions) for first campaign
- **Ad set targeting:** Transport sector workers in Stockholm/Mälardalen
- **Age:** 25–55
- **Interests:** Trucking, truck driving, heavy vehicles, logistics
- **Exclusion:** Staffing/recruitment agencies (so we reach drivers, not recruiters)
- **Budget recommendation:** 100–200 SEK/day to test before scaling
- **Ad format:** Single image or short video (phone-optimized)
- **CTA:** "Anmäl dig gratis" → links to `/chaufforer` with UTM

---

## Organic Content Test Plan (Older Document)

The `organic-content-test-plan.md` (in `meta-acquisition-integration/`) was written before the Creative Agent spec. It contains:
- 6 organic post angles with Swedish drafts
- A 14-day posting schedule
- Performance criteria for organic-to-paid graduation

**Status vs Creative Agent spec:** The Creative Agent `content-angle-library.md` supersedes this document for operational use. The older test plan has historical post drafts for 6 angles; the new angle library has 8 angles with more developed copy variants. The content of the older document should be reviewed for any unique angles not captured in the new library, then archived.

---

## Instagram Status

**Status: NOT CONFIGURED.**

Instagram requires:
1. A Facebook Page (does not exist yet)
2. Instagram Professional Account connected to the Facebook Page
3. Content sized for Instagram (1:1 or 4:5 ratio vs Facebook's wider formats)

The Creative Agent spec includes Instagram as a channel and the `organic-content-production-workflow.md` includes Instagram content format specifications. The execution plan correctly prioritizes Facebook Page first, then Instagram after the Page exists.

---

## LinkedIn Status

**Status: PLANNED, NOT STARTED.**

LinkedIn is listed as a Phase 2 channel in the execution summary. No LinkedIn documentation has been created. For transport sector driver acquisition, LinkedIn has lower priority than Facebook Groups and Facebook Page. The content angle library includes LinkedIn in the channel specification but no LinkedIn-specific content variants.

---

## Social Media Governance

### Approval Gate Status

From `approval-gates-and-risk-rules.md` (Creative Agent spec):

**Hard gates (permanent, cannot be overridden):**
- HG-C1: No autonomous publishing — agent NEVER publishes directly
- HG-C2: No ad campaign actions — agent cannot create or modify ads
- HG-C3: No direct driver contact
- HG-C4: No financial decisions

**Approval queue gates (founder must approve each):**
- AQ-C1 to AQ-C8 covering all content types

**Phase 2 evolution (from agentic OS docs):**
- After approval, the system can schedule and publish via Meta Graph API
- The approval gate itself is PERMANENT and does not change

**Current state:** The approval queue infrastructure (`pending_actions` table, migration 015) does not exist yet. All publishing is fully manual for MVP.

---

## Compliance Status for Social Media

### Marknadsföringslagen (MFL) — Swedish Marketing Law

**Status: DOCUMENTED, NOT AUDITED AGAINST ACTUAL CONTENT.**

The `approval-gates-and-risk-rules.md` correctly identifies MFL requirements:
- No misleading claims about driver or company counts
- No false success rate claims
- Commercial communications must be identifiable as such
- "Free for drivers" claim is accurate and safe to use

The forbidden claims list includes all high-risk phrasings. The content angle library was written with these constraints applied.

### GDPR Implications for Paid Ads

If DriverNord runs retargeting ads (showing ads to users who visited the site), this requires:
- Cookie consent with explicit consent for advertising cookies
- Privacy policy disclosure of Meta Pixel use for retargeting
- GDPR Art. 6(1)(a) legal basis confirmed by lawyer

Prospecting ads (showing ads to new audiences by interest/demographics) have lower GDPR complexity — no cookie data is used, Meta provides the targeting. This is the correct ad type to start with.

---

## What Must Happen Before First Social Post

1. ✗ Facebook Page created (founder, 2–4 hours)
2. ✗ Creative bank folder structure created (Claude Code, 30 min)
3. ✓ Content angle library with Swedish copy (complete)
4. ✓ Approval gates defined (complete)
5. ✓ UTM convention defined (complete)

**Only 1 action needed before organic social begins: founder creates the Facebook Page.**

---

## Recommended Next Actions (Meta/Social)

| Action | Who | When | Effort |
|--------|-----|------|--------|
| Create Facebook Page | Founder | NOW | 2–4 hours |
| Create Business Manager and connect Page | Founder | NOW | 1 hour |
| Create creative bank folder structure | Claude Code | When page exists | 30 min |
| Publish first organic post (Angle 07 Trust) | Founder (from library) | Day 1 after page | 15 min |
| Create Events Manager Dataset, verify domain | Founder | After page | 1 hour + 48h DNS |
| Provide Pixel ID to Claude Code | Founder | After Events Manager | 5 min |
| Commission lawyer for cookie/GDPR confirmation | Founder | Before Pixel activation | External |
| Build cookie consent banner | Claude Code | After lawyer guidance | 2–4 hours |
| Implement Meta Pixel (lib/metaPixel.ts) | Claude Code | After Pixel ID received | 4–6 hours |
| Implement CAPI (lib/metaCapi.ts) | Claude Code | After access token received | 4–6 hours |
| First paid campaign | Founder | After organic test + all gates | Varies |

---

*Version 1.0 — 2026-05-16 — Audit only. No Meta configuration changed. No Pixel added. No ads launched. No production settings modified.*
