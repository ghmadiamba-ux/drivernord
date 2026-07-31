# DriverNord — Human Approval and Risk Gates

**Date:** 2026-05-16
**Status:** Architecture document. No implementation. No live connections.
**Purpose:** Define where the human must remain in the loop, what level of approval is required, and why — providing the legal, ethical, and business rationale for each gate.

---

## Design Principle

DriverNord's agents are tools, not decision-makers. Every agent output that produces an external effect — a sent message, a published post, a charged invoice, a shared driver profile — requires an explicit human decision point before execution.

This is not timidity. It is the correct architecture for a service that:
1. Handles personal data of professional drivers under GDPR
2. Makes commercial commitments on behalf of a Swedish business
3. Operates in a trust-sensitive market where a single bad introduction destroys credibility
4. Has a single founder who is legally accountable for all actions

**The cost of an approval gate is a few seconds of the founder's time.**
**The cost of bypassing a gate incorrectly can be a GDPR fine, a lost client, a reputational incident, or a legal dispute.**

Gates are not bureaucracy. They are the founder's lever of control over an AI system operating in a legally and commercially sensitive environment.

---

## Gate Classification

| Gate level | Description | Response time required | Who approves |
|------------|-------------|----------------------|--------------|
| **HARD GATE** | System cannot proceed without human action. Cryptographically or architecturally enforced. | N/A (system waits indefinitely) | Founder or designated role |
| **APPROVAL QUEUE** | Agent produces output, places it in review queue. Human approves, edits, or rejects. | Within SLA (typically 24h) | Founder or recruiter |
| **ALERT AND INFORM** | Agent acts, but immediately notifies human. Human can reverse within a window. | Reversal within 1 hour | Founder |
| **LOG ONLY** | Agent acts autonomously. All actions logged. Human reviews in batch (weekly). | Batch review | Founder (periodic) |

---

## Gate Registry

### HARD GATES — Non-negotiable. Cannot be bypassed.

#### HG-01: GDPR Consent Capture

**What:** The driver must click "Jag samtycker" before any lead can be classified as `ready_for_ingestion`.
**Why:** GDPR Art. 7 requires affirmative, unambiguous consent. No agent or automation can simulate this action.
**Implementation:** Already enforced in `lib/applyStep.ts`. Consent step returns `invalid_answer` for any answer other than `'accepted'`.
**Risk of bypass:** Criminal liability under GDPR. Invalidates all downstream data processing.

#### HG-02: Driver Profile Introduction to Company

**What:** No driver profile data is shared with a company without recruiter/founder approval of the specific introduction.
**Why:** Consent scope is `driver_registration_matching_no_company_sharing_without_separate_consent`. This means even a GDPR-consented driver has not consented to profile sharing — that requires a separate per-introduction approval.
**Implementation:** Match Explanation Agent generates introduction draft. Recruiter approves in cockpit. Only approved introductions trigger Communication Agent to send.
**Risk of bypass:** GDPR Art. 5(1)(b) purpose limitation violation. Loss of driver trust.

#### HG-03: Production Deployment

**What:** No code is deployed to production without explicit founder authorization.
**Why:** Deployment is irreversible in practical terms. Bugs in production affect real drivers.
**Implementation:** Vercel deployment requires founder authentication.
**Risk of bypass:** Production incidents, data exposure, downtime.

#### HG-04: Meta Campaign Launch or Budget Change

**What:** No Meta campaign is created, modified, or launched without founder action in Meta Ads Manager.
**Why:** Advertising spend is a financial commitment. Incorrect targeting wastes budget and may violate ad policies.
**Implementation:** Claude Code never has access to Meta Ads Manager. Founder logs in and acts manually.
**Risk of bypass:** Financial loss, brand damage from off-policy ads.

#### HG-05: Invoice Sending

**What:** No invoice is sent to a company without founder review and confirmation in Fortnox.
**Why:** Invoices are legally binding financial documents. An incorrect invoice (wrong amount, wrong company, wrong VAT) creates legal and accounting complications.
**Implementation:** Invoice generation agent creates the invoice data and populates a Fortnox draft. Founder confirms in Fortnox UI before sending.
**Risk of bypass:** Accounting errors, client disputes, Swedish tax authority complications.

#### HG-06: Consent Text Modification

**What:** The consent version string and consent text cannot be changed without lawyer confirmation and deliberate deployment.
**Why:** Changing consent text retroactively affects the validity of all previously collected consent under that version.
**Implementation:** Consent version is hardcoded in `lib/applyStep.ts`. Changing it requires a deliberate code change, PR review, and authorized deployment.
**Risk of bypass:** All previously collected consent may be invalidated for the new consent version.

#### HG-07: Production Supabase Changes

