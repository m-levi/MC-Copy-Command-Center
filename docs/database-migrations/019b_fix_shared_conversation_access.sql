-- ========================================
-- FIX: Allow Shared Conversation Access
-- ========================================
-- This fixes the issue where unauthenticated users
-- cannot access shared conversations even with valid tokens
-- ========================================

-- Add policy to allow viewing conversations via share tokens
-- This must be run AFTER 019_conversation_sharing.sql
CREATE POLICY "Anyone can view shared conversations"
  ON conversations
  FOR SELECT
  USING (
    -- Allow if there's a valid share (not expired)
    id IN (
      SELECT conversation_id 
      FROM conversation_shares 
      WHERE share_type = 'link'
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Add policy to allow viewing messages in shared conversations
CREATE POLICY "Anyone can view messages in shared conversations"
  ON messages
  FOR SELECT
  USING (
    -- Allow if the conversation has a valid share (not expired)
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_shares 
      WHERE share_type = 'link'
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Anyone can view shared conversations" ON conversations IS 
'Allows unauthenticated users to view conversations that have been shared via link';

COMMENT ON POLICY "Anyone can view messages in shared conversations" ON messages IS 
'Allows unauthenticated users to view messages in conversations that have been shared via link';




