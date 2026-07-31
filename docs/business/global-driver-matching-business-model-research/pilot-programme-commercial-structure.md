# Pilot Programme Commercial Structure

**Research date:** 2026-05-21  
**Scope:** Framework for the 5-pilot pre-revenue phase; counterparty terms, UGC rights, social proof strategy  
**Status:** Research recommendation — no pilots have been executed yet

---

## Why 5 Pilots, Not Immediate Revenue

DriverNord currently has:
- A working AI matching pipeline (shortlists built, scored)
- 3 real company needs (Enskede Bilexpress, JPC, Edvardssons)
- 300+ ingested drivers with governance screening
- A governance cockpit with DQ and duplicate flags
- No paying employer customer reference

Without a validated employer reference, every sales conversation starts with: "Interesting — but who has used this before?"

The pilot programme answers that question. It converts the first 5 employer engagements from sales challenges into proof assets. The goal is not to earn SEK in the pilot phase. The goal is to earn:

1. At least 2 employer contacts who will take a 3-minute reference call
2. At least 1 named case study (company name + outcome)
3. At least 1 employer who places a post-pilot paid order
4. Quantified outcomes: how many candidates introduced, how many interviewed, how many hired

---

## Pilot Counterparty Terms

### What DriverNord provides (per pilot employer)

- One Package 2-equivalent shortlist: 3 ranked, pre-screened, governance-cleared CE/C/D candidates
- Written match rationale per candidate (license, YKB, region, availability, match score)
- Candidate contact details (name, phone, email where available)
- Governance status per candidate (clean / flagged with explanation)
- Availability for a 20-minute debrief call after the employer has contacted the candidates

**Deliverable trigger:** DriverNord delivers the shortlist when at least 2 of 3 candidates are governance-clean. If the current pool does not contain 2 clean candidates matching the need, the shortlist is not delivered — the pilot window waits until supply is sufficient.

### What the pilot employer provides (in return)

Non-negotiable:
- A written feedback email or form response within 14 days of receiving the shortlist
- Permission for DriverNord to reference "a distribution company in Stockholm tested our system" (anonymised)
- Participation in a 20-minute debrief call (scheduling flexible)

Optional (with employer consent):
- Named case study: company name published on drivernord.com
- Testimonial quote (attributed or anonymised)
- Reference for future prospect calls (verbal only; no written endorsement required)

### What DriverNord does NOT provide in the pilot

- No guarantee that any shortlisted driver will accept an offer
- No obligation to replace candidates who are unavailable when contacted
- No ongoing account management or recruiter support
- No SLA on response time after shortlist delivery (pilot employers are non-paying)

### What the pilot employer does NOT owe

- No payment
- No obligation to hire
- No exclusivity
- No minimum notice period to exit

---

## 5-Pilot Cap Analysis

### Why cap at 5

1. **Operational constraint:** The governance cockpit requires founder review per shortlist. At current throughput, 5 shortlists is achievable within a 4–6 week window without quality degradation.

2. **Proof threshold:** 5 data points are sufficient to validate the model. 3 is too few (single bad outcome distorts results). 10 is too many (delays revenue phase unnecessarily).

3. **Supply constraint:** With ~300 ingested drivers and 3 active needs, 5 shortlists would exhaust the highest-scored clean candidates. Additional pilots would require fresh driver acquisition.

4. **Signal value:** 5 pilots at 0 SEK = 5 free experiments. 5 pilots at 9,000 SEK = 45,000 SEK at risk if any employer publicises "they gave us a free service." Keeping pilot terms explicit ("this is a pilot, not a discount") prevents value erosion.

### The 5 pilot slots

Priority order based on existing company_needs and matching scores:

| Slot | Company | License | Urgency | Top score | Status |
|---|---|---|---|---|---|
| 1 | Enskede Bilexpress | CE | Standard | 97 (Samir) | Active need, best match |
| 2 | JPC | CE | Urgent | ~95 | Active need, urgent |
| 3 | Edvardssons | CE | Urgent | ~92 | Active need, urgent |
| 4 | TBD — distribution sector | CE | TBD | TBD | To be sourced from market scan |
| 5 | TBD — schakt/bygg or logistics | CE/C | TBD | TBD | To be sourced from market scan |

