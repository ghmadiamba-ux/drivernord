# DriverNord — Förvärvsdashboard: Specifikation och Övervakningsmallar

**Status:** Klar för implementation
**Datum:** 2026-05-14
**Syfte:** Definiera KPI:er, Supabase-frågor och rapportformat för daglig och veckovis uppföljning av förvärvsinsatsen. AI (Claude Code) genererar veckovisa rapporter på begäran utifrån dessa ramar.
**Viktigt:** Alla Supabase-frågor körs mot produktionsdatabasen av grundaren. Claude Code kör inte frågor mot produktion.

---

## KPI-hierarki

```
Nivå 1 — Kampanjhälsa (daglig kolll)
    └── Registreringstakt / Beräknat CPR / Meta CTR

Nivå 2 — Kvalificeringsgrad (daglig koll)
    └── CE+YKB+Stockholm+tillgänglig / totalt registrerade

Nivå 3 — Paketklar status (daglig koll — viktigast)
    └── Antal tillgängliga höga-prioritet förare vs. tröskel 5 och 15

Nivå 4 — Trattanalys (veckovis)
    └── Steg-för-steg-avhopp i /chat-flödet

Nivå 5 — Kommersiell beredskap (veckovis)
    └── Samtliga 8 Package 4-krav → Go/No-Go-sammanfattning
```

---

## Sektion A — Dagliga KPI:er

### A1 — Paket-beredskapsstatus (kör varje dag)

**Syfte:** Besvara: "Kan vi sälja Package 4 idag? Kan vi sälja Package 2?"

```sql
-- Package 4 och Package 2 beredskapscheck
SELECT 
  COUNT(*) FILTER (
    WHERE lead_status = 'available' 
    AND lead_priority = 'high'
    AND license = 'CE'
  ) AS package_4_candidates,

  COUNT(*) FILTER (
    WHERE lead_status IN ('available', 'available_soon')
    AND lead_priority IN ('high', 'medium')
    AND license IN ('CE', 'C', 'D')
  ) AS package_2_pipeline,

  COUNT(*) FILTER (
    WHERE availability_confirmed_at >= NOW() - INTERVAL '7 days'
    AND lead_status = 'available'
    AND lead_priority = 'high'
  ) AS confirmed_available_last_7d,

  CASE 
    WHEN COUNT(*) FILTER (
      WHERE lead_status = 'available' 
      AND lead_priority = 'high' 
      AND license = 'CE'
    ) >= 5 THEN 'PACKAGE 4 TILLGÄNGLIG'
    ELSE CONCAT('PACKAGE 4 SAKNAR: ', 
      5 - COUNT(*) FILTER (
        WHERE lead_status = 'available' 
        AND lead_priority = 'high' 
        AND license = 'CE'
      ), ' förare till')
  END AS package_4_status,

  CASE 
    WHEN COUNT(*) FILTER (
      WHERE lead_status = 'available' 
      AND lead_priority IN ('high', 'medium')
    ) >= 15 THEN 'PACKAGE 2 TILLGÄNGLIG'
    ELSE CONCAT('PACKAGE 2 SAKNAR: ', 
      15 - COUNT(*) FILTER (
        WHERE lead_status = 'available' 
        AND lead_priority IN ('high', 'medium')
      ), ' förare till')
  END AS package_2_status

FROM drivers;
```

**Tolkning:**
- `package_4_candidates ≥ 5` → Package 4 kan säljas (om alla andra blockerare är lösta)
- `confirmed_available_last_7d ≥ 5` → De 5 förarna är freshly bekräftade; 48-timmarslovnad är möjlig
- `package_2_pipeline ≥ 15` → Package 2 kan säljas (om alla andra blockerare är lösta)

---

### A2 — Daglig registreringsvolym

```sql
-- Nya registreringar de senaste 24 timmarna och 7 dagarna
SELECT 
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') AS new_24h,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_7d,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_30d,
  COUNT(*) AS total_registered
FROM drivers;
```

---

### A3 — Kvalificeringsgrad (snabbkoll)

```sql
-- Hur stor andel av registrerade uppfyller minimikraven?
SELECT 
  COUNT(*) AS totalt,
  COUNT(*) FILTER (WHERE license = 'CE') AS har_ce,
  COUNT(*) FILTER (WHERE license = 'CE' AND ykb != 'none') AS ce_med_ykb,
  COUNT(*) FILTER (
    WHERE license = 'CE' AND ykb != 'none' AND region = 'stockholm'
  ) AS ce_ykb_stockholm,
  COUNT(*) FILTER (
    WHERE license = 'CE' AND ykb != 'none' AND region = 'stockholm'
    AND lead_status IN ('available', 'available_soon')
  ) AS ce_ykb_stockholm_tillgangliga,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE license = 'CE') / NULLIF(COUNT(*), 0), 1
  ) AS pct_ce,
  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE license = 'CE' AND ykb != 'none' AND region = 'stockholm'
      AND lead_status IN ('available', 'available_soon')
    ) / NULLIF(COUNT(*), 0), 1
  ) AS pct_fullt_kvalificerade
FROM drivers;
```

