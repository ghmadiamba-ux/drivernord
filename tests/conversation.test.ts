import { describe, it, expect } from 'vitest';
import {
  getFirstStep,
  getNextStep,
  getStepIndex,
  isTerminal,
  type StepId,
  type StepContext,
} from '../lib/conversation';

const stockholm: StepContext = { region: 'stockholm', license: null };
const other: StepContext     = { region: 'other_sweden', license: null };
const abroad: StepContext    = { region: 'abroad', license: null };
const licensed: StepContext  = { region: 'stockholm', license: 'CE' };
const none: StepContext      = { region: 'stockholm', license: 'none' };
const empty: StepContext     = { region: null, license: null };

// ─── getFirstStep ─────────────────────────────────────────────────────────────

describe('getFirstStep', () => {
  it('returns lang', () => {
    expect(getFirstStep()).toBe('lang');
  });
});

// ─── getNextStep — linear transitions ────────────────────────────────────────

describe('getNextStep — linear transitions', () => {
  it('lang → region', () => {
    expect(getNextStep('lang', empty)).toBe('region');
  });

  it('relocate → license', () => {
    expect(getNextStep('relocate', empty)).toBe('license');
  });

  it('ykb → driver_card', () => {
    expect(getNextStep('ykb', empty)).toBe('driver_card');
  });

  it('driver_card → domain', () => {
    expect(getNextStep('driver_card', empty)).toBe('domain');
  });

  it('domain → availability', () => {
    expect(getNextStep('domain', empty)).toBe('availability');
  });

  it('availability → shift_preference', () => {
    expect(getNextStep('availability', empty)).toBe('shift_preference');
  });

  it('shift_preference → phone', () => {
    expect(getNextStep('shift_preference', empty)).toBe('phone');
  });

  it('phone → email', () => {
    expect(getNextStep('phone', empty)).toBe('email');
  });

  it('email → name', () => {
    expect(getNextStep('email', empty)).toBe('name');
  });

  it('name → consent', () => {
    expect(getNextStep('name', empty)).toBe('consent');
  });

  it('consent → bemanning_open', () => {
    expect(getNextStep('consent', empty)).toBe('bemanning_open');
  });

  it('bemanning_open → confirmation', () => {
    expect(getNextStep('bemanning_open', empty)).toBe('confirmation');
  });
});

// ─── getNextStep — region branching ──────────────────────────────────────────

describe('getNextStep — region branching', () => {
  it('region(stockholm) → license, skips relocate', () => {
    expect(getNextStep('region', stockholm)).toBe('license');
  });

  it('region(other_sweden) → relocate', () => {
    expect(getNextStep('region', other)).toBe('relocate');
  });

  it('region(abroad) → relocate', () => {
    expect(getNextStep('region', abroad)).toBe('relocate');
  });

  it('region(null) → relocate (not stockholm)', () => {
    expect(getNextStep('region', empty)).toBe('relocate');
  });
});

// ─── getNextStep — license branching ─────────────────────────────────────────

describe('getNextStep — license branching', () => {
  it('license(none) → disqualified', () => {
    expect(getNextStep('license', none)).toBe('disqualified');
  });

  it('license(C) → ykb', () => {
    expect(getNextStep('license', { ...empty, license: 'C' })).toBe('ykb');
  });

  it('license(CE) → ykb', () => {
    expect(getNextStep('license', { ...empty, license: 'CE' })).toBe('ykb');
  });

  it('license(D) → ykb', () => {
    expect(getNextStep('license', { ...empty, license: 'D' })).toBe('ykb');
  });

  it('license(C+D) → ykb', () => {
    expect(getNextStep('license', { ...empty, license: 'C+D' })).toBe('ykb');
  });

  it('license(CE+D) → ykb', () => {
    expect(getNextStep('license', { ...empty, license: 'CE+D' })).toBe('ykb');
  });
});

// ─── getNextStep — terminal steps ────────────────────────────────────────────

describe('getNextStep — terminal steps', () => {
  it('confirmation → null', () => {
    expect(getNextStep('confirmation', empty)).toBeNull();
  });

  it('disqualified → null', () => {
    expect(getNextStep('disqualified', empty)).toBeNull();
  });
});

// ─── isTerminal ───────────────────────────────────────────────────────────────

