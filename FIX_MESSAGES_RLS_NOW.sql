-- ============================================================================
-- EMERGENCY FIX: Messages RLS Policy Issue
-- ============================================================================
-- ERROR: "new row violates row-level security policy for table messages"
-- SOLUTION: Fix the INSERT policy to properly check organization membership
-- ============================================================================

BEGIN;

-- First, let's see what policies currently exist
-- (Run this query separately to diagnose)
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'messages' AND schemaname = 'public'
-- ORDER BY cmd;

-- ============================================================================
-- STEP 1: Remove all existing messages policies
-- ============================================================================

DROP POLICY IF EXISTS "Members can insert organization messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON messages;
DROP POLICY IF EXISTS "Members can view organization messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages from own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update own messages or admins can update any" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages or admins can delete any" ON messages;

-- ============================================================================
-- STEP 2: Create correct policies
-- ============================================================================

-- SELECT policy: Allow members to view messages in their organization
CREATE POLICY "Members can view organization messages"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- INSERT policy: Allow members to insert messages to their organization conversations
-- CRITICAL: This must check the conversation_id column, not messages.conversation_id
CREATE POLICY "Members can insert organization messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = conversation_id  -- Note: using conversation_id directly, not messages.conversation_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- UPDATE policy: Users can update their own messages
CREATE POLICY "Users can update own messages"
  ON messages
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- DELETE policy: Users can delete their own messages or admins can delete any
CREATE POLICY "Users can delete own messages or admins can delete any"
  ON messages
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- ============================================================================
-- STEP 3: Ensure metadata column exists
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE messages ADD COLUMN metadata JSONB;
    COMMENT ON COLUMN messages.metadata IS 'Additional metadata (product links, etc)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'thinking'
  ) THEN
    ALTER TABLE messages ADD COLUMN thinking TEXT;
    COMMENT ON COLUMN messages.thinking IS 'AI thinking/reasoning content';
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_messages_metadata 
  ON messages USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_user
  ON messages(conversation_id, user_id);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check policies (should show 4 policies)
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as check_clause
FROM pg_policies 
WHERE tablename = 'messages' 
  AND schemaname = 'public'
ORDER BY cmd;

-- Check columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'messages'
  AND column_name IN ('conversation_id', 'user_id', 'content', 'thinking', 'metadata')
ORDER BY column_name;

-- ============================================================================
-- TESTING QUERY
-- ============================================================================
-- Run this to verify the policy will work for your current user:
-- (Replace 'YOUR_CONVERSATION_ID' with an actual conversation ID)
--
-- SELECT 
--   c.id as conversation_id,
--   c.brand_id,
--   b.organization_id,
--   om.user_id,
--   om.status,
--   auth.uid() as current_user,
--   CASE 
--     WHEN om.user_id = auth.uid() AND om.status = 'active' THEN '✅ Can insert'
--     ELSE '❌ Cannot insert'
--   END as can_insert_messages
-- FROM conversations c
-- INNER JOIN brands b ON b.id = c.brand_id
-- INNER JOIN organization_members om ON om.organization_id = b.organization_id
-- WHERE c.id = 'YOUR_CONVERSATION_ID';
--
-- If this returns no rows, the problem is:
-- 1. User isn't in organization_members table
-- 2. User's status isn't 'active'
-- 3. Brand isn't linked to conversation
-- ============================================================================

