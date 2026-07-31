# DriverNord — Automation vs. Agent Map

**Date:** 2026-05-16
**Purpose:** Classify every pipeline area into the correct execution type. Determines where to invest in agents vs. where simpler automation is faster, cheaper, and more reliable.
**Scope:** Architecture analysis only. No implementation. No live connections.

---

## Classification Key

| Type | Definition | When to use |
|------|-----------|-------------|
| **AUTOMATION** | Deterministic rules, no LLM. Triggered by events or schedules. Predictable output. | When the logic is fully defined, inputs are structured, and failure modes are known. |
| **AI AGENT** | LLM-powered. Handles ambiguity, generates content, extracts structure from unstructured data, or makes judgment calls within defined boundaries. | When inputs vary, outputs cannot be templated, or domain knowledge is required to process inputs. |
| **HYBRID** | AI generates or proposes, automation validates and routes, human approves or rejects at gates. | When AI adds value but reliability or legal exposure requires a rule layer or human gate. |
| **HUMAN-ONLY** | No automation or AI. Requires authenticated human decision or action. | Legal consent, financial authorization, production deployments, any action with irreversible consequences. |

---

## Complete Pipeline Map

### 1. Driver Acquisition

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Meta ad copy generation | **HYBRID** | AI generates multiple variants. Founder selects and approves before any spend. |
| Meta campaign targeting specs | **HYBRID** | AI proposes audience segments based on driver profile data. Founder authorizes campaign. |
| UTM link construction | **AUTOMATION** | Deterministic string construction. No LLM needed. |
| Organic content drafting | **HYBRID** | AI drafts posts from angle library. Founder reviews and publishes. |
| Posting organic content | **HUMAN-ONLY** | Publishing to public channels is an irreversible brand action. Founder publishes. |
| Campaign performance analysis | **AI AGENT** | AI reads exported performance data, identifies winning angles, flags fatigue. |
| A/B angle recommendation | **HYBRID** | AI recommends next test based on performance. Founder authorizes budget reallocation. |
| Competitor monitoring | **AI AGENT** | AI scans public competitor pages and job boards for market signals. |

**Risks:** Incorrect targeting burns budget. Brand inconsistency in AI-generated copy. Must not claim scale or verification that does not exist.

---

### 2. Driver Qualification (Chat Intake)

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Chat step routing (`getNextStep`) | **AUTOMATION** | Pure deterministic FSM. No LLM needed or wanted. |
| Answer validation (`applyStep`) | **AUTOMATION** | Validates against typed enums. Deterministic. |
| License disqualification routing | **AUTOMATION** | `license=none` → disqualified. Pure rule. |
| Lead status classification (`classifyStatus`) | **AUTOMATION** | Rules-based from lead fields. Already implemented. |
| Lead priority classification (`classifyPriority`) | **AUTOMATION** | Rules-based. Already implemented. |
| Driver scoring (`scoreDriver`) | **AUTOMATION** | Point-based formula. Already implemented. |
| Consent step enforcement | **AUTOMATION + HUMAN-ONLY** | Code enforces consent as hard gate. Driver must actively click. No LLM involved. |
| Follow-up scheduling (`computeFollowUp`) | **AUTOMATION** | Rule-based date computation. Already implemented. |

**Key principle:** The entire qualification pipeline should remain deterministic. Adding an LLM to classify or score drivers introduces inconsistency and auditability problems. AI belongs upstream (acquisition) and downstream (matching explanation), not in the rules layer.

---

### 3. Driver Database Enrichment

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Self-reported profile completeness check | **AUTOMATION** | Check which fields are null. Trigger follow-up if below threshold. |
| Public LinkedIn data extraction | **AI AGENT** | LLM parses unstructured LinkedIn profiles into structured fields (license, YKB, experience). Only with consent. |
| Phone number normalization | **AUTOMATION** | E.164 format standardization. Pure regex. |
| Driver deduplication check | **AUTOMATION** | Match on normalized phone. Deterministic. |
| YKB expiry monitoring | **AUTOMATION** | Cron checks `ykb_expiry_date`. Sends reminder at 90/30/7 days. |
| Experience gap detection | **AI AGENT** | Reads self-reported data and flags inconsistencies or missing high-value fields for follow-up. |
| Enrichment from public transport registries | **AI AGENT** | Scrapes/queries public Swedish transport authority data where legally accessible. |

**Risks:** Enrichment from third-party sources must be disclosed in privacy policy. LinkedIn scraping may violate ToS — consult legal before activating. Any enrichment beyond self-reported data requires legal review.

---

