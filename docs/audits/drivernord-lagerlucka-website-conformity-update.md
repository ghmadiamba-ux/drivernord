# DriverNord Lagerlucka — Website Conformity Update

**Date:** 2026-09-02
**Type:** Public website update. No database, migrations, agents, outreach, secrets, or deployment were touched producing this change.

---

## 1. Strategic purpose

Bring the public website into conformity with the Phase 1 "Lager-first" launch doctrine:

- **DriverNord Bemanning** remains the main brand and the long-term promise — *"Från lagergolv till förarplats — en leverantör, hela flödet"* — stays visible everywhere it already was.
- The **first practical, monetizable offer** is now **DriverNord Lagerlucka**: a fast, honest answer to a short, urgent warehouse gap (plock, pack, lastning, lossning, enklare terminalarbete) — not generic lagerbemanning, and not positioned as a driver-only business.
- Company visitors need a clear, low-friction way to understand and act on the pilot offer (provpass → 1–7 dagar → löpande).
- Candidate visitors interested in lager/plock/pack must have a path that **does not** route them through `/chat`, since `/chat` hard-disqualifies anyone without a C/CE/D license (`lib/conversation.ts`: `license === 'none'` → `disqualified`, a terminal step). That blocker was **not** touched — it was avoided by building a separate static interest page.

---

## 2. Files changed

**Created:**
- `app/lagerlucka/page.tsx` — client-side acquisition page
- `app/lagerjobb/page.tsx` — candidate-side static interest page
- `docs/audits/drivernord-lagerlucka-website-conformity-update.md` — this document

**Modified:**
- `app/page.tsx` — added "Första lanseringsfokus: lagerluckor" section; changed the candidate CTA link from `/chat` to `/chaufforer`
- `app/company/page.tsx` — added a "DriverNord Lagerlucka" section
- `app/company/layout.tsx` — replaced stale, driver-only, wrong-brand metadata (`DriverNord — Hitta kvalificerade chaufförer snabbare`) with current `DriverNord Bemanning` positioning
- `app/company/ai-agenter/page.tsx` — added a one-line scope disclosure ("this describes the CE/C/D matching engine; the lager track is handled manually today") with a link to `/lagerlucka`
- `app/chaufforer/page.tsx` — added a cross-link banner under the hero: *"Söker du lagerjobb, plock eller pack? → /lagerjobb"*
- `components/PublicHeader.tsx` — nav simplified to För företag / Lagerlucka / För arbetstagare / Kontakt (desktop); mobile menu adds Lagerlucka + Lagerjobb; top-right CTA now points to `/chaufforer` (a routing hub) instead of directly to `/chat`
- `components/LegalFooter.tsx` — footer "Bemanning" column gets a Lagerlucka link; "Arbetstagare" column gets a Lagerjobb link and renames the `/chat` link to "Chaufför — registrera dig" for clarity

**Not touched (verified, no conflict requiring a change):** `app/about/page.tsx`, `app/contact/page.tsx`, `app/chat/page.tsx`, `lib/conversation.ts`, `lib/stepConfig.ts`, any database/migration/agent file.

---

## 3. Routes created

| Route | Purpose |
|---|---|
| `/lagerlucka` | Client-side acquisition page — the DriverNord Lagerlucka pitch and pilot offer |
| `/lagerjobb` | Candidate-side static interest page for lager/plock/pack — does not touch `/chat` |

Both are statically generated Server Components, confirmed in the production build output.

---

## 4. Homepage update

- Kept the broad brand hero unchanged: "DriverNord Bemanning" / "Från lagergolv till förarplats — en leverantör, hela flödet."
- Added a new section directly under the hero: eyebrow "Första lanseringsfokus: lagerluckor", heading "DriverNord Lagerlucka", the specified body copy, and a CTA "Har ni en lagerlucka?" → `/lagerlucka`.
- Changed the worker-facing CTA (both in the hero and the final CTA, since both reuse the same `CTAButtons` component) from `href="/chat"` to `href="/chaufforer"` — so a lager-only visitor lands on a routing hub instead of straight into the license-gated flow.

---

## 5. `/lagerlucka` content

