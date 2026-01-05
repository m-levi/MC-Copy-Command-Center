/**
 * Artifact Service
 *
 * Handles all email artifact-related business logic including:
 * - Artifact CRUD operations
 * - Version management (A, B, C variants)
 * - Sharing and collaboration
 * - Comments
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================
// NOTE: This service contains LEGACY schemas for structured email editing.
// The main artifact creation flow uses:
// - lib/tools/artifact-tool.ts (EmailVersionToolInputSchema) for AI tool input
// - lib/email-version-parser.ts (EmailVersion) for parsing raw content
// These schemas are kept for potential future structured editing features.
// ============================================================================

export const EmailSectionSchema = z.object({
  type: z.enum(['preheader', 'headline', 'subhead', 'body', 'cta', 'footer']),
  content: z.string(),
  order: z.number().int().nonnegative(),
});

export type EmailSection = z.infer<typeof EmailSectionSchema>;

export const EmailVersionSchema = z.object({
  subject_line: z.string(),
  preview_text: z.string().optional(),
  sections: z.array(EmailSectionSchema),
});

export type EmailVersion = z.infer<typeof EmailVersionSchema>;

export const ArtifactVersionKeySchema = z.enum(['A', 'B', 'C']);
export type ArtifactVersionKey = z.infer<typeof ArtifactVersionKeySchema>;

export const ArtifactSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  message_id: z.string().uuid().nullable(),
  brand_id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  type: z.enum(['email', 'subject_lines', 'flow'] as const),
  version_a: EmailVersionSchema.nullable(),
  version_b: EmailVersionSchema.nullable(),
  version_c: EmailVersionSchema.nullable(),
  selected_version: ArtifactVersionKeySchema.default('A'),
  share_token: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

export const CreateArtifactInputSchema = z.object({
  conversation_id: z.string().uuid(),
  message_id: z.string().uuid().optional(),
  brand_id: z.string().uuid(),
  title: z.string(),
  type: z.enum(['email', 'subject_lines', 'flow'] as const).default('email'),
  version_a: EmailVersionSchema.optional(),
  version_b: EmailVersionSchema.optional(),
  version_c: EmailVersionSchema.optional(),
  selected_version: ArtifactVersionKeySchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateArtifactInput = z.infer<typeof CreateArtifactInputSchema>;

export const UpdateArtifactInputSchema = CreateArtifactInputSchema.partial().omit({
  conversation_id: true,
  brand_id: true,
});

export type UpdateArtifactInput = z.infer<typeof UpdateArtifactInputSchema>;

export const ArtifactCommentSchema = z.object({
  id: z.string().uuid(),
  artifact_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string(),
  version_key: ArtifactVersionKeySchema.nullable(),
  section_index: z.number().int().nonnegative().nullable(),
  resolved: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ArtifactComment = z.infer<typeof ArtifactCommentSchema>;

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

type SupabaseClient = ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T>
  ? T
  : never;

/**
 * Get an artifact by ID
 */
export async function getArtifactById(
  supabase: SupabaseClient,
  artifactId: string,
  userId: string
): Promise<Artifact | null> {
  const { data, error } = await supabase
    .from('artifacts')
    .select('*')
    .eq('id', artifactId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error('[ArtifactService] Error fetching artifact:', error);
    throw new Error(`Failed to fetch artifact: ${error.message}`);
  }

  return data as Artifact;
}

/**
 * Get artifacts for a conversation
 */
export async function getArtifactsForConversation(
  supabase: SupabaseClient,
  conversationId: string
): Promise<Artifact[]> {
  const { data, error } = await supabase
    .from('artifacts')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('[ArtifactService] Error fetching artifacts:', error);
    throw new Error(`Failed to fetch artifacts: ${error.message}`);
  }

  return (data || []) as Artifact[];
}

/**
 * Get artifacts for a brand
 */
export async function getArtifactsForBrand(
  supabase: SupabaseClient,
  brandId: string,
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: 'email' | 'subject_lines' | 'flow';
  }
): Promise<Artifact[]> {
  let query = supabase
    .from('artifacts')
    .select('*')
    .eq('brand_id', brandId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[ArtifactService] Error fetching artifacts for brand:', error);
    throw new Error(`Failed to fetch artifacts: ${error.message}`);
  }

  return (data || []) as Artifact[];
}

/**
 * Create a new artifact
 */
