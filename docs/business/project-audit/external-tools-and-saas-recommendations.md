# DriverNord — External Tools and SaaS Recommendations

**Audit date:** 2026-05-14  
**Purpose:** Identify external tools and services that would materially advance DriverNord's market intelligence, operations, or product — grouped by category.  
**Governing constraint:** Recommendations only. No accounts created, no costs incurred from this document.

Each tool entry includes: **what it is**, **why it helps DriverNord**, **how Claude Code uses it**, **priority**, **estimated cost**, and **risk/caveat**.

---

## Category 1: Swedish Public Company Data

### Allabolag Pro

| Field | Value |
|-------|-------|
| **What it is** | Paid tier of allabolag.se that enables full company register access, structured data export, and SNI-code-based universe browsing |
| **Why it helps** | The free Allabolag tier requires JavaScript rendering for each company page, which limits AI scraping to ~15–20% of the SNI 49410 universe. The Pro tier enables structured queries: "give me all companies with SNI 49410, 5–150 employees, Stockholm postcodes." This would expand the current 63-company database to the estimated 150–250 true universe. Also needed to identify the two hidden targets (WeStaff recycling åkeri, Agil Jordbro åkeri). |
| **How Claude Code uses it** | Once access is granted and data is exportable (CSV/API), Claude Code processes the output to score, rank, and merge with the existing master-company-opportunity-database.csv |
| **Priority** | HIGH |
| **Estimated cost** | ~500–2,000 SEK/month (Pro subscription pricing not publicly confirmed; estimate from comparable Swedish B2B data services) |
| **Risk/caveat** | Must confirm whether the Pro tier supports structured queries or is just an enhanced UI. If it only improves the web interface, AI-driven bulk lookups may still be limited. |

---

### Bolagsverket Direct API

| Field | Value |
|-------|-------|
| **What it is** | Swedish Companies Registration Office API — authoritative source for org numbers, registered names, legal form, board composition |
| **Why it helps** | Resolves entity ambiguity issues (Transportia AB, FrostLine AB, BQ Stockholm, Alfta Frakt Distribution vs. Aktiebolag). Bolagsverket is the authoritative registry; Allabolag is a secondary aggregator. |
| **How Claude Code uses it** | Query by org number or company name; confirm entity existence, legal form, and registered office |
| **Priority** | MEDIUM |
| **Estimated cost** | Free for basic queries; paid for bulk/API access |
| **Risk/caveat** | Manual web queries are currently free. API access may require business registration. |

---

### Transportstyrelsen Yrkestrafiktillstånd Register

| Field | Value |
|-------|-------|
| **What it is** | Swedish Transport Agency database of companies holding commercial road transport permits (yrkestrafiktillstånd). Every legitimate freight transport operator must hold this permit. |
| **Why it helps** | This is the definitive universe of road freight companies in Sweden — more complete than SNI 49410 filtering. The permit database would give DriverNord a verified, exhaustive list of every legitimate åkeri in Stockholm/Mälardalen, including companies that don't appear on job boards and aren't easily discoverable via Allabolag. |
| **How Claude Code uses it** | If the database is accessible as a downloadable file or API, Claude Code processes it to identify companies in the target employee/revenue range that are not in the current master database |
| **Priority** | HIGH |
| **Estimated cost** | Unknown — may require formal public records request (offentlighetsprincipen) |
| **Risk/caveat** | Access method unknown. May require a formal request to Transportstyrelsen. The data format (public search vs. bulk download) affects usability. |

---

### Kreditrapporten.se

| Field | Value |
|-------|-------|
| **What it is** | Swedish credit report service showing payment remarks (betalningsanmärkningar) for companies and individuals |
| **Why it helps** | The excluded-and-caution-list.md includes companies with payment remark CAUTION status (Söder transport, TBA Transporter, Åke Wibergs). Before commercial engagement, their payment remarks should be verified as resolved. Kreditrapporten.se can confirm current status. |
| **How Claude Code uses it** | Lookup specific companies from the caution list; document current payment remark status; update exclusion list with verified resolution dates |
| **Priority** | MEDIUM |
| **Estimated cost** | Per-report pricing (~50–200 SEK/report); bulk subscription available |
| **Risk/caveat** | Individual reports are the appropriate method. Bulk monitoring is an additional cost. |

---

## Category 2: Swedish Transport and License Data

### Transportstyrelsen Driver Register API

