import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  withErrorHandling,
} from '@/lib/api-error';

export const runtime = 'nodejs';

// POST: Add a comment
export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { id: conversationId } = await context.params;
  const { content, messageId, parentCommentId, quotedText } = await req.json();

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return validationError('Comment content is required');
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Verify user has access to conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, user_id, brand_id')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    return notFoundError('Conversation not found');
  }

  // Check if user has comment/edit permission (owner, org member, or share)
  const hasAccess = conversation.user_id === user.id || 
    await checkOrgMembership(supabase, conversation.brand_id, user.id) ||
    await checkSharePermission(supabase, conversationId, user.id, ['comment', 'edit']);

  if (!hasAccess) {
    return authorizationError('You do not have permission to comment on this conversation');
  }

  // Create comment
  const commentData: any = {
    conversation_id: conversationId,
    user_id: user.id,
    content: content.trim(),
  };

  if (messageId) {
    commentData.message_id = messageId;
  }

  if (parentCommentId) {
    commentData.parent_comment_id = parentCommentId;
  }

  if (quotedText) {
    commentData.quoted_text = quotedText;
  }

  const { data: comment, error: commentError } = await supabase
    .from('conversation_comments')
    .insert(commentData)
    .select('*')
    .single();

  if (commentError) {
    console.error('[Comments API] Error creating comment:', commentError);
    throw commentError;
  }

  // Fetch user profile separately
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, email, full_name')
    .eq('user_id', user.id)
    .single();

  // Add user info to comment
  const commentWithUser = {
    ...comment,
    user: profile || { id: user.id, email: user.email || 'Unknown' }
  };

  // Create notification for conversation owner (if not the commenter)
  if (conversation.user_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id: conversation.user_id,
      type: 'comment_added',
      title: 'New Comment',
      message: `${user.email || 'Someone'} commented on your conversation`,
      link: `/brands/${conversationId}/chat?conversation=${conversationId}`,
      metadata: {
        conversation_id: conversationId,
        comment_id: comment.id,
        commenter_id: user.id,
      },
    });
  }

  return NextResponse.json({ comment: commentWithUser }, { status: 201 });
});

// GET: Get all comments for a conversation
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

  // Try to get conversation - if RLS blocks it, just return empty comments
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, user_id, brand_id')
    .eq('id', conversationId)
    .maybeSingle();

  // If no conversation found (RLS blocked or doesn't exist), return empty comments
  // This is fine - comments sidebar will show "No comments yet"
  if (!conversation) {
    return NextResponse.json({ comments: [] });
  }

  // User has access to conversation, get comments
  const { data: comments, error } = await supabase
    .from('conversation_comments')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Comments API] Error fetching comments:', error);
    throw error;
  }

  // Fetch user profiles separately to avoid RLS issues
  if (comments && comments.length > 0) {
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, full_name')
      .in('user_id', userIds);

    // Map profiles to comments
    const commentsWithUsers = comments.map(comment => ({
      ...comment,
      user: profiles?.find(p => p.user_id === comment.user_id) || { id: comment.user_id, email: 'Unknown' }
    }));

    return NextResponse.json({ comments: commentsWithUsers });
  }

  return NextResponse.json({ comments: comments || [] });
});

// Helper function to check organization membership
async function checkOrgMembership(
  supabase: any,
  brandId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('brands')
    .select('organization_id')
    .eq('id', brandId)
    .single();

  if (!data) return false;

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', data.organization_id)
    .eq('user_id', userId)
    .single();

  return !!membership;
}

// Helper function to check share permissions
async function checkSharePermission(
  supabase: any,
  conversationId: string,
  userId: string,
  allowedLevels: string[]
): Promise<boolean> {
  const { data: shares } = await supabase
    .from('conversation_shares')
    .select('permission_level, share_type, expires_at')
    .eq('conversation_id', conversationId)
    .or(`shared_with_user_id.eq.${userId},share_type.eq.organization`);

  if (!shares || shares.length === 0) return false;

  return shares.some((share: any) => 
    allowedLevels.includes(share.permission_level) &&
    (!share.expires_at || new Date(share.expires_at) > new Date())
  );
}




