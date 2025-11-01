import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FlowOutlineData } from '@/types';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, outlineData } = body as {
      conversationId: string;
      outlineData: FlowOutlineData;
    };

    // Validate conversation exists and user has access
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Create or update flow outline
    const { data: outline, error: outlineError } = await supabase
      .from('flow_outlines')
      .upsert({
        conversation_id: conversationId,
        flow_type: outlineData.flowType,
        outline_data: outlineData,
        approved: false,
        email_count: outlineData.emails.length
      }, {
        onConflict: 'conversation_id'
      })
      .select()
      .single();

    if (outlineError) {
      console.error('Error saving flow outline:', outlineError);
      return NextResponse.json({ error: 'Failed to save outline' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      outline
    });

  } catch (error) {
    console.error('Error in outline route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

