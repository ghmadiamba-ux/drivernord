# DriverNord — Email Classification Taxonomy

**Date:** 2026-05-17
**Used by:** emailTriageAgent.ts

---

## Categories

### DRIVER_INQUIRY

**Description:** An individual asking about working as a driver via DriverNord. May be in Swedish or English. May include a self-introduction, license information, or work preferences.

**Example signals:**
- "Hej, jag är CE-chaufför och söker jobb"
- "I'm a truck driver looking for opportunities"
- "Har CE-körkort och YKB, söker körning"
- "Kan man registrera sig hos er?"
- "Vill veta mer om hur ni matchar"

**Required extracted fields (if present in email):**

| Field | Source pattern |
|-------|---------------|
| name | Greeting, signature |
| phone | Digits, tel:, +46 prefix |
| email | From: header |
| licenseCategory | CE, C, D, BE, CE+D etc. |
| ykb | "YKB", "yrkeskompetensbevis", "YKB giltig/expired/in progress" |
| city | City name, "bor i", "based in" |
| availability | "omgående", "tillgänglig", "available now", "i [month]" |
| experience | "X år erfarenhet", "years of experience" |
| consentMentioned | explicit consent language ("samtycker", "godkänner") |
| preferredWorkType | distribution, fjärr, fjärrtransport, regional, local, international |

**Suggested next action:** Invite driver to complete the structured intake flow at drivernord.com/chat. Do not attempt to collect additional information via email — the chat flow handles qualification.

**Default reply posture:** Warm and welcoming. Swedish if email is in Swedish, English if English. Invite to /chat flow. Do not promise any jobs. Do not claim official verification. Do not imply employment.

---

### COMPANY_INQUIRY

**Description:** A company or representative of a company asking about sourcing drivers through DriverNord. May be asking about pricing, process, availability of drivers, or requesting a driver immediately.

**Example signals:**
- "Vi söker CE-chaufförer för distributionskörning"
- "Har ni tillgängliga förare i Stockholm?"
- "Looking for truck drivers urgently"
- "We need 3 CE drivers starting Monday"
- "Hur fungerar er tjänst för företag?"
- "Vad kostar det att anlita er?"

**Required extracted fields (if present in email):**

| Field | Source pattern |
|-------|---------------|
| companyName | Organization name, domain, signature |
| contactPerson | Name in signature, "Jag heter", "My name is" |
| phone | Digits, +46 prefix |
| email | From: header |
| location | City, region mentioned |
| driverNeed | Distribution, fjärr, tanktransport, bulk, etc. |
| licenseRequired | CE, C, D |
| urgency | "omgående", "urgent", "asap", "immediately", specific date |
| startDate | Specific date mention |
| shiftType | Dag, natt, helg, 24/7 |
| numberOfDrivers | Number of drivers required |
| dataSharingSensitivity | Any mention of NDA, confidentiality |

**Suggested next action:** Acknowledge inquiry. Request structured company need information using the standard intake template. Do not quote prices by email — direct to a discovery call or the company intake form.

**Default reply posture:** Professional. Acknowledge need. Explain that DriverNord works with verified (self-reported) CE/YKB drivers. Request structured need details. Do not over-promise supply. Do not guarantee drivers or timelines.

**Compliance warning:** If email uses the word "bemanning", "hyra chaufförer", "anställa via er", or similar staffing language: flag as `COMPLIANCE_BEMANNING_LANGUAGE`. The draft reply must clarify the correct model (introduction / matchning, not staffing).

---

### META_LEAD_RESPONSE

**Description:** A message that appears to originate from a Meta/Facebook campaign, lead form, or page inquiry. Often has a specific structure or references Facebook, Instagram, or a Meta lead ad.

**Example signals:**
- Email forwarded from Facebook Page inquiry
- Contains UTM parameters or Facebook references
- Short, form-like content
- "Vi fick ditt svar via Facebook"
- "This message was sent via [page name] on Facebook"

**Required extracted fields:** Classify sub-intent first (is this a driver or company?) then apply the appropriate field extraction above.

**Suggested next action:** Classify sub-intent (DRIVER or COMPANY), then follow that category's suggested action.

**Default reply posture:** Same as sub-intent category. Note the Meta source for attribution tracking.

---

### SUPPORT_REQUEST

**Description:** A question about how DriverNord works, a request for help, or a general inquiry that does not clearly indicate the sender is a driver or company. May be from press, curious individuals, or someone who found the site.

**Example signals:**
- "Hur fungerar matchningsprocessen?"
- "Vad innebär det att vara registrerad hos er?"
- "I have a question about your platform"
- "Jag förstår inte hur jag registrerar mig"

