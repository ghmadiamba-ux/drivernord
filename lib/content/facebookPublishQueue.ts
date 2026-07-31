// lib/content/facebookPublishQueue.ts
//
// Facebook Content Bridge V1 — Queue DB Operations
//
// All reads and writes to content_facebook_publish_queue and
// content_facebook_publish_config. Uses service-role DB client.
//
// BOUNDARIES:
//   ✓ Reads/writes content_facebook_publish_queue
//   ✓ Reads/writes content_facebook_publish_config
//   ✓ Reads content_campaign_cards (read-only — never modifies cards)
//   ✗ Does NOT call the Graph API
//   ✗ Does NOT publish anything externally
//   ✗ Does NOT evaluate publishability (see facebookPublishPolicy.ts)

import { db } from '../db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FbPublishStatus =
  | 'pending_check'
  | 'eligible'
  | 'blocked'
  | 'queued'
  | 'scheduled'
  | 'due'
  | 'published'
  | 'failed';

export interface FbQueueEntry {
  id:                   string;
  card_id:              string;
  publish_status:       FbPublishStatus;
  blocked_reason:       string | null;
  blocked_policy_rule:  string | null;
  facebook_copy:        string | null;
  facebook_hashtags:    string[];
  scheduled_at:         string | null;
  due_at:               string | null;
  facebook_post_id:     string | null;
  published_at:         string | null;
  failure_reason:       string | null;
  failure_count:        number;
  eligible_checked_at:  string | null;
  queued_by:            string;
  created_at:           string;
  updated_at:           string;
}

export interface FbPublishConfig {
  id:                 number;
  emergency_pause:    boolean;
  paused_pillars:     string[];
  paused_angles:      string[];
  max_posts_per_day:  number;
  max_posts_per_week: number;
  max_cta_per_week:   number;
  updated_at:         string;
  updated_by:         string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getPublishConfig(): Promise<FbPublishConfig> {
  const { data, error } = await db
    .from('content_facebook_publish_config')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    throw new Error(`[fbQueue] getPublishConfig failed: ${error?.message ?? 'no row'}`);
  }
  return data as FbPublishConfig;
}

export async function setEmergencyPause(paused: boolean, by = 'founder'): Promise<void> {
  const { error } = await db
    .from('content_facebook_publish_config')
    .update({ emergency_pause: paused, updated_at: new Date().toISOString(), updated_by: by })
    .eq('id', 1);

  if (error) throw new Error(`[fbQueue] setEmergencyPause failed: ${error.message}`);
}

export async function setPausedPillars(pillars: string[], by = 'founder'): Promise<void> {
  const { error } = await db
    .from('content_facebook_publish_config')
    .update({ paused_pillars: pillars, updated_at: new Date().toISOString(), updated_by: by })
    .eq('id', 1);

  if (error) throw new Error(`[fbQueue] setPausedPillars failed: ${error.message}`);
}

// ─── Rate-limit counters ──────────────────────────────────────────────────────

// Counts published posts today (UTC midnight to now)
export async function getFbPostsToday(): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const { count, error } = await db
    .from('system_actions')
    .select('*', { count: 'exact', head: true })
    .eq('action_type', 'content_facebook_post_published')
    .gte('created_at', start.toISOString());

  if (error) {
    console.error('[fbQueue] getFbPostsToday error:', error.message);
    return 0;
  }
  return count ?? 0;
}

// Counts published posts this week (UTC Monday 00:00 to now)
export async function getFbPostsThisWeek(): Promise<number> {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await db
    .from('system_actions')
    .select('*', { count: 'exact', head: true })
    .eq('action_type', 'content_facebook_post_published')
    .gte('created_at', weekStart.toISOString());

  if (error) {
    console.error('[fbQueue] getFbPostsThisWeek error:', error.message);
    return 0;
  }
  return count ?? 0;
}

// Counts CTA posts published this week via Facebook content bridge
export async function getFbCtaThisWeek(): Promise<number> {
  const now = new Date();
  const day = now.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await db
    .from('system_actions')
    .select('*', { count: 'exact', head: true })
    .eq('action_type', 'content_facebook_post_published')
    .eq('result->>is_cta', 'true')
    .gte('created_at', weekStart.toISOString());

  if (error) {
    console.error('[fbQueue] getFbCtaThisWeek error:', error.message);
    return 0;
  }
  return count ?? 0;
}

// Returns topic_signatures published to Facebook in the last N days
export async function getRecentTopicSignatures(lookbackDays = 14): Promise<string[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - lookbackDays);
  since.setUTCHours(0, 0, 0, 0);

  const { data, error } = await db
    .from('system_actions')
    .select('result')
    .eq('action_type', 'content_facebook_post_published')
    .gte('created_at', since.toISOString());

  if (error || !data) return [];

  const sigs: string[] = [];
  for (const row of data) {
    const sig = (row.result as Record<string, unknown>)?.topic_signature;
    if (typeof sig === 'string' && sig) sigs.push(sig);
  }
  return sigs;
}

// ─── Queue reads ──────────────────────────────────────────────────────────────

export async function getQueueEntry(id: string): Promise<FbQueueEntry | null> {
  const { data, error } = await db
    .from('content_facebook_publish_queue')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`[fbQueue] getQueueEntry failed: ${error.message}`);
  }
  return data as FbQueueEntry;
}

