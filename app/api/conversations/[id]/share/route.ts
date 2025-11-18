import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  withErrorHandling,
} from '@/lib/api-error';

export const runtime = 'nodejs';

// Generate unique share token
function generateShareToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = Buffer.from(bytes).toString('base64');
  return token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').substring(0, 32);
}

// POST: Create a share
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: conversationId } = await params;
  const body = await req.json();
  const { shareType, permissionLevel, shareContent, sharedWithUserId, expiresInDays } = body;

  if (!shareType || !permissionLevel) {
    return validationError('shareType and permissionLevel are required');
  }

  if (!['user', 'organization', 'link'].includes(shareType)) {
    return validationError('Invalid shareType');
  }

  if (!['view', 'comment', 'edit'].includes(permissionLevel)) {
    return validationError('Invalid permissionLevel');
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Verify user has access to conversation (owner or org member)
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id, brand_id')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    return notFoundError('Conversation not found');
  }

  // Check if user owns conversation or is org member
  const isOwner = conversation.user_id === user.id;
  const isOrgMember = await checkOrgMembership(supabase, conversation.brand_id, user.id);

  if (!isOwner && !isOrgMember) {
    return authorizationError('You do not have permission to share this conversation');
  }

  // Calculate expiry
  let expiresAt: Date | null = null;
  if (expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  // Generate token for link shares
  let shareToken: string | null = null;
  if (shareType === 'link') {
    shareToken = generateShareToken();
  }

  // Create share
  const shareData: any = {
    conversation_id: conversationId,
    shared_by_user_id: user.id,
    share_type: shareType,
    permission_level: permissionLevel,
    expires_at: expiresAt?.toISOString() || null,
  };
  
  // Only add share_content if provided (requires migration to be run)
  if (shareContent) {
    shareData.share_content = shareContent;
  }

  if (shareType === 'user') {
    if (!sharedWithUserId) {
      return validationError('sharedWithUserId is required for user shares');
    }
    shareData.shared_with_user_id = sharedWithUserId;
  } else if (shareType === 'link') {
    shareData.share_token = shareToken;
  }

  // Log what we're trying to insert
  console.log('[Share API] Creating share:', {
    conversation_id: conversationId,
    share_type: shareType,
    permission_level: permissionLevel,
    has_user_id: !!sharedWithUserId
  });

  const { data: share, error: shareError } = await supabase
    .from('conversation_shares')
    .insert(shareData)
    .select()
    .single();

  if (shareError) {
    console.error('[Share API] Database error:', {
      code: shareError.code,
      message: shareError.message,
      details: shareError.details,
      hint: shareError.hint
    });

    if (shareError.code === '23505') {
      // Unique constraint violation - share already exists
      return validationError('This conversation is already shared with this user');
    }
    
    if (shareError.code === '42P01') {
      // Table doesn't exist
      return NextResponse.json(
        { 
          error: 'Database not configured', 
          message: 'The conversation_shares table does not exist. Please run database migration 019_conversation_sharing.sql',
          details: shareError.message
        },
        { status: 500 }
      );
    }
    
    // Other database errors
    return NextResponse.json(
      { 
        error: 'Database error', 
        message: shareError.message,
        code: shareError.code,
        hint: shareError.hint
      },
      { status: 500 }
    );
  }

  console.log('[Share API] Share created successfully:', share.id);

  // Create notification for recipient (if user share)
  if (shareType === 'user' && sharedWithUserId) {
    await supabase.from('notifications').insert({
      user_id: sharedWithUserId,
      type: 'conversation_shared',
      title: 'Conversation Shared',
      message: `${user.email || 'Someone'} shared a conversation with you`,
      link: `/brands/${conversationId}/chat`,
      metadata: {
        conversation_id: conversationId,
        shared_by: user.id,
        permission_level: permissionLevel,
      },
    });
  }

  return NextResponse.json({ share }, { status: 201 });
});

// GET: List all shares for a conversation
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: conversationId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Verify user owns the conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, user_id')
    .eq('id', conversationId)
    .single();

  if (!conversation || conversation.user_id !== user.id) {
    return authorizationError('You do not have permission to view shares');
  }

  // Get all shares (without trying to fetch auth.users data)
  const { data: shares, error } = await supabase
    .from('conversation_shares')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Fetch profiles for shared_with_user_id and shared_by_user_id
  if (shares && shares.length > 0) {
    const userIds = [
      ...shares.map(s => s.shared_with_user_id).filter(Boolean),
      ...shares.map(s => s.shared_by_user_id).filter(Boolean)
    ];
    
    const uniqueUserIds = [...new Set(userIds)];
    
    if (uniqueUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', uniqueUserIds);

      // Enhance shares with profile data
      const sharesWithProfiles = shares.map(share => ({
        ...share,
        shared_with_user: share.shared_with_user_id 
          ? profiles?.find(p => p.user_id === share.shared_with_user_id) 
          : null,
        shared_by_user: profiles?.find(p => p.user_id === share.shared_by_user_id) || null
      }));

      return NextResponse.json({ shares: sharesWithProfiles });
    }
  }

  return NextResponse.json({ shares: shares || [] });
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

