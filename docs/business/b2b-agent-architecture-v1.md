# DriverNord — B2B Agent Architecture v1

*Created: 2026-05-10*
*Phase: 1.5 — B2B Research (active). Implementation: not started.*
*Status: Architecture document only. No code changes. No schema migrations.*

---

## 1. Executive Summary

DriverNord's driver-side pipeline is autonomous and production-ready. A driver completes `/chat`, gets classified and scored, is matched to open company needs, and a contact suggestion surfaces in the recruiter cockpit for approval. That chain runs without human intervention from the moment the driver submits.

The company side has no equivalent. Company needs are created by the recruiter via direct API call. Company research lives in static CSV files. There is no way to track which target companies have been approached, at what stage, or with what outcome. There is no mechanism to turn a real phone call with a transport manager into a structured company need without manual data entry by the recruiter.

This document proposes six B2B agents to close that gap. Together, they systematize the research, scoring, outreach preparation, and relationship tracking that are currently done by hand — while keeping humans in control of every action that affects the outside world.

The specific problems B2B agents must solve:

- **Research at scale without hallucination.** 50 target companies were assembled manually. Scaling to 200 requires structured research output that a human can validate quickly, not a wall of unverified notes.
- **Avoiding wasted time on inaccessible accounts.** Enterprise accounts with procurement portals require months to onboard. Scoring those companies automatically and surfacing the warning before the recruiter invests time is worth building.
- **Outreach that does not misrepresent DriverNord.** The single highest risk in B2B is claiming DriverNord has a driver pool it does not have, or positioning as a staffing agency. A human must review every message before it is sent.
- **Structured company needs.** When a transport company agrees to a pilot, their requirements (license, YKB, domain, region, urgency) need to enter the matching pipeline in exactly the right format. An agent can draft a need from call notes; a human must approve it before matching runs.
- **Cockpit visibility.** The recruiter should be able to see all B2B state — targets, drafts, approvals, warnings — in the same interface that governs the driver-side pipeline.

---

## 2. Current State

### What exists today

**Research CSVs (docs/business/):**
- `b2b-target-company-first-50.csv` — 50 real Swedish transport companies, 29 columns each, collected in Research Pass 1
- `b2b-target-company-top-10-research.csv` — deep enrichment of the 10 highest-scoring companies from the 50
- `b2b-target-company-top-10-notes.md` — contact completeness, best 5, risk notes, missing data
- `b2b-barrier-entry-research-framework.md` — research strategy, segment taxonomy, scoring model (7 dimensions, 0–100)
- `b2b-target-company-sheet-template.md` — column-by-column guide for all 29 research fields

**Top 5 companies ready for outreach (as of 2026-05-10):**

| Company | Contact | Barrier | Score |
|---------|---------|---------|-------|
| Canoil Transport AB | Thomas Fredriksson, tf@canoil.se, 0707771059 | low | 85 |
| Transportfirma Trabé | Peter Ericson VD, peter.ericson@trabe.se | low | 82 |
| Edvardssons Last och Schakt AB | Marika Edvardsson VD, Marika@fmbcentral.se | low | 82 |
| JPC Entreprenad AB | Harry Norberg VD, info@jpcentreprenad.se | low | 82 |
| Enskede Bilexpress AB | David Sjölund CEO, david.sjolund@enskedebilexpress.se | medium | 78 |

**What does not exist:**
- No database tables for company research targets, outreach actions, pilot relationships, or company need drafts
- No automated B2B agents of any kind
- No B2B view in the recruiter cockpit
- No company self-service intake form (all needs created via recruiter API call)
- No tracking of which companies have been contacted, replied, or agreed to pilot

The existing pipeline is fully driver-facing. The company side is entirely manual.

### What the driver-side pipeline looks like (the model to mirror)

```
driver intake → classify → ingest → score → match → shortlist → contact suggestion → cockpit approval → provider send
```

Each step is automated; each step that touches the outside world (contact suggestion, actual send) requires human approval unless the operator explicitly switches to auto mode. The B2B pipeline should follow the same principle: agents prepare, humans decide.

---

## 3. Core Principle

**Agents may research, score, draft, recommend, and prepare.**

**Agents must NOT:**
- Send any outreach message to any company contact
- Promise driver availability, fill rates, or pool size
- Create a `company_need` row (which triggers matching) without explicit human approval
- Create a `company_need_draft` that auto-promotes itself to a real `company_need`
- Move a target company's relationship status based on silence or non-response
- Expose driver PII (name, phone, email) to a company contact without a DPA in place

This mirrors the driver-side principle: the contact agent in suggest mode creates a `contact_suggested` action and waits. The human approves. Only then does the message reach the driver. The same pattern applies to every B2B agent output that affects the external world.

The distinction that matters most: `company_need_draft` is not `company_need`. A draft exists for the operator's review. A real `company_need` row triggers `runMatchingAgent()` automatically. These must never be conflated. An agent writing a draft must not write to the `company_needs` table — it writes to a separate `company_need_drafts` table, and the operator converts it manually.

---

## 4. Proposed B2B Agents

---

### Agent A — Company Research Agent

**Purpose:** Find and enrich target companies from public sources.

**Inputs:**
- Search keywords (e.g., "CE-chaufför Stockholm", "lastbilsförare sökes")
- Target geography (Stockholm region first)
- Segment rules (Segment A/B priority, skip F)
- Public job ads (Arbetsförmedlingen, Blocket, LinkedIn, Vakanser.se)
- Company websites and career pages
- Public business registry (Allabolag.se data where accessible)

