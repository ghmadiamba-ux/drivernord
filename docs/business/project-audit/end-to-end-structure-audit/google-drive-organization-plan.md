# Google Drive Organization Plan

**Audit date:** 2026-05-16
**Purpose:** Define the Google Drive folder structure for DriverNord business documents, separating cloud-stored operational files from the code repository's documentation

---

## Principle: Two Separate Systems

The DriverNord project uses two distinct documentation systems:

| System | Location | Purpose |
|--------|----------|---------|
| **Git repository** (`docs/`) | `agent-1/docs/` | Technical documentation, architecture specs, audit reports, agent designs — everything that Claude Code reads and writes |
| **Google Drive** | `DriverNord/` root folder | Operational business documents, legal files awaiting review, financial records, founder-facing checklists, external communications |

**Rule:** Sensitive documents (contracts, signed DPAs, invoices, personal data) go in Google Drive only. They must never be committed to the git repository. Technical specs and agent designs go in git only — they do not need to be in Drive.

---

## Proposed Google Drive Folder Structure

```
DriverNord/
├── 01-Legal/
│   ├── 01-Drafted-Templates/
│   │   ├── DPA-template-v1.md               ← from repo (copy for lawyer)
│   │   ├── service-agreement-v1.md           ← from repo (copy for lawyer)
│   │   ├── driver-consent-language-v1.md     ← from repo (copy for lawyer)
│   │   └── privacy-policy-draft.md           ← from repo (copy for lawyer)
│   ├── 02-Lawyer-Review/
│   │   ├── legal-review-brief-for-lawyer.md  ← SEND THIS to lawyer
│   │   ├── [lawyer-feedback-round-1].pdf     ← received from lawyer
│   │   └── [lawyer-revised-DPA-v2].pdf       ← lawyer's revised version
│   ├── 03-Executed-Agreements/
│   │   ├── [Company-Name]-DPA-signed.pdf     ← signed DPA per client
│   │   ├── supabase-DPA-signed.pdf           ← data processor DPA
│   │   └── vercel-DPA-signed.pdf             ← data processor DPA
│   ├── 04-Regulatory/
│   │   ├── IMY-correspondence/               ← if any contact with regulator
│   │   └── GDPR-deletion-requests/           ← log of deletion requests received
│   └── 05-Compliance-Records/
│       ├── consent-version-log.md            ← track consent version changes
│       └── data-retention-schedule.md        ← once defined
│
├── 02-Finance/
│   ├── 01-Invoices-Sent/
│   │   └── [YYYY-MM]-[Company]-invoice.pdf   ← per client invoice
│   ├── 02-Invoices-Received/
│   │   ├── 46elks-invoices/
│   │   ├── vercel-invoices/
│   │   └── supabase-invoices/
│   ├── 03-Revenue-Tracking/
│   │   └── revenue-log.md                    ← date, client, amount, package
│   └── 04-Tax/
│       └── [annual-summary-YYYY].pdf
│
├── 03-Clients/
│   ├── 00-Pipeline/
│   │   └── company-outreach-tracker.md       ← which companies contacted, status
│   └── [Company-Name]/                       ← one folder per client
│       ├── DPA-signed.pdf
│       ├── service-agreement-signed.pdf
│       ├── needs-brief.md                    ← what they're looking for
│       ├── shortlist-[date].md               ← drivers presented
│       └── outcome-log.md                    ← hired/not hired, feedback
│
├── 04-Drivers/
│   ├── 00-Overview/
│   │   └── supply-summary.md                 ← weekly summary of DB state (no PII)
│   └── NOTE.md                               ← "Driver PII is only in Supabase. No driver personal data in Drive."
│
├── 05-Marketing/
│   ├── 01-Brand/
│   │   ├── logo-files/                       ← SVG, PNG variants
│   │   ├── color-palette.md
│   │   └── brand-guidelines.md
│   ├── 02-Creative-Bank/
│   │   ├── approved/                         ← approved posts ready to publish
│   │   │   └── [YYYY-MM-DD]--[channel]--[angle]--[version]--APPROVED.md
│   │   ├── draft/                            ← generated, pending founder review
│   │   │   └── [YYYY-MM-DD]--[channel]--[angle]--[version]--DRAFT.md
│   │   └── archive/                          ← published or rejected posts
│   ├── 03-Ad-Assets/
│   │   ├── images/                           ← ad images (1200x628, 1080x1080)
│   │   ├── videos/                           ← Reels, video ads
│   │   └── ad-copy-variants/                 ← A/B test copy variants
│   ├── 04-Performance-Data/
│   │   ├── meta-insights-exports/            ← weekly CSV exports from Meta
│   │   └── performance-log.md                ← angle scoring, weekly updates
│   └── 05-Campaign-Briefs/
│       └── [YYYY-MM]-campaign-brief.md       ← per paid campaign
│
├── 06-Operations/
│   ├── 01-Founder-Checklists/
│   │   ├── facebook-page-setup-checklist.md  ← from repo (operational copy)
│   │   ├── domain-events-manager-checklist.md
│   │   ├── migration-013-production-steps.md
│   │   └── 46elks-setup-steps.md
│   ├── 02-Vendor-Credentials/
│   │   └── NOTE.md                           ← "Credentials in password manager only. Never in Drive."
│   ├── 03-Meeting-Notes/
│   │   └── [YYYY-MM-DD]-[topic].md
│   └── 04-Decision-Log/
│       └── decisions.md                      ← key decisions with date and rationale
│
├── 07-Research/
│   ├── 01-Market-Research/
│   │   └── [symlinked from repo or copied]
│   ├── 02-Competitor-Analysis/
│   └── 03-Driver-Interviews/                 ← if any qualitative interviews conducted
│
└── 00-Index/
    └── README.md                             ← master index of what's in Drive
```

