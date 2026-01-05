-- Migration: Add archived_at timestamp and auto-cleanup for 90-day archive policy
-- Created: 2024-12-30
-- Description: Adds archived_at column to conversations and creates a scheduled job to delete archived conversations after 90 days

-- Step 1: Add archived_at column to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Step 2: Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_conversations_archived_at
ON conversations (archived_at)
WHERE archived_at IS NOT NULL;

-- Step 3: Backfill archived_at for existing archived conversations
-- Set archived_at to updated_at for conversations that are already archived
UPDATE conversations
SET archived_at = updated_at
WHERE is_archived = true AND archived_at IS NULL;

-- Step 4: Create function to delete old archived conversations
CREATE OR REPLACE FUNCTION delete_old_archived_conversations()
RETURNS void AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete conversations that have been archived for more than 90 days
  WITH deleted AS (
    DELETE FROM conversations
    WHERE is_archived = true
      AND archived_at IS NOT NULL
      AND archived_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  -- Log the cleanup
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % archived conversations older than 90 days', deleted_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a scheduled job to run cleanup daily at 3 AM UTC
-- Note: This requires pg_cron extension to be enabled in Supabase
-- Run in Supabase SQL Editor:
-- SELECT cron.schedule(
--   'cleanup-archived-conversations',
--   '0 3 * * *',
--   $$SELECT delete_old_archived_conversations()$$
-- );

-- Alternatively, if pg_cron is not available, you can call this function manually
-- or set up an external cron job to call this API endpoint

-- Step 6: Create a function to archive a conversation with timestamp
CREATE OR REPLACE FUNCTION archive_conversation(conversation_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE conversations
  SET is_archived = true, archived_at = NOW()
  WHERE id = conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create a function to unarchive a conversation (clears timestamp)
CREATE OR REPLACE FUNCTION unarchive_conversation(conversation_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE conversations
  SET is_archived = false, archived_at = NULL
  WHERE id = conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Verification query to check archived conversations and their ages
-- SELECT id, title, archived_at,
--        EXTRACT(DAY FROM NOW() - archived_at) as days_archived
-- FROM conversations
-- WHERE is_archived = true
-- ORDER BY archived_at ASC;
