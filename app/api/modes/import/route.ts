import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface ImportedMode {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  system_prompt: string;
  is_active?: boolean;
}

interface ImportData {
  version?: string;
  modes: ImportedMode[];
}

/**
 * POST /api/modes/import
 * Import modes from JSON
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const importData: ImportData = await request.json();

    if (!importData.modes || !Array.isArray(importData.modes)) {
      return NextResponse.json({ error: 'Invalid import format: modes array required' }, { status: 400 });
    }

    if (importData.modes.length === 0) {
      return NextResponse.json({ error: 'No modes to import' }, { status: 400 });
    }

    if (importData.modes.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 modes can be imported at once' }, { status: 400 });
    }

    // Validate each mode
    for (let i = 0; i < importData.modes.length; i++) {
      const mode = importData.modes[i];
      if (!mode.name || typeof mode.name !== 'string') {
        return NextResponse.json({ error: `Mode ${i + 1}: name is required` }, { status: 400 });
      }
      if (!mode.system_prompt || typeof mode.system_prompt !== 'string') {
        return NextResponse.json({ error: `Mode ${i + 1}: system_prompt is required` }, { status: 400 });
      }
    }

    // Get existing mode names to avoid duplicates
    const { data: existingModes } = await supabase
      .from('custom_modes')
      .select('name')
      .eq('user_id', user.id);

    const existingNames = new Set(existingModes?.map(m => m.name.toLowerCase()) || []);

    // Get next sort order
    const { data: lastMode } = await supabase
      .from('custom_modes')
      .select('sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1);

    let nextSortOrder = lastMode && lastMode.length > 0 
      ? (lastMode[0].sort_order || 0) + 1 
      : 0;

    // Process modes
    const modesToInsert = importData.modes.map((mode) => {
      // Handle duplicate names by appending number
      let finalName = mode.name;
      let counter = 1;
      while (existingNames.has(finalName.toLowerCase())) {
        finalName = `${mode.name} (${counter})`;
        counter++;
      }
      existingNames.add(finalName.toLowerCase());

      return {
        user_id: user.id,
        name: finalName.substring(0, 100),
        description: mode.description?.substring(0, 500) || null,
        icon: mode.icon || '💬',
        color: mode.color || 'blue',
        system_prompt: mode.system_prompt,
        is_active: mode.is_active ?? true,
        is_default: false,
        sort_order: nextSortOrder++,
      };
    });

    // Insert all modes
    const { data: insertedModes, error } = await supabase
      .from('custom_modes')
      .insert(modesToInsert)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: insertedModes?.length || 0,
      modes: insertedModes,
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ 
      error: 'Invalid JSON format',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 400 });
  }
}
























