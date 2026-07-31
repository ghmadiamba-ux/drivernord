# DriverNord — Website State

*Last updated: 2026-05-10 (metadataBase gap resolved)*

---

## Page Inventory

### Public-facing pages

| Page | Route | Type | Purpose | Status |
|------|-------|------|---------|--------|
| Root redirect | `/` | Static | HTTP 307 → /chaufforer | Good — via next.config.js |
| Driver landing | `/chaufforer` | Server Component | Driver acquisition landing | Complete |
| Driver chat | `/chat` | Client Component | Driver registration flow | Production-ready |
| Company landing | `/company` | Server Component | B2B pitch | Complete |
| Technical architecture | `/company/ai-agenter` | Server Component | AI system explanation for buyers | Complete |
| About | `/about` | Server Component | Mission and team | Present |
| Privacy | `/privacy` | Server Component | GDPR privacy policy | Preliminary draft |
| Terms | `/terms` | Server Component | Terms of service | Preliminary draft |
| Cookies | `/cookies` | Server Component | Cookie policy | Preliminary draft |
| Contact | `/contact` | Server Component | Contact cards by audience | Complete |

### Protected pages

| Page | Route | Auth | Status |
|------|-------|------|--------|
| Cockpit | `/recruiter` | HTTP-only cookie | Production-ready |
| Login | `/recruiter/login` | Public (sets cookie) | Production-ready |

---

## Driver Landing Page (/chaufforer)

**Purpose:** Pre-chat landing page for drivers. Required for Meta ad campaign compliance (ads cannot link directly to a form).

**Sections:**
1. Hero — "Chaufförsjobb utan CV-krångel" (bg-blue-900, dark blue)
2. Trust strip — ~2 min / Inget CV / YKB & körkort / Tydligt nästa steg
3. How it works — 3 steps with numbered circles
4. Built for drivers — 6 field cards (körkort, YKB, förarkort, tillgänglighet, region, körning)
5. Comparison — traditional job boards vs DriverNord (cross/check icon grid)
6. Final CTA — "Registrera dig på circa 2 minuter"

**CTA target:** All CTAs point to `/chat`.

**OG image:** `/chaufforer/opengraph-image` (edge route) — dark blue background with headline. Correct base URL depends on `metadataBase` being set (currently falls back to localhost).

**Mobile quality:** Full-width on mobile, `max-w-3xl` / `max-w-5xl` on desktop. Tap targets appropriate.

---

## Driver Chat (/chat)

**Purpose:** Primary driver acquisition surface. Collects all required profile information.

**Step sequence:** lang → region → (relocate) → license → ykb → driver_card → domain → availability → shift_preference → phone → email → name → confirmation

**Key UX features:**
- Progress bar showing completion percentage
- Tap-to-select options for 7 of 13 steps (no keyboard needed)
- Skip option for email (optional field)
- Bilingual: sv/en detected by step 1
- Confirmation screen shows priority badge (HIGH/MEDIUM/LOW) with color-coded explanation
- GDPR note on confirmation screen

**Known gaps:**
- No DriverNord logo or brand mark visible on the chat page itself (title is "Driver Registration" not "DriverNord")
- No Open Graph metadata — if someone shares the /chat URL, no preview image or description is shown
- `metadataBase` not set in root layout — OG tags present in metadata would use localhost base

---

## Company Landing Page (/company)

**Purpose:** B2B acquisition — pitch transport companies on using DriverNord to find drivers.

**Positioning:** Infrastructure provider, not staffing agency. "Autonoma agenter kvalificerar och matchar förare. Ni beslutar."

**Sections:**
1. Hero — dark blue, B2B headline + qualification framing
2. Trust strip — stats/attributes for transport specificity
3. How it works — 3-step process (driver intake → classification → matching)
4. Driver categories — license types (C, CE, D + YKB)
5. Why DriverNord — problem statement, differentiation
6. Operational process — agent pipeline description
7. Mid CTA
8. FAQ — common buyer questions
9. Final CTA

