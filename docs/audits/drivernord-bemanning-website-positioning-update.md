# DriverNord Bemanning — Website Positioning Update

*Date: 2026-08-27*
*Author: Claude Code — public website/content update, explicitly approved per founder prompt*
*Scope: public website only. No database, migrations, production data, agents, Zoho, 46elks, or backend business logic were touched — one routing config change was made (see §1) because it was required to give the requested homepage hero a real page to live on.*

---

## 1. Pages changed

| Page | Change |
|---|---|
| `app/page.tsx` | **Rebuilt from a redirect stub into a real homepage** — hero, trust strip, 3 value-proposition cards, "Våra bemanningsområden" service-line section, final CTA, updated structured data |
| `next.config.js` | Removed the unconditional `/` → `/chaufforer` redirect so the new homepage renders at `/`. `/chaufforer` was not deleted or moved — it remains a live route, now reachable from nav as "För arbetstagare" |
| `app/company/page.tsx` | Full content rewrite — bemanning-for-companies positioning (lager + terminal + transport), service-line section replacing the old driver-only category grid, FAQ/process reframed around a staffing assignment, not candidate sourcing |
| `app/chaufforer/page.tsx` | Full content rewrite — worker-facing page broadened from CE/C drivers only to lager/terminal/truckförare/C-CE-förare/logistikpersonal; removed the internally-contradictory "why not bemanning" comparison section; cautious "register your interest" wording throughout |
| `app/about/page.tsx` | Metadata and key body copy corrected — removed the explicit "Ingen bemanning — direktkontakt..." claim (found during this pass; not on the original safety-grep list, but the same category of claim in Swedish) |
| `app/layout.tsx` | Root fallback metadata updated from stale "Driver Registration" / "Register as a professional driver in Sweden" to "DriverNord Bemanning" |

## 2. Components changed

| Component | Change |
|---|---|
| `components/PublicHeader.tsx` | Logo now reads "DriverNord Bemanning" (two-weight styling), links to `/`. Nav rebuilt to the 5-item structure: För företag / Lagerbemanning (anchor) / Förarbemanning (anchor) / För arbetstagare / Kontakt. "Om oss" and "Logistikklubb" moved out of primary nav (still in footer/mobile menu — Logistikklubb kept in mobile menu, Om oss in footer) |
| `components/LegalFooter.tsx` | Brand link/tagline updated to "DriverNord Bemanning" + the short value proposition. Grid widened to 5 columns (`md:grid-cols-5`) to add a dedicated "Bemanning" column (Lagerbemanning/Förarbemanning/Logistikbemanning anchors) alongside restructured "Arbetstagare," "Företag," and "Information" columns. Footer year corrected 2025 → 2026. "AI-agenter" footer link relabeled "Så arbetar vi" (link target unchanged) to de-emphasize AI as a headline term, per the standing "AI is an internal advantage, not the external promise" constraint |
| `lib/company/translations.ts` | One line fixed (`diff.subtext`, `diff.right.header`) — this module is an unused/orphaned translation table (not imported by any live page, confirmed by import search), flagged in two prior audit passes for containing "Not a job board. Not a staffing agency..." Fixed opportunistically since it's a trivial content change, but the file remains otherwise unused dead code — see §9 |

## 3. New hero copy (homepage, `app/page.tsx`)

- Eyebrow: "Transport- och logistikbemanning i Stockholm/Mälardalen"
- H1: "DriverNord Bemanning"
- Headline: "Från lagergolv till förarplats — en leverantör, hela flödet."
- Body: "Vi hjälper transport-, lager- och logistikföretag att snabbt täcka tillfälliga personalbehov med kontrollerade och uppdragsklara medarbetare — från lagerarbetare och truckförare till C/CE-förare."
- Primary CTA: "Beskriv ert bemanningsbehov" (`mailto:hej@drivernord.com?subject=Bemanningsbehov`)
- Secondary CTA: "Registrera dig som arbetstagare" (`/chat`)
- Trust strip: Lager + transport i samma flöde · Korta och akuta uppdrag · Kontrollerade medarbetare · En kontaktperson

All copy matches the task brief verbatim where a verbatim string was given.

## 4. New value propositions added (homepage)

Three cards, exact copy from the brief:
1. **En leverantör för hela flödet** — "Ni slipper hantera separata lösningar för lager, terminal och transport..."
2. **När bemanningsluckan inte kan vänta** — "Vid sjukfrånvaro, arbetstoppar eller korta uppdrag..."
3. **Kontrollerade och uppdragsklara medarbetare** — "Vi bygger en pool av medarbetare där kompetens, tillgänglighet och relevanta dokument kan följas..."

