import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/db', () => ({
  db: { from: vi.fn() },
}));

vi.mock('../lib/recruiterAuth', () => ({
  requireRecruiterAuth: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock('../lib/systemActions', () => ({
  logAction: vi.fn().mockResolvedValue('audit-id'),
}));

import { buildPilotOutreachList } from '../lib/pilotOutreach';
import { db } from '../lib/db';
import { logAction } from '../lib/systemActions';
import { requireRecruiterAuth } from '../lib/recruiterAuth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body?: unknown): NextRequest {
  return {
    headers: new Headers({ 'x-recruiter-key': 'key' }),
    json:    () => Promise.resolve(body ?? {}),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

function makeCtx(id: string) {
  return { params: { id } };
}

function makePilotRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id:                    'rel-1',
    target_id:             'target-1',
    relationship_status:   'researched',
    first_email_sent_at:   null,
    email_subject:         null,
    next_action:           null,
    next_action_date:      null,
    reply_summary:         null,
    reply_sentiment:       null,
    pilot_scope_notes:     null,
    do_not_contact_reason: null,
    updated_at:            '2026-05-21T00:00:00Z',
    company_research_targets: {
      company_name:        'Enskede Bilexpress',
      contact_email:       'david@enskede.se',
      phone:               '+46700000001',
      decision_maker_name: 'David Sjölund',
      license_mentions:    ['CE'],
      transport_domain:    ['distribution'],
    },
    ...overrides,
  };
}

// Chain used by buildPilotOutreachList: .from().select().order()
function mockListDb(rows: unknown[]) {
  vi.mocked(db.from).mockReturnValue({
    select: () => ({
      order: () => Promise.resolve({ data: rows, error: null }),
    }),
  } as never);
}

// Chain used by PATCH handler:
//   call 1: .from().select().eq().single()   (fetch current row)
//   call 2: .from().update().eq()            (apply update)
function mockPatchDb(
  currentRow: Record<string, unknown> | null,
  updateErr: Record<string, unknown> | null = null,
) {
  let callCount = 0;
  vi.mocked(db.from).mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve(
              currentRow
                ? { data: currentRow, error: null }
                : { data: null, error: { message: 'not found' } },
            ),
          }),
        }),
      } as never;
    }
    return {
      update: () => ({
        eq: () => Promise.resolve({ error: updateErr }),
      }),
    } as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── buildPilotOutreachList ───────────────────────────────────────────────────

describe('buildPilotOutreachList', () => {
  it('returns empty array on DB error', async () => {
    vi.mocked(db.from).mockReturnValue({
      select: () => ({
        order: () => Promise.resolve({ data: null, error: { message: 'fail' } }),
      }),
    } as never);
    const result = await buildPilotOutreachList();
    expect(result).toEqual([]);
  });

  it('maps company_name, contact_email, contact_person, phone from nested targets', async () => {
    mockListDb([makePilotRow()]);
    const [entry] = await buildPilotOutreachList();
    expect(entry.company_name).toBe('Enskede Bilexpress');
    expect(entry.contact_email).toBe('david@enskede.se');
    expect(entry.contact_person).toBe('David Sjölund');
    expect(entry.phone).toBe('+46700000001');
  });

  it('builds observed_need from license_mentions and transport_domain', async () => {
    mockListDb([makePilotRow()]);
    const [entry] = await buildPilotOutreachList();
    expect(entry.observed_need).toContain('CE');
    expect(entry.observed_need).toContain('distribution');
  });

  it('observed_need is — when both arrays are empty', async () => {
    mockListDb([makePilotRow({
      company_research_targets: {
        company_name:        'Empty Co',
        contact_email:       null,
        phone:               null,
        decision_maker_name: null,
        license_mentions:    [],
        transport_domain:    [],
      },
    })]);
    const [entry] = await buildPilotOutreachList();
    expect(entry.observed_need).toBe('—');
  });

  it('is_followup_overdue is true when status=contacted and next_action_date is past', async () => {
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    mockListDb([makePilotRow({ relationship_status: 'contacted', next_action_date: pastDate })]);
    const [entry] = await buildPilotOutreachList();
    expect(entry.is_followup_overdue).toBe(true);
  });

  it('is_followup_overdue is false when next_action_date is in the future', async () => {
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    mockListDb([makePilotRow({ relationship_status: 'contacted', next_action_date: futureDate })]);
    const [entry] = await buildPilotOutreachList();
    expect(entry.is_followup_overdue).toBe(false);
  });

  it('is_followup_overdue is false for non-contacted status even with past date', async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    mockListDb([makePilotRow({ relationship_status: 'replied', next_action_date: pastDate })]);
    const [entry] = await buildPilotOutreachList();
    expect(entry.is_followup_overdue).toBe(false);
  });

  it('is_do_not_contact is true and risk_warnings populated when status=do_not_contact', async () => {
    mockListDb([makePilotRow({
      relationship_status:   'do_not_contact',
      do_not_contact_reason: 'Company bankrupt July 2025 — JPC Entreprenad AB',
    })]);
    const [entry] = await buildPilotOutreachList();
    expect(entry.is_do_not_contact).toBe(true);
    expect(entry.risk_warnings).toContain('Company bankrupt July 2025 — JPC Entreprenad AB');
  });

  it('risk_warnings is empty for non-do_not_contact statuses', async () => {
    mockListDb([makePilotRow({ relationship_status: 'researched' })]);
    const [entry] = await buildPilotOutreachList();
    expect(entry.is_do_not_contact).toBe(false);
    expect(entry.risk_warnings).toHaveLength(0);
  });

  it('sorts feedback_pending before researched', async () => {
    mockListDb([
      makePilotRow({ id: 'r1',  relationship_status: 'researched' }),
      makePilotRow({ id: 'fp1', relationship_status: 'feedback_pending' }),
    ]);
    const result = await buildPilotOutreachList();
    expect(result[0].status).toBe('feedback_pending');
    expect(result[1].status).toBe('researched');
  });

  it('do_not_contact appears last in sort order', async () => {
    mockListDb([
      makePilotRow({ id: 'dnc', relationship_status: 'do_not_contact' }),
      makePilotRow({ id: 'r1',  relationship_status: 'researched' }),
    ]);
    const result = await buildPilotOutreachList();
    expect(result[result.length - 1].status).toBe('do_not_contact');
  });
});

