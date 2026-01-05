-- Migration: Prompt Library
-- Saved prompts that can be quickly sent in chat

-- Create saved_prompts table
CREATE TABLE IF NOT EXISTS saved_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Display
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10) NOT NULL DEFAULT '💬',
  
  -- The actual prompt
  prompt TEXT NOT NULL,
  
  -- Where this shows (array of modes: email_copy, flow, planning)
  modes TEXT[] NOT NULL DEFAULT ARRAY['email_copy'],
  
  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_prompts_user_id ON saved_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_active ON saved_prompts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_order ON saved_prompts(user_id, sort_order);

-- RLS Policies
ALTER TABLE saved_prompts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own prompts
CREATE POLICY "Users can view own prompts"
  ON saved_prompts FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own prompts
CREATE POLICY "Users can create own prompts"
  ON saved_prompts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own prompts
CREATE POLICY "Users can update own prompts"
  ON saved_prompts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own prompts (except defaults)
CREATE POLICY "Users can delete own non-default prompts"
  ON saved_prompts FOR DELETE
  USING (user_id = auth.uid() AND is_default = false);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_saved_prompts_updated_at ON saved_prompts;
CREATE TRIGGER trigger_saved_prompts_updated_at
  BEFORE UPDATE ON saved_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_prompts_updated_at();

-- Comments
COMMENT ON TABLE saved_prompts IS 'User-saved prompts for quick actions in chat';
COMMENT ON COLUMN saved_prompts.modes IS 'Array of conversation modes where this prompt appears';
COMMENT ON COLUMN saved_prompts.is_default IS 'System default prompts that cannot be deleted';