**Outputs per company:**
- Company name, website, region, city, size estimate
- Transport domain (from DriverNord 15-domain taxonomy)
- Visible driver need (yes/no)
- Job ad URL(s) and ad details (license class, YKB mention, förarkort mention)
- Urgency signal (single_ad / repeated_ads / stated_urgency)
- Basic barrier estimate (low / medium / high / enterprise_only)
- Decision-maker name and role (if findable in public sources)
- Contact email and phone (if findable)
- Source notes (where found, ad date, raw ad text preserved before expiry)

**Status values for each research target:**

| Status | Meaning |
|--------|---------|
| `not_started` | Company identified, no research done beyond name and source |
| `researching` | Research in progress — agent is actively processing |
| `enriched` | All available public fields completed; ready for human validation |
| `incomplete` | Research attempted but key fields missing (no DM, no contact) |
| `rejected` | Does not qualify (Segment F, wrong license, Norrland, bankrupt) |

**Human validation required:**
The operator confirms that the source data is valid and the company is a genuine transport operator before the record becomes a qualified target. This prevents hallucinated contacts, outdated job ad data, or enterprise accounts being misclassified as SMEs from flowing into the outreach queue.

**Risks:**
- Job ads expire; a URL recorded today may be dead in 14 days — `source_notes` must preserve the ad content at capture time
- Wrong company entity (e.g., research confuses Kyl- och Frysexpressen Nord AB with Mälardalen AB — this happened in Research Pass 1 and required manual correction)
- Hallucinated contact emails that appear plausible but are not real — agent must cite the exact source of every email address
- Enterprise accounts misclassified as SMEs due to misleading job ad language — size signals from LinkedIn employee count and Allabolag.se must be cross-referenced

---

### Agent B — Barrier Scoring Agent

**Purpose:** Score each enriched company on pilot feasibility and produce a ranked outreach queue.

**Inputs:**
- Enriched company record from Agent A
- Visible driver need confirmation
- Decision-maker access level
- Procurement signals (supplier page found? formal portal?)
- Region (Stockholm fit)
- Transport domain fit (CE + YKB-required domains score highest)
- Urgency signals (repeated_ads = +10 points)

**Scoring model (directly from the barrier-entry research framework):**

| Dimension | Max | Scoring rule |
|-----------|-----|-------------|
| Visible driver need | 25 | 25=active ad now; 15=last 30 days; 8=mentioned on site; 0=none |
| Stockholm fit | 15 | 15=Stockholm city; 12=Stockholm region; 10=Uppsala; 8=Sörmland/Mälardalen; 5=other |
| Transport domain fit | 15 | 15=CE+YKB domain; 12=CE mixed; 10=C license; 5=unclear; 0=outside scope |
| Decision-maker access | 15 | 15=owner/VD direct; 12=transport manager named; 10=role known/unnamed; 5=HR only; 0=none |
| Procurement simplicity | 15 | 15=no portal; 12=simple agreement; 8=HR process; 4=formal page; 0=portal required |
| Urgency signal | 10 | 10=repeated_ads; 7=single_ad; 5=recent expired; 3=mentioned; 0=none |
| Trust/openness | 5 | 5=warm intro; 3=tech-forward signals; 1=standard operator; 0=resistance signals |

**Outputs:**
- `pilot_accessibility_score` (0–100, integer)
- `barrier_level` (low / medium / high / enterprise_only)
- `recommended_entry_point` (who to contact, which channel, which opening)
- Target priority ranking within the current queue

**Status values:**

| Status | Meaning |
|--------|---------|
| `unscored` | Enriched but not yet scored |
| `scored` | Score computed; awaiting operator review |
| `needs_review` | Score flags something unusual — operator must verify before approving |
| `rejected` | Score too low or disqualification rule triggered; removed from outreach queue |
| `approved_for_outreach_draft` | Operator confirmed score; company enters outreach draft queue |

**Human validation required:**
The operator confirms or overrides the score before outreach drafts are generated. A score of 90 for a company that was misclassified as an SME should never auto-generate an outreach email — the human validates the score makes sense in context.

**Risks:**
- Overrating companies with weak DM access (a named transport manager on LinkedIn who is not actually the hiring decision-maker)
- Underrating strategically valuable medium-size accounts with slightly higher barrier — a company scoring 65 with a warm introduction path is better than a 78-score company with no contact
- Ignoring procurement barriers that are not visible on the website (some companies have informal vendor panels that only emerge in conversation)

---

### Agent C — Outreach Draft Agent

**Purpose:** Generate personalized Swedish outreach drafts ready for human review and manual send.

**Inputs:**
- Enriched company record (from Agent A)
- Confirmed barrier score (from Agent B, operator-approved)
- Company-specific angle (what makes this company uniquely relevant to approach)
- DriverNord's current positioning: pilot-stage, driver acquisition infrastructure, not staffing
- Hard constraint: no active driver pool yet — do not imply immediate delivery

**Outputs per company:**
- First contact email draft (Swedish, 5 sentences max, specific subject line)
- LinkedIn message draft (shorter, for when email not available)
- Phone opener script (2–3 sentences, for follow-up calls)
- Follow-up email draft (7-day no-reply follow-up)
- Objection handling responses (for: "are you a staffing agency?", "how many drivers do you have?", "what does it cost?")

**Status values:**

| Status | Meaning |
|--------|---------|
| `not_drafted` | Company approved for draft; draft not yet created |
| `drafted` | Draft created; awaiting operator review |
| `needs_edit` | Operator has reviewed and flagged edits required |
| `approved` | Operator approved the draft; ready for manual send |
| `rejected` | Draft does not fit the company; operator has written their own |

