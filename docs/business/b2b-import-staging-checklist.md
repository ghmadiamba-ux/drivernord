# B2B Target Import — Staging Checklist

**Purpose:** Step-by-step checklist for safely importing the 10 B2B research targets into a
non-production database. Do not execute any step marked ⛔ against the production Supabase project.

---

## ⛔ CRITICAL WARNING

**NEVER run `B2B_IMPORT_CONFIRM=true` against the production SUPABASE_URL.**

The production URL pattern is `https://<project-ref>.supabase.co`. Before every step that touches
the database, confirm the active URL matches your staging or local target (see Step 2 below).

No agents, no outreach, no matching runs, and no `company_needs` rows are created by this import.
The import writes only to `company_research_targets`. Verify this before proceeding.

---

## Environment options

Two safe environments are supported. Choose one.

### Option A — Local Supabase (preferred)

Runs entirely on your machine using Docker. No cloud project needed. No billing. Safe by default.

**Prerequisites:**
- Docker Desktop installed and running (`docker --version` and `docker info` must succeed)
- Supabase CLI installed (`supabase --version` — currently confirmed v2.98.2 in this project)

**Setup:**

`supabase init` has already been run — `supabase/` and `supabase/migrations/` exist with all 12
migrations staged. `.env.local.supabase-local` already contains the default local credentials.

The only remaining step is starting Docker and the local containers:

```bash
# From the project root (supabase init already done — skip it)
supabase start         # pulls images and starts local containers (~1–2 min first run)
supabase db push --local   # applies all 12 staged migrations
```

`supabase start` prints connection details. The defaults are pre-filled in `.env.local.supabase-local`:
- `SUPABASE_URL=http://127.0.0.1:54321`
- `SUPABASE_SERVICE_ROLE_KEY=<the well-known local default — already in file>`

**Stop local DB when done:**

```bash
supabase stop
```

### Option B — Supabase staging cloud project

Create a separate free Supabase cloud project (app.supabase.com → New project). Use its credentials
in `.env.local.staging`. Never use the same project reference as production.

**Confirm the staging project reference is different from production:**

```bash
# Both commands run from the project root
grep SUPABASE_URL .env.local          # production — must NOT use this
grep SUPABASE_URL .env.local.staging  # staging — use this for import
```

The two `SUPABASE_URL` values must be different project refs. If they match, stop immediately.

---

## Step 0 — Confirm CSV is clean

The CSV has been pre-validated. Run dry-run one more time to confirm no regressions:

```bash
cd C:\PROJECT\DriverNord
npx tsx scripts/import-b2b-targets.ts
```

Expected: `Parsed 10 rows from CSV.` + `Dry run complete. No rows written.` No errors.

