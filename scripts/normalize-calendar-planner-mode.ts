/**
 * Normalize Calendar Planner Mode Configuration
 * 
 * This script ensures the "Calendar Planner" mode has the correct configuration:
 * - Uses `enabled_tools` as the canonical field (not legacy `tools`)
 * - Has `create_artifact` enabled with `calendar` in `allowed_kinds`
 * - Disables `suggest_conversation_plan` (superseded by `create_artifact` with calendar kind)
 * - Has the correct system prompt that emphasizes artifact creation
 * 
 * Run with: npx tsx scripts/normalize-calendar-planner-mode.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Canonical Calendar Planner system prompt that emphasizes artifact creation
const CALENDAR_PLANNER_SYSTEM_PROMPT = `You are a strategic email marketing calendar planner.

## YOUR ROLE

You help plan monthly email marketing calendars and create visual calendar artifacts.
Your primary output is a **calendar artifact** showing a month view with planned emails on specific dates.

## CRITICAL: ALWAYS CREATE A CALENDAR ARTIFACT

**IMPORTANT: You MUST use the \`create_artifact\` tool with \`kind: "calendar"\` to create a visual calendar.**

DO NOT output a text-based calendar or description. You MUST create the calendar artifact so users can see and interact with it.

## WORKFLOW

### Step 1: Understand the Request
When planning a calendar:
- Confirm which month is being planned
- Note any promotions, events, or specific campaigns mentioned
- Consider seasonal/holiday opportunities for that month

### Step 2: CREATE A CALENDAR ARTIFACT (REQUIRED)

Call the \`create_artifact\` tool with these parameters:

\`\`\`
create_artifact({
  kind: "calendar",
  title: "January 2025 Email Calendar",
  description: "8 strategic emails for January covering New Year, winter sale, and Valentine's prep",
  content: "Email marketing calendar for January 2025",
  calendar_month: "2025-01",
  calendar_slots: [
    {
      id: "email-1",
      date: "2025-01-02",
      title: "New Year Welcome",
      description: "Kick off the year with brand story and New Year message",
      email_type: "content",
      status: "draft"
    },
    {
      id: "email-2",
      date: "2025-01-07",
      title: "Winter Sale Launch",
      description: "Announce winter clearance with best deals",
      email_type: "promotional",
      status: "draft"
    }
    // ... more emails
  ]
})
\`\`\`

### Calendar Slot Fields
Each slot in \`calendar_slots\` should have:
- **id**: Unique identifier (e.g., "email-1", "email-2")
- **date**: ISO date string (YYYY-MM-DD)
- **title**: Short email title
- **description**: Brief description of email purpose
- **email_type**: One of: "promotional", "content", "announcement", "transactional", "nurture"
- **status**: "draft" (default), "scheduled", "sent", "approved", "pending"

## CALENDAR BEST PRACTICES

- **Frequency**: 2-4 emails/week for engaged lists, 1-2 for less engaged
- **Balance**: Mix promotional (40%), content (40%), transactional (20%)
- **Timing**: Tue-Thu typically best, avoid Monday mornings and weekends
- **Holidays**: Plan around, not on major holidays
- **Sequences**: Group related emails (sale launch -> reminder -> last chance)

## EMAIL TYPES

- **promotional**: Sales, discounts, special offers
- **content**: Educational, tips, lifestyle content
- **announcement**: New products, events, news
- **transactional**: Order confirmations, shipping (usually automated)
- **nurture**: Welcome series, re-engagement

## IMPORTANT RULES

1. **ALWAYS create a calendar artifact** using \`create_artifact\` with \`kind: "calendar"\`
2. Use \`calendar_month\` in YYYY-MM format
3. Place emails on weekday dates (avoid weekends unless requested)
4. Include at least the number of emails requested
5. Spread emails throughout the month (do not cluster all at beginning/end)
6. After creating the calendar, offer to create email_brief artifacts for individual slots`;

// Canonical enabled_tools configuration for Calendar Planner
const CALENDAR_PLANNER_ENABLED_TOOLS = {
  create_artifact: {
    enabled: true,
    allowed_kinds: ['calendar', 'spreadsheet', 'email_brief', 'checklist'],
  },
  create_conversation: {
    enabled: true,
  },
  create_bulk_conversations: {
    enabled: true,
  },
  suggest_conversation_plan: {
    enabled: false, // Disabled - use create_artifact with calendar kind instead
  },
  suggest_action: {
    enabled: false, // Disabled - calendar planner should focus on artifact creation
  },
  invoke_agent: {
    enabled: true,
    allowed_agents: ['email_writer', 'subject_line_expert', 'flow_architect'],
  },
  web_search: {
    enabled: true,
    max_uses: 3,
  },
  save_memory: {
    enabled: true,
  },
  shopify_product_search: {
    enabled: true,
  },
};

async function normalizeCalendarPlannerMode() {
  console.log('🔧 Normalizing Calendar Planner mode configuration...\n');

  // First, check current state
  const { data: existingMode, error: fetchError } = await supabase
    .from('custom_modes')
    .select('id, name, enabled_tools, tools, system_prompt, is_active')
    .eq('name', 'Calendar Planner')
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('❌ Error fetching Calendar Planner mode:', fetchError);
    process.exit(1);
  }

  if (!existingMode) {
    console.log('ℹ️  No "Calendar Planner" mode found. This script only updates existing modes.');
    console.log('   To create a new Calendar Planner mode, use the mode creation UI or run create-calendar-mode.ts');
    process.exit(0);
  }

  console.log('📋 Current Calendar Planner configuration:');
  console.log('   ID:', existingMode.id);
  console.log('   Active:', existingMode.is_active);
  console.log('   Has enabled_tools:', !!existingMode.enabled_tools);
  console.log('   Has legacy tools:', !!existingMode.tools);
  
  // Check current create_artifact config
  const currentArtifactConfig = existingMode.enabled_tools?.create_artifact;
  console.log('   Current create_artifact.enabled:', currentArtifactConfig?.enabled);
  console.log('   Current create_artifact.allowed_kinds:', currentArtifactConfig?.allowed_kinds);
  console.log('');

  // Update the mode
  console.log('📝 Applying canonical configuration...');
  
  const { error: updateError } = await supabase
    .from('custom_modes')
    .update({
      system_prompt: CALENDAR_PLANNER_SYSTEM_PROMPT,
      enabled_tools: CALENDAR_PLANNER_ENABLED_TOOLS,
      // Clear legacy tools field to avoid confusion
      tools: null,
      // Ensure proper artifact configuration
      primary_artifact_types: ['calendar', 'email_brief'],
      // Agent configuration
      is_agent_enabled: true,
      can_invoke_agents: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingMode.id);

  if (updateError) {
    console.error('❌ Error updating Calendar Planner mode:', updateError);
    process.exit(1);
  }

  // Verify the update
  const { data: updatedMode, error: verifyError } = await supabase
    .from('custom_modes')
    .select('enabled_tools, system_prompt, primary_artifact_types')
    .eq('id', existingMode.id)
    .single();

  if (verifyError || !updatedMode) {
    console.error('❌ Error verifying update:', verifyError);
    process.exit(1);
  }

  console.log('');
  console.log('✅ Calendar Planner mode normalized successfully!');
  console.log('');
  console.log('📋 Updated configuration:');
  console.log('   create_artifact.enabled:', updatedMode.enabled_tools?.create_artifact?.enabled);
  console.log('   create_artifact.allowed_kinds:', updatedMode.enabled_tools?.create_artifact?.allowed_kinds);
  console.log('   suggest_conversation_plan.enabled:', updatedMode.enabled_tools?.suggest_conversation_plan?.enabled);
  console.log('   primary_artifact_types:', updatedMode.primary_artifact_types);
  console.log('');
  console.log('📖 System prompt length:', updatedMode.system_prompt?.length, 'chars');
  console.log('   Emphasizes create_artifact:', updatedMode.system_prompt?.includes('create_artifact'));
  console.log('   Mentions calendar kind:', updatedMode.system_prompt?.includes('kind: "calendar"'));
}

normalizeCalendarPlannerMode().catch(console.error);



