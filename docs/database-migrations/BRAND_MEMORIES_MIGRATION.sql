-- Brand Memories System
-- Persistent memory/notes storage for brands
-- Allows storing important facts, preferences, and notes about specific brands

-- Create brand_memories table
CREATE TABLE IF NOT EXISTS brand_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'preference', 'guideline', 'fact', 'dos_donts')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_memories_brand 
ON brand_memories(brand_id);

CREATE INDEX IF NOT EXISTS idx_brand_memories_category 
ON brand_memories(brand_id, category);

CREATE INDEX IF NOT EXISTS idx_brand_memories_updated 
ON brand_memories(updated_at DESC);

-- Enable RLS
ALTER TABLE brand_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view memories for brands they have access to
CREATE POLICY "Users can view brand memories"
ON brand_memories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id = brand_memories.brand_id
    AND (
      brands.user_id = auth.uid()
      OR brands.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Users can insert memories for brands they have access to
CREATE POLICY "Users can insert brand memories"
ON brand_memories
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id = brand_memories.brand_id
    AND (
      brands.user_id = auth.uid()
      OR brands.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Users can update memories for brands they have access to
CREATE POLICY "Users can update brand memories"
ON brand_memories
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id = brand_memories.brand_id
    AND (
      brands.user_id = auth.uid()
      OR brands.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Users can delete memories for brands they have access to
CREATE POLICY "Users can delete brand memories"
ON brand_memories
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id = brand_memories.brand_id
    AND (
      brands.user_id = auth.uid()
      OR brands.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_memories_updated_at
BEFORE UPDATE ON brand_memories
FOR EACH ROW
EXECUTE FUNCTION update_brand_memories_updated_at();