No "always same day," "guaranteed staffing," or "every category already available" language was introduced anywhere on the site.

## 5. Service lines added

"Våra bemanningsområden" section (homepage and `/company`, exact copy from the brief):
- **Lagerbemanning** — lagerarbetare, terminalpersonal, orderplockare, truckförare, packning, lastning/lossning
- **Förarbemanning** — C/CE-förare för distribution, fjärrtransport, schakt/bygg
- **Logistikbemanning** — logistikstöd, flödesnära uppgifter, framtida operativa roller

Each card carries an `id` (`lagerbemanning` / `forarbemanning` / `logistikbemanning`) so header/footer nav anchors land precisely, per the task's "link to sections on the homepage" instruction for routes that don't exist yet.

## 6. SEO updates

Metadata (title/description/OG/twitter) updated on: homepage, `/company`, `/chaufforer`, `/about`, and the root layout fallback. All now lead with "DriverNord Bemanning," include "bemanning transport logistik," "lagerbemanning," "förarbemanning," and worker-category terms (lagerarbetare, truckförare, C/CE-förare) plus "Stockholm/Mälardalen." No page's SEO title leads with "AI matching," and "DriverNord AB" was not introduced anywhere. `schema.org` Organization/WebSite `name` fields updated to "DriverNord Bemanning" on all three public pages (this is a trading-name field, not a legal-entity claim, so it doesn't trigger the AB-incorporation caution).

## 7. Safety search results

Searched `app/` and `lib/` for: `not a bemanning`, `No bemanning now`, `Not a staffing`, `not staffing`, `vi är inte ett bemanningsföretag`, `DriverNord AB`, `Bemaning`, `AI matching`, plus (found during inspection, not on the original list) `Ingen bemanning` and `inte ett bemanningsbolag`.

- **`app/`: zero matches**, before and after the fix to `/about` (which was the one hit found).
- **`lib/`: zero matches** after the one-line fix to `lib/company/translations.ts`.
- No historical docs were touched or included in this search (out of scope, per the task).

## 8. Tests/build result

- `npx vitest run` — **2663/2663 passed**, 81 files (no test touches these UI files or the routing change — confirmed by searching `tests/` for references to `next.config`, `app/page`, `PublicHeader`, `LegalFooter`, `CompanyPage`, `ChaufflorerPage`: none found)
- `npm run build` — **succeeded**. Next.js's own type-check ("Linting and checking validity of types") passed, and all 47 routes generated, including `/` now correctly listed as a static page (`○ /`) rather than a redirect target — confirming the routing change works as intended and no route was broken.
- Pre-existing `npx tsc --noEmit` errors reported in an earlier audit pass (test-fixture typing gaps, a Vitest version mismatch) are unrelated to any file touched today and were not re-triggered by `next build`'s own type-check, which passed cleanly.

## 9. Remaining website issues

1. **`lib/company/translations.ts`** is still a large, mostly-unused translation module (an entire alternate "company" landing page concept — cockpit descriptions, a "diff" comparison table — that is not imported by any live page). Only the one flagged line was fixed; the rest of its content (still driver/cockpit-centric) was left as-is since touching an unused file further wasn't part of this task's scope. Recommend a future decision: delete it, or wire it up and rewrite it properly.
2. **`/company/ai-agenter`** (the "technical architecture" deep-dive page, still titled "AI-agenter för chaufförsmatchning") was **not** rewritten today — it's a secondary page, still driver/matching-framed, now linked from the footer under the softened label "Så arbetar vi." It should get the same positioning pass in a follow-up if the founder wants it live.
3. **The routing change (§1)** is the one structural decision made beyond pure content editing. It was necessary to give the requested homepage hero a real page to render on, but it's worth the founder's explicit sign-off since it wasn't spelled out in the task's "do not touch" list. `/chaufforer` remains fully functional and linked; nothing was removed.
4. **`app/about/page.tsx`**'s "Varför vi finns" section still uses driver-specific illustrative examples (e.g., "En CE-chaufför söker inte jobb via Monster") that are narrow but not false or contradictory — left as-is; a full rewrite of that page was not attempted today, only the metadata and the direct positioning claims.
5. **The `/chat` intake flow itself** (referenced by every worker CTA on the site) is still license/YKB-centric under the hood per its existing conversation logic (`lib/conversation.ts`, `types/lead.ts`) — the website now invites lager/terminal/logistik workers to register, but the underlying intake form has not been extended to capture non-driver categories. This is a backend/data-model change explicitly out of scope for a website-only task, flagged here so the gap between website promise and backend capability is visible.

---

## Confirmation

- No emails sent
- No companies or workers contacted
- No production data modified
- No migrations run
- No agents activated
- Only the files listed in §1/§2 were changed
