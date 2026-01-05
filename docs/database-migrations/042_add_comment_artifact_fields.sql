-- Add artifact-related fields to conversation_comments
-- Run this migration to enable artifact comments with quoted text and metadata

-- Add quoted_text column for storing highlighted text from artifacts
ALTER TABLE conversation_comments 
ADD COLUMN IF NOT EXISTS quoted_text TEXT;

-- Add metadata column for storing artifact context (artifact_id, artifact_variant, etc.)
ALTER TABLE conversation_comments 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comments on the columns
COMMENT ON COLUMN conversation_comments.quoted_text IS 'Highlighted/quoted text from an artifact that this comment references';
COMMENT ON COLUMN conversation_comments.metadata IS 'Additional context like artifact_id, artifact_variant for artifact-specific comments';

-- Create index on metadata for efficient artifact_id lookups
CREATE INDEX IF NOT EXISTS idx_conversation_comments_metadata_artifact 
ON conversation_comments USING GIN (metadata);

















