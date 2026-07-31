// lib/outreachQueue.ts
// DB layer for the outreach_email_queue table.
// Requires migration 017 to be applied to production Supabase.
// See docs/sql/migration-017-outreach-email-queue.sql

import { db } from './db';

// ── Types ─────────────────────────────────────────────────────────────────────

export type QueueStatus =
  | 'draft'
  | 'approved'
  | 'scheduled'
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'replied';

export type SendMode = 'dry_run' | 'founder_approval' | 'controlled_auto_send';

export interface OutreachQueueItem {
  id:                    string;
  target_id:             string | null;
  company_name_snapshot: string;
  recipient_email:       string;
  recipient_name:        string | null;
  subject:               string;
  body:                  string;
  readiness_category:    string;
  safe_claim_used:       string | null;
  risk_notes:            string | null;
  status:                QueueStatus;
  provider:              'zoho';
  provider_message_id:   string | null;
  scheduled_send_at:     string | null;
  sent_at:               string | null;
  reply_detected_at:     string | null;
  reply_classification:  string | null;
  created_by_agent:      boolean;
  approved_by_founder:   boolean;
  automation_used:       boolean;
  send_mode:             SendMode;
  created_at:            string;
  updated_at:            string;
}

export type NewQueueItem = Omit<OutreachQueueItem, 'id' | 'created_at' | 'updated_at'>;

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getQueueItemById(id: string): Promise<OutreachQueueItem | null> {
  const { data, error } = await db
    .from('outreach_email_queue')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as unknown as OutreachQueueItem;
}

export async function insertQueueItem(item: NewQueueItem): Promise<OutreachQueueItem | null> {
  const { data, error } = await db
    .from('outreach_email_queue')
    .insert(item)
    .select()
    .single();
  if (error) {
    console.error('[outreachQueue] insert failed:', error.message);
    return null;
  }
  return data as unknown as OutreachQueueItem;
}

export async function getQueueItems(
  filter?: { status?: QueueStatus | QueueStatus[]; send_mode?: SendMode },
): Promise<OutreachQueueItem[]> {
  let q = db.from('outreach_email_queue').select('*');
  if (filter?.status) {
    if (Array.isArray(filter.status)) {
      q = q.in('status', filter.status);
    } else {
      q = q.eq('status', filter.status);
    }
  }
  if (filter?.send_mode) q = q.eq('send_mode', filter.send_mode);
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) {
    console.error('[outreachQueue] fetch failed:', error.message);
    return [];
  }
  return (data ?? []) as unknown as OutreachQueueItem[];
}

export async function approveQueueItem(id: string): Promise<boolean> {
  const { error } = await db
    .from('outreach_email_queue')
    .update({ approved_by_founder: true, status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function scheduleQueueItem(id: string, scheduledSendAt: string): Promise<boolean> {
  const { error } = await db
    .from('outreach_email_queue')
    .update({ status: 'scheduled', scheduled_send_at: scheduledSendAt, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function markQueueItemSent(
  id: string,
  providerMessageId: string,
  automationUsed = false,
): Promise<boolean> {
  const { error } = await db
    .from('outreach_email_queue')
    .update({
      status:              'sent',
      provider_message_id: providerMessageId,
      automation_used:     automationUsed,
      sent_at:             new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    })
    .eq('id', id);
  return !error;
}

export async function markQueueItemFailed(id: string, errorNote: string): Promise<boolean> {
  const { error } = await db
    .from('outreach_email_queue')
    .update({
      status:     'failed',
      risk_notes: errorNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  return !error;
}

export async function updateReplyClassification(
  id: string,
  classification: string,
): Promise<boolean> {
  const { error } = await db
    .from('outreach_email_queue')
    .update({
      status:               'replied',
      reply_classification: classification,
      reply_detected_at:    new Date().toISOString(),
      updated_at:           new Date().toISOString(),
    })
    .eq('id', id);
  return !error;
}

// ── Rate limit check via DB ───────────────────────────────────────────────────

export async function countSentInLastHour(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from('outreach_email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', oneHourAgo);
  if (error) return 0;
  return count ?? 0;
}