- Hero eyebrow: "DriverNord Lagerlucka"; H1: "Har ni en lagerlucka de närmaste 7 dagarna?"; body and CTAs exactly as specified ("Beskriv ert behov" / "Se hur pilotupplägget fungerar", the latter an in-page anchor to the pilot-tier section).
- Signal strip: korta lagerluckor · arbetstoppar · sjukfrånvaro · plock, pack och enklare terminalarbete.
- Promise block: "Tydligt besked snabbt — ja, nej eller nästa möjliga steg," explicitly labeled a communication guarantee, not a delivery guarantee (per the go-to-market plan's risk-reversal rule).
- Coverage cards for plock/packning, lastning/lossning, enklare terminalarbete.
- Pilot-tier section (`id="pilotupplagg"`): Tier 0 (provpass), Tier 1 (pilotuppdrag 1–7 dagar, highlighted, with the exact close line), Tier 2 (löpande bemanning, framed as later-only) — plus the "låg tröskel in — men tydlig kontroll" line and the long-term bridge line used only in context, per the go-to-market plan's rule against leading with it.
- A short, honest FAQ (existing-supplier objection, pricing, response-time promise).
- Final CTA repeats "Beskriv ert behov," with a small cross-link to `/lagerjobb` for candidates who land here by mistake.
- CTA destination: `mailto:hej@drivernord.com?subject=Lagerlucka - behov` with a pre-filled body template (role/ort/period/timing) — the same mailto-CTA pattern already used on the homepage and `/company`, not a new contact mechanism.

---

## 6. `/lagerjobb` content

- Hero eyebrow: "Jobba extra inom lager"; H1: "Vill du jobba inom plock, pack eller lager?"; body and the required "du behöver inte vara yrkesförare..." wording, verbatim.
- "Låg tröskel in — men tydlig kontroll" section listing the five actual qualification criteria (pålitlig, arbetsvillig, tillgänglig, kontaktbar, rätt att arbeta i Sverige) — no claim that "anyone can do it" or that no qualification exists.
- Work-type cards (orderplock, packning, lastning/lossning, enklare terminalarbete).
- An explicit, honest disclosure section: this is currently an **interest registration**, handled manually, because the site's full digital registration flow is built for the driver track; a dedicated lager registration isn't live yet. This directly implements the mission's "Backend/Intake rule."
- A cross-link to `/chaufforer` for CE/CE/truck-track visitors who land here by mistake.
- A Logistikklubb community CTA (reusing the existing `WhatsAppCTAButton` component and its existing env-configured URL — no new integration).
- CTA destination: `mailto:hej@drivernord.com?subject=Intresseanmalan - lager/plock/pack` with a pre-filled body template (namn/ort/tillgänglighet/telefon) — again the existing mailto pattern, not a new system.

---

## 7. `/company` updates

- Added a "DriverNord Lagerlucka" section (`id="lagerlucka"`) right after the trust strip, using the exact specified copy, with a CTA button linking to `/lagerlucka`.
- `app/company/layout.tsx` metadata corrected from stale CE/C/D-only, wrong-brand copy to current DriverNord Bemanning positioning (this metadata is a fallback only — both `/company` and `/company/ai-agenter` already define their own page-level metadata that takes precedence).

---

## 8. `/chaufforer` updates

- Route and full page content preserved as the driver/CE/C/D-track landing page — not converted into the lager candidate page.
- Added a one-line cross-link banner directly under the hero: "Söker du lagerjobb, plock eller pack? → Läs mer här" linking to `/lagerjobb`, so a lager-only visitor arriving here (e.g. via the header's CTA button) is redirected before reading driver-specific copy.

---

## 9. CTA destinations (full map)

| Source | CTA | Destination |
|---|---|---|
| Header CTA button ("Registrera dig") | all visitors | `/chaufforer` (was `/chat`) |
| Homepage hero + final CTA (worker button) | candidates | `/chaufforer` (was `/chat`) |
| Homepage launch-focus section | companies | `/lagerlucka` |
| `/company` new Lagerlucka section | companies | `/lagerlucka` |
| `/lagerlucka` primary + final CTA | companies | `mailto:hej@drivernord.com?subject=Lagerlucka - behov` |
| `/lagerlucka` secondary CTA | companies | in-page anchor `#pilotupplagg` |
| `/lagerlucka` footer note | lager candidates | `/lagerjobb` |
| `/lagerjobb` CTA ("Anmäl intresse") | lager candidates | `mailto:hej@drivernord.com?subject=Intresseanmalan - lager/plock/pack` |
| `/lagerjobb` cross-link | driver candidates | `/chaufforer` |
| `/chaufforer` cross-link banner | lager candidates | `/lagerjobb` |
| `/company/ai-agenter` scope note | lager-track company visitors | `/lagerlucka` |
| `/chaufforer` own CTA buttons (unchanged) | driver candidates | `/chat` |
| Footer "Chaufför — registrera dig" | driver candidates | `/chat` |
| Footer "Lagerjobb" | lager candidates | `/lagerjobb` |
| Footer "Lagerlucka" | companies | `/lagerlucka` |

**No CTA on `/lagerlucka` or `/lagerjobb` routes into `/chat`.** The only remaining `/chat` links are the pre-existing driver-specific ones on `/chaufforer` and in the footer, both now clearly labeled as the chauffeur track.

---

## 10. Safety grep results

Ran across `app/`, `lib/`, and `components/` for the banned-phrase list (Bemaning, DriverNord AB, "not a staffing"/"not staffing"/"not bemanning", "vi är inte ett bemanningsföretag", "AI matching", "AI-powered", "fully automated", guaranteed-availability phrasing) and for any `/lagerjobb`/`/lagerlucka` CTA routing into `/chat`.

**Result: clean.** No matches for any banned phrase in public-website code. The only "chat" string match inside the two new pages is the existing WhatsApp community URL (`chat.whatsapp.com`), unrelated to the `/chat` route. No CTA on either new page links to `/chat`.

(Pre-existing, unrelated matches for the substring "bemaning" exist only in `lib/emailTriageAgent.ts`, in an internal compliance-flag name `COMPLIANCE_BEMANNING_LANGUAGE` used for outbound-email review — not public website copy, not modified here.)

---

## 11. Tests / build result

- `npx vitest run` → **81 test files passed, 2663 tests passed**, 0 failed. No test referenced or exercised the modified page/component files directly (all existing tests target `lib/` agent and pipeline logic), so no test changes were needed.
- `npm run build` → **succeeded.** Both new routes (`/lagerlucka`, `/lagerjobb`) compiled and were statically pre-rendered (`○` in the route table) alongside all existing routes. No build errors or warnings introduced.

---

## 12. Remaining blockers before ads (per the go-to-market plan, §18 — not resolved by this task, listed for visibility)

- Conversion tracking beyond the existing consent-gated Meta Pixel (GA4/GTM or equivalent) is still absent.
- No paid spend has been started — this task did not touch ad configuration.
- A monitored, working response process for ad-driven leads (someone actually answering within the promised window) is an operational readiness item, not a website change.
- At least one pilot delivered without incident is still required before paid spend, per the go-to-market plan.

---

## 13. Remaining blockers before pilot delivery

- **Legal/payroll precondition** (kollektivavtal, Fora, insurance) must be operationally confirmed before any pilot is actually delivered — this website update does not touch that precondition and does not claim it is resolved.
- **`/chat`'s license-gate blocker is still live and unfixed.** `license === 'none'` still routes to the terminal `disqualified` step in `lib/conversation.ts`. This task deliberately worked around it with a static `/lagerjobb` interest page rather than fixing the underlying logic, per the task's explicit instruction. Fixing it properly (so lager candidates can complete a real registration flow instead of an interest-only mailto) remains a separate, future backend task.
- **No dedicated lager candidate database/intake exists yet.** `/lagerjobb` submissions arrive as plain emails to `hej@drivernord.com`, to be processed manually — exactly as the task's "Backend/Intake rule" specified. This is disclosed honestly on the page itself.

---

## 14. Confirmation of boundaries respected

- No database schema modified, no migrations run, no production data touched.
- No emails sent, no companies contacted, no candidates contacted.
- No agents activated; `AGENT_CONTACT_MODE` untouched; Zoho and 46elks untouched.
- No secrets exposed or edited; no new tracking pixels or secrets added (the one analytics-adjacent reuse — `WhatsAppCTAButton` on `/lagerjobb` — uses the existing, already-public, already-configured community URL env var, not a new integration).
- No paid ads started.
- No deployment performed — changes exist only in the local working tree pending the founder's review/commit/deploy decision.