| Field | Value |
|-------|-------|
| **What it is** | Swedish Transport Agency register of valid driving licenses and YKB (yrkeskompetensbevis) certificates |
| **Why it helps** | Currently, DriverNord accepts CE/C/D license and YKB declarations at face value from drivers at registration. No verification against an authoritative source occurs. A fake or expired license claim goes undetected. Transportstyrelsen holds the authoritative register. |
| **How Claude Code uses it** | If the API is accessible, it would be used during the `ingestLead()` function to verify license class and YKB status against the official record — transforming a self-declared credential into a verified one. |
| **Priority** | HIGH (strategically) / MEDIUM (operationally, pre-scale) |
| **Estimated cost** | Unknown — API access to the driver register may require a formal agreement with Transportstyrelsen. This may not be publicly available without a specific authorization. |
| **Risk/caveat** | Critical caveat: Transportstyrelsen's driver register is likely not a freely accessible public API. Access may require a data sharing agreement, GDPR-compliant purpose statement, and possible fees. This is a medium-term goal, not a quick win. Until this is available, the "verified credentials" claim should be softened in marketing copy. |

---

### ADR Certificate Verification

| Field | Value |
|-------|-------|
| **What it is** | ADR (transport of dangerous goods) certificates are issued by certified training providers. No central public API exists; verification typically requires contacting the issuing organization. |
| **Why it helps** | ADR is a high-value credential (tank drivers, hazmat) that commands a premium. DriverNord's scoring gives bonus points for ADR. Unverified ADR claims inflate scores. |
| **How Claude Code uses it** | No direct AI tool use — this requires manual verification or driver document upload |
| **Priority** | LOW (pre-scale) |
| **Estimated cost** | Manual verification cost only |
| **Risk/caveat** | ADR certification verification is not currently automated in Sweden. Driver document upload and human review is the practical approach. |

---

## Category 3: Web Intelligence

### Apify or Bright Data (Web Scraping Platform)

| Field | Value |
|-------|-------|
| **What it is** | Managed web scraping infrastructure that handles JavaScript rendering, proxy rotation, and rate-limit compliance |
| **Why it helps** | The Transportjobb.se 404 gap (50–60% of CE ads missed) and the Allabolag JavaScript rendering limitation are the two biggest data coverage gaps. A managed scraping platform handles JS rendering that pure web search cannot. |
| **How Claude Code uses it** | Set up scheduled scrapes of Transportjobb.se, Blocket Jobb transport category, and LinkedIn job postings; Claude Code processes the output to detect repeat-ad patterns and update Market Proof Scores |
| **Priority** | MEDIUM |
| **Estimated cost** | Apify free tier covers modest use; Pro from ~$49/month. Bright Data from ~$500/month for dedicated proxies. |
| **Risk/caveat** | Scraping requires compliance with each site's robots.txt and Terms of Service. Transportjobb.se returning 404 may mean the site is undergoing changes — verify whether scraping is permitted before investing. LinkedIn explicitly prohibits scraping. |

---

### Google Alerts (Free)

| Field | Value |
|-------|-------|
| **What it is** | Google's free monitoring service for new web results matching specified queries |
| **Why it helps** | Automates monitoring for new CE driver job ads from named target companies (e.g., "CE chaufför Kyl Frysexpressen" or "CE chaufför Ahréns Åkeri"). Sends email notifications when new ads appear. |
| **How Claude Code uses it** | Does not use directly — but the alerts feed human-reviewed intelligence. When a new ad appears for a Quadrant B company (previously not advertising), that's a trigger for Claude Code to update the company's Market Proof Score. |
| **Priority** | HIGH |
| **Estimated cost** | Free |
| **Risk/caveat** | Google Alerts coverage is inconsistent — not all job ads are indexed. Best used as a supplementary signal, not a primary monitoring source. |

---

## Category 4: Data Storage and Processing

### Supabase (already in use)

No change recommended. The existing Supabase setup (PostgreSQL + service role client + RLS awareness) is appropriate for the current scale. The key constraint — Local Supabase ONLY for development — must be maintained.

**One enhancement:** Consider enabling Supabase Realtime on the `system_actions` table so the cockpit can receive live updates via WebSocket instead of polling at 15-second intervals.

---

## Category 5: CRM and Outreach

### Pipedrive or HubSpot CRM (when outreach begins)

