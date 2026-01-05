import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { UpdateFolderInput } from '@/types';

// GET /api/brands/[brandId]/folders/[folderId] - Get a single folder
export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string; folderId: string }> }
) {
  try {
    const { brandId, folderId } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch the folder
    const { data: folder, error } = await supabase
      .from('document_folders')
      .select(`
        id,
        brand_id,
        created_by,
        name,
        description,
        color,
        icon,
        is_smart,
        smart_criteria,
        sort_order,
        parent_folder_id,
        document_count,
        created_at,
        updated_at
      `)
      .eq('id', folderId)
      .eq('brand_id', brandId)
      .single();
    
    if (error || !folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    
    return NextResponse.json({ folder });
  } catch (error) {
    logger.error('Error in GET /folders/[folderId]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folder' },
      { status: 500 }
    );
  }
}

// PATCH /api/brands/[brandId]/folders/[folderId] - Update a folder
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ brandId: string; folderId: string }> }
) {
  try {
    const { brandId, folderId } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if folder exists and user can edit it
    const { data: existingFolder, error: fetchError } = await supabase
      .from('document_folders')
      .select('id, created_by')
      .eq('id', folderId)
      .eq('brand_id', brandId)
      .single();
    
    if (fetchError || !existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    
    const body: UpdateFolderInput = await request.json();
    
    // Build update object
    const updates: Record<string, unknown> = {};
    
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.color !== undefined) updates.color = body.color;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.smart_criteria !== undefined) updates.smart_criteria = body.smart_criteria;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    if (body.parent_folder_id !== undefined) updates.parent_folder_id = body.parent_folder_id;
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }
    
    // Update the folder
    const { data: folder, error: updateError } = await supabase
      .from('document_folders')
      .update(updates)
      .eq('id', folderId)
      .select()
      .single();
    
    if (updateError) {
      logger.error('Error updating folder:', updateError);
      return NextResponse.json(
        { error: 'Failed to update folder' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ folder });
  } catch (error) {
    logger.error('Error in PATCH /folders/[folderId]:', error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

// DELETE /api/brands/[brandId]/folders/[folderId] - Delete a folder
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ brandId: string; folderId: string }> }
) {
  try {
    const { brandId, folderId } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if folder exists
    const { data: existingFolder, error: fetchError } = await supabase
      .from('document_folders')
      .select('id, created_by')
      .eq('id', folderId)
      .eq('brand_id', brandId)
      .single();
    
    if (fetchError || !existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    
    // First, remove folder_id from all documents in this folder
    await supabase
      .from('brand_documents_v2')
      .update({ folder_id: null })
      .eq('folder_id', folderId);
    
    // Delete the folder
    const { error: deleteError } = await supabase
      .from('document_folders')
      .delete()
      .eq('id', folderId);
    
    if (deleteError) {
      logger.error('Error deleting folder:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete folder' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /folders/[folderId]:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}























