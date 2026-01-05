import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  getDocumentById,
  updateDocumentSharing,
  getDocumentSharedUsers
} from '@/lib/document-service';
import { DocumentVisibility } from '@/types';
import { logger } from '@/lib/logger';

// GET /api/brands/[brandId]/documents-v2/[docId]/share - Get sharing info
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
    
    // Get document
    const document = await getDocumentById(docId, user.id);
    if (!document || document.brand_id !== brandId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    // Get shared users
    const sharedUsers = await getDocumentSharedUsers(docId);
    
    return NextResponse.json({
      visibility: document.visibility,
      shared_with: document.shared_with,
      shared_users: sharedUsers,
      created_by: document.created_by,
      is_owner: document.created_by === user.id,
    });
  } catch (error) {
    logger.error('Error in GET /documents-v2/[docId]/share:', error);
    return NextResponse.json(
      { error: 'Failed to get sharing info' },
      { status: 500 }
    );
  }
}

// PUT /api/brands/[brandId]/documents-v2/[docId]/share - Update sharing settings
export async function PUT(
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
    
    // Get document
    const document = await getDocumentById(docId, user.id);
    if (!document || document.brand_id !== brandId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    // Only the creator can change sharing settings
    if (document.created_by !== user.id) {
      // Check if user is org admin
      const { data: brand } = await supabase
        .from('brands')
        .select('organization_id')
        .eq('id', brandId)
        .single();
      
      if (brand) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', brand.organization_id)
          .eq('user_id', user.id)
          .single();
        
        if (!membership || membership.role !== 'admin') {
          return NextResponse.json(
            { error: 'Only the document owner or org admin can change sharing settings' },
            { status: 403 }
          );
        }
      }
    }
    
    const body = await request.json();
    
    if (!body.visibility || !['private', 'shared', 'org'].includes(body.visibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility. Must be private, shared, or org.' },
        { status: 400 }
      );
    }
    
    const visibility = body.visibility as DocumentVisibility;
    const sharedWith = body.shared_with || [];
    
    // Validate shared_with contains valid user IDs if visibility is 'shared'
    if (visibility === 'shared' && sharedWith.length > 0) {
      const { data: validUsers } = await supabase
        .from('profiles')
        .select('user_id')
        .in('user_id', sharedWith);
      
      if (!validUsers || validUsers.length !== sharedWith.length) {
        return NextResponse.json(
          { error: 'Some user IDs are invalid' },
          { status: 400 }
        );
      }
    }
    
    const updatedDocument = await updateDocumentSharing(docId, user.id, visibility, sharedWith);
    const sharedUsers = await getDocumentSharedUsers(docId);
    
    return NextResponse.json({
      document: updatedDocument,
      shared_users: sharedUsers,
    });
  } catch (error) {
    logger.error('Error in PUT /documents-v2/[docId]/share:', error);
    return NextResponse.json(
      { error: 'Failed to update sharing settings' },
      { status: 500 }
    );
  }
}























