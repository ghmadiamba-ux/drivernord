# 05 — Driver Consent and the DriverNord Data Product

**Research date:** 2026-05-12  
**Purpose:** Define what DriverNord is actually selling from a legal and product perspective. Clarify the GDPR consent chain, what data can be shared at each stage, and propose a structured data product tier model.

---

## 1. What DriverNord Is Selling — The Legal and Product Distinction

DriverNord is NOT selling personal data. DriverNord is selling:
- **Access** to pre-verified, consenting professional candidates
- **Recruitment services** that result in qualified introductions
- **Search capability** against a structured, consent-based candidate database

The distinction matters legally. Under GDPR, selling a person's data without their consent is unlawful. Facilitating a recruitment introduction WITH the person's explicit consent is lawful.

---

## 2. Key Terminology — Lead vs. Candidate vs. Profile vs. Introduction

| Term | Legal status | Data shared | Consent required |
|------|-------------|-------------|-----------------|
| **Lead** | Raw name/contact with minimal qualification | Name, phone, location, license class (self-reported) | Minimal; GDPR risk if driver did not consent to this specific sharing |
| **Candidate** | Individual in DriverNord's database who has registered and consented to be presented | Full profile: name, contact, license details, YKB date, availability, transport domain | YES — explicit consent required before presentation |
| **Profile** | Anonymized capability summary — no identifying information | License class, YKB valid, region, transport domain, availability, years experience | No — anonymized data requires no consent |
| **Introduction** | Named candidate actively presented to a specific employer | Full profile + name + contact | YES — explicit consent required; driver should have approved specific employer |
| **Shortlist** | Curated set of 3–5 candidates | Full profiles — see "introduction" | YES — each driver on the shortlist must have consented to presentation |

---

## 3. GDPR Framework for Recruitment

Under GDPR (EU 2016/679), enforced in Sweden by the Swedish Data Protection Authority (Integritetsskyddsmyndigheten, IMY):

### 3.1 Legal Basis for Processing Driver Personal Data

DriverNord has two viable legal bases:

