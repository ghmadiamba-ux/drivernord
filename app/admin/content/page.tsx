'use client';

import { useState, useCallback, useEffect } from 'react';

// ─── Types (inline to avoid server imports in client component) ───────────────

type RiskLevel = 'low' | 'high';
type LifecycleStatus = 'draft' | 'ready' | 'held' | 'archived';

// ─── Facebook publish queue types (inline — no server imports) ─────────────────

type FbPublishStatus =
  | 'pending_check' | 'eligible' | 'blocked'
  | 'queued' | 'scheduled' | 'due' | 'published' | 'failed';

interface FbEntry {
  id: string;
  card_id: string;
  publish_status: FbPublishStatus;
  blocked_reason: string | null;
  blocked_policy_rule: string | null;
  facebook_copy: string | null;
  scheduled_at: string | null;
  facebook_post_id: string | null;
  published_at: string | null;
  failure_reason: string | null;
  failure_count: number;
}

const REGULATORY_REASON_PREFIX = 'REGULATORY_CONTENT — requires_official_source_review:';
function isRegulatoryHold(blockedReason?: string): boolean {
  return typeof blockedReason === 'string' && blockedReason.startsWith(REGULATORY_REASON_PREFIX);
}

// ─── Autonomous queue global status ────────────────────────────────────────────

interface FbGlobalStats {
  emergency_pause:    boolean;
  paused_pillars:     string[];
  paused_angles:      string[];
  max_posts_per_week: number;
  posts_this_week:    number;
  cta_this_week:      number;
  max_cta_per_week:   number;
  scheduled_count:    number;
  next_slot:          string | null;
}
type FeedbackSignal =
  | 'good_reproduce' | 'too_generic' | 'too_commercial' | 'too_ai_like'
  | 'weak_swedish' | 'wrong_audience' | 'weak_creative_angle'
  | 'avoid_topic' | 'avoid_cta' | 'future_boost_candidate' | 'pause_category';

// ─── Visual plan types ────────────────────────────────────────────────────────

type VisualGateOutcome =
  | 'ready_for_internal_preview' | 'held_for_risk' | 'blocked_for_repetition'
  | 'needs_better_brief' | 'requires_real_asset' | 'requires_future_ai_generation'
  | 'no_visual_needed';

type VisualLifecycle = 'draft' | 'ready' | 'held' | 'archived';

type VisualFeedbackSignal =
  | 'excellent_visual_pattern' | 'too_ai_looking' | 'too_generic'
  | 'weak_composition' | 'weak_swedish_transport_realism' | 'too_much_on_image_text'
  | 'poor_mobile_readability' | 'brand_inconsistency' | 'avoid_this_visual_family'
  | 'avoid_this_scene_type' | 'reuse_this_visual_direction' | 'future_campaign_candidate'
  // Sprint V1 execution quality signals
  | 'good_trust_building_direction' | 'too_aggressive_for_organic'
  | 'good_paid_ad_direction' | 'keep_this_hook_type'
  // Reference library learning signals
  | 'mechanism_selection_correct' | 'mechanism_selection_wrong'
  | 'mode_trust_organic_preferred' | 'mode_performance_preferred'
  | 'channel_fit_accurate' | 'mechanism_add_to_rotation' | 'mechanism_remove_from_rotation';

// Sprint V1 inline types (no server imports in client component)
interface SprintBrief {
  target_audience: string;
  objective: string;
  central_visual_idea: string;
  mobile_scroll_stop_intention: string;
  format_justification: string;
  emotional_tone: string;
}
interface SprintOnImageCopy {
  headline: string;
  support_line?: string;
  cta_line?: string;
  word_count: number;
}
interface SprintExecutionBoard {
  photo_criteria: string;
  crop_direction: string;
  text_overlay_placement: string;
  color_contrast_direction: string;
  swedish_environment_requirements: string;
  do_not_use: string[];
}
interface SprintAiDirection {
  scene: string;
  subject: string;
  wardrobe: string;
  environment: string;
  swedish_transport_realism: string;
  composition: string;
  camera_framing: string;
  lighting: string;
  negative_constraints: string[];
  on_image_copy_placement: string;
}
interface SprintPrototype {
  type: string;
  svg_content: string;
  execution_board?: SprintExecutionBoard;
  ai_direction?: SprintAiDirection;
  composition_notes: string;
  disclaimer: string;
}
interface SprintQualityReview {
  mobile_readability: string;
  on_image_word_count: number;
  visual_family_cooldown: string;
  scene_repetition: string;
  composition_repetition: string;
  mechanism_cooldown: string;
  gate_outcome: string;
  founder_review_question: string;
}
interface SprintExecution {
  version: 'v1';
  day_label: string;
  brief: SprintBrief;
  on_image_copy: SprintOnImageCopy;
  prototype: SprintPrototype;
  quality_review: SprintQualityReview;
  applied_at: string;
}

interface VisualPlan {
  id: string;
  visual_family: string;
  asset_strategy: string;
  scene_type: string;
  mood: string;
  composition_direction: string;
  proposed_headline?: string;
  proposed_support_line?: string;
  format_recommendation: string;
  gate_outcome: VisualGateOutcome;
  gate_findings: string[];
  similarity_warning?: string;
  visual_risk_level: 'low' | 'medium' | 'high';
  lifecycle_status: VisualLifecycle;
  feedback_signals?: VisualFeedbackSignal[];
  asset_strategy_reason: string;
  // Reference library V1 fields
  reference_mechanism_id?:      string;
  creative_mode?:               'trust_organic' | 'performance_acquisition';
  mechanism_selection_reason?:  string;
  channel_fit_recommendation?:  string;
  mechanism_cooldown_warnings?: string[];
  // Sprint V1 execution package
  sprint_execution?: SprintExecution;
}

