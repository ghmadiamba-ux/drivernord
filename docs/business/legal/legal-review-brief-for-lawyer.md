# DriverNord — Underlag för juridisk granskning

**Status:** PRELIMINÄR VERSION — AVSETT ATT SKICKAS TILL JURIST
**Datum:** 2026-05-14
**Syfte:** Ge den anlitade juristen tillräcklig bakgrund för att kunna granska bifogade avtalsutkast och besvara konkreta rättsfrågor.
**Mottagare:** [Juristens namn], [Advokatbyråns namn]
**Avsändare:** [Grundarens namn], DriverNord
**Bilagor:** Se avsnitt 3 nedan.

---

## 1. Kort beskrivning av DriverNord

DriverNord är en AI-driven matchnings- och introduktionstjänst för yrkesförare och transportföretag på den svenska marknaden.

**Tjänsten fungerar så här:**
1. Yrkesförare (CE/C/D-licens) registrerar sina profiler frivilligt via en digital registreringschat på drivernord.se.
2. DriverNord lagrar profilerna, klassificerar dem automatiskt och matchar dem mot transportföretags dokumenterade behov.
3. När DriverNord identifierar en matchning inhämtas förarens uttryckliga samtycke via SMS till att bli introducerad till det specifika transportföretaget.
4. Vid samtycke levereras förarens profil till transportföretaget som ett underlag för rekryteringsbeslut.
5. Transportföretaget tar direkt kontakt med föraren och fattar ett självständigt anställnings- eller uppdragsbeslut.

**DriverNord är:**
- En introduktionstjänst och matchningsplattform
- En personuppgiftsansvarig gentemot yrkesförarna

**DriverNord är inte:**
- En arbetsgivare
- Ett bemanningsföretag (uthyrning av personal med Kollektivavtal, Fora-registrering m.m.)
- En rekryteringsbyrå som agerar som ombud för klientföretaget
- En part som garanterar anställning, körkortsinnehav eller yrkeslämplighet

---

## 2. Kommersiella produkter

DriverNord erbjuder i nuläget (V1) två produkter:

**Package 4 — Akut Förarsökning**
- Pris: 8 000–10 000 SEK exklusive moms
- Leverans: En (1) namngiven, samtyckesbekräftad yrkesförare introduceras inom 48 timmar
- Betalning: På leveransen (när profilen delas med klientföretaget)

**Package 2 — Verifierad Förarlista**
- Pris: 15 000 SEK exklusive moms (introduktionspris)
- Leverans: 3–5 matchade, samtyckesbekräftade yrkesförare i ett strukturerat dokument, inom 3–5 arbetsdagar
- Betalning: På leveransen (när shortlist-dokumentet mottagits av klienten)

Viktigt att notera: Alla uppgifter om körkortsklass, YKB-status och övriga yrkeskvalifikationer är **självdeklarerade av föraren**. DriverNord kontrollerar inte dessa uppgifter mot Transportstyrelsen eller annat officiellt register i nuläget.

---

## 3. Bifogade dokument för granskning

| Dokument | Fil | Syfte |
|---------|-----|-------|
| Integritetspolicy — rättslig grund | privacy-policy-legal-basis-draft.md | Ska integreras i den offentliga integritetspolicyn |
| Samtyckestexter | driver-consent-language-v1.md | SMS- och UI-texter för varje samtyckesteg |
| DPA-utkast | dpa-template-v1.md | Reglerar delning av föraruppgifter med klientföretag |
| Tjänsteavtal | service-agreement-v1.md | Kommersiellt avtal med transportföretagen |

Alla fyra dokument är AI-genererade utkast och har inte tidigare granskats juridiskt.

---

## 4. Juridiska frågor som kräver juristens bedömning

### Fråga 1 — Är den rättsliga grunden i integritetspolicyn korrekt formulerad?
Integritetspolicyn anger Art. 6(1)(a) (samtycke) som primär rättslig grund för behandling av förardata. Är detta korrekt, eller bör Art. 6(1)(b) (avtalsprestanda) vara primär grund för någon del av behandlingen? Är Art. 6(1)(f) (berättigat intresse) aktuellt för något behandlingssteg, och krävs i så fall en intresseavvägning (LIA)?

### Fråga 2 — Är samtyckesdesignen tillräcklig för profildelning?
Föraren ger sitt samtycke i tre steg: (1) registreringssamtycke via webbchat, (2) tillgänglighetsbekräftelse via SMS, (3) per-företagssamtycke via SMS med angivelse av klientföretagets namn. Uppfyller detta GDPR:s krav på fritt, specifikt, informerat och otvetydigt samtycke (Art. 4(11) och Art. 7)? Är SMS-svar tillräckligt samtyckesbevis?

### Fråga 3 — Ska DPA-avtalet vara ett Art. 28-avtal, ett Art. 26-avtal, eller ett Controller-to-Controller-avtal?
DriverNord delar föraruppgifter med klientföretag, som sedan behandlar uppgifterna för egna rekryteringsändamål. Vilken GDPR-struktur är korrekt? Juristen ska ange rätt modell och justera DPA-utkastet därefter.

