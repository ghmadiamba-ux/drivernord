// app/api/admin/content-planner/route.ts
//
// Internal weekly content plan generation API.
// Dry-run only — no external publishing, no Facebook, no outreach.
//
// POST /api/admin/content-planner
// Body: { week: "YYYY-WNN", created_by?: string }
// Returns: { plan, summary, errors }
//
// GET /api/admin/content-planner?week=YYYY-WNN
// Returns: existing cards for that week from DB

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateWeeklyPlan, summarizePlan } from '@/lib/content/planner';
import { logAction } from '@/lib/systemActions';
import type { ContentMemoryEntry } from '@/lib/content/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ISO_WEEK_RE = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

function validateWeek(week: string | null): { valid: boolean; error?: string } {
  if (!week) return { valid: false, error: 'week parameter is required (YYYY-WNN)' };
  if (!ISO_WEEK_RE.test(week)) return { valid: false, error: `week must be in YYYY-WNN format, got: ${week}` };
  return { valid: true };
}

// ─── Load history from DB ─────────────────────────────────────────────────────

async function loadHistory(): Promise<ContentMemoryEntry[]> {
  const { data, error } = await db
    .from('logistikklubb_scheduled_posts')
    .select('content_topic_signature, content_angle_signature, content_pillar, content_cta_type, content_hashtag_set, post_text, scheduled_at')
    .not('content_topic_signature', 'is', null)
    .order('scheduled_at', { ascending: false })
    .limit(200);

  if (error || !data) return [];

  return data
    .filter((row) => row.content_topic_signature && row.content_pillar)
    .map((row) => ({
      topic_signature: row.content_topic_signature as string,
      angle_signature: row.content_angle_signature as string ?? '',
      content_pillar:  row.content_pillar as ContentMemoryEntry['content_pillar'],
      format:          'text_post' as ContentMemoryEntry['format'],
      cta_type:        (row.content_cta_type ?? 'none') as ContentMemoryEntry['cta_type'],
      hashtag_set:     (row.content_hashtag_set ?? []) as string[],
      post_text:       row.post_text ?? '',
      planned_date:    (row.scheduled_at as string).slice(0, 10),
    }));
}

// ─── POST — generate plan ─────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { week?: string; created_by?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const weekCheck = validateWeek(body.week ?? null);
  if (!weekCheck.valid) {
    return NextResponse.json({ error: weekCheck.error }, { status: 400 });
  }

  const iso_week = body.week!;
  const created_by = body.created_by ?? 'admin';

  const history = await loadHistory();
  const { plan, errors } = generateWeeklyPlan({ iso_week, history, created_by });
  const summary = summarizePlan(plan);

  // Persist cards to DB
  const persistErrors: string[] = [];
  for (const card of plan.cards) {
    const { error: insertError } = await db
      .from('content_campaign_cards')
      .upsert({
        id:                  card.id,
        objective:           card.objective,
        target_audience:     card.target_audience,
        source_basis:        card.source_basis,
        driver_insight:      card.driver_insight,
        content_pillar:      card.content_pillar,
        creative_angle:      card.creative_angle,
        emotional_tone:      card.emotional_tone,
        format:              card.format,
        cta_type:            card.cta_type,
        planned_channel:     card.planned_channel,
        planned_week:        card.planned_week,
        planned_day_of_week: card.planned_day_of_week,
        suggested_slot_time: card.suggested_slot_time,
        topic_signature:     card.topic_signature,
        angle_signature:     card.angle_signature,
        draft_text:          card.draft_text,
        hashtag_set:         card.hashtag_set,
        risk_level:          card.risk_level,
        lifecycle_status:    card.lifecycle_status,
        blocked_reason:      card.blocked_reason,
        created_by:          card.created_by,
        created_at:          card.created_at.toISOString(),
        updated_at:          card.updated_at.toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      persistErrors.push(`Card ${card.id}: ${insertError.message}`);
    }
  }

  await logAction({
    action_type:  'content_plan_generated',
    triggered_by: created_by,
    target_type:  'content_weekly_plan',
    target_id:    iso_week,
    status:       persistErrors.length > 0 ? 'failed' : 'completed',
    input:        { week: iso_week },
    result: {
      total:     summary.total,
      held:      summary.held,
      high_risk: summary.high_risk,
      cta_count: summary.cta_count,
      warnings:  summary.warnings.length,
    },
    error: persistErrors.length > 0 ? persistErrors.join('; ') : undefined,
  });

  return NextResponse.json({
    plan: {
      week:         plan.week,
      generated_at: plan.generated_at,
      cta_count:    plan.cta_count,
      pillar_ratio: plan.pillar_ratio,
      warnings:     plan.warnings,
      cards: plan.cards.map((c) => ({
        id:               c.id,
        label:            `${dayLabel(c.planned_day_of_week)} — ${c.content_pillar}/${c.creative_angle}`,
        content_pillar:   c.content_pillar,
        creative_angle:   c.creative_angle,
        target_audience:  c.target_audience,
        format:           c.format,
        cta_type:         c.cta_type,
        risk_level:       c.risk_level,
        lifecycle_status: c.lifecycle_status,
        blocked_reason:   c.blocked_reason,
        draft_text:       c.draft_text,
        hashtag_set:      c.hashtag_set,
        planned_day:      c.planned_day_of_week,
        planned_week:     c.planned_week,
        suggested_slot_time: c.suggested_slot_time,
      })),
    },
    summary,
    errors:        [...errors, ...persistErrors],
  });
}

