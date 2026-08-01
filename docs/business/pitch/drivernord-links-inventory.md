# DriverNord — Länkinventering för pitch-material

**Syfte:** Källförteckning över alla publika länkar som hittats i projektfilerna, klassificerade efter om de är säkra att skicka externt. Inga länkar är påhittade — där en länk inte hittats anges det explicit.

**Metod:** Genomsökning av `docs/`, `app/`, `components/`, `lib/`, `.env.local.example` för domäner, sociala mediaprofiler och publika sidor.

---

## Säkra att skicka externt

| URL | Källfil | Vad den pekar mot | Inkludera i pitch? |
|---|---|---|---|
| https://drivernord.com | `docs/business/contact-information/official-contact-info.md`, `metadataBase` i flera `app/**/page.tsx` | Huvuddomän / startsida (redirect till `/chaufforer`) | Ja |
| https://drivernord.com/chaufforer | `app/chaufforer/page.tsx`, `docs/business/social-media-bio-copy.md` | Publik registreringssida för kandidater (chaufförer) | Ja |
| https://drivernord.com/company | `app/company/page.tsx` | Publik sida för transportföretag/B2B | Ja |
| https://drivernord.com/company/ai-agenter | `app/company/ai-agenter/page.tsx` (bekräftad i tidigare systemgenomgång) | Teknisk fördjupningssida om plattformens arkitektur | Valfritt — mer teknisk än kommersiell, lämplig som sekundär länk, inte i huvudpitchen |
| https://drivernord.com/chat | `app/chat/page.tsx` | Det faktiska registreringsflödet (nås via `/chaufforer`) | Valfritt — normalt räcker `/chaufforer` som ingång |
| https://drivernord.com/logistikklubb | `app/logistikklubb/page.tsx` | Publik sida för Logistikklubb — community för förare, truckförare, lager- och logistikpersonal. Viktig länk: visar konkret att plattformen redan är bredare än enbart chaufförer. | Ja — central länk för lagerpositioneringen |
| https://drivernord.com/contact | `app/contact/page.tsx` | Publik kontaktsida | Valfritt |
| https://www.facebook.com/profile.php?id=61589564897204 | `app/chaufforer/page.tsx` (Schema.org `sameAs`), `docs/business/current-execution-status.md` ("Facebook Page created 2026-05-17") | DriverNords officiella Facebook-sida | Ja |

## Osäker / bör verifieras innan användning

| URL | Källfil | Vad den pekar mot | Kommentar |
|---|---|---|---|
| https://chat.whatsapp.com/HC2QY2W32CYIIXpxawXSOG | `.env.local.example` (rad 67, `NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL`), hårdkodad som fallback-värde i `app/logistikklubb/page.tsx` | Inbjudningslänk till Logistikklubbens WhatsApp-grupp | Länken finns i produktionskoden och är avsedd att vara publik (renderas på `/logistikklubb`). **Verifiera dock att inbjudningslänken fortfarande är aktiv innan den skickas externt** — WhatsApp-inbjudningslänkar kan gå ut eller återkallas, och det har inte kontrollerats live i denna genomgång. |

## Inte hittat i projektfilerna (uppfinn inte — utelämna eller markera som TBD)

| Kanal | Status |
|---|---|
| LinkedIn — DriverNord företagssida | Not found in project files. Alla LinkedIn-träffar i koden/dokumenten gäller prospektföretags egna LinkedIn-profiler (B2B-målbolag), inte en DriverNord-sida. Om en LinkedIn-sida för DriverNord finns bör founder bekräfta URL:en manuellt innan den läggs till i pitch-materialet. |
| Instagram — DriverNord-konto | Not found in project files. `docs/business/project-audit/end-to-end-structure-audit/meta-and-social-readiness-audit.md` bekräftar att Instagram ännu inte är anslutet till Meta Business Manager (kräver att Facebook-sidan är kopplad först). Ett konto "kan finnas" enligt äldre statusdokument men är inte bekräftat eller länkat. |
| Domänverifierad e-postadress som klickbar `mailto`-referens utöver `hej@drivernord.com` | Ingen annan officiell adress hittad. `hej@drivernord.com` är den enda kanoniska adressen (`official-contact-info.md`). |

## Uteslutna med avsikt (internt/administrativt — ska INTE ingå i extern pitch)

| URL / route | Anledning till uteslutning |
|---|---|
| `/recruiter`, `/recruiter/login` | Skyddad intern cockpit för rekryterare — kräver sessionscookie, inte avsedd för extern publik |
| `/admin/*` (cockpit, contacts, content, logistikklubb-admin) | Interna administrationsrutor, skyddade av `middleware.ts` |
| Alla `/api/admin/*`, `/api/cron/*`, `/api/agent/*` routes | Interna API-endpoints, kräver nycklar, aldrig avsedda som publika länkar |
| Supabase-projektlänkar (t.ex. dashboard-URL:er, projekt-ID) | Privat infrastruktur — exponeras aldrig externt |
| Vercel-projektinställningar / deploy-URL:er för förhandsvisning | Privat infrastruktur |
| `docs/private-holdback/**` | Gitignorad mapp för känsligt prospekt-/kontaktmaterial — aldrig del av externt material |
| Facebook Graph API-URL:er (`graph.facebook.com/...`) | Interna tekniska endpoints, inte publika sidor |

---

## Sammanfattning

- **5 publika länkar** rekommenderas för direkt användning i pitch-dokumenten: webbplats, kandidatregistrering, företagssida, Logistikklubb, Facebook-sida.
- **1 länk** (WhatsApp-community) är trolig och kodbekräftad men bör verifieras som aktiv innan extern utskick.
- **2 kanaler** (LinkedIn, Instagram) saknas helt i projektfilerna och har inte inkluderats eller uppfunnits.
- Inga interna, administrativa eller känsliga länkar har inkluderats i pitch-materialet.
