import type {
  License, Ykb, DriverCard, Region, Relocate,
  Availability, LeadPriority, FollowUpReason,
  Domain, ShiftPreference,
} from '../types/lead';
import type { DriverProfile } from './driverProfile';

export interface IngestedDriver {
  id: string;
  ingestedAt: Date;
  priority: LeadPriority;
  license: License;
  ykb: Ykb;
  driverCard: DriverCard;
  location: {
    region: Region;
    willingToRelocate: boolean | null;
  };
  availability: Availability;
  contact: {
    firstName: string;
    phone: string;
    email: string | null;
  };
  domain: Domain | null;
  shiftPreference: ShiftPreference | null;
  needsFollowUp: boolean;
  followUpAt: Date | null;
  followUpReason: FollowUpReason | null;
}

export type IngestedDriverError =
  | 'not_ready_for_ingestion'
  | 'missing_required_field';

export type IngestedDriverResult =
  | { ok: true; driver: IngestedDriver }
  | { ok: false; error: IngestedDriverError };

export function buildIngestedDriver(profile: DriverProfile): IngestedDriverResult {
  if (profile.qualification.status !== 'ready_for_ingestion') {
    return { ok: false, error: 'not_ready_for_ingestion' };
  }

  if (
    profile.contact.phone === null ||
    profile.contact.firstName === null ||
    profile.license === null ||
    profile.ykb === null ||
    profile.driverCard === null ||
    profile.location.region === null ||
    profile.availability === null ||
    profile.priority === null ||
    profile.completedAt === null
  ) {
    return { ok: false, error: 'missing_required_field' };
  }

  return {
    ok: true,
    driver: {
      id: profile.id,
      ingestedAt: profile.completedAt,
      priority: profile.priority,
      license: profile.license,
      ykb: profile.ykb,
      driverCard: profile.driverCard,
      location: {
        region: profile.location.region,
        willingToRelocate: profile.location.willingToRelocate,
      },
      availability: profile.availability,
      contact: {
        firstName: profile.contact.firstName,
        phone: profile.contact.phone,
        email: profile.contact.email,
      },
      domain: profile.domain,
      shiftPreference: profile.shiftPreference,
      needsFollowUp: profile.readiness.needsFollowUp,
      followUpAt: profile.readiness.followUpAt,
      followUpReason: profile.readiness.followUpReason,
    },
  };
}
