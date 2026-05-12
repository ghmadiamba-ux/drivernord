-- 003_create_companies_and_company_needs.sql
--
-- Creates the companies lookup table and the company_needs table.
-- A company_need is one open staffing requirement from a client.
-- The matching engine scores all ingested_drivers against each open need.
--
-- Source of truth: lib/companyNeedStore.ts, lib/companyNeed.ts
-- CHECK values mirror the constants in lib/companyNeed.ts exactly.

CREATE TABLE IF NOT EXISTS companies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_needs (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID        NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ── Requirement fields ────────────────────────────────────────────
  -- 'none' is excluded — a need cannot require no license.
  license_required   TEXT        NOT NULL
                                 CHECK (license_required IN ('C', 'CE', 'D', 'C+D', 'CE+D')),

  domain_required    TEXT        NOT NULL
                                 CHECK (domain_required IN (
                                   'tipp', 'kran', 'kylfrys', 'silo', 'flatbed', 'tanker',
                                   'ekipage', 'schakt_bygg', 'distribution', 'livsmedelskyla',
                                   'avfall', 'skogstransport', 'adr', 'fjarrtransport', 'budtransport'
                                 )),

  -- Array of secondary domain tags; element values validated at application layer.
  -- Invariant enforced by validateCompanyNeedInput: must not include domain_required.
  domain_preferred   TEXT[]      NOT NULL DEFAULT '{}',

  location_region    TEXT        NOT NULL
                                 CHECK (location_region IN ('stockholm', 'other_sweden', 'abroad')),

  relocation_allowed BOOLEAN     NOT NULL DEFAULT false,

  shift_type         TEXT        NOT NULL
                                 CHECK (shift_type IN ('day', 'night', 'weekend', 'flexible')),

  urgency            TEXT        NOT NULL DEFAULT 'standard'
                                 CHECK (urgency IN ('standard', 'urgent', 'emergency')),

  -- ── Lifecycle ────────────────────────────────────────────────────
  status             TEXT        NOT NULL DEFAULT 'open'
                                 CHECK (status IN ('open', 'closed'))
);

-- Matching engine fetches all open needs; partial index keeps this fast.
CREATE INDEX IF NOT EXISTS idx_company_needs_open
  ON company_needs (created_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_company_needs_company_id
  ON company_needs (company_id);
