-- Unified Conversation Memory System
-- Persistent context storage that works with both Claude and OpenAI models

-- Create conversation_memories table
CREATE TABLE IF NOT EXISTS conversation_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('user_preference', 'brand_context', 'campaign_info', 'product_details', 'decision', 'fact')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Ensure unique keys per conversation
  UNIQUE(conversation_id, key)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_memories_conversation 
ON conversation_memories(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_memories_category 
ON conversation_memories(conversation_id, category);

CREATE INDEX IF NOT EXISTS idx_conversation_memories_expires 
ON conversation_memories(expires_at) 
WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE conversation_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view memories for conversations they have access to
CREATE POLICY "Users can view conversation memories"
ON conversation_memories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_memories.conversation_id
    AND (
      conversations.user_id = auth.uid()
      OR conversations.brand_id IN (
        SELECT brand_id FROM brands
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  )
);

-- Users can insert memories for conversations they have access to
CREATE POLICY "Users can insert conversation memories"
ON conversation_memories
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_memories.conversation_id
    AND (
      conversations.user_id = auth.uid()
      OR conversations.brand_id IN (
        SELECT brand_id FROM brands
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  )
);

-- Users can update memories for conversations they have access to
CREATE POLICY "Users can update conversation memories"
ON conversation_memories
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_memories.conversation_id
    AND (
      conversations.user_id = auth.uid()
      OR conversations.brand_id IN (
        SELECT brand_id FROM brands
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  )
);

-- Users can delete memories for conversations they have access to
CREATE POLICY "Users can delete conversation memories"
ON conversation_memories
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_memories.conversation_id
    AND (
      conversations.user_id = auth.uid()
      OR conversations.brand_id IN (
        SELECT brand_id FROM brands
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  )
);

-- Add comment
COMMENT ON TABLE conversation_memories IS 'Persistent memory storage for AI conversations - works with both Claude and OpenAI models';


