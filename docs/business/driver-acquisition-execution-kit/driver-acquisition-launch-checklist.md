# DriverNord — Startchecklista för Förvärvsuppstart

**Status:** Aktiv checklista — uppdateras av grundaren under uppstart
**Datum:** 2026-05-14
**Syfte:** Steg-för-steg checklista för att verifiera att alla förutsättningar är uppfyllda innan någon förvärvskanal startas. Bocka av varje punkt med datum och ansvarig.
**Viktigt:** Ingen kanal startas innan relevanta avsnitt i denna checklista är godkända.

---

## Checklista 1 — Juridisk beredskap

*Godkänns av: Grundare + Jurist*
*Blockerare för: Datainsamling och profildelnig*

| # | Punkt | Status | Datum | Ansvarig |
|---|-------|--------|-------|---------|
| L1 | Jurist har anlitats och briefats (legal-review-brief-for-lawyer.md skickats) | ☐ | | Grundare |
| L2 | Integritetspolicyn är juridiskt granskad och Art. 6-grunden bekräftad | ☐ | | Jurist + Grundare |
| L3 | "Preliminär version"-bannern på /privacy-sidan är borttagen efter juristens godkännande | ☐ | | Grundare |
| L4 | DPA-mallen är juridiskt granskad och strukturfrågan (Art. 26/28) är avgjord | ☐ | | Jurist + Grundare |
| L5 | Tjänsteavtalet är juridiskt granskat och rollbeskrivningen (ej bemanning) är bekräftad | ☐ | | Jurist + Grundare |
| L6 | Samtyckestexterna (driver-consent-language-v1.md) är juridiskt granskade och bekräftade | ☐ | | Jurist + Grundare |
| L7 | Raderingsprocess (Art. 17) är dokumenterad och testbar | ☐ | | Grundare |

**Blockerare-nivå:** L2, L4, L6 måste vara klara innan profiler delas. L2 bör vara klar innan kampanjen startar i stor skala.

---

## Checklista 2 — Operationell beredskap (teknisk)

*Godkänns av: Grundare*
*Blockerare för: All förvärvsaktivitet*

| # | Punkt | Status | Datum | Ansvarig |
|---|-------|--------|-------|---------|
| O1 | /chat-flödet är live i produktion och tillgängligt på drivernord.se/chaufförer | ☐ | | Grundare |
| O2 | Testregistrering genomförd i produktion — data syns i Supabase (lokal kontroll) | ☐ | | Grundare |
| O3 | /recruiter-dashboardet är tillgängligt i produktion med korrekt RECRUITER_API_KEY | ☐ | | Grundare |
| O4 | hej@drivernord.com är bekräftat aktivt och grundaren bevakar det dagligen | ☐ | | Grundare |
| O5 | Supabase produktionsmiljö är auktoriserad av grundaren för produktionstrafik | ☐ | | Grundare |
| O6 | Rate limiting på POST /api/leads är implementerat (blockerar bot-registreringar) | ☐ | | Grundare (teknisk uppgift) |

**Notering O6:** Rate limiting är en Medium-prioritet säkerhetslucka identifierad i security-state.md. Ska vara på plats innan Meta Ads startar för att undvika bot-pollution i databasen.

---

## Checklista 3 — 46elks SMS-konfiguration

*Godkänns av: Grundare*
*Blockerare för: Förarens kontakt och Stage 3-samtycke*
*Tidsuppskattning: 30 minuter*

| # | Punkt | Status | Datum | Ansvarig |
|---|-------|--------|-------|---------|
| S1 | 46elks-konto skapas på 46elks.com | ☐ | | Grundare |
| S2 | Kredit laddas på 46elks-kontot (rekommendation: 500 SEK att börja) | ☐ | | Grundare |
| S3 | `SMS_PROVIDER=46elks` satt i Vercel produktionsmiljö | ☐ | | Grundare |
| S4 | `SMS_API_KEY` satt i Vercel produktionsmiljö | ☐ | | Grundare |
| S5 | `SMS_API_SECRET` satt i Vercel produktionsmiljö | ☐ | | Grundare |
| S6 | `SMS_FROM_NUMBER` satt — antingen alfanumeriskt "DriverNord" eller ett dedikerat nummer | ☐ | | Grundare |
| S7 | Test-SMS skickat och mottaget utan fel | ☐ | | Grundare |
| S8 | STOPP/STOP opt-out-webhook konfigurerat i 46elks | ☐ | | Grundare |
| S9 | `AGENT_CONTACT_MODE=suggest` bekräftat (ingen automatisk SMS utan manuellt godkännande) | ☐ | | Grundare |

**Notering:** S9 är kritisk — suggest-läge innebär att inga SMS skickas utan att grundaren godkänner i /recruiter-dashboardet. Ändra inte till `auto`-läge utan noggrant övervägande.

---

## Checklista 4 — Meta Ads-startförberedelse

*Godkänns av: Grundare*
*Blockerare för: Betald Meta-kampanj*

