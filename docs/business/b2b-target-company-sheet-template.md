# DriverNord — B2B Target Company Sheet: Column Guide

*Created: 2026-05-10*
*Phase: 1.5 — B2B Research*
*Companion to: docs/business/b2b-barrier-entry-research-framework.md*
*Template file: docs/business/b2b-target-company-template.csv*

---

## How to Use This Document

This guide explains every column in the research sheet. Read it once before starting collection. Use it as a reference when you are unsure how to fill a field.

**The sheet has two modes:**

1. **Collection mode** — fill only the minimum viable fields (marked **MVP** below) as you scan companies. Speed matters. Do not score during collection.
2. **Scoring mode** — after all 50 companies are recorded, complete the scoring and barrier fields for each one. Then select the top 10.

**One row = one company.** If a company appears in multiple job ad sources, record it once and note all sources in `source_notes`.

---

## Column Reference

### `company_name`

**What it means:** The legal or trading name of the transport company.

**How to fill:** Use the name as it appears on the company website or Allabolag.se. Do not abbreviate. If the company trades under a different name than its legal name, record both: "Stockholms Åkeri AB (trading as SthlmTrans)".

**Example values:** `Stockholms Åkeri AB`, `Mälardalen Distribution AB`, `Kjell Lindqvist Transport`

**Why it matters:** The primary key for the sheet. Used for deduplication, follow-up tracking, and reference in outreach scripts.

**MVP:** Yes — fill during collection.

---

### `website`

**What it means:** The company's primary website URL.

**How to fill:** Include `https://`. If no website exists, write `none`. If a website is under construction or broken, write `no_website` and note in `source_notes`.

**Example values:** `https://stockholmsakeri.se`, `https://malardalen-transport.se`, `none`

**Why it matters:** Used to verify company legitimacy, find contact details, check for supplier pages, and assess professionalism. A company with no website is still a valid target — many small Swedish operators have no web presence — but requires a different research approach.

**MVP:** Yes — fill during collection.

---

### `region`

**What it means:** The geographic region where the company's primary operations are based.

**How to fill:** Choose one value from the controlled list. Base it on the company's operational address, not the legal registered address (these can differ).

**Allowed values:**
- `stockholm` — Stockholm city and immediate suburbs (within 30km of city center)
- `stockholm_region` — Greater Stockholm County (Stockholms län) beyond 30km
- `uppsala` — Uppsala county
- `soermland` — Södermanland county
- `malardalen` — Mälardalen region generally (Västmanland, Örebro)
- `other_sweden` — Elsewhere in Sweden

**Example values:** `stockholm`, `stockholm_region`, `uppsala`

**Why it matters:** Regional fit is a scored dimension (up to 15 points). Stockholm city or region scores highest because DriverNord's driver pool is Stockholm-first. Companies outside this zone score lower on feasibility.

**MVP:** Yes — fill during collection.

---

### `city`

**What it means:** The specific city or municipality of primary operations.

**How to fill:** Free text. Use the Swedish city name. If the company operates from multiple cities, list the primary location first, others separated by `/`.

**Example values:** `Stockholm`, `Södertälje`, `Uppsala`, `Västerås`, `Stockholm / Södertälje`

**Why it matters:** More specific than region. Useful for clustering companies geographically when planning outreach routes and for understanding which companies are truly within DriverNord's operational reach.

**MVP:** Yes — fill during collection.

---

### `company_size`

**What it means:** An estimate of the company's headcount, used as a proxy for organizational complexity and procurement overhead.

**How to fill:** Choose one value. Use Allabolag.se, LinkedIn company page, or the company's own "Om oss" page to estimate. When in doubt, go with the smaller category.

**Allowed values:**
- `micro` — 1 to 9 employees
- `small` — 10 to 49 employees
- `medium` — 50 to 249 employees
- `large` — 250 or more employees

**Note:** Fleet size and headcount are not the same. A company with 50 trucks may have only 30 employees if they use contracted drivers. Headcount is still the right proxy for organizational complexity.

**Example values:** `small`, `medium`, `micro`

**Why it matters:** Company size strongly predicts procurement complexity and decision-maker accessibility. Micro and small companies (segments A) are primary targets. Large companies require a different strategy.

**MVP:** Yes — fill during collection (estimate is fine; exact number not required).

---

### `segment`

**What it means:** The company's segment classification from the research framework. This determines which research priority the company belongs to and which approach strategy applies.

**How to fill:** Choose the primary segment. Add secondary tags after a `/` if applicable.

