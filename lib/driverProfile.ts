import type {
  Lead, License, Ykb, DriverCard, Region, Relocate,
  Availability, LeadStatus, LeadPriority, FollowUpReason,
  Domain, ShiftPreference,
} from '../types/lead';

export interface DriverProfile {
  id: string;
  qualification: {
    isQualified: boolean;
    status: LeadStatus;
  };
  priority: LeadPriority | null;
  license: License | null;
  ykb: Ykb | null;
  driverCard: DriverCard | null;
  location: {
    region: Region | null;
    willingToRelocate: boolean | null;
  };
  availability: Availability | null;
  domain: Domain | null;
  shiftPreference: ShiftPreference | null;
  contact: {
    firstName: string | null;
    phone: string | null;
    email: string | null;
  };
  readiness: {
    readyToCall: boolean;
    needsFollowUp: boolean;
    followUpAt: Date | null;
    followUpReason: FollowUpReason | null;
  };
  openToBemanning: boolean | null;
  createdAt: Date;
  completedAt: Date | null;
}

export function buildDriverProfile(lead: Lead): DriverProfile {
  return {
    id: lead.id,
    qualification: {
      isQualified: lead.lead_status !== 'disqualified',
      status: lead.lead_status,
    },
    priority: lead.lead_priority,
    license: lead.license,
    ykb: lead.ykb,
    driverCard: lead.driver_card,
    location: {
      region: lead.region,
      willingToRelocate:
        lead.relocate === null ? null : lead.relocate === 'yes',
    },
    availability: lead.availability,
    domain: lead.domain,
    shiftPreference: lead.shift_preference,
    contact: {
      firstName: lead.first_name,
      phone: lead.phone,
      email: lead.email,
    },
    readiness: {
      readyToCall: lead.lead_status === 'ready_for_ingestion' && lead.phone !== null,
      needsFollowUp: lead.follow_up_at !== null && !lead.follow_up_sent,
      followUpAt: lead.follow_up_at,
      followUpReason: lead.follow_up_reason,
    },
    openToBemanning: lead.open_to_bemanning,
    createdAt: lead.created_at,
    completedAt: lead.completed_at,
  };
}
