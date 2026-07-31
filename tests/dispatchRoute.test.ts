import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/recruiterAuth', () => ({
  requireRecruiterAuth: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock('../lib/outreachQueue', () => ({
  getQueueItemById:    vi.fn(),
  markQueueItemSent:   vi.fn().mockResolvedValue(true),
  markQueueItemFailed: vi.fn().mockResolvedValue(true),
  countSentInLastHour: vi.fn().mockResolvedValue(0),
}));

vi.mock('../lib/agents/zohoOutreachAgent', () => ({
  validateEmailBeforeSend: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  isWithinRateLimit:       vi.fn().mockReturnValue(true),
  isWorkingHours:          vi.fn().mockReturnValue(true),
}));

vi.mock('../lib/zohoMailClient', () => ({
  sendEmailViaZoho:    vi.fn(),
  getZohoConfigStatus: vi.fn().mockReturnValue({ configured: true, missing_env: [] }),
  getZohoFromEmail:    vi.fn().mockReturnValue('hej@drivernord.com'),
  getZohoFromName:     vi.fn().mockReturnValue('Ghislain Alexander Mad'),
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('action-id'),
}));

import { POST } from '../app/api/admin/outreach-queue/[id]/send/route';
import { requireRecruiterAuth } from '../lib/recruiterAuth';
import {
  getQueueItemById,
  markQueueItemSent,
  markQueueItemFailed,
  countSentInLastHour,
} from '../lib/outreachQueue';
import {
  validateEmailBeforeSend,
  isWithinRateLimit,
  isWorkingHours,
} from '../lib/agents/zohoOutreachAgent';
import { sendEmailViaZoho, getZohoConfigStatus } from '../lib/zohoMailClient';
import { logAction } from '../lib/systemActions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return {
    headers: new Headers({ 'x-recruiter-key': 'test-key' }),
    json:    () => Promise.resolve({}),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

function makeParams(id = 'item-1') {
  return { params: { id } };
}

function makeApprovedItem(overrides: Partial<{
  id:                    string;
  status:                string;
  send_mode:             string;
  approved_by_founder:   boolean;
  recipient_email:       string;
  subject:               string;
  body:                  string;
  company_name_snapshot: string;
  readiness_category:    string;
}> = {}) {
  return {
    id:                    overrides.id                    ?? 'item-1',
    status:                overrides.status                ?? 'approved',
    send_mode:             overrides.send_mode             ?? 'founder_approval',
    approved_by_founder:   overrides.approved_by_founder   ?? true,
    recipient_email:       overrides.recipient_email       ?? 'transport@testakeri.se',
    recipient_name:        null,
    subject:               overrides.subject               ?? 'CE-chaufförer för distribution',
    body:                  overrides.body                  ?? 'Hej,\n\nVi är varken bemanning...',
    company_name_snapshot: overrides.company_name_snapshot ?? 'Test Åkeri AB',
    readiness_category:    overrides.readiness_category    ?? 'READY',
    risk_notes:            null,
    safe_claim_used:       null,
    target_id:             null,
    provider:              'zoho',
    provider_message_id:   null,
    scheduled_send_at:     null,
    sent_at:               null,
    reply_detected_at:     null,
    reply_classification:  null,
    created_by_agent:      true,
    automation_used:       false,
    created_at:            '2026-05-26T00:00:00Z',
    updated_at:            '2026-05-26T00:00:00Z',
  };
}

beforeEach(() => vi.clearAllMocks());

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/outreach-queue/[id]/send — auth', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({ ok: false, status: 401, body: { error: 'unauthorized' } });
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(401);
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });
});

// ─── Zoho config gate ─────────────────────────────────────────────────────────

describe('POST — Zoho config gate', () => {
  it('returns 400 when Zoho not configured', async () => {
    vi.mocked(getZohoConfigStatus).mockReturnValueOnce({ configured: false, missing_env: ['ZOHO_CLIENT_ID'] });
    const res  = await POST(makeReq(), makeParams());
    const body = await res.json() as { error: string; missing_env: string[] };
    expect(res.status).toBe(400);
    expect(body.missing_env).toContain('ZOHO_CLIENT_ID');
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });
});

// ─── Item state gates ─────────────────────────────────────────────────────────

describe('POST — item state gates', () => {
  it('returns 404 when item not found', async () => {
    vi.mocked(getQueueItemById).mockResolvedValueOnce(null);
    const res = await POST(makeReq(), makeParams('no-such-id'));
    expect(res.status).toBe(404);
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });

  it('returns 409 when item status is draft (not approved)', async () => {
    vi.mocked(getQueueItemById).mockResolvedValueOnce(makeApprovedItem({ status: 'draft' }) as never);
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(409);
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });

  it('returns 409 when item status is sent', async () => {
    vi.mocked(getQueueItemById).mockResolvedValueOnce(makeApprovedItem({ status: 'sent' }) as never);
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(409);
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });

  it('returns 409 when send_mode is dry_run', async () => {
    vi.mocked(getQueueItemById).mockResolvedValueOnce(makeApprovedItem({ send_mode: 'dry_run' }) as never);
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(409);
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });
});

// ─── Validation gate ──────────────────────────────────────────────────────────

describe('POST — validation gate', () => {
  it('returns 422 when validateEmailBeforeSend fails', async () => {
    vi.mocked(getQueueItemById).mockResolvedValueOnce(makeApprovedItem() as never);
    vi.mocked(validateEmailBeforeSend).mockReturnValueOnce({
      valid: false, errors: ['Cannot send — approved_by_founder is false'],
    });
    const res  = await POST(makeReq(), makeParams());
    const body = await res.json() as { error: string; details: string[] };
    expect(res.status).toBe(422);
    expect(body.details).toContain('Cannot send — approved_by_founder is false');
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });
});