### 4. Consent and GDPR Handling

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Affirmative consent capture | **AUTOMATION** | Hard gate in code. Driver must click. No AI. Already implemented. |
| Consent version management | **AUTOMATION** | Version string stored deterministically. Already implemented. |
| Consent field storage | **AUTOMATION** | Deterministic write to `consent_registration_at`, `consent_registration_version`, `consent_scope`. |
| GDPR deletion requests | **HUMAN-ONLY** | Founder reviews deletion requests. AI may prepare the deletion checklist. Execution is manual or semi-automated with human authorization. |
| GDPR data export requests | **HYBRID** | AI generates the export package. Human confirms before sending. |
| Privacy policy updates | **HUMAN-ONLY** | Lawyer reviews and approves. Founder publishes. No AI autonomy. |
| Consent text updates | **HUMAN-ONLY** | Lawyer confirms consent language. Founder updates version string. |
| Consent withdrawal (opt-out) | **HYBRID** | Automation marks lead as opted-out. Human reviews and confirms data deletion scope. |

**Key principle:** Consent and GDPR are the one area where AI must never take autonomous action that affects data subject rights. Human in the loop is non-negotiable.

---

### 5. SMS and Email Communication

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Registration confirmation SMS | **AUTOMATION** | Fixed template. Triggered immediately on `ready_for_ingestion`. |
| Follow-up SMS (available soon) | **AUTOMATION** | Template with driver name. Triggered by cron at `follow_up_at`. |
| Follow-up SMS (availability check) | **HYBRID** | AI personalizes template based on driver profile. Automation sends. Human can override. |
| High-priority driver notification (internal) | **AUTOMATION** | Alert to recruiter when HIGH priority driver registers. Fixed template. |
| Company shortlist introduction email | **HYBRID** | AI drafts the introduction email for each specific driver-company pair. Human approves before sending. |
| Inbound SMS reply handling | **AI AGENT** | AI reads driver replies, classifies intent, updates profile or flags for human review. |
| Inbound email reply handling | **AI AGENT** | Same as SMS — classify intent, extract structured data, route appropriately. |
| GDPR opt-out handling from SMS | **AUTOMATION** | STOPP keyword detection → immediate opt-out → block future sends. |
| Bounce and delivery monitoring | **AUTOMATION** | 46elks webhooks update delivery status in Supabase. |

**Risks:** Sending SMS requires 46elks to be configured (currently not active). AI-generated personalized SMS risks tone errors — keep personalization conservative until validated.

---

### 6. Support / Customer Success

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Common FAQ responses (driver-side) | **AI AGENT** | Handles "how does it work?", "how do I delete my data?", "when will I be contacted?" queries. |
| Common FAQ responses (company-side) | **AI AGENT** | Handles "what does the package include?", "how quickly can you deliver?". |
| Escalation to founder | **HYBRID** | AI attempts response. If confidence low or topic sensitive, routes to founder. |
| Driver complaint handling | **HUMAN-ONLY** | Any complaint that involves data, consent, or service quality goes to founder. |
| Company complaint handling | **HUMAN-ONLY** | Same. Legal and commercial sensitivity requires human. |
| Inbound email triage (`hej@drivernord.se`) | **AI AGENT** | AI reads incoming emails, classifies type, drafts response or routes to appropriate queue. |
| GDPR rights requests | **HUMAN-ONLY** | Must be handled by a responsible human within 30-day SLA. |

---

### 7. Social Media and Organic Content

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Content angle research | **AI AGENT** | AI researches what resonates with CE drivers on Swedish social platforms. |
| Post copy drafting | **AI AGENT** | AI generates Facebook/Instagram post variants from angle library. |
| Post scheduling | **HUMAN-ONLY (MVP) → HYBRID (Phase 2)** | MVP: Founder reviews draft and manually publishes in Meta Business Suite. Phase 2: Founder approves draft in cockpit approval queue → system schedules and publishes via Meta Graph API at a specified time. The approval gate remains permanent; what changes is that post-approval publishing becomes automated rather than manual. |
| Performance data collection | **AUTOMATION** | Export from Meta Insights or manual import. |
| Performance analysis | **AI AGENT** | AI identifies winning angles, flags declining CTR, recommends next tests. |
| Community management (reply to comments) | **HYBRID** | AI drafts reply. Founder approves or edits before posting. Never autonomous. |
| Hashtag and SEO research | **AI AGENT** | Research task. Pure analysis. No external action. |

---

