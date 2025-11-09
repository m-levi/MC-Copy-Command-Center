-- Migration: Claude Native Memory Tool Support
-- Date: November 9, 2025
-- Description: Add support for Claude's native file-based memory tool

-- Create table for Claude memory files
CREATE TABLE IF NOT EXISTS claude_memory_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: One file path per conversation
  UNIQUE(conversation_id, file_path)
);

-- Index for fast lookups
CREATE INDEX idx_claude_memory_conversation ON claude_memory_files(conversation_id);
CREATE INDEX idx_claude_memory_path ON claude_memory_files(file_path);

-- Enable RLS
ALTER TABLE claude_memory_files ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access memory files for their conversations
CREATE POLICY "Users can access their conversation memory files"
  ON claude_memory_files
  FOR ALL
  USING (
    conversation_id IN (
      SELECT c.id
      FROM conversations c
      JOIN brands b ON c.brand_id = b.id
      JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON claude_memory_files TO authenticated;
GRANT ALL ON claude_memory_files TO service_role;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_claude_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER claude_memory_updated_at_trigger
  BEFORE UPDATE ON claude_memory_files
  FOR EACH ROW
  EXECUTE FUNCTION update_claude_memory_updated_at();

-- Migration complete
-- To apply: Run this SQL in your Supabase SQL editor

