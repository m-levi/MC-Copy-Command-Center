-- ========================================
-- PLANNING MODE DATABASE MIGRATION
-- ========================================
-- This migration adds support for planning mode in conversations
-- Planning mode allows users to discuss email strategy before creating copy
-- ========================================

-- Add mode column to conversations table
-- Default to 'planning' for new conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS mode TEXT CHECK (mode IN ('planning', 'email_copy')) DEFAULT 'planning';

-- Create index for filtering by mode (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS conversations_mode_idx 
ON conversations(mode);

-- Update existing conversations to have a mode
-- Set to 'email_copy' for conversations with messages (assumed to be in copy mode)
-- Keep 'planning' for new/empty conversations
UPDATE conversations 
SET mode = CASE 
  WHEN EXISTS (
    SELECT 1 FROM messages WHERE messages.conversation_id = conversations.id
  ) THEN 'email_copy'
  ELSE 'planning'
END
WHERE mode IS NULL;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Verify the mode column was added successfully
-- 3. Test switching between planning and email copy modes
-- ========================================

