'use client';

import { useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactStatus = 'new' | 'contacted' | 'interested' | 'not_interested';

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
  shortlist_entry_id: string;
  driver: {
    id:              string;
    license:         string;
    ykb:             string;
    driverCard:      string;
    location:        { region: string; willingToRelocate: boolean | null };
    availability:    string;
    domain:          string | null;
    shiftPreference: string | null;
    contact:         { firstName: string; phone: string; email: string | null };
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

interface LoadedEntry {
  id:              string;
  rank:            number;
  match_score:     number;
  flags:           string[];
  summary:         string;
  contact_status:  ContactStatus;
  recruiter_note:  string | null;
  driver_snapshot: {
    firstName:       string;
    phone:           string;
    email:           string | null;
    license:         string;
    ykb:             string;
    driverCard:      string;
    region:          string;
    availability:    string;
    domain:          string | null;
    shiftPreference: string | null;
  };
}

interface LoadedShortlist {
  id:                string;
  company_need_id:   string;
  total_candidates:  number;
  total_shortlisted: number;
  summary:           string;
  entries:           LoadedEntry[];
}

interface ContactState { status: ContactStatus; note: string }
type ContactMap = Record<string, ContactState>;

// ─── Error messages ───────────────────────────────────────────────────────────

const API_ERROR_MESSAGES: Record<string, string> = {
  fetch_failed:        'Unable to reach the database. Check that Supabase is connected and all migrations have been applied.',
  db_not_configured:   'Database credentials are missing. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to environment variables.',
  auth_not_configured: 'Server is missing RECRUITER_API_KEY. Add it to environment variables.',
  unauthorized:        'Invalid recruiter API key.',
  supabase_error:      'A database error occurred. Check Supabase logs for details.',
  need_not_found:      'The selected company need was not found.',
  not_found:           'Not found.',
};

function apiError(code: string, detail?: string): string {
  const base = API_ERROR_MESSAGES[code] ?? `Server error: ${code}`;
  return detail ? `${base} (${detail})` : base;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecruiterPage() {
  const [needs, setNeeds]               = useState<NeedRow[]>([]);
  const [loadingNeeds, setLoadingNeeds] = useState(true);
  const [needsError, setNeedsError]     = useState<string | null>(null);

  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [matching, setMatching]           = useState(false);
  const [matchResult, setMatchResult]     = useState<MatchResult | null>(null);
  const [matchError, setMatchError]       = useState<string | null>(null);
  const [contactMap, setContactMap]       = useState<ContactMap>({});

  const [loadInput, setLoadInput]               = useState('');
  const [loadingShortlist, setLoadingShortlist] = useState(false);
  const [loadedShortlist, setLoadedShortlist]   = useState<LoadedShortlist | null>(null);
  const [loadError, setLoadError]               = useState<string | null>(null);
  const [loadedContactMap, setLoadedContactMap] = useState<ContactMap>({});

  // TODO: replace NEXT_PUBLIC key with session-based auth before production use
  const recruiterKey = process.env.NEXT_PUBLIC_RECRUITER_API_KEY ?? '';

  useEffect(() => {
    fetch('/api/company-needs', {
      headers: { 'X-Recruiter-Key': recruiterKey },
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        const typed = data as { needs?: NeedRow[]; error?: string; detail?: string };
        if (typed.error) {
          setNeedsError(apiError(typed.error, typed.detail));
        } else {
          setNeeds(Array.isArray(typed.needs) ? typed.needs : []);
        }
        setLoadingNeeds(false);
      })
      .catch(() => {
        setNeedsError('Could not reach the server. Check your network connection.');
        setLoadingNeeds(false);
      });
  }, [recruiterKey]);

  function selectNeed(id: string) {
    setSelectedId(id);
    setMatchResult(null);
    setMatchError(null);
    setContactMap({});
  }

  async function runMatch() {
    if (!selectedId) return;
    setMatching(true);
    setMatchResult(null);
    setMatchError(null);
    setContactMap({});

    try {
      const res = await fetch('/api/recruiter/match', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Recruiter-Key': recruiterKey },
        body:    JSON.stringify({ need_id: selectedId }),
      });
      const data = await res.json() as MatchResult & { error?: string; detail?: string };
      if (!res.ok) {
        setMatchError(apiError(data.error ?? 'supabase_error', data.detail));
      } else {
        setMatchResult(data);
        const initial: ContactMap = {};
        for (const entry of data.shortlisted) {
          initial[entry.shortlist_entry_id] = { status: 'new', note: '' };
        }
        setContactMap(initial);
      }
    } catch {
      setMatchError('Network error');
    } finally {
      setMatching(false);
    }
  }

  async function loadShortlist() {
    const id = loadInput.trim();
    if (!id) return;
    setLoadingShortlist(true);
    setLoadedShortlist(null);
    setLoadError(null);
    setLoadedContactMap({});

    try {
      const res = await fetch(`/api/recruiter/shortlists/${id}`, {
        headers: { 'X-Recruiter-Key': recruiterKey },
      });
      const data = await res.json() as LoadedShortlist & { error?: string; detail?: string };
      if (!res.ok) {
        setLoadError(apiError(data.error ?? 'supabase_error', data.detail));
      } else {
        setLoadedShortlist(data);
        const initial: ContactMap = {};
        for (const e of data.entries) {
          initial[e.id] = { status: e.contact_status, note: e.recruiter_note ?? '' };
        }
        setLoadedContactMap(initial);
      }
    } catch {
      setLoadError('Network error');
    } finally {
      setLoadingShortlist(false);
    }
  }

  function handleStatusChange(entryId: string, status: ContactStatus, isLoaded: boolean) {
    if (isLoaded) {
      setLoadedContactMap((prev) => ({ ...prev, [entryId]: { ...prev[entryId], status } }));
    } else {
      setContactMap((prev) => ({ ...prev, [entryId]: { ...prev[entryId], status } }));
    }
    fetch(`/api/recruiter/shortlist-entries/${entryId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Recruiter-Key': recruiterKey },
      body:    JSON.stringify({ contact_status: status }),
    }).catch(console.error);
  }

  function handleNoteChange(entryId: string, note: string, isLoaded: boolean) {
    if (isLoaded) {
      setLoadedContactMap((prev) => ({ ...prev, [entryId]: { ...prev[entryId], note } }));
    } else {
      setContactMap((prev) => ({ ...prev, [entryId]: { ...prev[entryId], note } }));
    }
  }

  function handleNoteSave(entryId: string, note: string) {
    fetch(`/api/recruiter/shortlist-entries/${entryId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Recruiter-Key': recruiterKey },
      body:    JSON.stringify({ recruiter_note: note }),
    }).catch(console.error);
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
                {matchResult.shortlisted.map((entry, i) => {
                  const cs = contactMap[entry.shortlist_entry_id] ?? { status: 'new' as ContactStatus, note: '' };
                  return (
                    <DriverCard
                      key={entry.driver.id}
                      rank={i + 1}
                      entry={entry}
                      contactStatus={cs.status}
                      note={cs.note}
                      onStatusChange={(s) => handleStatusChange(entry.shortlist_entry_id, s, false)}
                      onNoteChange={(n) => handleNoteChange(entry.shortlist_entry_id, n, false)}
                      onNoteSave={() => handleNoteSave(entry.shortlist_entry_id, cs.note)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Load Previous Shortlist ──────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Load Previous Shortlist
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={loadInput}
              onChange={(e) => setLoadInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadShortlist(); }}
              placeholder="Shortlist ID…"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={loadShortlist}
              disabled={loadingShortlist || !loadInput.trim()}
              className="px-4 py-2 rounded-md bg-gray-700 text-white text-sm font-medium
                         hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              {loadingShortlist ? 'Loading…' : 'Load'}
            </button>
          </div>
          {loadError && <p className="mt-2 text-sm text-red-500">{loadError}</p>}
        </section>

        {/* ── Loaded Shortlist ─────────────────────────────────────────────── */}
        {loadedShortlist && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Shortlist {loadedShortlist.id.slice(0, 8)}…
            </h2>

            <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-gray-400">Need ID </span>
                <span className="font-mono text-xs text-gray-700">
                  {loadedShortlist.company_need_id.slice(0, 8)}…
                </span>
              </div>
              <div>
                <span className="text-gray-400">Shortlisted </span>
                <span className="font-semibold text-gray-900">
                  {loadedShortlist.total_shortlisted}/{loadedShortlist.total_candidates}
                </span>
              </div>
              <div className="text-gray-500 italic">{loadedShortlist.summary}</div>
            </div>

            <div className="space-y-3">
              {loadedShortlist.entries.map((entry) => {
                const cs = loadedContactMap[entry.id] ?? {
                  status: entry.contact_status,
                  note:   entry.recruiter_note ?? '',
                };
                return (
                  <LoadedEntryCard
                    key={entry.id}
                    entry={entry}
                    contactStatus={cs.status}
                    note={cs.note}
                    onStatusChange={(s) => handleStatusChange(entry.id, s, true)}
                    onNoteChange={(n) => handleNoteChange(entry.id, n, true)}
                    onNoteSave={() => handleNoteSave(entry.id, cs.note)}
                  />
                );
              })}
            </div>
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
      v === 'emergency' ? 'bg-red-100 text-red-700'     :
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

const STATUS_LABELS: Record<ContactStatus, string> = {
  new:            'New',
  contacted:      'Contacted',
  interested:     'Interested',
  not_interested: 'Not interested',
};

const STATUS_ACTIVE_CLASS: Record<ContactStatus, string> = {
  new:            'bg-gray-100 text-gray-600',
  contacted:      'bg-blue-100 text-blue-700',
  interested:     'bg-green-100 text-green-700',
  not_interested: 'bg-red-100 text-red-700',
};

function ContactPanel({
  contactStatus,
  note,
  onStatusChange,
  onNoteChange,
  onNoteSave,
}: {
  contactStatus:  ContactStatus;
  note:           string;
  onStatusChange: (s: ContactStatus) => void;
  onNoteChange:   (n: string) => void;
  onNoteSave:     () => void;
}) {
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(Object.keys(STATUS_LABELS) as ContactStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              contactStatus === s
                ? `${STATUS_ACTIVE_CLASS[s]} ring-1 ring-inset ring-current`
                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Recruiter note…"
          rows={2}
          className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm text-gray-700
                     resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          onClick={onNoteSave}
          className="self-end px-3 py-1 rounded bg-gray-100 text-xs font-medium text-gray-600
                     hover:bg-gray-200 transition-colors whitespace-nowrap"
        >
          Save note
        </button>
      </div>
    </>
  );
}

function DriverCard({
  rank,
  entry,
  contactStatus,
  note,
  onStatusChange,
  onNoteChange,
  onNoteSave,
}: {
  rank:           number;
  entry:          MatchEntry;
  contactStatus:  ContactStatus;
  note:           string;
  onStatusChange: (s: ContactStatus) => void;
  onNoteChange:   (n: string) => void;
  onNoteSave:     () => void;
}) {
  const { driver, score } = entry;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
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

      <div className="mt-3 grid grid-cols-3 sm:grid-cols-7 gap-2">
        <Pill label="License"      value={driver.license} />
        <Pill label="YKB"          value={driver.ykb} />
        <Pill label="Driver card"  value={driver.driverCard} />
        <Pill label="Region"       value={driver.location.region} />
        <Pill label="Availability" value={driver.availability} />
        <Pill label="Domain"       value={driver.domain ?? '—'} />
        <Pill label="Shift"        value={driver.shiftPreference ?? '—'} />
      </div>

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

      <p className="mt-3 text-sm text-gray-500 italic">{score.summary}</p>

      <ContactPanel
        contactStatus={contactStatus}
        note={note}
        onStatusChange={onStatusChange}
        onNoteChange={onNoteChange}
        onNoteSave={onNoteSave}
      />
    </div>
  );
}

function LoadedEntryCard({
  entry,
  contactStatus,
  note,
  onStatusChange,
  onNoteChange,
  onNoteSave,
}: {
  entry:          LoadedEntry;
  contactStatus:  ContactStatus;
  note:           string;
  onStatusChange: (s: ContactStatus) => void;
  onNoteChange:   (n: string) => void;
  onNoteSave:     () => void;
}) {
  const snap = entry.driver_snapshot;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-500 text-white
                           text-xs font-bold flex items-center justify-center">
            {entry.rank}
          </span>
          <div>
            <p className="font-semibold text-gray-900">{snap.firstName}</p>
            <p className="text-sm text-gray-500">{snap.phone}</p>
            {snap.email && (
              <p className="text-xs text-gray-400">{snap.email}</p>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-gray-500">{entry.match_score}</p>
          <p className="text-xs text-gray-400">match score</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 sm:grid-cols-7 gap-2">
        <Pill label="License"      value={snap.license} />
        <Pill label="YKB"          value={snap.ykb} />
        <Pill label="Driver card"  value={snap.driverCard} />
        <Pill label="Region"       value={snap.region} />
        <Pill label="Availability" value={snap.availability} />
        <Pill label="Domain"       value={snap.domain ?? '—'} />
        <Pill label="Shift"        value={snap.shiftPreference ?? '—'} />
      </div>

      {entry.flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {entry.flags.map((flag) => (
            <span key={flag}
              className="rounded bg-amber-100 text-amber-700 text-xs px-2 py-0.5 font-medium">
              {flag}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-sm text-gray-500 italic">{entry.summary}</p>

      <ContactPanel
        contactStatus={contactStatus}
        note={note}
        onStatusChange={onStatusChange}
        onNoteChange={onNoteChange}
        onNoteSave={onNoteSave}
      />
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
