import { addBrandDocument } from '@/lib/rag-service';
import { createClient } from '@/lib/supabase/server';
import {
  validationError,
  authenticationError,
  authorizationError,
  externalAPIError,
  databaseError,
  withErrorHandling,
} from '@/lib/api-error';

export const runtime = 'edge';

export const POST = withErrorHandling(async (req: Request) => {
  const { brandId, docType, title, content } = await req.json();

  // Validate required fields
  if (!brandId || !docType || !title || !content) {
    return validationError(
      'Missing required fields',
      'brandId, docType, title, and content are all required'
    );
  }

  // Verify user authentication
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return authenticationError('Please log in to add documents');
  }

  // Verify user has access to this brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('user_id', user.id)
    .single();

  if (brandError) {
    return databaseError('brand lookup', brandError.message);
  }

  if (!brand) {
    return authorizationError('You do not have access to this brand');
  }

  // Check OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Embeddings] OpenAI API key not configured');
    return externalAPIError('OpenAI', 'API key not configured');
  }

  // Add document with embedding
  try {
    const document = await addBrandDocument(
      brandId,
      docType,
      title,
      content,
      apiKey
    );

    if (!document) {
      return databaseError('document creation', 'Failed to create document record');
    }

    return new Response(JSON.stringify(document), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('OpenAI')) {
      return externalAPIError('OpenAI', error.message);
    }
    throw error; // Let withErrorHandling catch it
  }
});


