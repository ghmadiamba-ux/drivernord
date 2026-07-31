import { db } from './db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactApprovalItem {
  action_id:       string;
  created_at:      string;
  // from contact_suggested action.input
  driver_id:       string;
  match_score:     number;
  first_name:      string;
  phone:           string;
  message:         string;
  company_name:    string;
  urgency:         string;
  company_need_id: string;
  shortlist_id:    string;
  // enriched from ingested_drivers
  license:         string | null;
  ykb:             string | null;
  region:          string | null;
  availability:    string | null;
  domain:          string | null;
  email:           string | null;
  // safety flags
  has_quality_issue: boolean;
  has_duplicate:     boolean;
}

// ─── Queue fetch ──────────────────────────────────────────────────────────────

export async function getContactApprovalQueue(): Promise<ContactApprovalItem[]> {
  const { data: actions, error: actErr } = await db
    .from('system_actions')
    .select('id, input, created_at, target_id')
    .eq('action_type', 'contact_suggested')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (actErr) throw new Error(`contactApproval: fetch actions failed: ${actErr.message}`);
  if (!actions || actions.length === 0) return [];

  const rows = actions as Record<string, unknown>[];

  const driverIds = [
    ...new Set(
      rows
        .map((a) => ((a.input ?? {}) as Record<string, unknown>).driver_id as string)
        .filter(Boolean),
    ),
  ];

  if (driverIds.length === 0) return [];

  // Fetch driver details, quality flags, and duplicate flags in parallel
  const [driversRes, qualityRes, dupRes] = await Promise.all([
    db
      .from('ingested_drivers')
      .select('id, license, ykb, region, availability, domain, email')
      .in('id', driverIds),
    db
      .from('system_actions')
      .select('target_id')
      .eq('action_type', 'data_quality_issue')
      .in('target_id', driverIds),
    db
      .from('system_actions')
      .select('input')
      .eq('action_type', 'driver_duplicate_detected'),
  ]);

  if (driversRes.error) throw new Error(`contactApproval: fetch drivers failed: ${driversRes.error.message}`);

  const driverMap = new Map<string, Record<string, unknown>>();
  for (const d of (driversRes.data ?? [])) {
    const r = d as Record<string, unknown>;
    driverMap.set(r.id as string, r);
  }

  const qualityDriverIds = new Set(
    (qualityRes.data ?? []).map((a) => (a as Record<string, unknown>).target_id as string),
  );

  // Collect phones that have had a duplicate warning
  const inputPhones = new Set(
    rows.map((a) => ((a.input ?? {}) as Record<string, unknown>).phone as string).filter(Boolean),
  );
  const duplicatePhones = new Set<string>();
  for (const da of (dupRes.data ?? [])) {
    const inp = ((da as Record<string, unknown>).input ?? {}) as Record<string, unknown>;
    const ph = inp.phone as string | undefined;
    if (ph && inputPhones.has(ph)) duplicatePhones.add(ph);
  }

  return rows.map((a) => {
    const input    = (a.input ?? {}) as Record<string, unknown>;
    const driverId = (input.driver_id as string) ?? '';
    const phone    = (input.phone    as string) ?? '';
    const driver   = driverMap.get(driverId) ?? {};

    return {
      action_id:       a.id        as string,
      created_at:      a.created_at as string,
      driver_id:       driverId,
      match_score:     (input.match_score    as number) ?? 0,
      first_name:      (input.first_name     as string) ?? '',
      phone,
      message:         (input.message        as string) ?? '',
      company_name:    (input.company_name   as string) ?? '',
      urgency:         (input.urgency        as string) ?? '',
      company_need_id: (input.company_need_id as string) ?? '',
      shortlist_id:    (input.shortlist_id   as string) ?? '',
      license:         (driver.license       as string) ?? null,
      ykb:             (driver.ykb           as string) ?? null,
      region:          (driver.region        as string) ?? null,
      availability:    (driver.availability  as string) ?? null,
      domain:          (driver.domain        as string) ?? null,
      email:           (driver.email         as string) ?? null,
      has_quality_issue: qualityDriverIds.has(driverId),
      has_duplicate:     duplicatePhones.has(phone),
    };
  });
}
