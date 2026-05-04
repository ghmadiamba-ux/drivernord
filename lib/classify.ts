import type { License, Region, Relocate, Ykb, Availability, LeadStatus, LeadPriority } from '../types/lead';

export interface ClassifyInput {
  license: License | null;
  phone: string | null;
  last_step_reached: number;
  region: Region | null;
  relocate: Relocate | null;
  ykb: Ykb | null;
  availability: Availability | null;
}

export function classifyStatus(input: ClassifyInput): LeadStatus {
  if (input.license === 'none') return 'disqualified';
  if (!input.phone) return 'anonymous_dropoff';
  if (input.last_step_reached >= 7) return 'ready_for_ingestion';
  return 'incomplete_lead';
}

export function classifyPriority(input: ClassifyInput): LeadPriority | null {
  const status = classifyStatus(input);
  if (status === 'disqualified' || status === 'anonymous_dropoff') return null;

  // Explicitly unwilling to relocate and not in Stockholm
  if (input.region !== 'stockholm' && input.relocate === 'no') return 'LOW';

  // Reachable = based in Stockholm or willing to work there temporarily
  const reachable = input.region === 'stockholm' || input.relocate === 'yes';

  if (
    reachable &&
    input.ykb === 'valid' &&
    (input.availability === 'now' || input.availability === '2_weeks')
  ) return 'HIGH';

  return 'MEDIUM';
}
