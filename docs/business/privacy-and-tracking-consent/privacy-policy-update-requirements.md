# DriverNord — Privacy Policy Update Requirements

**Date:** 2026-05-17
**Status:** REQUIREMENTS_DEFINED — UPDATE NOT DRAFTED
**Audience:** Claude Code (drafting) + Swedish GDPR lawyer (review) + founder (approval)
**Blocks:** G8 gate in `meta-pixel-production-activation-gates.md`

---

## Current State

DriverNord currently has no published privacy policy at drivernord.com. Before Meta Pixel goes live in production, a privacy policy must exist at a stable URL (e.g., `https://drivernord.com/integritetspolicy`).

The policy must cover both:
1. The existing driver data processing (registration, classification, matching)
2. The new Meta Pixel tracking (marketing measurement)

This document defines what the policy must contain. Claude Code will draft the policy when instructed. The lawyer must review before publication.

---

## Required Sections and Content

### Section 1: Controller Information

```
Personuppgiftsansvarig: DriverNord
Kontaktadress: hej@drivernord.com
Webbplats: https://drivernord.com
```

**Note:** Until DriverNord AB is incorporated, the founder is the individual controller. The lawyer must advise whether the company name or founder name appears here.

---

### Section 2: What Data We Collect and Why

Must cover two distinct processing activities:

#### 2a: Driver Registration Data

| Data | Purpose | Legal basis |
|---|---|---|
| Name | Identifying the driver for matching | Art. 6(1)(a) — consent |
| Phone number | Contact during matching process | Art. 6(1)(a) — consent |
| Email address | Contact during matching process | Art. 6(1)(a) — consent |
| License class (CE/C/D) | Qualification assessment | Art. 6(1)(a) — consent |
| YKB certificate status | Qualification assessment | Art. 6(1)(a) — consent |
| Driver card status | Qualification assessment | Art. 6(1)(a) — consent |
| Region (where driver lives/works) | Matching with transport companies | Art. 6(1)(a) — consent |
| Availability and shift preference | Matching with transport companies | Art. 6(1)(a) — consent |
| UTM attribution data | Understanding which channels attract drivers | Art. 6(1)(a) — consent |
| Consent timestamp | Proof of consent for GDPR compliance | Art. 6(1)(c) — legal obligation |

#### 2b: Website Tracking Data (Meta Pixel)

| Data | Purpose | Legal basis |
|---|---|---|
| Page views and navigation events | Measuring effectiveness of marketing | Art. 6(1)(a) — cookie consent |
| Chat funnel events (DriverChatStarted, etc.) | Measuring conversion at each step | Art. 6(1)(a) — cookie consent |
| Browser metadata (IP address, user agent, referrer) | Collected by Meta automatically — not sent by DriverNord | Art. 6(1)(a) — cookie consent |

**Important disclosure:** Meta collects browser metadata automatically when fbevents.js loads. DriverNord does not control this collection. This must be disclosed explicitly.

---

### Section 3: How Long We Keep Your Data

| Data type | Retention period | Reason |
|---|---|---|
| Driver registration data | Until driver requests deletion, or until the matching purpose is fulfilled + 12 months | Reasonable retention for active matching |
| Consent records (registration) | 5 years from consent date | Proof of consent obligation (GDPR Art. 7(1)) |
| Cookie consent records | Until user changes preference or clears browser data | localStorage — DriverNord controls expiry |
| Meta Pixel tracking data | Per Meta's data retention policy | DriverNord does not control Meta's retention |

**Lawyer must confirm:** The registration data retention period. 12 months post-match may be too long or require further justification.

---

### Section 4: Who We Share Data With

| Recipient | What data | Why |
|---|---|---|
| Transport companies (Package 4) | Driver's qualification data (license, region, availability) — NOT name/phone/email until match is confirmed | Service purpose — matching drivers with employers |
| Meta Platforms Ireland Ltd | Marketing event data (page views, funnel events) — no PII from DriverNord database | Marketing measurement — only if cookie consent given |
| Supabase Inc (data processor) | Driver registration data, classification results | Database hosting — Data Processing Agreement required |
| Vercel Inc (data processor) | Application server logs (may contain IP addresses) | Application hosting — Data Processing Agreement required |

