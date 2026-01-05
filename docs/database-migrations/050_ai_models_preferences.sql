-- AI Models Preferences Migration
-- Adds enabled_models column to user_preferences table for storing user's selected AI models

-- Add enabled_models JSONB column to user_preferences
-- This stores an array of model IDs that the user has enabled
-- e.g., ["anthropic/claude-sonnet-4.5", "openai/gpt-5.1-thinking", "google/gemini-3-pro"]
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS enabled_models JSONB DEFAULT NULL;

-- Add default_model column to store user's preferred default model
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS default_model TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.enabled_models IS 
  'JSON array of AI model IDs enabled for this user. NULL means all models are enabled.';

COMMENT ON COLUMN user_preferences.default_model IS 
  'The default AI model ID to use for new conversations. NULL means use system default.';

-- Create index for faster queries on enabled_models
CREATE INDEX IF NOT EXISTS idx_user_preferences_enabled_models 
ON user_preferences USING gin (enabled_models);

