Known data notes (already handled by import script):
- `decision_maker_role = "CEO"` for Haninge Åkeri and Enskede Bilexpress → mapped to `"VD"` by script
- `decision_maker_name = "not_found"` for Thermobud → stored as `null` by script
- `linkedin_url` for Enskede Bilexpress → `not_found` (previously had wrong company's URL — fixed 2026-05-10)

---

## Step 1 — Prerequisites checklist

Before touching the database:

- [ ] Docker is running (Option A only): `docker info` succeeds
- [ ] Supabase CLI is installed: `supabase --version`
- [ ] Local Supabase started (Option A): `supabase start` completed without error
- [ ] `.env.local.staging` file exists with non-production credentials
- [ ] Staging `SUPABASE_URL` confirmed to be `localhost`/`127.0.0.1` (Option A) or a different cloud project ref (Option B)
- [ ] Node.js and `npx tsx` available: `npx tsx --version` succeeds

---

## Step 2 — Confirm DB target is NOT production

Run this before every database operation:

```bash
# Print the SUPABASE_URL from staging env (value should be localhost or a staging project ref)
grep SUPABASE_URL .env.local.staging

# Compare against production (these two lines must NOT produce the same URL)
grep SUPABASE_URL .env.local
grep SUPABASE_URL .env.local.staging
```

If the URLs are identical: **stop, do not proceed**.

---

## Step 3 — Apply migrations 008–012 to staging DB

Migrations must be applied in strict dependency order. Each is idempotent (`CREATE TABLE IF NOT EXISTS`,
`CREATE INDEX IF NOT EXISTS`) — safe to re-run.

**Order and dependencies:**

| # | File | Depends on |
|---|---|---|
| 1 | `migrations/008_create_company_research_targets.sql` | `companies` (migration 003) |
| 2 | `migrations/009_create_company_outreach_actions.sql` | `company_research_targets` (008) |
| 3 | `migrations/010_create_pilot_company_relationships.sql` | `company_research_targets` (008), `companies` (003) |
| 4 | `migrations/011_create_company_need_drafts.sql` | `company_research_targets` (008), `pilot_company_relationships` (010), `company_needs` (migration 006) |
| 5 | `migrations/012_create_b2b_agent_warnings.sql` | all four above |

**For Option A (local Supabase):**

Supabase CLI manages migrations from `supabase/migrations/`. Copy or symlink the SQL files there,
then push:

```bash
cd C:\PROJECT\DriverNord
mkdir -p supabase/migrations
cp migrations/001_*.sql supabase/migrations/
# ... repeat for all 12 migrations in numbered order
supabase db push --local
```

Or apply directly via psql (local DB credentials printed by `supabase start`):

```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f migrations/008_create_company_research_targets.sql \
  -f migrations/009_create_company_outreach_actions.sql \
  -f migrations/010_create_pilot_company_relationships.sql \
  -f migrations/011_create_company_need_drafts.sql \
  -f migrations/012_create_b2b_agent_warnings.sql
```

**For Option B (staging cloud):**

Apply via Supabase Studio SQL editor (staging project dashboard → SQL Editor) or via the CLI
targeting the staging project:

```bash
supabase db push --project-ref <staging-project-ref>
```

**Verify tables exist after migration:**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'company_research_targets',
    'company_outreach_actions',
    'pilot_company_relationships',
    'company_need_drafts',
    'b2b_agent_warnings'
  );
-- Expected: 5 rows
```

---

## Step 4 — Swap env to staging

```bash
# Back up production env (do not delete it)
cp .env.local .env.local.production.bak

# Activate local env
cp .env.local.supabase-local .env.local
```

After import is complete, restore production env (Step 7).

---

## Step 5 — Dry-run one final time against staging env

Confirm the script still reads correctly with staging credentials loaded:

```bash
cd C:\PROJECT\DriverNord
npx tsx scripts/import-b2b-targets.ts
```

Expected: `Parsed 10 rows from CSV.` + `Dry run complete. No rows written.`

If this prints DB errors, stop — the staging DB is not correctly configured.

---

## Step 6 — Run confirmed import

⛔ Only after all checks above pass:

```bash
cd C:\PROJECT\DriverNord
B2B_IMPORT_CONFIRM=true npx tsx scripts/import-b2b-targets.ts
```

Expected output:
```
Parsed 10 rows from CSV.
  [OK]   Canoil Transport AB
  [OK]   Transportfirma Trabé - Börje Ericson AB
  [OK]   Edvardssons Last och Schakt AB
  [OK]   Haninge Åkeri AB
  [OK]   JPC Entreprenad AB
  [OK]   Enskede Bilexpress AB
  [OK]   Sjölander Maskintransport AB (S. Edvin Sjölander & Co AB)
  [OK]   Thermobud AB
  [OK]   Alexis Bud & Transport AB
  [OK]   Kyl- och Frysexpressen Mälardalen AB

Import complete. 10 rows processed.
```

Any `[ERROR]` line means a constraint or connection failure. See troubleshooting below.

---

## Step 7 — Verify rows in DB

**SQL verification:**

```sql
SELECT company_name, research_status, pilot_accessibility_score, barrier_level
FROM company_research_targets
ORDER BY pilot_accessibility_score DESC NULLS LAST;
-- Expected: 10 rows, all research_status = 'enriched'
```

**Check no contamination of other tables:**

```sql
SELECT COUNT(*) FROM companies;         -- should be 0 (or unchanged from before import)
SELECT COUNT(*) FROM company_needs;     -- should be 0 (or unchanged from before import)
```

---

## Step 8 — Verify API endpoint

Start the dev server against the staging env:

```bash
cd C:\PROJECT\DriverNord
npm run dev
```

Then in another terminal or browser:

```bash
curl -s -H "x-recruiter-key: test-recruiter-key" \
  http://localhost:3000/api/recruiter/b2b/targets \
  | python3 -m json.tool | head -40
