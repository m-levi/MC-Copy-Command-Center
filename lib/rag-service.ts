import { BrandDocument, BrandDocumentV2 } from '@/types';
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
 * Search for relevant documents using vector similarity (legacy brand_documents table)
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
 * Search for relevant documents in the unified document store (brand_documents_v2)
 * This respects visibility permissions
 */
export async function searchRelevantDocumentsV2(
  brandId: string,
  userId: string,
  query: string,
  apiKey: string,
  limit: number = 5
): Promise<BrandDocumentV2[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, apiKey);
    
    const supabase = await createClient();
    
    // Use the new match function that respects visibility
    const { data, error } = await supabase.rpc('match_brand_documents_v2', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
      brand_id_filter: brandId,
      user_id: userId,
    });

    if (error) {
      logger.error('Error searching documents v2:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in searchRelevantDocumentsV2:', error);
    return [];
  }
}

/**
 * Combined search across both document tables for maximum coverage
 * Returns documents from both legacy and new tables
 */
export async function searchAllBrandDocuments(
  brandId: string,
  userId: string,
  query: string,
  apiKey: string,
  limit: number = 5
): Promise<{
  legacy: BrandDocument[];
  unified: BrandDocumentV2[];
}> {
  try {
    // Search both tables in parallel
    const [legacyDocs, unifiedDocs] = await Promise.all([
      searchRelevantDocuments(brandId, query, apiKey, limit),
      searchRelevantDocumentsV2(brandId, userId, query, apiKey, limit),
    ]);

    return {
      legacy: legacyDocs,
      unified: unifiedDocs,
    };
  } catch (error) {
    logger.error('Error in searchAllBrandDocuments:', error);
    return { legacy: [], unified: [] };
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
 * Build enhanced context with RAG documents (legacy)
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

/**
 * Build enhanced context with unified documents (brand_documents_v2)
 */
export function buildRAGContextV2(documents: BrandDocumentV2[]): string {
  if (documents.length === 0) {
    return '';
  }

  const sections = documents.map((doc) => {
    const typeLabel = {
      file: 'Document',
      text: 'Note',
      link: 'Reference',
    }[doc.doc_type];

    const categoryLabel = doc.category ? ` (${doc.category.replace('_', ' ')})` : '';
    const content = doc.content || doc.extracted_text || '';
    
    // Truncate long content
    const maxLength = 2000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;

    return `### ${typeLabel}${categoryLabel}: ${doc.title}
${doc.description ? `> ${doc.description}\n` : ''}${truncatedContent}`;
  });

  return `
<brand_documents>
The following are relevant documents from the brand's document store:

${sections.join('\n\n---\n\n')}
</brand_documents>
`;
}

/**
 * Build combined RAG context from both legacy and unified documents
 */
export function buildCombinedRAGContext(
  legacyDocs: BrandDocument[],
  unifiedDocs: BrandDocumentV2[]
): string {
  const parts: string[] = [];
  
  // Add legacy docs if present
  if (legacyDocs.length > 0) {
    parts.push(buildRAGContext(legacyDocs));
  }
  
  // Add unified docs if present
  if (unifiedDocs.length > 0) {
    parts.push(buildRAGContextV2(unifiedDocs));
  }
  
  return parts.join('\n');
}


