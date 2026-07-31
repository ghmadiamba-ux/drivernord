# DriverNord — SEO and Copywriting Update

**Date:** 2026-05-17
**Status:** COMPLETE
**Canonical domain:** https://drivernord.com

---

## Summary

Applied modern SEO best practices across all public-facing pages. Key changes: stronger keyword-rich titles and descriptions on driver and company landing pages, Open Graph and Twitter card metadata on all pages that were missing it, JSON-LD structured data on /chaufforer and /company, creation of robots.txt and sitemap.xml, and a critical factual fix to the cookies policy (which previously stated no third-party tracking was used, which was false after Meta Pixel went live).

---

## Critical Fix: Cookies Page (Factual Error)

**Status before this task:** `app/cookies/page.tsx` section 4 stated:
> "DriverNord integrerar för närvarande inga tredjepartstjänster (Google Analytics, Facebook Pixel, etc.) som sätter egna cookies. Om detta förändras uppdateras denna policy och en samtyckesbanner läggs till."

This was **factually wrong** since Meta Pixel (`NEXT_PUBLIC_META_PIXEL_ENABLED=true`) had been activated in production on 2026-05-17.

**Changes applied:**
- `COOKIES_TABLE` extended with `_fbp` (Meta Pixel, 90 days, Marketing) and `_fbc` (Meta click ID, 90 days, Marketing) entries
- Section 2 body updated to acknowledge marketing cookies activate on consent
- Section 4 heading renamed "4. Tredjeparts-cookies — Meta Pixel" and body completely rewritten to accurately describe Meta Pixel as consent-gated
- Section 5 updated to direct users to the cookie preference banner in the footer
- Table note updated from "Ingen av DriverNords cookies används för spårning" to accurate conditional statement
- Improved metadata description

---

## Pages Modified

### /chaufforer (driver landing — effective homepage)

**Title:** `'DriverNord — Chaufförsjobb utan CV-krångel'` → `'Chaufförsjobb i Stockholm — CE, C, D — DriverNord'`

**Description:** Added Stockholm, CE/C-chaufförer, förarjobb keywords. Character count: 165.

**Structured data added:**
- `Organization` schema: name, url, contactPoint (email), sameAs (Facebook Page URL)
- `WebSite` schema: name, url

**Rationale:** This is the effective homepage (/ redirects here). Organization and WebSite schema help Google understand the entity behind the site.

---

### /company (B2B landing)

**Title:** `'DriverNord — Hitta kvalificerade chaufförer snabbare'` → `'Hitta CE-chaufförer i Stockholm — DriverNord för transportföretag'`

**Description:** Added Stockholm, CE/C/D-chaufförer, YKB, "utan bemanningsavgifter" (key differentiator).

**Structured data added:**
- `FAQPage` schema: 5 Q&A pairs mapped from `FAQ_ITEMS` array on the page

**Rationale:** The company page has a real FAQ section with 5 questions — eligible for Google's FAQ rich result. This can expand the SERP footprint significantly for B2B searches.

---

### /about

**Title:** `'Om DriverNord'` → `'Om DriverNord — matchningstjänst för chaufförer och transportföretag'`

**Description:** Added CE/C/D-chaufförer, YKB, "Ingen bemanning — direktkontakt" differentiator.

**OG/Twitter:** Added (was entirely missing). url, siteName, locale, type, summary_large_image.

---

### /contact

**Description:** Added "Vi svarar inom 1–2 arbetsdagar" and "matchning av transportförare".

**OG/Twitter:** Added (was entirely missing). Twitter card type: `summary` (no image on contact page).

---

### /terms

**Description:** `'Villkor för att använda DriverNords tjänsters.'` → expanded with legal positioning clarification: "DriverNord är en förmedlingstjänst — inte arbetsgivare och inte bemanningsföretag."

**OG/Twitter:** Added (was entirely missing). Twitter card type: `summary`.

---

