/**
 * Unified Conversation Memory System
 * Works with both Claude and OpenAI models to maintain persistent context
 * across conversations.
 */

import { createClient } from '@/lib/supabase/server';

export interface MemoryEntry {
  id: string;
  conversation_id: string;
  key: string;
  value: string;
  category: 'user_preference' | 'brand_context' | 'campaign_info' | 'product_details' | 'decision' | 'fact';
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface MemoryContext {
  userPreferences: Record<string, string>;
  brandContext: Record<string, string>;
  campaignInfo: Record<string, string>;
  productDetails: Record<string, string>;
  decisions: Record<string, string>;
  facts: Record<string, string>;
}

/**
 * Save a memory entry for a conversation
 */
export async function saveMemory(
  conversationId: string,
  key: string,
  value: string,
  category: MemoryEntry['category'] = 'fact',
  expiresInDays?: number
): Promise<MemoryEntry | null> {
  const supabase = createClient();
  
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Upsert: Update if exists, insert if not
  const { data, error } = await supabase
    .from('conversation_memories')
    .upsert({
      conversation_id: conversationId,
      key,
      value,
      category,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'conversation_id,key',
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving memory:', error);
    return null;
  }

  return data;
}

/**
 * Load all memories for a conversation
 */
export async function loadMemories(conversationId: string): Promise<MemoryEntry[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('conversation_memories')
    .select('*')
    .eq('conversation_id', conversationId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error loading memories:', error);
    return [];
  }

  return data || [];
}

/**
 * Build a structured memory context for AI models
 */
export function buildMemoryContext(memories: MemoryEntry[]): MemoryContext {
  const context: MemoryContext = {
    userPreferences: {},
    brandContext: {},
    campaignInfo: {},
    productDetails: {},
    decisions: {},
    facts: {},
  };

  for (const memory of memories) {
    switch (memory.category) {
      case 'user_preference':
        context.userPreferences[memory.key] = memory.value;
        break;
      case 'brand_context':
        context.brandContext[memory.key] = memory.value;
        break;
      case 'campaign_info':
        context.campaignInfo[memory.key] = memory.value;
        break;
      case 'product_details':
        context.productDetails[memory.key] = memory.value;
        break;
      case 'decision':
        context.decisions[memory.key] = memory.value;
        break;
      case 'fact':
        context.facts[memory.key] = memory.value;
        break;
    }
  }

  return context;
}

/**
 * Format memory context for system prompt
 */
export function formatMemoryForPrompt(context: MemoryContext): string {
  const sections: string[] = [];

  if (Object.keys(context.userPreferences).length > 0) {
    sections.push(`<user_preferences>
${Object.entries(context.userPreferences).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
</user_preferences>`);
  }

  if (Object.keys(context.brandContext).length > 0) {
    sections.push(`<brand_context_memory>
${Object.entries(context.brandContext).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
</brand_context_memory>`);
  }

  if (Object.keys(context.campaignInfo).length > 0) {
    sections.push(`<campaign_info>
${Object.entries(context.campaignInfo).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
</campaign_info>`);
  }

  if (Object.keys(context.productDetails).length > 0) {
    sections.push(`<product_details>
${Object.entries(context.productDetails).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
</product_details>`);
  }

  if (Object.keys(context.decisions).length > 0) {
    sections.push(`<previous_decisions>
${Object.entries(context.decisions).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
</previous_decisions>`);
  }

  if (Object.keys(context.facts).length > 0) {
    sections.push(`<remembered_facts>
${Object.entries(context.facts).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
</remembered_facts>`);
  }

  if (sections.length === 0) {
    return '';
  }

  return `
<conversation_memory>
You have access to persistent memory from this conversation:

${sections.join('\n\n')}

You can reference these memories to provide more personalized and consistent responses.
</conversation_memory>
`;
}

/**
 * Parse memory instructions from AI response
 * Looks for patterns like [REMEMBER:key=value:category]
 */
export function parseMemoryInstructions(content: string): Array<{
  key: string;
  value: string;
  category: MemoryEntry['category'];
}> {
  const pattern = /\[REMEMBER:([^=]+)=([^:]+):(\w+)\]/g;
  const instructions: Array<{ key: string; value: string; category: MemoryEntry['category'] }> = [];
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const [, key, value, category] = match;
    instructions.push({
      key: key.trim(),
      value: value.trim(),
      category: category as MemoryEntry['category'],
    });
  }

  return instructions;
}

/**
 * Delete a specific memory
 */
export async function deleteMemory(conversationId: string, key: string): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('conversation_memories')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('key', key);

  if (error) {
    console.error('Error deleting memory:', error);
    return false;
  }

  return true;
}

/**
 * Clear all expired memories (cleanup function)
 */
export async function clearExpiredMemories(): Promise<number> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('conversation_memories')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('Error clearing expired memories:', error);
    return 0;
  }

  return data?.length || 0;
}


