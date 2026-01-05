/**
 * Brand Service
 *
 * Handles all brand-related business logic including:
 * - Brand CRUD operations
 * - Brand voice configuration
 * - Brand file management
 * - Organization-scoped access
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const BrandVoiceTraitSchema = z.object({
  trait: z.string(),
  explanation: z.string(),
});

export const BrandVocabularySchema = z.object({
  use: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
});

export const BrandVoiceDataSchema = z.object({
  brand_summary: z.string().optional(),
  voice_description: z.string().optional(),
  we_sound: z.array(BrandVoiceTraitSchema).default([]),
  we_never_sound: z.array(z.string()).default([]),
  vocabulary: BrandVocabularySchema.optional(),
  proof_points: z.array(z.string()).default([]),
  audience: z.string().optional(),
  good_copy_example: z.string().optional(),
  bad_copy_example: z.string().optional(),
  patterns: z.string().optional(),
});

export type BrandVoiceData = z.infer<typeof BrandVoiceDataSchema>;

export const BrandSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  organization_id: z.string().uuid(),
  brand_details: z.string().nullable(),
  brand_guidelines: z.string().nullable(),
  copywriting_style_guide: z.string().nullable(),
  brand_voice: BrandVoiceDataSchema.nullable(),
  website_url: z.string().url().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Brand = z.infer<typeof BrandSchema>;

export const CreateBrandInputSchema = z.object({
  name: z.string().min(1).max(255),
  organization_id: z.string().uuid(),
  brand_details: z.string().optional(),
  brand_guidelines: z.string().optional(),
  copywriting_style_guide: z.string().optional(),
  brand_voice: BrandVoiceDataSchema.optional(),
  website_url: z.string().url().optional(),
  logo_url: z.string().url().optional(),
});

export type CreateBrandInput = z.infer<typeof CreateBrandInputSchema>;

export const UpdateBrandInputSchema = CreateBrandInputSchema.partial().omit({
  organization_id: true,
});

export type UpdateBrandInput = z.infer<typeof UpdateBrandInputSchema>;

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

type SupabaseClient = ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T>
  ? T
  : never;

/**
 * Get a brand by ID with organization access check
 */
export async function getBrandById(
  supabase: SupabaseClient,
  brandId: string,
  userId: string
): Promise<Brand | null> {
  const { data, error } = await supabase
    .from('brands')
    .select(
      `
      *,
      organization:organizations!inner(
        organization_members!inner(user_id)
      )
    `
    )
    .eq('id', brandId)
    .eq('organization.organization_members.user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    logger.error('[BrandService] Error fetching brand:', error);
    throw new Error(`Failed to fetch brand: ${error.message}`);
  }

  // Remove the nested organization data before returning
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { organization, ...brand } = data;
  return brand as Brand;
}

/**
 * Get all brands for a user's organization
 */
export async function getBrandsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<Brand[]> {
  const { data, error } = await supabase
    .from('brands')
    .select(
      `
      *,
      organization:organizations!inner(
        organization_members!inner(user_id)
      )
    `
    )
    .eq('organization.organization_members.user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    logger.error('[BrandService] Error fetching brands:', error);
    throw new Error(`Failed to fetch brands: ${error.message}`);
  }

  // Remove the nested organization data
  return (data || []).map(({ organization, ...brand }) => brand as Brand);
}

/**
 * Create a new brand
 */
export async function createBrand(
  supabase: SupabaseClient,
  input: CreateBrandInput
): Promise<Brand> {
  const validated = CreateBrandInputSchema.parse(input);

  const { data, error } = await supabase
    .from('brands')
    .insert(validated)
    .select()
    .single();

  if (error) {
    logger.error('[BrandService] Error creating brand:', error);
    throw new Error(`Failed to create brand: ${error.message}`);
  }

  return data as Brand;
}

/**
 * Update a brand
 */
