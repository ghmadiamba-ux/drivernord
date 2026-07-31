# DriverNord — Weaknesses and Failure Mode Analysis

**Audit date:** 2026-05-14  
**Purpose:** Enumerate failure scenarios, their root causes, early warning signals, and mitigations. Written from an adversarial perspective — assuming things will go wrong.  
**Governing constraint:** Analysis and documentation only. No code changes from this document.

---

## Failure Mode Framework

Each failure mode is assessed on:
- **Root cause:** The underlying structural reason this can fail
- **Warning signal:** What you would observe before or early in the failure
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **Detection difficulty:** EASY / MODERATE / HARD
- **Mitigation:** What reduces probability or impact
- **AI task:** What Claude Code can do to reduce this risk

---

## Section 1: Business Model Failure Modes

| # | Failure mode | Root cause | Warning signal | Severity | Detection | Mitigation | AI task |
|---|-------------|-----------|----------------|----------|-----------|------------|---------|
| B1 | Zero driver database at pilot launch | No driver acquisition plan; supply side undeveloped | Database shows 0 ingested_drivers when first company need is created | CRITICAL | EASY | Design and execute driver acquisition campaign before approaching clients | Draft acquisition campaign plan; write ad copy |
| B2 | Client company places driver directly after receiving shortlist without paying | No contract protection; success-fee timing is ambiguous | Client contacts shortlisted driver directly; placement happens; no invoice sent | HIGH | HARD | Contract clause: introduce fee obligation on introduction (not on hire); 90-day clause naming drivers in shortlist | Draft contract terms |
| B3 | 90-day guarantee triggered with no replacement driver available | Driver leaves; DriverNord database has only 1 driver in that category | Placed driver leaves <90 days post-hire | HIGH | MODERATE | Don't offer guarantees until database has ≥3 verified drivers per specialty | Track guarantee exposure per specialty |
| B4 | Subscription price rejected (30,000 SEK/year vs Chaffis 4,995 SEK) | 6× premium not justified by demonstrated value | First 3 companies decline subscription; accept only success-fee | MEDIUM | EASY | Lead with success-fee packages; earn subscription only after demonstrating value | Draft value-justification talking points |
| B5 | All top-10 companies already hired before DriverNord approaches | Market opportunity expires during research/planning delay | Companies' ads disappear; "already solved it" response | MEDIUM | MODERATE | Shorter research-to-outreach cycle; begin outreach preparation in parallel | Monitor target company ad activity via Google Alerts |
| B6 | Revenue model fails because all companies prefer staffing over placement | Companies actually want flexible temp workers, not permanent employees | No takers for Packages 1 or 3; requests for temp arrangements only | MEDIUM | MODERATE | Validate with first 2–3 companies before building; Model B (staffing) exists as contingency | N/A |

---

## Section 2: Technical Failure Modes

| # | Failure mode | Root cause | Warning signal | Severity | Detection | Mitigation | AI task |
|---|-------------|-----------|----------------|----------|-----------|------------|---------|
| T1 | SMS never sent; contact agents remain simulated forever | 46elks credentials not configured; task deprioritized | SMS_PROVIDER unset in production; all contact_suggested actions remain pending indefinitely | CRITICAL | EASY | Configure today (30 min task) | N/A |
| T2 | Driver lost on ingestLead() failure | No failure logging; exception silently swallows leads | Growing gap between drivers who completed /chat and ingested_drivers row count | HIGH | HARD | Add driver_ingestion_failed action type; Sentry error monitoring | Spec the error logging implementation |
| T3 | Duplicate driver entries from re-registration | No upsert logic; same-phone second registration creates a new row | ingested_drivers shows duplicate phone numbers | HIGH | MODERATE | Add upsert logic: check for existing record by phone before insert | Spec the re-ingestion update path |
| T4 | Stale driver availability at scale | No re-confirmation flow; availability decays over time | Shortlists delivered to clients with drivers who are now employed | HIGH | HARD | Periodic re-confirmation SMS; availability freshness timestamp | Draft the re-confirmation flow spec |
| T5 | O(n×m) matching overload | buildShortlist() fetches all needs for every driver ingestion | Matching runs take >30 seconds; Supabase query timeout | MEDIUM | MODERATE | Add MATCH_COOLDOWN_MINUTES guard; paginate need fetch | Spec the cooldown guard |
| T6 | Production database schema diverges from migrations | Hotfixes applied directly to production Supabase | migration/00N does not match actual Supabase schema | HIGH | HARD | Never modify production schema directly; all changes via migrations | Audit current schema against migration files |
| T7 | YKB expiry mismatch at placement | YKB stored as boolean, no expiry date; 5-year certificates expire | Client company rejects driver for expired YKB post-introduction | MEDIUM | HARD | Add ykb_expiry_date column; flag drivers with no recorded expiry | Spec the schema addition |
| T8 | metadataBase localhost in social preview | Not set in app/layout.tsx | Social shares of DriverNord pages show broken preview images | LOW | EASY | One-line fix in layout.tsx | Write the fix |
| T9 | Cockpit shows company_id not company name | getOpenCompanyNeeds() does not join companies table | Recruiter sees UUIDs in approval queue | MEDIUM | EASY | Add JOIN to companies table in query | Write the implementation |

