import { createClient } from '@supabase/supabase-js';

// These values from .env.local
const supabaseUrl = 'https://swmijewkwwsbbccfzexe.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fix() {
  console.log('Fixing Calendar Planner enabled_tools...');

  const { error } = await supabase
    .from('custom_modes')
    .update({
      enabled_tools: {
        web_search: { enabled: true, max_uses: 3 },
        save_memory: { enabled: true },
        invoke_agent: { enabled: true, allowed_agents: ['email_writer', 'subject_line_expert', 'flow_architect'] },
        suggest_action: { enabled: false },
        create_artifact: { enabled: true, allowed_kinds: ['calendar', 'spreadsheet', 'email_brief', 'checklist'] },
        create_conversation: { enabled: true },
        shopify_product_search: { enabled: true },
        create_bulk_conversations: { enabled: true },
        suggest_conversation_plan: { enabled: false }
      }
    })
    .eq('name', 'Calendar Planner');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('✅ Calendar Planner enabled_tools fixed!');
  console.log('   - Added "calendar" to allowed_kinds');
  console.log('   - Disabled suggest_action');
  console.log('   - Disabled suggest_conversation_plan');
}

fix();
