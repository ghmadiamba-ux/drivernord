export type Lang = 'sv' | 'en';

export type Region = 'stockholm' | 'other_sweden' | 'abroad';

export type Relocate = 'yes' | 'no';

export type License = 'C' | 'CE' | 'D' | 'C+D' | 'CE+D' | 'none';

export type Ykb = 'valid' | 'expired' | 'in_progress' | 'none' | 'unknown';

export type DriverCard = 'valid' | 'expired' | 'no' | 'unknown';

export type Availability = 'now' | '2_weeks' | '1_month' | 'not_yet';

export type Domain =
  | 'tipp' | 'kran' | 'kylfrys' | 'silo' | 'flatbed' | 'tanker'
  | 'ekipage' | 'schakt_bygg' | 'distribution' | 'livsmedelskyla'
  | 'avfall' | 'skogstransport' | 'adr' | 'fjarrtransport' | 'budtransport';

export type ShiftPreference = 'day' | 'night' | 'weekend' | 'flexible';

export type LeadStatus =
  | 'ready_for_ingestion'
  | 'incomplete_lead'
  | 'disqualified'
  | 'anonymous_dropoff';

export type LeadPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type FollowUpReason =
  | 'incomplete_lead'
  | 'not_yet_available'
  | 'ykb_in_progress';

export interface Lead {
  id: string;
  created_at: Date;
  completed_at: Date | null;
  last_step_reached: number;
  lang: Lang | null;
  region: Region | null;
  relocate: Relocate | null;
  license: License | null;
  ykb: Ykb | null;
  driver_card: DriverCard | null;
  availability: Availability | null;
  domain: Domain | null;
  shift_preference: ShiftPreference | null;
  first_name: string | null;
  phone: string | null;
  email: string | null;
  lead_status: LeadStatus;
  lead_priority: LeadPriority | null;
  follow_up_sent: boolean;
  follow_up_at: Date | null;
  follow_up_reason: FollowUpReason | null;
}
