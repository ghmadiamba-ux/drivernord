# Documentation Consistency Audit

**Audit date:** 2026-05-16
**Scope:** All 160+ documentation files — conflicts, duplications, outdated content, inconsistencies, and gaps
**Method:** Structural analysis based on file inventory, reading of key files, and cross-reference checking

---

## Summary Finding

The DriverNord documentation system is rich but not curated. It has grown through multiple development sprints without a pruning pass. The result is:

- **Excellent depth** — market research, legal analysis, and agent architecture are thorough and well-reasoned
- **Poor discoverability** — 160+ files with no master index; navigating requires knowing where to look
- **Temporal inconsistency** — some documents represent earlier design decisions that have since been superseded
- **Domain name inconsistency** — `drivernord.com` vs `drivernord.se` appears across multiple files
- **Overlapping content** — acquisition materials exist in 3+ locations with unclear priority order
- **Missing documents** — several operational items exist in code but have no documentation

---

## Domain Name Inconsistency

**Status: MEDIUM risk — affects brand consistency and link correctness**

The canonical domain was decided as `drivernord.se` on 2026-05-14. Since then, Meta integration docs have been updated to v1.1 with the correct domain. However, older documents have not been updated.

**Files containing `drivernord.com` that should reference `drivernord.se`:**

| File | Current reference | Correct reference |
|------|-------------------|-------------------|
| `docs/current/project-state.md` | `hej@drivernord.com` | `hej@drivernord.se` |
| `app/privacy/page.tsx` (likely) | May reference `.com` | `hej@drivernord.se` |
| `app/terms/page.tsx` (likely) | May reference `.com` | `hej@drivernord.se` |
| `app/contact/page.tsx` (likely) | May reference `.com` | `hej@drivernord.se` |
| `docs/business/legal/*.md` (likely) | Various | All contact references → `.se` |
| `docs/current/driverNord-canonical-context.md` | Does not appear to mention email | Review needed |

**Files confirmed correct (`.se`):**
- All `docs/business/meta-acquisition-integration/` files (updated to v1.1)
- `docs/business/agents/creative-acquisition-agent/` files (written with `.se`)
- `docs/business/agents/agentic-operating-system/` files

---

## Test Count Inconsistency

| File | Claim | Actual |
|------|-------|--------|
| `docs/business/project-audit/driverNord-full-project-audit.md` (2026-05-14) | 518/522 tests passing (4 failures noted as stale mocks) | Outdated |
| `docs/current/project-state.md` | 660/660 tests passing | Current |
| `docs/current/driverNord-canonical-context.md` | 660/660 tests passing | Current |

**Resolution:** The 2026-05-14 audit is outdated on test counts. The canonical context and project-state files are authoritative. The old audit should note it is superseded.

---

## Overlapping Driver Acquisition Documentation

Three separate locations contain driver acquisition content:

### Location A: `docs/business/driver-acquisition-execution-kit/` (7 files)
- Operational materials: SMS sequences, meta ads copy bank, Facebook groups posts, Platsbanken draft
- Written earlier in the project lifecycle
- **Status:** Still valuable as operational content but not clearly linked to the new agent spec

### Location B: `docs/business/driver-acquisition-pre-meta-technical-readiness/` (8 files)
- Technical readiness: consent gap analysis, fake driver test plan, SMS readiness, Supabase readiness
- Written just before the consent/UTM implementation work
- **Status:** Largely superseded by the completed work (migration 013, 660 tests) but contains useful checklists

### Location C: `docs/business/driver-acquisition-technical-readiness/` (4 files)
- E2E simulation plan and results, implementation progress
- Most recent technical validation work
- **Status:** Current and accurate

### Location D: `docs/business/agents/creative-acquisition-agent/` (9 files, NEW)
- Complete agent specification for content acquisition
- **Status:** Current and authoritative for agent design

### Location E: `docs/business/meta-acquisition-integration/` (10 files)
- Meta/Facebook integration documentation
- **Status:** Updated to v1.1, current

**Issue:** The relationship between Locations A, B, C, D, and E is not documented anywhere. A new contributor (or Claude Code in a new session) has to read all 38 files to understand the acquisition strategy. This is a significant discoverability problem.

**Recommended action:** Create a single `ACQUISITION-INDEX.md` that maps what each location covers and in what order to read them.

---

## Old Audit Files vs. New Audit

**Three prior audits exist:**
- `docs/audits/project-audit-v2.md` (2026-05-06)
- `docs/audits/project-audit-v3.md` (2026-05-10)
- `docs/business/project-audit/driverNord-full-project-audit.md` (2026-05-14)

Plus this new audit (2026-05-16).

**Issue:** The v2 and v3 audits contain claims that are now outdated (e.g., 518 tests, different migration count, older agent architecture). They should not be deleted (historical value) but should be marked as superseded.

**Recommended action:** Add "SUPERSEDED — see end-to-end-structure-audit 2026-05-16" header to v2, v3, and the 2026-05-14 audit.

---

## B2B Documentation State

