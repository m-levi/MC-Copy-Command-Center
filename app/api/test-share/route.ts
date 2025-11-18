import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Test endpoint to verify shared conversation access
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the latest share token
    const { data: latestShare, error: shareError } = await supabase
      .from('conversation_shares')
      .select('*')
      .eq('share_type', 'link')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (shareError || !latestShare) {
      return NextResponse.json({
        status: 'error',
        message: 'No shares found',
        error: shareError
      });
    }

    // Try to read the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', latestShare.conversation_id)
      .single();

    // Try to read messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', latestShare.conversation_id);

    return NextResponse.json({
      status: 'success',
      testResults: {
        share: {
          found: !!latestShare,
          token: latestShare?.share_token,
          conversationId: latestShare?.conversation_id,
          error: shareError
        },
        conversation: {
          found: !!conversation,
          title: conversation?.title,
          error: convError,
          errorCode: convError?.code,
          errorMessage: convError?.message
        },
        messages: {
          found: !!messages,
          count: messages?.length || 0,
          error: messagesError,
          errorCode: messagesError?.code,
          errorMessage: messagesError?.message
        }
      },
      testUrl: latestShare ? `/shared/${latestShare.share_token}` : null,
      rlsPolicies: {
        message: 'Check if RLS policies exist',
        instructions: 'Run this SQL: SELECT tablename, policyname FROM pg_policies WHERE tablename IN (\'conversations\', \'messages\') AND policyname LIKE \'%shared%\''
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    }, { status: 500 });
  }
}




