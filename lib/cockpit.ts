import { db } from './db';
import { getSystemWarnings, type Warning } from './warnings';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SystemActionRow {
  id:           string;
  action_type:  string;
  triggered_by: string;
  target_type:  string;
  target_id:    string;
  status:       string;
  input:        Record<string, unknown> | null;
  result:       Record<string, unknown> | null;
  error:        string | null;
  created_at:   string;
  completed_at: string | null;
}

export interface CockpitStats {
  drivers:        number;
  openNeeds:      number;
  pendingActions: number;
  failedActions:  number;
  emergencyNeeds: number;
}

export interface TodayMetrics {
  contacted:     number;
  suggested:     number;
  skipped:       number;
  matchRuns:     number;
  followUpsSent: number;
  errors:        number;
}

export interface PipelineMetrics {
  totalDrivers: number;
  shortlisted:  number;
  contacted:    number;
  interested:   number;
}

export interface CockpitData {
  stats:          CockpitStats;
  pendingActions: SystemActionRow[];
  failedActions:  SystemActionRow[];
  recentActions:  SystemActionRow[];
  warnings:       Warning[];
  pipeline:       PipelineMetrics;
  today:          TodayMetrics;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function toRow(r: Record<string, unknown>): SystemActionRow {
  return {
    id:           r.id as string,
    action_type:  r.action_type as string,
    triggered_by: r.triggered_by as string,
    target_type:  r.target_type as string,
    target_id:    r.target_id as string,
    status:       r.status as string,
    input:        (r.input as Record<string, unknown>) ?? null,
    result:       (r.result as Record<string, unknown>) ?? null,
    error:        (r.error as string) ?? null,
    created_at:   r.created_at as string,
    completed_at: (r.completed_at as string) ?? null,
  };
}

// ─── Today metrics ────────────────────────────────────────────────────────────

export async function getTodayMetrics(): Promise<TodayMetrics> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const since = todayStart.toISOString();

  const { data } = await db
    .from('system_actions')
    .select('action_type, status')
    .gte('created_at', since);

  const rows = data ?? [];

  return {
    contacted:     rows.filter((r) => r.action_type === 'contact_sent'       && r.status === 'completed').length,
    suggested:     rows.filter((r) => r.action_type === 'contact_suggested').length,
    skipped:       rows.filter((r) => r.action_type === 'contact_skipped').length,
    matchRuns:     rows.filter((r) => r.action_type === 'match_run'           && r.status === 'completed').length,
    followUpsSent: rows.filter((r) => r.action_type === 'follow_up_sent'      && r.status === 'completed').length,
    errors:        rows.filter((r) => r.status === 'failed').length,
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export async function getCockpitData(): Promise<CockpitData> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    driversRes,
    openNeedsRes,
    pendingRes,
    failedRes,
    emergencyRes,
    recentRes,
    shortlistedRes,
    contactedRes,
    interestedRes,
    warnings,
    today,
  ] = await Promise.all([
    db.from('ingested_drivers').select('*', { count: 'exact', head: true }),
    db.from('company_needs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('system_actions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    db.from('system_actions').select('*').eq('status', 'failed').gte('created_at', since24h).order('created_at', { ascending: false }).limit(10),
    db.from('company_needs').select('*', { count: 'exact', head: true }).eq('urgency', 'emergency').eq('status', 'open'),
    db.from('system_actions').select('*').order('created_at', { ascending: false }).limit(50),
    db.from('shortlist_entries').select('*', { count: 'exact', head: true }),
    db.from('shortlist_entries').select('*', { count: 'exact', head: true }).neq('contact_status', 'new'),
    db.from('shortlist_entries').select('*', { count: 'exact', head: true }).eq('contact_status', 'interested'),
    getSystemWarnings(),
    getTodayMetrics(),
  ]);

  const pendingActions = (pendingRes.data ?? []).map(toRow);
  const failedActions  = (failedRes.data  ?? []).map(toRow);

  return {
    stats: {
      drivers:        driversRes.count    ?? 0,
      openNeeds:      openNeedsRes.count  ?? 0,
      pendingActions: pendingActions.length,
      failedActions:  failedActions.length,
      emergencyNeeds: emergencyRes.count  ?? 0,
    },
    pendingActions,
    failedActions,
    recentActions: (recentRes.data ?? []).map(toRow),
    warnings,
    pipeline: {
      totalDrivers: driversRes.count    ?? 0,
      shortlisted:  shortlistedRes.count ?? 0,
      contacted:    contactedRes.count   ?? 0,
      interested:   interestedRes.count  ?? 0,
    },
    today,
  };
}

export async function getCockpitActions(): Promise<{
  pending:  SystemActionRow[];
  recent:   SystemActionRow[];
  warnings: Warning[];
}> {
  const [pendingRes, recentRes, warnings] = await Promise.all([
    db.from('system_actions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    db.from('system_actions').select('*').order('created_at', { ascending: false }).limit(50),
    getSystemWarnings(),
  ]);

  return {
    pending:  (pendingRes.data ?? []).map(toRow),
    recent:   (recentRes.data  ?? []).map(toRow),
    warnings,
  };
}
