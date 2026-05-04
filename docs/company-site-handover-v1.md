# DriverNord — Company Site Handover
**Version 1 · Route: `/company` · Last updated: 2026-05-03**

---

## 1. What this site is

The `/company` page is the public website for DriverNord. Its purpose is to explain the product to two audiences:

- **Drivers (förare)** — people with a C, CE, D, C+D, or CE+D licence who are looking for better job opportunities
- **Transport/logistics companies (åkeriföretag)** — companies that need to find qualified drivers

The site does not process payments, store data, or submit forms. It is informational and directs visitors to either:
- the driver registration form at `/chat`
- the pilot access contact email (`hej@drivernord.se`)

The site is available in **Swedish (default)**, **English**, and **French**, switchable from the top navigation bar.

---

## 2. Where to edit content

There are exactly **two files** you will edit for routine content changes:

| File | What it controls |
|---|---|
| `lib/company/translations.ts` | Every visible word on the page (all 3 languages) |
| `lib/company/content.ts` | Page structure — which sections appear, in what order, and where buttons link |

You do not need to touch any other file for day-to-day content updates.

---

## 3. How to edit text

Open `lib/company/translations.ts`.

The file has three sections: `sv` (Swedish), `en` (English), `fr` (French). Each contains the same set of text keys. The page shows whichever language the visitor selects.

**Example — changing the hero headline:**

```typescript
sv: {
  'hero.headline': 'Strukturerad förarrekrytering. Utan CV-högar.',
  ...
},
en: {
  'hero.headline': 'Structured driver recruitment. No CV stacks.',
  ...
},
fr: {
  'hero.headline': 'Recrutement structuré de chauffeurs. Sans pile de CV.',
  ...
},
```

Find the key you want to change, update the text in all three language sections, save the file, and run `npm run build` to verify.

**Important:** If you add a new key, it must appear in `sv`, `en`, and `fr`. If it is missing from any language, the raw key name will appear on screen instead of text.

### Key naming convention

Keys follow the pattern `section.element.role`:
- `hero.headline` — the main heading in the hero section
- `problem.card1.title` — the title of the first problem card
- `cta.urgency` — the urgency line in the call-to-action section
- `nav.cta` — the button label in the top navigation bar

---

## 4. Section management

Open `lib/company/content.ts`.

The page is built from a list of sections defined in the `sections` array. The order of sections in the array determines the order on the page.

### How to reorder sections

Move any section object up or down in the array to change its position on the page.

```typescript
const sections = [
  { id: 'hero', ... },          // appears first
  { id: 'problem', ... },       // appears second
  { id: 'how-it-works', ... },  // appears third
  // ...
]
```

### How to hide or show a section

Each section has a `visible` field. Set it to `false` to remove the section from the page. Set it back to `true` to show it.

```typescript
// To hide the differentiation section:
{
  id: 'differentiation',
  type: 'differentiation',
  visible: false,  // ← hidden from the page
  ...
}

// To reveal the media section (currently hidden):
{
  id: 'media',
  type: 'media',
  visible: true,  // ← now visible
  ...
}
```

No other changes needed — the rest of the page adjusts automatically.

### How to add a new section safely

This requires a developer. The steps are:
1. Add the new section type to `lib/company/types.ts`
2. Create a new component file in `components/company/sections/`
3. Register it in `components/company/SectionRenderer.tsx`
4. Add the section definition to `lib/company/content.ts`
5. Add translation keys to `lib/company/translations.ts`
6. Run `npm run build`

---

## 5. Buttons and links

Every button on the site is configured in `lib/company/content.ts` using an `href` field. There are four types of link:

### Internal link — navigates to another page in the app

```typescript
href: { type: 'internal', path: '/chat' }
```

Use for: sending drivers to the registration form, linking to other app routes.

### Anchor link — scrolls to a section on the same page

```typescript
href: { type: 'anchor', id: 'how-it-works' }
```

The `id` must match the `id` field of a section in the `sections` array. Available section IDs: `hero`, `problem`, `how-it-works`, `differentiation`, `audience`, `credibility`, `cta`.

Use for: "See how it works" links, navigation bar links, any in-page scroll.

### Mailto link — opens the visitor's email client

