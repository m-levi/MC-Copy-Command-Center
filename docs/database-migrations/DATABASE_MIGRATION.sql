-- ========================================
-- ENHANCED CHAT INTELLIGENCE DATABASE MIGRATION
-- ========================================
-- This migration adds support for:
-- - Conversation memory and context
-- - RAG (Retrieval Augmented Generation)
-- - Message editing
-- - Message metadata storage
-- ========================================

-- STEP 1: Enable pgvector extension for RAG
-- This is required for semantic search with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- STEP 2: Add metadata column to messages table
-- Stores conversation context, reactions, and other message-specific data
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- STEP 3: Add message editing support
-- Tracks when messages were edited and relationships between edited versions
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- STEP 4: Create brand_documents table for RAG
-- Stores documents that provide additional context to the AI
CREATE TABLE IF NOT EXISTS brand_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('example', 'competitor', 'research', 'testimonial')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 5: Create index for vector similarity search
-- This enables fast semantic search using cosine similarity
CREATE INDEX IF NOT EXISTS brand_documents_embedding_idx 
ON brand_documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- STEP 6: Create brand_documents brand_id index for filtering
CREATE INDEX IF NOT EXISTS brand_documents_brand_id_idx 
ON brand_documents(brand_id);

-- STEP 7: Create conversation_summaries table
-- Stores periodic summaries to maintain context without token bloat
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  message_count INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 8: Create index for conversation summaries
CREATE INDEX IF NOT EXISTS conversation_summaries_conversation_id_idx 
ON conversation_summaries(conversation_id, created_at DESC);

-- STEP 9: Enable Row Level Security for new tables
ALTER TABLE brand_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- STEP 10: Create RLS policies for brand_documents
-- Users can only access documents for their own brands
CREATE POLICY "Users can view own brand documents" ON brand_documents
  FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own brand documents" ON brand_documents
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own brand documents" ON brand_documents
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own brand documents" ON brand_documents
  FOR DELETE
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()
    )
  );

-- STEP 11: Create RLS policies for conversation_summaries
-- Users can only access summaries for their own conversations
CREATE POLICY "Users can view own conversation summaries" ON conversation_summaries
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own conversation summaries" ON conversation_summaries
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- STEP 12: Create function for vector similarity search
-- This function is used by the RAG service to find relevant documents
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  brand_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  brand_id uuid,
  doc_type text,
  title text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    brand_documents.id,
    brand_documents.brand_id,
    brand_documents.doc_type,
    brand_documents.title,
    brand_documents.content,
    1 - (brand_documents.embedding <=> query_embedding) AS similarity
  FROM brand_documents
  WHERE 
    (brand_id_filter IS NULL OR brand_documents.brand_id = brand_id_filter)
    AND (1 - (brand_documents.embedding <=> query_embedding)) > match_threshold
  ORDER BY brand_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- STEP 13: Create updated_at trigger function for brand_documents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 14: Create trigger for brand_documents
CREATE TRIGGER update_brand_documents_updated_at
    BEFORE UPDATE ON brand_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Verify all tables and indexes were created successfully
-- 3. Test the RAG functionality by uploading a brand document
-- 4. Monitor performance and adjust ivfflat lists parameter if needed
-- ========================================



















