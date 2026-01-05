-- ========================================
-- UNIFIED DOCUMENT STORE MIGRATION
-- ========================================
-- This migration creates a unified document store for brands that:
-- - Supports multiple document types (file, text, link)
-- - Enables granular sharing (private, shared with users, org-wide)
-- - Integrates with RAG for AI-powered search and chat
-- ========================================

-- STEP 1: Create the unified brand_documents_v2 table
CREATE TABLE IF NOT EXISTS brand_documents_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Document type: file (uploaded), text (rich text), link (web URL)
  doc_type TEXT NOT NULL CHECK (doc_type IN ('file', 'text', 'link')),
  
  -- Common fields
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- For file type (uploaded documents)
  file_name TEXT,
  file_type TEXT, -- MIME type
  file_size BIGINT,
  storage_path TEXT,
  
  -- For text type (rich text content created in-app)
  content TEXT,
  
  -- For link type (web URLs with metadata)
  url TEXT,
  url_title TEXT,
  url_description TEXT,
  url_image TEXT,
  
  -- Sharing permissions
  -- 'private': only creator can access
  -- 'shared': creator + users in shared_with array
  -- 'org': all organization members with brand access
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'org')),
  shared_with UUID[] DEFAULT '{}', -- User IDs when visibility = 'shared'
  
  -- RAG integration
  extracted_text TEXT, -- For searchable content (from files/links)
  embedding vector(1536), -- For semantic search
  is_indexed BOOLEAN DEFAULT false, -- Whether document has been indexed for RAG
  
  -- Organization and categorization
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general',
    'brand_guidelines',
    'style_guide',
    'product_info',
    'marketing',
    'research',
    'competitor',
    'testimonial',
    'reference',
    'template'
  )),
  
  -- Favorites/pinning
  is_pinned BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_brand_docs_v2_brand_id 
ON brand_documents_v2(brand_id);

CREATE INDEX IF NOT EXISTS idx_brand_docs_v2_created_by 
ON brand_documents_v2(created_by);

CREATE INDEX IF NOT EXISTS idx_brand_docs_v2_doc_type 
ON brand_documents_v2(brand_id, doc_type);

CREATE INDEX IF NOT EXISTS idx_brand_docs_v2_category 
ON brand_documents_v2(brand_id, category);

CREATE INDEX IF NOT EXISTS idx_brand_docs_v2_visibility 
ON brand_documents_v2(brand_id, visibility);

CREATE INDEX IF NOT EXISTS idx_brand_docs_v2_created 
ON brand_documents_v2(brand_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brand_docs_v2_tags 
ON brand_documents_v2 USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_brand_docs_v2_shared_with 
ON brand_documents_v2 USING GIN(shared_with);

-- Vector similarity search index (for RAG)
CREATE INDEX IF NOT EXISTS idx_brand_docs_v2_embedding 
ON brand_documents_v2 USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_brand_docs_v2_text_search
ON brand_documents_v2 USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, '') || ' ' || COALESCE(extracted_text, ''))
);

-- STEP 3: Enable RLS
ALTER TABLE brand_documents_v2 ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create RLS policies for brand_documents_v2

-- SELECT policy: Users can view documents based on visibility
CREATE POLICY "Users can view accessible brand documents" ON brand_documents_v2
  FOR SELECT
  USING (
    -- User has access to the brand
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
    AND (
      -- Document is org-wide
      visibility = 'org'
      -- Or user is the creator
      OR created_by = auth.uid()
      -- Or user is in the shared_with list
      OR (visibility = 'shared' AND auth.uid() = ANY(shared_with))
    )
  );

-- INSERT policy: Users can create documents for brands in their org
CREATE POLICY "Users can create brand documents in their org" ON brand_documents_v2
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- UPDATE policy: Users can update their own documents or if admin
CREATE POLICY "Users can update their documents" ON brand_documents_v2
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- DELETE policy: Users can delete their own documents or if admin
CREATE POLICY "Users can delete their documents" ON brand_documents_v2
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- STEP 5: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_brand_docs_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brand_documents_v2_updated_at
  BEFORE UPDATE ON brand_documents_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_docs_v2_updated_at();

-- STEP 6: Create function for searching documents by vector similarity (RAG)
CREATE OR REPLACE FUNCTION match_brand_documents_v2(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  brand_id_filter uuid DEFAULT NULL,
  user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  brand_id uuid,
  doc_type text,
  title text,
  description text,
  content text,
  extracted_text text,
  url text,
  category text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.brand_id,
    d.doc_type,
    d.title,
    d.description,
    d.content,
    d.extracted_text,
    d.url,
    d.category,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM brand_documents_v2 d
  WHERE 
    d.is_indexed = true
    AND (brand_id_filter IS NULL OR d.brand_id = brand_id_filter)
    AND (1 - (d.embedding <=> query_embedding)) > match_threshold
    -- Apply visibility check
    AND (
      d.visibility = 'org'
      OR d.created_by = user_id
      OR (d.visibility = 'shared' AND user_id = ANY(d.shared_with))
    )
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- STEP 7: Create function for full text search
CREATE OR REPLACE FUNCTION search_brand_documents_v2(
  search_query text,
  brand_id_filter uuid,
  user_id uuid,
  doc_type_filter text DEFAULT NULL,
  category_filter text DEFAULT NULL,
  limit_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  brand_id uuid,
  doc_type text,
  title text,
  description text,
  category text,
  visibility text,
  created_by uuid,
  created_at timestamptz,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.brand_id,
    d.doc_type,
    d.title,
    d.description,
    d.category,
    d.visibility,
    d.created_by,
    d.created_at,
    ts_rank(
      to_tsvector('english', COALESCE(d.title, '') || ' ' || COALESCE(d.description, '') || ' ' || COALESCE(d.content, '') || ' ' || COALESCE(d.extracted_text, '')),
      plainto_tsquery('english', search_query)
    ) AS rank
  FROM brand_documents_v2 d
  WHERE 
    d.brand_id = brand_id_filter
    AND (doc_type_filter IS NULL OR d.doc_type = doc_type_filter)
    AND (category_filter IS NULL OR d.category = category_filter)
    -- Apply visibility check
    AND (
      d.visibility = 'org'
      OR d.created_by = user_id
      OR (d.visibility = 'shared' AND user_id = ANY(d.shared_with))
    )
    AND (
      search_query = '' OR
      to_tsvector('english', COALESCE(d.title, '') || ' ' || COALESCE(d.description, '') || ' ' || COALESCE(d.content, '') || ' ' || COALESCE(d.extracted_text, ''))
      @@ plainto_tsquery('english', search_query)
    )
  ORDER BY rank DESC, d.created_at DESC
  LIMIT limit_count;
END;
$$;

-- STEP 8: Create storage bucket for document files (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-documents',
  'brand-documents',
  false, -- Private bucket, requires auth
  104857600, -- 100MB file size limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- STEP 9: Storage bucket RLS policies for brand-documents
CREATE POLICY "Users can view brand document files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'brand-documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can upload brand document files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own brand document files" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'brand-documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete brand document files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'brand-documents'
    AND auth.role() = 'authenticated'
  );

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Run this SQL in your Supabase SQL Editor
-- 
-- The new brand_documents_v2 table supports:
-- - Three document types: file, text, link
-- - Granular sharing: private, shared with specific users, org-wide
-- - Full RAG integration with vector similarity search
-- - Full text search for document content
-- - Categories and tags for organization
-- ========================================