### 8. Meta / Facebook / Instagram Advertising

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Ad copy generation | **AI AGENT** | Claude generates headline + body + CTA variants from winning organic angles. |
| Audience targeting research | **AI AGENT** | AI recommends audience parameters based on driver profile data and Meta documentation. |
| Campaign structure design | **HYBRID** | AI proposes campaign/ad set/ad hierarchy. Founder approves before creating in Ads Manager. |
| Budget allocation | **HUMAN-ONLY** | Financial decision. Founder sets and controls budgets. |
| Campaign launch | **HUMAN-ONLY** | Founder creates and launches in Meta Ads Manager. Never autonomous. |
| Performance monitoring | **AUTOMATION** | Pixel + CAPI events stream performance data. (Env-gated, pending production rollout.) |
| Performance analysis | **AI AGENT** | AI reads exported performance CSVs, identifies cost-per-lead trends, flags underperformers. |
| Creative fatigue detection | **AI AGENT** | AI monitors frequency + CTR decline. Recommends creative refresh. |
| Budget pause recommendation | **HYBRID** | AI recommends pausing based on cost-per-result threshold. Founder authorizes. |
| Reporting to founder | **AUTOMATION** | Weekly summary report generated from Supabase + Meta data. |

---

### 9. Creative Strategy

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Angle ideation | **AI AGENT** | Research + generation task. No external action. |
| Copy variant generation | **AI AGENT** | Generates 5–10 variants per angle. |
| Creative bank maintenance | **AUTOMATION** | Structured file management. Update on schedule or trigger. |
| Visual brief writing | **AI AGENT** | Writes Canva brief describing required image/video content. |
| Visual production | **HUMAN-ONLY** | Founder produces in Canva/CapCut. No autonomous image generation for ad use. |
| Creative performance retrospective | **AI AGENT** | Monthly analysis of which creative types, angles, and formats perform best. |
| Creative strategy update | **HYBRID** | AI drafts updated strategy. Founder approves direction before next campaign cycle. |

---

### 10. Company Demand Research

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Public job posting monitoring | **AI AGENT** | Scrapes/monitors Swedish job boards (Arbetsförmedlingen, Jobtech, Blocket Jobb) for CE driver postings. Signals active company demand. |
| Company profile research | **AI AGENT** | Researches target transport companies using public data (Bolagsverket, Ratsit, company websites). |
| Demand signal scoring | **HYBRID** | AI scores company demand urgency. Human validates before cold outreach. |
| Industry news monitoring | **AI AGENT** | Monitors Transport Gruppen, branschnytt, and relevant publications for market signals. |
| Competitor intelligence | **AI AGENT** | Monitors competitor pricing, positioning, and activity. |

**Critical rule:** Research is fully autonomous. Outreach is always human-authorized. AI finds and prepares. Human decides if and when to contact.

---

### 11. Company Need Detection and Intake

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Inbound need submission (API) | **AUTOMATION** | Already implemented. Authenticated POST creates need + triggers matching. |
| Need field validation | **AUTOMATION** | Type-safe schema validation. Deterministic. |
| Need status tracking | **AUTOMATION** | State machine: open → matched → delivered → closed. |
| Proactive need detection from research | **HYBRID** | AI identifies likely-need companies from demand research. Founder approves outreach before contact. |
| Company self-service intake form | **AUTOMATION** | Future: web form → Supabase → matching trigger. Not yet built. |
| Need expiry monitoring | **AUTOMATION** | Cron checks for stale open needs (>30 days). Alerts recruiter. |

---

### 12. Driver-Company Matching

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Shortlist generation (`buildShortlist`) | **AUTOMATION** | Hard filters + rank sort. Already implemented. Deterministic. Must stay deterministic. |
| Hard filter enforcement (YKB, driver card) | **AUTOMATION** | Binary rules. No LLM. |
| Score-based ranking | **AUTOMATION** | Point formula. Already implemented. |
| Match explanation generation | **AI AGENT** | AI writes a natural language explanation of why this driver matches this need. Used in recruiter cockpit and company-facing materials. |
| Shortlist presentation to recruiter | **AUTOMATION** | Already implemented in `/recruiter` cockpit. |
| Introduction draft (to company) | **AI AGENT** | AI drafts the driver introduction text for the company. Recruiter reviews and approves. |
| Driver consent verification before introduction | **AUTOMATION** | Checks `consent_scope` field. Hard gate. No LLM. |
| Matching result audit log | **AUTOMATION** | All match decisions logged to `system_actions`. Already implemented. |

**Key principle:** Matching mechanics must remain deterministic and auditable. AI adds value in explanation and presentation, not in the core filter/rank logic.

---

### 13. Reporting and Dashboards

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Driver pipeline metrics | **AUTOMATION** | Queries from Supabase. Counts by status, priority, region. |
| Conversion funnel (steps → ingested → shortlisted) | **AUTOMATION** | SQL aggregates. No LLM needed. |
| Weekly email summary to founder | **HYBRID** | Auto-generated data + AI-written narrative summary. Sent on schedule. |
| Campaign performance dashboard | **AUTOMATION** | Pull from Meta Insights export + Supabase UTM data. |
| Revenue pipeline tracking | **AUTOMATION** | Open needs + shortlisted drivers = potential revenue. Rule-based. |
| Anomaly detection (drop in registrations, spike in disqualifications) | **AI AGENT** | AI identifies statistically significant deviations and flags with likely cause. |
| Monthly board-level summary | **HYBRID** | AI generates draft. Founder reviews before sharing. |

