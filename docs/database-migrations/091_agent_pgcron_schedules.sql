-- pg_cron schedules for Marketing Agent
-- Run this AFTER deploying the Edge Function

-- NOTE: Replace YOUR_PROJECT_REF with your actual Supabase project reference
-- You can find this in your Supabase dashboard URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF

-- ============================================================================
-- Daily Insights Schedule
-- ============================================================================

-- Schedule daily insights at 9:00 AM UTC (adjust timezone as needed)
SELECT cron.schedule(
  'marketing-agent-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/marketing-agent',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', 'daily'
    )
  );
  $$
);

-- ============================================================================
-- Weekly Insights Schedule
-- ============================================================================

-- Schedule weekly insights every Monday at 9:00 AM UTC
SELECT cron.schedule(
  'marketing-agent-weekly',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/marketing-agent',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', 'weekly'
    )
  );
  $$
);

-- ============================================================================
-- View Scheduled Jobs
-- ============================================================================

-- Query to view all scheduled cron jobs
SELECT * FROM cron.job WHERE jobname LIKE 'marketing-agent%';

-- Query to view cron job execution history
SELECT 
  j.jobname,
  d.status,
  d.return_message,
  d.start_time,
  d.end_time
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
WHERE j.jobname LIKE 'marketing-agent%'
ORDER BY d.start_time DESC
LIMIT 20;

-- ============================================================================
-- Manage Schedules
-- ============================================================================

-- Unschedule a job (if needed)
-- SELECT cron.unschedule('marketing-agent-daily');
-- SELECT cron.unschedule('marketing-agent-weekly');

-- ============================================================================
-- Store Service Role Key as Setting (for cron jobs)
-- ============================================================================

-- This allows the cron job to authenticate with the Edge Function
-- Run this once with your actual service role key:

-- ALTER DATABASE postgres SET app.settings.service_role_key TO 'YOUR_SERVICE_ROLE_KEY_HERE';

-- To verify it's set:
-- SELECT current_setting('app.settings.service_role_key');

-- ============================================================================
-- Testing
-- ============================================================================

-- Manually trigger the cron job SQL to test
-- (Without actually scheduling it)

/*
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/marketing-agent',
  headers := jsonb_build_object(
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object(
    'type', 'daily'
  )
);
*/

-- ============================================================================
-- Notes
-- ============================================================================

-- 1. Make sure pg_cron extension is enabled:
--    CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- 2. Make sure http extension is enabled:
--    CREATE EXTENSION IF NOT EXISTS http;
--
-- 3. Timezone Notes:
--    - pg_cron runs in UTC by default
--    - To run at 9 AM EST (UTC-5): use '0 14 * * *'
--    - To run at 9 AM PST (UTC-8): use '0 17 * * *'
--
-- 4. The Edge Function must be deployed before setting up cron
--
-- 5. Monitor cron job execution in the Supabase Dashboard under
--    Database > Cron Jobs or query cron.job_run_details