**What:** No migration is applied to production Supabase without founder authorization.
**Why:** Schema changes in production can destroy data or break the live application.
**Implementation:** Migration scripts require authenticated Supabase access, which requires the founder's credentials.
**Risk of bypass:** Data loss, application downtime, irreversible schema corruption.

---

### APPROVAL QUEUE GATES — Agent proposes, human decides.

#### AQ-01: Outbound Communication (SMS and email to drivers)

**What:** Any SMS or email sent to a driver (beyond the registration confirmation automation) requires recruiter approval.
**Why:** Communication with drivers is the primary trust relationship. A poorly worded message — or a message at the wrong time — damages trust and may violate communication consent.
**SLA:** Within 24 hours for standard follow-up; within 1 hour for urgent introduction.
**Agent role:** Communication Agent drafts the message. Recruiter sees draft in cockpit queue.
**Approval flow:** Cockpit → pending_actions → approve/edit/reject → if approved, 46elks or Resend sends.

#### AQ-02: Company Outreach (any first contact)

**What:** Any first contact with a potential client company requires founder approval of both the contact and the message.
**Why:** Cold outreach represents DriverNord in the market. A poor first impression is impossible to reverse. No outreach before drivers exist.
**SLA:** Founder decides timing — no SLA pressure.
**Agent role:** Demand Intelligence Agent prepares the company research package and draft message. Founder reviews and decides whether to send.
**Hard prerequisite:** Driver database must have ≥5 qualified drivers before any company outreach.

#### AQ-03: Content Publishing (Facebook, Instagram)

**What:** All organic post content requires founder review and explicit approval before publishing.
**Why:** Public brand content is permanent. Compliance violations (false claims, staffing language) once published may be screenshot and shared even after deletion.

**Phase 1 (MVP):** Founder reviews draft in the approval queue and manually publishes in Meta Business Suite. Publishing is always a manual founder action.

**Phase 2 (Hybrid — approval-queue-gated scheduled publishing):** After founder approves a post in the cockpit approval queue, the system uses the Meta Graph API to publish the post at a founder-specified scheduled time. The approval gate is permanent and unchanged — what changes is that post-approval publishing is automated rather than requiring the founder to open Meta Business Suite separately. The founder sets the publish time at the point of approval.

**What does NOT change:** No post is ever published without explicit founder approval. The approval queue gate (AQ-03) is a hard requirement in all phases. "Hybrid" here means the approval-to-publish step becomes automated, not that AI approves or initiates publishing.

**SLA:** Founder reviews according to organic content schedule (typically 2–3 times/week).
**Agent role (Phase 1):** Creative Agent generates draft → places in approval queue → founder reviews, edits if needed, and posts manually.
**Agent role (Phase 2):** Creative Agent generates draft → Orchestrator Agent routes to approval queue → founder approves and sets publish time → system schedules post via Meta Graph API.

#### AQ-04: Ad Creative Upload

**What:** All ad creatives (copy + visual) require founder review and approval before uploading to Meta Ads Manager.
**Why:** Ads reach paid audiences immediately and incur cost. Off-brand or non-compliant ads may be rejected by Meta and damage the ad account quality score.
**SLA:** Before campaign launch.
**Agent role:** Creative Agent generates copy variants. Founder selects, combines with visual, and uploads manually.

#### AQ-05: Company Introduction Text (to client companies)

**What:** The Match Explanation Agent drafts the introduction of a driver (or drivers) to a company. Recruiter must approve the text before it is sent.
**Why:** This is the product DriverNord sells. The quality and accuracy of the introduction is the core value delivery. An error here is not a bug — it is a product failure.
**SLA:** Within 4 hours of shortlist creation (client expectation management).
**Agent role:** Match Explanation Agent generates the draft introduction immediately after shortlist creation.

#### AQ-06: Driver Notification (match found)

**What:** When a match is proposed, the driver is notified and asked if they want to proceed. The notification draft requires recruiter approval.
**Why:** The driver's consent for introduction is separate from their registration consent. Getting this wrong creates a trust and legal problem.
**SLA:** Same as AQ-05 — within 4 hours.

#### AQ-07: Service Agreement Sending

**What:** Any service agreement sent to a client company requires founder review and signature of the draft.
**Why:** Service agreements are binding legal contracts. An incorrect or unsigned agreement creates commercial exposure.
**SLA:** Before any introduction delivery.
**Agent role:** AI generates draft agreement from template. Founder reviews; lawyer reviews if terms differ from standard. Founder sends signed version.

---

### ALERT AND INFORM GATES — Agent acts, human is immediately notified.

#### AI-01: SMS Confirmation on Driver Registration