---

## Section 3: Data Quality Failure Modes

| # | Failure mode | Root cause | Warning signal | Severity | Detection | Mitigation | AI task |
|---|-------------|-----------|----------------|----------|-----------|------------|---------|
| D1 | Fake license claims in driver database | No Transportstyrelsen verification; self-declared | Placement attempt; company verifies; license doesn't exist | CRITICAL | HARD (post-placement) | Transportstyrelsen API integration (medium-term); driver document upload (short-term) | Research Transportstyrelsen API access |
| D2 | Market Proof Scores understate actual demand | Transportjobb.se 404 gap; 50–60% of CE ads not captured | After Transportjobb becomes accessible, scores look very different | MEDIUM | MODERATE | Treat current scores as floor; re-run on Transportjobb access | Monitor Transportjobb.se availability |
| D3 | Target company financials are 2-year-old data | Allabolag annual report lag | A company that looked profitable in 2023 has a payment remark in 2025 | MEDIUM | MODERATE | Verify current payment remark status for top-10 targets before engagement | Run kreditrapporten.se checks on top-10 |
| D4 | Entity ambiguity causes commercial document error | Alfta Frakt Distribution AB ≠ Alfta Frakt Aktiebolag | Sending a DPA to the wrong entity; invoice to wrong org number | HIGH | EASY (if checked) | Verify entity match before any commercial document is signed | Resolve all entity ambiguities before outreach |
| D5 | Decision-maker contacts expired | Key contacts from research pass 2 (2026-05-10) change roles | Outreach email bounces; contact confirms they moved on | MEDIUM | EASY (bounce detection) | Verify LinkedIn profiles before outreach; check company websites | Spot-check top-5 DM contacts before outreach |
| D6 | SNI expansion V1 Fit scores are estimates, not calibrated scores | Task D scoring rigor not applied to SNI expansion companies | SNI company approached based on overestimated V1 Fit | LOW | MODERATE | Apply full Task D scoring before acting on any SNI expansion target | Complete financial scoring for 12 unscored SNI companies |

---

## Section 4: Legal and Compliance Failure Modes

| # | Failure mode | Root cause | Warning signal | Severity | Detection | Mitigation | AI task |
|---|-------------|-----------|----------------|----------|-----------|------------|---------|
| L1 | Datainspektionen inquiry | No documented legal basis; no retention schedule; no DPA template | A driver files a complaint; a client company raises a question | CRITICAL | HARD (no warning before it happens) | Legal review of privacy policy; DPA template; retention schedule | Draft DPA template first version |
| L2 | Driver makes right-to-erasure request; manual deletion fails | No automated deletion; hej@ inbox unmonitored | Request goes unanswered for >30 days | HIGH | HARD | Automated deletion endpoint; monitored inbox | Spec the deletion endpoint |
| L3 | Consent chain invalidated | Consent language too generic; stages not clearly documented | Challenge during a placement dispute | HIGH | HARD | Legal review of consent stages; document each consent event with timestamp | Document the existing consent chain in GDPR-compliant format |
| L4 | Legal pages used as evidence of service commitments | "Preliminär version" banners removed prematurely | A client or driver cites terms as binding contract | MEDIUM | MODERATE | Do not remove "Preliminär version" banners until legal review complete | N/A |
| L5 | B2B cold email triggers GDPR complaint | Outreach to decision-makers without a documented legitimate interest basis | Opt-out requests; complaints from target companies | MEDIUM | EASY | Legal review of outreach template; include opt-out; document legitimate interest | Draft legitimate interest assessment |
| L6 | Employment law misclassification | Facilitating a "permanent placement" that looks like staffing | Placed driver is treated as DriverNord employee; Skatteverket inquiry | MEDIUM | HARD | Contract clearly states DriverNord's role as an introduction service, not employer | Legal review of placement contract terms |

