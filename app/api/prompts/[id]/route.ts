import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  withErrorHandling,
} from '@/lib/api-error';
import { UpdatePromptInput } from '@/types/prompts';

export const runtime = 'nodejs';

/**
 * GET /api/prompts/:id
 * Get a specific prompt
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const supabase = await createClient();
  const { id } = await context!.params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw authenticationError('Please sign in');
  }

  const { data: prompt, error } = await supabase
    .from('saved_prompts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !prompt) {
    throw notFoundError('Prompt not found');
  }

  return NextResponse.json({ prompt });
});

/**
 * PATCH /api/prompts/:id
 * Update a prompt
 */
export const PATCH = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const supabase = await createClient();
  const { id } = await context!.params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw authenticationError('Please sign in');
  }

  // Check prompt exists and user owns it
  const { data: existing } = await supabase
    .from('saved_prompts')
    .select('id, user_id, is_default')
    .eq('id', id)
    .single();

  if (!existing) {
    throw notFoundError('Prompt not found');
  }

  if (existing.user_id !== user.id) {
    throw authorizationError('You can only edit your own prompts');
  }

  const body: UpdatePromptInput = await req.json();

  // Build update object
  const updates: Record<string, unknown> = {};
  
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.prompt !== undefined) updates.prompt = body.prompt.trim();
  if (body.modes !== undefined) updates.modes = body.modes;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  const { data: prompt, error } = await supabase
    .from('saved_prompts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating prompt:', error);
    throw new Error('Failed to update prompt');
  }

  return NextResponse.json({ prompt });
});

/**
 * DELETE /api/prompts/:id
 * Delete a prompt (cannot delete defaults)
 */
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const supabase = await createClient();
  const { id } = await context!.params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw authenticationError('Please sign in');
  }

  // Check prompt exists and user owns it
  const { data: existing } = await supabase
    .from('saved_prompts')
    .select('id, user_id, is_default')
    .eq('id', id)
    .single();

  if (!existing) {
    throw notFoundError('Prompt not found');
  }

  if (existing.user_id !== user.id) {
    throw authorizationError('You can only delete your own prompts');
  }

  if (existing.is_default) {
    throw validationError('Cannot delete default prompts. You can disable them instead.');
  }

  const { error } = await supabase
    .from('saved_prompts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting prompt:', error);
    throw new Error('Failed to delete prompt');
  }

  return NextResponse.json({ success: true });
});

