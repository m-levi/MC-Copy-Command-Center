# Testing the Marketing Agent

This guide covers how to test the Marketing Agent Edge Function using Supabase CLI and MCP.

## Prerequisites

1. **Supabase CLI installed:**
   ```bash
   npm install -g supabase
   ```

2. **Supabase Project initialized:**
   If not already initialized, run:
   ```bash
   supabase init
   ```

3. **Environment variables configured:**
   Create `supabase/functions/marketing-agent/.env.local` with required keys (see `.env.example`)

## Testing with Supabase CLI

### 1. Start Local Edge Function

```bash
supabase functions serve marketing-agent --env-file supabase/functions/marketing-agent/.env.local --no-verify-jwt
```

This starts the function locally on `http://localhost:54321`

### 2. Test Daily Insights Generation

```bash
curl -X POST http://localhost:54321/functions/v1/marketing-agent \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily",
    "brand_id": "YOUR_TEST_BRAND_ID",
    "user_id": "YOUR_TEST_USER_ID",
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
    "documents": 2,
    "conversations": 3,
    "memories": 1
  }
}
```

### 3. Test Weekly Insights Generation

```bash
curl -X POST http://localhost:54321/functions/v1/marketing-agent \
  -H "Content-Type": "application/json" \
  -d '{
    "type": "weekly",
    "brand_id": "YOUR_TEST_BRAND_ID",
    "user_id": "YOUR_TEST_USER_ID",
    "manual": true
  }'
```

### 4. Test Batch Processing (All Brands)

```bash
curl -X POST http://localhost:54321/functions/v1/marketing-agent \
  -H "Content-Type": "application/json" \
  -d '{
    "type": "daily"
  }'
```

This processes all brands with `daily_enabled = true`

### 5. View Logs

```bash
# Watch logs in real-time
supabase functions logs marketing-agent --follow

# View recent logs
supabase functions logs marketing-agent --limit 50
```

## Testing with Supabase MCP

### 1. Verify Database Tables

```typescript
// Check if tables were created
mcp_supabase_execute_sql({
  project_id: "YOUR_PROJECT_ID",
  query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('brand_agent_settings', 'agent_insights')"
})
```

**Expected:** Two rows with `brand_agent_settings` and `agent_insights`

### 2. Check Agent Settings

```typescript
// View all agent settings
mcp_supabase_execute_sql({
  project_id: "YOUR_PROJECT_ID",
  query: `
    SELECT 
      bas.id,
      b.name as brand_name,
      p.email as user_email,
      bas.daily_enabled,
      bas.weekly_enabled,
      bas.email_digest,
      bas.created_at
    FROM brand_agent_settings bas
    JOIN brands b ON b.id = bas.brand_id
    JOIN profiles p ON p.user_id = bas.user_id
    ORDER BY bas.created_at DESC
    LIMIT 10
  `
})
```

### 3. Monitor Insight Generation

```typescript
// Check recent insights
mcp_supabase_execute_sql({
  project_id: "YOUR_PROJECT_ID",
  query: `
    SELECT 
      i.id,
      b.name as brand_name,
      i.insight_type,
      i.trigger_source,
      i.status,
      i.started_at,
      i.completed_at,
      i.processing_duration_ms,
      i.data_analyzed,
      c.title as conversation_title
    FROM agent_insights i
    JOIN brands b ON b.id = i.brand_id
    LEFT JOIN conversations c ON c.id = i.conversation_id
    ORDER BY i.started_at DESC
    LIMIT 20
  `
})
```

### 4. Check Conversation Creation

```typescript
// Find agent-generated conversations
mcp_supabase_execute_sql({
  project_id: "YOUR_PROJECT_ID",
  query: `
    SELECT 
      c.id,
      c.title,
      c.brand_id,
      b.name as brand_name,
      c.is_pinned,
      c.created_by_name,
      c.created_at,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
    FROM conversations c
    JOIN brands b ON b.id = c.brand_id
    WHERE c.created_by_name = 'Marketing Agent'
    ORDER BY c.created_at DESC
    LIMIT 10
  `
})
```

