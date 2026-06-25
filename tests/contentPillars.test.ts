// tests/contentPillars.test.ts

import { describe, it, expect } from 'vitest';
import {
  rotateAngle,
  rotateAudience,
  pickFormat,
  computeActualRatio,
  getPillarForAngle,
  isValidPillar,
  isValidAngle,
  getAcquisitionSlotWeek,
  PILLAR_ANGLES,
  PILLAR_TARGET_RATIOS,
} from '../lib/content/pillars';
import type { ContentPillar } from '../lib/content/types';

describe('rotateAngle', () => {
  it('returns a valid angle for every pillar at various week indices', () => {
    const pillars: ContentPillar[] = ['practical', 'recognition', 'community', 'acquisition'];
    for (const pillar of pillars) {
      for (let w = 0; w < 20; w++) {
        const angle = rotateAngle(pillar, w);
        expect(PILLAR_ANGLES[pillar]).toContain(angle);
      }
    }
  });

  it('cycles through all angles in a pillar over its length', () => {
    const pillar: ContentPillar = 'practical';
    const angles = PILLAR_ANGLES[pillar];
    const seen = new Set(angles.map((_, i) => rotateAngle(pillar, i)));
    expect(seen.size).toBe(angles.length);
  });
});

describe('rotateAudience', () => {
  it('returns a valid audience string', () => {
    const result = rotateAudience('practical', 0);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('pickFormat', () => {
  it('returns a known format for practical_advice', () => {
    const fmt = pickFormat('practical_advice', 0);
    expect(['text_post', 'poll', 'question', 'tip_list', 'short_story', 'cta']).toContain(fmt);
  });
});

describe('computeActualRatio', () => {
  it('returns 0 for all pillars when empty', () => {
    const ratio = computeActualRatio([]);
    expect(ratio.practical).toBe(0);
    expect(ratio.recognition).toBe(0);
  });

  it('returns correct ratios for a 4-post week', () => {
    const ratio = computeActualRatio([
      'practical', 'practical', 'recognition', 'community',
    ]);
    expect(ratio.practical).toBeCloseTo(0.5, 5);
    expect(ratio.recognition).toBeCloseTo(0.25, 5);
    expect(ratio.community).toBeCloseTo(0.25, 5);
    expect(ratio.acquisition).toBe(0);
  });
});

describe('getPillarForAngle', () => {
  it('returns correct pillar for driver_recognition', () => {
    expect(getPillarForAngle('driver_recognition')).toBe('recognition');
  });
  it('returns correct pillar for low_freq_acquisition_cta', () => {
    expect(getPillarForAngle('low_freq_acquisition_cta')).toBe('acquisition');
  });
  it('returns null for unknown angle', () => {
    expect(getPillarForAngle('nonexistent_angle' as never)).toBeNull();
  });
});

describe('isValidPillar / isValidAngle', () => {
  it('validates known pillars', () => {
    expect(isValidPillar('practical')).toBe(true);
    expect(isValidPillar('acquisition')).toBe(true);
    expect(isValidPillar('unknown')).toBe(false);
  });
  it('validates known angles', () => {
    expect(isValidAngle('community_question')).toBe(true);
    expect(isValidAngle('myth_vs_reality')).toBe(true);
    expect(isValidAngle('nonexistent')).toBe(false);
  });
});

describe('getAcquisitionSlotWeek', () => {
  it('returns 5 (Friday) for even week indices', () => {
    expect(getAcquisitionSlotWeek(0)).toBe(5);
    expect(getAcquisitionSlotWeek(2)).toBe(5);
    expect(getAcquisitionSlotWeek(10)).toBe(5);
  });
  it('returns -1 for odd week indices', () => {
    expect(getAcquisitionSlotWeek(1)).toBe(-1);
    expect(getAcquisitionSlotWeek(3)).toBe(-1);
  });
});

describe('PILLAR_TARGET_RATIOS contract', () => {
  it('practical is 50%', () => {
    expect(PILLAR_TARGET_RATIOS.practical).toBe(0.50);
  });
  it('acquisition is 10%', () => {
    expect(PILLAR_TARGET_RATIOS.acquisition).toBe(0.10);
  });
});
