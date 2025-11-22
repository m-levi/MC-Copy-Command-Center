import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// PUT - Update a memory
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; memoryId: string }> }
) {
  try {
    const supabase = await createClient();
    const { brandId, memoryId } = await params;
    const body = await request.json();
    const { title, content, category } = body;

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

    // Update memory
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;

    const { data: memory, error } = await supabase
      .from('brand_memories')
      .update(updateData)
      .eq('id', memoryId)
      .eq('brand_id', brandId)
      .select()
      .single();

    if (error) throw error;

    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

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

    // Delete memory
    const { error } = await supabase
      .from('brand_memories')
      .delete()
      .eq('id', memoryId)
      .eq('brand_id', brandId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting brand memory:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}

