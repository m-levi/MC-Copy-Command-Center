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
import { logger } from '@/lib/logger';
import {
  sendCommentAddedEmail,
  sendCommentAssignedEmail,
  sendCommentMentionEmail,
  shouldSendEmail,
} from '@/lib/email-service';

export const runtime = 'nodejs';

// Get service client for bypassing RLS on membership checks
function getServiceClient() {
  try {
    return createServiceClient();
  } catch (e) {
    logger.warn('[Comments API] Service client not available');
    return null;
  }
}

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
    logger.log('[Comments API] Validating assignedTo:', assignedTo, 'for brand:', conversation.brand_id);
    
    // Only validate if we have a service client (can bypass RLS)
    // Otherwise, trust the frontend selection from the team members list
    const serviceClient = getServiceClient();
    if (serviceClient) {
      const isMember = await checkOrgMembership(serviceClient, conversation.brand_id, assignedTo);
      logger.log('[Comments API] isMember result:', isMember);
      if (!isMember) {
        logger.log('[Comments API] Assigned user is not a member, rejecting');
        return validationError('Assigned user is not a member of this organization');
      }
    } else {
      logger.log('[Comments API] No service client available, skipping membership validation');
    }
    commentData.assigned_to = assignedTo;
  }

  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    commentData.attachments = attachments;
  }

  logger.log('[Comments API] Inserting comment data:', JSON.stringify(commentData, null, 2));

  let comment;
  let commentError;

  // Try to insert with all fields
  const result = await supabase
    .from('conversation_comments')
    .insert(commentData)
    .select('*')
    .single();
  
  comment = result.data;
  commentError = result.error;

  // If the error is about the assigned_to column not existing, retry without it
  if (commentError && (
    commentError.message?.includes('assigned_to') || 
    commentError.code === '42703' || // undefined_column
    commentError.details?.includes('assigned_to')
  )) {
    logger.warn('[Comments API] assigned_to column may not exist, retrying without it');
    const { assigned_to, ...commentDataWithoutAssignment } = commentData;
    
    const retryResult = await supabase
      .from('conversation_comments')
      .insert(commentDataWithoutAssignment)
      .select('*')
      .single();
    
    comment = retryResult.data;
    commentError = retryResult.error;
    
    if (!commentError) {
      logger.log('[Comments API] Comment created without assignment - run ADD_COMMENT_ASSIGNMENTS.sql migration to enable assignments');
    }
  }

  if (commentError) {
    logger.error('[Comments API] Error creating comment:', commentError);
    logger.error('[Comments API] Error code:', commentError.code);
    logger.error('[Comments API] Error details:', commentError.details);
    logger.error('[Comments API] Error hint:', commentError.hint);
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

  // Get conversation title for emails
  const { data: conversationData } = await supabase
    .from('conversations')
    .select('title')
    .eq('id', conversationId)
    .single();
  
  // Get brand name for emails
  const { data: brandData } = await supabase
    .from('brands')
    .select('name')
    .eq('id', conversation.brand_id)
    .single();

  const conversationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/brands/${conversation.brand_id}/chat?conversation=${conversationId}`;
  const commenterName = profile?.full_name || user.email || 'Someone';

  // Create notification for conversation owner (if not the commenter)
  if (conversation.user_id !== user.id) {
    logger.log('[Comments API] Creating notification for conversation owner:', conversation.user_id);
    
    await supabase.from('notifications').insert({
      user_id: conversation.user_id,
      type: 'comment_added',
      title: 'New Comment',
      message: `${commenterName} commented on your conversation`,
      link: `/brands/${conversation.brand_id}/chat?conversation=${conversationId}`,
      metadata: {
        conversation_id: conversationId,
        comment_id: comment.id,
        commenter_id: user.id,
      },
    });

    // Send email notification to conversation owner
    logger.log('[Comments API] Attempting to send email notification...');
    const serviceClient = getServiceClient();
    
    if (!serviceClient) {
      logger.warn('[Comments API] No service client available for email sending');
    } else {
      logger.log('[Comments API] Service client available, checking email preferences...');
      const shouldEmail = await shouldSendEmail(serviceClient, conversation.user_id, 'comment_added');
      logger.log('[Comments API] Should send email:', shouldEmail);
      
      if (shouldEmail) {
        // Get owner's email
        const { data: ownerProfile, error: profileError } = await serviceClient
          .from('profiles')
          .select('email')
          .eq('user_id', conversation.user_id)
          .single();
        
        logger.log('[Comments API] Owner profile lookup:', { email: ownerProfile?.email, error: profileError?.message });
        
        if (ownerProfile?.email) {
          logger.log('[Comments API] Sending comment notification email to:', ownerProfile.email);
          sendCommentAddedEmail({
            to: ownerProfile.email,
            commenterName,
            commentContent: content,
            conversationTitle: conversationData?.title,
            brandName: brandData?.name,
            conversationLink,
            quotedText,
          }).then(result => {
            logger.log('[Comments API] Email send result:', result);
          }).catch(err => {
            logger.error('[Comments API] Failed to send comment email:', err);
          });
        } else {
          logger.warn('[Comments API] No email found for owner');
        }
      }
    }
  } else {
    logger.log('[Comments API] Commenter is the owner, skipping owner notification');
  }

  // Create notification for assigned user (if different from commenter)
  if (assignedTo && assignedTo !== user.id) {
    await supabase.from('notifications').insert({
      user_id: assignedTo,
      type: 'comment_assigned',
      title: 'Comment Assigned to You',
      message: `${commenterName} assigned you a comment`,
      link: `/brands/${conversation.brand_id}/chat?conversation=${conversationId}`,
      metadata: {
        conversation_id: conversationId,
        comment_id: comment.id,
        assigner_id: user.id,
      },
    });

    // Send email notification to assigned user
    const serviceClient = getServiceClient();
    if (serviceClient) {
      const shouldEmail = await shouldSendEmail(serviceClient, assignedTo, 'comment_assigned');
      if (shouldEmail) {
        // Get assignee's email
        const { data: assigneeProfile } = await serviceClient
          .from('profiles')
          .select('email')
          .eq('user_id', assignedTo)
          .single();
        
        if (assigneeProfile?.email) {
          sendCommentAssignedEmail({
            to: assigneeProfile.email,
            assignerName: commenterName,
            commentContent: content,
            conversationTitle: conversationData?.title,
            brandName: brandData?.name,
            conversationLink,
            quotedText,
          }).catch(err => logger.error('[Comments API] Failed to send assignment email:', err));
        }
      }
    }
  }

  // Parse @mentions from content and create notifications
  if (content) {
    const mentionRegex = /@(\w+(?:\s\w+)?)/g;
    const mentions = content.match(mentionRegex);
    
    if (mentions && mentions.length > 0) {
      // Get organization members to match mentions
      const { data: brand } = await supabase
        .from('brands')
        .select('organization_id')
        .eq('id', conversation.brand_id)
        .single();

      if (brand) {
        const { data: orgMembers } = await supabase
          .from('organization_members')
          .select('user_id, profile:profiles(email, full_name)')
          .eq('organization_id', brand.organization_id);

        if (orgMembers) {
          const notifiedUserIds = new Set<string>();
          
          for (const mention of mentions) {
            const mentionName = mention.substring(1).toLowerCase(); // Remove @ and lowercase
            
            // Find matching member
            const matchedMember = orgMembers.find((m: any) => {
              const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
              const fullName = profile?.full_name?.toLowerCase() || '';
              const emailPrefix = profile?.email?.split('@')[0].toLowerCase() || '';
              return fullName.includes(mentionName) || emailPrefix === mentionName;
            });

            if (matchedMember && 
                matchedMember.user_id !== user.id && 
                !notifiedUserIds.has(matchedMember.user_id) &&
                matchedMember.user_id !== conversation.user_id && // Don't double-notify owner
                matchedMember.user_id !== assignedTo // Don't double-notify assignee
            ) {
              notifiedUserIds.add(matchedMember.user_id);
              
              await supabase.from('notifications').insert({
                user_id: matchedMember.user_id,
                type: 'comment_mention',
                title: 'You were mentioned',
                message: `${commenterName} mentioned you in a comment`,
                link: `/brands/${conversation.brand_id}/chat?conversation=${conversationId}`,
                metadata: {
                  conversation_id: conversationId,
                  comment_id: comment.id,
                  mentioner_id: user.id,
                },
              });

              // Send email notification for mention
              const serviceClient = getServiceClient();
              const memberProfile = Array.isArray(matchedMember.profile) ? matchedMember.profile[0] : matchedMember.profile;
              const memberEmail = memberProfile?.email;
              if (serviceClient && memberEmail) {
                const shouldEmail = await shouldSendEmail(serviceClient, matchedMember.user_id, 'comment_mention');
                if (shouldEmail) {
                  sendCommentMentionEmail({
                    to: memberEmail,
                    mentionerName: commenterName,
                    commentContent: content,
                    conversationTitle: conversationData?.title,
                    brandName: brandData?.name,
                    conversationLink,
                  }).catch(err => logger.error('[Comments API] Failed to send mention email:', err));
                }
              }
            }
          }
        }
      }
    }
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
    logger.error('[Comments API] Error fetching comments:', error);
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
// Uses service client to bypass RLS for accurate membership checks
async function checkOrgMembership(
  supabase: any,
  brandId: string,
  userId: string
): Promise<boolean> {
  // Try to use service client for bypassing RLS
  const client = getServiceClient() || supabase;
  
  const { data, error: brandError } = await client
    .from('brands')
    .select('organization_id')
    .eq('id', brandId)
    .maybeSingle();

  if (brandError) {
    logger.error('[Comments API] Brand query error:', brandError);
    return false;
  }

  if (!data) {
    logger.log('[Comments API] No brand found for id:', brandId);
    return false;
  }

  // Use service client to check membership (bypasses RLS)
  const { data: membership, error: membershipError } = await client
    .from('organization_members')
    .select('id')
    .eq('organization_id', data.organization_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError) {
    logger.error('[Comments API] Membership query error:', membershipError);
    return false;
  }

  logger.log('[Comments API] Checking membership for user:', userId, 'in org:', data.organization_id, 'Result:', !!membership);

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




