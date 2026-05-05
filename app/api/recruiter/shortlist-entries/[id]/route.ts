import { NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import { updateShortlistEntry, VALID_CONTACT_STATUSES } from '../../../../../lib/shortlistStore';
import type { ContactStatus } from '../../../../../lib/shortlistStore';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const input: { contact_status?: ContactStatus; recruiter_note?: string } = {};

  if (raw.contact_status !== undefined) {
    if (!VALID_CONTACT_STATUSES.includes(raw.contact_status as ContactStatus)) {
      return NextResponse.json({ error: 'invalid_contact_status' }, { status: 400 });
    }
    input.contact_status = raw.contact_status as ContactStatus;
  }

  if (raw.recruiter_note !== undefined) {
    if (typeof raw.recruiter_note !== 'string') {
      return NextResponse.json({ error: 'invalid_recruiter_note' }, { status: 400 });
    }
    input.recruiter_note = raw.recruiter_note;
  }

  if (input.contact_status === undefined && input.recruiter_note === undefined) {
    return NextResponse.json({ error: 'no_fields_provided' }, { status: 400 });
  }

  try {
    await updateShortlistEntry(params.id, input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'entry_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
