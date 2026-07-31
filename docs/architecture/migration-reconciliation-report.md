# Migration Reconciliation Report

**Date:** 2026-07-31
**Status:** Investigation complete. No migrations committed or executed. Founder decision required before any further migration action.

---

## Three migration locations found

| Location | Tracked in Git? | File count | Naming convention |
|---|---|---|---|
| `agent-1/migrations/` | `001`–`012` tracked, `013`–`019` untracked | 19 | Sequential (`NNN_description.sql`) |
| `agent-1/supabase/migrations/` | `00100000`–`01200000` and `02400000`–`02700000` tracked; `01300000`–`02300000` + `02800000` untracked | 28 | Supabase CLI timestamp-style (`NNNNNNNN_description.sql`) |
| `driver -acquisition-agent/supabase/migrations/` (parent, outside `agent-1`) | N/A — separate repo location entirely | 7 (`001`–`007`) | Sequential, stale duplicate of the earliest `agent-1/migrations/001-007` |

The parent-level copy is confirmed stale (predates everything, no unique content) and can be disregarded for reconciliation — it should not be merged, only left as historical residue or removed later at the founder's discretion.

## Key finding 1 — `001`–`012` are duplicates by content, both already committed

`supabase/migrations/00100000`–`01200000` are the *same* schema changes as `migrations/001`–`012`, renumbered into Supabase CLI format. Verified by comparing embedded header comments (e.g. `supabase/migrations/00100000_create_drivers.sql` still contains the original header `-- 001_create_drivers.sql`). Both sets are already committed to Git — this part of history is **not in conflict**, just duplicated across two conventions.

## Key finding 2 — number collision from `013` onward: NOT simple duplicates

Past `012`, the two folders diverge in content while reusing the same numeric prefixes. Verified by reading full file headers:

| Number | `migrations/` (sequential) | `supabase/migrations/` (CLI) |
|---|---|---|
| 013 | consent + attribution to drivers | consent + attribution to drivers (**match**) |
| 014 | extend company_need_drafts | extend company_need_drafts (**match**) |
| 015 | add need_type to company_needs | add need_type to company_needs (**match**) |
| 016 | **add `simulation` boolean to `ingested_drivers`** (filters synthetic test drivers from shortlists) | **extend `pilot_company_relationships`** (new outreach-tracker statuses, `do_not_contact_reason`, email timestamps) |
| 017 | extend system_actions for market agent | **create `logistikklubb_scheduled_posts`** table |
| 018 | extend system_actions contact/draft | **create `agency_posting_signals`** table |
| 019 | extend system_actions logistikklubb/founders | **add bemanning consent to drivers** |
| 020–023 | *(does not exist)* | news relay, fix system_actions constraints, extend agency signals, hold-agency drafts |
| 024–027 | *(does not exist)* | content_campaign_cards, content_memory, content-engine system_actions extension, visual_plan (**already committed**) |
| 028 | *(does not exist)* | **create `content_facebook_publish_queue`** (**untracked**) |

This is not one history superseding the other — from `016` onward the two folders contain **genuinely different, non-overlapping schema changes that happen to share numbers by coincidence**, not by design.

## Key finding 3 — both tracks are required by already-committed application code

- `lib/ingestedDriverStore.ts:129` calls `.eq('simulation', false)` — this only works if `migrations/016` (the sequential-folder version) has been applied.
- `lib/logistikklubbSchedule.ts` references the `logistikklubb_scheduled_posts` table — this only works if `supabase/migrations/01700000` has been applied.
- `lib/content/facebookPublishQueue.ts` references `content_facebook_publish_queue` — this only works if `supabase/migrations/02800000` has been applied.

**Conclusion: neither folder can be discarded. Both contain schema changes the current, already-committed production code depends on.** A clean reconciled history must incorporate all of it, de-duplicated and correctly ordered — not a pick-one-folder decision.

## Key finding 4 — likely operational gap in production

`docs/business/final-migration-013-execution.md` shows migrations have historically been applied **manually via the Supabase SQL editor**, guided by "execution package" docs and matching scripts in `docs/sql/` (`apply-migration-016-pilot-outreach.sql`, `apply-migration-017.sql`, `apply-migration-018.sql`, `apply-migration-019.sql`, `apply-migrations-008-015.sql`).

**No equivalent apply-script exists for the `020000`–`028000` range** (news relay, content-engine tables, Facebook publish queue). This is a gap, not a confirmation either way — it means there is no documentary evidence in this repo that those five migrations (including the one `lib/content/facebookPublishQueue.ts` depends on) were ever run against production. **This must be confirmed directly against the live Supabase project before relying on the Facebook publishing or content-engine features in production**, independent of any Git consolidation work.

## Recommendation

1. **Do not commit any migration file yet** — consistent with the prior safety checks.
2. **Founder must confirm, directly in the Supabase dashboard (Table Editor or SQL history), whether `logistikklubb_scheduled_posts`, `agency_posting_signals`, `content_campaign_cards`, and `content_facebook_publish_queue` actually exist in the live production database.** This is the single fact that resolves most of this ambiguity and cannot be determined from local files alone.
3. Once confirmed, the reconciled migration history should be built by taking the **union** of all real schema changes (both folders' unique content), renumbered into one sequential, non-colliding series — not by choosing one folder over the other.
4. `migrations/013–019` and `supabase/migrations/013000–028000` (currently untracked) should remain untracked until that union/renumbering exercise is done and founder-approved.
5. The parent-level `driver -acquisition-agent/supabase/migrations/001-007` can be safely ignored/archived — it has no unique content.

No migrations were executed, modified, moved, or committed in the course of producing this report.
