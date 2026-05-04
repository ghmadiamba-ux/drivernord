'use client';

import { useState, useEffect } from 'react';

// ─── API response types ───────────────────────────────────────────────────────

interface NeedRow {
  id:                 string;
  company_id:         string;
  license_required:   string;
  domain_required:    string;
  domain_preferred:   string[];
  location_region:    string;
  relocation_allowed: boolean;
  shift_type:         string;
  urgency:            string;
  status:             string;
}

interface MatchEntry {
  driver: {
    id:             string;
    license:        string;
    ykb:            string;
    driverCard:     string;
    location:       { region: string; willingToRelocate: boolean | null };
    availability:   string;
    domain:         string | null;
    shiftPreference: string | null;
    contact:        { firstName: string; phone: string; email: string | null };
  };
  score: {
    total:   number;
    flags:   string[];
    summary: string;
  };
}

interface MatchResult {
  shortlist_id:     string;
  shortlisted:      MatchEntry[];
  rejected:         Array<{ driverId: string; reason: string }>;
  totalCandidates:  number;
  totalShortlisted: number;
  summary:          string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecruiterPage() {
  const [needs, setNeeds]           = useState<NeedRow[]>([]);
  const [loadingNeeds, setLoadingNeeds] = useState(true);
  const [needsError, setNeedsError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matching, setMatching]     = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/company-needs')
      .then((r) => r.json())
      .then((data: unknown) => {
        const typed = data as { needs?: NeedRow[]; error?: string };
        if (typed.error) {
          setNeedsError(typed.error);
        } else {
          setNeeds(Array.isArray(typed.needs) ? typed.needs : []);
        }
        setLoadingNeeds(false);
      })
      .catch(() => {
        setNeedsError('Failed to load company needs');
        setLoadingNeeds(false);
      });
  }, []);

  function selectNeed(id: string) {
    setSelectedId(id);
    setMatchResult(null);
    setMatchError(null);
  }

  async function runMatch() {
    if (!selectedId) return;
    setMatching(true);
    setMatchResult(null);
    setMatchError(null);

    try {
      const res = await fetch('/api/recruiter/match', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ need_id: selectedId }),
      });
      const data = await res.json() as MatchResult & { error?: string };
      if (!res.ok) {
        setMatchError(data.error ?? 'Match failed');
      } else {
        setMatchResult(data);
      }
    } catch {
      setMatchError('Network error');
    } finally {
      setMatching(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Recruiter Dashboard</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ── Open Company Needs ───────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Open Company Needs
          </h2>

          {loadingNeeds && <p className="text-sm text-gray-400">Loading…</p>}
          {needsError   && <p className="text-sm text-red-500">{needsError}</p>}
          {!loadingNeeds && !needsError && needs.length === 0 && (
            <p className="text-sm text-gray-400">No open company needs found.</p>
          )}

          <div className="space-y-2">
            {needs.map((need) => (
              <button
                key={need.id}
                onClick={() => selectNeed(need.id)}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                  selectedId === need.id
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <span className="font-mono text-xs text-gray-400">{need.id.slice(0, 8)}…</span>
                  <KV k="License"  v={need.license_required} />
                  <KV k="Domain"   v={need.domain_required} />
                  <KV k="Region"   v={need.location_region} />
                  <KV k="Shift"    v={need.shift_type} />
                  <KV k="Urgency"  v={need.urgency} urgency />
                  <KV k="Status"   v={need.status} />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Run Match button ─────────────────────────────────────────────── */}
        {selectedId && (
          <div className="flex items-center gap-4">
            <button
              onClick={runMatch}
              disabled={matching}
              className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              {matching ? 'Matching…' : 'Run Match'}
            </button>
            <span className="text-xs text-gray-400 font-mono">{selectedId}</span>
          </div>
        )}

        {matchError && (
          <p className="text-sm text-red-500">Error: {matchError}</p>
        )}

        {/* ── Match Results ────────────────────────────────────────────────── */}
        {matchResult && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Match Results
            </h2>

            {/* Summary row */}
            <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-gray-400">Shortlist ID </span>
                <span className="font-mono text-xs text-gray-700">{matchResult.shortlist_id}</span>
              </div>
              <div>
                <span className="text-gray-400">Shortlisted </span>
                <span className="font-semibold text-gray-900">
                  {matchResult.totalShortlisted}/{matchResult.totalCandidates}
                </span>
              </div>
              <div className="text-gray-500 italic">{matchResult.summary}</div>
            </div>

            {matchResult.shortlisted.length === 0 ? (
              <p className="text-sm text-gray-400">
                No drivers passed the hard filters for this need.
              </p>
            ) : (
              <div className="space-y-3">
                {matchResult.shortlisted.map((entry, i) => (
                  <DriverCard key={entry.driver.id} rank={i + 1} entry={entry} />
                ))}
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KV({ k, v, urgency }: { k: string; v: string; urgency?: boolean }) {
  const valueEl = urgency ? (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
      v === 'emergency' ? 'bg-red-100 text-red-700'   :
      v === 'urgent'    ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
    }`}>{v}</span>
  ) : (
    <span className="font-medium text-gray-800">{v}</span>
  );

  return (
    <span>
      <span className="text-gray-400">{k}: </span>
      {valueEl}
    </span>
  );
}

function DriverCard({ rank, entry }: { rank: number; entry: MatchEntry }) {
  const { driver, score } = entry;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white
                           text-xs font-bold flex items-center justify-center">
            {rank}
          </span>
          <div>
            <p className="font-semibold text-gray-900">{driver.contact.firstName}</p>
            <p className="text-sm text-gray-500">{driver.contact.phone}</p>
            {driver.contact.email && (
              <p className="text-xs text-gray-400">{driver.contact.email}</p>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-blue-600">{score.total}</p>
          <p className="text-xs text-gray-400">match score</p>
        </div>
      </div>

      {/* Credential pills */}
      <div className="mt-3 grid grid-cols-3 sm:grid-cols-7 gap-2">
        <Pill label="License"      value={driver.license} />
        <Pill label="YKB"          value={driver.ykb} />
        <Pill label="Driver card"  value={driver.driverCard} />
        <Pill label="Region"       value={driver.location.region} />
        <Pill label="Availability" value={driver.availability} />
        <Pill label="Domain"       value={driver.domain ?? '—'} />
        <Pill label="Shift"        value={driver.shiftPreference ?? '—'} />
      </div>

      {/* Flags */}
      {score.flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {score.flags.map((flag) => (
            <span key={flag}
              className="rounded bg-amber-100 text-amber-700 text-xs px-2 py-0.5 font-medium">
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Score summary */}
      <p className="mt-3 text-sm text-gray-500 italic">{score.summary}</p>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-gray-50 border border-gray-100 px-2 py-1.5">
      <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800 leading-tight">{value}</p>
    </div>
  );
}
