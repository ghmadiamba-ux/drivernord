# Recommended Documentation Updates

**Audit date:** 2026-05-16
**Scope:** All documentation requiring update, archival, creation, or consolidation as identified across all 8 sub-audits
**Purpose:** Actionable list for Claude Code and founder to bring documentation into alignment with current project state

---

## Priority Classification

| Priority | Meaning |
|----------|---------|
| P1 | Fix immediately — causes confusion or incorrect behavior if left |
| P2 | Fix before next development sprint — stale or inconsistent |
| P3 | Fix when convenient — improvement not urgently needed |
| ARCHIVE | Move to archive folder — still historical value, not current |
| DELETE | Remove — no value, may cause confusion |

---

## P1: Fix Immediately

### P1-01: `docs/current/project-state.md` — Domain Email Reference

**Issue:** `hej@drivernord.com` appears in this file. Canonical domain is `drivernord.se`.
**Action:** Change `hej@drivernord.com` → `hej@drivernord.se` throughout the file.
**Who:** Claude Code.
**Effort:** 5 minutes.

---

### P1-02: `app/privacy/page.tsx` — Domain Email Reference

**Issue:** Almost certainly references `drivernord.com` as the privacy contact email. Needs verification and correction.
**Action:** Read the file, update any `drivernord.com` email references to `drivernord.se`.
**Who:** Claude Code.
**Effort:** 10 minutes.

---

### P1-03: `app/terms/page.tsx` — Domain Email Reference

**Issue:** Likely references `drivernord.com`. Terms of service should reference the correct domain.
**Action:** Read the file, update any `drivernord.com` references.
**Who:** Claude Code.
**Effort:** 10 minutes.

---

### P1-04: `app/contact/page.tsx` — Domain Email Reference

**Issue:** The contact page almost certainly shows `hej@drivernord.com`. Visitors following this link to send email will use the wrong address.
**Action:** Read the file, update to `hej@drivernord.se`.
**Who:** Claude Code.
**Effort:** 10 minutes.

---

### P1-05: `app/cookies/page.tsx` — Domain Email Reference

**Issue:** The cookies policy page likely references a contact email. Should be `hej@drivernord.se`.
**Action:** Read and update.
**Who:** Claude Code.
**Effort:** 10 minutes.

---

### P1-06: `docs/business/agents/agentic-operating-system/automation-vs-agent-map.md` — Email Reference

**Issue:** Section 6, Support/Customer Success row references `hej@drivernord.com`.
**Action:** Update to `hej@drivernord.se`.
**Who:** Claude Code.
**Effort:** 5 minutes.

---

## P2: Fix Before Next Sprint

### P2-01: `docs/business/agents/agentic-operating-system/tools-and-software-recommendations.md` — Model IDs

**Issue:** The model ID section does not specify current Claude model IDs.
**Action:** Update to current model IDs:
- Fast classification/routing: `claude-haiku-4-5-20251001`
- Content generation: `claude-sonnet-4-6`
- Strategic analysis: `claude-opus-4-7`
**Who:** Claude Code.
**Effort:** 15 minutes.

---

### P2-02: `docs/current/database-schema.md` — Outdated Schema

**Issue:** The database schema document in `docs/current/` was written before migration 013. It does not include consent columns, UTM columns, or B2B tables.
**Action:** Read the current migration files and update `database-schema.md` to reflect the full 13-migration schema.
**Who:** Claude Code.
**Effort:** 1–2 hours.

---

### P2-03: `docs/current/agent-system.md` — Outdated Agent Architecture

**Issue:** The agent system document in `docs/current/` predates the new agentic OS documentation (7-file set, May 2026). It may describe an earlier, simpler agent architecture.
**Action:** Read the file. If it conflicts with the current 8-agent roster and two-zone architecture, update it to reference the agentic OS documents as authoritative.
**Who:** Claude Code.
**Effort:** 1–2 hours.

---

### P2-04: `docs/current/architecture-context.md` — B2B Layer Not Referenced

**Issue:** This document may predate the B2B layer (migrations 008–012, lib/b2b/) and the agentic OS architecture.
**Action:** Read the file. Add references to the B2B infrastructure and the two-zone architecture.
**Who:** Claude Code.
**Effort:** 1 hour.

---

### P2-05: `docs/current/roadmap-next-phases.md` — May Conflict with Implementation Roadmap

**Issue:** The implementation roadmap in `agentic-operating-system/implementation-roadmap.md` is the current authoritative plan. The `docs/current/roadmap-next-phases.md` may contain an earlier plan that conflicts.
**Action:** Read both files. Either update `roadmap-next-phases.md` to reference the new roadmap, or add a "SUPERSEDED" header.
**Who:** Claude Code.
**Effort:** 30 minutes.

---

### P2-06: Add "SUPERSEDED" Headers to Old Audit Files

**Files:**
- `docs/audits/project-audit-v2.md`
- `docs/audits/project-audit-v3.md`
- `docs/business/project-audit/driverNord-full-project-audit.md`