**Option A — Consent (Art. 6(1)(a))**  
Driver explicitly agrees to have their data collected and shared for recruitment purposes. Most appropriate for the DriverNord model. Requires:
- Freely given (not coerced)
- Specific (driver understands what they're consenting to)
- Informed (driver knows who receives their data and for what purpose)
- Unambiguous (clear affirmative action — tick box, button click)
- Withdrawable (driver can revoke consent at any time)

**Option B — Legitimate Interests (Art. 6(1)(f))**  
Processing is necessary for the legitimate interests of DriverNord or a third party. Requires a Legitimate Interests Assessment (LIA). Higher legal risk for sharing personal data with employers without explicit consent. Not recommended as primary basis for sharing candidate data with clients.

**DriverNord should use Art. 6(1)(a) — Consent — as primary legal basis.**

### 3.2 Rules on Sharing Driver Data with Client Employers

From GDPR guidance for recruitment agencies:
- Candidate data may only be shared with a client after the candidate has given explicit consent to that sharing
- The agency must disclose to candidates at the time of first data collection that data may be shared with potential employers
- The candidate must be told the identities of the recipients (or categories of recipients) before or at the time of sharing
- A data-sharing agreement should be in place between DriverNord and each client employer

### 3.3 Anonymized Data (No Consent Required)

If DriverNord shares a capability summary that contains NO identifying information (no name, no unique identifiers, no contact details), this is anonymized data and does not fall under GDPR personal data rules. An employer can receive:
- "CE driver available in Stockholm, 8 years experience, YKB valid until 2027"

Without any consent requirement. **This is the foundation of the Tier 1 product (anonymized availability signal).**

---

## 4. What Data Can Be Shared at Each Stage

### Before Consent (Anonymized Only)

| Data field | Shareable? | Notes |
|------------|-----------|-------|
| License class (C / CE / D / B) | Yes (anonymized) | Not linked to named individual |
| YKB valid / expired | Yes (anonymized) | |
| Region / city | Yes (anonymized) | Not specific enough to identify |
| Availability window | Yes (anonymized) | |
| Transport domain | Yes (anonymized) | |
| Years of experience (range) | Yes (anonymized) | |
| Name | NO | Personal data |
| Phone / email | NO | Personal data |
| Current employer | NO | Personal data |
| Full address | NO | Personal data |

### After Consent (Named Profile)

All fields above plus:
| Data field | Shareable? | Notes |
|------------|-----------|-------|
| Full name | Yes — with consent | Must be included in consent form |
| Phone | Yes — with consent | |
| Email | Yes — with consent | |
| License number | Sensitive — with consent | Enables Transportstyrelsen verification |
| Photo | Only if driver provides | Not required |
| References | Only if driver provides | With reference giver's knowledge |
| Current/last employer | Only if driver voluntarily provides | Do not collect from public sources without consent |

---

## 5. Recommended Consent Flow in DriverNord Driver Intake

### Stage 1 — Initial Registration (Minimal Consent)

Driver registers on DriverNord platform. Collects:
- Name
- Phone / email
- License class(es) held
- YKB valid/expiry date
- Region / city of work
- Availability (immediately, 2-week notice, open to part-time, not currently looking)
- Transport domains
- Preferred shift type (day / night / weekend)

Consent collected at registration:
> "DriverNord will store your professional profile to match you with relevant driver positions. Your name and contact details will not be shared with employers without your explicit confirmation for each introduction. You can delete your profile at any time. Read our privacy policy."

**Driver is NOW a "registered candidate" — anonymized profile available to platform.**

---

### Stage 2 — Verification (Consent to Verify)

Driver provides:
- License number (for verification)
- Consent to DriverNord verifying with Transportstyrelsen (or uploading a license photo for manual check)
- YKB certificate number / copy

Consent language:
> "I consent to DriverNord verifying my professional credentials (driving license and YKB) against official records. My verified status will be displayed in my profile as 'credentials verified.' Verification data is held securely and not shared."

**Driver is NOW a "verified candidate" — DriverNord can market to clients: "We have X verified CE+YKB drivers in [region]."**

---

### Stage 3 — Introduction (Consent Per Employer)

When a client employer requests a specific driver profile or DriverNord identifies a match:
- Driver is notified (SMS/email/app): "We have a potential match for a CE driver position in [area] with [company category, e.g. 'a regional distribution company in Stockholm']. Do you want to be introduced?"
- Driver clicks "Yes, introduce me" or "No, not interested"
- If Yes: DriverNord sends the named, full profile to the client employer
- If No: Driver remains in database; DriverNord looks for another candidate

Consent language (per introduction):
> "By clicking 'Yes', you consent to DriverNord sharing your full professional profile (name, phone, email, license details, YKB status) with [company name or category] for the purpose of this specific driver vacancy. This consent applies only to this introduction. You can withdraw at any time before the employer contacts you."

**This is the Tier 3 "consented introduction" — the primary commercial product.**

---

### Stage 4 — Interview-Ready

Driver has confirmed interest and accepted an introduction. They are:
- Pre-briefed on the client company
- Available for the specified start date
- Not in active competing negotiations
- DriverNord has confirmed their availability in the last 48 hours

**This is the Tier 4 "interview-ready candidate" — the premium product for urgent searches.**

---

### Stage 5 — Placed Driver

Driver is employed by the client. DriverNord's role is complete. Ongoing:
- Driver can return to "available" status in DriverNord database after 90 days if desired
- DriverNord records outcome (successfully placed) for quality data

---

## 6. Proposed DriverNord Data Product Tiers

### Tier 1 — Anonymized Availability Signal

**What the client receives:**  
"DriverNord currently has [X] verified CE+YKB drivers available in [region]. [Y] are available within 2 weeks. [Z] have 5+ years CE experience."

**What it tells the client:**  
We have a viable pool. Engaging with DriverNord will likely produce candidates.

**Revenue model:** Part of the subscription (included in subscription dashboard view).

**GDPR requirements:** None — no personal data.

**Commercially valuable:** Yes — removes "do you actually have anyone?" objection.

---

### Tier 2 — Verified Candidate Profile (Anonymized)

**What the client receives:**  
A structured profile card for an unnamed driver:
- License: CE + YKB valid until [date]
- Region: Stockholm North
- Experience: 8 years CE, distribution and temperature-controlled
- Availability: 2 weeks' notice required
- Transport domains: temperature-controlled, distribution
- Languages: Swedish (native), English (conversational)
- Status: Credentials verified by DriverNord

**What it tells the client:**  
This specific driver exists, is real, is verified, and might be a fit.

**Revenue model:** Per anonymized profile view (in subscription) or teaser before a paid introduction.

**GDPR requirements:** None — anonymized.

---

### Tier 3 — Consented Introduction

**What the client receives:**  
Full named profile + contact details, after the driver has confirmed they consent to this specific introduction.

This is the **core commercial product.**

**Revenue model:** Per introduction (3,500–10,000 SEK) or included in shortlist fee.

**GDPR requirements:** Full compliance — driver explicitly consented to this introduction.

---

### Tier 4 — Interview-Ready Candidate

**What the client receives:**  
Named, consented driver who:
- Has confirmed availability for interview in the next 5 business days
- Has been briefed on the client company and role
- Is not in active negotiations elsewhere
- Has confirmed start-date availability

**Revenue model:** Premium tier; included in "Qualified Driver Shortlist" and "Urgent Replacement Search" packages.

**GDPR requirements:** Same as Tier 3 — consented per introduction.

---

### Tier 5 — Successful Placement

**What happens:**  
Driver signs employment contract with client. DriverNord invoices success fee.

**Revenue model:** Flat fee 25,000–50,000 SEK or 12–15% of annual salary.

**GDPR requirements:**  
- Data minimization: DriverNord retains only what's needed post-placement (placement date, success record for quality tracking)
- Client is now data controller for the placed employee; DriverNord is no longer acting as processor for this driver's data
- Driver should be informed of data retention timeline

---

## 7. Fields That Make a Driver Profile Commercially Valuable

Ranked by commercial impact on client decision:

| Field | Why it matters | Data type |
|-------|---------------|-----------|
| License class (CE / C / D) | Hard requirement; no CE = not applicable | Verified |
| YKB valid date | Hard requirement; expired YKB = cannot legally drive commercially | Verified |
| Digital tachograph card | Required for >3.5t commercial use; sometimes overlooked | Verified |
| Availability (immediate / notice period) | Determines urgency fit | Self-reported |
| Stockholm/Mälardalen location | Proximity to client | Self-reported |
| CE years experience | Quality signal; experienced drivers = less onboarding | Self-reported |
| ADR certification | Premium for hazmat transport; rare | Verified |
| Night / weekend availability | Many routes are night; reduces candidate pool | Self-reported |
| Transport domain experience | Client needs someone who knows their equipment/route type | Self-reported |
| Languages | Swedish required; English/other = bonus | Self-reported |
| HIAB / crane / tail lift | Specialized add-on skills | Self-reported + verify |

---

## 8. Data Retention and Driver Rights

| Right | DriverNord obligation |
|-------|----------------------|
| Right to access (Art. 15) | Driver can request full copy of their data within 30 days |
| Right to rectification (Art. 16) | Driver can update profile fields at any time |
| Right to erasure (Art. 17) | Driver can delete profile; data erased within 30 days |
| Right to portability (Art. 20) | Driver can export their profile in structured format |
| Right to withdraw consent (Art. 7) | Driver can withdraw consent at any time; this stops all future introductions |
| Right to object to processing (Art. 21) | Driver can object to matching and become "inactive" in database |

**Retention policy:**  
- Active registered drivers: held until driver withdraws or 2 years of inactivity
- Successfully placed drivers: anonymized placement record held indefinitely (quality/tracking data)
- Withdrawn/deleted profiles: personally identifying data erased; aggregate statistics (license class, region, placement outcome) may be retained anonymized

---

## Sources

- [GDPR recruitment compliance — Workable](https://resources.workable.com/tutorial/gdpr-compliance-guide-recruiting)
- [GDPR rules for recruiters — Paraform](https://www.paraform.com/blog/gdpr-rules-for-recruitment-teams)
- [GDPR for recruitment agencies — Growth Recruits](https://growthrecruits.com/gdpr-for-recruitment-agencies/)
- [Dealing with data — recruiters guide under GDPR](https://www.privacycompliancehub.com/gdpr-resources/guide-for-recruiters-under-gdpr/)
- [Chaffis.se privacy-first consent model](https://www.chaffis.se/f%C3%B6r-chauff%C3%B6rer)
- [Förartjänst.se driver-controlled data sharing](https://www.forartjanst.se/)
- [Integritetsskyddsmyndigheten (IMY) — Swedish DPA](https://www.imy.se/)
