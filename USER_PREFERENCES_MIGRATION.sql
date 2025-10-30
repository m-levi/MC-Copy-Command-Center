-- User Preferences Table Migration
-- This table stores user-specific preferences for the sidebar and UI

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sidebar preferences
  sidebar_view_mode TEXT DEFAULT 'list' CHECK (sidebar_view_mode IN ('list', 'grid')),
  sidebar_width INTEGER DEFAULT 398,
  
  -- Filter preferences
  default_filter TEXT DEFAULT 'all' CHECK (default_filter IN ('all', 'mine', 'person')),
  default_filter_person_id UUID,
  
  -- Pinned and archived conversations
  pinned_conversations JSONB DEFAULT '[]'::jsonb,
  archived_conversations JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one row per user
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own preferences"
  ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add columns to conversations table for enhanced features
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(brand_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(brand_id, is_archived) WHERE is_archived = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(brand_id, last_message_at DESC);

-- Create function to update last_message_at automatically
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 150)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_message_at when messages are added
DROP TRIGGER IF EXISTS messages_update_conversation ON messages;
CREATE TRIGGER messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Backfill last_message_at for existing conversations
UPDATE conversations c
SET 
  last_message_at = (
    SELECT MAX(created_at) 
    FROM messages m 
    WHERE m.conversation_id = c.id
  ),
  last_message_preview = (
    SELECT LEFT(content, 150)
    FROM messages m 
    WHERE m.conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  )
WHERE last_message_at IS NULL;







