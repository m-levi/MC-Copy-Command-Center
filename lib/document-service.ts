import { 
  BrandDocumentV2, 
  DocumentFilters, 
  DocumentSortOption,
  DocumentCategory,
  DocumentVisibility,
  BrandDocType,
  Profile
} from '@/types';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { generateEmbedding } from '@/lib/rag-service';

// ============================================================================
// Document CRUD Operations
// ============================================================================

/**
 * Get documents for a brand with filters, sorting, and pagination
 */
export async function getDocuments(
  brandId: string,
  userId: string,
  filters?: DocumentFilters,
  sort: DocumentSortOption = 'created_at_desc',
  limit: number = 50,
  offset: number = 0
): Promise<{ documents: BrandDocumentV2[]; total: number }> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('brand_documents_v2')
      .select('*', { count: 'exact' })
      .eq('brand_id', brandId);
    
    // Apply visibility filter (RLS handles this, but we also filter explicitly)
    // Documents visible: org-wide, created by user, or shared with user
    query = query.or(
      `visibility.eq.org,created_by.eq.${userId},shared_with.cs.{${userId}}`
    );
    
    // Apply filters
    if (filters?.docType) {
      query = query.eq('doc_type', filters.docType);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.visibility) {
      query = query.eq('visibility', filters.visibility);
    }
    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }
    if (filters?.isPinned !== null && filters?.isPinned !== undefined) {
      query = query.eq('is_pinned', filters.isPinned);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    if (filters?.search) {
      // Full text search on title, description, content
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,content.ilike.%${filters.search}%`
      );
    }
    
    // Apply sorting
    const [sortField, sortDir] = sort.split('_').slice(0, -1).join('_') === '' 
      ? [sort.replace(/_asc|_desc$/, ''), sort.endsWith('_asc')]
      : [sort.replace(/_asc$|_desc$/, ''), sort.endsWith('_asc')];
    
    switch (sort) {
      case 'created_at_desc':
        query = query.order('created_at', { ascending: false });
        break;
      case 'created_at_asc':
        query = query.order('created_at', { ascending: true });
        break;
      case 'updated_at_desc':
        query = query.order('updated_at', { ascending: false });
        break;
      case 'title_asc':
        query = query.order('title', { ascending: true });
        break;
      case 'title_desc':
        query = query.order('title', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      logger.error('Error fetching documents:', error);
      throw error;
    }
    
    return {
      documents: data || [],
      total: count || 0,
    };
  } catch (error) {
    logger.error('Error in getDocuments:', error);
    throw error;
  }
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(
  documentId: string,
  userId: string
): Promise<BrandDocumentV2 | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('brand_documents_v2')
      .select('*, creator:profiles!created_by(*)')
      .eq('id', documentId)
      .or(`visibility.eq.org,created_by.eq.${userId},shared_with.cs.{${userId}}`)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error('Error in getDocumentById:', error);
    throw error;
  }
}

/**
 * Create a new text document
 */
export async function createTextDocument(
  brandId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    content: string;
    tags?: string[];
    category?: DocumentCategory;
    visibility?: DocumentVisibility;
    shared_with?: string[];
  }
): Promise<BrandDocumentV2> {
  try {
    const supabase = await createClient();
    
    const { data: doc, error } = await supabase
      .from('brand_documents_v2')
      .insert({
        brand_id: brandId,
        created_by: userId,
        doc_type: 'text',
        title: data.title,
        description: data.description || null,
        content: data.content,
        tags: data.tags || [],
        category: data.category || 'general',
        visibility: data.visibility || 'private',
        shared_with: data.shared_with || [],
        is_indexed: false,
      })
      .select('*, creator:profiles!created_by(*)')
      .single();
    
    if (error) throw error;
    
    // Queue for RAG indexing (async)
    indexDocumentAsync(doc.id, data.content).catch(err => 
      logger.error('Failed to index document:', err)
    );
    
    return doc;
  } catch (error) {
    logger.error('Error creating text document:', error);
    throw error;
  }
}

/**
 * Create a new link document
 */
export async function createLinkDocument(
  brandId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    url: string;
    url_title?: string;
    url_description?: string;
    url_image?: string;
    tags?: string[];
    category?: DocumentCategory;
    visibility?: DocumentVisibility;
    shared_with?: string[];
  }
): Promise<BrandDocumentV2> {
  try {
    const supabase = await createClient();
    
    const { data: doc, error } = await supabase
      .from('brand_documents_v2')
      .insert({
        brand_id: brandId,
        created_by: userId,
        doc_type: 'link',
        title: data.title,
        description: data.description || null,
        url: data.url,
        url_title: data.url_title || null,
        url_description: data.url_description || null,
        url_image: data.url_image || null,
        tags: data.tags || [],
        category: data.category || 'general',
        visibility: data.visibility || 'private',
        shared_with: data.shared_with || [],
        is_indexed: false,
      })
      .select('*, creator:profiles!created_by(*)')
      .single();
    
    if (error) throw error;
    
    // Queue for content extraction and RAG indexing (async)
    extractAndIndexLink(doc.id, data.url).catch(err => 
      logger.error('Failed to extract/index link:', err)
    );
    
    return doc;
  } catch (error) {
    logger.error('Error creating link document:', error);
    throw error;
  }
}

/**
 * Create a new file document (after upload)
 */
export async function createFileDocument(
  brandId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    file_name: string;
    file_type: string;
    file_size: number;
    storage_path: string;
    tags?: string[];
    category?: DocumentCategory;
    visibility?: DocumentVisibility;
    shared_with?: string[];
  }
): Promise<BrandDocumentV2> {
  try {
    const supabase = await createClient();
    
    const { data: doc, error } = await supabase
      .from('brand_documents_v2')
      .insert({
        brand_id: brandId,
        created_by: userId,
        doc_type: 'file',
        title: data.title,
        description: data.description || null,
        file_name: data.file_name,
        file_type: data.file_type,
        file_size: data.file_size,
        storage_path: data.storage_path,
        tags: data.tags || [],
        category: data.category || 'general',
        visibility: data.visibility || 'private',
        shared_with: data.shared_with || [],
        is_indexed: false,
      })
      .select('*, creator:profiles!created_by(*)')
      .single();
    
    if (error) throw error;
    
    // Queue for text extraction and RAG indexing (async)
    // This would extract text from PDFs, docs, etc.
    extractAndIndexFile(doc.id, data.storage_path, data.file_type).catch(err => 
      logger.error('Failed to extract/index file:', err)
    );
    
    return doc;
  } catch (error) {
    logger.error('Error creating file document:', error);
    throw error;
  }
}

/**
 * Update a document
 */
export async function updateDocument(
  documentId: string,
  userId: string,
  updates: {
    title?: string;
    description?: string;
    content?: string;
    tags?: string[];
    category?: DocumentCategory;
    visibility?: DocumentVisibility;
    shared_with?: string[];
    is_pinned?: boolean;
    folder_id?: string | null;
  }
): Promise<BrandDocumentV2> {
  try {
    const supabase = await createClient();
    
    // First verify the user can update this document
    const { data: existing, error: fetchError } = await supabase
      .from('brand_documents_v2')
      .select('id, created_by, doc_type, content')
      .eq('id', documentId)
      .single();
    
    if (fetchError || !existing) {
      throw new Error('Document not found');
    }
    
    // Check if user is creator or admin (RLS handles this too)
    // For now, we rely on RLS policies
    
    const { data: doc, error } = await supabase
      .from('brand_documents_v2')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('*, creator:profiles!created_by(*)')
      .single();
    
    if (error) throw error;
    
    // Re-index if content changed
    if (updates.content && updates.content !== existing.content) {
      indexDocumentAsync(documentId, updates.content).catch(err => 
        logger.error('Failed to re-index document:', err)
      );
    }
    
    return doc;
  } catch (error) {
    logger.error('Error updating document:', error);
    throw error;
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(
  documentId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Get document to check for file storage path
    const { data: doc, error: fetchError } = await supabase
      .from('brand_documents_v2')
      .select('storage_path, doc_type')
      .eq('id', documentId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Delete storage file if it's a file document
    if (doc?.doc_type === 'file' && doc.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('brand-documents')
        .remove([doc.storage_path]);
      
      if (storageError) {
        logger.warn('Failed to delete storage file:', storageError);
      }
    }
    
    // Delete the document record
    const { error } = await supabase
      .from('brand_documents_v2')
      .delete()
      .eq('id', documentId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    logger.error('Error deleting document:', error);
    throw error;
  }
}

// ============================================================================
// Sharing Operations
// ============================================================================

/**
 * Update document sharing settings
 */
export async function updateDocumentSharing(
  documentId: string,
  userId: string,
  visibility: DocumentVisibility,
  sharedWith: string[] = []
): Promise<BrandDocumentV2> {
  try {
    const supabase = await createClient();
    
    const { data: doc, error } = await supabase
      .from('brand_documents_v2')
      .update({
        visibility,
        shared_with: visibility === 'shared' ? sharedWith : [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('*, creator:profiles!created_by(*)')
      .single();
    
    if (error) throw error;
    
    return doc;
  } catch (error) {
    logger.error('Error updating document sharing:', error);
    throw error;
  }
}

/**
 * Get users a document is shared with
 */
export async function getDocumentSharedUsers(
  documentId: string
): Promise<Profile[]> {
  try {
    const supabase = await createClient();
    
    // Get the document's shared_with array
    const { data: doc, error: docError } = await supabase
      .from('brand_documents_v2')
      .select('shared_with')
      .eq('id', documentId)
      .single();
    
    if (docError || !doc?.shared_with?.length) {
      return [];
    }
    
    // Get profiles for those users
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', doc.shared_with);
    
    if (profileError) throw profileError;
    
    return profiles || [];
  } catch (error) {
    logger.error('Error getting shared users:', error);
    throw error;
  }
}

// ============================================================================
// RAG Integration
// ============================================================================

/**
 * Index a document for RAG (async)
 */
async function indexDocumentAsync(
  documentId: string,
  content: string
): Promise<void> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('OpenAI API key not configured, skipping RAG indexing');
      return;
    }
    
    // Truncate content if too long (max ~8000 tokens for embedding)
    const maxChars = 30000;
    const truncatedContent = content.length > maxChars 
      ? content.substring(0, maxChars) + '...'
      : content;
    
    // Generate embedding
    const embedding = await generateEmbedding(truncatedContent, apiKey);
    
    // Update document with embedding
    const supabase = await createClient();
    const { error } = await supabase
      .from('brand_documents_v2')
      .update({
        embedding,
        is_indexed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);
    
    if (error) throw error;
    
    logger.info(`Successfully indexed document ${documentId}`);
  } catch (error) {
    logger.error(`Failed to index document ${documentId}:`, error);
    throw error;
  }
}

/**
 * Extract text from a link and index it
 */
async function extractAndIndexLink(
  documentId: string,
  url: string
): Promise<void> {
  try {
    // Fetch URL content (basic extraction)
    // In production, you'd want a more robust solution like Jina Reader
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandBot/1.0)',
      },
    });
    
    if (!response.ok) {
      logger.warn(`Failed to fetch URL ${url}: ${response.status}`);
      return;
    }
    
    const html = await response.text();
    
    // Basic text extraction (strip HTML tags)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50000); // Limit content size
    
    if (!textContent) {
      logger.warn(`No text content extracted from ${url}`);
      return;
    }
    
    // Update document with extracted text
    const supabase = await createClient();
    await supabase
      .from('brand_documents_v2')
      .update({
        extracted_text: textContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);
    
    // Now index the extracted text
    await indexDocumentAsync(documentId, textContent);
  } catch (error) {
    logger.error(`Failed to extract/index link ${documentId}:`, error);
    throw error;
  }
}

/**
 * Extract text from a file and index it
 * Supports: text files, HTML (Google Docs exports), CSV, JSON
 */
async function extractAndIndexFile(
  documentId: string,
  storagePath: string,
  fileType: string
): Promise<void> {
  try {
    // Supported file types for text extraction
    const textTypes = [
      'text/plain', 
      'text/markdown', 
      'text/csv', 
      'application/json',
      'text/html',
      'application/xhtml+xml',
    ];
    
    if (!textTypes.includes(fileType)) {
      logger.info(`File type ${fileType} not supported for text extraction yet`);
      // Mark document as processed but not indexed
      const supabase = await createClient();
      await supabase
        .from('brand_documents_v2')
        .update({
          is_indexed: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
      return;
    }
    
    const supabase = await createClient();
    
    // Download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('brand-documents')
      .download(storagePath);
    
    if (downloadError) throw downloadError;
    
    // Read text content
    let textContent = await fileData.text();
    
    if (!textContent) {
      logger.warn(`No text content in file ${storagePath}`);
      return;
    }
    
    // If HTML (e.g., Google Docs export), strip tags
    if (fileType === 'text/html' || fileType === 'application/xhtml+xml') {
      textContent = textContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Update document with extracted text
    await supabase
      .from('brand_documents_v2')
      .update({
        extracted_text: textContent.substring(0, 50000),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);
    
    // Index the text
    await indexDocumentAsync(documentId, textContent);
  } catch (error) {
    logger.error(`Failed to extract/index file ${documentId}:`, error);
    throw error;
  }
}

/**
 * Export function to manually trigger indexing for a Drive import
 * This is called after a Google Drive file is imported
 */
export async function indexDriveImport(documentId: string): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get document details
    const { data: doc, error: fetchError } = await supabase
      .from('brand_documents_v2')
      .select('storage_path, file_type, extracted_text, content')
      .eq('id', documentId)
      .single();
    
    if (fetchError) throw fetchError;
    if (!doc) throw new Error('Document not found');
    
    // If already has extracted text or content, index directly
    if (doc.extracted_text || doc.content) {
      await indexDocumentAsync(documentId, doc.extracted_text || doc.content);
      return;
    }
    
    // Otherwise, extract from file
    if (doc.storage_path && doc.file_type) {
      await extractAndIndexFile(documentId, doc.storage_path, doc.file_type);
    }
  } catch (error) {
    logger.error(`Failed to index Drive import ${documentId}:`, error);
    throw error;
  }
}

/**
 * Search documents using vector similarity (RAG)
 */
export async function searchDocumentsRAG(
  brandId: string,
  userId: string,
  query: string,
  limit: number = 5
): Promise<BrandDocumentV2[]> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('OpenAI API key not configured');
      return [];
    }
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, apiKey);
    
    const supabase = await createClient();
    
    // Use the match function
    const { data, error } = await supabase.rpc('match_brand_documents_v2', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
      brand_id_filter: brandId,
      user_id: userId,
    });
    
    if (error) {
      logger.error('Error in RAG search:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    logger.error('Error in searchDocumentsRAG:', error);
    return [];
  }
}

/**
 * Build RAG context from documents for AI prompts
 */
export function buildDocumentRAGContext(documents: BrandDocumentV2[]): string {
  if (documents.length === 0) {
    return '';
  }

  const sections = documents.map((doc) => {
    const typeLabel = {
      file: 'Document',
      text: 'Note',
      link: 'Reference',
    }[doc.doc_type];

    const content = doc.content || doc.extracted_text || '';
    
    return `### ${typeLabel}: ${doc.title}
${doc.description ? `> ${doc.description}\n` : ''}
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}`;
  });

  return `
<brand_documents>
The following are relevant documents from the brand's document store:

${sections.join('\n\n---\n\n')}
</brand_documents>
`;
}

// ============================================================================
// File Upload Helpers
// ============================================================================

/**
 * Upload a file to storage and create document record
 */
export async function uploadFileDocument(
  brandId: string,
  userId: string,
  file: {
    name: string;
    type: string;
    size: number;
    arrayBuffer: () => Promise<ArrayBuffer>;
  },
  metadata: {
    title?: string;
    description?: string;
    tags?: string[];
    category?: DocumentCategory;
    visibility?: DocumentVisibility;
    shared_with?: string[];
  }
): Promise<BrandDocumentV2> {
  try {
    const supabase = await createClient();
    
    // Generate unique storage path
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${brandId}/${userId}/${timestamp}_${safeName}`;
    
    // Upload to storage
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('brand-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
      });
    
    if (uploadError) throw uploadError;
    
    // Create document record
    return createFileDocument(brandId, userId, {
      title: metadata.title || file.name,
      description: metadata.description,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      tags: metadata.tags,
      category: metadata.category,
      visibility: metadata.visibility,
      shared_with: metadata.shared_with,
    });
  } catch (error) {
    logger.error('Error uploading file document:', error);
    throw error;
  }
}

/**
 * Get a signed URL for a file document
 */
export async function getFileDocumentUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase.storage
      .from('brand-documents')
      .createSignedUrl(storagePath, expiresIn);
    
    if (error) throw error;
    
    return data?.signedUrl || null;
  } catch (error) {
    logger.error('Error getting file URL:', error);
    return null;
  }
}

