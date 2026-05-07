import type { NextRequest } from 'next/server';

export type RecruiterAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 500; body: { error: 'unauthorized' | 'auth_not_configured' } };

export function requireRecruiterAuth(req: NextRequest): RecruiterAuthResult {
  const envKey = process.env.RECRUITER_API_KEY;
  if (!envKey) {
    return { ok: false, status: 500, body: { error: 'auth_not_configured' } };
  }

  const headerKey = req.headers.get('x-recruiter-key');
  if (headerKey && headerKey === envKey) return { ok: true };

  const cookieKey = req.cookies.get('recruiter_session')?.value;
  if (cookieKey && cookieKey === envKey) return { ok: true };

  return { ok: false, status: 401, body: { error: 'unauthorized' } };
}