| # | Punkt | Status | Datum | Ansvarig |
|---|-------|--------|-------|---------|
| M1 | Meta Business Manager-konto är aktivt | ☐ | | Grundare |
| M2 | Betalningsmetod tillagd i Meta Ads Manager | ☐ | | Grundare |
| M3 | DriverNord Facebook-sida kopplad till Business Manager | ☐ | | Grundare |
| M4 | Meta Pixel installerat på /chat-sidan i produktion | ☐ | | Grundare (teknisk uppgift) |
| M5 | Pixel testad — bekräftar "PageView" event på drivernord.se/chaufförer | ☐ | | Grundare |
| M6 | Konverteringshändelse konfigurerad: komplett registrering (steg 13) = "Lead" event | ☐ | | Grundare |
| M7 | Annonsbudget beslutad och godkänd (rekommendation: Scenario B — 5 000 SEK/mån) | ☐ | | Grundare |
| M8 | Minst 3 statiska annonsmaterial producerade (baserat på meta-ads-copy-bank.md) | ☐ | | Grundare |
| M9 | Annonstexterna granskade av grundaren och en jurist (Employment Special Ad Category-frågan adresserad) | ☐ | | Grundare + Jurist |
| M10 | Ad Set 1 konfigurerat (CE Stockholm, ålder 28–58, intressetargeting) | ☐ | | Grundare |
| M11 | Kampanjen satt i Draft — EJ aktiverad. Inväntar startbeslut. | ☐ | | Grundare |

**Meta Ads startar INTE förrän M1–M11 är bockas av och grundaren tar ett explicit startbeslut.**

---

## Checklista 5 — Platsbanken-publicering

*Godkänns av: Grundare*
*Blockerare för: Platsbanken-kanal*

| # | Punkt | Status | Datum | Ansvarig |
|---|-------|--------|-------|---------|
| P1 | Arbetsförmedlingen arbetsgivarkonto skapas eller bekräftas | ☐ | | Grundare |
| P2 | Annonstexten granskad och godkänd (platsbanken-posting-draft.md) | ☐ | | Grundare |
| P3 | Korrekt annonsskattetyp och yrkeskategori vald i Platsbanken-formuläret | ☐ | | Grundare |
| P4 | Länken drivernord.se/chaufförer testad och fungerar i produktion | ☐ | | Grundare |
| P5 | Annonsen publicerad på Platsbanken | ☐ | | Grundare |
| P6 | Kalenderrem satt för annonsförnyelse om 30 dagar | ☐ | | Grundare |

---

## Checklista 6 — Facebook-grupperinlägg

*Godkänns av: Grundare*
*Blockerare för: Facebook-kanal*

| # | Punkt | Status | Datum | Ansvarig |
|---|-------|--------|-------|---------|
| F1 | Minst 2–3 relevanta Facebook-grupper identifierade (via sökning på "CE-chaufförer Stockholm", etc.) | ☐ | | Grundare |
| F2 | Gruppreglerna lästa för varje grupp — rekryterings-/marknadsföringsinlägg tillåtna | ☐ | | Grundare |
| F3 | Inläggsvariant vald och godkänd (facebook-groups-posts.md) | ☐ | | Grundare |
| F4 | Inlägg 1 publicerat i grupp 1. Grupp: [grundaren fyller i] | ☐ | | Grundare |
| F5 | Kommentarer bevakade och besvarade inom 24 timmar från publicering | ☐ | | Grundare |
| F6 | Inlägg 2 publicerat i grupp 2 (vänta minst 3–5 dagar efter första) | ☐ | | Grundare |

---

## Checklista 7 — Daglig driftsövervakning (under kampanjperioden)

*Utförs av: Grundare dagligen*
*AI-stöd: Claude Code genererar veckovisa rapporter på begäran*

| # | Punkt | Frekvens |
|---|-------|---------|
| D1 | Kontrollera hej@drivernord.com för inkommande meddelanden | Dagligen |
| D2 | Öppna /recruiter-dashboardet och granska nya registreringar och pending actions | Dagligen |
| D3 | Kör package-readiness-frågan (se acquisition-monitoring-dashboard-spec.md) | Dagligen |
| D4 | Kontrollera Meta Ads Manager — CTR, kostnad per klick, budgetförbrukning | Dagligen |
| D5 | Godkänn eller avvisa pending contact suggestions i /recruiter | Vid behov |
| D6 | Svara på Facebook-kommentarer | Vid behov |
| D7 | Veckovis: be Claude Code generera Weekly Acquisition Report | Veckovis (måndag) |

---

## Go/No-Go-startbeslut

Använd denna tabell för att fatta startbeslut per kanal. Alla punkter i respektive checklista måste vara bocka av.

| Kanal | Kräver | Go/No-Go idag | Datum redo |
|-------|--------|--------------|-----------|
| /chat registreringsflöde (produktion) | O1–O5, L2 | NO-GO | [grundaren fyller i] |
| Meta Ads-kampanj | O1–O5, M1–M11, L2, S1–S9 (för follow-up) | NO-GO | [grundaren fyller i] |
| Platsbanken-annons | O1, P1–P4, L2 | NO-GO | [grundaren fyller i] |
| Facebook-grupperinlägg | O1, F1–F3, L2 (rekommenderad) | NO-GO | [grundaren fyller i] |
| SMS till förare (tillgänglighetsbekräftelse) | S1–S9, L6 | NO-GO | [grundaren fyller i] |
| SMS Stage 3 (per-företagssamtycke) | S1–S9, L6, DPA-mall granskad | NO-GO | [grundaren fyller i] |
| Package 4-försäljning | Alla ovanstående + ≥5 tillgängliga förare | NO-GO | [grundaren fyller i] |
| Package 2-försäljning | Alla ovanstående + ≥15 tillgängliga förare | NO-GO | [grundaren fyller i] |

---

*Checklista version 1.0 — 2026-05-14 — Uppdateras av grundaren allt efter att punkterna uppfylls*