### Fråga 4 — Undviker tjänsteavtalet klassificering som bemanningsverksamhet?
DriverNord avser att vara en introduktionstjänst, inte ett bemanningsföretag. Tjänsteavtalet innehåller en uttrycklig rollbeskrivning (avsnitt 2) som utesluter bemanning. Juristen ska bekräfta att denna avgränsning håller rättsligt under:
- Lag (1993:440) om privat arbetsförmedling
- Lagen om uthyrning av arbetstagare (2012:854)
- Tillståndspliktiga verksamheter (Bemanningsföretag kräver inte tillstånd men kräver Kollektivavtal och Fora-registrering — bekräfta gränsdragning)

### Fråga 5 — Är ersättningspolicyn juridiskt hållbar?
Tjänsteavtalet (avsnitt 8) anger att ingen återbetalning ges efter leverans, men att en fri ersättning ges om föraren inte svarar inom 24 timmar (Package 4) eller visar sig otillgänglig inom 5 arbetsdagar (Package 2). Är denna policy genomförbar? Skapar den oavsiktliga garantier under konsumentköplagen eller annan lagstiftning? (Notera: Klienten är ett företag, inte en konsument — bekräfta att B2B-avtalsfriheten gäller fullt ut.)

### Fråga 6 — Är re-engagemangsklausulen (avsnitt 10, tjänsteavtalet) verkställbar?
Tjänsteavtalet innehåller ett förslag (platshållare) om att klienten inte fritt kan vidareförmedla en introducerad förare till tredje part utan att meddela DriverNord. Juristen ska bedöma om en sådan klausul är:
- Juridiskt verkställbar under svensk avtalsrätt
- Förenlig med förarens rätt att fritt ingå anställningsavtal
- Proportionerlig och formulerbar i praktisk text

### Fråga 7 — Uppfyller annonserna marknadsföringslagstiftningens krav?
DriverNord planerar annonsering på Meta (Facebook/Instagram) och Platsbanken (Arbetsförmedlingen). Annonser riktas till yrkesförare och uppmanar dem att registrera sig i en "matchningspool." Är det juridiskt korrekt att kalla tjänsten "matchning" och "introduktion"? Finns det ett krav på att specificera att DriverNord är ett privat förmedlingsbolag i annonsen? Gäller Marknadsföringslagen (2008:486) specifika krav på transparens?

### Fråga 8 — Är det lagligt att samla in självdeklarerade CE/YKB-uppgifter utan att verifiera dem?
DriverNord samlar in och vidarebefordrar självdeklarerade uppgifter om körkortsinnehav (CE/C/D) och YKB-status utan att kontrollera dessa mot Transportstyrelsen. Tjänsteavtalet och förarprofilerna märks tydligt med "självdeklarerat." Är detta tillräckligt? Finns det lagkrav på att verifiera körkortsinnehav innan en introduktion sker? Finns det risk för vilseledande marknadsföring om DriverNord beskriver sig som en "kvalificerad förarlista" när kvalifikationerna är självdeklarerade?

### Fråga 9 — Vilka lagringstider är acceptabla under GDPR?
Integritetspolicyn föreslår: aktiv profil tills samtycke återkallas; inaktiv profil raderas efter 18 månader; samtyckeloggar behålls 3 år. Är dessa perioder proportionerliga och acceptabla under GDPR? Vad är den kortaste och längsta acceptabla retentionstiden för varje datakategori (kontaktuppgifter, kvalifikationsdata, samtyckeloggar)?

### Fråga 10 — Vilka formuleringar måste ändras innan lansering?
Juristen ombeds att, utöver att besvara frågorna ovan, konkret markera i dokumenten vilka formuleringar som måste ändras, strykas eller läggas till innan dokumenten är redo att användas i kommersiella transaktioner eller publiceras för förarna.

---

## 5. Praktisk begäran

Vi önskar **praktiska korrigeringar**, inte en teoretisk juridisk PM. Konkret önskar vi:

1. Rödmarkerade ändringar direkt i dokumenten (Track Changes-format eller kommentarer)
2. En kort lista med de tre viktigaste riskerna och hur de åtgärdas
3. Besked om vilka dokument som är klara att användas som de är (efter korrigeringar), och vilka som kräver ytterligare utredning
4. Ert råd om vilket dokument som ska prioriteras för att möjliggöra den första kommersiella transaktionen så snart som möjligt

**Deadline för granskning:** [Grundaren fyller i önskad deadline]

---

## 6. Kontaktuppgifter

För frågor om bakgrunden till tjänsten, den tekniska arkitekturen, eller om ytterligare underlag behövs:

**Kontaktperson:** [Grundarens namn]
**E-post:** hej@drivernord.se
**Telefon:** [Grundarens telefonnummer]

---

*Dokumentversion: 1.0 — 2026-05-14*
*Samtliga bifogade dokument är preliminära utkast genererade med AI-stöd och har inte tidigare granskats juridiskt.*
