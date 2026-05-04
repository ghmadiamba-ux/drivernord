import { describe, it, expect } from 'vitest';
import { scoreDriver } from '../lib/scoreDriver';
import type { IngestedDriver } from '../lib/ingestedDriver';

// Base: CE, valid YKB, now, Stockholm → 33+25+20+20 = 98, HIGH, no flags
const base = (overrides: Partial<IngestedDriver> = {}): IngestedDriver => ({
  id: 'test-id',
  ingestedAt: new Date('2026-05-01T11:00:00.000Z'),
  priority: 'HIGH',
  license: 'CE',
  ykb: 'valid',
  driverCard: 'valid',
  location: { region: 'stockholm', willingToRelocate: null },
  availability: 'now',
  contact: { firstName: 'Erik', phone: '+46701234567', email: null },
  needsFollowUp: false,
  followUpAt: null,
  followUpReason: null,
  ...overrides,
});

// ─── license points ───────────────────────────────────────────────────────────

describe('scoreDriver — license points', () => {
  it('CE+D → 35', () => {
    const { breakdown } = scoreDriver(base({ license: 'CE+D' }));
    expect(breakdown.license).toBe(35);
  });

  it('CE → 33', () => {
    const { breakdown } = scoreDriver(base({ license: 'CE' }));
    expect(breakdown.license).toBe(33);
  });

  it('C+D → 31', () => {
    const { breakdown } = scoreDriver(base({ license: 'C+D' }));
    expect(breakdown.license).toBe(31);
  });

  it('C → 28', () => {
    const { breakdown } = scoreDriver(base({ license: 'C' }));
    expect(breakdown.license).toBe(28);
  });

  it('D → 18', () => {
    const { breakdown } = scoreDriver(base({ license: 'D' }));
    expect(breakdown.license).toBe(18);
  });
});

// ─── YKB points ───────────────────────────────────────────────────────────────

describe('scoreDriver — YKB points', () => {
  it('valid → 25', () => {
    const { breakdown } = scoreDriver(base({ ykb: 'valid' }));
    expect(breakdown.ykb).toBe(25);
  });

  it('in_progress → 14', () => {
    const { breakdown } = scoreDriver(base({ ykb: 'in_progress' }));
    expect(breakdown.ykb).toBe(14);
  });

  it('expired → 7', () => {
    const { breakdown } = scoreDriver(base({ ykb: 'expired' }));
    expect(breakdown.ykb).toBe(7);
  });

  it('none → 0', () => {
    const { breakdown } = scoreDriver(base({ ykb: 'none' }));
    expect(breakdown.ykb).toBe(0);
  });

  it('unknown → 0', () => {
    const { breakdown } = scoreDriver(base({ ykb: 'unknown' }));
    expect(breakdown.ykb).toBe(0);
  });
});

// ─── availability points ──────────────────────────────────────────────────────

describe('scoreDriver — availability points', () => {
  it('now → 20', () => {
    const { breakdown } = scoreDriver(base({ availability: 'now' }));
    expect(breakdown.availability).toBe(20);
  });

  it('2_weeks → 14', () => {
    const { breakdown } = scoreDriver(base({ availability: '2_weeks' }));
    expect(breakdown.availability).toBe(14);
  });

  it('1_month → 7', () => {
    const { breakdown } = scoreDriver(base({ availability: '1_month' }));
    expect(breakdown.availability).toBe(7);
  });

  it('not_yet → 2', () => {
    const { breakdown } = scoreDriver(base({ availability: 'not_yet' }));
    expect(breakdown.availability).toBe(2);
  });
});

// ─── location points ──────────────────────────────────────────────────────────

describe('scoreDriver — location points', () => {
  it('stockholm → 20', () => {
    const { breakdown } = scoreDriver(base({ location: { region: 'stockholm', willingToRelocate: null } }));
    expect(breakdown.location).toBe(20);
  });

  it('other_sweden + willingToRelocate:true → 13', () => {
    const { breakdown } = scoreDriver(base({ location: { region: 'other_sweden', willingToRelocate: true } }));
    expect(breakdown.location).toBe(13);
  });

  it('other_sweden + willingToRelocate:false → 5', () => {
    const { breakdown } = scoreDriver(base({ location: { region: 'other_sweden', willingToRelocate: false } }));
    expect(breakdown.location).toBe(5);
  });

  it('abroad + willingToRelocate:true → 7', () => {
    const { breakdown } = scoreDriver(base({ location: { region: 'abroad', willingToRelocate: true } }));
    expect(breakdown.location).toBe(7);
  });

  it('abroad + willingToRelocate:false → 1', () => {
    const { breakdown } = scoreDriver(base({ location: { region: 'abroad', willingToRelocate: false } }));
    expect(breakdown.location).toBe(1);
  });
});

