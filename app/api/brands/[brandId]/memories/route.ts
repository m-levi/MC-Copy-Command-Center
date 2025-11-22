import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - Fetch all memories for a brand
export async function GET(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const supabase = await createClient();
    const { brandId } = params;

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

    // Fetch memories
    const { data: memories, error } = await supabase
      .from('brand_memories')
      .select('*')
      .eq('brand_id', brandId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ memories: memories || [] });
  } catch (error) {
    logger.error('Error fetching brand memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}

// POST - Create a new memory
export async function POST(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const supabase = await createClient();
    const { brandId } = params;
    const body = await request.json();
    const { title, content, category = 'general' } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
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

    // Create memory
    const { data: memory, error } = await supabase
      .from('brand_memories')
      .insert({
        brand_id: brandId,
        title,
        content,
        category,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    logger.error('Error creating brand memory:', error);
    return NextResponse.json(
      { error: 'Failed to create memory' },
      { status: 500 }
    );
  }
}

