# Meta Ads Preparation Workflow

**Date:** 2026-05-16
**Status:** Specification only. No ads launched. No campaigns created. No budget spent.
**Purpose:** Define how DriverNord prepares for paid Meta advertising without launching anything prematurely. Every step here is preparation — not activation.

---

## Critical Rule

**No paid campaign is launched until:**

1. At least one organic angle has achieved ≥20 link clicks in a single post
2. The Facebook Page has been created and verified
3. `drivernord.se` is verified in Meta Events Manager
4. Cookie consent banner is live on `drivernord.se`
5. The founder has explicitly authorized the first campaign
6. At least 3 drivers are in the Supabase database (to confirm the pipeline works end-to-end)

Until all six prerequisites are met, this workflow produces **preparation materials only** — no Meta account actions are taken.

---

## What This Workflow Produces

| Output | What it is | Who acts on it |
|--------|-----------|---------------|
| Ad copy variants | 3–5 headline + body + CTA combinations | Founder uploads to Ads Manager manually |
| Campaign structure document | Recommended objective, ad set structure, audience targeting | Founder reviews and configures in Ads Manager |
| Budget recommendation | Suggested starting daily budget and test duration | Founder authorizes and sets in Ads Manager |
| Visual brief for ad | Canva production brief for the ad image/video | Founder produces in Canva/CapCut |
| Landing page notes | Any recommended changes to `drivernord.se/chat` before paid traffic hits | Claude Code implements after founder approval |

**The agent never touches Meta Ads Manager.** The Creative Agent has no access to Meta's advertising API and no knowledge of campaign account credentials.

---

## Phase 1 — Identify Winning Organic Angles (Before Any Paid Spend)

### The logic

Paid advertising amplifies what already works. Spending money to discover what works is expensive. Running organic content first, measuring it, and then paying to amplify the proven winners is the correct order.

**Do not create ads from untested angles.** Only promote to paid after an angle has:
- Been published at least 3 times in different post variants
- Achieved link click rate ≥ 2% of reach (e.g., 20 clicks from 1,000 reach)
- Produced at least 1 attributable chat start via UTM

### Organic-to-paid graduation criteria

| Organic metric | Threshold for paid readiness |
|----------------|------------------------------|
| Link click rate | ≥ 2% of post reach |
| Chat starts (UTM-attributed) | ≥ 1 per angle over 2 weeks |
| Engagement rate | ≥ 3% of reach |
| Performance score | ≥ 7/10 per angle scoring system |
| Angle tested for | ≥ 2 weeks (minimum) |

The Creative Agent flags angles that meet all criteria as "READY FOR PAID PROMOTION" in the performance log.

---

## Phase 2 — Campaign Structure Design (Preparation Only)

Once an organic angle graduates to paid-ready, the Creative Agent produces a campaign structure document. This is a recommendation document — not a configuration file.

### Recommended campaign structure for Phase 1 paid test

**Objective:** Traffic (optimize for link clicks initially; switch to Lead generation after 50+ conversions for algorithm optimization)

**Campaign:**
- DriverNord Driver Acquisition — CE Stockholm — [Month Year]

**Ad Set 1 — Broad CE/Transport Interest:**
- Location: Stockholm, Uppsala, Västerås, Örebro, Eskilstuna (Mälardalen radius)
- Age: 25–55
- Gender: All
- Interests: Trucking, long-haul driving, transport industry, forklift (broad transport signal)
- Language: Swedish
- Placement: Facebook Feed only (Phase 1 — avoid Stories and Instagram until creative is optimized for those formats)

**Ad Set 2 — Lookalike (when pixel data exists):**
- Source: Pixel event `DriverChatStarted` (requires ≥100 events before lookalike works)
- Similarity: 1–3% lookalike of Swedish users
- **Note:** This ad set cannot be created until the Pixel is live and has collected data. Prepare the structure; do not activate.

**Ad:**
- 3 ad variants per ad set (test 3 different copy versions from the winning organic angle)
- Budget: Start at 50 SEK/day per ad set for 7-day test
- No budget changes for first 7 days (let Meta optimize)
- Evaluate after 7 days: cost per link click, cost per chat start

### What the agent produces

A Markdown document titled `campaign-structure--[angle-id]--[date].md` containing:
- Campaign objective and rationale
- Ad set structure with targeting parameters
- 3 ad copy variants (headline + body + CTA, each variant ≤ Meta character limits)
- Budget and test duration recommendation
- Success criteria: "Stop testing if cost per link click exceeds X SEK; scale if below Y SEK"
- Visual brief for the ad image

