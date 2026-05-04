import { NextRequest, NextResponse } from 'next/server';
import { validateCompanyNeedInput } from '../../../lib/companyNeed';
import { createCompany, createCompanyNeed, getOpenCompanyNeeds } from '../../../lib/companyNeedStore';

export async function GET(): Promise<NextResponse> {
  try {
    const needs = await getOpenCompanyNeeds();
    return NextResponse.json({ needs });
  } catch (err) {
    console.error('GET /api/company-needs failed:', err);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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
