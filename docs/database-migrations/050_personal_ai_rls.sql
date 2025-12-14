-- ========================================
-- Personal AI RLS Policy Updates
-- ========================================
-- This migration adds support for the Personal AI feature
-- which allows users to chat with AI without brand context.
-- The Personal AI uses a reserved brand ID: 00000000-0000-0000-0000-000000000001
-- ========================================

-- Define the Personal AI brand ID as a constant
-- This ID is reserved and should never be used for actual brands
DO $$
BEGIN
  -- Create an immutable function to return the Personal AI brand ID
  CREATE OR REPLACE FUNCTION personal_ai_brand_id()
  RETURNS UUID AS $func$
    SELECT '00000000-0000-0000-0000-000000000001'::UUID;
  $func$ LANGUAGE SQL IMMUTABLE;
END $$;

-- ============================================================================
-- PART 1: UPDATE CONVERSATIONS POLICIES
-- ============================================================================

-- Update SELECT policy to allow Personal AI conversations
DROP POLICY IF EXISTS "Members can view organization conversations" ON conversations;
CREATE POLICY "Members can view organization conversations"
  ON conversations
  FOR SELECT
  USING (
    -- Allow Personal AI conversations (owned by user)
    (brand_id = personal_ai_brand_id() AND user_id = auth.uid())
    OR
    -- Allow organization brand conversations (existing logic)
    EXISTS (
      SELECT 1 FROM brands b
      JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE b.id = conversations.brand_id
      AND om.user_id = (SELECT auth.uid())
    )
  );

-- Update INSERT policy to allow Personal AI conversations
DROP POLICY IF EXISTS "Members can insert conversations" ON conversations;
CREATE POLICY "Members can insert conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (
    -- Allow Personal AI conversations (user must own it)
    (brand_id = personal_ai_brand_id() AND user_id = auth.uid())
    OR
    -- Allow organization brand conversations (existing logic)
    EXISTS (
      SELECT 1 FROM brands b
      JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE b.id = conversations.brand_id
      AND om.user_id = (SELECT auth.uid())
    )
  );

-- Update UPDATE policy to allow Personal AI conversations
DROP POLICY IF EXISTS "Users can update own conversations or admins can update any" ON conversations;
CREATE POLICY "Users can update own conversations or admins can update any"
  ON conversations
  FOR UPDATE
  USING (
    -- Personal AI: user can update their own conversations
    (brand_id = personal_ai_brand_id() AND user_id = auth.uid())
    OR
    -- Regular brands: user owns the conversation
    (brand_id != personal_ai_brand_id() AND user_id = auth.uid())
    OR
    -- Regular brands: admin can update any
    EXISTS (
      SELECT 1 FROM brands b
      JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE b.id = conversations.brand_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role = 'admin'
    )
  );

-- Update DELETE policy to allow Personal AI conversations
DROP POLICY IF EXISTS "Users can delete own conversations or admins can delete any" ON conversations;
CREATE POLICY "Users can delete own conversations or admins can delete any"
  ON conversations
  FOR DELETE
  USING (
    -- Personal AI: user can delete their own conversations
    (brand_id = personal_ai_brand_id() AND user_id = auth.uid())
    OR
    -- Regular brands: user owns the conversation
    (brand_id != personal_ai_brand_id() AND user_id = auth.uid())
    OR
    -- Regular brands: admin can delete any
    EXISTS (
      SELECT 1 FROM brands b
      JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE b.id = conversations.brand_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role = 'admin'
    )
  );

-- ============================================================================
-- PART 2: UPDATE MESSAGES POLICIES
-- ============================================================================
-- Messages RLS is based on conversations, so they should work automatically
-- once conversation access is granted. However, let's ensure Personal AI
-- messages are accessible.

-- Helper function to check if user can access conversation (including Personal AI)
CREATE OR REPLACE FUNCTION can_access_conversation(conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conv_id
    AND (
      -- Personal AI: user owns the conversation
      (c.brand_id = personal_ai_brand_id() AND c.user_id = auth.uid())
      OR
      -- Regular brands: user is org member
      EXISTS (
        SELECT 1 FROM brands b
        JOIN organization_members om ON om.organization_id = b.organization_id
        WHERE b.id = c.brand_id
        AND om.user_id = auth.uid()
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PART 3: CREATE INDEX FOR PERSONAL AI QUERIES
-- ============================================================================

-- Add index for Personal AI conversations lookup
CREATE INDEX IF NOT EXISTS idx_conversations_personal_ai 
ON conversations(user_id, brand_id) 
WHERE brand_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION personal_ai_brand_id() IS 
'Returns the reserved UUID for Personal AI conversations. This is a virtual brand that does not exist in the brands table.';

COMMENT ON FUNCTION can_access_conversation(UUID) IS 
'Checks if the current user can access a conversation, including Personal AI conversations.';

COMMENT ON INDEX idx_conversations_personal_ai IS 
'Optimizes queries for Personal AI conversations by user.';

-- ============================================================================
-- PART 4: UPDATE MESSAGES RLS POLICIES
-- ============================================================================
-- Note: This section was added after initial deployment to fix messages RLS

-- SELECT policy for messages
DROP POLICY IF EXISTS "Members can view organization messages" ON messages;
CREATE POLICY "Members can view organization messages"
  ON messages
  FOR SELECT
  USING (
    -- Personal AI: user owns the conversation
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.brand_id = personal_ai_brand_id()
      AND c.user_id = auth.uid()
    )
    OR
    -- Regular brands: user is org member
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
        AND om.user_id = auth.uid()
        AND (om.status IS NULL OR om.status = 'active')
    )
  );

-- INSERT policy for messages
DROP POLICY IF EXISTS "Members can insert organization messages" ON messages;
CREATE POLICY "Members can insert organization messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    -- Personal AI: user owns the conversation
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND c.brand_id = personal_ai_brand_id()
      AND c.user_id = auth.uid()
    )
    OR
    -- Regular brands: user is org member
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = conversation_id
        AND om.user_id = auth.uid()
        AND (om.status IS NULL OR om.status = 'active')
    )
  );

-- UPDATE policy for messages  
DROP POLICY IF EXISTS "Members can update organization messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Members can update organization messages"
  ON messages
  FOR UPDATE
  USING (
    -- Personal AI: user owns the conversation
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.brand_id = personal_ai_brand_id()
      AND c.user_id = auth.uid()
    )
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
        AND om.user_id = auth.uid()
        AND (om.status IS NULL OR om.status = 'active')
    )
  );

-- DELETE policy for messages
DROP POLICY IF EXISTS "Members can delete organization messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages or admins can delete any" ON messages;
CREATE POLICY "Members can delete organization messages"
  ON messages
  FOR DELETE
  USING (
    -- Personal AI: user owns the conversation
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.brand_id = personal_ai_brand_id()
      AND c.user_id = auth.uid()
    )
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
        AND om.user_id = auth.uid()
        AND (om.status IS NULL OR om.status = 'active')
    )
  );

