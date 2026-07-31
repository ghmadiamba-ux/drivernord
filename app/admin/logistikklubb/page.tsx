'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FiveDaySequence, DraftPost, PostCategory } from '@/lib/logistikklubbAgent';
import type { ScheduledPost, PostStatus } from '@/lib/logistikklubbSchedule';

// ─── Static quick-drafts (V0 originals) ──────────────────────────────────────

const QUICK_DRAFTS = [
  {
    id: 'god-morgon',
    category: 'God morgon Logistikklubben',
    label: 'Morgonhälsning',
    color: 'bg-blue-50 border-blue-200',
    labelColor: 'text-blue-700',
    text: `God morgon Logistikklubben! 🚛

Hoppas det rullar på smidigt därute idag. Hur ser det ut på vägarna — köer, väderproblem eller något annat värt att veta?

Kör försiktigt och ha en bra dag alla!`,
  },
  {
    id: 'dagens-fraga',
    category: 'Dagens fråga',
    label: 'Diskussion',
    color: 'bg-amber-50 border-amber-200',
    labelColor: 'text-amber-700',
    text: `Dagens fråga till er som kör CE:

Vad föredrar ni — fjärrtransport (lång körning, färre stopp) eller stads- och regiondistribution (mer variation, kortare körningar)?

Kommentera nedan 👇 Nyfiken att höra från er som kör aktivt just nu.`,
  },
  {
    id: 'marknadssignal',
    category: 'Marknadssignal',
    label: 'Marknad',
    color: 'bg-green-50 border-green-200',
    labelColor: 'text-green-700',
    text: `Marknadssignal 📊

Vi ser ökad efterfrågan på CE-förare i Stockholmsregionen just nu. Flera åkerier söker aktivt och behöver förstärkning inför [SÄSONG/PERIOD].

Känner du eller din kollega till att någon är öppen för nytt jobb? Det kan vara rätt timing.

(DriverNord-registrering tar 3 minuter — gratis för förare: drivernord.com/chaufforer)`,
  },
  {
    id: 'trafikkoll',
    category: 'Trafikkoll',
    label: 'Trafik',
    color: 'bg-orange-50 border-orange-200',
    labelColor: 'text-orange-700',
    text: `Trafikkoll! 🚦

Kör någon av er på E4, E18 eller Essingeleden just nu? Hur är läget — köer, olyckor eller vägarbeten?

Dela med er — vi hjälper varandra att köra smartare idag. 🗺️`,
  },
  {
    id: 'veckans-tips',
    category: 'Veckans tips',
    label: 'Tips',
    color: 'bg-purple-50 border-purple-200',
    labelColor: 'text-purple-700',
    text: `Veckans tips — YKB ⚠️

Har du koll på när ditt YKB går ut? Förfallet YKB kan orsaka problem vid vägkontroller och stoppa planerade uppdrag.

Kolla i körkortsregistret eller kontakta din utbildare för fortbildning i god tid — man behöver inte vänta till sista minuten.

Frågor om YKB? Ställ dem här i gruppen — här finns förare med god koll på regelverket!`,
  },
  {
    id: 'drivernord-cta',
    category: 'Soft DriverNord CTA',
    label: 'DriverNord',
    color: 'bg-slate-50 border-slate-200',
    labelColor: 'text-slate-600',
    text: `Snabb fråga till er i gruppen:

Har ni kollegor som kör CE eller C och som kanske funderar på att byta jobb — eller är öppna för bättre uppdrag?

Tipsa dem om DriverNord. Registreringen tar 3 minuter, kräver inget CV, och vi hör bara av oss om vi hittar en konkret match. Gratis för förare, alltid.

👉 drivernord.com/chaufforer`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<PostCategory, string> = {
  morning_greeting:    'Morgon',
  market_signal:       'Marknad',
  discussion_question: 'Diskussion',
  everyday_logistics:  'Logistikvardag',
  poll:                'Poll',
  weekly_tips:         'Tips',
  soft_cta:            'DriverNord',
};

const CATEGORY_COLORS: Record<PostCategory, string> = {
  morning_greeting:    'bg-blue-100 text-blue-700',
  market_signal:       'bg-green-100 text-green-700',
  discussion_question: 'bg-amber-100 text-amber-700',
  everyday_logistics:  'bg-orange-100 text-orange-700',
  poll:                'bg-purple-100 text-purple-700',
  weekly_tips:         'bg-indigo-100 text-indigo-700',
  soft_cta:            'bg-slate-100 text-slate-700',
};

const STATUS_LABELS: Record<PostStatus, string> = {
  draft:     'Utkast',
  approved:  'Godkänd',
  scheduled: 'Schemalagd',
  due:       'Dags att posta!',
  published: 'Postad',
  skipped:   'Hoppades över',
  failed:    'Misslyckades',
};

const STATUS_COLORS: Record<PostStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  approved:  'bg-blue-100 text-blue-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  due:       'bg-amber-100 text-amber-800',
  published: 'bg-green-100 text-green-700',
  skipped:   'bg-gray-100 text-gray-400',
  failed:    'bg-red-100 text-red-700',
};

const POSTED_KEY_PREFIX = 'logistikklubb:posted:';

function getPostedKey(postId: string): string {
  return `${POSTED_KEY_PREFIX}${postId}`;
}

// ─── Quick draft card ─────────────────────────────────────────────────────────

function QuickDraftCard({
  draft,
  copied,
  onCopy,
}: {
  draft: (typeof QUICK_DRAFTS)[number];
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className={`rounded-xl border ${draft.color} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center justify-between border-b border-inherit">
        <div>
          <span className={`text-xs font-semibold uppercase tracking-widest ${draft.labelColor}`}>
            {draft.label}
          </span>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{draft.category}</p>
        </div>
        <button
          onClick={onCopy}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
            copied ? 'bg-green-600 text-white' : 'bg-gray-900 hover:bg-gray-700 text-white'
          }`}
        >
          {copied ? 'Kopierat ✓' : 'Kopiera'}
        </button>
      </div>
      <pre className="px-4 py-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
        {draft.text}
      </pre>
    </div>
  );
}

// ─── 5-day sequence card ──────────────────────────────────────────────────────

function SequenceDayCard({
  post,
  copied,
  posted,
  onCopy,
  onMarkPosted,
}: {
  post: DraftPost;
  copied: boolean;
  posted: boolean;
  onCopy: () => void;
  onMarkPosted: () => void;
}) {
  const catLabel = CATEGORY_LABELS[post.category] ?? post.category;
  const catColor = CATEGORY_COLORS[post.category] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className={`rounded-xl border overflow-hidden ${posted ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-white'}`}>
      <div className="px-4 py-3 border-b border-inherit">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {post.day}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catColor}`}>
              {catLabel}
            </span>
            {post.is_market_signal && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Marknad
              </span>
            )}
            {post.is_cta && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                CTA
              </span>
            )}
            {posted && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-200 text-green-800">
                Postad ✓
              </span>
            )}
          </div>
        </div>
        <p className="text-sm font-bold text-gray-900 mt-2">{post.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">⏰ {post.suggested_time}</p>
      </div>
      <pre className="px-4 py-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
        {post.text}
      </pre>
      {post.risk_note && (
        <div className="px-4 pb-3">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ {post.risk_note}
          </p>
        </div>
      )}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={onCopy}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
            copied ? 'bg-green-600 text-white' : 'bg-gray-900 hover:bg-gray-700 text-white'
          }`}
        >
          {copied ? 'Kopierat ✓' : 'Kopiera text'}
        </button>
        <button
          onClick={onMarkPosted}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 ${
            posted
              ? 'border-green-400 text-green-700 bg-green-50'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {posted ? 'Avmarkera' : 'Markera postad'}
        </button>
      </div>
    </div>
  );
}

