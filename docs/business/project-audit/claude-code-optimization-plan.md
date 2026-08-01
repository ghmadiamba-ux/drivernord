# DriverNord — Claude Code Optimization Plan

**Audit date:** 2026-05-14  
**Purpose:** Define where Claude Code adds the most value for DriverNord, where it adds risk, and how to work with it efficiently for this specific project.

---

## 1. What Claude Code Is Good at for This Project

### 1A. AI-driven market research and data enrichment

This is where Claude Code has already delivered the most value for DriverNord. The entire `ai-public-data-validation/` corpus — competitor analysis, job ad monitoring, company scoring, SNI expansion, master opportunity database — was produced by Claude Code working through public web data systematically.

**Use Claude Code for:**
- Allabolag company lookups (revenue, employees, profit, payment remarks, org numbers)
- Job ad monitoring and repeat-ad detection across job boards
- Decision-maker identification (CEO names, email patterns, LinkedIn confirmation)
- Financial analysis and scoring calculations
- Competitive pricing research
- Cross-referencing company names across multiple public sources

**Why Claude Code works well here:** These tasks are repetitive, require no creativity, benefit from systematic documentation, and produce structured output. A human researcher would do identical work more slowly with equivalent quality.

---

### 1B. Documentation generation and auditing

Claude Code can read the entire codebase in one session and produce documentation that a human would take days to write. The project-audit-v2.md, project-audit-v3.md, and this audit series demonstrate this.

**Use Claude Code for:**
- Architecture documentation that must stay current with code
- API documentation (reading route handlers and generating specs)
- Database schema documentation
- Test coverage reports and gap analysis
- Security audits (read-only, identifying patterns)
- Updating CLAUDE.md when architecture changes

---

### 1C. Spec writing and implementation planning

Claude Code can analyze the existing codebase, understand the patterns used, and write detailed implementation specs for new features that a developer can execute without back-and-forth.

**Use Claude Code for:**
- Writing migration SQL for new tables (given the schema design intent)
- Drafting API route handlers following the existing pattern
- Specifying new agent logic following the existing agent pattern
- Drafting test cases for new pure functions
- Reviewing PRs for architectural consistency

---

### 1D. Drafting commercial and legal documents

Claude Code can draft commercial documents (outreach templates, pitch decks, DPA templates) that a human then reviews and edits.

**Use Claude Code for:**
- First drafts of outreach email templates (Paket 1 and 2 pitch angles)
- DPA template first draft (Swedish law framing, requires lawyer review)
- Privacy policy section drafts (Art. 6 legal basis paragraphs)
- Driver-facing consent language drafts
- Package pricing comparison tables

---

## 2. What Claude Code Should NOT Do for This Project

### 2A. Do not run any command that touches production Supabase

**Rule (verbatim from project constraints):**
- "Local Supabase ONLY. Do not touch production Supabase."
- "NEVER run B2B_IMPORT_CONFIRM=true unless SUPABASE_URL contains 127.0.0.1"
- "If SUPABASE_URL contains supabase.co while B2B_IMPORT_CONFIRM=true would be used, STOP immediately"

**Why this matters:** The production Supabase database contains real driver data (if any). A migration or import run against production could be irreversible.

**In practice:** Before running any database command, verify `SUPABASE_URL` in the local `.env.local`. If it contains `supabase.co`, stop and ask the user before proceeding.

---

### 2B. Do not modify website copy

The public website (chaufforer, company, legal pages) has been intentionally written. Claude Code should not change copy without explicit instruction. Changes to legal pages are especially sensitive — the "Preliminär version" banners exist intentionally until a lawyer signs off.

---

### 2C. Do not initiate any external contact

Claude Code must not send emails, SMS messages, or call any phone numbers found in research documents. All outreach requires explicit human authorization.

---

### 2D. Do not deploy

No `vercel deploy`, `git push`, or equivalent commands without explicit user instruction. Deploying untested changes to a production site that drivers may be visiting is irreversible in the short term.

---

### 2E. Do not treat market research documents as current truth

Documents in `ai-public-data-validation/` are dated research snapshots. Company financial data lags by 1–2 years. Contact information may have changed. Before acting on specific company data (phone numbers, email addresses, financial figures), verify against current Allabolag or direct web lookup.

---

## 3. Recommended Working Workflow

### Phase 1: Market intelligence work (current phase)