export async function getQueueEntryByCardId(cardId: string): Promise<FbQueueEntry | null> {
  const { data, error } = await db
    .from('content_facebook_publish_queue')
    .select('*')
    .eq('card_id', cardId)
    .not('publish_status', 'in', '("published","failed")')
    .maybeSingle();

  if (error) throw new Error(`[fbQueue] getQueueEntryByCardId failed: ${error.message}`);
  return data as FbQueueEntry | null;
}

export async function getDueEntries(): Promise<FbQueueEntry[]> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('content_facebook_publish_queue')
    .select('*')
    .eq('publish_status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true });

  if (error) throw new Error(`[fbQueue] getDueEntries failed: ${error.message}`);
  return (data ?? []) as FbQueueEntry[];
}

export async function getEntriesByStatus(status: FbPublishStatus | FbPublishStatus[]): Promise<FbQueueEntry[]> {
  let q = db.from('content_facebook_publish_queue').select('*');
  if (Array.isArray(status)) {
    q = q.in('publish_status', status);
  } else {
    q = q.eq('publish_status', status);
  }
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw new Error(`[fbQueue] getEntriesByStatus failed: ${error.message}`);
  return (data ?? []) as FbQueueEntry[];
}

// ─── Queue writes ─────────────────────────────────────────────────────────────

/**
 * Creates a new queue entry for a card in pending_check state.
 * Throws if an active entry already exists (enforced by unique index).
 */
export async function createQueueEntry(
  cardId: string,
  queuedBy: 'system' | 'founder' = 'system',
): Promise<FbQueueEntry> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('content_facebook_publish_queue')
    .insert({
      card_id:        cardId,
      publish_status: 'pending_check',
      queued_by:      queuedBy,
      created_at:     now,
      updated_at:     now,
    })
    .select()
    .single();

  if (error) throw new Error(`[fbQueue] createQueueEntry failed: ${error.message}`);
  return data as FbQueueEntry;
}

/**
 * Marks an entry as eligible after passing all policy checks.
 */
export async function markEligible(
  id: string,
  facebookCopy: string,
  facebookHashtags: string[],
): Promise<FbQueueEntry> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('content_facebook_publish_queue')
    .update({
      publish_status:      'eligible',
      blocked_reason:      null,
      blocked_policy_rule: null,
      facebook_copy:       facebookCopy,
      facebook_hashtags:   facebookHashtags,
      eligible_checked_at: now,
      updated_at:          now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`[fbQueue] markEligible failed: ${error.message}`);
  return data as FbQueueEntry;
}

/**
 * Marks an entry as blocked with the reason and policy rule that triggered it.
 */
export async function markBlocked(
  id: string,
  reason: string,
  policyRule: string | null,
): Promise<FbQueueEntry> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('content_facebook_publish_queue')
    .update({
      publish_status:      'blocked',
      blocked_reason:      reason,
      blocked_policy_rule: policyRule,
      eligible_checked_at: now,
      updated_at:          now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`[fbQueue] markBlocked failed: ${error.message}`);
  return data as FbQueueEntry;
}

/**
 * Queues an eligible entry and assigns a scheduled_at time.
 */
export async function scheduleEntry(id: string, scheduledAt: Date): Promise<FbQueueEntry> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('content_facebook_publish_queue')
    .update({
      publish_status: 'scheduled',
      scheduled_at:   scheduledAt.toISOString(),
      updated_at:     now,
    })
    .eq('id', id)
    .in('publish_status', ['eligible', 'queued'])
    .select()
    .single();

  if (error) throw new Error(`[fbQueue] scheduleEntry failed: ${error.message}`);
  return data as FbQueueEntry;
}

/**
 * Marks a scheduled entry as due when cron picks it up.
 */
export async function markDue(id: string): Promise<FbQueueEntry> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('content_facebook_publish_queue')
    .update({ publish_status: 'due', due_at: now, updated_at: now })
    .eq('id', id)
    .eq('publish_status', 'scheduled')
    .select()
    .single();

  if (error) throw new Error(`[fbQueue] markDue failed: ${error.message}`);
  return data as FbQueueEntry;
}

/**
 * Records a successful Facebook publication.
 */
export async function markPublished(id: string, facebookPostId: string): Promise<FbQueueEntry> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('content_facebook_publish_queue')
    .update({
      publish_status:  'published',
      facebook_post_id: facebookPostId,
      published_at:    now,
      failure_reason:  null,
      updated_at:      now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`[fbQueue] markPublished failed: ${error.message}`);
  return data as FbQueueEntry;
}

/**
 * Records a publication failure. Increments failure_count.
 * Entry remains in 'failed' state; caller may reschedule after investigation.
 */
export async function markFailed(id: string, reason: string): Promise<FbQueueEntry> {
  const now = new Date().toISOString();

  // Fetch current failure_count first
  const current = await getQueueEntry(id);
  const failureCount = (current?.failure_count ?? 0) + 1;

  const { data, error } = await db
    .from('content_facebook_publish_queue')
    .update({
      publish_status: 'failed',
      failure_reason: reason,
      failure_count:  failureCount,
      updated_at:     now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`[fbQueue] markFailed failed: ${error.message}`);
  return data as FbQueueEntry;
}
