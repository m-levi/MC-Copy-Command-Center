# Complete Deployment Guide - Marketing Agent

## ✅ What's Already Done

**Database (100% Complete):**
- ✅ Tables created and tested
- ✅ Indexes optimized
- ✅ RLS policies active
- ✅ Helper functions working
- ✅ Test data configured (Scherber USA enabled)

**Code (100% Complete):**
- ✅ Edge Function implemented with AI SDK 6
- ✅ All 5 agent tools created
- ✅ Daily & weekly prompts written
- ✅ Frontend UI components ready
- ✅ API routes created
- ✅ Documentation complete

## 🚀 Final Step: Deploy Edge Function

### Option 1: Supabase CLI (Recommended)

```bash
# Step 1: Login to Supabase
supabase login

# Step 2: Deploy the function
cd "/Users/mordechailevi/Desktop/Manual Library/MoonCommerce/Dev Projects/command_center"
supabase functions deploy marketing-agent --project-ref swmijewkwwsbbccfzexe

# Step 3: Set environment secrets
supabase secrets set AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key --project-ref swmijewkwwsbbccfzexe
supabase secrets set RESEND_API_KEY=your_resend_key --project-ref swmijewkwwsbbccfzexe
supabase secrets set SUPABASE_URL=https://swmijewkwwsbbccfzexe.supabase.co --project-ref swmijewkwwsbbccfzexe
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sb_secret_hM48GuReSDROvMyUU0UY-Q_2R6Gcdhp --project-ref swmijewkwwsbbccfzexe
supabase secrets set EMAIL_FROM=insights@mooncommerce.net --project-ref swmijewkwwsbbccfzexe
supabase secrets set NEXT_PUBLIC_APP_URL=https://your-app-url.vercel.app --project-ref swmijewkwwsbbccfzexe

# Optional secrets (for enhanced features)
supabase secrets set SUPERMEMORY_API_KEY=your_key --project-ref swmijewkwwsbbccfzexe
supabase secrets set TAVILY_API_KEY=your_key --project-ref swmijewkwwsbbccfzexe
```

### Option 2: Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/swmijewkwwsbbccfzexe
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Create a new function**
4. Name it: `marketing-agent`
5. Copy the contents of each file from `supabase/functions/marketing-agent/`
6. Click **Deploy**
7. Go to **Settings** → **Secrets** and add the environment variables listed above

## 🧪 Test the Deployment

### Test 1: Manual Trigger via curl

```bash
curl -X POST https://swmijewkwwsbbccfzexe.supabase.co/functions/v1/marketing-agent \
  -H "Authorization: Bearer sb_secret_hM48GuReSDROvMyUU0UY-Q_2R6Gcdhp" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily",
    "brand_id": "3ef1be53-2628-4d5e-9e51-96bf97027179",
    "user_id": "d2e49c5f-6baa-4d86-b730-d0f84d60057e",
    "manual": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "insightId": "uuid",
  "conversationId": "uuid",
  "dataAnalyzed": {
    "documents": 0,
    "conversations": 5,
    "memories": 0
  }
}
```

### Test 2: Via Next.js App

1. Start your Next.js app: `npm run dev`
2. Navigate to: `http://localhost:3000/settings/agents`
3. Select "Scherber USA"
4. Click "Generate Daily Insights"
5. Wait for success notification
6. Go to brand chat and verify conversation was created

### Test 3: Check Database

```sql
-- View the generated insight
SELECT * FROM agent_insights 
ORDER BY started_at DESC 
LIMIT 1;

-- Find the created conversation
SELECT c.id, c.title, c.is_pinned, c.created_by_name
FROM conversations c
WHERE c.created_by_name = 'Marketing Agent'
ORDER BY c.created_at DESC
LIMIT 1;

-- View the AI message
SELECT m.content, m.created_at
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE c.created_by_name = 'Marketing Agent'
AND m.role = 'assistant'
ORDER BY m.created_at DESC
LIMIT 1;
```

## 📅 Optional: Setup Automated Scheduling

### Enable pg_cron

1. Edit `docs/database-migrations/091_agent_pgcron_schedules.sql`
2. Replace `YOUR_PROJECT_REF` with `swmijewkwwsbbccfzexe`
3. Replace `YOUR_SERVICE_ROLE_KEY` with your actual key
4. Run the SQL file:

```bash
psql $DATABASE_URL -f docs/database-migrations/091_agent_pgcron_schedules.sql
```

### Verify Cron Jobs

```sql
-- View scheduled jobs
SELECT * FROM cron.job WHERE jobname LIKE 'marketing-agent%';

-- Check execution history
SELECT 
  j.jobname,
  d.status,
  d.start_time,
  d.end_time
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
WHERE j.jobname LIKE 'marketing-agent%'
ORDER BY d.start_time DESC
LIMIT 10;
```

## 🎯 Success Checklist

- [ ] Edge Function deployed
- [ ] Environment secrets configured
- [ ] Manual trigger test passed
- [ ] Conversation created successfully
- [ ] UI settings page working
- [ ] Database tracking working
- [ ] (Optional) pg_cron configured

## 📊 Current Configuration

**Project:** swmijewkwwsbbccfzexe (Email Copywriter AI)

**Enabled Brands:**
- Scherber USA
  - Brand ID: `3ef1be53-2628-4d5e-9e51-96bf97027179`
  - User: mordi@mooncommerce.net
  - Daily: ✅ Enabled
  - Weekly: ✅ Enabled
  - Existing conversations: 5

**Database Status:**
- Tables: ✅ Created
- Indexes: ✅ Optimized
- RLS: ✅ Active
- Functions: ✅ Working

**Code Status:**
- Edge Function: ✅ Ready to deploy
- Frontend: ✅ Complete
- API Routes: ✅ Complete

## 🐛 Troubleshooting

### Edge Function won't deploy

**Issue:** Authentication error

**Solution:**
```bash
# Clear cached credentials
rm -rf ~/.supabase

# Login again
supabase login

# Try deployment again
supabase functions deploy marketing-agent --project-ref swmijewkwwsbbccfzexe
```

### Function deployed but not working

**Check logs:**
```bash
supabase functions logs marketing-agent --project-ref swmijewkwwsbbccfzexe
```

**Common issues:**
1. Missing environment secrets → Set all required secrets
2. Invalid API keys → Verify keys are correct
3. No data to analyze → Brand needs documents/conversations

### Test fails with 500 error

**Check:**
1. AI Gateway API key is valid
2. Supabase URL and service key are correct
3. Brand ID exists in database
4. User ID is valid

## 📞 Support

**Documentation:**
- Implementation Summary: `MARKETING_AGENT_IMPLEMENTATION_SUMMARY.md`
- Testing Guide: `TESTING_MARKETING_AGENT.md`
- Quick Start: `QUICK_START_MARKETING_AGENT.md`
- Test Results: `DEPLOYMENT_TEST_RESULTS.md`

**Key Files:**
- Edge Function: `supabase/functions/marketing-agent/`
- Settings UI: `app/settings/agents/page.tsx`
- API Route: `app/api/agents/trigger/route.ts`
- Database Migration: `docs/database-migrations/090_agent_insights.sql`

---

**Status:** 95% Complete - Only Edge Function deployment remaining  
**Estimated Time to Complete:** 5-10 minutes  
**Next Action:** Run `supabase login` and deploy the Edge Function