export async function updateBrand(
  supabase: SupabaseClient,
  brandId: string,
  input: UpdateBrandInput
): Promise<Brand> {
  const validated = UpdateBrandInputSchema.parse(input);

  const { data, error } = await supabase
    .from('brands')
    .update({ ...validated, updated_at: new Date().toISOString() })
    .eq('id', brandId)
    .select()
    .single();

  if (error) {
    logger.error('[BrandService] Error updating brand:', error);
    throw new Error(`Failed to update brand: ${error.message}`);
  }

  return data as Brand;
}

/**
 * Delete a brand
 */
export async function deleteBrand(
  supabase: SupabaseClient,
  brandId: string
): Promise<void> {
  const { error } = await supabase.from('brands').delete().eq('id', brandId);

  if (error) {
    logger.error('[BrandService] Error deleting brand:', error);
    throw new Error(`Failed to delete brand: ${error.message}`);
  }
}

/**
 * Update brand voice configuration
 */
export async function updateBrandVoice(
  supabase: SupabaseClient,
  brandId: string,
  voice: BrandVoiceData
): Promise<Brand> {
  const validatedVoice = BrandVoiceDataSchema.parse(voice);

  return updateBrand(supabase, brandId, { brand_voice: validatedVoice });
}

/**
 * Get the most recently updated brand for a user
 */
export async function getLatestBrandForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<Brand | null> {
  const { data, error } = await supabase
    .from('brands')
    .select(
      `
      *,
      organization:organizations!inner(
        organization_members!inner(user_id)
      )
    `
    )
    .eq('organization.organization_members.user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    logger.error('[BrandService] Error fetching latest brand:', error);
    throw new Error(`Failed to fetch latest brand: ${error.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { organization, ...brand } = data;
  return brand as Brand;
}

/**
 * Format brand for AI prompt context
 */
export function formatBrandForPrompt(brand: Brand): string {
  const sections: string[] = [];

  sections.push(`Brand Name: ${brand.name}`);

  if (brand.brand_details) {
    sections.push(`Brand Details:\n${brand.brand_details}`);
  }

  if (brand.brand_guidelines) {
    sections.push(`Brand Guidelines:\n${brand.brand_guidelines}`);
  }

  if (brand.brand_voice) {
    const voice = brand.brand_voice;
    const voiceParts: string[] = [];

    if (voice.brand_summary) {
      voiceParts.push(`BRAND: ${voice.brand_summary}`);
    }
    if (voice.voice_description) {
      voiceParts.push(`VOICE: ${voice.voice_description}`);
    }
    if (voice.we_sound?.length) {
      const traits = voice.we_sound.map((t) => `• ${t.trait}: ${t.explanation}`).join('\n');
      voiceParts.push(`WE SOUND:\n${traits}`);
    }
    if (voice.we_never_sound?.length) {
      voiceParts.push(`WE NEVER SOUND:\n${voice.we_never_sound.map((s) => `• ${s}`).join('\n')}`);
    }
    if (voice.vocabulary) {
      const vocabParts: string[] = [];
      if (voice.vocabulary.use?.length) {
        vocabParts.push(`Use: ${voice.vocabulary.use.join(', ')}`);
      }
      if (voice.vocabulary.avoid?.length) {
        vocabParts.push(`Avoid: ${voice.vocabulary.avoid.join(', ')}`);
      }
      if (vocabParts.length) {
        voiceParts.push(`VOCABULARY:\n${vocabParts.join('\n')}`);
      }
    }
    if (voice.audience) {
      voiceParts.push(`AUDIENCE: ${voice.audience}`);
    }

    if (voiceParts.length) {
      sections.push(`Brand Voice:\n${voiceParts.join('\n\n')}`);
    }
  } else if (brand.copywriting_style_guide) {
    sections.push(`Copywriting Style Guide:\n${brand.copywriting_style_guide}`);
  }

  if (brand.website_url) {
    sections.push(`Website: ${brand.website_url}`);
  }

  return sections.join('\n\n');
}
