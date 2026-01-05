import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeDocument } from '@/lib/ai-document-service';
import { logger } from '@/lib/logger';

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
    
    // Get brand context
    const { data: brand } = await supabase
      .from('brands')
      .select('name, brand_details, brand_voice, copywriting_style_guide')
      .eq('id', brandId)
      .single();
    
    const body = await request.json();
    const { title, content } = body;
    
    if (!title || !content) {
      return NextResponse.json(
        { error: 'title and content are required' },
        { status: 400 }
      );
    }
    
    // Create brand context for AI
    const brandContext = brand ? `
      Brand: ${brand.name}
      ${brand.brand_details ? `Details: ${brand.brand_details.substring(0, 500)}` : ''}
    ` : undefined;
    
    // Analyze the document
    const analysis = await analyzeDocument(title, content, brandContext);
    
    logger.info('Document analyzed successfully', {
      brandId,
      category: analysis.category,
      tagsCount: analysis.tags.length,
    });
    
    return NextResponse.json(analysis);
  } catch (error) {
    logger.error('Error analyzing document:', error);
    return NextResponse.json(
      { error: 'Failed to analyze document' },
      { status: 500 }
    );
  }
}

















