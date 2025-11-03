-- Add thinking column to messages table for extended AI reasoning content
-- This stores the internal thought process from Claude's extended thinking or GPT's reasoning

-- Add thinking column to store extended thinking/reasoning content
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS thinking TEXT;

-- Add index for filtering messages with thinking content
CREATE INDEX IF NOT EXISTS idx_messages_thinking 
ON messages(conversation_id) 
WHERE thinking IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN messages.thinking IS 'Extended thinking/reasoning content from AI models (Claude extended thinking or GPT reasoning)';


