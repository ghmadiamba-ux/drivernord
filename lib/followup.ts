import type { LeadStatus, Ykb, Availability, FollowUpReason } from '../types/lead';

export interface ComputeFollowUpInput {
  lead_status: LeadStatus;
  phone: string | null;
  availability: Availability | null;
  ykb: Ykb | null;
  created_at: Date;
}

export interface FollowUpResult {
  follow_up_at: Date | null;
  follow_up_reason: FollowUpReason | null;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function computeFollowUp(input: ComputeFollowUpInput): FollowUpResult {
  const candidates: { at: Date; reason: FollowUpReason }[] = [];

  if (input.lead_status === 'incomplete_lead' && input.phone) {
    candidates.push({ at: addHours(input.created_at, 24), reason: 'incomplete_lead' });
  }

  if (input.availability === 'not_yet') {
    candidates.push({ at: addDays(input.created_at, 30), reason: 'not_yet_available' });
  }

  if (input.ykb === 'in_progress') {
    candidates.push({ at: addDays(input.created_at, 60), reason: 'ykb_in_progress' });
  }

  if (candidates.length === 0) return { follow_up_at: null, follow_up_reason: null };

  candidates.sort((a, b) => a.at.getTime() - b.at.getTime());
  return { follow_up_at: candidates[0].at, follow_up_reason: candidates[0].reason };
}
