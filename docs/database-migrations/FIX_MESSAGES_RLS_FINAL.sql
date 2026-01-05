-- ============================================================================
-- FINAL FIX: Messages RLS Policy Issue with SECURITY DEFINER Functions
-- ============================================================================
-- ERROR: "new row violates row-level security policy for table messages"
-- CAUSE: Messages policies query conversations table (with RLS), causing
--        recursive permission checks that can fail
-- SOLUTION: Use SECURITY DEFINER functions to bypass RLS in permission checks
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create SECURITY DEFINER functions for permission checks
-- ============================================================================

-- Function to check if user can insert/view/update/delete messages
CREATE OR REPLACE FUNCTION can_user_insert_message(conversation_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is a member of the organization that owns this conversation
  RETURN EXISTS (
    SELECT 1
    FROM conversations c
    INNER JOIN brands b ON c.brand_id = b.id
    INNER JOIN organization_members om ON b.organization_id = om.organization_id
    WHERE c.id = conversation_id_param
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  );
END;
$$;

-- Function to check if conversation is publicly shared
CREATE OR REPLACE FUNCTION is_conversation_shared(conversation_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if conversation has a valid share link (not expired)
  RETURN EXISTS (
    SELECT 1
    FROM conversation_shares
    WHERE conversation_id = conversation_id_param
    AND share_type = 'link'
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;

-- Add comments
COMMENT ON FUNCTION can_user_insert_message IS 
'Checks if user can access messages in a conversation by verifying organization membership. Uses SECURITY DEFINER to bypass RLS.';

COMMENT ON FUNCTION is_conversation_shared IS 
'Checks if a conversation is publicly shared via link. Uses SECURITY DEFINER to bypass RLS.';

-- ============================================================================
-- STEP 2: Drop all existing messages policies
-- ============================================================================

DROP POLICY IF EXISTS "Members can insert organization messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON messages;
DROP POLICY IF EXISTS "Members can view organization messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages from own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update own messages or admins can update any" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages or admins can delete any" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Members can update organization messages" ON messages;
DROP POLICY IF EXISTS "Members can delete organization messages" ON messages;
DROP POLICY IF EXISTS "Anyone can view messages in shared conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their org conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their org conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their org conversations" ON messages;
DROP POLICY IF EXISTS "Users can delete messages in their org conversations" ON messages;

-- ============================================================================
-- STEP 3: Create new policies using SECURITY DEFINER functions
-- ============================================================================

-- SELECT policy: Allow organization members to view their messages
-- AND allow anyone to view messages in publicly shared conversations
CREATE POLICY "Users can view messages in their org conversations"
  ON messages
  FOR SELECT
  USING (
    can_user_insert_message(conversation_id) 
    OR is_conversation_shared(conversation_id)
  );

-- INSERT policy: Allow organization members to insert messages
CREATE POLICY "Users can insert messages in their org conversations"
  ON messages
  FOR INSERT
  WITH CHECK (
    can_user_insert_message(conversation_id)
  );

-- UPDATE policy: Allow organization members to update messages
CREATE POLICY "Users can update messages in their org conversations"
  ON messages
  FOR UPDATE
  USING (
    can_user_insert_message(conversation_id)
  );

-- DELETE policy: Allow organization members to delete messages
CREATE POLICY "Users can delete messages in their org conversations"
  ON messages
  FOR DELETE
  USING (
    can_user_insert_message(conversation_id)
  );

-- ============================================================================
-- STEP 4: Verify the setup
-- ============================================================================

-- Add comments for documentation
COMMENT ON POLICY "Users can view messages in their org conversations" ON messages IS 
'Allows organization members to view messages and public access via share links';

COMMENT ON POLICY "Users can insert messages in their org conversations" ON messages IS 
'Allows organization members to insert messages using SECURITY DEFINER function';

COMMENT ON POLICY "Users can update messages in their org conversations" ON messages IS 
'Allows organization members to update messages using SECURITY DEFINER function';

COMMENT ON POLICY "Users can delete messages in their org conversations" ON messages IS 
'Allows organization members to delete messages using SECURITY DEFINER function';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these separately to test)
-- ============================================================================

-- Check that functions exist
-- SELECT routine_name, security_type 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN ('can_user_insert_message', 'is_conversation_shared');

-- Check that policies are correct
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'messages' 
-- AND schemaname = 'public'
-- ORDER BY cmd, policyname;

-- Test the function (should return true for conversations in your org)
-- SELECT id, can_user_insert_message(id) as can_insert
-- FROM conversations
-- LIMIT 5;




