**OG image:** `/company/opengraph-image` (edge route)

**Email:** All company CTAs point to `hej@drivernord.se`. Inbox status must be verified operationally.

---

## Company AI Agenter (/company/ai-agenter)

**Purpose:** Technical architecture explainer for diligent buyers. Describes the 5-agent system.

**Key content:**
- 5 agent descriptions (ingestion, qualification, matching, contact, follow-up)
- Safety rules and guard conditions (accurately reflects code: score≥60, 14d/3d dedup, YKB guard, availability guard)
- Supervision model (observe → validate → override → audit)
- "Kontakt är för närvarande simulerad" banner — honest about simulation status

**Accuracy:** High — accurately describes the current code behavior.

**Navigation:** Accessible via the company landing page footer. Not in main nav — reaching this page requires knowing the URL or clicking footer link.

---

## Legal Pages

All three primary legal pages are marked with a yellow "Preliminär version" banner indicating they are not legally reviewed.

### /privacy
- 9 sections covering: data controller, data collected, purpose, legal basis, SMS note, storage, rights, third parties, cookies, changes
- Accurately states: no active SMS system, manual coordinator contact, drivers@drivernord.se for GDPR requests
- Mentions `recruiter_session` cookie specifically
- Needs legal review before removing "Preliminär version" banner

### /terms
- 9 sections: service description, registration, data accuracy, no job guarantee, company access, liability, changes, Swedish law, contact
- Correctly disclaims: "DriverNord garanterar inte anställning"
- Needs legal review

### /cookies
- Lists only one cookie: `recruiter_session` (HTTP-only, 7 days, Necessary)
- Explicitly states no analytics, marketing, or tracking cookies
- Accurate to current implementation
- Needs legal review

### /about
- Mission and team content
- Appropriate for early-stage company

### /contact
- 3 cards: drivers (registration/matching), transport companies (partnership), GDPR
- All point to `hej@drivernord.se`
- Explicitly states 1-2 business day response time

---

## Shared Components

### PublicHeader
**File:** `components/PublicHeader.tsx`
**Type:** `'use client'` (needed for mobile hamburger toggle state)
**Used on:** All public pages (/chaufforer, /company, /company/ai-agenter, /about, /privacy, /terms, /cookies, /contact, /recruiter/login)
**Not used on:** /chat (driver registration flow — intentionally minimal)

**Desktop nav links:**
- "För chaufförer" → /chaufforer
- "För företag" → /company
- "Om oss" → /about
- "Kontakt" → /contact
- "Registrera dig" CTA → /chat

**Mobile:** Hamburger toggle. All same links in dropdown.

### LegalFooter
**File:** `components/LegalFooter.tsx`
**Type:** Server Component
**Used on:** All public pages + recruiter login

**Content:** 4-column grid
- Brand: DriverNord + tagline + email
- Chaufförer: /chaufforer, /chat
- Företag: /company, /company/ai-agenter, /contact
- Information: /about, /privacy, /terms, /cookies
- Bottom bar: © 2025 | email

---

## Known Website Gaps

| Gap | Impact | Status |
|-----|--------|--------|
| ~~`metadataBase` not in root layout~~ | ~~OG images use localhost URL for all pages~~ | **RESOLVED** — `metadataBase: new URL('https://drivernord.se')` confirmed in `app/layout.tsx` |
| No brand/logo on /chat | Trust gap during driver registration | Open |
| Legal pages not reviewed | Cannot represent as final policy | Open — legal review needed |
| `hej@drivernord.se` inbox status unknown | Company and GDPR inquiries may be lost | Open — verify operationally |
| /company/ai-agenter not in main nav | Hard to discover | Open |
| No company self-service intake form | Companies cannot register needs without recruiter mediation | Open — Phase 2 |
