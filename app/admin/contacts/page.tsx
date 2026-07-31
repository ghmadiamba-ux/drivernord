'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactApprovalItem {
  action_id:       string;
  created_at:      string;
  driver_id:       string;
  match_score:     number;
  first_name:      string;
  phone:           string;
  message:         string;
  company_name:    string;
  urgency:         string;
  company_need_id: string;
  shortlist_id:    string;
  license:         string | null;
  ykb:             string | null;
  region:          string | null;
  availability:    string | null;
  domain:          string | null;
  email:           string | null;
  has_quality_issue: boolean;
  has_duplicate:     boolean;
}

type ActionState = 'idle' | 'loading' | 'done' | 'error' | 'blocked';

function governanceLabel(hasQuality: boolean, hasDuplicate: boolean): { label: string; color: string } {
  if (hasQuality && hasDuplicate) return { label: 'Blocked: DQ + duplicate',    color: 'text-red-400' };
  if (hasQuality)                  return { label: 'Blocked: data quality',      color: 'text-yellow-400' };
  if (hasDuplicate)                return { label: 'Blocked: duplicate phone',   color: 'text-orange-400' };
  return                                  { label: 'Clean / Review-ready',       color: 'text-emerald-400' };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-yellow-400';
  return 'text-slate-400';
}

