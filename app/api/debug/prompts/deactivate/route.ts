import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST: Deactivate all prompts for a given type (switch to default prompts)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { prompt_type } = await request.json();

    if (!prompt_type) {
      return NextResponse.json({ error: 'prompt_type is required' }, { status: 400 });
    }

    // Deactivate all prompts of this type for this user
    const { error } = await supabase
      .from('custom_prompts')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('prompt_type', prompt_type);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Switched to default ${prompt_type} prompt` });
  } catch (error) {
    console.error('Error deactivating prompts:', error);
    return NextResponse.json({ error: 'Failed to deactivate prompts' }, { status: 500 });
  }
}

// DELETE: Deactivate ALL prompts for the user (switch everything to default)
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Deactivate all prompts for this user
    const { error } = await supabase
      .from('custom_prompts')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Switched to default prompts for all types' });
  } catch (error) {
    console.error('Error deactivating all prompts:', error);
    return NextResponse.json({ error: 'Failed to deactivate prompts' }, { status: 500 });
  }
}













































