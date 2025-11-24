import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the prompt to check its type
  const { data: prompt, error: fetchError } = await supabase
    .from('custom_prompts')
    .select('prompt_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !prompt) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  // The database trigger 'ensure_single_active_prompt' will handle deactivating other prompts
  // of the same type for this user.
  const { data, error } = await supabase
    .from('custom_prompts')
    .update({
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}



