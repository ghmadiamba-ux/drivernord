import { db } from './db';
import { logAction } from './systemActions';
import { updateShortlistEntry } from './shortlistStore';

// ─── Config ───────────────────────────────────────────────────────────────────

const CONTACT_MIN_SCORE    = 60;
const DEDUP_DAYS           = 14;
const DEDUP_DAYS_EMERGENCY = 3;

type ContactMode = 'suggest' | 'auto' | 'hybrid';

function getMode(): ContactMode {
  const m = process.env.AGENT_CONTACT_MODE;
  if (m === 'auto' || m === 'hybrid') return m;
  return 'suggest';
}

function getAutoThreshold(): number {
  const t = parseInt(process.env.AUTO_CONTACT_THRESHOLD ?? '85', 10);
  return isNaN(t) ? 85 : t;
}

function isEnabled(): boolean {
  return process.env.AGENT_CONTACT_ENABLED !== 'false';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EntryRow {
  id:              string;
  driver_id:       string;
  match_score:     number;
  contact_status:  string;
  contacted_at:    string | null;
  driver_snapshot: {
    firstName:       string | null;
    phone:           string | null;
    region:          string | null;
    domain:          string | null;
    shiftPreference: string | null;
  };
}

interface DriverInfo {
  ykb:          string | null;
  availability: string | null;
}

interface CompanyContext {
  company_name:    string;
  location_region: string;
  domain_required: string;
  shift_type:      string;
  urgency:         string;
  company_need_id: string;
  shortlist_id:    string;
}

export interface ContactAgentResult {
  suggested: number;
  contacted: number;
  skipped:   number;
  errors:    number;
}

// ─── Company context fetch ────────────────────────────────────────────────────

async function fetchCompanyContext(shortlistId: string): Promise<CompanyContext> {
  const { data: slHeader, error: slErr } = await db
    .from('shortlists')
    .select('company_need_id')
    .eq('id', shortlistId)
    .single();

  if (slErr || !slHeader) {
    throw new Error(`contactAgent: shortlist ${shortlistId} not found`);
  }

  const companyNeedId = slHeader.company_need_id as string;

  const { data: need, error: needErr } = await db
    .from('company_needs')
    .select('company_id, location_region, domain_required, shift_type, urgency')
    .eq('id', companyNeedId)
    .single();

  if (needErr || !need) {
    throw new Error(`contactAgent: company_need ${companyNeedId} not found`);
  }

  const { data: company, error: coErr } = await db
    .from('companies')
    .select('name')
    .eq('id', need.company_id)
    .single();

  if (coErr || !company) {
    throw new Error(`contactAgent: company ${need.company_id} not found`);
  }

  return {
    company_name:    company.name as string,
    location_region: need.location_region as string,
    domain_required: need.domain_required as string,
    shift_type:      need.shift_type as string,
    urgency:         (need.urgency as string) ?? 'standard',
    company_need_id: companyNeedId,
    shortlist_id:    shortlistId,
  };
}

// ─── Anti-spam dedup check ────────────────────────────────────────────────────

async function wasRecentlyContacted(
  driverId:  string,
  dedupDays: number,
): Promise<{ yes: boolean; contacted_at?: string; shortlist_id?: string }> {
  const since = new Date(Date.now() - dedupDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('shortlist_entries')
    .select('contacted_at, shortlist_id')
    .eq('driver_id', driverId)
    .neq('contact_status', 'new')
    .gt('contacted_at', since)
    .order('contacted_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(`contactAgent dedup check failed: ${error.message}`);

  if (!data || data.length === 0) return { yes: false };

  return {
    yes:          true,
    contacted_at: data[0].contacted_at as string,
    shortlist_id: data[0].shortlist_id as string,
  };
}

// ─── Message generator (simulated — no SMS provider yet) ─────────────────────

function buildMessage(firstName: string, ctx: CompanyContext): string {
  return (
    `Hej ${firstName} 👋\n\n` +
    `Vi har en match för dig i ${ctx.location_region} (${ctx.domain_required}, ${ctx.shift_type}).\n\n` +
    `Vill du att vi kopplar dig direkt till företaget?\n` +
    `→ Svara JA så går vi vidare`
  );
}

// ─── Entry processor ──────────────────────────────────────────────────────────

async function processEntry(
  entry:      EntryRow,
  driverInfo: DriverInfo,
  ctx:        CompanyContext,
  mode:       ContactMode,
  autoThr:    number,
  result:     ContactAgentResult,
): Promise<void> {
  const snap      = entry.driver_snapshot;
  const firstName = snap.firstName ?? null;
  const phone     = snap.phone ?? null;

  // ── Hard filters ────────────────────────────────────────────────────────
  if (entry.match_score < CONTACT_MIN_SCORE || !phone || !firstName) {
    result.skipped++;
    return;
  }

  // ── Skip already-actioned entries on this shortlist ──────────────────────
  if (entry.contact_status !== 'new') {
    result.skipped++;
    return;
  }

  // ── YKB guard ────────────────────────────────────────────────────────────
  if (driverInfo.ykb === 'in_progress') {
    await logAction({
      action_type:  'contact_skipped',
      triggered_by: 'agent:contact',
      target_type:  'shortlist_entry',
      target_id:    entry.id,
      status:       'completed',
      input: {
        driver_id:       entry.driver_id,
        match_score:     entry.match_score,
        urgency:         ctx.urgency,
        company_need_id: ctx.company_need_id,
        shortlist_id:    ctx.shortlist_id,
      },
      result: { reason: 'ykb_in_progress' },
    });
    result.skipped++;
    return;
  }

  // ── Availability guard ───────────────────────────────────────────────────
  if (driverInfo.availability === 'not_yet') {
    await logAction({
      action_type:  'contact_skipped',
      triggered_by: 'agent:contact',
      target_type:  'shortlist_entry',
      target_id:    entry.id,
      status:       'completed',
      input: {
        driver_id:       entry.driver_id,
        match_score:     entry.match_score,
        urgency:         ctx.urgency,
        company_need_id: ctx.company_need_id,
        shortlist_id:    ctx.shortlist_id,
      },
      result: { reason: 'not_available_yet' },
    });
    result.skipped++;
    return;
  }

  // ── Anti-spam dedup (emergency = 3d window, others = 14d) ───────────────
  const dedupDays = ctx.urgency === 'emergency' ? DEDUP_DAYS_EMERGENCY : DEDUP_DAYS;
  const dedup = await wasRecentlyContacted(entry.driver_id, dedupDays);
  if (dedup.yes) {
    await logAction({
      action_type:  'contact_skipped',
      triggered_by: 'agent:contact',
      target_type:  'shortlist_entry',
      target_id:    entry.id,
      status:       'completed',
      input: {
        driver_id:       entry.driver_id,
        match_score:     entry.match_score,
        urgency:         ctx.urgency,
        company_need_id: ctx.company_need_id,
        shortlist_id:    ctx.shortlist_id,
      },
      result: {
        reason:                    'recently_contacted',
        dedup_window_days:         dedupDays,
        last_contacted_at:         dedup.contacted_at,
        last_contact_shortlist_id: dedup.shortlist_id,
      },
    });
    result.skipped++;
    return;
  }

  // ── Mode decision ────────────────────────────────────────────────────────
  const shouldAuto =
    mode === 'auto' ||
    (mode === 'hybrid' && entry.match_score >= autoThr);

  if (shouldAuto) {
    await autoContact(entry, ctx, firstName, phone, result);
  } else {
    await suggestContact(entry, ctx, firstName, phone, result);
  }
}

// ── Case A: Suggest ──────────────────────────────────────────────────────────

async function suggestContact(
  entry:     EntryRow,
  ctx:       CompanyContext,
  firstName: string,
  phone:     string,
  result:    ContactAgentResult,
): Promise<void> {
  await logAction({
    action_type:  'contact_suggested',
    triggered_by: 'agent:contact',
    target_type:  'shortlist_entry',
    target_id:    entry.id,
    status:       'pending',
    input: {
      driver_id:       entry.driver_id,
      match_score:     entry.match_score,
      first_name:      firstName,
      phone,
      company_name:    ctx.company_name,
      urgency:         ctx.urgency,
      company_need_id: ctx.company_need_id,
      shortlist_id:    ctx.shortlist_id,
    },
  });
  result.suggested++;
}

// ── Case B: Auto contact ─────────────────────────────────────────────────────

async function autoContact(
  entry:     EntryRow,
  ctx:       CompanyContext,
  firstName: string,
  phone:     string,
  result:    ContactAgentResult,
): Promise<void> {
  const message = buildMessage(firstName, ctx);

  // Simulate send — no SMS provider yet
  console.log(
    `[contactAgent] SIMULATED SEND to ${phone}\n` +
    `─────────────────────────────\n` +
    message +
    `\n─────────────────────────────`,
  );

  // Update entry status
  await updateShortlistEntry(entry.id, { contact_status: 'contacted' });

  // Log
  await logAction({
    action_type:  'contact_sent',
    triggered_by: 'agent:contact',
    target_type:  'driver',
    target_id:    entry.driver_id,
    status:       'completed',
    input: {
      match_score:          entry.match_score,
      shortlist_entry_id:   entry.id,
      first_name:           firstName,
      urgency:              ctx.urgency,
      company_need_id:      ctx.company_need_id,
      shortlist_id:         ctx.shortlist_id,
    },
    result: {
      channel:         'simulated',
      company_name:    ctx.company_name,
      message_preview: message.slice(0, 80),
    },
  });

  result.contacted++;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runContactAgent(input: {
  shortlistId: string;
}): Promise<ContactAgentResult> {
  const result: ContactAgentResult = {
    suggested: 0,
    contacted: 0,
    skipped:   0,
    errors:    0,
  };

  // Global kill switch
  if (!isEnabled()) {
    console.log('[contactAgent] disabled via AGENT_CONTACT_ENABLED=false');
    return result;
  }

  const mode    = getMode();
  const autoThr = getAutoThreshold();
  const { shortlistId } = input;

  // ── Fetch company context ────────────────────────────────────────────────
  let ctx: CompanyContext;
  try {
    ctx = await fetchCompanyContext(shortlistId);
  } catch (err) {
    console.error('[contactAgent] failed to fetch company context:', err);
    result.errors++;
    return result;
  }

  // ── Fetch entries ────────────────────────────────────────────────────────
  let entries: EntryRow[];
  try {
    const { data, error } = await db
      .from('shortlist_entries')
      .select('id, driver_id, match_score, contact_status, contacted_at, driver_snapshot')
      .eq('shortlist_id', shortlistId);

    if (error) throw error;
    entries = (data ?? []) as EntryRow[];
  } catch (err) {
    console.error('[contactAgent] failed to fetch entries:', err);
    result.errors++;
    return result;
  }

  // ── Batch-fetch driver ykb + availability for safety guards ─────────────
  const driverIds = [...new Set(entries.map(e => e.driver_id))];
  const driverInfoMap = new Map<string, DriverInfo>();
  if (driverIds.length > 0) {
    try {
      const { data: drivers } = await db
        .from('ingested_drivers')
        .select('id, ykb, availability')
        .in('id', driverIds);
      for (const d of drivers ?? []) {
        driverInfoMap.set(d.id as string, {
          ykb:          (d.ykb as string) ?? null,
          availability: (d.availability as string) ?? null,
        });
      }
    } catch {
      // guards default to null (not triggered) if fetch fails
    }
  }

  // ── Process each entry ───────────────────────────────────────────────────
  for (const entry of entries) {
    try {
      const driverInfo = driverInfoMap.get(entry.driver_id) ?? { ykb: null, availability: null };
      await processEntry(entry, driverInfo, ctx, mode, autoThr, result);
    } catch (err) {
      console.error('[contactAgent] error on entry', entry.id, ':', err);
      result.errors++;
    }
  }

  return result;
}