// ─── Rate limit gate ──────────────────────────────────────────────────────────

describe('POST — rate limit gate', () => {
  it('returns 429 when rate limit reached', async () => {
    vi.mocked(getQueueItemById).mockResolvedValueOnce(makeApprovedItem() as never);
    vi.mocked(countSentInLastHour).mockResolvedValueOnce(2);
    vi.mocked(isWithinRateLimit).mockReturnValueOnce(false);
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(429);
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });
});

// ─── Working hours gate ───────────────────────────────────────────────────────

describe('POST — working hours gate', () => {
  it('returns 503 outside working hours', async () => {
    vi.mocked(getQueueItemById).mockResolvedValueOnce(makeApprovedItem() as never);
    vi.mocked(isWorkingHours).mockReturnValueOnce(false);
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(503);
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });
});

// ─── Successful dispatch ──────────────────────────────────────────────────────

describe('POST — successful dispatch', () => {
  beforeEach(() => {
    vi.mocked(getQueueItemById).mockResolvedValue(makeApprovedItem() as never);
    vi.mocked(sendEmailViaZoho).mockResolvedValue({
      success: true, message_id: 'zoho-msg-abc', dry_run: false, error: null,
    });
  });

  it('returns 200 with message_id and sent_to', async () => {
    const res  = await POST(makeReq(), makeParams());
    const body = await res.json() as { ok: boolean; message_id: string; sent_to: string };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.message_id).toBe('zoho-msg-abc');
    expect(body.sent_to).toBe('transport@testakeri.se');
  });

  it('calls markQueueItemSent with automation_used = true', async () => {
    await POST(makeReq(), makeParams());
    expect(vi.mocked(markQueueItemSent)).toHaveBeenCalledWith('item-1', 'zoho-msg-abc', true);
  });

  it('logs outreach_email_sent action', async () => {
    await POST(makeReq(), makeParams());
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type:  'outreach_email_sent',
        triggered_by: 'dispatch_route',
        target_type:  'outreach_email_queue',
        target_id:    'item-1',
        status:       'completed',
      }),
    );
  });

  it('passes item fields to sendEmailViaZoho', async () => {
    await POST(makeReq(), makeParams());
    expect(vi.mocked(sendEmailViaZoho)).toHaveBeenCalledWith(
      expect.objectContaining({
        to:         'transport@testakeri.se',
        subject:    'CE-chaufförer för distribution',
        from_email: 'hej@drivernord.com',
        from_name:  'Ghislain Alexander Mad',
      }),
    );
  });
});

// ─── Failed Zoho send ─────────────────────────────────────────────────────────

describe('POST — Zoho send failure', () => {
  beforeEach(() => {
    vi.mocked(getQueueItemById).mockResolvedValue(makeApprovedItem() as never);
  });

  it('returns 500 when sendEmailViaZoho fails', async () => {
    vi.mocked(sendEmailViaZoho).mockResolvedValueOnce({
      success: false, message_id: null, dry_run: false, error: 'HTTP 429 from Zoho',
    });
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(500);
    expect((await res.json() as { ok: boolean }).ok).toBe(false);
  });

  it('calls markQueueItemFailed on send error', async () => {
    vi.mocked(sendEmailViaZoho).mockResolvedValueOnce({
      success: false, message_id: null, dry_run: false, error: 'timeout',
    });
    await POST(makeReq(), makeParams());
    expect(vi.mocked(markQueueItemFailed)).toHaveBeenCalledWith('item-1', 'timeout');
  });

  it('logs outreach_email_failed on send error', async () => {
    vi.mocked(sendEmailViaZoho).mockResolvedValueOnce({
      success: false, message_id: null, dry_run: false, error: 'timeout',
    });
    await POST(makeReq(), makeParams());
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'outreach_email_failed',
        status:      'failed',
      }),
    );
  });

  it('returns 500 and does not call markQueueItemSent on dry_run result', async () => {
    vi.mocked(sendEmailViaZoho).mockResolvedValueOnce({
      success: false, message_id: null, dry_run: true, error: 'Zoho not configured',
    });
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(500);
    expect(vi.mocked(markQueueItemSent)).not.toHaveBeenCalled();
  });
});

// ─── Safety invariants ────────────────────────────────────────────────────────

describe('POST — safety invariants', () => {
  it('never calls sendEmailViaZoho without first passing all gates', async () => {
    // auth fail
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({ ok: false, status: 401, body: {} });
    await POST(makeReq(), makeParams());
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();

    // item not found
    vi.clearAllMocks();
    vi.mocked(requireRecruiterAuth).mockReturnValue({ ok: true });
    vi.mocked(getZohoConfigStatus).mockReturnValue({ configured: true, missing_env: [] });
    vi.mocked(getQueueItemById).mockResolvedValueOnce(null);
    await POST(makeReq(), makeParams());
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();

    // rate limit
    vi.clearAllMocks();
    vi.mocked(requireRecruiterAuth).mockReturnValue({ ok: true });
    vi.mocked(getZohoConfigStatus).mockReturnValue({ configured: true, missing_env: [] });
    vi.mocked(getQueueItemById).mockResolvedValue(makeApprovedItem() as never);
    vi.mocked(validateEmailBeforeSend).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(countSentInLastHour).mockResolvedValue(2);
    vi.mocked(isWithinRateLimit).mockReturnValue(false);
    vi.mocked(isWorkingHours).mockReturnValue(true);
    await POST(makeReq(), makeParams());
    expect(vi.mocked(sendEmailViaZoho)).not.toHaveBeenCalled();
  });
});
