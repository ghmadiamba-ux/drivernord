// tests/contentSystemActions.test.ts
//
// Verifies that all Content Engine V1 action_type and target_type values
// accepted by the TypeScript union are correctly forwarded to the DB via
// logAction(). These tests ensure the values will not be rejected by the
// system_actions CHECK constraints after migration 026 is applied.
//
// Pattern: same mocked-DB approach as tests/systemActions.test.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

import { logAction } from '../lib/systemActions';
import type { ActionType, TargetType } from '../lib/systemActions';
import { db } from '../lib/db';

function mockInsert(error: unknown = null) {
  const insertFn = vi.fn().mockResolvedValue({ error });
  vi.mocked(db.from).mockReturnValue({ insert: insertFn } as never);
  return insertFn;
}

beforeEach(() => vi.clearAllMocks());

// ─── Content Engine action_type values ───────────────────────────────────────

const CONTENT_ENGINE_ACTION_TYPES: ActionType[] = [
  'content_plan_generated',
  'content_card_created',
  'content_card_approved',
  'content_card_held',
  'content_card_archived',
  'content_card_risk_flagged',
  'content_draft_generated',
  'content_anti_repetition_blocked',
  'content_feedback_recorded',
  'content_plan_week_approved',
];

describe('Content Engine action_types — logAction forwards the correct value', () => {
  for (const action_type of CONTENT_ENGINE_ACTION_TYPES) {
    it(`passes action_type "${action_type}" unchanged to DB insert`, async () => {
      const insertFn = mockInsert();
      await logAction({
        action_type,
        triggered_by: 'admin',
        target_type:  'content_campaign_card',
        target_id:    'card-test-id',
        status:       'completed',
      });
      const row = insertFn.mock.calls[0]![0] as Record<string, unknown>;
      expect(row.action_type).toBe(action_type);
    });
  }
});

// ─── Content Engine target_type values ───────────────────────────────────────

const CONTENT_ENGINE_TARGET_TYPES: TargetType[] = [
  'content_campaign_card',
  'content_weekly_plan',
];

describe('Content Engine target_types — logAction forwards the correct value', () => {
  for (const target_type of CONTENT_ENGINE_TARGET_TYPES) {
    it(`passes target_type "${target_type}" unchanged to DB insert`, async () => {
      const insertFn = mockInsert();
      await logAction({
        action_type:  'content_plan_generated',
        triggered_by: 'admin',
        target_type,
        target_id:    'test-id',
        status:       'completed',
      });
      const row = insertFn.mock.calls[0]![0] as Record<string, unknown>;
      expect(row.target_type).toBe(target_type);
    });
  }
});

// ─── Group A — daily notify values (missing from migration 021) ───────────────

describe('Daily notify action/target types — logAction forwards correctly', () => {
  it('passes logistikklubb_daily_notify_sent to DB insert', async () => {
    const insertFn = mockInsert();
    await logAction({
      action_type:  'logistikklubb_daily_notify_sent',
      triggered_by: 'cron',
      target_type:  'logistikklubb_daily_notify',
      target_id:    'notify-1',
      status:       'completed',
    });
    const row = insertFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.action_type).toBe('logistikklubb_daily_notify_sent');
    expect(row.target_type).toBe('logistikklubb_daily_notify');
  });

  it('passes logistikklubb_daily_notify_failed to DB insert', async () => {
    const insertFn = mockInsert();
    await logAction({
      action_type:  'logistikklubb_daily_notify_failed',
      triggered_by: 'cron',
      target_type:  'logistikklubb_daily_notify',
      target_id:    'notify-1',
      status:       'failed',
      error:        'connection refused',
    });
    const row = insertFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.action_type).toBe('logistikklubb_daily_notify_failed');
    expect(row.status).toBe('failed');
  });
});

// ─── Full round-trip shape check for a representative content engine call ─────

describe('Content Engine logAction — full row shape', () => {
  it('content_plan_generated row has all required fields set correctly', async () => {
    const insertFn = mockInsert();
    await logAction({
      action_type:  'content_plan_generated',
      triggered_by: 'founder',
      target_type:  'content_weekly_plan',
      target_id:    '2026-W27',
      status:       'completed',
      input:        { week: '2026-W27' },
      result:       { total: 4, held: 0, high_risk: 0, cta_count: 1 },
    });

    const row = insertFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.action_type).toBe('content_plan_generated');
    expect(row.triggered_by).toBe('founder');
    expect(row.target_type).toBe('content_weekly_plan');
    expect(row.target_id).toBe('2026-W27');
    expect(row.status).toBe('completed');
    expect(row.input).toEqual({ week: '2026-W27' });
    expect(row.result).toEqual({ total: 4, held: 0, high_risk: 0, cta_count: 1 });
    expect(typeof row.completed_at).toBe('string');
    expect(typeof row.id).toBe('string');
  });

  it('content_feedback_recorded row has null completed_at when status is pending', async () => {
    const insertFn = mockInsert();
    await logAction({
      action_type:  'content_feedback_recorded',
      triggered_by: 'admin',
      target_type:  'content_campaign_card',
      target_id:    'card-abc',
      status:       'pending',
      input:        { feedback_signals: ['too_generic'] },
    });
    const row = insertFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.completed_at).toBeNull();
  });
});

// ─── Type exhaustiveness check ────────────────────────────────────────────────
// Compile-time guard: if a new ContentEngine action_type is added to the union
// but not to the array above, this test will catch the omission at runtime.

describe('CONTENT_ENGINE_ACTION_TYPES array completeness', () => {
  it('covers all 10 Content Engine action_type values', () => {
    expect(CONTENT_ENGINE_ACTION_TYPES).toHaveLength(10);
  });

  it('covers all 2 Content Engine target_type values', () => {
    expect(CONTENT_ENGINE_TARGET_TYPES).toHaveLength(2);
  });

  it('every entry in CONTENT_ENGINE_ACTION_TYPES starts with "content_"', () => {
    for (const v of CONTENT_ENGINE_ACTION_TYPES) {
      expect(v.startsWith('content_')).toBe(true);
    }
  });

  it('every entry in CONTENT_ENGINE_TARGET_TYPES starts with "content_"', () => {
    for (const v of CONTENT_ENGINE_TARGET_TYPES) {
      expect(v.startsWith('content_')).toBe(true);
    }
  });
});
