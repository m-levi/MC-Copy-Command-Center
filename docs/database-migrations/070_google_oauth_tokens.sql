-- Google OAuth Tokens Storage
-- Migration for storing Google OAuth tokens for Drive/Docs integration

-- Create table for storing Google OAuth tokens per user
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one token per user
  UNIQUE(user_id)
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_user_id ON google_oauth_tokens(user_id);

-- RLS policies
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own tokens
CREATE POLICY "Users can view their own google tokens"
  ON google_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own google tokens"
  ON google_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own google tokens"
  ON google_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own google tokens"
  ON google_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Add Google Drive provenance fields to brand_documents_v2
ALTER TABLE brand_documents_v2 
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS drive_mime_type TEXT,
ADD COLUMN IF NOT EXISTS drive_owner TEXT,
ADD COLUMN IF NOT EXISTS drive_web_view_link TEXT,
ADD COLUMN IF NOT EXISTS drive_last_synced_at TIMESTAMPTZ;

-- Create index for Drive file lookups
CREATE INDEX IF NOT EXISTS idx_brand_documents_v2_drive_file_id 
ON brand_documents_v2(drive_file_id) WHERE drive_file_id IS NOT NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS google_oauth_tokens_updated_at ON google_oauth_tokens;
CREATE TRIGGER google_oauth_tokens_updated_at
  BEFORE UPDATE ON google_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_google_oauth_tokens_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON google_oauth_tokens TO authenticated;

















