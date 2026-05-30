'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CockpitSummaryPayload,
  GovernanceSignals,
  ActiveNeedOverview,
  DraftItem,
  MarketRecommendations,
} from '../../../lib/cockpitSummary';
import type {
  PilotOutreachEntry,
  PilotRelationshipStatus,
  PilotUpdateAction,
} from '../../../lib/pilotOutreach';
import { hasMojibake } from '../../../lib/outreachEncoding';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactApprovalItem {
  action_id:         string;
  created_at:        string;
  driver_id:         string;
  match_score:       number;
  first_name:        string;
  phone:             string;
  message:           string;
  company_name:      string;
  urgency:           string;
  company_need_id:   string;
  shortlist_id:      string;
  license:           string | null;
  ykb:               string | null;
  region:            string | null;
  availability:      string | null;
  domain:            string | null;
  email:             string | null;
  has_quality_issue: boolean;
  has_duplicate:     boolean;
}

type QueueGroup = {
  clean:       ContactApprovalItem[];
  dq_blocked:  ContactApprovalItem[];
  dup_blocked: ContactApprovalItem[];
  both_blocked: ContactApprovalItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupQueue(items: ContactApprovalItem[]): QueueGroup {
  const g: QueueGroup = { clean: [], dq_blocked: [], dup_blocked: [], both_blocked: [] };
  for (const item of items) {
    if (item.has_quality_issue && item.has_duplicate) g.both_blocked.push(item);
    else if (item.has_quality_issue)                  g.dq_blocked.push(item);
    else if (item.has_duplicate)                      g.dup_blocked.push(item);
    else                                              g.clean.push(item);
  }
  return g;
}

function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-yellow-400';
  return 'text-slate-400';
}

function governanceLabel(hasQuality: boolean, hasDuplicate: boolean): { label: string; color: string } {
  if (hasQuality && hasDuplicate) return { label: 'Blocked: DQ + duplicate',   color: 'text-red-400' };
  if (hasQuality)                  return { label: 'Blocked: data quality',     color: 'text-yellow-400' };
  if (hasDuplicate)                return { label: 'Blocked: duplicate phone',  color: 'text-orange-400' };
  return                                  { label: 'Clean / Review-ready',      color: 'text-emerald-400' };
}

function urgencyBadge(urgency: string): string {
  if (urgency === 'emergency') return 'bg-red-900/50 text-red-400 border-red-700/50';
  if (urgency === 'urgent')    return 'bg-amber-900/40 text-amber-400 border-amber-700/40';
  return 'bg-slate-800 text-slate-500 border-slate-700';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h    = Math.floor(diff / 3_600_000);
  const m    = Math.floor(diff / 60_000);
  if (h > 48) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  if (m >= 1) return `${m}m ago`;
  return 'just now';
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function Chip({ children, color = 'bg-slate-800 text-slate-400' }: {
  children: React.ReactNode;
  color?:   string;
}) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono ${color}`}>
      {children}
    </span>
  );
}

function SectionHeader({ label, count, warn }: { label: string; count?: number; warn?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</h2>
      {count !== undefined && count > 0 && (
        <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-bold tabular-nums border ${
          warn
            ? 'bg-red-500/20 text-red-400 border-red-500/30'
            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        }`}>
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Section F: Agent / Automation Health ────────────────────────────────────

function StatusRow({ label, value, ok, warn, blocked, note }: {
  label:   string;
  value:   string;
  ok?:     boolean;
  warn?:   boolean;
  blocked?: boolean;
  note?:   string;
}) {
  const valueColor =
    blocked ? 'text-red-400'    :
    warn    ? 'text-amber-400'  :
    ok      ? 'text-emerald-400' :
              'text-slate-400';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        {note && <span className="text-xs text-slate-600 italic">{note}</span>}
        <span className={`text-xs font-mono font-semibold ${valueColor}`}>{value}</span>
      </div>
    </div>
  );
}