```
Claude Code session structure:
1. Read the relevant source files (previous research)
2. Perform targeted web searches or lookups
3. Write findings to a new or updated doc in ai-public-data-validation/
4. Update the master opportunity database CSV if applicable
5. No code changes; no file changes outside docs/
```

**Do not mix market research sessions with code sessions.** They require different levels of caution and have different blast radii.

---

### Phase 2: Engineering work (feature development)

```
Claude Code session structure:
1. Read CLAUDE.md for architecture context
2. Read the specific files to be modified
3. Run tests (npm test) to confirm baseline
4. Make targeted changes to the smallest possible set of files
5. Run tests again to confirm no regressions
6. Write test cases for new functionality
7. Update docs/current/ documentation if architecture changed
```

**Critical:** For any change touching `lib/db.ts`, `lib/ingestLead.ts`, `lib/matchingAgent.ts`, or `lib/contactAgent.ts` — the pipeline core — run the full test suite before and after. These files are the live pipeline.

---

### Phase 3: B2B agent implementation (future phase)

When the B2B pipeline (6 agents, 5 tables) is ready to be built:
1. Migrations first — write and verify all new table migrations locally
2. Types first — add all new TypeScript types to types/
3. Pure functions first — any scoring or classification logic as testable pure functions
4. Agent last — wire up the agent only after the underlying functions are tested
5. Human-gate default — all new B2B agents must default to suggest mode

---

## 4. Folder Structure for Claude Code Sessions

```
DriverNord/ (project root, C:\PROJECT\DriverNord)
├── docs/
│   ├── business/
│   │   ├── market-entry-research/
│   │   │   └── ai-public-data-validation/   ← Research output goes here
│   │   ├── project-audit/                   ← Audit output goes here
│   │   └── b2b-agent-architecture-v1.md     ← B2B pipeline design
│   └── current/                             ← Always-current project state
│       ├── project-state.md                 ← Update this after major changes
│       ├── architecture-context.md          ← Update after architecture changes
│       └── roadmap-next-phases.md           ← Update after completing phases
└── [application code]
```

**Convention:**
- All Claude Code research output → `docs/business/market-entry-research/ai-public-data-validation/`
- All Claude Code audit output → `docs/business/project-audit/`
- After significant engineering work → update `docs/current/project-state.md`
- Never create files in the application root, app/, lib/, or components/ unless implementing a specific feature

---

## 5. Prompt Templates

These templates have been validated by prior work in this project.

---

### Template 1: Company intelligence lookup

```
You are performing AI-driven market research for DriverNord, a Swedish professional driver 
acquisition company. Research the following company using public sources only.

Company: [NAME]
Org number (if known): [ORG]
City: [CITY]

Retrieve and document:
1. Revenue, employees, profit, margin (from Allabolag or Bolagsfakta)
2. Payment remarks if any (from kreditrapporten.se or allabolag)
3. CEO/VD name and contact information (website, allabolag officer listing)
4. Any active CE/C/D driver job ads in the last 30 days
5. Any staffing agency relationships visible from job ads

Apply the DriverNord V1 Fit scoring model:
- Financial capacity (30 pts): revenue/employees/margin
- Ownership structure (25 pts): family/owner-managed vs. corporate
- Decision-maker accessibility (25 pts): named DM, direct email available
- Geographic fit (20 pts): Stockholm/Mälardalen core

Output as structured markdown with explicit confidence ratings (5/5 = confirmed public; 3/5 = estimated; 1/5 = unverifiable).

Governing constraints: Public data only. Do not contact any person or company. Do not scrape behind login walls.
```

---

### Template 2: Schema migration spec

```
You are a senior TypeScript/PostgreSQL developer working on DriverNord.
Working directory: project root (C:\PROJECT\DriverNord)

Current task: Write a migration SQL file for [NEW TABLE/CHANGE].

Context:
- Existing migrations: migrations/001 through migrations/007
- Schema documentation: docs/current/database-schema.md
- Pattern: All migrations use sequential numbering (migrations/00N_description.sql)

Requirements:
1. Write the migration SQL only (no application code changes)
2. Include column comments for any non-obvious columns
3. Add appropriate indexes (look at existing migrations for the pattern)
4. Include a DOWN migration for reversal
5. Do not touch any existing tables unless explicitly required

Output: The complete migration SQL file content. Do not write the file — output it for review.
```

---

### Template 3: Agent implementation spec

