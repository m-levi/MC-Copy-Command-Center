import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ActivePrompt {
  id: string;
  prompt_type: string;
  system_prompt: string | null;
  user_prompt: string | null;
  name: string;
}

export async function getActiveDebugPrompt(
  supabase: SupabaseClient, 
  userId: string, 
  promptType: string
): Promise<ActivePrompt | null> {
  try {
    // First check if debug mode is enabled
    const { data: settings } = await supabase
      .from('user_settings')
      .select('debug_mode_enabled')
      .eq('user_id', userId)
      .single();

    if (!settings?.debug_mode_enabled) {
      return null;
    }

    // Then fetch the active prompt for this type
    const { data: prompt, error } = await supabase
      .from('custom_prompts')
      .select('id, prompt_type, system_prompt, user_prompt, name')
      .eq('user_id', userId)
      .eq('prompt_type', promptType)
      .eq('is_active', true)
      .single();

    if (error || !prompt) {
      return null;
    }

    return prompt;
  } catch (error) {
    console.error('Error fetching active debug prompt:', error);
    return null;
  }
}

// Helper to determine prompt type from context
export function determinePromptType(
  emailType: 'design' | 'letter',
  isFlow: boolean = false
): string {
  if (isFlow) {
    return 'flow_email';
  }
  
  return emailType === 'design' ? 'design_email' : 'letter_email';
}

