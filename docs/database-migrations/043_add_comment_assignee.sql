-- Add assignee support to conversation_comments
-- Run this migration to enable assigning comments to team members

-- Add assigned_to column for storing the assignee user id
ALTER TABLE conversation_comments 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment on the column
COMMENT ON COLUMN conversation_comments.assigned_to IS 'The user this comment is assigned to for action/review';

-- Create index for efficient assignee lookups
CREATE INDEX IF NOT EXISTS idx_conversation_comments_assigned_to 
ON conversation_comments(assigned_to) WHERE assigned_to IS NOT NULL;

-- Add priority column for prioritizing comments
ALTER TABLE conversation_comments 
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'normal' 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

COMMENT ON COLUMN conversation_comments.priority IS 'Priority level of the comment: low, normal, high, urgent';

-- Create index for priority-based filtering
CREATE INDEX IF NOT EXISTS idx_conversation_comments_priority 
ON conversation_comments(priority) WHERE priority != 'normal';

















