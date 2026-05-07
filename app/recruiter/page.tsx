'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemActionRow {
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

interface Warning {
  type:     string;
  message:  string;
  severity: 'warning' | 'error';
}

interface CockpitStats {
  drivers:        number;
  openNeeds:      number;
  pendingActions: number;
  failedActions:  number;
  emergencyNeeds: number;
}

interface TodayMetrics {
  contacted:     number;
  suggested:     number;
  skipped:       number;
  matchRuns:     number;
  followUpsSent: number;
  errors:        number;
}

interface CockpitData {
  stats:          CockpitStats;
  pendingActions: SystemActionRow[];
  failedActions:  SystemActionRow[];
  recentActions:  SystemActionRow[];
  warnings:       Warning[];
  pipeline: {
    totalDrivers: number;
    shortlisted:  number;
    contacted:    number;
    interested:   number;
  };
  today: TodayMetrics;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, string> = {
  match_run:           '⟳',
  shortlist_created:   '☰',
  contact_suggested:   '?',
  contact_sent:        '→',
  contact_skipped:     '⊘',
  contact_confirmed:   '✓',
  follow_up_triggered: '↻',
  follow_up_sent:      '↗',
  follow_up_skipped:   '—',
  follow_up_confirmed: '✓',
  override_cancelled:  '✕',
  override_retried:    '↺',
  driver_ingested:     '+',
  need_ingested:       '+',
};

const ACTION_LABELS: Record<string, string> = {
  driver_ingested:     'Driver ingested',
  need_ingested:       'Need ingested',
  match_run:           'Match run',
  shortlist_created:   'Shortlist created',
  contact_suggested:   'Contact suggested',
  contact_sent:        'Contact sent',
  contact_skipped:     'Contact skipped',
  contact_confirmed:   'Contact confirmed',
  follow_up_triggered: 'Follow-up triggered',
  follow_up_confirmed: 'Follow-up confirmed',
  follow_up_sent:      'Follow-up sent',
  follow_up_skipped:   'Follow-up skipped',
  override_cancelled:  'Override: cancelled',
  override_retried:    'Override: retried',
};

const SKIP_REASON_LABELS: Record<string, string> = {
  ykb_in_progress:    'YKB pending',
  not_available_yet:  'not available yet',
  recently_contacted: 'dedup window',
  low_score:          'score too low',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function actionLabel(type: string): string {
  return ACTION_LABELS[type] ?? type.replace(/_/g, ' ');
}

function actionIcon(type: string): string {
  return ACTION_ICONS[type] ?? '·';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('sv-SE', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(iso: string): string {
  const d     = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return formatTime(iso);
  return (
    d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }) +
    ' ' +
    formatTime(iso)
  );
}

function getSkipReason(action: SystemActionRow): string | null {
  const reason = action.result?.reason as string | undefined;
  if (!reason) return null;
  if (reason === 'recently_contacted') {
    const days = action.result?.dedup_window_days;
    return days ? `dedup ${days}d` : 'dedup window';
  }
  return SKIP_REASON_LABELS[reason] ?? reason.replace(/_/g, ' ');
}

function getUrgency(action: SystemActionRow): string | null {
  return (action.input?.urgency as string) ?? null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecruiterPage() {
  const [data, setData]               = useState<CockpitData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [actioning, setActioning]     = useState<Record<string, boolean>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/cockpit');
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setFetchError(err.error ?? 'fetch_failed');
        return;
      }
      setData(await res.json() as CockpitData);
      setFetchError(null);
      setLastUpdated(new Date());
    } catch {
      setFetchError('network_error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15_000);
    return () => clearInterval(id);
  }, [fetchData]);

  async function handleAction(actionId: string, action: 'approve' | 'cancel') {
    setActioning((p) => ({ ...p, [actionId]: true }));
    try {
      await fetch(`/api/cockpit/actions/${actionId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      });
      await fetchData();
    } catch { /* ignore */ } finally {
      setActioning((p) => ({ ...p, [actionId]: false }));
    }
  }

  async function handleRetry(actionId: string) {
    setActioning((p) => ({ ...p, [actionId]: true }));
    try {
      await fetch(`/api/cockpit/actions/${actionId}/retry`, { method: 'POST' });
      await fetchData();
    } catch { /* ignore */ } finally {
      setActioning((p) => ({ ...p, [actionId]: false }));
    }
  }

  async function handleLogout() {
    await fetch('/api/recruiter/auth', { method: 'DELETE' });
    window.location.href = '/recruiter/login';
  }

  const systemStatus: 'operational' | 'degraded' | 'critical' =
    !data                                          ? 'operational' :
    data.stats.failedActions > 0 || data.warnings.some((w) => w.severity === 'error') ? 'critical' :
    data.warnings.length > 0                      ? 'degraded' :
                                                     'operational';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Sticky Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center gap-4">

            {/* Brand + status */}
            <div className="flex items-center gap-3 mr-2">
              <span className="text-sm font-bold text-slate-100 tracking-tight">DriverNord</span>
              <StatusPill status={systemStatus} />
            </div>

            {/* Stat badges */}
            {data && (
              <div className="flex flex-wrap items-center gap-2">
                <StatBadge label="Drivers"   value={data.stats.drivers}        />
                <StatBadge label="Open"      value={data.stats.openNeeds}       />
                <StatBadge
                  label="Pending"
                  value={data.stats.pendingActions}
                  variant={data.stats.pendingActions > 0 ? 'amber' : 'default'}
                />
                <StatBadge
                  label="Failed"
                  value={data.stats.failedActions}
                  variant={data.stats.failedActions > 0 ? 'red' : 'default'}
                />
                <StatBadge
                  label="Emergency"
                  value={data.stats.emergencyNeeds}
                  variant={data.stats.emergencyNeeds > 0 ? 'red' : 'default'}
                />
              </div>
            )}

            {/* Last updated + logout */}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-slate-600 tabular-nums">
                {lastUpdated
                  ? `Updated ${formatTime(lastUpdated.toISOString())}`
                  : loading
                    ? 'Loading…'
                    : ''}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* ── Boot error ──────────────────────────────────────────────────────── */}
        {fetchError && (
          <div className="rounded-lg bg-red-950/40 border border-red-800/50 px-4 py-3 text-sm text-red-400">
            Error: {fetchError}. Check RECRUITER_API_KEY and Supabase configuration.
          </div>
        )}

        {data && (
          <>
            {/* ── Warnings ──────────────────────────────────────────────────── */}
            {data.warnings.length > 0 && (
              <Section label="Warnings">
                <div className="space-y-2">
                  {data.warnings.map((w, i) => (
                    <WarningRow key={i} warning={w} />
                  ))}
                </div>
              </Section>
            )}

            {/* ── Pending Approvals ─────────────────────────────────────────── */}
            <Section
              label="Pending Approvals"
              count={data.pendingActions.length + data.failedActions.length}
            >
              {data.pendingActions.length === 0 && data.failedActions.length === 0 ? (
                <p className="text-sm text-slate-600">Nothing requires attention.</p>
              ) : (
                <div className="space-y-2">
                  {data.pendingActions.map((a) => (
                    <ApprovalCard
                      key={a.id}
                      action={a}
                      busy={actioning[a.id] ?? false}
                      onApprove={() => handleAction(a.id, 'approve')}
                      onCancel={()  => handleAction(a.id, 'cancel')}
                    />
                  ))}
                  {data.failedActions.map((a) => (
                    <FailedCard
                      key={a.id}
                      action={a}
                      busy={actioning[a.id] ?? false}
                      onRetry={() => handleRetry(a.id)}
                    />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Live Pipeline Feed ────────────────────────────────────────── */}
            <Section label="Live Feed">
              {data.recentActions.length === 0 ? (
                <p className="text-sm text-slate-600">No pipeline activity recorded yet.</p>
              ) : (
                <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden divide-y divide-slate-800/70">
                  {data.recentActions.map((a) => (
                    <FeedRow key={a.id} action={a} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Today's Metrics ───────────────────────────────────────────── */}
            <Section label="Today">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard label="Match runs"    value={data.today.matchRuns}     />
                <MetricCard label="Suggested"     value={data.today.suggested}     />
                <MetricCard label="Contacted"     value={data.today.contacted}     accent="emerald" />
                <MetricCard label="Skipped"       value={data.today.skipped}       />
                <MetricCard label="Follow-ups"    value={data.today.followUpsSent} accent="blue" />
                <MetricCard label="Errors"        value={data.today.errors}        accent={data.today.errors > 0 ? 'red' : undefined} />
              </div>
            </Section>

            {/* ── Pipeline State ────────────────────────────────────────────── */}
            <Section label="Pipeline">
              <div className="rounded-lg bg-slate-900 border border-slate-800 px-5 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <PipelineStep label="Pool"        count={data.pipeline.totalDrivers} color="text-slate-400" />
                  <PipelineArrow />
                  <PipelineStep label="Shortlisted" count={data.pipeline.shortlisted}  color="text-blue-400"  />
                  <PipelineArrow />
                  <PipelineStep label="Contacted"   count={data.pipeline.contacted}    color="text-amber-400" />
                  <PipelineArrow />
                  <PipelineStep label="Interested"  count={data.pipeline.interested}   color="text-emerald-400" />
                </div>
              </div>
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  label,
  count,
  children,
}: {
  label:    string;
  count?:   number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          {label}
        </h2>
        {count !== undefined && count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold tabular-nums border border-amber-500/30">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status }: { status: 'operational' | 'degraded' | 'critical' }) {
  const styles = {
    operational: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    degraded:    'bg-amber-500/10   text-amber-400   border-amber-500/30',
    critical:    'bg-red-500/10     text-red-400     border-red-500/30',
  };
  const dots = {
    operational: 'bg-emerald-500',
    degraded:    'bg-amber-500',
    critical:    'bg-red-500',
  };
  const labels = {
    operational: 'Operational',
    degraded:    'Degraded',
    critical:    'Needs attention',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]} ${status === 'operational' ? 'animate-pulse' : ''}`} />
      {labels[status]}
    </span>
  );
}

function StatBadge({
  label,
  value,
  variant = 'default',
}: {
  label:    string;
  value:    number;
  variant?: 'default' | 'amber' | 'red';
}) {
  const styles = {
    default: 'bg-slate-800/60 text-slate-300 border-slate-700/50',
    amber:   'bg-amber-500/10 text-amber-300 border-amber-500/30',
    red:     'bg-red-500/10   text-red-300   border-red-500/30',
  };
  return (
    <span className={`inline-flex items-baseline gap-1.5 text-xs px-2.5 py-1 rounded-md border font-mono tabular-nums ${styles[variant]}`}>
      <span className="font-bold">{value}</span>
      <span className="text-slate-500 font-sans">{label}</span>
    </span>
  );
}

function WarningRow({ warning }: { warning: Warning }) {
  const isError = warning.severity === 'error';
  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3 ${
      isError
        ? 'bg-red-950/30 border-red-800/50'
        : 'bg-amber-950/20 border-amber-800/40'
    }`}>
      <span className={`flex-shrink-0 mt-0.5 font-mono text-sm ${isError ? 'text-red-400' : 'text-amber-400'}`}>
        {isError ? '✕' : '⚠'}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${isError ? 'text-red-300' : 'text-amber-300'}`}>
          {warning.message}
        </p>
        <p className={`text-xs font-mono mt-0.5 ${isError ? 'text-red-600' : 'text-amber-700'}`}>
          {warning.type}
        </p>
      </div>
    </div>
  );
}

