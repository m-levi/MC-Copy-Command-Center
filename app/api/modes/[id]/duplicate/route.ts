import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/modes/[id]/duplicate
 * Duplicate an existing mode
 */
export async function POST(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Get the original mode
  const { data: originalMode, error: fetchError } = await supabase
    .from('custom_modes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !originalMode) {
    return NextResponse.json({ error: 'Mode not found' }, { status: 404 });
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

  // Create the duplicate
  const { data: newMode, error: createError } = await supabase
    .from('custom_modes')
    .insert({
      user_id: user.id,
      name: `${originalMode.name} (Copy)`,
      description: originalMode.description,
      icon: originalMode.icon,
      color: originalMode.color,
      system_prompt: originalMode.system_prompt,
      is_active: false, // Start as inactive to avoid confusion
      is_default: false,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json(newMode, { status: 201 });
}
























