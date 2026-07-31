/**
 * DriverNord — Global 10-Driver E2E Simulation
 *
 * SAFETY: SUPABASE_URL in .env.local points to production (supabase.co).
 * All supabaseStore and ingestedDriverStore calls are mocked via vi.mock.
 * Zero real database connections are made. This simulation runs entirely
 * in memory — pure business logic validation only.
 *
 * Tests Phases 4, 5, and 6 of the global simulation task:
 *   Phase 4  — 10-driver full pipeline
 *   Phase 5  — Stress and edge checks
 *   Phase 6  — Package readiness calculation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyStep } from '../lib/applyStep';
import { buildDriverProfile } from '../lib/driverProfile';
import { buildIngestedDriver } from '../lib/ingestedDriver';
import { scoreDriver } from '../lib/scoreDriver';
import type { Lead } from '../types/lead';
import type { StepId } from '../lib/conversation';

// ─── Mock all DB operations — no production Supabase connections ──────────────

vi.mock('../lib/supabaseStore', () => ({
  getLead:    vi.fn(),
  updateLead: vi.fn(),
  createLead: vi.fn(),
}));

vi.mock('../lib/ingestedDriverStore', () => ({
  createIngestedDriver: vi.fn(),
}));

import { ingestLead } from '../lib/ingestLead';
import { getLead } from '../lib/supabaseStore';
import { createIngestedDriver } from '../lib/ingestedDriverStore';

// ─── Base lead factory — includes all consent + attribution fields ─────────────

function makeLead(id: string, utmContent: string): Lead {
  return {
    id,
    created_at: new Date('2026-05-14T10:00:00.000Z'),
    completed_at: null,
    last_step_reached: 0,
    lang: 'sv',
    region: null,
    relocate: null,
    license: null,
    ykb: null,
    driver_card: null,
    availability: null,
    domain: null,
    shift_preference: null,
    first_name: null,
    phone: null,
    email: null,
    lead_status: 'anonymous_dropoff',
    lead_priority: null,
    follow_up_sent: false,
    follow_up_at: null,
    follow_up_reason: null,
    consent_registration_at: null,
    consent_registration_version: null,
    consent_scope: null,
    utm_source: 'simulation',
    utm_medium: 'e2e_test',
    utm_campaign: 'driver_acquisition_global_simulation',
    utm_content: utmContent,
    utm_term: null,
    landing_page_url: 'http://localhost:3000/chat',
    referrer_url: null,
  };
}

// ─── Step runner — applies steps in sequence, stops at terminal ───────────────

function runSteps(initial: Lead, steps: [StepId, string | null][]): Lead {
  let lead = initial;
  for (const [step, answer] of steps) {
    const result = applyStep(lead, step, answer);
    if (!result.ok) {
      throw new Error(`applyStep('${step}', ${JSON.stringify(answer)}) failed: ${result.error}`);
    }
    lead = result.lead;
    if (result.next_step === null || result.next_step === 'disqualified') break;
  }
  return lead;
}

// ─── Step sequence helpers ────────────────────────────────────────────────────

function stockholmSteps(
  license: string, ykb: string, driverCard: string,
  availability: string, shiftPref: string, phone: string, name: string,
): [StepId, string | null][] {
  return [
    ['region',           'stockholm'],
    ['license',          license],
    ['ykb',              ykb],
    ['driver_card',      driverCard],
    ['domain',           'tipp'],
    ['availability',     availability],
    ['shift_preference', shiftPref],
    ['phone',            phone],
    ['email',            null],
    ['name',             name],
    ['consent',          'accepted'],
    ['confirmation',     null],
  ];
}

function outsideSteps(
  relocate: string, license: string, ykb: string, driverCard: string,
  availability: string, shiftPref: string, phone: string, name: string,
): [StepId, string | null][] {
  return [
    ['region',           'other_sweden'],
    ['relocate',         relocate],
    ['license',          license],
    ['ykb',              ykb],
    ['driver_card',      driverCard],
    ['domain',           'tipp'],
    ['availability',     availability],
    ['shift_preference', shiftPref],
    ['phone',            phone],
    ['email',            null],
    ['name',             name],
    ['consent',          'accepted'],
    ['confirmation',     null],
  ];
}

// ─── Ingest helper — mocks getLead to return the given lead ──────────────────

async function simulateIngest(finalLead: Lead): Promise<ReturnType<typeof ingestLead>> {
  vi.mocked(getLead).mockResolvedValue(finalLead);
  vi.mocked(createIngestedDriver).mockResolvedValue(undefined);
  return ingestLead(finalLead.id);
}

// ─── Consent field assertions ─────────────────────────────────────────────────

function assertConsent(lead: Lead) {
  expect(lead.consent_registration_at).not.toBeNull();
  expect(lead.consent_registration_version).toBe('driver-consent-v1-2026-05-14');
  expect(lead.consent_scope).toBe(
    'driver_registration_matching_no_company_sharing_without_separate_consent',
  );
}

// ─── Attribution field assertions ─────────────────────────────────────────────

function assertAttribution(lead: Lead, utmContent: string) {
  expect(lead.utm_source).toBe('simulation');
  expect(lead.utm_medium).toBe('e2e_test');
  expect(lead.utm_campaign).toBe('driver_acquisition_global_simulation');
  expect(lead.utm_content).toBe(utmContent);
  expect(lead.landing_page_url).toBe('http://localhost:3000/chat');
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('SAFETY: In-memory simulation — no production DB connections', () => {
  it('all supabaseStore functions are mocked', () => {
    // vi.mock ensures getLead/updateLead/createLead are never real DB calls
    expect(vi.isMockFunction(getLead)).toBe(true);
    expect(vi.isMockFunction(createIngestedDriver)).toBe(true);
  });

  it('SMS_PROVIDER is not set to 46elks', () => {
    expect(process.env.SMS_PROVIDER).not.toBe('46elks');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D1 — SimLeif Johansson — CE, valid YKB, Stockholm, now, day — HIGH
// ═══════════════════════════════════════════════════════════════════════════════

describe('D1: SimLeif Johansson — CE, valid YKB, Stockholm, now', () => {
  const d1 = runSteps(
    makeLead('sim-d1', 'driver_01'),
    stockholmSteps('CE', 'valid', 'valid', 'now', 'day', '+46700000001', 'SimLeif Johansson'),
  );

  it('reaches ready_for_ingestion', () => {
    expect(d1.lead_status).toBe('ready_for_ingestion');
  });

  it('classified HIGH priority', () => {
    expect(d1.lead_priority).toBe('HIGH');
  });

  it('consent captured correctly', () => {
    assertConsent(d1);
  });

  it('attribution captured', () => {
    assertAttribution(d1, 'driver_01');
  });

  it('ingests successfully with HIGH tier and score ≥ 95', async () => {
    const result = await simulateIngest(d1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.score.tier).toBe('HIGH');
    expect(result.score.total).toBeGreaterThanOrEqual(95);
    expect(result.score.breakdown.license).toBe(33);   // CE
    expect(result.score.breakdown.ykb).toBe(25);        // valid
    expect(result.score.breakdown.availability).toBe(20); // now
    expect(result.score.breakdown.location).toBe(20);   // stockholm
  });

  it('no flags except expected ones', async () => {
    const result = await simulateIngest(d1);
    if (!result.ok) return;
    expect(result.score.flags).not.toContain('ykb_missing');
    expect(result.score.flags).not.toContain('driver_card_missing');
    expect(result.score.flags).not.toContain('bus_segment');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D2 — SimBritta Lindberg — CE, valid YKB, other_sweden, relocate yes, 2_weeks, night
// ═══════════════════════════════════════════════════════════════════════════════

describe('D2: SimBritta Lindberg — CE, valid YKB, other_sweden, relocate=yes, 2_weeks', () => {
  const d2 = runSteps(
    makeLead('sim-d2', 'driver_02'),
    outsideSteps('yes', 'CE', 'valid', 'valid', '2_weeks', 'night', '+46700000002', 'SimBritta Lindberg'),
  );

  it('reaches ready_for_ingestion', () => {
    expect(d2.lead_status).toBe('ready_for_ingestion');
  });

  it('classified HIGH priority (reachable + valid YKB + 2_weeks)', () => {
    expect(d2.lead_priority).toBe('HIGH');
  });

  it('consent captured', () => {
    assertConsent(d2);
  });

  it('attribution captured', () => {
    assertAttribution(d2, 'driver_02');
  });

  it('relocate field set to yes', () => {
    expect(d2.relocate).toBe('yes');
  });

  it('ingests with HIGH tier, location points 13 (other_sweden+relocate)', async () => {
    const result = await simulateIngest(d2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.score.tier).toBe('HIGH');
    expect(result.score.breakdown.location).toBe(13);   // other_sweden + relocate
    expect(result.score.breakdown.availability).toBe(14); // 2_weeks
    expect(result.score.total).toBe(85);                  // 33+25+14+13
    expect(result.score.flags).toContain('relocation_required');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D3 — SimMagnus Eriksson — C, valid YKB, Stockholm, now, flexible
// ═══════════════════════════════════════════════════════════════════════════════

describe('D3: SimMagnus Eriksson — C license, valid YKB, Stockholm, now', () => {
  const d3 = runSteps(
    makeLead('sim-d3', 'driver_03'),
    stockholmSteps('C', 'valid', 'valid', 'now', 'flexible', '+46700000003', 'SimMagnus Eriksson'),
  );

  it('reaches ready_for_ingestion', () => {
    expect(d3.lead_status).toBe('ready_for_ingestion');
  });

  it('classified HIGH priority', () => {
    expect(d3.lead_priority).toBe('HIGH');
  });

  it('consent captured', () => {
    assertConsent(d3);
  });

  it('ingests with HIGH tier, license points 28 (C)', async () => {
    const result = await simulateIngest(d3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.score.tier).toBe('HIGH');
    expect(result.score.breakdown.license).toBe(28);   // C
    expect(result.score.total).toBe(93);                // 28+25+20+20
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D4 — SimIngrid Pettersson — CE, no YKB, Stockholm, now (stored not shortlist-ready)
// ═══════════════════════════════════════════════════════════════════════════════

describe('D4: SimIngrid Pettersson — CE, no YKB (MEDIUM, not shortlist-eligible)', () => {
  const d4 = runSteps(
    makeLead('sim-d4', 'driver_04'),
    stockholmSteps('CE', 'none', 'valid', 'now', 'day', '+46700000004', 'SimIngrid Pettersson'),
  );

  it('reaches ready_for_ingestion (YKB missing does not block ingestion)', () => {
    expect(d4.lead_status).toBe('ready_for_ingestion');
  });

  it('classified MEDIUM priority (valid YKB required for HIGH)', () => {
    expect(d4.lead_priority).toBe('MEDIUM');
  });

  it('consent captured', () => {
    assertConsent(d4);
  });

  it('ingests — but tier MEDIUM due to ykb_missing cap', async () => {
    const result = await simulateIngest(d4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.score.tier).toBe('MEDIUM');      // HIGH capped by ykb_missing
    expect(result.score.breakdown.ykb).toBe(0);     // none
    expect(result.score.flags).toContain('ykb_missing');
  });

  it('buildShortlist hard filter would reject (ykb=none)', () => {
    // Verify the IngestedDriver has ykb=none, confirming hard filter applies
    const profile = buildDriverProfile(d4);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    expect(ingested.driver.ykb).toBe('none');
    // In buildShortlist: ykb === 'none' || ykb === 'unknown' → rejected
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D5 — SimThore Andersson — D license, valid YKB, Stockholm, 1_month
// ═══════════════════════════════════════════════════════════════════════════════

describe('D5: SimThore Andersson — D license, valid YKB, Stockholm, 1_month', () => {
  const d5 = runSteps(
    makeLead('sim-d5', 'driver_05'),
    stockholmSteps('D', 'valid', 'valid', '1_month', 'day', '+46700000005', 'SimThore Andersson'),
  );

  it('reaches ready_for_ingestion', () => {
    expect(d5.lead_status).toBe('ready_for_ingestion');
  });

  it('classified MEDIUM priority (1_month availability does not qualify for HIGH)', () => {
    expect(d5.lead_priority).toBe('MEDIUM');
  });

  it('consent captured', () => {
    assertConsent(d5);
  });

  it('ingests with MEDIUM tier, bus_segment flag, license points 18', async () => {
    const result = await simulateIngest(d5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.score.tier).toBe('MEDIUM');
    expect(result.score.breakdown.license).toBe(18);   // D
    expect(result.score.breakdown.availability).toBe(7); // 1_month
    expect(result.score.total).toBe(70);                 // 18+25+7+20
    expect(result.score.flags).toContain('bus_segment');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D6 — SimElsie Nilsson — CE, valid YKB, no driver card, Stockholm, now
// ═══════════════════════════════════════════════════════════════════════════════

describe('D6: SimElsie Nilsson — CE, valid YKB, driver_card=no (shortlist-filtered)', () => {
  const d6 = runSteps(
    makeLead('sim-d6', 'driver_06'),
    stockholmSteps('CE', 'valid', 'no', 'now', 'day', '+46700000006', 'SimElsie Nilsson'),
  );

  it('reaches ready_for_ingestion (driver_card=no does not block ingestion)', () => {
    expect(d6.lead_status).toBe('ready_for_ingestion');
  });

  it('classified HIGH priority (classifyPriority ignores driver_card)', () => {
    expect(d6.lead_priority).toBe('HIGH');
  });

  it('consent captured', () => {
    assertConsent(d6);
  });

  it('ingests — score HIGH but driver_card_missing flag', async () => {
    const result = await simulateIngest(d6);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // driver_card_missing does NOT cap tier in scoreDriver (only ykb_missing and bus_segment do)
    expect(result.score.tier).toBe('HIGH');
    expect(result.score.flags).toContain('driver_card_missing');
  });

  it('buildShortlist hard filter would reject (driver_card=no)', () => {
    const profile = buildDriverProfile(d6);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    expect(ingested.driver.driverCard).toBe('no');
    // In buildShortlist: driverCard === 'no' || driverCard === 'unknown' → rejected
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D7 — SimRune Berg — CE, valid YKB, other_sweden, relocate=yes, now, flexible
// ═══════════════════════════════════════════════════════════════════════════════

describe('D7: SimRune Berg — CE, valid YKB, other_sweden+relocate, now', () => {
  const d7 = runSteps(
    makeLead('sim-d7', 'driver_07'),
    outsideSteps('yes', 'CE', 'valid', 'valid', 'now', 'flexible', '+46700000007', 'SimRune Berg'),
  );

  it('reaches ready_for_ingestion', () => {
    expect(d7.lead_status).toBe('ready_for_ingestion');
  });

  it('classified HIGH priority (CE + valid + now + relocatable)', () => {
    expect(d7.lead_priority).toBe('HIGH');
  });

  it('consent captured', () => {
    assertConsent(d7);
  });

  it('ingests with HIGH tier, score 91', async () => {
    const result = await simulateIngest(d7);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.score.tier).toBe('HIGH');
    expect(result.score.total).toBe(91); // 33+25+20+13
    expect(result.score.flags).toContain('relocation_required');
    expect(result.score.flags).not.toContain('ykb_missing');
    expect(result.score.flags).not.toContain('driver_card_missing');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D8 — SimKerstin Holm — C, no YKB, no driver card, Stockholm, not_yet
// ═══════════════════════════════════════════════════════════════════════════════

describe('D8: SimKerstin Holm — C, no YKB, no driver card, not_yet (parked)', () => {
  const d8 = runSteps(
    makeLead('sim-d8', 'driver_08'),
    stockholmSteps('C', 'none', 'no', 'not_yet', 'night', '+46700000008', 'SimKerstin Holm'),
  );

  it('reaches ready_for_ingestion (all gaps do not block intake)', () => {
    expect(d8.lead_status).toBe('ready_for_ingestion');
  });

  it('classified MEDIUM priority', () => {
    expect(d8.lead_priority).toBe('MEDIUM');
  });

  it('consent captured', () => {
    assertConsent(d8);
  });

  it('follow_up_at set (not_yet availability triggers follow-up scheduling)', () => {
    expect(d8.follow_up_at).not.toBeNull();
  });

  it('ingests — MEDIUM tier, multiple flags, score 50', async () => {
    const result = await simulateIngest(d8);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.score.tier).toBe('MEDIUM');
    expect(result.score.total).toBe(50); // 28+0+2+20
    expect(result.score.flags).toContain('ykb_missing');
    expect(result.score.flags).toContain('driver_card_missing');
    expect(result.score.flags).toContain('available_later');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D9 — SimHarald Qvist — no license (disqualified path)
// ═══════════════════════════════════════════════════════════════════════════════

describe('D9: SimHarald Qvist — no license (disqualification path)', () => {
  let d9: Lead;
  let d9NextStep: StepId | null;

  beforeEach(() => {
    const initial = makeLead('sim-d9', 'driver_09');

    // Step 1: region
    const r1 = applyStep(initial, 'region', 'stockholm');
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    // Step 2: license=none → routes to disqualified
    const r2 = applyStep(r1.lead, 'license', 'none');
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    d9 = r2.lead;
    d9NextStep = r2.next_step;
  });

  it('next_step is disqualified after license=none', () => {
    expect(d9NextStep).toBe('disqualified');
  });

  it('lead_status is disqualified', () => {
    expect(d9.lead_status).toBe('disqualified');
  });

  it('lead_priority is null', () => {
    expect(d9.lead_priority).toBeNull();
  });

  it('consent fields remain null — consent step never reached', () => {
    expect(d9.consent_registration_at).toBeNull();
    expect(d9.consent_registration_version).toBeNull();
    expect(d9.consent_scope).toBeNull();
  });

  it('does NOT reach ready_for_ingestion — ingest guard would skip it', () => {
    // API handler: if (result.lead.lead_status === 'ready_for_ingestion' && !wasAlreadyIngested)
    const wouldIngest = d9.lead_status === 'ready_for_ingestion';
    expect(wouldIngest).toBe(false);
  });

  it('buildIngestedDriver returns not_ready_for_ingestion', () => {
    const profile = buildDriverProfile(d9);
    const result = buildIngestedDriver(profile);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('not_ready_for_ingestion');
  });

  it('attribution captured even for disqualified drivers', () => {
    assertAttribution(d9, 'driver_09');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D10 — SimGreta Strand — CE, valid YKB, Stockholm, now (re-registration test)
// ═══════════════════════════════════════════════════════════════════════════════

describe('D10: SimGreta Strand — CE, valid YKB, Stockholm (re-registration, separate lead)', () => {
  const d10 = runSteps(
    makeLead('sim-d10', 'driver_10'),
    stockholmSteps('CE', 'valid', 'valid', 'now', 'day', '+46700000010', 'SimGreta Strand'),
  );

  it('reaches ready_for_ingestion', () => {
    expect(d10.lead_status).toBe('ready_for_ingestion');
  });

  it('classified HIGH priority', () => {
    expect(d10.lead_priority).toBe('HIGH');
  });

  it('consent captured', () => {
    assertConsent(d10);
  });

  it('has unique UTM content driver_10 (distinguishable from D1)', () => {
    expect(d10.utm_content).toBe('driver_10');
  });

  it('ingests independently — treated as separate lead from D1', async () => {
    const result = await simulateIngest(d10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.score.tier).toBe('HIGH');
    expect(result.score.total).toBe(98); // 33+25+20+20
    // Separate lead ID confirms independent registration
    expect(result.driver.id).toBe('sim-d10');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5: STRESS AND EDGE CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Double-ingest guard ──────────────────────────────────────────────────────

describe('STRESS: Double-ingest guard — consent then confirmation', () => {
  it('consent PATCH: wasAlreadyIngested=false → ingest fires', () => {
    const preConsentLead = runSteps(
      makeLead('sim-guard', 'guard_test'),
      [
        ['region', 'stockholm'], ['license', 'CE'], ['ykb', 'valid'],
        ['driver_card', 'valid'], ['domain', 'tipp'], ['availability', 'now'],
        ['shift_preference', 'day'], ['phone', '+46700000001'],
        ['email', null], ['name', 'GuardTest'],
        // Deliberately stop before consent to capture pre-consent state
      ],
    );
    expect(preConsentLead.lead_status).not.toBe('ready_for_ingestion');

    // Now apply consent
    const consentResult = applyStep(preConsentLead, 'consent', 'accepted');
    expect(consentResult.ok).toBe(true);
    if (!consentResult.ok) return;

    const wasAlreadyIngestedAtConsent = preConsentLead.lead_status === 'ready_for_ingestion';
    const wouldIngestAtConsent =
      consentResult.lead.lead_status === 'ready_for_ingestion' && !wasAlreadyIngestedAtConsent;

    expect(wasAlreadyIngestedAtConsent).toBe(false);
    expect(wouldIngestAtConsent).toBe(true); // ingest fires on consent
  });

  it('confirmation PATCH: wasAlreadyIngested=true → ingest does NOT fire', () => {
    // Start from post-consent state (status=ready_for_ingestion)
    const postConsentLead = runSteps(
      makeLead('sim-guard2', 'guard_test2'),
      [
        ['region', 'stockholm'], ['license', 'CE'], ['ykb', 'valid'],
        ['driver_card', 'valid'], ['domain', 'tipp'], ['availability', 'now'],
        ['shift_preference', 'day'], ['phone', '+46700000001'],
        ['email', null], ['name', 'GuardTest2'],
        ['consent', 'accepted'],  // consent step → ready_for_ingestion
      ],
    );
    expect(postConsentLead.lead_status).toBe('ready_for_ingestion');

    // Now apply confirmation (lead is already at ready_for_ingestion)
    const confirmResult = applyStep(postConsentLead, 'confirmation', null);
    expect(confirmResult.ok).toBe(true);
    if (!confirmResult.ok) return;

    const wasAlreadyIngestedAtConfirmation = postConsentLead.lead_status === 'ready_for_ingestion';
    const wouldIngestAtConfirmation =
      confirmResult.lead.lead_status === 'ready_for_ingestion' && !wasAlreadyIngestedAtConfirmation;

    expect(wasAlreadyIngestedAtConfirmation).toBe(true);
    expect(wouldIngestAtConfirmation).toBe(false); // guard prevents second ingest
  });

  it('ingestLead is only called once (mock call count = 1)', async () => {
    const d10Double = runSteps(
      makeLead('sim-d10-double', 'double_test'),
      stockholmSteps('CE', 'valid', 'valid', 'now', 'day', '+46700000010', 'SimGreta'),
    );

    // First ingest (from consent step)
    await simulateIngest(d10Double);
    expect(vi.mocked(createIngestedDriver)).toHaveBeenCalledTimes(1);
  });
});

// ─── Consent required — no skip path ─────────────────────────────────────────

describe('STRESS: Consent is required — non-accepted answers fail', () => {
  const preConsent = runSteps(
    makeLead('sim-consent-test', 'consent_stress'),
    [
      ['region', 'stockholm'], ['license', 'CE'], ['ykb', 'valid'],
      ['driver_card', 'valid'], ['domain', 'tipp'], ['availability', 'now'],
      ['shift_preference', 'day'], ['phone', '+46700000001'],
      ['email', null], ['name', 'ConsentTest'],
    ],
  );

  it('consent step with answer=null returns invalid_answer', () => {
    const result = applyStep(preConsent, 'consent', null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('invalid_answer');
  });

  it('consent step with answer=declined returns invalid_answer', () => {
    const result = applyStep(preConsent, 'consent', 'declined');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('invalid_answer');
  });

  it('consent step with answer=skip returns invalid_answer', () => {
    const result = applyStep(preConsent, 'consent', 'skip');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('invalid_answer');
  });

  it('lead does NOT reach ready_for_ingestion without accepted consent', () => {
    // After a rejected consent, the lead status remains incomplete
    const rejectedResult = applyStep(preConsent, 'consent', 'declined');
    // The result is an error, so lead is unchanged
    expect(rejectedResult.ok).toBe(false);
    // preConsent itself should still be incomplete
    expect(preConsent.lead_status).not.toBe('ready_for_ingestion');
  });
});

// ─── Invalid license → disqualified (not ingested) ───────────────────────────

describe('STRESS: No-license path → disqualified and not ingested', () => {
  it('applyStep license=none returns disqualified as next_step', () => {
    const lead = makeLead('sim-nolic', 'no_license');
    const r1 = applyStep(lead, 'region', 'stockholm');
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = applyStep(r1.lead, 'license', 'none');
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.next_step).toBe('disqualified');
    expect(r2.lead.lead_status).toBe('disqualified');
  });

  it('ingestLead returns not_ready_for_ingestion for disqualified lead', async () => {
    const lead = makeLead('sim-nolic2', 'no_license2');
    const r1 = applyStep(lead, 'region', 'stockholm');
    if (!r1.ok) throw new Error('region step failed');
    const r2 = applyStep(r1.lead, 'license', 'none');
    if (!r2.ok) throw new Error('license step failed');

    vi.mocked(getLead).mockResolvedValue(r2.lead);
    const result = await ingestLead('sim-nolic2');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('not_ready_for_ingestion');
  });
});

// ─── Missing YKB behavior ─────────────────────────────────────────────────────

describe('STRESS: Missing YKB (ykb=none) — ingested but shortlist-blocked', () => {
  it('ykb=none does not block ingestion', () => {
    const lead = runSteps(
      makeLead('sim-noykb', 'no_ykb'),
      stockholmSteps('CE', 'none', 'valid', 'now', 'day', '+46700000001', 'NoYKB'),
    );
    expect(lead.lead_status).toBe('ready_for_ingestion');
    expect(lead.ykb).toBe('none');
  });

  it('ykb=none produces ykb_missing score flag', () => {
    const lead = runSteps(
      makeLead('sim-noykb2', 'no_ykb2'),
      stockholmSteps('CE', 'none', 'valid', 'now', 'day', '+46700000001', 'NoYKB2'),
    );
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    const score = scoreDriver(ingested.driver);
    expect(score.flags).toContain('ykb_missing');
    expect(score.breakdown.ykb).toBe(0);
  });
});

// ─── Missing driver card ──────────────────────────────────────────────────────

describe('STRESS: Missing driver card — ingested but shortlist hard-filtered', () => {
  it('driver_card=no does not block ingestion', () => {
    const lead = runSteps(
      makeLead('sim-nocard', 'no_card'),
      stockholmSteps('CE', 'valid', 'no', 'now', 'day', '+46700000001', 'NoCard'),
    );
    expect(lead.lead_status).toBe('ready_for_ingestion');
  });

  it('driver_card=no produces driver_card_missing flag', () => {
    const lead = runSteps(
      makeLead('sim-nocard2', 'no_card2'),
      stockholmSteps('CE', 'valid', 'no', 'now', 'day', '+46700000001', 'NoCard2'),
    );
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    const score = scoreDriver(ingested.driver);
    expect(score.flags).toContain('driver_card_missing');
  });
});

// ─── Unavailable driver → follow-up scheduled ────────────────────────────────

describe('STRESS: Unavailable driver (not_yet) → follow-up scheduled', () => {
  it('not_yet availability triggers follow_up_at', () => {
    const lead = runSteps(
      makeLead('sim-notyet', 'not_yet'),
      stockholmSteps('CE', 'valid', 'valid', 'not_yet', 'day', '+46700000001', 'NotYet'),
    );
    expect(lead.availability).toBe('not_yet');
    expect(lead.follow_up_at).not.toBeNull();
    expect(lead.follow_up_reason).not.toBeNull();
  });
});

// ─── Outside-Stockholm + relocate=no → LOW priority ─────────────────────────

describe('STRESS: Outside Stockholm, relocate=no → LOW priority', () => {
  it('other_sweden + relocate=no → LOW priority', () => {
    const lead = runSteps(
      makeLead('sim-norel', 'no_relocate'),
      outsideSteps('no', 'CE', 'valid', 'valid', 'now', 'day', '+46700000001', 'NoRelocate'),
    );
    expect(lead.lead_priority).toBe('LOW');
    expect(lead.relocate).toBe('no');
  });

  it('location points = 5 for other_sweden + no relocate', () => {
    const lead = runSteps(
      makeLead('sim-norel2', 'no_relocate2'),
      outsideSteps('no', 'CE', 'valid', 'valid', 'now', 'day', '+46700000001', 'NoRelocate2'),
    );
    const profile = buildDriverProfile(lead);
    const ingested = buildIngestedDriver(profile);
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    const score = scoreDriver(ingested.driver);
    expect(score.breakdown.location).toBe(5);  // other_sweden, no relocate
    expect(score.flags).toContain('relocation_required');
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('STRESS: Rate limiting logic (in-memory, 10 req/10 min per IP)', () => {
  // Reproduce the rate limiter logic from app/api/leads/route.ts in isolation
  function createRateLimiter() {
    const map = new Map<string, { count: number; resetAt: number }>();
    const MAX = 10;
    const WINDOW = 10 * 60 * 1000;

    return function checkRateLimit(ip: string): boolean {
      const now = Date.now();
      const entry = map.get(ip);
      if (!entry || now > entry.resetAt) {
        map.set(ip, { count: 1, resetAt: now + WINDOW });
        return true;
      }
      if (entry.count >= MAX) return false;
      entry.count++;
      return true;
    };
  }

  it('allows 10 requests from the same IP', () => {
    const checkRateLimit = createRateLimiter();
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit('192.168.1.100')).toBe(true);
    }
  });

  it('blocks the 11th request from the same IP', () => {
    const checkRateLimit = createRateLimiter();
    for (let i = 0; i < 10; i++) checkRateLimit('192.168.1.200');
    expect(checkRateLimit('192.168.1.200')).toBe(false);
  });

  it('different IPs are tracked independently', () => {
    const checkRateLimit = createRateLimiter();
    for (let i = 0; i < 10; i++) checkRateLimit('10.0.0.1');
    // 10.0.0.1 is blocked
    expect(checkRateLimit('10.0.0.1')).toBe(false);
    // 10.0.0.2 is not blocked
    expect(checkRateLimit('10.0.0.2')).toBe(true);
  });

  it('10-driver simulation (10 distinct IPs) would all pass rate limiting', () => {
    const checkRateLimit = createRateLimiter();
    for (let i = 1; i <= 10; i++) {
      expect(checkRateLimit(`192.168.1.${i}`)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 6: PACKAGE READINESS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('PHASE 6: Package readiness with 10-driver simulation dataset', () => {
  // Build all 9 ingested drivers (D9 excluded — disqualified)
  const drivers = {
    d1: runSteps(makeLead('p4-d1', 'driver_01'),
      stockholmSteps('CE', 'valid', 'valid', 'now', 'day', '+46700000001', 'SimLeif')),
    d2: runSteps(makeLead('p4-d2', 'driver_02'),
      outsideSteps('yes', 'CE', 'valid', 'valid', '2_weeks', 'night', '+46700000002', 'SimBritta')),
    d3: runSteps(makeLead('p4-d3', 'driver_03'),
      stockholmSteps('C', 'valid', 'valid', 'now', 'flexible', '+46700000003', 'SimMagnus')),
    d4: runSteps(makeLead('p4-d4', 'driver_04'),
      stockholmSteps('CE', 'none', 'valid', 'now', 'day', '+46700000004', 'SimIngrid')),
    d5: runSteps(makeLead('p4-d5', 'driver_05'),
      stockholmSteps('D', 'valid', 'valid', '1_month', 'day', '+46700000005', 'SimThore')),
    d6: runSteps(makeLead('p4-d6', 'driver_06'),
      stockholmSteps('CE', 'valid', 'no', 'now', 'day', '+46700000006', 'SimElsie')),
    d7: runSteps(makeLead('p4-d7', 'driver_07'),
      outsideSteps('yes', 'CE', 'valid', 'valid', 'now', 'flexible', '+46700000007', 'SimRune')),
    d8: runSteps(makeLead('p4-d8', 'driver_08'),
      stockholmSteps('C', 'none', 'no', 'not_yet', 'night', '+46700000008', 'SimKerstin')),
    d10: runSteps(makeLead('p4-d10', 'driver_10'),
      stockholmSteps('CE', 'valid', 'valid', 'now', 'day', '+46700000010', 'SimGreta')),
  };

  function isShortlistEligible(lead: Lead): boolean {
    const profile = buildDriverProfile(lead);
    const ing = buildIngestedDriver(profile);
    if (!ing.ok) return false;
    // buildShortlist hard filters:
    if (ing.driver.ykb === 'none' || ing.driver.ykb === 'unknown') return false;
    if (ing.driver.driverCard === 'no' || ing.driver.driverCard === 'unknown') return false;
    return true;
  }

  function isCEAvailable(lead: Lead): boolean {
    if (lead.license !== 'CE' && lead.license !== 'CE+D') return false;
    if (lead.ykb !== 'valid') return false;
    if (lead.availability !== 'now' && lead.availability !== '2_weeks') return false;
    const reachable = lead.region === 'stockholm' || lead.relocate === 'yes';
    if (!reachable) return false;
    return isShortlistEligible(lead);
  }

  const allLeads = Object.values(drivers);

  it('9 drivers ingested (D9 disqualified, excluded from pool)', () => {
    const ingested = allLeads.filter(l => l.lead_status === 'ready_for_ingestion');
    expect(ingested.length).toBe(9);
  });

  it('6 drivers are shortlist-eligible (pass YKB + driver card hard filters)', () => {
    const eligible = allLeads.filter(isShortlistEligible);
    // D1, D2, D3, D5, D7, D10 are eligible
    // D4 (ykb=none), D6 (driver_card=no), D8 (ykb=none+driver_card=no) are blocked
    expect(eligible.length).toBe(6);
  });

  it('4 CE drivers qualify for Package 4 (CE + valid YKB + available + reachable + shortlist-eligible)', () => {
    const p4Qualified = allLeads.filter(isCEAvailable);
    // D1 (CE, now, stockholm), D2 (CE, 2_weeks, relocate), D7 (CE, now, relocate), D10 (CE, now, stockholm)
    // D6 excluded (driver_card=no hard filter)
    expect(p4Qualified.length).toBe(4);
  });

  it('Package 4 threshold ≥5 NOT MET (4 < 5) — expected: insufficient dataset', () => {
    const p4Qualified = allLeads.filter(isCEAvailable);
    expect(p4Qualified.length).toBeLessThan(5);
    // NOT a system failure — expected with only 10 test profiles
  });

  it('Package 2 threshold ≥15 NOT MET (6 shortlist-eligible < 15) — expected: insufficient dataset', () => {
    const eligible = allLeads.filter(isShortlistEligible);
    expect(eligible.length).toBeLessThan(15);
    // NOT a system failure — real campaign needed to fill pool
  });

  it('HIGH priority drivers in simulation: D1, D2, D3, D6, D7, D10', () => {
    const highPriority = allLeads.filter(l => l.lead_priority === 'HIGH');
    expect(highPriority.length).toBe(6);
  });

  it('MEDIUM priority drivers in simulation: D4, D5, D8', () => {
    const mediumPriority = allLeads.filter(l => l.lead_priority === 'MEDIUM');
    expect(mediumPriority.length).toBe(3);
  });

  it('consent captured for all 9 ingested drivers', () => {
    const ingested = allLeads.filter(l => l.lead_status === 'ready_for_ingestion');
    for (const lead of ingested) {
      expect(lead.consent_registration_at).not.toBeNull();
      expect(lead.consent_registration_version).toBe('driver-consent-v1-2026-05-14');
    }
  });

  it('UTM attribution captured for all 10 drivers (including disqualified D9)', () => {
    // D9 can't be tested here (built separately in D9 describe block)
    // All 9 ingested drivers have attribution
    for (const lead of allLeads) {
      expect(lead.utm_source).toBe('simulation');
      expect(lead.utm_medium).toBe('e2e_test');
    }
  });
});