```typescript
href: { type: 'mailto', email: 'hej@drivernord.se' }
```

Use for: the primary "Ansök om pilotåtkomst" CTA and any contact links.

**To update the contact email,** find every `mailto` entry in `content.ts` and replace `hej@drivernord.se` with the real address.

### External link — opens another website

```typescript
href: { type: 'external', url: 'https://example.com' }
```

Add `openInNewTab: true` to open in a new browser tab:

```typescript
{
  labelKey: 'some.key',
  href: { type: 'external', url: 'https://example.com' },
  variant: 'primary',
  openInNewTab: true,
}
```

---

## 6. Media — adding images and videos

The media section currently exists in the config but is hidden (`visible: false`). It is ready to use as soon as you have content.

### Step 1 — Enable the media section

In `lib/company/content.ts`:

```typescript
{
  id: 'media',
  type: 'media',
  visible: true,   // ← change from false to true
  background: 'white',
  blocks: [ ... ] // ← add your image or video block here
}
```

### Adding a local image

Place the image file in the `public/images/` folder (create it if it does not exist), then add an image block:

```typescript
blocks: [
  {
    blockType: 'image',
    image: {
      src: { type: 'local', path: '/images/your-filename.jpg' },
      alt: 'Brief description of the image',
      aspectRatio: '16/9',
      objectFit: 'cover',
    },
  },
],
```

A file placed at `public/images/truck.jpg` is referenced as `/images/truck.jpg`.

### Adding an image from a URL

```typescript
src: { type: 'external', url: 'https://example.com/image.jpg' }
```

### Adding a local video

```typescript
{
  blockType: 'video',
  video: {
    src: { type: 'local', path: '/videos/demo.mp4' },
    muted: true,
    loop: false,
    autoplay: false,
  },
},
```

### Adding a YouTube video

Find the video ID from the YouTube URL. For `https://youtube.com/watch?v=dQw4w9WgXcQ`, the ID is `dQw4w9WgXcQ`.

```typescript
{
  blockType: 'video',
  video: {
    src: { type: 'embed', platform: 'youtube', id: 'dQw4w9WgXcQ' },
  },
},
```

### Adding a Vimeo video

For `https://vimeo.com/123456789`, the ID is `123456789`.

```typescript
{
  blockType: 'video',
  video: {
    src: { type: 'embed', platform: 'vimeo', id: '123456789' },
  },
},
```

---

## 7. Deployment on Vercel

### How automatic deployment works

Once the project is connected to Vercel and linked to a GitHub repository:

1. Every push to the `main` branch **automatically deploys to production**
2. Every push to any other branch creates a **preview URL** — a temporary live link you can share for review before merging
3. Production URL is your Vercel domain (e.g. `drivernord.vercel.app`) until your custom domain is connected

### Connecting GitHub to Vercel (one-time setup)

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **New Project**
3. Click **Import Git Repository** → select your GitHub account and find the repo
4. Vercel will auto-detect Next.js — accept all defaults
5. Click **Deploy**

### Adding environment variables in Vercel

Before the app functions fully in production, add the following in Vercel:
**Settings → Environment Variables**

| Variable name | Where to find the value |
|---|---|
| `SUPABASE_URL` | Your Supabase project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase project settings → API |
| `MATCH_API_KEY` | The secret key defined in your `.env.local` file |

After adding variables, trigger a new deployment (redeploy from the dashboard or push a commit).

### Workflow for content updates

```
Edit translations.ts or content.ts
  ↓
Run: npm run build   (verify no errors locally)
  ↓
git add . && git commit -m "update site content"
  ↓
git push origin main
  ↓
Vercel auto-deploys → live in ~1 minute
```

---

## 8. Domain connection — drivernord.com → Vercel

**Domain:** `drivernord.com` (registered at Cloudflare Registrar)
**Vercel account:** already created

### Step 1 — Add the domain in Vercel

1. Open your Vercel project dashboard
2. Go to **Settings → Domains**
3. Type `drivernord.com` and click **Add**
4. Also add `www.drivernord.com` and set it to redirect to `drivernord.com`

Vercel will show you the DNS records it needs. They are:

### Step 2 — Add DNS records in Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select the `drivernord.com` domain
3. Go to **DNS → Records**
4. Add the following two records:

