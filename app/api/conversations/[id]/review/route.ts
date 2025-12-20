import { NextResponse, NextRequest } from 'next/server';
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
  sendReviewRequestEmail,
  sendReviewCompletedEmail,
  shouldSendEmail,
} from '@/lib/email-service';

export const runtime = 'nodejs';

// Helper function to get service client for bypassing RLS
function getServiceClient() {
  try {
    return createServiceClient();
  } catch (e) {
    logger.warn('[Review API] Service client not available');
    return null;
  }
}

// Helper function to check organization membership
async function checkOrgMembership(
  supabase: any,
  brandId: string,
  userId: string
): Promise<boolean> {
  const client = getServiceClient() || supabase;
  
  const { data } = await client
    .from('brands')
    .select('organization_id')
    .eq('id', brandId)
    .maybeSingle();

  if (!data) return false;

  const { data: membership } = await client
    .from('organization_members')
    .select('id')
    .eq('organization_id', data.organization_id)
    .eq('user_id', userId)
    .maybeSingle();

  return !!membership;
}

// POST: Request a review on a conversation
export const POST = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { id: conversationId } = await context.params;
  const { reviewerIds, message } = await req.json();

  if (!reviewerIds || !Array.isArray(reviewerIds) || reviewerIds.length === 0) {
    return validationError('At least one reviewer must be specified');
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Get conversation details
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id, brand_id, title, review_status')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    return notFoundError('Conversation not found');
  }

  // Check permission (owner or org member)
  const hasAccess = conversation.user_id === user.id || 
    await checkOrgMembership(supabase, conversation.brand_id, user.id);

  if (!hasAccess) {
    return authorizationError('You do not have permission to request reviews for this conversation');
  }

  // Get requester's profile
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', user.id)
    .single();

  const requesterName = requesterProfile?.full_name || requesterProfile?.email || 'Someone';

  // Get brand name
  const { data: brand } = await supabase
    .from('brands')
    .select('name')
    .eq('id', conversation.brand_id)
    .single();

  // Update conversation status
  const { error: updateError } = await supabase
    .from('conversations')
    .update({
      review_status: 'pending_review',
      review_requested_at: new Date().toISOString(),
      review_requested_by: user.id,
      reviewed_at: null,
      reviewed_by: null,
      review_feedback: null,
    })
    .eq('id', conversationId);

  if (updateError) {
    logger.error('[Review API] Error updating conversation:', updateError);
    throw updateError;
  }

  const conversationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/brands/${conversation.brand_id}/chat?conversation=${conversationId}`;

  // Create notifications and send emails to reviewers
  const serviceClient = getServiceClient();
  
  for (const reviewerId of reviewerIds) {
    if (reviewerId === user.id) continue; // Don't notify yourself

    // Create in-app notification
    await supabase.from('notifications').insert({
      user_id: reviewerId,
      type: 'review_requested',
      title: 'Review Requested',
      message: `${requesterName} is requesting your review on "${conversation.title || 'an email'}"`,
      link: `/brands/${conversation.brand_id}/chat?conversation=${conversationId}`,
      metadata: {
        conversation_id: conversationId,
        requester_id: user.id,
        message,
      },
    });

    // Send email notification
    if (serviceClient) {
      const shouldEmail = await shouldSendEmail(serviceClient, reviewerId, 'review_requested');
      if (shouldEmail) {
        const { data: reviewerProfile } = await serviceClient
          .from('profiles')
          .select('email')
          .eq('user_id', reviewerId)
          .single();

        if (reviewerProfile?.email) {
          sendReviewRequestEmail({
            to: reviewerProfile.email,
            requesterName,
            conversationTitle: conversation.title || 'Untitled Email',
            brandName: brand?.name,
            conversationLink,
            message,
          }).catch(err => logger.error('[Review API] Failed to send review request email:', err));
        }
      }
    }
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Review requested successfully',
    review_status: 'pending_review',
  });
});

// PUT: Complete a review
export const PUT = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { id: conversationId } = await context.params;
  const { status, feedback } = await req.json();

  if (!status || !['approved', 'changes_requested'].includes(status)) {
    return validationError('Status must be "approved" or "changes_requested"');
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Get conversation details
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id, brand_id, title, review_status, review_requested_by')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    return notFoundError('Conversation not found');
  }

  // Check permission (org member)
  const hasAccess = await checkOrgMembership(supabase, conversation.brand_id, user.id);

  if (!hasAccess) {
    return authorizationError('You do not have permission to review this conversation');
  }

  // Get reviewer's profile
  const { data: reviewerProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', user.id)
    .single();

  const reviewerName = reviewerProfile?.full_name || reviewerProfile?.email || 'Someone';

  // Get brand name
  const { data: brand } = await supabase
    .from('brands')
    .select('name')
    .eq('id', conversation.brand_id)
    .single();

  // Update conversation status
  const { error: updateError } = await supabase
    .from('conversations')
    .update({
      review_status: status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      review_feedback: feedback || null,
    })
    .eq('id', conversationId);

  if (updateError) {
    logger.error('[Review API] Error updating conversation:', updateError);
    throw updateError;
  }

  const conversationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/brands/${conversation.brand_id}/chat?conversation=${conversationId}`;

  // Notify the person who requested the review
  if (conversation.review_requested_by && conversation.review_requested_by !== user.id) {
    const statusText = status === 'approved' ? 'approved' : 'requested changes on';
    
    await supabase.from('notifications').insert({
      user_id: conversation.review_requested_by,
      type: 'review_completed',
      title: status === 'approved' ? 'Email Approved' : 'Changes Requested',
      message: `${reviewerName} ${statusText} "${conversation.title || 'your email'}"`,
      link: `/brands/${conversation.brand_id}/chat?conversation=${conversationId}`,
      metadata: {
        conversation_id: conversationId,
        reviewer_id: user.id,
        status,
        feedback,
      },
    });

    // Send email notification
    const serviceClient = getServiceClient();
    if (serviceClient) {
      const shouldEmail = await shouldSendEmail(serviceClient, conversation.review_requested_by, 'review_completed');
      if (shouldEmail) {
        const { data: requesterProfile } = await serviceClient
          .from('profiles')
          .select('email')
          .eq('user_id', conversation.review_requested_by)
          .single();

        if (requesterProfile?.email) {
          sendReviewCompletedEmail({
            to: requesterProfile.email,
            reviewerName,
            conversationTitle: conversation.title || 'Untitled Email',
            brandName: brand?.name,
            conversationLink,
            status,
            feedback,
          }).catch(err => logger.error('[Review API] Failed to send review completed email:', err));
        }
      }
    }
  }

  // Also notify conversation owner if different from requester
  if (conversation.user_id !== user.id && conversation.user_id !== conversation.review_requested_by) {
    const statusText = status === 'approved' ? 'approved' : 'requested changes on';
    
    await supabase.from('notifications').insert({
      user_id: conversation.user_id,
      type: 'review_completed',
      title: status === 'approved' ? 'Email Approved' : 'Changes Requested',
      message: `${reviewerName} ${statusText} "${conversation.title || 'your email'}"`,
      link: `/brands/${conversation.brand_id}/chat?conversation=${conversationId}`,
      metadata: {
        conversation_id: conversationId,
        reviewer_id: user.id,
        status,
        feedback,
      },
    });
  }

  return NextResponse.json({ 
    success: true, 
    message: `Review ${status === 'approved' ? 'approved' : 'completed with changes requested'}`,
    review_status: status,
  });
});

