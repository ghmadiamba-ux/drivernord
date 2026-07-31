import { describe, it, expect } from 'vitest';
import {
  generateEmail,
  validateEmailContent,
  isWithinRateLimit,
  RATE_LIMIT_PER_HOUR,
  type OutreachTarget,
  type OutreachReadiness,
} from '../lib/outreachAgent';

// ── Fixture ───────────────────────────────────────────────────────────────────

const BASE: OutreachTarget = {
  company_name:          'Test Åkeri AB',
  contact_email:         'info@test.se',
  decision_maker_name:   'Johan',
  transport_domain:      ['distribution'],
  license_mentions:      ['CE'],
  do_not_contact_reason: null,
  is_bankrupt:           false,
  readiness:             'READY',
};

function make(overrides: Partial<OutreachTarget> = {}): OutreachTarget {
  return { ...BASE, ...overrides };
}

// ── Blocking ──────────────────────────────────────────────────────────────────

describe('generateEmail — blocking', () => {
  it('blocks when do_not_contact_reason is set', () => {
    const r = generateEmail(make({ do_not_contact_reason: 'competitor' }));
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(r.block_reason).toBe('do_not_contact');
  });

  it('blocks when contact_email is null', () => {
    const r = generateEmail(make({ contact_email: null }));
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(r.block_reason).toBe('missing_email');
  });

  it('blocks when is_bankrupt is true', () => {
    const r = generateEmail(make({ is_bankrupt: true }));
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(r.block_reason).toBe('bankrupt');
  });

  it('blocks JPC by name (exact)', () => {
    const r = generateEmail(make({ company_name: 'JPC Entreprenad AB' }));
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(r.block_reason).toBe('jpc_excluded');
  });

  it('blocks JPC by name (lowercase)', () => {
    const r = generateEmail(make({ company_name: 'jpc transport' }));
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(r.block_reason).toBe('jpc_excluded');
  });

  it('bankrupt takes precedence over missing email', () => {
    const r = generateEmail(make({ is_bankrupt: true, contact_email: null }));
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(r.block_reason).toBe('bankrupt');
  });

  it('generates email for a valid target with all fields', () => {
    const r = generateEmail(BASE);
    expect(r.blocked).toBe(false);
  });
});

// ── Canonical structure ───────────────────────────────────────────────────────

describe('generateEmail — canonical 14-step structure', () => {
  function body(): string {
    const r = generateEmail(BASE);
    if (r.blocked) throw new Error('unexpected block');
    return r.body;
  }

  it('step 1 — greeting uses decision_maker_name when available', () => {
    expect(body()).toMatch(/^Hej Johan,/);
  });

  it('step 1 — greeting falls back to bare Hej when no name', () => {
    const r = generateEmail(make({ decision_maker_name: null }));
    if (!r.blocked) expect(r.body).toMatch(/^Hej,/);
  });

  it('step 2 — observed-need opener includes company name', () => {
    expect(body()).toContain('Vi har uppmärksammat att Test Åkeri AB');
  });

  it('step 3 — pain paragraph opens with canonical sentence', () => {
    expect(body()).toContain("Det är en typ av rekrytering där det inte räcker att hitta 'en chaufför'.");
  });

  it('step 4 — DriverNord intro', () => {
    expect(body()).toContain('DriverNord arbetar med matchning av yrkesförare inom transport.');
  });

  it('step 5 — not bemanning / not jobbtavla clause', () => {
    expect(body()).toContain('Vi är varken bemanning eller en traditionell jobbtavla.');
  });

  it('step 6 — mature-market model sentence', () => {
    expect(body()).toContain('Vår modell bygger på det som redan fungerar på mer mogna transportmarknader');
  });

  it('step 7 — why-selected uses company name', () => {
    expect(body()).toContain('Vi har valt ut Test Åkeri AB eftersom');
  });

  it('step 9 — special offer for READY', () => {
    expect(body()).toContain('Därför vill vi ge er ett särskilt erbjudande: en första matchningsleverans utan startkostnad.');
  });

  it('step 11 — FOMO sentence for READY', () => {
    expect(body()).toContain('Erbjudandet går endast till ett fåtal utvalda transportföretag.');
  });

  it('step 12 — anonymous reference clause for READY', () => {
    expect(body()).toContain('samarbetet kan nämnas anonymt som en del av DriverNords referensarbete');
  });

  it('step 13 — CTA includes ring mig direkt', () => {
    expect(body()).toContain('ring mig direkt');
  });

  it('step 14 — signature contains Ghislain', () => {
    expect(body()).toContain('Ghislain');
  });

  it('step 14 — signature contains DriverNord', () => {
    expect(body()).toContain('DriverNord');
  });

  it('step 14 — signature contains drivernord.com', () => {
    expect(body()).toContain('drivernord.com');
  });

  it('step 14 — signature contains hej@drivernord.com', () => {
    expect(body()).toContain('hej@drivernord.com');
  });

  it('step 14 — signature contains phone number', () => {
    expect(body()).toContain('070-938 52 67');
  });
});

