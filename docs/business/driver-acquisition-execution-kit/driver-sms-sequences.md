# DriverNord — SMS-sekvenser för förarflödet

**Status:** Utkast — [JURIDISK GRANSKNING KRÄVS] för samtyckestexter; kräver grundargranskning
**Datum:** 2026-05-14
**Syfte:** Exakta SMS-texter för varje steg i förarens resa i DriverNord-systemet. Texterna är avsedda att implementeras i `contactAgent.ts` och `followUpAgent.ts` när 46elks är konfigurerat.
**Viktigt:** Inga av dessa SMS skickas av Claude Code. De kräver: (1) 46elks konfigurerat, (2) grundarens godkännande, (3) juridisk granskning av samtyckestexter. Se `driver-consent-language-v1.md` för fullständiga consent-detaljer.

---

## SMS-tekniska noteringar

- **Leverantör:** 46elks (konfigureras med `SMS_PROVIDER=46elks`)
- **Kostnad:** Ca 0,49 SEK/SMS (pay-as-you-go)
- **Teckengräns:** 160 tecken = 1 SMS-enhet (UTF-8: 70 tecken). Alla mallar nedan är optimerade för 1–2 SMS-enheter.
- **Avsändar-ID:** Konfigurera `SMS_FROM_NUMBER` som alfanumeriskt ID "DriverNord" (max 11 tecken) eller ett dedikerat telefonnummer
- **Opt-out:** 46elks stöder nyckelord som STOPP/STOP — konfigurera webhook för att trigga `consent_withdrawn_at` automatiskt
- **Tidszon:** Skicka SMS kl. 07:00–19:00 svensk tid (CET/CEST)
- **Teckenräkning:** Alla mallar nedan inkluderar ungefärlig teckenräkning

---

## SMS 1 — Registreringsbekräftelse

**När:** Triggas automatiskt av systemet omedelbart när föraren slutför registreringssteg 13 (bekräftelse) i /chat-flödet.
**Agent:** Kan triggas av `ingestLead.ts` efter lyckad ingestion.
**Syfte:** Bekräfta registrering, sätta rätt förväntning, och ge föraren ett sätt att kontakta oss.

---

### Variant 1A — Standard (rekommenderad)

```
DriverNord: Hej [Förnamn]! Din profil är registrerad. Vi kontaktar
dig om vi hittar en match. Du godkänner alltid innan vi delar något.
Frågor: hej@drivernord.com
```
**Tecken:** ~155 ✓ (1 SMS)

---

### Variant 1B — Kort version

```
DriverNord: Profil mottagen, [Förnamn]! Vi hör av oss om vi hittar
en matchning. Du bestämmer om vi får presentera dig. /DriverNord
```
**Tecken:** ~130 ✓ (1 SMS)

---

### Variant 1C — Med opt-out-påminnelse

```
DriverNord: Hej [Förnamn]! Profil registrerad. Vi kontaktar dig om vi
hittar ett bra uppdrag. Svara STOPP för att avregistrera.
hej@drivernord.com
```
**Tecken:** ~155 ✓ (1 SMS)

**[JURIDISK GRANSKNING KRÄVS — bekräfta att "Svara STOPP" uppfyller GDPR och Lag om elektronisk kommunikation (2022:482) krav på opt-out för SMS-kommunikation]**

**Implementeringsnotering:** `[Förnamn]` ersätts av `drivers.first_name` från Supabase. Om förnamn saknas, använd "Hej!" utan namn.

---

## SMS 2 — Tillgänglighetsbekräftelse (Stage 2)

**När:** Triggas av `followUpAgent.ts` när `follow_up_at <= now` och `follow_up_sent = false`. Schemalagt av `computeFollowUp()` baserat på förarens uppgivna tillgänglighet.
**Syfte:** Bekräfta att förarens uppgivna tillgänglighet fortfarande stämmer. Utan detta kan vi inte shortlista föraren.
**Samtyckeskrav:** Stage 2-bekräftelse — samtyckt till vid registrering (Stage 1). Inget nytt samtycke krävs för att skicka detta SMS. [JURIDISK GRANSKNING KRÄVS]

---

### Variant 2A — Standard

```
DriverNord: Hej [Förnamn]! Du är registrerad som tillgänglig
CE-förare. Stämmer det fortfarande? Svara JA för att bekräfta,
NEJ om du inte längre är tillgänglig. /DriverNord
```
**Tecken:** ~156 ✓ (1 SMS)

---

### Variant 2B — Med datum

