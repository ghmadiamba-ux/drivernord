import type {
  Lead, Region, Relocate, License, Ykb, DriverCard, Availability,
  Domain, ShiftPreference,
} from '../types/lead';
import { classifyStatus, classifyPriority } from './classify';
import { computeFollowUp } from './followup';
import { getNextStep, getStepIndex, type StepId } from './conversation';

export type ApplyStepError = 'missing_answer' | 'invalid_answer';

export type ApplyStepResult =
  | { ok: true; lead: Lead; next_step: StepId | null }
  | { ok: false; error: ApplyStepError };

type ApplyAnswerResult = { lead: Lead } | { error: ApplyStepError };

function applyAnswer(lead: Lead, step: StepId, answer: string | null): ApplyAnswerResult {
  switch (step) {
    case 'region': {
      if (!answer) return { error: 'missing_answer' };
      if (!['stockholm', 'other_sweden', 'abroad'].includes(answer)) return { error: 'invalid_answer' };
      return { lead: { ...lead, region: answer as Region } };
    }
    case 'relocate': {
      if (!answer) return { error: 'missing_answer' };
      if (!['yes', 'no'].includes(answer)) return { error: 'invalid_answer' };
      return { lead: { ...lead, relocate: answer as Relocate } };
    }
    case 'license': {
      if (!answer) return { error: 'missing_answer' };
      if (!['C', 'CE', 'D', 'C+D', 'CE+D', 'none'].includes(answer)) return { error: 'invalid_answer' };
      return { lead: { ...lead, license: answer as License } };
    }
    case 'ykb': {
      if (!answer) return { error: 'missing_answer' };
      if (!['valid', 'expired', 'in_progress', 'none', 'unknown'].includes(answer)) return { error: 'invalid_answer' };
      return { lead: { ...lead, ykb: answer as Ykb } };
    }
    case 'driver_card': {
      if (!answer) return { error: 'missing_answer' };
      if (!['valid', 'expired', 'no', 'unknown'].includes(answer)) return { error: 'invalid_answer' };
      return { lead: { ...lead, driver_card: answer as DriverCard } };
    }
    case 'domain': {
      if (!answer) return { error: 'missing_answer' };
      if (answer === 'skip') return { lead: { ...lead, domain: null } };
      const DOMAINS: Domain[] = [
        'tipp','kran','kylfrys','silo','flatbed','tanker','ekipage',
        'schakt_bygg','distribution','livsmedelskyla','avfall',
        'skogstransport','adr','fjarrtransport','budtransport',
      ];
      if (!DOMAINS.includes(answer as Domain)) return { error: 'invalid_answer' };
      return { lead: { ...lead, domain: answer as Domain } };
    }
    case 'availability': {
      if (!answer) return { error: 'missing_answer' };
      if (!['now', '2_weeks', '1_month', 'not_yet'].includes(answer)) return { error: 'invalid_answer' };
      return { lead: { ...lead, availability: answer as Availability } };
    }
    case 'shift_preference': {
      if (!answer) return { error: 'missing_answer' };
      if (answer === 'skip') return { lead: { ...lead, shift_preference: null } };
      if (!(['day', 'night', 'weekend', 'flexible'] as ShiftPreference[]).includes(answer as ShiftPreference)) return { error: 'invalid_answer' };
      return { lead: { ...lead, shift_preference: answer as ShiftPreference } };
    }
    case 'phone': {
      if (!answer) return { error: 'missing_answer' };
      return { lead: { ...lead, phone: answer } };
    }
    case 'email': {
      return { lead: { ...lead, email: answer } };
    }
    case 'name': {
      if (!answer) return { error: 'missing_answer' };
      return { lead: { ...lead, first_name: answer } };
    }
    case 'confirmation': {
      return { lead };
    }
    default:
      return { error: 'invalid_answer' };
  }
}

export function applyStep(lead: Lead, step: StepId, answer: string | null): ApplyStepResult {
  const applied = applyAnswer(lead, step, answer);
  if ('error' in applied) return { ok: false, error: applied.error };

  const idx = getStepIndex(step);
  const withProgress: Lead = {
    ...applied.lead,
    last_step_reached: idx >= 0
      ? Math.max(lead.last_step_reached, idx)
      : lead.last_step_reached,
  };

  const classifyInput = {
    license: withProgress.license,
    phone: withProgress.phone,
    last_step_reached: withProgress.last_step_reached,
    region: withProgress.region,
    relocate: withProgress.relocate,
    ykb: withProgress.ykb,
    availability: withProgress.availability,
  };

  const lead_status = classifyStatus(classifyInput);
  const lead_priority = classifyPriority(classifyInput);

  const completed_at =
    lead_status === 'ready_for_ingestion'
      ? (withProgress.completed_at ?? new Date())
      : withProgress.completed_at;

  const { follow_up_at, follow_up_reason } = computeFollowUp({
    lead_status,
    phone: withProgress.phone,
    availability: withProgress.availability,
    ykb: withProgress.ykb,
    created_at: withProgress.created_at,
  });

  const next_step = getNextStep(step, {
    region: withProgress.region,
    license: withProgress.license,
  });

  return {
    ok: true,
    lead: { ...withProgress, completed_at, lead_status, lead_priority, follow_up_at, follow_up_reason },
    next_step,
  };
}
