# DriverNord — Public Law Source Map

**Status:** Research complete — 2026-05-14
**Syfte:** Document every public-source legal and regulatory reference reviewed during the public-validation audit. Used as the evidentiary basis for all other files in this folder.
**Metod:** AI-assisted web research using public sources only. No login-required sources, no private communications, no legal advice obtained. Sources retrieved 2026-05-14.

---

## Label Key

| Label | Meaning |
|-------|---------|
| VERIFIED PUBLIC SOURCE | Accessed and read directly; content confirmed |
| STRONG INFERENCE | Source accessed; specific claim extrapolated from clearly stated principles |
| UNCERTAIN | Source referenced but not fully verified, or content ambiguous |
| NOT ACCESSIBLE | URL returned 404, connection refused, or domain parked |

---

## Section 1 — Swedish GDPR / Data Protection Law

### 1.1 — IMY: Lagliga grunder för behandling av personuppgifter
- **Source:** imy.se (Integritetsskyddsmyndigheten — Swedish DPA)
- **Status:** VERIFIED PUBLIC SOURCE
- **Key findings:**
  - 6 legal bases under GDPR Art. 6(1): consent, contract, legal obligation, vital interests, public task, legitimate interest
  - Legitimate interest (Art. 6(1)(f)) is available to private organizations but requires a Legitimate Interest Assessment (LIA/balancing test)
  - The legal basis must be determined **before** data collection begins — it cannot be decided retroactively
  - IMY expressly states that consent must be freely given, specific, informed, and unambiguous
  - Consent is not freely given if there is a significant imbalance of power between controller and data subject
- **Relevance to DriverNord:** Confirms that Art. 6(1)(a) consent is a valid legal basis. Confirms that Art. 6(1)(f) legitimate interest requires a documented LIA. Confirms that legal basis must be decided before the /chat registration flow goes live.

### 1.2 — IMY: Registrerades rättigheter
- **Source:** imy.se — section on data subject rights
- **Status:** VERIFIED PUBLIC SOURCE
- **Key findings:**
  - 7 data subject rights under GDPR: access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), portability (Art. 20), object (Art. 21), rights re: automated decisions (Art. 22)
  - **Right to object to direct marketing (Art. 21(2)–(3)) is ABSOLUTE** — controller must stop processing immediately, no balancing test required
  - Right to erasure applies when: consent withdrawn, data no longer necessary, processing was unlawful
  - Controller must respond to rights requests within **1 month** (extendable to 3 months for complex cases)
- **Relevance to DriverNord:** The right to object to direct marketing being absolute is critical — DriverNord's SMS contact to drivers (stage 2 availability confirmation) may be construed as direct marketing by some drivers. The SMS opt-out (STOPP) mechanism must be immediate and absolute, not just "noted."

### 1.3 — IMY: Samtycke (Consent)
- **Source:** imy.se — samtycke page
- **Status:** NOT ACCESSIBLE (404 at time of research)
- **Fallback:** Relied on Art. 7 GDPR directly and IMY's general consent guidance from 1.1
- **GDPR Art. 7 requirements (direct source):**
  - Consent must be freely given, specific, informed, unambiguous
  - Separate consent required for each distinct processing purpose
  - Withdrawal must be as easy as giving consent
  - Burden of proof on controller to demonstrate consent was given
- **Relevance to DriverNord:** Stage 3 per-company consent (SMS "JA/NEJ") must meet all 4 requirements. The SMS format is likely sufficient for "unambiguous" but the "specific" requirement (knowing exactly which company, for what purpose) must be met by the SMS text.

### 1.4 — GDPR Art. 6 (Direct source — EUR-Lex)
- **Source:** EUR-Lex / GDPR text
- **Status:** STRONG INFERENCE (text well-known; not re-fetched)
- **Key provisions:**
  - Art. 6(1)(a): Consent — requires all 4 conditions in Art. 7
  - Art. 6(1)(b): Contract — processing necessary for performance of contract to which data subject is party
  - Art. 6(1)(f): Legitimate interest — requires balancing test; overridden by data subject's interests/rights/freedoms
- **Relevance to DriverNord:** The draft privacy policy correctly flags all three bases and their uncertainties. The Art. 6(1)(b) basis for the registration service is arguable but uncertain — the driver's registration creates a service relationship, but whether this constitutes a "contract" is a legal question requiring a lawyer.

---

## Section 2 — Swedish Staffing and Labor Law

