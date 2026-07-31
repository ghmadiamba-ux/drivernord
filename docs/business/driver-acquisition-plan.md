# DriverNord — 30-Day AI-Driven Driver Acquisition Plan

**Date:** 2026-05-14
**Purpose:** Acquire the first 20–50 qualified CE/C/D professional drivers in Stockholm/Mälardalen, registered in the DriverNord system, verified against minimum criteria, and available to be introduced to client companies.
**Governing rule:** This plan is documentation and planning only. No outreach is executed by Claude Code. No deployment. No production Supabase. No direct driver contact. All AI-prepared materials require human review before execution. Swedish legal references are documented but not legal advice.

---

## 1. Executive Summary

DriverNord cannot generate revenue until it has a supply-side asset. That asset is a database of qualified, available, consented CE/C/D drivers in Stockholm/Mälardalen. Today the database is empty.

This plan resolves the bootstrap problem within 30 days using a paid Meta Ads campaign as the primary acquisition channel, supported by Platsbanken (free), Facebook driver groups (free), and a lightweight referral mechanism. The goal is:

- **Gate 1 — Package 4 unlock:** ≥5 available, qualified drivers → enables "Akut Förarsökning" (8,000–10,000 SEK per introduction, 48-hour delivery)
- **Gate 2 — Package 2 unlock:** ≥15 available, qualified drivers → enables "Verifierad Förarlista" (15,000 SEK, 3–5 drivers, 3–5 day delivery)
- **Stretch target:** ≥30 qualified drivers → creates database depth sufficient for 2+ simultaneous Package 2 deliveries without overlap

The plan assumes a budget of 5,000–10,000 SEK for Meta Ads (conservative) and zero budget for other channels (Platsbanken, Facebook groups, referrals are free). Total calendar time: 30 days. Realistic outcome: 20–40 registered drivers, 10–25 meeting minimum qualification criteria, 5–15 confirmed available.

**Prerequisite:** The registration chat (`/chat` route) must be deployed to production before this plan can execute. No other technical build is required.

---

## 2. Driver Acquisition Target

### Minimum Viable Supply (Phase 1)

| Target | Number | What it unlocks |
|--------|--------|----------------|
| Registered (completed intake) | 30–50 | Pipeline buffer; some will be unavailable or unqualified |
| Qualified (CE + YKB + available) | 15–25 | Package 2 deliverable |
| Confirmed available (contacted, responded) | 10–15 | Shortlist-ready; can be introduced within 48–72 hours |
| Package 4 threshold (urgent intro) | 5 | First commercial product available |
| Package 2 threshold (shortlist) | 15 | Core product available |

### Target Driver Profile

- **License:** CE (primary), C and D accepted
- **YKB:** Valid and current (CE drivers: YKB 1 or YKB 2; D drivers: YKB 4 passenger)
- **Region:** Stockholm lan (Södertälje, Järfälla, Täby, Haninge, Nacka, Huddinge, city)
- **Availability:** Available now or within 4 weeks (LeadStatus: `available` or `available_soon`)
- **Language:** Swedish (primary); non-Swedish speakers are lower priority in V1 due to client communication requirements
- **Priority:** CE + YKB valid + Stockholm + available = highest scoring leads (LeadPriority: `high`)

### Volume-to-Quality Ratio (Assumptions)

Based on industry patterns for professional driver self-registration flows:

| Stage | Volume | Conversion % |
|-------|--------|-------------|
| Ad impressions → click | 5,000–15,000 impressions | 1–3% CTR |
| Click → registration start | 100–300 sessions | 40–60% start chat |
| Registration start → completion | 40–180 completions | 50–70% complete |
| Completed → CE license | 20–90 CE drivers | 50% have CE (of all completions) |
| CE → YKB valid | 12–60 | 60–70% of CE drivers have valid YKB |
| YKB valid → Stockholm region | 8–40 | 65–75% based on Meta targeting |
| Stockholm → confirmed available | 5–25 | 60–80% of reaching out confirm availability |

*All conversion figures are INFERRED from Meta Ads industry benchmarks for specialty labor audience campaigns. Actual results may vary. Label all projections in reporting.*

---

## 3. Driver Persona Analysis

### Persona 1 — "Erik, 38, Erfaren CE-chaufför" (Primary Target)

**Profile:**
- 38–52 years old, Swedish
- CE license for 8–15 years; YKB valid (renewed recently)
- Currently employed but passively open to better pay or easier routes
- Works at a mid-size åkeri (20–100 trucks); wants more flexibility or better salary
- Not actively job-searching; will respond if the offer is positioned as "interesting opportunity, no commitment"

**Motivation to register with DriverNord:**
- Curious about what's out there without the hassle of applying
- Wants to explore options without their current employer knowing
- Values being contacted by companies that need them — reversal of the traditional application flow

**Barrier:**
- Trust: "What is this company? Will my employer find out?"
- Time: "I have 2 minutes between deliveries — does this registration take long?"
- Skepticism: "Another recruitment service that won't follow up"

**How to reach:** Meta (Facebook) — demographic 35–55, truck/logistics interest targeting; active in Facebook groups for chaufförer

