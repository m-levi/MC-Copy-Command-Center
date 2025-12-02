-- Email Notification Preferences Migration
-- Adds email notification settings to user_preferences table

-- Add email_notifications JSONB column to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS email_notifications JSONB DEFAULT '{
  "enabled": true,
  "comment_added": true,
  "comment_assigned": true,
  "comment_mention": true,
  "review_requested": true,
  "review_completed": true,
  "team_invite": true
}'::jsonb;

-- Add index for faster queries on email preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_email_notifications 
ON user_preferences USING gin (email_notifications);

-- Add comments
COMMENT ON COLUMN user_preferences.email_notifications IS 
'JSON object containing email notification preferences. Keys: enabled (master toggle), comment_added, comment_assigned, comment_mention, review_requested, review_completed, team_invite';

-- ============================================================================
-- REVIEW STATUS FOR CONVERSATIONS
-- ============================================================================

-- Add review_status column to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('draft', 'pending_review', 'changes_requested', 'approved', NULL)),
ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_requested_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS review_feedback TEXT;

-- Create index for review status queries
CREATE INDEX IF NOT EXISTS idx_conversations_review_status 
ON conversations(review_status) WHERE review_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_pending_review 
ON conversations(brand_id, review_status) WHERE review_status = 'pending_review';

-- Add comments
COMMENT ON COLUMN conversations.review_status IS 'Review workflow status: draft, pending_review, changes_requested, approved';
COMMENT ON COLUMN conversations.review_requested_at IS 'When review was requested';
COMMENT ON COLUMN conversations.review_requested_by IS 'User who requested review';
COMMENT ON COLUMN conversations.reviewed_at IS 'When review was completed';
COMMENT ON COLUMN conversations.reviewed_by IS 'User who completed the review';
COMMENT ON COLUMN conversations.review_feedback IS 'Feedback from reviewer';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================





