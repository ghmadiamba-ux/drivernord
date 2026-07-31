# Web Pages and UX Audit

**Audit date:** 2026-05-16
**Scope:** All public-facing pages, the recruiter cockpit, and user experience quality
**Note:** This is a code/structure audit. No live browser testing was performed.

---

## Public Pages

### `/` (Root)

**Implementation:** Redirects to `/chaufforer` via `next.config.js` redirect.

**Assessment:** GOOD. A static redirect at the config level generates a proper HTTP 301/302 `Location:` header. This is the correct approach — not a client-side redirect via `redirect()` in page.tsx, which would produce a JS-only redirect on static render.

**Issue (LOW):** The root path has no OpenGraph image configured. Direct links to `https://drivernord.se` will not show a social preview image. Only `/chaufforer` and `/company` have `opengraph-image.tsx`. Add a root-level og:image when social sharing of the homepage becomes relevant.

**Issue (LOW):** No favicon is visible in the project. A favicon.ico or favicon.png in `/public` is missing. This affects browser tab appearance and SEO.

---

### `/chaufforer` (Driver Landing Page)

**Purpose:** Primary driver acquisition landing page. Where Meta ads and organic social links point.

**Assessment:** Production-ready for organic traffic. Key elements to verify before paid campaign launch:
- Does the page clearly explain what DriverNord is?
- Is there a prominent CTA to `/chat`?
- Is the page mobile-optimized? (Critical — truck drivers predominantly use phones)
- Does it load in < 3 seconds? (Paid traffic tolerance is low)

**UTM note:** UTM parameters from social links must persist through the click to `/chaufforer` and then to `/chat`. Verify that UTM parameters are captured at the `/chat` page load, not at `/chaufforer`. If a driver lands on `/chaufforer` → clicks → starts `/chat`, the UTM from their original link must appear in `utm_source` etc. on the driver record.

**opengraph-image.tsx present:** YES — social previews are configured.

**Risk (MEDIUM):** Before the first paid campaign, the full user journey (ad click → landing page → chat start → consent → registration) must be tested end-to-end on a real mobile device. Not a simulation — a real phone, a real browser.

---

### `/chat` (Driver Registration Chat)

**Purpose:** Core driver acquisition flow. 14-step bilingual structured intake.

**Steps confirmed:** lang → region → (relocate) → license → ykb → driver_card → domain → availability → shift_preference → phone → email → name → consent → confirmation

**Assessment:** Production-ready (local). GDPR consent step implemented. 660 tests pass including applyStep.test.ts.

**Critical issues before production:**

| Issue | Risk | Action needed |
|-------|------|---------------|
| Consent step text not lawyer-reviewed | HIGH | Lawyer must confirm GDPR Art. 7 compliance |
| SMS confirmation after registration not configured | CRITICAL | `SMS_PROVIDER=46elks` must be set |
| Migration 013 not in production | CRITICAL | Consent and UTM columns missing in production DB |
| Mobile UX not tested on real device | MEDIUM | Test on iOS + Android before any campaign |

**UX concerns:**
- The consent step is step 13 of 14. By the time drivers reach consent, they've already provided their phone number and name. This is correct from a consent perspective (Art. 7 — consent must be prior to processing, and the data is held in local state until consent is confirmed) but may feel late to a driver. The chat design handles this correctly — data is not written to Supabase until after consent — but the UX explanation at the consent step should make this clear.

---

### `/recruiter` (Operator Cockpit)

**Purpose:** Protected cockpit for the founder/recruiter. View drivers, approve/cancel/retry contact actions, see pipeline metrics.

**Access:** Protected by `recruiter_session` HTTP-only cookie. Login at `/recruiter/login`.

**Features documented as working:**
- Driver list (pending actions queue)
- Action approval / cancel / retry
- 15-second polling for real-time updates
- Company need creation
- Shortlist review

**Assessment:** Production-ready. The cockpit is the core of the human governance model.

**Issues:**

| Issue | Risk | Notes |
|-------|------|-------|
| No approval queue UI for agent outputs | MEDIUM | Phase 1 agents will need a `pending_actions` review view — this doesn't exist yet |
| No performance metrics dashboard | MEDIUM | Pipeline metrics exist (`/api/cockpit/metrics`) but dashboard UI extent unknown |
| Single-user model | LOW | RECRUITER_API_KEY = one session at a time — acceptable for solo founder |
| No session timeout other than key rotation | LOW | 7-day session cookie; no idle timeout |

---

### `/company` (B2B Landing Page)

**Purpose:** Company-facing landing page. Explains DriverNord's value proposition to transport companies.

**Assessment:** Production-ready. Has `opengraph-image.tsx`. Complex section structure with many components (HeroSection, ProblemSection, DifferentiationSection, AudienceSection, etc.).

