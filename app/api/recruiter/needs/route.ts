import { NextResponse } from 'next/server';
import { getOpenCompanyNeeds } from '../../../../lib/companyNeedStore';

export async function GET(): Promise<NextResponse> {
  try {
    const needs = await getOpenCompanyNeeds();
    return NextResponse.json(needs);
  } catch (err) {
    console.error('recruiter/needs failed:', err);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}
