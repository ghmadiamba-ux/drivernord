// lib/scanImportData.ts
//
// Typed records from docs/business/company-needs-refresh-national-scan-v1.csv
// These are the 17 real company records (DN-001 to DN-017).
// Simulation rows (ND-P0x) are excluded — they belong to the DB cleanup path.
//
// Source: company-needs-refresh-national-scan-v1.csv (2026-05-19)
// These records are research-grade. They represent public-data signals,
// not confirmed staffing contracts. Founder validation is required before
// any external outreach.

import type { CompanyLicense, NeedType } from './companyNeed';
import type { Domain, Region } from '../types/lead';

export type ScanDraftStatus =
  | 'ready_for_review'
  | 'incomplete'
  | 'rejected';

export type ResearchStatus =
  | 'not_started'
  | 'researching'
  | 'enriched'
  | 'incomplete'
  | 'rejected';

export type UrgencySignal = 'none' | 'single_ad' | 'repeated_ads' | 'stated_urgency';

export type TargetSegment =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'agency'
  | 'A/E' | 'B/E' | 'A/D' | 'B/D';

export type BarrierLevel = 'low' | 'medium' | 'high' | 'enterprise_only';

export type DecisionMakerRole =
  | 'owner' | 'VD' | 'transport_manager' | 'driftchef'
  | 'operations_director' | 'HR_manager' | 'unknown';

export interface ScanRecord {
  // Stable CSV identifier — used as idempotency key in company_need_drafts
  scan_record_id: string;

  // Company research target fields
  company_name:          string;
  region:                'stockholm' | 'stockholm_region' | 'malardalen' | 'other_sweden';
  city:                  string;
  segment:               TargetSegment;
  research_status:       ResearchStatus;
  visible_driver_need:   boolean;
  job_ads_url:           string | null;
  license_mentions:      CompanyLicense[];
  ykb_mentioned:         boolean;
  driver_card_mentioned: boolean;
  urgency_signal:        UrgencySignal;
  contact_email:         string | null;
  contact_phone:         string | null;
  decision_maker_name:   string | null;
  decision_maker_role:   DecisionMakerRole;
  barrier_level:         BarrierLevel;
  pilot_accessibility_score: number; // 0-100 (pilot_readiness_score × 10)
  opportunity_score:     number;     // 0-100 (avg of pain+fit × 10)

  // Draft-specific fields (need requirement data)
  license_required:   CompanyLicense | null;
  domain_required:    Domain | null;
  location_region:    Region;
  ykb_required:       boolean;
  driver_card_required: boolean;
  shift_type:         'day' | 'night' | 'weekend' | 'flexible';
  urgency:            'standard' | 'urgent' | 'emergency';
  drivers_needed:     number | null;
  constraints:        string | null;  // ADR requirements, experience minimums, etc.
  missing_fields:     string[];

  // Draft lifecycle
  draft_status:      ScanDraftStatus;
  rejection_reason:  string | null;

  // Evidence / metadata
  source_call_notes: string;  // the CSV notes field — primary evidence
  metadata: {
    recruitment_pain_score:  number;
    drivernord_fit_score:    number;
    contactability_score:    number;
    pilot_readiness_score:   number;
    ad_status:               string;
    existing_supplier:       string | null;
    classification:          string;
    recommended_action:      string;
    scan_date:               string;
  };
}

