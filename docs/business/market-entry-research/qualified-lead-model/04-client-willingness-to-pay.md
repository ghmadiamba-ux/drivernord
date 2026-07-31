# 04 — Client Willingness to Pay

**Research date:** 2026-05-12  
**Purpose:** Analyze whether Swedish SME transport companies are likely to pay for qualified driver leads, introductions, or shortlists. Based on cost evidence, competitive context, and behavioral signals.

---

## 1. The Cost Anchor: What Clients Already Pay

Before assessing willingness to pay for DriverNord, establish what clients currently spend on the same problem.

### 1.1 Job Board Advertising (Current Baseline)

| Platform | Cost per ad | Duration | Result quality |
|----------|------------|----------|----------------|
| Blocket Jobb | 1,500–5,000 SEK | 30 days | Unverified applicants; 0–2 qualified |
| Platsbanken (Arbetsförmedlingen) | Free | Unlimited | Very low quality; high no-shows |
| Transportjobb.se | ~1,500–3,000 SEK | 30 days | Better targeting; still unverified |
| Monster.se | Subscription-based | Monthly | Low transport-specific traffic |
| LinkedIn (job post) | 2,000–8,000 SEK | 30 days | Good for white-collar; weak for CE drivers |

**Total annual ad spend for a struggling SME:** An owner who has posted 4 CE driver ads in 12 months has spent 6,000–20,000 SEK with zero hires. This is the proof point that money is already being wasted.

### 1.2 Staffing Agency (Current Alternative)

A Segment A client using a staffing agency for one CE driver full-time (as a permanent substitute):
- Invoice rate: ~450 SEK/hour
- Annual cost: 450 × 1,850 productive hours = 832,500 SEK
- Direct employment cost for same driver: ~310 SEK/hour = 573,500 SEK
- **Agency premium: ~259,000 SEK/year**

Even if DriverNord's placement fee is 50,000 SEK — one-time — that pays back in **70 days** of agency savings.

### 1.3 Traditional Recruitment Agency

- Recruitment agencies charge 23–27% of annual salary in Sweden (general)
- CE driver at 35,000 SEK/month = 420,000 SEK/year → 97,000–113,000 SEK fee
- Traditional agencies take 3–6 weeks to deliver
- DriverNord at 15% = 63,000 SEK = 36% cheaper + specialist + faster

### 1.4 Cost of Unfilled Driver Position

This is the most powerful willingness-to-pay driver. An empty driver seat is not free.

**Revenue loss per unfilled day (typical SME åkeri, 1 route):**
- A CE driver completing regional distribution typically generates 2,000–4,000 SEK/day in freight revenue for the company
- A route vacant for 30 days = 60,000–120,000 SEK in lost or unexecuted contracts
- Owner doubles as driver, delaying administrative/business work

**Revenue loss per unfilled week:** 10,000–20,000 SEK (conservative).

**For a company that has been trying to fill a position for 8 weeks:** 80,000–160,000 SEK in lost revenue or operational cost. Paying 30,000–50,000 SEK to fill that position is a rational economic decision.

---

## 2. Urgency Signal Evidence

### Urgency Signal 1 — Repeated Job Ad Posting (Segment E)

