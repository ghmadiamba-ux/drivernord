# Database and Supabase Audit

**Audit date:** 2026-05-16
**Scope:** Database schema, migrations, production state, data integrity, security model
**Source:** Migration files 001–013 read directly. Production database state is unknown.

---

## Migration History

| Migration | Name | Key additions | Production status |
|-----------|------|---------------|-------------------|
| 001 | create_drivers | Core driver table | **Presumably applied** |
| 002 | add_domain_shift_preference | `domain`, `shift_preference` columns | **Presumably applied** |
| 003 | create_companies_and_company_needs | `companies`, `company_needs` tables | **Presumably applied** |
| 004 | create_ingested_drivers | `ingested_drivers` table | **Presumably applied** |
| 005 | create_shortlists | `shortlists`, `shortlist_entries` tables | **Presumably applied** |
| 006 | add_contact_workflow | Contact columns on shortlist_entries | **Presumably applied** |
| 007 | create_system_actions | `system_actions` audit log table | **Presumably applied** |
| 008 | create_company_research_targets | `company_research_targets` table | **Uncertain — may not be in production** |
| 009 | create_company_outreach_actions | `company_outreach_actions` table | **Uncertain** |
| 010 | create_pilot_company_relationships | `pilot_company_relationships` table | **Uncertain** |
| 011 | create_company_need_drafts | `company_need_drafts` table | **Uncertain** |
| 012 | create_b2b_agent_warnings | `b2b_agent_warnings` table | **Uncertain** |
| 013 | add_consent_and_attribution | Consent + UTM columns on drivers | **NOT applied to production** |

**Critical finding:** Migration 013 is confirmed NOT applied to production. This means the production `drivers` table is missing:
- `consent_registration_at`
- `consent_registration_version`
- `consent_scope`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `landing_page_url`, `referrer_url`

Any driver who registers through the production `/chat` today would complete the GDPR consent step but the consent record would silently fail to save. **This is a CRITICAL compliance gap.**

**Uncertain finding:** Migrations 008–012 (B2B tables) may or may not be in production. The project-state.md says "migration 013 ready for production" — implying 001–012 are already in production. But this should be verified, not assumed.

---

## Table Schema Summary

### `drivers` (primary table, all 13 migrations applied)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, auto-generated |
| created_at | TIMESTAMPTZ | Auto |
| completed_at | TIMESTAMPTZ | Set when chat completes |
| last_step_reached | INTEGER | Step index |
| lang | TEXT | 'sv' or 'en' |
| region | TEXT | 'stockholm', 'other_sweden', 'abroad' |
| relocate | TEXT | 'yes' or 'no' |
| license | TEXT | 'C', 'CE', 'D', 'C+D', 'CE+D', 'none' |
| ykb | TEXT | 'valid', 'expired', 'in_progress', 'none', 'unknown' |
| driver_card | TEXT | 'valid', 'expired', 'no', 'unknown' |
| availability | TEXT | 'now', '2_weeks', '1_month', 'not_yet' |
| first_name | TEXT | |
| phone | TEXT | Not normalized — no E.164 constraint |
| email | TEXT | |
| lead_status | TEXT | 'ready_for_ingestion', 'incomplete_lead', 'disqualified', 'anonymous_dropoff' |
| lead_priority | TEXT | 'HIGH', 'MEDIUM', 'LOW' |
| follow_up_sent | BOOLEAN | Default false |
| follow_up_at | TIMESTAMPTZ | |
| follow_up_reason | TEXT | |
| domain | TEXT | Added in migration 002 |
| shift_preference | TEXT | Added in migration 002 |
| consent_registration_at | TIMESTAMPTZ | Added in migration 013 — **NOT IN PRODUCTION** |
| consent_registration_version | TEXT | Added in migration 013 — **NOT IN PRODUCTION** |
| consent_scope | TEXT | Added in migration 013 — **NOT IN PRODUCTION** |
| utm_source | TEXT | Added in migration 013 — **NOT IN PRODUCTION** |
| utm_medium | TEXT | Added in migration 013 — **NOT IN PRODUCTION** |
| utm_campaign | TEXT | Added in migration 013 — **NOT IN PRODUCTION** |
| utm_content | TEXT | Added in migration 013 — **NOT IN PRODUCTION** |
| utm_term | TEXT | Added in migration 013 — **NOT IN PRODUCTION** |
| landing_page_url | TEXT | Added in migration 013 — **NOT IN PRODUCTION** |
| referrer_url | TEXT | Added in migration 013 — **NOT IN PRODUCTION** |

**Data quality issues:**
- `phone` is stored as raw TEXT with no E.164 format constraint. Normalization is mentioned in the architecture docs but not enforced at the database level.
- No unique constraint on `phone` — duplicate phone numbers are possible. The docs mention deduplication by phone normalization but this is not a DB constraint.

### `ingested_drivers`

- Copy of `drivers` row at the point of ingestion
- Contains `ingested_at` timestamp
- Key for matching pipeline — matching runs against this table, not `drivers`

