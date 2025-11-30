import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  withErrorHandling,
} from '@/lib/api-error';

export const runtime = 'nodejs';

// Get service client for bypassing RLS
function getServiceClient() {
  try {
    return createServiceClient();
  } catch (e) {
    console.warn('[Comments PATCH] Service client not available:', e);
    return null;
  }
}

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
    .maybeSingle();

  if (!data) return false;

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', data.organization_id)
    .eq('user_id', userId)
    .maybeSingle();

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

// PATCH: Update a comment (edit content, mark as resolved, or change assignment)
export const PATCH = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ id: string; commentId: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { id: conversationId, commentId } = await context.params;
  const body = await req.json();
  const { content, resolved, assignedTo } = body;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Use service client for lookups to bypass RLS (fallback to regular client)
  const serviceClient = getServiceClient();
  
  // Try service client first, then fall back to querying via conversation
  let comment: any = null;
  
  if (serviceClient) {
    // Service client available - can bypass RLS
    const { data, error: commentError } = await serviceClient
      .from('conversation_comments')
      .select('id, user_id, conversation_id, assigned_to, resolved')
      .eq('id', commentId)
      .maybeSingle();
    
    comment = data;
    console.log('[Comments PATCH] Service client lookup:', commentId, 'result:', comment, 'error:', commentError);
  } else {
    // No service client - query via conversation which user has access to
    // First verify the user has access to the conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle();
    
    if (conv) {
      // User has conversation access, now get all comments for this conversation
      // and find the one we need
      const { data: comments } = await supabase
        .from('conversation_comments')
        .select('id, user_id, conversation_id, assigned_to, resolved')
        .eq('conversation_id', conversationId);
      
      comment = comments?.find((c: any) => c.id === commentId);
      console.log('[Comments PATCH] RLS-aware lookup via conversation:', commentId, 'found:', !!comment);
    }
  }

  if (!comment) {
    console.log('[Comments PATCH] Comment not found:', commentId, 'in conversation:', conversationId);
    return notFoundError('Comment');
  }

  // Get conversation for brand info and authorization (required for validation and notifications)
  const lookupClient = serviceClient || supabase;
  const { data: conversation, error: convError } = await lookupClient
    .from('conversations')
    .select('user_id, brand_id')
    .eq('id', conversationId)
    .maybeSingle();

  console.log('[Comments PATCH] Looking up conversation:', conversationId, 'result:', conversation, 'error:', convError);

  if (!conversation) {
    return notFoundError('Conversation');
  }

  // Verify user has access to conversation (owner, org member, or share with comment/edit permission)
  const hasAccess = conversation.user_id === user.id || 
    await checkOrgMembership(lookupClient, conversation.brand_id, user.id) ||
    await checkSharePermission(lookupClient, conversationId, user.id, ['comment', 'edit']);

  if (!hasAccess) {
    return authorizationError('You do not have permission to modify comments on this conversation');
  }

  // Permission check: 
  // - Only comment owner can edit content
  // - Anyone with access can resolve/unresolve or change assignment
  if (content !== undefined && comment.user_id !== user.id) {
    return authorizationError('You can only edit your own comments');
  }

  // Update comment
  const updateData: any = {};
  if (content !== undefined) updateData.content = content;
  if (resolved !== undefined) updateData.resolved = resolved;
  
  // Handle assignment updates (including unassignment)
  if (assignedTo !== undefined) {
    if (assignedTo === null) {
      // Unassign
      updateData.assigned_to = null;
    } else {
      // Validate assigned user is a member of the organization
      const isMember = await checkOrgMembership(lookupClient, conversation.brand_id, assignedTo);
      if (!isMember) {
        return validationError('Assigned user is not a member of this organization');
      }
      updateData.assigned_to = assignedTo;
    }
  }

  console.log('[Comments PATCH] Updating comment with:', updateData);

  // Try to update - use service client if available, otherwise regular client
  let updatedComment;
  let updateError;
  const updateClient = serviceClient || supabase;
  
  // If using regular client and user is not the comment owner, 
  // they can only update if they own the conversation (for resolve/assign)
  const isOwner = comment.user_id === user.id;
  const isConversationOwner = conversation.user_id === user.id;
  
  if (!serviceClient && !isOwner && !isConversationOwner) {
    // Check if user has edit permission via share
    const hasEditPermission = await checkSharePermission(supabase, conversationId, user.id, ['edit']);
    if (!hasEditPermission) {
      console.log('[Comments PATCH] User lacks permission to update comment (RLS will block)');
      // For resolve/assignment changes by users with comment permission, 
      // we need service client which isn't available
      return authorizationError('Unable to update comment. Please contact your administrator.');
    }
  }
  
  const result = await updateClient
    .from('conversation_comments')
    .update(updateData)
    .eq('id', commentId)
    .select('*')
    .single();
  
  updatedComment = result.data;
  updateError = result.error;

  // If RLS blocked the update (no rows returned), try a different approach
  if (!updatedComment && !updateError) {
    console.log('[Comments PATCH] Update returned no data - RLS may have blocked');
    updateError = { message: 'Update blocked by permissions' };
  }

  // If the error is about the assigned_to column not existing, retry without it
  if (updateError && assignedTo !== undefined && (
    updateError.message?.includes('assigned_to') || 
    updateError.code === '42703' || // undefined_column
    updateError.details?.includes('assigned_to')
  )) {
    console.warn('[Comments PATCH] assigned_to column may not exist, retrying without it');
    const { assigned_to, ...updateDataWithoutAssignment } = updateData;
    
    const retryResult = await updateClient
      .from('conversation_comments')
      .update(updateDataWithoutAssignment)
      .eq('id', commentId)
      .select('*')
      .single();
    
    updatedComment = retryResult.data;
    updateError = retryResult.error;
    
    if (!updateError && updatedComment) {
      console.log('[Comments PATCH] Comment updated without assignment - run ADD_COMMENT_ASSIGNMENTS.sql migration to enable assignments');
    }
  }

  if (updateError || !updatedComment) {
    console.error('[Comments PATCH] Update error:', updateError);
    throw updateError || new Error('Failed to update comment');
  }

  // Get current user's profile for notifications
  const { data: userProfile } = await lookupClient
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', user.id)
    .maybeSingle();

  const userName = userProfile?.full_name || userProfile?.email || 'Someone';

  // Send notification when assignment changes
  if (assignedTo !== undefined && assignedTo !== comment.assigned_to) {
    // Notify new assignee (if not self-assigning)
    if (assignedTo && assignedTo !== user.id) {
      await supabase.from('notifications').insert({
        user_id: assignedTo,
        type: 'comment_assigned',
        title: 'Comment Assigned to You',
        message: `${userName} assigned you a comment`,
        link: `/brands/${conversation.brand_id}/chat?conversation=${conversationId}`,
        metadata: {
          conversation_id: conversationId,
          comment_id: commentId,
          assigner_id: user.id,
        },
      });
    }

    // Notify previous assignee that they were unassigned (if they're not the one making the change)
    if (comment.assigned_to && comment.assigned_to !== user.id && comment.assigned_to !== assignedTo) {
      await supabase.from('notifications').insert({
        user_id: comment.assigned_to,
        type: 'comment_unassigned',
        title: 'Comment Unassigned',
        message: `${userName} reassigned a comment you were assigned to`,
        link: `/brands/${conversation.brand_id}/chat?conversation=${conversationId}`,
        metadata: {
          conversation_id: conversationId,
          comment_id: commentId,
          unassigner_id: user.id,
        },
      });
    }
  }

  // Send notification when comment is resolved (if assigned to someone)
  if (resolved === true && !comment.resolved && comment.assigned_to && comment.assigned_to !== user.id) {
    await supabase.from('notifications').insert({
      user_id: comment.assigned_to,
      type: 'comment_resolved',
      title: 'Comment Resolved',
      message: `${userName} resolved a comment assigned to you`,
      link: `/brands/${conversation.brand_id}/chat?conversation=${conversationId}`,
      metadata: {
        conversation_id: conversationId,
        comment_id: commentId,
        resolver_id: user.id,
      },
    });
  }

  // Notify comment owner when their comment is resolved by someone else
  if (resolved === true && !comment.resolved && comment.user_id !== user.id && comment.user_id !== comment.assigned_to) {
    await supabase.from('notifications').insert({
      user_id: comment.user_id,
      type: 'comment_resolved',
      title: 'Your Comment Was Resolved',
      message: `${userName} resolved your comment`,
      link: `/brands/${conversation.brand_id}/chat?conversation=${conversationId}`,
      metadata: {
        conversation_id: conversationId,
        comment_id: commentId,
        resolver_id: user.id,
      },
    });
  }

  // Fetch updated comment with user and assignee profiles
  const allUserIds = [updatedComment.user_id];
  if (updatedComment.assigned_to) {
    allUserIds.push(updatedComment.assigned_to);
  }

  const { data: profiles } = await lookupClient
    .from('profiles')
    .select('user_id, email, full_name')
    .in('user_id', allUserIds);

  const userProfileData = profiles?.find((p: any) => p.user_id === updatedComment.user_id);
  const assigneeProfile = updatedComment.assigned_to 
    ? profiles?.find((p: any) => p.user_id === updatedComment.assigned_to) 
    : null;

  const commentWithUsers = {
    ...updatedComment,
    user: userProfileData 
      ? { ...userProfileData, id: userProfileData.user_id } 
      : { id: updatedComment.user_id, email: 'Unknown' },
    assignee: updatedComment.assigned_to 
      ? (assigneeProfile 
          ? { ...assigneeProfile, id: assigneeProfile.user_id } 
          : { id: updatedComment.assigned_to, email: 'Unknown' }) 
      : null
  };

  return NextResponse.json({ comment: commentWithUsers });
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

  // Use service client for lookups to bypass RLS (fallback to regular client)
  const serviceClient = getServiceClient() || supabase;

  // Get the comment to verify ownership
  const { data: comment } = await serviceClient
    .from('conversation_comments')
    .select('id, user_id, conversation_id')
    .eq('id', commentId)
    .maybeSingle();

  if (!comment) {
    return notFoundError('Comment');
  }

  // Only comment owner can delete
  if (comment.user_id !== user.id) {
    return authorizationError('You can only delete your own comments');
  }

  // Delete comment using service client
  const { error } = await serviceClient
    .from('conversation_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;

  return NextResponse.json({ success: true });
});