```
DriverNord: Hej [Förnamn]! Din tillgänglighet angavs som
[tillgänglighetsperiod]. Fortfarande aktuellt? JA = bekräfta,
NEJ = inte tillgänglig. Tack! /DriverNord
```
**Tecken:** ~148 ✓ (1 SMS)
**Implementering:** `[tillgänglighetsperiod]` ersätts av `drivers.availability` — t.ex. "tillgänglig nu" eller "tillgänglig om 4 veckor"

---

### Variant 2C — Kort påminnelse (för andra kontaktförsök)

```
DriverNord: Hej [Förnamn]! Svarade du inte på vårt SMS. Fortfarande
tillgänglig CE-förare? JA / NEJ. /DriverNord hej@drivernord.com
```
**Tecken:** ~135 ✓ (1 SMS)

**Svarshantering:**
- JA: Uppdatera `drivers.availability_confirmed_at = now()`, `drivers.availability_confirmation_response = 'JA'`
- NEJ: Uppdatera `drivers.availability = 'unavailable'`, `drivers.lead_status = 'unavailable'`
- Inget svar inom 48h: Logga `availability_confirmation_response = 'inget svar'` — kontakta igen om 7 dagar

---

## SMS 3 — Företagsspecifikt introduktionssamtycke (Stage 3)

**När:** Triggas manuellt av grundaren (via `/recruiter`-dashboardet i suggest-läge) eller automatiskt av `contactAgent.ts` i auto-läge när shortlist skapas och föraren ska presenteras för ett specifikt klientföretag.
**Syfte:** Inhämta förarens uttryckliga samtycke till att deras profil delas med ett specifikt namngivet transportföretag.
**Kritisk regel:** Förarens profil delas ALDRIG utan JA-svar på detta SMS. Inget svar tolkas som NEJ.

**[JURIDISK GRANSKNING KRÄVS — hela Stage 3-processen kräver juridisk bekräftelse. Se driver-consent-language-v1.md Stage 3 för detaljer.]**

---

### Variant 3A — Standard (rekommenderad)

```
DriverNord: Hej [Förnamn]! Vi har ett potentiellt uppdrag. [Företagsnamn]
i [Stad] söker CE-förare. Får vi presentera din profil för dem?
JA = godkänn, NEJ = avböj. /DriverNord
```
**Tecken:** ~165 ✓ (2 SMS om företagsnamnet är långt — acceptabelt)

---

### Variant 3B — Med mer kontext om rollen

```
DriverNord: Hej [Förnamn]! [Företagsnamn] i [Stad] söker CE-förare
för [rollbeskrivning, t.ex. "regionala transporter"]. Får vi ge dem
din profil? JA = ja, NEJ = nej tack. /DriverNord
```
**Tecken:** ~175 (2 SMS — OK för B2C med hög relevans)

---

### Variant 3C — Minimal version (om längden är kritisk)

```
DriverNord: [Företagsnamn] söker CE-förare. Får vi presentera dig?
JA = godkänn, NEJ = avböj. Frågor: hej@drivernord.com /DriverNord
```
**Tecken:** ~135 ✓ (1 SMS)

---

**Implementeringsvariabler:**
- `[Förnamn]` → `drivers.first_name`
- `[Företagsnamn]` → `companies.name`
- `[Stad]` → `companies.city` (om tillgänglig)
- `[rollbeskrivning]` → `company_needs.description` (kortklipt)

**Svarshantering:**
- JA: Uppdatera `shortlist_entries.consent_given_at = now()`, `shortlist_entries.consent_company_id = company_id`; logga i `system_actions`; föraren kan nu inkluderas i shortlist
- NEJ: Uppdatera `shortlist_entries.consent_declined_at = now()`; föraren inkluderas inte; kan kontaktas för nästa matchning
- Inget svar inom 48h: Behandlas som NEJ; skicka Variant 3D (påminnelse) en gång

---

## SMS 4 — Påminnelse om uteblivet svar

**När:** Triggas av `followUpAgent.ts` om föraren inte svarat på SMS 2 (tillgänglighetsbekräftelse) eller SMS 3 (Stage 3-samtycke) inom 48 timmar.
**Syfte:** Ge föraren en sista chans att svara utan att vara påträngande.
**Frekvens:** Skickas max en gång per ursprungligt SMS. Skicka inte mer än 2 kontaktförsök per ärende.

---

### Variant 4A — Påminnelse om tillgänglighetsbekräftelse (för SMS 2)

```
DriverNord: Hej [Förnamn]! Fick du vårt SMS? Vi försöker bekräfta din
tillgänglighet. JA = fortfarande tillgänglig, NEJ = inte längre.
/DriverNord
```
**Tecken:** ~150 ✓ (1 SMS)

---

### Variant 4B — Påminnelse om introduktionssamtycke (för SMS 3)

