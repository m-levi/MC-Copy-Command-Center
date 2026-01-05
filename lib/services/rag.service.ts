/**
 * RAG Service - Hybrid Search with Vector + Full-Text
 *
 * This service provides optimized document retrieval using:
 * 1. Vector similarity search (semantic understanding)
 * 2. Full-text search (keyword matching)
 * 3. Hybrid ranking that combines both
 *
 * Performance optimizations:
 * - Caching of embeddings
 * - Parallel search execution
 * - Result deduplication
 * - Configurable limits
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const DocumentCategorySchema = z.enum([
  'general',
  'brand_guidelines',
  'style_guide',
  'product_info',
  'marketing',
  'research',
  'competitor',
  'testimonial',
  'reference',
  'template',
]);

export type DocumentCategory = z.infer<typeof DocumentCategorySchema>;

export const RAGDocumentSchema = z.object({
  id: z.string().uuid(),
  brand_id: z.string().uuid(),
  doc_type: z.enum(['file', 'text', 'link']),
  title: z.string(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  extracted_text: z.string().nullable(),
  url: z.string().nullable(),
  category: DocumentCategorySchema,
  similarity: z.number().optional(),
  rank: z.number().optional(),
});

export type RAGDocument = z.infer<typeof RAGDocumentSchema>;

export const RAGSearchOptionsSchema = z.object({
  brandId: z.string().uuid(),
  userId: z.string().uuid(),
  query: z.string().min(1),
  limit: z.number().int().positive().max(20).default(5),
  minSimilarity: z.number().min(0).max(1).default(0.6),
  categories: z.array(DocumentCategorySchema).optional(),
  searchMode: z.enum(['vector', 'fulltext', 'hybrid']).default('hybrid'),
});

export type RAGSearchOptions = z.infer<typeof RAGSearchOptionsSchema>;

export interface RAGSearchResult {
  documents: RAGDocument[];
  searchMode: 'vector' | 'fulltext' | 'hybrid';
  totalResults: number;
  searchTimeMs: number;
}

export interface RAGContext {
  context: string;
  documentCount: number;
  categories: DocumentCategory[];
}

// ============================================================================
// EMBEDDING SERVICE
// ============================================================================

// Simple in-memory cache for embeddings (TTL: 5 minutes)
const embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();
const EMBEDDING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedEmbedding(text: string): number[] | null {
  const cached = embeddingCache.get(text);
  if (cached && Date.now() - cached.timestamp < EMBEDDING_CACHE_TTL) {
    return cached.embedding;
  }
  if (cached) {
    embeddingCache.delete(text);
  }
  return null;
}

function setCachedEmbedding(text: string, embedding: number[]): void {
  // Limit cache size to prevent memory issues
  if (embeddingCache.size > 100) {
    const oldestKey = embeddingCache.keys().next().value;
    if (oldestKey) embeddingCache.delete(oldestKey);
  }
  embeddingCache.set(text, { embedding, timestamp: Date.now() });
}

/**
 * Generate embedding for text using OpenAI's text-embedding-3-small model
 * Includes caching for repeated queries
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Check cache first
  const cached = getCachedEmbedding(text);
  if (cached) {
    logger.debug('[RAG] Using cached embedding');
    return cached;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Truncate text if too long (max ~8000 tokens for embedding model)
  const truncatedText = text.slice(0, 30000);

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: truncatedText,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('[RAG] Embedding API error:', error);
    throw new Error(`Failed to generate embedding: ${response.status}`);
  }

  const data = await response.json();
  const embedding = data.data[0].embedding;

  // Cache the result
  setCachedEmbedding(text, embedding);

  return embedding;
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Vector similarity search using pgvector
 */
async function vectorSearch(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never,
  options: RAGSearchOptions
): Promise<RAGDocument[]> {
  const { brandId, userId, query, limit, minSimilarity } = options;

  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('match_brand_documents_v2', {
      query_embedding: queryEmbedding,
      match_threshold: minSimilarity,
      match_count: limit,
      brand_id_filter: brandId,
      user_id: userId,
    });

    if (error) {
      logger.error('[RAG] Vector search error:', error);
      return [];
    }

    return (data || []).map((doc: Record<string, unknown>) => ({
      ...doc,
      similarity: doc.similarity as number,
    })) as RAGDocument[];
  } catch (error) {
    logger.error('[RAG] Vector search failed:', error);
    return [];
  }
}

/**
 * Full-text search using PostgreSQL tsvector
 */
async function fullTextSearch(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never,
  options: RAGSearchOptions
): Promise<RAGDocument[]> {
  const { brandId, userId, query, limit, categories } = options;

  try {
    const { data, error } = await supabase.rpc('search_brand_documents_v2', {
      search_query: query,
      brand_id_filter: brandId,
      user_id: userId,
      doc_type_filter: null,
      category_filter: categories?.[0] || null,
      limit_count: limit,
    });

    if (error) {
      logger.error('[RAG] Full-text search error:', error);
      return [];
    }

    return (data || []).map((doc: Record<string, unknown>) => ({
      ...doc,
      rank: doc.rank as number,
    })) as RAGDocument[];
  } catch (error) {
    logger.error('[RAG] Full-text search failed:', error);
    return [];
  }
}