**Human validation required:**
Mandatory. No message is sent automatically. The draft is a starting point for the operator, not a finished product. The operator reads, edits if needed, approves, and sends manually via their own email client or LinkedIn. The agent never sends.

**Tone and content constraints enforced during drafting:**
- Never claim DriverNord has X drivers available (pool size is not stated)
- Never use the word "bemanning" or "staffing" in the self-description
- Never promise fill rates, placement guarantees, or hiring timelines
- Never lead with "AI" — leads with the driver qualification result (YKB, CE, domain, availability)
- Subject line must reference the specific driver need (e.g., "Kvalificerade tankbilschaufförer — tf@canoil.se")
- Call to action is always a 20-minute conversation, never a commitment or payment

**Template reference (from barrier-entry research framework):**
Three base templates exist in the research framework:
- Template A: Owner/VD at SME transport company (no prior contact)
- Template B: Transport manager at regional operator (no prior contact)
- Template C: Agency partnership inquiry (staffing agency as potential partner)

The agent selects the base template from the decision-maker role, then personalizes using company-specific signals (domain, ad reference, urgency, city).

**Risks:**
- Claiming DriverNord already has drivers — this destroys trust immediately if the company asks for names; the agent must be instructed never to imply this
- Sounding like a staffing agency — operators ask "do you employ the drivers?"; the answer must be ready and clear
- Overpromising — "we can deliver a shortlist within 48 hours" is only true once the pipeline is live with real SMS; do not promise this pre-pilot
- Generic copy — "We noticed you are hiring CE drivers" is spam; the draft must reference the specific ad, the specific domain, the specific DM by name
- Wrong tone for Swedish SME owners — Swedish business culture values brevity, directness, and humility; long pitch emails will not be read

---

### Agent D — Pilot Relationship Agent

**Purpose:** Track the progression of each target company through the B2B pipeline from first research to pilot agreement or disqualification.

**Inputs:**
- Approved outreach draft (from Agent C)
- Human notes entered after real-world interaction (call, email reply, meeting)
- Outreach send status (human confirms when they sent the email or made the call)
- Replies received (human enters reply content or outcome)
- Call results (human enters notes after the call)

**Outputs:**
- `relationship_status` (current stage in the pipeline)
- `next_action` (specific next step with a suggested date)
- `pilot_stage` (once a pilot is agreed)
- Reminders for follow-up (surfaced to cockpit when `next_action_date` passes)
- Recommended follow-up sequence (e.g., "no reply after 7 days → send follow-up email draft")

**Status values:**

| Status | Meaning |
|--------|---------|
| `researched` | Company in research queue, not yet outreach-ready |
| `outreach_ready` | Score approved, draft approved, ready for human to send |
| `contacted` | Human has confirmed they sent the first outreach |
| `replied` | Company has responded (any reply — positive or negative) |
| `call_booked` | A meeting or call is scheduled |
| `needs_collected` | Call/meeting happened; company's driver needs have been captured as notes |
| `pilot_agreed` | Company has agreed to participate in a pilot |
| `pilot_lost` | Company declined, ended conversation, or no longer suitable |
| `nurture_later` | No current urgency; revisit in 60–90 days (e.g., "we use Jobzone exclusively right now") |

**Human validation required:**
The agent does not move a company to a new status based on inference. Only a human action moves the status: the human confirms they sent the email, enters the reply, records the call outcome. The agent surfaces reminders and suggests next actions but cannot advance the relationship unilaterally.

After any real-world interaction (a reply, a call, a meeting), the human enters notes. The agent does not interpret silence as rejection — it surfaces a reminder and asks the human to classify the outcome.

**Risks:**
- Treating non-response as rejection too early: silence after 7 days may mean the email went to spam, the transport manager was driving a truck, or the company is interested but busy — the agent must surface a reminder and ask, not mark as lost
- Losing manual context: a verbal agreement made on a phone call must be manually entered as notes — the agent cannot capture what happens outside its input fields
- Confusing research status with sales status: a company can be `research_status = complete` and `relationship_status = researched` at the same time — these are separate state machines that should not be conflated

---

### Agent E — Company Need Draft Agent

**Purpose:** Convert a real company conversation (call notes, email, meeting output) into a structured draft of a company need, ready for the operator to validate and convert into a real need that triggers matching.

**Inputs:**
- Operator-entered call or meeting notes (free text)
- Company requirement details extracted from notes:
  - License required (C / CE / D)
  - YKB requirement (yes/no)
  - Förarkort requirement (yes/no)
  - Transport domain (from DriverNord 15-domain taxonomy)
  - Region (Stockholm / other)
  - Relocation tolerance (yes/no)
  - Shift type (day / night / weekend / flexible)
  - Urgency (standard / emergency)
  - Number of drivers needed
  - Desired start date
  - Any additional constraints (e.g., ADR, specific vehicle type, min experience)

**Outputs:**
- `company_need_draft` object with all structured fields populated where determinable
- `missing_fields` list: fields that could not be extracted from notes and must be confirmed with the company
- Match readiness assessment: is the draft complete enough to trigger matching?
- Recommended validation questions: the specific questions to ask the company to fill missing fields

**Status values:**

| Status | Meaning |
|--------|---------|
| `draft_created` | Draft created from notes; awaiting operator review |
| `incomplete` | Missing required fields; cannot proceed to matching until filled |
| `ready_for_review` | All required fields present; operator must validate before approving |
| `approved_for_matching` | Operator has approved; ready to convert to a real `company_need` |
| `rejected` | Notes were too vague, company requirements are outside scope, or pilot is not yet confirmed |

