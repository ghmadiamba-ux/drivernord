import { db } from './db';
import { generateFiveDaySequence, readMarketSignalSummary } from './logistikklubbAgent';
import type { MarketSignalSummary } from './logistikklubbAgent';
import { randomUUID } from 'node:crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostStatus =
  | 'draft'
  | 'approved'
  | 'scheduled'
  | 'due'
  | 'published'
  | 'skipped'
  | 'failed';

export interface ScheduledPost {
  id:                   string;
  sequence_id:          string;
  day_number:           number;
  category:             string;
  title:                string;
  post_text:            string;
  suggested_time:       string | null;
  scheduled_at:         string | null;
  status:               PostStatus;
  source_context:       Record<string, unknown> | null;
  risk_note:            string | null;
  approved_by_founder:  boolean;
  approved_at:          string | null;
  published_at:         string | null;
  skipped_at:           string | null;
  failure_reason:       string | null;
  // News relay fields (migration 020 — NULL on community posts)
  source_url:           string | null;
  source_name:          string | null;
  source_published_at:  string | null;
  raw_article_snippet:  string | null;
  is_news_relay:        boolean;
  created_at:           string;
  updated_at:           string;
}

export interface NewScheduledPost {
  sequence_id:    string;
  day_number:     number;
  category:       string;
  title:          string;
  post_text:      string;
  suggested_time: string | null;
  source_context: Record<string, unknown> | null;
  risk_note:      string | null;
  // News relay fields (optional — set only by newsRelayAgent)
  source_url?:          string | null;
  source_name?:         string | null;
  source_published_at?: string | null;
  raw_article_snippet?: string | null;
  is_news_relay?:       boolean;
}

// ─── Pure utilities ───────────────────────────────────────────────────────────

// Valid status transitions: key → allowed next values
const VALID_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  draft:     ['approved', 'skipped'],
  approved:  ['scheduled', 'skipped'],
  scheduled: ['due', 'skipped'],
  due:       ['published', 'skipped', 'failed'],
  published: [],
  skipped:   [],
  failed:    ['scheduled'],
};

export function validateStatusTransition(from: PostStatus, to: PostStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// Slot times for a 5-day sequence (index 0 = Day 1)
const SLOT_TIMES = ['07:30', '10:00', '07:30', '12:00', '09:00'] as const;

export function computeDefaultScheduledTimes(now: Date): Date[] {
  const day1 = new Date(now);
  day1.setHours(7, 30, 0, 0);
  if (day1 <= now) {
    day1.setDate(day1.getDate() + 1);
  }

  return SLOT_TIMES.map((time, idx) => {
    const d = new Date(day1);
    d.setDate(d.getDate() + idx);
    const [hh, mm] = time.split(':').map(Number);
    d.setHours(hh!, mm!, 0, 0);
    return d;
  });
}

// ─── DB store ─────────────────────────────────────────────────────────────────

const TABLE = 'logistikklubb_scheduled_posts';

export async function getScheduledPosts(filter?: {
  status?: PostStatus | PostStatus[];
}): Promise<ScheduledPost[]> {
  let q = db.from(TABLE).select('*').order('day_number', { ascending: true });

  if (filter?.status) {
    if (Array.isArray(filter.status)) {
      q = q.in('status', filter.status);
    } else {
      q = q.eq('status', filter.status);
    }
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledPost[];
}

export async function getScheduledPostById(id: string): Promise<ScheduledPost | null> {
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return data as ScheduledPost;
}

export async function saveScheduledPosts(posts: NewScheduledPost[]): Promise<ScheduledPost[]> {
  const now = new Date().toISOString();
  const rows = posts.map((p) => ({
    id:                  randomUUID(),
    sequence_id:         p.sequence_id,
    day_number:          p.day_number,
    category:            p.category,
    title:               p.title,
    post_text:           p.post_text,
    suggested_time:      p.suggested_time,
    scheduled_at:        null,
    status:              'draft' as PostStatus,
    source_context:      p.source_context,
    risk_note:           p.risk_note,
    approved_by_founder: false,
    approved_at:         null,
    published_at:        null,
    skipped_at:          null,
    failure_reason:      null,
    source_url:          p.source_url          ?? null,
    source_name:         p.source_name         ?? null,
    source_published_at: p.source_published_at ?? null,
    raw_article_snippet: p.raw_article_snippet ?? null,
    is_news_relay:       p.is_news_relay        ?? false,
    created_at:          now,
    updated_at:          now,
  }));

  const { data, error } = await db.from(TABLE).insert(rows).select();
  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledPost[];
}

export async function approvePost(id: string): Promise<ScheduledPost> {
  const post = await getScheduledPostById(id);
  if (!post) throw new Error(`Post ${id} not found`);
  if (!validateStatusTransition(post.status, 'approved')) {
    throw new Error(`Cannot approve post with status '${post.status}'`);
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from(TABLE)
    .update({ status: 'approved', approved_by_founder: true, approved_at: now, updated_at: now })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduledPost;
}

export async function schedulePost(id: string, scheduledAt: Date): Promise<ScheduledPost> {
  const post = await getScheduledPostById(id);
  if (!post) throw new Error(`Post ${id} not found`);
  if (!validateStatusTransition(post.status, 'scheduled')) {
    throw new Error(`Cannot schedule post with status '${post.status}'`);
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from(TABLE)
    .update({ status: 'scheduled', scheduled_at: scheduledAt.toISOString(), updated_at: now })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduledPost;
}

export async function markPostDue(id: string): Promise<ScheduledPost> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from(TABLE)
    .update({ status: 'due', updated_at: now })
    .eq('id', id)
    .eq('status', 'scheduled')
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduledPost;
}

export async function markPostPublished(id: string): Promise<ScheduledPost> {
  const post = await getScheduledPostById(id);
  if (!post) throw new Error(`Post ${id} not found`);
  if (!validateStatusTransition(post.status, 'published')) {
    throw new Error(`Cannot mark published from status '${post.status}'`);
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from(TABLE)
    .update({ status: 'published', published_at: now, updated_at: now })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduledPost;
}

export async function skipPost(id: string): Promise<ScheduledPost> {
  const post = await getScheduledPostById(id);
  if (!post) throw new Error(`Post ${id} not found`);
  if (!validateStatusTransition(post.status, 'skipped')) {
    throw new Error(`Cannot skip post with status '${post.status}'`);
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from(TABLE)
    .update({ status: 'skipped', skipped_at: now, updated_at: now })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduledPost;
}

export async function findDuePosts(): Promise<ScheduledPost[]> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledPost[];
}

// Compound: generate 5-day sequence from agent, persist as draft posts.
// Returns the sequence_id and saved posts.
export async function generateAndSaveSequence(signals?: MarketSignalSummary): Promise<{
  sequence_id: string;
  posts: ScheduledPost[];
}> {
  const resolvedSignals = signals ?? (await readMarketSignalSummary());
  const sequence = generateFiveDaySequence(resolvedSignals);
  const sequenceId = randomUUID();

  const newPosts: NewScheduledPost[] = sequence.days.map((day) => ({
    sequence_id:    sequenceId,
    day_number:     day.day,
    category:       day.category,
    title:          day.title,
    post_text:      day.text,
    suggested_time: day.suggested_time,
    source_context: resolvedSignals as unknown as Record<string, unknown>,
    risk_note:      day.risk_note ?? null,
  }));

  const posts = await saveScheduledPosts(newPosts);
  return { sequence_id: sequenceId, posts };
}
