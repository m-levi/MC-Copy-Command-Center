-- ============================================================================
-- FIX RLS POLICIES FOR MESSAGES TABLE
-- ============================================================================
-- This fixes 403 errors when accessing messages in the deployed app
-- Run this in your Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop all existing messages policies
-- ============================================================================

DROP POLICY IF EXISTS "Members can insert organization messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON messages;
DROP POLICY IF EXISTS "Members can view organization messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages from own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update own messages or admins can update any" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages or admins can delete any" ON messages;

-- ============================================================================
-- STEP 2: Create correct RLS policies for messages
-- ============================================================================

-- SELECT policy: Allow organization members to view messages in their organization
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
    )
  );

-- INSERT policy: Allow organization members to insert messages
CREATE POLICY "Members can insert organization messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = conversation_id
        AND om.user_id = auth.uid()
    )
  );

-- UPDATE policy: Organization members can update messages in their conversations
CREATE POLICY "Members can update organization messages"
  ON messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
        AND om.user_id = auth.uid()
    )
  );

-- DELETE policy: Organization members can delete messages in their conversations
CREATE POLICY "Members can delete organization messages"
  ON messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
        AND om.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 3: Verify RLS is enabled on messages table
-- ============================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create indexes to improve RLS policy performance
-- ============================================================================

-- Index to speed up conversation_id lookups in RLS policies
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Index to speed up role lookups
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- ============================================================================
-- VERIFICATION QUERIES (run these separately to verify the fix)
-- ============================================================================

-- Check that all 4 policies exist
-- SELECT policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'messages' AND schemaname = 'public'
-- ORDER BY cmd;

-- Expected output:
-- policyname                                    | cmd
-- ---------------------------------------------+--------
-- Members can delete organization messages      | DELETE
-- Members can insert organization messages      | INSERT
-- Members can view organization messages        | SELECT
-- Members can update organization messages      | UPDATE

COMMIT;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- Your messages RLS policies are now properly configured.
-- The 403 errors should be resolved.
-- ============================================================================

