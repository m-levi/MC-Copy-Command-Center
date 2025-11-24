-- Conversation sharing and collaboration migration
-- Creates tables for sharing conversations, comments, and notifications

-- Conversation shares table
CREATE TABLE IF NOT EXISTS conversation_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL if link share
  share_type VARCHAR(20) NOT NULL CHECK (share_type IN ('user', 'organization', 'link')),
  permission_level VARCHAR(20) NOT NULL CHECK (permission_level IN ('view', 'comment', 'edit')),
  share_token VARCHAR(100) UNIQUE,  -- For shareable links
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  
  -- Ensure unique user shares per conversation
  CONSTRAINT unique_user_share UNIQUE (conversation_id, shared_with_user_id)
);

-- Conversation comments table
CREATE TABLE IF NOT EXISTS conversation_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES conversation_comments(id) ON DELETE CASCADE,  -- For threading
  content TEXT NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,  -- Comment on specific message
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- 'conversation_shared', 'comment_added', 'comment_mentioned', 'job_completed', etc.
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,  -- URL to navigate to
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Metadata for additional context
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_shares_conversation ON conversation_shares(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_shares_user ON conversation_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_shares_token ON conversation_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_conversation_shares_expires ON conversation_shares(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_comments_conversation ON conversation_comments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_comments_user ON conversation_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_comments_parent ON conversation_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_conversation_comments_message ON conversation_comments(message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_comments_resolved ON conversation_comments(resolved);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Function to update updated_at timestamp for comments
CREATE OR REPLACE FUNCTION update_conversation_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS conversation_comments_updated_at_trigger ON conversation_comments;
CREATE TRIGGER conversation_comments_updated_at_trigger
  BEFORE UPDATE ON conversation_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_comments_updated_at();

-- Function to generate unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a random token (32 characters)
  token := encode(gen_random_bytes(24), 'base64');
  -- Remove special characters and make URL-safe
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for conversation_shares
ALTER TABLE conversation_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shares for conversations they own or are shared with"
  ON conversation_shares
  FOR SELECT
  USING (
    -- Owner can see all shares
    shared_by_user_id = auth.uid() OR
    -- Shared user can see their share
    shared_with_user_id = auth.uid() OR
    -- Anyone can see link shares (will be filtered by token in application)
    share_type = 'link'
  );

CREATE POLICY "Users can create shares for conversations they own"
  ON conversation_shares
  FOR INSERT
  WITH CHECK (
    shared_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update shares they created"
  ON conversation_shares
  FOR UPDATE
  USING (shared_by_user_id = auth.uid())
  WITH CHECK (shared_by_user_id = auth.uid());

CREATE POLICY "Users can delete shares they created"
  ON conversation_shares
  FOR DELETE
  USING (shared_by_user_id = auth.uid());

-- RLS Policies for conversation_comments
ALTER TABLE conversation_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments for conversations they have access to"
  ON conversation_comments
  FOR SELECT
  USING (
    -- User owns the conversation
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    ) OR
    -- User has been shared the conversation
    EXISTS (
      SELECT 1 FROM conversation_shares
      WHERE conversation_id = conversation_comments.conversation_id
      AND (
        shared_with_user_id = auth.uid() OR
        share_type = 'organization' AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE user_id = auth.uid()
          AND organization_id = (
            SELECT organization_id FROM conversations WHERE id = conversation_comments.conversation_id
          )
        )
      )
      AND permission_level IN ('view', 'comment', 'edit')
    )
  );

CREATE POLICY "Users can create comments if they have comment or edit permission"
  ON conversation_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (
      -- User owns the conversation
      EXISTS (
        SELECT 1 FROM conversations
        WHERE id = conversation_id AND user_id = auth.uid()
      ) OR
      -- User has comment/edit permission
      EXISTS (
        SELECT 1 FROM conversation_shares
        WHERE conversation_id = conversation_comments.conversation_id
        AND (
          shared_with_user_id = auth.uid() OR
          share_type = 'organization' AND EXISTS (
            SELECT 1 FROM organization_members
            WHERE user_id = auth.uid()
            AND organization_id = (
              SELECT organization_id FROM conversations WHERE id = conversation_comments.conversation_id
            )
          )
        )
        AND permission_level IN ('comment', 'edit')
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON conversation_comments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments or conversation owners can delete any"
  ON conversation_comments
  FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications for users"
  ON notifications
  FOR INSERT
  WITH CHECK (true);  -- Application will handle authorization

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE conversation_shares IS 'Tracks sharing of conversations with team members or via links';
COMMENT ON TABLE conversation_comments IS 'Comments and feedback on conversations and messages';
COMMENT ON TABLE notifications IS 'User notifications for sharing, comments, and other events';





