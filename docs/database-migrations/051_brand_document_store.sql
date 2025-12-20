-- ========================================
-- BRAND DOCUMENT STORE MIGRATION
-- ========================================
-- This migration adds support for file storage for brands:
-- - Storage bucket for brand files (PDFs, images, documents)
-- - brand_files table to track uploaded files
-- - RLS policies for secure access
-- ========================================

-- STEP 1: Create storage bucket for brand files
-- Note: Run this in the Supabase Dashboard under Storage, or use the SQL below
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-files',
  'brand-files',
  false, -- Private bucket, requires auth
  52428800, -- 50MB file size limit
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
    'text/plain',
    'text/markdown',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- STEP 2: Create brand_files table
CREATE TABLE IF NOT EXISTS brand_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- File metadata
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  
  -- Organization and categorization
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
    'brand_guidelines',
    'style_guide',
    'logo',
    'product_catalog',
    'marketing_material',
    'research',
    'competitor_analysis',
    'customer_data',
    'general'
  )),
  
  -- Optional metadata
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- RAG integration
  extracted_text TEXT, -- For searchable content from PDFs/docs
  embedding vector(1536), -- For semantic search
  is_indexed BOOLEAN DEFAULT false, -- Whether text has been extracted and indexed
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 3: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_brand_files_brand_id 
ON brand_files(brand_id);

CREATE INDEX IF NOT EXISTS idx_brand_files_category 
ON brand_files(brand_id, category);

CREATE INDEX IF NOT EXISTS idx_brand_files_created 
ON brand_files(brand_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brand_files_tags 
ON brand_files USING GIN(tags);

-- Vector similarity search index (for RAG)
CREATE INDEX IF NOT EXISTS idx_brand_files_embedding 
ON brand_files USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- STEP 4: Enable RLS
ALTER TABLE brand_files ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS policies for brand_files
-- Users can view files for brands in their organization
CREATE POLICY "Users can view brand files in their org" ON brand_files
  FOR SELECT
  USING (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Users can upload files to brands in their organization
CREATE POLICY "Users can upload brand files in their org" ON brand_files
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Users can update files they uploaded or if they're org admin
CREATE POLICY "Users can update their uploaded files" ON brand_files
  FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    OR brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Users can delete files they uploaded or if they're org admin
CREATE POLICY "Users can delete their uploaded files" ON brand_files
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- STEP 6: Storage bucket RLS policies
CREATE POLICY "Users can view brand files storage" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'brand-files'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can upload brand files storage" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-files'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own brand files storage" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'brand-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own brand files storage" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'brand-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- STEP 7: Create updated_at trigger
CREATE TRIGGER update_brand_files_updated_at
  BEFORE UPDATE ON brand_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- STEP 8: Create function for searching brand files by vector similarity
CREATE OR REPLACE FUNCTION match_brand_files(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  brand_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  brand_id uuid,
  file_name text,
  category text,
  extracted_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    brand_files.id,
    brand_files.brand_id,
    brand_files.file_name,
    brand_files.category,
    brand_files.extracted_text,
    1 - (brand_files.embedding <=> query_embedding) AS similarity
  FROM brand_files
  WHERE 
    brand_files.is_indexed = true
    AND (brand_id_filter IS NULL OR brand_files.brand_id = brand_id_filter)
    AND (1 - (brand_files.embedding <=> query_embedding)) > match_threshold
  ORDER BY brand_files.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Verify the storage bucket was created
-- 3. Test file upload through the API
-- 4. Optionally set up a background job to extract text from uploaded files
-- ========================================