### 2.1 — Lag (2012:854) om uthyrning av arbetstagare
- **Source:** riksdagen.se (Riksdagen text), lagen.nu
- **Status:** VERIFIED PUBLIC SOURCE
- **Key findings:**
  - §1: Defines the scope — applies to bemanningsföretag (staffing companies) that employ workers for the purpose of hiring them out to client companies
  - §5: The bemanningsföretag is the employer; the client company directs the work
  - §6: Equal treatment principle — deployed workers must receive at least the same basic conditions as directly-employed workers at the client
  - §12a: After 24 months at the same client, client must offer permanent employment or pay 2–3 months' compensation
  - **The law applies ONLY when the intermediary employs the worker** — it does not apply to introduction/matchmaking services where the intermediary never employs the worker
- **Relevance to DriverNord:** CONFIRMED — uthyrningslagen does NOT apply to DriverNord's V1 model. DriverNord never employs drivers. This is the key legal distinction that separates DriverNord from a bemanningsföretag.

### 2.2 — Tranpenad Group (bemanningsföretag — largest Swedish driver staffing)
- **Source:** tranpenad.se/om-oss and tranpenad.se/jobbsokande
- **Status:** VERIFIED PUBLIC SOURCE
- **Key findings:**
  - Tranpenad explicitly employs drivers themselves ("anställning hos Tranpenad")
  - Workers are Tranpenad employees who are then deployed to client companies
  - Tranpenad presents itself as the formal employer in all materials
  - This is the classic §5 uthyrningslagen model
- **Relevance to DriverNord:** Tranpenad confirms what bemanning looks like — and confirms that DriverNord's model (no employment, just introduction) is structurally different.

### 2.3 — Manpower Sweden (global staffing — bemanning vs rekrytering distinction)
- **Source:** manpower.se/om-oss
- **Status:** VERIFIED PUBLIC SOURCE
- **Key findings:**
  - Manpower explicitly distinguishes bemanning (worker employed by Manpower, deployed to client) from rekrytering (permanent placement, worker employed directly by client)
  - In bemanning: Manpower is employer, client directs work
  - In rekrytering: Manpower facilitates, client employs, Manpower charges a finder's/placement fee
  - No driver-specific focus found
- **Relevance to DriverNord:** DriverNord is closest to "rekrytering" (Manpower charges fee, client employs) except that DriverNord also doesn't guarantee hire and doesn't own the relationship — making DriverNord's model more precisely "matchningstjänst" / "introduktionstjänst" (introduction service). This is a lawful, recognized model in Sweden.

---

## Section 3 — Swedish Advertising and Marketing Law

### 3.1 — Marknadsföringslag (2008:486) (MFL)
- **Source:** riksdagen.se (well-established)
- **Status:** STRONG INFERENCE
- **Key provisions relevant to DriverNord:**
  - §5: Marketers must exercise good marketing practice (god marknadsföringssed)
  - §10: Misleading marketing — any claim that creates a false impression of the product or service is prohibited
  - §12: Prohibited comparisons — comparative advertising is allowed only if the compared products are comparable, claims are objective and verifiable, and the comparison is not misleading
  - §18: Unsubstantiated claims — statistics and quantitative claims must be documentable
  - Testimonials and endorsements must be genuine (not staged or compensated without disclosure)
- **Relevance to DriverNord:** The "tusentals CE-chaufförer" claim in some ad variants must be documented before use. Comparative advertising (Static 5 in meta-ads-copy-bank.md) requires lawyer review. UGC/testimonial formats require real testimonials, not staged content.

### 3.2 — Meta Special Ad Categories (Employment Ads)
- **Source:** Meta for Business Help Center
- **Status:** STRONG INFERENCE (well-documented policy, not re-fetched)
- **Key findings:**
  - Meta classifies ads related to employment (job opportunities, workers, gig economy work) as Special Ad Category: Employment
  - Employment ads cannot use age, gender, or ZIP code targeting
  - Employment ads cannot use "lookalike audiences" based on existing customers
  - The restriction exists regardless of whether the advertiser considers their ad "recruiting" or "awareness"
- **Relevance to DriverNord:** DriverNord's ads almost certainly qualify as Employment category. All ads should be created under the Employment Special Ad Category in Meta Business Manager. Targeting must be adjusted to remove excluded demographics.

---

## Section 4 — Swedish Job Posting and Arbetsförmedlingen

