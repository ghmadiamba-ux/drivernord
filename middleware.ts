import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/recruiter') || pathname.startsWith('/recruiter/login')) {
    return NextResponse.next();
  }

  const envKey  = process.env.RECRUITER_API_KEY;
  const session = req.cookies.get('recruiter_session')?.value;

  if (!envKey || !session || session !== envKey) {
    const url = req.nextUrl.clone();
    url.pathname = '/recruiter/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/recruiter/:path*'],
};
