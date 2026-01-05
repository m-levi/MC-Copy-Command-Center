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
  const { content, messageId, parentCommentId, quotedText, assignedTo, attachments } = await req.json();

  // Allow empty content if there are attachments
  if ((!content || typeof content !== 'string' || content.trim().length === 0) && (!attachments || attachments.length === 0)) {
    return validationError('Comment content or attachments required');
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

  // Pre-fetch current user's profile (we'll need it for notifications)
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('user_id, email, full_name')
    .eq('user_id', user.id)
    .single();

  // Create comment
  const commentData: any = {
    conversation_id: conversationId,
    user_id: user.id,
    content: content ? content.trim() : '',
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

  if (assignedTo) {
    // Validate assigned user is a member of the organization
    const isMember = await checkOrgMembership(supabase, conversation.brand_id, assignedTo);
    if (!isMember) {
      return validationError('Assigned user is not a member of this organization');
    }
    commentData.assigned_to = assignedTo;
  }

  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    commentData.attachments = attachments;
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

  // Add user info to comment (using pre-fetched profile)
  const commentWithUser = {
    ...comment,
    user: currentUserProfile || { id: user.id, email: user.email || 'Unknown' }
  };

  // Collect all notifications to batch insert
  const notifications: Array<{
    user_id: string;
    type: string;
    title: string;
    message: string;
    link: string;
    metadata: Record<string, unknown>;
  }> = [];

  const commenterName = currentUserProfile?.full_name || user.email || 'Someone';
  const conversationLink = `/brands/${conversation.brand_id}/chat?conversation=${conversationId}`;

  // Notification for conversation owner (if not the commenter)
  if (conversation.user_id !== user.id) {
    notifications.push({
      user_id: conversation.user_id,
      type: 'comment_added',
      title: 'New Comment',
      message: `${commenterName} commented on your conversation`,
      link: conversationLink,
      metadata: {
        conversation_id: conversationId,
        comment_id: comment.id,
        commenter_id: user.id,
      },
    });
  }

  // Notification for assigned user (if different from commenter and owner)
  if (assignedTo && assignedTo !== user.id && assignedTo !== conversation.user_id) {
    notifications.push({
      user_id: assignedTo,
      type: 'comment_assigned',
      title: 'Comment Assigned to You',
      message: `${commenterName} assigned you a comment`,
      link: conversationLink,
      metadata: {
        conversation_id: conversationId,
        comment_id: comment.id,
        assigner_id: user.id,
      },
    });
  }

  // Parse @mentions from content and collect notifications
  if (content) {
    const mentionRegex = /@(\w+(?:\s\w+)?)/g;
    const mentions = content.match(mentionRegex);

    if (mentions && mentions.length > 0) {
      // Get organization members with profiles in a single query via brand join
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          profile:profiles(email, full_name),
          organization:organizations!inner(
            brands!inner(id)
          )
        `)
        .eq('organization.brands.id', conversation.brand_id);

      if (orgMembers && orgMembers.length > 0) {
        const notifiedUserIds = new Set<string>(
          notifications.map(n => n.user_id)
        );

        // Build lookup maps for O(1) matching
        const membersByFullName = new Map<string, any>();
        const membersByEmailPrefix = new Map<string, any>();

        for (const member of orgMembers) {
          const m = member as any;
          if (m.profile?.full_name) {
            // Split full name into parts for partial matching
            const nameParts = m.profile.full_name.toLowerCase().split(/\s+/);
            for (const part of nameParts) {
              if (!membersByFullName.has(part)) {
                membersByFullName.set(part, m);
              }
            }
            membersByFullName.set(m.profile.full_name.toLowerCase(), m);
          }
          if (m.profile?.email) {
            const emailPrefix = m.profile.email.split('@')[0].toLowerCase();
            membersByEmailPrefix.set(emailPrefix, m);
          }
        }

        for (const mention of mentions) {
          const mentionName = mention.substring(1).toLowerCase();

          // O(1) lookup instead of O(n) find
          const matchedMember = membersByFullName.get(mentionName) ||
                               membersByEmailPrefix.get(mentionName);

          if (matchedMember &&
              matchedMember.user_id !== user.id &&
              !notifiedUserIds.has(matchedMember.user_id)
          ) {
            notifiedUserIds.add(matchedMember.user_id);

            notifications.push({
              user_id: matchedMember.user_id,
              type: 'comment_mention',
              title: 'You were mentioned',
              message: `${commenterName} mentioned you in a comment`,
              link: conversationLink,
              metadata: {
                conversation_id: conversationId,
                comment_id: comment.id,
                mentioner_id: user.id,
              },
            });
          }
        }
      }
    }
  }

  // Batch insert all notifications at once
  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
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
    // Also fetch assigned users
    const assignedIds = [...new Set(comments.filter(c => c.assigned_to).map(c => c.assigned_to))];
    const allUserIds = [...new Set([...userIds, ...assignedIds])];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, full_name')
      .in('user_id', allUserIds);

    // Map profiles to comments
    const commentsWithUsers = comments.map(comment => {
      const userProfile = profiles?.find(p => p.user_id === comment.user_id);
      const assigneeProfile = comment.assigned_to ? profiles?.find(p => p.user_id === comment.assigned_to) : null;

      return {
        ...comment,
        user: userProfile 
          ? { ...userProfile, id: userProfile.user_id } 
          : { id: comment.user_id, email: 'Unknown' },
        assignee: comment.assigned_to 
          ? (assigneeProfile 
              ? { ...assigneeProfile, id: assigneeProfile.user_id } 
              : { id: comment.assigned_to, email: 'Unknown' }) 
          : null
      };
    });

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




