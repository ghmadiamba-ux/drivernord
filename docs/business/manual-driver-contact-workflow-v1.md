# Manual Driver Contact Workflow — v1

**Purpose:** How to safely contact HIGH priority drivers before automated SMS is active  
**Status:** Active — use this until `sms_safe = true` and 46elks is configured  
**Last updated:** 2026-05-19

---

## When to use this workflow

Use this every day that the operational intelligence endpoint returns `urgent_actions` containing `contact_high_priority_manually`.

Trigger:
```bash
curl https://drivernord.com/api/admin/operational-intelligence \
  -H "x-recruiter-key: $RECRUITER_API_KEY" | jq '.urgent_actions'
```

If you see `contact_high_priority_manually` in the list — follow this workflow before doing anything else.

---

## Step 1 — Get the HIGH priority lead queue

```bash
curl https://drivernord.com/api/admin/operational-intelligence \
  -H "x-recruiter-key: $RECRUITER_API_KEY" | jq '.high_priority_leads'
```

The list is sorted newest first. Each entry has:
- `id` — ingested_driver ID
- `first_name` — use for greeting (check `has_quality_issue` first)
- `phone` — call or WhatsApp number
- `license` — CE / C / D etc.
- `region` — stockholm / other_sweden / abroad
- `availability` — now / week / 1_month / not_yet
- `has_quality_issue` — true if name or email = phone number
- `ingested_at` — when they registered

---

## Step 2 — Verify data quality before contact

For each lead, check `has_quality_issue`.

| `has_quality_issue` | Action |
|---------------------|--------|
| `false` | Contact normally — data is clean |
| `true` | Do NOT use `first_name` for greeting. Call instead of WhatsApp. Ask for name during call. |

Also check `needs_founder_review` in the payload — these are HIGH priority leads with confirmed quality problems that need your attention first.

**Why this matters:** ~40% of first-day registrations had the phone number entered in the name field. If you send "Hej +46701234567" — the driver will not trust the message.

---

## Step 3 — Prioritize by availability

Contact in this order:
1. `availability = "now"` — available immediately, highest urgency
2. `availability = "week"` — available within a week
3. `availability = "1_month"` — available within a month
4. Skip `availability = "not_yet"` — not worth contacting yet

For each license tier, contact CE first (highest value to transport companies), then C, then D.

---

## Step 4 — Contact method

**Do NOT send SMS yet** — 46elks is not configured and simulation data must be cleaned first.

Safe contact methods:
1. **Phone call** — most reliable, handles name confusion
2. **WhatsApp** (personal number, not automated) — acceptable for clean-data leads
3. **LinkedIn** — only if you can confirm their identity first

**Script (phone call):**
```
"Hej, jag heter [ditt namn] från DriverNord.
Du registrerade dig på drivernord.com som CE-chaufför i [region].
Vi har ett matchat uppdrag som kan passa dig — har du en minut?"
```

**WhatsApp message (only for leads with `has_quality_issue = false`):**
```
Hej [first_name] 👋

Du registrerade dig på drivernord.com som [license]-chaufför.
Vi har ett uppdrag i [region] som matchar din profil.

Vill du veta mer? Svara JA så berättar jag mer.

— [ditt namn], DriverNord
```

---

## Step 5 — GDPR checklist before contact

Before contacting any driver:

- [ ] Driver registered voluntarily via drivernord.com/chat
- [ ] Driver accepted the consent checkbox (captured in `consent_registration_at`)
- [ ] You are contacting about driver placement — the stated purpose of the platform
- [ ] You are not selling the driver's data to a third party
- [ ] You are not texting an email-only address
- [ ] If the driver says "remove me" — remove from ingested_drivers and do not contact again

**What you can say:** "Du registrerade dig på drivernord.com och godkände att vi kontaktar dig om matchade uppdrag."

**What you cannot do:** Contact drivers from a purchased list, contact for anything other than driver placement, or share contact data externally.

---

## Step 6 — Avoid contacting against fake company matches

**Current risk:** All open `company_needs` are simulation/test companies. If you tell a driver "Vi har ett uppdrag hos [company]" — that company does not exist yet.

**How to handle this today:**
- Do NOT mention a specific company name in your outreach
- Say "Vi har ett uppdrag i [region] inom [domain]" — this is accurate
- Say "Vi är i kontakt med transportföretag i regionen" — this is accurate
- Do NOT say "SIMULATION Stockholm Distribution AB vill anställa dig"

**When real company needs exist:** Use the company name from the matching shortlist. Until then, be generic.

---

## Step 7 — Log your contact

After contacting a driver (success or not), log it so the system doesn't re-contact:

```bash
# Mark the shortlist_entry as contacted via Supabase or cockpit
# (Until the cockpit approval UI is built, use Supabase dashboard directly)

# In Supabase: shortlist_entries → find by driver_id → set contact_status = 'contacted', contacted_at = now()
```

This prevents:
- The 14-day dedup window from being bypassed
- Re-contacting the same driver when automated SMS activates

If you were unable to reach the driver (no answer, wrong number), set `contact_status = 'skipped'`.

---

## Step 8 — Duplicate registration handling

If `duplicate_warnings` in the operational payload shows duplicates for a phone number:
- The **first** registered driver (lower ingested_at) is the one in the system
- The duplicate was blocked from ingestion
- Contact the driver once — do not contact both registrations

---

## Daily cadence

| Time | Action |
|------|--------|
| Morning (9:00) | Check operational intelligence endpoint |
| 9:05 | Review `needs_founder_review` queue |
| 9:10–10:00 | Call HIGH priority leads with `availability = now` |
| 10:00–10:30 | WhatsApp clean HIGH priority leads with `availability = week` |
| 10:30 | Log contact outcomes in Supabase |
| Evening | Check if new HIGH priority leads arrived |

---

## What to track manually (until cockpit is built)

Keep a simple spreadsheet or note:
- Date contacted
- Driver first_name + phone (last 4 digits only for privacy)
- Outcome: answered / no answer / wrong number / interested / not interested
- Outcome date

This will inform conversion rate tracking once the cockpit is built.
