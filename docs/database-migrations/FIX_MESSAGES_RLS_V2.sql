-- ============================================================================
-- FIX v2: Messages RLS Policy - Handle NULL brand_id
-- ============================================================================
-- ERROR: "new row violates row-level security policy for table messages"
-- ROOT CAUSE: Previous fix used INNER JOIN which fails when brand_id is NULL
-- SOLUTION: Handle NULL brand_id case AND use SECURITY DEFINER functions
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop existing functions (if they exist)
-- ============================================================================

DROP FUNCTION IF EXISTS can_user_insert_message(UUID);
DROP FUNCTION IF EXISTS is_conversation_shared(UUID);

-- ============================================================================
-- STEP 2: Create improved SECURITY DEFINER functions
-- ============================================================================

-- Function to check if user can access messages in a conversation
-- Handles THREE cases:
-- 1. Conversation has a brand_id -> check organization membership
-- 2. Conversation has NO brand_id -> check if user owns the conversation
-- 3. Conversation is shared -> allow public access
CREATE OR REPLACE FUNCTION can_user_access_conversation(conversation_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_brand_id UUID;
  conv_user_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- Return false if no authenticated user
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get conversation details
  SELECT brand_id, user_id INTO conv_brand_id, conv_user_id
  FROM conversations
  WHERE id = conversation_id_param;

  -- Conversation not found
  IF conv_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Case 1: User owns the conversation (always allowed)
  IF conv_user_id = current_user_id THEN
    RETURN TRUE;
  END IF;

  -- Case 2: Conversation has a brand - check organization membership
  IF conv_brand_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM brands b
      INNER JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE b.id = conv_brand_id
      AND om.user_id = current_user_id
      AND om.status = 'active'
    );
  END IF;

  -- Case 3: No brand_id and user doesn't own it - deny access
  RETURN FALSE;
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
COMMENT ON FUNCTION can_user_access_conversation IS
'Checks if user can access a conversation. Handles: (1) user owns conversation, (2) organization membership via brand, (3) null brand_id cases. Uses SECURITY DEFINER to bypass RLS.';

COMMENT ON FUNCTION is_conversation_shared IS
'Checks if a conversation is publicly shared via link. Uses SECURITY DEFINER to bypass RLS.';

-- ============================================================================
-- STEP 3: Drop all existing messages policies
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

-- Also drop the old function if it exists (different name)
DROP FUNCTION IF EXISTS can_user_insert_message(UUID);

-- ============================================================================
-- STEP 4: Create new policies using improved functions
-- ============================================================================

-- SELECT policy: Allow access if user can access conversation OR it's shared
CREATE POLICY "Users can view messages in accessible conversations"
  ON messages
  FOR SELECT
  USING (
    can_user_access_conversation(conversation_id)
    OR is_conversation_shared(conversation_id)
  );

-- INSERT policy: Allow insert if user can access conversation
CREATE POLICY "Users can insert messages in accessible conversations"
  ON messages
  FOR INSERT
  WITH CHECK (
    can_user_access_conversation(conversation_id)
  );

-- UPDATE policy: Allow update if user can access conversation
CREATE POLICY "Users can update messages in accessible conversations"
  ON messages
  FOR UPDATE
  USING (
    can_user_access_conversation(conversation_id)
  );

-- DELETE policy: Allow delete if user can access conversation
CREATE POLICY "Users can delete messages in accessible conversations"
  ON messages
  FOR DELETE
  USING (
    can_user_access_conversation(conversation_id)
  );

-- ============================================================================
-- STEP 5: Add documentation comments
-- ============================================================================

COMMENT ON POLICY "Users can view messages in accessible conversations" ON messages IS
'Allows users to view messages in conversations they can access (own, org member, or shared)';

COMMENT ON POLICY "Users can insert messages in accessible conversations" ON messages IS
'Allows users to insert messages in conversations they can access';

COMMENT ON POLICY "Users can update messages in accessible conversations" ON messages IS
'Allows users to update messages in conversations they can access';

COMMENT ON POLICY "Users can delete messages in accessible conversations" ON messages IS
'Allows users to delete messages in conversations they can access';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these separately to test)
-- ============================================================================

-- Check that functions exist with correct security type
-- SELECT routine_name, security_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN ('can_user_access_conversation', 'is_conversation_shared');

-- Check that policies are correct
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'messages'
-- AND schemaname = 'public'
-- ORDER BY cmd, policyname;

-- Test the function (should return true for your conversations)
-- SELECT id, brand_id, user_id, can_user_access_conversation(id) as can_access
-- FROM conversations
-- WHERE user_id = auth.uid()
-- LIMIT 5;