/**
 * Hybrid search: combines vector and full-text search with RRF ranking
 * Uses Reciprocal Rank Fusion to merge results from both search methods
 */
async function hybridSearch(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never,
  options: RAGSearchOptions
): Promise<RAGDocument[]> {
  const startTime = Date.now();

  // Run both searches in parallel
  const [vectorResults, fulltextResults] = await Promise.all([
    vectorSearch(supabase, { ...options, limit: options.limit * 2 }),
    fullTextSearch(supabase, { ...options, limit: options.limit * 2 }),
  ]);

  logger.debug(`[RAG] Hybrid search: vector=${vectorResults.length}, fulltext=${fulltextResults.length}`);

  // Reciprocal Rank Fusion (RRF) scoring
  // RRF combines rankings from multiple lists using: score = sum(1 / (k + rank))
  const k = 60; // Constant from RRF paper
  const scores = new Map<string, { doc: RAGDocument; score: number }>();

  // Score vector results
  vectorResults.forEach((doc, index) => {
    const rrf = 1 / (k + index + 1);
    const existing = scores.get(doc.id);
    if (existing) {
      existing.score += rrf;
    } else {
      scores.set(doc.id, { doc, score: rrf });
    }
  });

  // Score full-text results
  fulltextResults.forEach((doc, index) => {
    const rrf = 1 / (k + index + 1);
    const existing = scores.get(doc.id);
    if (existing) {
      existing.score += rrf;
    } else {
      scores.set(doc.id, { doc, score: rrf });
    }
  });

  // Sort by combined score and limit
  const results = Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit)
    .map(({ doc }) => doc);

  logger.debug(`[RAG] Hybrid search completed in ${Date.now() - startTime}ms, results: ${results.length}`);

  return results;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Search for relevant documents using the specified search mode
 */
export async function searchDocuments(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never,
  options: RAGSearchOptions
): Promise<RAGSearchResult> {
  const startTime = Date.now();
  const validated = RAGSearchOptionsSchema.parse(options);

  let documents: RAGDocument[];

  switch (validated.searchMode) {
    case 'vector':
      documents = await vectorSearch(supabase, validated);
      break;
    case 'fulltext':
      documents = await fullTextSearch(supabase, validated);
      break;
    case 'hybrid':
    default:
      documents = await hybridSearch(supabase, validated);
      break;
  }

  return {
    documents,
    searchMode: validated.searchMode,
    totalResults: documents.length,
    searchTimeMs: Date.now() - startTime,
  };
}

/**
 * Build RAG context string from documents for AI prompt injection
 */
export function buildRAGContext(documents: RAGDocument[]): RAGContext {
  if (documents.length === 0) {
    return {
      context: '',
      documentCount: 0,
      categories: [],
    };
  }

  const categories = [...new Set(documents.map((d) => d.category))];

  const sections = documents.map((doc) => {
    const typeLabel = {
      file: 'Document',
      text: 'Note',
      link: 'Reference',
    }[doc.doc_type];

    const categoryLabel = doc.category ? ` (${doc.category.replace('_', ' ')})` : '';
    const content = doc.content || doc.extracted_text || '';

    // Truncate long content to prevent prompt bloat
    const maxLength = 1500;
    const truncatedContent =
      content.length > maxLength ? content.substring(0, maxLength) + '... [truncated]' : content;

    return `### ${typeLabel}${categoryLabel}: ${doc.title}
${doc.description ? `> ${doc.description}\n` : ''}${truncatedContent}`;
  });

  const context = `
<brand_documents>
The following are relevant documents from the brand's knowledge base that may inform your response:

${sections.join('\n\n---\n\n')}
</brand_documents>
`;

  return {
    context,
    documentCount: documents.length,
    categories,
  };
}

/**
 * Full RAG pipeline: search + context building
 * This is the main entry point for RAG in the chat flow
 */
export async function getRAGContext(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never,
  brandId: string,
  userId: string,
  query: string,
  options?: Partial<RAGSearchOptions>
): Promise<RAGContext> {
  try {
    const searchResult = await searchDocuments(supabase, {
      brandId,
      userId,
      query,
      limit: options?.limit ?? 5,
      minSimilarity: options?.minSimilarity ?? 0.6,
      searchMode: options?.searchMode ?? 'hybrid',
      categories: options?.categories,
    });

    logger.info(
      `[RAG] Retrieved ${searchResult.totalResults} documents in ${searchResult.searchTimeMs}ms (${searchResult.searchMode})`
    );

    return buildRAGContext(searchResult.documents);
  } catch (error) {
    logger.error('[RAG] Failed to get RAG context:', error);
    return {
      context: '',
      documentCount: 0,
      categories: [],
    };
  }
}
