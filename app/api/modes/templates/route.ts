import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MODE_TEMPLATES, getTemplatesByCategory, searchTemplates, TEMPLATE_CATEGORY_META } from '@/lib/mode-templates';
import { MODE_SELECT_FIELDS, normalizeModePayload } from '@/lib/modes/mode-persistence';

/**
 * GET /api/modes/templates
 * Get mode templates library
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  let templates = MODE_TEMPLATES;

  if (category) {
    if (category in TEMPLATE_CATEGORY_META) {
      templates = getTemplatesByCategory(category as keyof typeof TEMPLATE_CATEGORY_META);
    } else {
      templates = [];
    }
  }

  if (search) {
    templates = searchTemplates(search);
  }

  return NextResponse.json({
    templates,
    categories: TEMPLATE_CATEGORY_META,
  });
}

/**
 * POST /api/modes/templates/create-from
 * Create a mode from a template
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { template_id, customizations } = await request.json();

  const template = MODE_TEMPLATES.find(t => t.id === template_id);
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Get next sort order
  const { data: existingModes } = await supabase
    .from('custom_modes')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existingModes && existingModes.length > 0 
    ? (existingModes[0].sort_order || 0) + 1 
    : 0;

  const mergedTemplateConfig = {
    ...template,
    ...customizations,
  } as Record<string, unknown>;
  const normalizedMode = normalizeModePayload(mergedTemplateConfig, { includeDefaults: true });

  const { data, error } = await supabase
    .from('custom_modes')
    .insert({
      user_id: user.id,
      ...normalizedMode,
      name: (customizations?.name || template.name).trim(),
      system_prompt: String(customizations?.system_prompt || template.system_prompt).trim(),
      is_active: normalizedMode.is_active ?? true,
      is_default: false,
      sort_order: nextSortOrder,
    })
    .select(MODE_SELECT_FIELDS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
