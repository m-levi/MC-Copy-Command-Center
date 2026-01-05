-- ========================================
-- DOCUMENT FOLDERS MIGRATION
-- ========================================
-- This migration creates a folders system for documents that:
-- - Supports user-created folders
-- - Supports "Smart" AI-powered folders that auto-categorize documents
-- - Enables folder-based organization with document relationships
-- ========================================

-- STEP 1: Create the document_folders table
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Folder details
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue', -- UI color theme
  icon TEXT DEFAULT '📁', -- Emoji or icon identifier
  
  -- Smart folder fields
  is_smart BOOLEAN DEFAULT false, -- If true, this is an AI-managed folder
  smart_criteria JSONB, -- AI criteria for auto-categorization
  -- Example: { "keywords": ["product", "launch"], "categories": ["marketing"], "confidence_threshold": 0.7 }
  
  -- Organization
  sort_order INT DEFAULT 0,
  parent_folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE, -- For nested folders
  
  -- Stats (updated via triggers or periodic jobs)
  document_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Add folder_id to brand_documents_v2
ALTER TABLE brand_documents_v2 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;

-- STEP 3: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_document_folders_brand_id 
ON document_folders(brand_id);

CREATE INDEX IF NOT EXISTS idx_document_folders_created_by 
ON document_folders(created_by);

CREATE INDEX IF NOT EXISTS idx_document_folders_parent 
ON document_folders(parent_folder_id);

CREATE INDEX IF NOT EXISTS idx_document_folders_smart 
ON document_folders(brand_id, is_smart);

CREATE INDEX IF NOT EXISTS idx_brand_docs_v2_folder_id 
ON brand_documents_v2(folder_id);

-- STEP 4: Enable RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS policies for document_folders

-- SELECT policy: Users can view folders for brands they have access to
CREATE POLICY "Users can view brand folders" ON document_folders
  FOR SELECT
  USING (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- INSERT policy: Users can create folders for brands in their org
CREATE POLICY "Users can create folders in their org" ON document_folders
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- UPDATE policy: Users can update folders they created or if admin
CREATE POLICY "Users can update their folders" ON document_folders
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- DELETE policy: Users can delete folders they created or if admin
CREATE POLICY "Users can delete their folders" ON document_folders
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR brand_id IN (
      SELECT b.id FROM brands b
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- STEP 6: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_document_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON document_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_document_folders_updated_at();

-- STEP 7: Create function to update folder document counts
CREATE OR REPLACE FUNCTION update_folder_document_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update old folder count (if document was moved)
  IF OLD IS NOT NULL AND OLD.folder_id IS NOT NULL THEN
    UPDATE document_folders 
    SET document_count = (
      SELECT COUNT(*) FROM brand_documents_v2 WHERE folder_id = OLD.folder_id
    )
    WHERE id = OLD.folder_id;
  END IF;
  
  -- Update new folder count
  IF NEW IS NOT NULL AND NEW.folder_id IS NOT NULL THEN
    UPDATE document_folders 
    SET document_count = (
      SELECT COUNT(*) FROM brand_documents_v2 WHERE folder_id = NEW.folder_id
    )
    WHERE id = NEW.folder_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for INSERT
CREATE TRIGGER update_folder_count_on_insert
  AFTER INSERT ON brand_documents_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_document_count();

-- Trigger for UPDATE (when folder_id changes)
CREATE TRIGGER update_folder_count_on_update
  AFTER UPDATE OF folder_id ON brand_documents_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_document_count();

-- Trigger for DELETE
CREATE TRIGGER update_folder_count_on_delete
  AFTER DELETE ON brand_documents_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_document_count();

-- STEP 8: Create function to get folders with document counts
CREATE OR REPLACE FUNCTION get_brand_folders(
  p_brand_id uuid,
  p_user_id uuid,
  p_include_smart boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  brand_id uuid,
  name text,
  description text,
  color text,
  icon text,
  is_smart boolean,
  smart_criteria jsonb,
  sort_order int,
  parent_folder_id uuid,
  document_count int,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.brand_id,
    f.name,
    f.description,
    f.color,
    f.icon,
    f.is_smart,
    f.smart_criteria,
    f.sort_order,
    f.parent_folder_id,
    f.document_count,
    f.created_by,
    f.created_at,
    f.updated_at
  FROM document_folders f
  WHERE 
    f.brand_id = p_brand_id
    AND (p_include_smart OR f.is_smart = false)
  ORDER BY f.is_smart DESC, f.sort_order ASC, f.name ASC;
END;
$$;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Run this SQL in your Supabase SQL Editor
-- 
-- The document_folders table supports:
-- - User-created folders for manual organization
-- - Smart AI folders that auto-categorize documents
-- - Nested folder structure (optional)
-- - Automatic document count tracking
-- ========================================