**Messaging angle:** "Du behöver inte söka jobb — vi hittar jobbet åt dig." (You don't need to apply — we find the job for you.)

---

### Persona 2 — "Karim, 29, Ny CE-licensinnehavare" (Secondary Target)

**Profile:**
- 24–35 years old, bilingual (Swedish + other language)
- Got CE license in last 1–3 years; YKB valid (new)
- May be looking for first CE job or stepping up from C-license work
- Lower experienced; higher urgency to find work
- More digitally active; will engage with Instagram/Facebook ads

**Motivation to register:**
- Actively looking for CE work
- Feels invisible to employers because no established track record
- DriverNord offers visibility to companies without needing "connections"

**Barrier:**
- May not have 2+ years CE experience some companies require
- May score lower on the matching algorithm (lower priority for Package 4)
- Registration is a trust signal they'll take if framing is clear

**How to reach:** Meta (Instagram + Facebook) — demographic 25–35, CE/transport interest; Arbetsförmedlingen adjacent communities

**Messaging angle:** "Vi kopplar samman CE-chaufförer med företag som faktiskt söker — oavsett om du har 2 eller 20 år."

---

### Persona 3 — "Mikael, 47, Frilanschaufför/Egenföretagare" (Opportunistic)

**Profile:**
- 40–58 years old; may have own AB or sole trader setup
- Does contract work, temp placements; used to finding gigs through personal networks
- Will register if the process is fast and the proposition is clearly non-committal
- Less loyal to any single employer; highest availability flexibility

**Motivation to register:**
- Wants more clients without doing the sales himself
- Sees DriverNord as an introduction service that brings opportunities to him — aligned with how he already works

**Barrier:**
- May see DriverNord as competition to his own client relationships
- If registered as egenföretagare, the staffing/employment distinction matters to him

**How to reach:** Facebook groups for egenföretagare chaufförer; word-of-mouth from Persona 1

**Messaging angle:** "Fler uppdrag utan att du behöver leta efter dem."

---

### Persona 4 — "Fatima, 44, Bussförare med CE" (Adjacent — D-license)

**Profile:**
- D-license + YKB valid; may also hold CE
- Works for municipal transit, school transport, or coach company
- Looking for higher-paying CE work or more consistent hours
- May not self-identify as a "truck driver" — framing matters

**Motivation to register:**
- Better pay in CE transport vs. bus (especially school/municipal)
- More predictable schedule in some CE roles

**How to reach:** Meta targeting by D/bus industry; Facebook groups for bussförare/chaufförer

**Messaging angle:** "Har du CE? Vi hjälper dig hitta bättre uppdrag." (Do you have CE? We help you find better assignments.)

---

## 4. Channel Strategy

| Channel | Cost | Effort | Speed | Scalability | Volume potential | Priority |
|---------|------|--------|-------|------------|-----------------|---------|
| Meta Ads (Facebook/Instagram) | 5,000–15,000 SEK | Medium | Fast (live in 48h) | High | 30–150 registrations/month | **1 — Primary** |
| Platsbanken (Arbetsförmedlingen) | Free | Low | Medium (3–5 days) | Low | 5–20 registrations/month | **2 — Secondary** |
| Facebook groups | Free | Medium | Slow (manual posts) | Low | 5–15 registrations/month | **3 — Secondary** |
| LinkedIn (driver targeting) | Free or low | Medium | Slow | Low | 3–8 registrations/month | **4 — Supplemental** |
| Referral (driver-to-driver) | Low (incentive cost) | Low (once set up) | Slow | Medium | 5–10/month after seeding | **5 — Phase 2** |
| Arbetsförmedlingen direct posting | Free | Low | Medium | Low | 2–10 registrations/month | **2b — Secondary** |

**Total expected 30-day intake (conservative scenario):** 20–40 registrations
**Total expected 30-day intake (optimistic scenario):** 50–100 registrations

---

## 5. Meta Ads Campaign Plan

### Campaign Structure

| Level | Name | Setting |
|-------|------|---------|
| Campaign | DriverNord — Chaufför Förvärv Q2-2026 | Objective: Lead Generation |
| Ad Set 1 | CE-chaufförer Stockholm | Demographics + Interest targeting |
| Ad Set 2 | Alla CE/C/D chaufförer Sverige | Broad retargeting / lookalike |
| Ad Set 3 | Lookalike Retargeting | Based on landing page visitors (after 500 sessions) |

**Budget allocation (5,000 SEK/month example):**
- Ad Set 1: 3,000 SEK (60%) — highest priority, tightest targeting
- Ad Set 2: 1,500 SEK (30%) — broader reach for volume
- Ad Set 3: 500 SEK (10%) — retargeting (starts Week 2–3)

**Targeting parameters — Ad Set 1:**
- Location: Stockholm, Södertälje, Järfälla, Huddinge, Nacka, Haninge, Täby, Sollentuna (+20 km radius)
- Age: 28–58
- Language: Swedish
- Interests: Truck driving, Transport logistics, Lastbil, Chaufför, YKB, Körkort CE
- Job title (if available in Meta): Truck driver, Last bil förare, CE-chaufför, Transport
- Exclude: Management / HR (prevent employer detection risk)
- Device: Mobile primary (drivers use phones, not desktops)

**Targeting parameters — Ad Set 2:**
- Location: Sweden (national) — valuable for mobile drivers willing to relocate to Stockholm
- Age: 25–60
- Interest: CE license, Professional driving, Transport

**Pixel / tracking:**
- Meta Pixel on `/chat` route (page view = "reached registration")
- Conversion event: driver completes step 13 (confirmation) = "lead registered"
- This allows ROAS tracking and lookalike audience creation

---

### Ad Copy Variant 1 — Urgency / Passive Jobseeker

**Headline:** Söker du inte jobb — men är öppen om rätt möjlighet dök upp?

**Body copy:**
Många CE-chaufförer vill inte söka jobb aktivt. Men om ett bra erbjudande kom till dig — varför inte?

DriverNord matchar CE-chaufförer med transportföretag i Stockholm som söker just nu. Du registrerar dig en gång. Vi kontaktar dig om rätt uppdrag dyker upp — ingenting annat.

Tar 3 minuter. Ingen anmälan till din nuvarande arbetsgivare.

**CTA:** Registrera dig gratis →

**Format:** Single image or short carousel. Image: open road, cab interior, or clean branded visual.

---

### Ad Copy Variant 2 — Direct Value / Job Seeker

**Headline:** CE-licens? Stockholmsföretag söker dig nu.

**Body copy:**
Transportföretag i Stockholmsregionen har öppna positioner för CE-chaufförer — och de betalar bra.

Vi kopplar samman dig med rätt arbetsgivare. Du registrerar dina uppgifter en gång. Vi sköter resten.

✓ CE + YKB? Prioriterad matchning.
✓ Ingen kostnad för dig.
✓ Du väljer om du vill bli introducerad.

**CTA:** Se om du matchar →

**Format:** Static image with clear, bold text overlay.

---

### Ad Copy Variant 3 — Pain Point / Frustration Angle

**Headline:** Trött på att söka jobb via Blocket och aldrig höra något?

**Body copy:**
De flesta jobbplatser för lastbilschaufförer ger dig massor av annonser — och inga svar.

DriverNord fungerar annorlunda. Vi samlar in din profil, matchar dig mot företag som faktiskt söker CE-chaufförer, och introducerar dig direkt till rätt kontakt.

Du registrerar dig en gång. Vi tar hand om resten.

**CTA:** Testa DriverNord →

**Format:** Video 15–30 sec, or story format.

---

### Ad Copy Variant 4 — Specificity / Trust

**Headline:** CE-chaufförer i Stockholm: Registrera din profil. Bli matchad.

**Body copy:**
DriverNord bygger Sveriges mest kvalificerade pool av CE-chaufförer.

Vi verifierar din tillgänglighet. Vi matchar din profil mot öppna behov. Vi introducerar dig till arbetsgivaren — med ditt godkännande.

Du väljer. Vi levererar.

Registrering tar 3 minuter. Gratis för chaufförer.

**CTA:** Registrera dig →

**Format:** Clean branded static. Works for feed and stories.

---

### Ad Copy Variant 5 — Social Proof / Community Angle

**Headline:** Hundratals CE-chaufförer i Stockholm börjar sin nästa karriärsteg via DriverNord.

*(Note: This copy should ONLY be used once real driver registrations exist. Do not use this before first 30–50 registrations. Label as "Phase 2 copy" until social proof exists.)*

**Body copy:**
Transportföretag betalar för att träffa dig — inte tvärtom.

DriverNord är en ny typ av tjänst: vi introducerar qualificerade CE-chaufförer till company som aktivt söker. Inga ansökningar. Ingen väntan. Din profil arbetar åt dig.

Registrera dig idag.

**CTA:** Skapa din chaufförsprofil →

---

### 5 Ad Hooks (Opening Lines for Video/Story Format)

1. **"Du behöver inte söka jobb — men vad händer om rätt jobb söker dig?"**
   *(Passive jobseeker angle — curiosity hook)*

2. **"Visste du att det finns 5 000 obesatta CE-tjänster i Sverige just nu?"**
   *(Statistic hook — validate the market need)*

3. **"Jag tog CE-kortet för 15 år sedan. Vet du vad det är värt idag?"**
   *(Identity hook — validate their asset)*

4. **"Stockholms åkerier söker CE-chaufförer. Problemet: de hittar inte rätt folk."**
   *(Employer pain angle — positions driver as solution)*

5. **"Om du har CE + YKB, har vi ett erbjudande som tar 3 minuter av din tid."**
   *(Direct offer hook — low commitment, specific audience)*

---

### 3 Static Ad Concepts

**Static 1 — "The Cab" Concept**
- Visual: Driver's perspective from inside a cab; open road ahead; Stockholm skyline faint in background
- Overlay text: "CE-licens? Vi kopplar dig med rätt arbetsgivare."
- DriverNord logo bottom-right; URL bottom-left
- Color scheme: Dark blue + white (trust, professionalism)
- Size: 1080×1080 (feed) + 1080×1920 (story)

**Static 2 — "The Match" Concept**
- Visual: Split screen — driver profile card on left, company logo on right, arrow connecting them
- Overlay text: "Registrera dig. Vi sköter matchningen."
- Clean, minimal, tech-forward feel
- Sub-text: "Gratis för chaufförer. Ingen anmälan till din arbetsgivare."

**Static 3 — "The Stat" Concept**
- Visual: Bold typography on dark background
- Main text: "5 000 CE-tjänster obesatta varje år i Sverige."
- Sub-text: "Din licens är värdefulare än du tror."
- CTA: "Registrera din profil på DriverNord.se →"

---

### 3 Video Ad Concepts (15–30 seconds)

**Video 1 — "The Pitch" (Direct Response)**
- Script: [Open — driver at wheel, looking at phone] "Är du CE-chaufför och öppen för nya möjligheter?" [Cut — clean text animation] "DriverNord matchar CE-chaufförer med Stockholmsföretag." [Cut — registration screen] "Registrering tar 3 minuter. Du väljer om du vill presenteras." [CTA screen] "Gå till DriverNord.se"
- Length: 20 sec
- VO: Professional male or female voice
- Music: Neutral, non-distracting

**Video 2 — "The Problem" (Pain Point)**
- Script: [Open — person scrolling Blocket/job listings] "Samma annons. Ingen återkoppling. Igen." [Cut — frustrated look] "Varför ska chaufförer alltid söka jobb — när arbetsgivarna behöver dem?" [Cut — brand intro] "DriverNord vänder på det. Registrera dig. Företagen kommer till dig." [CTA]
- Length: 25 sec

**Video 3 — "The Story" (Testimonial format — Phase 2)**
- Script: [Real driver or actor] "Jag registrerade mig på DriverNord. En vecka senare fick jag ett erbjudande från ett transportföretag i Järfälla. Nu jobbar jag där." [Cut — brand logo] "Registrera din profil idag."
- Note: This concept is only usable once real testimonials exist. Use in Phase 2 after first 5+ drivers complete the introduction cycle.
- Length: 30 sec

---

### 3 UGC (User-Generated Content) Concepts

UGC performs significantly better than brand-produced video for trust and authenticity. These concepts are frameworks for UGC creators (real drivers, or actors presenting as drivers).

**UGC 1 — "Honest Review" Format**
- Style: Driver talking directly to camera from car or truck
- Script direction: "Hey, jag ville berätta om DriverNord. Jag hade sett annonsen och tänkte vad är det här för något. Men jag testade det ändå..." [describe registration experience] "...och nu har jag faktiskt fått kontakt med ett par åkerier. Värt att prova om du har CE."
- Length: 30–45 sec (UGC can be longer)
- Post-production: Minimal editing, keep authentic quality

**UGC 2 — "Before/After" Format**
- Style: Split or sequential — before state (frustrated job search) vs. after (received introduction)
- Script direction: "Sökte jobb i tre månader. Inget hände. Testade DriverNord — det tog 3 minuter. Fick ett erbjudande efter 10 dagar."
- Length: 20–30 sec

**UGC 3 — "Surprised" Format**
- Style: Reaction format — driver did not expect it to work
- Script direction: "Okej jag trodde inte på det här men..." [describe positive outcome] "...om du har CE och YKB, gör det."
- Length: 15–20 sec

---

### Meta Ads Measurement and Optimization

| KPI | Target | Action if missed |
|-----|--------|-----------------|
| CTR (click-through rate) | ≥1.5% | Swap ad creative; test new headline |
| Cost per click | ≤15 SEK | Widen targeting or test new audience |
| Chat start rate (click → chat start) | ≥40% | Improve landing page copy on `/chaufforer` |
| Completion rate (chat start → complete) | ≥55% | Review step dropout data; simplify steps |
| Cost per registration | ≤200 SEK | Pause underperforming ad sets |
| Registration quality (CE + YKB + Stockholm) | ≥40% of completions | Tighten Meta audience targeting |

**Optimization schedule:**
- Day 1–3: Let campaigns run. No changes. Collect data.
- Day 4–7: Review CTR and CPR. Pause ad sets with CTR <0.8%.
- Day 8–14: A/B test top-performing creative against one new variant.
- Day 15–30: Scale budget by 20–30% for best-performing ad set.

---

## 6. Platsbanken (Arbetsförmedlingen) Strategy

Platsbanken is Sweden's national job board, operated by Arbetsförmedlingen. It is free to post and has significant reach among active job seekers in the transport sector.

**Account type:** Employer account (DriverNord registers as the "employer" posting on behalf of client needs — but this framing requires care; see note below)

**Posting approach:**
- Post a "profile ad" — "Registrera dig i DriverNord's chaufförspool" — framed as an opportunity, not a specific job
- List specific criteria: CE license, YKB valid, Stockholm region, available now
- Direct applicants to `drivernord.se/chat` for registration

**Important framing note:** DriverNord is not an employer and not a staffing agency. Platsbanken ads must be framed accurately — as a driver registry, not as a specific job offer. The heading might be: "CE-chaufförer sökes till DriverNord's matchningspool — registrera ditt intresse."

**Estimated yield:** 5–20 registrations per month from Platsbanken (active job seekers; higher completion intent than Meta cold traffic).

**Content requirements:** Job title, description, location (Stockholm), requirements (CE + YKB), application instruction (link to chat). Swedish language required.

**Posting cadence:** Post once at campaign start. Refresh every 30 days.

---

## 7. LinkedIn Strategy

LinkedIn is less effective for reaching working-class CE drivers than Facebook/Meta, but useful for:
1. Reaching drivers who have professionalized their profile (higher-quality leads)
2. Reaching transport operations professionals who may refer drivers to DriverNord
3. Building brand credibility for the B2B side (clients see DriverNord is active and professional)

**Driver acquisition on LinkedIn:**

- Post driver-targeted content: "CE-chaufförer: Registrera er profil och bli matchad med Stockholmsföretag."
- Use LinkedIn's free job posting: "CE-chauffeur wanted — join DriverNord's qualified driver pool"
- Target: LinkedIn members with "Truck Driver," "Lastbilschaufför," "CE-licens," "Transport" in experience

**B2B credibility building (secondary objective):**

- Share market statistics: "5,000 CE drivers short annually in Sweden — DriverNord is changing how companies find qualified drivers"
- Publish 1 post per week on the supply gap, the matching model, or driver shortage data
- Do NOT post client names or driver names — confidentiality applies

**Expected yield:** 3–8 driver registrations per month; 2–5 inbound B2B inquiries per month at scale.

---

## 8. Facebook Groups Strategy

Facebook groups for Swedish truck drivers are active communities. Posting in these groups is free and can yield high-quality, trusted registrations via peer endorsement.

**Target groups (public search — "chaufför" + "lastbil" + "Sverige/Stockholm"):**

Search for and identify groups containing these keywords:
- "CE-chaufförer Sverige"
- "Lastbilschaufförer Stockholm"
- "Yrkeschaufförer"
- "Åkeriarbetare / Transportarbetare"
- "CE och C licens — tips och jobb"

*Note: Specific group names must be confirmed by the founder through direct Facebook search. Claude Code does not confirm which specific groups exist as of this writing.*

**Post approach:**

- Join groups as the founder (personal profile or DriverNord company page, where permitted)
- Post a brief, transparent description: "Vi bygger Sveriges mest matchade chaufförspool. CE-chaufförer i Stockholm kan registrera sig på [link]. Gratis för chaufförer, tar 3 minuter. Vi kontaktar er om ett relevant uppdrag dyker upp."
- Do NOT spam multiple groups on the same day — post in 1–2 groups per week
- Respond to comments promptly (human gate: founder monitors responses)

**Important:** Moderator-compliant posting is essential. Read each group's rules before posting. Some groups prohibit recruitment posts. Personalize the post to the group's tone.

**Expected yield:** 5–15 registrations per month from Facebook groups (high trust, high intent — these are peer-validated introductions).

---

## 9. Referral System

### Phase 1 Referral (Simple, Manual)

During registration (step 13 confirmation screen), include: "Känner du en annan CE-chaufför som kan vara intresserad? Dela länken: drivernord.se/chat"

No tracking infrastructure needed for Phase 1. This is a passive ask.

**Expected yield:** 1–5 additional registrations from organic referral in Month 1.

### Phase 2 Referral (Structured Incentive)

Once ≥10 drivers are registered and the first shortlist has been delivered, introduce a referral incentive:

**Proposed incentive:** "Refer a CE driver who registers and is successfully introduced to a client — receive 500 SEK Swish payment."

**Trigger condition:** The referred driver must complete registration AND be included in a delivered shortlist (introduction made).

**Mechanics:**
- Referral link with unique driver ID (query parameter `?ref=DRIVER_ID`)
- Track in Supabase: `drivers.referral_source` field
- Payment: Manual Swish payment by founder when condition met

**Cost per referral:** 500 SEK per qualifying referral. If average referral introduces a driver who generates 15,000 SEK revenue, referral cost = 3.3% of revenue. Justified.

**Note:** Phase 2 referral requires a small code addition (referral tracking). Not blocking Phase 1.

---

## 10. Funnel Analysis

### Funnel Stages and Expected Conversion

```
Stage 0: Ad impression
  ↓ 1–3% CTR
Stage 1: Landing page visit (drivernord.se/chaufforer)
  ↓ 40–60% → click "Registrera dig"
Stage 2: Chat start (/chat)
  ↓ 55–70% → complete all 13 steps
Stage 3: Registration complete (drivers table)
  ↓ 40–60% → CE license + YKB valid + Stockholm
Stage 4: Qualified lead (ingested_drivers table)
  ↓ 70–85% → currently available or available soon
Stage 5: Available qualified driver
  ↓ 60–80% → respond to SMS/follow-up contact
Stage 6: Confirmed available (can be shortlisted immediately)
```

### Key Drop-Off Points

| Stage | Risk | Mitigation |
|-------|------|-----------|
| Stage 1 → 2 | Landing page copy doesn't convert non-jobseekers | Test headline variants; add "no commitment" language prominently |
| Stage 2 → 3 | Chat steps too long or confusing | Monitor step dropout in Supabase; identify highest-dropout step |
| Stage 3 → 4 | Drivers register but don't meet criteria | Accept this rate; improve targeting upstream |
| Stage 4 → 5 | Drivers are "available_soon" not available | Prioritize `available` in scoring; improve availability question wording |
| Stage 5 → 6 | No SMS configured = no contact possible | 46elks configuration is critical path |

### AI Monitoring of Funnel

The AI monitoring loop (Section 12) queries these stage transitions daily and flags any stage with conversion below expected range, allowing rapid iteration on targeting, messaging, or chat flow.

---

## 11. Qualification Gate

All drivers entering the matching pool must pass the qualification gate. This is executed automatically by `classify.ts` and `ingestLead.ts`.

### Minimum Qualification Criteria (Auto-Applied)

| Criterion | System check | Handling if unmet |
|-----------|-------------|------------------|
| License = CE, C, or D | `license` field | `license=none` → `disqualified` terminal state; not ingested |
| YKB status | `ykb` field | `ykb=none` → status `unqualified_ykb` — enters DB but low priority; do not shortlist |
| Region | `region` field | `region != stockholm AND relocate = no` → lower priority; do not shortlist for Stockholm roles |
| Availability | `availability` field | `availability=unavailable` → `status=unavailable`; enters DB for future follow-up |
| Phone number | `phone` field | Required for SMS contact; contact agent skips if absent |

### Priority Scoring (From `classify.ts`)

The `classify.ts` function assigns `LeadPriority`:

- **`high`:** CE + YKB valid + Stockholm + available (or available_soon with relocation acceptance)
- **`medium`:** CE without YKB, or C/D with YKB, or outside Stockholm but willing to relocate
- **`low`:** C/D without YKB, unavailable, unclear location

**Shortlist inclusion rule:** Only `LeadPriority.high` and `LeadPriority.medium` drivers are included in shortlists (score ≥ 60 in `contactAgent.ts`). `low` priority drivers are stored but not introduced in Phase 1.

### Human Review Gate

Before any driver is introduced to a client company (before shortlist delivery), the founder reviews the shortlist in the recruiter dashboard (`/recruiter`). Human approval is required before delivery. AI prepares; human approves.

---

## 12. AI Monitoring Loop

### Daily Automated Actions (Existing Agents)

| Agent | Frequency | Action | Status |
|-------|-----------|--------|--------|
| `followUpAgent.ts` | Daily 08:00 (cron) | Contacts drivers with `follow_up_at ≤ now` | SIMULATED — needs 46elks |
| `matchingAgent.ts` | Triggered on new driver ingestion | Checks all active company needs; builds shortlists | OPERATIONAL |
| `contactAgent.ts` | Triggered after shortlist build | Contacts qualified shortlisted drivers | SIMULATED — needs 46elks |

### Additional Monitoring Queries (Manual Until Dashboard Built)

The founder should run these Supabase queries (or equivalent recruiter dashboard views) daily during the acquisition phase:

**Query 1 — Funnel summary:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') AS new_registrations_24h,
  COUNT(*) FILTER (WHERE lead_status = 'available' AND lead_priority = 'high') AS available_high_priority,
  COUNT(*) FILTER (WHERE lead_status = 'available' AND lead_priority IN ('high', 'medium')) AS available_shortlistable,
  COUNT(*) FILTER (WHERE lead_status = 'unavailable') AS unavailable_parked
FROM drivers;
```

**Query 2 — Qualification rate:**
```sql
SELECT 
  license,
  ykb,
  region,
  COUNT(*) as driver_count,
  COUNT(*) FILTER (WHERE lead_priority = 'high') as high_priority_count
FROM drivers
GROUP BY license, ykb, region
ORDER BY high_priority_count DESC;
```

**Query 3 — Package readiness check:**
```sql
SELECT COUNT(*) as package_4_ready
FROM drivers
WHERE lead_status = 'available'
  AND lead_priority = 'high'
  AND license = 'CE'
  AND ykb != 'none';
-- If result ≥ 5: Package 4 is available
-- If result ≥ 15: Package 2 is available
```

### AI-Assisted Campaign Monitoring

Weekly review checklist (AI can prepare this report from Supabase data):

1. New registrations this week (total, by channel if tracked)
2. Qualification rate (% meeting CE + YKB + Stockholm + available)
3. Dropout step analysis (which chat step has highest abandonment)
4. Package readiness status (current count vs. 5-driver and 15-driver gates)
5. Meta Ads performance (CTR, CPR, cost per qualified registration) — pulled from Meta Ads Manager
6. Recommended action for next week

---

## 13. 30-Day Acquisition Calendar

### Week 1 (Days 1–7): Setup and Launch

| Day | Task | Owner | Dependency |
|-----|------|-------|-----------|
| 1 | Deploy `/chat` registration flow to production | Founder + AI | Production deployment authorization |
| 1 | Configure 46elks SMS credentials | Founder | 46elks account (30 min task) |
| 1 | Confirm hej@drivernord.se monitoring | Founder | 10-minute task |
| 1 | Set up Meta Business Account and Pixel on `/chat` | Founder | Meta Business account |
| 2 | Create Meta Ads campaign with Ad Set 1 (CE Stockholm) | Founder (using this plan) | Ads account live |
| 2 | Upload 3 static creatives (Concepts 1–3 from Section 5) | Founder | Creative assets |
| 2–3 | Write and publish Platsbanken post | Founder | Arbetsförmedlingen employer account |
| 3 | Post in 1 Facebook group (select highest-membership group) | Founder | Group membership |
| 4–7 | Monitor Meta Ads: impressions, CTR, early registrations | Founder | Ads live |
| 7 | First weekly review: registration count, qualification rate, funnel | Founder + AI | 7 days of data |

**Week 1 success condition:** Campaign live. First registrations arriving. No technical blockers.

---

### Week 2 (Days 8–14): Optimize and Scale

| Day | Task | Owner |
|-----|------|-------|
| 8 | Review Meta Ads performance; pause any ad set with CTR <0.8% | Founder |
| 8–9 | Launch Ad Set 2 (broader Sweden targeting) if Ad Set 1 converting | Founder |
| 9 | Post in second Facebook group | Founder |
| 10 | Check registration quality: % CE + YKB + Stockholm + available | Founder + AI |
| 10 | If chat dropout high at specific step: flag for copy review | AI |
| 12 | If <5 registrations by Day 12: increase Meta budget by 50% | Founder |
| 14 | Second weekly review: funnel metrics, package readiness, ad performance | Founder + AI |

**Week 2 success condition:** ≥10 total registrations. At least 3–5 are `available` + `high` priority. Ad set showing positive CTR trend.

---

### Week 3 (Days 15–21): Quality and Follow-Up

| Day | Task | Owner |
|-----|------|-------|
| 15 | Run follow-up agent manually for any `available_soon` drivers from Week 1 | AI |
| 15–16 | Contact earliest-registered available drivers (SMS via 46elks) to confirm current availability | Founder |
| 17 | Evaluate first A/B creative test: which copy variant performing better? | Founder + AI |
| 18 | If retargeting audience ≥500 visitors: launch Ad Set 3 (retargeting) | Founder |
| 19 | Post referral ask on `/confirmation` page if not already done | Founder + AI |
| 21 | Third weekly review: package readiness gates — are we ≥5 available? | Founder + AI |

**Week 3 success condition:** ≥20 total registrations. ≥5 confirmed available high-priority CE + YKB drivers. Package 4 gate reached or within reach.

---

### Week 4 (Days 22–30): Package Readiness and Commercial Prep

| Day | Task | Owner |
|-----|------|-------|
| 22 | Run Supabase package readiness query (Section 12) | AI |
| 22 | If Package 4 threshold met (≥5): prepare founder brief for first commercial conversation | AI |
| 23–25 | Continue Meta Ads at current budget (don't change what's working) | Founder |
| 25 | Confirm all 6 blockers status (SMS, inbox, legal docs) — are we commercial-ready? | Founder + AI |
| 26–28 | If legal docs reviewed: prepare first client outreach script (human execution) | AI |
| 28 | Final Platsbanken post refresh | Founder |
| 30 | Final 30-day review: total registrations, qualified pool depth, commercial readiness | Founder + AI |

**Week 4 success condition:** ≥20 qualified registrations. ≥5 available high-priority for Package 4. ≥15 for Package 2 (stretch). Legal documents reviewed or in review. First commercial conversation possible.

---

## 14. Tool List

### Tools Required to Execute This Plan

| Tool | Purpose | Status | Priority |
|------|---------|--------|---------|
| Production deployment (Next.js / Vercel) | `/chat` must be live for real drivers to register | NOT DEPLOYED | **Critical path** |
| 46elks SMS | Driver availability confirmation; follow-up; consent | NOT CONFIGURED | **Critical blocker** |
| Meta Business Manager | Run Facebook/Instagram ads | May exist | Critical |
| Meta Pixel (on `/chat`) | Track conversion events; build retargeting audience | Not installed | High |
| Arbetsförmedlingen employer account | Platsbanken posting | Unknown | Medium |
| hej@drivernord.se | Inbound inquiries; GDPR requests | Unconfirmed | Critical |
| Recruiter dashboard (`/recruiter`) | Review incoming registrations; approve shortlists | Implemented (local) | High |
| Supabase local (127.0.0.1) | All data storage and query | Operational | Operational |
| Fortnox or Bokio | Invoice first clients | Not configured | Pre-sale |
| Reviewed legal documents (DPA, SA, PP) | Required before any introduction | In review | Pre-sale |

### Tools NOT Required for Acquisition Phase

- CRM (spreadsheet is sufficient for <5 active prospects)
- Analytics platform (Supabase query data is sufficient)
- Digital document signing (PDF + email is acceptable for first 3 clients)
- Transportstyrelsen API verification (Phase 2)

---

## 15. Budget Scenarios

### Scenario A — Zero Ad Budget (Organic Only)

| Channel | Cost | Expected registrations (30 days) |
|---------|------|--------------------------------|
| Platsbanken | Free | 5–15 |
| Facebook groups | Free | 5–15 |
| LinkedIn | Free | 2–5 |
| Referral | Free (Phase 1) | 1–5 |
| **Total** | **0 SEK** | **13–40** |

**Assessment:** Viable for reaching Package 4 threshold (≥5 qualified) within 30 days if targeting is lucky and group posts are well-received. Not reliable. High variance. Not recommended as sole strategy.

---

### Scenario B — Conservative Paid (5,000 SEK)

| Channel | Budget | Expected registrations (30 days) |
|---------|--------|--------------------------------|
| Meta Ads | 4,500 SEK | 15–35 |
| Platsbanken | Free | 5–15 |
| Facebook groups | Free | 5–10 |
| **Total** | **4,500 SEK** | **25–60** |

**Cost per registration (total):** 75–180 SEK
**Cost per qualified registration (CE + YKB + available, ~40% of total):** 190–450 SEK
**Expected qualified pool:** 10–24 qualified drivers
**Package 4 gate (≥5):** HIGH probability in 30 days
**Package 2 gate (≥15):** MEDIUM probability in 30 days

**Assessment:** Conservative budget with strong probability of reaching Package 4 threshold. Package 2 is achievable but not guaranteed in 30 days. **Recommended minimum.**

---

### Scenario C — Standard Paid (10,000 SEK)

| Channel | Budget | Expected registrations (30 days) |
|---------|--------|--------------------------------|
| Meta Ads | 9,000 SEK | 30–75 |
| Platsbanken | Free | 5–15 |
| Facebook groups | Free | 5–10 |
| **Total** | **9,000 SEK** | **40–100** |

**Cost per registration (total):** 90–225 SEK
**Expected qualified pool:** 16–40 qualified drivers
**Package 4 gate (≥5):** VERY HIGH probability in 14 days
**Package 2 gate (≥15):** HIGH probability in 30 days

**Assessment:** Recommended scenario. Budget is modest relative to Package 4 revenue (8,000–10,000 SEK). A single Package 4 sale covers 100% of the acquisition budget. **Recommended standard.**

---

### Scenario D — Aggressive (20,000 SEK)

| Channel | Budget | Expected registrations (30 days) |
|---------|--------|--------------------------------|
| Meta Ads | 18,000 SEK | 60–150 |
| Paid Platsbanken premium | 2,000 SEK | +10–15 |
| **Total** | **20,000 SEK** | **70–165** |

**Expected qualified pool:** 28–65 qualified drivers
**Package 2 gate (≥15):** VERY HIGH probability in 14–21 days
**Multiple parallel Package 2 deliveries:** POSSIBLE in Month 2

**Assessment:** Justified only if legal documents and 46elks are already configured. Over-investing in driver acquisition before legal readiness creates a registered pool that cannot be commercially utilized. Do not scale to Scenario D until Blockers 4–6 (legal docs) are resolved.

---

### Budget Recommendation

**Start with Scenario B (5,000 SEK).** This is sufficient to reach Package 4 threshold and generates enough data to optimize before committing to Scenario C. After Package 4 is confirmed deliverable, reinvest revenue into Scenario C.

**Budget phasing:**

| Phase | Trigger | Budget |
|-------|---------|--------|
| Week 1–2 | Campaign launch | 2,500 SEK |
| Week 3–4 | If ≥10 registrations and CTR ≥1.5% | Additional 2,500 SEK |
| Month 2 | After first Package 4 sale | Reinvest 30–50% of revenue |

---

## 16. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Meta Ads CTR below 1% | Medium | High | Test 3+ creative variants in Week 1; swap underperformers by Day 7 |
| High registration start rate but low completion | Medium | High | Review step dropout data; simplify highest-abandonment step |
| Registrations heavily non-CE (C, D, non-licensed) | Medium | Medium | Tighten Meta audience interest targeting; add qualifying question earlier |
| Registrations outside Stockholm | Medium | Medium | Tighten geographic targeting; weight scoring down for non-Stockholm |
| Drivers register but are unavailable | Medium | High | Improve availability question; add "when will you be available?" follow-up |
| 46elks not configured → no follow-up possible | High (current state) | Critical | This is Blocker 2; must be resolved before campaign launch |
| No production deployment → registration chat unreachable | High (current state) | Critical | This is the production deployment gate; must be resolved Day 1 |
| Privacy policy not reviewed → GDPR risk at scale | High (current state) | High | This is Blocker 4; required before commercial driver pool reaches scale |
| Facebook group posts rejected by moderators | Medium | Low | Research rules before posting; personalize message; diversify across groups |
| Meta Ads account suspended (policy violation) | Low | High | Review Meta advertising policies for recruitment; avoid prohibited targeting |
| Competition from Förartjänst.se relaunch during campaign | Low–Medium | Medium | Monitor; if they relaunch, differentiate on quality + consent model |
| Driver dropout after registration (becomes unavailable) | High | Medium | Implement 7-day availability confirmation ping (Phase 2 automation); treat driver pool as depreciating asset |

---

## 17. Go / No-Go Criteria

### Go/No-Go for Package 4 (Akut Förarsökning — 8,000–10,000 SEK)

| Criterion | Gate | Status (Day 0) |
|-----------|------|--------------|
| ≥5 available, qualified CE + YKB drivers in database | REQUIRED | Not met — 0 drivers |
| 46elks SMS configured and tested | REQUIRED | Not configured |
| hej@drivernord.se confirmed active | REQUIRED | Unconfirmed |
| Privacy policy legally reviewed | REQUIRED | Preliminary |
| Service agreement template exists | REQUIRED | Does not exist |
| DPA template exists | REQUIRED | Does not exist |
| Recruiter dashboard accessible | REQUIRED | Implemented |
| Founder can deliver shortlist (48h SLA) | REQUIRED | Operationally possible once above are met |

**Go condition:** All 8 criteria met simultaneously. Current status: 0/8.

**Critical path item:** Driver acquisition (this plan) resolves Criterion 1. Items 2–6 are founder + legal tasks that run in parallel. Target resolution: within 30 days.

---

### Go/No-Go for Package 2 (Verifierad Förarlista — 15,000 SEK)

| Criterion | Gate | Status (Day 0) |
|-----------|------|--------------|
| ≥15 available, qualified CE + YKB drivers in database | REQUIRED | Not met |
| All Package 4 criteria above also met | REQUIRED | Not met |
| At least 1 successful Package 4 delivery (quality validation) | STRONGLY RECOMMENDED | None yet |
| Shortlist delivery format confirmed (PDF or structured email) | REQUIRED | Not built |
| Invoicing tool configured (Fortnox) | REQUIRED | Not configured |

**Go condition:** All 5 criteria met. Package 2 follows naturally after Package 4 threshold is reached and first delivery is made.

---

## 18. Final Recommendation

### The One Priority That Supersedes This Entire Plan

**Get the registration chat live in production.**

Every section of this plan assumes that `/chat` is reachable by real drivers on the public internet. If the production deployment has not happened, no ad campaign, no Platsbanken post, no Facebook group post, and no referral ask will produce a single driver registration. Production deployment is the absolute prerequisite.

### The Execution Sequence

Do these in order. Do not skip ahead.

1. **Deploy to production** — Enable the registration flow for real drivers (Day 1)
2. **Configure 46elks** — Enable real driver contact (30 min; Day 1)
3. **Confirm hej@drivernord.se** — Enable inbound (10 min; Day 1)
4. **Commission legal review** — DPA, service agreement, privacy policy — run in parallel with acquisition
5. **Launch Meta Ads** — Scenario B (5,000 SEK) with Ad Copy Variant 1 and Static Concept 1 as starting creatives (Day 2)
6. **Post on Platsbanken** — Free, quick, direct reach to active job seekers (Day 2–3)
7. **Post in one Facebook group** — Free, personal, peer-trusted (Day 3)
8. **Monitor daily** — Run the Supabase package readiness query; review Meta performance weekly
9. **When ≥5 qualified available drivers:** Begin commercial preparation (first client outreach — founder task, not AI)
10. **When ≥15 qualified available drivers:** Package 2 is ready; scale acquisition budget from Package 4 revenue

### What Success Looks Like at Day 30

| Metric | Conservative | Target | Optimistic |
|--------|-------------|--------|-----------|
| Total registrations | 20 | 35 | 60 |
| Qualified (CE + YKB + Stockholm + available) | 8 | 15 | 28 |
| Package 4 gate met (≥5) | Yes | Yes | Yes |
| Package 2 gate met (≥15) | Maybe | Yes | Yes |
| Legal docs in review | Yes | Yes | Yes |
| First commercial conversation had | No | Yes | Yes |
| First revenue | No | Possible | Likely |

### What This Plan Cannot Do

This plan acquires drivers. It does not replace:

- **Legal review** — a lawyer must review the privacy policy, DPA, and service agreement before commercial transactions
- **Production deployment** — a human must authorize and execute the production deployment
- **Commercial conversations** — the first 3 client conversations require the founder's direct involvement; AI prepares materials, human delivers
- **Driver credentialing** — all license/YKB claims are self-reported in Phase 1; Transportstyrelsen verification is Phase 2

The acquisition machine built in this plan is ready to run. The commercial machine can begin receiving output the moment the 6 blockers are resolved.

**First revenue is 30–60 days away if the founder takes action today.**

---

*All projections are INFERRED from industry benchmarks unless labeled VERIFIED. No drivers were contacted. No companies were approached. No systems were deployed. This is a planning document requiring human authorization before execution.*

*Document version: 1.0 — 2026-05-14*