// ─── GET /api/admin/pilot-outreach ────────────────────────────────────────────

describe('GET /api/admin/pilot-outreach', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValueOnce({
      ok: false, body: { error: 'unauthorized' }, status: 401,
    } as never);
    const { GET } = await import('../app/api/admin/pilot-outreach/route');
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 200 with entries array on valid auth', async () => {
    mockListDb([makePilotRow()]);
    const { GET } = await import('../app/api/admin/pilot-outreach/route');
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { entries: unknown[] };
    expect(Array.isArray(body.entries)).toBe(true);
    expect(body.entries).toHaveLength(1);
  });

  it('returns empty entries array when no relationships exist', async () => {
    mockListDb([]);
    const { GET } = await import('../app/api/admin/pilot-outreach/route');
    const res = await GET(makeReq());
    const body = await res.json() as { entries: unknown[] };
    expect(body.entries).toHaveLength(0);
  });
});

// ─── PATCH /api/admin/pilot-outreach/[id] ────────────────────────────────────

describe('PATCH /api/admin/pilot-outreach/[id] — input validation', () => {
  it('returns 400 when action is missing', async () => {
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(makeReq({}), makeCtx('rel-1'));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('action_required');
  });

  it('returns 400 when reason is too short for mark_closed_lost', async () => {
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(makeReq({ action: 'mark_closed_lost', reason: 'short' }), makeCtx('rel-1'));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('reason_required');
  });

  it('returns 400 when reason is too short for mark_do_not_contact', async () => {
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(makeReq({ action: 'mark_do_not_contact', reason: 'x' }), makeCtx('rel-1'));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('reason_required');
  });

  it('returns 400 for add_note with empty note', async () => {
    mockPatchDb({ id: 'rel-1', relationship_status: 'contacted', call_notes: null, target_id: 'tgt-1' });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(makeReq({ action: 'add_note', note: '' }), makeCtx('rel-1'));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('note_required');
  });
});

