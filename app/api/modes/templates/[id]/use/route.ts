import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { MODE_SELECT_FIELDS, normalizeModePayload } from '@/lib/modes/mode-persistence';

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

  const templatePayload = {
    ...template,
    enabled_tools: template.enabled_tools || template.tools,
  } as Record<string, unknown>;
  const normalizedMode = normalizeModePayload(templatePayload, { includeDefaults: true });

  // Create the mode
  const { data: mode, error: modeError } = await supabase
    .from('custom_modes')
    .insert({
      user_id: user.id,
      ...normalizedMode,
      name: String(template.name).trim(),
      system_prompt: String(template.system_prompt).trim(),
      is_active: normalizedMode.is_active ?? true,
      is_default: false,
      sort_order: nextSortOrder,
    })
    .select(MODE_SELECT_FIELDS)
    .single();

  if (modeError) {
    return NextResponse.json({ error: modeError.message }, { status: 500 });
  }

  return NextResponse.json(mode, { status: 201 });
}
