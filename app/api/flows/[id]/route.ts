import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get flow conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_flow', true)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    // Get flow outline
    const { data: outline, error: outlineError } = await supabase
      .from('flow_outlines')
      .select('*')
      .eq('conversation_id', id)
      .single();

    // Get child conversations
    const { data: children, error: childrenError } = await supabase
      .from('conversations')
      .select('*')
      .eq('parent_conversation_id', id)
      .order('flow_sequence_order', { ascending: true });

    return NextResponse.json({
      success: true,
      conversation,
      outline: outline || null,
      children: children || []
    });

  } catch (error) {
    console.error('Error in get flow route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