// ─── GET — fetch existing cards for a week ───────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week');

  const weekCheck = validateWeek(week);
  if (!weekCheck.valid) {
    return NextResponse.json({ error: weekCheck.error }, { status: 400 });
  }

  const { data, error } = await db
    .from('content_campaign_cards')
    .select('*')
    .eq('planned_week', week)
    .order('planned_day_of_week', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ week, cards: data ?? [] });
}

// ─── PATCH — update card lifecycle status ────────────────────────────────────

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: { card_id?: string; lifecycle_status?: string; feedback_signals?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.card_id) {
    return NextResponse.json({ error: 'card_id is required' }, { status: 400 });
  }

  const validStatuses = ['draft', 'ready', 'held', 'archived'];
  if (body.lifecycle_status && !validStatuses.includes(body.lifecycle_status)) {
    return NextResponse.json({ error: `Invalid lifecycle_status: ${body.lifecycle_status}` }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.lifecycle_status) updates.lifecycle_status = body.lifecycle_status;
  if (body.feedback_signals) updates.feedback_signals = body.feedback_signals;

  const { error } = await db
    .from('content_campaign_cards')
    .update(updates)
    .eq('id', body.card_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.lifecycle_status) {
    await logAction({
      action_type:  body.lifecycle_status === 'ready' ? 'content_card_approved'
                  : body.lifecycle_status === 'held'  ? 'content_card_held'
                  : 'content_card_archived',
      triggered_by: 'admin',
      target_type:  'content_campaign_card',
      target_id:    body.card_id,
      status:       'completed',
      input:  { lifecycle_status: body.lifecycle_status },
      result: {},
    });
  }

  if (body.feedback_signals) {
    await logAction({
      action_type:  'content_feedback_recorded',
      triggered_by: 'admin',
      target_type:  'content_campaign_card',
      target_id:    body.card_id,
      status:       'completed',
      input:  { feedback_signals: body.feedback_signals },
      result: {},
    });
  }

  return NextResponse.json({ success: true });
}

// ─── Day label helper ─────────────────────────────────────────────────────────

function dayLabel(day: number | undefined): string {
  const labels: Record<number, string> = {
    1: 'Måndag', 2: 'Tisdag', 3: 'Onsdag', 4: 'Torsdag',
    5: 'Fredag', 6: 'Lördag', 7: 'Söndag',
  };
  return labels[day ?? 0] ?? `Dag ${day}`;
}