```

Expected: JSON with `targets` array (10 items) and `summary` object:
```json
{
  "targets": [ ... 10 rows ... ],
  "summary": {
    "total": 10,
    "enriched": 10,
    "scoredAbove70": 7,
    "withContact": 10,
    ...
  }
}
```

---

## Step 9 — Verify cockpit display

Open `http://localhost:3000/recruiter` in a browser.

- [ ] "B2B Research Registry" section is visible
- [ ] Summary badges show: Total=10, Enriched=10, Score≥70=7, w/Contact≥9
- [ ] Table shows top-10 companies, sorted by score descending
- [ ] Trabé (score 92) and Canoil (90) appear at or near the top
- [ ] No "Approve", "Send", or "Convert" buttons visible anywhere in the B2B section
- [ ] Label reads "Read-only — research targets only. No outreach, no agents, no company_needs."
- [ ] No B2B data visible in the main driver pipeline section

---

## Step 10 — Restore production env

```bash
cp .env.local.production.bak .env.local
```

Confirm restored:

```bash
grep SUPABASE_URL .env.local | grep -o "supabase\.co"
# Expected: supabase.co
```

---

## Rollback / cleanup

The import script uses `upsert(row, { onConflict: 'company_name' })`. To undo the import:

**Delete all imported rows from staging DB:**

```sql
DELETE FROM company_research_targets
WHERE company_name IN (
  'Canoil Transport AB',
  'Transportfirma Trabé - Börje Ericson AB',
  'Edvardssons Last och Schakt AB',
  'Haninge Åkeri AB',
  'JPC Entreprenad AB',
  'Enskede Bilexpress AB',
  'Sjölander Maskintransport AB (S. Edvin Sjölander & Co AB)',
  'Thermobud AB',
  'Alexis Bud & Transport AB',
  'Kyl- och Frysexpressen Mälardalen AB'
);
```

Or (Option A only) reset the entire local DB:

```bash
supabase db reset --local   # drops and re-applies all migrations; all data cleared
```

---

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `relation "company_research_targets" does not exist` | Migration 008 not applied | Apply migrations in order (Step 3) |
| `violates foreign key constraint "company_research_targets_…"` | Migrations 001–007 not applied to staging | Apply all migrations 001–012 |
| `invalid input value for enum` or `violates check constraint` | Unmapped CSV value reached DB | Re-run field validation script |
| `JWT expired` or `invalid API key` | Wrong SUPABASE_SERVICE_ROLE_KEY | Confirm `.env.local.staging` has the staging service role key |
| `connection refused` | Local Supabase not running | `supabase start` |
| `[ERROR] row: duplicate key value violates unique constraint` | Row already exists; `onConflict: 'company_name'` requires a UNIQUE index on `company_name` | Migration 008 does not enforce UNIQUE on `company_name` — the upsert will update existing rows, not error. If you see this, check migration was applied |

---

## Current environment status (as of 2026-05-10)

| Item | Status |
|---|---|
| `SUPABASE_URL` in `.env.local` | Production (`supabase.co`) — untouched |
| Local Supabase project (`supabase/`) | **Initialised** — `supabase init` complete |
| `supabase/migrations/` | **Ready** — all 12 migrations staged (001–012) |
| Docker | **Not installed** — hard blocker for `supabase start` |
| Supabase CLI | Installed (v2.98.2) |
| `.env.local.supabase-local` | **Created** — local defaults pre-filled |
| CSV dry-run | Passes (10 rows, 0 constraint violations) |
| CSV data fix | Applied — Enskede Bilexpress `linkedin_url` set to `not_found` |
| Import script constraint fixes | Applied — `CEO → VD`, `not_found → null` for `decision_maker_name` |

**Minimum action to unblock import (single prerequisite remaining):**

Install Docker Desktop, then run exactly these commands from the project root:

```bash
# 1. Start local Supabase (uses the pre-staged supabase/ config and migrations)
supabase start

# 2. Apply all migrations to local DB
supabase db push --local

# 3. Activate local env (back up production first)
cp .env.local .env.local.production.bak
cp .env.local.supabase-local .env.local

# 4. Verify URL is local before any DB write
grep SUPABASE_URL .env.local   # must show 127.0.0.1, not supabase.co

# 5. Dry-run (no writes)
npx tsx scripts/import-b2b-targets.ts

# 6. Confirmed import (local only)
B2B_IMPORT_CONFIRM=true npx tsx scripts/import-b2b-targets.ts

# 7. Restore production env
cp .env.local.production.bak .env.local
```
