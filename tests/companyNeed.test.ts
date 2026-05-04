import { describe, it, expect } from 'vitest';
import { validateCompanyNeedInput } from '../lib/companyNeed';

// ─── Base valid input ─────────────────────────────────────────────────────────

const valid = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  company_name:       'Stockholms Åkeri AB',
  license_required:   'CE',
  domain_required:    'distribution',
  domain_preferred:   [],
  location_region:    'stockholm',
  relocation_allowed: false,
  shift_type:         'day',
  urgency:            'standard',
  ...overrides,
});

// ─── 1. Valid input ───────────────────────────────────────────────────────────

describe('validateCompanyNeedInput — valid input', () => {
  it('returns ok:true for a fully valid input', () => {
    expect(validateCompanyNeedInput(valid()).ok).toBe(true);
  });

  it('returned need includes all fields', () => {
    const result = validateCompanyNeedInput(valid());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.need).toMatchObject({
      company_name:       'Stockholms Åkeri AB',
      license_required:   'CE',
      domain_required:    'distribution',
      domain_preferred:   [],
      location_region:    'stockholm',
      relocation_allowed: false,
      shift_type:         'day',
      urgency:            'standard',
      status:             'open',
    });
  });

  it('trims leading/trailing whitespace from company_name', () => {
    const result = validateCompanyNeedInput(valid({ company_name: '  Åkeri AB  ' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.need.company_name).toBe('Åkeri AB');
  });

  it('does not mutate the input object', () => {
    const input = valid();
    const before = { ...input };
    validateCompanyNeedInput(input);
    expect(input).toEqual(before);
  });
});

// ─── 2. company_name ─────────────────────────────────────────────────────────

describe('validateCompanyNeedInput — company_name', () => {
  it('empty string fails', () => {
    const result = validateCompanyNeedInput(valid({ company_name: '' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('company_name');
  });

  it('whitespace-only string fails', () => {
    const result = validateCompanyNeedInput(valid({ company_name: '   ' }));
    expect(result.ok).toBe(false);
  });

  it('missing company_name fails', () => {
    const { company_name: _, ...without } = valid() as Record<string, unknown>;
    const result = validateCompanyNeedInput(without);
    expect(result.ok).toBe(false);
  });

  it('non-string company_name fails', () => {
    const result = validateCompanyNeedInput(valid({ company_name: 42 }));
    expect(result.ok).toBe(false);
  });
});

// ─── 3. license_required ─────────────────────────────────────────────────────

describe('validateCompanyNeedInput — license_required', () => {
  it('"none" is rejected', () => {
    const result = validateCompanyNeedInput(valid({ license_required: 'none' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('license_required');
  });

  it('unknown value is rejected', () => {
    expect(validateCompanyNeedInput(valid({ license_required: 'B' })).ok).toBe(false);
  });

  it('all five valid licenses pass', () => {
    for (const lic of ['C', 'CE', 'D', 'C+D', 'CE+D']) {
      const result = validateCompanyNeedInput(valid({ license_required: lic }));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.need.license_required).toBe(lic);
    }
  });
});

// ─── 4. domain_required ──────────────────────────────────────────────────────

describe('validateCompanyNeedInput — domain_required', () => {
  it('invalid domain_required fails', () => {
    const result = validateCompanyNeedInput(valid({ domain_required: 'long_haul' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('domain_required');
  });

  it('all 15 DomainTag values pass', () => {
    const tags = [
      'tipp', 'kran', 'kylfrys', 'silo', 'flatbed', 'tanker',
      'ekipage', 'schakt_bygg', 'distribution', 'livsmedelskyla',
      'avfall', 'skogstransport', 'adr', 'fjarrtransport', 'budtransport',
    ];
    for (const tag of tags) {
      const result = validateCompanyNeedInput(valid({
        domain_required:  tag,
        domain_preferred: [],
      }));
      expect(result.ok).toBe(true);
    }
  });

  it('valid domain_required is preserved on the returned need', () => {
    const result = validateCompanyNeedInput(valid({ domain_required: 'adr' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.need.domain_required).toBe('adr');
  });
});

// ─── 5. domain_preferred ─────────────────────────────────────────────────────

describe('validateCompanyNeedInput — domain_preferred', () => {
  it('empty array is valid', () => {
    expect(validateCompanyNeedInput(valid({ domain_preferred: [] })).ok).toBe(true);
  });

  it('array of valid distinct tags passes', () => {
    const result = validateCompanyNeedInput(valid({
      domain_required:  'distribution',
      domain_preferred: ['kran', 'kylfrys'],
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.need.domain_preferred).toEqual(['kran', 'kylfrys']);
  });

  it('array containing an invalid tag fails', () => {
    const result = validateCompanyNeedInput(valid({
      domain_preferred: ['distribution', 'not_a_tag'],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('not_a_tag');
  });

  it('array containing domain_required fails', () => {
    const result = validateCompanyNeedInput(valid({
      domain_required:  'distribution',
      domain_preferred: ['distribution', 'kran'],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('domain_preferred');
  });

  it('domain_preferred equal to domain_required alone also fails', () => {
    const result = validateCompanyNeedInput(valid({
      domain_required:  'kylfrys',
      domain_preferred: ['kylfrys'],
    }));
    expect(result.ok).toBe(false);
  });

  it('non-array domain_preferred fails', () => {
    const result = validateCompanyNeedInput(valid({ domain_preferred: 'kran' }));
    expect(result.ok).toBe(false);
  });

  it('missing domain_preferred defaults to empty array', () => {
    const { domain_preferred: _, ...without } = valid() as Record<string, unknown>;
    const result = validateCompanyNeedInput(without);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.need.domain_preferred).toEqual([]);
  });
});

// ─── 6. location_region ──────────────────────────────────────────────────────

describe('validateCompanyNeedInput — location_region', () => {
  it('invalid location fails', () => {
    const result = validateCompanyNeedInput(valid({ location_region: 'gothenburg' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('location_region');
  });

  it('all three valid regions pass', () => {
    for (const region of ['stockholm', 'other_sweden', 'abroad']) {
      expect(validateCompanyNeedInput(valid({ location_region: region })).ok).toBe(true);
    }
  });
});

// ─── 7. relocation_allowed ────────────────────────────────────────────────────

describe('validateCompanyNeedInput — relocation_allowed', () => {
  it('true is valid', () => {
    expect(validateCompanyNeedInput(valid({ relocation_allowed: true })).ok).toBe(true);
  });

  it('false is valid', () => {
    expect(validateCompanyNeedInput(valid({ relocation_allowed: false })).ok).toBe(true);
  });

  it('string "true" is rejected', () => {
    const result = validateCompanyNeedInput(valid({ relocation_allowed: 'true' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('relocation_allowed');
  });

  it('string "yes" is rejected', () => {
    expect(validateCompanyNeedInput(valid({ relocation_allowed: 'yes' })).ok).toBe(false);
  });

  it('number 1 is rejected', () => {
    expect(validateCompanyNeedInput(valid({ relocation_allowed: 1 })).ok).toBe(false);
  });
});

// ─── 8. shift_type ───────────────────────────────────────────────────────────

describe('validateCompanyNeedInput — shift_type', () => {
  it('invalid shift fails', () => {
    const result = validateCompanyNeedInput(valid({ shift_type: 'morning' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('shift_type');
  });

  it('all four valid shift types pass', () => {
    for (const s of ['day', 'night', 'weekend', 'flexible']) {
      expect(validateCompanyNeedInput(valid({ shift_type: s })).ok).toBe(true);
    }
  });
});

// ─── 9. urgency ──────────────────────────────────────────────────────────────

describe('validateCompanyNeedInput — urgency', () => {
  it('invalid urgency fails', () => {
    const result = validateCompanyNeedInput(valid({ urgency: 'critical' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('urgency');
  });

  it('all three valid urgency levels pass', () => {
    for (const u of ['standard', 'urgent', 'emergency']) {
      expect(validateCompanyNeedInput(valid({ urgency: u })).ok).toBe(true);
    }
  });
});

// ─── 10. status ──────────────────────────────────────────────────────────────

describe('validateCompanyNeedInput — status', () => {
  it('missing status defaults to "open"', () => {
    const { status: _, ...without } = valid() as Record<string, unknown>;
    const result = validateCompanyNeedInput(without);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.need.status).toBe('open');
  });

  it('explicit "open" is preserved', () => {
    const result = validateCompanyNeedInput(valid({ status: 'open' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.need.status).toBe('open');
  });

  it('explicit "closed" is preserved', () => {
    const result = validateCompanyNeedInput(valid({ status: 'closed' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.need.status).toBe('closed');
  });

  it('invalid status fails', () => {
    const result = validateCompanyNeedInput(valid({ status: 'pending' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('status');
  });
});

// ─── 11. Error messages ───────────────────────────────────────────────────────

describe('validateCompanyNeedInput — error messages', () => {
  it('error is always a non-empty string', () => {
    const cases = [
      valid({ company_name: '' }),
      valid({ license_required: 'none' }),
      valid({ domain_required: 'invalid' }),
      valid({ location_region: 'paris' }),
      valid({ shift_type: 'morning' }),
      valid({ urgency: 'now' }),
    ];
    for (const c of cases) {
      const result = validateCompanyNeedInput(c);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
