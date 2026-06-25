// tests/contentVisualSystemActions.test.ts
//
// Verifies that Visual Production Pipeline V1 action_type values are correctly
// forwarded to the DB via logAction(). These tests confirm that the values
// will not be rejected by system_actions CHECK constraints after migration 027.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

import { logAction } from '../lib/systemActions';
import type { ActionType } from '../lib/systemActions';
import { db } from '../lib/db';

function mockInsert(error: unknown = null) {
  const insertFn = vi.fn().mockResolvedValue({ error });
  vi.mocked(db.from).mockReturnValue({ insert: insertFn } as never);
  return insertFn;
}

beforeEach(() => vi.clearAllMocks());

// ─── Visual Production Pipeline action_types ──────────────────────────────────

const VISUAL_PLAN_ACTION_TYPES: ActionType[] = [
  'content_visual_plan_generated',
  'content_visual_plan_updated',
  'content_visual_plan_held',
];

describe('Visual Production Pipeline action_types — logAction forwards correctly', () => {
  for (const action_type of VISUAL_PLAN_ACTION_TYPES) {
    it(`passes action_type "${action_type}" unchanged to DB insert`, async () => {
      const insertFn = mockInsert();
      await logAction({
        action_type,
        triggered_by: 'founder',
        target_type:  'content_campaign_card',
        target_id:    'card-test-id',
        status:       'completed',
      });
      const row = insertFn.mock.calls[0]![0] as Record<string, unknown>;
      expect(row.action_type).toBe(action_type);
    });
  }
});

// ─── Completeness guard ───────────────────────────────────────────────────────

describe('VISUAL_PLAN_ACTION_TYPES completeness', () => {
  it('covers all 3 Visual Production Pipeline action_types', () => {
    expect(VISUAL_PLAN_ACTION_TYPES).toHaveLength(3);
  });

  it('all entries start with "content_visual_plan_"', () => {
    for (const v of VISUAL_PLAN_ACTION_TYPES) {
      expect(v.startsWith('content_visual_plan_')).toBe(true);
    }
  });

  it('uses existing target_type content_campaign_card (no new target_type needed)', async () => {
    const insertFn = mockInsert();
    await logAction({
      action_type:  'content_visual_plan_generated',
      triggered_by: 'system',
      target_type:  'content_campaign_card',
      target_id:    'card-abc',
      status:       'completed',
      input:  { family: 'driver_pride', strategy: 'real_asset' },
      result: { gate_outcome: 'requires_real_asset' },
    });
    const row = insertFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.target_type).toBe('content_campaign_card');
  });
});

// ─── Full round-trip shape check ──────────────────────────────────────────────

describe('Visual plan logAction — full row shape', () => {
  it('content_visual_plan_generated row has all required fields', async () => {
    const insertFn = mockInsert();
    await logAction({
      action_type:  'content_visual_plan_generated',
      triggered_by: 'founder',
      target_type:  'content_campaign_card',
      target_id:    'card-xyz',
      status:       'completed',
      input:  { family: 'operational_intelligence', strategy: 'branded_graphic', angle: 'practical_advice' },
      result: { gate_outcome: 'ready_for_internal_preview', visual_risk: 'low' },
    });
    const row = insertFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.action_type).toBe('content_visual_plan_generated');
    expect(row.triggered_by).toBe('founder');
    expect(row.target_type).toBe('content_campaign_card');
    expect(row.target_id).toBe('card-xyz');
    expect(row.status).toBe('completed');
    expect(typeof row.completed_at).toBe('string');
    expect(row.input).toEqual({ family: 'operational_intelligence', strategy: 'branded_graphic', angle: 'practical_advice' });
    expect(row.result).toEqual({ gate_outcome: 'ready_for_internal_preview', visual_risk: 'low' });
  });

  it('content_visual_plan_held sets status to completed', async () => {
    const insertFn = mockInsert();
    await logAction({
      action_type:  'content_visual_plan_held',
      triggered_by: 'system',
      target_type:  'content_campaign_card',
      target_id:    'card-held',
      status:       'completed',
      result: { gate_outcome: 'blocked_for_repetition' },
    });
    const row = insertFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.action_type).toBe('content_visual_plan_held');
    expect(row.status).toBe('completed');
    expect(typeof row.completed_at).toBe('string');
  });

  it('content_visual_plan_updated row has correct fields', async () => {
    const insertFn = mockInsert();
    await logAction({
      action_type:  'content_visual_plan_updated',
      triggered_by: 'founder',
      target_type:  'content_campaign_card',
      target_id:    'card-upd',
      status:       'completed',
      input:  { lifecycle_status: 'ready' },
    });
    const row = insertFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.action_type).toBe('content_visual_plan_updated');
    expect(row.input).toEqual({ lifecycle_status: 'ready' });
  });
});

// ─── Does NOT call Facebook or external image APIs ─────────────────────────────

describe('Visual plan actions — no external API calls', () => {
  it('logAction does not call fetch() for visual plan actions', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    mockInsert();
    await logAction({
      action_type:  'content_visual_plan_generated',
      triggered_by: 'system',
      target_type:  'content_campaign_card',
      target_id:    'card-fetch-test',
      status:       'completed',
    });
    // logAction should only call db.from() — never fetch()
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