**Human validation required:**
Mandatory, at two levels. The operator reviews the draft for accuracy — does it reflect what the company actually said? Then the operator explicitly converts the approved draft into a real `company_need` row. The agent never writes to `company_needs`. It writes only to `company_need_drafts`. The operator's conversion action is the only path from draft to live need.

**The critical distinction:**
`company_need_draft` → does not trigger matching
`company_need` → triggers `runMatchingAgent()` automatically

This is not a subtle distinction. A premature or inaccurate `company_need` will cause `runMatchingAgent` to run against a misspecified need, generate a shortlist of drivers matched to the wrong criteria, and potentially result in the contact agent suggesting a driver contact for a need that does not yet exist. The draft gate prevents this.

**Risks:**
- Creating fake needs: notes from an exploratory conversation ("we might need drivers in Q3") should not become a `company_need_draft` — the need must be real and confirmed before drafting
- Triggering matching too early: the operator must understand that approving the draft and converting it to a need is a consequential action that starts the matching chain
- Misunderstanding requirements: "we need CE drivers" is not enough — domain, region, shift, and urgency must all be present for a useful shortlist
- Matching against an insufficient driver pool: if the pool has 3 drivers and the need requires 10, a shortlist will be created but will be empty or inadequate — the agent should surface a pool size warning before the operator converts the draft

---

### Agent F — B2B Cockpit Agent

**Purpose:** Surface all company-side tasks, warnings, and pending approvals to the operator in a single view — the B2B equivalent of the existing driver-side cockpit.

**Inputs:**
- All company research targets and their status
- All outreach drafts and their approval status
- All pilot relationship stages and pending follow-up dates
- All company need drafts and their validation status
- Warnings generated by other agents (stale research, missed follow-up, high-opportunity targets not yet actioned)

**Outputs:**
- **Pending approvals:** "3 outreach drafts awaiting your review"
- **Stale targets:** "Canoil Transport — no action in 14 days, follow-up recommended"
- **High-opportunity targets not yet actioned:** "JPC Entreprenad approved for outreach 8 days ago — draft not yet sent"
- **Missing-data warnings:** "Thermobud AB — VD name unknown; find before emailing"
- **Follow-up reminders:** "Enskede Bilexpress — no reply in 7 days; follow-up email draft ready"
- **Pipeline summary:** counts at each relationship stage (contacted, replied, call_booked, pilot_agreed)
- **Company need draft alerts:** "1 need draft ready for approval — will trigger matching when converted"

**Status values per warning/task:**

| Status | Meaning |
|--------|---------|
| `active` | Task or warning is current and actionable |
| `pending_review` | Draft or score awaiting operator action |
| `warning` | Something is stale or overdue |
| `blocked` | A required prior step has not been completed |
| `completed` | Operator has resolved this item |

**Human validation required:**
The cockpit does not decide. It exposes actions for the human. An operator who sees "Canoil Transport — outreach draft approved, not yet sent" must take the action themselves. The cockpit surfaces the context and the suggested next step; it does not act on the operator's behalf.

**Integration with existing cockpit (`/recruiter`):**
The B2B cockpit view should be a tab or section within the existing recruiter cockpit, not a separate application. The operator already monitors the driver-side pipeline in `/recruiter`. B2B state should be visible in the same session without switching context.

**Risks:**
- Alert fatigue: if the cockpit surfaces every stale record and every pending action simultaneously, the operator will stop reading it; warnings must be prioritized (error > warning > reminder) and count-capped per session
- Too many pending actions: if 20 outreach drafts are generated and queued before the operator reviews any of them, the review queue becomes a backlog that feels overwhelming; the agent should generate drafts in batches of 5 maximum
- Unclear next action: each item surfaced by the cockpit must have a single, specific, actionable button or instruction — not "research this company more" but "complete the barrier_notes field for Thermobud AB"

---

## 5. Agent Flow

The complete B2B pipeline, showing where agents act and where humans approve:

```
[Agent A] Research target created
     ↓
[Agent A] Company enriched — all public fields populated
     ↓
[GATE 1] Operator confirms: valid transport company, correct entity, source quality acceptable
     ↓
[Agent B] Barrier scored — pilot_accessibility_score + barrier_level + recommended_entry_point computed
     ↓
[GATE 2] Operator confirms or overrides score
     ↓  (score < 45 → rejected; score 45–69 → queue for later; score ≥ 70 → approved for outreach draft)
[Agent C] Outreach draft created — email, LinkedIn message, phone opener, follow-up
     ↓
[GATE 3] Operator reviews draft, edits if needed, approves
     ↓
[Human] Sends email or LinkedIn message manually from their own account
     ↓
[Agent D] Relationship status updated to 'contacted' — operator confirms send
     ↓
[Agent D] Reminder fires if no reply in 7 days → follow-up draft surfaced
     ↓
[Human] Reply received → operator enters reply content and outcome
     ↓
[GATE 4] Operator classifies relationship stage (replied / call_booked / pilot_lost / nurture_later)
     ↓
[Human] Call or meeting happens → operator enters call notes
     ↓
[Agent D] Relationship status updated to 'needs_collected'
     ↓
[Agent E] Need draft created from call notes — structured fields extracted, missing fields flagged
     ↓
[GATE 5] Operator validates need draft — confirms accuracy, fills missing fields
     ↓
[GATE 6] Operator approves need draft — explicitly converts to company_need
     ↓
[System] company_need row created → runMatchingAgent() fires automatically
     ↓
[Agent 3 — existing Matching Agent] Shortlist created
     ↓
[Agent 4 — existing Contact Agent] contact_suggested (pending) logged
     ↓
[GATE 7] Operator approves contact suggestion in cockpit → provider sends message to driver
```

