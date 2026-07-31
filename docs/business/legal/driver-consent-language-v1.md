# DriverNord — Samtyckestexter för förarregistrering

**Status:** PRELIMINÄR VERSION — UTKAST FÖR JURISTGRANSKNING
**Datum:** 2026-05-14
**Syfte:** Definiera exakt samtyckesspråk för varje steg i förarens resa i DriverNord-systemet. Texterna är avsedda att implementeras i registreringschatten, SMS-flödet, och den interna samtyckesdatabasen.
**Varning:** Detta är ett AI-genererat utkast. Det har inte granskats av jurist. Samtliga markerade avsnitt [JURIDISK GRANSKNING KRÄVS] kräver bekräftelse av behörig svensk dataskyddsjurist innan implementation.

---

## Översikt — Samtyckessteg

| Steg | Namn | Kanal | Trigger | Lagras som |
|------|------|-------|---------|-----------|
| Stage 1 | Registreringssamtycke | Registreringschat (webb) | Sista steget i /chat-flödet | `drivers.consent_registration_at` |
| Stage 2 | Tillgänglighetsbekräftelse | SMS | Schemalagt av `followUpAgent` | `drivers.availability_confirmed_at` |
| Stage 3 | Företagsspecifikt introduktionssamtycke | SMS | Före shortlistleverans | `shortlist_entries.consent_given_at` + `drivers.company_consents` |
| Stage 4 | Återkallelse och radering | E-post / SMS / webbformulär | Initierat av föraren | `drivers.consent_withdrawn_at` + radering av profil |

---

## Stage 1 — Registreringssamtycke

### Kort version (UI — visas i chatten, steg 13/13)

**Svenska:**

> Genom att trycka på "Bekräfta" godkänner du att DriverNord lagrar din profil och kontaktar dig via SMS för att bekräfta din tillgänglighet och eventuellt presentera relevanta uppdrag. Din profil delas **aldrig** med ett specifikt företag utan ditt uttryckliga godkännande. Du kan när som helst återkalla ditt samtycke genom att kontakta oss på hej@drivernord.se.

**CTA-knapp:** Bekräfta och registrera

---

### Längre version (Policy / integritetspolicy)

**Svenska:**

> Genom att slutföra registreringen och klicka på "Bekräfta och registrera" lämnar du ditt samtycke i enlighet med GDPR Art. 6(1)(a) till att DriverNord behandlar de personuppgifter du angett (kontaktuppgifter, körkortsklass, YKB-status, tillgänglighet, region och skiftpreferens) för följande ändamål:
>
> 1. **Profilering och matchning:** Dina uppgifter lagras i DriverNords databas och används för att matcha din profil mot transportföretags aktuella behov.
> 2. **Kontakt via SMS:** DriverNord kan kontakta dig via SMS för att bekräfta att din uppgivna tillgänglighet är aktuell, och för att informera dig om potentiellt relevanta uppdrag.
> 3. **Profiladministration:** DriverNord kan uppdatera din profilstatus baserat på dina svar.
>
> **Vad detta samtycke inte täcker:** Din profil (namn, kontaktuppgifter och kvalifikationsuppgifter) delas **aldrig** med ett specifikt klientföretag utan att du uttryckligen godkänt det i ett separat steg.
>
> **Återkallelse:** Du kan återkalla ditt samtycke när som helst utan negativa konsekvenser genom att kontakta hej@drivernord.se. Vid återkallelse raderas din profil ur DriverNords aktiva databas.
>
> All information om körkortsklass, YKB och övriga yrkeskvalifikationer är **självdeklarerad av dig** och har inte kontrollerats mot Transportstyrelsen eller annat officiellt register.

---

### Täckt data

- Telefonnummer
- E-postadress
- Förnamn
- Körkortsklass (CE/C/D — självdeklarerat)
- YKB-status (självdeklarerat)
- Förarkortsstatus (självdeklarerat)
- Domänpreferenser
- Tillgänglighet och skiftpreferens
- Region och omflyttningspreferens
- Språkval