**Allowed values:**
- `A` — SME transport company (5–50 trucks, owner-operated or single transport manager)
- `B` — Regional transport operator (50–200 trucks, transport manager or operations director)
- `C` — Mid-size logistics company (200–1,000 employees, HR function present)
- `D` — Company using staffing/bemanning agency (cross-segment tag — add to A, B, or C)
- `E` — Company repeatedly posting driver ads (cross-segment urgency tag — add to A, B, or C)
- `F` — Large enterprise logistics group (1,000+ employees, benchmark only)
- `agency` — A staffing/bemanning agency itself (potential B2B partner, not employer target)

**Combined examples:** `A/D` = SME that uses a staffing agency; `B/E` = regional operator with repeated ads; `C/D` = mid-size using staffing with HR

**Example values:** `A`, `B/E`, `A/D/E`, `F`, `agency`

**Why it matters:** Segment drives priority, approach strategy, barrier expectation, and scoring weight. Segment F companies should never be in the outreach queue — they are research benchmarks only.

**MVP:** Yes — fill during collection.

---

### `transport_domain`

**What it means:** The transport specialization(s) the company operates in, using DriverNord's domain taxonomy. This determines how well the company's driver needs map to DriverNord's current driver pool.

**How to fill:** List all applicable domains, comma-separated. Base it on what you see in job ads, the company website, and fleet type. Use only values from the taxonomy below.

