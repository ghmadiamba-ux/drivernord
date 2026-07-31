import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { db } from '../../../../lib/db';
import { getSystemWarnings } from '../../../../lib/warnings';
import { listDrafts } from '../../../../lib/companyNeedDraft';
import type { CompanyNeedDraftRow } from '../../../../lib/companyNeedDraft';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FunnelSummary {
  total_sessions:     number;
  completed:          number;
  incomplete:         number;
  disqualified:       number;
  anonymous_dropoff:  number;
  completion_rate_pct: number;
}

interface HighPriorityLead {
  id:           string;
  first_name:   string;
  phone:        string;
  license:      string;
  region:       string;
  availability: string;
  domain:       string | null;
  ingested_at:  string;
  has_quality_issue: boolean;
}

interface DataQualityWarning {
  driver_id:  string;
  issues:     string[];
  first_name: string;
  phone:      string;
}

interface DuplicateWarning {
  new_id:      string;
  existing_id: string;
  phone:       string;
}

interface CampaignSummary {
  utm_campaign: string | null;
  utm_source:   string | null;
  utm_content:  string | null;
  sessions:     number;
  completed:    number;
}

interface UrgentAction {
  type:    string;
  message: string;
  count:   number;
}

interface IngestionHour {
  hour:  string;
  count: number;
}

interface CompanyNeedsSummary {
  total_open:               number;
  simulation_only:          number;
  archived_test:            number;
  real_open:                number;      // non-simulation open needs
  matching_eligible:        number;      // active_public_need + matching_eligible + contact_ready_candidate
  outreach_pending_approval: number;
  outreach_approved:        number;
  external_contact_blocked: boolean;    // true until at least one outreach_approved need + provider configured
}

interface DraftsSummary {
  total:            number;
  ready_for_review: number;
  incomplete:       number;
  rejected:         number;
  promoted:         number;
}

interface MarketIntelligenceSummary {
  last_daily_scan_at:    string | null;
  last_weekly_scan_at:   string | null;
  promotion_candidates:  number;  // ready_for_review drafts not yet promoted
  stale_signals:         number;  // incomplete or ready drafts with no recent scan events
  promoted_this_week:    number;  // drafts promoted in last 7 days
}

interface ContactGovernanceSummary {
  dq_flagged_driver_count:       number;  // all-time drivers with a data_quality_issue action
  duplicate_flagged_phone_count: number;  // all-time phones with a driver_duplicate_detected action
}

