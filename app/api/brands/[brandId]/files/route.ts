import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validationError,
  authenticationError,
  authorizationError,
  withErrorHandling,
} from '@/lib/api-error';
import { BrandFile, BrandFileCategory } from '@/types';
import { generateEmbedding } from '@/lib/rag-service';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'text/csv',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Helper to check org membership
async function checkOrgAccess(
  supabase: any,
  brandId: string,
  userId: string
): Promise<{ hasAccess: boolean; isAdmin: boolean }> {
  const { data: brand } = await supabase
    .from('brands')
    .select('organization_id')
    .eq('id', brandId)
    .single();

  if (!brand) return { hasAccess: false, isAdmin: false };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', brand.organization_id)
    .eq('user_id', userId)
    .single();

  return {
    hasAccess: !!membership,
    isAdmin: membership?.role === 'admin',
  };
}

// GET: List all files for a brand
export const GET = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ brandId: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { brandId } = await context.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Verify org access
  const { hasAccess } = await checkOrgAccess(supabase, brandId, user.id);
  if (!hasAccess) {
    return authorizationError('You do not have access to this brand');
  }

  // Parse query params
  const url = new URL(req.url);
  const category = url.searchParams.get('category') as BrandFileCategory | null;

  // Build query
  let query = supabase
    .from('brand_files')
    .select(`
      *,
      uploader:profiles!uploaded_by(user_id, email, full_name, avatar_url)
    `)
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data: files, error } = await query;

  if (error) {
    console.error('[Brand Files] List error:', error);
    throw new Error('Failed to list files');
  }

  // Generate signed URLs for each file
  const filesWithUrls = await Promise.all(
    (files || []).map(async (file: BrandFile) => {
      const { data: signedUrl } = await supabase.storage
        .from('brand-files')
        .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

      return {
        ...file,
        public_url: signedUrl?.signedUrl,
      };
    })
  );

  return NextResponse.json({ files: filesWithUrls });
});

// POST: Upload a new file
export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ brandId: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { brandId } = await context.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Verify org access
  const { hasAccess } = await checkOrgAccess(supabase, brandId, user.id);
  if (!hasAccess) {
    return authorizationError('You do not have access to this brand');
  }

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const category = (formData.get('category') as BrandFileCategory) || 'general';
  const description = formData.get('description') as string | null;
  const tags = formData.get('tags') as string | null;

  if (!file) {
    return validationError('No file provided');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return validationError(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return validationError(`File type "${file.type}" not allowed`);
  }

  // Generate unique storage path
  const fileExt = file.name.split('.').pop();
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const storagePath = `${user.id}/${brandId}/${timestamp}-${randomId}.${fileExt}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('brand-files')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[Brand Files] Upload error:', uploadError);
    throw new Error('Failed to upload file');
  }

  // Extract text for text-based files
  let extractedText: string | null = null;
  let embedding: number[] | null = null;

  if (['text/plain', 'text/markdown', 'text/csv'].includes(file.type)) {
    try {
      extractedText = await file.text();
      
      // Generate embedding if we have OpenAI key
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey && extractedText.length > 0) {
        embedding = await generateEmbedding(extractedText.slice(0, 8000), openaiKey);
      }
    } catch (e) {
      console.warn('[Brand Files] Text extraction failed:', e);
    }
  }

  // Create database record
  const { data: brandFile, error: dbError } = await supabase
    .from('brand_files')
    .insert({
      brand_id: brandId,
      uploaded_by: user.id,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      category,
      description: description || null,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      extracted_text: extractedText,
      embedding,
      is_indexed: !!embedding,
    })
    .select(`
      *,
      uploader:profiles!uploaded_by(user_id, email, full_name, avatar_url)
    `)
    .single();

  if (dbError) {
    console.error('[Brand Files] DB insert error:', dbError);
    // Clean up uploaded file
    await supabase.storage.from('brand-files').remove([storagePath]);
    throw new Error('Failed to save file record');
  }

  // Get signed URL
  const { data: signedUrl } = await supabase.storage
    .from('brand-files')
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json({
    file: {
      ...brandFile,
      public_url: signedUrl?.signedUrl,
    },
  }, { status: 201 });
});

// DELETE: Remove a file
export const DELETE = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<{ brandId: string }> }
) => {
  if (!context) throw new Error('Missing params');
  const { brandId } = await context.params;

  const { fileId } = await req.json();

  if (!fileId) {
    return validationError('File ID is required');
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Get the file record
  const { data: file, error: fetchError } = await supabase
    .from('brand_files')
    .select('*')
    .eq('id', fileId)
    .eq('brand_id', brandId)
    .single();

  if (fetchError || !file) {
    return validationError('File not found');
  }

  // Check permissions (owner or org admin)
  const { hasAccess, isAdmin } = await checkOrgAccess(supabase, brandId, user.id);
  if (!hasAccess) {
    return authorizationError('You do not have access to this brand');
  }

  if (file.uploaded_by !== user.id && !isAdmin) {
    return authorizationError('You can only delete files you uploaded');
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('brand-files')
    .remove([file.storage_path]);

  if (storageError) {
    console.error('[Brand Files] Storage delete error:', storageError);
    // Continue with DB delete anyway
  }

  // Delete database record
  const { error: dbError } = await supabase
    .from('brand_files')
    .delete()
    .eq('id', fileId);

  if (dbError) {
    console.error('[Brand Files] DB delete error:', dbError);
    throw new Error('Failed to delete file record');
  }

  return NextResponse.json({ success: true });
});