// ─── tier thresholds ──────────────────────────────────────────────────────────

describe('scoreDriver — tier thresholds', () => {
  it('total 98 → HIGH (CE + valid + now + stockholm)', () => {
    // 33+25+20+20 = 98
    const { total, tier } = scoreDriver(base());
    expect(total).toBe(98);
    expect(tier).toBe('HIGH');
  });

  it('total 72 → HIGH (boundary, no caps)', () => {
    // C+D(31) + in_progress(14) + 2_weeks(14) + other_sweden relocate:true(13) = 72
    const { total, tier } = scoreDriver(base({
      license: 'C+D',
      ykb: 'in_progress',
      availability: '2_weeks',
      location: { region: 'other_sweden', willingToRelocate: true },
    }));
    expect(total).toBe(72);
    expect(tier).toBe('HIGH');
  });

  it('total 71 → MEDIUM (one below HIGH boundary)', () => {
    // C+D(31) + valid(25) + not_yet(2) + other_sweden relocate:true(13) = 71
    const { total, tier } = scoreDriver(base({
      license: 'C+D',
      ykb: 'valid',
      availability: 'not_yet',
      location: { region: 'other_sweden', willingToRelocate: true },
    }));
    expect(total).toBe(71);
    expect(tier).toBe('MEDIUM');
  });

  it('total 42 → MEDIUM (MEDIUM boundary)', () => {
    // C(28) + expired(7) + not_yet(2) + other_sweden relocate:false(5) = 42
    const { total, tier } = scoreDriver(base({
      license: 'C',
      ykb: 'expired',
      availability: 'not_yet',
      location: { region: 'other_sweden', willingToRelocate: false },
    }));
    expect(total).toBe(42);
    expect(tier).toBe('MEDIUM');
  });

  it('total 38 → LOW (below MEDIUM boundary)', () => {
    // C(28) + expired(7) + not_yet(2) + abroad relocate:false(1) = 38
    const { total, tier } = scoreDriver(base({
      license: 'C',
      ykb: 'expired',
      availability: 'not_yet',
      location: { region: 'abroad', willingToRelocate: false },
    }));
    expect(total).toBe(38);
    expect(tier).toBe('LOW');
  });
});

// ─── D-only tier cap ──────────────────────────────────────────────────────────

describe('scoreDriver — D-only tier cap', () => {
  it('D license with score >= 72 is capped at MEDIUM', () => {
    // D(18)+valid(25)+now(20)+stockholm(20) = 83 → capped MEDIUM
    const { total, tier } = scoreDriver(base({ license: 'D' }));
    expect(total).toBe(83);
    expect(tier).toBe('MEDIUM');
  });

  it('total and breakdown are not affected by the cap', () => {
    const { total, breakdown } = scoreDriver(base({ license: 'D' }));
    expect(total).toBe(83);
    expect(breakdown.license).toBe(18);
  });

  it('D license that would be MEDIUM stays MEDIUM', () => {
    // D(18)+expired(7)+not_yet(2)+other_sweden relocate:false(5) = 32 → LOW without cap, still LOW with cap
    const { tier } = scoreDriver(base({
      license: 'D',
      ykb: 'expired',
      availability: 'not_yet',
      location: { region: 'other_sweden', willingToRelocate: false },
    }));
    expect(tier).toBe('LOW');
  });

  it('D license that scores MEDIUM stays MEDIUM (cap does not upgrade)', () => {
    // D(18)+valid(25)+1_month(7)+other_sweden relocate:true(13) = 63 → MEDIUM without cap, still MEDIUM
    const { tier } = scoreDriver(base({
      license: 'D',
      ykb: 'valid',
      availability: '1_month',
      location: { region: 'other_sweden', willingToRelocate: true },
    }));
    expect(tier).toBe('MEDIUM');
  });
});

// ─── ykb_missing tier cap ─────────────────────────────────────────────────────

