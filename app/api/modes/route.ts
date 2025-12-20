import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { CustomMode } from '@/types';

/**
 * GET /api/modes
 * List all custom modes for the current user
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  let query = supabase
    .from('custom_modes')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/modes
 * Create a new custom mode
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { 
    name, description, icon, color, system_prompt, is_active,
    base_mode, tools, context_sources, output_config, model_config,
    category, tags, is_shared
  } = body;

  // Validation
  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (name.length > 100) {
    return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
  }

  if (!system_prompt || system_prompt.trim().length === 0) {
    return NextResponse.json({ error: 'System prompt is required' }, { status: 400 });
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
      name: name.trim(),
      description: description?.trim() || null,
      icon: icon || '💬',
      color: color || 'blue',
      system_prompt: system_prompt.trim(),
      is_active: is_active ?? true,
      is_default: false,
      sort_order: nextSortOrder,
      // Enhanced fields (with defaults for backward compatibility)
      base_mode: base_mode || 'create',
      tools: tools || null,
      context_sources: context_sources || null,
      output_config: output_config || null,
      model_config: model_config || null,
      category: category || null,
      tags: tags || [],
      is_shared: is_shared || false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}