describe('isTerminal', () => {
  it('confirmation is terminal', () => {
    expect(isTerminal('confirmation')).toBe(true);
  });

  it('disqualified is terminal', () => {
    expect(isTerminal('disqualified')).toBe(true);
  });

  const nonTerminal: StepId[] = [
    'lang', 'region', 'relocate', 'license',
    'ykb', 'driver_card', 'domain', 'availability', 'shift_preference',
    'phone', 'email', 'name', 'consent', 'bemanning_open',
  ];

  nonTerminal.forEach((step) => {
    it(`${step} is not terminal`, () => {
      expect(isTerminal(step)).toBe(false);
    });
  });
});

// ─── getStepIndex ─────────────────────────────────────────────────────────────

describe('getStepIndex', () => {
  it('lang → 0', () => expect(getStepIndex('lang')).toBe(0));
  it('region → 1', () => expect(getStepIndex('region')).toBe(1));
  it('relocate → 1 (same coarse index as region)', () => expect(getStepIndex('relocate')).toBe(1));
  it('license → 2', () => expect(getStepIndex('license')).toBe(2));
  it('ykb → 3', () => expect(getStepIndex('ykb')).toBe(3));
  it('driver_card → 4', () => expect(getStepIndex('driver_card')).toBe(4));
  it('domain → 4 (same stage as driver_card — optional step)', () => expect(getStepIndex('domain')).toBe(4));
  it('availability → 5', () => expect(getStepIndex('availability')).toBe(5));
  it('shift_preference → 5 (same stage as availability — optional step)', () => expect(getStepIndex('shift_preference')).toBe(5));
  it('phone → 6', () => expect(getStepIndex('phone')).toBe(6));
  it('email → 6 (same coarse index as phone)', () => expect(getStepIndex('email')).toBe(6));
  it('name → 6 (same coarse index as phone)', () => expect(getStepIndex('name')).toBe(6));
  it('consent → 7 (triggers ready_for_ingestion on classify.ts >= 7 check)', () => expect(getStepIndex('consent')).toBe(7));
  it('bemanning_open → 7 (same stage as consent — end-of-flow consent step)', () => expect(getStepIndex('bemanning_open')).toBe(7));
  it('confirmation → 7 (same index as consent — terminal display step)', () => expect(getStepIndex('confirmation')).toBe(7));
  it('disqualified → -1', () => expect(getStepIndex('disqualified')).toBe(-1));
});

// ─── Full path — Stockholm driver ────────────────────────────────────────────

describe('full path — Stockholm driver (no relocate step)', () => {
  it('traverses lang → confirmation without visiting relocate', () => {
    const path: StepId[] = [];
    let step: StepId | null = getFirstStep();
    const ctx: StepContext = { region: 'stockholm', license: 'CE' };

    while (step !== null) {
      path.push(step);
      step = getNextStep(step, ctx);
    }

    expect(path).toEqual([
      'lang', 'region', 'license', 'ykb',
      'driver_card', 'domain', 'availability', 'shift_preference',
      'phone', 'email', 'name', 'consent', 'bemanning_open', 'confirmation',
    ]);
    expect(path).not.toContain('relocate');
    expect(path).not.toContain('disqualified');
  });
});

// ─── Full path — outside Stockholm driver ────────────────────────────────────

describe('full path — outside Stockholm driver (includes relocate)', () => {
  it('traverses lang → confirmation including relocate', () => {
    const path: StepId[] = [];
    let step: StepId | null = getFirstStep();
    const ctx: StepContext = { region: 'other_sweden', license: 'CE' };

    while (step !== null) {
      path.push(step);
      step = getNextStep(step, ctx);
    }

    expect(path).toEqual([
      'lang', 'region', 'relocate', 'license', 'ykb',
      'driver_card', 'domain', 'availability', 'shift_preference',
      'phone', 'email', 'name', 'consent', 'bemanning_open', 'confirmation',
    ]);
    expect(path).toContain('relocate');
    expect(path).not.toContain('disqualified');
  });
});

// ─── Path to disqualified ────────────────────────────────────────────────────

describe('path to disqualified', () => {
  it('stops at disqualified when license is none', () => {
    const path: StepId[] = [];
    let step: StepId | null = getFirstStep();
    const ctx: StepContext = { region: 'stockholm', license: 'none' };

    while (step !== null) {
      path.push(step);
      step = getNextStep(step, ctx);
    }

    expect(path).toEqual(['lang', 'region', 'license', 'disqualified']);
    expect(path).not.toContain('confirmation');
    expect(path[path.length - 1]).toBe('disqualified');
  });

  it('disqualified step index is -1', () => {
    expect(getStepIndex('disqualified')).toBe(-1);
  });
});