**Required extracted fields:** None required. Log category and summary.

**Suggested next action:** Founder answers question directly. If the question is from a driver, invite to /chat flow. If from a company, invite to provide a need.

**Default reply posture:** Helpful and informative. Do not share unconfirmed statistics or capability claims. Be honest about current V1 stage if asked.

---

### LEGAL_ADMIN

**Description:** Any email that involves legal rights, GDPR data subject requests, complaints, regulatory inquiries, or requests that require legal attention.

**Example signals:**
- "Jag vill radera mina uppgifter"
- "I want my data deleted"
- "Rätt att bli glömd"
- "GDPR request"
- "I have filed a complaint with IMY"
- "Diskriminering"
- "Datainspektionen"
- "IMY"
- "Jag anmäler er"
- "Jag kontaktar Konsumentverket"
- "Data deletion"
- "Access request"
- "Subject Access Request"
- "SAR"

**Required extracted fields:**
- requestType: deletion / access / correction / complaint / regulatory
- dataSubject: name/email of the person whose data is affected
- urgency: GDPR requires response within 30 days (Art. 12)

**Suggested next action:** ESCALATE immediately. Do not auto-reply with substantive content. Send acknowledgement of receipt only. Forward to lawyer if applicable.

**Default reply posture:** Acknowledge receipt only. State that the request is being processed. State the 30-day response window. Do not admit, deny, or explain what data is held. Never auto-send — always human approved.

---

### PARTNERSHIP

**Description:** An unsolicited or invited email proposing a business partnership, affiliate arrangement, collaboration, or commercial relationship unrelated to the core driver/company matching flow.

**Example signals:**
- "Samarbete"
- "Partner"
- "Affiliate"
- "Vi vill erbjuda er våra tjänster"
- "We'd like to discuss a collaboration"
- "Press inquiry"
- "Media"

**Required extracted fields:**
- companyName
- contactPerson
- proposal (brief summary)

**Suggested next action:** Founder reviews and decides. Low priority. No commitment in draft reply.

**Default reply posture:** Neutral acknowledgement only. Do not express interest or commit to anything. "Vi återkommer om vi ser en möjlighet."

---

### SPAM_OR_IRRELEVANT

**Description:** Automated marketing emails, scam attempts, irrelevant commercial pitches, or emails clearly not intended for DriverNord or not requiring a response.

**Example signals:**
- "Unsubscribe"
- "You have been selected"
- "Click here to claim"
- "SEO services"
- "Win a prize"
- Bulk sender headers
- "no-reply@" from address
- Lottery / inheritance scam patterns

**Required extracted fields:** None.

**Suggested next action:** Mark IGNORED. Do not reply. Do not unsubscribe (may confirm active address).

**Default reply posture:** No draft generated. Status set to IGNORED.

---

### UNKNOWN

**Description:** Email content that cannot be reliably classified into any of the above categories. Confidence is always low for UNKNOWN.

**Example signals:**
- Empty body
- Non-Swedish/English content in unrecognized language
- Extremely short message with no context
- Automated system messages (delivery failures, read receipts)

**Required extracted fields:** None.

**Suggested next action:** Founder reads raw email and decides category manually. Escalate if any legal/sensitive content is suspected.

**Default reply posture:** Minimal: "Tack för ditt meddelande. Vi återkommer." Only if founder decides to acknowledge.

---

## Compliance Warning Triggers (any category)

Any email containing the following patterns triggers a compliance flag in `complianceFlags[]`:

| Pattern | Flag |
|---------|------|
| "bemanning", "bemanningsbolag", "hyr ut" | `COMPLIANCE_BEMANNING_LANGUAGE` |
| "garanterat jobb", "garanterar arbete", "guaranteed job" | `COMPLIANCE_JOB_GUARANTEE` |
| "officiellt verifierad", "officiell verifiering" | `COMPLIANCE_VERIFICATION_CLAIM` |
| "anställer chaufförer", "DriverNord employs" | `COMPLIANCE_EMPLOYMENT_CLAIM` |
| "gdpr", "personuppgift", "radera", "delete my data", "right to be forgotten", "SAR", "IMY", "datainspektionen" | `LEGAL_GDPR_REQUEST` |
| "anmäler", "anmälan", "klagar", "complaint", "report to" | `LEGAL_COMPLAINT` |
| Aggressive or threatening language | `ESCALATE_THREAT` |

---

*Version 1.0 — 2026-05-17 — Classification taxonomy for heuristic V1 agent.*