function urgencyColor(urgency: string): string {
  if (urgency === 'emergency') return 'text-red-400';
  if (urgency === 'urgent')    return 'text-orange-400';
  return 'text-slate-400';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono ${color}`}>
      {children}
    </span>
  );
}

function ContactCard({
  item,
  onAction,
}: {
  item: ContactApprovalItem;
  onAction: (id: string, action: 'approve' | 'skip' | 'needs_review', force?: boolean, forceReason?: string) => Promise<void>;
}) {
  const [state, setState]             = useState<ActionState>('idle');
  const [outcome, setOutcome]         = useState<string | null>(null);
  const [blockDetail, setBlockDetail] = useState<{ warning: string } | null>(null);
  const [forceReason, setForceReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  async function act(action: 'approve' | 'skip' | 'needs_review', force = false) {
    if (force) {
      if (forceReason.trim().length < 10) {
        setReasonError('Provide a reason of at least 10 characters before force-approving.');
        return;
      }
      setReasonError(null);
    }
    setState('loading');
    try {
      await onAction(item.action_id, action, force, force ? forceReason : undefined);
      setOutcome(action);
      setState('done');
    } catch (e) {
      const msg = String(e);
      if (msg.includes('blocked_data_quality') || msg.includes('422')) {
        setBlockDetail({ warning: 'Governance block: this driver has a data quality or duplicate flag. Verify identity manually before force-approving.' });
        setState('blocked');
      } else {
        setState('error');
      }
    }
  }

  if (state === 'done') {
    const label =
      outcome === 'approve'      ? 'Approved — contact logged, SMS pending 46elks activation' :
      outcome === 'skip'         ? 'Skipped — action cancelled' :
                                   'Flagged for review';
    const color =
      outcome === 'approve'      ? 'text-emerald-400' :
      outcome === 'skip'         ? 'text-slate-500'   :
                                   'text-yellow-400';
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <p className={`text-sm font-medium ${color}`}>{label}</p>
        <p className="text-xs text-slate-600 mt-1">{item.first_name} · {item.phone}</p>
      </div>
    );
  }

  const govStatus = governanceLabel(item.has_quality_issue, item.has_duplicate);
  const borderColor = item.has_quality_issue && item.has_duplicate ? 'border-red-800'
    : item.has_quality_issue ? 'border-yellow-800'
    : item.has_duplicate    ? 'border-orange-800'
    : 'border-slate-800';

  return (
    <div className={`rounded-lg border ${borderColor} bg-slate-900 p-4 space-y-3`}>

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-slate-100 font-semibold text-sm truncate">
            {item.first_name}
          </p>
          <p className="text-slate-500 text-xs font-mono">{item.phone}</p>
          {item.email && (
            <p className="text-slate-600 text-xs font-mono">{item.email}</p>
          )}
          <p className={`text-xs font-semibold mt-0.5 ${govStatus.color}`}>{govStatus.label}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-bold font-mono ${scoreColor(item.match_score)}`}>
            {item.match_score}
          </p>
          <p className="text-slate-600 text-xs">score</p>
        </div>
      </div>

      {/* Driver details */}
      <div className="flex flex-wrap gap-1.5">
        {item.license    && <Badge color="text-slate-300 bg-slate-800">{item.license}</Badge>}
        {item.ykb        && <Badge color="text-slate-300 bg-slate-800">YKB: {item.ykb}</Badge>}
        {item.region     && <Badge color="text-slate-400 bg-slate-800">{item.region}</Badge>}
        {item.availability && <Badge color="text-slate-400 bg-slate-800">{item.availability}</Badge>}
        {item.domain     && <Badge color="text-slate-400 bg-slate-800">{item.domain}</Badge>}
      </div>

      {/* Company info */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">Company:</span>
        <span className="text-slate-300">{item.company_name || '—'}</span>
        <span className={`ml-auto ${urgencyColor(item.urgency)}`}>{item.urgency}</span>
      </div>

      {/* Message preview */}
      <div className="rounded bg-slate-800 px-3 py-2">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">SMS preview</p>
        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
          {item.message || '(no message)'}
        </pre>
      </div>

      {/* Warnings */}
      {item.has_quality_issue && (
        <p className="text-xs text-yellow-500 bg-yellow-950 border border-yellow-800 rounded px-2 py-1">
          Data quality issue — name may be a phone number. Verify before approving.
        </p>
      )}
      {item.has_duplicate && (
        <p className="text-xs text-orange-400 bg-orange-950 border border-orange-800 rounded px-2 py-1">
          Duplicate registration detected for this phone number.
        </p>
      )}

      {/* Timestamp */}
      <p className="text-xs text-slate-600">{formatDate(item.created_at)}</p>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => act('approve')}
          disabled={state === 'loading'}
          className="flex-1 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100
                     text-sm font-medium disabled:opacity-40 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => act('needs_review')}
          disabled={state === 'loading'}
          className="flex-1 py-1.5 rounded bg-yellow-900 hover:bg-yellow-800 text-yellow-100
                     text-sm font-medium disabled:opacity-40 transition-colors"
        >
          Review
        </button>
        <button
          onClick={() => act('skip')}
          disabled={state === 'loading'}
          className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400
                     text-sm font-medium disabled:opacity-40 transition-colors"
        >
          Skip
        </button>
      </div>

      {state === 'blocked' && blockDetail && (
        <div className="rounded border border-red-800/50 bg-red-950/30 px-3 py-2 space-y-2">
          <p className="text-xs text-red-400">{blockDetail.warning}</p>
          <div className="space-y-1.5">
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
          <div className="flex gap-2">
            <button
              onClick={() => act('approve', true)}
              className="flex-1 py-1.5 rounded border border-red-700/50 text-red-400 text-xs font-semibold
                         hover:bg-red-900/30 transition-colors"
            >
              Force approve (identity verified)
            </button>
            <button
              onClick={() => setState('idle')}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <p className="text-xs text-red-400">Action failed. Try again.</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const router = useRouter();
  const [queue, setQueue]       = useState<ContactApprovalItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/contacts');
      if (res.status === 401) {
        router.push('/recruiter/login?next=/admin/contacts');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setQueue(data.queue ?? []);
      setLastRefresh(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(
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
      throw new Error(`${body.error ?? `HTTP ${res.status}`}:${res.status}`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Contact Approval</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Approve before SMS automation goes live. No messages are sent here.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Safety banner */}
        <div className="mb-6 rounded border border-slate-700 bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold">SMS is not active.</span>{' '}
            Approving a contact logs it as confirmed but does not send any message.
            46elks activation is a separate step.
          </p>
        </div>

        {/* State */}
        {loading && (
          <p className="text-slate-500 text-sm">Loading queue…</p>
        )}

        {error && !loading && (
          <div className="rounded border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && queue.length === 0 && (
          <div className="rounded border border-slate-800 bg-slate-900 px-4 py-6 text-center">
            <p className="text-slate-400 text-sm">No pending contact suggestions.</p>
            <p className="text-slate-600 text-xs mt-1">
              Run a match cycle or check back after the next campaign wave.
            </p>
          </div>
        )}

        {!loading && !error && queue.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              {queue.length} pending · last loaded {lastRefresh?.toLocaleTimeString('sv-SE') ?? '—'}
              {queue.filter((i) => i.has_quality_issue || i.has_duplicate).length > 0 && (
                <span className="ml-2 text-amber-500">
                  · {queue.filter((i) => i.has_quality_issue || i.has_duplicate).length} flagged
                </span>
              )}
            </p>
            {/* Clean candidates first */}
            {queue.filter((i) => !i.has_quality_issue && !i.has_duplicate).length > 0 && (
              <>
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-widest">Clean</p>
                {queue.filter((i) => !i.has_quality_issue && !i.has_duplicate).map((item) => (
                  <ContactCard key={item.action_id} item={item} onAction={handleAction} />
                ))}
              </>
            )}
            {/* Flagged candidates */}
            {queue.filter((i) => i.has_quality_issue || i.has_duplicate).length > 0 && (
              <>
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-widest pt-2">
                  Flagged — verify before approving
                </p>
                {queue.filter((i) => i.has_quality_issue || i.has_duplicate).map((item) => (
                  <ContactCard key={item.action_id} item={item} onAction={handleAction} />
                ))}
              </>
            )}
          </div>
        )}

        {/* Nav */}
        <div className="mt-10 flex gap-4 text-xs text-slate-600">
          <a href="/admin/cockpit" className="hover:text-slate-400 transition-colors">← Governance Cockpit</a>
          <a href="/recruiter" className="hover:text-slate-400 transition-colors">Recruiter cockpit</a>
          <a href="/api/admin/operational-intelligence" className="hover:text-slate-400 transition-colors">Operational intelligence</a>
        </div>
      </div>
    </div>
  );
}