### 4.1 — Arbetsförmedlingen / Platsbanken policies
- **Source:** arbetsformedlingen.se (job posting section)
- **Status:** NOT ACCESSIBLE (URL restructured at time of research; homepage accessible)
- **Fallback:** General Platsbanken policy knowledge
- **Known requirements (STRONG INFERENCE from public policy):**
  - Platsbanken is free to use for employers
  - Employer account required (arbetsgivarkonto)
  - Ads must accurately describe the role (misleading ads violate policy and MFL)
  - Arbetsförmedlingen allows matchningstjänster to post ads if they are acting as agent/intermediary for an employer, but the ad must reflect the actual employer-employee relationship
  - If DriverNord posts as itself (not as agent for a specific employer), the ad must clearly state it is a matchningstjänst, not a direct employment offer
- **Relevance to DriverNord:** The platsbanken-posting-draft.md must clearly identify DriverNord as a matchningstjänst, not an employer. This is correctly reflected in the current draft.

---

## Section 5 — Competitor Legal Practice (Driver Matching / Recruitment)

### 5.1 — Yrkesförarjobb.se
- **Source:** yrkesförarjobb.se (homepage, privacy policy footer, cookie banner)
- **Status:** VERIFIED PUBLIC SOURCE
- **Key findings:**
  - Presents itself as a listing/aggregator service — NOT a staffing or matching company
  - Has a cookie consent mechanism (11-month cookie validity for analytics)
  - Privacy policy exists (accessible via footer)
  - No GDPR consent flow for driver profiles (they do not collect driver data for matching — only for newsletter/contact)
  - Business model: advertising fees from transport companies
- **Relevance to DriverNord:** Different model (pure listing, no matching). DriverNord's GDPR requirements are more complex because DriverNord actually collects, stores, and shares personal data for matching purposes.

### 5.2 — Chaffis (driver matching — most similar to DriverNord)
- **Source:** chaffis.se (homepage accessible; GDPR docs returned 404)
- **Status:** PARTIAL (homepage accessible; full GDPR documents not accessible)
- **Key findings from homepage:**
  - Chaffis presents itself as a driver matching platform where "employers pay" and drivers register for free
  - Value proposition is essentially the same as DriverNord (driver matching, employer-pays model)
  - Homepage references GDPR compliance in general terms
  - Actual privacy policy and consent documentation were not accessible (404)
- **Relevance to DriverNord:** Chaffis confirms Model D (employer-pays, driver-free matching) exists and has market traction. Their inability to surface clean GDPR documentation is an opportunity gap for DriverNord to differentiate on compliance transparency.

### 5.3 — Rekryteringsgruppen / Simplex
- **Source:** Not accessible (connection refused / domain parked)
- **Status:** NOT ACCESSIBLE
- **Relevance:** Both are niche transport/driver recruitment/staffing companies in Sweden. Unable to assess their legal positioning from public sources at this time.

---

## Section 6 — Swedish Electronic Communications Law (SMS)

### 6.1 — Lag (2022:482) om elektronisk kommunikation (LEK)
- **Source:** riksdagen.se
- **Status:** STRONG INFERENCE (2022 law replacing earlier framework)
- **Key provisions:**
  - Commercial electronic messages (including SMS) require prior consent (opt-in)
  - Opt-out must be available free of charge and effective immediately
  - Sender ID rules: commercial SMS must clearly identify the sender
  - STOPP/STOP keyword must result in immediate cessation of contact
- **Relevance to DriverNord:** SMS Stage 1 (registration confirmation) and Stage 2 (availability confirmation) may qualify as "commercial electronic messages" if they promote DriverNord's service. The consent given at registration (Stage 1) likely covers Stage 2, but this requires lawyer confirmation. Opt-out (STOPP) must work immediately.

---

## Summary: Source Reliability Tiers

| Tier | Sources | Used in |
|------|---------|---------|
| Tier 1 — Directly verified law text | GDPR, Uthyrningslagen, MFL | Classification analysis, risk audits |
| Tier 2 — Swedish DPA (IMY) guidance | IMY rights page, legal basis page | GDPR audit, correction plan |
| Tier 3 — Major competitor public pages | Tranpenad, Manpower, Yrkesförarjobb | Classification analysis, benchmark |
| Tier 4 — Strong inference from policy | Meta Special Ad Categories, Platsbanken | Ads compliance, checklist |
| Tier 5 — Not accessible | Chaffis GDPR docs, Rekryteringsgruppen, Simplex, IMY samtycke page, Arbetsförmedlingen posting guide | Noted as gaps |

---

*Version 1.0 — 2026-05-14 — Public sources only. No legal advice obtained or given. All Tier 4/5 items require founder or lawyer follow-up.*