export const SCAN_RECORDS: ScanRecord[] = [
  {
    scan_record_id:  'DN-001',
    company_name:    'Canoil Transport AB',
    region:          'stockholm',
    city:            'Södertälje',
    segment:         'A/E',
    research_status: 'enriched',
    visible_driver_need: true,
    job_ads_url:     'https://canoil.se/jobb/tankbilschauffor/',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: true,
    urgency_signal:  'repeated_ads',
    contact_email:   'tf@canoil.se',
    contact_phone:   '0707771059',
    decision_maker_name: 'Thomas Fredriksson',
    decision_maker_role: 'transport_manager',
    barrier_level:   'low',
    pilot_accessibility_score: 90,
    opportunity_score: 90,
    license_required:    'CE',
    domain_required:     'tanker',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: true,
    shift_type:          'day',
    urgency:             'urgent',
    drivers_needed:      2,
    constraints: 'ADR Tank required. CE+YKB+förarkort. F-tax contractors welcome.',
    missing_fields: [],
    draft_status:    'ready_for_review',
    rejection_reason: null,
    source_call_notes:
      'Company in expansion mode (acquired Kungsbacka Oljecenter 2025). F-tax contractors welcome. ' +
      'CE+ADR Tank+YKB+förarkort required. Rolling selection - no deadline shown. ' +
      'Transport manager Thomas Fredriksson confirmed via email alias logic. Södertälje depot national operator.',
    metadata: {
      recruitment_pain_score: 9,
      drivernord_fit_score:   9,
      contactability_score:   9,
      pilot_readiness_score:  9.0,
      ad_status:              'active_rolling',
      existing_supplier:      null,
      classification:         'founder_review_required',
      recommended_action:
        'Founder validates need still current → add to company_needs license=CE domain=tanker urgency=urgent → match after ADR drivers exist',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-002',
    company_name:    'JPC Entreprenad AB',
    region:          'stockholm',
    city:            'Lidingö',
    segment:         'A',
    research_status: 'enriched',
    visible_driver_need: true,
    job_ads_url:     'https://jpcentreprenad.se/sok-jobb/',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: true,
    urgency_signal:  'single_ad',
    contact_email:   'info@jpcentreprenad.se',
    contact_phone:   '08-410 36 90',
    decision_maker_name: 'Harry Norberg',
    decision_maker_role: 'VD',
    barrier_level:   'low',
    pilot_accessibility_score: 83,
    opportunity_score: 85,
    license_required:    'CE',
    domain_required:     'schakt_bygg',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: true,
    shift_type:          'day',
    urgency:             'urgent',
    drivers_needed:      4,
    constraints: 'CE+YKB for schakt/tippbil.',
    missing_fields: [],
    draft_status:    'ready_for_review',
    rejection_reason: null,
    source_call_notes:
      '4 open roles confirmed on own website including Lastbilsförare/Schaktbilsförare. ' +
      'CE+YKB for schakt/tippbil. 25 employees. Mark- och anläggningsföretag Lidingö. ' +
      'VD Harry Norberg — direct email available. No procurement portal. Ideal SME pilot scale.',
    metadata: {
      recruitment_pain_score: 8,
      drivernord_fit_score:   9,
      contactability_score:   8,
      pilot_readiness_score:  8.3,
      ad_status:              'active_no_deadline',
      existing_supplier:      null,
      classification:         'founder_review_required',
      recommended_action:
        'Founder validates 4 roles still listed → add to company_needs with license=CE domain=schakt_bygg urgency=urgent → first outreach candidate',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-003',
    company_name:    'Edvardssons Last och Schakt AB',
    region:          'stockholm',
    city:            'Ekerö/Botkyrka',
    segment:         'A',
    research_status: 'enriched',
    visible_driver_need: true,
    job_ads_url:     'https://se.linkedin.com/jobs/view/schaktbils-chauffor-at-edvardssons-last-och-schakt-ab-4096694551',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: false,
    urgency_signal:  'single_ad',
    contact_email:   'Marika@fmbcentral.se',
    contact_phone:   '08-839190',
    decision_maker_name: 'Marika Theresia Edvardsson',
    decision_maker_role: 'VD',
    barrier_level:   'low',
    pilot_accessibility_score: 83,
    opportunity_score: 85,
    license_required:    'CE',
    domain_required:     'schakt_bygg',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: false,
    shift_type:          'day',
    urgency:             'urgent',
    drivers_needed:      2,
    constraints: 'CE schakt/tippbil.',
    missing_fields: [],
    draft_status:    'ready_for_review',
    rejection_reason: null,
    source_call_notes:
      'LinkedIn active (job ID 4096694551). Also: gabriel@fmbcentral.se confirmed new contact. ' +
      'CE schakt/tippbil. Owner-operated. VD Marika Edvardsson direct email confirmed. ' +
      'Multiple ad waves historically. Spring construction season peak now. Ekerö base.',
    metadata: {
      recruitment_pain_score: 8,
      drivernord_fit_score:   9,
      contactability_score:   8,
      pilot_readiness_score:  8.3,
      ad_status:              'active_linkedin',
      existing_supplier:      null,
      classification:         'founder_review_required',
      recommended_action:
        'Founder validates LinkedIn listing still live → add to company_needs with license=CE domain=schakt_bygg urgency=urgent → approach Marika@fmbcentral.se',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-004',
    company_name:    'Kyl- och Frysexpressen Mälardalen AB',
    region:          'stockholm',
    city:            'Årsta',
    segment:         'B/D',
    research_status: 'enriched',
    visible_driver_need: true,
    job_ads_url:     'https://kylofrysexpressen.se/karriar/lediga-jobb/',
    license_mentions: ['CE', 'C'],
    ykb_mentioned:   true,
    driver_card_mentioned: true,
    urgency_signal:  'repeated_ads',
    contact_email:   'lokalt@kylofrysexpressen.se',
    contact_phone:   '08-744 78 70',
    decision_maker_name: 'Robert Flodman',
    decision_maker_role: 'VD',
    barrier_level:   'low',
    pilot_accessibility_score: 80,
    opportunity_score: 85,
    license_required:    'CE',
    domain_required:     'kylfrys',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: true,
    shift_type:          'day',
    urgency:             'urgent',
    drivers_needed:      13,
    constraints: 'Supplementary source — existing Jobwise AB relationship for C drivers.',
    missing_fields: [],
    draft_status:    'ready_for_review',
    rejection_reason: null,
    source_call_notes:
      'Highest volume need: 3 CE + 10 C drivers actively sought. ~80 trucks, 236 employees. ' +
      'EXISTING Jobwise AB relationship for C drivers. Career page active (SSL issue at scan time but indexed). ' +
      'Social recruiting via Jobtip. Position as supplementary pool not replacement. ' +
      'VD Robert Flodman — LinkedIn primary channel. Partihandlarvägen 46 Årsta.',
    metadata: {
      recruitment_pain_score: 10,
      drivernord_fit_score:   7,
      contactability_score:   7,
      pilot_readiness_score:  8.0,
      ad_status:              'active_rolling',
      existing_supplier:      'jobwise',
      classification:         'founder_review_required',
      recommended_action:
        'Founder reviews Jobwise risk → if proceeding: approach LinkedIn (Robert Flodman) as supplementary source → add CE need to company_needs',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-005',
    company_name:    'Enskede Bilexpress AB',
    region:          'stockholm',
    city:            'Norsborg/Tumba',
    segment:         'A/E',
    research_status: 'enriched',
    visible_driver_need: true,
    job_ads_url:     'https://se.linkedin.com/jobs/view/ce-chauffor-till-enskede-bilexpress-at-tillvaxt-botkyrka-ab-3831686557',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: true,
    urgency_signal:  'repeated_ads',
    contact_email:   'david.sjolund@enskedebilexpress.se',
    contact_phone:   '070-897 01 04',
    decision_maker_name: 'David Sjölund',
    decision_maker_role: 'VD',
    barrier_level:   'low',
    pilot_accessibility_score: 80,
    opportunity_score: 80,
    license_required:    'CE',
    domain_required:     'distribution',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: true,
    shift_type:          'day',
    urgency:             'urgent',
    drivers_needed:      2,
    constraints: 'Frame as supplementary to Tillväxt Botkyrka existing channel.',
    missing_fields: [],
    draft_status:    'ready_for_review',
    rejection_reason: null,
    source_call_notes:
      '3+ LinkedIn CE ad waves (IDs 3831686557, 3805532424, 3302214759) via Tillväxt Botkyrka. ' +
      'Chronic need. CEO David Sjölund direct email+mobile confirmed. Onroad network member. ' +
      'Fair Transport certified — quality-minded buyer. Slagsta terminal Tumba. Mercedes Actros 2020 fleet.',
    metadata: {
      recruitment_pain_score: 8,
      drivernord_fit_score:   8,
      contactability_score:   8,
      pilot_readiness_score:  8.0,
      ad_status:              'active_multiple_waves',
      existing_supplier:      'tillvaxt_botkyrka',
      classification:         'founder_review_required',
      recommended_action:
        'Founder validates need still active → approach David Sjölund as supplementary CE source → add to company_needs',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-006',
    company_name:    'Thermobud AB',
    region:          'stockholm',
    city:            'Gustavsberg/Värmdö',
    segment:         'A',
    research_status: 'enriched',
    visible_driver_need: true,
    job_ads_url:     'https://vakanser.se/jobb/distributionsforare+till+familjeagt+kyl-+och+frysakeri/',
    license_mentions: ['C'],
    ykb_mentioned:   true,
    driver_card_mentioned: false,
    urgency_signal:  'repeated_ads',
    contact_email:   'info@thermobud.se',
    contact_phone:   '0709-417 000',
    decision_maker_name: null,
    decision_maker_role: 'owner',
    barrier_level:   'medium',
    pilot_accessibility_score: 70,
    opportunity_score: 75,
    license_required:    'C',
    domain_required:     'kylfrys',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: false,
    shift_type:          'flexible',
    urgency:             'standard',
    drivers_needed:      3,
    constraints: 'FRC pharma-grade kylfrys (-30°C to +30°C). 24/7 ops.',
    missing_fields: ['decision_maker_name'],
    draft_status:    'ready_for_review',
    rejection_reason: null,
    source_call_notes:
      'Family company 20+ years. FRC pharma-grade kylfrys (-30°C to +30°C). ' +
      'Multiple C+CE roles across vakanser.se over multiple months. Some ads expired but newer ones visible. ' +
      'VD name still not confirmed — DGBN Holding AB (556702-6504) is parent. info@thermobud.se confirmed. ' +
      'Ledem-koncernen. 24/7 ops.',
    metadata: {
      recruitment_pain_score: 7,
      drivernord_fit_score:   8,
      contactability_score:   6,
      pilot_readiness_score:  7.0,
      ad_status:              'recurring_pattern',
      existing_supplier:      null,
      classification:         'founder_review_required',
      recommended_action:
        'Find VD name via allabolag.se → email info@thermobud.se addressing VD by name → add to company_needs license=C domain=kylfrys',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-007',
    company_name:    'Haninge Åkeri AB',
    region:          'stockholm',
    city:            'Jordbro',
    segment:         'B',
    research_status: 'incomplete',
    visible_driver_need: false,
    job_ads_url:     'https://haninge-akeri.se',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: false,
    urgency_signal:  'none',
    contact_email:   'joachim@ytterstene.se',
    contact_phone:   '+46 730 92 72 42',
    decision_maker_name: 'Joachim Ytterstene',
    decision_maker_role: 'VD',
    barrier_level:   'low',
    pilot_accessibility_score: 73,
    opportunity_score: 70,
    license_required:    'CE',
    domain_required:     'kran',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: false,
    shift_type:          'day',
    urgency:             'standard',
    drivers_needed:      null,
    constraints: 'Large scale — pitch as peak-demand supplement.',
    missing_fields: ['active_job_listing'],
    draft_status:    'incomplete',
    rejection_reason: null,
    source_call_notes:
      '~250 units, 400 MSEK turnover. No jobs page — recruits externally. ' +
      'CEO Joachim Ytterstene LinkedIn+email confirmed. Construction/tipp/kran domain. ' +
      'Large scale = not ideal SME pilot but CEO still directly reachable. ' +
      'Bauhaus contract (major client). Pitch as supplementary pool for peak demand.',
    metadata: {
      recruitment_pain_score: 7,
      drivernord_fit_score:   7,
      contactability_score:   8,
      pilot_readiness_score:  7.3,
      ad_status:              'status_unclear',
      existing_supplier:      null,
      classification:         'founder_review_required',
      recommended_action:
        'Founder checks if currently hiring externally → if yes: add to company_needs → pitch to CEO as peak-demand supplement',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-008',
    company_name:    'Alexis Bud & Transport AB',
    region:          'stockholm',
    city:            'Tumba/Botkyrka',
    segment:         'A',
    research_status: 'enriched',
    visible_driver_need: true,
    job_ads_url:     'https://vakanser.se/jobb/lastbilschauffor+1885/',
    license_mentions: ['C'],
    ykb_mentioned:   true,
    driver_card_mentioned: true,
    urgency_signal:  'single_ad',
    contact_email:   'alexis.transport@hotmail.com',
    contact_phone:   '073-980 37 32',
    decision_maker_name: 'Josef Markus',
    decision_maker_role: 'owner',
    barrier_level:   'low',
    pilot_accessibility_score: 73,
    opportunity_score: 70,
    license_required:    'C',
    domain_required:     'schakt_bygg',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: true,
    shift_type:          'day',
    urgency:             'standard',
    drivers_needed:      2,
    constraints: 'C+YKB+digital driver card+ADR. Botkyrka/Tumba subcontract routes.',
    missing_fields: [],
    draft_status:    'ready_for_review',
    rejection_reason: null,
    source_call_notes:
      'Active ad posted May 6 deadline June 5. C+YKB+digital driver card+ADR. ' +
      'Botkyrka/Tumba subcontract routes. Family-run since 2014. ' +
      'Owner Josef Markus directly reachable by phone or email. ' +
      'Small operation — may be most agile pilot for C-license drivers. Apply before June 5 ad expires.',
    metadata: {
      recruitment_pain_score: 7,
      drivernord_fit_score:   7,
      contactability_score:   8,
      pilot_readiness_score:  7.3,
      ad_status:              'active_deadline_june5',
      existing_supplier:      null,
      classification:         'founder_review_required',
      recommended_action:
        'Validate C drivers available in pool → approach Josef Markus before June 5 ad expires → add to company_needs license=C domain=schakt_bygg',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-009',
    company_name:    'Sjölander Maskintransport AB',
    region:          'stockholm',
    city:            'Vällingby',
    segment:         'A',
    research_status: 'incomplete',
    visible_driver_need: false,
    job_ads_url:     'https://www.sjolander.se',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: false,
    urgency_signal:  'none',
    contact_email:   'info@sjolander.se',
    contact_phone:   '08-89 54 00',
    decision_maker_name: 'Magnus Sjölander',
    decision_maker_role: 'VD',
    barrier_level:   'low',
    pilot_accessibility_score: 67,
    opportunity_score: 65,
    license_required:    'CE',
    domain_required:     'kran',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: false,
    shift_type:          'day',
    urgency:             'standard',
    drivers_needed:      null,
    constraints: 'CE kran + special transport.',
    missing_fields: ['active_job_listing'],
    draft_status:    'incomplete',
    rejection_reason: null,
    source_call_notes:
      'No current ads found in this scan. CE kran + special transport. ' +
      'VD Magnus Sjölander confirmed. 60+ year family business. ' +
      'info@sjolander.se confirmed. Previous research showed single_ad. ' +
      'May recruit via word of mouth.',
    metadata: {
      recruitment_pain_score: 6,
      drivernord_fit_score:   7,
      contactability_score:   7,
      pilot_readiness_score:  6.7,
      ad_status:              'status_unclear',
      existing_supplier:      null,
      classification:         'founder_review_required',
      recommended_action:
        'Check if currently hiring via direct website or call → deprioritize until active need confirmed',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-010',
    company_name:    'Transportfirma Trabé',
    region:          'stockholm',
    city:            'Bandhagen',
    segment:         'A',
    research_status: 'enriched',
    visible_driver_need: false,
    job_ads_url:     'https://trabe.se/jobb',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: false,
    urgency_signal:  'none',
    contact_email:   'peter.ericson@trabe.se',
    contact_phone:   '0708-48 40 30',
    decision_maker_name: 'Peter Ericson',
    decision_maker_role: 'VD',
    barrier_level:   'low',
    pilot_accessibility_score: 40,
    opportunity_score: 55,
    license_required:    'CE',
    domain_required:     'distribution',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: false,
    shift_type:          'day',
    urgency:             'standard',
    drivers_needed:      null,
    constraints: null,
    missing_fields: [],
    draft_status:    'rejected',
    rejection_reason:
      'Confirmed not hiring as of May 2026: website states "Vi söker inte chaufförer för tillfället". ' +
      'Monitor quarterly — need will return. Do not add to active company_needs until hiring resumes.',
    source_call_notes:
      'CONFIRMED NOT HIRING: website says "För tillfället söker vi inte några chaufförer". ' +
      'Family firm since 1968. Strong contact info (VD Peter Ericson + ops Joakim Sjölén). ' +
      'Monitor quarterly — need will return.',
    metadata: {
      recruitment_pain_score: 3,
      drivernord_fit_score:   8,
      contactability_score:   9,
      pilot_readiness_score:  4.0,
      ad_status:              'not_hiring',
      existing_supplier:      null,
      classification:         'research_discovered',
      recommended_action:
        'Monitor company website quarterly → do not add to active company_needs → re-qualify when next hiring wave begins',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-011',
    company_name:    'Arena Personal client (Jordbro)',
    region:          'stockholm',
    city:            'Jordbro/Haninge',
    segment:         'D',
    research_status: 'incomplete',
    visible_driver_need: true,
    job_ads_url:     'https://karriar.arenapersonal.com/jobs/7228872-ce-chauffor-med-kyl-och-frysvana-sokes-till-kund-i-jordbro',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: true,
    urgency_signal:  'single_ad',
    contact_email:   null,
    contact_phone:   null,
    decision_maker_name: null,
    decision_maker_role: 'unknown',
    barrier_level:   'high',
    pilot_accessibility_score: 57,
    opportunity_score: 80,
    license_required:    'CE',
    domain_required:     'kylfrys',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: true,
    shift_type:          'day',
    urgency:             'urgent',
    drivers_needed:      1,
    constraints: null,
    missing_fields: ['company_name', 'contact_info', 'decision_maker'],
    draft_status:    'incomplete',
    rejection_reason: null,
    source_call_notes:
      'Active until July 29 2026. CE+YKB+kylfrys experience required. ' +
      'Client is unnamed — based in Jordbro. Arena Personal is the staffing intermediary. ' +
      'To reach direct employer must go through Arena Personal or identify the Jordbro kylfrys operator. ' +
      'Strong pain signal but low direct contactability.',
    metadata: {
      recruitment_pain_score: 9,
      drivernord_fit_score:   7,
      contactability_score:   3,
      pilot_readiness_score:  5.7,
      ad_status:              'active_deadline_july29',
      existing_supplier:      'arena_personal',
      classification:         'unverified_public_need',
      recommended_action:
        'Identify underlying company (Jordbro kylfrys operator) → if identifiable: add as research_discovered → otherwise monitor via Arena Personal for partnership angle',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-012',
    company_name:    'Dagab Inköp & Logistik AB',
    region:          'stockholm',
    city:            'Bålsta',
    segment:         'F',
    research_status: 'enriched',
    visible_driver_need: true,
    job_ads_url:     'https://jobb.axfood.se/dagab/',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: true,
    urgency_signal:  'repeated_ads',
    contact_email:   'lafdil.zermouni1@dagab.se',
    contact_phone:   null,
    decision_maker_name: 'Lafdil Zermouni',
    decision_maker_role: 'HR_manager',
    barrier_level:   'enterprise_only',
    pilot_accessibility_score: 50,
    opportunity_score: 60,
    license_required:    'CE',
    domain_required:     'distribution',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: true,
    shift_type:          'day',
    urgency:             'standard',
    drivers_needed:      3,
    constraints: 'Enterprise scale — Axfood group procurement.',
    missing_fields: ['procurement_approval'],
    draft_status:    'incomplete',
    rejection_reason: null,
    source_call_notes:
      'Axfood group (Willys/Hemköp). Major grocery logistics. ~80 trucks, store deliveries across Stockholm region. ' +
      'CE dagtid + deltid + weekend roles via Job&Talent. Part-time listing expired April 28. ' +
      'Recurring pattern = structural need. Enterprise scale — not ideal pilot. HR contact Zermouni found via job ad.',
    metadata: {
      recruitment_pain_score: 7,
      drivernord_fit_score:   5,
      contactability_score:   4,
      pilot_readiness_score:  5.0,
      ad_status:              'recurring',
      existing_supplier:      null,
      classification:         'unverified_public_need',
      recommended_action:
        'Note as market signal → do not approach as direct pilot → potential enterprise track in future',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-013',
    company_name:    'DHL Freight (Sweden) AB',
    region:          'stockholm',
    city:            'Hägersten',
    segment:         'F',
    research_status: 'enriched',
    visible_driver_need: true,
    job_ads_url:     'https://vakanser.se/jobb/dhl+freight+soker+lastbilschauffor+dagtid+2/',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: true,
    urgency_signal:  'repeated_ads',
    contact_email:   'fredrik.karlstroem@dhl.com',
    contact_phone:   '070-3465138',
    decision_maker_name: 'Fredrik Karlström',
    decision_maker_role: 'HR_manager',
    barrier_level:   'enterprise_only',
    pilot_accessibility_score: 47,
    opportunity_score: 60,
    license_required:    'CE',
    domain_required:     'distribution',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: true,
    shift_type:          'day',
    urgency:             'standard',
    drivers_needed:      2,
    constraints: 'CE+YKB+ADR. Enterprise procurement barrier.',
    missing_fields: ['procurement_approval'],
    draft_status:    'incomplete',
    rejection_reason: null,
    source_call_notes:
      'National logistics operator. CE+YKB+ADR. Dagtid listing expired March 2026 but summer substitutes active via jobbland.se. ' +
      'HR contact Fredrik Karlström named in job ad. Enterprise procurement = high barrier. ' +
      'Note as market signal for driver demand validation.',
    metadata: {
      recruitment_pain_score: 7,
      drivernord_fit_score:   5,
      contactability_score:   4,
      pilot_readiness_score:  4.7,
      ad_status:              'expired_recurring',
      existing_supplier:      null,
      classification:         'unverified_public_need',
      recommended_action:
        'Note as enterprise market signal → do not approach as pilot → summer substitute angle if enterprise track pursued later',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-014',
    company_name:    'Rekryteringsgruppen i Stockholm AB',
    region:          'stockholm',
    city:            'Stockholm',
    segment:         'agency',
    research_status: 'enriched',
    visible_driver_need: true,
    job_ads_url:     'https://vakanser.se/jobb/c+ce-chaufforer+stockholm/',
    license_mentions: ['C', 'CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: false,
    urgency_signal:  'single_ad',
    contact_email:   null,
    contact_phone:   null,
    decision_maker_name: null,
    decision_maker_role: 'unknown',
    barrier_level:   'medium',
    pilot_accessibility_score: 35,
    opportunity_score: 50,
    license_required:    'CE',
    domain_required:     'distribution',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: false,
    shift_type:          'day',
    urgency:             'standard',
    drivers_needed:      5,
    constraints: 'Staffing agency — partner track, not pilot client.',
    missing_fields: ['contact_info', 'decision_maker'],
    draft_status:    'incomplete',
    rejection_reason: null,
    source_call_notes:
      'C/CE distribution + long-haul. Active deadline May 29 2026. Staffing agency not direct employer. ' +
      'PARTNER TRACK: approach as driver profile supplier not client. ' +
      'Apply today — selection ongoing. Multiple roles.',
    metadata: {
      recruitment_pain_score: 6,
      drivernord_fit_score:   4,
      contactability_score:   5,
      pilot_readiness_score:  3.5,
      ad_status:              'active_deadline_may29',
      existing_supplier:      'partner_track',
      classification:         'unverified_public_need',
      recommended_action:
        'Approach as partner (not pilot client) → DriverNord can supply pre-qualified CE profiles → outreach: 08-15 75 75',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-015',
    company_name:    'Diamond Express Åkeri AB',
    region:          'stockholm',
    city:            'Huddinge',
    segment:         'A',
    research_status: 'incomplete',
    visible_driver_need: true,
    job_ads_url:     'https://se.indeed.com/q-ce-chauffor-l-stockholms-lan-jobb.html',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: false,
    urgency_signal:  'single_ad',
    contact_email:   null,
    contact_phone:   null,
    decision_maker_name: null,
    decision_maker_role: 'unknown',
    barrier_level:   'high',
    pilot_accessibility_score: 53,
    opportunity_score: 65,
    license_required:    'CE',
    domain_required:     'distribution',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: false,
    shift_type:          'flexible',
    urgency:             'standard',
    drivers_needed:      1,
    constraints: null,
    missing_fields: ['contact_info', 'decision_maker'],
    draft_status:    'incomplete',
    rejection_reason: null,
    source_call_notes:
      'C+CE Huddinge. Active listing visible in May 2 Indeed index. ' +
      'Full-time with weekend component. Direct employer Huddinge. ' +
      'Decision-maker contact not confirmed. Requires additional research.',
    metadata: {
      recruitment_pain_score: 6,
      drivernord_fit_score:   7,
      contactability_score:   4,
      pilot_readiness_score:  5.3,
      ad_status:              'active',
      existing_supplier:      null,
      classification:         'unverified_public_need',
      recommended_action:
        'Research decision-maker contact → validate need is still current → if confirmed: upgrade to founder_review_required',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-016',
    company_name:    'CHRC Åkeri AB',
    region:          'stockholm',
    city:            'Hägersten',
    segment:         'A',
    research_status: 'incomplete',
    visible_driver_need: true,
    job_ads_url:     'https://se.indeed.com/q-ce-chauffor-l-stockholms-lan-jobb.html',
    license_mentions: ['C'],
    ykb_mentioned:   true,
    driver_card_mentioned: false,
    urgency_signal:  'single_ad',
    contact_email:   null,
    contact_phone:   null,
    decision_maker_name: null,
    decision_maker_role: 'unknown',
    barrier_level:   'high',
    pilot_accessibility_score: 43,
    opportunity_score: 55,
    license_required:    'C',
    domain_required:     'distribution',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: false,
    shift_type:          'flexible',
    urgency:             'standard',
    drivers_needed:      1,
    constraints: '186 SEK/hour stated.',
    missing_fields: ['contact_info', 'decision_maker'],
    draft_status:    'incomplete',
    rejection_reason: null,
    source_call_notes:
      'C-license only. 186 SEK/hour stated (competitive). Summer with extension possibility. ' +
      'Hägersten Stockholm. Decision-maker not identified.',
    metadata: {
      recruitment_pain_score: 5,
      drivernord_fit_score:   6,
      contactability_score:   3,
      pilot_readiness_score:  4.3,
      ad_status:              'active',
      existing_supplier:      null,
      classification:         'unverified_public_need',
      recommended_action: 'Research contact info → low priority until C drivers available in pool',
      scan_date: '2026-05-19',
    },
  },
  {
    scan_record_id:  'DN-017',
    company_name:    'Simplex Bemanning AB (Årsta client)',
    region:          'stockholm',
    city:            'Årsta',
    segment:         'D',
    research_status: 'incomplete',
    visible_driver_need: true,
    job_ads_url:     'https://vakanser.se/jobb/vi+soker+ce-chaufforer+inom+distribution+i+arsta+-+heltid+6/',
    license_mentions: ['CE'],
    ykb_mentioned:   true,
    driver_card_mentioned: false,
    urgency_signal:  'single_ad',
    contact_email:   null,
    contact_phone:   null,
    decision_maker_name: null,
    decision_maker_role: 'unknown',
    barrier_level:   'high',
    pilot_accessibility_score: 53,
    opportunity_score: 70,
    license_required:    'CE',
    domain_required:     'distribution',
    location_region:     'stockholm',
    ykb_required:        true,
    driver_card_required: false,
    shift_type:          'day',
    urgency:             'urgent',
    drivers_needed:      3,
    constraints: null,
    missing_fields: ['company_name', 'contact_info'],
    draft_status:    'incomplete',
    rejection_reason: null,
    source_call_notes:
      'Renewed listing active until June 12 2026. CE+YKB distribution Årsta heltid. ' +
      'Client is unnamed — Simplex Bemanning intermediary. Simplex is on the partner track list. ' +
      'Strong urgency (renewed multiple times).',
    metadata: {
      recruitment_pain_score: 8,
      drivernord_fit_score:   6,
      contactability_score:   4,
      pilot_readiness_score:  5.3,
      ad_status:              'active_deadline_june12',
      existing_supplier:      'simplex_bemanning',
      classification:         'unverified_public_need',
      recommended_action:
        'Identify Simplex Årsta client if possible → partner angle: supply CE profiles to Simplex Bemanning',
      scan_date: '2026-05-19',
    },
  },
];