export async function createArtifact(
  supabase: SupabaseClient,
  userId: string,
  input: CreateArtifactInput
): Promise<Artifact> {
  const validated = CreateArtifactInputSchema.parse(input);

  const { data, error } = await supabase
    .from('artifacts')
    .insert({
      ...validated,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error('[ArtifactService] Error creating artifact:', error);
    throw new Error(`Failed to create artifact: ${error.message}`);
  }

  return data as Artifact;
}

/**
 * Update an artifact
 */
export async function updateArtifact(
  supabase: SupabaseClient,
  artifactId: string,
  userId: string,
  updates: UpdateArtifactInput
): Promise<Artifact> {
  const validated = UpdateArtifactInputSchema.parse(updates);

  const { data, error } = await supabase
    .from('artifacts')
    .update({ ...validated, updated_at: new Date().toISOString() })
    .eq('id', artifactId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    logger.error('[ArtifactService] Error updating artifact:', error);
    throw new Error(`Failed to update artifact: ${error.message}`);
  }

  return data as Artifact;
}

/**
 * Delete an artifact
 */
export async function deleteArtifact(
  supabase: SupabaseClient,
  artifactId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('artifacts')
    .delete()
    .eq('id', artifactId)
    .eq('user_id', userId);

  if (error) {
    logger.error('[ArtifactService] Error deleting artifact:', error);
    throw new Error(`Failed to delete artifact: ${error.message}`);
  }
}

/**
 * Switch selected version for an artifact
 */
export async function switchVersion(
  supabase: SupabaseClient,
  artifactId: string,
  userId: string,
  version: ArtifactVersionKey
): Promise<Artifact> {
  return updateArtifact(supabase, artifactId, userId, {
    selected_version: version,
  });
}

/**
 * Update a specific version of an artifact
 */
export async function updateVersion(
  supabase: SupabaseClient,
  artifactId: string,
  userId: string,
  version: ArtifactVersionKey,
  versionData: EmailVersion
): Promise<Artifact> {
  const versionKey = `version_${version.toLowerCase()}` as 'version_a' | 'version_b' | 'version_c';
  return updateArtifact(supabase, artifactId, userId, {
    [versionKey]: versionData,
  });
}

/**
 * Generate share token for an artifact
 */
export async function generateShareToken(
  supabase: SupabaseClient,
  artifactId: string,
  userId: string
): Promise<string> {
  const token = crypto.randomUUID();

  const { error } = await supabase
    .from('artifacts')
    .update({ share_token: token })
    .eq('id', artifactId)
    .eq('user_id', userId);

  if (error) {
    logger.error('[ArtifactService] Error generating share token:', error);
    throw new Error(`Failed to generate share token: ${error.message}`);
  }

  return token;
}

/**
 * Get shared artifact by token (no auth required)
 */
export async function getSharedArtifact(
  supabase: SupabaseClient,
  shareToken: string
): Promise<Artifact | null> {
  const { data, error } = await supabase
    .from('artifacts')
    .select('*')
    .eq('share_token', shareToken)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error('[ArtifactService] Error fetching shared artifact:', error);
    throw new Error(`Failed to fetch shared artifact: ${error.message}`);
  }

  return data as Artifact;
}

/**
 * Get the currently selected version data from an artifact
 */
export function getSelectedVersion(artifact: Artifact): EmailVersion | null {
  const versionKey = `version_${artifact.selected_version.toLowerCase()}` as keyof Pick<
    Artifact,
    'version_a' | 'version_b' | 'version_c'
  >;
  return artifact[versionKey] || null;
}

/**
 * Get all available versions from an artifact
 */
export function getAvailableVersions(artifact: Artifact): {
  key: ArtifactVersionKey;
  data: EmailVersion;
}[] {
  const versions: { key: ArtifactVersionKey; data: EmailVersion }[] = [];

  if (artifact.version_a) {
    versions.push({ key: 'A', data: artifact.version_a });
  }
  if (artifact.version_b) {
    versions.push({ key: 'B', data: artifact.version_b });
  }
  if (artifact.version_c) {
    versions.push({ key: 'C', data: artifact.version_c });
  }

  return versions;
}

// ============================================================================
// COMMENT FUNCTIONS
// ============================================================================

/**
 * Add a comment to an artifact
 */
export async function addComment(
  supabase: SupabaseClient,
  artifactId: string,
  userId: string,
  content: string,
  options?: {
    versionKey?: ArtifactVersionKey;
    sectionIndex?: number;
  }
): Promise<ArtifactComment> {
  const { data, error } = await supabase
    .from('artifact_comments')
    .insert({
      artifact_id: artifactId,
      user_id: userId,
      content,
      version_key: options?.versionKey || null,
      section_index: options?.sectionIndex ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error('[ArtifactService] Error adding comment:', error);
    throw new Error(`Failed to add comment: ${error.message}`);
  }

  return data as ArtifactComment;
}

/**
 * Get comments for an artifact
 */
export async function getCommentsForArtifact(
  supabase: SupabaseClient,
  artifactId: string
): Promise<ArtifactComment[]> {
  const { data, error } = await supabase
    .from('artifact_comments')
    .select('*')
    .eq('artifact_id', artifactId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('[ArtifactService] Error fetching comments:', error);
    throw new Error(`Failed to fetch comments: ${error.message}`);
  }

  return (data || []) as ArtifactComment[];
}

/**
 * Resolve/unresolve a comment
 */
export async function toggleCommentResolved(
  supabase: SupabaseClient,
  commentId: string,
  userId: string
): Promise<ArtifactComment> {
  // First get current status
  const { data: comment, error: fetchError } = await supabase
    .from('artifact_comments')
    .select('resolved')
    .eq('id', commentId)
    .single();

  if (fetchError) {
    throw new Error(`Comment not found: ${fetchError.message}`);
  }

  const { data, error } = await supabase
    .from('artifact_comments')
    .update({
      resolved: !comment.resolved,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select()
    .single();

  if (error) {
    logger.error('[ArtifactService] Error toggling comment resolved:', error);
    throw new Error(`Failed to update comment: ${error.message}`);
  }

  return data as ArtifactComment;
}

/**
 * Delete a comment
 */
export async function deleteComment(
  supabase: SupabaseClient,
  commentId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('artifact_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) {
    logger.error('[ArtifactService] Error deleting comment:', error);
    throw new Error(`Failed to delete comment: ${error.message}`);
  }
}
