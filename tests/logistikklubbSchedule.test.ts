import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateStatusTransition,
  computeDefaultScheduledTimes,
} from '../lib/logistikklubbSchedule';
import type { PostStatus } from '../lib/logistikklubbSchedule';
import {
  ManualPublisherAdapter,
  WhatsAppGroupsPublisherAdapter,
  isAutoPostEnabled,
  getPublisherAdapter,
} from '../lib/logistikklubbPublisher';

// ─── validateStatusTransition ─────────────────────────────────────────────────

describe('validateStatusTransition', () => {
  it('allows draft → approved', () => {
    expect(validateStatusTransition('draft', 'approved')).toBe(true);
  });

  it('allows draft → skipped', () => {
    expect(validateStatusTransition('draft', 'skipped')).toBe(true);
  });

  it('allows approved → scheduled', () => {
    expect(validateStatusTransition('approved', 'scheduled')).toBe(true);
  });

  it('allows approved → skipped', () => {
    expect(validateStatusTransition('approved', 'skipped')).toBe(true);
  });

  it('allows scheduled → due', () => {
    expect(validateStatusTransition('scheduled', 'due')).toBe(true);
  });

  it('allows scheduled → skipped', () => {
    expect(validateStatusTransition('scheduled', 'skipped')).toBe(true);
  });

  it('allows due → published', () => {
    expect(validateStatusTransition('due', 'published')).toBe(true);
  });

  it('allows due → skipped', () => {
    expect(validateStatusTransition('due', 'skipped')).toBe(true);
  });

  it('allows due → failed', () => {
    expect(validateStatusTransition('due', 'failed')).toBe(true);
  });

  it('allows failed → scheduled (retry)', () => {
    expect(validateStatusTransition('failed', 'scheduled')).toBe(true);
  });

  it('rejects draft → published (skips required steps)', () => {
    expect(validateStatusTransition('draft', 'published')).toBe(false);
  });

  it('rejects approved → published (must go through scheduled→due)', () => {
    expect(validateStatusTransition('approved', 'published')).toBe(false);
  });

  it('rejects published → any (terminal)', () => {
    const targets: PostStatus[] = ['draft', 'approved', 'scheduled', 'due', 'skipped', 'failed'];
    for (const t of targets) {
      expect(validateStatusTransition('published', t)).toBe(false);
    }
  });

  it('rejects skipped → any (terminal)', () => {
    const targets: PostStatus[] = ['draft', 'approved', 'scheduled', 'due', 'published', 'failed'];
    for (const t of targets) {
      expect(validateStatusTransition('skipped', t)).toBe(false);
    }
  });

  it('rejects draft → scheduled (must approve first)', () => {
    expect(validateStatusTransition('draft', 'scheduled')).toBe(false);
  });
});

// ─── computeDefaultScheduledTimes ─────────────────────────────────────────────

describe('computeDefaultScheduledTimes', () => {
  it('returns exactly 5 dates', () => {
    const times = computeDefaultScheduledTimes(new Date('2026-06-07T22:00:00Z'));
    expect(times).toHaveLength(5);
  });

  it('all returned values are Date objects', () => {
    const times = computeDefaultScheduledTimes(new Date('2026-06-07T22:00:00Z'));
    for (const t of times) {
      expect(t).toBeInstanceOf(Date);
      expect(isNaN(t.getTime())).toBe(false);
    }
  });

  it('times are in strictly ascending order', () => {
    const times = computeDefaultScheduledTimes(new Date('2026-06-07T06:00:00'));
    for (let i = 1; i < times.length; i++) {
      expect(times[i]!.getTime()).toBeGreaterThan(times[i - 1]!.getTime());
    }
  });

  it('schedules Day 1 for tomorrow if 07:30 has already passed today', () => {
    // 22:00 local — 07:30 already passed
    const now = new Date('2026-06-07T22:00:00');
    const times = computeDefaultScheduledTimes(now);
    const day1 = times[0]!;
    expect(day1.getDate()).toBeGreaterThan(now.getDate());
  });

  it('schedules Day 1 for today if 07:30 has not yet passed', () => {
    // 06:00 local — 07:30 not yet passed
    const now = new Date('2026-06-07T06:00:00');
    const times = computeDefaultScheduledTimes(now);
    const day1 = times[0]!;
    expect(day1.getDate()).toBe(now.getDate());
    expect(day1.getHours()).toBe(7);
    expect(day1.getMinutes()).toBe(30);
  });

  it('Day 1 is on a different day than Day 2', () => {
    const times = computeDefaultScheduledTimes(new Date('2026-06-07T06:00:00'));
    expect(times[0]!.getDate()).not.toBe(times[1]!.getDate());
  });

  it('returns consecutive days for all 5 slots', () => {
    const times = computeDefaultScheduledTimes(new Date('2026-06-07T06:00:00'));
    for (let i = 1; i < times.length; i++) {
      const dayDiff = (times[i]!.getTime() - times[0]!.getTime()) / (1000 * 60 * 60 * 24);
      // Each slot is roughly i days after Day 1 (same time zone, ignoring DST)
      expect(Math.round(dayDiff)).toBe(i);
    }
  });
});