**Significant B2B infrastructure exists but documentation is fragmented:**

| Component | Code | Documentation |
|-----------|------|---------------|
| company_research_targets table | Migration 008 ✓ | `docs/business/b2b-data-model-v1.md` — may be outdated |
| company_outreach_actions table | Migration 009 ✓ | `docs/business/b2b-agent-architecture-v1.md` — may be outdated |
| pilot_company_relationships table | Migration 010 ✓ | Unclear which doc covers this |
| lib/b2b/ | 2 files ✓ | Not prominently documented |
| import-b2b-targets.ts | 1 file ✓ | `docs/business/b2b-import-staging-checklist.md` covers this |
| B2B target lists | CSV files | Present in docs/business/ |
| B2B target company notes | .md files | Present; may be outdated given pipeline decisions |

**The agentic OS architecture (Phase 2 Demand Intelligence Agent) is designed without explicitly referencing the already-built B2B infrastructure.** This is a significant disconnect: the documentation says "build company research in Phase 2" but the code already has company_research_targets, company_outreach_actions, and pilot_company_relationships tables.

---

## `docs/current/` Files — Currency Assessment

| File | Last updated | Status |
|------|-------------|--------|
| project-state.md | 2026-05-14 | CURRENT — but `hej@drivernord.com` reference wrong |
| driverNord-canonical-context.md | 2026-05-14 | CURRENT |
| database-schema.md | Unknown | Needs verification — schema changed at 013 |
| agent-system.md | Unknown | May not reflect new agentic OS documentation |
| architecture-context.md | Unknown | May predate B2B layer and agentic OS |
| claude-code-operating-rules.md | Unknown | Should reflect current constraints |
| documentation-synchronization-report.md | Unknown | Likely outdated |
| roadmap-next-phases.md | Unknown | May conflict with new implementation roadmap |
| security-state.md | Unknown | Needs review after .env.local.prod-backup finding |
| website-state.md | Unknown | Needs review — pages added since last update |

**Recommended action:** Read and update each `docs/current/` file to reflect state as of 2026-05-16.

---

## `docs/business/bemanning-driver-model/`

A single file exists: `01-legal-employment-contract-framework.md`.

**Issue:** The bemanning (staffing) model is explicitly ruled out until Phase 9+ (24–36 months). This folder may be premature. The document itself may create confusion about DriverNord's operating model if found by a new contributor.

**Recommended action:** Archive to `docs/archive/bemanning-driver-model/` with a note: "Exploratory document. DriverNord does not operate as a staffing agency. Not current strategy."

---

## `TASK_COMPLETED_READY_TO_SHUTDOWN.txt`

Location: `docs/business/market-entry-research/ai-public-data-validation/master-opportunity-database/`

This is an AI session artifact. It has no documentation value.

**Recommended action:** Delete this file.

---

## Documentation Gaps (What Should Exist but Doesn't)

| Missing document | Priority | Why needed |
|-----------------|----------|-----------|
| `docs/current/` file for B2B layer | MEDIUM | B2B tables 008–012 are built but not in current state docs |
| Inbound SMS webhook spec | HIGH | Required for STOPP handling before SMS goes live |
| STOPP opt-out implementation guide | HIGH | Legal requirement; not yet implemented |
| Cookie consent banner spec | HIGH | Required before Meta Pixel |
| GDPR deletion request procedure | HIGH | Right-to-erasure; manual process needs documented workflow |
| Favicon and SEO asset list | LOW | Missing assets should be tracked |
| `ACQUISITION-INDEX.md` | MEDIUM | Navigation guide for 38+ acquisition-related docs |
| Migration production checklist | HIGH | Step-by-step guide for applying migration 013 safely |

---

## Documents to Archive

| Document | Reason |
|----------|--------|
| `docs/audits/project-audit-v2.md` | Superseded |
| `docs/audits/project-audit-v3.md` | Superseded |
| `docs/company-site-handover-v1.md` | If company site is live and stable, this handover doc is historical |
| `docs/business/bemanning-driver-model/` | Not current strategy |
| `docs/e2e-simulation-5x5-v1.md` | Superseded by 10-driver simulation |

---

## Documents to Merge or Consolidate

| Source A | Source B | Action |
|----------|----------|--------|
| `docs/business/driver-acquisition-pre-meta-technical-readiness/` (8 files) | `docs/business/driver-acquisition-technical-readiness/` (4 files) | Create index doc clarifying which is current; archive pre-meta readiness docs |
| `docs/business/meta-acquisition-integration/organic-content-test-plan.md` | `docs/business/agents/creative-acquisition-agent/content-angle-library.md` | The agent spec supersedes the older test plan for operational use; old plan has historical angles not in new library — merge angle list, then archive old plan |
| `docs/business/project-audit/` (6 files, 2026-05-14) | `docs/business/project-audit/end-to-end-structure-audit/` (this audit, 2026-05-16) | Old audit should be marked superseded |

---

*Version 1.0 — 2026-05-16 — Audit only. No documentation changes.*
