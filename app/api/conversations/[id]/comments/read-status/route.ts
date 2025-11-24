import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  authenticationError,
  withErrorHandling,
} from '@/lib/api-error';

export const runtime = 'nodejs';

// GET: Get unread comment count and IDs for a conversation
export const GET = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { id: conversationId } = await context.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Get all comments for this conversation
  const { data: comments } = await supabase
    .from('conversation_comments')
    .select('id, created_at')
    .eq('conversation_id', conversationId);

  if (!comments || comments.length === 0) {
    return NextResponse.json({ unreadCount: 0, unreadIds: [] });
  }

  // Get read status for user
  const { data: readStatus } = await supabase
    .from('comment_read_status')
    .select('comment_id')
    .eq('user_id', user.id)
    .in('comment_id', comments.map(c => c.id));

  const readCommentIds = new Set(readStatus?.map(r => r.comment_id) || []);
  
  // Find unread comments (excluding user's own comments which we'll auto-mark as read)
  const { data: ownComments } = await supabase
    .from('conversation_comments')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);
  
  const ownCommentIds = new Set(ownComments?.map(c => c.id) || []);

  const unreadIds = comments
    .filter(c => !readCommentIds.has(c.id) && !ownCommentIds.has(c.id))
    .map(c => c.id);

  return NextResponse.json({ 
    unreadCount: unreadIds.length, 
    unreadIds 
  });
});

// POST: Mark comments as read
export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { id: conversationId } = await context.params;
  const { commentIds, markAll } = await req.json();

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  let idsToMark: string[] = [];

  if (markAll) {
    // Get all comments in conversation
    const { data: comments } = await supabase
      .from('conversation_comments')
      .select('id')
      .eq('conversation_id', conversationId);
    
    idsToMark = comments?.map(c => c.id) || [];
  } else if (commentIds && Array.isArray(commentIds)) {
    idsToMark = commentIds;
  }

  if (idsToMark.length === 0) {
    return NextResponse.json({ success: true, markedCount: 0 });
  }

  // Upsert read status for each comment
  const readStatusEntries = idsToMark.map(commentId => ({
    user_id: user.id,
    comment_id: commentId,
    read_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('comment_read_status')
    .upsert(readStatusEntries, { 
      onConflict: 'user_id,comment_id',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error('[Read Status] Error marking as read:', error);
    // Don't throw - this is not critical
  }

  return NextResponse.json({ success: true, markedCount: idsToMark.length });
});