interface VisualPreview {
  preview_type: 'branded_graphic_svg' | 'concept_description';
  svg_content?: string;
  concept_description: string;
  composition_notes: string;
  copy_hierarchy: string;
  format_notes: string;
  disclaimer: string;
}

interface CardSummary {
  id: string;
  label: string;
  content_pillar: string;
  creative_angle: string;
  target_audience: string;
  format: string;
  cta_type: string;
  risk_level: RiskLevel;
  lifecycle_status: LifecycleStatus;
  blocked_reason?: string;
  draft_text?: string;
  hashtag_set?: string[];
  planned_day?: number;
  planned_week?: string;
  suggested_slot_time?: string;
  created_by?: string;
  created_at?: string;
}

interface PlanResult {
  week: string;
  generated_at: string;
  cta_count: number;
  pillar_ratio: Record<string, number>;
  warnings: string[];
  cards: CardSummary[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentISOWeek(): string {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const startOfW1 = new Date(jan4);
  startOfW1.setDate(jan4.getDate() - jan4Day + 1);
  const daysDiff = Math.floor((now.getTime() - startOfW1.getTime()) / 86_400_000);
  const week = Math.floor(daysDiff / 7) + 1;
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function riskBadge(level: RiskLevel) {
  return level === 'high'
    ? <span className="inline-block text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">Hög risk</span>
    : <span className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Låg risk</span>;
}

function statusBadge(status: LifecycleStatus) {
  const map: Record<LifecycleStatus, { bg: string; label: string }> = {
    draft:    { bg: 'bg-gray-100 text-gray-700', label: 'Utkast' },
    ready:    { bg: 'bg-blue-100 text-blue-700', label: 'Redo' },
    held:     { bg: 'bg-amber-100 text-amber-700', label: 'Pausad' },
    archived: { bg: 'bg-gray-200 text-gray-500', label: 'Arkiverad' },
  };
  const { bg, label } = map[status];
  return <span className={`inline-block text-xs px-2 py-0.5 rounded font-semibold ${bg}`}>{label}</span>;
}

const FEEDBACK_LABELS: Record<FeedbackSignal, string> = {
  good_reproduce:       '✅ Fungerade bra',
  too_generic:          '⚠️ För generisk',
  too_commercial:       '⚠️ För säljig',
  too_ai_like:          '⚠️ Låter som AI',
  weak_swedish:         '⚠️ Svag svenska',
  wrong_audience:       '⚠️ Fel målgrupp',
  weak_creative_angle:  '⚠️ Svag vinkel',
  avoid_topic:          '🚫 Undvik ämnet',
  avoid_cta:            '🚫 Undvik CTA',
  future_boost_candidate: '🚀 Boost-kandidat',
  pause_category:       '⏸️ Pausa kategori',
};

const DAY_LABELS: Record<number, string> = {
  1: 'Mån', 2: 'Tis', 3: 'Ons', 4: 'Tor',
  5: 'Fre', 6: 'Lör', 7: 'Sön',
};

const VISUAL_FEEDBACK_LABELS: Record<VisualFeedbackSignal, string> = {
  // Core visual quality
  excellent_visual_pattern:       '✅ Utmärkt visuellt mönster',
  too_ai_looking:                 '⚠️ Ser AI-genererat ut',
  too_generic:                    '⚠️ För generisk',
  weak_composition:               '⚠️ Svag komposition',
  weak_swedish_transport_realism: '⚠️ Svag svensk transportkänsla',
  too_much_on_image_text:         '⚠️ För mycket text på bild',
  poor_mobile_readability:        '⚠️ Dålig mobilläsbarhet',
  brand_inconsistency:            '⚠️ Varumärkesinkonsistens',
  avoid_this_visual_family:       '🚫 Undvik denna bildfamilj',
  avoid_this_scene_type:          '🚫 Undvik denna scen',
  reuse_this_visual_direction:    '🔁 Återanvänd visuell riktning',
  future_campaign_candidate:      '🚀 Framtida kampanjkandidat',
  // Sprint V1 execution quality
  good_trust_building_direction:  '✅ Rätt ton för trust/organisk kanal',
  too_aggressive_for_organic:     '⚠️ För hård hook för organiskt flöde',
  good_paid_ad_direction:         '⚡ Stark performance-visual — flytta till betald kanal',
  keep_this_hook_type:            '🔁 Behåll denna hook-typ i framtida innehåll',
  // Reference library learning
  mechanism_selection_correct:    '✅ Rätt mekanism vald',
  mechanism_selection_wrong:      '⚠️ Fel mekanism — passar inte innehållet',
  mode_trust_organic_preferred:   '🎨 Föredrar trust/organisk-läge',
  mode_performance_preferred:     '⚡ Föredrar performance-läge',
  channel_fit_accurate:           '✅ Kanalrekommendation stämmer',
  mechanism_add_to_rotation:      '🔁 Använd denna mekanism oftare',
  mechanism_remove_from_rotation: '🚫 Supprimera denna mekanism här',
};

const GATE_OUTCOME_LABELS: Record<VisualGateOutcome, { label: string; color: string }> = {
  ready_for_internal_preview:    { label: 'Redo för intern förhandsvisning', color: 'bg-green-100 text-green-700' },
  held_for_risk:                 { label: 'Hålls — riskinnehåll', color: 'bg-red-100 text-red-700' },
  blocked_for_repetition:        { label: 'Blockerad — upprepning', color: 'bg-orange-100 text-orange-700' },
  needs_better_brief:            { label: 'Behöver bättre brief', color: 'bg-amber-100 text-amber-700' },
  requires_real_asset:           { label: 'Kräver verklig bild', color: 'bg-blue-100 text-blue-700' },
  requires_future_ai_generation: { label: 'Kräver framtida AI-bild', color: 'bg-purple-100 text-purple-700' },
  no_visual_needed:              { label: 'Ingen bild behövs', color: 'bg-gray-100 text-gray-600' },
};

// ─── CardRow ──────────────────────────────────────────────────────────────────

function CardRow({
  card,
  onStatusChange,
  onFeedback,
}: {
  card: CardSummary;
  onStatusChange: (id: string, status: LifecycleStatus) => void;
  onFeedback: (id: string, signals: FeedbackSignal[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackSignal[]>([]);
  const [visualPlan, setVisualPlan] = useState<VisualPlan | null>(null);
  const [visualPreview, setVisualPreview] = useState<VisualPreview | null>(null);
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualExpanded, setVisualExpanded] = useState(false);
  const [selectedVisualFeedback, setSelectedVisualFeedback] = useState<VisualFeedbackSignal[]>([]);
  const [visualPlanFetched, setVisualPlanFetched] = useState(false);
  const [fbEntry, setFbEntry] = useState<FbEntry | null | undefined>(undefined); // undefined = not yet fetched
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);
  const [firstPostLoading, setFirstPostLoading] = useState(false);
  const [firstPostResult, setFirstPostResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Auto-load Facebook queue entry on first expand
  useEffect(() => {
    if (!expanded || fbEntry !== undefined) return;
    fetch(`/api/admin/content-facebook-queue?card_id=${card.id}`)
      .then((r) => r.json())
      .then((data: { entry: FbEntry | null }) => setFbEntry(data.entry ?? null))
      .catch(() => setFbEntry(null));
  }, [expanded, card.id, fbEntry]);

  async function enqueueFacebook() {
    setFbLoading(true);
    setFbError(null);
    try {
      const res = await fetch('/api/admin/content-facebook-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: card.id, queued_by: 'founder' }),
      });
      const data = await res.json() as { entry?: FbEntry; eligible?: boolean; blocked_reason?: string; error?: string };
      if (res.ok || res.status === 422) {
        setFbEntry(data.entry ?? null);
        if (!data.eligible) setFbError(data.blocked_reason ?? data.error ?? 'Blockerad');
      } else {
        setFbError(data.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setFbError(String(e));
    } finally {
      setFbLoading(false);
    }
  }

  async function publishFirstPost() {
    setFirstPostLoading(true);
    setFirstPostResult(null);
    try {
      const res = await fetch('/api/admin/content-facebook-first-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: card.id, confirm: true }),
      });
      const data = await res.json() as { ok: boolean; facebook_post_id?: string; entry?: FbEntry; message?: string; reason?: string };
      if (data.ok) {
        setFbEntry(data.entry ?? null);
        setFirstPostResult({ ok: true, message: `Publicerat! Post-ID: ${data.facebook_post_id ?? '—'}` });
      } else {
        if (data.entry) setFbEntry(data.entry);
        setFirstPostResult({ ok: false, message: data.message ?? data.reason ?? 'Okänt fel' });
      }
    } catch (e) {
      setFirstPostResult({ ok: false, message: String(e) });
    } finally {
      setFirstPostLoading(false);
    }
  }

  // Auto-load stored visual plan on first expand
  useEffect(() => {
    if (!expanded || visualPlanFetched) return;
    setVisualPlanFetched(true);
    setVisualLoading(true);
    fetch(`/api/admin/visual-plan?card_id=${card.id}`)
      .then((r) => r.json())
      .then((data: { plan: VisualPlan | null; preview?: VisualPreview }) => {
        if (data.plan) {
          setVisualPlan(data.plan);
          if (data.preview) setVisualPreview(data.preview);
          setVisualExpanded(true);
        }
      })
      .catch(() => { /* plan may not exist yet — silent */ })
      .finally(() => setVisualLoading(false));
  }, [expanded, visualPlanFetched, card.id]);

  async function generateVisualPlan() {
    setVisualLoading(true);
    try {
      const res = await fetch('/api/admin/visual-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: card.id }),
      });
      const data = await res.json() as { plan: VisualPlan; preview: VisualPreview };
      if (res.ok) {
        setVisualPlan(data.plan);
        setVisualPreview(data.preview);
        setVisualExpanded(true);
      }
    } finally {
      setVisualLoading(false);
    }
  }

  async function saveVisualFeedback() {
    if (!visualPlan || selectedVisualFeedback.length === 0) return;
    await fetch('/api/admin/visual-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: card.id, feedback_signals: selectedVisualFeedback }),
    });
    setVisualPlan((prev) => prev ? { ...prev, feedback_signals: selectedVisualFeedback } : prev);
    setSelectedVisualFeedback([]);
  }

  async function updateVisualLifecycle(lifecycle: VisualLifecycle) {
    await fetch('/api/admin/visual-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: card.id, lifecycle_status: lifecycle }),
    });
    setVisualPlan((prev) => prev ? { ...prev, lifecycle_status: lifecycle } : prev);
  }

  function toggleVisualFeedback(sig: VisualFeedbackSignal) {
    setSelectedVisualFeedback((prev) =>
      prev.includes(sig) ? prev.filter((s) => s !== sig) : [...prev, sig]
    );
  }

  function toggleFeedback(sig: FeedbackSignal) {
    setSelectedFeedback((prev) =>
      prev.includes(sig) ? prev.filter((s) => s !== sig) : [...prev, sig]
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm font-medium text-gray-500 w-10 shrink-0">
          {card.planned_day ? DAY_LABELS[card.planned_day] : '—'}
        </span>
        <span className="text-sm font-semibold text-gray-800 flex-1 min-w-0 truncate">
          {card.label}
        </span>
        {card.created_by?.startsWith('dry_run_') && (
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold shrink-0">
            Dry-run
          </span>
        )}
        {isRegulatoryHold(card.blocked_reason) && (
          <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold shrink-0">
            Regulatory Hold
          </span>
        )}
        <span className="text-xs text-gray-400 shrink-0">{card.suggested_slot_time}</span>
        {riskBadge(card.risk_level)}
        {statusBadge(card.lifecycle_status)}
        <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500 mb-3">
            <span>Pelare: <strong className="text-gray-700">{card.content_pillar}</strong></span>
            <span>Vinkel: <strong className="text-gray-700">{card.creative_angle}</strong></span>
            <span>Format: <strong className="text-gray-700">{card.format}</strong></span>
            <span>Målgrupp: <strong className="text-gray-700">{card.target_audience}</strong></span>
            <span>CTA: <strong className="text-gray-700">{card.cta_type}</strong></span>
            <span>Källa: <strong className="text-gray-700 font-mono">{card.created_by ?? '—'}</strong></span>
            <span>Skapad: <strong className="text-gray-700">{card.created_at ? new Date(card.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</strong></span>
          </div>

          {card.blocked_reason && isRegulatoryHold(card.blocked_reason) && (
            <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-300 rounded p-2 font-semibold">
              ⚠ REGULATORY HOLD — requires_official_source_review
              <p className="mt-1 font-normal text-red-600">{card.blocked_reason.replace(REGULATORY_REASON_PREFIX, '').trim()}</p>
              <p className="mt-1 font-normal text-red-500">Visual prototype generation is blocked until an approved official source is linked.</p>
            </div>
          )}
          {card.blocked_reason && !isRegulatoryHold(card.blocked_reason) && (
            <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              {card.blocked_reason}
            </div>
          )}

          {card.draft_text && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">Utkasttext</p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 border border-gray-200 rounded p-3">
                {card.draft_text}
              </pre>
            </div>
          )}

          {card.hashtag_set && card.hashtag_set.length > 0 && (
            <div className="mb-3 text-xs text-blue-600 flex flex-wrap gap-1">
              {card.hashtag_set.map((h) => (
                <span key={h} className="bg-blue-50 px-1.5 py-0.5 rounded">{h}</span>
              ))}
            </div>
          )}

          {/* Lifecycle actions */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {card.lifecycle_status !== 'ready' && card.lifecycle_status !== 'archived' && (
              <button
                onClick={() => onStatusChange(card.id, 'ready')}
                className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Godkänn
              </button>
            )}
            {card.lifecycle_status !== 'held' && card.lifecycle_status !== 'archived' && (
              <button
                onClick={() => onStatusChange(card.id, 'held')}
                className="text-xs px-3 py-1 rounded bg-amber-500 text-white hover:bg-amber-600"
              >
                Pausa
              </button>
            )}
            {card.lifecycle_status !== 'archived' && (
              <button
                onClick={() => onStatusChange(card.id, 'archived')}
                className="text-xs px-3 py-1 rounded bg-gray-400 text-white hover:bg-gray-500"
              >
                Arkivera
              </button>
            )}
            {card.lifecycle_status === 'held' && (
              <button
                onClick={() => onStatusChange(card.id, 'draft')}
                className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                Återställ till utkast
              </button>
            )}
          </div>

          {/* Feedback section */}
          <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Feedback</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {(Object.entries(FEEDBACK_LABELS) as [FeedbackSignal, string][]).map(([sig, label]) => (
                <button
                  key={sig}
                  onClick={() => toggleFeedback(sig)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    selectedFeedback.includes(sig)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedFeedback.length > 0 && (
              <button
                onClick={() => {
                  onFeedback(card.id, selectedFeedback);
                  setSelectedFeedback([]);
                }}
                className="text-xs px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Spara feedback ({selectedFeedback.length})
              </button>
            )}
          </div>

          {/* Visual plan section */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Visuell plan</p>
              {!visualPlan && (
                <button
                  onClick={generateVisualPlan}
                  disabled={visualLoading}
                  className="text-xs px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {visualLoading ? 'Genererar…' : 'Generera visuell plan'}
                </button>
              )}
              {visualPlan && (
                <button
                  onClick={() => setVisualExpanded((v) => !v)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  {visualExpanded ? 'Dölj' : 'Visa'}
                </button>
              )}
            </div>

            {visualPlan && visualExpanded && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                {/* Badges */}
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {visualPlan.visual_family.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {visualPlan.asset_strategy.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${GATE_OUTCOME_LABELS[visualPlan.gate_outcome]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                    {GATE_OUTCOME_LABELS[visualPlan.gate_outcome]?.label ?? visualPlan.gate_outcome}
                  </span>
                  {visualPlan.visual_risk_level === 'high' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">Hög visuell risk</span>
                  )}
                </div>

                {/* Reference mechanism (Proven Creative Reference Library V1) */}
                {visualPlan.reference_mechanism_id && (
                  <div className="mb-2 p-2 bg-indigo-50 border border-indigo-100 rounded text-xs">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-indigo-700">
                        Mekanism: {visualPlan.reference_mechanism_id.replace(/_/g, ' ')}
                      </span>
                      {visualPlan.creative_mode && (
                        <span className={`px-2 py-0.5 rounded font-semibold ${
                          visualPlan.creative_mode === 'performance_acquisition'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {visualPlan.creative_mode === 'performance_acquisition'
                            ? 'Performance / svart+gult'
                            : 'Trust / navy+vitt'}
                        </span>
                      )}
                    </div>
                    {visualPlan.mechanism_selection_reason && (
                      <p className="text-gray-600 mb-1">{visualPlan.mechanism_selection_reason}</p>
                    )}
                    {visualPlan.channel_fit_recommendation && (
                      <p className="text-gray-500">
                        Kanalpassning: <span className="font-medium text-gray-700">{visualPlan.channel_fit_recommendation}</span>
                      </p>
                    )}
                    {visualPlan.mechanism_cooldown_warnings && visualPlan.mechanism_cooldown_warnings.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {visualPlan.mechanism_cooldown_warnings.map((w, i) => (
                          <p key={i} className="text-amber-700">⚠️ {w}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sprint V1 execution package */}
                {visualPlan.sprint_execution && (
                  <div className="mb-3 border border-indigo-200 rounded-lg p-3 bg-indigo-50">
                    <p className="text-xs text-indigo-700 font-semibold uppercase tracking-wide mb-2">
                      Visual Execution Sprint V1 — {visualPlan.sprint_execution.day_label}
                    </p>

                    {/* Execution brief */}
                    <div className="mb-2 space-y-1 text-xs text-gray-600">
                      <div><span className="font-semibold text-gray-700">Central idé:</span> {visualPlan.sprint_execution.brief.central_visual_idea}</div>
                      <div><span className="font-semibold text-gray-700">Scroll-stopp:</span> {visualPlan.sprint_execution.brief.mobile_scroll_stop_intention}</div>
                      <div><span className="font-semibold text-gray-700">Varför formatet:</span> {visualPlan.sprint_execution.brief.format_justification}</div>
                      <div><span className="font-semibold text-gray-700">Målgrupp:</span> {visualPlan.sprint_execution.brief.target_audience}</div>
                    </div>

                    {/* On-image copy */}
                    <div className="mb-2 p-2 bg-white border border-indigo-100 rounded text-xs">
                      <p className="text-gray-400 font-semibold mb-1 uppercase tracking-wide">Bildtext</p>
                      <p className="text-gray-800 font-bold text-sm">{visualPlan.sprint_execution.on_image_copy.headline}</p>
                      {visualPlan.sprint_execution.on_image_copy.support_line && (
                        <p className="text-gray-600 mt-0.5">{visualPlan.sprint_execution.on_image_copy.support_line}</p>
                      )}
                      {visualPlan.sprint_execution.on_image_copy.cta_line && (
                        <p className="text-blue-600 mt-0.5">{visualPlan.sprint_execution.on_image_copy.cta_line}</p>
                      )}
                      <p className="text-gray-400 mt-1">Ord på bild: {visualPlan.sprint_execution.on_image_copy.word_count}</p>
                    </div>

                    {/* Quality review */}
                    <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Mobilläsbarhet: <strong className="text-gray-700">{visualPlan.sprint_execution.quality_review.mobile_readability.split('—')[0]?.trim()}</strong></span>
                      <span>Gate: <strong className="text-gray-700">{visualPlan.sprint_execution.quality_review.gate_outcome}</strong></span>
                      <span>Familj cooldown: <strong className="text-gray-700">{visualPlan.sprint_execution.quality_review.visual_family_cooldown.split('—')[0]?.trim()}</strong></span>
                      <span>Mekanism cooldown: <strong className="text-gray-700">{visualPlan.sprint_execution.quality_review.mechanism_cooldown.split('—')[0]?.trim()}</strong></span>
                      <span className="col-span-2">Scenrepetition: <strong className="text-gray-700">{visualPlan.sprint_execution.quality_review.scene_repetition.split('—')[0]?.trim()}</strong></span>
                    </div>

                    {/* Execution board (real_asset cards) */}
                    {visualPlan.sprint_execution.prototype.execution_board && (
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="text-blue-700 font-semibold mb-1">FOTOKRAV — REAL_ASSET</p>
                        <p className="text-gray-600">Urvalskriterier: {visualPlan.sprint_execution.prototype.execution_board.photo_criteria}</p>
                        <p className="text-gray-600 mt-0.5">Bildskärning: {visualPlan.sprint_execution.prototype.execution_board.crop_direction}</p>
                        <p className="text-gray-600 mt-0.5">Miljö (Sverige): {visualPlan.sprint_execution.prototype.execution_board.swedish_environment_requirements}</p>
                        <p className="text-gray-600 mt-0.5">Undvik: {visualPlan.sprint_execution.prototype.execution_board.do_not_use.join(' · ')}</p>
                      </div>
                    )}

                    {/* AI direction (future_ai_generated cards) */}
                    {visualPlan.sprint_execution.prototype.ai_direction && (
                      <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                        <p className="text-purple-700 font-semibold mb-1">AI-BILDREGI — FUTURE_AI_GENERATED</p>
                        <p className="text-gray-600">Scen: {visualPlan.sprint_execution.prototype.ai_direction.scene}</p>
                        <p className="text-gray-600 mt-0.5">Subjekt: {visualPlan.sprint_execution.prototype.ai_direction.subject}</p>
                        <p className="text-gray-600 mt-0.5">Klädsel: {visualPlan.sprint_execution.prototype.ai_direction.wardrobe}</p>
                        <p className="text-gray-600 mt-0.5">Belysning: {visualPlan.sprint_execution.prototype.ai_direction.lighting}</p>
                        <p className="text-gray-600 mt-0.5">Kamera: {visualPlan.sprint_execution.prototype.ai_direction.camera_framing}</p>
                        <p className="text-gray-600 mt-0.5">Undvik: {visualPlan.sprint_execution.prototype.ai_direction.negative_constraints.join(' · ')}</p>
                      </div>
                    )}

                    {/* Founder review question */}
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      <span className="font-semibold">Grundarens granskningsfråga: </span>
                      {visualPlan.sprint_execution.quality_review.founder_review_question}
                    </div>
                  </div>
                )}

                {/* Strategy reason */}
                <p className="text-xs text-gray-500 mb-2">{visualPlan.asset_strategy_reason}</p>

                {/* Gate findings / warnings */}
                {visualPlan.gate_findings.length > 0 && (
                  <div className="mb-2 text-xs text-gray-600 space-y-0.5">
                    {visualPlan.gate_findings.map((f, i) => (
                      <div key={i} className="text-gray-500">{f}</div>
                    ))}
                  </div>
                )}

                {/* Proposed copy */}
                {(visualPlan.proposed_headline || visualPlan.proposed_support_line) && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Bildtext</p>
                    {visualPlan.proposed_headline && (
                      <p className="text-sm font-semibold text-gray-800">{visualPlan.proposed_headline}</p>
                    )}
                    {visualPlan.proposed_support_line && (
                      <p className="text-xs text-gray-600">{visualPlan.proposed_support_line}</p>
                    )}
                  </div>
                )}

                {/* SVG preview for branded_graphic */}
                {visualPreview?.preview_type === 'branded_graphic_svg' && visualPreview.svg_content && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Intern förhandsvisning</p>
                    <div
                      className="rounded overflow-hidden border border-gray-200 inline-block"
                      dangerouslySetInnerHTML={{ __html: visualPreview.svg_content }}
                    />
                    <p className="text-xs text-gray-400 mt-1">{visualPreview.disclaimer}</p>
                  </div>
                )}

                {/* Concept description for non-branded-graphic */}
                {visualPreview && visualPreview.preview_type === 'concept_description' && (
                  <div className="mb-2 text-xs text-gray-600 bg-white border border-gray-200 rounded p-2">
                    <p className="mb-1">{visualPreview.concept_description}</p>
                    <p className="text-gray-400">{visualPreview.composition_notes}</p>
                    <p className="text-gray-400 mt-1">{visualPreview.disclaimer}</p>
                  </div>
                )}

                {/* Visual lifecycle actions */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  {visualPlan.lifecycle_status !== 'ready' && visualPlan.lifecycle_status !== 'archived' && (
                    <button
                      onClick={() => updateVisualLifecycle('ready')}
                      className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Godkänn visuell plan
                    </button>
                  )}
                  {visualPlan.lifecycle_status !== 'held' && visualPlan.lifecycle_status !== 'archived' && (
                    <button
                      onClick={() => updateVisualLifecycle('held')}
                      className="text-xs px-3 py-1 rounded bg-amber-500 text-white hover:bg-amber-600"
                    >
                      Håll visuell plan
                    </button>
                  )}
                </div>

                {/* Visual feedback */}
                <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">Visuell feedback</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(Object.entries(VISUAL_FEEDBACK_LABELS) as [VisualFeedbackSignal, string][]).map(([sig, lbl]) => (
                    <button
                      key={sig}
                      onClick={() => toggleVisualFeedback(sig)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        selectedVisualFeedback.includes(sig)
                          ? 'bg-slate-700 text-white border-slate-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                {selectedVisualFeedback.length > 0 && (
                  <button
                    onClick={saveVisualFeedback}
                    className="text-xs px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-800"
                  >
                    Spara visuell feedback ({selectedVisualFeedback.length})
                  </button>
                )}
              </div>
            )}

            {visualPlan && !visualExpanded && (
              <p className="text-xs text-gray-400">
                Plan genererad — familj: <strong>{visualPlan.visual_family.replace(/_/g, ' ')}</strong>,
                utfall: <strong>{GATE_OUTCOME_LABELS[visualPlan.gate_outcome]?.label}</strong>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Facebook Publishing Section ───────────────────────────────────── */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">
            Facebook-publicering
          </p>

          {/* Entry status */}
          {fbEntry && (
            <div className="mb-2 flex flex-wrap gap-2 items-center">
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                fbEntry.publish_status === 'published'    ? 'bg-green-100 text-green-700' :
                fbEntry.publish_status === 'scheduled'    ? 'bg-blue-100 text-blue-700'  :
                fbEntry.publish_status === 'due'          ? 'bg-blue-200 text-blue-800'  :
                fbEntry.publish_status === 'eligible'     ? 'bg-teal-100 text-teal-700'  :
                fbEntry.publish_status === 'blocked'      ? 'bg-red-100 text-red-700'    :
                fbEntry.publish_status === 'failed'       ? 'bg-red-200 text-red-800'    :
                'bg-gray-100 text-gray-600'
              }`}>
                {fbEntry.publish_status.replace(/_/g, ' ')}
              </span>
              {fbEntry.scheduled_at && (
                <span className="text-xs text-gray-500">
                  Schemalagd: {new Date(fbEntry.scheduled_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
              {fbEntry.published_at && (
                <span className="text-xs text-green-600">
                  Publicerad: {new Date(fbEntry.published_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
              {fbEntry.facebook_post_id && (
                <span className="text-xs font-mono text-gray-400">ID: {fbEntry.facebook_post_id}</span>
              )}
            </div>
          )}

          {/* Blocked reason */}
          {fbEntry?.blocked_reason && (
            <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
              <span className="font-semibold">Blockerad ({fbEntry.blocked_policy_rule ?? 'okänd regel'}):</span>{' '}
              {fbEntry.blocked_reason}
            </div>
          )}
          {fbEntry?.failure_reason && (
            <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
              <span className="font-semibold">Fel ({fbEntry.failure_count} försök):</span>{' '}
              {fbEntry.failure_reason}
            </div>
          )}

          {/* Adapted copy preview */}
          {fbEntry?.facebook_copy && fbEntry.publish_status !== 'published' && (
            <div className="mb-2">
              <p className="text-xs text-gray-400 mb-1">Facebook-anpassad kopia:</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 border border-gray-200 rounded p-2">
                {fbEntry.facebook_copy}
              </pre>
            </div>
          )}

          {/* Autonomous queue note */}
          {fbEntry === null && (
            <p className="text-xs text-gray-400 mb-1">
              Inte i köen — systemet köar automatiskt vid nästa körning (09:00 UTC).
            </p>
          )}

          {/* Controlled first-post — requires Meta activation */}
          {!fbEntry && card.lifecycle_status === 'ready' && card.risk_level === 'low' && !card.created_by?.startsWith('dry_run_') && !isRegulatoryHold(card.blocked_reason) && (
            <div className="mt-1 border border-blue-200 rounded p-2 bg-blue-50">
              <p className="text-xs text-blue-700 font-medium mb-1">Publicera nu (kontrollerat)</p>
              <p className="text-xs text-blue-600 mb-2">
                Publicerar direkt via Graph API. Kräver FACEBOOK_PAGE_API_ENABLED=true. Kör alla 19 policykontroller. Ingen automatisk upprepning.
              </p>
              <button
                onClick={publishFirstPost}
                disabled={firstPostLoading}
                className="text-xs px-3 py-1 rounded border border-blue-500 text-blue-700 bg-white hover:bg-blue-100 disabled:opacity-50"
              >
                {firstPostLoading ? 'Publicerar…' : 'Publicera nu'}
              </button>
              {firstPostResult && (
                <p className={`mt-1 text-xs ${firstPostResult.ok ? 'text-green-700' : 'text-red-600'}`}>
                  {firstPostResult.message}
                </p>
              )}
            </div>
          )}

          {/* Manual override — exception use only */}
          {!fbEntry && card.lifecycle_status === 'ready' && card.risk_level === 'low' && !card.created_by?.startsWith('dry_run_') && !isRegulatoryHold(card.blocked_reason) && (
            <div className="mt-1 border border-dashed border-gray-300 rounded p-2">
              <p className="text-xs text-gray-400 mb-1">
                Override — köa manuellt om systemet inte plockat upp kortet:
              </p>
              <button
                onClick={enqueueFacebook}
                disabled={fbLoading}
                className="text-xs px-3 py-1 rounded border border-gray-400 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {fbLoading ? 'Köar…' : 'Manuell kö (override)'}
              </button>
              {fbError && (
                <p className="mt-1 text-xs text-red-600">{fbError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContentCockpitPage() {
  const [week, setWeek] = useState(getCurrentISOWeek);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Autonomous queue global status
  const [fbStats, setFbStats] = useState<FbGlobalStats | null>(null);
  const [planRunning, setPlanRunning] = useState(false);
  const [planMsg, setPlanMsg] = useState<string | null>(null);

  // Load autonomous queue global stats on mount
  useEffect(() => {
    fetch('/api/admin/content-facebook-queue?global=true')
      .then(r => r.ok ? r.json() : null)
      .then((data: FbGlobalStats | null) => { if (data) setFbStats(data); })
      .catch(() => {});
  }, []);

  async function runQueuePlanner() {
    setPlanRunning(true);
    setPlanMsg(null);
    try {
      const res = await fetch('/api/admin/content-facebook-queue/plan', { method: 'POST' });
      const data = await res.json() as { queued?: number; skipped?: number; skipped_emergency_pause?: boolean; error?: string };
      if (res.ok) {
        setPlanMsg(`Köplanering klar — ${data.queued ?? 0} kort köade, ${data.skipped ?? 0} hoppades över.`);
        // Refresh stats
        fetch('/api/admin/content-facebook-queue?global=true')
          .then(r => r.ok ? r.json() : null)
          .then((stats: FbGlobalStats | null) => { if (stats) setFbStats(stats); })
          .catch(() => {});
      } else {
        setPlanMsg(`Fel: ${data.error ?? 'Okänt fel'}`);
      }
    } catch (e) {
      setPlanMsg(String(e));
    } finally {
      setPlanRunning(false);
      setTimeout(() => setPlanMsg(null), 8000);
    }
  }

  // Load existing cards for the week
  const loadWeek = useCallback(async (w: string) => {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch(`/api/admin/content-planner?week=${w}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Kunde inte ladda veckan');
        return;
      }
      if (data.cards && data.cards.length > 0) {
        // Reconstruct a plan-like object from existing DB cards
        setPlan({
          week: data.week,
          generated_at: '',
          cta_count: data.cards.filter((c: CardSummary) => c.cta_type !== 'none').length,
          pillar_ratio: {},
          warnings: [],
          cards: data.cards,
        });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate new plan
  const generatePlan = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/content-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week, created_by: 'founder' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Genereringen misslyckades');
        return;
      }
      setPlan(data.plan);
      if (data.errors?.length > 0) {
        setError(`Varningar: ${data.errors.join('; ')}`);
      } else {
        setSuccessMsg(`Plan genererad — ${data.plan.cards.length} kortinlägg`);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  }, [week]);

  // Update card status
  const handleStatusChange = useCallback(async (id: string, status: LifecycleStatus) => {
    const res = await fetch('/api/admin/content-planner', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: id, lifecycle_status: status }),
    });
    if (res.ok) {
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.map((c) =>
                c.id === id ? { ...c, lifecycle_status: status } : c
              ),
            }
          : prev
      );
    }
  }, []);

  // Save feedback
  const handleFeedback = useCallback(async (id: string, signals: string[]) => {
    await fetch('/api/admin/content-planner', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: id, feedback_signals: signals }),
    });
    setSuccessMsg(`Feedback sparad för kort ${id.slice(0, 8)}…`);
    setTimeout(() => setSuccessMsg(null), 3000);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Content Cockpit</h1>
      <p className="text-sm text-gray-500 mb-4">
        Innehållsmotor med autonom Facebook-köläggning. Redo kort med låg risk köas och publiceras utan grundargodkännande.
      </p>

      {/* Autonomous Facebook queue status */}
      {fbStats !== null && (
        <div className={`mb-6 p-4 rounded-lg border text-sm ${fbStats.emergency_pause ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${fbStats.emergency_pause ? 'text-red-700' : 'text-green-700'}`}>
                Facebook-kö: {fbStats.emergency_pause ? 'NÖDPAUS AKTIV' : 'Autonom — aktiv'}
              </span>
              {!fbStats.emergency_pause && (
                <span className="text-xs text-gray-500">
                  {fbStats.posts_this_week}/{fbStats.max_posts_per_week} inlägg denna vecka
                  {' · '}CTA: {fbStats.cta_this_week}/{fbStats.max_cta_per_week}
                  {' · '}{fbStats.scheduled_count} i kö
                </span>
              )}
            </div>
            <button
              onClick={runQueuePlanner}
              disabled={planRunning || fbStats.emergency_pause}
              className="text-xs px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-40"
            >
              {planRunning ? 'Kör…' : 'Kör köplanering nu'}
            </button>
          </div>
          {fbStats.next_slot && (
            <p className="text-xs text-gray-500">
              Nästa tillgängliga slot: {new Date(fbStats.next_slot).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })} (UTC)
            </p>
          )}
          {fbStats.paused_pillars.length > 0 && (
            <p className="text-xs text-amber-700 mt-1">Pausade pelare: {fbStats.paused_pillars.join(', ')}</p>
          )}
          {fbStats.paused_angles.length > 0 && (
            <p className="text-xs text-amber-700 mt-1">Pausade vinklar: {fbStats.paused_angles.join(', ')}</p>
          )}
          {planMsg && (
            <p className={`text-xs mt-2 font-medium ${planMsg.startsWith('Fel') ? 'text-red-600' : 'text-green-700'}`}>
              {planMsg}
            </p>
          )}
        </div>
      )}

      {/* Week picker */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-700">Vecka (YYYY-WNN)</label>
        <input
          type="text"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          placeholder="2026-W26"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-36"
        />
        <button
          onClick={() => loadWeek(week)}
          disabled={loading}
          className="text-sm px-4 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Laddar…' : 'Ladda vecka'}
        </button>
        <button
          onClick={generatePlan}
          disabled={generating}
          className="text-sm px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {generating ? 'Genererar…' : 'Generera ny plan'}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          {successMsg}
        </div>
      )}

      {plan && (
        <>
          {/* Plan summary */}
          <div className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>Vecka: <strong className="text-gray-900">{plan.week}</strong></span>
              <span>Inlägg: <strong className="text-gray-900">{plan.cards.length}</strong></span>
              <span>CTA: <strong className="text-gray-900">{plan.cta_count}</strong></span>
              {Object.entries(plan.pillar_ratio).map(([p, r]) => (
                <span key={p}>{p}: <strong className="text-gray-900">{(r * 100).toFixed(0)}%</strong></span>
              ))}
            </div>
            {plan.warnings.length > 0 && (
              <div className="mt-2 text-amber-700 text-xs">
                {plan.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
              </div>
            )}
          </div>

          {/* Card list */}
          {plan.cards.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Inga kort för denna vecka. Generera en ny plan.
            </p>
          ) : (
            plan.cards.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                onStatusChange={handleStatusChange}
                onFeedback={handleFeedback}
              />
            ))
          )}
        </>
      )}

      {!plan && !loading && !generating && (
        <div className="text-center py-12 text-sm text-gray-400">
          Välj en vecka och ladda befintliga kort, eller generera en ny plan.
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400">
        <p>Systemet köar automatiskt redo kort med låg risk vid varje körning (09:00 UTC dagligen). Ingen grundargodkännande krävs för rutinmässigt innehåll.</p>
        <p className="mt-1">Regulatory-hållna, dry-run-kort och kort med hög risk blockeras alltid. Grundaren korrigerar efter publicering vid behov.</p>
        <p className="mt-1">Nödpaus och kategoripaus: PATCH /api/admin/content-facebook-queue. Manuell köplanering: POST /api/admin/content-facebook-queue/plan.</p>
      </div>
    </div>
  );
}