---

## Ad Copy Format and Constraints

### Meta ad copy character limits

| Element | Character limit |
|---------|----------------|
| Headline | 27 characters |
| Primary text (body) | 125 characters (before "Read more" cut) — aim to say the core message in 125 chars |
| Description | 27 characters |

**This is very different from organic posts.** Ad copy is brutally short. The agent must write for these constraints explicitly.

### Ad copy examples (CE frustration angle)

**Variant A:**
- Headline: `CE-förare i Stockholm?`
- Primary text: `Registrera dig en gång. Bli matchad med transportföretag som söker dig. Din profil delas aldrig utan din tillåtelse.`
- Description: `Gratis för förare.`

**Variant B:**
- Headline: `Sluta söka. Bli hittad.`
- Primary text: `CE med YKB? Registrera dig på DriverNord. Vi matchar dig med rätt transportföretag i Stockholm och Mälardalen.`
- Description: `Tar 3 minuter.`

**Variant C:**
- Headline: `Inte ett bemanningsbolag.`
- Primary text: `DriverNord matchar CE-förare direkt med transportföretag. Du godkänner alltid innan vi delar din profil.`
- Description: `Registrering: 3 min.`

### Compliance rules specific to ads

All rules from `approval-gates-and-risk-rules.md` apply. Additional ad-specific rules:

- **Never use** "Nu anställer" or any equivalent of "now hiring" unless DriverNord is actually the employer (it is not)
- **Never use** employment-related special audience categories if targeting — Meta restricts employment targeting
- **Never use** income, financial status, or family status targeting
- **Avoid** the word "gratis" in the headline (Meta sometimes flags misleading free claims)
- **Include** "Gratis för förare" or equivalent only if factually accurate (it is)
- **Do not imply** a specific salary range or pay guarantee

---

## Phase 3 — Landing Page Readiness

Before paid traffic hits `drivernord.se/chat`, the landing page must be optimized for conversion. The Creative Agent produces a landing page audit and recommendations document.

### What to check before paid campaigns

| Item | Check | Status |
|------|-------|--------|
| Chat flow starts within 3 seconds of page load | Performance check | Claude Code verifies |
| Mobile experience is smooth | Manual test on iOS and Android | Founder tests |
| The first chat message clearly explains what DriverNord is | Copy check | Agent reviews |
| Consent step is clear and not alarming | UX check | Founder reviews |
| Confirmation message after registration is clear | Copy check | Agent reviews |
| UTM parameters persist through the chat flow | Technical check | Claude Code verifies |

---

## Budget Authorization Protocol

The founder must explicitly authorize each budget decision. No budget change (new campaign, budget increase, budget pause) can happen without the founder opening Meta Ads Manager and taking the action manually.

**The Creative Agent's role in budget decisions:** Recommend, not execute.

Format of budget recommendation (written by agent):

```markdown
## Budget Recommendation — [angle] — [date]

Current status: [days running] / [spend to date] SEK / [results so far]

Recommendation: [Scale / Pause / Continue]

Rationale: [Cost per link click: X SEK vs. target Y SEK. Chat starts: N.]

If scaling: Suggested new daily budget: X SEK. Expected weekly spend: Y SEK.
If pausing: Reason. Suggested next test angle.

Founder action required: [exact step in Meta Ads Manager]
```

---

## Facebook Groups — Organic Only, No Paid Targeting

Facebook Groups can be used for organic outreach only. Meta does not allow paid ads targeting members of specific groups directly (group targeting was removed). The strategy for groups is:
- Founder joins relevant Swedish truck driver groups
- Posts valuable content (angle 07 or 08 format — informational, not promotional)
- Mentions DriverNord naturally at the end
- Never uses paid boosting on group posts

**Relevant groups to identify (founder action):**
- Swedish CE/truck driver groups on Facebook (search: "lastbilsförare", "CE-förare", "Truck Sverige")
- Stockholm/Mälardalen regional transport groups
- Professional driver forums
- Confirm group rules allow business posts before joining

---

## What Is NOT in This Workflow

- Pixel installation (see `meta-env-and-security-plan.md`)
- Pixel event configuration (see `pixel-event-architecture.md`)
- CAPI server-side tracking (see `conversions-api-architecture.md`)
- Instagram influencer outreach
- WhatsApp business integration
- TikTok advertising (not relevant at current phase)

---

*Version 1.0 — 2026-05-16 — Preparation specification only. No campaigns created. No ads launched. No budget spent.*
