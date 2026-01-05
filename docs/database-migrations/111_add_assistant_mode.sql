-- Migration: Add assistant mode to conversations
-- Description: Updates the mode check constraint to include 'assistant' mode for orchestrator-based conversations

-- Drop the existing check constraint
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_mode_check;

-- Add new check constraint with assistant mode included
ALTER TABLE conversations ADD CONSTRAINT conversations_mode_check
CHECK (mode IN ('planning', 'email_copy', 'flow', 'assistant', 'calendar_planner'));

-- Verify the constraint was added
DO $$
BEGIN
  RAISE NOTICE 'Mode constraint updated to include: planning, email_copy, flow, assistant, calendar_planner';
END $$;
