// tests/contentTypes.test.ts
// Smoke test: all exported type constants and enums are coherent.

import { describe, it, expect } from 'vitest';
import {
  PILLAR_TARGET_RATIOS,
  PILLAR_ANGLES,
  DEFAULT_WEEKLY_SLOTS,
  ANGLE_FORMATS,
  PILLAR_AUDIENCES,
} from '../lib/content/pillars';

describe('pillar taxonomy integrity', () => {
  it('PILLAR_TARGET_RATIOS sums to 1.0', () => {
    const total = Object.values(PILLAR_TARGET_RATIOS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it('every pillar has at least 2 allowed angles', () => {
    for (const [pillar, angles] of Object.entries(PILLAR_ANGLES)) {
      expect(angles.length, `pillar ${pillar}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('DEFAULT_WEEKLY_SLOTS has exactly 4 entries', () => {
    expect(DEFAULT_WEEKLY_SLOTS).toHaveLength(4);
  });

  it('DEFAULT_WEEKLY_SLOTS covers Mon, Wed, Fri, Sun', () => {
    const days = DEFAULT_WEEKLY_SLOTS.map((s) => s.day_of_week).sort();
    expect(days).toEqual([1, 3, 5, 7]);
  });

  it('every slot angle is in its pillar allowed list', () => {
    for (const slot of DEFAULT_WEEKLY_SLOTS) {
      const allowed = PILLAR_ANGLES[slot.pillar];
      expect(allowed, `slot ${slot.label}`).toContain(slot.angle);
    }
  });

  it('every angle has at least one allowed format', () => {
    for (const [angle, formats] of Object.entries(ANGLE_FORMATS)) {
      expect(formats.length, `angle ${angle}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every pillar has at least one primary audience', () => {
    for (const [pillar, audiences] of Object.entries(PILLAR_AUDIENCES)) {
      expect(audiences.length, `pillar ${pillar}`).toBeGreaterThanOrEqual(1);
    }
  });
});
