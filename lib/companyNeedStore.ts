import { randomUUID } from 'node:crypto';
import { db } from './db';
import type {
  Company,
  CompanyNeed,
  CompanyLicense,
  ShiftType,
  Urgency,
  CompanyNeedStatus,
} from './companyNeed';
import type { Domain, Region } from '../types/lead';

// ─── CompanyNeedRow ───────────────────────────────────────────────────────────

// Persisted shape — maps directly to the company_needs table (migration 003).
// id, company_id, and created_at are assigned at insert time.
export interface CompanyNeedRow {
  id:                 string;
  company_id:         string;
  created_at:         Date;
  license_required:   CompanyLicense;
  domain_required:    Domain;
  domain_preferred:   Domain[];
  location_region:    Region;
  relocation_allowed: boolean;
  shift_type:         ShiftType;
  urgency:            Urgency;
  status:             CompanyNeedStatus;
}

// ─── Timestamp helper ─────────────────────────────────────────────────────────

function toRequiredDate(value: unknown, field: string): Date {
  if (!value || typeof value !== 'string') {
    throw new Error(`companyNeedStore: missing required timestamp "${field}"`);
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`companyNeedStore: invalid timestamp for "${field}": ${value}`);
  }
  return d;
}

// ─── Row conversion ───────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function companyNeedFromRow(row: Row): CompanyNeedRow {
  return {
    id:                 row.id as string,
    company_id:         row.company_id as string,
    created_at:         toRequiredDate(row.created_at, 'created_at'),
    license_required:   row.license_required as CompanyLicense,
    domain_required:    row.domain_required as Domain,
    domain_preferred:   (row.domain_preferred ?? []) as Domain[],
    location_region:    row.location_region as Region,
    relocation_allowed: row.relocation_allowed as boolean,
    shift_type:         row.shift_type as ShiftType,
    urgency:            row.urgency as Urgency,
    status:             row.status as CompanyNeedStatus,
  };
}

// ─── Store functions ──────────────────────────────────────────────────────────

export async function createCompany(name: string): Promise<Company> {
  const company: Company = {
    id:         randomUUID(),
    name,
    created_at: new Date(),
  };

  const { error } = await db.from('companies').insert({
    id:         company.id,
    name:       company.name,
    created_at: company.created_at.toISOString(),
  });

  if (error) throw new Error(`companyNeedStore.createCompany failed: ${error.message}`);

  return company;
}

export async function createCompanyNeed(
  companyId: string,
  need:      CompanyNeed,
): Promise<CompanyNeedRow> {
  const row: CompanyNeedRow = {
    id:                 randomUUID(),
    company_id:         companyId,
    created_at:         new Date(),
    license_required:   need.license_required,
    domain_required:    need.domain_required,
    domain_preferred:   need.domain_preferred,
    location_region:    need.location_region,
    relocation_allowed: need.relocation_allowed,
    shift_type:         need.shift_type,
    urgency:            need.urgency,
    status:             need.status,
  };

  const { error } = await db.from('company_needs').insert({
    id:                 row.id,
    company_id:         row.company_id,
    created_at:         row.created_at.toISOString(),
    license_required:   row.license_required,
    domain_required:    row.domain_required,
    domain_preferred:   row.domain_preferred,
    location_region:    row.location_region,
    relocation_allowed: row.relocation_allowed,
    shift_type:         row.shift_type,
    urgency:            row.urgency,
    status:             row.status,
  });

  if (error) throw new Error(`companyNeedStore.createCompanyNeed failed: ${error.message}`);

  return row;
}

export async function getOpenCompanyNeeds(): Promise<CompanyNeedRow[]> {
  const { data, error } = await db
    .from('company_needs')
    .select('*')
    .eq('status', 'open');

  if (error) throw new Error(`companyNeedStore.getOpenCompanyNeeds failed: ${error.message}`);
  if (!data)  return [];

  return (data as Row[]).map(companyNeedFromRow);
}