| Field | Value |
|-------|-------|
| **What it is** | Sales CRM for tracking company relationships, outreach sequences, and pipeline stages |
| **Why it helps** | The top-10 company notes file documents decision-maker contacts in a markdown file. As the target list grows (63 companies in the master database), tracking outreach sequences, responses, and stage transitions in a markdown file becomes operationally unmanageable. |
| **How Claude Code uses it** | Claude Code can export enriched company data from the master-company-opportunity-database.csv into a CRM import format (CSV with standardized columns) for bulk loading |
| **Priority** | MEDIUM (low before outreach begins; high when 10+ companies are in active contact) |
| **Estimated cost** | Pipedrive from ~€14.90/month; HubSpot free CRM tier available |
| **Risk/caveat** | Do not add CRM before outreach is authorized. Using CRM sequencing tools before legal review of outreach templates creates GDPR B2B cold outreach questions (B2B cold email is generally allowed under GDPR for legitimate business interest, but requires opt-out mechanism). |

---

### Lemlist or Instantly (when outreach begins)

| Field | Value |
|-------|-------|
| **What it is** | Email outreach automation with personalization, sequence tracking, and reply detection |
| **Why it helps** | For the top 5 ready-to-approach companies (Canoil, Trabé, Edvardssons, JPC, Enskede Bilexpress), manual email outreach is fine. For the full 14-company Tier 1 list and the 20-company Tier 2 list, manual is not scalable. |
| **How Claude Code uses it** | Draft personalized email templates using company-specific data from the master database; Claude Code generates the per-company personalization fields (company name, specific license type, recent ad reference, VD name); human reviews and approves before sending |
| **Priority** | LOW (not needed until first 5 companies are approached manually) |
| **Estimated cost** | Lemlist from ~$39/month; Instantly from ~$37/month |
| **Risk/caveat** | B2B email outreach to Swedish companies is subject to GDPR. Must include opt-out mechanism and legitimate interest basis. Get legal review before automating. |

---

## Category 6: Driver Acquisition

### Meta Ads (Facebook/Instagram)