### 5. Verify pg_cron Setup

```typescript
// Check scheduled cron jobs
mcp_supabase_execute_sql({
  project_id: "YOUR_PROJECT_ID",
  query: "SELECT * FROM cron.job WHERE jobname LIKE 'marketing-agent%'"
})

// Check cron execution history
mcp_supabase_execute_sql({
  project_id: "YOUR_PROJECT_ID",
  query: `
    SELECT 
      j.jobname,
      d.status,
      d.return_message,
      d.start_time,
      d.end_time,
      EXTRACT(EPOCH FROM (d.end_time - d.start_time)) * 1000 as duration_ms
    FROM cron.job_run_details d
    JOIN cron.job j ON j.jobid = d.jobid
    WHERE j.jobname LIKE 'marketing-agent%'
    ORDER BY d.start_time DESC
    LIMIT 20
  `
})
```

## Manual Testing via UI

### 1. Run Database Migrations

```bash
# Apply the migrations
psql $DATABASE_URL -f docs/database-migrations/090_agent_insights.sql
```

### 2. Create Test Settings

```sql
INSERT INTO brand_agent_settings (brand_id, user_id, daily_enabled, weekly_enabled)
VALUES (
  'YOUR_BRAND_ID',
  'YOUR_USER_ID',
  true,
  true
);
```

### 3. Access Settings Page

Navigate to: `http://localhost:3000/settings/agents`

### 4. Trigger Manual Insights

1. Select a brand
2. Click "Generate Daily Insights" or "Generate Weekly Report"
3. Check for success toast notification
4. Navigate to brand chat to see the generated conversation

## Troubleshooting

### Edge Function Fails to Start

**Issue:** `cannot read config in /Users/.../supabase/config.toml`

**Solution:** Initialize Supabase project:
```bash
supabase init
```

### AI Gateway API Key Error

**Issue:** `AI Gateway API key not configured`

**Solution:** Set environment variable:
```bash
export AI_GATEWAY_API_KEY=your_key_here
# OR add to .env.local file
```

### No Brands Processed

**Issue:** Edge Function runs but processes 0 brands

**Solution:** Ensure brands have enabled settings:
```sql
-- Enable for a specific brand
UPDATE brand_agent_settings 
SET daily_enabled = true 
WHERE brand_id = 'YOUR_BRAND_ID';
```

### Tool Calls Fail

**Issue:** Agent workflow fails at tool calls

**Solution:** Check that:
1. Database tables exist (`brand_documents_v2`, `conversations`, etc.)
2. Test brand has some data (documents, conversations)
3. API keys for optional services are set (Supermemory, web search)

### Conversation Not Created

**Issue:** Agent runs but no conversation appears

**Solution:** Check:
```sql
-- Look for errors in agent_insights
SELECT * FROM agent_insights 
WHERE status = 'failed' 
ORDER BY started_at DESC 
LIMIT 5;
```

## Success Criteria

✅ Edge Function starts without errors
✅ Daily trigger creates conversation with 5 campaign ideas
✅ Weekly trigger creates conversation with strategic review
✅ Agent settings table populated
✅ Agent insights tracked in database
✅ Conversations pinned and visible in UI
✅ Notifications sent (in-app and email if configured)
✅ pg_cron jobs scheduled and executing

## Next Steps

Once local testing is successful:

1. **Deploy Edge Function:**
   ```bash
   supabase functions deploy marketing-agent
   ```

2. **Set Production Secrets:**
   ```bash
   supabase secrets set AI_GATEWAY_API_KEY=...
   supabase secrets set RESEND_API_KEY=...
   # etc.
   ```

3. **Configure pg_cron:**
   Run `docs/database-migrations/091_agent_pgcron_schedules.sql` (update PROJECT_REF first)

4. **Monitor Production:**
   - Check Supabase Dashboard → Edge Functions
   - View logs: `supabase functions logs marketing-agent`
   - Monitor `agent_insights` table for failures















