import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { CreateFolderInput, DocumentFolder, FolderColor } from '@/types';

// GET /api/brands/[brandId]/folders - List all folders
export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query params
    const url = new URL(request.url);
    const includeSmart = url.searchParams.get('includeSmart') !== 'false';
    
    // Fetch folders
    const { data: folders, error } = await supabase
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
      .eq('brand_id', brandId)
      .order('is_smart', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    
    if (error) {
      logger.error('Error fetching folders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch folders' },
        { status: 500 }
      );
    }
    
    // Filter out smart folders if requested
    const filteredFolders = includeSmart 
      ? folders 
      : folders?.filter(f => !f.is_smart);
    
    return NextResponse.json({ folders: filteredFolders || [] });
  } catch (error) {
    logger.error('Error in GET /folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

// POST /api/brands/[brandId]/folders - Create a new folder
export async function POST(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, organization_id')
      .eq('id', brandId)
      .single();
    
    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    
    const body: CreateFolderInput = await request.json();
    
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }
    
    // Get the next sort order
    const { data: maxOrder } = await supabase
      .from('document_folders')
      .select('sort_order')
      .eq('brand_id', brandId)
      .eq('is_smart', body.is_smart || false)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    
    const nextSortOrder = (maxOrder?.sort_order || 0) + 1;
    
    // Create the folder
    const { data: folder, error: createError } = await supabase
      .from('document_folders')
      .insert({
        brand_id: brandId,
        created_by: user.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        color: body.color || 'blue',
        icon: body.icon || '📁',
        is_smart: body.is_smart || false,
        smart_criteria: body.smart_criteria || null,
        parent_folder_id: body.parent_folder_id || null,
        sort_order: nextSortOrder,
        document_count: 0,
      })
      .select()
      .single();
    
    if (createError) {
      logger.error('Error creating folder:', createError);
      return NextResponse.json(
        { error: 'Failed to create folder' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /folders:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}