// ─── ManualPublisherAdapter ───────────────────────────────────────────────────

describe('ManualPublisherAdapter', () => {
  it('returns ok:false with reason manual_mode', async () => {
    const adapter = new ManualPublisherAdapter();
    const result  = await adapter.publish('post-123', 'some text');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('manual_mode');
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('does not throw for any input', async () => {
    const adapter = new ManualPublisherAdapter();
    await expect(adapter.publish('', '')).resolves.toBeDefined();
  });
});

// ─── WhatsAppGroupsPublisherAdapter ──────────────────────────────────────────

describe('WhatsAppGroupsPublisherAdapter', () => {
  it('returns ok:false with reason adapter_disabled', async () => {
    const adapter = new WhatsAppGroupsPublisherAdapter();
    const result  = await adapter.publish('post-456', 'some text');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('adapter_disabled');
      expect(typeof result.message).toBe('string');
    }
  });

  it('is a stub — does not make external calls (sync-like resolution)', async () => {
    const adapter = new WhatsAppGroupsPublisherAdapter();
    const start   = Date.now();
    await adapter.publish('x', 'y');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});

// ─── isAutoPostEnabled / getPublisherAdapter ──────────────────────────────────

describe('isAutoPostEnabled', () => {
  beforeEach(() => {
    delete process.env.WHATSAPP_GROUPS_API_ENABLED;
  });

  it('returns false by default (env var not set)', () => {
    expect(isAutoPostEnabled()).toBe(false);
  });

  it('returns false when WHATSAPP_GROUPS_API_ENABLED is not "true"', () => {
    process.env.WHATSAPP_GROUPS_API_ENABLED = 'false';
    expect(isAutoPostEnabled()).toBe(false);
  });

  it('returns true only when WHATSAPP_GROUPS_API_ENABLED=true', () => {
    process.env.WHATSAPP_GROUPS_API_ENABLED = 'true';
    expect(isAutoPostEnabled()).toBe(true);
    delete process.env.WHATSAPP_GROUPS_API_ENABLED;
  });
});

describe('getPublisherAdapter', () => {
  beforeEach(() => {
    delete process.env.WHATSAPP_GROUPS_API_ENABLED;
  });

  it('returns ManualPublisherAdapter by default', () => {
    const adapter = getPublisherAdapter();
    expect(adapter).toBeInstanceOf(ManualPublisherAdapter);
  });

  it('returns WhatsAppGroupsPublisherAdapter when WHATSAPP_GROUPS_API_ENABLED=true', () => {
    process.env.WHATSAPP_GROUPS_API_ENABLED = 'true';
    const adapter = getPublisherAdapter();
    expect(adapter).toBeInstanceOf(WhatsAppGroupsPublisherAdapter);
    delete process.env.WHATSAPP_GROUPS_API_ENABLED;
  });

  it('adapter.publish resolves (never throws)', async () => {
    const adapter = getPublisherAdapter();
    await expect(adapter.publish('id', 'text')).resolves.toBeDefined();
  });
});