// ─── Scheduled post card ──────────────────────────────────────────────────────

function ScheduledPostCard({
  post,
  copiedId,
  onCopy,
  onApprove,
  onScheduleDefault,
  onMarkPublished,
  onSkip,
  busy,
}: {
  post: ScheduledPost;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onApprove: (id: string) => void;
  onScheduleDefault: (id: string) => void;
  onMarkPublished: (id: string) => void;
  onSkip: (id: string) => void;
  busy: boolean;
}) {
  const statusLabel = STATUS_LABELS[post.status] ?? post.status;
  const statusColor = STATUS_COLORS[post.status] ?? 'bg-gray-100 text-gray-600';
  const catLabel    = CATEGORY_LABELS[post.category as PostCategory] ?? post.category;
  const isDue       = post.status === 'due';
  const isTerminal  = post.status === 'published' || post.status === 'skipped';
  const copied      = copiedId === post.id;

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isDue ? 'border-amber-300 bg-amber-50/40' :
      post.status === 'published' ? 'border-green-300 bg-green-50/30' :
      post.status === 'skipped' ? 'border-gray-200 bg-gray-50 opacity-60' :
      'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-inherit">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
            {post.day_number}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {catLabel}
          </span>
        </div>
        <p className="text-sm font-bold text-gray-900 mt-2">{post.title}</p>
        {post.scheduled_at && (
          <p className="text-xs text-gray-500 mt-0.5">
            ⏰ {new Date(post.scheduled_at).toLocaleString('sv-SE', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
        {post.suggested_time && !post.scheduled_at && (
          <p className="text-xs text-gray-400 mt-0.5">Förslag: {post.suggested_time}</p>
        )}
      </div>

      {/* Post text */}
      <pre className="px-4 py-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
        {post.post_text}
      </pre>

      {/* Risk note */}
      {post.risk_note && (
        <div className="px-4 pb-3">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ {post.risk_note}
          </p>
        </div>
      )}

      {/* Actions */}
      {!isTerminal && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {/* Copy — always available for non-terminal */}
          <button
            onClick={() => onCopy(post.id, post.post_text)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              copied ? 'bg-green-600 text-white' : 'bg-gray-900 hover:bg-gray-700 text-white'
            }`}
          >
            {copied ? 'Kopierat ✓' : 'Kopiera'}
          </button>

          {/* Draft: Approve */}
          {post.status === 'draft' && (
            <button
              disabled={busy}
              onClick={() => onApprove(post.id)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-all"
            >
              Godkänn
            </button>
          )}

          {/* Approved: Schedule with default time */}
          {post.status === 'approved' && (
            <button
              disabled={busy}
              onClick={() => onScheduleDefault(post.id)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all"
            >
              Schemalägg
            </button>
          )}

          {/* Due: Mark published */}
          {isDue && (
            <button
              disabled={busy}
              onClick={() => onMarkPublished(post.id)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 transition-all"
            >
              Markera postad
            </button>
          )}

          {/* Skip (available for draft/approved/scheduled/due) */}
          <button
            disabled={busy}
            onClick={() => onSkip(post.id)}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            Hoppa över
          </button>
        </div>
      )}

      {/* Published: Copy available */}
      {post.status === 'published' && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onCopy(post.id, post.post_text)}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
              copied ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {copied ? 'Kopierat ✓' : 'Kopiera (postad)'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'quick' | 'plan' | 'schedule';

export default function AdminLogistikklubbPage() {
  const [tab, setTab]                         = useState<Tab>('quick');
  const [copiedId, setCopiedId]               = useState<string | null>(null);
  const [sequence, setSequence]               = useState<FiveDaySequence | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [postedIds, setPostedIds]             = useState<Set<string>>(new Set());
  // Schedule tab state
  const [schedPosts, setSchedPosts]           = useState<ScheduledPost[]>([]);
  const [schedLoading, setSchedLoading]       = useState(false);
  const [schedError, setSchedError]           = useState<string | null>(null);
  const [schedMigRequired, setSchedMigRequired] = useState(false);
  const [actionBusy, setActionBusy]           = useState(false);
  const [generating, setGenerating]           = useState(false);

  // Load posted state from localStorage
  useEffect(() => {
    const posted = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(POSTED_KEY_PREFIX)) {
        posted.add(key.replace(POSTED_KEY_PREFIX, ''));
      }
    }
    setPostedIds(posted);
  }, []);

  const fetchSequence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/logistikklubb-agent');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as FiveDaySequence;
      setSequence(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Okänt fel');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchScheduledPosts = useCallback(async () => {
    setSchedLoading(true);
    setSchedError(null);
    try {
      const res = await fetch('/api/admin/logistikklubb-schedule');
      if (res.status === 401) {
        setSchedError('Behöver inloggning — logga in via /recruiter/login');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { posts: ScheduledPost[]; migration_required: boolean };
      setSchedPosts(data.posts ?? []);
      setSchedMigRequired(data.migration_required ?? false);
    } catch (e) {
      setSchedError(e instanceof Error ? e.message : 'Okänt fel');
    } finally {
      setSchedLoading(false);
    }
  }, []);

  // Fetch when switching tabs for the first time
  useEffect(() => {
    if (tab === 'plan' && !sequence && !loading) fetchSequence();
  }, [tab, sequence, loading, fetchSequence]);

  useEffect(() => {
    if (tab === 'schedule' && schedPosts.length === 0 && !schedLoading && !schedError) {
      fetchScheduledPosts();
    }
  }, [tab, schedPosts.length, schedLoading, schedError, fetchScheduledPosts]);

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function handleMarkPosted(postId: string) {
    const key = getPostedKey(postId);
    if (postedIds.has(postId)) {
      localStorage.removeItem(key);
      setPostedIds((prev) => { const next = new Set(prev); next.delete(postId); return next; });
    } else {
      localStorage.setItem(key, new Date().toISOString());
      setPostedIds((prev) => new Set(prev).add(postId));
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setSchedError(null);
    try {
      const res = await fetch('/api/admin/logistikklubb-schedule/generate', { method: 'POST' });
      if (res.status === 401) { setSchedError('Behöver inloggning — logga in via /recruiter/login'); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchScheduledPosts();
    } catch (e) {
      setSchedError(e instanceof Error ? e.message : 'Okänt fel');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApproveAll() {
    const latestSeqId = getLatestSequenceId(schedPosts);
    if (!latestSeqId) return;
    setActionBusy(true);
    try {
      const res = await fetch('/api/admin/logistikklubb-schedule/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve_all: true, sequence_id: latestSeqId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchScheduledPosts();
    } finally {
      setActionBusy(false);
    }
  }

  async function handleScheduleAll() {
    const latestSeqId = getLatestSequenceId(schedPosts);
    if (!latestSeqId) return;
    setActionBusy(true);
    try {
      const res = await fetch('/api/admin/logistikklubb-schedule/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence_id: latestSeqId, use_defaults: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchScheduledPosts();
    } finally {
      setActionBusy(false);
    }
  }

  async function handleApprove(id: string) {
    setActionBusy(true);
    try {
      await fetch('/api/admin/logistikklubb-schedule/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchScheduledPosts();
    } finally { setActionBusy(false); }
  }

  async function handleScheduleDefault(id: string) {
    // Schedule one post: pick next available default slot
    const post = schedPosts.find((p) => p.id === id);
    if (!post) return;
    setActionBusy(true);
    try {
      const times = computeDefaultClientTimes(new Date());
      const idx   = Math.min(post.day_number - 1, times.length - 1);
      const scheduledAt = times[idx]!.toISOString();
      await fetch('/api/admin/logistikklubb-schedule/schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, scheduled_at: scheduledAt }),
      });
      await fetchScheduledPosts();
    } finally { setActionBusy(false); }
  }

  async function handleMarkPublished(id: string) {
    setActionBusy(true);
    try {
      await fetch('/api/admin/logistikklubb-schedule/mark-published', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchScheduledPosts();
    } finally { setActionBusy(false); }
  }

  async function handleSkip(id: string) {
    setActionBusy(true);
    try {
      await fetch('/api/admin/logistikklubb-schedule/skip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchScheduledPosts();
    } finally { setActionBusy(false); }
  }

  // Derived state for schedule tab
  const hasDraftPosts    = schedPosts.some((p) => p.status === 'draft');
  const hasApprovedPosts = schedPosts.some((p) => p.status === 'approved');
  const hasDuePosts      = schedPosts.some((p) => p.status === 'due');
  const latestSeqId      = getLatestSequenceId(schedPosts);

  const statusCounts = schedPosts.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Admin</p>
        <h1 className="text-lg font-bold text-gray-900 leading-tight">Logistikklubb</h1>
      </div>

      {/* Tabs */}
      <div className="sticky top-[60px] z-10 bg-white border-b border-gray-200 px-4">
        <div className="flex">
          {([['quick', 'Snabbinlägg'], ['plan', '5-dagarsplan'], ['schedule', 'Schemalägg']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {label}
              {t === 'schedule' && hasDuePosts && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {statusCounts['due'] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── Quick-post tab ─────────────────────────────────────────────────── */}
        {tab === 'quick' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-1">
                Snabbinlägg
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Kopiera ett inlägg, öppna WhatsApp-gruppen och klistra in.
                Redigera gärna datummarkeringar eller anpassa till vad som händer idag.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Tumregel: 70% värde/diskussion · 20% marknadssignaler · 10% DriverNord-CTA
              </p>
            </div>

            <a
              href="https://chat.whatsapp.com/HC2QY2W32CYIIXpxawXSOG"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500
                         text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              <WhatsAppIcon />
              Öppna Logistikklubben i WhatsApp
            </a>

            {QUICK_DRAFTS.map((draft) => (
              <QuickDraftCard
                key={draft.id}
                draft={draft}
                copied={copiedId === draft.id}
                onCopy={() => handleCopy(draft.id, draft.text)}
              />
            ))}

            <p className="text-xs text-gray-400 text-center pb-4">
              Inlägg postas manuellt — ingen automatisering.
            </p>
          </>
        )}

        {/* ── 5-day plan tab ─────────────────────────────────────────────────── */}
        {tab === 'plan' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-1">
                5-dagars publiceringsplan
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Genereras baserat på veckans marknadssignaler. Kopiera och posta
                ett inlägg per dag — manuellt, i din egen takt.
              </p>
              {sequence && (
                <p className="text-xs text-gray-500 mt-2">
                  Tema: <span className="font-semibold">{sequence.week_theme}</span>
                  {' · '}
                  Källa: {sequence.signal_basis === 'live_signals' ? '🟢 Live-signaler' : '⚪ Statisk fallback'}
                </p>
              )}
            </div>

            <a
              href="https://chat.whatsapp.com/HC2QY2W32CYIIXpxawXSOG"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500
                         text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              <WhatsAppIcon />
              Öppna Logistikklubben i WhatsApp
            </a>

            {loading && (
              <div className="text-center py-12">
                <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-gray-500">Genererar veckans plan…</p>
              </div>
            )}

            {error && !loading && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                <p className="text-sm font-semibold text-red-700 mb-2">Kunde inte hämta plan</p>
                <p className="text-xs text-red-600 mb-3">{error}</p>
                <button onClick={fetchSequence} className="text-sm font-semibold text-red-700 underline">
                  Försök igen
                </button>
              </div>
            )}

            {sequence && !loading && sequence.days.map((post) => (
              <SequenceDayCard
                key={post.id}
                post={post}
                copied={copiedId === post.id}
                posted={postedIds.has(post.id)}
                onCopy={() => handleCopy(post.id, post.text)}
                onMarkPosted={() => handleMarkPosted(post.id)}
              />
            ))}

            {sequence && !loading && (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                  Innehållsfördelning
                </p>
                <div className="space-y-2">
                  <RatioBar label="Värde / Community" pct={sequence.content_ratio.value_pct} color="bg-blue-500" />
                  <RatioBar label="Marknadssignaler" pct={sequence.content_ratio.market_pct} color="bg-green-500" />
                  <RatioBar label="DriverNord CTA" pct={sequence.content_ratio.cta_pct} color="bg-slate-400" />
                </div>
              </div>
            )}

            {sequence && !loading && (
              <button
                onClick={fetchSequence}
                className="w-full py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Regenerera plan
              </button>
            )}

            <p className="text-xs text-gray-400 text-center pb-4">
              Inlägg postas manuellt — ingen automatisering.
            </p>
          </>
        )}

        {/* ── Schedule tab ───────────────────────────────────────────────────── */}
        {tab === 'schedule' && (
          <>
            {/* Info banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">
                Schemalagd publicering
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Generera en 5-dagarsplan, godkänn den, och systemet påminner dig
                när varje inlägg är dags att posta. Du kopierar och postar manuellt.
              </p>
            </div>

            {/* Auth error */}
            {schedError?.includes('inloggning') && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">Behöver inloggning</p>
                <a href="/recruiter/login" className="text-sm text-amber-700 underline">
                  Logga in via /recruiter/login
                </a>
              </div>
            )}

            {/* Migration not applied */}
            {schedMigRequired && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">Databas ej klar</p>
                <p className="text-xs text-amber-700">
                  Migration 01700000 behöver appliceras i Supabase SQL Editor.
                </p>
              </div>
            )}

            {/* Loading */}
            {schedLoading && (
              <div className="text-center py-10">
                <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-gray-500">Hämtar schema…</p>
              </div>
            )}

            {/* Error */}
            {schedError && !schedError.includes('inloggning') && !schedLoading && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                <p className="text-sm font-semibold text-red-700 mb-2">Fel</p>
                <p className="text-xs text-red-600 mb-3">{schedError}</p>
                <button onClick={fetchScheduledPosts} className="text-sm text-red-700 underline">
                  Försök igen
                </button>
              </div>
            )}

            {/* Status summary */}
            {!schedLoading && !schedMigRequired && schedPosts.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {(['due', 'scheduled', 'draft'] as PostStatus[]).map((s) => (
                  statusCounts[s] ? (
                    <div key={s} className={`rounded-xl border px-3 py-2.5 text-center ${STATUS_COLORS[s]}`}>
                      <p className="text-lg font-bold">{statusCounts[s]}</p>
                      <p className="text-xs">{STATUS_LABELS[s]}</p>
                    </div>
                  ) : null
                ))}
              </div>
            )}

            {/* Empty state + Generate button */}
            {!schedLoading && !schedMigRequired && schedPosts.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Ingen aktiv plan. Generera en ny 5-dagarsplan för att komma igång.
                </p>
                <button
                  disabled={generating}
                  onClick={handleGenerate}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {generating ? 'Genererar…' : 'Generera 5-dagarsplan'}
                </button>
              </div>
            )}

            {/* Bulk actions */}
            {!schedLoading && schedPosts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hasDraftPosts && latestSeqId && (
                  <button
                    disabled={actionBusy}
                    onClick={handleApproveAll}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    Godkänn alla utkast
                  </button>
                )}
                {hasApprovedPosts && latestSeqId && (
                  <button
                    disabled={actionBusy}
                    onClick={handleScheduleAll}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    Schemalägg alla (auto-tider)
                  </button>
                )}
                <button
                  disabled={generating}
                  onClick={handleGenerate}
                  className="px-4 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  {generating ? '…' : 'Ny plan'}
                </button>
              </div>
            )}

            {/* WhatsApp shortcut (shown when there are due posts) */}
            {hasDuePosts && (
              <a
                href="https://chat.whatsapp.com/HC2QY2W32CYIIXpxawXSOG"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500
                           text-white font-semibold py-3.5 rounded-xl transition-colors"
              >
                <WhatsAppIcon />
                Öppna Logistikklubben — posta nu
              </a>
            )}

            {/* Post cards */}
            {!schedLoading && schedPosts
              .sort((a, b) => a.day_number - b.day_number)
              .map((post) => (
                <ScheduledPostCard
                  key={post.id}
                  post={post}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  onApprove={handleApprove}
                  onScheduleDefault={handleScheduleDefault}
                  onMarkPublished={handleMarkPublished}
                  onSkip={handleSkip}
                  busy={actionBusy}
                />
              ))}

            <p className="text-xs text-gray-400 text-center pb-4">
              Inlägg postas manuellt — ingen automatisering.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Pure helper (client-side mirror of computeDefaultScheduledTimes) ─────────

function computeDefaultClientTimes(now: Date): Date[] {
  const SLOT_TIMES = ['07:30', '10:00', '07:30', '12:00', '09:00'] as const;
  const day1 = new Date(now);
  day1.setHours(7, 30, 0, 0);
  if (day1 <= now) day1.setDate(day1.getDate() + 1);

  return SLOT_TIMES.map((time, idx) => {
    const d = new Date(day1);
    d.setDate(d.getDate() + idx);
    const [hh, mm] = time.split(':').map(Number);
    d.setHours(hh!, mm!, 0, 0);
    return d;
  });
}

function getLatestSequenceId(posts: ScheduledPost[]): string | null {
  if (posts.length === 0) return null;
  const sorted = [...posts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return sorted[0]?.sequence_id ?? null;
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function RatioBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
