# Current Working Root

**Status:** Locked. Effective 2026-08-01.

## Canonical root

```
C:\PROJECT\DriverNord
```

This is the only location where DriverNord development should happen from now on: commits, tests, builds, Claude Code sessions, and (when explicitly requested) deployments.

Verified state as of this lock:
- Branch: `main`
- Latest commit: `c4b94b3` — "docs: final reorganization report — Phases 1-6 complete"
- Remote: `origin` → `https://github.com/ghmadiamba-ux/drivernord.git`
- Vercel link: `.vercel/project.json` present (`projectName: agent-1`)
- Tests: 2663/2663 passing
- Build: production build succeeds

## Old location — backup only

```
C:\Users\Adam8\driver -acquisition-agent\agent-1
```

This is now a frozen backup as of commit `3d07994`. It must not receive new development work. It has its own independent `.git` history — committing there would silently diverge from the canonical root above. A warning marker (`README_DO_NOT_USE_OLD_ROOT.md`) has been placed there, uncommitted, as a local reminder.

## Still unresolved

- **Migration authority is unconfirmed.** Neither `migrations/` nor `supabase/migrations/` has been established as authoritative against the live production database. See `docs/architecture/migration-reconciliation-report.md`. Do not commit or apply migrations until this is resolved.
- **Production deployment remains prohibited** until explicitly requested by the founder. Nothing in this consolidation authorizes a deploy.