**Action:** Add the following header to each:
```
> **SUPERSEDED** — See `docs/business/project-audit/end-to-end-structure-audit/` (2026-05-16 audit) for the current version.
```

**Who:** Claude Code.
**Effort:** 15 minutes.

---

### P2-07: Create `ACQUISITION-INDEX.md` Navigation Guide

**Issue:** Five separate documentation locations contain driver acquisition content (Locations A–E identified in documentation-consistency-audit.md). No index exists. Navigating the full acquisition strategy requires reading 38+ files.

**Action:** Create `docs/business/ACQUISITION-INDEX.md` with:
- Map of each location and what it covers
- Recommended reading order
- Which document supersedes which for operational use
- Clear statement: "Creative Agent spec (Location D) is the current operational guide"

**Who:** Claude Code.
**Effort:** 1–2 hours.

---

### P2-08: `docs/business/agents/agentic-operating-system/automation-vs-agent-map.md` — Add B2B Infrastructure Note

**Issue:** The "Company Need Detection" and "Company Demand Research" rows in the automation/agent map do not mention that `company_research_targets`, `company_outreach_actions`, and `pilot_company_relationships` tables already exist in code.
**Action:** Add a footnote: "Note: B2B table infrastructure (migrations 008–012) is already implemented. Phase 2 Demand Intelligence Agent builds on this foundation — not a greenfield build."
**Who:** Claude Code.
**Effort:** 15 minutes.

---

### P2-09: `docs/business/agents/agentic-operating-system/implementation-roadmap.md` — Add Migration 015 Explicit Dependency

**Issue:** Phase 2B (Orchestrator Agent) requires migration 015 (`pending_actions` table), but this dependency is not stated explicitly enough.
**Action:** Add a callout box at the start of Phase 2B: "Prerequisite: migration 015 must be written and applied to both local and production Supabase before the Orchestrator Agent can be built."
**Who:** Claude Code.
**Effort:** 10 minutes.

---

### P2-10: `docs/business/meta-acquisition-integration/organic-content-test-plan.md` — Cross-Reference or Archive

**Issue:** This file contains organic post drafts for 6 angles written before the Creative Agent spec. The `content-angle-library.md` (8 angles) supersedes it for operational use, but the older test plan may contain angle copy not yet merged into the new library.
**Action:** 
1. Compare the 6 angles in the old test plan against the 8 in the new library
2. Merge any unique copy into `content-angle-library.md` as additional variant examples
3. Add "SUPERSEDED for operational use — see content-angle-library.md" header to old plan
**Who:** Claude Code.
**Effort:** 1–2 hours.

---

### P2-11: Add Migration 015 Note to `state-management-and-audit.md`

**Issue:** The `state-management-and-audit.md` document designs the `pending_actions` table schema but does not link to the migration file because it doesn't exist yet.
**Action:** Add a note at the top: "Migration 015 (pending_actions table) must be written as a `.sql` file in `/supabase/migrations/` before this design can be implemented. The schema below is the canonical design for that migration."
**Who:** Claude Code.
**Effort:** 5 minutes.

---

## P3: Fix When Convenient

### P3-01: `docs/current/security-state.md` — Review After .env.local.prod-backup Finding

**Issue:** The security state document may not reference the `.env.local.prod-backup` file or the protocol for handling it.
**Action:** Read the file. Add a note about the backup file and the verification required.
**Who:** Claude Code (read only) + Founder (verify file contents).
**Effort:** 30 minutes.

---

### P3-02: `docs/current/website-state.md` — Pages Added Since Last Update

**Issue:** Several pages may have been added since the last update (e.g., `/cookies`, `/about`, `/company/ai-agenter`). The website state document should reflect the current page inventory.
**Action:** Read `website-state.md` and compare against current `app/` directory. Update page list.
**Who:** Claude Code.
**Effort:** 30 minutes.

---

### P3-03: Add CLAUDE.md Note for Migration Directory Canonicality

**Issue:** The CLAUDE.md (in `agent-1/`) does not clarify which of the two migration directories is canonical.
**Action:** Add a note to CLAUDE.md: "The canonical migration directory is `/supabase/migrations/` (Supabase CLI timestamp naming). The `/migrations/` directory is a human-readable reference only. Never run migrations from both directories."
**Who:** Claude Code.
**Effort:** 5 minutes.

---

### P3-04: `docs/business/agents/agentic-operating-system/recommended-agent-roster.md` — Add Legal Compliance Monitor Stub

**Issue:** The Legal Compliance Monitor (Agent 8) has only a brief description in the roster. No stub spec exists.
**Action:** Add a "Phase 3 Stub Spec" section for Agent 8 with: problem it solves, when to build, minimum viable spec.
**Who:** Claude Code.
**Effort:** 30 minutes.

---

### P3-05: `docs/current/claude-code-operating-rules.md` — Verify Against Current Constraints

