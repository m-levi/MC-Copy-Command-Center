-- ========================================
-- PERFORMANCE OPTIMIZATION - DATABASE INDEXES
-- ========================================
-- This migration adds indexes to optimize common query patterns
-- in the chat application for better performance
-- ========================================

-- STEP 1: Conversations indexes for faster lookups
-- Index for loading conversations by brand (most common query)
CREATE INDEX IF NOT EXISTS idx_conversations_brand_updated 
ON conversations(brand_id, updated_at DESC);

-- Index for filtering conversations by user
CREATE INDEX IF NOT EXISTS idx_conversations_user 
ON conversations(user_id);

-- Index for conversation type filtering
CREATE INDEX IF NOT EXISTS idx_conversations_type 
ON conversations(conversation_type);

-- Composite index for brand + type queries (very common)
CREATE INDEX IF NOT EXISTS idx_conversations_brand_type 
ON conversations(brand_id, conversation_type, updated_at DESC);

-- STEP 2: Messages indexes for faster message loading
-- Index for loading messages by conversation (most common query)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at ASC);

-- Index for message role filtering (for conversation context)
CREATE INDEX IF NOT EXISTS idx_messages_role 
ON messages(role);

-- Index for edited messages
CREATE INDEX IF NOT EXISTS idx_messages_edited 
ON messages(edited_at) WHERE edited_at IS NOT NULL;

-- Index for parent message relationships
CREATE INDEX IF NOT EXISTS idx_messages_parent 
ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

-- STEP 3: Brands indexes
-- Index for user's brands lookup
CREATE INDEX IF NOT EXISTS idx_brands_user 
ON brands(user_id, updated_at DESC);

-- Index for organization brands (if using organizations)
CREATE INDEX IF NOT EXISTS idx_brands_organization 
ON brands(organization_id) WHERE organization_id IS NOT NULL;

-- STEP 4: Metadata indexes for JSONB queries
-- GIN index for message metadata (for product links, reactions)
CREATE INDEX IF NOT EXISTS idx_messages_metadata 
ON messages USING gin(metadata jsonb_path_ops);

-- STEP 5: Organization members indexes (for team collaboration)
-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_org_members_user 
ON organization_members(user_id);

-- Index for organization lookups with join date
CREATE INDEX IF NOT EXISTS idx_org_members_org_joined 
ON organization_members(organization_id, joined_at DESC);

-- Composite index for role-based queries
CREATE INDEX IF NOT EXISTS idx_org_members_org_role 
ON organization_members(organization_id, role);

-- STEP 6: Brand documents indexes (for RAG)
-- Already has embedding index from previous migration
-- Add index for document type filtering
CREATE INDEX IF NOT EXISTS idx_brand_documents_type 
ON brand_documents(brand_id, doc_type);

-- Index for updated documents
CREATE INDEX IF NOT EXISTS idx_brand_documents_updated 
ON brand_documents(brand_id, updated_at DESC);

-- STEP 7: Profiles indexes
-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email);

-- Index for user_id lookups (for joins)
CREATE INDEX IF NOT EXISTS idx_profiles_user 
ON profiles(user_id);

-- ========================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ========================================

-- Function to get conversation with message count (optimized)
CREATE OR REPLACE FUNCTION get_conversation_with_count(conv_id UUID)
RETURNS TABLE (
  id UUID,
  brand_id UUID,
  user_id UUID,
  title TEXT,
  model TEXT,
  conversation_type TEXT,
  mode TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  message_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.*,
    COUNT(m.id) as message_count
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE c.id = conv_id
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get conversations with message counts (batch optimized)
CREATE OR REPLACE FUNCTION get_brand_conversations_with_counts(
  p_brand_id UUID,
  p_conversation_type TEXT DEFAULT 'email',
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  brand_id UUID,
  user_id UUID,
  title TEXT,
  model TEXT,
  conversation_type TEXT,
  mode TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  organization_id UUID,
  message_count BIGINT,
  last_message_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.*,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE c.brand_id = p_brand_id
    AND c.conversation_type = p_conversation_type
  GROUP BY c.id
  ORDER BY c.updated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- ANALYZE TABLES
-- ========================================
-- Update table statistics for query planner

ANALYZE conversations;
ANALYZE messages;
ANALYZE brands;
ANALYZE organization_members;
ANALYZE brand_documents;
ANALYZE profiles;

-- ========================================
-- VACUUM (optional, run separately if needed)
-- ========================================
-- VACUUM ANALYZE conversations;
-- VACUUM ANALYZE messages;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these to verify indexes were created

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('conversations', 'messages', 'brands', 'organization_members', 'brand_documents', 'profiles')
ORDER BY tablename, indexname;

-- Check index usage (run after some queries)
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ========================================
-- PERFORMANCE IMPROVEMENT NOTES
-- ========================================
-- Expected improvements:
-- 1. Conversation list loading: 3-5x faster
-- 2. Message loading: 2-3x faster  
-- 3. Filtered queries: 5-10x faster
-- 4. Metadata searches: 10-20x faster
--
-- These indexes optimize:
-- - Brand conversation listings
-- - Message loading by conversation
-- - User filtering
-- - Team collaboration queries
-- - Document searches (RAG)
-- - JSONB metadata queries
-- ========================================

