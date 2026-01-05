/**
 * Artifact Type Service
 *
 * Business logic for managing user-defined artifact types.
 * Makes the system fully extensible without code changes.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ArtifactKind } from '@/types/artifacts';
import type { ArtifactTypeInfo } from '@/lib/prompts/root-system-prompt';

// ============================================================================
// TYPES
// ============================================================================

export interface FieldSchema {
  name: string;
  label: string;
  type: 'text' | 'long_text' | 'number' | 'boolean' | 'select' | 'multi_select' | 'array' | 'object';
  options?: string[];
  default?: any;
  required: boolean;
  description?: string;
}

export interface ArtifactType {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  field_schema: FieldSchema[];
  supports_variants: boolean;
  supports_sharing: boolean;
  supports_comments: boolean;
  supports_versioning: boolean;
  viewer_type: string;
  viewer_config: Record<string, unknown>;
  is_system: boolean;
  is_active: boolean;
  created_by_user_id: string | null;
  organization_id: string | null;
  is_public: boolean;
  category: string | null;
  tags: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateArtifactTypeInput {
  kind: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  field_schema: FieldSchema[];
  supports_variants?: boolean;
  supports_sharing?: boolean;
  supports_comments?: boolean;
  viewer_type?: string;
  category?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface UpdateArtifactTypeInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  field_schema?: FieldSchema[];
  supports_variants?: boolean;
  supports_sharing?: boolean;
  supports_comments?: boolean;
  viewer_type?: string;
  category?: string;
  tags?: string[];
  is_public?: boolean;
  is_active?: boolean;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const FieldSchemaValidator = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'long_text', 'number', 'boolean', 'select', 'multi_select', 'array', 'object']),
  options: z.array(z.string()).optional(),
  default: z.any().optional(),
  required: z.boolean(),
  description: z.string().optional(),
});

export const CreateArtifactTypeSchema = z.object({
  kind: z.string()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, 'Kind must be lowercase with underscores only'),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  field_schema: z.array(FieldSchemaValidator),
  supports_variants: z.boolean().optional().default(false),
  supports_sharing: z.boolean().optional().default(true),
  supports_comments: z.boolean().optional().default(true),
  viewer_type: z.string().optional().default('generic'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  is_public: z.boolean().optional().default(false),
});

export const UpdateArtifactTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  field_schema: z.array(FieldSchemaValidator).optional(),
  supports_variants: z.boolean().optional(),
  supports_sharing: z.boolean().optional(),
  supports_comments: z.boolean().optional(),
  viewer_type: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  is_public: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get all artifact types visible to the current user
 */
export async function getArtifactTypes(
  supabase: SupabaseClient,
  options: {
    includeInactive?: boolean;
    category?: string;
    isPublic?: boolean;
  } = {}
): Promise<{ data: ArtifactType[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('artifact_types')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.isPublic !== undefined) {
      query = query.eq('is_public', options.isPublic);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching artifact types:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get artifact types by specific kinds
 */
export async function getArtifactTypesByKinds(
  supabase: SupabaseClient,
  kinds: string[]
): Promise<{ data: ArtifactType[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('artifact_types')
      .select('*')
      .in('kind', kinds)
      .eq('is_active', true);

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching artifact types by kinds:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get a single artifact type by kind
 */
export async function getArtifactTypeByKind(
  supabase: SupabaseClient,
  kind: string
): Promise<{ data: ArtifactType | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('artifact_types')
      .select('*')
      .eq('kind', kind)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching artifact type:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get a single artifact type by ID
 */
export async function getArtifactTypeById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: ArtifactType | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('artifact_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching artifact type:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Create a new artifact type
 */
export async function createArtifactType(
  supabase: SupabaseClient,
  input: CreateArtifactTypeInput
): Promise<{ data: ArtifactType | null; error: Error | null }> {
  try {
    // Validate input
    const validated = CreateArtifactTypeSchema.parse(input);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if kind already exists
    const { data: existing } = await supabase
      .from('artifact_types')
      .select('id')
      .eq('kind', validated.kind)
      .single();

    if (existing) {
      throw new Error(`Artifact type with kind "${validated.kind}" already exists`);
    }

    // Create artifact type
    const { data, error } = await supabase
      .from('artifact_types')
      .insert({
        ...validated,
        created_by_user_id: user.id,
        is_system: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error creating artifact type:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing artifact type
 */
export async function updateArtifactType(
  supabase: SupabaseClient,
  id: string,
  input: UpdateArtifactTypeInput
): Promise<{ data: ArtifactType | null; error: Error | null }> {
  try {
    // Validate input
    const validated = UpdateArtifactTypeSchema.parse(input);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if artifact type exists and user owns it
    const { data: existing, error: fetchError } = await getArtifactTypeById(supabase, id);
    if (fetchError || !existing) {
      throw new Error('Artifact type not found');
    }

    if (existing.is_system) {
      throw new Error('Cannot modify system artifact types');
    }

    if (existing.created_by_user_id !== user.id) {
      throw new Error('Unauthorized to modify this artifact type');
    }

    // Update artifact type
    const { data, error } = await supabase
      .from('artifact_types')
      .update(validated)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating artifact type:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete an artifact type (soft delete by setting is_active = false)
 */
export async function deleteArtifactType(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: Error | null }> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if artifact type exists and user owns it
    const { data: existing, error: fetchError } = await getArtifactTypeById(supabase, id);
    if (fetchError || !existing) {
      throw new Error('Artifact type not found');
    }

    if (existing.is_system) {
      throw new Error('Cannot delete system artifact types');
    }

    if (existing.created_by_user_id !== user.id) {
      throw new Error('Unauthorized to delete this artifact type');
    }

    // Soft delete
    const { error } = await supabase
      .from('artifact_types')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting artifact type:', error);
    return { error: error as Error };
  }
}

/**
 * Increment usage count for an artifact type
 */
export async function incrementArtifactTypeUsage(
  supabase: SupabaseClient,
  kind: string
): Promise<void> {
  try {
    await supabase.rpc('increment_artifact_type_usage', { p_kind: kind });
  } catch (error) {
    console.error('Error incrementing artifact type usage:', error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Convert ArtifactType to ArtifactTypeInfo format for prompts
 */
export function toArtifactTypeInfo(artifactType: ArtifactType): ArtifactTypeInfo {
  return {
    kind: artifactType.kind as ArtifactKind,
    name: artifactType.name,
    description: artifactType.description || '',
    icon: artifactType.icon,
    supportsVariants: artifactType.supports_variants,
    fieldSchema: artifactType.field_schema.map(field => ({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
    })),
  };
}

/**
 * Get artifact type info for prompts (by kinds)
 */
export async function getArtifactTypeInfoForPrompt(
  supabase: SupabaseClient,
  kinds: string[]
): Promise<ArtifactTypeInfo[]> {
  const { data, error } = await getArtifactTypesByKinds(supabase, kinds);

  if (error || !data) {
    console.error('Error fetching artifact types for prompt:', error);
    return [];
  }

  return data.map(toArtifactTypeInfo);
}
