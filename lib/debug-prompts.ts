import { SupabaseClient } from '@supabase/supabase-js';

export interface ActivePrompt {
  id: string;
  prompt_type: string;
  system_prompt: string | null;
  name: string;
}

/**
 * OPTIMIZED: Parallel queries for debug mode check and prompt fetch
 * Used in the chat API where we want to run this in parallel with auth
 * Returns null if debug mode is disabled or no active prompt found
 */
export async function getActiveDebugPromptFast(
  supabase: SupabaseClient,
  promptType: string
): Promise<ActivePrompt | null> {
  try {
    // Run both queries in parallel - much faster than sequential
    const [settingsResult, promptResult] = await Promise.all([
      // Check if debug mode is enabled (RLS filters by authenticated user)
      supabase
        .from('user_settings')
        .select('debug_mode_enabled')
        .maybeSingle(),
      
      // Fetch the active prompt for this type (RLS filters by authenticated user)
      supabase
        .from('custom_prompts')
        .select('id, prompt_type, system_prompt, name')
        .eq('prompt_type', promptType)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    // If debug mode is not enabled, return null
    if (!settingsResult.data?.debug_mode_enabled) {
      return null;
    }

    // If no active prompt found, return null
    if (!promptResult.data) {
      return null;
    }

    return promptResult.data;
  } catch (error) {
    // Silently fail - debug prompts are optional
    return null;
  }
}

/**
 * Legacy function - kept for backwards compatibility
 * @deprecated Use getActiveDebugPromptFast for better performance
 */
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
      .select('id, prompt_type, system_prompt, name')
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

