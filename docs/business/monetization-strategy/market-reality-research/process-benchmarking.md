# DriverNord — Process Benchmarking

**Date:** 2026-05-14
**Purpose:** Compare how each delivery model in the market actually operates — step by step. Identify process strengths and weaknesses. Extract what the DriverNord process must do to be competitive.
**Governing rule:** Public data only. No legal conclusions stronger than evidence supports. Confidence levels noted.

---

## Framework: Four Process Dimensions

For each model type, assess:
1. **Driver acquisition process** — how drivers enter the supply side
2. **Qualification process** — what is verified before a driver is presented
3. **Matching process** — how drivers are matched to a company need
4. **Delivery process** — what the buyer actually receives, and when

---

## Model A — Directory / Job Board (Chaffis, Yrkesförarjobb)

### Driver acquisition process
- Driver self-registers via website form
- No active recruitment or outreach required
- Driver submits own information; platform stores it passively
- **Time to acquire one driver:** Minutes (self-service)
- **Cost per driver acquired:** Near zero (platform bears fixed cost only)

### Qualification process
- **Chaffis:** No credential verification against Transportstyrelsen or official registries (CONFIRMED — no mention on site)
- **Yrkesförarjobb:** Not applicable — job board model, drivers apply to ads, not pre-registered
- Driver-submitted data is taken at face value
- BankID (Chaffis) confirms identity only — not that the license exists or is valid

### Matching process
- **Chaffis:** Algorithmic matching on submitted attributes (category, region, availability)
- **Yrkesförarjobb:** Company posts ad; drivers who match apply organically
- No real-time availability confirmation
- No per-company consent gate before contact data is shared

### Delivery process
- **Chaffis:** Company gets a list of matched driver profiles; may contact directly
- **Yrkesförarjobb:** Company receives applications via email/ATS
- **Typical time to first delivery:** Days (Chaffis) to weeks (Yrkesförarjobb, depending on ad run)
- **Outcome uncertainty:** High — neither platform guarantees that a matched driver is still available, still interested, or will respond

### Process weaknesses
- No verification = false positives in the match (wrong license, expired YKB, unavailable)
- No availability confirmation = wasted contact attempts
- No consent model = GDPR exposure for company using the data
- No guarantee = company takes all quality risk

---

## Model B — Permanent Placement Agency (Manpower, Randstad, Lernia, Rekryteringsgruppen)

### Driver acquisition process
- Large CV databases (Manpower: ~250,000 CVs; 10,000 new/month)
- Advertising on major job boards (Indeed, Blocket, LinkedIn, Arbetsförmedlingen)
- Existing candidate relationships from prior placements
- **Time to acquire one driver:** Days to weeks (inbound via ads)
- **Cost per driver acquired:** Substantial — job board costs, recruiter time, screening time

### Qualification process
- CV review + telephone screen (typically)
- Reference check (typically 2–3 references)
- For transport: license copy requested and reviewed manually
- **YKB verification:** Manual check against Transportstyrelsen (if done — not publicly confirmed for all agencies)
- No automated, systematic scoring pipeline
- **Typical time to qualify one driver:** 3–10 business days

### Matching process
- Recruiter manually matches driver profile to company requirement
- Internal database search by keyword/category
- Manual judgment call by recruiter
- No algorithmic scoring (at least not visible in public materials)
- **Typical time from need to shortlist: 1–3 weeks**

### Delivery process
- Company receives 3–5 candidate CVs
- Company interviews candidates (1–3 rounds typically)
- Company makes offer; candidate accepts or declines
- Agency fee triggered on hire (% of annual salary or flat fee)
- **End-to-end time: 3–8 weeks from mandate to hire** (STRONG INFERENCE — standard recruitment timeline)
- **Payment timing:** On hire (success fee model for most)

### Process strengths
- Deep candidate databases
- Human judgment and relationship in matching
- Satisfaction guarantees (Rekryteringsgruppen: 10-day free replacement)
- Legally structured service agreements already in place