export interface OperationalIntelligencePayload {
  generated_at:          string;
  window_hours:          number;
  funnel:                FunnelSummary;
  ingested_drivers: {
    total:  number;
    high:   number;
    medium: number;
    low:    number;
    contactable: number;
  };
  high_priority_leads:          HighPriorityLead[];
  needs_founder_review:         HighPriorityLead[];
  data_quality_warnings:        DataQualityWarning[];
  duplicate_warnings:           DuplicateWarning[];
  pending_contact_suggested:    number;
  company_needs:                CompanyNeedsSummary;
  drafts:                       DraftsSummary;
  campaign_breakdown:           CampaignSummary[];
  top_regions:                  { region: string; count: number }[];
  top_licenses:                 { license: string; count: number }[];
  top_domains:                  { domain: string; count: number }[];
  ingestion_timeline:           IngestionHour[];
  system_warnings:              { type: string; message: string; severity: string }[];
  sms_safe:                     boolean;
  matching_blocked:             boolean;
  urgent_actions:               UrgentAction[];
  market_intelligence?:         MarketIntelligenceSummary;
  contact_governance:           ContactGovernanceSummary;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const windowHours = 24;
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  try {
    const payload = await buildIntelligencePayload(since, windowHours);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[operational-intelligence] GET failed:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// ─── Builder ──────────────────────────────────────────────────────────────────

async function buildIntelligencePayload(
  since: string,
  windowHours: number,
): Promise<OperationalIntelligencePayload> {
  const [
    driversRows,
    ingestedRows,
    systemActionsRows,
    systemWarnings,
    companyNeedsRows,
    allDrafts,
  ] = await Promise.all([
    db.from('drivers').select('id, lead_status, license, region, utm_campaign, utm_source, utm_content').gte('created_at', since),
    db.from('ingested_drivers').select('id, priority, license, region, availability, domain, first_name, phone, ingested_at').gte('ingested_at', since),
    db.from('system_actions').select('action_type, status, input, target_id, created_at').gte('created_at', since),
    getSystemWarnings(),
    db.from('company_needs').select('id, status, need_type'),
    // listDrafts() uses .select('*').order().limit() which reliably returns rows;
    // the bare .select('id, draft_status') pattern returns 0 rows on this table.
    listDrafts({ limit: 200 }).catch((): CompanyNeedDraftRow[] => []),
  ]);

  const drivers    = (driversRows.data ?? []) as Record<string, unknown>[];
  const ingested   = (ingestedRows.data ?? []) as Record<string, unknown>[];
  const actions    = (systemActionsRows.data ?? []) as Record<string, unknown>[];
  const allNeeds   = (companyNeedsRows.data ?? []) as Record<string, unknown>[];
  // allDrafts comes directly from listDrafts() above — already CompanyNeedDraftRow[]

  // ── Funnel ──────────────────────────────────────────────────────────────
  const total           = drivers.length;
  const completed       = drivers.filter((d) => d.lead_status === 'ready_for_ingestion').length;
  const incomplete      = drivers.filter((d) => d.lead_status === 'incomplete_lead').length;
  const disqualified    = drivers.filter((d) => d.lead_status === 'disqualified').length;
  const anonymousDropoff = drivers.filter((d) => d.lead_status === 'anonymous_dropoff').length;

  const funnel: FunnelSummary = {
    total_sessions:      total,
    completed,
    incomplete,
    disqualified,
    anonymous_dropoff:   anonymousDropoff,
    completion_rate_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
  };

  // ── Data quality warnings ────────────────────────────────────────────────
  const dqWarnings: DataQualityWarning[] = actions
    .filter((a) => a.action_type === 'data_quality_issue')
    .map((a) => {
      const input = (a.input ?? {}) as Record<string, unknown>;
      return {
        driver_id:  (a as Record<string, unknown>).target_id as string ?? '',
        issues:     (input.issues as string[]) ?? [],
        first_name: (input.first_name as string) ?? '',
        phone:      (input.phone as string) ?? '',
      };
    });

  const dqDriverIds = new Set(dqWarnings.map((w) => w.driver_id));

  // ── Ingested driver counts ───────────────────────────────────────────────
  const high   = ingested.filter((d) => d.priority === 'HIGH').length;
  const medium = ingested.filter((d) => d.priority === 'MEDIUM').length;
  const low    = ingested.filter((d) => d.priority === 'LOW').length;

  // contactable = ingested drivers with no data quality issues in this window
  const contactable = ingested.filter((d) => !dqDriverIds.has(d.id as string)).length;

  // ── High-priority lead list ──────────────────────────────────────────────
  const highPriorityLeads: HighPriorityLead[] = ingested
    .filter((d) => d.priority === 'HIGH')
    .map((d) => ({
      id:                d.id as string,
      first_name:        d.first_name as string,
      phone:             d.phone as string,
      license:           d.license as string,
      region:            d.region as string,
      availability:      d.availability as string,
      domain:            (d.domain as string | null) ?? null,
      ingested_at:       d.ingested_at as string,
      has_quality_issue: dqDriverIds.has(d.id as string),
    }))
    .sort((a, b) => b.ingested_at.localeCompare(a.ingested_at));

  // Leads needing founder review = HIGH priority with quality issues
  const needsFounderReview = highPriorityLeads.filter((l) => l.has_quality_issue);

  // ── Duplicate warnings ───────────────────────────────────────────────────
  const duplicateWarnings: DuplicateWarning[] = actions
    .filter((a) => a.action_type === 'driver_duplicate_detected')
    .map((a) => {
      const input = (a.input ?? {}) as Record<string, unknown>;
      return {
        new_id:      input.new_id as string ?? '',
        existing_id: input.existing_id as string ?? '',
        phone:       input.phone as string ?? '',
      };
    });

  // ── Pending contact_suggested ────────────────────────────────────────────
  const { count: pendingContactCount } = await db
    .from('system_actions')
    .select('*', { count: 'exact', head: true })
    .eq('action_type', 'contact_suggested')
    .eq('status', 'pending');

  // ── Campaign breakdown ────────────────────────────────────────────────────
  const campaignMap = new Map<string, { sessions: number; completed: number }>();
  for (const d of drivers) {
    const key = [
      (d.utm_campaign as string | null) ?? '(none)',
      (d.utm_source   as string | null) ?? '(none)',
      (d.utm_content  as string | null) ?? '(none)',
    ].join('||');
    const existing = campaignMap.get(key) ?? { sessions: 0, completed: 0 };
    existing.sessions++;
    if (d.lead_status === 'ready_for_ingestion') existing.completed++;
    campaignMap.set(key, existing);
  }

  const campaignBreakdown: CampaignSummary[] = [...campaignMap.entries()]
    .map(([key, counts]) => {
      const [campaign, source, content] = key.split('||');
      return {
        utm_campaign: campaign === '(none)' ? null : campaign,
        utm_source:   source   === '(none)' ? null : source,
        utm_content:  content  === '(none)' ? null : content,
        ...counts,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  // ── Top regions ───────────────────────────────────────────────────────────
  const regionCount = new Map<string, number>();
  for (const d of drivers) {
    const r = (d.region as string | null) ?? '(unknown)';
    regionCount.set(r, (regionCount.get(r) ?? 0) + 1);
  }
  const topRegions = [...regionCount.entries()]
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);

  // ── Top licenses ──────────────────────────────────────────────────────────
  const licenseCount = new Map<string, number>();
  for (const d of drivers) {
    const l = (d.license as string | null) ?? '(unknown)';
    licenseCount.set(l, (licenseCount.get(l) ?? 0) + 1);
  }
  const topLicenses = [...licenseCount.entries()]
    .map(([license, count]) => ({ license, count }))
    .sort((a, b) => b.count - a.count);

  // ── Top domains (from ingested drivers) ───────────────────────────────────
  const domainCount = new Map<string, number>();
  for (const d of ingested) {
    const dom = (d.domain as string | null) ?? '(none)';
    domainCount.set(dom, (domainCount.get(dom) ?? 0) + 1);
  }
  const topDomains = [...domainCount.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);

  // ── Ingestion timeline (hourly buckets within the window) ─────────────────
  const hourBuckets = new Map<string, number>();
  for (const d of ingested) {
    const ts = d.ingested_at as string;
    if (!ts) continue;
    const hour = ts.slice(0, 13) + ':00Z'; // "2026-05-19T14:00Z"
    hourBuckets.set(hour, (hourBuckets.get(hour) ?? 0) + 1);
  }
  const ingestionTimeline: IngestionHour[] = [...hourBuckets.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // ── Company needs summary ────────────────────────────────────────────────
  const openNeeds = allNeeds.filter((n) => n.status === 'open');
  const needTypeCounts = new Map<string, number>();
  for (const n of openNeeds) {
    const t = (n.need_type as string) ?? 'matching_eligible';
    needTypeCounts.set(t, (needTypeCounts.get(t) ?? 0) + 1);
  }

  const simCount     = (needTypeCounts.get('simulation_only') ?? 0);
  const testCount    = (needTypeCounts.get('archived_test') ?? 0);
  const totalOpen    = openNeeds.length;
  const realOpen     = totalOpen - simCount - testCount;
  const matchEligible =
    (needTypeCounts.get('active_public_need')    ?? 0) +
    (needTypeCounts.get('matching_eligible')     ?? 0) +
    (needTypeCounts.get('contact_ready_candidate') ?? 0);
  const outreachPending  = needTypeCounts.get('outreach_pending_approval') ?? 0;
  const outreachApproved = needTypeCounts.get('outreach_approved') ?? 0;

  const needsSummary: CompanyNeedsSummary = {
    total_open:               totalOpen,
    simulation_only:          simCount,
    archived_test:            testCount,
    real_open:                realOpen,
    matching_eligible:        matchEligible,
    outreach_pending_approval: outreachPending,
    outreach_approved:        outreachApproved,
    external_contact_blocked: outreachApproved === 0,
  };

  // ── Drafts summary ────────────────────────────────────────────────────────
  const draftStatusCounts = new Map<string, number>();
  for (const d of allDrafts) {
    const s = d.draft_status ?? 'draft_created';
    draftStatusCounts.set(s, (draftStatusCounts.get(s) ?? 0) + 1);
  }

  const draftsSummary: DraftsSummary = {
    total:            allDrafts.length,
    ready_for_review: draftStatusCounts.get('ready_for_review') ?? 0,
    incomplete:       draftStatusCounts.get('incomplete') ?? 0,
    rejected:         draftStatusCounts.get('rejected') ?? 0,
    promoted:         draftStatusCounts.get('promoted') ?? 0,
  };

  // ── SMS safety check ─────────────────────────────────────────────────────
  const simulationWarning = systemWarnings.find(
    (w) => w.type === 'simulation_data_in_company_needs',
  );
  const smsSafe = simulationWarning === undefined;

  // matching is blocked when simulation open needs exist OR there are no real matchable needs
  const matchingBlocked = !smsSafe || matchEligible === 0;

  // ── Urgent actions ───────────────────────────────────────────────────────
  const urgentActions: UrgentAction[] = [];

  if (highPriorityLeads.length > 0) {
    urgentActions.push({
      type:    'contact_high_priority_manually',
      message: `${highPriorityLeads.length} HIGH priority driver${highPriorityLeads.length > 1 ? 's' : ''} registered in the last ${windowHours}h. Contact by phone or WhatsApp — SMS automation is not active.`,
      count:   highPriorityLeads.length,
    });
  }

  if (!smsSafe) {
    urgentActions.push({
      type:    'clean_simulation_company_needs',
      message: 'Simulation/test data exists in company_needs. Do NOT activate 46elks until removed. Run the cleanup SQL in company-needs-cleanup-audit-v1.md.',
      count:   1,
    });
  }

  if (needsFounderReview.length > 0) {
    urgentActions.push({
      type:    'review_high_priority_data_quality',
      message: `${needsFounderReview.length} HIGH priority driver${needsFounderReview.length > 1 ? 's have' : ' has'} data quality issues (phone in name/email). Verify manually before contact.`,
      count:   needsFounderReview.length,
    });
  } else if (dqWarnings.length > 0) {
    urgentActions.push({
      type:    'review_data_quality',
      message: `${dqWarnings.length} driver${dqWarnings.length > 1 ? 's have' : ' has'} unusable name or email data (phone number entered in wrong field). Verify before SMS is activated.`,
      count:   dqWarnings.length,
    });
  }

  if (duplicateWarnings.length > 0) {
    urgentActions.push({
      type:    'review_duplicate_registrations',
      message: `${duplicateWarnings.length} duplicate phone registration${duplicateWarnings.length > 1 ? 's were' : ' was'} detected and skipped.`,
      count:   duplicateWarnings.length,
    });
  }

  if ((pendingContactCount ?? 0) > 0) {
    urgentActions.push({
      type:    'pending_contact_actions',
      message: `${pendingContactCount} contact_suggested action${(pendingContactCount ?? 0) > 1 ? 's are' : ' is'} pending. Will execute when 46elks is configured and AGENT_CONTACT_MODE=auto.`,
      count:   pendingContactCount ?? 0,
    });
  }

  if (realOpen === 0) {
    const promotableCount = draftsSummary.ready_for_review;
    urgentActions.push({
      type:    'no_real_company_need',
      message: promotableCount > 0
        ? `No real company_need exists. ${promotableCount} draft${promotableCount > 1 ? 's are' : ' is'} ready_for_review. Promote one via POST /api/admin/drafts/[id]/promote to enable matching.`
        : 'No real company_need exists and no drafts are ready for promotion. Run POST /api/admin/drafts/import to load scan records.',
      count: promotableCount,
    });
  }

  // ── Contact governance — all-time DQ + duplicate counts ──────────────────
  // Queried outside the 24h window so stale records are always visible.
  let contactGovernance: ContactGovernanceSummary = {
    dq_flagged_driver_count:       0,
    duplicate_flagged_phone_count: 0,
  };
  try {
    const [dqRes, dupRes] = await Promise.all([
      db.from('system_actions').select('*', { count: 'exact', head: true }).eq('action_type', 'data_quality_issue'),
      db.from('system_actions').select('*', { count: 'exact', head: true }).eq('action_type', 'driver_duplicate_detected'),
    ]);
    contactGovernance = {
      dq_flagged_driver_count:       dqRes.count  ?? 0,
      duplicate_flagged_phone_count: dupRes.count ?? 0,
    };
  } catch { /* non-fatal */ }

  // ── Market intelligence summary (derived from already-fetched data, no new DB queries) ─
  let marketIntelligence: MarketIntelligenceSummary | undefined;
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Last scan times — look in the in-window system_actions for completed scan events
    const lastDaily = actions
      .filter((a) => a.action_type === 'company_need_daily_scan_completed' && a.status === 'completed')
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
    const lastWeekly = actions
      .filter((a) => a.action_type === 'company_need_weekly_scan_completed' && a.status === 'completed')
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];

    // Promotion candidates — ready_for_review drafts not yet promoted
    const promotionCandidates = allDrafts.filter(
      (d) => d.draft_status === 'ready_for_review',
    ).length;

    // Stale signals — incomplete drafts (data gaps)
    const staleSignals = allDrafts.filter(
      (d) => d.draft_status === 'incomplete',
    ).length;

    // Promoted this week — drafts promoted in last 7 days
    const promotedThisWeek = allDrafts.filter(
      (d) => d.draft_status === 'promoted' && d.updated_at >= sevenDaysAgo,
    ).length;

    marketIntelligence = {
      last_daily_scan_at:   (lastDaily?.created_at as string) ?? null,
      last_weekly_scan_at:  (lastWeekly?.created_at as string) ?? null,
      promotion_candidates: promotionCandidates,
      stale_signals:        staleSignals,
      promoted_this_week:   promotedThisWeek,
    };
  } catch { /* non-fatal — market intelligence is supplementary */ }

  return {
    generated_at:          new Date().toISOString(),
    window_hours:          windowHours,
    funnel,
    ingested_drivers:      { total: ingested.length, high, medium, low, contactable },
    high_priority_leads:   highPriorityLeads,
    needs_founder_review:  needsFounderReview,
    data_quality_warnings: dqWarnings,
    duplicate_warnings:    duplicateWarnings,
    pending_contact_suggested: pendingContactCount ?? 0,
    company_needs:         needsSummary,
    drafts:                draftsSummary,
    campaign_breakdown:    campaignBreakdown,
    top_regions:           topRegions,
    top_licenses:          topLicenses,
    top_domains:           topDomains,
    ingestion_timeline:    ingestionTimeline,
    system_warnings:       systemWarnings,
    sms_safe:              smsSafe,
    matching_blocked:      matchingBlocked,
    urgent_actions:        urgentActions,
    market_intelligence:   marketIntelligence,
    contact_governance:    contactGovernance,
  };
}