---

## File Naming Conventions

### Legal documents
```
[DocumentType]-[Version]-[Status]-[YYYY-MM-DD].pdf
Examples:
  DPA-template-v1-DRAFT-2026-05-14.md
  DPA-[CompanyName]-v2-SIGNED-2026-06-01.pdf
  service-agreement-v1-LAWYER-REVIEWED-2026-06-15.pdf
```

### Creative bank files
```
[YYYY-MM-DD]--[channel]--[angle-id]--[version]--[STATUS].md
Examples:
  2026-05-20--facebook-page--angle01-frustration--v1--DRAFT.md
  2026-05-21--facebook-page--angle01-frustration--v1--APPROVED.md
  2026-05-22--facebook-page--angle01-frustration--v1--PUBLISHED.md
```

### Finance documents
```
[YYYY-MM]-[CompanyName]-invoice-[001].pdf
```

---

## Access Control Principles

| Folder | Access |
|--------|--------|
| `01-Legal/03-Executed-Agreements/` | Founder only (share with lawyer as needed) |
| `01-Legal/04-Regulatory/05-Compliance-Records/` | Founder only |
| `02-Finance/` | Founder only |
| `03-Clients/[Company-Name]/` | Founder only (share individual folder with client contact as needed) |
| `04-Drivers/` | Founder only. No PII. |
| `05-Marketing/01-Brand/` | Can be shared with freelance designers |
| `05-Marketing/02-Creative-Bank/` | Founder only (agent outputs reviewed here) |
| `07-Research/` | Founder only |

**Rule:** Google Drive is not shared externally except for specific subfolders and on a per-collaboration basis.

---

## What Goes in Git vs. Drive

### In Git repository (`docs/`) — NOT in Drive

- Architecture specs
- Agent specifications and implementation plans
- Audit reports (like this one)
- Code documentation
- Database schema documentation
- API route documentation
- Agentic OS design documents
- Test plans
- Technical readiness assessments

### In Drive — NOT in Git

- Signed legal documents (PDFs)
- Personal correspondence with clients
- Financial records and invoices
- Driver interview notes (PII risk)
- Lawyer feedback documents
- Brand assets (logo files, ad images)
- Performance data CSV exports
- Meeting notes
- Credentials references (but not credentials themselves)

### In Both (copies for different purposes)

- Draft legal templates (git = source of truth for Claude Code; Drive = copy sent to lawyer)
- Founder-facing checklists (git = maintained by Claude Code; Drive = founder's working copy)
- Creative bank content (git has the angle library spec; Drive has the actual generated posts)

---

## Immediate Setup Steps (Founder)

These Google Drive folders should be created immediately to support the legal review process:

1. Create `DriverNord/01-Legal/01-Drafted-Templates/`
2. Copy `legal-review-brief-for-lawyer.md` from repo to `01-Legal/02-Lawyer-Review/`
3. Copy `DPA-template-v1.md`, `service-agreement-v1.md`, `driver-consent-language-v1.md`, `privacy-policy-legal-basis-draft.md` to `01-Legal/01-Drafted-Templates/`
4. Create `DriverNord/05-Marketing/02-Creative-Bank/draft/`, `.../approved/`, `.../archive/`
5. Create `DriverNord/03-Clients/00-Pipeline/` with `company-outreach-tracker.md`

**Time estimate:** 30 minutes.

---

## Creative Bank Integration with Claude Code

When Claude Code generates content via the Creative Agent, the workflow is:

1. Claude Code writes draft content to the git repo `creative-bank/draft/` folder (to be created in repo)
2. The founder reviews the draft file
3. If approved, the founder copies the file to Google Drive `05-Marketing/02-Creative-Bank/approved/`
4. The founder publishes manually from the Drive approved folder
5. After publishing, the founder updates the performance log with actual reach/engagement data
6. Claude Code reads the performance log on the next weekly cycle for feedback learning

**Note:** The git repo creative bank contains content spec files. The Drive creative bank contains the actual post content ready for publishing. These are parallel but distinct.

---

## Data Protection Note

**Google Drive is not a GDPR-compliant system for storing driver PII without a signed DPA with Google LLC (Alphabet Inc.).**

- Do NOT store any driver names, phone numbers, or email addresses in Drive.
- Do NOT export driver records from Supabase and upload to Drive.
- The `04-Drivers/` folder contains only aggregate, non-PII summaries (e.g., "15 CE drivers in Stockholm, 3 in Gothenburg").
- All driver PII stays in Supabase, accessed only through the recruiter cockpit or Claude Code's server-side queries.

If Google Workspace is used as the email provider for `hej@drivernord.se`, a Google DPA (under their standard terms or a custom DPA) covers email processing. Check whether the Google Workspace subscription auto-includes a DPA under GDPR. This is a lawyer confirmation item.

---

*Version 1.0 — 2026-05-16 — Structure plan only. No Drive folders created.*
