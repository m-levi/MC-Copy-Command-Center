-- ============================================================================
-- FIX MESSAGES RLS POLICY FOR METADATA FIELD
-- ============================================================================
-- ISSUE: Messages with metadata field are being blocked by RLS policy
-- SOLUTION: Verify RLS policy allows JSON metadata and all message types
-- ============================================================================

BEGIN;

-- First, let's check current RLS policies
-- Run this query to see what policies exist:
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'messages' AND schemaname = 'public';

-- Drop existing policies if they exist (we'll recreate them)
DROP POLICY IF EXISTS "Members can insert organization messages" ON messages;

-- Recreate INSERT policy with better error handling
-- This policy allows any organization member to insert messages
CREATE POLICY "Members can insert organization messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    -- Check if user is member of the organization that owns this conversation's brand
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = conversation_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Ensure metadata column exists and accepts JSONB
-- (It should already exist, but let's verify)
DO $$ 
BEGIN
  -- Check if metadata column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'metadata'
  ) THEN
    -- Add metadata column if it doesn't exist
    ALTER TABLE messages ADD COLUMN metadata JSONB;
    COMMENT ON COLUMN messages.metadata IS 'Additional metadata for messages (e.g., product links, attachments)';
  END IF;
END $$;

-- Create index on metadata for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_metadata 
  ON messages USING gin(metadata);

-- Verify the policy works by checking these conditions:
-- 1. User must be authenticated (auth.uid() returns a value)
-- 2. Conversation must exist
-- 3. Brand must exist and be linked to conversation
-- 4. User must be an active member of the brand's organization

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check the new policy
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'messages' 
  AND schemaname = 'public'
  AND policyname = 'Members can insert organization messages';

-- Check metadata column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'messages'
  AND column_name IN ('metadata', 'thinking', 'content');

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================
-- If inserts still fail, run this query while authenticated as the user:
--
-- SELECT 
--   c.id as conversation_id,
--   b.id as brand_id,
--   b.organization_id,
--   om.user_id,
--   om.status,
--   auth.uid() as current_user
-- FROM conversations c
-- INNER JOIN brands b ON b.id = c.brand_id
-- INNER JOIN organization_members om ON om.organization_id = b.organization_id
-- WHERE c.id = 'YOUR_CONVERSATION_ID'
--   AND om.user_id = auth.uid();
--
-- This should return a row. If it doesn't, the user isn't properly linked to the organization.
-- ============================================================================


