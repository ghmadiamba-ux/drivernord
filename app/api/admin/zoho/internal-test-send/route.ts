import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../../lib/recruiterAuth';
import {
  sendEmailViaZoho,
  getZohoConfigStatus,
  getZohoFromEmail,
  getZohoFromName,
} from '../../../../../lib/zohoMailClient';
import { logAction } from '../../../../../lib/systemActions';

// POST /api/admin/zoho/internal-test-send
// Sends a single test email to a verified internal address (founder only).
// PURPOSE: verify Zoho credentials are correct before enabling real outreach.
// SAFETY: only sends to ZOHO_TEST_RECIPIENT — rejects all other addresses.
//
// Required env var: ZOHO_TEST_RECIPIENT (e.g. ghmadiamba@gmail.com)
// Blocked unless all 6 Zoho env vars are configured.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const configStatus = getZohoConfigStatus();
  if (!configStatus.configured) {
    return NextResponse.json(
      {
        error:       'Zoho not configured',
        missing_env: configStatus.missing_env,
      },
      { status: 400 },
    );
  }

  const testRecipient = process.env.ZOHO_TEST_RECIPIENT;
  if (!testRecipient) {
    return NextResponse.json(
      { error: 'ZOHO_TEST_RECIPIENT env var not set — set to your personal email before testing' },
      { status: 400 },
    );
  }

  const body = await req.json() as { confirm?: boolean } | null;
  if (!body?.confirm) {
    return NextResponse.json(
      { error: 'Pass { confirm: true } to proceed with internal test send' },
      { status: 400 },
    );
  }

  const now    = new Date().toISOString();
  const result = await sendEmailViaZoho({
    to:         testRecipient,
    subject:    `[DriverNord internal test] Zoho integration check — ${now}`,
    body:       `Detta är ett internt testmejl från DriverNord-systemet.\n\nSkickat: ${now}\nAvsändare: ${getZohoFromName()} <${getZohoFromEmail()}>\n\nOm du ser detta fungerar Zoho-integrationen korrekt.`,
    from_email: getZohoFromEmail(),
    from_name:  getZohoFromName(),
  });

  await logAction({
    action_type:  result.success ? 'outreach_email_sent' : 'outreach_email_failed',
    triggered_by: 'founder_internal_test',
    target_type:  'outreach_email_queue',
    target_id:    'internal-test',
    status:       result.success ? 'completed' : 'failed',
    input:        { recipient: testRecipient, test: true },
    result:       { message_id: result.message_id, dry_run: result.dry_run },
    error:        result.error ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok:         true,
    message_id: result.message_id,
    recipient:  testRecipient,
    dry_run:    result.dry_run,
  });
}