**What company_need triggers:**
Creating a `company_need` row via the existing `POST /api/company-needs` endpoint immediately fires `triggerMatchingForNeed(needId)`, which calls `runMatchingAgent()`, which creates a shortlist and fires the contact agent. This is why Gate 6 (converting a draft to a real need) is the most consequential approval in the B2B chain. It must never be automated.

---

## 6. Human Approval Gates

Seven gates in the B2B pipeline. Each must be cleared by a human action. No agent advances a record past any gate without explicit operator confirmation.

| Gate | Trigger | What the human decides | Risk if skipped |
|------|---------|----------------------|-----------------|
| **Gate 1** | Research enrichment complete | Is this a valid, correctly identified company worth pursuing? | Outreach to wrong entity; wasted effort on enterprise account; hallucinated contact |
| **Gate 2** | Barrier score computed | Is the score accurate? Approve, override, or reject? | Outreach to enterprise account misclassified as low-barrier; missed strategic medium-barrier target |
| **Gate 3** | Outreach draft ready | Is the message accurate, on-brand, and appropriate for this specific contact? | Message claims driver pool DriverNord does not have; positions as staffing agency; wrong tone; generic |
| **Gate 4** | Real-world interaction occurs | What is the current relationship status based on actual conversation? | Non-response misclassified as rejection; pilot agreement not recorded; follow-up missed |
| **Gate 5** | Need draft created from call notes | Is the draft accurate? Are all required fields correct? | Incorrect need triggers wrong shortlist; drivers matched to requirements that do not exist |
| **Gate 6** | Need draft validated | Explicitly convert the draft to a real company_need | Premature matching run; shortlist created before company has agreed; driver contacted for unconfirmed need |
| **Gate 7** | Driver contact suggestion created | Approve this specific driver contact for this specific need | Driver contacted for a company that has not confirmed the pilot; wrong driver for the need |

Gates 6 and 7 are the highest-consequence gates. Gate 6 triggers matching. Gate 7 triggers driver contact. Both must be protected by the same approval architecture as the existing `contact_suggested` pattern in the driver-side pipeline.

---

## 7. Future Data Model Preview

These tables do not yet exist. No migrations should be created until the implementation plan is approved. They are proposed here to define scope and clarify how B2B state should be separated from the existing driver-side schema.

---

### `company_research_targets`

**Purpose:** The canonical record of every company DriverNord has researched as a potential pilot client. The database equivalent of the current CSV files.

**Key fields:**

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `company_name` | TEXT | Legal/trading name |
| `website` | TEXT | URL |
| `region` | TEXT | Enum: stockholm / stockholm_region / malardalen / other |
| `city` | TEXT | City of primary operations |
| `company_size` | TEXT | micro / small / medium / large |
| `segment` | TEXT | A / B / C / D / E / F / agency |
| `transport_domain` | TEXT[] | Array of domain values from taxonomy |
| `visible_driver_need` | BOOLEAN | |
| `job_ads_url` | TEXT | Direct URL; may expire |
| `license_mentions` | TEXT[] | C / CE / D / CE+D |
| `ykb_mentioned` | BOOLEAN | |
| `driver_card_mentioned` | BOOLEAN | |
| `urgency_signal` | TEXT | none / single_ad / repeated_ads / stated_urgency |
| `contact_email` | TEXT | Best available |
| `phone` | TEXT | |
| `linkedin_url` | TEXT | Company page or DM profile |
| `decision_maker_name` | TEXT | |
| `decision_maker_role` | TEXT | owner / VD / transport_manager / etc. |
| `procurement_page` | TEXT | URL or 'none' |
| `supplier_requirements_url` | TEXT | URL or 'none_found' |
| `barrier_level` | TEXT | low / medium / high / enterprise_only |
| `barrier_notes` | TEXT | Specific evidence |
| `pilot_accessibility_score` | INTEGER | 0–100 |
| `opportunity_score` | INTEGER | Separate score; 0–100 or enum |
| `recommended_entry_point` | TEXT | Who, channel, opening |
| `next_action` | TEXT | Specific next step |
| `research_status` | TEXT | not_started / researching / enriched / incomplete / rejected |
| `source_notes` | TEXT | Raw evidence, source platform, ad content |
| `last_checked_date` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

**Why it should exist:** The current CSV files cannot be queried, sorted, or joined to the rest of the DriverNord data model. They cannot trigger cockpit warnings. They cannot be linked to outreach actions or relationship records. Moving company research to the database enables the entire B2B pipeline.

**What it should NOT replace:** `companies` (the existing table for companies with active needs in the matching pipeline). A `company_research_target` becomes a `company` only when a real need is created. They are at different stages: research target → company with needs. The two tables must remain separate.

---

### `company_outreach_actions`

**Purpose:** Every outreach draft generated, reviewed, and (when approved) sent manually by the operator. The audit log for all B2B contact preparation.

**Key fields:**

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `target_id` | UUID | FK → company_research_targets |
| `outreach_type` | TEXT | email / linkedin / phone_opener / follow_up |
| `draft_content` | TEXT | The draft message |
| `subject_line` | TEXT | For email drafts |
| `status` | TEXT | not_drafted / drafted / needs_edit / approved / rejected |
| `drafted_at` | TIMESTAMPTZ | |
| `approved_at` | TIMESTAMPTZ | |
| `approved_by` | TEXT | Recruiter identifier |
| `sent_at` | TIMESTAMPTZ | Human-confirmed send timestamp |
| `sent_by` | TEXT | Recruiter identifier |
| `send_channel` | TEXT | How the human sent it (email / linkedin / phone) |
| `notes` | TEXT | Operator notes on edits or rejection reason |
| `created_at` | TIMESTAMPTZ | |