function ApprovalCard({
  action,
  busy,
  onApprove,
  onCancel,
}: {
  action:    SystemActionRow;
  busy:      boolean;
  onApprove: () => void;
  onCancel:  () => void;
}) {
  const name    = action.input?.first_name as string | undefined;
  const company = action.input?.company_name as string | undefined;
  const score   = typeof action.input?.match_score === 'number' ? action.input.match_score : null;
  const urgency = getUrgency(action);
  const isFollowUp = action.action_type === 'follow_up_triggered';

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-semibold text-cyan-400">
              {actionLabel(action.action_type)}
            </span>
            {name && (
              <span className="text-sm font-medium text-slate-100">{name}</span>
            )}
            {score !== null && (
              <span className="text-xs font-bold text-blue-400 tabular-nums">
                {score}
              </span>
            )}
            {company && (
              <span className="text-xs text-slate-500">→ {company}</span>
            )}
            {urgency && urgency !== 'standard' && (
              <UrgencyBadge urgency={urgency} />
            )}
            {isFollowUp && !!action.input?.follow_up_reason && (
              <span className="text-xs text-slate-500 italic">
                {String(action.input.follow_up_reason).replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 font-mono mt-1">
            {action.target_id.slice(0, 8)}… · {formatDate(action.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onApprove}
            disabled={busy}
            className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Approve
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 text-xs font-semibold
                       hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function FailedCard({
  action,
  busy,
  onRetry,
}: {
  action:  SystemActionRow;
  busy:    boolean;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-red-400">
              {actionLabel(action.action_type)}
            </span>
            <span className="text-xs text-slate-500">failed</span>
          </div>
          {action.error && (
            <p className="text-xs text-red-500/80 mt-0.5 font-mono truncate">
              {action.error.slice(0, 120)}
            </p>
          )}
          <p className="text-xs text-slate-700 font-mono mt-1">
            {action.target_id.slice(0, 8)}… · {formatDate(action.created_at)}
          </p>
        </div>
        <button
          onClick={onRetry}
          disabled={busy}
          className="flex-shrink-0 px-3 py-1.5 rounded-md border border-red-700/50 text-red-400 text-xs font-semibold
                     hover:bg-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function FeedRow({ action }: { action: SystemActionRow }) {
  const icon = actionIcon(action.action_type);

  const dotColor =
    action.status === 'completed' ? 'text-emerald-500' :
    action.status === 'pending'   ? 'text-amber-500'   :
    action.status === 'failed'    ? 'text-red-500'      :
    action.status === 'cancelled' ? 'text-slate-600'    :
                                    'text-blue-400';

  const rowBg =
    action.status === 'failed'  ? 'bg-red-950/20'   :
    action.status === 'pending' ? 'bg-amber-950/10' :
                                  '';

  const urgency     = getUrgency(action);
  const skipReason  = action.action_type === 'contact_skipped' ? getSkipReason(action) : null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 ${rowBg}`}>
      {/* Icon */}
      <span className={`flex-shrink-0 w-5 text-center text-xs font-mono ${dotColor}`}>
        {icon}
      </span>

      {/* Label */}
      <span className="flex-1 min-w-0 text-sm text-slate-300 truncate">
        {actionLabel(action.action_type)}
        {skipReason && (
          <span className="ml-2 text-xs text-slate-600 font-mono">
            [{skipReason}]
          </span>
        )}
        {!!action.input?.first_name && (
          <span className="ml-2 text-xs text-slate-500">
            {String(action.input.first_name)}
          </span>
        )}
        {!!action.result?.company_name && (
          <span className="ml-2 text-xs text-slate-600">
            → {String(action.result.company_name)}
          </span>
        )}
        {action.error && (
          <span className="ml-2 text-xs text-red-500 font-mono">
            {action.error.slice(0, 60)}
          </span>
        )}
      </span>

      {/* Urgency badge */}
      {urgency && urgency !== 'standard' && (
        <UrgencyBadge urgency={urgency} />
      )}

      {/* Triggered by */}
      {action.triggered_by === 'human' && (
        <span className="text-xs text-slate-600 flex-shrink-0 font-mono">human</span>
      )}

      {/* Timestamp */}
      <span className="text-xs text-slate-600 font-mono flex-shrink-0 tabular-nums">
        {formatDate(action.created_at)}
      </span>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const styles =
    urgency === 'emergency'
      ? 'bg-red-900/50 text-red-400 border-red-700/50'
      : urgency === 'urgent'
        ? 'bg-amber-900/40 text-amber-400 border-amber-700/40'
        : 'bg-slate-800 text-slate-500 border-slate-700';

  return (
    <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-mono border ${styles}`}>
      {urgency}
    </span>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label:   string;
  value:   number;
  accent?: 'emerald' | 'blue' | 'red';
}) {
  const valueColor =
    accent === 'emerald' ? 'text-emerald-400' :
    accent === 'blue'    ? 'text-blue-400'    :
    accent === 'red'     ? 'text-red-400'     :
                           'text-slate-100';

  return (
    <div className="rounded-lg bg-slate-900 border border-slate-800 px-4 py-4">
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <p className="text-xs text-slate-600 mt-1">{label}</p>
    </div>
  );
}

function PipelineStep({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[64px]">
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{count}</span>
      <span className="text-xs text-slate-600 text-center leading-tight">{label}</span>
    </div>
  );
}

function PipelineArrow() {
  return <span className="text-slate-700 text-base select-none px-1">→</span>;
}
