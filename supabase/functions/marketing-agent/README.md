# Marketing Agent Edge Function

Automated AI-powered marketing insights that analyze brand documents, chat conversations, and memories to generate daily campaign ideas and weekly strategic reviews.

## Architecture

- **Framework:** Supabase Edge Functions (Deno runtime)
- **AI SDK:** AI SDK 6 with workflow orchestration
- **Model:** Claude Opus 4.5 via Vercel AI Gateway
- **Scheduling:** pg_cron for automated daily/weekly runs

## Features

- **Daily Insights:** Quick campaign ideas based on last 24h activity
- **Weekly Review:** Comprehensive strategic analysis of the past week
- **Manual Trigger:** On-demand generation via API or UI
- **Multi-Source Analysis:** Documents, conversations, memories, and web trends
- **Automated Output:** Creates pinned conversations with insights
- **Email Notifications:** Optional email digest for new insights

## Local Development

### Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Create `.env.local` file (copy from `.env.example`)

### Running Locally

```bash
# Start the Edge Function locally
supabase functions serve marketing-agent --env-file .env.local

# In another terminal, test it
curl -X POST http://localhost:54321/functions/v1/marketing-agent \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily",
    "brand_id": "your-test-brand-id",
    "user_id": "your-test-user-id",
    "manual": true
  }'
```

### Testing with MCP

Use the Supabase MCP to verify database changes:

```typescript
// Check if agent settings table exists
mcp_supabase_execute_sql({
  project_id: "YOUR_PROJECT_ID",
  query: "SELECT * FROM brand_agent_settings LIMIT 5"
})

// Check recent insights
mcp_supabase_execute_sql({
  project_id: "YOUR_PROJECT_ID",
  query: "SELECT * FROM agent_insights ORDER BY started_at DESC LIMIT 10"
})
```

## Deployment

### 1. Deploy the Edge Function

```bash
supabase functions deploy marketing-agent --project-ref YOUR_PROJECT_REF
```

### 2. Set Environment Variables

In your Supabase dashboard, set the following secrets:

```bash
supabase secrets set AI_GATEWAY_API_KEY=your_key
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_key
# ... set other env vars as needed
```

### 3. Run Database Migrations

```bash
# Run the migration to create tables
psql YOUR_DATABASE_URL -f docs/database-migrations/090_agent_insights.sql

# Set up pg_cron schedules (edit PROJECT_REF first)
psql YOUR_DATABASE_URL -f docs/database-migrations/091_agent_pgcron_schedules.sql
```

### 4. Verify

Check that the Edge Function is deployed:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/marketing-agent \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'
```

## Manual Trigger from App

Users can trigger insights manually from the UI:

1. Navigate to Settings → Agents
2. Select a brand
3. Click "Generate Daily Insights" or "Generate Weekly Report"

## API Endpoint

The Next.js app provides a manual trigger API:

```bash
POST /api/agents/trigger
{
  "brandId": "brand-uuid",
  "type": "daily" | "weekly"
}
```

## Workflow Steps

### Daily Insights

1. **Gather Context** - Fetch last 24h documents and recent conversations
2. **Search Memories** - Query brand preferences and guidelines
3. **Generate Insights** - AI analyzes data and creates 5 campaign ideas
4. **Create Output** - Conversation with insights, pinned in workspace
5. **Notify** - In-app notification and optional email

### Weekly Review

1. **Comprehensive Gathering** - Fetch past week's documents and conversations
2. **Memory Search** - Query strategic brand memories
3. **Web Research** - Search for market trends and competitor intel
4. **Deep Analysis** - AI generates strategic review with recommendations
5. **Create Output** - Detailed conversation with weekly report
6. **Notify** - In-app notification and email digest

## Tools Available to Agent

- `fetch_documents` - Retrieves brand documents from brand_documents_v2
- `fetch_conversations` - Gets recent chat conversations and messages
- `search_memories` - Queries Supermemory for brand context
- `web_search` - Searches web for trends (weekly only)
- `create_conversation` - Creates pinned conversation with insights
- `send_notification` - Sends in-app and email notifications

## Monitoring

### Check Insight History

```sql
SELECT 
  i.insight_type,
  i.trigger_source,
  i.status,
  i.started_at,
  i.completed_at,
  i.processing_duration_ms,
  b.name as brand_name,
  c.title as conversation_title
FROM agent_insights i
JOIN brands b ON b.id = i.brand_id
LEFT JOIN conversations c ON c.id = i.conversation_id
ORDER BY i.started_at DESC
LIMIT 20;
```

### Check Cron Job Execution

```sql
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
```

## Troubleshooting

### Edge Function Not Running

1. Check logs: `supabase functions logs marketing-agent`
2. Verify environment variables are set
3. Check AI Gateway API key is valid

### No Insights Generated

1. Verify agent settings: `SELECT * FROM brand_agent_settings WHERE daily_enabled = true`
2. Check if brands have recent data (documents/conversations)
3. Review error messages in `agent_insights` table

### Cron Not Triggering

1. Verify pg_cron extension is enabled
2. Check cron job is scheduled: `SELECT * FROM cron.job`
3. Review cron execution history: `SELECT * FROM cron.job_run_details`

## Cost Considerations

- **Daily Insights:** ~2000 tokens per run
- **Weekly Review:** ~8000 tokens per run
- **Web Search:** Additional cost per query (optional)

Estimated monthly cost per brand (with daily + weekly enabled):
- ~60,000 tokens/month for daily insights
- ~32,000 tokens/month for weekly reviews
- Total: ~92,000 tokens/month (~$0.15 - $0.50 depending on model)