describe('PATCH /api/admin/pilot-outreach/[id] — DB errors', () => {
  it('returns 404 when relationship not found', async () => {
    mockPatchDb(null);
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(makeReq({ action: 'mark_email_sent' }), makeCtx('nonexistent'));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/pilot-outreach/[id] — status transitions', () => {
  it('returns 403 when current status is do_not_contact and action is not add_note', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'do_not_contact', call_notes: null, target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(makeReq({ action: 'mark_email_sent' }), makeCtx('rel-1'));
    expect(res.status).toBe(403);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('do_not_contact_blocked');
  });

  it('allows add_note on do_not_contact status', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'do_not_contact', call_notes: 'prev', target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(makeReq({ action: 'add_note', note: 'Confirmed bankrupt — JPC.' }), makeCtx('rel-1'));
    expect(res.status).toBe(200);
  });

  it('returns 422 for invalid transition from current status', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'researched', call_notes: null, target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    // mark_pilot_completed is not valid from researched
    const res = await PATCH(makeReq({ action: 'mark_pilot_completed' }), makeCtx('rel-1'));
    expect(res.status).toBe(422);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe('invalid_transition');
    expect(Array.isArray(body.valid_actions)).toBe(true);
  });

  it('mark_email_sent from researched → contacted', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'researched', call_notes: null, target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(
      makeReq({ action: 'mark_email_sent', email_subject: 'CE-chaufför sökes i Stockholm' }),
      makeCtx('rel-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.new_status).toBe('contacted');
  });

  it('mark_replied_interested from contacted → replied', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'contacted', call_notes: null, target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(
      makeReq({ action: 'mark_replied_interested', reply_summary: 'David replied positively.' }),
      makeCtx('rel-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.new_status).toBe('replied');
  });

  it('mark_closed_lost with valid reason → pilot_lost', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'contacted', call_notes: null, target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(
      makeReq({ action: 'mark_closed_lost', reason: 'Company ceased operations permanently.' }),
      makeCtx('rel-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.new_status).toBe('pilot_lost');
  });

  it('add_note does not change status', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'contacted', call_notes: 'previous note', target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(
      makeReq({ action: 'add_note', note: 'Called David, confirmed interest.' }),
      makeCtx('rel-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.new_status).toBe('contacted'); // unchanged
  });
});

describe('PATCH /api/admin/pilot-outreach/[id] — audit logging', () => {
  it('mark_email_sent logs pilot_outreach_email_logged action', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'researched', call_notes: null, target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    await PATCH(makeReq({ action: 'mark_email_sent' }), makeCtx('rel-1'));
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({ action_type: 'pilot_outreach_email_logged' }),
    );
  });

  it('mark_closed_lost logs pilot_closed action', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'contacted', call_notes: null, target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    await PATCH(
      makeReq({ action: 'mark_closed_lost', reason: 'Company closed down operations.' }),
      makeCtx('rel-1'),
    );
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({ action_type: 'pilot_closed' }),
    );
  });

  it('mark_do_not_contact logs pilot_closed action', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'outreach_ready', call_notes: null, target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    await PATCH(
      makeReq({ action: 'mark_do_not_contact', reason: 'Company bankrupt, do not contact.' }),
      makeCtx('rel-1'),
    );
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({ action_type: 'pilot_closed' }),
    );
  });

  it('add_note does not log to system_actions', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'contacted', call_notes: 'prev', target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    await PATCH(makeReq({ action: 'add_note', note: 'Follow-up confirmed by phone.' }), makeCtx('rel-1'));
    expect(vi.mocked(logAction)).not.toHaveBeenCalled();
  });

  it('triggered_by is human for all audit log entries', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'researched', call_notes: null, target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    await PATCH(makeReq({ action: 'mark_email_sent' }), makeCtx('rel-1'));
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({ triggered_by: 'human' }),
    );
  });
});

// ─── Safety: no SMS or external contact ──────────────────────────────────────

describe('pilotOutreach — no external contact side effects', () => {
  it('PATCH success response includes no-SMS disclaimer', async () => {
    mockPatchDb({
      id: 'rel-1', relationship_status: 'researched', call_notes: null, target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    const res = await PATCH(makeReq({ action: 'mark_email_sent' }), makeCtx('rel-1'));
    const body = await res.json() as Record<string, string>;
    expect(body.note).toContain('No SMS or email has been sent');
  });

  it('PATCH never throws from an unmocked SMS provider (no 46elks call)', async () => {
    // If the handler called 46elks, the unmocked module would throw.
    // The test passing proves no outreach was attempted.
    mockPatchDb({
      id: 'rel-1', relationship_status: 'researched', call_notes: null, target_id: 'tgt-1',
    });
    const { PATCH } = await import('../app/api/admin/pilot-outreach/[id]/route');
    await expect(PATCH(makeReq({ action: 'mark_email_sent' }), makeCtx('rel-1'))).resolves.toBeDefined();
  });
});
