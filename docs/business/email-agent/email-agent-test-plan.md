# DriverNord — Email Triage Agent Test Plan

**Date:** 2026-05-17
**Test framework:** Vitest (consistent with existing test suite)
**Module under test:** `lib/emailTriageAgent.ts`

---

## Test Scenarios

### Scenario 1 — Driver Inquiry (Swedish)

**Input:**
```
from: erik.svensson@gmail.com
subject: Söker körning — CE-chaufför
body: Hej! Jag heter Erik och är CE-chaufför med giltig YKB. Bor i Stockholm och är tillgänglig omgående. Söker heltidskörning, gärna distribution. Har 8 år erfarenhet. Kan man registrera sig hos er?
```

**Expected classification:** `DRIVER_INQUIRY`
**Expected confidence:** `high`
**Expected language:** `sv`
**Expected extracted fields:**
- licenseCategory: 'CE'
- ykb: detected ('YKB' + 'giltig')
- city: 'Stockholm'
- availability: detected ('omgående')
- preferredWorkType: detected ('distribution')
**Expected compliance flags:** none
**Expected suggested next action:** contains 'drivernord.com/chat' or 'chat flow'
**Expected draft behavior:** Swedish, warm, invites to /chat, no job guarantee
**Compliance assertions:**
- draft does NOT contain 'garanterat'
- draft does NOT contain 'officiellt verifierad'
- draft does NOT contain 'bemannings'

---

### Scenario 2 — Driver Inquiry (English)

**Input:**
```
from: john.smith@hotmail.com
subject: Driver registration inquiry
body: Hello, I am a truck driver with CE license and valid CPC card. I am based in Stockholm and available immediately. I am looking for local distribution work. How do I register?
```

**Expected classification:** `DRIVER_INQUIRY`
**Expected confidence:** `high`
**Expected language:** `en`
**Expected extracted fields:**
- licenseCategory: detected ('CE')
- ykb: detected ('CPC')
- city: detected ('Stockholm')
- availability: detected ('immediately')
**Expected compliance flags:** none
**Expected draft behavior:** English reply, invites to /chat or drivernord.com
**Compliance assertions:**
- draft does NOT contain 'guaranteed'
- draft does NOT contain 'officially verified'
- draft does NOT contain 'staffing'

---

### Scenario 3 — Company Inquiry — Urgent Driver Need

**Input:**
```
from: sara.lindqvist@transportab.se
subject: Vi söker CE-chaufförer omgående
body: Hej, vi är ett transportföretag i Stockholm och behöver 3 CE-chaufförer med YKB för distributionskörning, dagtid, helst från måndag nästa vecka. Hur fungerar er tjänst? /Sara Lindqvist, Transport AB
```

**Expected classification:** `COMPANY_INQUIRY`
**Expected confidence:** `high`
**Expected language:** `sv`
**Expected extracted fields:**
- companyName: detected ('Transport AB')
- contactPerson: detected ('Sara Lindqvist')
- licenseRequired: 'CE'
- numberOfDrivers: 3
- urgency: detected ('omgående')
- shiftType: detected ('dagtid')
- location: detected ('Stockholm')
**Expected compliance flags:** none
**Expected draft behavior:** Professional Swedish, acknowledges need, requests structured intake
**Compliance assertions:**
- draft does NOT contain 'garanterar'
- draft does NOT contain 'tusentals'
- `shouldAutoSend` is false

---

### Scenario 4 — Company Using Bemanning Language

**Input:**
```
from: tobias.berg@logistik.se
subject: Hyr chaufförer via er?
body: Hej, vi vill hyra ut CE-chaufförer via er som bemanningsbolag. Finns det möjlighet till detta? Vi behöver personal på löpande basis.
```

**Expected classification:** `COMPANY_INQUIRY`
**Expected confidence:** `medium`
**Expected language:** `sv`
**Expected compliance flags:** includes `COMPLIANCE_BEMANNING_LANGUAGE`
**Expected draft behavior:** Draft clarifies DriverNord is NOT a bemanningsbolag, explains the introduction/matching model
**Compliance assertions:**
- complianceFlags contains 'COMPLIANCE_BEMANNING_LANGUAGE'
- draft explicitly clarifies DriverNord model
- draft does NOT describe DriverNord as bemanningsbolag

---

### Scenario 5 — Spam

**Input:**
```
from: noreply@marketing-promo.com
subject: YOU HAVE WON — Claim your prize now
body: Congratulations! You have been selected to receive a prize. Click here to claim. Offer expires soon. Unsubscribe.
```

**Expected classification:** `SPAM_OR_IRRELEVANT`
**Expected confidence:** `high`
**Expected language:** `en`
**Expected extracted fields:** empty
**Expected compliance flags:** none (or at most irrelevant)
**Expected next action:** 'Mark as ignored — no reply needed'
**Expected draft behavior:** empty string or warning notice only
**Compliance assertions:**
- `draftReply` is empty or contains only a warning, not a business reply
- status is `IGNORED`
- `shouldAutoSend` is false

