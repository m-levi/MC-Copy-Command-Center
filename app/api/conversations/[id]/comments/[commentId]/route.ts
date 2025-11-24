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

// PATCH: Update a comment (edit content or mark as resolved)
export const PATCH = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ id: string; commentId: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { id: conversationId, commentId } = await context.params;
  const body = await req.json();
  const { content, resolved } = body;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Get the comment with additional info
  const { data: comment } = await supabase
    .from('conversation_comments')
    .select('id, user_id, conversation_id, assigned_to, resolved')
    .eq('id', commentId)
    .single();

  if (!comment) {
    return notFoundError('Comment');
  }

  // Get conversation for brand info
  const { data: conversation } = await supabase
    .from('conversations')
    .select('brand_id')
    .eq('id', conversationId)
    .single();

  // Permission check: 
  // - Only comment owner can edit content
  // - Anyone in the organization can resolve/unresolve
  if (content !== undefined && comment.user_id !== user.id) {
    return authorizationError('You can only edit your own comments');
  }

  // Update comment
  const updateData: any = {};
  if (content !== undefined) updateData.content = content;
  if (resolved !== undefined) updateData.resolved = resolved;

  const { data: updatedComment, error } = await supabase
    .from('conversation_comments')
    .update(updateData)
    .eq('id', commentId)
    .select('*')
    .single();

  if (error) throw error;

  // Send notification when comment is resolved (if assigned to someone)
  if (resolved === true && !comment.resolved && comment.assigned_to && comment.assigned_to !== user.id) {
    // Get resolver's profile
    const { data: resolverProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    await supabase.from('notifications').insert({
      user_id: comment.assigned_to,
      type: 'comment_resolved',
      title: 'Comment Resolved',
      message: `${resolverProfile?.full_name || resolverProfile?.email || 'Someone'} resolved a comment assigned to you`,
      link: `/brands/${conversation?.brand_id}/chat?conversation=${conversationId}`,
      metadata: {
        conversation_id: conversationId,
        comment_id: commentId,
        resolver_id: user.id,
      },
    });
  }

  // Notify comment owner when their comment is resolved by someone else
  if (resolved === true && !comment.resolved && comment.user_id !== user.id && comment.user_id !== comment.assigned_to) {
    const { data: resolverProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    await supabase.from('notifications').insert({
      user_id: comment.user_id,
      type: 'comment_resolved',
      title: 'Your Comment Was Resolved',
      message: `${resolverProfile?.full_name || resolverProfile?.email || 'Someone'} resolved your comment`,
      link: `/brands/${conversation?.brand_id}/chat?conversation=${conversationId}`,
      metadata: {
        conversation_id: conversationId,
        comment_id: commentId,
        resolver_id: user.id,
      },
    });
  }

  return NextResponse.json({ comment: updatedComment });
});

// DELETE: Delete a comment
export const DELETE = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ id: string; commentId: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { id: conversationId, commentId } = await context.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Get the comment to verify ownership
  const { data: comment } = await supabase
    .from('conversation_comments')
    .select('id, user_id, conversation_id')
    .eq('id', commentId)
    .single();

  if (!comment) {
    return notFoundError('Comment');
  }

  // Only comment owner can delete
  if (comment.user_id !== user.id) {
    return authorizationError('You can only delete your own comments');
  }

  // Delete comment
  const { error } = await supabase
    .from('conversation_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;

  return NextResponse.json({ success: true });
});