**Why it should exist:** Outreach drafts need to be stored somewhere reviewable before they are sent. A draft that lives only in the agent's output is lost after the conversation ends. This table also creates a tamper-evident record: if a company later says "you told me you had 200 drivers," the draft can be reviewed to confirm what was actually written.

**What it should NOT replace:** `system_actions` (the existing driver-side audit log). Outreach actions are B2B-specific and require different fields. Mixing them into `system_actions` would pollute the existing cockpit and make the action type list unmanageable.

---

### `pilot_company_relationships`

**Purpose:** The progression of each target company through the B2B sales pipeline — from first contact to pilot agreed or lost.

**Key fields:**

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `target_id` | UUID | FK → company_research_targets |
| `relationship_status` | TEXT | researched / outreach_ready / contacted / replied / call_booked / needs_collected / pilot_agreed / pilot_lost / nurture_later |
| `first_contact_date` | TIMESTAMPTZ | When operator confirms first outreach sent |
| `last_interaction_date` | TIMESTAMPTZ | Most recent human touchpoint |
| `next_action` | TEXT | Specific next step |
| `next_action_date` | TIMESTAMPTZ | When the next action should happen |
| `call_notes` | TEXT | Operator-entered notes from calls and meetings |
| `reply_content` | TEXT | Summary of company's reply |
| `pilot_agreed_date` | TIMESTAMPTZ | When pilot was confirmed |
| `pilot_lost_reason` | TEXT | Why the company declined or became unsuitable |
| `nurture_resume_date` | TIMESTAMPTZ | When to revisit a nurture_later company |
| `company_id` | UUID | FK → companies (populated when company_need is created) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Why it should exist:** Relationship state is not derivable from research data. Whether a company has replied, agreed to a call, or declined a pilot is real-world information that only exists in this table. Without it, the operator has no systematic way to know what stage each company is at.

**What it should NOT replace:** `company_research_targets` (the research record) or `companies` (the need-and-matching record). All three can co-exist for the same company at different lifecycle stages.

---

### `company_need_drafts`

**Purpose:** Structured drafts of company driver requirements, created from call notes after a company conversation, waiting for operator validation before being converted to a real need.

**Key fields:**

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `target_id` | UUID | FK → company_research_targets |
| `relationship_id` | UUID | FK → pilot_company_relationships |
| `source_call_notes` | TEXT | The raw operator notes this was derived from |
| `license_required` | TEXT | C / CE / D / CE+D |
| `ykb_required` | BOOLEAN | |
| `driver_card_required` | BOOLEAN | |
| `domain_required` | TEXT | From DriverNord domain taxonomy |
| `domain_preferred` | TEXT[] | Additional domains acceptable |
| `location_region` | TEXT | From DriverNord region taxonomy |
| `relocation_allowed` | BOOLEAN | |
| `shift_type` | TEXT | day / night / weekend / flexible |
| `urgency` | TEXT | standard / emergency |
| `drivers_needed` | INTEGER | How many drivers the company needs |
| `desired_start_date` | TIMESTAMPTZ | |
| `constraints` | TEXT | Additional constraints from call notes |
| `missing_fields` | TEXT[] | Fields that could not be extracted from notes |
| `match_readiness` | TEXT | ready / incomplete / not_yet |
| `validation_questions` | TEXT | Questions to ask the company to fill gaps |
| `status` | TEXT | draft_created / incomplete / ready_for_review / approved_for_matching / rejected |
| `drafted_at` | TIMESTAMPTZ | |
| `approved_at` | TIMESTAMPTZ | |
| `approved_by` | TEXT | Recruiter identifier |
| `converted_need_id` | UUID | FK → company_needs (populated only after conversion) |
| `created_at` | TIMESTAMPTZ | |

**Why it should exist:** The firewall between a company conversation and a matching run. Without this table, the operator would have to create a `company_need` row directly — triggering matching immediately, possibly against misspecified requirements. The draft table absorbs the output of Agent E and holds it safely until the operator validates it.

**What it should NOT replace:** `company_needs` (the existing production table that triggers matching). These are fundamentally different: a draft is unvalidated intent; a need is an approved input to the matching engine.

---

### `b2b_agent_warnings`

**Purpose:** A queue of structured warnings surfaced by B2B agents to the cockpit — stale records, missed follow-ups, incomplete data, and high-opportunity targets that have not been actioned.

**Key fields:**

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `warning_type` | TEXT | stale_research / missed_followup / incomplete_barrier_notes / high_opp_unactioned / pool_too_small_for_draft |
| `severity` | TEXT | error / warning / reminder |
| `target_id` | UUID | FK → company_research_targets (nullable) |
| `relationship_id` | UUID | FK → pilot_company_relationships (nullable) |
| `draft_id` | UUID | FK → company_need_drafts (nullable) |
| `message` | TEXT | Human-readable warning description |
| `suggested_action` | TEXT | What the operator should do |
| `status` | TEXT | active / pending_review / completed |
| `created_at` | TIMESTAMPTZ | |
| `resolved_at` | TIMESTAMPTZ | |
| `resolved_by` | TEXT | Recruiter identifier |

**Why it should exist:** The cockpit needs a structured way to surface B2B warnings without polluting the existing `system_actions` table with non-agent events. This table is the B2B equivalent of `getSystemWarnings()` in `lib/warnings.ts`.

**What it should NOT replace:** `system_actions` (the driver-side audit log) or the existing warnings system. Both run in parallel. B2B warnings should appear in a dedicated B2B cockpit section, not mixed with `contact_suggested` and `follow_up_triggered` actions.

