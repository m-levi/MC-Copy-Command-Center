-- =============================================================================
-- Migration 070: Image Generation Support
-- =============================================================================
-- Adds support for AI-generated images in conversations
-- Includes table for storing image artifacts and updates custom modes schema

-- =============================================================================
-- 1. CREATE IMAGE ARTIFACTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS image_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Generation info
  prompt TEXT NOT NULL,
  revised_prompt TEXT, -- Some models revise the prompt
  model VARCHAR(100) NOT NULL,
  
  -- Image data (base64 or URL)
  image_data TEXT NOT NULL,
  
  -- Metadata
  width INTEGER,
  height INTEGER,
  aspect_ratio VARCHAR(10), -- e.g., '16:9', '1:1'
  style VARCHAR(50), -- 'natural', 'vivid', etc. (OpenAI only)
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  generation_time_ms INTEGER
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_image_artifacts_conversation ON image_artifacts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_image_artifacts_brand ON image_artifacts(brand_id);
CREATE INDEX IF NOT EXISTS idx_image_artifacts_user ON image_artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_image_artifacts_created ON image_artifacts(created_at DESC);

-- RLS Policies
ALTER TABLE image_artifacts ENABLE ROW LEVEL SECURITY;

-- Users can view images from their own conversations or brands they have access to
CREATE POLICY "Users can view image artifacts from their conversations"
  ON image_artifacts
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = image_artifacts.conversation_id
      AND conversations.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = image_artifacts.brand_id
      AND brands.user_id = auth.uid()
    )
  );

-- Users can insert images for their own conversations
CREATE POLICY "Users can create image artifacts"
  ON image_artifacts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = image_artifacts.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Users can delete their own images
CREATE POLICY "Users can delete their image artifacts"
  ON image_artifacts
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 2. UPDATE CUSTOM MODES - Ensure generate_image tool config exists
-- =============================================================================

-- Add generate_image to existing custom modes that don't have it
UPDATE custom_modes
SET enabled_tools = jsonb_set(
  COALESCE(enabled_tools, '{}'::jsonb),
  '{generate_image}',
  '{
    "enabled": false,
    "default_model": "google/gemini-2.5-flash-image",
    "allowed_models": ["google/gemini-2.5-flash-image", "openai/dall-e-3"],
    "default_size": "1024x1024",
    "max_images": 2
  }'::jsonb,
  true
)
WHERE enabled_tools IS NULL OR enabled_tools->'generate_image' IS NULL;

-- =============================================================================
-- 3. COMMENTS
-- =============================================================================

COMMENT ON TABLE image_artifacts IS 'Stores AI-generated images from text-to-image models';
COMMENT ON COLUMN image_artifacts.image_data IS 'Base64-encoded image or URL to hosted image';
COMMENT ON COLUMN image_artifacts.revised_prompt IS 'Some models (like DALL-E 3) revise the user prompt for better results';
COMMENT ON COLUMN image_artifacts.generation_time_ms IS 'Time taken to generate the image in milliseconds';

















