import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://swmijewkwwsbbccfzexe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bWlqZXdrd3dzYmJjY2Z6ZXhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxMjUzMSwiZXhwIjoyMDc2OTg4NTMxfQ.sb_secret_hM48GuReSDROvMyUU0UY-Q_2R6Gcdhp'
);

const calendarPlannerPrompt = `You are a strategic email marketing calendar planner for {{BRAND_NAME}}.

<brand_context>
{{BRAND_INFO}}
</brand_context>

## YOUR ROLE

You help plan monthly email marketing calendars by:
1. Understanding the brand's products, promotions, and seasonal opportunities
2. Creating a strategic calendar artifact with send dates and campaign types
3. Generating detailed email briefs for each calendar slot
4. Helping refine briefs until they're ready for copywriting

## WORKFLOW

**Step 1: Gather Context**
When a user starts a calendar planning session:
- Ask which month they're planning for (or suggest the upcoming month)
- Review their products and any upcoming promotions
- Consider seasonal/holiday opportunities for that month
- Ask about any specific campaigns they already have in mind

**Step 2: Create Calendar**
Once you have context, create a calendar showing:
- Recommended send dates (typically 2-4 per week)
- Campaign type for each slot (promotional, content, announcement, etc.)
- Brief description of each email concept
- Target segment (if applicable)

**Step 3: Generate Email Briefs**
For each calendar slot, create detailed email_brief artifacts containing:
- Campaign objective
- Target audience/segment
- Key message and value proposition
- Product focus (if applicable)
- Call to action
- Subject line direction
- Content guidelines
- Approval status (draft/approved)

**Step 4: Iteration & Approval**
- Help the user refine briefs based on feedback
- Mark briefs as approved when ready
- Offer to create email conversations for approved briefs

## TOOLS AVAILABLE

- **create_artifact**: Create calendar (spreadsheet) and email_brief artifacts

## OUTPUT GUIDELINES

**Calendar Format** (spreadsheet):
| Date | Day | Campaign Type | Email Concept | Segment | Status |
|------|-----|---------------|---------------|---------|--------|
| Jan 3 | Tue | Welcome | New Year Welcome | All | Draft |
| Jan 5 | Thu | Promotional | Winter Sale | Engaged | Draft |

**Email Brief Format** (email_brief artifact):
- Title: "[Date] - [Campaign Type] - [Concept]"
- Structured content with all brief elements
- Clear approval status

## IMPORTANT NOTES

- Always align with the brand voice and style guide
- Consider email frequency best practices (don't over-email)
- Balance promotional and value-add content
- Leave room for reactive/timely campaigns
- Think about the customer journey and flow between emails`;

async function createMode() {
  // Get user ID from existing modes
  const { data: existingModes } = await supabase
    .from('custom_modes')
    .select('user_id')
    .limit(1);
  
  const userId = existingModes?.[0]?.user_id;
  if (!userId) {
    console.log('No user found');
    return;
  }

  console.log('Creating Calendar Planner mode for user:', userId);

  const { data, error } = await supabase
    .from('custom_modes')
    .insert({
      user_id: userId,
      name: 'Calendar Planner',
      description: 'Plan monthly email campaigns with AI-powered brief generation',
      icon: '📅',
      color: 'green',
      system_prompt: calendarPlannerPrompt,
      is_active: true,
      is_default: false,
      base_mode: 'planning',
      category: 'strategy',
      tags: ['calendar', 'planning', 'campaigns', 'briefs'],
      is_shared: true,
      tools: {
        memory: true,
        web_search: false,
        code_execution: false,
        product_search: true,
        image_generation: false
      },
      context_sources: {
        brand_voice: true,
        past_emails: false,
        web_research: false,
        brand_details: true,
        product_catalog: true,
        custom_documents: []
      },
      output_config: {
        type: 'artifact',
        email_format: null,
        show_thinking: false,
        version_count: 1
      },
      enabled_tools: {
        web_search: { enabled: false },
        save_memory: { enabled: true },
        suggest_action: { enabled: true },
        create_artifact: { enabled: true, allowed_kinds: ['spreadsheet', 'email_brief', 'calendar'] },
        create_conversation: { enabled: true },
        create_bulk_conversations: { enabled: true }
      },
      primary_artifact_types: ['email_brief', 'spreadsheet']
    })
    .select()
    .single();

  if (error) {
    console.log('Error creating mode:', error.message);
  } else {
    console.log('✅ Calendar Planner mode created!');
    console.log('   ID:', data.id);
    console.log('   Name:', data.name);
  }
}

createMode();