---

## 8. Risk Register

### 8.1 No active driver pool yet
**Risk:** DriverNord cannot promise delivery on any driver need created by a pilot company. If a company need is created and matching runs, the shortlist may be empty or contain only 1–2 drivers.
**Mitigation:** Do not create a `company_need` until the operator has confirmed the pool is large enough to produce a meaningful shortlist. Agent E must include a pool size check in its match readiness assessment. Never promise driver delivery timelines to a company before the pool is validated.

### 8.2 Overpromising to companies
**Risk:** An outreach draft that implies DriverNord has a ready driver pool, or a phone call that goes off-script and promises fill rates, will destroy the trust the pilot is trying to build.
**Mitigation:** Agent C enforces content constraints on every draft. Operator must review every message before sending. The pilot framing is always: "We build the shortlist; we do not guarantee placement; you decide who to contact."

### 8.3 Being mistaken for a staffing agency
**Risk:** Transport companies in Sweden default to categorizing any new driver-sourcing actor as a bemanning company. If that frame sticks, the conversation immediately shifts to price-per-hour, fill-rate guarantees, kollektivavtal, and insurance liability — none of which DriverNord can currently address.
**Mitigation:** Every outreach draft and phone opener must include the explicit distinction: "We do not employ drivers. We build the qualified shortlist. You own the relationship." Agent C must be instructed to always include this framing in its first-contact output.

### 8.4 GDPR / data processing questions
**Risk:** When a company sees a shortlist containing driver names and phone numbers, they become a data recipient. Under GDPR, this requires a Data Processor Agreement (DPA) between DriverNord and the company. Many Swedish companies will raise this in the first meeting.
**Mitigation:** Before any real PII is shared with a company, a simple DPA must be in place. For the initial pilot phase, share only anonymized or aggregated profiles (license, YKB, domain, availability — no name, no phone) until a DPA is signed. Agent E should flag DPA status as a required field in the company need draft process. The DPA template does not exist yet and must be prepared before the first real pilot shortlist is shared.

### 8.5 Low response rates
**Risk:** Cold outreach to Swedish transport SMEs has low response rates even with a good offer. If 10 companies are contacted and none reply, the temptation is to interpret this as product-market fit failure rather than outreach failure.
**Mitigation:** Track response rates per template, per channel, per segment. Agent D records every non-reply and the follow-up sequence. The B2B cockpit surfaces this data so the operator can iterate on templates rather than giving up on segments. Target: 2 replies from the first 10 outreach attempts (20% response rate is realistic for cold outreach in this category).

### 8.6 Wrong contact person
**Risk:** Emailing the general `info@company.se` or reaching an HR manager rather than the transport manager or owner means the message either never reaches the decision-maker or is interpreted as a vendor pitch to be routed to procurement.
**Mitigation:** Agent A must cite the specific source of every email address found. Agent B must score decision-maker access accurately. The operator must check `decision_maker_role` before approving an outreach draft — if the role is `HR_manager`, the draft should reflect a different approach.

### 8.7 Enterprise procurement traps
**Risk:** A company that looks like an SME from a job ad may have a formal vendor panel, a Visma procurement portal, or an exclusivity clause with a staffing agency — none of which is visible without deeper research.
**Mitigation:** Agent B checks for supplier pages and procurement signals explicitly. The barrier_notes field must document what was found and where. Gate 2 gives the operator the chance to adjust the barrier_level before outreach is drafted. If a procurement trap is discovered after outreach has started, Agent D should surface a "blocked" warning in the cockpit.

### 8.8 Creating company_needs too early
**Risk:** If a need is created in the database based on an exploratory conversation ("we might need drivers sometime"), the matching engine runs, a shortlist is created, and the contact agent may suggest contacting drivers for a company that has not committed to anything.
**Mitigation:** The `company_need_draft` table is the firewall. Agent E writes only to `company_need_drafts`. The operator must take an explicit manual action to convert a validated draft to a real `company_need`. This action should be presented in the cockpit as a high-consequence step with a confirmation dialog.

### 8.9 Outreach tone risk
**Risk:** Swedish transport SME owners respond to direct, brief, specific messages. A long marketing email, a message that opens with "as an AI-powered recruitment platform," or a message that sounds like it was written by a consultant will be ignored or actively rejected.
**Mitigation:** Template constraints in Agent C enforce brevity (5 sentences max), domain-specificity (reference the actual job ad, the specific license class, the specific domain), and plain language (no AI, no "solution", no "platform"). The operator reviews every draft before sending.

### 8.10 Operator overload
**Risk:** If 50 research targets are all enriched and scored simultaneously, the cockpit could surface 50 pending approvals at once. The operator stops reviewing them because the queue feels unmanageable.
**Mitigation:** Agent A processes companies in batches. Agent C generates outreach drafts in batches of 5, not all at once. The B2B cockpit displays a "today's priority" view of the 3 most actionable items, not the full queue. Warnings are prioritized (error > warning > reminder) and the most urgent items are surfaced first.

---

## 9. Implementation Order

Implementation should be strictly sequential. Do not start Step N+1 until Step N is usable and validated.

---

**Step 1 — Finalize B2B agent architecture document** *(this document)*

Confirm the 6 agents, 7 gates, 5 future tables, and phased implementation approach. Do not start any code until this document is reviewed and the approach is confirmed.

---

**Step 2 — Design future data model**

For each of the 5 proposed tables, write out the full SQL schema:
- Column names, types, constraints, default values
- Foreign key relationships (including which existing tables they reference)
- Index requirements for likely query patterns (status columns, FK lookups, date filters)
- What the migration should create vs. what will be populated by agents later