// ── Sender identity ───────────────────────────────────────────────────────────

describe('generateEmail — sender identity', () => {
  const allReadiness: OutreachReadiness[] = ['READY', 'THIN_BUT_USABLE', 'QUESTION_BASED', 'SUPPLY_GAP'];

  for (const readiness of allReadiness) {
    it(`sender is Ghislain, never Adam — ${readiness}`, () => {
      const r = generateEmail(make({ readiness }));
      if (!r.blocked) {
        expect(r.body).toContain('Ghislain');
        expect(r.body).not.toContain('Adam');
      }
    });
  }

  it('never uses old name Ghislain Alexandre Madiamba', () => {
    const r = generateEmail(BASE);
    if (!r.blocked) expect(r.body).not.toContain('Alexandre Madiamba');
  });
});

// ── Readiness wording ─────────────────────────────────────────────────────────

describe('generateEmail — readiness wording (step 8)', () => {
  it('READY: "finns redan förare som matchar"', () => {
    const r = generateEmail(make({ readiness: 'READY' }));
    if (!r.blocked) expect(r.body).toContain('finns redan förare som matchar');
  });

  it('THIN_BUT_USABLE: "förare som kan vara relevanta"', () => {
    const r = generateEmail(make({ readiness: 'THIN_BUT_USABLE' }));
    if (!r.blocked) expect(r.body).toContain('förare som kan vara relevanta');
  });

  it('QUESTION_BASED: "kartlägga förare och behov"', () => {
    const r = generateEmail(make({ readiness: 'QUESTION_BASED' }));
    if (!r.blocked) expect(r.body).toContain('kartlägga förare och behov');
  });

  it('SUPPLY_GAP: "kartlägger just nu förare"', () => {
    const r = generateEmail(make({ readiness: 'SUPPLY_GAP' }));
    if (!r.blocked) expect(r.body).toContain('kartlägger just nu förare');
  });

  it('READY includes shortlist offer (steps 9–12)', () => {
    const r = generateEmail(make({ readiness: 'READY' }));
    if (!r.blocked) {
      expect(r.body).toContain('utan startkostnad');
      expect(r.body).toContain('Erbjudandet går endast till ett fåtal');
      expect(r.body).toContain('nämnas anonymt');
    }
  });

  it('THIN_BUT_USABLE includes shortlist offer', () => {
    const r = generateEmail(make({ readiness: 'THIN_BUT_USABLE' }));
    if (!r.blocked) {
      expect(r.body).toContain('utan startkostnad');
      expect(r.body).toContain('Erbjudandet går endast till ett fåtal');
    }
  });

  it('QUESTION_BASED omits shortlist offer', () => {
    const r = generateEmail(make({ readiness: 'QUESTION_BASED' }));
    if (!r.blocked) {
      expect(r.body).not.toContain('utan startkostnad');
      expect(r.body).not.toContain('Erbjudandet går endast till');
      expect(r.body).not.toContain('nämnas anonymt');
    }
  });

  it('SUPPLY_GAP omits shortlist offer', () => {
    const r = generateEmail(make({ readiness: 'SUPPLY_GAP' }));
    if (!r.blocked) {
      expect(r.body).not.toContain('utan startkostnad');
      expect(r.body).not.toContain('Erbjudandet går endast till');
    }
  });
});

// ── Forbidden content ─────────────────────────────────────────────────────────