**Issue:** The operating rules document may not include the recently added production safety constraints (no production Supabase, no 46elks, no Meta Pixel).
**Action:** Read the file. Verify that all current constraints from the canonical context are present.
**Who:** Claude Code.
**Effort:** 30 minutes.

---

## ARCHIVE: Move to `docs/archive/`

### ARCH-01: `docs/audits/project-audit-v2.md`

**Reason:** Superseded by the 2026-05-16 end-to-end audit. Historical value only.
**Action:** Move to `docs/archive/audits/project-audit-v2.md`. Add header indicating supersession.

---

### ARCH-02: `docs/audits/project-audit-v3.md`

**Reason:** Same as ARCH-01.
**Action:** Move to `docs/archive/audits/project-audit-v3.md`.

---

### ARCH-03: `docs/business/project-audit/driverNord-full-project-audit.md` (2026-05-14)

**Reason:** Superseded by 2026-05-16 end-to-end audit. May still have some unique observations.
**Action:** Move to `docs/archive/audits/driverNord-full-project-audit-2026-05-14.md`.

---

### ARCH-04: `docs/business/bemanning-driver-model/`

**Reason:** The staffing agency (bemanning) model is explicitly not current strategy until Phase 9+ (24–36 months). This folder creates confusion for any new contributor or future Claude Code session.
**Action:** Move to `docs/archive/bemanning-driver-model/`. Add a `README.md` in the archive folder: "Exploratory document for a Phase 9+ operating model. DriverNord does not operate as a staffing agency. This is not current strategy."

---

### ARCH-05: `docs/business/driver-acquisition-pre-meta-technical-readiness/`

**Reason:** This 8-file folder represents the technical readiness assessment done before the consent/UTM implementation work. That work is now complete (660 tests). The checklists are largely satisfied.
**Action:** Move to `docs/archive/driver-acquisition-pre-meta-technical-readiness/`. Create an index note: "Pre-implementation readiness checklist. Implementation completed 2026-05-14. See driver-acquisition-technical-readiness/ for post-implementation state."

---

### ARCH-06: `docs/e2e-simulation-5x5-v1.md`

**Reason:** Superseded by the 10-driver E2E simulation (82 tests) in the technical readiness folder.
**Action:** Move to `docs/archive/`.

---

## DELETE: Remove Entirely

### DEL-01: `TASK_COMPLETED_READY_TO_SHUTDOWN.txt`

**Location:** `docs/business/market-entry-research/ai-public-data-validation/master-opportunity-database/TASK_COMPLETED_READY_TO_SHUTDOWN.txt`
**Reason:** AI session artifact. No documentation value.
**Action:** Delete the file.

---

## New Documents to Create

### NEW-01: `docs/business/ACQUISITION-INDEX.md`

**See P2-07 above.**

---

### NEW-02: Inbound SMS Webhook Spec

**Priority:** HIGH (legal requirement)
**Location:** `docs/business/technical-specs/sms-inbound-webhook-spec.md`
**Content:** STOPP handling requirements, 46elks inbound webhook configuration, API route design, audit log requirements, testing approach.
**Who:** Claude Code (write spec), then implement.

---

### NEW-03: GDPR Deletion Request Procedure

**Priority:** HIGH
**Location:** `docs/business/legal/gdpr-deletion-procedure.md`
**Content:** Step-by-step process for handling a driver's deletion request, what tables must be cleared, audit trail requirements, SLA.
**Who:** Founder (define SLA), Claude Code (write procedure, implement route).

---

### NEW-04: Data Retention Schedule

**Priority:** MEDIUM (GDPR Art. 5(1)(e))
**Location:** `docs/business/legal/data-retention-schedule.md`
**Content:** Retention period for each data category (anonymous_dropoff records, disqualified drivers, ready_for_ingestion drivers, system_actions, consent records).
**Who:** Founder (with lawyer input) defines periods; Claude Code drafts the document.

---

### NEW-05: Migration Production Checklist

**Priority:** HIGH
**Location:** `docs/business/technical-specs/migration-production-checklist.md`
**Content:** Step-by-step safe procedure for applying a migration to production Supabase: backup first, test locally, verify rollback plan, apply, verify columns exist, run affected tests.
**Who:** Claude Code writes. Founder uses it for migration 013 application.

---

### NEW-06: `docs/current/` B2B State Document

**Priority:** MEDIUM
**Location:** `docs/current/b2b-state.md`
**Content:** Current state of B2B infrastructure — tables 008–012, lib/b2b/ functions, what is implemented vs. what is planned.
**Who:** Claude Code writes.

---

## Summary Count

| Action | Count |
|--------|-------|
| P1 (fix immediately) | 6 |
| P2 (fix before next sprint) | 11 |
| P3 (fix when convenient) | 5 |
| Archive | 6 |
| Delete | 1 |
| New documents to create | 6 |

---

*Version 1.0 — 2026-05-16 — Recommendations only. No documentation changed in this file.*
