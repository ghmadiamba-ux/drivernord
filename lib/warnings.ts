import { db } from './db';

export interface Warning {
  type:     string;
  message:  string;
  severity: 'warning' | 'error';
}

export async function getSystemWarnings(): Promise<Warning[]> {
  const warnings: Warning[] = [];
  const now = Date.now();

  // No completed match_run in last 2 hours
  try {
    const since = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const { data } = await db
      .from('system_actions')
      .select('id')
      .eq('action_type', 'match_run')
      .eq('status', 'completed')
      .gte('created_at', since)
      .limit(1);

    if (!data || data.length === 0) {
      warnings.push({
        type:     'no_match_activity',
        message:  'No completed match run in the last 2 hours.',
        severity: 'warning',
      });
    }
  } catch { /* non-fatal */ }

  // Too many pending actions (>10)
  try {
    const { count } = await db
      .from('system_actions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if ((count ?? 0) > 10) {
      warnings.push({
        type:     'many_pending_actions',
        message:  `${count} actions are pending approval.`,
        severity: 'warning',
      });
    }
  } catch { /* non-fatal */ }

  // Open company need with no shortlist in last 24 hours
  try {
    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const { data: openNeeds } = await db
      .from('company_needs')
      .select('id')
      .eq('status', 'open');

    if (openNeeds && openNeeds.length > 0) {
      const needIds = openNeeds.map((n) => n.id as string);
      const { data: recentShortlists } = await db
        .from('shortlists')
        .select('company_need_id')
        .in('company_need_id', needIds)
        .gte('created_at', since24h);

      const covered = new Set(
        (recentShortlists ?? []).map((s) => s.company_need_id as string),
      );
      const uncoveredCount = needIds.filter((id) => !covered.has(id)).length;

      if (uncoveredCount > 0) {
        warnings.push({
          type:     'need_without_recent_shortlist',
          message:  `${uncoveredCount} open need${uncoveredCount > 1 ? 's have' : ' has'} not been shortlisted in the last 24 hours.`,
          severity: 'warning',
        });
      }
    }
  } catch { /* non-fatal */ }

  // Failed actions in last 24 hours
  try {
    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from('system_actions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', since24h);

    if ((count ?? 0) > 0) {
      warnings.push({
        type:     'failed_actions',
        message:  `${count} action${count === 1 ? '' : 's'} failed in the last 24 hours — retry required.`,
        severity: 'error',
      });
    }
  } catch { /* non-fatal */ }

  // Emergency needs with zero contacted drivers
  try {
    const { data: emergencyNeeds } = await db
      .from('company_needs')
      .select('id')
      .eq('urgency', 'emergency')
      .eq('status', 'open');

    for (const need of emergencyNeeds ?? []) {
      const { data: shortlists } = await db
        .from('shortlists')
        .select('id')
        .eq('company_need_id', need.id as string);

      const slIds = (shortlists ?? []).map((s) => s.id as string);
      if (slIds.length === 0) continue;

      const { count } = await db
        .from('shortlist_entries')
        .select('*', { count: 'exact', head: true })
        .in('shortlist_id', slIds)
        .neq('contact_status', 'new');

      if ((count ?? 0) === 0) {
        warnings.push({
          type:     'emergency_need_zero_contacts',
          message:  'An emergency need has no contacted drivers. Review dedup window.',
          severity: 'error',
        });
      }
    }
  } catch { /* non-fatal */ }

  return warnings;
}
