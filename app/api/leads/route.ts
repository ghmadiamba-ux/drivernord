import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '../../../lib/supabaseStore';
import { getNextStep, getFirstStep } from '../../../lib/conversation';
import type { Lang } from '../../../types/lead';
import type { AttributionInput } from '../../../lib/supabaseStore';

// ─── Rate limiting ────────────────────────────────────────────────────────────
//
// MVP in-memory rate limit. NOT reliable across multiple Vercel instances —
// each serverless invocation has its own memory. Provides basic protection
// against naive bot spam within a single instance lifetime. Replace with
// Upstash Redis or Vercel Firewall before high-volume campaign.

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX    = 10;
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(ip: string): boolean {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ─── Attribution sanitisation ─────────────────────────────────────────────────

function sanitizeText(val: unknown, maxLen = 500): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim().slice(0, maxLen);
  return trimmed || null;
}

// ─── POST /api/leads ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const lang = b?.lang;
  if (lang !== 'sv' && lang !== 'en') {
    return NextResponse.json({ error: 'invalid_lang' }, { status: 400 });
  }

  const attribution: AttributionInput = {
    utm_source:       sanitizeText(b.utm_source),
    utm_medium:       sanitizeText(b.utm_medium),
    utm_campaign:     sanitizeText(b.utm_campaign),
    utm_content:      sanitizeText(b.utm_content),
    utm_term:         sanitizeText(b.utm_term),
    landing_page_url: sanitizeText(b.landing_page_url, 2000),
    referrer_url:     sanitizeText(b.referrer_url, 2000),
  };

  let lead;
  try {
    lead = await createLead(lang as Lang, attribution);
  } catch {
    return NextResponse.json({ error: 'supabase_error' }, { status: 500 });
  }

  const next_step = getNextStep(getFirstStep(), { region: null, license: null });

  return NextResponse.json(
    { id: lead.id, next_step, lead_status: lead.lead_status },
    { status: 201 },
  );
}
