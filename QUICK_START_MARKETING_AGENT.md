# Quick Start: Marketing Agent

Get the marketing agent running in 5 minutes.

## Prerequisites

- Supabase project with database access
- Vercel AI Gateway API key (or OpenAI key)
- Resend API key (for email notifications)

## Step 1: Run Database Migrations (2 min)

```bash
# Connect to your database
psql $DATABASE_URL

# Run the migration
\i docs/database-migrations/090_agent_insights.sql

# Verify tables created
\dt brand_agent_settings agent_insights
```

## Step 2: Deploy Edge Function (2 min)

```bash
# Set environment secrets
supabase secrets set AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Deploy
supabase functions deploy marketing-agent --project-ref YOUR_PROJECT_REF
```

## Step 3: Test Manual Trigger (1 min)

```bash
# Test via curl
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/marketing-agent \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily",
    "brand_id": "YOUR_BRAND_ID",
    "user_id": "YOUR_USER_ID",
    "manual": true
  }'
```

Or test via UI:
1. Go to `/settings/agents`
2. Click "Generate Daily Insights"
3. Check your brand's chat for the new conversation

## Step 4: Enable Automated Scheduling (Optional)

```bash
# Edit the SQL file first - replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY
nano docs/database-migrations/091_agent_pgcron_schedules.sql

# Run it
psql $DATABASE_URL -f docs/database-migrations/091_agent_pgcron_schedules.sql

# Verify cron jobs
psql $DATABASE_URL -c "SELECT * FROM cron.job WHERE jobname LIKE 'marketing-agent%'"
```

## Verify It Works

Check that a conversation was created:

```sql
SELECT 
  c.id,
  c.title,
  c.created_by_name,
  c.is_pinned,
  b.name as brand_name
FROM conversations c
JOIN brands b ON b.id = c.brand_id
WHERE c.created_by_name = 'Marketing Agent'
ORDER BY c.created_at DESC
LIMIT 5;
```

## Enable for Users

Users can enable/configure the agent:

1. Navigate to `/settings/agents`
2. Toggle "Daily Insights" and/or "Weekly Strategic Review"
3. Configure email notifications
4. Save settings

## What Happens Next

- **Daily (9 AM):** Quick campaign ideas based on last 24h
- **Weekly (Monday 9 AM):** Comprehensive strategic review
- **Manual:** Generate on-demand via UI button

## Troubleshooting

**No conversation created?**
```sql
-- Check for errors
SELECT * FROM agent_insights 
WHERE status = 'failed' 
ORDER BY started_at DESC 
LIMIT 5;
```

**Cron not running?**
```sql
-- Check cron execution
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

**Edge Function errors?**
```bash
# View logs
supabase functions logs marketing-agent --limit 50
```

## Next Steps

- Read `MARKETING_AGENT_IMPLEMENTATION_SUMMARY.md` for full details
- See `TESTING_MARKETING_AGENT.md` for comprehensive testing guide
- Check `supabase/functions/marketing-agent/README.md` for Edge Function docs

## Cost Estimate

- Daily insights: ~2000 tokens per run
- Weekly review: ~8000 tokens per run
- **Per brand:** ~$0.15-0.50/month with both enabled

---

**Need help?** Check the full documentation or review the implementation summary.