Slots 4 and 5 should be filled from the Market Agent's `ready_for_review` drafts after the next scan cycle.

---

## Driver UGC (User-Generated Content) Strategy

### What drivers can provide that no competitor has

DriverNord's drivers are inbound, voluntary, and consented. This creates an asset that job boards and staffing agencies do not have: **authentic driver testimonials and referral network access**.

### UGC types to collect (post-pilot, post-46elks activation)

| Type | Format | Use case |
|---|---|---|
| Job outcome confirmation | Short SMS reply "I got the job" | Conversion data for investors and employers |
| Video testimonial (optional) | 30–60s phone video | Meta ad creative, website social proof |
| Referral ("tell a friend") | WhatsApp share with personal referral code | Supply growth without paid acquisition cost |
| Star rating of introduction process | Post-contact 1–5 rating | Platform quality signal, public-facing in future |

### Why UGC strengthens DriverNord's moat

1. **Competitors cannot replicate it** without also having an inbound driver base. Cold-outreach staffing agencies cannot ethically ask "how did your introduction go?" because the driver didn't consent to be introduced.

2. **It creates an observable quality signal.** If 80% of DriverNord introductions result in at least one interview (vs. industry norm of ~20–30% for job board applications), that data is publishable and defensible.

3. **Referrals reduce Meta CAC.** A driver who was successfully placed refers 2–3 colleagues. Each referral costs ~0 SEK in acquisition vs. the ~150–400 SEK Meta cost-per-lead estimate.

### UGC collection constraints

- Do not contact drivers for UGC before their introduction is confirmed by the employer
- Do not collect video testimonials without explicit written consent
- Store UGC consent as a new field in the drivers/ingested_drivers table (future feature)
- Do not publish any driver name, photo, or identifying information in case studies without individual written consent

---

## Social Proof Strategy

### The 3 assets that convert pilot outcomes into revenue

1. **The anonymised case study:** "A distribution company in Stockholm with an urgent CE need received a shortlist of 3 candidates within 48 hours. Two met with the company. One was hired within 12 days. The introduction cost 15,000 SEK. A traditional recruiter would have charged 84,000 SEK for the same outcome."

2. **The governance statement:** "Every candidate in the shortlist was reviewed for data quality. We check that the name field is a real name, not a phone number, and that no candidate shares a phone with another driver in our system. You receive introductions, not raw leads."

3. **The reference offer:** "I can connect you with one of our pilot employers if you'd like a 3-minute reference call before committing. They're not obligated to speak with you — but two of them said they would."

### Timing

Do not build or publish case studies until:
- The employer has confirmed the outcome in writing (or verbally on a recorded/noted call)
- The pilot is fully concluded (all shortlisted candidates have been contacted or declined)
- DriverNord has received the employer's feedback form response

Premature case study publication risks inaccuracy and undermines trust if details conflict with employer recollection.

---

## Post-Pilot Transition

### Trigger for moving to paid

After 2 or more pilots produce employer satisfaction (defined as: employer reports ≥1 interview scheduled from the shortlist), initiate the post-pilot commercial offer:

"You tested DriverNord at no cost. The pilot showed [outcome]. We're now moving to our standard commercial package. Your next shortlist — same quality, same governance review — is [Package 2 price at introductory post-pilot rate]. Because you've already validated the model, you're eligible for our first-customer introductory rate of 9,000 SEK for the next 60 days."

### What happens to unsatisfied pilots

If a pilot employer reports 0 interviews scheduled (all 3 candidates unavailable or unresponsive):
- Do not offer a paid package immediately
- Conduct a root cause review: were candidates governance-clean? Was the need accurately described? Was there a supply gap?
- If the failure is DriverNord's (supply gap, wrong match), offer one replacement shortlist before any commercial discussion
- If the failure is the employer's (no follow-up, changed requirements), note and close the pilot

### The 5-pilot data point

After all 5 pilots are complete, compile:
- Total shortlists delivered: 5
- Total candidates introduced: 15 (3 per shortlist)
- Total interviews scheduled: X
- Total hires confirmed: Y
- Average time-to-shortlist-delivery: Z days

This data is the primary asset for investor conversations, PR, and Series A positioning.
