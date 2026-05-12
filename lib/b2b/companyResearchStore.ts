import { db } from '../db';
import {
  CompanyResearchTarget,
  B2BTargetSummary,
  ResearchStatus,
  BarrierLevel,
} from './types';

export async function getCompanyResearchTargets(): Promise<CompanyResearchTarget[]> {
  const { data } = await db
    .from('company_research_targets')
    .select('*')
    .order('pilot_accessibility_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  return (data ?? []) as CompanyResearchTarget[];
}

export async function getCompanyResearchTargetById(
  id: string,
): Promise<CompanyResearchTarget | null> {
  const { data } = await db
    .from('company_research_targets')
    .select('*')
    .eq('id', id)
    .single();
  return (data ?? null) as CompanyResearchTarget | null;
}

export function computeB2BTargetSummary(
  targets: CompanyResearchTarget[],
): B2BTargetSummary {
  const byStatus: Record<ResearchStatus, number> = {
    not_started: 0,
    researching:  0,
    enriched:     0,
    incomplete:   0,
    rejected:     0,
  };
  const byBarrier: Partial<Record<BarrierLevel, number>> = {};

  let scoredAbove70 = 0;
  let withContact   = 0;

  for (const t of targets) {
    byStatus[t.research_status] = (byStatus[t.research_status] ?? 0) + 1;

    if (t.barrier_level) {
      byBarrier[t.barrier_level] = (byBarrier[t.barrier_level] ?? 0) + 1;
    }

    if ((t.pilot_accessibility_score ?? 0) >= 70) scoredAbove70++;
    if (t.contact_email || t.linkedin_url) withContact++;
  }

  return {
    total:         targets.length,
    byStatus,
    byBarrier,
    enriched:      byStatus.enriched,
    scoredAbove70,
    withContact,
  };
}

export async function getB2BTargetSummary(): Promise<B2BTargetSummary> {
  const targets = await getCompanyResearchTargets();
  return computeB2BTargetSummary(targets);
}
