import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/modes/export
 * Export modes as JSON
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const modeId = searchParams.get('id');
  const includeVersions = searchParams.get('versions') === 'true';

  // Export single mode or all modes
  let query = supabase
    .from('custom_modes')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  if (modeId) {
    query = query.eq('id', modeId);
  }

  const { data: modes, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Optionally include version history
  let versions: Record<string, any[]> = {};
  if (includeVersions && modes && modes.length > 0) {
    const modeIds = modes.map(m => m.id);
    const { data: versionData } = await supabase
      .from('mode_versions')
      .select('*')
      .in('mode_id', modeIds)
      .order('version_number', { ascending: false });

    if (versionData) {
      versions = versionData.reduce((acc, v) => {
        if (!acc[v.mode_id]) acc[v.mode_id] = [];
        acc[v.mode_id].push(v);
        return acc;
      }, {} as Record<string, any[]>);
    }
  }

  // Format for export (remove user-specific data)
  const exportData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    modes: modes?.map(mode => ({
      name: mode.name,
      description: mode.description,
      icon: mode.icon,
      color: mode.color,
      system_prompt: mode.system_prompt,
      is_active: mode.is_active,
      ...(includeVersions && versions[mode.id] ? {
        versions: versions[mode.id].map(v => ({
          version_number: v.version_number,
          system_prompt: v.system_prompt,
          notes: v.notes,
          created_at: v.created_at,
        }))
      } : {})
    })) || [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="modes-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}


