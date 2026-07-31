# DriverNord — Cookie Banner Copy (Swedish)

**Date:** 2026-05-17
**Status:** DRAFT — PENDING GDPR LAWYER REVIEW
**Language:** Swedish (primary). English version below for reference.
**Usage:** This copy is for the `CookieConsentBanner` component. Must be reviewed by Swedish GDPR lawyer before going live.

---

## Design Principles

1. **Equal prominence.** "Acceptera alla" and "Endast nödvändiga" must be visually equal. No dark patterns.
2. **Plain language.** No legal jargon. A driver who has not read a privacy policy before must understand this.
3. **No pre-ticked boxes.** If granular toggles are shown, "Marknadsföring" must default to unchecked.
4. **Link to privacy policy.** Every version of the banner must include a link to the full privacy policy.
5. **No implied consent by scrolling.** Scrolling past the banner does not constitute consent.
6. **Withdrawal is as easy as acceptance.** The footer must have a "Hantera cookieinställningar" link.

---

## V1 Banner — Simple (Recommended for launch)

### Swedish

```
Cookies på DriverNord

Vi använder cookies för att förbättra vår tjänst och, om du godkänner, för att mäta hur vår marknadsföring fungerar med hjälp av Meta (Facebook). Vi delar inga personuppgifter om dig med Meta utan ditt samtycke.

[Acceptera alla]   [Endast nödvändiga]

Läs vår integritetspolicy för mer information.
```

### English (reference translation)

```
Cookies on DriverNord

We use cookies to improve our service and, if you agree, to measure the effectiveness of our marketing using Meta (Facebook). We do not share any personal data about you with Meta without your consent.

[Accept all]   [Necessary only]

Read our privacy policy for more information.
```

---

## V1 Banner — Granular (For if lawyer requires per-category toggles)

This version adds toggle controls per category. More transparent, but slightly more complex UX.

### Swedish

```
Cookieinställningar

Vi använder cookies för att vår webbplats ska fungera och för att förstå hur vi kan förbättra vår tjänst.

Nödvändiga (alltid aktiva)
Dessa cookies krävs för att webbplatsen ska fungera. De kan inte stängas av.

Marknadsföring [ AV ]
Vi använder Meta Pixel för att mäta hur vår annonsering fungerar. Inga personuppgifter skickas utan ditt samtycke.

Analys [ AV ]
Används för att förstå hur besökare använder vår webbplats. (Ej aktiverat ännu.)

[Spara inställningar]   [Acceptera alla]

Läs vår integritetspolicy.
```

---

## Footer Consent Preferences Link

This link must appear on every page, typically in the footer.

### Swedish

```
Hantera cookieinställningar
```

### English (reference)

```
Manage cookie preferences
```

When clicked, this link reopens the consent banner (with current settings pre-filled if already set). Users can change their preference at any time.

---

## Confirmation Message After Acceptance

Brief toast or inline confirmation after the user makes a choice.

### After "Acceptera alla"

```
Dina inställningar har sparats.
```

### After "Endast nödvändiga"

```
Dina inställningar har sparats. Inga spårningscookies används.
```

---

## Privacy Policy Link Text

The banner must link to the privacy policy. Use this link text:

```
integritetspolicy
```

Target URL: `https://drivernord.com/integritetspolicy` (or wherever the privacy policy lives on the site)

---

## What the Privacy Policy Must Disclose (Related to Cookies)

See `privacy-policy-update-requirements.md` for full requirements. The key disclosure items for the cookie section:

```
Marknadsföringscookies (Meta Pixel)
Vi använder Meta Pixel (ett spårningsverktyg från Meta Platforms Ireland Ltd) för att mäta 
hur vår marknadsföring fungerar. När du godkänner marknadsföringscookies skickar Meta Pixel 
information om ditt beteende på vår webbplats till Meta. Denna information används för att 
mäta effekten av vår annonsering och förbättra den.

Meta lagrar informationen enligt Metas integritetspolicy: [länk till Metas policy].
Du kan när som helst ändra dina cookieinställningar via länken "Hantera cookieinställningar" 
i sidfoten.
```

---

## Compliance Checklist for Banner Copy

Before publishing, lawyer must confirm:

- [ ] Banner headline does not imply consent by presence ("Vi använder cookies" without a choice is not acceptable as a standalone)
- [ ] "Acceptera alla" and "Endast nödvändiga" are presented with equal visual weight
- [ ] No pre-ticked boxes
- [ ] Link to privacy policy is present and functional
- [ ] Language is plain and accurate — does not overstate or understate what data is collected
- [ ] No implication that service is unavailable without marketing cookies ("We need your consent to show you the site" is NOT acceptable for non-essential cookies)
- [ ] Granular toggles (if used) default to OFF for non-necessary cookies
- [ ] Withdrawal mechanism (footer link) is described

---

## IMY (Swedish DPA) Guidance Reference

The following IMY guidance applies to this banner:

- **IMY 2021 cookie guidance:** Consent must be freely given, specific, informed, and unambiguous. Pre-ticked boxes are not valid consent.
- **IMY 2023 enforcement:** IMY has fined Swedish companies for using Google Analytics and Meta Pixel without valid consent. The banner must make the Meta/Facebook connection explicit.
- **EDPB guidelines on consent:** Consent for tracking cookies must be as easy to withdraw as to give. The footer link satisfies this.

**The lawyer's review of this copy is not optional.** The banner text directly determines whether tracking consent is legally valid.

---

## Versions

| Version | Changes | Lawyer reviewed? |
|---|---|---|
| 1.0 | Initial draft — 2026-05-17 | NO — pending |

---

*Version 1.0 — 2026-05-17 — Draft copy only. Not live. Pending GDPR lawyer review before implementation.*
