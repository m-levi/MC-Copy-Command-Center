import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { 
  deleteMemory, 
  addMemory, 
  isSupermemoryConfigured 
} from '@/lib/supermemory';

export const dynamic = 'force-dynamic';

// PUT - Update a memory (delete old + create new in Supermemory)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; memoryId: string }> }
) {
  try {
    const supabase = await createClient();
    const { brandId, memoryId } = await params;
    const body = await request.json();
    const { title, content, category, created_at: originalCreatedAt } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json(
        { error: 'Brand not found or access denied' },
        { status: 404 }
      );
    }

    // Check if Supermemory is configured
    if (!isSupermemoryConfigured()) {
      return NextResponse.json(
        { error: 'Memory service not configured' },
        { status: 503 }
      );
    }

    // Delete the old memory
    try {
      await deleteMemory(memoryId);
    } catch (error) {
      // Memory might not exist, continue with creating new one
      logger.warn('[Brand Memory API] Could not delete old memory:', memoryId);
    }

    // Create new memory with updated content
    const formattedContent = `${title}: ${content}`;
    const result = await addMemory(brandId, user.id, formattedContent, {
      title,
      category: category || 'general',
    });

    // Return the updated memory with the NEW ID from Supermemory
    // Important: Since we delete the old memory and create a new one,
    // we must return result.id so the client can reference the correct memory
    const memory = {
      id: result.id,
      brand_id: brandId,
      title,
      content,
      category: category || 'general',
      created_at: originalCreatedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({ memory });
  } catch (error) {
    logger.error('Error updating brand memory:', error);
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a memory
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; memoryId: string }> }
) {
  try {
    const supabase = await createClient();
    const { brandId, memoryId } = await params;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json(
        { error: 'Brand not found or access denied' },
        { status: 404 }
      );
    }

    // Check if Supermemory is configured
    if (!isSupermemoryConfigured()) {
      return NextResponse.json(
        { error: 'Memory service not configured' },
        { status: 503 }
      );
    }

    // Delete memory from Supermemory
    await deleteMemory(memoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting brand memory:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}
