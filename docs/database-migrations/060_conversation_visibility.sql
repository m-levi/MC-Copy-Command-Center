-- ========================================
-- CONVERSATION VISIBILITY MIGRATION
-- ========================================
-- This migration adds private-by-default conversations with easy team sharing.
-- 
-- By default, conversations are now PRIVATE (only visible to creator).
-- Users can quickly share conversations with the entire organization with one click.
-- ========================================

-- STEP 1: Add visibility column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' 
CHECK (visibility IN ('private', 'team'));

-- Add comment for documentation
COMMENT ON COLUMN conversations.visibility IS 'Controls who can see this conversation: private (only creator) or team (all org members)';

-- STEP 2: Create index for filtering by visibility
CREATE INDEX IF NOT EXISTS idx_conversations_visibility 
ON conversations(brand_id, visibility);

-- Composite index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_conversations_visibility_user 
ON conversations(brand_id, user_id, visibility);

-- ============================================================================
-- STEP 3: UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Members can view organization conversations" ON conversations;

-- Create new SELECT policy that respects visibility
CREATE POLICY "Members can view organization conversations"
  ON conversations
  FOR SELECT
  USING (
    -- Allow Personal AI conversations (owned by user only)
    (brand_id = personal_ai_brand_id() AND user_id = auth.uid())
    OR
    -- Allow conversations user owns (regardless of visibility)
    (user_id = auth.uid())
    OR
    -- Allow team-visible conversations in user's organization
    (
      visibility = 'team'
      AND EXISTS (
        SELECT 1 FROM brands b
        JOIN organization_members om ON om.organization_id = b.organization_id
        WHERE b.id = conversations.brand_id
        AND om.user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- STEP 4: UPDATE MESSAGES RLS POLICIES
-- ============================================================================
-- Messages should follow conversation visibility

-- Drop and recreate the helper function to include visibility check
CREATE OR REPLACE FUNCTION can_user_view_conversation(conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conv_id
    AND (
      -- User owns the conversation
      c.user_id = auth.uid()
      OR
      -- Team visibility and user is in org
      (
        c.visibility = 'team'
        AND EXISTS (
          SELECT 1 FROM brands b
          JOIN organization_members om ON om.organization_id = b.organization_id
          WHERE b.id = c.brand_id
          AND om.user_id = auth.uid()
        )
      )
      OR
      -- Personal AI owned by user
      (c.brand_id = personal_ai_brand_id() AND c.user_id = auth.uid())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update messages SELECT policy to use the new function
DROP POLICY IF EXISTS "Users can view messages in their org conversations" ON messages;
CREATE POLICY "Users can view messages in their org conversations"
  ON messages
  FOR SELECT
  USING (can_user_view_conversation(conversation_id));

-- ============================================================================
-- STEP 5: UPDATE INSERT/UPDATE/DELETE POLICIES FOR MESSAGES
-- ============================================================================
-- Users should only be able to insert/update/delete messages in conversations they own
-- OR in team conversations where they are org members

CREATE OR REPLACE FUNCTION can_user_modify_conversation(conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conv_id
    AND (
      -- User owns the conversation
      c.user_id = auth.uid()
      OR
      -- Team visibility and user is in org (can participate)
      (
        c.visibility = 'team'
        AND EXISTS (
          SELECT 1 FROM brands b
          JOIN organization_members om ON om.organization_id = b.organization_id
          WHERE b.id = c.brand_id
          AND om.user_id = auth.uid()
        )
      )
      OR
      -- Personal AI owned by user
      (c.brand_id = personal_ai_brand_id() AND c.user_id = auth.uid())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update messages INSERT policy
DROP POLICY IF EXISTS "Users can insert messages in their org conversations" ON messages;
CREATE POLICY "Users can insert messages in their org conversations"
  ON messages
  FOR INSERT
  WITH CHECK (can_user_modify_conversation(conversation_id));

-- Update messages UPDATE policy
DROP POLICY IF EXISTS "Users can update messages in their org conversations" ON messages;
CREATE POLICY "Users can update messages in their org conversations"
  ON messages
  FOR UPDATE
  USING (can_user_modify_conversation(conversation_id));

-- Update messages DELETE policy
DROP POLICY IF EXISTS "Users can delete messages in their org conversations" ON messages;
CREATE POLICY "Users can delete messages in their org conversations"
  ON messages
  FOR DELETE
  USING (can_user_modify_conversation(conversation_id));

-- ============================================================================
-- STEP 6: CREATE HELPER FUNCTION FOR QUICK VISIBILITY TOGGLE
-- ============================================================================

-- Function to toggle conversation visibility (only owner can do this)
CREATE OR REPLACE FUNCTION toggle_conversation_visibility(conv_id UUID)
RETURNS TEXT AS $$
DECLARE
  current_visibility TEXT;
  new_visibility TEXT;
BEGIN
  -- Get current visibility (only if user owns it)
  SELECT visibility INTO current_visibility
  FROM conversations
  WHERE id = conv_id AND user_id = auth.uid();
  
  IF current_visibility IS NULL THEN
    RAISE EXCEPTION 'Conversation not found or not owned by user';
  END IF;
  
  -- Toggle visibility
  new_visibility := CASE WHEN current_visibility = 'private' THEN 'team' ELSE 'private' END;
  
  -- Update and return new visibility
  UPDATE conversations
  SET visibility = new_visibility, updated_at = NOW()
  WHERE id = conv_id AND user_id = auth.uid();
  
  RETURN new_visibility;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: MIGRATE EXISTING CONVERSATIONS
-- ============================================================================
-- IMPORTANT: Choose one of these options based on your preference:

-- OPTION A: Keep existing behavior (all existing conversations visible to team)
-- This maintains backward compatibility
UPDATE conversations 
SET visibility = 'team' 
WHERE visibility IS NULL;

-- OPTION B: Make all existing conversations private (uncomment to use)
-- UPDATE conversations 
-- SET visibility = 'private' 
-- WHERE visibility IS NULL;

-- ============================================================================
-- STEP 8: ADD TRIGGER TO SET DEFAULT VISIBILITY ON NEW CONVERSATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_default_conversation_visibility()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visibility IS NULL THEN
    NEW.visibility := 'private';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conversation_set_default_visibility ON conversations;
CREATE TRIGGER conversation_set_default_visibility
  BEFORE INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_default_conversation_visibility();

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify the migration worked)
-- ============================================================================

-- Check the new column exists
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'conversations' AND column_name = 'visibility';

-- Check policy was created
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'conversations';

-- Check some sample data
-- SELECT id, title, visibility, user_id FROM conversations LIMIT 10;

COMMENT ON FUNCTION toggle_conversation_visibility IS 'Toggles conversation visibility between private and team. Only the conversation owner can use this.';

















