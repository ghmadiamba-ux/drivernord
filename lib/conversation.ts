import type { Region, License } from '../types/lead';

export type StepId =
  | 'lang'
  | 'region'
  | 'relocate'
  | 'license'
  | 'ykb'
  | 'driver_card'
  | 'domain'
  | 'availability'
  | 'shift_preference'
  | 'phone'
  | 'email'
  | 'name'
  | 'consent'
  | 'bemanning_open'
  | 'confirmation'
  | 'disqualified';

export interface StepContext {
  region: Region | null;
  license: License | null;
}

const TERMINAL: Set<StepId> = new Set(['confirmation', 'disqualified']);

const STEP_INDEX: Record<StepId, number> = {
  lang:             0,
  region:           1,
  relocate:         1,
  license:          2,
  ykb:              3,
  driver_card:      4,
  domain:           4,
  availability:     5,
  shift_preference: 5,
  phone:            6,
  email:            6,
  name:             6,
  consent:          7,
  bemanning_open:   7,
  confirmation:     7,
  disqualified:    -1,
};

export function getFirstStep(): StepId {
  return 'lang';
}

export function getNextStep(current: StepId, ctx: StepContext): StepId | null {
  switch (current) {
    case 'lang':         return 'region';
    case 'region':       return ctx.region === 'stockholm' ? 'license' : 'relocate';
    case 'relocate':     return 'license';
    case 'license':      return ctx.license === 'none' ? 'disqualified' : 'ykb';
    case 'ykb':          return 'driver_card';
    case 'driver_card':      return 'domain';
    case 'domain':           return 'availability';
    case 'availability':     return 'shift_preference';
    case 'shift_preference': return 'phone';
    case 'phone':        return 'email';
    case 'email':        return 'name';
    case 'name':         return 'consent';
    case 'consent':        return 'bemanning_open';
    case 'bemanning_open': return 'confirmation';
    case 'confirmation':   return null;
    case 'disqualified':   return null;
  }
}

export function getStepIndex(step: StepId): number {
  return STEP_INDEX[step];
}

export function isTerminal(step: StepId): boolean {
  return TERMINAL.has(step);
}
