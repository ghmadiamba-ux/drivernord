# Founder Operational Cockpit — v1

**Purpose:** Minimum viable daily workflow for running DriverNord before a full admin UI exists  
**Last updated:** 2026-05-19  
**Single tool:** `GET /api/admin/operational-intelligence`

---

## The one command you need every morning

```bash
curl https://drivernord.com/api/admin/operational-intelligence \
  -H "x-recruiter-key: $RECRUITER_API_KEY" | jq .
```

Everything below is a lens on the output of that single endpoint.

---

## Morning review flow (10 minutes)

### 1. Check urgent_actions (30 seconds)
```bash
| jq '.urgent_actions'
```

If empty → system is healthy, proceed to lead review.  
If not empty → deal with each action in priority order before anything else.

| Action type | What it means | Response time |
|------------|---------------|---------------|
| `clean_simulation_company_needs` | SMS gate blocked, fake data in DB | Today |
| `review_high_priority_data_quality` | HIGH driver has bad name data | Before contacting |
| `contact_high_priority_manually` | HIGH priority drivers waiting | Within 2 hours |
| `review_data_quality` | Drivers with bad name data | Today |
| `review_duplicate_registrations` | Duplicate phones detected | Review, no action needed |
| `pending_contact_actions` | SMS backlog exists | When 46elks ready |

---

### 2. Check funnel health (1 minute)
```bash
| jq '.funnel'
```

What to look for:
- `completion_rate_pct` below 15% → Meta campaign targeting issue or UX problem
- `completion_rate_pct` above 30% → Healthy, keep scaling spend
- Large spike in `anonymous_dropoff` → Chat broken or loading slowly
- Large spike in `disqualified` → Campaign reaching wrong audience (wrong license class)

**Baseline from first campaign day:** ~20% completion rate (20 completed / 97 sessions).

---

### 3. Check ingested drivers (1 minute)
```bash
| jq '.ingested_drivers'
```

| Field | Healthy | Watch if... |
|-------|---------|-------------|
| `total` | Growing each day | Stays at 0 for 2+ days |
| `high` | ≥ 1 per day | 0 for 3+ days → recalibrate campaign |
| `contactable` | > 50% of total | Drops below 30% → UX fix needed |

---

### 4. Review HIGH priority lead queue (5 minutes)
```bash
| jq '.high_priority_leads'
```

- Sort by `availability` — contact `now` first, then `week`
- Skip any with `has_quality_issue: true` until data is verified
- Check `needs_founder_review` for leads that need your attention before contact

For each HIGH priority lead you will contact: see `manual-driver-contact-workflow-v1.md`.

---

### 5. Spot-check campaign performance (1 minute)
```bash
| jq '.campaign_breakdown'
```

Which UTM campaigns are driving completions? Focus budget on the highest `completed/sessions` ratio.

---

### 6. Check SMS safety gate (10 seconds)
```bash
| jq '{sms_safe: .sms_safe, matching_blocked: .matching_blocked}'
```

If `sms_safe: false` → do NOT touch 46elks settings. See cleanup doc.  
If `sms_safe: true` and you have real company needs → proceed to 46elks activation checklist.

---

## Campaign monitoring flow

Use this when you add budget or change Meta targeting.

```bash
# Check every 4 hours during a campaign change
| jq '{funnel: .funnel, campaign_breakdown: .campaign_breakdown, top_regions: .top_regions}'
```

**What to watch:**
- Does `completion_rate_pct` hold above 15% as volume scales?
- Are new completions appearing in `top_regions`? If only `stockholm` → campaign is too narrow
- Which `utm_campaign` has the best conversion?

**Region heatmap proxy:**
```bash
| jq '.top_regions'
```
If `stockholm` > 80% of all leads → campaign is geo-restricted. Open to `other_sweden`.

**License distribution:**
```bash
| jq '.top_licenses'
```
If mostly `B` or `(unknown)` → campaign reaching non-CE drivers. Adjust Meta interest targeting.

---

## Lead review flow

Use this to prepare your contact list for the day.

```bash
| jq '[.high_priority_leads[] | select(.has_quality_issue == false) | select(.availability == "now" or .availability == "week")]'
```

This gives you the clean, available HIGH priority leads — the ones worth contacting first.

For quality issue leads:
```bash
| jq '.needs_founder_review'
```

---

## Contact review flow (post-contact)

After manual contact sessions, use this to review what's happened:

**Duplicate check:**
```bash
| jq '.duplicate_warnings'
```
If duplicates exist — only one was ingested. Don't worry about them unless you see the same phone in both lists.

**Data quality audit:**
```bash
| jq '.data_quality_warnings'
```
How many? Is it growing? If yes, the UX fix is urgent.

**Pending backlog:**
```bash
| jq '.pending_contact_suggested'
```
This is the size of the SMS queue waiting for 46elks activation. Track it growing — it's your future workload.

---

## Minimum alerts (implement as cockpit features later)

These are the conditions that require immediate action. Currently checked manually each morning; they will be automated in the cockpit UI.

| Condition | Metric | Threshold | Action |
|-----------|--------|-----------|--------|
| Campaign dried up | `funnel.completed` | 0 for 48h | Check Meta campaign status |
| HIGH lead backlog | `high_priority_leads.length` | > 5 | Contact immediately |
| Quality issue surge | `data_quality_warnings.length` | > 3 new per day | Deploy UX fix |
| System health | `system_warnings` | Any `severity: error` | Investigate same day |
| SMS gate blocked | `sms_safe` | `false` | Do not activate 46elks |

---

## Minimum actions (implement as cockpit features later)

These are actions the cockpit UI should support. Currently done via Supabase dashboard or curl.

| Action | Currently via | Future cockpit action |
|--------|---------------|-----------------------|
| View HIGH priority leads | curl + jq | Lead queue table |
| Mark contact outcome | Supabase dashboard | One-click contact log |
| Close simulation company_needs | SQL | One-click "clean test data" |
| Cancel bad contact_suggested | SQL | Bulk cancel button |
| Add real company need | Supabase or API | Company need form |
| Export lead list | curl + jq | CSV export |

---

## Domain breakdown (weekly check)

```bash
| jq '.top_domains'
```

After 1 week of traffic, check which transport domains your drivers actually work in. This tells you:
- Which `domain_required` values to put in real company needs
- Whether to adjust Meta campaign copy (e.g., "distribution" drivers vs "tipp" drivers)

---

## Ingestion timeline (anomaly detection)

```bash
| jq '.ingestion_timeline'
```

Check for registration spikes. A spike at 2am = bot traffic or campaign targeting a different timezone. A flat zero during business hours = campaign paused or budget depleted.

---

## What this cockpit does NOT cover (yet)

- Viewing and approving/rejecting individual `contact_suggested` actions
- Real-time shortlist reviews
- Company need management UI
- Follow-up scheduling
- Revenue tracking (packages sold)

These are Phase 2 cockpit features, post-first-sale. Don't build them before the first real company pays.

---

## Next cockpit build priority

Build these in order, only when manual workflow becomes the bottleneck:

1. **Lead queue page** — list of HIGH priority leads with contact buttons, quality flags, contact status
2. **Contact approval page** — review pending `contact_suggested` actions before sending
3. **Company need form** — add/close company needs without Supabase
4. **Campaign performance card** — funnel + UTM in a single view, updated daily
5. **SMS activation checklist** — visual version of this doc

Do not start cockpit UI until you have the first real company need and have manually contacted 10+ drivers. The UX will be much clearer once you've done the manual workflow.
