// TEMPORARY route — one-time use to discover ZOHO_ACCOUNT_ID.
// Protected by ZOHO_ACCOUNT_LOOKUP_SECRET env var.
// Returns 404 when ZOHO_ACCOUNT_LOOKUP_SECRET is not set (auto-disables after key removal).
// SAFE: never returns access tokens, client secrets, or refresh tokens.
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.ZOHO_ACCOUNT_LOOKUP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN) {
    return NextResponse.json({ error: 'Zoho OAuth env vars not configured' }, { status: 500 });
  }

  // Exchange refresh token for access token — access token is NOT returned to caller
  const tokenRes = await fetch('https://accounts.zoho.eu/oauth/v2/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.json({ error: `Token refresh failed: HTTP ${tokenRes.status}`, detail: text }, { status: 500 });
  }

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return NextResponse.json({ error: `No access_token: ${tokenData.error ?? 'unknown'}` }, { status: 500 });
  }

  // Fetch accounts list — never log or return the access token
  const accountsRes = await fetch('https://mail.zoho.eu/api/accounts', {
    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
  });

  if (!accountsRes.ok) {
    const text = await accountsRes.text();
    return NextResponse.json({ error: `Accounts API failed: HTTP ${accountsRes.status}`, detail: text }, { status: 500 });
  }

  const data = await accountsRes.json() as { data?: Array<{ accountId: string; emailAddress: string; displayName: string }> };
  const accounts = (data.data ?? []).map((a) => ({
    accountId:    a.accountId,
    emailAddress: a.emailAddress,
    displayName:  a.displayName,
  }));

  return NextResponse.json({ accounts, count: accounts.length });
}