**Tolkning:**
- `pct_fullt_kvalificerade < 20%` → Justera Meta-targeting (bredare geografisk targeting eller mer specifikt körkort-intresse)
- `pct_ce < 40%` → Targeting träffar för många icke-CE-förare; skärp annonsinriktning

---

## Sektion B — Trattanalys (veckovis)

### B1 — Steg-för-steg-avhopp i /chat-flödet

**Syfte:** Identifiera vilket steg i registreringschatten som flest förare hoppar av.

```sql
-- Avhoppsanalys per steg
-- OBS: Denna fråga förutsätter att drivers.current_step loggas per driver
-- Om current_step inte finns, kör motsvarande analys via Vercel Analytics eller Posthog
SELECT 
  current_step,
  COUNT(*) AS antal_stannade_här,
  ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct_av_totalt
FROM drivers
WHERE lead_status != 'completed' -- de som inte avslutade
GROUP BY current_step
ORDER BY antal_stannade_här DESC;
```

**Alternativ om `current_step` saknas:** Analysera antal drivers med `lead_status = 'disqualified'` (avbröt vid licens = none) vs. `lead_status` per completion-steg.

---

### B2 — Källattribution (om UTM-parametrar implementeras)

```sql
-- Om UTM source lagras i drivers-tabellen (t.ex. drivers.acquisition_source)
SELECT 
  acquisition_source,
  COUNT(*) AS registreringar,
  COUNT(*) FILTER (WHERE lead_priority = 'high') AS hög_prioritet,
  ROUND(100.0 * COUNT(*) FILTER (WHERE lead_priority = 'high') / NULLIF(COUNT(*), 0), 1) AS kvalitetspct
FROM drivers
WHERE acquisition_source IS NOT NULL
GROUP BY acquisition_source
ORDER BY registreringar DESC;
```

**Notering:** UTM-spårning kräver att `acquisition_source` läggs till i `drivers`-tabellen och fångas från URL-parametrar i /chat-flödet. [Claude Code kan spec:a denna ändring när grundaren ger klartecken.]

---

### B3 — Uppföljningspipeline

```sql
-- Förare som behöver kontaktas för tillgänglighetsbekräftelse
SELECT 
  COUNT(*) FILTER (
    WHERE follow_up_at <= NOW() AND follow_up_sent = false
  ) AS väntande_uppföljningar,
  COUNT(*) FILTER (
    WHERE follow_up_at <= NOW() - INTERVAL '3 days' AND follow_up_sent = false
  ) AS försenade_uppföljningar,
  COUNT(*) FILTER (
    WHERE availability_confirmed_at IS NULL 
    AND lead_status = 'available'
  ) AS tillgängliga_ej_bekräftade
FROM drivers;
```

---

## Sektion C — Meta Ads KPI:er

*Hämtas från Meta Ads Manager — inte från Supabase*

| KPI | Definition | Mål | Åtgärd om under mål |
|-----|-----------|-----|---------------------|
| CTR (Click-through rate) | Klick / Visningar | ≥1,5% | Byt annonskreativ; testa ny rubrik |
| CPC (Cost per click) | Total kostnad / Klick | ≤15 SEK | Bredda targeting; testa ny målgrupp |
| Landningssidans konvertering | Registreringar / Klick | ≥35% | Förbättra landningssidans copy |
| CPR (Cost per registration) | Total kostnad / Registreringar | ≤200 SEK | Pausa svaga ad sets; skala vinnande |
| Registreringskvalitet | CE+YKB-förare / Totalt registrerade | ≥35% | Skärp intressetargeting |
| ROAS-proxy | Registreringar × förväntad värde per förare | Positivt | Utvärdera budgetallokering |

**Förväntad värde per förare (för ROAS-proxy):**
- En förare som leder till Package 4 = 8 000–10 000 SEK
- Med 20% konverteringsgrad (av shortlistade förare) → förväntat värde per registrering ≈ 1 600–2 000 SEK
- Mål CPR på 200 SEK → ROAS 8–10x om konvertering håller

---

## Sektion D — Veckovis AI-granskningsformat

*Begär denna rapport från Claude Code varje måndag*

