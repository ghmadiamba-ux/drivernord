import { NextRequest, NextResponse } from 'next/server';
import { validateCompanyNeedInput } from '../../../lib/companyNeed';
import { createCompany, createCompanyNeed, getOpenCompanyNeeds } from '../../../lib/companyNeedStore';
import { requireRecruiterAuth } from '../../../lib/recruiterAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const needs = await getOpenCompanyNeeds();
    return NextResponse.json({ needs });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('GET /api/company-needs failed:', detail);

    if (detail.includes('is not configured')) {
      return NextResponse.json({ error: 'db_not_configured', detail }, { status: 500 });
    }
    return NextResponse.json({ error: 'fetch_failed', detail }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const validation = validateCompanyNeedInput(body as Record<string, unknown>);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { need } = validation;

  let company;
  try {
    company = await createCompany(need.company_name);
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  let companyNeed;
  try {
    companyNeed = await createCompanyNeed(company.id, need);
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  return NextResponse.json({ company, need: companyNeed }, { status: 201 });
}