// GET: Get review status
export const GET = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { id: conversationId } = await context.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(`
      review_status,
      review_requested_at,
      review_requested_by,
      reviewed_at,
      reviewed_by,
      review_feedback
    `)
    .eq('id', conversationId)
    .single();

  if (error || !conversation) {
    return notFoundError('Conversation not found');
  }

  // Get profile info for requester and reviewer
  let requesterProfile = null;
  let reviewerProfile = null;

  if (conversation.review_requested_by) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', conversation.review_requested_by)
      .single();
    requesterProfile = profile;
  }

  if (conversation.reviewed_by) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', conversation.reviewed_by)
      .single();
    reviewerProfile = profile;
  }

  return NextResponse.json({
    review_status: conversation.review_status,
    review_requested_at: conversation.review_requested_at,
    review_requested_by: conversation.review_requested_by,
    requester_name: requesterProfile?.full_name || requesterProfile?.email,
    reviewed_at: conversation.reviewed_at,
    reviewed_by: conversation.reviewed_by,
    reviewer_name: reviewerProfile?.full_name || reviewerProfile?.email,
    review_feedback: conversation.review_feedback,
  });
});

// DELETE: Cancel review request
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { id: conversationId } = await context.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Get conversation details
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id, brand_id, review_requested_by')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    return notFoundError('Conversation not found');
  }

  // Only the requester or conversation owner can cancel
  if (conversation.user_id !== user.id && conversation.review_requested_by !== user.id) {
    return authorizationError('You do not have permission to cancel this review request');
  }

  // Reset review status
  const { error: updateError } = await supabase
    .from('conversations')
    .update({
      review_status: null,
      review_requested_at: null,
      review_requested_by: null,
      reviewed_at: null,
      reviewed_by: null,
      review_feedback: null,
    })
    .eq('id', conversationId);

  if (updateError) {
    logger.error('[Review API] Error canceling review:', updateError);
    throw updateError;
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Review request cancelled',
  });
});























