import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

import { logAction } from '../lib/systemActions';
import { db } from '../lib/db';

function mockInsert(error: unknown = null) {
  const insertFn = vi.fn().mockResolvedValue({ error });
  vi.mocked(db.from).mockReturnValue({ insert: insertFn } as never);
  return insertFn;
}

beforeEach(() => vi.clearAllMocks());

// ─── logAction ────────────────────────────────────────────────────────────────

describe('logAction — return value', () => {
  it('returns a UUID string', async () => {
    mockInsert();
    const id = await logAction({
      action_type:  'match_run',
      triggered_by: 'agent:matching',
      target_type:  'company_need',
      target_id:    'need-1',
      status:       'completed',
    });
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns a different UUID on each call', async () => {
    mockInsert();
    const a = await logAction({ action_type: 'match_run', triggered_by: 'human', target_type: 'company_need', target_id: 'n1', status: 'completed' });
    const b = await logAction({ action_type: 'match_run', triggered_by: 'human', target_type: 'company_need', target_id: 'n1', status: 'completed' });
    expect(a).not.toBe(b);
  });
});

describe('logAction — DB write', () => {
  it('calls db.from("system_actions").insert with correct fields', async () => {
    const insertFn = mockInsert();
    await logAction({
      action_type:  'contact_suggested',
      triggered_by: 'agent:contact',
      target_type:  'shortlist_entry',
      target_id:    'entry-42',
      status:       'pending',
      input:        { driver_id: 'd1', match_score: 90 },
    });
    expect(vi.mocked(db.from)).toHaveBeenCalledWith('system_actions');
    const row = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(row.action_type).toBe('contact_suggested');
    expect(row.triggered_by).toBe('agent:contact');
    expect(row.target_type).toBe('shortlist_entry');
    expect(row.target_id).toBe('entry-42');
    expect(row.status).toBe('pending');
    expect(row.input).toEqual({ driver_id: 'd1', match_score: 90 });
  });

  it('sets completed_at when status is completed', async () => {
    const insertFn = mockInsert();
    await logAction({ action_type: 'match_run', triggered_by: 'human', target_type: 'company_need', target_id: 'n1', status: 'completed' });
    const row = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof row.completed_at).toBe('string');
  });

  it('sets completed_at when status is failed', async () => {
    const insertFn = mockInsert();
    await logAction({ action_type: 'match_run', triggered_by: 'human', target_type: 'company_need', target_id: 'n1', status: 'failed', error: 'timeout' });
    const row = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof row.completed_at).toBe('string');
  });

  it('leaves completed_at null when status is pending', async () => {
    const insertFn = mockInsert();
    await logAction({ action_type: 'contact_suggested', triggered_by: 'agent:contact', target_type: 'shortlist_entry', target_id: 'e1', status: 'pending' });
    const row = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(row.completed_at).toBeNull();
  });

  it('sets input and result to null when omitted', async () => {
    const insertFn = mockInsert();
    await logAction({ action_type: 'driver_ingested', triggered_by: 'agent:ingestion', target_type: 'driver', target_id: 'd1', status: 'completed' });
    const row = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(row.input).toBeNull();
    expect(row.result).toBeNull();
  });
});

describe('logAction — DB failure handling', () => {
  it('does not throw when DB insert fails', async () => {
    mockInsert({ message: 'connection refused' });
    await expect(
      logAction({ action_type: 'match_run', triggered_by: 'human', target_type: 'company_need', target_id: 'n1', status: 'completed' })
    ).resolves.not.toThrow();
  });

  it('still returns a UUID even when DB insert fails', async () => {
    mockInsert({ message: 'timeout' });
    const id = await logAction({ action_type: 'match_run', triggered_by: 'human', target_type: 'company_need', target_id: 'n1', status: 'completed' });
    expect(typeof id).toBe('string');
  });
});