**Issue (MEDIUM):** The company landing page describes DriverNord's packages and value proposition. If the messaging has evolved since the page was built (e.g., pricing has been refined, model has been clarified as introduction-not-staffing), the page copy may be inconsistent with current positioning. The page content should be reviewed against the current monetization strategy documents.

**Issue (LOW):** The company page has a LangSwitcher component, suggesting multi-language support. The driver chat is bilingual (sv/en). Whether the company page is fully bilingual or only partially should be verified.

---

### `/company/ai-agenter` (Technical Architecture Page)

**Purpose:** Technical detail page for companies interested in the AI infrastructure.

**Assessment:** Exists. Probably describes the agent architecture. This page may be outdated relative to the new agentic OS documentation produced in May 2026. If it describes specific agents or capabilities that have since been redesigned, it should be updated before this page receives real company traffic.

**Risk (MEDIUM):** If this page makes specific capability claims (e.g., "we use 5 agents" or describes specific agent behaviors), these claims must align with the current agentic OS architecture. The new architecture has 7–8 agents planned, some with different boundaries than the original design.

---

### `/about` (About Page)

**Purpose:** Founder/team information page.

**Assessment:** Minimal audit possible without seeing content. Key risk: if it references a team size, office location, or founding story that may have evolved, it needs review. Also: if it shows the founder's image and personal story, this is trust-building content that should be authentic and current.

---

### `/privacy` (Privacy Policy)

**Purpose:** GDPR Art. 13 notice to data subjects.

**Assessment:** The legal audit (`legal-readiness-summary.md`) describes the privacy policy as "preliminary" and "not lawyer-reviewed." The policy is on the live website but explicitly contains a legal disclaimer.

**Risk (HIGH):** A preliminary privacy policy that has not been reviewed by a Swedish GDPR lawyer is a compliance gap. Before any paid campaign drives significant traffic to `/chat`, the privacy policy must be finalized and the Art. 6 legal basis must be stated clearly.

**Issue:** The privacy policy may reference `drivernord.com` as the contact email domain instead of `drivernord.se`. Verify and correct.

---

### `/terms` (Terms of Service)

**Purpose:** Terms for using the DriverNord service.

**Assessment:** Similar status to privacy policy — likely preliminary and unreviewed. Cannot share driver profiles with companies without a DPA in place; terms of service must reflect the actual operating model.

---

### `/cookies` (Cookie Policy)

**Purpose:** Cookie consent/policy page.

**Assessment:** Important pre-condition for Meta Pixel activation. The Meta integration documentation specifies that the cookie consent banner must be live before `META_PIXEL_ENABLED=true` is authorized. Verify this page:
1. Accurately describes what cookies are used
2. Is the page that the cookie consent banner links to
3. Does not claim cookies are used that aren't (no analytics cookies if no analytics is configured)

---

### `/contact` (Contact Page)

**Assessment:** Likely references `hej@drivernord.com` or `hej@drivernord.se`. Must use `hej@drivernord.se` (canonical domain).

---

### `/recruiter/login` (Login Page)

**Assessment:** Simple login form. Accepts RECRUITER_API_KEY as password. Production-ready.

---

## Missing Pages

| Page | Priority | Notes |
|------|----------|-------|
| `/sitemap.xml` | LOW | SEO benefit; Next.js can auto-generate |
| `/robots.txt` | MEDIUM | Should block `/recruiter` from crawlers |
| `/api/health` | MEDIUM | Monitoring endpoint |
| 404 page (`not-found.tsx`) | LOW | Custom 404 improves UX |
| Cookie consent banner (component) | HIGH | Required before Meta Pixel activation |

**Critical gap (HIGH):** There is no cookie consent banner component visible in the project. Before Meta Pixel is activated, a GDPR-compliant cookie consent mechanism must be implemented. This is not just a nice-to-have — it is a legal requirement for consent-based cookie tracking in Sweden.

---

## UX Risk Summary

| Issue | Risk | Blocking |
|-------|------|---------|
| No GDPR consent banner component | HIGH | Meta Pixel activation |
| Privacy policy not lawyer-reviewed | HIGH | Scale + profile sharing |
| `/chat` consent text not confirmed | HIGH | Production SMS campaign |
| No favicon | LOW | Not blocking |
| Mobile UX untested on real device | MEDIUM | Paid campaign launch |
| Company page copy may be stale | MEDIUM | Company outreach |
| `/company/ai-agenter` may be outdated | MEDIUM | Company meetings |
| Cookie policy accuracy | MEDIUM | Meta Pixel |
| `drivernord.com` email still on some pages | MEDIUM | Brand consistency |

---

*Version 1.0 — 2026-05-16 — Audit only. No UX changes.*
