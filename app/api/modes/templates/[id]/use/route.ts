import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/modes/templates/[id]/use
 * Create a new mode from a template
 */
export async function POST(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Get the template
  const { data: template, error: templateError } = await supabase
    .from('mode_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Increment use count
  await supabase.rpc('increment_template_use_count', { p_template_id: id });

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

  // Create the mode
  const { data: mode, error: modeError } = await supabase
    .from('custom_modes')
    .insert({
      user_id: user.id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      system_prompt: template.system_prompt,
      is_active: true,
      is_default: false,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (modeError) {
    return NextResponse.json({ error: modeError.message }, { status: 500 });
  }

  return NextResponse.json(mode, { status: 201 });
}
