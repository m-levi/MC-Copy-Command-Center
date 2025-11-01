-- ========================================
-- FLOW FEATURE DATABASE MIGRATION
-- ========================================
-- This migration adds support for email flow automation
-- Run this in Supabase SQL Editor
-- ========================================

-- STEP 1: Add flow columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS parent_conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_flow BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS flow_type TEXT,
ADD COLUMN IF NOT EXISTS flow_sequence_order INTEGER,
ADD COLUMN IF NOT EXISTS flow_email_title TEXT;

-- STEP 2: Add comment for documentation
COMMENT ON COLUMN conversations.parent_conversation_id IS 'Links child email conversations to parent flow conversation';
COMMENT ON COLUMN conversations.is_flow IS 'TRUE if this conversation is a flow parent (container for email sequence)';
COMMENT ON COLUMN conversations.flow_type IS 'Type of flow: welcome_series, abandoned_cart, post_purchase, winback, product_launch, educational_series';
COMMENT ON COLUMN conversations.flow_sequence_order IS 'Order of email in sequence (1, 2, 3, etc.) - only for child conversations';
COMMENT ON COLUMN conversations.flow_email_title IS 'Title of individual email in sequence - only for child conversations';

-- STEP 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_parent_id 
ON conversations(parent_conversation_id) 
WHERE parent_conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_is_flow 
ON conversations(is_flow) 
WHERE is_flow = TRUE;

CREATE INDEX IF NOT EXISTS idx_conversations_flow_children
ON conversations(parent_conversation_id, flow_sequence_order)
WHERE parent_conversation_id IS NOT NULL;

-- STEP 4: Update mode constraint to allow 'flow'
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_mode_check;

ALTER TABLE conversations 
ADD CONSTRAINT conversations_mode_check 
CHECK (mode IN ('planning', 'email_copy', 'flow'));

-- STEP 5: Add constraint to ensure flow fields are consistent
-- If is_flow is true, flow_type must be set
ALTER TABLE conversations
ADD CONSTRAINT conversations_flow_consistency_check
CHECK (
  (is_flow = FALSE OR flow_type IS NOT NULL) AND
  (parent_conversation_id IS NULL OR (flow_sequence_order IS NOT NULL AND flow_email_title IS NOT NULL))
);

-- STEP 6: Create flow_outlines table
CREATE TABLE IF NOT EXISTS flow_outlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  flow_type TEXT NOT NULL CHECK (
    flow_type IN ('welcome_series', 'abandoned_cart', 'post_purchase', 'winback', 'product_launch', 'educational_series')
  ),
  outline_data JSONB NOT NULL,
  approved BOOLEAN DEFAULT FALSE NOT NULL,
  approved_at TIMESTAMPTZ,
  email_count INTEGER NOT NULL CHECK (email_count > 0 AND email_count <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- STEP 7: Add indexes for flow_outlines
CREATE INDEX IF NOT EXISTS idx_flow_outlines_conversation_id 
ON flow_outlines(conversation_id);

CREATE INDEX IF NOT EXISTS idx_flow_outlines_approved
ON flow_outlines(approved, conversation_id);

-- STEP 8: Enable Row Level Security for flow_outlines
ALTER TABLE flow_outlines ENABLE ROW LEVEL SECURITY;

-- STEP 9: Create RLS policies for flow_outlines
-- Users can only access outlines for their own conversations
CREATE POLICY "Users can view own flow outlines" ON flow_outlines
FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own flow outlines" ON flow_outlines
FOR INSERT WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own flow outlines" ON flow_outlines
FOR UPDATE USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own flow outlines" ON flow_outlines
FOR DELETE USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

-- STEP 10: Create helper function to get flow children
CREATE OR REPLACE FUNCTION get_flow_children(flow_conversation_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  flow_sequence_order INTEGER,
  flow_email_title TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.flow_sequence_order,
    c.flow_email_title,
    c.created_at,
    c.updated_at
  FROM conversations c
  WHERE c.parent_conversation_id = flow_conversation_id
  ORDER BY c.flow_sequence_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 11: Create trigger to update updated_at on flow_outlines
CREATE OR REPLACE FUNCTION update_flow_outlines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flow_outlines_updated_at
BEFORE UPDATE ON flow_outlines
FOR EACH ROW
EXECUTE FUNCTION update_flow_outlines_updated_at();

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify all columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'conversations'
AND column_name IN ('is_flow', 'parent_conversation_id', 'flow_type', 'flow_sequence_order', 'flow_email_title')
ORDER BY column_name;

-- Expected: 5 rows returned

-- Verify indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'conversations'
AND indexname LIKE '%flow%'
ORDER BY indexname;

-- Expected: At least 3 indexes

-- Verify flow_outlines table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'flow_outlines'
);

-- Expected: true

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('flow_outlines')
AND schemaname = 'public';

-- Expected: rowsecurity = true

-- Test the helper function (should return empty initially)
SELECT * FROM get_flow_children('00000000-0000-0000-0000-000000000000');

-- Expected: 0 rows (but no error)

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '
  ========================================
  ✅ FLOW FEATURE MIGRATION COMPLETE
  ========================================
  
  Added to conversations table:
  - parent_conversation_id (UUID)
  - is_flow (BOOLEAN)
  - flow_type (TEXT)
  - flow_sequence_order (INTEGER)
  - flow_email_title (TEXT)
  
  Created:
  - flow_outlines table with RLS
  - 3 performance indexes
  - get_flow_children() helper function
  - Automatic updated_at trigger
  
  Flow feature is now ready to use!
  ========================================
  ';
END $$;