```
You are a senior TypeScript developer working on DriverNord.
Working directory: project root (C:\PROJECT\DriverNord)

Current task: Write a specification for [AGENT NAME] agent.

Context:
- Existing agents to follow as pattern: lib/contactAgent.ts, lib/matchingAgent.ts
- Agent system documentation: docs/current/agent-system.md
- B2B architecture design: docs/business/b2b-agent-architecture-v1.md
- All agents must: log to system_actions, default to suggest mode, be kill-switch controllable

Specify:
1. Input parameters and validation
2. DB queries required (new tables must reference existing schema + migration spec)
3. Core logic steps (numbered)
4. Suggest mode behavior (what action is logged as pending)
5. Auto mode behavior (what action is taken)
6. Error handling (what is logged on failure)
7. Kill switch env var name

Output: Specification only. No code. Do not write files.
```

---

### Template 4: Market gap analysis update

```
You are performing a market research update for DriverNord.

Previous research: [PATH TO PREVIOUS FILE]
Today's date: [DATE]

Update the research by:
1. Checking if any previously unverifiable facts can now be verified
2. Identifying any companies that have changed status (new payment remarks, dissolved, grown)
3. Adding any new companies discovered in this session
4. Correcting any known errors from previous research

Apply the same scoring model and confidence ratings as the existing documents.

Governing constraints: Public data only. No contact. No speculation beyond what public data supports. Label clearly: VERIFIED FACT / STRONG INFERENCE / WEAK ASSUMPTION / OPEN QUESTION.
```

---

### Template 5: Legal document first draft

```
You are a legal document drafter (not a lawyer). You are writing a first-draft document
for DriverNord, a Swedish company that provides CE/C/D professional truck driver
placement services. This draft requires review by a Swedish-qualified lawyer.

Document to draft: [DOCUMENT TYPE]

Context:
- DriverNord's model: permanent placement (not staffing/bemanning)
- GDPR basis: Consent (Art. 6(1)(a)) for driver matching and introduction
- Driver rights: See docs/business/market-entry-research/qualified-lead-model/05-driver-consent-and-data-product.md
- Data flows: Driver registers → DriverNord verifies → DriverNord shares consented profile with client company

Requirements:
1. Write in Swedish (legal documents should be in the governing language)
2. Cite GDPR article numbers explicitly
3. Flag every section that requires lawyer review with [LAWYER REVIEW REQUIRED]
4. Flag any section where Swedish law is uncertain with [SWEDISH LAW — VERIFY]

Output: Full draft document. Do not write to file — output for review.
```

---

## 6. Error Prevention Checklist

Before any Claude Code session that involves file changes:

```
□ Is SUPABASE_URL set to 127.0.0.1 (local) or supabase.co (production)?
  → If production and the task involves database operations: STOP. Use local only.

□ Will this session modify any file in app/, lib/, components/, or types/?
  → If yes: ensure tests pass before AND after. Run `npm test` to confirm baseline.

□ Will this session modify any legal page (/privacy, /terms, /cookies)?
  → If yes: explicit human approval required. These are "Preliminär version" pending legal review.

□ Will this session modify any public-facing website copy?
  → If yes: explicit human approval required.

□ Does this session involve contact information (phone, email, addresses)?
  → If yes: document only, do not send or use for contact.

□ Does this session involve running a deployment command?
  → Do not deploy without explicit instruction.
```

---

## 7. Sessions That Have Proved Valuable (Historical Record)

| Session type | What was produced | Where to find it |
|-------------|-------------------|-----------------|
| Job ad monitoring (Task A) | Direct employer shortlist; repeat-ad analysis | ai-public-data-validation/repeat-ad-detector/ |
| Company enrichment (Task B) | Financial data for 30 companies; payment remark flags | ai-public-data-validation/company-enrichment/ |
| B2B target research pass 1 | First 50 companies scored and documented | docs/business/b2b-target-company-first-50-notes.md |
| B2B target research pass 2 | Top 10 companies with decision-maker contacts | docs/business/b2b-target-company-top-10-notes.md |
| Company scoring (Task D) | V1 Fit and Market Proof scores for 31 companies | ai-public-data-validation/company-scoring/ |
| SNI expansion | 35 new companies from geography-based search | ai-public-data-validation/sni-49410-expansion/ |
| Master opportunity database | 63-company unified database with 44 columns | ai-public-data-validation/master-opportunity-database/ |
| Project audits v1–v4 | Full codebase audit including security, gaps, recommendations | docs/audits/ + docs/business/project-audit/ |

---

*This document should be reviewed and updated after each major phase of work.*