describe('generateEmail — forbidden content never appears', () => {
  const allReadiness: OutreachReadiness[] = ['READY', 'THIN_BUT_USABLE', 'QUESTION_BASED', 'SUPPLY_GAP'];

  for (const readiness of allReadiness) {
    it(`no "gratis" — ${readiness}`, () => {
      const r = generateEmail(make({ readiness }));
      if (!r.blocked) expect(r.body).not.toMatch(/\bgratis\b/i);
    });

    it(`no "0 kr" — ${readiness}`, () => {
      const r = generateEmail(make({ readiness }));
      if (!r.blocked) expect(r.body).not.toContain('0 kr');
    });

    it(`no "AI" — ${readiness}`, () => {
      const r = generateEmail(make({ readiness }));
      if (!r.blocked) expect(r.body).not.toMatch(/\bAI\b/);
    });
  }

  it('no driver names (Samir)', () => {
    const r = generateEmail(BASE);
    if (!r.blocked) expect(r.body).not.toContain('Samir');
  });

  it('no driver names (Anders)', () => {
    const r = generateEmail(BASE);
    if (!r.blocked) expect(r.body).not.toContain('Anders');
  });

  it('no driver scores (97)', () => {
    const r = generateEmail(BASE);
    if (!r.blocked) expect(r.body).not.toContain('97');
  });

  it('no driver scores (95)', () => {
    const r = generateEmail(BASE);
    if (!r.blocked) expect(r.body).not.toContain('95');
  });
});

// ── validateEmailContent ──────────────────────────────────────────────────────

describe('validateEmailContent', () => {
  it('flags gratis', () => {
    expect(validateEmailContent('Det är gratis!')).toContain('gratis');
  });

  it('flags 0 kr', () => {
    expect(validateEmailContent('Kostar 0 kr.')).toContain('0 kr');
  });

  it('flags AI', () => {
    expect(validateEmailContent('Vår AI gör jobbet.')).toContain('AI');
  });

  it('flags Adam as sender name', () => {
    expect(validateEmailContent('Hälsningar, Adam')).toContain('Adam (wrong sender name)');
  });

  it('returns empty array for clean content', () => {
    expect(validateEmailContent('Hej Ghislain Alexander Mad på DriverNord.')).toHaveLength(0);
  });

  it('flags gratis case-insensitively', () => {
    expect(validateEmailContent('GRATIS erbjudande')).toContain('gratis');
  });
});

// ── dry_run ───────────────────────────────────────────────────────────────────

describe('dry_run behaviour', () => {
  it('defaults to dry_run=true', () => {
    const r = generateEmail(BASE);
    if (!r.blocked) expect(r.dry_run).toBe(true);
  });

  it('respects dry_run=false when passed', () => {
    const r = generateEmail(BASE, { dry_run: false });
    if (!r.blocked) expect(r.dry_run).toBe(false);
  });

  it('blocked result also carries dry_run flag', () => {
    const r = generateEmail(make({ contact_email: null }));
    expect(r.dry_run).toBe(true);
  });

  it('blocked result with dry_run=false carries the flag', () => {
    const r = generateEmail(make({ contact_email: null }), { dry_run: false });
    expect(r.dry_run).toBe(false);
  });
});

// ── Rate limit ────────────────────────────────────────────────────────────────

describe('rate limit', () => {
  it('RATE_LIMIT_PER_HOUR is 2', () => {
    expect(RATE_LIMIT_PER_HOUR).toBe(2);
  });

  it('allows when sent=0', () => {
    expect(isWithinRateLimit(0)).toBe(true);
  });

  it('allows when sent=1', () => {
    expect(isWithinRateLimit(1)).toBe(true);
  });

  it('blocks when sent=2 (at limit)', () => {
    expect(isWithinRateLimit(2)).toBe(false);
  });

  it('blocks when sent=3 (above limit)', () => {
    expect(isWithinRateLimit(3)).toBe(false);
  });
});

// ── Subject line ──────────────────────────────────────────────────────────────

describe('generateEmail — subject line', () => {
  it('includes company name in subject', () => {
    const r = generateEmail(BASE);
    if (!r.blocked) expect(r.subject).toContain('Test Åkeri AB');
  });

  it('subject reflects distribution domain', () => {
    const r = generateEmail(make({ transport_domain: ['distribution'] }));
    if (!r.blocked) expect(r.subject).toContain('distribution');
  });

  it('subject reflects kylfrys domain', () => {
    const r = generateEmail(make({ transport_domain: ['kylfrys'] }));
    if (!r.blocked) expect(r.subject).toContain('kyl');
  });

  it('subject reflects schakt_bygg domain', () => {
    const r = generateEmail(make({ transport_domain: ['schakt_bygg'] }));
    if (!r.blocked) expect(r.subject).toContain('schakt');
  });
});

// ── queued_at ─────────────────────────────────────────────────────────────────

describe('generateEmail — metadata', () => {
  it('sets queued_at as ISO string', () => {
    const r = generateEmail(BASE);
    if (!r.blocked) {
      expect(() => new Date(r.queued_at)).not.toThrow();
      expect(r.queued_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('sets to field from contact_email', () => {
    const r = generateEmail(BASE);
    if (!r.blocked) expect(r.to).toBe('info@test.se');
  });
});