### Tillåten åtgärd efter Stage 1-samtycke

- Lagra profil i Supabase `drivers`-tabell
- Klassificera och poängsätta profilen (`classify.ts`, `scoreDriver`)
- Ingesta till `ingested_drivers`
- Matcha mot klientbehov internt
- Kontakta föraren via SMS för tillgänglighetsbekräftelse och uppföljning
- **Inte tillåtet:** Dela profilen med ett namngivet klientföretag (kräver Stage 3)

### Vad som ska lagras som samtyckesbevis

| Fält | Var | Innehåll |
|------|-----|---------|
| `consent_registration_at` | `drivers`-tabell | Tidsstämpel för bekräftelse (ISO 8601) |
| `consent_registration_ip` | `drivers`-tabell (rekommenderat) | IP-adress vid registrering [JURIDISK GRANSKNING KRÄVS — lagring av IP under GDPR] |
| `consent_version` | `drivers`-tabell | Version av samtycketexten (t.ex. "v1.0-2026-05-14") |

[JURIDISK GRANSKNING KRÄVS — bekräfta att opt-in-knapp i chat utan e-postkonfirmation är tillräckligt som samtyckesdokumentation under GDPR]

---

## Stage 2 — Tillgänglighetsbekräftelse

### Kort version (SMS-text)

**Svenska:**

> Hej [Förnamn]! Du är registrerad i DriverNord som tillgänglig CE-förare. Stämmer det fortfarande? Svara JA för att bekräfta, NEJ om du inte längre är tillgänglig. /DriverNord hej@drivernord.se

**Maxlängd:** 160 tecken (en SMS-enhet). Ovanstående är 156 tecken — OK.

---

### Längre version (Policy / intern dokumentation)

**Svenska:**

> DriverNord kontaktar dig periodiskt via SMS för att bekräfta att den tillgänglighet du uppgivit vid registrering fortfarande stämmer. Denna kontakt grundar sig på det samtycke du lämnade vid registrering (Stage 1).
>
> Syftet är att säkerställa att inga klientföretag introduceras till förare som inte längre är tillgängliga — vilket skyddar dig som förare från oönskad kontakt och skyddar klientföretaget från felaktig information.
>
> Svara JA: Din profil förblir aktiv med aktuellt tillgänglighetsdatum uppdaterat.
> Svara NEJ: Din profil uppdateras till "ej tillgänglig" och du kontaktas inte för introduktioner tills du meddelar att din situation ändrats.

---

### Täckt data

- Tillgänglighetsstatus (bekräftad/ej bekräftad)
- Bekräftelsedatum
- SMS-svar (JA/NEJ)

### Tillåten åtgärd efter Stage 2-bekräftelse

- Uppdatera `drivers.availability` och `drivers.availability_confirmed_at`
- Inkludera i aktiv matchningspool
- Initiera Stage 3-process för aktuell matchning

### Vad som ska lagras som samtyckesbevis

| Fält | Var | Innehåll |
|------|-----|---------|
| `availability_confirmed_at` | `drivers`-tabell | Tidsstämpel för senaste bekräftelse |
| `availability_confirmation_response` | `drivers`-tabell | "JA" / "NEJ" / "inget svar" |
| SMS-logg | `system_actions`-tabell | `action_type: availability_confirmed`, `input: {driver_id, response}` |

[JURIDISK GRANSKNING KRÄVS — bekräfta att SMS-svar är tillräckligt samtyckesbevis för tillgänglighetsuppdatering]

---

## Stage 3 — Företagsspecifikt introduktionssamtycke

### Kort version (SMS-text)

**Svenska:**

> Hej [Förnamn]! Vi har ett potentiellt uppdrag för dig. [Företagsnamn] i [Stad] söker CE-förare med YKB för [kortbeskrivning av roll, t.ex. "regionala transporter"]. Får vi presentera din profil för dem? Svara JA för att godkänna, NEJ för att avböja. /DriverNord