| Field | Value |
|-------|-------|
| **What it is** | Social media advertising targeting by profession |
| **Why it helps** | CE/C/D drivers in Sweden are on Facebook (Yrkesförarjobb.se's 5,900 SEK social ad product confirms this is a real driver acquisition channel). Meta Ads can target by job title, industry, and location. |
| **How Claude Code uses it** | Does not automate ad creation directly. Can draft ad copy variants for A/B testing. Can analyze ad performance data (click rates, registration conversion) to optimize targeting. |
| **Priority** | HIGH (for driver acquisition phase) |
| **Estimated cost** | Variable; budget recommendation: 5,000–15,000 SEK/month for initial phase targeting Stockholm drivers |
| **Risk/caveat** | All ad copy must comply with the consent requirements in the GDPR driver intake chain. Ads must not make misleading claims about job availability. Must have a reviewed privacy policy before running ads. |

---

### Platsbanken (Arbetsförmedlingen)

| Field | Value |
|-------|-------|
| **What it is** | Swedish Public Employment Service job board — free to post, wide reach, actively used by drivers |
| **Why it helps** | CE/C/D drivers are not uniformly on social media. Platsbanken reaches drivers who actively search job boards. Cost: free. |
| **How Claude Code uses it** | Does not directly interact. Can draft the job posting text in correct Swedish format. |
| **Priority** | HIGH (when driver acquisition begins) |
| **Estimated cost** | Free |
| **Risk/caveat** | Platsbanken listings must accurately describe the opportunity. DriverNord is not an employer — the ad must clearly state that DriverNord is a placement service connecting drivers with transport companies, not offering direct employment. |

---

### Blocket Jobb

| Field | Value |
|-------|-------|
| **What it is** | Sweden's largest general classifieds site with a jobs section; commonly used for blue-collar recruitment |
| **Why it helps** | CE driver ads appear here regularly (confirmed in market monitoring). Driver acquisition ads should appear where drivers search. |
| **How Claude Code uses it** | Draft ad copy. Cannot post directly. |
| **Priority** | MEDIUM |
| **Estimated cost** | 1,500–5,000 SEK per 30-day ad |

---

## Category 7: Verification and Trust

### Signicat or Scrive (Swedish BankID)

| Field | Value |
|-------|-------|
| **What it is** | Swedish BankID integration providers for identity verification and digital signatures |
| **Why it helps** | Chaffis.se already uses BankID for digital contracts (confirmed public feature). Adding BankID to DriverNord's driver registration would: (1) verify the driver's identity against their national ID, (2) make consent records legally stronger (BankID-signed consent is harder to repudiate), (3) match competitor feature set. |
| **How Claude Code uses it** | Does not integrate directly. Can draft the API integration spec once a provider is chosen. |
| **Priority** | MEDIUM (HIGH if Förartjänst.se and Chaffis have BankID and DriverNord doesn't) |
| **Estimated cost** | Scrive from ~SEK 400/month basic; per-signature pricing ~3–15 SEK |
| **Risk/caveat** | BankID integration requires a formal agreement with a BankID-authorized provider (Signicat, Scrive, etc.) and a technical integration sprint. Not a quick win — 1–2 weeks of engineering. |

---

### Checkr or Verifiera (Background Check)

| Field | Value |
|-------|-------|
| **What it is** | Background check services for employment screening |
| **Why it helps** | Transport companies placing drivers in ADR, pharmaceutical cold chain (Thermobud), or security-sensitive environments may require background checks. Offering pre-screened drivers (license verified + background check) commands a premium fee. |
| **How Claude Code uses it** | Process check results; update `ingested_drivers` with verification fields |
| **Priority** | LOW (Phase 2+) |
| **Estimated cost** | Per-check pricing: typically 200–500 SEK per driver |
| **Risk/caveat** | Background checks for employment purposes in Sweden are subject to strict rules (what can be checked, consent requirements). Legal review required before offering this. |

---

## Category 8: Monitoring and Observability

### Vercel Analytics (already available)

| Field | Value |
|-------|-------|
| **What it is** | Web analytics built into Vercel — page views, session duration, device breakdown |
| **Why it helps** | Understanding driver registration funnel drop-off (how many start /chat, how many complete confirmation) is critical for optimizing acquisition cost |
| **How Claude Code uses it** | Analyze funnel data; identify drop-off steps in the registration flow; recommend copy or UX changes |
| **Priority** | HIGH |
| **Estimated cost** | Included in Vercel Pro (~$20/month) |
| **Risk/caveat** | Must update cookies policy if enabling. Currently the cookies policy correctly states only `recruiter_session` is set — adding analytics cookies requires a policy update. |

---

### Sentry (Error Monitoring)

| Field | Value |
|-------|-------|
| **What it is** | Application error monitoring — captures exceptions, stack traces, and frequency |
| **Why it helps** | When a real driver completes /chat and `ingestLead()` fails silently, that driver is lost without a trace. Sentry would alert on every exception in the production pipeline. |
| **How Claude Code uses it** | Analyze error reports; identify patterns; draft fixes |
| **Priority** | HIGH (before public driver acquisition campaign) |
| **Estimated cost** | Free tier up to 5,000 errors/month; Pro ~$26/month |
| **Risk/caveat** | Sentry captures error data that may include PII in stack traces. Configure Sentry's data scrubbing rules to redact phone and email fields before enabling. |

---

## Priority Matrix

| Tool | Priority | Cost | AI-usable | When needed |
|------|----------|------|-----------|------------|
| 46elks credentials | CRITICAL | Low | No | Today |
| Google Alerts for target companies | HIGH | Free | Indirect | Today |
| Vercel Analytics | HIGH | Included | Yes | Before first campaign |
| Sentry | HIGH | Free tier | Yes | Before first campaign |
| Allabolag Pro | HIGH | ~SEK 500–2,000/month | Yes | Market intelligence phase |
| Transportstyrelsen permit register | HIGH | Unknown | Yes | Market intelligence phase |
| Platsbanken driver ad | HIGH | Free | Partial | Driver acquisition phase |
| Meta Ads for driver acquisition | HIGH | Variable | Partial | Driver acquisition phase |
| Kreditrapporten.se | MEDIUM | Per-report | Yes | Before outreach to caution-list companies |
| Bolagsverket API | MEDIUM | Free/low | Yes | Entity verification |
| Signicat/Scrive BankID | MEDIUM | Medium | No | Phase 2 |
| Pipedrive CRM | MEDIUM | Low | Yes | When outreach begins |
| Apify/Bright Data | MEDIUM | Medium | Yes | If Transportjobb.se becomes accessible |
| Lemlist/Instantly | LOW | Low | Yes | After first 5 manual approaches |
| Checkr/Verifiera | LOW | Per-check | Partial | Phase 2+ |