```
DriverNord: Hej [Förnamn]! Fick du frågan om [Företagsnamn]?
JA = godkänn introduktionen, NEJ = avböj. Gäller t.o.m. [datum+24h].
/DriverNord
```
**Tecken:** ~155 ✓ (1 SMS)

---

### Variant 4C — Allmän påminnelse (neutral ton)

```
DriverNord: Vi försökte nå dig. Svara JA eller NEJ på vårt förra SMS,
eller kontakta oss på hej@drivernord.com om du har frågor. /DriverNord
```
**Tecken:** ~145 ✓ (1 SMS)

**Policy efter påminnelse:** Om fortfarande inget svar efter påminnelse → markera som `availability_confirmation_response = 'inget svar'` och inga fler SMS skickas förrän följande schemalagda uppföljningscykel (7–14 dagar).

---

## SMS 5 — Bekräftelse av återkallelse och radering (Stage 4)

**När:** Triggas manuellt av grundaren (via e-post/hej@drivernord.com) eller automatiskt via STOPP-svar på SMS, när föraren begär att deras samtycke återkallas och profil raderas.
**Syfte:** Bekräfta att radering har genomförts och ge föraren trygghet.
**[JURIDISK GRANSKNING KRÄVS — bekräfta att SMS-bekräftelse är tillräcklig dokumentation av att GDPR Art. 17-begäran är hanterad]**

---

### Variant 5A — Bekräftelse av radering

```
DriverNord: Hej [Förnamn]! Vi har tagit emot din begäran och raderar
din profil. Klart inom 5 arbetsdagar. Frågor: hej@drivernord.com
/DriverNord
```
**Tecken:** ~155 ✓ (1 SMS)

---

### Variant 5B — Bekräftelse av opt-out via STOPP-svar

```
DriverNord: Du är nu avregistrerad. Vi skickar inga fler SMS. Din profil
raderas inom 5 dagar. Frågor: hej@drivernord.com /DriverNord
```
**Tecken:** ~140 ✓ (1 SMS)

---

### Variant 5C — Om föraren vill pausa (inte radera)

```
DriverNord: Inga problem! Vi markerar din profil som vilande och hör
inte av oss. Om du vill aktiveras igen, skriv till hej@drivernord.com
/DriverNord
```
**Tecken:** ~148 ✓ (1 SMS)
**Implementeringsnotering:** Kräver ett "vilande" status-läge i `drivers.lead_status`. Alternativt hanteras detta som en standard opt-out om det inte är implementerat.

---

## Komplett SMS-flödesöversikt

```
Föraren slutför /chat
         │
         ▼
SMS 1 — Registreringsbekräftelse (omedelbart)
         │
         ▼ (om availability = available_soon)
SMS 2 — Tillgänglighetsbekräftelse (vid follow_up_at)
    │
    ├── JA → Föraren är aktiv och shortlistningsbar
    ├── NEJ → Markeras unavailable; följ upp om 30 dagar
    └── Inget svar → SMS 4A (påminnelse, en gång)
                        └── Fortfarande inget → Markeras ej bekräftad
         │
         ▼ (när shortlist byggs och Stage 3 krävs)
SMS 3 — Företagsspecifikt samtycke
    │
    ├── JA → Inkluderas i shortlist; profil delas med klientföretaget
    ├── NEJ → Inkluderas inte; kan kontaktas för nästa matchning
    └── Inget svar 48h → SMS 4B (påminnelse, en gång)
                            └── Fortfarande inget → Behandlas som NEJ
         │
         ▼ (om föraren begär radering)
SMS 5 — Bekräftelse av återkallelse/radering
```

---

## Implementeringsstatus per SMS-typ

| SMS | Agent | Status idag | Kräver |
|-----|-------|------------|--------|
| SMS 1 | `ingestLead.ts` (ny trigger) | Ej implementerat | 46elks + ny trigger i ingestLead |
| SMS 2 | `followUpAgent.ts` | SIMULATED — console.log | 46elks konfiguration |
| SMS 3 | `contactAgent.ts` | SIMULATED — console.log | 46elks + Stage 3 consent flow |
| SMS 4 | `followUpAgent.ts` | SIMULATED — console.log | 46elks + logik för "om inget svar" |
| SMS 5 | Manuell (grundaren) | Ej implementerat | 46elks + manuell trigger i /recruiter |

**Sammanfattning:** Alla SMS kräver 46elks-konfiguration. SMS 3 och SMS 5 kräver dessutom implementation av ytterligare logik som inte finns idag. [Claude Code kan specificera dessa implementationsdetaljer i en separat teknisk spec när grundaren ger klartecken.]

---

*Utkast version 1.0 — 2026-05-14 — Kräver grundargranskning och juridisk granskning av samtyckestexter (se driver-consent-language-v1.md) innan implementering*