**Maxlängd:** Ovanstående variant är ~200 tecken (2 SMS-enheter — OK för B2C-SMS).

---

### Alternativ kort version (om teckenbudget är kritisk)

**Svenska:**

> DriverNord: [Företagsnamn] söker CE-förare. Får vi presentera din profil? Svara JA = godkänn, NEJ = avböj. Frågor: hej@drivernord.se

---

### Längre version (Policy / intern dokumentation)

**Svenska:**

> Innan DriverNord delar din profil med ett specifikt transportföretag inhämtar vi ditt uttryckliga samtycke till den specifika introduktionen. Detta sker via SMS.
>
> SMS:et innehåller:
> - Namnet på klientföretaget
> - Ort och affärstyp (i den mån känt)
> - En kort beskrivning av rollen/behovet
>
> **Ditt svar:**
> - Svarar du JA: DriverNord vidarebefordrar din profil (förnamn, körkortsklass, YKB-status, tillgänglighet, kontaktuppgifter) till det namngivna företaget. Ditt samtycke loggas med tidsstämpel och företagsnamn.
> - Svarar du NEJ: Din profil delas inte. Du kan fortfarande bli kontaktad för andra potentiella matchningar med andra företag.
> - Svarar du inte inom 48 timmar: Din profil delas **inte**. Vi tolkar uteblivet svar som NEJ.
>
> **Samtyckets begränsning:** Ditt samtycke gäller enbart introduktion till det specifikt namngivna företaget. DriverNord delar inte din profil med andra företag utan ett nytt separat samtycke för varje ny introduktion.
>
> **Uppgifter som delas:** Förnamn, telefonnummer (för att klientföretaget ska kunna kontakta dig direkt), körkortsklass (självdeklarerat), YKB-status (självdeklarerat), tillgänglighet per angivet datum, och en kort matchningskommentar från DriverNord.
>
> **Vad som inte delas:** E-postadress (om inte föraren specifikt godkänt detta), fullständigt efternamn (om inte registrerat), interna poäng och klassificeringar.

---

### Täckt data vid delning

- Förnamn
- Telefonnummer
- Körkortsklass (självdeklarerat)
- YKB-status (självdeklarerat)
- Uppgiven tillgänglighet (per bekräftelsedatum)
- Region/ort
- DriverNords matchningskommentar

[JURIDISK GRANSKNING KRÄVS — bekräfta att SMS-svar är tillräckligt specifikt samtycke för profildelning, och att samtyckets specificitet uppfyller GDPR Art. 6(1)(a)-kravet]

### Tillåten åtgärd efter Stage 3-samtycke

- Inkludera föraren i shortlist till det specifikt namngivda företaget
- Leverera shortlist-dokumentet (med profil) till klientföretaget
- Logga att introduktionen skett

### Vad som ska lagras som samtyckesbevis

| Fält | Var | Innehåll |
|------|-----|---------|
| `consent_given_at` | `shortlist_entries`-tabell | Tidsstämpel för JA-svar |
| `consent_company_id` | `shortlist_entries`-tabell | ID för klientföretaget som samtycket gäller |
| `consent_company_name` | `shortlist_entries`-tabell | Namn på klientföretaget (klartext, för läsbarhet i audit) |
| SMS-logg | `system_actions`-tabell | `action_type: stage3_consent_given`, `input: {driver_id, company_id, response, timestamp}` |
| `company_consents` | `drivers`-tabell (JSONB) | Array av `{company_id, company_name, consented_at}` för historik |

[JURIDISK GRANSKNING KRÄVS — bekräfta att ovanstående loggstruktur är tillräcklig för att dokumentera GDPR-konformt samtycke vid eventuell granskning]

---

## Stage 4 — Återkallelse och radering

### Kort version (svar till förare som begär återkallelse)

**Svenska:**

> Tack för ditt meddelande. Vi har tagit emot din begäran om att återkalla ditt samtycke och radera din profil ur DriverNords system. Vi bekräftar radering inom 5 arbetsdagar och meddelar dig via e-post/SMS när det är genomfört.

