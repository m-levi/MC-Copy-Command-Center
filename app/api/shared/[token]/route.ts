import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  notFoundError,
  authorizationError,
  withErrorHandling,
} from '@/lib/api-error';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// GET: Access shared conversation via token (using service role to bypass RLS)
export const GET = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ token: string }> }
) => {
  logger.log('[Shared API Service] ========== REQUEST START ==========');
  
  const { token } = await context!.params;
  logger.log('[Shared API Service] Token:', token);

  // Use service role client to bypass RLS - we validate access via share token instead
  const supabase = createServiceClient();

  // Get share by token
  const { data: share, error: shareError } = await supabase
    .from('conversation_shares')
    .select('*')
    .eq('share_token', token)
    .single();

  if (shareError || !share) {
    logger.error('[Shared API Service] Share not found:', shareError);
    return notFoundError('Shared link not found or expired');
  }

  logger.log('[Shared API Service] Share found:', {
    id: share.id,
    conversationId: share.conversation_id,
    permissionLevel: share.permission_level
  });

  // Check if expired
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return authorizationError('This shared link has expired');
  }

  // Get conversation details (bypassing RLS since we validated the share token)
  const { data: conversation, error: convError} = await supabase
    .from('conversations')
    .select('id, title, brand_id, user_id, conversation_type, created_at')
    .eq('id', share.conversation_id)
    .single();

  if (convError || !conversation) {
    logger.error('[Shared API Service] Conversation not found:', convError);
    return notFoundError('Conversation not found');
  }

  logger.log('[Shared API Service] Conversation found:', conversation.title);

  // Get messages based on share preference
  let messages;
  let messagesError;
  
  // Default to full_conversation if share_content is not set (for old shares)
  const shareContent = share.share_content || 'full_conversation';
  
  if (shareContent === 'last_email') {
    // Get only the last assistant message (the final email)
    const result = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1);
    
    messages = result.data;
    messagesError = result.error;
  } else {
    // Get all messages (full conversation)
    const result = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    
    messages = result.data;
    messagesError = result.error;
  }

  if (messagesError) {
    logger.error('[Shared API Service] Messages error:', messagesError);
  }

  logger.log('[Shared API Service] Messages found:', messages?.length || 0, 'Content type:', shareContent);

  // Get sharer info
  const { data: sharerProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('user_id', share.shared_by_user_id)
    .single();

  // Update access tracking
  await supabase
    .from('conversation_shares')
    .update({
      last_accessed_at: new Date().toISOString(),
      access_count: (share.access_count || 0) + 1,
    })
    .eq('id', share.id);

  logger.log('[Shared API Service] ========== SUCCESS ==========');

  return NextResponse.json({
    share: {
      id: share.id,
      permission_level: share.permission_level,
      expires_at: share.expires_at,
      shared_by_email: sharerProfile?.email || sharerProfile?.full_name || 'Unknown',
    },
    conversation,
    messages: messages || [],
  });
});