---

## Section 5: Competitive Failure Modes

| # | Failure mode | Root cause | Warning signal | Severity | Detection | Mitigation | AI task |
|---|-------------|-----------|----------------|----------|-----------|------------|---------|
| C1 | Förartjänst.se rebuild completes with 20,000 active drivers | Competitor executes faster in the same quadrant | Förartjänst.se goes live with new platform; active driver search; pricing published | HIGH | MODERATE | Accelerate time-to-first-client; first-mover advantage window is closing | Monitor Förartjänst.se for rebuild completion |
| C2 | Simplex Bemanning launches a permanent placement product | Dominant incumbent extends product line downmarket | Simplex website adds "rekrytering" or "permanent placement" section | MEDIUM | EASY | N/A (Simplex entry validates the market; compete on verification and price) | N/A |
| C3 | Chaffis.se adds verification and closes the quality gap | DriverNord's differentiation narrows | Chaffis announces Transportstyrelsen integration or BankID | MEDIUM | EASY | Move faster on BankID; deepen verification moat | N/A |
| C4 | A well-funded entrant copies the architecture | Technical barrier to entry is low | No public signal (undetectable until they launch) | MEDIUM | HARD | The moat is the driver database, not the technology — focus on database building | N/A |

---

## Section 6: Operational Failure Modes

| # | Failure mode | Root cause | Warning signal | Severity | Detection | Mitigation | AI task |
|---|-------------|-----------|----------------|----------|-----------|------------|---------|
| O1 | hej@drivernord.com inbox unmonitored | Unknown inbox setup; no monitoring confirmation | Incoming messages go unread; company and driver contacts lost | CRITICAL | EASY (test it) | Send test email today; confirm receipt; set up monitoring | N/A |
| O2 | Vercel production env vars not set correctly | Configuration not verified post-deployment | Agents fail silently; AGENT_CONTACT_ENABLED not set; SMS not firing | HIGH | MODERATE | Run through env var checklist against docs/current/project-state.md | Generate env var checklist |
| O3 | Single operator dependency | All manual operations (company need creation, cockpit approval) depend on one person | Illness, travel, or absence blocks the entire pipeline | HIGH | MODERATE | Document all manual operations; create cockpit access for a second operator | Document operator runbook |
| O4 | Cron job failure (follow-up agent) | Vercel cron is not verified as running | No follow_up_sent actions logged over a 48-hour period | MEDIUM | MODERATE | Add a health-check endpoint that returns last follow-up run timestamp | Spec health check endpoint |
| O5 | No backup/restore procedure for Supabase | No documented backup restore path | Supabase project corruption or accidental table drop | HIGH | HARD (after event) | Enable Supabase automatic backups; document restore procedure | Document backup/restore procedure |

---

## Top 10 Failure Modes by Combined Severity × Probability

| Rank | ID | Failure mode | Why ranked here |
|------|----|-------------|----------------|
| 1 | B1 | Zero driver database | Immediately blocks all revenue; probability near-certain if no acquisition plan exists |
| 2 | T1 | SMS never sent | Already occurring; system is live but contact is simulated; 30-min fix |
| 3 | L1 | GDPR enforcement action | Silent risk; no warning; once triggered, is expensive and reputationally damaging |
| 4 | O1 | Inbox unmonitored | All contact routes here; if unmonitored, all inbound is lost; easy to verify |
| 5 | C1 | Förartjänst.se rebuild completes | The one competitor who could fill the same gap; currently building |
| 6 | T4 | Stale driver availability | Affects first real shortlist quality; damages client trust early |
| 7 | D4 | Entity ambiguity commercial error | Using wrong org number in DPA/invoice is a preventable compliance issue |
| 8 | T2 | Driver lost on ingestion failure | Silent; no alert; driver who completed the entire chat flow disappears |
| 9 | B2 | Client bypasses placement fee | Contract protection gap; low probability on good faith pilot; higher at scale |
| 10 | O5 | No Supabase backup procedure | Low probability event; catastrophic if it occurs |

---

*All failure modes assessed from read-only analysis. No mitigations implemented from this document.*
