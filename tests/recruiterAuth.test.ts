import { describe, it, expect, vi, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { requireRecruiterAuth } from '../lib/recruiterAuth';

function makeReq(key?: string): NextRequest {
  const headers = new Headers();
  if (key !== undefined) headers.set('x-recruiter-key', key);
  return { headers } as unknown as NextRequest;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── auth_not_configured ──────────────────────────────────────────────────────

describe('requireRecruiterAuth — auth_not_configured', () => {
  it('returns 500 auth_not_configured when env var is not set', () => {
    vi.stubEnv('RECRUITER_API_KEY', '');
    const result = requireRecruiterAuth(makeReq('any-key'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(500);
    expect(result.body.error).toBe('auth_not_configured');
  });
});

// ─── unauthorized ─────────────────────────────────────────────────────────────

describe('requireRecruiterAuth — unauthorized', () => {
  it('returns 401 unauthorized when header is missing', () => {
    vi.stubEnv('RECRUITER_API_KEY', 'test-secret');
    const result = requireRecruiterAuth(makeReq());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
    expect(result.body.error).toBe('unauthorized');
  });

  it('returns 401 unauthorized when header is wrong', () => {
    vi.stubEnv('RECRUITER_API_KEY', 'test-secret');
    const result = requireRecruiterAuth(makeReq('wrong-key'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
    expect(result.body.error).toBe('unauthorized');
  });

  it('returns 401 unauthorized when header is empty string', () => {
    vi.stubEnv('RECRUITER_API_KEY', 'test-secret');
    const result = requireRecruiterAuth(makeReq(''));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
    expect(result.body.error).toBe('unauthorized');
  });
});

// ─── ok ───────────────────────────────────────────────────────────────────────

describe('requireRecruiterAuth — ok', () => {
  it('returns ok:true when header matches env var exactly', () => {
    vi.stubEnv('RECRUITER_API_KEY', 'test-secret');
    const result = requireRecruiterAuth(makeReq('test-secret'));
    expect(result.ok).toBe(true);
  });

  it('is case-sensitive — wrong case returns 401', () => {
    vi.stubEnv('RECRUITER_API_KEY', 'Test-Secret');
    const result = requireRecruiterAuth(makeReq('test-secret'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
  });
});
