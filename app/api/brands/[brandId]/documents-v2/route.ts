import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  getDocuments, 
  createTextDocument, 
  createLinkDocument,
  uploadFileDocument 
} from '@/lib/document-service';
import { DocumentFilters, DocumentSortOption, DocumentCategory, DocumentVisibility } from '@/types';
import { logger } from '@/lib/logger';

// GET /api/brands/[brandId]/documents-v2 - List documents
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
    const filters: DocumentFilters = {
      docType: url.searchParams.get('docType') as DocumentFilters['docType'],
      category: url.searchParams.get('category') as DocumentFilters['category'],
      visibility: url.searchParams.get('visibility') as DocumentFilters['visibility'],
      search: url.searchParams.get('search') || undefined,
      createdBy: url.searchParams.get('createdBy') || undefined,
      isPinned: url.searchParams.get('isPinned') === 'true' ? true : 
                url.searchParams.get('isPinned') === 'false' ? false : undefined,
    };
    
    const tagsParam = url.searchParams.get('tags');
    if (tagsParam) {
      filters.tags = tagsParam.split(',').filter(Boolean);
    }
    
    const sort = (url.searchParams.get('sort') || 'created_at_desc') as DocumentSortOption;
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    
    const result = await getDocuments(brandId, user.id, filters, sort, limit, offset);
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in GET /documents-v2:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/brands/[brandId]/documents-v2 - Create a document
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
    
    // Handle multipart form data (for file uploads) or JSON
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // File upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      
      const metadata = {
        title: formData.get('title') as string || file.name,
        description: formData.get('description') as string || undefined,
        tags: formData.get('tags') ? (formData.get('tags') as string).split(',') : undefined,
        category: formData.get('category') as DocumentCategory || undefined,
        visibility: formData.get('visibility') as DocumentVisibility || undefined,
        shared_with: formData.get('shared_with') ? 
          (formData.get('shared_with') as string).split(',') : undefined,
      };
      
      const document = await uploadFileDocument(brandId, user.id, file, metadata);
      return NextResponse.json({ document }, { status: 201 });
    } else {
      // JSON body (text or link document)
      const body = await request.json();
      
      if (!body.doc_type || !body.title) {
        return NextResponse.json(
          { error: 'doc_type and title are required' },
          { status: 400 }
        );
      }
      
      let document;
      
      if (body.doc_type === 'text') {
        if (!body.content) {
          return NextResponse.json(
            { error: 'content is required for text documents' },
            { status: 400 }
          );
        }
        
        document = await createTextDocument(brandId, user.id, {
          title: body.title,
          description: body.description,
          content: body.content,
          tags: body.tags,
          category: body.category,
          visibility: body.visibility,
          shared_with: body.shared_with,
        });
      } else if (body.doc_type === 'link') {
        if (!body.url) {
          return NextResponse.json(
            { error: 'url is required for link documents' },
            { status: 400 }
          );
        }
        
        document = await createLinkDocument(brandId, user.id, {
          title: body.title,
          description: body.description,
          url: body.url,
          url_title: body.url_title,
          url_description: body.url_description,
          url_image: body.url_image,
          tags: body.tags,
          category: body.category,
          visibility: body.visibility,
          shared_with: body.shared_with,
        });
      } else {
        return NextResponse.json(
          { error: 'Invalid doc_type. Must be text or link for JSON requests.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ document }, { status: 201 });
    }
  } catch (error) {
    logger.error('Error in POST /documents-v2:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}























