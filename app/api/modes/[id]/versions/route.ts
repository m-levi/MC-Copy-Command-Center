import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/modes/[id]/versions
 * Get version history for a mode
 */
export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify mode belongs to user
  const { data: mode, error: modeError } = await supabase
    .from('custom_modes')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (modeError || !mode) {
    return NextResponse.json({ error: 'Mode not found' }, { status: 404 });
  }

  // Get version history
  const { data: versions, error } = await supabase
    .from('mode_versions')
    .select('*')
    .eq('mode_id', id)
    .order('version_number', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(versions);
}

/**
 * POST /api/modes/[id]/versions
 * Restore a specific version
 */
export async function POST(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { version_number } = body;

  if (!version_number) {
    return NextResponse.json({ error: 'Version number is required' }, { status: 400 });
  }

  // Verify mode belongs to user
  const { data: mode, error: modeError } = await supabase
    .from('custom_modes')
    .select('id, is_default')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (modeError || !mode) {
    return NextResponse.json({ error: 'Mode not found' }, { status: 404 });
  }

  if (mode.is_default) {
    return NextResponse.json({ error: 'Cannot modify default modes' }, { status: 403 });
  }

  // Get the version to restore
  const { data: version, error: versionError } = await supabase
    .from('mode_versions')
    .select('system_prompt')
    .eq('mode_id', id)
    .eq('version_number', version_number)
    .single();

  if (versionError || !version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  // Update the mode with the old prompt (this will auto-create a new version via trigger)
  const { data: updatedMode, error: updateError } = await supabase
    .from('custom_modes')
    .update({ system_prompt: version.system_prompt })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updatedMode);
}
























