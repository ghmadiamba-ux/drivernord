-- VERIFY_EMAIL_AUTOMATION_PRE_DEPLOYMENT.sql
-- Run these queries in Supabase SQL Editor to confirm the system is ready
-- for controlled founder-approved sending.
-- Expected results annotated on each query.
-- !! READ-ONLY — no writes in this file !!

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Confirm outreach_email_queue table exists and has expected columns
-- ──────────────────────────────────────────────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'outreach_email_queue'
ORDER BY ordinal_position;
-- Expected: 22+ rows including id, company_name_snapshot, recipient_email,
-- recipient_name, subject, body, readiness_category, safe_claim_used,
-- risk_notes, status, provider, provider_message_id, scheduled_send_at,
-- sent_at, reply_detected_at, reply_classification, created_by_agent,
-- approved_by_founder, automation_used, send_mode, created_at, updated_at.

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Count rows by status — confirm current queue state
-- ──────────────────────────────────────────────────────────────────────────────
SELECT status, send_mode, COUNT(*) AS row_count
FROM public.outreach_email_queue
GROUP BY status, send_mode
ORDER BY status, send_mode;
-- Expected: rows showing draft/approved counts. All should be dry_run
-- until founder explicitly changes send_mode for live testing.

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Confirm NO rows have send_mode = 'founder_approval' that are NOT approved
-- ──────────────────────────────────────────────────────────────────────────────
SELECT id, company_name_snapshot, status, send_mode, approved_by_founder
FROM public.outreach_email_queue
WHERE send_mode = 'founder_approval'
  AND approved_by_founder = false
  AND status NOT IN ('draft', 'skipped');
-- Expected: 0 rows. Any rows here indicate a data integrity issue.

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Confirm system_actions table has outreach action types stored correctly
-- ──────────────────────────────────────────────────────────────────────────────
SELECT action_type, status, triggered_by, created_at
FROM public.system_actions
WHERE action_type LIKE 'outreach_%'
ORDER BY created_at DESC
LIMIT 20;
-- Expected: rows showing outreach_email_queued or similar events.
-- After internal test send: one outreach_email_sent row with triggered_by = 'founder_internal_test'.

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Confirm no emails have been sent with automation_used = true yet
-- ──────────────────────────────────────────────────────────────────────────────
SELECT id, company_name_snapshot, recipient_email, sent_at, automation_used
FROM public.outreach_email_queue
WHERE status = 'sent'
  AND automation_used = true
ORDER BY sent_at DESC;
-- Expected: 0 rows before any dispatch. First row will appear after
-- the founder approves the first item and triggers the dispatch route.

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Confirm rate limit state — emails sent in the last hour
-- ──────────────────────────────────────────────────────────────────────────────
SELECT COUNT(*) AS sent_in_last_hour
FROM public.outreach_email_queue
WHERE status = 'sent'
  AND sent_at >= NOW() - INTERVAL '1 hour';
-- Expected: 0 (or < 2 if test just ran). Rate limit is 2 per hour.
-- Dispatch route will reject if this count >= 2.

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. Preview of items that would be eligible for dispatch (approved, not dry_run)
-- ──────────────────────────────────────────────────────────────────────────────
SELECT id, company_name_snapshot, recipient_email, subject, readiness_category,
       send_mode, approved_by_founder, status, scheduled_send_at
FROM public.outreach_email_queue
WHERE status    = 'approved'
  AND send_mode != 'dry_run'
  AND approved_by_founder = true
ORDER BY scheduled_send_at ASC NULLS LAST;
-- Expected: 0 rows until founder explicitly promotes an item.
-- These are the only rows the dispatch route will accept.

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. Confirm JPC Entreprenad AB is NOT in the queue as an eligible item
-- ──────────────────────────────────────────────────────────────────────────────
SELECT id, company_name_snapshot, status, send_mode, approved_by_founder
FROM public.outreach_email_queue
WHERE LOWER(company_name_snapshot) LIKE '%jpc%'
  AND status NOT IN ('skipped', 'failed');
-- Expected: 0 rows. JPC should only appear with status=skipped or not at all.
-- Dispatch route also rejects JPC at validateEmailBeforeSend() gate.