### `companies` and `company_needs`

- `companies`: company profile (name, contact, type, size range)
- `company_needs`: specific hiring requirement linked to a company (license requirement, region, urgency, open/closed status)

### `shortlists` and `shortlist_entries`

- `shortlists`: links a company need to a set of drivers
- `shortlist_entries`: individual driver in a shortlist with score, contact status, approval status
- Migration 006 adds contact workflow columns: `contact_status`, `contact_sent_at`, `approved_by`, etc.

### `system_actions` (audit log)

- Every agent action is logged here
- Columns: `id`, `action_type`, `target_id`, `target_type`, `status`, `payload` (JSONB), `created_at`, `agent_id`
- **Not extended yet** with the new columns proposed in `state-management-and-audit.md` (`model_used`, `confidence_score`, `approved_by`, `pending_action_id`)

### B2B Tables (migrations 008–012)

| Table | Purpose | Implementation status |
|-------|---------|----------------------|
| `company_research_targets` | B2B company research pipeline | Implemented in lib/b2b/ |
| `company_outreach_actions` | Tracking outreach to companies | Implemented |
| `pilot_company_relationships` | Pilot client tracking | Implemented |
| `company_need_drafts` | Draft needs before founder approval | Implemented |
| `b2b_agent_warnings` | B2B agent anomaly alerts | Implemented |

**Issue (MEDIUM):** The B2B tables represent substantial implemented functionality that is not prominently documented in the current docs. The agent architecture documents treat company demand research as a Phase 2 feature, but migrations 008–012 suggest that B2B pipeline infrastructure was built earlier.

---

## Duplicate Migration Directory

Two directories contain identical migration files:

```
/migrations/001_create_drivers.sql
/supabase/migrations/00100000_create_drivers.sql
```

The `/supabase/migrations/` directory uses Supabase CLI timestamp-based naming. The `/migrations/` directory uses sequential naming.

**Recommendation (MEDIUM):**
- Designate `/supabase/migrations/` as canonical (it follows Supabase CLI conventions)
- Designate `/migrations/` as the "human-readable reference" or remove it after documenting the decision
- Add a note in CLAUDE.md clarifying which is canonical
- Never run migrations from both — this will cause duplicate constraint errors

---

## Database Indices

**From migration 001:**
- `idx_drivers_follow_up` on `follow_up_at` WHERE `follow_up_sent = false` AND `follow_up_at IS NOT NULL`
- `idx_drivers_lead_status` on `lead_status`

**From migration 013:**
- `idx_drivers_no_consent` on `created_at DESC` WHERE `consent_registration_at IS NULL AND lead_status = 'ready_for_ingestion'`

**Missing indices to consider (when database grows):**
- `drivers(phone)` — for deduplication check on registration
- `drivers(utm_content, lead_priority)` — for the UTM performance query used by the Creative Agent
- `system_actions(agent_id, created_at)` — for audit log queries by agent

---

## Security Model

### Row Level Security (RLS)

**Not implemented in reviewed migration files.** All access uses the service role key (`SUPABASE_SERVICE_ROLE_KEY`) which bypasses RLS.

**Assessment:** For a single-tenant system with a single founder, no RLS is acceptable. If multi-tenant or multi-user functionality is added (Phase 4+), RLS must be implemented before expansion.

### Service Role Key

All database operations use the service role key — this is documented in `lib/db.ts`. This key bypasses all Postgres RLS policies.

**Risk (MEDIUM):** If the service role key is ever exposed, it provides full database read/write access. The key must:
1. Never appear in client-side code (it doesn't — lib/db.ts is server-only)
2. Be in Vercel environment variables, not in any file
3. Be in `.gitignore` via `.env.local`

---

## Production vs. Local State

| Database | When used | Current data |
|----------|-----------|-------------|
| Local Supabase (127.0.0.1) | Development and testing | May have test data from simulations |
| Production Supabase (supabase.co) | Live application | Empty — no real drivers |

**Constraint from docs:** "NEVER use production Supabase (`supabase.co`) without explicit founder authorization. NEVER run `B2B_IMPORT_CONFIRM=true` unless `SUPABASE_URL` contains `127.0.0.1`."

---

## Recommended Actions

| Action | Priority | Who |
|--------|----------|-----|
| Apply migration 013 to production Supabase | CRITICAL | Founder |
| Verify migrations 008–012 are in production | HIGH | Founder |
| Confirm duplicate migration directory policy | MEDIUM | Claude Code |
| Add phone normalization constraint or function | MEDIUM | Claude Code |
| Add index on drivers(phone) | LOW | Claude Code (when data grows) |
| Document system_actions extension plan from state-management-and-audit.md | MEDIUM | Claude Code |
| Evaluate RLS readiness for Phase 4 | LOW | Future |

---

*Version 1.0 — 2026-05-16 — Audit only. No database changes. No production Supabase contact.*
