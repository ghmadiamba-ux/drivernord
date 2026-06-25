'use client';

import { useState, useCallback } from 'react';

// ─── Types (inline to avoid server imports in client component) ───────────────

type RiskLevel = 'low' | 'high';
type LifecycleStatus = 'draft' | 'ready' | 'held' | 'archived';
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
  // Reference library learning signals
  | 'mechanism_selection_correct' | 'mechanism_selection_wrong'
  | 'mode_trust_organic_preferred' | 'mode_performance_preferred'
  | 'channel_fit_accurate' | 'mechanism_add_to_rotation' | 'mechanism_remove_from_rotation';

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
          </div>

          {card.blocked_reason && (
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
      <p className="text-sm text-gray-500 mb-6">
        Intern veckoplan — utkast genereras lokalt, publicering sker manuellt av grundaren.
      </p>

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
        <p>Innehåll publiceras aldrig automatiskt. All publicering sker manuellt av grundaren.</p>
        <p className="mt-1">Ingen Facebook-koppling aktiv. Kort i status "Redo" är godkända för manuell kopiering.</p>
      </div>
    </div>
  );
}