describe('scoreDriver — ykb_missing tier cap', () => {
  it('ykb:none with score >= 72 is capped at MEDIUM', () => {
    // CE(33)+none(0)+now(20)+stockholm(20) = 73 → capped MEDIUM
    const { total, tier } = scoreDriver(base({ ykb: 'none' }));
    expect(total).toBe(73);
    expect(tier).toBe('MEDIUM');
  });

  it('ykb:unknown with score >= 72 is capped at MEDIUM', () => {
    // CE(33)+unknown(0)+now(20)+stockholm(20) = 73 → capped MEDIUM
    const { total, tier } = scoreDriver(base({ ykb: 'unknown' }));
    expect(total).toBe(73);
    expect(tier).toBe('MEDIUM');
  });

  it('total and breakdown are not affected by ykb_missing cap', () => {
    const { total, breakdown } = scoreDriver(base({ ykb: 'none' }));
    expect(total).toBe(73);
    expect(breakdown.ykb).toBe(0);
  });

  it('both caps apply simultaneously — still MEDIUM', () => {
    // D(18)+none(0)+now(20)+stockholm(20) = 58 → both caps, but 58 < 72 so MEDIUM either way
    // Use high-scoring combo: D(18)+none(0)+now(20)+stockholm(20) = 58 → MEDIUM
    // For both caps AND high total: not possible since D=18 + none=0 max = 18+0+20+20=58
    // Best we can do: verify both flags fire and tier is capped
    const { tier, flags } = scoreDriver(base({ license: 'D', ykb: 'none' }));
    expect(flags).toContain('bus_segment');
    expect(flags).toContain('ykb_missing');
    expect(tier).toBe('MEDIUM');
  });
});

// ─── flags ────────────────────────────────────────────────────────────────────

describe('scoreDriver — flags', () => {
  it('no flags for clean Stockholm CE valid driver', () => {
    const { flags } = scoreDriver(base());
    expect(flags).toEqual([]);
  });

  it('bus_segment when license is D', () => {
    const { flags } = scoreDriver(base({ license: 'D' }));
    expect(flags).toContain('bus_segment');
  });

  it('ykb_missing when ykb is none', () => {
    const { flags } = scoreDriver(base({ ykb: 'none' }));
    expect(flags).toContain('ykb_missing');
  });

  it('ykb_missing when ykb is unknown', () => {
    const { flags } = scoreDriver(base({ ykb: 'unknown' }));
    expect(flags).toContain('ykb_missing');
  });

  it('ykb_in_progress when ykb is in_progress', () => {
    const { flags } = scoreDriver(base({ ykb: 'in_progress' }));
    expect(flags).toContain('ykb_in_progress');
  });

  it('ykb_expired when ykb is expired', () => {
    const { flags } = scoreDriver(base({ ykb: 'expired' }));
    expect(flags).toContain('ykb_expired');
  });

  it('relocation_required when region is not stockholm', () => {
    const { flags } = scoreDriver(base({ location: { region: 'other_sweden', willingToRelocate: true } }));
    expect(flags).toContain('relocation_required');
  });

  it('no relocation_required for Stockholm drivers', () => {
    const { flags } = scoreDriver(base());
    expect(flags).not.toContain('relocation_required');
  });

  it('abroad_origin when region is abroad', () => {
    const { flags } = scoreDriver(base({ location: { region: 'abroad', willingToRelocate: true } }));
    expect(flags).toContain('abroad_origin');
    expect(flags).toContain('relocation_required');
  });

  it('driver_card_expired when driverCard is expired', () => {
    const { flags } = scoreDriver(base({ driverCard: 'expired' }));
    expect(flags).toContain('driver_card_expired');
  });

  it('driver_card_missing when driverCard is no', () => {
    const { flags } = scoreDriver(base({ driverCard: 'no' }));
    expect(flags).toContain('driver_card_missing');
  });

  it('driver_card_missing when driverCard is unknown', () => {
    const { flags } = scoreDriver(base({ driverCard: 'unknown' }));
    expect(flags).toContain('driver_card_missing');
  });

  it('available_later when availability is not_yet', () => {
    const { flags } = scoreDriver(base({ availability: 'not_yet' }));
    expect(flags).toContain('available_later');
  });
});

// ─── summary ─────────────────────────────────────────────────────────────────

