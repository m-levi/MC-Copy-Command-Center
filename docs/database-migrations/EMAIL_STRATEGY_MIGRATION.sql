-- Add strategy column to messages table for storing email strategy content
-- This allows separation of email strategy/planning from actual email copy

-- Add strategy column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS strategy TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN messages.strategy IS 'Email strategy content extracted from AI response, separate from the actual email copy';

-- Create index for better query performance when filtering by strategy content
CREATE INDEX IF NOT EXISTS idx_messages_has_strategy ON messages ((strategy IS NOT NULL));

-- Grant appropriate permissions (adjust as needed for your setup)
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- Existing RLS policies should cover this column automatically