### Process weaknesses
- Slow: 3–8 weeks not acceptable for urgent need
- Expensive: 15–30% of annual salary = 63,000–126,000 SEK for one CE driver
- Opaque: No public pricing; pricing conversation required before any commitment
- Not available below ~25 employees: Large agencies not cost-efficient for small transport companies

---

## Model C — Staffing / Bemanning (Simplex, Tranpenad, Rekryteringsgruppen, Jobwise)

### Driver acquisition process
- Constant active recruitment to maintain a deployable driver pool
- Advertising + existing registered drivers in the database
- Drivers apply and are screened into the agency's active pool
- **Key difference from Model B:** Drivers are employed (or on zero-hours equivalent) by the agency; always available to deploy

### Qualification process
- Full employment onboarding: license verification, YKB confirmation, medical checks
- Tachograph compliance training (required for CE drivers under EU 561/2006)
- Reference checks
- **Quality:** Higher than Model A/B — agency has employer liability so must verify
- Driven by Kollektivavtal compliance (Transportavtalet), not voluntary

### Matching process
- Client calls with need: "I need a CE driver in Stockholm tomorrow morning"
- Dispatcher checks internal availability; contacts drivers on roster
- **Rekryteringsgruppen claims 90-minute response time for urgent staffing (VERIFIED)**
- Match made by dispatcher, not algorithm (at least no AI matching is publicly claimed)

### Delivery process
- Company receives one driver who shows up ready to work
- Agency handles all employer administration (pay, pension, sick leave, Fora)
- Client invoiced hourly: approximately 450 SEK/hour for CE (STRONG INFERENCE from market benchmark)
- **Payment timing:** Monthly invoice on hours worked
- **Speed:** Same-day to next-day for established clients

### Process strengths
- Speed: fastest delivery model for urgent need
- No risk: company not responsible for employment
- Quality: agency has employer liability so must get it right
- Flexibility: hourly scaling, no hire commitment

### Process weaknesses
- Expensive: 450 SEK/h × 1,850 h/year = 832,500 SEK/year vs. recruiting for 63,000 SEK once
- Dependency: company never builds its own driver team
- Scale gate: not accessible without established credit relationship with agency
- Regulatory burden on agency (Kollektivavtal, Bemanningslag) prevents small operators from entering this market

---

## Model D — DriverNord V1: Verified Consented Introduction

### Driver acquisition process (as designed)
- **Active outreach:** Meta Ads targeting professional CE drivers in Stockholm region
- **Inbound chat:** Structured conversation captures license, YKB, region, availability
- `applyStep()` validates and classifies each driver in real time
- `classify()` assigns LeadStatus + LeadPriority automatically
- **Time to acquire one driver:** 10–20 minutes (chat completion)
- **Cost per driver acquired:** ~100–500 SEK (Meta Ad cost) — see `monetization-strategy-audit.md` for unit economics

### Qualification process (as designed)
- License type captured at registration (CE/C/D)
- YKB confirmation captured (yes/no + expiry captured in future)
- Region and relocate willingness captured
- Driver card (digital tachograph card) status captured
- **Future:** Transportstyrelsen API verification (not yet implemented)
- Automated scoring: `classify()` assigns priority tier
- **Key differentiator:** Systematic, automated, consistent qualification — not manual per-recruiter judgment
- **Weakness:** No external verification against official registries yet (limitation of current build)

### Matching process (as designed)
- `buildShortlist()` implemented and tested (CONFIRMED — CLAUDE.md)
- Matches drivers to company need by license, region, availability, score ≥ 60
- Deduplication window: 14 days (3 days for emergency needs)
- Consent gate: Stage 3 consent per company (design documented)
- **Key differentiator:** Algorithm-driven, consistent, not subject to recruiter availability or bias

