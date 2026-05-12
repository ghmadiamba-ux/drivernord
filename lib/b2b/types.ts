export type ResearchStatus =
  | 'not_started'
  | 'researching'
  | 'enriched'
  | 'incomplete'
  | 'rejected';

export type BarrierLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'enterprise_only';

export type CompanySize = 'micro' | 'small' | 'medium' | 'large';

export type B2BSegment =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'agency'
  | 'A/E' | 'B/E' | 'A/D' | 'B/D';

export type UrgencySignal = 'none' | 'single_ad' | 'repeated_ads' | 'stated_urgency';

export type DecisionMakerRole =
  | 'owner'
  | 'VD'
  | 'transport_manager'
  | 'driftchef'
  | 'operations_director'
  | 'HR_manager'
  | 'unknown';

export interface CompanyResearchTarget {
  id:         string;
  created_at: string;
  updated_at: string;

  company_name: string;
  website:      string | null;
  region:       'stockholm' | 'stockholm_region' | 'malardalen' | 'other_sweden' | null;
  city:         string | null;
  company_size: CompanySize | null;
  segment:      B2BSegment | null;
  transport_domain: string[];

  visible_driver_need:   boolean | null;
  job_ads_url:           string | null;
  license_mentions:      string[];
  ykb_mentioned:         boolean | null;
  driver_card_mentioned: boolean | null;
  urgency_signal:        UrgencySignal | null;

  contact_email: string | null;
  phone:         string | null;
  linkedin_url:  string | null;

  decision_maker_name: string | null;
  decision_maker_role: DecisionMakerRole | null;

  procurement_page:           string | null;
  supplier_requirements_url:  string | null;
  barrier_level:              BarrierLevel | null;
  barrier_notes:              string | null;

  pilot_accessibility_score: number | null;
  opportunity_score:         number | null;

  recommended_entry_point: string | null;
  next_action:             string | null;

  research_status:   ResearchStatus;
  source_notes:      string | null;
  last_checked_date: string | null;

  scored_at: string | null;
  scored_by: string | null;

  approved_as_target_at: string | null;
  approved_as_target_by: string | null;
}

export interface B2BTargetSummary {
  total:         number;
  byStatus:      Record<ResearchStatus, number>;
  byBarrier:     Partial<Record<BarrierLevel, number>>;
  enriched:      number;
  scoredAbove70: number;
  withContact:   number;
}