---

### Scenario 6 — GDPR / Data Deletion Request

**Input:**
```
from: anna.karlsson@outlook.com
subject: Radera mina uppgifter
body: Hej, jag vill att ni raderar alla mina personuppgifter från era system. Jag registrerade mig tidigare men vill inte längre vara med. GDPR ger mig rätt att bli bortglömd.
```

**Expected classification:** `LEGAL_ADMIN`
**Expected confidence:** `high`
**Expected language:** `sv`
**Expected compliance flags:** includes `LEGAL_GDPR_REQUEST`
**Expected next action:** 'Escalate — GDPR deletion request. Do not reply substantively. Acknowledge receipt only.'
**Expected draft behavior:** Acknowledgement only — "Vi bekräftar att vi mottagit din begäran..." — no confirmation of data held
**Compliance assertions:**
- complianceFlags contains 'LEGAL_GDPR_REQUEST'
- `requiresHumanApproval` is true
- `shouldAutoSend` is false
- draft does NOT confirm or deny what data is held
- draft does NOT contain data about the user

---

### Scenario 7 — Angry Complaint

**Input:**
```
from: mikael.holm@yahoo.se
subject: Skandalöst! Ni kontaktade mig utan tillstånd
body: Jag har aldrig registrerat mig hos er men fick ett SMS från er. Detta är olagligt och jag anmäler er till IMY om ni inte svarar. Radera mina uppgifter NU.
```

**Expected classification:** `LEGAL_ADMIN`
**Expected confidence:** `high`
**Expected language:** `sv`
**Expected compliance flags:** includes `LEGAL_GDPR_REQUEST`, `LEGAL_COMPLAINT`
**Expected next action:** 'Escalate — complaint + GDPR request. Consult with lawyer before any reply.'
**Expected draft behavior:** Acknowledgement only — does not dismiss the complaint
**Compliance assertions:**
- complianceFlags contains 'LEGAL_COMPLAINT'
- complianceFlags contains 'LEGAL_GDPR_REQUEST'
- `requiresHumanApproval` is true
- `shouldAutoSend` is false
- draft does NOT deny wrongdoing
- draft does NOT contain defensive language

---

### Scenario 8 — Irrelevant Partnership Pitch

**Input:**
```
from: partner@affiliatemarketing.se
subject: Samarbetsmöjlighet — Affiliate-program
body: Hej DriverNord! Vi erbjuder ett lönsamt affiliate-program för era kunder. Kontakta oss för mer information om hur vi kan samarbeta.
```

**Expected classification:** `PARTNERSHIP`
**Expected confidence:** `high`
**Expected language:** `sv`
**Expected extracted fields:**
- companyName: detected
**Expected compliance flags:** none
**Expected next action:** 'Low priority. Founder decides whether to engage.'
**Expected draft behavior:** Neutral acknowledgement, no commitment
**Compliance assertions:**
- draft does NOT express enthusiasm or commitment
- `shouldAutoSend` is false

---

### Scenario 9 — Meta/Facebook Lead-Style Message

**Input:**
```
from: facebookmail@facebookmail.com
subject: Du har fått ett nytt meddelande från DriverNord Facebook Page
body: Hej! Jag såg er annons på Facebook. Jag är CE-chaufför och söker nytt jobb. Kan ni hjälpa mig? — Leila
```

**Expected classification:** `META_LEAD_RESPONSE` or `DRIVER_INQUIRY`
**Expected confidence:** `medium` (ambiguous source)
**Expected language:** `sv`
**Expected extracted fields:**
- licenseCategory: 'CE'
**Expected compliance flags:** none
**Expected draft behavior:** Same as DRIVER_INQUIRY — invite to /chat flow
**Compliance assertions:**
- draft does NOT contain job guarantee
- `shouldAutoSend` is false

---

## Invariant Tests (must pass for every scenario)

These must be asserted for every single scenario:

1. `result.shouldAutoSend === false`
2. `result.requiresHumanApproval === true`
3. `result.draftReply` does not contain 'garanterat jobb'
4. `result.draftReply` does not contain 'officiellt verifierad'
5. `result.draftReply` does not contain 'bemanningsföretag' as a description of DriverNord
6. `result.category` is one of the 8 valid categories
7. `result.confidence` is one of 'high' | 'medium' | 'low'
8. `result.language` is one of 'sv' | 'en' | 'unknown'

---

## Non-Functional Tests

1. **Empty body** — should return `UNKNOWN` with confidence `low`
2. **Only whitespace** — should return `UNKNOWN`
3. **Very long body (5000+ chars)** — should not throw, should still classify
4. **XSS in subject** — `<script>alert(1)</script>` — should not execute, should classify as `UNKNOWN` or `SPAM_OR_IRRELEVANT`
5. **Non-Swedish, non-English language** — should return language `unknown`

---

*Version 1.0 — 2026-05-17 — Test plan for heuristic V1 agent. Scenarios map to emailTriageAgent.test.ts.*
