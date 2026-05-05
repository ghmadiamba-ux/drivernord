import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('../lib/recruiterAuth', () => ({
  requireRecruiterAuth: vi.fn(),
}));

vi.mock('../lib/shortlistStore', () => ({
  updateShortlistEntry: vi.fn(),
  getShortlist:         vi.fn(),
  VALID_CONTACT_STATUSES: ['new', 'contacted', 'interested', 'not_interested'],
}));

import { PATCH as patchEntry } from '../app/api/recruiter/shortlist-entries/[id]/route';
import { GET   as getShortlistRoute } from '../app/api/recruiter/shortlists/[id]/route';
import { requireRecruiterAuth } from '../lib/recruiterAuth';
import { updateShortlistEntry, getShortlist } from '../lib/shortlistStore';

function makeReq(body?: unknown): NextRequest {
  return {
    headers: new Headers({ 'x-recruiter-key': 'test-key' }),
    json:    () => Promise.resolve(body),
  } as unknown as NextRequest;
}

function makeGetReq(): NextRequest {
  return {
    headers: new Headers({ 'x-recruiter-key': 'test-key' }),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRecruiterAuth).mockReturnValue({ ok: true });
});

// ─── PATCH /api/recruiter/shortlist-entries/[id] — auth ───────────────────────

describe('PATCH shortlist-entries — auth', () => {
  it('returns 401 when auth fails', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValue({
      ok: false, status: 401, body: { error: 'unauthorized' },
    });
    const res = await patchEntry(makeReq({ contact_status: 'contacted' }), { params: { id: 'e1' } });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });
});

// ─── PATCH shortlist-entries — input validation ───────────────────────────────

describe('PATCH shortlist-entries — validation', () => {
  it('returns 400 for an invalid contact_status value', async () => {
    const res = await patchEntry(makeReq({ contact_status: 'on_hold' }), { params: { id: 'e1' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_contact_status');
  });

  it('returns 400 when no recognised fields are provided', async () => {
    const res = await patchEntry(makeReq({}), { params: { id: 'e1' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('no_fields_provided');
  });

  it('returns 400 when recruiter_note is not a string', async () => {
    const res = await patchEntry(makeReq({ recruiter_note: 42 }), { params: { id: 'e1' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_recruiter_note');
  });
});

// ─── PATCH shortlist-entries — success ───────────────────────────────────────

describe('PATCH shortlist-entries — success', () => {
  it('returns 200 with ok:true when update succeeds', async () => {
    vi.mocked(updateShortlistEntry).mockResolvedValue(undefined);
    const res = await patchEntry(makeReq({ contact_status: 'contacted' }), { params: { id: 'e1' } });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('calls updateShortlistEntry with entryId and the validated input', async () => {
    vi.mocked(updateShortlistEntry).mockResolvedValue(undefined);
    await patchEntry(
      makeReq({ contact_status: 'interested', recruiter_note: 'Strong candidate' }),
      { params: { id: 'entry-abc' } },
    );
    expect(vi.mocked(updateShortlistEntry)).toHaveBeenCalledWith('entry-abc', {
      contact_status: 'interested',
      recruiter_note: 'Strong candidate',
    });
  });

  it('accepts a note-only patch without contact_status', async () => {
    vi.mocked(updateShortlistEntry).mockResolvedValue(undefined);
    const res = await patchEntry(makeReq({ recruiter_note: 'follow up Thursday' }), { params: { id: 'e1' } });
    expect(res.status).toBe(200);
    expect(vi.mocked(updateShortlistEntry)).toHaveBeenCalledWith('e1', {
      recruiter_note: 'follow up Thursday',
    });
  });

  it('accepts all four valid contact_status values', async () => {
    vi.mocked(updateShortlistEntry).mockResolvedValue(undefined);
    const statuses = ['new', 'contacted', 'interested', 'not_interested'] as const;
    for (const s of statuses) {
      const res = await patchEntry(makeReq({ contact_status: s }), { params: { id: 'e1' } });
      expect(res.status).toBe(200);
    }
  });

  it('returns 404 when updateShortlistEntry throws entry_not_found', async () => {
    vi.mocked(updateShortlistEntry).mockRejectedValue(new Error('entry_not_found'));
    const res = await patchEntry(makeReq({ contact_status: 'contacted' }), { params: { id: 'missing' } });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('not_found');
  });

  it('returns 500 on unexpected store error', async () => {
    vi.mocked(updateShortlistEntry).mockRejectedValue(new Error('connection refused'));
    const res = await patchEntry(makeReq({ contact_status: 'contacted' }), { params: { id: 'e1' } });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('supabase_error');
  });
});

// ─── GET /api/recruiter/shortlists/[id] — auth ───────────────────────────────

describe('GET shortlists — auth', () => {
  it('returns 401 when auth fails', async () => {
    vi.mocked(requireRecruiterAuth).mockReturnValue({
      ok: false, status: 401, body: { error: 'unauthorized' },
    });
    const res = await getShortlistRoute(makeGetReq(), { params: { id: 'sl-1' } });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/recruiter/shortlists/[id] — not found / success ────────────────

describe('GET shortlists — result', () => {
  it('returns 404 when getShortlist returns null', async () => {
    vi.mocked(getShortlist).mockResolvedValue(null);
    const res = await getShortlistRoute(makeGetReq(), { params: { id: 'missing-id' } });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('not_found');
  });

  it('returns 200 with the shortlist when found', async () => {
    const mockShortlist = {
      id:                'sl-123',
      company_need_id:   'need-abc',
      created_at:        new Date('2026-05-01'),
      total_candidates:  10,
      total_shortlisted: 2,
      summary:           '2 of 10 candidates shortlisted',
      entries:           [],
    };
    vi.mocked(getShortlist).mockResolvedValue(mockShortlist);
    const res = await getShortlistRoute(makeGetReq(), { params: { id: 'sl-123' } });
    expect(res.status).toBe(200);
    const body = await res.json() as typeof mockShortlist & { created_at: string };
    expect(body.id).toBe('sl-123');
    expect(body.total_shortlisted).toBe(2);
    expect(body.summary).toBe('2 of 10 candidates shortlisted');
  });

  it('returns 500 when getShortlist throws', async () => {
    vi.mocked(getShortlist).mockRejectedValue(new Error('db error'));
    const res = await getShortlistRoute(makeGetReq(), { params: { id: 'sl-1' } });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('supabase_error');
  });

  it('calls getShortlist with the route param id', async () => {
    vi.mocked(getShortlist).mockResolvedValue(null);
    await getShortlistRoute(makeGetReq(), { params: { id: 'specific-uuid' } });
    expect(vi.mocked(getShortlist)).toHaveBeenCalledWith('specific-uuid');
  });
});