**Promptmall för grundaren:**
> "Claude Code: Generera veckans förvärvsrapport baserat på följande Supabase-data: [klistra in resultat från A1, A2, A3, B3]. Meta Ads-data: [klistra in från Ads Manager]. Identifiera: (1) Är vi på spår mot Package 4-tröskeln? (2) Vilket steg i tratten har störst avfall? (3) Rekommenderad åtgärd för kommande vecka."

---

### Rapportformat — Veckovis förvärvsrapport

```
DriverNord — Veckovis Förvärvsrapport
Vecka: [nummer] | Datum: [YYYY-MM-DD]
Genererad av: Claude Code på grundarens begäran

─────────────────────────────────────────
PAKETBEREDSKAP
─────────────────────────────────────────
Package 4 (tröskel: ≥5 tillgängliga CE+YKB): [X] förare — STATUS: [TILLGÄNGLIG / SAKNAR X]
Package 2 (tröskel: ≥15 tillgängliga): [X] förare — STATUS: [TILLGÄNGLIG / SAKNAR X]
Senaste veckan: [+X] nya tillgängliga förare
Trend: [På spår / Under förväntan / Över förväntan]

─────────────────────────────────────────
REGISTRERINGSVOLYM
─────────────────────────────────────────
Totalt registrerade: [X]
Nya denna vecka: [X] (+/-[X] vs. föregående vecka)
Ny 30 dagar: [X]
Kvalificeringsgrad (CE+YKB+Sthlm+tillgänglig): [X]%

─────────────────────────────────────────
META ADS-PRESTANDA
─────────────────────────────────────────
Veckans budgetförbrukning: [X] SEK av [X] SEK budget
CTR: [X]% (mål: ≥1,5%)
CPC: [X] SEK (mål: ≤15 SEK)
CPR (kostnad per registrering): [X] SEK (mål: ≤200 SEK)
Bäst presterande annonsvariant: [Variant X — rubrik]

─────────────────────────────────────────
TRATTANALYS
─────────────────────────────────────────
Steg med störst avhopp: Steg [X] — [X]% avhoppade här
Uppföljningar väntande: [X] förare
Bekräftade tillgängliga (senaste 7d): [X] förare

─────────────────────────────────────────
BLOCKERARSTATUS
─────────────────────────────────────────
46elks SMS: [Konfigurerat / EJ konfigurerat]
Juridisk granskning: [Klar / Pågår / Ej startad]
Production /chat: [Live / EJ live]

─────────────────────────────────────────
REKOMMENDERAD ÅTGÄRD DENNA VECKA
─────────────────────────────────────────
1. [Specifik rekommendation baserat på data]
2. [Specifik rekommendation]
3. [Specifik rekommendation]

─────────────────────────────────────────
PROGNOS TILL PACKAGE 4
─────────────────────────────────────────
Nuvarande takt: [X] förare/vecka
Uppskattad vecka för Package 4-tröskel: Vecka [X] ([datum])
Konfidensgrad: [HÖG / MEDEL / LÅG]
```

---

## Sektion E — Package 4-beredskapsrapport (vid tröskelkorsning)

*Genereras av Claude Code när A1-frågan returnerar `package_4_candidates >= 5`*

```
DriverNord — Package 4 Beredskapsstatus
Datum: [YYYY-MM-DD]
─────────────────────────────────────────
DATABASSIDA
Tillgängliga CE+YKB+Stockholm-förare: [X] (TRÖSKEL UPPNÅDD: ≥5)
Bekräftade tillgängliga senaste 7 dagarna: [X]
Förare som kan levereras inom 48h: [X]

OPERATIONELL SIDA
46elks SMS: [OK / SAKNAS]
Stage 3-samtyckesflöde: [Implementerat / EJ implementerat]
/recruiter-dashboard tillgängligt: [OK / SAKNAS]

JURIDISK SIDA
Integritetspolicy granskad: [OK / EJ KLAR]
DPA-mall granskad: [OK / EJ KLAR]
Tjänsteavtal granskat: [OK / EJ KLAR]

KOMMERSIELL SIDA
Faktureringsverktyg konfigurerat (Fortnox): [OK / SAKNAS]
Produktblad Package 4 förberett: [OK / SAKNAS]

─────────────────────────────────────────
GO/NO-GO FÖR PACKAGE 4
─────────────────────────────────────────
Databas: [GO / NO-GO]
Operationell: [GO / NO-GO]
Juridisk: [GO / NO-GO]
Kommersiell: [GO / NO-GO]

SLUTVÄRDERING: [REDO ATT SÄLJA / EJ REDO — Blockerare: X, Y, Z]
```

---

*Version 1.0 — 2026-05-14 — Inga frågor körs mot produktion av Claude Code. Alla frågor körs av grundaren.*
