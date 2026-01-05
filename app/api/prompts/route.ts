import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validationError,
  authenticationError,
  withErrorHandling,
} from '@/lib/api-error';
import { 
  SavedPrompt,
  CreatePromptInput,
  DEFAULT_PROMPTS,
} from '@/types/prompts';

export const runtime = 'nodejs';

/**
 * GET /api/prompts
 * List all prompts for the current user
 * Creates default prompts if user has none
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw authenticationError('Please sign in to view prompts');
  }

  // Get optional mode filter from query
  const { searchParams } = new URL(req.url);
  const modeFilter = searchParams.get('mode');

  // Check if user has any prompts
  const { count } = await supabase
    .from('saved_prompts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // If no prompts, create defaults
  if (count === 0) {
    const defaultsToInsert = DEFAULT_PROMPTS.map(p => ({
      ...p,
      user_id: user.id,
    }));

    await supabase
      .from('saved_prompts')
      .insert(defaultsToInsert);
  }

  // Build query
  let query = supabase
    .from('saved_prompts')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  // If mode filter, only get prompts that include that mode
  if (modeFilter) {
    query = query.contains('modes', [modeFilter]);
  }

  const { data: prompts, error } = await query;

  if (error) {
    console.error('Error fetching prompts:', error);
    throw new Error('Failed to fetch prompts');
  }

  return NextResponse.json({ prompts: prompts || [] });
});

/**
 * POST /api/prompts
 * Create a new prompt
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw authenticationError('Please sign in to create prompts');
  }

  const body: CreatePromptInput = await req.json();

  // Validate required fields
  if (!body.name?.trim()) {
    throw validationError('Name is required');
  }

  if (!body.prompt?.trim()) {
    throw validationError('Prompt text is required');
  }

  // Get max sort_order for user
  const { data: maxOrder } = await supabase
    .from('saved_prompts')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

  // Validate slash_command if provided
  const slashCommand = body.slash_command?.trim().toLowerCase().replace(/^\//, '').replace(/\s/g, '') || null;
  
  // Check for duplicate slash command for this user
  if (slashCommand) {
    const { data: existingCommand } = await supabase
      .from('saved_prompts')
      .select('id')
      .eq('user_id', user.id)
      .eq('slash_command', slashCommand)
      .single();
    
    if (existingCommand) {
      throw validationError(`Slash command "/${slashCommand}" is already in use`);
    }
  }

  // Create the prompt
  const { data: prompt, error } = await supabase
    .from('saved_prompts')
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      icon: body.icon || '💬',
      prompt: body.prompt.trim(),
      slash_command: slashCommand,
      modes: body.modes || ['email_copy'],
      is_active: true,
      is_default: false,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating prompt:', error);
    throw new Error('Failed to create prompt');
  }

  return NextResponse.json({ prompt }, { status: 201 });
});
























