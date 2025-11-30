import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { 
  listMemories, 
  addMemory, 
  isSupermemoryConfigured 
} from '@/lib/supermemory';

export const dynamic = 'force-dynamic';

// GET - Fetch all memories for a brand (for current user)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const supabase = await createClient();
    const { brandId } = await params;

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
      logger.warn('[Brand Memories API] Supermemory not configured, returning empty list');
      return NextResponse.json({ memories: [] });
    }

    // Fetch memories from Supermemory (with graceful fallback)
    try {
      const supermemoryMemories = await listMemories(brandId, user.id);

      // Transform to match the expected format
      // Note: Content is stored as "title: content" format, so we need to extract the original content
      const memories = supermemoryMemories.map(mem => {
        const title = (mem.metadata?.title as string) || 'Untitled';
        // Extract original content by removing the "title: " prefix if present
        let content = mem.content;
        const titlePrefix = `${title}: `;
        if (content.startsWith(titlePrefix)) {
          content = content.slice(titlePrefix.length);
        }
        
        return {
          id: mem.id,
          brand_id: brandId,
          title,
          content,
          category: (mem.metadata?.category as string) || 'general',
          created_at: mem.createdAt,
          updated_at: mem.updatedAt || mem.createdAt,
        };
      });

      return NextResponse.json({ memories });
    } catch (supermemoryError) {
      // Log the error but return empty list instead of failing
      logger.warn('[Brand Memories API] Supermemory fetch failed, returning empty list:', supermemoryError);
      return NextResponse.json({ memories: [] });
    }
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
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const supabase = await createClient();
    const { brandId } = await params;
    const body = await request.json();
    const { title, content, category = 'general' } = body;

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

    // Format content with title for better context
    const formattedContent = `${title}: ${content}`;

    // Add memory to Supermemory
    const result = await addMemory(brandId, user.id, formattedContent, {
      title,
      category,
    });

    // Return in expected format
    const memory = {
      id: result.id,
      brand_id: brandId,
      title,
      content,
      category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    logger.error('Error creating brand memory:', error);
    return NextResponse.json(
      { error: 'Failed to create memory' },
      { status: 500 }
    );
  }
}
