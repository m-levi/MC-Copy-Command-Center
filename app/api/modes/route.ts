import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  withErrorHandling,
  throwAuthenticationError,
  throwValidationError,
  handleSupabaseError,
} from '@/lib/api-error';
import { MODE_SELECT_FIELDS, normalizeModePayload } from '@/lib/modes/mode-persistence';

/**
 * GET /api/modes
 * List all custom modes for the current user
 */
export const GET = withErrorHandling(async (request: Request) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throwAuthenticationError();
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  let query = supabase
    .from('custom_modes')
    .select(MODE_SELECT_FIELDS)
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    handleSupabaseError(error, 'fetch modes');
  }

  return NextResponse.json(data);
});

/**
 * POST /api/modes
 * Create a new custom mode
 */
export const POST = withErrorHandling(async (request: Request) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throwAuthenticationError();
  }

  const body = await request.json();
  const normalizedMode = normalizeModePayload(body, { includeDefaults: true });
  const name = normalizedMode.name as string | undefined;
  const system_prompt = normalizedMode.system_prompt as string | undefined;

  // Validation
  if (!name || name.trim().length === 0) {
    throwValidationError('Name is required');
  }

  if (name.length > 100) {
    throwValidationError('Name must be 100 characters or less');
  }

  if (!system_prompt || system_prompt.trim().length === 0) {
    throwValidationError('System prompt is required');
  }

  // Get the next sort order
  const { data: existingModes } = await supabase
    .from('custom_modes')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existingModes && existingModes.length > 0
    ? (existingModes[0].sort_order || 0) + 1
    : 0;

  const { data, error } = await supabase
    .from('custom_modes')
    .insert({
      user_id: user.id,
      ...normalizedMode,
      name: name.trim(),
      system_prompt: system_prompt.trim(),
      is_default: false,
      sort_order: nextSortOrder,
    })
    .select(MODE_SELECT_FIELDS)
    .single();

  if (error) {
    handleSupabaseError(error, 'create mode');
  }

  return NextResponse.json(data, { status: 201 });
});













