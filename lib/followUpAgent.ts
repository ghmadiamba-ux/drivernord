import { db } from './db';
import { logAction } from './systemActions';

// ─── Config ───────────────────────────────────────────────────────────────────

const DEDUP_DAYS = 7;

type FollowUpMode = 'suggest' | 'auto';

function getMode(): FollowUpMode {
  return process.env.AGENT_FOLLOWUP_MODE === 'auto' ? 'auto' : 'suggest';
}

function isEnabled(): boolean {
  return process.env.AGENT_FOLLOWUP_ENABLED !== 'false';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverRow {
  id:               string;
  first_name:       string | null;
  phone:            string | null;
  follow_up_reason: string | null;
  follow_up_at:     string | null;
}

export interface FollowUpAgentResult {
  suggested: number;
  sent:      number;
  skipped:   number;
  errors:    number;
}

// ─── Message templates ────────────────────────────────────────────────────────

function buildMessage(firstName: string, reason: string | null): string {
  if (reason === 'not_yet_available') {
    return (
      `Hej ${firstName} 👋\n\n` +
      `Har din tillgänglighet ändrats sedan vi pratades vid?\n\n` +
      `Vi har chaufförsroller tillgängliga nu — hör av dig om du är redo!\n` +
      `→ Svara JA om du är tillgänglig nu`
    );
  }
  if (reason === 'ykb_in_progress') {
    return (
      `Hej ${firstName} 👋\n\n` +
      `Hur går det med din YKB-utbildning?\n\n` +
      `När du är klar vill vi gärna matcha dig med en passande roll.\n` +
      `→ Svara KLAR när du har din YKB`
    );
  }
  // default: incomplete_lead
  return (
    `Hej ${firstName} 👋\n\n` +
    `Vi saknar lite information för att kunna matcha dig med rätt jobb.\n\n` +
    `Kan du ta 2 minuter och slutföra din profil?\n` +
    `→ Svara JA så skickar vi länken`
  );
}

// ─── Anti-spam dedup check ────────────────────────────────────────────────────

async function wasRecentlyContacted(
  driverId: string,
): Promise<{ yes: boolean; contacted_at?: string }> {
  const since = new Date(Date.now() - DEDUP_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('shortlist_entries')
    .select('contacted_at')
    .eq('driver_id', driverId)
    .neq('contact_status', 'new')
    .gt('contacted_at', since)
    .order('contacted_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(`followUpAgent dedup check failed: ${error.message}`);

  if (!data || data.length === 0) return { yes: false };
  return { yes: true, contacted_at: data[0].contacted_at as string };
}

// ─── Driver processor ─────────────────────────────────────────────────────────

async function processDriver(
  driver: DriverRow,
  mode:   FollowUpMode,
  result: FollowUpAgentResult,
): Promise<void> {
  const firstName = driver.first_name;
  const phone     = driver.phone;

  if (!phone || !firstName) {
    result.skipped++;
    return;
  }

  const dedup = await wasRecentlyContacted(driver.id);
  if (dedup.yes) {
    await logAction({
      action_type:  'follow_up_skipped',
      triggered_by: 'agent:followup',
      target_type:  'driver',
      target_id:    driver.id,
      status:       'completed',
      result: {
        reason:            'recently_contacted',
        last_contacted_at: dedup.contacted_at,
      },
    });
    result.skipped++;
    return;
  }

  if (mode === 'auto') {
    await autoSend(driver, firstName, phone, result);
  } else {
    await suggest(driver, firstName, phone, result);
  }
}

// ── Case A: Suggest ───────────────────────────────────────────────────────────

async function suggest(
  driver:    DriverRow,
  firstName: string,
  phone:     string,
  result:    FollowUpAgentResult,
): Promise<void> {
  await logAction({
    action_type:  'follow_up_triggered',
    triggered_by: 'agent:followup',
    target_type:  'driver',
    target_id:    driver.id,
    status:       'pending',
    input: {
      first_name:       firstName,
      phone,
      follow_up_reason: driver.follow_up_reason,
      follow_up_at:     driver.follow_up_at,
    },
  });
  result.suggested++;
}

// ── Case B: Auto send ─────────────────────────────────────────────────────────

async function autoSend(
  driver:    DriverRow,
  firstName: string,
  phone:     string,
  result:    FollowUpAgentResult,
): Promise<void> {
  const message = buildMessage(firstName, driver.follow_up_reason);

  console.log(
    `[followUpAgent] SIMULATED SEND to ${phone}\n` +
    `─────────────────────────────\n` +
    message +
    `\n─────────────────────────────`,
  );

  await db.from('drivers').update({ follow_up_sent: true }).eq('id', driver.id);

  await logAction({
    action_type:  'follow_up_sent',
    triggered_by: 'agent:followup',
    target_type:  'driver',
    target_id:    driver.id,
    status:       'completed',
    input: {
      follow_up_reason: driver.follow_up_reason,
      follow_up_at:     driver.follow_up_at,
    },
    result: {
      channel:         'simulated',
      message_preview: message.slice(0, 80),
    },
  });

  result.sent++;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runFollowUpAgent(): Promise<FollowUpAgentResult> {
  const result: FollowUpAgentResult = { suggested: 0, sent: 0, skipped: 0, errors: 0 };

  if (!isEnabled()) {
    console.log('[followUpAgent] disabled via AGENT_FOLLOWUP_ENABLED=false');
    return result;
  }

  const mode = getMode();
  const now  = new Date().toISOString();

  let drivers: DriverRow[];
  try {
    const { data, error } = await db
      .from('drivers')
      .select('id, first_name, phone, follow_up_reason, follow_up_at')
      .lte('follow_up_at', now)
      .eq('follow_up_sent', false);

    if (error) throw error;
    drivers = (data ?? []) as DriverRow[];
  } catch (err) {
    console.error('[followUpAgent] failed to fetch drivers:', err);
    result.errors++;
    return result;
  }

  for (const driver of drivers) {
    try {
      await processDriver(driver, mode, result);
    } catch (err) {
      console.error('[followUpAgent] error on driver', driver.id, ':', err);
      result.errors++;
    }
  }

  return result;
}
