-- ============================================================================
-- FIX MESSAGES RLS POLICY - URGENT
-- ============================================================================
-- ISSUE: Team members can see conversations but not messages inside them
-- CAUSE: Messages RLS policy checks conversation.user_id instead of organization membership
-- FIX: Update messages policies to check organization membership like conversations do
-- ============================================================================

BEGIN;

-- ============================================================================
-- DROP OLD INCORRECT POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view messages from own conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON messages;
DROP POLICY IF EXISTS "Users can delete messages from own conversations" ON messages;

-- ============================================================================
-- CREATE CORRECT POLICIES - CHECK ORGANIZATION MEMBERSHIP
-- ============================================================================

-- SELECT: Team members can view messages in organization conversations
CREATE POLICY "Members can view organization messages"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN brands b ON b.id = c.brand_id
      JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
      AND om.user_id = (SELECT auth.uid())
    )
  );

-- INSERT: Team members can insert messages to organization conversations
CREATE POLICY "Members can insert organization messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN brands b ON b.id = c.brand_id
      JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
      AND om.user_id = (SELECT auth.uid())
    )
  );

-- UPDATE: Users can update their own messages OR admins can update any
CREATE POLICY "Users can update own messages or admins can update any"
  ON messages
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM conversations c
      JOIN brands b ON b.id = c.brand_id
      JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role = 'admin'
    )
  );

-- DELETE: Users can delete their own messages OR admins can delete any
CREATE POLICY "Users can delete own messages or admins can delete any"
  ON messages
  FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM conversations c
      JOIN brands b ON b.id = c.brand_id
      JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role = 'admin'
    )
  );

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check the new policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'messages' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- ============================================================================
-- TESTING
-- ============================================================================
-- After running this migration:
-- 1. User A creates a conversation and messages
-- 2. User B (same organization) should now be able to:
--    ✅ See the conversation
--    ✅ See all messages inside it
--    ✅ Add new messages
--    ✅ Edit/delete their own messages
-- 3. User B (if admin) should also be able to:
--    ✅ Edit any message
--    ✅ Delete any message
-- ============================================================================

