# Sensitive Data Holdback Report

**Date:** 2026-07-31
**Status:** Complete. 128 files relocated, 0 deleted, 0 committed.

---

## What happened

128 files previously classified as "excluded" or "founder review" across the last several audits (contact/prospect data, outreach queues, SMTP/Zoho send trackers, DNS/domain verification logs, Meta/Facebook security and configuration docs, and migration-recovery docs tied to the unresolved migration question) were **moved** — not copied, not deleted — from their original locations under `docs/business/` and `docs/archive/` into a new `docs/private-holdback/` tree that mirrors their original relative structure.

`docs/private-holdback/` was added to `.gitignore`, so nothing inside it can be accidentally staged or committed going forward.

## Why moved instead of left in place

The previous checkpoint commit (`28808cb`) already excluded these files from Git via careful `git add` pathspecs. Moving them physically into a dedicated, gitignored folder makes that exclusion **structural** rather than dependent on remembering a long exclusion list every time `docs/business/` is touched — a future `git add docs/business/` will no longer risk sweeping in sensitive content, because it's no longer there.

## Why moved instead of deleted

Nothing was deleted. All 128 files remain on local disk, fully intact, at their new path under `docs/private-holdback/`. This is reversible: any file can be moved back if the founder decides it should be committed after review.

## Full list of relocated folders/files

**Whole folders:**
- `docs/business/outreach-agent/` → `docs/private-holdback/business/outreach-agent/`
- `docs/business/prospecting/` → `docs/private-holdback/business/prospecting/`
- `docs/business/agency-partnership/national-bemanning-partnership-database/` → `docs/private-holdback/business/agency-partnership/national-bemanning-partnership-database/`
- `docs/business/email-setup/` → `docs/private-holdback/business/email-setup/`
- `docs/business/meta-acquisition-integration/` → `docs/private-holdback/business/meta-acquisition-integration/`
- `docs/business/market-entry-research/ai-public-data-validation/` → `docs/private-holdback/business/market-entry-research/ai-public-data-validation/`
- `docs/business/current-state/` → `docs/private-holdback/business/current-state/`
- `docs/archive/driver-acquisition-pre-meta-technical-readiness/` → `docs/private-holdback/archive/driver-acquisition-pre-meta-technical-readiness/`

**Individual files:**
- `pilot-company-contact-table-v1.csv` / `.md`
- `company-needs-refresh-national-scan-v1.csv` / `.md`
- `enskede-bilexpress-first-contact-strategy.md`
- `market-entry-research/competitor-and-model-database.csv`
- `market-entry-research/qualified-lead-model/qualified-lead-pricing-database.csv`
- `jpc-first-company-need-promotion-and-matching-v1.md`
- `first-promoted-company-need-and-pilot-matching-v1.md`
- `top-5-company-need-pilot-cases-v1.md`
- `campaign-live-system-check-v1.md`
- `privacy-and-tracking-consent/meta-pixel-production-activation-gates.md`
- `google-drive-operational-guide.md`
- `production-migration-recovery-execution-v1.md`
- `production-migration-recovery-plan-v1.md`
- `production-recovery-chat-fix.md`
- `final-migration-013-execution.md`
- `project-audit/driverNord-current-state.json`

## What was NOT moved

- **Migration files** (`migrations/013–019`, `supabase/migrations/013000–028000`) — left in place, untracked, pending the reconciliation described in `docs/architecture/migration-reconciliation-report.md`. These aren't "sensitive," they're "unresolved."
- **Outreach execution scripts** (`scripts/contact_agent_smtp_runner.py`, `scripts/send_driverNord_smtp_batch.py`, `scripts/send_wave1_phase1_prospecting.py`, `scripts/record-outreach-sent-2026-06-24.ts`, `scripts/sim-*.json`) — left in place, untracked. These are code/generated-output, not documents, and were out of scope for this document-focused holdback pass. They remain excluded from any commit by not being staged, same as before.

## Result

`git status` on the working tree now shows only two categories of untracked content: the 19 unresolved migration files and the 6 outreach scripts. Everything else is either committed or safely relocated to the ignored holdback area.
