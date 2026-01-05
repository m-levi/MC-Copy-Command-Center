/**
 * API Validation Schemas
 *
 * Centralized Zod schemas for all API route validations.
 * These schemas provide:
 * - Runtime type validation
 * - TypeScript type inference
 * - Detailed error messages
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// ============================================================================
// CHAT API SCHEMAS
// ============================================================================

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);

export const ChatMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  id: z.string().optional(),
  name: z.string().optional(),
});

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string().url().optional(),
  content: z.string().optional(),
  size: z.number().optional(),
});

export const BrandContextSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand_details: z.string().nullable().optional(),
  brand_guidelines: z.string().nullable().optional(),
  copywriting_style_guide: z.string().nullable().optional(),
  brand_voice: z.record(z.string(), z.unknown()).nullable().optional(),
  website_url: z.string().url().nullable().optional(),
});

export const ConversationModeSchema = z.enum([
  'email_copy',
  'planning',
  'flow',
  'personal',
]);

export const EmailTypeSchema = z.enum(['design', 'letter']);

export const FlowTypeSchema = z.enum([
  'welcome',
  'abandoned_cart',
  'post_purchase',
  'browse_abandonment',
  'winback',
  'vip',
  'birthday',
  'custom',
]);

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, 'At least one message is required'),
  modelId: z.string().min(1, 'Model ID is required'),
  brandContext: BrandContextSchema.nullable().optional(),
  conversationId: UUIDSchema.optional(),
  conversationMode: z.union([
    ConversationModeSchema,
    z.string().regex(/^custom_[a-f0-9-]+$/, 'Invalid custom mode format'),
  ]).optional(),
  emailType: EmailTypeSchema.optional(),
  isFlowMode: z.boolean().optional(),
  flowType: FlowTypeSchema.optional(),
  attachments: z.array(AttachmentSchema).optional(),
  customModeId: UUIDSchema.optional(),
  regenerateSection: z.object({
    type: z.string(),
    title: z.string(),
  }).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ============================================================================
// BRAND API SCHEMAS
// ============================================================================

export const CreateBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(255),
  organization_id: UUIDSchema,
  brand_details: z.string().optional(),
  brand_guidelines: z.string().optional(),
  copywriting_style_guide: z.string().optional(),
  website_url: z.string().url('Invalid URL format').optional().or(z.literal('')),
  logo_url: z.string().url('Invalid URL format').optional().or(z.literal('')),
});

export const UpdateBrandSchema = CreateBrandSchema.partial().omit({
  organization_id: true,
});

export const BrandVoiceTraitSchema = z.object({
  trait: z.string().min(1),
  explanation: z.string(),
});

export const BrandVoiceSchema = z.object({
  brand_summary: z.string().optional(),
  voice_description: z.string().optional(),
  we_sound: z.array(BrandVoiceTraitSchema).default([]),
  we_never_sound: z.array(z.string()).default([]),
  vocabulary: z.object({
    use: z.array(z.string()).default([]),
    avoid: z.array(z.string()).default([]),
  }).optional(),
  proof_points: z.array(z.string()).default([]),
  audience: z.string().optional(),
  good_copy_example: z.string().optional(),
  bad_copy_example: z.string().optional(),
  patterns: z.string().optional(),
});

// ============================================================================
// CONVERSATION API SCHEMAS
// ============================================================================

export const CreateConversationSchema = z.object({
  brand_id: UUIDSchema.optional(),
  title: z.string().max(255).optional(),
  mode: ConversationModeSchema.optional(),
  custom_mode_id: UUIDSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateConversationSchema = z.object({
  title: z.string().max(255).optional(),
  is_starred: z.boolean().optional(),
  mode: ConversationModeSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// MODE API SCHEMAS
// ============================================================================

export const CreateModeSchema = z.object({
  name: z.string().min(1, 'Mode name is required').max(100),
  description: z.string().max(500).optional(),
  system_prompt: z.string().min(1, 'System prompt is required'),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  is_default: z.boolean().optional(),
  category: z.enum(['writing', 'planning', 'research', 'custom']).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateModeSchema = CreateModeSchema.partial();

export const TestModeSchema = z.object({
  mode_id: UUIDSchema,
  test_input: z.string().min(1, 'Test input is required'),
  brand_id: UUIDSchema.optional(),
});

export const CompareModeSchema = z.object({
  mode_ids: z.array(UUIDSchema).min(2).max(4),
  test_input: z.string().min(1),
  brand_id: UUIDSchema.optional(),
});

// ============================================================================
// PROMPT API SCHEMAS
// ============================================================================

export const CreatePromptSchema = z.object({
  name: z.string().min(1, 'Prompt name is required').max(100),
  content: z.string().min(1, 'Prompt content is required'),
  category: z.enum(['email', 'subject', 'flow', 'general']).optional(),
  tags: z.array(z.string()).optional(),
  is_favorite: z.boolean().optional(),
});

export const UpdatePromptSchema = CreatePromptSchema.partial();

// ============================================================================
// ARTIFACT API SCHEMAS
// ============================================================================
// NOTE: These schemas are for LEGACY structured email API endpoints.
// The main artifact creation flow uses:
// - lib/tools/artifact-tool.ts (EmailVersionToolInputSchema) for AI tool input
// - lib/email-version-parser.ts (EmailVersion) for parsing raw content
// ============================================================================

export const EmailSectionSchema = z.object({
  type: z.enum(['preheader', 'headline', 'subhead', 'body', 'cta', 'footer']),
  content: z.string(),
  order: z.number().int().nonnegative(),
});

export const EmailVersionSchema = z.object({
  subject_line: z.string(),
  preview_text: z.string().optional(),
  sections: z.array(EmailSectionSchema),
});

export const ArtifactVersionKeySchema = z.enum(['A', 'B', 'C']);

export const CreateArtifactSchema = z.object({
  conversation_id: UUIDSchema,
  brand_id: UUIDSchema,
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['email', 'subject_lines', 'flow']).default('email'),
  version_a: EmailVersionSchema.optional(),
  version_b: EmailVersionSchema.optional(),
  version_c: EmailVersionSchema.optional(),
  selected_version: ArtifactVersionKeySchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateArtifactSchema = z.object({
  title: z.string().min(1).optional(),
  version_a: EmailVersionSchema.optional(),
  version_b: EmailVersionSchema.optional(),
  version_c: EmailVersionSchema.optional(),
  selected_version: ArtifactVersionKeySchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// DOCUMENT API SCHEMAS
// ============================================================================

export const DocumentCategorySchema = z.enum([
  'general',
  'brand_guidelines',
  'style_guide',
  'product_info',
  'marketing',
  'research',
  'competitor',
  'testimonial',
  'reference',
  'template',
]);

export const DocumentVisibilitySchema = z.enum(['private', 'shared', 'org']);

export const CreateDocumentSchema = z.object({
  brand_id: UUIDSchema,
  doc_type: z.enum(['file', 'text', 'link']),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
  content: z.string().optional(),
  url: z.string().url().optional(),
  category: DocumentCategorySchema.optional(),
  visibility: DocumentVisibilitySchema.optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateDocumentSchema = CreateDocumentSchema.partial().omit({
  brand_id: true,
  doc_type: true,
});

// ============================================================================
// SEARCH API SCHEMAS
// ============================================================================

export const SearchRequestSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  brand_id: UUIDSchema.optional(),
  types: z.array(z.enum(['conversations', 'artifacts', 'documents', 'prompts'])).optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

// ============================================================================
// AUTH API SCHEMAS
// ============================================================================

export const MagicLinkRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  redirect_to: z.string().url().optional(),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const PasswordUpdateSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse and validate request body with a schema
 * Returns the validated data or throws a validation error
 */
export async function parseRequestBody<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(messages.join('; '));
    }
    throw new ValidationError('Invalid JSON body');
  }
}

/**
 * Parse and validate query parameters with a schema
 */
export function parseQueryParams<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const params: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    if (params[key]) {
      // Handle array parameters
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });

  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(messages.join('; '));
    }
    throw new ValidationError('Invalid query parameters');
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
