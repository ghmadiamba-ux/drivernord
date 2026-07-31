# DriverNord — Official Contact Information

## Canonical Public Contact Details

| Field | Value |
|-------|-------|
| **Email** | hej@drivernord.com |
| **Phone (display)** | 070-938 52 67 |
| **Phone (machine)** | 0709385267 |
| **Phone (international)** | +46 70 938 52 67 |
| **Website** | https://drivernord.com |

## Public-facing policy

**The phone number is public. Calls are welcome.**

The founder wants inbound calls. The phone number must appear on:
- Contact page (`/contact`) — with phone and email equally prominent
- Site footer (`LegalFooter`) — alongside email
- Company page (`/company`) — in the CTA section
- About page (`/about`) — in the contact box
- Email signatures in all outreach (B2B)
- Structured data / Schema.org `Organization` and `ContactPoint`

Do not hide the number. Do not present email as the only channel.

## Canonical email signature block

```
Med vänliga hälsningar,

Ghislain Alexander Mad
DriverNord
Matchning av yrkesförare för svenska transportföretag

Webb: https://drivernord.com
E-post: hej@drivernord.com
Tel: 070-938 52 67
```

For first cold outreach (deliverability rules):
- Plain text only — no HTML
- No website URL in the first cold email body
- No images, no tracking pixels
- Opt-out line must be present
- The Tel line remains; the Webb line is omitted from the first cold send

## Internal/private contexts — personal number is separate

The founder's personal phone number must NOT appear in any public-facing material.
It is used only for:
- `WHATSAPP_FOUNDER_PHONE` / `FOUNDER_WHATSAPP_PHONE` env vars
- Founder WhatsApp private notification channel (recipient only)
- Internal founder-only alert destinations

## Format Reference

| Format | Value | Use |
|--------|-------|-----|
| Swedish display | `070-938 52 67` | Email signatures, website, documents |
| Machine (digits only) | `0709385267` | ENV vars, data fields, system config |
| International E.164 | `+46709385267` | `tel:` href links, Schema.org, Meta |
| International readable | `+46 70 938 52 67` | Cross-border contexts, LinkedIn |

## Pages updated (2026-06-15)

| Page / File | Change |
|---|---|
| `app/contact/page.tsx` | Phone + email primary channels, topic cards below; removed "no phone office" note |
| `components/LegalFooter.tsx` | Added phone link alongside email in footer |
| `app/company/page.tsx` | Phone number in FinalCTA + phone button in MidCTA |
| `app/about/page.tsx` | Phone added to contact box |
| `app/chaufforer/page.tsx` | `telephone` added to Organization + ContactPoint schema |
| `lib/outreachAgent.ts` | Email signature updated to `070-938 52 67` |
| Python scripts + templates | All signatures updated |
| Outreach docs | All canonical signatures updated |

## History

- **2026-06-15 (session 2)**: Phone published on contact page, footer, company page, about page, and Schema.org structured data. Calls explicitly welcomed.
- **2026-06-15 (session 1)**: Official company phone `0709385267` registered. Replaced old founder personal number `0730681181` in email signatures, templates, and docs.
- Batch 1 outreach emails (sent 2026-05-26) contained the old number — already delivered and cannot be changed.