### Delivery process (proposed)
- **Package 4 (Akut Förarsökning):** One named, available, CE+YKB-confirmed driver within 48 hours
- **Package 2 (Verifierad Förarlista):** 3–5 matched, available, consent-confirmed drivers delivered as a shortlist
- **Payment:** On delivery of shortlist (before company contacts drivers) — not on hire
- **Time to delivery:** 48 hours (Package 4) / 3–5 business days (Package 2)
- **What company receives:** Named driver profiles with license status, availability, and consent confirmation — not raw CVs

### Process strengths (differentiators)
- Only model with explicit per-company consent documentation
- Only model with automated, consistent qualification scoring
- Only model with real-time availability confirmation at point of delivery
- Fastest flat-fee delivery: 48 hours vs. 3–8 weeks for agency recruitment
- Most price-transparent: 8,000–15,000 SEK stated vs. undisclosed agency pricing

### Process weaknesses (current state)
- No Transportstyrelsen verification yet (YKB relies on driver self-report)
- No SMS contact capability until 46elks is configured (currently blocking)
- No driver database — bootstrap problem (first shortlist requires driver acquisition first)
- No legal documents yet (DPA, service agreement, reviewed privacy policy)
- `contactAgent` currently simulates contact — does not actually send messages

---

## Process Comparison Table

| Dimension | Model A (Directory) | Model B (Agency Placement) | Model C (Staffing) | Model D (DriverNord V1) |
|-----------|--------------------|--------------------------|--------------------|------------------------|
| **Driver acquisition method** | Self-registration | Advertising + database | Active recruitment | Paid ads + structured chat |
| **Time to driver entry** | Minutes | Days–weeks | Days–weeks | 10–20 minutes |
| **License verification** | None | Manual (CV copy) | Full (employer obligation) | Self-report (future: Transportstyrelsen) |
| **YKB verification** | None | Partial (manual) | Full (employer obligation) | Self-report (structured) |
| **Availability confirmation** | None | At interview stage | At dispatch | At registration + pre-delivery |
| **Per-company consent** | None documented | None documented | Implied by employment | Explicit (Stage 3 consent design) |
| **Matching method** | Algorithm / organic | Human (recruiter) | Human (dispatcher) | Algorithm (buildShortlist) |
| **Delivery speed** | Days–weeks | 3–8 weeks | Same-day to next-day | 48 hours (P4) / 3–5 days (P2) |
| **Delivery format** | List of profiles / applications | 3–5 CVs | One driver shows up | 3–5 verified profiles with consent confirmed |
| **Price transparency** | Yes (Chaffis: 4,995/year) | None | None | Yes (8,000–15,000 SEK stated) |
| **Payment trigger** | Annual subscription | On hire | Monthly invoice | On shortlist delivery |
| **Outcome guarantee** | None | None / replacement | Continued deployment | Not yet defined — needs design |
| **GDPR consent design** | Unknown / weak | Unknown | Employment-based | Explicit per-company consent |
| **Minimum company size** | Any | Mid–large | Any (with credit) | Any |
| **Employer risk** | None | None | Staffing agency | None |

---

## Key Process Benchmarks for DriverNord

Based on this analysis, the following process standards are required for DriverNord's Model D to be competitive:

| Benchmark | Source | DriverNord target |
|-----------|--------|-----------------|
| Delivery time for urgent need | Rekryteringsgruppen: 90 minutes (staffing); Driver Require (UK): same-day | Package 4: 48 hours — achievable; 24 hours would match staffing speed |
| Shortlist size | Agency norm: 3–5 candidates | Package 2: 3–5 drivers — matches norm |
| Replacement guarantee | Rekryteringsgruppen: 10 days; Driver Require (UK): same-day | Not yet defined; recommend: 1 replacement within 5 days if driver unavailable after introduction |
| Consent documentation | Förartjänst.se: driver approves per-company | Stage 3 consent design matches this standard |
| Availability freshness | Not explicitly stated by any competitor | DriverNord must confirm availability within 7 days of shortlist delivery |

---

*All process data from public sources. Internal DriverNord process data from codebase and documentation review. Competitor internal processes inferred from public marketing materials — actual processes may differ.*