---

### 14. Operator / Founder Cockpit

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Shortlist review and approval | **HUMAN-ONLY** | Already implemented. Human gate on all contact actions. |
| Action approval (contact, follow-up) | **HUMAN-ONLY** | Already implemented. System_actions queue. |
| Need creation | **HUMAN-ONLY** | Currently recruiter-only API. |
| Driver data editing | **HUMAN-ONLY** | No AI edits driver records directly. |
| System health monitoring | **AUTOMATION** | Sentry + Vercel logs + Supabase monitoring. Alerts on errors. |
| Cockpit AI assistant | **AI AGENT** | Founder asks natural language questions: "How many HIGH priority CE drivers registered this week?" AI queries Supabase and responds. |
| Configuration changes | **HUMAN-ONLY** | AGENT_CONTACT_MODE, thresholds, etc. Human-set only. |

---

### 15. Legal-Sensitive Workflows

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Service agreement generation | **HYBRID** | AI drafts based on template. Lawyer reviews. Founder signs. |
| DPA generation | **HYBRID** | AI drafts based on template. Lawyer reviews. Founder signs. |
| Privacy policy updates | **HUMAN-ONLY** | Lawyer must confirm. No AI publishing. |
| Consent text versioning | **HUMAN-ONLY** | Lawyer must confirm text. Code update requires production deployment authorization. |
| GDPR rights request handling | **HUMAN-ONLY** | Founder must personally handle. 30-day SLA. |
| Invoice dispute handling | **HUMAN-ONLY** | Commercial dispute. Founder manages. |
| Regulatory compliance monitoring | **AI AGENT** | AI monitors Integritetsskyddsmyndigheten (IMY) publications and EU AI Act updates for relevant changes. Flags to founder. |

---

### 16. Finance and Invoicing

| Sub-area | Type | Rationale |
|----------|------|-----------|
| Invoice generation | **HYBRID** | AI generates invoice draft from need + delivery data. Founder reviews and authorizes sending. |
| Invoice sending | **HUMAN-ONLY** | Founder authorizes each invoice. Never autonomous. |
| Payment tracking | **AUTOMATION** | Fortnox integration monitors payment status. Alerts on overdue. |
| Revenue reconciliation | **AUTOMATION** | Match invoices to needs delivered. Rule-based. |
| Tax calculation | **HUMAN-ONLY** | Accountant or Fortnox-assisted. Founder finalizes. |
| Fortnox integration | **AUTOMATION** | API integration: push invoice data to Fortnox on founder confirmation. |

---

## Summary Matrix

| Area | Type | Build Now | Build Later |
|------|------|-----------|-------------|
| Driver acquisition (ads, organic) | HYBRID | Content drafting AI | Campaign management AI |
| Driver qualification (chat) | AUTOMATION | Already built | Keep as-is |
| Driver database enrichment | HYBRID | Completeness check | LinkedIn enrichment (after legal review) |
| Consent and GDPR | AUTOMATION + HUMAN | Already built | GDPR request handling flow |
| SMS and email | HYBRID | Templated sends (after 46elks setup) | Personalized AI follow-up |
| Support | AI AGENT | FAQ agent for `hej@` inbox | Full support ticket system |
| Social media | HYBRID | Content drafting (Phase 1 manual publish) | Phase 2: approval-queue-gated scheduled publishing via Meta Graph API |
| Meta advertising | HYBRID | Performance analysis | Campaign structure AI |
| Creative strategy | AI AGENT | Copy generation | Full creative strategy agent |
| Company demand research | AI AGENT | Job board monitoring | Multi-source demand intelligence |
| Company need detection | HYBRID | Inbound automation (already built) | Proactive detection |
| Matching | AUTOMATION + AI | Match explanation (AI) | Already built otherwise |
| Reporting | AUTOMATION + AI | Weekly summary | Anomaly detection |
| Founder cockpit | HUMAN + AI | Cockpit AI assistant | Full dashboard |
| Legal workflows | HUMAN + HYBRID | Document drafting | Compliance monitoring |
| Finance | HYBRID | Invoice generation | Payment automation |

---

*Version 1.1 — 2026-05-16 — Social media scheduling updated to HUMAN-ONLY (MVP) → HYBRID (Phase 2) with approval queue and delayed publishing.*
