/**
 * Chat Types
 *
 * Type definitions for the chat system
 */

import { z } from 'zod';
import { ModelMessage } from 'ai';

// ============================================================================
// REQUEST TYPES
// ============================================================================

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  id: z.string().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['image', 'file']),
  mimeType: z.string(),
  data: z.string(), // base64
  size: z.number().optional(),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

export const BrandContextSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand_details: z.string().nullable().optional(),
  brand_guidelines: z.string().nullable().optional(),
  copywriting_style_guide: z.string().nullable().optional(),
  brand_voice: z.record(z.string(), z.unknown()).nullable().optional(),
  website_url: z.string().nullable().optional(),
  /** Shopify store domain for MCP integration */
  shopify_domain: z.string().nullable().optional(),
});

export type BrandContext = z.infer<typeof BrandContextSchema>;

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  modelId: z.string(),
  brandContext: BrandContextSchema.nullable().optional(),
  conversationId: z.string().uuid().optional(),
  conversationMode: z.string().optional(),
  emailType: z.enum(['design', 'letter']).optional(),
  isFlowMode: z.boolean().optional(),
  flowType: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
  customModeId: z.string().uuid().optional(),
  regenerateSection: z.object({
    type: z.string(),
    title: z.string(),
  }).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ============================================================================
// INTERNAL TYPES
// ============================================================================

export interface ChatContext {
  request: ChatRequest;
  userId: string | null;
  systemPrompt: string;
  processedMessages: ModelMessage[];
  brandId: string | null;
  websiteUrl: string | null;
  isPersonalAI: boolean;
  shouldEnableMemory: boolean;
  supermemoryUserId: string;
  ragContext: string;
  customMode: { id: string; name: string; system_prompt: string } | null;
  debugPrompt: { name: string; system_prompt: string } | null;
}

export interface StreamMessage {
  type: string;
  [key: string]: unknown;
}

// ============================================================================
// STREAM EVENT TYPES
// ============================================================================

export type StreamEventType =
  | 'status'
  | 'text'
  | 'thinking'
  | 'thinking_start'
  | 'thinking_end'
  | 'tool_use'
  | 'artifact_created'
  | 'artifact_suggestion'
  | 'pending_artifact'
  | 'pending_action'
  | 'suggested_action'
  | 'conversation_plan'
  | 'products'
  | 'error';

export interface StreamEvent<T = Record<string, unknown>> {
  type: StreamEventType;
  data: T;
}
