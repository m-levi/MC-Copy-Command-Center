import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://swmijewkwwsbbccfzexe.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data, error } = await supabase
    .from('custom_modes')
    .select('name, enabled_tools, tools')
    .eq('name', 'Calendar Planner')
    .single();

  if (error) {
    console.log('Error:', error);
    return;
  }

  console.log('Calendar Planner Mode:');
  console.log('enabled_tools:', JSON.stringify(data.enabled_tools, null, 2));
  console.log('tools:', JSON.stringify(data.tools, null, 2));
}

check();