A transport company that has posted a CE driver ad 3+ times in a 12-month window is:
- Admitting that their current approach has failed
- Spending money repeatedly on a broken process
- Accumulating revenue loss per week unfilled
- Demonstrably willing to pay (they keep buying ads that don't work)

This is the **highest-quality willingness-to-pay signal** available without any outreach.

**DriverNord action:** The `company_research_targets` table filters for `urgency_signal = 'repeated_ads'`. These companies are the primary outreach target in Month 1.

### Urgency Signal 2 — Summer/Q4 Seasonal Peaks

Swedish transport demand spikes in June–August (holiday coverage) and November–December (e-commerce). Companies trying to fill positions in April–May for summer, or October–November for Q4, have a hard deadline and elevated willingness to pay.

**DriverNord action:** Run targeted campaigns and price urgency premiums in these seasonal windows.

### Urgency Signal 3 — New Contract/Route Won

A company that wins a new freight contract needs drivers immediately. The deal is signed; revenue is committed. A missing driver threatens contract delivery. Urgency is extreme.

---

## 3. Willingness-to-Pay Arguments (For and Against)

### 3.1 Strongest Arguments That Clients WILL Pay

1. **They already pay for inferior alternatives.** A Blocket Jobb ad at 3,000 SEK that yields zero qualified applicants is money spent on nothing. Paying 5,000–10,000 SEK for a verified introduction is a better deal even at 3× the ad cost.

2. **The shortage is documented, structural, and long-term.** There is no credible prospect that the driver shortage resolves in the next 3 years. Companies that resist paying for recruitment now will have to pay more later.

3. **The agency alternative is vastly more expensive.** Any client paying 400–480 SEK/hour for a staffed driver is paying 259,000+ SEK/year premium over direct employment. A 50,000 SEK placement fee that converts to permanent hire pays back in 70 days.

4. **Chaffis.se and Förartjänst.se prove willingness to pay.** Two Swedish platforms already charge åkerier for driver database access. The market behavior is documented. Clients pay.

5. **Existing recruitment agencies charge 23–27%** (97,000–113,000 SEK per driver). DriverNord at 12–15% (50,000–63,000 SEK) is significantly cheaper.

6. **Revenue loss per week unfilled is 2–3× the placement fee.** The economic argument is overwhelming for any client facing a 6+ week vacancy.

### 3.2 Strongest Arguments That Clients WILL RESIST

1. **"We don't pay for candidates."** Many SME owners have only ever posted free ads (Platsbanken). The concept of paying for a person's contact information feels unusual, even if they've paid job board fees.

2. **Trust deficit.** "How do I know the driver you show me is actually qualified?" Without a track record, DriverNord's verification claims are unverifiable by the buyer.

3. **"We'll find someone ourselves."** Optimism bias — owners consistently underestimate how long their next hire will take.

4. **Cash flow sensitivity.** SME åkerier often have tight cash flow. A 50,000 SEK upfront payment is a significant ask. Success-fee-only removes this barrier.

5. **Fear of being scammed.** The staffing industry in Sweden has stories of companies paying fees for candidates who don't show up or leave within a week. Without a guarantee, buyers are skeptical.

---

## 4. Common Objections and How to Frame Against Them

| Objection | Reframe |
|-----------|---------|
| "I'll just post on Blocket Jobb." | "How many times have you posted? How many qualified CE+YKB drivers applied?" |
| "Your fee is too expensive." | "What does an empty truck route cost you per week?" |
| "I don't pay for candidates, I pay for employees." | "You're paying for a verified, pre-screened introduction — not the person. Same way you'd pay for a machinery inspection before buying." |
| "How do I know they're really qualified?" | "We verify license class against Transportstyrelsen records and confirm YKB validity date before presenting. You get a document." |
| "What if they leave after one month?" | "We offer a 90-day replacement guarantee. If they leave before 90 days, we find another candidate at no extra cost." |
| "I'll wait and find someone through my network." | "Networks are great. But 43% of Swedish transport companies reported recruitment difficulties last year. What's your plan if the network doesn't deliver in time?" |
| "I've used agencies before and they sent me people who weren't right." | "DriverNord specializes only in CE/YKB drivers. We know exactly what 'qualified' means for your fleet. This isn't a general staffing agency." |

---

## 5. What Proof Is Needed

To overcome trust barriers, DriverNord needs:

1. **Reference client.** Even one successful placement with a contactable client transforms the trust dynamic. First placement should be delivered at cost or near-free to get a reference.

2. **Documented verification process.** A one-page "How DriverNord verifies credentials" document, ideally with a sample (anonymized) driver compliance pack.

3. **Case study with numbers.** "Company X had been trying to fill a CE driver position for 11 weeks. DriverNord presented 3 qualified candidates within 5 days. They hired one who has been with them for 4 months."

4. **Replacement guarantee.** Non-negotiable for first sales. Without a guarantee, early clients are betting on an unknown. The guarantee must be specific: "If the placed driver leaves within 90 days for any reason, we perform one free replacement search."

---

## 6. Upfront Fee vs. Success-Fee-Only

### Upfront fee (e.g., 5,000 SEK engagement + 25,000 SEK on hire)

**When it works:**
- Client has tried and failed multiple times already (high urgency)
- Client already accepts that finding a driver has a cost
- Client is Segment B/C with some procurement budget

**When it fails:**
- First contact with a skeptical owner
- Owner has never paid for recruitment before
- Cash flow is tight

### Success-fee-only (no payment until hire)

**When it works:**
- Cold outreach to Segment E companies (repeated ads = documented urgency, but trust is zero)
- First sale to a new client
- When DriverNord needs to prove the model works

**When it fails:**
- Client engages but never actually commits to interview
- Client "ghost hires" — accepts DriverNord introductions, hires someone else, denies the connection
- DriverNord runs 10 searches with zero hires and earns nothing

**Recommendation for Year 1:**  
Lead with success-fee-only as the entry offer. After the first hire, shift the relationship to hybrid (small engagement fee + success fee). After 3 successful hires, pitch the subscription model.

---

## 7. Guarantee Design

A guarantee is essential for trust. The structure:

| Term | Recommended |
|------|-------------|
| Guarantee period | 90 days from driver start date |
| Coverage | If placed driver leaves for any reason within 90 days |
| Remedy | One free replacement search (same spec) |
| Exclusions | Client terminates without cause; client changes role specification; client reorganizes |
| DriverNord risk | If database is thin, finding a replacement may be difficult. Manage by keeping 3+ backup candidates per active search. |
| Communication | State the guarantee in the client agreement. Makes it feel like a product, not a gamble. |

---

## Sources

- [TYA Trendindikator 2024: 43% of transport companies report recruitment difficulties](https://www.tya.se/wp-content/uploads/Trendindikator_A4_2024_webb.pdf)
- [Transportföretagen: 50,000 unfilled positions](https://www.transportforetagen.se/nyhetslista/2023/augusti/fortsatt-stort-rekryteringsbehov-av-lastbilsforare--utbildningar-far-inte-bli-farre/)
- [SV Bemanning: bemanning hourly rates 400–650 SEK](https://bemanningrekrytering.se/faq-bemanning-rekrytering/)
- [Rekryteringsbolag.se: rekryteringsavgift 15–30%](https://www.rekryteringsbolag.se/artiklar/vad-kostar-det-att-anlita-en-rekryteringsbyra-1106)
- [DigiRecruitx: Sweden recruitment 23–27%](https://digirecruitx.com/recruitment-agency-sweden/)
- [Chaffis.se: 4,995 SEK/year subscription](https://www.chaffis.se/f%C3%B6r-%C3%A5kerier)
- [Chameleoni: UK recruitment agency pricing models](https://www.chameleoni.com/pricing-models)
