import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  getDocumentById, 
  updateDocument, 
  deleteDocument,
  getFileDocumentUrl
} from '@/lib/document-service';
import { DocumentCategory, DocumentVisibility } from '@/types';
import { logger } from '@/lib/logger';

// GET /api/brands/[brandId]/documents-v2/[docId] - Get a single document
export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string; docId: string }> }
) {
  try {
    const { brandId, docId } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const document = await getDocumentById(docId, user.id);
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    // Verify document belongs to the brand
    if (document.brand_id !== brandId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    // If it's a file document, include a signed URL
    if (document.doc_type === 'file' && document.storage_path) {
      document.public_url = await getFileDocumentUrl(document.storage_path) || undefined;
    }
    
    return NextResponse.json({ document });
  } catch (error) {
    logger.error('Error in GET /documents-v2/[docId]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

// PATCH /api/brands/[brandId]/documents-v2/[docId] - Update a document
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ brandId: string; docId: string }> }
) {
  try {
    const { brandId, docId } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify document exists and user has access
    const existing = await getDocumentById(docId, user.id);
    if (!existing || existing.brand_id !== brandId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    const body = await request.json();
    
    const updates: Parameters<typeof updateDocument>[2] = {};
    
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.content !== undefined) updates.content = body.content;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.category !== undefined) updates.category = body.category as DocumentCategory;
    if (body.visibility !== undefined) updates.visibility = body.visibility as DocumentVisibility;
    if (body.shared_with !== undefined) updates.shared_with = body.shared_with;
    if (body.is_pinned !== undefined) updates.is_pinned = body.is_pinned;
    if (body.folder_id !== undefined) updates.folder_id = body.folder_id;
    
    const document = await updateDocument(docId, user.id, updates);
    
    return NextResponse.json({ document });
  } catch (error) {
    logger.error('Error in PATCH /documents-v2/[docId]:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

// DELETE /api/brands/[brandId]/documents-v2/[docId] - Delete a document
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ brandId: string; docId: string }> }
) {
  try {
    const { brandId, docId } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify document exists and user has access
    const existing = await getDocumentById(docId, user.id);
    if (!existing || existing.brand_id !== brandId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    await deleteDocument(docId, user.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /documents-v2/[docId]:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

