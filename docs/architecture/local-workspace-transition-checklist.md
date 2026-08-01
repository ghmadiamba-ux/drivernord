# Local Workspace Transition Checklist

**Date:** 2026-08-01
**Purpose:** Habits to follow going forward now that DriverNord's canonical root has moved.

---

- [ ] Open Claude Code sessions from `C:\PROJECT\DriverNord`, not the old path.
- [ ] Open VS Code (or any editor) from `C:\PROJECT\DriverNord`.
- [ ] Run all `npm` commands (`npm install`, `npm test`, `npm run build`, `npm run dev`) only from `C:\PROJECT\DriverNord`.
- [ ] Do not edit code in the old backup root (`C:\Users\Adam8\driver -acquisition-agent\agent-1`) — it has an independent Git history that will silently diverge if committed to.
- [ ] Do not deploy until explicitly requested by the founder — this checklist does not authorize a deploy.
- [ ] Migration authority remains unresolved — do not commit or apply `migrations/013–019` or `supabase/migrations/013000–028000` until production DB state is confirmed (see `docs/architecture/migration-reconciliation-report.md`).

## What was already fixed

Stale references to the old working root (`C:\Users\Adam8\driver -acquisition-agent\agent-1` and the implied nested `agent-1/` subfolder that no longer exists) were corrected in `CLAUDE.md`, `docs/current/architecture-context.md`, `docs/current/claude-code-operating-rules.md`, `docs/current/documentation-synchronization-report.md`, `docs/business/b2b-import-staging-checklist.md`, and several other operational docs and prompt templates — see this session's commit for the full file list.

The historical audit `docs/audits/project-audit-v2.md` was left with its dated file-path citations intact (it's a frozen snapshot report) but got a note at the top pointing to the new root.

## What was intentionally left unchanged

`app/admin/cockpit/page.tsx:1809` still displays a UI string referencing `agent-1/docs/sql/...` — this is application code (a rendered instruction string in the admin cockpit), not a documentation or config reference, so it was out of scope for this pass. It should be fixed as a small code change, reviewed and tested like any other code edit, not bundled into a docs-only commit.