**What:** When a driver reaches `ready_for_ingestion`, an SMS confirmation is sent automatically (when 46elks is configured).
**Why:** This is a low-risk, expected communication. The driver just registered — they expect confirmation.
**Notification:** Founder receives a summary (daily digest or real-time alert for HIGH priority drivers).
**Reversal window:** 1 hour — if the SMS is incorrect, the founder can send a correction. Practical reversal is nearly impossible, so system prompt must be accurate.

#### AI-02: HIGH Priority Driver Alert (internal)

**What:** When a HIGH priority driver is ingested, an immediate internal alert is sent to the founder/recruiter.
**Why:** HIGH priority drivers (CE + valid YKB + now + Stockholm) represent the most valuable supply. They should be matched to company needs as fast as possible.
**Channel:** Email or Slack notification to founder.

#### AI-03: Anomaly Detection Alert (Performance Agent)

**What:** When the Performance Agent detects a statistical anomaly (zero registrations for 48h, disqualification rate >30%), it sends an alert.
**Why:** Early detection of pipeline problems prevents silent failures.
**Channel:** Email to founder.
**Reversal:** The alert is informational. The founder investigates and decides.

#### AI-04: Company Need Expiry Alert

**What:** When an open company need is approaching 30 days without a filled introduction, the system alerts the recruiter.
**Why:** Stale unfulfilled needs damage client relationships.
**Channel:** Cockpit notification + email.

---

### LOG ONLY — Agent acts autonomously, all actions audited.

#### LO-01: STOPP SMS Opt-out Processing

**What:** When a driver sends "STOPP" via SMS (or any recognized opt-out keyword), the system immediately marks them as opted-out and blocks future SMS.
**Why:** STOPP handling is legally required under Swedish electronic communication law (EkomL). It must be instant and fully automatic — no human should need to approve an opt-out.
**Log:** Opt-out event logged to `system_actions`.
**Review:** Founder reviews opt-out log in weekly report.

#### LO-02: FAQ Auto-Response (Communication Agent)

**What:** Communication Agent sends auto-responses to clearly identified low-risk FAQ queries (intent confidence ≥ 0.85, non-sensitive topic).
**Why:** Low-risk FAQ responses do not require founder attention. Auto-response improves support speed.
**Log:** Every auto-response logged with: intent classification, confidence score, message sent, timestamp.
**Review:** Founder reviews communication log weekly. Can disable FAQ auto-response at any time.

#### LO-03: Lead Follow-up Scheduling (computeFollowUp)

**What:** When a driver is ingested, `computeFollowUp` sets `follow_up_at` automatically based on availability.
**Why:** Scheduling logic is deterministic and has no external effect. The follow-up itself requires approval (AQ-01).
**Log:** Already logged via existing system.

#### LO-04: Performance Metrics Snapshot (daily)

**What:** Performance Agent takes a daily snapshot of pipeline metrics and writes to `agent_outputs` table.
**Why:** No external effect. Pure data capture for reporting.
**Log:** All snapshots timestamped.

---

## Risk Register by Gate Level

| Risk | Gate | Severity | Current mitigation |
|------|------|----------|-------------------|
| Driver data shared without per-introduction consent | HG-02, AQ-05 | CRITICAL | Approval queue enforced in cockpit |
| SMS sent to opted-out driver | LO-01 | HIGH | STOPP automation is immediate |
| Invoice sent with wrong amount or to wrong company | HG-05 | HIGH | Fortnox draft requires founder confirmation |
| Ad campaign launched with false claims | HG-04, AQ-04 | HIGH | Founder manual launch; brand rules in agent system prompt |
| Company outreach before supply exists | AQ-02 | MEDIUM | Prerequisite: ≥5 drivers in database |
| GDPR deletion request not actioned within 30 days | AQ (manual) | HIGH | Alert + founder SLA tracking |
| Agent auto-responds to a legal or complaint topic | AQ-01 | HIGH | Hard classification: complaint → always human |
| Consent text changed without lawyer review | HG-06 | HIGH | Hardcoded version string requires code change + deployment |

---

## Founder Dashboard: Active Gates at Launch

These are the gates the founder will actively interact with at the time of the first real campaign:

| Gate | Frequency | Estimated time |
|------|-----------|---------------|
| Review and approve organic content (AQ-03) | 2–3 times/week | 5 min each |
| Review HIGH priority driver alerts (AI-02) | As needed | 2 min each |
| Review weekly pipeline report (Performance Agent) | Weekly | 10 min |
| Approve driver introduction drafts (AQ-05, AQ-06) | Per introduction | 15 min each |
| Review and approve outbound company contact (AQ-02) | Per outreach | 20 min each |

**Total estimated founder attention on agent outputs at launch:** Under 2 hours per week.

---

*Version 1.1 — 2026-05-16 — AQ-03 updated to reflect Phase 1 (manual publish) → Phase 2 (approval-queue-gated scheduled publishing via Meta Graph API) evolution. Approval gate remains permanent in all phases.*
