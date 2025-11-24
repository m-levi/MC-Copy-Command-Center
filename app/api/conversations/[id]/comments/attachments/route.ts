import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validationError,
  authenticationError,
  authorizationError,
  withErrorHandling,
} from '@/lib/api-error';

export const runtime = 'nodejs';

// POST: Upload attachment for a comment
export const POST = withErrorHandling(async (
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

  // Verify user has access to conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, user_id, brand_id')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    return validationError('Conversation not found');
  }

  // Check if user has comment permission
  const hasAccess = conversation.user_id === user.id || 
    await checkOrgMembership(supabase, conversation.brand_id, user.id);

  if (!hasAccess) {
    return authorizationError('You do not have permission to upload attachments');
  }

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return validationError('No file provided');
  }

  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    return validationError('File size exceeds 5MB limit');
  }

  // Validate file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.type)) {
    return validationError('File type not allowed. Allowed: images, PDF, Word documents');
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${conversationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('comment-attachments')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[Attachment Upload] Error:', uploadError);
    throw new Error('Failed to upload file');
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('comment-attachments')
    .getPublicUrl(fileName);

  // Return attachment metadata
  const attachment = {
    url: publicUrl,
    name: file.name,
    type: file.type,
    size: file.size,
    path: fileName,
  };

  return NextResponse.json({ attachment }, { status: 201 });
});

// DELETE: Remove an attachment
export const DELETE = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { id: conversationId } = await context.params;
  
  const { path } = await req.json();

  if (!path) {
    return validationError('File path is required');
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Verify user owns the file (path starts with their user ID)
  if (!path.startsWith(`${user.id}/`)) {
    return authorizationError('You can only delete your own attachments');
  }

  // Delete from storage
  const { error: deleteError } = await supabase.storage
    .from('comment-attachments')
    .remove([path]);

  if (deleteError) {
    console.error('[Attachment Delete] Error:', deleteError);
    throw new Error('Failed to delete file');
  }

  return NextResponse.json({ success: true });
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