**Allowed values (from DriverNord's 15-domain taxonomy):**

| Value | Meaning |
|---|---|
| `tipp` | Tipping / tipper trucks (construction, soil, gravel) |
| `kran` | Crane truck (heavy lift) |
| `kylfrys` | Refrigerated / frozen transport |
| `silo` | Silo / bulk / pneumatic (grain, feed, chemicals) |
| `flatbed` | Flatbed / platform (machinery, oversized) |
| `tanker` | Tanker (fuel, chemicals, food liquid) |
| `ekipage` | Trailer combination (long-haul freight, CE) |
| `schakt_bygg` | Excavation / construction haulage |
| `distribution` | Local distribution (last-mile, B2B delivery) |
| `livsmedelskyla` | Food refrigeration (supermarket, restaurant supply) |
| `avfall` | Waste collection (municipal, industrial) |
| `skogstransport` | Forestry transport (timber, pulp) |
| `adr` | ADR / hazardous materials transport |
| `fjarrtransport` | Long-haul / cross-country freight |
| `budtransport` | Courier / parcel delivery |

**Example values:** `distribution`, `kylfrys,distribution`, `ekipage,fjarrtransport`, `tipp,schakt_bygg`

**Why it matters:** Domain fit is a scored dimension (up to 15 points). CE + YKB-required domains (ekipage, fjarrtransport, kylfrys, tanker, adr) score highest because they map directly to DriverNord's highest-value drivers. Domains that primarily use B or small C licenses (budtransport, avfall) score lower.

**MVP:** Yes — fill during collection (best estimate from job ads is sufficient).

---

### `visible_driver_need`

**What it means:** Whether there is a currently active, observable signal that this company is hiring professional drivers.

**How to fill:** Binary. Check job boards and company career page at the time of research.

**Allowed values:** `yes`, `no`

**Example values:** `yes`, `no`

**Why it matters:** The single most important qualifier. A company with no visible driver need scores 0 on the highest-weighted dimension (25 points). Do not invest time scoring a company with no visible need — revisit later if a need appears.

**Rule:** If `visible_driver_need = no`, the company still belongs in the sheet for tracking purposes, but mark `research_status = on_hold` and do not score until a need appears.

**MVP:** Yes — fill during collection.

---

### `job_ads_url`

**What it means:** The direct URL to the specific job ad(s) that triggered this company's inclusion in the sheet.

**How to fill:** Paste the full URL of the active job ad. If multiple ads exist, separate with a space or newline. Include the source platform in brackets if the URL is ambiguous.

**Important:** Job ads expire. Record the URL immediately and also note the ad title and date in `source_notes`. If the ad expires before scoring, the URL will be dead but `source_notes` preserves the evidence.

**Example values:**
- `https://arbetsformedlingen.se/platsbanken/annonser/12345`
- `https://jobb.blocket.se/annons/ce-chauffeur-stockholm-98765`
- `https://www.linkedin.com/jobs/view/3456789`

**Why it matters:** Provides the primary evidence for `visible_driver_need = yes` and the license/YKB detection that feeds into scoring. Also useful when preparing an outreach message — you can reference the specific role.

**MVP:** Yes — fill during collection. Dead links are acceptable if `source_notes` captures the evidence.

---

### `license_mentions`

**What it means:** Which driver license class(es) are mentioned in the company's current job ad(s) or on their website.

**How to fill:** List all license classes mentioned, comma-separated. Use the standard Swedish abbreviations.

**Allowed values:** `C`, `CE`, `D`, `C+D`, `CE+D`, `B` (record B but it is not a DriverNord target), `none_specified`

**Example values:** `CE`, `C,CE`, `CE+D`, `none_specified`

**Note:** Many job ads require CE but do not write "CE-körkort" — they write "lastbilskörkort" or similar. If the role clearly requires a truck, record `CE` even if not explicitly stated, and note "inferred" in `source_notes`.

**Why it matters:** CE and C license requirements map directly to DriverNord's highest-scoring driver pool. Roles requiring only B license (car, van) are outside DriverNord's scope and should trigger disqualification review.

**MVP:** Yes — fill during collection.

---

### `YKB_mentions`

**What it means:** Whether the job ad or company requirements explicitly mention YKB (Yrkeskompetensbevis — professional competence certificate).

**How to fill:** Binary.

**Allowed values:** `yes`, `no`

**Example values:** `yes`, `no`

**Note:** Many ads require YKB in practice but do not name it. "CE-körkort" on a professional role almost always implies YKB. Record `no` if YKB is not explicitly mentioned, and note in `source_notes` if you believe it is implied.

**Why it matters:** YKB is DriverNord's strongest matching signal. Drivers with valid YKB score highest. A company that explicitly requests YKB is the ideal target — their need maps precisely to the driver profile DriverNord captures most effectively.

**MVP:** Yes — fill during collection.

---

### `driver_card_mentions`

**What it means:** Whether the job ad or company requirements explicitly mention a förarkort (driver card / tachograph card).

**How to fill:** Binary.

**Allowed values:** `yes`, `no`

**Example values:** `yes`, `no`

**Why it matters:** Driver card is one of DriverNord's intake fields. Companies that require a driver card are looking for professional, compliant CE/C drivers — exactly the profile DriverNord captures. Less critical than YKB for scoring purposes, but useful as a signal of professional driver need versus light commercial.

**MVP:** No — fill during scoring or when clearly visible in the ad.

---

### `urgency_signal`

**What it means:** The strength of the signal that this company needs a driver now, not in 3 months.

**How to fill:** Choose one value. Base it on observable signals at the time of research.

**Allowed values:**
- `none` — No active job ad. No urgency signals visible.
- `single_ad` — One active job ad for a driver role.
- `repeated_ads` — Two or more ads for similar roles posted within the last 60 days (same company, detected by checking ad history on Arbetsförmedlingen).
- `stated_urgency` — The ad explicitly says "omgående tillsättning" (immediate start), "snarast möjligt", or similar. Or company has contacted DriverNord directly.

**Example values:** `single_ad`, `repeated_ads`, `stated_urgency`

**How to detect `repeated_ads`:** On Arbetsförmedlingen, search the company name. Switch from "Active" to "All" ads. Filter by last 60 or 90 days. Count driver-related ads. Two or more for a similar role = `repeated_ads`.

**Why it matters:** Urgency is a scored dimension (up to 10 points). `repeated_ads` indicates an unfilled, chronic need — the company has spent money on ads and still has no driver. This is the strongest possible urgency signal and the easiest sales conversation: they already know they have a problem.

**MVP:** Yes — fill `single_ad` or `stated_urgency` during collection. Upgrade to `repeated_ads` during scoring after checking ad history.

---

### `contact_email`

**What it means:** The best available direct email address for the identified decision-maker or, if not findable, the general company contact email.

**How to fill:** Free text. If a direct decision-maker email is found, prefer it over the general inbox. Note the type in parentheses if ambiguous.

**Example values:** `lars.lindqvist@stockholmsakeri.se`, `info@malardalen-transport.se (general)`, `not_found`

**How to find:** Company website contact page. Job ad contact details. LinkedIn profile (sometimes listed). Allabolag.se does not list emails but can confirm the VD name to search for.

**Why it matters:** Direct email = significantly higher response rate than a general inbox. A named person's email also enables a personalized opening line. If no email is findable at all, note `not_found` — cold LinkedIn message becomes the primary approach.

**MVP:** No — fill during scoring (after the minimum viable set is collected for all 50 companies).

---

### `phone`

**What it means:** A direct phone number for the decision-maker or company.

**How to fill:** Free text. Include country code for clarity: `+46 8 123 456 78`. Note if it is a direct line versus a main switchboard.

**Example values:** `+46 70 123 45 67 (VD direct)`, `+46 8 987 65 43 (switchboard)`, `not_found`

**Why it matters:** Phone is not the recommended first contact channel for DriverNord (email and LinkedIn are lower-friction for an initial introduction). However, if no email is available, a direct phone call to the owner or transport manager is the alternative. Swedish SME owners typically answer direct calls.

**MVP:** No — fill during scoring if found during research.

---

### `LinkedIn`

**What it means:** The URL of the company's LinkedIn page, or the LinkedIn profile URL of the identified decision-maker.

**How to fill:** Paste the full LinkedIn URL. If both the company page and a decision-maker profile are found, record the decision-maker profile — it is more useful for outreach.

**Example values:**
- `https://www.linkedin.com/company/stockholms-akeri-ab/`
- `https://www.linkedin.com/in/lars-lindqvist-transport/` (decision-maker)
- `not_found`

**Why it matters:** LinkedIn is the primary outreach channel when a direct email is not available. A LinkedIn message to a named transport manager or owner is the second-best cold contact method after direct email. The company page is also useful for estimating size, checking for growth signals, and identifying who posted job ads.

**MVP:** No — fill during scoring.

---

### `decision_maker_name`

**What it means:** The name of the specific person who can approve a pilot — not an HR gatekeeper, not a receptionist, but the person with operational authority.

**How to fill:** Full name as it appears on LinkedIn, the company website, or job ads. If not identifiable, write `not_identified`.

**Decision-maker by segment:**
- Segment A (SME): Owner / VD (CEO)
- Segment B (regional operator): Transport Manager / Driftchef / Operations Director
- Segment C (mid-size): Operations Director / Transport Director (not HR Manager)
- Segment F (enterprise): Do not research — no accessible decision-maker

**Example values:** `Lars Lindqvist`, `Maria Björk`, `not_identified`

**How to find:** Company website "Om oss" or "Team" page. LinkedIn search "transport manager [company name]" or "VD [company name]". Job ad posted by a named recruiter (they can sometimes route to the right person).

**Why it matters:** A named contact in the outreach message doubles response rates. "Hej Lars" versus "Hej" is the difference between a personal message and spam. Do not send outreach without a name if it can be found.

**MVP:** No — fill during scoring for top 10 candidates. Attempt to find for all 50 during the scoring pass.

---

### `decision_maker_role`

**What it means:** The role title of the identified decision-maker.

**How to fill:** Use a standardized role label. Free text is acceptable but keep consistent across the sheet.

**Common values:** `owner`, `VD`, `transport_manager`, `driftchef`, `operations_director`, `logistics_manager`, `HR_manager` (flag as gatekeeper), `unknown`

**Example values:** `owner`, `transport_manager`, `VD`, `HR_manager (gatekeeper — find ops contact)`

**Why it matters:** Role determines the outreach template to use. Owner/VD → Template A. Transport manager → Template B. If only HR is identified, the approach strategy changes — HR managers are gatekeepers for driver hiring decisions, not decision-makers.

**MVP:** No — fill during scoring.

---

### `procurement_page`

**What it means:** The URL of the company's supplier or procurement page, if one exists.

**How to fill:** Full URL if found. Write `none` if no supplier page is visible on the company website.

**Example values:** `https://company.se/leverantorer`, `https://company.se/supplier-portal`, `none`

**How to find:** Check the company website footer for "Leverantörer", "Suppliers", "Become a partner", "For vendors." Also check Google: `"[company name]" leverantörer site:company.se`.

**Why it matters:** The presence of a procurement page is the primary signal of formal vendor approval requirements. A supplier portal URL = the company routes new vendors through a structured process = higher barrier = lower pilot feasibility score. `none` = no visible formal process = lower barrier.

**MVP:** No — fill during scoring. Essential for accurate barrier assessment.

---

### `supplier_requirements_url`

**What it means:** A direct URL to any documented supplier requirements, code of conduct, or vendor onboarding documentation.

**How to fill:** Full URL if found. Write `none_found` if no document is publicly accessible.

**Example values:** `https://company.se/files/supplier-code-of-conduct.pdf`, `none_found`

**Why it matters:** Supplier requirement documents specify exactly what barriers DriverNord would face: insurance thresholds, financial stability requirements, GDPR obligations, code of conduct signature. Reviewing the document before contact means the approach can be tailored — or the company can be deprioritized before time is invested.

**MVP:** No — fill during scoring if procurement page exists.

---

### `barrier_level`

**What it means:** An overall classification of how difficult it would be to begin a pilot with this company, based on all observable barriers.

**How to fill:** Choose one value. Base it on everything found during research — procurement page, company size, decision-maker access, and the pilot feasibility score.

**Allowed values and definitions:**

| Value | Score range | Definition |
|---|---|---|
| `low` | 70–100 | No supplier portal, direct decision-maker contact findable, no visible formal vendor process. Pilot can start with an email agreement. A DPA may be needed but is not a blocker. |
| `medium` | 45–69 | Some process exists (HR involvement, brief internal approval needed, simple service agreement required) but no formal procurement portal. Pilot feasible with one reference and a simple DPA. |
| `high` | 20–44 | Formal procurement process, vendor panel, or significant HR gating. Pilot requires documentation (DPA, references, insurance confirmation). Not suitable until DriverNord has 3+ pilot wins. |
| `enterprise_only` | 0–19 | Large enterprise with central procurement, supplier portal, and no visible local entry. Research benchmark only. No outreach at current stage. |

**Example values:** `low`, `medium`, `high`, `enterprise_only`

**Why it matters:** The most actionable field in the sheet. `low` = contact now. `enterprise_only` = do not contact. Everything in between is queued by priority.

**MVP:** Yes — estimate during collection using company size and visible procurement signals. Refine during scoring.

---

### `barrier_notes`

**What it means:** Specific, concrete notes about the barriers identified for this company. Not a repeat of the `barrier_level` classification — the actual evidence.

**How to fill:** Free text. Be specific. Include what you found, where you found it, and what it implies.

**Example values:**
- `Has Jobzone framework agreement visible on LinkedIn. May have exclusivity clause. Approach as complementary not replacement.`
- `Supplier portal found at company.se/leverantorer. Requires insurance certificate and credit check. Enterprise caution flag.`
- `No supplier page visible. Owner named Lars Lindqvist on website. Phone number listed. No visible procurement process.`
- `HR manager posted the job ad. Company has 200+ employees on LinkedIn. Operations Director is the real decision-maker — not yet identified.`
- `Repeated CE ads on Arbetsförmedlingen (3 ads in last 60 days). No visible formal process. Owner accessible.`

**Why it matters:** This field is what makes the sheet usable for outreach. When you sit down to write a message to a company, `barrier_notes` tells you what to address, what to avoid mentioning, and what documentation to have ready.

**MVP:** No — fill during scoring. Brief notes during collection are welcome if something notable is found immediately.

---

### `pilot_accessibility_score`

**What it means:** A 0–100 numeric score representing how feasible it is to begin a pilot with this company. Higher score = easier to start = higher priority. This is the primary ranking field for selecting the top 10 from 50.

**This maps to the Pilot Feasibility Score defined in the framework (Section 5.1).** The column is named `pilot_accessibility_score` in the sheet to make its purpose clear during collection and scoring.

**How to fill:** Sum the scores from all 7 dimensions (see scoring instructions below). Enter the integer total.

**Score ranges:**
- 70–100 → `barrier_level = low` → Immediate target
- 45–69 → `barrier_level = medium` → Pursue after first win
- 20–44 → `barrier_level = high` → Hold until 3+ pilot wins
- 0–19 → `barrier_level = enterprise_only` → Research only

**Example values:** `87`, `62`, `41`, `12`

**MVP:** No — fill during scoring pass, not during collection.

---

### `opportunity_score`

**What it means:** A qualitative assessment of the business upside if a pilot with this company succeeds. Separate from pilot accessibility — a company may be easy to reach (high accessibility) but represent small volume (low opportunity), or hard to reach (low accessibility) but represent very large volume (high opportunity).

**How to fill:** Choose one value based on the signals below.

**Allowed values:**
- `low` — Small fleet (under 10 trucks), one-time need, minimal referral value, no growth signal
- `medium` — Meaningful fleet (10–50 trucks), recurring driver need, some referral potential in regional network
- `high` — Large fleet (50+ trucks), chronic and recurring need, strong referral network, growth signal, or multiple transport domains

**Signals to assess:**
- Fleet size estimate (from website, Google Maps, LinkedIn)
- Frequency of driver ads (recurring = higher opportunity)
- Multiple transport domains in use (more matching opportunities)
- Growth signals (new contracts, expanded routes, LinkedIn company news)
- Network position (industry association membership, prominent in regional transport community)

**Example values:** `low`, `medium`, `high`

**Why it matters:** Pilot accessibility tells you who to contact first. Opportunity score tells you which wins matter most. Ideal: high accessibility + high opportunity. Acceptable: high accessibility + medium opportunity. Use both scores together when selecting the top 10.

**MVP:** No — fill during scoring.

---

### `recommended_entry_point`

**What it means:** The specific person, channel, and opening that is recommended for first contact with this company.

**How to fill:** Free text. Be concrete — name the person, the channel, and the first message approach.

**Example values:**
- `Email Lars Lindqvist (owner) directly. Reference the CE ad posted on Arbetsförmedlingen 2026-05-03. Lead with shortlist concept.`
- `LinkedIn message to Maria Björk (transport manager). Note: she posted the job ad herself — reference it directly.`
- `Company has no direct contact. Call main number, ask for transport manager. Do not use general info email.`
- `Approach via agency partner first (they use Simplex Bemanning). Contact Simplex directly as a potential driver pool supplier.`

**Why it matters:** When you are ready to contact a company, this field should give you everything you need in one sentence. It removes decision-making from the outreach step, which reduces the risk of writing a generic message.

**MVP:** No — fill during scoring for top 10 candidates.

---

### `next_action`

**What it means:** The single most important next step for this company, at the current moment in the research and outreach process.

**How to fill:** One specific, actionable instruction. Update this field as the company progresses through the pipeline.

**Example values during collection:**
- `Find decision-maker name on LinkedIn`
- `Check ad history on Arbetsförmedlingen for repeat postings`
- `Verify if supplier portal requires registration before contact`

**Example values during scoring:**
- `Score all 7 dimensions — barrier_notes incomplete`
- `Ready to contact — prepare Template A outreach`

**Example values during outreach:**
- `Send initial email — use Template A`
- `Follow up email 7 days after first contact`
- `Schedule 20-minute call — week of 2026-05-20`
- `Declined — archive, revisit in 3 months`

**Why it matters:** This is the operational field that keeps the sheet alive. Without a clear next action, companies sit in the sheet indefinitely and nothing happens. After every interaction (research, contact, conversation), update this field before moving to the next company.

**MVP:** Yes — enter a brief next action during collection (e.g., "check ad history" or "find decision-maker"). It does not need to be complete.

---

### `research_status`

**What it means:** Where this company is in the research process.

**How to fill:** Choose one value. Update as work progresses.

**Allowed values:**
- `not_started` — Company identified but no research done beyond minimum viable fields
- `in_progress` — Actively being researched (scoring in progress, decision-maker being identified)
- `complete` — All relevant columns filled, score assigned, barrier classified, next action set
- `on_hold` — No visible driver need at this time — revisit when a need appears
- `disqualified` — Does not meet qualification rules (see below). Do not invest further time.

**Example values:** `not_started`, `complete`, `on_hold`

**MVP:** Yes — set to `not_started` during collection. Upgrade as work progresses.

---

### `last_checked_date`

**What it means:** The date the research for this company was last verified or updated.

**How to fill:** ISO 8601 date format: `YYYY-MM-DD`. Update every time you touch this row.

**Example values:** `2026-05-10`, `2026-05-18`

**Why it matters:** Job ads expire. Company contacts change. Procurement processes change. A company that had `barrier_level = high` in May may have changed leadership or dropped a vendor panel by August. This field tells you when the data was last verified and whether it needs refreshing before outreach.

**MVP:** Yes — fill with the date of initial collection.

---

### `source_notes`

**What it means:** Free-text notes on where the data came from, what was found, and any context that does not fit cleanly into other columns. Also the place to preserve evidence from job ads that may expire.

**How to fill:** Free text. Include:
- Source platform (Arbetsförmedlingen, Blocket, LinkedIn, Google, Åkeriföretagen directory)
- Key information from the job ad (role title, start date, key requirements mentioned)
- Any context that informed a scoring decision
- Anything unusual or worth remembering

**Example values:**
- `Source: Arbetsförmedlingen. Ad title: "CE-chaufför distribution, omgående". Posted 2026-05-03. Requires CE, YKB, förarkort. Contact: lars@company.se listed in ad.`
- `Source: Blocket Jobb + company website. No direct email. VD name from company website About page. LinkedIn profile found for VD.`
- `Source: Åkeriföretagen member directory Stockholm. No active job ad found — adding to on_hold.`
- `Source: LinkedIn. Company uses Simplex Bemanning for driver hiring (visible from recruiter posts). Possible Segment D/agency track.`

**Why it matters:** Job ads disappear. This is the only field that captures the raw evidence before it expires. A row with a dead `job_ads_url` is still useful if `source_notes` recorded the job title, requirements, and posting date.

**MVP:** Yes — paste the key evidence from the job ad immediately during collection.

---

## Scoring Instructions

Apply these scoring rules during the scoring pass (after all 50 companies are collected). Score each of the 7 dimensions independently. Sum for the total `pilot_accessibility_score`.

### Dimension 1 — Visible Driver Need (max 25 points)

| Points | Condition |
|---|---|
| 25 | Active job ad for C, CE, or D driver right now (found during this research session) |
| 15 | Job ad posted within the last 30 days (confirmed by posting date) |
| 8 | Driver hiring mentioned on website or company LinkedIn, but no active ad |
| 0 | No visible driver need signal |

**Note:** If `visible_driver_need = no`, enter 0 for this dimension and consider setting `research_status = on_hold`.

---

### Dimension 2 — Stockholm / Regional Fit (max 15 points)

| Points | Condition |
|---|---|
| 15 | Stockholm city or immediate area (within 30km of city center) |
| 12 | Stockholm region (Stockholms län, beyond 30km) |
| 10 | Uppsala county |
| 8 | Sörmland or Mälardalen |
| 5 | Elsewhere in Sweden |
| 0 | Outside Sweden |

---

### Dimension 3 — Transport Domain Fit (max 15 points)

| Points | Condition |
|---|---|
| 15 | Primary domain requires CE + YKB (ekipage, fjarrtransport, kylfrys, tanker, silo, adr) |
| 12 | CE required but domain is mixed or partially YKB-relevant |
| 10 | C license roles (rigid truck, no trailer) |
| 8 | Multiple domains including both CE and C roles |
| 5 | Domain unclear or mixed (no license class specified in ads) |
| 0 | Domain outside DriverNord scope (van, car, forklift, warehouse) |

---

### Dimension 4 — Decision-Maker Accessibility (max 15 points)

| Points | Condition |
|---|---|
| 15 | Owner or VD directly contactable — email or LinkedIn profile found |
| 12 | Transport manager or driftchef named and reachable on LinkedIn or company website |
| 10 | Transport manager role identified but specific person not yet named |
| 5 | Only HR manager or general inbox found (gatekeeper — operations decision-maker unknown) |
| 0 | No contact information of any kind found |

---

### Dimension 5 — Procurement Simplicity (max 15 points)

| Points | Condition |
|---|---|
| 15 | No supplier page found. No visible vendor process. Email agreement is sufficient. |
| 12 | Simple service agreement likely required but no formal portal |
| 8 | HR process involved but no formal vendor panel or procurement portal |
| 4 | Formal supplier registration page found (but process may be bypassable for small pilots) |
| 0 | Formal procurement portal required (Visma, Mercell, Coupa, Workday procurement) |

---

### Dimension 6 — Urgency Signal (max 10 points)

| Points | Condition |
|---|---|
| 10 | Repeated ads: two or more ads for similar driver role in the last 60 days |
| 7 | Single active ad for a driver role right now |
| 5 | Ad expired within last 30 days (role may still be open) |
| 3 | Driver hiring mentioned on site or LinkedIn but no active ad |
| 0 | No urgency signal |

---

### Dimension 7 — Trust / Pilot Openness (max 5 points)

| Points | Condition |
|---|---|
| 5 | Personal connection or warm introduction available to this company |
| 4 | Company has inbound connection to DriverNord (followed, clicked, emailed) |
| 3 | Company appears tech-forward or innovation-interested (LinkedIn content, website language) |
| 1 | Standard traditional operator — no particular openness signal, but no resistance signals either |
| 0 | Strong resistance signals visible ("approved vendors only", "we only use established agencies") |

---

## Barrier Level Definitions

| Level | Score | What it means | Action |
|---|---|---|---|
| `low` | 70–100 | Direct decision-maker access. No formal procurement. A simple email agreement is sufficient. DPA may be needed but will not block the pilot. | **Contact now.** Use outreach Template A or B. |
| `medium` | 45–69 | Some process exists. HR may be involved. Simple service agreement likely required. Possibly using a staffing agency. Pilot feasible with one reference and a simple DPA. | **Queue for after first SME pilot win.** |
| `high` | 20–44 | Formal process, vendor panel, or procurement portal. References and documentation required. Not suitable at pre-pilot stage. | **Hold. Revisit after 3+ pilot wins.** |
| `enterprise_only` | 0–19 | Large enterprise. Central procurement. No accessible decision-maker at pilot stage. Research benchmark only. | **No outreach. Research supplier requirements for future planning.** |

---

## Qualification Rules

A company must pass all four to enter the active outreach queue:

1. **Driver need visible:** `visible_driver_need = yes` OR a credible recent signal (ad expired in last 30 days).
2. **License class match:** `license_mentions` includes `C`, `CE`, `C+D`, or `CE+D`. Companies requiring only `B` (car/van) license are outside DriverNord's scope.
3. **Geographic reach:** `region` is one of: `stockholm`, `stockholm_region`, `uppsala`, `soermland`, `malardalen`. Companies in Norrland, Skåne, or abroad require separate evaluation.
4. **Segment is A, B, C, D, E, or agency:** Segment F companies never enter the outreach queue regardless of score.

---

## Disqualification Rules

Remove from the active outreach queue (set `research_status = disqualified`) if any of the following apply:

| Condition | Reason |
|---|---|
| Only `B` license roles in all job ads | Outside DriverNord's C/CE/D driver pool scope |
| `segment = F` and no local depot entry path identified | Enterprise procurement is a 6–18 month process; no pilot possible now |
| `pilot_accessibility_score < 20` and company is not a named large account | Below minimum feasibility threshold; better candidates exist |
| Company is a public agency or municipality (Kommunförbundet, etc.) | Public procurement rules apply — separate legal process entirely |
| Company has stated exclusivity with a single staffing agency and no evidence of flexibility | Exclusivity clause makes pilot impossible without displacing the agency |
| No driver need visible AND company size is `large` or `medium` | Low-urgency + high-barrier = poor use of time at current stage |

**Disqualification is not permanent.** Set `next_action = revisit YYYY-MM-DD` with a date 60–90 days out.

---

## How to Select the Top 10 from 50

After all 50 companies are scored, apply this selection process:

### Step 1 — Eliminate disqualified companies
Remove any company that triggered a disqualification rule. Do not include them in the top 10 selection.

### Step 2 — Sort by pilot_accessibility_score descending
The company with the highest score appears first.

### Step 3 — Apply segment weighting
If two companies have identical scores, prefer:
- Segment A over Segment B over Segment C
- Segment E tag (repeated ads) over no E tag
- Higher opportunity_score over lower

### Step 4 — Check the top 15 for practical coverage
Before finalizing the top 10, check that the group includes:
- At least 5 Segment A companies (SME — the primary target)
- At least 2 companies with `urgency_signal = repeated_ads`
- No more than 2 Segment C companies (mid-size — not enough references yet)
- Zero Segment F companies

If the natural sort does not produce this composition, make adjustments manually and note the reason in `source_notes`.

### Step 5 — Complete the research for the top 10
For the selected 10 companies only:
- Verify `decision_maker_name` and `decision_maker_role`
- Confirm `contact_email` or `linkedin_url` for the decision-maker
- Complete `barrier_notes` with specific evidence
- Write `recommended_entry_point` as a concrete instruction
- Set `next_action` to the specific outreach action

The remaining 40 companies stay in the sheet at `research_status = complete` (scored) or `not_started` / `in_progress`. They are the second wave.

---

## How to Avoid Wasting Time on Enterprise Accounts Too Early

Apply this quick-filter before investing research time in any company:

**Immediate stop signals** — if any of these apply, classify as `enterprise_only`, enter it in the sheet for benchmark tracking, and move on:

1. **Company LinkedIn shows 500+ employees** → Segment F. Enter in sheet. Do not research further at this stage.
2. **Company website has a dedicated "Leverantörer" or "Supplier registration" page** → Formal procurement required. Score and classify, but do not prioritize.
3. **Job ad routes to Workday, SuccessFactors, or Taleo** → Enterprise ATS. Central HR manages hiring. No direct transport manager access via the ad.
4. **Company is a named brand** (PostNord, DHL, Bring, Schenker) → Benchmark research only. Already covered in the framework.
5. **Company website has no transport operations content** — only corporate/investor content → Not an operational transport company; likely a holding company or logistics software vendor.

**Time budget for enterprise account research:** Maximum 15 minutes per named large account. Sufficient to record: website, company size, procurement page URL, supplier requirements URL, and barrier notes. No decision-maker research. No contact email. Set `research_status = complete` and `barrier_level = enterprise_only`.

---

## Field Completion Guide by Research Phase

| Column | Collection (all 50) | Scoring (all 50) | Top 10 deep dive |
|---|---|---|---|
| `company_name` | Required | — | — |
| `website` | Required | — | — |
| `region` | Required | — | — |
| `city` | Required | — | — |
| `company_size` | Required | — | — |
| `segment` | Required | — | — |
| `transport_domain` | Required | — | — |
| `visible_driver_need` | Required | — | — |
| `job_ads_url` | Required | — | — |
| `license_mentions` | Required | — | — |
| `YKB_mentions` | Required | — | — |
| `driver_card_mentions` | If visible | Required | — |
| `urgency_signal` | Estimate | Required | — |
| `contact_email` | If visible in ad | — | Required |
| `phone` | If visible in ad | — | If not found in collection |
| `LinkedIn` | If visible | — | Required |
| `decision_maker_name` | If obvious | — | Required |
| `decision_maker_role` | If obvious | — | Required |
| `procurement_page` | — | Required | — |
| `supplier_requirements_url` | — | If found | — |
| `barrier_level` | Estimate | Required | — |
| `barrier_notes` | Brief if notable | Required | Detailed |
| `pilot_accessibility_score` | — | Required | — |
| `opportunity_score` | — | Required | — |
| `recommended_entry_point` | — | — | Required |
| `next_action` | Brief | Updated | Specific |
| `research_status` | `not_started` | Updated | `complete` |
| `last_checked_date` | Required | Updated | — |
| `source_notes` | Required | Updated | — |