**What we do NOT share:**
- Driver names, phone numbers, or email addresses with Meta
- Driver data with any third party without driver's knowledge and consent

---

### Section 5: Your Rights

Must enumerate Art. 15–22 rights clearly in plain Swedish:

```
Du har rätt att:
- Få tillgång till dina personuppgifter (Art. 15)
- Rätta felaktiga uppgifter (Art. 16)
- Radera dina uppgifter ("rätten att bli glömd") (Art. 17)
- Begränsa behandlingen av dina uppgifter (Art. 18)
- Invända mot behandlingen (Art. 21)
- Dataportabilitet — få ut dina uppgifter i maskinläsbart format (Art. 20)
- Återkalla ditt samtycke när som helst — utan att det påverkar lagligheten av behandlingen dessförinnan

För att utöva dina rättigheter: kontakta hej@drivernord.com
Svarstid: Vi svarar inom 30 dagar.

Du har också rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY):
www.imy.se | imy@imy.se | Telefon: 08-657 61 00
```

---

### Section 6: Cookies

Must include:

#### Nödvändiga cookies

```
Vi använder sessionscookies för att vår webbplats ska fungera korrekt. 
Dessa kräver inte ditt samtycke och kan inte stängas av.
```

#### Marknadsföringscookies (Meta Pixel)

```
Om du godkänner marknadsföringscookies används Meta Pixel för att mäta 
hur vår marknadsföring fungerar. Meta Pixel är ett verktyg från 
Meta Platforms Ireland Ltd (Facebook/Instagram).

Vad Meta Pixel gör:
- Registrerar besök på vår webbplats
- Mäter om besök leder till registrering
- Skickar anonyma mätdata till Meta

Vad vi INTE skickar till Meta:
- Ditt namn, telefonnummer eller e-postadress
- Någon information från vår databas

Meta lagrar och behandlar informationen enligt Metas integritetspolicy:
[länk till https://www.facebook.com/privacy/policy/]

Du kan ändra dina cookieinställningar när som helst via länken 
"Hantera cookieinställningar" i sidfoten.
```

---

### Section 7: Contact and Complaints

```
Personuppgiftsansvarig: DriverNord
E-post: hej@drivernord.com
Webbplats: https://drivernord.com

För frågor om hur vi behandlar dina personuppgifter, kontakta oss på hej@drivernord.com.
Vi svarar inom 5 arbetsdagar (max 30 dagar enligt GDPR).

Du kan också anmäla klagomål till Integritetsskyddsmyndigheten (IMY):
https://www.imy.se
```

---

## What Must NOT Appear in the Privacy Policy

| Forbidden claim | Why |
|---|---|
| "Vi verifierar alla chaufförer" | False — DriverNord does not verify drivers |
| "Dina uppgifter är helt säkra" | Absolute security claims are misleading and unjustifiable |
| "Vi säljer aldrig dina uppgifter" | Unless lawyer confirms this — avoid absolutes |
| Claims about employing, staffing, or placing drivers | LPAf constraint — DriverNord is a lead service, not bemanning |
| Any claim about data retention shorter than what is actually stored | Retention must match practice |

---

## Implementation Steps

1. **Draft:** Claude Code drafts the full privacy policy in Swedish using this requirements document
2. **Lawyer review:** Swedish GDPR lawyer reviews for compliance
3. **Revise:** Claude Code updates based on lawyer feedback
4. **Publish:** Privacy policy page created at `https://drivernord.com/integritetspolicy`
5. **Footer link:** Add link to privacy policy in site footer
6. **Cookie banner link:** Add link to privacy policy in cookie banner copy
7. **Meta Pixel can now activate** (after all other gates also pass)

---

## DPAs Still Required

Before using Supabase and Vercel in production to process EU personal data:

| Provider | DPA | Status |
|---|---|---|
| Supabase Inc | Data Processing Agreement | NOT SIGNED — founder action |
| Vercel Inc | Data Processing Agreement | NOT SIGNED — founder action |
| Meta Platforms Ireland Ltd | Meta is a joint controller or processor (to be confirmed by lawyer) | REQUIRES LEGAL REVIEW |

---

*Version 1.0 — 2026-05-17 — Requirements only. Privacy policy not yet drafted or published.*
