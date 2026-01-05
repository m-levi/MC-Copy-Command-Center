/**
 * Conversation Service
 *
 * Handles all conversation-related business logic including:
 * - Conversation CRUD operations
 * - Message management
 * - Conversation sharing
 * - Mode management
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const ConversationModeSchema = z.enum([
  'email_copy',
  'planning',
  'flow',
  'assistant',
  'calendar_planner',
]);

export type ConversationMode = z.infer<typeof ConversationModeSchema>;

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);

export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  model_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().datetime(),
});

export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  brand_id: z.string().uuid().nullable(),
  title: z.string().nullable(),
  mode: ConversationModeSchema.nullable(),
  custom_mode_id: z.string().uuid().nullable(),
  is_starred: z.boolean().default(false),
  share_token: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const CreateConversationInputSchema = z.object({
  brand_id: z.string().uuid().nullable().optional(),
  title: z.string().optional(),
  mode: ConversationModeSchema.optional(),
  custom_mode_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateConversationInput = z.infer<typeof CreateConversationInputSchema>;

export const CreateMessageInputSchema = z.object({
  conversation_id: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  model_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateMessageInput = z.infer<typeof CreateMessageInputSchema>;

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

type SupabaseClient = ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T>
  ? T
  : never;

/**
 * Get a conversation by ID
 */
export async function getConversationById(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error('[ConversationService] Error fetching conversation:', error);
    throw new Error(`Failed to fetch conversation: ${error.message}`);
  }

  return data as Conversation;
}

/**
 * Get a conversation with all its messages
 */
export async function getConversationWithMessages(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<ConversationWithMessages | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(
      `
      *,
      messages (*)
    `
    )
    .eq('id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { foreignTable: 'messages', ascending: true })
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error('[ConversationService] Error fetching conversation with messages:', error);
    throw new Error(`Failed to fetch conversation: ${error.message}`);
  }

  return data as ConversationWithMessages;
}

/**
 * Get conversations for a user, optionally filtered by brand
 */
export async function getConversationsForUser(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    brandId?: string;
    limit?: number;
    offset?: number;
    starred?: boolean;
  }
): Promise<Conversation[]> {
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (options?.brandId) {
    query = query.eq('brand_id', options.brandId);
  }

  if (options?.starred !== undefined) {
    query = query.eq('is_starred', options.starred);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[ConversationService] Error fetching conversations:', error);
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  return (data || []) as Conversation[];
}

/**
 * Create a new conversation
 */
export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  input: CreateConversationInput
): Promise<Conversation> {
  const validated = CreateConversationInputSchema.parse(input);

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      ...validated,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error('[ConversationService] Error creating conversation:', error);
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data as Conversation;
}

/**
 * Update a conversation
 */
export async function updateConversation(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  updates: Partial<CreateConversationInput & { title: string; is_starred: boolean }>
): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    logger.error('[ConversationService] Error updating conversation:', error);
    throw new Error(`Failed to update conversation: ${error.message}`);
  }

  return data as Conversation;
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId);

  if (error) {
    logger.error('[ConversationService] Error deleting conversation:', error);
    throw new Error(`Failed to delete conversation: ${error.message}`);
  }
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  supabase: SupabaseClient,
  input: CreateMessageInput
): Promise<Message> {
  const validated = CreateMessageInputSchema.parse(input);

  const { data, error } = await supabase
    .from('messages')
    .insert(validated)
    .select()
    .single();

  if (error) {
    logger.error('[ConversationService] Error adding message:', error);
    throw new Error(`Failed to add message: ${error.message}`);
  }

  // Update conversation's updated_at timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', validated.conversation_id);

  return data as Message;
}

/**
 * Get messages for a conversation
 */
export async function getMessagesForConversation(
  supabase: SupabaseClient,
  conversationId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[ConversationService] Error fetching messages:', error);
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return (data || []) as Message[];
}

/**
 * Generate a share token for a conversation
 */
export async function generateShareToken(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<string> {
  const token = crypto.randomUUID();

  const { error } = await supabase
    .from('conversations')
    .update({ share_token: token })
    .eq('id', conversationId)
    .eq('user_id', userId);

  if (error) {
    logger.error('[ConversationService] Error generating share token:', error);
    throw new Error(`Failed to generate share token: ${error.message}`);
  }

  return token;
}

/**
 * Get a shared conversation by token (no auth required)
 */
export async function getSharedConversation(
  supabase: SupabaseClient,
  shareToken: string
): Promise<ConversationWithMessages | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(
      `
      *,
      messages (*)
    `
    )
    .eq('share_token', shareToken)
    .order('created_at', { foreignTable: 'messages', ascending: true })
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error('[ConversationService] Error fetching shared conversation:', error);
    throw new Error(`Failed to fetch shared conversation: ${error.message}`);
  }

  return data as ConversationWithMessages;
}

/**
 * Toggle star status for a conversation
 */
export async function toggleStar(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<boolean> {
  // First get current status
  const conversation = await getConversationById(supabase, conversationId, userId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const newStatus = !conversation.is_starred;

  await updateConversation(supabase, conversationId, userId, {
    is_starred: newStatus,
  });

  return newStatus;
}

/**
 * Auto-generate title from first user message
 */
export function generateTitleFromMessage(content: string, maxLength = 50): string {
  // Remove markdown and special characters
  const cleaned = content
    .replace(/[#*_`~]/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Truncate at word boundary
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
}
