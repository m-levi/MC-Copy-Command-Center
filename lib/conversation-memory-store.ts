/**
 * Unified Conversation Memory System
 * Works with both Claude and OpenAI models to maintain persistent context
 * across conversations.
 */

import { createClient } from '@/lib/supabase/server';
import { createEdgeClient } from '@/lib/supabase/edge';

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
 * Helper to get the appropriate Supabase client based on runtime
 */
async function getSupabaseClient() {
  // Check if we're in Edge runtime by checking for the edge-specific API
  const isEdge = typeof (globalThis as any).EdgeRuntime !== 'undefined' || process.env.NEXT_RUNTIME === 'edge';
  
  if (isEdge) {
    console.log('[Memory] Using Edge runtime client');
    return createEdgeClient();
  } else {
    console.log('[Memory] Using server client');
    return await createClient();
  }
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
  try {
    const supabase = await getSupabaseClient();
    
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
  } catch (error) {
    console.error('Exception saving memory:', error);
    return null;
  }
}

/**
 * Load all memories for a conversation
 */
export async function loadMemories(conversationId: string): Promise<MemoryEntry[]> {
  try {
    const supabase = await getSupabaseClient();
    
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
  } catch (error) {
    console.error('Exception loading memories:', error);
    return [];
  }
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

// Whitelist of allowed memory keys (security measure)
const ALLOWED_MEMORY_KEYS = [
  'tone_preference',
  'target_audience',
  'campaign_type',
  'product_focus',
  'urgency_level',
  'brand_voice',
  'promo_code',
  'special_offer',
  'messaging_angle',
  'content_style',
];

const ALLOWED_CATEGORIES: MemoryEntry['category'][] = [
  'user_preference',
  'brand_context',
  'campaign_info',
  'product_details',
  'decision',
  'fact',
];

/**
 * Parse memory instructions from AI response
 * SECURITY: Validates keys, categories, and value lengths
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
  let matchCount = 0;
  const MAX_MATCHES = 10; // Prevent DoS via massive memory instructions
  
  while ((match = pattern.exec(content)) !== null) {
    matchCount++;
    if (matchCount > MAX_MATCHES) {
      console.warn(`[Memory] Too many memory instructions (>${MAX_MATCHES}), stopping parse`);
      break;
    }
    
    const [, rawKey, rawValue, rawCategory] = match;
    const key = rawKey.trim();
    const value = rawValue.trim();
    const category = rawCategory.trim();
    
    // SECURITY: Validate key is whitelisted
    if (!ALLOWED_MEMORY_KEYS.includes(key)) {
      console.warn(`[Memory] Rejected non-whitelisted key: ${key}`);
      continue;
    }
    
    // SECURITY: Validate category
    if (!ALLOWED_CATEGORIES.includes(category as MemoryEntry['category'])) {
      console.warn(`[Memory] Rejected invalid category: ${category}`);
      continue;
    }
    
    // SECURITY: Validate value length (prevent storage abuse)
    if (value.length > 500) {
      console.warn(`[Memory] Rejected overly long value for key: ${key}`);
      continue;
    }
    
    // SECURITY: Sanitize value (no HTML/scripts)
    const sanitizedValue = value.replace(/<[^>]*>/g, '').trim();
    
    if (!sanitizedValue) {
      console.warn(`[Memory] Rejected empty value after sanitization for key: ${key}`);
      continue;
    }
    
    instructions.push({
      key,
      value: sanitizedValue,
      category: category as MemoryEntry['category'],
    });
  }

  return instructions;
}

/**
 * Delete a specific memory
 */
export async function deleteMemory(conversationId: string, key: string): Promise<boolean> {
  const supabase = await getSupabaseClient();
  
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
  const supabase = await getSupabaseClient();
  
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


