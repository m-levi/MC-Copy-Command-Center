-- Lock Conversation Modes Migration
-- This migration ensures all conversations have a permanent mode set
-- and removes the ability to toggle modes mid-conversation

-- Set default mode for conversations without one
UPDATE conversations
SET mode = 'email_copy'
WHERE mode IS NULL;

-- Make mode column required (not null)
ALTER TABLE conversations
ALTER COLUMN mode SET NOT NULL;

-- Set default for new conversations
ALTER TABLE conversations
ALTER COLUMN mode SET DEFAULT 'email_copy';

-- Add comment explaining that mode is permanent
COMMENT ON COLUMN conversations.mode IS 'Conversation mode (planning or email_copy) - set at creation, cannot be changed';

-- Ensure flow conversations are in email_copy mode
UPDATE conversations
SET mode = 'email_copy'
WHERE is_flow = true AND mode != 'email_copy';

