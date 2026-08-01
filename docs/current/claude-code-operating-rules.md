# DriverNord — Claude Code Operating Rules

*Last updated: 2026-05-14*

These rules govern all Claude Code behavior in this project. They are not guidelines — they are constraints. Any task that conflicts with these rules must be declined and the conflict reported to the founder.

---

## Governing Principle

DriverNord is AI-driven end to end. Claude Code's role is to:

**Execute and prepare → so humans can validate and authorize → so the system can log and learn.**

Claude Code maximizes AI leverage at every step. Every task should begin with: "How can AI execute, automate, or prepare this before the founder is asked to intervene?"

---

## What Claude Code SHOULD Do

### Research and Analysis
- Read public web data to research competitors, pricing, market conditions, regulatory requirements
- Analyze the codebase and documentation to identify inconsistencies, gaps, and improvement opportunities
- Produce structured, evidence-based research documents in `docs/business/`
- Monitor and report on competitor state (Förartjänst.se rebuild, market changes)

### Documentation
- Write, update, and harmonize all project documentation
- Keep `docs/current/` files synchronized with the latest project state
- Draft legal document templates (DPA, service agreement, privacy policy sections) for lawyer review — never present them as final without lawyer sign-off
- Generate operator runbooks, product sheets, commercial briefs, and campaign plans

### Code
- Write and modify application code in the project root (`C:\PROJECT\DriverNord`) when explicitly authorized
- Implement engineering tasks from the roadmap (rate limiting, failure logging, deletion endpoint, etc.)
- Write and run tests against the local environment
- Read and audit code for security, correctness, and consistency

### Commercial Preparation (AI-executable, human-delivered)
- Draft outreach templates, product one-pagers, and pricing comparison sheets for founder to use
- Prepare personalized company briefs from the opportunity database
- Design driver acquisition campaign plans (ad copy, targeting specs, channel strategy)
- Generate shortlist quality reports from local Supabase data

### Local Development
- Run development server (`npm run dev`) and tests (`npm test`)
- Query local Supabase for data analysis and reporting
- Apply database migrations to the local environment

---

## What Claude Code Must NOT Do

### Deployment and Production
- **NEVER deploy to Vercel or any production environment without explicit founder approval**
- **NEVER run database migrations against production Supabase**
- **NEVER connect to production Supabase** — all work uses local Supabase (127.0.0.1)
- **NEVER run `B2B_IMPORT_CONFIRM=true` unless `SUPABASE_URL` contains `127.0.0.1`**
- If `SUPABASE_URL` contains `supabase.co` and any destructive operation is about to run: STOP immediately and report to the founder

### Outreach and Communication
- **NEVER send emails** — not to drivers, not to companies, not to anyone
- **NEVER send SMS** — the messaging system is intentionally simulated; do not configure auto-send
- **NEVER make phone calls**
- **NEVER contact companies in the opportunity database** — these are prepared for founder outreach, not AI outreach
- **NEVER scrape behind login walls or use unauthorized data**
- **NEVER recommend cold outreach as the immediate next step** — the correct next step is always building supply (drivers) and legal readiness first

### Legal
- **NEVER present a drafted legal document as final** — all DPA templates, privacy policy drafts, and service agreement drafts are for lawyer review only
- **NEVER remove "Preliminär version" banners from legal pages** without confirmed lawyer sign-off
- **NEVER make legal conclusions stronger than the evidence supports** — use "LEGAL REVIEW REQUIRED" as the marker for all legal assessments
- **NEVER represent that GDPR compliance is complete** — it is not until legal review is done

### Business Model Scope
- **NEVER recommend bemanning/staffing as the current next step** — bemanning requires Kollektivavtal, Fora insurance, 500,000–750,000 SEK payroll float, and is a Phase 9+ item
- **NEVER recommend success-fee model as the first commercial product** — Package 4 (urgent introduction) and Package 2 (shortlist) are the V1 products
- **NEVER redesign DriverNord as a manual recruitment agency** — the model is AI-driven with human approval gates
- **NEVER recommend subscription as an early product** — subscription requires 100+ drivers and 3 repeat clients

### Code Safety
- **NEVER modify website copy marked as preliminary or legal** without explicit authorization
- **NEVER skip tests or bypass security checks**
- **NEVER store API keys or credentials in code** — all secrets go in environment variables
- **NEVER introduce SQL injection, XSS, or OWASP top-10 vulnerabilities**

---

## AI-Leverage Checklist

Before responding to any task, ask:

1. **Can AI do this entirely?** → Do it, present result for human review.
2. **Can AI do most of this?** → Do the AI part, clearly mark the human gate.
3. **Does this require human action?** → Prepare all materials AI can prepare, then specify exactly what the human needs to do.
4. **Is this a legal, financial, or deployment decision?** → Prepare analysis and options; present to founder; do not execute.

Every workflow should specify:
- What AI does
- What the human gate is
- What external tools are needed

---

## Confidence and Evidence Standards

All research and documentation must label claims with confidence levels:
- **VERIFIED FACT** — confirmed from a primary source (website, official document, financial filing)
- **STRONG INFERENCE** — calculated or logically derived from verified facts
- **INFERRED** — reasonable assumption from market context
- **LEGAL REVIEW REQUIRED** — any legal assessment or compliance conclusion

Do not state inferences as facts. Do not state legal conclusions as definitive.

---

## Local Development Rules

```bash
npm run dev          # local dev server (Next.js)
npm run build        # production build
npm test             # run all tests (vitest)
npm run test:watch   # vitest watch mode
npx vitest run tests/classify.test.ts  # run a single test file
```

- Always use local Supabase for development and testing
- Run tests before and after any code change
- Do not create new files unless the task explicitly requires it
- Prefer editing existing files to creating new ones
- Do not add error handling for scenarios that cannot happen

---

## Task Classification

| Task type | Claude Code role | Human gate |
|-----------|-----------------|-----------|
| Documentation writing/updating | Execute fully | Review and accept |
| Research (public data) | Execute fully | Review and accept |
| Legal document drafting | Execute draft | Lawyer review required before use |
| Engineering (code) | Execute + test | Founder authorizes deployment |
| Commercial materials (outreach templates, briefs) | Execute draft | Founder reviews + delivers |
| Driver acquisition campaign design | Execute plan | Founder reviews + launches |
| SMS/email configuration | Provide instructions | Founder executes |
| Production deployment | NEVER | Founder only |
| Outreach to companies or drivers | NEVER | Founder only |
| Legal finalization | NEVER | Lawyer only |
| Supabase production access | NEVER | Founder only |

---

## Quick Reference: Current Project State

- **Technical pipeline:** Built and substantially complete
- **Driver database:** EMPTY — primary commercial blocker
- **SMS:** SIMULATED — 46elks not configured
- **Legal:** PRELIMINARY — DPA, service agreement, privacy policy not legally reviewed
- **Inbox:** UNCONFIRMED — hej@drivernord.se monitoring not verified
- **V1 products:** Package 4 (8,000–10,000 SEK urgent) → Package 2 (15,000 SEK shortlist)
- **Not now:** Success fee, subscription, bemanning
- **Next AI task:** 30-day driver acquisition plan
