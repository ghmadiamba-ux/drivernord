import { type NextRequest, NextResponse } from 'next/server';
import { requireRecruiterAuth } from '../../../../lib/recruiterAuth';
import { notifyFounderWhatsApp, isFounderWhatsAppEnabled } from '../../../../lib/founderNotifier';
import { getWhatsAppFounderPhone } from '../../../../lib/whatsappClient';
import { logAction } from '../../../../lib/systemActions';
import type { PostDuePayload } from '../../../../lib/founderNotifier';

// POST /api/admin/whatsapp-test
// Recruiter-auth protected. Sends a test WhatsApp notification to the founder relay.
// Requires { confirm: true } in the request body to prevent accidental sends.
// When FOUNDER_WHATSAPP_ENABLED is not set, returns dry_run: true without sending.
// Never bypasses any gates in notifyFounderWhatsApp().
//
// SAFETY:
//   ✗ Does not send to drivers, companies, or the WhatsApp group
//   ✗ Does not expose WHATSAPP_ACCESS_TOKEN
//   ✗ Does not bypass FOUNDER_WHATSAPP_ENABLED, phone allowlist, or rate limit
//   ✓ Logs test action to system_actions regardless of outcome

const SAMPLE_POST: PostDuePayload = {
  id:             'whatsapp-test-probe',
  day_number:     0,
  title:          'WhatsApp Relay Test',
  category:       'weekly_tips',
  post_text:      'Det här är ett testmeddelande från DriverNord admin-cockpit. Inget riktigt inlägg att posta — bara en bekräftelse att WhatsApp-relay fungerar.',
  suggested_time: null,
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireRecruiterAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    // no-op — body is optional; confirm check below handles missing key
  }

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: 'confirm: true required to send test WhatsApp message' },
      { status: 400 },
    );
  }

  const whatsapp_enabled = isFounderWhatsAppEnabled();
  const recipient        = getWhatsAppFounderPhone() || null;

  const notifyResult = await notifyFounderWhatsApp(SAMPLE_POST);

  await logAction({
    action_type:  notifyResult.sent ? 'founder_notification_sent' : 'founder_notification_failed',
    triggered_by: 'admin:whatsapp-test',
    target_type:  'logistikklubb_scheduled_post',
    target_id:    SAMPLE_POST.id,
    status:       notifyResult.sent ? 'completed' : (notifyResult.dry_run ? 'pending' : 'failed'),
    input:        { channel: 'whatsapp', test: true, confirm: true },
    result:       {
      channel:    'whatsapp',
      sent:       notifyResult.sent,
      dry_run:    notifyResult.dry_run,
      message_id: notifyResult.message_id,
    },
    error:        notifyResult.error ?? undefined,
  });

  if (!notifyResult.sent && !notifyResult.dry_run) {
    return NextResponse.json(
      {
        ok:               false,
        dry_run:          false,
        error:            notifyResult.error,
        message_id:       null,
        whatsapp_enabled,
        recipient,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok:               notifyResult.sent,
    dry_run:          notifyResult.dry_run,
    error:            notifyResult.error,
    message_id:       notifyResult.message_id,
    whatsapp_enabled,
    recipient,
  });
}