describe('scoreDriver — summary', () => {
  it('clean Stockholm driver summary', () => {
    const { summary } = scoreDriver(base());
    expect(summary).toBe('CE license, valid YKB, available now, Stockholm');
  });

  it('D license appends bus segment suffix', () => {
    const { summary } = scoreDriver(base({ license: 'D' }));
    expect(summary).toBe('D license, valid YKB, available now, Stockholm — bus segment');
  });

  it('ykb:none appends YKB missing suffix', () => {
    const { summary } = scoreDriver(base({ ykb: 'none' }));
    expect(summary).toBe('CE license, no YKB, available now, Stockholm — YKB missing');
  });

  it('D license + ykb:none appends both suffixes', () => {
    const { summary } = scoreDriver(base({ license: 'D', ykb: 'none' }));
    expect(summary).toBe('D license, no YKB, available now, Stockholm — bus segment, YKB missing');
  });

  it('other_sweden willing to relocate', () => {
    const { summary } = scoreDriver(base({
      license: 'C',
      ykb: 'in_progress',
      availability: '2_weeks',
      location: { region: 'other_sweden', willingToRelocate: true },
    }));
    expect(summary).toBe('C license, YKB in progress, available in 2 weeks, other Sweden (willing to relocate)');
  });

  it('abroad not relocating', () => {
    const { summary } = scoreDriver(base({
      location: { region: 'abroad', willingToRelocate: false },
      availability: '1_month',
      ykb: 'expired',
    }));
    expect(summary).toBe('CE license, YKB expired, available in 1 month, abroad (not relocating)');
  });

  it('not_yet availability in summary', () => {
    const { summary } = scoreDriver(base({ availability: 'not_yet' }));
    expect(summary).toBe('CE license, valid YKB, not yet available, Stockholm');
  });
});

// ─── full profile examples ────────────────────────────────────────────────────

describe('scoreDriver — full profile examples', () => {
  it('ideal freight driver: CE+D, valid YKB, now, Stockholm → 100, HIGH', () => {
    const result = scoreDriver(base({ license: 'CE+D' }));
    expect(result.total).toBe(100);
    expect(result.tier).toBe('HIGH');
    expect(result.flags).toEqual([]);
  });

  it('strong non-Stockholm: CE, valid YKB, 2_weeks, other_sweden relocate:yes → 85, HIGH', () => {
    // 33+25+14+13 = 85
    const result = scoreDriver(base({
      ykb: 'valid',
      availability: '2_weeks',
      location: { region: 'other_sweden', willingToRelocate: true },
    }));
    expect(result.total).toBe(85);
    expect(result.tier).toBe('HIGH');
    expect(result.flags).toContain('relocation_required');
  });

  it('mid-tier: C, expired YKB, 1_month, other_sweden relocate:yes → 55, MEDIUM', () => {
    // 28+7+7+13 = 55
    const result = scoreDriver(base({
      license: 'C',
      ykb: 'expired',
      availability: '1_month',
      location: { region: 'other_sweden', willingToRelocate: true },
    }));
    expect(result.total).toBe(55);
    expect(result.tier).toBe('MEDIUM');
    expect(result.flags).toContain('ykb_expired');
    expect(result.flags).toContain('relocation_required');
  });

  it('low tier: C, expired YKB, not_yet, abroad relocate:false → 38, LOW', () => {
    // 28+7+2+1 = 38
    const result = scoreDriver(base({
      license: 'C',
      ykb: 'expired',
      availability: 'not_yet',
      location: { region: 'abroad', willingToRelocate: false },
    }));
    expect(result.total).toBe(38);
    expect(result.tier).toBe('LOW');
    expect(result.flags).toContain('ykb_expired');
    expect(result.flags).toContain('relocation_required');
    expect(result.flags).toContain('abroad_origin');
    expect(result.flags).toContain('available_later');
  });

  it('bus driver capped: D, valid YKB, now, Stockholm → 83 total but MEDIUM tier', () => {
    // 18+25+20+20 = 83, bus_segment cap
    const result = scoreDriver(base({ license: 'D' }));
    expect(result.total).toBe(83);
    expect(result.tier).toBe('MEDIUM');
    expect(result.breakdown).toEqual({ license: 18, ykb: 25, availability: 20, location: 20 });
    expect(result.flags).toContain('bus_segment');
  });
});
