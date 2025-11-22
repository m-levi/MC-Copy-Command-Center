import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  authenticationError,
  authorizationError,
  notFoundError,
  withErrorHandling,
} from '@/lib/api-error';

export const runtime = 'nodejs';

// DELETE: Revoke a share
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ id: string; shareId: string }> }
) => {
  const { id: conversationId, shareId } = await context!.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Verify user owns the conversation
  const { data: share } = await supabase
    .from('conversation_shares')
    .select('*, conversation:conversation_id(user_id)')
    .eq('id', shareId)
    .single();

  if (!share) {
    return notFoundError('Share not found');
  }

  // Check ownership
  const conversation = share.conversation as any;
  if (conversation.user_id !== user.id && share.shared_by_user_id !== user.id) {
    return authorizationError('You do not have permission to revoke this share');
  }

  // Delete share
  const { error } = await supabase
    .from('conversation_shares')
    .delete()
    .eq('id', shareId);

  if (error) throw error;

  return NextResponse.json({ success: true });
});

// PUT: Update share permissions
export const PUT = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ id: string; shareId: string }> }
) => {
  const { id: conversationId, shareId } = await context!.params;
  const { permissionLevel, expiresInDays } = await req.json();

  if (!permissionLevel || !['view', 'comment', 'edit'].includes(permissionLevel)) {
    return NextResponse.json(
      { error: 'Invalid permissionLevel' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Verify user owns the conversation
  const { data: share } = await supabase
    .from('conversation_shares')
    .select('*, conversation:conversation_id(user_id)')
    .eq('id', shareId)
    .single();

  if (!share) {
    return notFoundError('Share not found');
  }

  const conversation = share.conversation as any;
  if (conversation.user_id !== user.id) {
    return authorizationError('You do not have permission to update this share');
  }

  // Calculate expiry
  let expiresAt: Date | null = null;
  if (expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  // Update share
  const updateData: any = {
    permission_level: permissionLevel,
  };

  if (expiresInDays !== undefined) {
    updateData.expires_at = expiresAt?.toISOString() || null;
  }

  const { data: updatedShare, error } = await supabase
    .from('conversation_shares')
    .update(updateData)
    .eq('id', shareId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({ share: updatedShare });
});