**Record 1 — A record (root domain)**

| Field | Value |
|---|---|
| Type | A |
| Name | `@` |
| IPv4 address | `76.76.21.21` |
| Proxy status | **DNS only** (grey cloud, not orange) |
| TTL | Auto |

**Record 2 — CNAME record (www subdomain)**

| Field | Value |
|---|---|
| Type | CNAME |
| Name | `www` |
| Target | `cname.vercel-dns.com` |
| Proxy status | **DNS only** (grey cloud, not orange) |
| TTL | Auto |

> **Important:** The proxy status must be set to **DNS only** (grey cloud icon in Cloudflare). If the orange cloud (proxied) is enabled, Vercel cannot issue an SSL certificate and the domain will not work correctly.

### Step 3 — Wait for propagation

DNS changes take between **a few minutes and 24 hours** to propagate globally. Typically it is under 30 minutes.

You can check propagation progress at [dnschecker.org](https://dnschecker.org) — enter `drivernord.com` and wait until you see `76.76.21.21` appearing across all locations.

Once propagated, Vercel will automatically issue an SSL certificate. The site will be available at `https://drivernord.com`.

---

## 9. What must NOT be touched

These files and routes are part of the live product and must not be changed without developer involvement:

| What | Why |
|---|---|
| `app/chat/` | Driver registration flow — connected to Supabase |
| `app/recruiter/` | Recruiter matching dashboard — connected to Supabase |
| `app/api/` | All API endpoints — run the matching engine |
| `lib/matchingEngine.ts` | Core filtering and ranking logic |
| `lib/matchScore.ts` | Scoring weights — any change affects match results |
| `lib/stepConfig.ts` | Driver questionnaire — defines the registration flow |
| `lib/ingestedDriver.ts` | Driver data model |
| `lib/companyNeed.ts` | Company need data model |
| `types/lead.ts` | Lead data model |

The `/company` site (`lib/company/`, `app/company/`, `components/company/`) is completely isolated. Changes there cannot affect the rest of the product.

---

## 10. Pre-publish checklist

Run this checklist before pushing any content change to production:

- [ ] **Build passes** — run `npm run build` locally, confirm no errors
- [ ] **No raw key strings visible** — open the page and confirm no text like `hero.headline` appears literally
- [ ] **All three languages work** — switch to English and French in the nav, check for blank or broken fields
- [ ] **All buttons work** — click every CTA button, verify they go to the right place
- [ ] **Mobile layout correct** — resize browser to 375px width or use Chrome DevTools device emulation
- [ ] **No new AI claims** — the matching system is rule-based scoring; do not describe it as AI, intelligent, or automated beyond what it is
- [ ] **No unverified claims** — any new copy must describe what the system demonstrably does today
- [ ] **Pilot email is current** — if `hej@drivernord.se` is a placeholder, update it before going public

---

## 11. Known limitations (v1)

- **Audience card tags do not translate.** The driver tags (`C · CE · D`) are universal. The company tags (`YKB · Regelbaserad matchning · Rankat urval`) are in Swedish regardless of language selection. This can be fixed in a future update.

- **Nav CTA is hidden on mobile screens below 640px.** On mobile, visitors use the hero section buttons instead. This is intentional to avoid overflow.

- **Contact email is a placeholder.** `hej@drivernord.se` needs to be replaced with a real address before the pilot launch.

- **No form submission.** The "Ansök om pilotåtkomst" button opens the visitor's email client. There is no intake form backend yet.

- **MediaSection is hidden.** Enable it and add image/video blocks when assets are ready.

---

## 12. Quick reference — most common tasks

| Task | File to edit |
|---|---|
| Change any text | `lib/company/translations.ts` |
| Change a button label | `lib/company/translations.ts` (find the key used in `content.ts`) |
| Change where a button links | `lib/company/content.ts` (find the button's `href`) |
| Update contact email | `lib/company/content.ts` (find `type: 'mailto'` entries) |
| Hide a section | `lib/company/content.ts` → set `visible: false` |
| Reorder sections | `lib/company/content.ts` → move section objects in the array |
| Add an image | `lib/company/content.ts` → add image block to media section, set `visible: true` |
| Add a YouTube video | `lib/company/content.ts` → add video block with embed type |
