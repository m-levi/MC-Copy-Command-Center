import { generateEmbedding, addBrandDocument } from '@/lib/rag-service';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { brandId, docType, title, content } = await req.json();

    if (!brandId || !docType || !title || !content) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Verify user has access to this brand
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (!brand) {
      return new Response('Brand not found or unauthorized', { status: 403 });
    }

    // Add document with embedding
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    const document = await addBrandDocument(
      brandId,
      docType,
      title,
      content,
      apiKey
    );

    if (!document) {
      return new Response('Failed to add document', { status: 500 });
    }

    return new Response(JSON.stringify(document), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Embeddings API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}