function AgentHealthSection({ signals }: { signals: GovernanceSignals }) {
  const dailyAge  = signals.last_daily_scan_at  ? relativeTime(signals.last_daily_scan_at)  : 'Never';
  const weeklyAge = signals.last_weekly_scan_at ? relativeTime(signals.last_weekly_scan_at) : 'Never';

  return (
    <section>
      <SectionHeader
        label="Agent / Automation Health"
        warn={signals.daily_scan_overdue || !signals.migration_016_applied}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-3 space-y-0.5">
          <p className="text-xs font-semibold text-slate-400 mb-2">Market Agent</p>
          <StatusRow
            label="Daily scan"
            value={dailyAge}
            ok={!signals.daily_scan_overdue}
            warn={signals.daily_scan_overdue}
            note={signals.daily_scan_overdue ? 'OVERDUE' : undefined}
          />
          <StatusRow
            label="Weekly scan"
            value={weeklyAge}
            ok={!signals.weekly_scan_overdue}
            warn={signals.weekly_scan_overdue}
            note={signals.weekly_scan_overdue ? 'OVERDUE' : undefined}
          />
          <StatusRow
            label="Cron schedule"
            value="Daily 05:00 UTC · Weekly Mon 04:00 UTC"
            ok
          />
        </div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-3 space-y-0.5">
          <p className="text-xs font-semibold text-slate-400 mb-2">Contact / SMS</p>
          <StatusRow
            label="AGENT_CONTACT_MODE"
            value={signals.agent_contact_mode}
            ok={signals.agent_contact_mode === 'suggest'}
            warn={signals.agent_contact_mode !== 'suggest'}
          />
          <StatusRow
            label="SMS (46elks)"
            value={signals.sms_configured ? 'Configured' : 'Not configured'}
            ok={signals.sms_configured}
            warn={!signals.sms_configured}
          />
          <StatusRow
            label="Automated email"
            value="Not active"
            ok
          />
        </div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-3 space-y-0.5">
          <p className="text-xs font-semibold text-slate-400 mb-2">Infrastructure</p>
          <StatusRow
            label="Migration 016 (Pilot Tracker)"
            value={signals.migration_016_applied ? 'Applied' : 'Not applied — action required'}
            ok={signals.migration_016_applied}
            blocked={!signals.migration_016_applied}
            note={signals.migration_016_applied ? undefined : 'See docs/sql/apply-migration-016-pilot-outreach.sql'}
          />
          <StatusRow
            label="pilot_company_relationships"
            value={`${signals.pilot_companies_active} active`}
            ok={signals.pilot_companies_active > 0}
            warn={signals.pilot_companies_active === 0}
            note={signals.pilot_companies_active === 0 ? 'Seed after applying migration 016' : undefined}
          />
          <StatusRow
            label="Migration 017 (Outreach Queue)"
            value={signals.migration_017_applied ? 'Applied' : 'Not applied — action required'}
            ok={signals.migration_017_applied}
            blocked={!signals.migration_017_applied}
            note={signals.migration_017_applied ? undefined : 'See docs/sql/apply-migration-017-outreach-email-queue.sql'}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Section G: Founder Next Actions ─────────────────────────────────────────

interface FounderAction {
  priority:  number;
  label:     string;
  reason:    string;
  blocking:  boolean;
}

function buildFounderActions(signals: GovernanceSignals, needs: ActiveNeedOverview[]): FounderAction[] {
  const actions: FounderAction[] = [];
  let p = 1;

  if (!signals.migration_016_applied) {
    actions.push({
      priority: p++,
      label:    'Apply Migration 016',
      reason:   'Pilot Outreach Tracker is broken until the SQL is pasted into Supabase SQL Editor. File: docs/sql/apply-migration-016-pilot-outreach.sql',
      blocking: true,
    });
  }

  if (!signals.migration_017_applied) {
    actions.push({
      priority: p++,
      label:    'Apply Migration 017',
      reason:   'Outreach Email Queue (Section H) is broken until the SQL is pasted into Supabase SQL Editor. File: docs/sql/apply-migration-017-outreach-email-queue.sql',
      blocking: true,
    });
  }

  if (signals.daily_scan_overdue) {
    actions.push({
      priority: p++,
      label:    'Trigger Market Agent daily scan',
      reason:   `Last daily scan: ${signals.last_daily_scan_at ? relativeTime(signals.last_daily_scan_at) : 'never'}. Run: POST /api/admin/company-need-agent/daily-scan with x-recruiter-key.`,
      blocking: false,
    });
  }

  if (signals.pilot_followup_overdue > 0) {
    actions.push({
      priority: p++,
      label:    `Send ${signals.pilot_followup_overdue} overdue follow-up email${signals.pilot_followup_overdue > 1 ? 's' : ''}`,
      reason:   'Follow-up windows have passed. Send from Zoho manually. See cockpit Section E for companies.',
      blocking: false,
    });
  }

  if (signals.pending_contact_suggested > 0) {
    const deliveryReady = needs.filter((n) => n.clean_candidates > 0);
    if (deliveryReady.length > 0) {
      actions.push({
        priority: p++,
        label:    `Review ${signals.pending_contact_suggested} pending contact suggestions`,
        reason:   `Before delivering any shortlist to ${deliveryReady.map((n) => n.company_name).join(', ')}, approve the governance records for their top candidates.`,
        blocking: false,
      });
    }
  }

  const blocked = needs.filter((n) => n.clean_candidates === 0 && n.matching_eligible);
  if (blocked.length > 0) {
    actions.push({
      priority: p++,
      label:    `Resolve supply gap: ${blocked.map((n) => n.company_name).join(', ')}`,
      reason:   `${blocked.length} company need${blocked.length > 1 ? 's have' : ' has'} zero clean candidates. Recruit drivers before promising shortlist delivery.`,
      blocking: false,
    });
  }

  if (signals.pilot_companies_active === 0 && signals.migration_016_applied) {
    actions.push({
      priority: p++,
      label:    'Seed pilot_company_relationships table',
      reason:   'Migration 016 is applied but no rows exist. Add the 5 pilot companies via docs/sql/seed-pilot-companies.sql (to be created) or the cockpit PATCH route.',
      blocking: false,
    });
  }

  if (signals.weekly_scan_overdue) {
    actions.push({
      priority: p++,
      label:    'Trigger Market Agent weekly scan',
      reason:   `Last weekly scan: ${signals.last_weekly_scan_at ? relativeTime(signals.last_weekly_scan_at) : 'never'}. Run: POST /api/admin/company-need-agent/weekly-scan.`,
      blocking: false,
    });
  }

  if (signals.queue_batch1_followup_due) {
    actions.push({
      priority: p++,
      label:    'Send Batch 1 follow-up emails (2026-06-02 – 2026-06-04)',
      reason:   'Follow-up window is open or within 3 days. Check hej@drivernord.com for replies first. Send follow-ups manually from Zoho — do not use first-contact drafts. See cockpit Section H for 7 companies.',
      blocking: false,
    });
  }

  return actions;
}

function FounderActionsSection({ signals, needs }: { signals: GovernanceSignals; needs: ActiveNeedOverview[] }) {
  const actions = buildFounderActions(signals, needs);

  if (actions.length === 0) {
    return (
      <section>
        <SectionHeader label="Founder Next Actions" />
        <p className="text-xs text-emerald-400">No immediate actions required.</p>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader label="Founder Next Actions" count={actions.filter((a) => a.blocking).length} warn />
      <div className="space-y-2">
        {actions.map((a) => (
          <div
            key={a.priority}
            className={`rounded-lg border px-3 py-2.5 ${
              a.blocking
                ? 'border-red-800/60 bg-red-950/20'
                : 'border-slate-800 bg-slate-900'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className={`shrink-0 text-xs font-bold tabular-nums font-mono mt-0.5 ${a.blocking ? 'text-red-400' : 'text-slate-500'}`}>
                {a.priority}.
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${a.blocking ? 'text-red-200' : 'text-slate-100'}`}>
                  {a.blocking && <span className="text-xs text-red-400 font-mono mr-1">[BLOCKING]</span>}
                  {a.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 break-words">{a.reason}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Section A: Intelligence Signals ─────────────────────────────────────────

function SignalValue({
  label, value, status,
}: { label: string; value: React.ReactNode; status: 'ok' | 'warn' | 'block' | 'info' }) {
  const valueColor =
    status === 'ok'    ? 'text-emerald-400' :
    status === 'warn'  ? 'text-amber-400'   :
    status === 'block' ? 'text-red-400'     :
                         'text-slate-300';
  return (
    <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-3">
      <p className={`text-base font-bold tabular-nums font-mono ${valueColor}`}>{value}</p>
      <p className="text-xs text-slate-600 mt-0.5">{label}</p>
    </div>
  );
}

function SignalsSection({ signals }: { signals: GovernanceSignals }) {
  return (
    <section>
      <SectionHeader label="Intelligence Signals" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <SignalValue
          label="Open needs"
          value={signals.real_open_needs}
          status={signals.real_open_needs > 0 ? 'ok' : 'warn'}
        />
        <SignalValue
          label="Matching blocked"
          value={signals.matching_blocked ? 'YES' : 'NO'}
          status={signals.matching_blocked ? 'block' : 'ok'}
        />
        <SignalValue
          label="External contact blocked"
          value={signals.external_contact_blocked ? 'YES' : 'NO'}
          status={signals.external_contact_blocked ? 'warn' : 'ok'}
        />
        <SignalValue
          label="SMS safe"
          value={signals.sms_safe ? 'YES' : 'NO'}
          status={signals.sms_safe ? 'ok' : 'block'}
        />
        <SignalValue
          label="Pending contacts"
          value={signals.pending_contact_suggested}
          status={signals.pending_contact_suggested > 0 ? 'warn' : 'info'}
        />
        <SignalValue
          label="DQ flagged drivers"
          value={signals.dq_flagged_count}
          status={signals.dq_flagged_count > 0 ? 'warn' : 'ok'}
        />
        <SignalValue
          label="Duplicate phones"
          value={signals.duplicate_flagged_count}
          status={signals.duplicate_flagged_count > 0 ? 'warn' : 'ok'}
        />
        <SignalValue
          label="Promotion candidates"
          value={signals.promotion_candidates}
          status={signals.promotion_candidates > 0 ? 'warn' : 'info'}
        />
        <SignalValue
          label="Stale signals"
          value={signals.stale_signals}
          status={signals.stale_signals > 0 ? 'info' : 'ok'}
        />
        <SignalValue
          label="Last market scan"
          value={signals.last_daily_scan_at ? relativeTime(signals.last_daily_scan_at) : '—'}
          status={signals.daily_scan_overdue ? 'warn' : 'info'}
        />
        <SignalValue
          label="Outreach approved"
          value={signals.outreach_approved_needs}
          status={signals.outreach_approved_needs > 0 ? 'ok' : 'warn'}
        />
        <SignalValue
          label="Pilot companies"
          value={signals.pilot_companies_active}
          status={signals.pilot_companies_active > 0 ? 'ok' : 'info'}
        />
        <SignalValue
          label="Follow-up overdue"
          value={signals.pilot_followup_overdue}
          status={signals.pilot_followup_overdue > 0 ? 'warn' : 'ok'}
        />
      </div>
    </section>
  );
}

// ─── Section B: Active Needs ──────────────────────────────────────────────────

const APPROVABLE_NEED_TYPES = new Set([
  'active_public_need',
  'matching_eligible',
  'contact_ready_candidate',
  'outreach_pending_approval',
]);

function NeedRow({
  need,
  onApprove,
}: {
  need:      ActiveNeedOverview;
  onApprove: (id: string, reason: string) => Promise<void>;
}) {
  const isCleanest = need.blocked_candidates === 0 && need.clean_candidates > 0 && need.top_match_score !== null && need.top_match_score >= 90;
  const border = isCleanest ? 'border-emerald-800/60' : 'border-slate-800';

  const [formOpen, setFormOpen]     = useState(false);
  const [reason, setReason]         = useState('');
  const [reasonErr, setReasonErr]   = useState<string | null>(null);
  const [approving, setApproving]   = useState(false);
  const [localApproved, setLocalApproved] = useState(false);
  const [approveErr, setApproveErr] = useState<string | null>(null);

  const effectivelyApproved = need.outreach_approved || localApproved;
  const canApprove = !effectivelyApproved && APPROVABLE_NEED_TYPES.has(need.need_type);

  async function submitApproval() {
    if (reason.trim().length < 10) {
      setReasonErr('Reason must be at least 10 characters.');
      return;
    }
    setReasonErr(null);
    setApproving(true);
    setApproveErr(null);
    try {
      await onApprove(need.need_id, reason);
      setLocalApproved(true);
      setFormOpen(false);
    } catch (e) {
      setApproveErr(String(e));
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className={`rounded-lg border ${border} bg-slate-900 px-4 py-3 space-y-2`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isCleanest && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                BEST MATCH
              </span>
            )}
            <p className="text-slate-100 font-semibold text-sm">{need.company_name}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Chip>{need.license}</Chip>
            <Chip>{need.domain}</Chip>
            <Chip>{need.region}</Chip>
            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono border ${urgencyBadge(need.urgency)}`}>
              {need.urgency}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          {need.top_match_score !== null ? (
            <>
              <p className={`text-xl font-bold font-mono ${scoreColor(need.top_match_score)}`}>
                {need.top_match_score}
              </p>
              <p className="text-slate-600 text-xs">top score</p>
            </>
          ) : (
            <p className="text-slate-600 text-xs">no matches yet</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs items-center">
        {need.clean_candidates > 0 ? (
          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold font-mono border border-emerald-800/60 bg-emerald-950/40 text-emerald-400">
            READY — {need.clean_candidates} clean
          </span>
        ) : (
          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold font-mono border border-red-800/60 bg-red-950/40 text-red-400">
            BLOCKED — 0 clean candidates
          </span>
        )}
        <span className="text-slate-500">
          Shortlisted: <span className="text-slate-300 font-medium">{need.shortlisted_count}</span>
        </span>
        {need.blocked_candidates > 0 && (
          <span className="text-amber-600">
            Flagged: <span className="text-amber-400 font-medium">{need.blocked_candidates}</span>
          </span>
        )}
      </div>

      {/* Outreach state row */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        {need.matching_eligible ? (
          <span className="text-emerald-500">matching eligible</span>
        ) : (
          <span className="text-slate-600">not matching eligible</span>
        )}
        {effectivelyApproved ? (
          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Outreach approved
          </span>
        ) : (
          <span className="text-slate-600">outreach not approved</span>
        )}
        {canApprove && !formOpen && (
          <button
            onClick={() => setFormOpen(true)}
            className="ml-auto text-xs text-blue-400 border border-blue-700/50 px-2 py-0.5 rounded hover:bg-blue-900/30 transition-colors"
          >
            Approve future outreach
          </button>
        )}
      </div>

      {/* Outreach approval form */}
      {formOpen && canApprove && (
        <div className="rounded border border-blue-800/50 bg-blue-950/20 px-3 py-3 space-y-2 mt-1">
          <p className="text-xs text-blue-300 font-semibold">Approve need for future outreach</p>
          <p className="text-xs text-slate-400">
            <span className="text-emerald-400 font-medium">No SMS or email will be sent.</span>{' '}
            This records founder approval that this need is eligible for external outreach once a
            configured SMS provider is active. Individual driver contact still requires separate
            driver-level confirmation.
          </p>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 block">
              Reason (required, min 10 chars)
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setReasonErr(null); }}
              rows={2}
              placeholder="e.g. Three clean candidates confirmed, Samir (97) is highest priority — ready for contact wave once 46elks active"
              className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200
                         placeholder-slate-600 resize-none focus:outline-none focus:border-blue-700"
            />
            {reasonErr && <p className="text-xs text-red-400">{reasonErr}</p>}
          </div>
          {approveErr && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded px-2 py-1">
              {approveErr}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={submitApproval}
              disabled={approving}
              className="flex-1 py-1.5 rounded bg-blue-800 hover:bg-blue-700 text-blue-100 text-xs font-medium
                         disabled:opacity-40 transition-colors"
            >
              {approving ? 'Approving…' : 'Confirm outreach approval'}
            </button>
            <button
              onClick={() => { setFormOpen(false); setReason(''); setReasonErr(null); setApproveErr(null); }}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveNeedsSection({
  needs,
  onApproveOutreach,
}: {
  needs:            ActiveNeedOverview[];
  onApproveOutreach: (id: string, reason: string) => Promise<void>;
}) {
  if (needs.length === 0) {
    return (
      <section>
        <SectionHeader label="Active Needs" />
        <p className="text-sm text-slate-600">No real open company needs.</p>
      </section>
    );
  }

  const sorted = [...needs].sort((a, b) => {
    const aScore = a.top_match_score ?? 0;
    const bScore = b.top_match_score ?? 0;
    const aClean = a.clean_candidates;
    const bClean = b.clean_candidates;
    if (aClean !== bClean) return bClean - aClean;
    return bScore - aScore;
  });

  return (
    <section>
      <SectionHeader label="Active Needs & Matching" count={needs.length} />
      <div className="space-y-3">
        {sorted.map((n) => (
          <NeedRow key={n.need_id} need={n} onApprove={onApproveOutreach} />
        ))}
      </div>
    </section>
  );
}

// ─── Section C: Contact Queue ─────────────────────────────────────────────────

function QueueItemRow({
  item,
  onAction,
}: {
  item:     ContactApprovalItem;
  onAction: (id: string, action: 'approve' | 'skip' | 'needs_review', force?: boolean, forceReason?: string) => Promise<void>;
}) {
  const [busy, setBusy]             = useState(false);
  const [done, setDone]             = useState<string | null>(null);
  const [err, setErr]               = useState<string | null>(null);
  const [showForce, setShowForce]   = useState(false);
  const [forceReason, setForceReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const govStatus = governanceLabel(item.has_quality_issue, item.has_duplicate);
  const borderColor = item.has_quality_issue && item.has_duplicate ? 'border-red-800'
    : item.has_quality_issue ? 'border-yellow-800'
    : item.has_duplicate    ? 'border-orange-800'
    : 'border-slate-800';

  async function act(action: 'approve' | 'skip' | 'needs_review', force = false) {
    if (force) {
      if (forceReason.trim().length < 10) {
        setReasonError('Provide a reason of at least 10 characters before force-approving.');
        return;
      }
      setReasonError(null);
    }
    setBusy(true);
    setErr(null);
    try {
      await onAction(item.action_id, action, force, force ? forceReason : undefined);
      setDone(action);
    } catch (e) {
      const msg = String(e);
      if (msg.includes('blocked_data_quality') || msg.includes('422')) {
        setShowForce(true);
        setErr('Blocked: data quality or duplicate issue. Enter a reason and use force override to proceed.');
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const doneLabel =
      done === 'approve' ? 'Confirmed — pending 46elks activation' :
      done === 'skip'    ? 'Skipped' :
                           'Flagged for review';
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded bg-slate-900 border border-slate-800">
        <span className={`text-xs ${done === 'approve' ? 'text-emerald-400' : done === 'skip' ? 'text-slate-500' : 'text-amber-400'}`}>
          {doneLabel}
        </span>
        <span className="text-xs text-slate-600 ml-auto">{item.first_name}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${borderColor} bg-slate-900 px-3 py-3 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-slate-100 text-sm font-medium">
            {item.first_name}
            <span className="text-slate-500 font-mono text-xs ml-2">{item.phone}</span>
          </p>
          {item.email && (
            <p className="text-slate-600 text-xs font-mono">{item.email}</p>
          )}
          <p className="text-xs text-slate-500 mt-0.5">
            {item.company_name} · {item.company_need_id.slice(0, 8)}…
          </p>
          <p className={`text-xs font-semibold mt-0.5 ${govStatus.color}`}>{govStatus.label}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-base font-bold font-mono ${scoreColor(item.match_score)}`}>
            {item.match_score}
          </p>
          <p className="text-xs text-slate-600">score</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {item.license      && <Chip>{item.license}</Chip>}
        {item.domain       && <Chip>{item.domain}</Chip>}
        {item.region       && <Chip>{item.region}</Chip>}
        {item.ykb          && <Chip>YKB: {item.ykb}</Chip>}
        {item.availability && <Chip>{item.availability}</Chip>}
      </div>

      {item.has_quality_issue && (
        <p className="text-xs text-yellow-400 bg-yellow-950/50 border border-yellow-800/50 rounded px-2 py-1">
          DQ: name field contains phone number — verify identity before approving
        </p>
      )}
      {item.has_duplicate && (
        <p className="text-xs text-orange-400 bg-orange-950/50 border border-orange-800/50 rounded px-2 py-1">
          Duplicate: phone shared with another registered driver
        </p>
      )}

      {err && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded px-2 py-1">
          {err}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => act('approve')}
          disabled={busy}
          className="flex-1 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-medium disabled:opacity-40 transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={() => act('needs_review')}
          disabled={busy}
          className="flex-1 py-1.5 rounded bg-yellow-900 hover:bg-yellow-800 text-yellow-100 text-xs font-medium disabled:opacity-40 transition-colors"
        >
          Review
        </button>
        <button
          onClick={() => act('skip')}
          disabled={busy}
          className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium disabled:opacity-40 transition-colors"
        >
          Skip
        </button>
      </div>

      {showForce && (
        <div className="rounded border border-red-800/50 bg-red-950/30 px-3 py-2 space-y-2">
          <p className="text-xs text-red-400 font-medium">
            Force override — confirm you have manually verified this driver&apos;s identity
          </p>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 block">
              Reason for override (required, min 10 chars)
            </label>
            <textarea
              value={forceReason}
              onChange={(e) => { setForceReason(e.target.value); setReasonError(null); }}
              rows={2}
              placeholder="e.g. Called driver directly, identity confirmed as..."
              className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200
                         placeholder-slate-600 resize-none focus:outline-none focus:border-red-700"
            />
            {reasonError && (
              <p className="text-xs text-red-400">{reasonError}</p>
            )}
          </div>
          <button
            onClick={() => act('approve', true)}
            disabled={busy}
            className="w-full py-1.5 rounded border border-red-700/50 text-red-400 text-xs font-semibold hover:bg-red-900/30 disabled:opacity-40 transition-colors"
          >
            Force confirm (identity verified)
          </button>
        </div>
      )}
    </div>
  );
}

function ContactQueueSection({
  queue,
  onAction,
  loading,
}: {
  queue:    ContactApprovalItem[];
  onAction: (id: string, action: 'approve' | 'skip' | 'needs_review', force?: boolean, forceReason?: string) => Promise<void>;
  loading:  boolean;
}) {
  const groups = groupQueue(queue);
  const totalBlocked = groups.dq_blocked.length + groups.dup_blocked.length + groups.both_blocked.length;

  return (
    <section>
      <SectionHeader
        label="Contact Suggested Queue"
        count={queue.length}
        warn={totalBlocked > 0}
      />

      {loading && <p className="text-sm text-slate-600">Loading queue…</p>}

      {!loading && queue.length === 0 && (
        <p className="text-sm text-slate-600">No pending contact suggestions.</p>
      )}

      {!loading && queue.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
              Clean: {groups.clean.length}
            </span>
            {groups.dq_blocked.length > 0 && (
              <span className="px-2 py-1 rounded bg-yellow-950/40 border border-yellow-800/40 text-yellow-400">
                DQ flagged: {groups.dq_blocked.length}
              </span>
            )}
            {groups.dup_blocked.length > 0 && (
              <span className="px-2 py-1 rounded bg-orange-950/40 border border-orange-800/40 text-orange-400">
                Duplicate: {groups.dup_blocked.length}
              </span>
            )}
            {groups.both_blocked.length > 0 && (
              <span className="px-2 py-1 rounded bg-red-950/40 border border-red-800/40 text-red-400">
                DQ + Duplicate: {groups.both_blocked.length}
              </span>
            )}
          </div>

          {/* Clean candidates */}
          {groups.clean.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-widest">
                Clean — ready for founder review
              </p>
              {groups.clean.map((item) => (
                <QueueItemRow key={item.action_id} item={item} onAction={onAction} />
              ))}
            </div>
          )}

          {/* DQ blocked */}
          {groups.dq_blocked.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-yellow-600 font-semibold uppercase tracking-widest">
                Data quality flagged — verify before approving
              </p>
              {groups.dq_blocked.map((item) => (
                <QueueItemRow key={item.action_id} item={item} onAction={onAction} />
              ))}
            </div>
          )}

          {/* Duplicate blocked */}
          {groups.dup_blocked.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-orange-600 font-semibold uppercase tracking-widest">
                Duplicate phone — confirm canonical driver before approving
              </p>
              {groups.dup_blocked.map((item) => (
                <QueueItemRow key={item.action_id} item={item} onAction={onAction} />
              ))}
            </div>
          )}

          {/* Both */}
          {groups.both_blocked.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-red-500 font-semibold uppercase tracking-widest">
                DQ + Duplicate — do not approve without full manual verification
              </p>
              {groups.both_blocked.map((item) => (
                <QueueItemRow key={item.action_id} item={item} onAction={onAction} />
              ))}
            </div>
          )}

          <p className="text-xs text-slate-600 pt-1">
            <a href="/admin/contacts" className="hover:text-slate-400 underline transition-colors">
              Open full contact queue →
            </a>
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Section D: Market Agent Recommendations ──────────────────────────────────

function DraftCard({
  draft,
  onPromote,
  promoting,
  promoted,
}: {
  draft:     DraftItem;
  onPromote?: (id: string) => Promise<void>;
  promoting:  boolean;
  promoted:   boolean;
}) {
  if (promoted) {
    return (
      <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 px-3 py-3">
        <p className="text-xs text-emerald-400 font-medium">Promoted — matching now active</p>
        <p className="text-xs text-slate-600 mt-0.5">{draft.company_name}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${draft.draft_status === 'ready_for_review' ? 'border-slate-700' : 'border-slate-800'} bg-slate-900 px-3 py-3 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-slate-100 text-sm font-medium">{draft.company_name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {draft.license  && <Chip>{draft.license}</Chip>}
            {draft.domain   && <Chip>{draft.domain}</Chip>}
            {draft.region   && <Chip>{draft.region}</Chip>}
            {draft.urgency  && (
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono border ${urgencyBadge(draft.urgency)}`}>
                {draft.urgency}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-xs text-slate-500 font-mono">{relativeTime(draft.updated_at)}</span>
      </div>

      {draft.missing_fields.length > 0 && (
        <p className="text-xs text-amber-500">
          Missing: {draft.missing_fields.join(', ')}
        </p>
      )}
      {draft.rejection_reason && (
        <p className="text-xs text-slate-500 italic">
          Rejected: {draft.rejection_reason}
        </p>
      )}

      {onPromote && draft.draft_status === 'ready_for_review' && (
        <button
          onClick={() => onPromote(draft.id)}
          disabled={promoting}
          className="w-full py-1.5 rounded bg-blue-800 hover:bg-blue-700 text-blue-100 text-xs font-medium disabled:opacity-40 transition-colors"
        >
          {promoting ? 'Promoting…' : 'Promote to active need'}
        </button>
      )}
    </div>
  );
}

function MarketSection({
  market,
  lastScanAt,
}: {
  market:     MarketRecommendations;
  lastScanAt: string | null;
}) {
  const [promoting, setPromoting] = useState<Record<string, boolean>>({});
  const [promoted, setPromoted]   = useState<Record<string, boolean>>({});
  const [promoteErr, setPromoteErr] = useState<string | null>(null);

  async function handlePromote(draftId: string) {
    setPromoting((p) => ({ ...p, [draftId]: true }));
    setPromoteErr(null);
    try {
      const res = await fetch(`/api/admin/drafts/${draftId}/promote`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setPromoteErr(body.error ?? `HTTP ${res.status}`);
      } else {
        setPromoted((p) => ({ ...p, [draftId]: true }));
      }
    } catch {
      setPromoteErr('network_error');
    } finally {
      setPromoting((p) => ({ ...p, [draftId]: false }));
    }
  }

  const total =
    market.promotion_candidates.length +
    market.recently_promoted.length +
    market.rejected_drafts.length +
    market.stale_drafts.length;

  return (
    <section>
      <SectionHeader label="Market Agent Recommendations" count={market.promotion_candidates.length} />

      <div className="text-xs text-slate-600 mb-4 flex items-center gap-3">
        <span>Last scan: {lastScanAt ? relativeTime(lastScanAt) : '—'}</span>
        {total === 0 && <span>No drafts in system.</span>}
      </div>

      {promoteErr && (
        <div className="mb-3 rounded border border-red-800/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
          Promotion failed: {promoteErr}
        </div>
      )}

      <div className="space-y-5">
        {market.promotion_candidates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest">
              Ready to promote ({market.promotion_candidates.length})
            </p>
            <p className="text-xs text-slate-600">
              Promoting a draft creates a live company_need. No outreach is triggered. Matching runs on the next cycle.
            </p>
            {market.promotion_candidates.map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                onPromote={handlePromote}
                promoting={promoting[d.id] ?? false}
                promoted={promoted[d.id] ?? false}
              />
            ))}
          </div>
        )}

        {market.recently_promoted.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-widest">
              Recently promoted (last 7d)
            </p>
            {market.recently_promoted.map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                promoting={false}
                promoted
              />
            ))}
          </div>
        )}

        {market.stale_drafts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
              Stale / incomplete ({market.stale_drafts.length})
            </p>
            {market.stale_drafts.slice(0, 5).map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                promoting={false}
                promoted={false}
              />
            ))}
            {market.stale_drafts.length > 5 && (
              <p className="text-xs text-slate-600">
                +{market.stale_drafts.length - 5} more stale signals
              </p>
            )}
          </div>
        )}

        {market.rejected_drafts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-600 font-semibold uppercase tracking-widest">
              Rejected ({market.rejected_drafts.length})
            </p>
            {market.rejected_drafts.slice(0, 3).map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                promoting={false}
                promoted={false}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Section E: Pilot Outreach Tracker ───────────────────────────────────────

const STATUS_LABEL: Record<PilotRelationshipStatus, string> = {
  researched:          'Not contacted',
  outreach_ready:      'Ready to contact',
  contacted:           'Email sent',
  replied:             'Replied — interested',
  call_booked:         'Call booked',
  needs_collected:     'Need confirmed',
  pilot_agreed:        'Pilot agreed',
  shortlist_preparing: 'Shortlist preparing',
  shortlist_delivered: 'Shortlist delivered',
  feedback_pending:    'Feedback pending',
  pilot_completed:     'Pilot completed',
  pilot_lost:          'Closed — lost',
  nurture_later:       'Nurture later',
  do_not_contact:      'Do not contact',
};

const STATUS_BADGE: Record<PilotRelationshipStatus, string> = {
  researched:          'bg-slate-800 text-slate-500 border-slate-700',
  outreach_ready:      'bg-blue-950/40 text-blue-400 border-blue-800/40',
  contacted:           'bg-amber-950/40 text-amber-400 border-amber-800/40',
  replied:             'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
  call_booked:         'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
  needs_collected:     'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
  pilot_agreed:        'bg-emerald-950/40 text-emerald-500 border-emerald-800/40',
  shortlist_preparing: 'bg-blue-950/40 text-blue-300 border-blue-800/40',
  shortlist_delivered: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
  feedback_pending:    'bg-amber-950/60 text-amber-300 border-amber-700/50',
  pilot_completed:     'bg-slate-800 text-slate-400 border-slate-700',
  pilot_lost:          'bg-slate-900 text-slate-600 border-slate-800',
  nurture_later:       'bg-slate-800 text-slate-500 border-slate-700',
  do_not_contact:      'bg-red-950/60 text-red-400 border-red-800/50',
};

const STATUS_BORDER: Record<PilotRelationshipStatus, string> = {
  researched:          'border-slate-800',
  outreach_ready:      'border-blue-800/50',
  contacted:           'border-amber-800/50',
  replied:             'border-emerald-800/50',
  call_booked:         'border-emerald-800/50',
  needs_collected:     'border-emerald-800/50',
  pilot_agreed:        'border-emerald-700/60',
  shortlist_preparing: 'border-blue-800/50',
  shortlist_delivered: 'border-amber-800/50',
  feedback_pending:    'border-amber-700/60',
  pilot_completed:     'border-slate-700',
  pilot_lost:          'border-slate-800',
  nurture_later:       'border-slate-800',
  do_not_contact:      'border-red-800/60',
};

// Actions available at each status, in display order
const CARD_ACTIONS: Partial<Record<PilotRelationshipStatus, Array<{ action: PilotUpdateAction; label: string; style: string; needsForm: boolean }>>> = {
  researched:          [{ action: 'mark_email_sent',         label: 'Mark email sent',       style: 'blue',  needsForm: true  }],
  outreach_ready:      [{ action: 'mark_email_sent',         label: 'Mark email sent',       style: 'blue',  needsForm: true  }],
  contacted:           [
    { action: 'mark_replied_interested', label: 'Replied — interested', style: 'emerald', needsForm: true  },
    { action: 'mark_replied_not_now',    label: 'Not now / nurture',    style: 'slate',   needsForm: true  },
    { action: 'mark_closed_lost',        label: 'Close — lost',         style: 'red',     needsForm: true  },
  ],
  replied:             [
    { action: 'mark_need_confirmed',     label: 'Confirm need',         style: 'emerald', needsForm: true  },
    { action: 'mark_closed_lost',        label: 'Close — lost',         style: 'red',     needsForm: true  },
  ],
  call_booked:         [
    { action: 'mark_need_confirmed',     label: 'Confirm need',         style: 'emerald', needsForm: true  },
    { action: 'mark_closed_lost',        label: 'Close — lost',         style: 'red',     needsForm: true  },
  ],
  needs_collected:     [{ action: 'mark_shortlist_preparing', label: 'Start shortlist',      style: 'blue',  needsForm: false }],
  pilot_agreed:        [{ action: 'mark_shortlist_preparing', label: 'Start shortlist',      style: 'blue',  needsForm: false }],
  shortlist_preparing: [{ action: 'mark_shortlist_delivered', label: 'Mark shortlist delivered', style: 'emerald', needsForm: true }],
  shortlist_delivered: [
    { action: 'mark_feedback_pending',   label: 'Awaiting feedback',    style: 'amber',   needsForm: false },
    { action: 'mark_pilot_completed',    label: 'Mark pilot complete',  style: 'emerald', needsForm: true  },
  ],
  feedback_pending:    [{ action: 'mark_pilot_completed',    label: 'Mark pilot complete',  style: 'emerald', needsForm: true  }],
  nurture_later:       [{ action: 'mark_email_sent',         label: 'Re-engage — email sent', style: 'blue', needsForm: true  }],
};

function actionButtonClass(style: string): string {
  if (style === 'blue')    return 'bg-blue-800 hover:bg-blue-700 text-blue-100';
  if (style === 'emerald') return 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100';
  if (style === 'amber')   return 'bg-amber-800 hover:bg-amber-700 text-amber-100';
  if (style === 'red')     return 'bg-red-900 hover:bg-red-800 text-red-200';
  return 'bg-slate-700 hover:bg-slate-600 text-slate-200';
}

function PilotCompanyCard({
  entry,
  onAction,
}: {
  entry:    PilotOutreachEntry;
  onAction: (id: string, action: PilotUpdateAction, extras: Record<string, string>) => Promise<void>;
}) {
  const [activeAction, setActiveAction]  = useState<PilotUpdateAction | null>(null);
  const [formValue, setFormValue]        = useState('');
  const [noteValue, setNoteValue]        = useState('');
  const [showNote, setShowNote]          = useState(false);
  const [loading, setLoading]            = useState(false);
  const [result, setResult]              = useState<string | null>(null);
  const [err, setErr]                    = useState<string | null>(null);

  const actions = CARD_ACTIONS[entry.status] ?? [];

  const formLabel: Partial<Record<PilotUpdateAction, string>> = {
    mark_email_sent:           'Email subject line (optional)',
    mark_replied_interested:   'Reply summary (optional)',
    mark_replied_not_now:      'Reply summary (optional)',
    mark_shortlist_delivered:  'Delivery note (optional)',
    mark_pilot_completed:      'Pilot outcome note (optional)',
    mark_need_confirmed:       'Need summary (optional)',
    mark_closed_lost:          'Reason for closing (required, min 10 chars)',
  };

  async function submit() {
    if (!activeAction) return;
    const needsReason = activeAction === 'mark_closed_lost' || activeAction === 'mark_do_not_contact';
    if (needsReason && formValue.trim().length < 10) {
      setErr('A reason of at least 10 characters is required.');
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const extras: Record<string, string> = {};
      if (formValue.trim()) {
        if (activeAction === 'mark_email_sent')         extras.email_subject  = formValue.trim();
        else if (activeAction === 'mark_closed_lost' ||
                 activeAction === 'mark_do_not_contact') extras.reason        = formValue.trim();
        else                                             extras.reply_summary = formValue.trim();
      }
      await onAction(entry.id, activeAction, extras);
      setResult(STATUS_LABEL[ACTION_STATUS_LABELS[activeAction] ?? entry.status] ?? 'Updated');
      setActiveAction(null);
      setFormValue('');
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function submitNote() {
    if (noteValue.trim().length === 0) return;
    setLoading(true);
    setErr(null);
    try {
      await onAction(entry.id, 'add_note', { note: noteValue.trim() });
      setNoteValue('');
      setShowNote(false);
      setResult('Note saved');
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  const border     = STATUS_BORDER[entry.status];
  const badgeClass = STATUS_BADGE[entry.status];

  return (
    <div className={`rounded-lg border ${border} bg-slate-900 px-4 py-3 space-y-2.5`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-slate-100 font-semibold text-sm">{entry.company_name}</p>
            {entry.is_do_not_contact && (
              <span className="text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-1.5 py-0.5 rounded">
                DO NOT CONTACT
              </span>
            )}
            {entry.is_followup_overdue && !entry.is_do_not_contact && (
              <span className="text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
                FOLLOW-UP OVERDUE
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {entry.observed_need !== '—' && entry.observed_need.split(' / ').map((tag) => (
              <Chip key={tag}>{tag}</Chip>
            ))}
          </div>
        </div>
        <span className={`shrink-0 inline-block px-2 py-0.5 rounded text-xs font-medium border ${badgeClass}`}>
          {STATUS_LABEL[entry.status]}
        </span>
      </div>

      {/* Contact info */}
      {(entry.contact_person || entry.contact_email || entry.phone) && (
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {entry.contact_person && (
            <span className="text-slate-400">{entry.contact_person}</span>
          )}
          {entry.contact_email && (
            <span className="font-mono text-slate-500">{entry.contact_email}</span>
          )}
          {entry.phone && (
            <span className="font-mono text-slate-500">{entry.phone}</span>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {entry.first_email_sent_at ? (
          <span>
            Email sent: <span className="text-slate-400 font-mono">{relativeTime(entry.first_email_sent_at)}</span>
            {entry.email_subject && <span className="text-slate-600"> — {entry.email_subject}</span>}
          </span>
        ) : (
          <span className="text-slate-700">No email sent yet</span>
        )}
        {entry.follow_up_due_at && (
          <span className={entry.is_followup_overdue ? 'text-amber-500' : 'text-slate-600'}>
            Follow-up: <span className="font-mono">{relativeTime(entry.follow_up_due_at)}</span>
          </span>
        )}
      </div>

      {/* Risk warnings */}
      {entry.risk_warnings.length > 0 && (
        <div className="rounded border border-red-800/50 bg-red-950/30 px-2.5 py-2">
          {entry.risk_warnings.map((w, i) => (
            <p key={i} className="text-xs text-red-400">{w}</p>
          ))}
        </div>
      )}

      {/* Reply / scope notes */}
      {entry.reply_summary && (
        <p className="text-xs text-slate-500 italic">Reply: {entry.reply_summary}</p>
      )}
      {entry.pilot_scope_notes && (
        <p className="text-xs text-slate-500 italic">Note: {entry.pilot_scope_notes}</p>
      )}

      {/* Success result */}
      {result && (
        <p className="text-xs text-emerald-400 font-medium">{result}</p>
      )}

      {/* Error */}
      {err && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded px-2 py-1">{err}</p>
      )}

      {/* Action buttons */}
      {!entry.is_do_not_contact && actions.length > 0 && !result && (
        <div className="flex flex-wrap gap-1.5">
          {actions.map((a) => (
            <button
              key={a.action}
              onClick={() => {
                setActiveAction(activeAction === a.action ? null : a.action);
                setFormValue('');
                setErr(null);
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeAction === a.action
                  ? 'ring-1 ring-white/20 opacity-80'
                  : actionButtonClass(a.style)
              } disabled:opacity-40`}
              disabled={loading}
            >
              {a.label}
            </button>
          ))}
          <button
            onClick={() => { setShowNote(!showNote); setErr(null); }}
            className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
            disabled={loading}
          >
            Add note
          </button>
        </div>
      )}

      {/* Action form (for actions that need input) */}
      {activeAction && !result && (
        <div className="rounded border border-slate-700 bg-slate-800/60 px-3 py-2.5 space-y-2">
          <label className="text-xs text-slate-400 block">
            {formLabel[activeAction] ?? 'Note (optional)'}
          </label>
          <textarea
            value={formValue}
            onChange={(e) => { setFormValue(e.target.value); setErr(null); }}
            rows={2}
            placeholder={activeAction === 'mark_email_sent' ? 'CE-chaufförer för distribution i Stockholm' : ''}
            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-700
                       resize-none focus:outline-none focus:border-slate-500"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={loading}
              className={`flex-1 py-1.5 rounded text-xs font-medium disabled:opacity-40 transition-colors ${actionButtonClass(
                CARD_ACTIONS[entry.status]?.find((a) => a.action === activeAction)?.style ?? 'slate',
              )}`}
            >
              {loading ? 'Saving…' : 'Confirm'}
            </button>
            <button
              onClick={() => { setActiveAction(null); setFormValue(''); setErr(null); }}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Note form */}
      {showNote && !result && (
        <div className="rounded border border-slate-700 bg-slate-800/60 px-3 py-2.5 space-y-2">
          <label className="text-xs text-slate-400 block">Note</label>
          <textarea
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            rows={2}
            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-slate-200 resize-none focus:outline-none focus:border-slate-500"
          />
          <div className="flex gap-2">
            <button
              onClick={submitNote}
              disabled={loading || noteValue.trim().length === 0}
              className="flex-1 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium disabled:opacity-40 transition-colors"
            >
              {loading ? 'Saving…' : 'Save note'}
            </button>
            <button
              onClick={() => { setShowNote(false); setNoteValue(''); }}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-500 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Maps action to the resulting status for display label in success message
const ACTION_STATUS_LABELS: Partial<Record<PilotUpdateAction, PilotRelationshipStatus>> = {
  mark_email_sent:           'contacted',
  mark_replied_interested:   'replied',
  mark_replied_not_now:      'nurture_later',
  mark_need_confirmed:       'needs_collected',
  mark_shortlist_preparing:  'shortlist_preparing',
  mark_shortlist_delivered:  'shortlist_delivered',
  mark_feedback_pending:     'feedback_pending',
  mark_pilot_completed:      'pilot_completed',
  mark_closed_lost:          'pilot_lost',
  mark_do_not_contact:       'do_not_contact',
};

function PilotOutreachSection({
  entries,
  onAction,
  loading,
}: {
  entries:  PilotOutreachEntry[];
  onAction: (id: string, action: PilotUpdateAction, extras: Record<string, string>) => Promise<void>;
  loading:  boolean;
}) {
  const active       = entries.filter((e) => !['pilot_lost', 'pilot_completed', 'do_not_contact', 'nurture_later'].includes(e.status));
  const terminal     = entries.filter((e) => ['pilot_completed', 'pilot_lost'].includes(e.status));
  const excluded     = entries.filter((e) => e.status === 'do_not_contact');
  const nurtureLater = entries.filter((e) => e.status === 'nurture_later');

  return (
    <section>
      <SectionHeader label="Pilot Outreach" count={active.length} />

      <div className="mb-3 rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-500">
        <span className="text-emerald-400 font-semibold">No emails are sent from this cockpit.</span>{' '}
        All outreach is performed manually outside the system. Status changes here are internal tracking only.
        AGENT_CONTACT_MODE = suggest. 46elks not configured.
      </div>

      {loading && entries.length === 0 && (
        <p className="text-sm text-slate-600">Loading pilot outreach data…</p>
      )}

      {!loading && entries.length === 0 && (
        <p className="text-sm text-slate-600">
          No pilot company relationships found. Seed <code className="text-slate-500">pilot_company_relationships</code> records to track outreach.
        </p>
      )}

      <div className="space-y-6">

        {/* Active pipeline */}
        {active.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Active pipeline ({active.length})
            </p>
            {active.map((e) => (
              <PilotCompanyCard key={e.id} entry={e} onAction={onAction} />
            ))}
          </div>
        )}

        {/* Nurture later */}
        {nurtureLater.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
              Nurture later ({nurtureLater.length})
            </p>
            {nurtureLater.map((e) => (
              <PilotCompanyCard key={e.id} entry={e} onAction={onAction} />
            ))}
          </div>
        )}

        {/* Excluded — do not contact */}
        {excluded.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-widest">
              Do not contact ({excluded.length})
            </p>
            {excluded.map((e) => (
              <PilotCompanyCard key={e.id} entry={e} onAction={onAction} />
            ))}
          </div>
        )}

        {/* Terminal */}
        {terminal.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest">
              Completed / closed ({terminal.length})
            </p>
            {terminal.map((e) => (
              <PilotCompanyCard key={e.id} entry={e} onAction={onAction} />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}

// ─── Section H: Zoho Outreach Queue ──────────────────────────────────────────

type OutreachQueueStatus = 'draft' | 'approved' | 'scheduled' | 'sent' | 'failed' | 'skipped' | 'replied';

interface OutreachQueueRow {
  id:                    string;
  company_name_snapshot: string;
  recipient_email:       string;
  recipient_name:        string | null;
  subject:               string;
  body:                  string | null;
  readiness_category:    string;
  status:                OutreachQueueStatus;
  send_mode:             string;
  provider_message_id:   string | null;
  scheduled_send_at:     string | null;
  sent_at:               string | null;
  reply_detected_at:     string | null;
  reply_classification:  string | null;
  approved_by_founder:   boolean;
  automation_used:       boolean;
  risk_notes:            string | null;
  created_at:            string;
}

function queueStatusColor(s: OutreachQueueStatus): string {
  switch (s) {
    case 'sent':      return 'text-emerald-400';
    case 'approved':  return 'text-blue-400';
    case 'scheduled': return 'text-cyan-400';
    case 'replied':   return 'text-purple-400';
    case 'failed':    return 'text-red-400';
    case 'skipped':   return 'text-slate-500';
    default:          return 'text-amber-400'; // draft
  }
}

function readinessChipColor(r: string): string {
  switch (r) {
    case 'READY':           return 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40';
    case 'THIN_BUT_USABLE': return 'bg-amber-900/40 text-amber-400 border-amber-700/40';
    case 'QUESTION_BASED':  return 'bg-blue-900/40 text-blue-400 border-blue-700/40';
    case 'SUPPLY_GAP':      return 'bg-red-900/40 text-red-400 border-red-700/40';
    default:                return 'bg-slate-800 text-slate-400 border-slate-700';
  }
}

function replyChipColor(r: string | null): string {
  if (!r) return '';
  switch (r) {
    case 'interested':
    case 'call_requested': return 'text-emerald-400';
    case 'not_now':        return 'text-amber-400';
    case 'not_interested': return 'text-red-400';
    case 'bounced':
    case 'wrong_contact':  return 'text-orange-400';
    default:               return 'text-slate-400';
  }
}

function itemHasMojibake(item: OutreachQueueRow): boolean {
  return hasMojibake(item.company_name_snapshot) || hasMojibake(item.subject) || hasMojibake(item.body);
}

function formatScheduledCEST(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit',
    hour:     '2-digit',
    minute:   '2-digit',
  }) + ' CEST';
}

function OutreachQueueSection({
  items,
  migrationRequired,
  onApprove,
  loading,
}: {
  items:             OutreachQueueRow[];
  migrationRequired: boolean;
  onApprove:         (id: string) => void;
  loading:           boolean;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleBody(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }
  const byStatus = (s: OutreachQueueStatus) => items.filter((i) => i.status === s);
  const drafts    = byStatus('draft');
  const approved  = byStatus('approved');
  const scheduled = byStatus('scheduled');
  const sent      = byStatus('sent');
  const failed    = byStatus('failed');
  const skipped   = byStatus('skipped');
  const replied   = byStatus('replied');

  const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000;
  const batchFollowupDue = sent.filter(
    (item) =>
      item.risk_notes?.startsWith('MANUAL_SMTP_BATCH_1') &&
      item.reply_detected_at === null &&
      item.scheduled_send_at !== null &&
      new Date(item.scheduled_send_at).getTime() <= threeDaysFromNow,
  );
  const pendingAction       = drafts.length + failed.length + batchFollowupDue.length;
  const mojibakeItems       = items.filter(itemHasMojibake);
  const hasMojibakeAnywhere = mojibakeItems.length > 0;

  if (migrationRequired) {
    return (
      <section>
        <SectionHeader label="Zoho Outreach Queue" warn />
        <div className="rounded-lg bg-slate-900 border border-amber-700/40 px-4 py-4">
          <p className="text-xs text-amber-400 font-semibold">Migration 017 not applied</p>
          <p className="text-xs text-slate-500 mt-1">
            Run <span className="font-mono text-slate-400">agent-1/docs/sql/APPLY_NOW_OUTREACH_EMAIL_QUEUE_MIGRATION.sql</span> in
            Supabase SQL Editor to enable the outreach queue.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader label="Zoho Outreach Queue" count={pendingAction} warn={pendingAction > 0} />

      {loading && (
        <p className="text-xs text-slate-500">Loading queue…</p>
      )}

      {/* DRY RUN safety banner — always visible */}
      <div className="rounded-lg bg-red-950/60 border border-red-700/50 px-4 py-3 mb-3">
        <p className="text-xs font-bold text-red-400 uppercase tracking-wide">DRY RUN — No email will be sent</p>
        <p className="text-xs text-red-300/70 mt-1">
          Approval marks a draft as reviewed. It does not send email.
          Zoho dispatch is not active. No automated sending is configured.
        </p>
      </div>

      {/* Mojibake global warning */}
      {hasMojibakeAnywhere && (
        <div className="rounded-lg bg-orange-950/60 border border-orange-700/50 px-4 py-3 mb-3">
          <p className="text-xs font-bold text-orange-400">Encoding warning — Swedish characters may be corrupted</p>
          <p className="text-xs text-orange-300/70 mt-1">
            {mojibakeItems.length} row{mojibakeItems.length > 1 ? 's' : ''} contain suspicious character sequences (Ã, Â).
            Apply <span className="font-mono">APPLY_NOW_FIX_OUTREACH_QUEUE_SWEDISH_ENCODING.sql</span> before approving any item.
            Do not approve corrupted rows.
          </p>
        </div>
      )}

      {/* Rate limit + mode badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs font-mono bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-400">
          Max 2 emails/hour · Working hours only
        </span>
        <span className="text-xs font-mono bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-400">
          Default: dry_run
        </span>
        <span className="text-xs font-mono bg-slate-800 border border-red-700/40 rounded px-2 py-1 text-red-400">
          No emails sent from cockpit — founder sends from Zoho
        </span>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-4">
        {([
          ['draft',    drafts.length,    'text-amber-400'],
          ['approved', approved.length,  'text-blue-400'],
          ['scheduled',scheduled.length, 'text-cyan-400'],
          ['sent',     sent.length,      'text-emerald-400'],
          ['replied',  replied.length,   'text-purple-400'],
          ['failed',   failed.length,    'text-red-400'],
          ['skipped',  skipped.length,   'text-slate-500'],
        ] as const).map(([label, count, color]) => (
          <div key={label} className="rounded bg-slate-900 border border-slate-800 px-2 py-2 text-center">
            <p className={`text-lg font-bold tabular-nums ${color}`}>{count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Drafts needing review */}
      {drafts.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-amber-400 mb-2">Drafts — read full body before approving</p>
          <div className="space-y-3">
            {drafts.map((item) => {
              const mojibake  = itemHasMojibake(item);
              const expanded  = expandedIds.has(item.id);
              const isDryRun  = item.send_mode === 'dry_run';
              return (
                <div
                  key={item.id}
                  className={`rounded-lg bg-slate-900 border px-3 py-3 ${mojibake ? 'border-orange-700/60' : 'border-slate-800'}`}
                >
                  {/* Row 1: company + approve button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{item.company_name_snapshot}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.subject}</p>
                    </div>
                    <button
                      onClick={() => onApprove(item.id)}
                      disabled={mojibake}
                      title={mojibake ? 'Fix encoding before approving' : 'Mark as approved (does not send email)'}
                      className={`shrink-0 text-xs px-3 py-1.5 rounded transition-colors ${
                        mojibake
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-blue-700 hover:bg-blue-600 text-white'
                      }`}
                    >
                      Approve draft
                    </button>
                  </div>

                  {/* Row 2: recipient */}
                  <p className="text-xs text-slate-500 mt-1">
                    {item.recipient_name ? `${item.recipient_name} · ` : ''}{item.recipient_email}
                  </p>

                  {/* Row 3: chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono border ${readinessChipColor(item.readiness_category)}`}>
                      {item.readiness_category}
                    </span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono border ${
                      isDryRun
                        ? 'bg-red-950/50 border-red-700/40 text-red-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      {item.send_mode}
                    </span>
                    {item.automation_used && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-mono bg-amber-900/40 border border-amber-700/40 text-amber-400">
                        automation_used
                      </span>
                    )}
                    {item.approved_by_founder && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-mono bg-blue-900/40 border border-blue-700/40 text-blue-400">
                        founder approved
                      </span>
                    )}
                  </div>

                  {/* Row 4: scheduled send */}
                  <p className="text-xs text-slate-600 mt-1">
                    Scheduled: <span className="text-slate-400">{formatScheduledCEST(item.scheduled_send_at)}</span>
                  </p>

                  {/* Row 5: risk notes */}
                  {item.risk_notes && (
                    <p className="text-xs text-amber-500 mt-1">⚠ {item.risk_notes}</p>
                  )}

                  {/* Row 6: mojibake warning */}
                  {mojibake && (
                    <p className="text-xs text-orange-400 font-semibold mt-1.5">
                      Encoding error detected — do not approve before running repair SQL
                    </p>
                  )}

                  {/* Row 7: expand/collapse body */}
                  <div className="mt-2">
                    <button
                      onClick={() => toggleBody(item.id)}
                      className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
                    >
                      {expanded ? 'Hide email body' : 'Read full email body'}
                    </button>
                    {expanded && item.body && (
                      <pre className="mt-2 text-xs text-slate-300 whitespace-pre-wrap font-sans bg-slate-950 border border-slate-800 rounded px-3 py-3 leading-relaxed overflow-auto max-h-96">
                        {item.body}
                      </pre>
                    )}
                    {expanded && !item.body && (
                      <p className="mt-2 text-xs text-slate-600 italic">Body not available.</p>
                    )}
                  </div>

                  {/* Safety note */}
                  <p className="text-xs text-slate-600 mt-2 italic">
                    Approval does not send email. Zoho dispatch is not active.
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approved — awaiting dispatch */}
      {approved.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-blue-400 mb-2">Approved — awaiting dispatch (no dispatch active)</p>
          <div className="space-y-2">
            {approved.map((item) => (
              <div key={item.id} className="rounded-lg bg-slate-900 border border-blue-900/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{item.company_name_snapshot}</p>
                    <p className="text-xs text-slate-500 truncate">{item.subject}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{item.recipient_email}</p>
                    <p className="text-xs text-slate-600">Scheduled: {formatScheduledCEST(item.scheduled_send_at)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-blue-400">approved</p>
                    <p className="text-xs text-slate-600 font-mono">{item.send_mode}</p>
                  </div>
                </div>
                {itemHasMojibake(item) && (
                  <p className="text-xs text-orange-400 mt-1">Encoding warning — repair before sending</p>
                )}
                {/* Expand body for approved items too */}
                <div className="mt-1.5">
                  <button
                    onClick={() => toggleBody(item.id)}
                    className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
                  >
                    {expandedIds.has(item.id) ? 'Hide email body' : 'View email body'}
                  </button>
                  {expandedIds.has(item.id) && item.body && (
                    <pre className="mt-2 text-xs text-slate-300 whitespace-pre-wrap font-sans bg-slate-950 border border-slate-800 rounded px-3 py-3 leading-relaxed overflow-auto max-h-96">
                      {item.body}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled / in-flight */}
      {scheduled.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-cyan-400 mb-2">Scheduled</p>
          <div className="space-y-1">
            {scheduled.map((item) => (
              <div key={item.id} className="rounded bg-slate-900 border border-slate-800 px-3 py-2 flex items-center justify-between gap-2">
                <p className="text-xs text-white">{item.company_name_snapshot}</p>
                <p className="text-xs text-cyan-400 font-mono">{formatScheduledCEST(item.scheduled_send_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent + replied */}
      {(sent.length > 0 || replied.length > 0) && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-emerald-400 mb-2">Sent / Replied</p>
          <div className="space-y-1.5">
            {[...sent, ...replied].map((item) => {
              const isBatch1 = item.risk_notes?.startsWith('MANUAL_SMTP_BATCH_1') ?? false;
              const followupDate = isBatch1 && item.scheduled_send_at ? new Date(item.scheduled_send_at) : null;
              const followupDue  = followupDate !== null && followupDate.getTime() <= Date.now() + 3 * 24 * 60 * 60 * 1000;
              return (
                <div
                  key={item.id}
                  className={`rounded-lg bg-slate-900 border px-3 py-2 ${followupDue ? 'border-amber-700/50' : 'border-slate-800'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-semibold text-white">{item.company_name_snapshot}</p>
                        {isBatch1 && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-mono bg-slate-800 border border-slate-700 text-slate-400">
                            Manual SMTP · Batch 1
                          </span>
                        )}
                        {followupDue && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-mono bg-amber-900/40 border border-amber-700/40 text-amber-400">
                            Follow-up due
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{item.subject}</p>
                      {item.sent_at && (
                        <p className="text-xs text-slate-600">
                          Sent {relativeTime(item.sent_at)}
                          {isBatch1 && ' via Zoho (manual)'}
                        </p>
                      )}
                      {followupDate && !item.reply_detected_at && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Follow-up window: {followupDate.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })} – 2026-06-04
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-semibold ${queueStatusColor(item.status)}`}>
                        {isBatch1 && !item.reply_detected_at ? 'waiting reply' : item.status}
                      </p>
                      {item.reply_classification && (
                        <p className={`text-xs font-mono ${replyChipColor(item.reply_classification)}`}>
                          {item.reply_classification}
                        </p>
                      )}
                      {item.reply_detected_at && (
                        <p className="text-xs text-slate-600">{relativeTime(item.reply_detected_at)}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failed */}
      {failed.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-red-400 mb-2">Failed — requires attention</p>
          <div className="space-y-1">
            {failed.map((item) => (
              <div key={item.id} className="rounded bg-slate-900 border border-red-900/40 px-3 py-2">
                <p className="text-xs text-white">{item.company_name_snapshot}</p>
                <p className="text-xs text-red-400 font-mono mt-0.5">{item.risk_notes ?? 'send error'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skipped / blocked */}
      {skipped.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Skipped / Blocked ({skipped.length})</p>
          <div className="space-y-1">
            {skipped.map((item) => (
              <div key={item.id} className="rounded bg-slate-900 border border-slate-800 px-3 py-1.5 flex items-center justify-between">
                <p className="text-xs text-slate-500">{item.company_name_snapshot}</p>
                <p className="text-xs text-red-400 font-mono truncate max-w-[60%]">{item.risk_notes ?? 'blocked'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && !loading && (
        <p className="text-xs text-slate-600 italic">No emails in queue. Generate from outreach agent or add via Supabase.</p>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GovernanceCockpitPage() {
  const router = useRouter();

  const [summary, setSummary]     = useState<CockpitSummaryPayload | null>(null);
  const [queue, setQueue]         = useState<ContactApprovalItem[]>([]);
  const [pilotEntries, setPilotEntries] = useState<PilotOutreachEntry[]>([]);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const [queueLoading, setQueueLoading]   = useState(true);
  const [pilotLoading, setPilotLoading]   = useState(true);
  const [lastRefresh, setLastRefresh]     = useState<Date | null>(null);
  const [refreshing, setRefreshing]       = useState(false);
  const [outreachQueue, setOutreachQueue] = useState<OutreachQueueRow[]>([]);
  const [outreachQueueLoading, setOutreachQueueLoading]                     = useState(true);
  const [outreachQueueMigrationRequired, setOutreachQueueMigrationRequired] = useState(false);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [sumRes, qRes, pilotRes, oeqRes] = await Promise.all([
        fetch('/api/admin/cockpit-summary'),
        fetch('/api/admin/contacts'),
        fetch('/api/admin/pilot-outreach'),
        fetch('/api/admin/outreach-queue'),
      ]);

      if (sumRes.status === 401 || qRes.status === 401 || pilotRes.status === 401 || oeqRes.status === 401) {
        router.push('/recruiter/login?next=/admin/cockpit');
        return;
      }

      if (sumRes.ok) {
        setSummary(await sumRes.json() as CockpitSummaryPayload);
        setSummaryErr(null);
      } else {
        setSummaryErr(`HTTP ${sumRes.status}`);
      }

      if (qRes.ok) {
        const qData = await qRes.json() as { queue: ContactApprovalItem[] };
        setQueue(qData.queue ?? []);
      }

      if (pilotRes.ok) {
        const pData = await pilotRes.json() as { entries: PilotOutreachEntry[] };
        setPilotEntries(pData.entries ?? []);
      }

      if (oeqRes.ok) {
        const oeqData = await oeqRes.json() as { items: OutreachQueueRow[]; migration_required: boolean };
        setOutreachQueue(oeqData.items ?? []);
        setOutreachQueueMigrationRequired(oeqData.migration_required ?? false);
      }

      setLastRefresh(new Date());
    } catch {
      setSummaryErr('network_error');
    } finally {
      setRefreshing(false);
      setQueueLoading(false);
      setPilotLoading(false);
      setOutreachQueueLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleOutreachApproval(needId: string, reason: string): Promise<void> {
    const res = await fetch(`/api/admin/needs/${needId}/approve-outreach`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
  }

  async function handlePilotAction(
    id: string,
    action: PilotUpdateAction,
    extras: Record<string, string>,
  ): Promise<void> {
    const res = await fetch(`/api/admin/pilot-outreach/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, ...extras }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error((body.message as string) ?? (body.error as string) ?? `HTTP ${res.status}`);
    }
    // Refresh pilot entries after a successful action
    const pilotRes = await fetch('/api/admin/pilot-outreach');
    if (pilotRes.ok) {
      const pData = await pilotRes.json() as { entries: PilotOutreachEntry[] };
      setPilotEntries(pData.entries ?? []);
    }
  }

  async function handleApproveOutreachItem(id: string): Promise<void> {
    const res = await fetch('/api/admin/outreach-queue', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, action: 'approve' }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    setOutreachQueue((q) => q.map((item) =>
      item.id === id
        ? { ...item, status: 'approved' as OutreachQueueStatus, approved_by_founder: true }
        : item,
    ));
  }

  async function handleContactAction(
    id: string,
    action: 'approve' | 'skip' | 'needs_review',
    force = false,
    forceReason?: string,
  ): Promise<void> {
    const res = await fetch(`/api/admin/contacts/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action,
        ...(force ? { force: true, force_reason: forceReason ?? '' } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    setQueue((q) => q.filter((item) => item.action_id !== id));
  }

  const totalBlocked = queue.filter((i) => i.has_quality_issue || i.has_duplicate).length;
  const systemStatus =
    !summary ? 'loading' :
    !summary.signals.sms_safe ? 'critical' :
    totalBlocked > 0          ? 'degraded' :
                                'operational';

  const statusStyles = {
    loading:     'bg-slate-800 text-slate-400 border-slate-700',
    operational: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    degraded:    'bg-amber-500/10 text-amber-400 border-amber-500/30',
    critical:    'bg-red-500/10 text-red-400 border-red-500/30',
  };
  const statusLabels = {
    loading:     'Loading',
    operational: 'Operational',
    degraded:    'Needs attention',
    critical:    'Critical',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-bold text-slate-100 tracking-tight">DriverNord</span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${statusStyles[systemStatus]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              systemStatus === 'operational' ? 'bg-emerald-500 animate-pulse' :
              systemStatus === 'degraded'    ? 'bg-amber-500' :
              systemStatus === 'critical'    ? 'bg-red-500' :
                                               'bg-slate-500'
            }`} />
            {statusLabels[systemStatus]}
          </span>
          <div className="ml-auto flex items-center gap-4 text-xs text-slate-600">
            {lastRefresh && (
              <span className="tabular-nums">
                {lastRefresh.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={fetchAll}
              disabled={refreshing}
              className="hover:text-slate-400 disabled:opacity-40 transition-colors"
            >
              Refresh
            </button>
            <a href="/recruiter" className="hover:text-slate-400 transition-colors">Recruiter cockpit</a>
            <a href="/admin/contacts" className="hover:text-slate-400 transition-colors">Full queue</a>
          </div>
        </div>
      </header>

      {/* ── Safety banner ──────────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-2">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs text-slate-500">
            <span className="text-emerald-400 font-semibold">SMS not active.</span>{' '}
            46elks not configured.{' '}
            <span className="text-amber-400 font-semibold">External contact blocked.</span>{' '}
            Approving a contact logs founder confirmation only — no message is sent.
            AGENT_CONTACT_MODE = suggest.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-10">

        {summaryErr && (
          <div className="rounded-lg bg-red-950/40 border border-red-800/50 px-4 py-3 text-sm text-red-400">
            Failed to load cockpit summary: {summaryErr}
          </div>
        )}

        {/* Section F: Agent Health */}
        {summary && <AgentHealthSection signals={summary.signals} />}

        {/* Section G: Founder Next Actions */}
        {summary && (
          <FounderActionsSection
            signals={summary.signals}
            needs={summary.active_needs}
          />
        )}

        {/* Section A */}
        {summary && <SignalsSection signals={summary.signals} />}

        {/* Section B */}
        {summary && (
          <ActiveNeedsSection
            needs={summary.active_needs}
            onApproveOutreach={handleOutreachApproval}
          />
        )}

        {/* Section C */}
        <ContactQueueSection
          queue={queue}
          onAction={handleContactAction}
          loading={queueLoading}
        />

        {/* Section D */}
        {summary && (
          <MarketSection
            market={summary.market}
            lastScanAt={summary.signals.last_daily_scan_at}
          />
        )}

        {/* Section E */}
        <PilotOutreachSection
          entries={pilotEntries}
          onAction={handlePilotAction}
          loading={pilotLoading}
        />

        {/* Section H: Zoho Outreach Queue */}
        <OutreachQueueSection
          items={outreachQueue}
          migrationRequired={outreachQueueMigrationRequired}
          onApprove={handleApproveOutreachItem}
          loading={outreachQueueLoading}
        />

        {/* Footer nav */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-600">
          <a href="/admin/contacts"                              className="hover:text-slate-400 transition-colors">Contact Approval Queue</a>
          <a href="/api/admin/operational-intelligence"          className="hover:text-slate-400 transition-colors">Full OI JSON</a>
          <a href="/api/admin/cockpit-summary"                   className="hover:text-slate-400 transition-colors">Cockpit Summary JSON</a>
          <a href="/api/admin/data-quality/scan"                 className="hover:text-slate-400 transition-colors">DQ Scan Endpoint</a>
        </div>
      </main>
    </div>
  );
}