Output: `docs/business/b2b-data-model-v1.md`

---

**Step 3 — Create migration plan**

Write the migration files for the 5 new tables as idempotent SQL (matching the style of `migrations/001`–`007`). Do not apply migrations until the implementation plan is approved.

Output: `migrations/008_create_company_research_targets.sql` through `migrations/012_create_b2b_agent_warnings.sql`

---

**Step 4 — Implement read-only target registry**

Migrate the existing CSV data (50 companies, top-10 enrichment) into `company_research_targets`. Build a read-only B2B tab in the recruiter cockpit that shows all research targets with their status, score, and next action. No agents yet — just a database view of what already exists in the CSVs.

This is the foundation for everything that follows. Validate it works before adding agent logic.

---

**Step 5 — Implement scoring agent and outreach draft generation**

Add Agent B (barrier scoring) as a function that re-scores all targets from their research data. Add Agent C (outreach draft) as a function that generates a draft for any approved target and writes it to `company_outreach_actions`. Add the Gate 2 (score approval) and Gate 3 (draft approval) flows to the cockpit.

At this stage, no messages are ever sent automatically. The cockpit shows drafts for review, and the operator copies them manually.

---

**Step 6 — Implement cockpit B2B view**

Build the full B2B cockpit tab: pipeline view (counts by relationship status), pending approvals, warnings queue (from `b2b_agent_warnings`), follow-up reminders. Integrate Agent F (cockpit agent) as the data source for this view.

Add Gate 1 (research validation) and Gate 4 (relationship stage) UI actions to the cockpit.

---

**Step 7 — Implement company need draft flow**

Add Agent E (need draft) as a function that parses operator-entered call notes into a structured draft in `company_need_drafts`. Add Gate 5 (draft validation) and Gate 6 (need conversion) to the cockpit. The conversion action at Gate 6 is the only path from a draft to a real `company_need` row.

Test end-to-end: operator enters call notes → draft created → operator validates and fills missing fields → operator confirms conversion → `company_need` row created → matching runs → shortlist created → contact suggested in cockpit.

---

**Step 8 — Company self-service form (Phase 2 in roadmap)**

Only after the entire gated B2B pipeline has been validated through at least one real pilot should the company self-service intake form (`/company/kontakt` or `/company/behov`) be built. This form should not create a `company_need` directly — it should create a `company_need_draft` in status `draft_created` and surface an alert in the cockpit for the operator to validate.

See Phase 2 in `docs/current/roadmap-next-phases.md` for the full spec.

---

## 10. Final Recommendation

DriverNord should **not** implement all six B2B agents simultaneously. The full architecture is defined here so the implementation can be coherent — each step builds toward a complete system — but the phases below reflect the actual sequence that delivers value at each stage.

**Phase A — Research + Scoring + Cockpit visibility (implement now)**

Steps 1–4 of the implementation order. The immediate priority is getting the existing CSV research data into the database and making it visible in the cockpit. This alone enables the operator to work from a structured list rather than a spreadsheet, and creates the foundation for everything else.

Agents needed: partial Agent A (data migration from CSV), Agent B (scoring), Agent F (cockpit surface).
Time estimate: 3–5 days.

**Phase B — Outreach drafts (implement after first outreach batch)**

Step 5. Once the operator has sent the first 5–10 outreach emails manually and has a sense of what works, Agent C can draft the next batch. This ordering matters: the operator should know what a good outreach email looks like before delegating the drafting to an agent.

Agents needed: Agent C (outreach draft), Gate 2 and 3 flows.
Time estimate: 2–3 days.

**Phase C — Relationship tracking + need drafts (implement after first pilot reply)**

Steps 6–7. Once a company has replied and a conversation is underway, Agents D and E become relevant. Until that point, the relationship tracking is two rows in a spreadsheet and the need draft flow has no real input data to operate on.

Agents needed: Agent D (relationship), Agent E (need draft), Gates 4–6, cockpit B2B tab with relationship view.
Time estimate: 3–5 days.

**Phase D — Company self-service form (implement after first pilot is complete)**

Step 8. The form should only be built after the gated pipeline has been validated through at least one complete cycle: research → outreach → conversation → need draft → need approval → matching → pilot. Building the form before that validation risks building the wrong entry point.

Time estimate: 2–3 days (backend + UI, per Phase 2 in roadmap).

---

**The single most important constraint:**

No B2B agent sends anything, promises anything, or creates a `company_need` without human approval. The company side of DriverNord must remain human-governed at every gate that touches the real world. The agents accelerate and systematize; the operator decides.

---

## Appendix — Agent Summary Table

| Agent | Purpose | Writes to | Never writes to | Human gate |
|-------|---------|-----------|----------------|------------|
| A — Research | Enrich company targets from public sources | `company_research_targets` | `companies`, `company_needs` | Gate 1: confirm valid target |
| B — Scoring | Score pilot feasibility | `company_research_targets` (score fields) | `company_outreach_actions` | Gate 2: confirm score |
| C — Outreach Draft | Generate personalized Swedish outreach | `company_outreach_actions` | Any table that sends messages | Gate 3: approve draft |
| D — Relationship | Track B2B pipeline progression | `pilot_company_relationships`, `b2b_agent_warnings` | `company_needs` | Gate 4: classify interaction outcome |
| E — Need Draft | Convert call notes to structured need draft | `company_need_drafts` | `company_needs` | Gates 5 & 6: validate then convert |
| F — Cockpit | Surface B2B tasks and warnings | `b2b_agent_warnings` | Anything else | No gate — surfaces for human |
