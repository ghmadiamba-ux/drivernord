import { randomUUID } from 'node:crypto';
import { db } from './db';

export type ActionType =
  | 'driver_ingested'
  | 'need_ingested'
  | 'match_run'
  | 'shortlist_created'
  | 'contact_suggested'
  | 'contact_sent'
  | 'contact_skipped'
  | 'contact_confirmed'
  | 'follow_up_triggered'
  | 'follow_up_confirmed'
  | 'follow_up_sent'
  | 'follow_up_skipped'
  | 'override_cancelled'
  | 'override_retried';

export type ActionStatus = 'pending' | 'approved' | 'completed' | 'failed' | 'cancelled';

export type TargetType = 'driver' | 'company_need' | 'shortlist' | 'shortlist_entry';

export interface LogActionParams {
  action_type:  ActionType;
  triggered_by: string;
  target_type:  TargetType;
  target_id:    string;
  status:       ActionStatus;
  input?:       Record<string, unknown>;
  result?:      Record<string, unknown>;
  error?:       string;
}

// Writes one system_actions row. Never throws — logs to console on DB failure
// so that a logging error never breaks the calling agent.
export async function logAction(params: LogActionParams): Promise<string> {
  const id  = randomUUID();
  const now = new Date().toISOString();

  const { error: dbError } = await db.from('system_actions').insert({
    id,
    action_type:  params.action_type,
    triggered_by: params.triggered_by,
    target_type:  params.target_type,
    target_id:    params.target_id,
    status:       params.status,
    input:        params.input  ?? null,
    result:       params.result ?? null,
    error:        params.error  ?? null,
    created_at:   now,
    completed_at:
      params.status === 'completed' || params.status === 'failed' ? now : null,
  });

  if (dbError) {
    console.error('[systemActions] logAction failed:', dbError.message, '| action_type:', params.action_type);
  }

  return id;
}
