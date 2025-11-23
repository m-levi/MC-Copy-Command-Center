-- Add assigned_to column to conversation_comments
ALTER TABLE conversation_comments
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_conversation_comments_assigned_to
ON conversation_comments(assigned_to);

-- Update RLS to allow assigned users to view/update
-- (Existing policies likely cover this via conversation access, but good to double check if specific assignment logic is needed)
-- For now, we rely on conversation access.

