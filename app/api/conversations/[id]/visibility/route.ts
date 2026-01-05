import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  withErrorHandling,
} from '@/lib/api-error';
import { ConversationVisibility } from '@/types';

export const runtime = 'nodejs';

// PATCH: Update conversation visibility
export const PATCH = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id: conversationId } = await context!.params;
  const body = await req.json();
  const { visibility } = body as { visibility?: ConversationVisibility };

  // Validate visibility value
  if (!visibility || !['private', 'team'].includes(visibility)) {
    return validationError('visibility must be either "private" or "team"');
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Get the conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id, visibility')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    return notFoundError('Conversation not found');
  }

  // Only the owner can change visibility
  if (conversation.user_id !== user.id) {
    return authorizationError('Only the conversation owner can change visibility');
  }

  // Update visibility
  const { data: updated, error: updateError } = await supabase
    .from('conversations')
    .update({ 
      visibility,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId)
    .select('id, visibility')
    .single();

  if (updateError) {
    console.error('[Visibility API] Update error:', updateError);
    return NextResponse.json(
      { error: 'Failed to update visibility', details: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ 
    success: true,
    conversation: updated 
  });
});

// POST: Toggle visibility (convenience endpoint)
export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id: conversationId } = await context!.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Get the conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id, visibility')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    return notFoundError('Conversation not found');
  }

  // Only the owner can toggle visibility
  if (conversation.user_id !== user.id) {
    return authorizationError('Only the conversation owner can change visibility');
  }

  // Toggle: private -> team, team -> private
  const newVisibility: ConversationVisibility = 
    conversation.visibility === 'team' ? 'private' : 'team';

  // Update visibility
  const { data: updated, error: updateError } = await supabase
    .from('conversations')
    .update({ 
      visibility: newVisibility,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId)
    .select('id, visibility')
    .single();

  if (updateError) {
    console.error('[Visibility API] Toggle error:', updateError);
    return NextResponse.json(
      { error: 'Failed to toggle visibility', details: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ 
    success: true,
    conversation: updated,
    message: newVisibility === 'team' 
      ? 'Conversation is now visible to your team' 
      : 'Conversation is now private'
  });
});

// GET: Get current visibility
export const GET = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id: conversationId } = await context!.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Get the conversation (RLS will handle access control)
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id, visibility')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    return notFoundError('Conversation not found');
  }

  return NextResponse.json({ 
    visibility: conversation.visibility || 'private',
    isOwner: conversation.user_id === user.id
  });
});

















