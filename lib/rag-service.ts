import { BrandDocument } from '@/types';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Generate embeddings using OpenAI
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate embedding');
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    logger.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Search for relevant documents using vector similarity
 */
export async function searchRelevantDocuments(
  brandId: string,
  query: string,
  apiKey: string,
  limit: number = 3
): Promise<BrandDocument[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, apiKey);
    
    const supabase = await createClient();
    
    // Use pgvector similarity search
    // Note: This requires the pgvector extension to be enabled
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
      brand_id_filter: brandId,
    });

    if (error) {
      logger.error('Error searching documents:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in searchRelevantDocuments:', error);
    return [];
  }
}

/**
 * Add a new document to the knowledge base
 */
export async function addBrandDocument(
  brandId: string,
  docType: BrandDocument['doc_type'],
  title: string,
  content: string,
  apiKey: string
): Promise<BrandDocument | null> {
  try {
    // Generate embedding for the content
    const embedding = await generateEmbedding(content, apiKey);
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('brand_documents')
      .insert({
        brand_id: brandId,
        doc_type: docType,
        title,
        content,
        embedding,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error adding document:', error);
    return null;
  }
}

/**
 * Get all documents for a brand
 */
export async function getBrandDocuments(
  brandId: string,
  docType?: BrandDocument['doc_type']
): Promise<BrandDocument[]> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('brand_documents')
      .select('*')
      .eq('brand_id', brandId);
    
    if (docType) {
      query = query.eq('doc_type', docType);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching documents:', error);
    return [];
  }
}

/**
 * Delete a document
 */
export async function deleteBrandDocument(documentId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('brand_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Error deleting document:', error);
    return false;
  }
}

/**
 * Build enhanced context with RAG documents
 */
export function buildRAGContext(documents: BrandDocument[]): string {
  if (documents.length === 0) {
    return '';
  }

  const sections = documents.map((doc, index) => {
    const typeLabel = {
      example: 'Example Email',
      competitor: 'Competitor Analysis',
      research: 'Research',
      testimonial: 'Customer Testimonial',
    }[doc.doc_type];

    return `### ${typeLabel}: ${doc.title}\n${doc.content}`;
  });

  return `
<brand_knowledge>
The following are relevant documents from the brand's knowledge base that may help inform your response:

${sections.join('\n\n---\n\n')}
</brand_knowledge>
`;
}