### /privacy

**Description:** Expanded to mention GDPR rights, cookie usage, and driver profiles.

**OG/Twitter:** Added (was entirely missing). Twitter card type: `summary` (legal page).

---

### /cookies

**Description:** Updated from "Information om hur DriverNord använder cookies" to include what users can do about it.

**OG/Twitter:** Added. Twitter card type: `summary`.

**Factual fix:** See Critical Fix section above.

---

### /company/ai-agenter

**Status before:** No `metadata` export at all.

**Added:** Full metadata export with title, description, OG, Twitter card.
- Title: `'AI-agenter för chaufförsmatchning — DriverNord'`
- Description: Technical pipeline, five agents, real-time, human supervision

---

## New Files Created

### public/robots.txt

```
User-agent: *
Allow: /

Disallow: /recruiter/
Disallow: /api/

Sitemap: https://drivernord.com/sitemap.xml
```

Blocks search crawlers from indexing the protected recruiter cockpit and API routes. References the sitemap.

### public/sitemap.xml

8 URLs included:
- `/chaufforer` — priority 1.0 (driver landing / effective homepage)
- `/company` — priority 0.9 (B2B landing)
- `/about` — priority 0.7
- `/contact` — priority 0.6
- `/company/ai-agenter` — priority 0.5
- `/privacy`, `/terms`, `/cookies` — priority 0.3 (legal pages)

**Not included:** `/chat` (registration flow — should not be crawled/indexed), `/recruiter` (protected), `/` (redirect).

---

## Keyword Theme Coverage

| Keyword theme | Where implemented |
|---|---|
| chaufför Stockholm | /chaufforer title + description |
| CE chaufför Stockholm | /chaufforer description, /company title + description |
| C chaufför / lastbilschaufför | /chaufforer description, /company description |
| YKB chaufför | /about description, /company title + description |
| förarjobb Stockholm | /chaufforer description |
| transportföretag söker förare | /company title |
| matchning förare transportföretag | /about description |
| ingen bemanning / direktkontakt | /about description, /company description |
| DriverNord | All pages title, all OG titles |

---

## Structured Data Summary

| Page | Schema type | Coverage |
|---|---|---|
| /chaufforer | Organization, WebSite | Entity establishment |
| /company | FAQPage | Rich result eligibility for 5 FAQ items |
| All other pages | None (not needed) | — |

**Not implemented:** LocalBusiness (DriverNord is not a physical location), JobPosting (DriverNord is a matching platform not a job poster), Review (no reviews yet).

---

## What Was NOT Changed

- H1/H2 copy on any page — the page copy is well-structured and keyword-appropriate already
- Image alt text — already accurate and descriptive on all pages
- Internal linking structure — adequate for current page count
- `/chat` page metadata — registration flow pages are intentionally not SEO-optimized
- Any content that would misrepresent the legal positioning (not bemanning, not employer, no guaranteed jobs)

---

## Legal Alignment Check

All metadata and copy added is consistent with the legal positioning:
- "matchningstjänst" (not "bemanningsföretag")
- "direktkontakt" (not employer)
- "ingen jobbgaranti" referenced in terms, not in marketing copy
- "utan bemanningsavgifter" is factually accurate (DriverNord charges the company a flat fee, not a percentage staffing fee)

---

## Follow-up Actions for Founder

1. **Submit sitemap to Google Search Console** — Go to search.google.com/search-console, add property `https://drivernord.com`, submit `https://drivernord.com/sitemap.xml`
2. **Request indexing of /chaufforer** — After sitemap submission, use "URL Inspection → Request Indexing" for the driver landing page
3. **Verify domain in Google Search Console** — Required before ranking data appears
4. **Check rich results** — After Google indexes /company, test FAQPage schema at search.google.com/test/rich-results

---

*Version 1.0 — 2026-05-17 — Initial SEO update complete. 855/855 tests passing. 0 new TypeScript errors.*
