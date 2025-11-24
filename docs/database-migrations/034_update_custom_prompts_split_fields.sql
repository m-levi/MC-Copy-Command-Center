-- Migration: Split prompt_content into system_prompt and user_prompt
-- This allows users to define both system and user prompts separately

-- Add new columns for system_prompt and user_prompt
ALTER TABLE custom_prompts 
  ADD COLUMN IF NOT EXISTS system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS user_prompt TEXT;

-- Migrate existing data: copy prompt_content to system_prompt
UPDATE custom_prompts 
SET system_prompt = prompt_content 
WHERE system_prompt IS NULL AND prompt_content IS NOT NULL;

-- Update prompt_type values to simplified format
UPDATE custom_prompts SET prompt_type = 'design_email' WHERE prompt_type IN ('design_system', 'design_user');
UPDATE custom_prompts SET prompt_type = 'letter_email' WHERE prompt_type IN ('letter_system', 'letter_user');
UPDATE custom_prompts SET prompt_type = 'flow_email' WHERE prompt_type IN ('flow_design', 'flow_letter');

-- Drop the old column (optional - can keep for backwards compatibility)
-- ALTER TABLE custom_prompts DROP COLUMN IF EXISTS prompt_content;

-- Add comment documenting the schema
COMMENT ON TABLE custom_prompts IS 'Custom prompts for debug mode testing. Each prompt has separate system and user prompt fields.';
COMMENT ON COLUMN custom_prompts.prompt_type IS 'Email type: design_email, letter_email, flow_email';
COMMENT ON COLUMN custom_prompts.system_prompt IS 'System instructions for the AI (defines behavior, rules, output format)';
COMMENT ON COLUMN custom_prompts.user_prompt IS 'User prompt template with variables like {{COPY_BRIEF}}, {{BRAND_INFO}}';