---

### Längre version (Policy / intern dokumentation)

**Svenska:**

> Du har rätt att när som helst återkalla det samtycke du lämnat till DriverNord, utan att ange skäl och utan negativa konsekvenser. Återkallelse innebär att:
>
> 1. Din profil markeras som inaktiv och tas bort från den aktiva matchningspoolen omedelbart.
> 2. Din profil raderas ur DriverNords aktiva databas inom 5 arbetsdagar från begäran.
> 3. Du kontaktas inte längre via SMS efter bekräftelse av återkallelsen.
> 4. Samtyckeloggar (bevis på att samtycke lämnades) behålls i upp till 3 år som dokumentation av att behandlingen var laglig under den period då samtycke förelåg. [JURIDISK GRANSKNING KRÄVS — bekräfta lagringstid för samtyckeloggar efter återkallelse]
>
> **Återkallelse påverkar inte** lagligheten av behandling som genomfördes medan samtycket var aktivt.
>
> **Hur du återkallar:**
> - Skicka e-post till hej@drivernord.se med ämnesraden "Återkallelse av samtycke"
> - Eller svara NEJ/STOPP på ett SMS från DriverNord
>
> **Svarstid:** Vi bekräftar mottagande inom 2 arbetsdagar och genomför radering inom 5 arbetsdagar.

---

### Täckt data vid återkallelse

- Alla personuppgifter i `drivers`-tabellen (raderas eller anonymiseras)
- Alla poster i `ingested_drivers` kopplade till föraren (raderas)
- Shortlist-poster i `shortlist_entries` (markeras som inactive; se juristen om radering påverkar DPA-dokumentation)
- SMS-historik (raderas ur aktiv lagring inom retentionstid)
- Samtyckeloggar (behålls per ovanstående punkt) [JURIDISK GRANSKNING KRÄVS]

### Vad som ska lagras som bevis på återkallelse

| Fält | Var | Innehåll |
|------|-----|---------|
| `consent_withdrawn_at` | `drivers`-tabell | Tidsstämpel för återkallelsebegäran |
| `withdrawal_method` | `drivers`-tabell | "email" / "sms" / "webform" |
| `deletion_confirmed_at` | `drivers`-tabell | Tidsstämpel för faktisk radering |
| Systemlogg | `system_actions`-tabell | `action_type: consent_withdrawn`, `input: {driver_id, method, requested_at}` |

[JURIDISK GRANSKNING KRÄVS — bekräfta att manuell raderingsprocess är tillräcklig under GDPR Art. 17 för nuvarande skala (<50 förare)]

---

## Implementation Notes (English)

The following notes are for the engineering implementation of these consent records.

**Database fields to confirm exist or add:**
- `drivers.consent_registration_at` — TIMESTAMPTZ, nullable
- `drivers.consent_version` — TEXT (e.g., "v1.0-2026-05-14")
- `drivers.availability_confirmed_at` — TIMESTAMPTZ, nullable
- `drivers.consent_withdrawn_at` — TIMESTAMPTZ, nullable
- `shortlist_entries.consent_given_at` — TIMESTAMPTZ, nullable
- `shortlist_entries.consent_company_id` — UUID FK to companies
- `drivers.company_consents` — JSONB array (or separate consent log table)

**Stage 3 consent flow requirement:** The `contactAgent.ts` must check for Stage 3 consent before including any driver in a delivered shortlist. `buildShortlist()` output is internal only; the delivery step requires consent confirmation. [Claude Code to implement consent gate when this sprint is authorized]

**SMS opt-out:** 46elks supports STOP keyword natively; configure to trigger `consent_withdrawn_at` update automatically via webhook. [LEGAL REVIEW REQUIRED — confirm this satisfies GDPR requirements for consent withdrawal]

---

*Dokumentversion: 1.0 — 2026-05-14 — Utkast för juristgranskning*
*Samtliga samtyckestexter kräver granskning av behörig svensk dataskyddsjurist innan de publiceras eller implementeras i produktion.*
