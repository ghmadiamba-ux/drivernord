-- 002_add_domain_shift_preference_to_drivers.sql
--
-- Adds domain specialism and shift preference to the drivers table.
-- Separated from 001 so the conversation flow could be extended
-- (steps were added for domain/shift) without rebuilding the table.
--
-- Source of truth: types/lead.ts (Domain, ShiftPreference),
--                  lib/companyNeed.ts (comment references migration 002),
--                  lib/supabaseStore.ts (toRow / fromRow include both columns)

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS domain TEXT
    CHECK (domain IN (
      'tipp', 'kran', 'kylfrys', 'silo', 'flatbed', 'tanker',
      'ekipage', 'schakt_bygg', 'distribution', 'livsmedelskyla',
      'avfall', 'skogstransport', 'adr', 'fjarrtransport', 'budtransport'
    )),
  ADD COLUMN IF NOT EXISTS shift_preference TEXT
    CHECK (shift_preference IN ('day', 'night', 'weekend', 'flexible'));
