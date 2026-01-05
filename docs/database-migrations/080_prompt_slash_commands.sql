-- Migration: Add Slash Command Support to Prompts
-- Allows users to trigger shortcuts with slash commands like /subjects or /variants

-- Add slash_command column to saved_prompts
ALTER TABLE saved_prompts 
ADD COLUMN IF NOT EXISTS slash_command VARCHAR(50);

-- Add unique index to prevent duplicate slash commands per user
-- (different users can have the same slash command)
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_prompts_slash_command_unique 
ON saved_prompts(user_id, slash_command) 
WHERE slash_command IS NOT NULL AND slash_command != '';

-- Add index for finding commands quickly
CREATE INDEX IF NOT EXISTS idx_saved_prompts_slash_command 
ON saved_prompts(slash_command) 
WHERE slash_command IS NOT NULL AND slash_command != '';

-- Comments
COMMENT ON COLUMN saved_prompts.slash_command IS 'Slash command trigger (e.g., "subjects" for /subjects). Stored without leading slash.';

-- Update existing default prompts with suggested slash commands
-- (Only if slash_command is null to not override any manual changes)
UPDATE saved_prompts 
SET slash_command = 'subjects' 
WHERE name = 'Subject Lines' 
  AND is_default = true 
  AND slash_command IS NULL;

UPDATE saved_prompts 
SET slash_command = 'variants' 
WHERE name = 'More Variants' 
  AND is_default = true 
  AND slash_command IS NULL;

UPDATE saved_prompts 
SET slash_command = 'shorter' 
WHERE name = 'Shorter Version' 
  AND is_default = true 
  AND slash_command IS NULL;

UPDATE saved_prompts 
SET slash_command = 'fomo' 
WHERE name = 'More Urgent' 
  AND is_default = true 
  AND slash_command IS NULL;

UPDATE saved_prompts 
SET slash_command = 'friendly' 
WHERE name = 'Friendlier Tone' 
  AND is_default = true 
  AND slash_command IS NULL;

















