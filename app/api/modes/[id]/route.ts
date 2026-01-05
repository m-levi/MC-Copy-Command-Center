import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/modes/[id]
 * Get a specific mode by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from('custom_modes')
    .select('id, user_id, name, description, icon, color, system_prompt, is_active, is_default, sort_order, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Mode not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * PUT /api/modes/[id]
 * Update a specific mode
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, description, icon, color, system_prompt, is_active, sort_order } = body;

  // Check if mode exists and belongs to user
  const { data: existingMode, error: fetchError } = await supabase
    .from('custom_modes')
    .select('id, is_default')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existingMode) {
    return NextResponse.json({ error: 'Mode not found' }, { status: 404 });
  }

  // Don't allow editing default modes
  if (existingMode.is_default) {
    return NextResponse.json({ error: 'Cannot modify default modes' }, { status: 403 });
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};
  
  if (name !== undefined) {
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
    }
    updateData.name = name.trim();
  }
  
  if (description !== undefined) {
    updateData.description = description?.trim() || null;
  }
  
  if (icon !== undefined) {
    updateData.icon = icon;
  }
  
  if (color !== undefined) {
    updateData.color = color;
  }
  
  if (system_prompt !== undefined) {
    if (!system_prompt || system_prompt.trim().length === 0) {
      return NextResponse.json({ error: 'System prompt cannot be empty' }, { status: 400 });
    }
    updateData.system_prompt = system_prompt.trim();
  }
  
  if (is_active !== undefined) {
    updateData.is_active = is_active;
  }
  
  if (sort_order !== undefined) {
    updateData.sort_order = sort_order;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('custom_modes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, user_id, name, description, icon, color, system_prompt, is_active, is_default, sort_order, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/modes/[id]
 * Delete a specific mode
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Check if mode exists and is not a default
  const { data: existingMode, error: fetchError } = await supabase
    .from('custom_modes')
    .select('id, is_default')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existingMode) {
    return NextResponse.json({ error: 'Mode not found' }, { status: 404 });
  }

  if (existingMode.is_default) {
    return NextResponse.json({ error: 'Cannot delete default modes' }, { status: 403 });
  }

  const { error } = await supabase
    .from('custom_modes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}




















