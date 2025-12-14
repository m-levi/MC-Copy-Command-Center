-- Email Artifacts Migration
-- Run this in your Supabase SQL editor

-- =====================================================
-- ARTIFACTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind VARCHAR NOT NULL DEFAULT 'email',
  title TEXT,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artifacts_conversation_id ON artifacts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_user_id ON artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_kind ON artifacts(kind);

-- RLS Policies for artifacts
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- Users can view their own artifacts
CREATE POLICY "Users can view their own artifacts"
  ON artifacts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own artifacts
CREATE POLICY "Users can insert their own artifacts"
  ON artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own artifacts
CREATE POLICY "Users can update their own artifacts"
  ON artifacts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own artifacts
CREATE POLICY "Users can delete their own artifacts"
  ON artifacts FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- ARTIFACT VERSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  title TEXT,
  change_type VARCHAR DEFAULT 'edited',
  change_summary TEXT,
  triggered_by_message_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure unique version numbers per artifact
  UNIQUE(artifact_id, version)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artifact_versions_artifact_id ON artifact_versions(artifact_id);

-- RLS Policies for artifact_versions
ALTER TABLE artifact_versions ENABLE ROW LEVEL SECURITY;

-- Users can view versions of their own artifacts
CREATE POLICY "Users can view versions of their own artifacts"
  ON artifact_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE artifacts.id = artifact_versions.artifact_id
      AND artifacts.user_id = auth.uid()
    )
  );

-- Users can insert versions for their own artifacts
CREATE POLICY "Users can insert versions for their own artifacts"
  ON artifact_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE artifacts.id = artifact_versions.artifact_id
      AND artifacts.user_id = auth.uid()
    )
  );

-- Users can update versions for their own artifacts
CREATE POLICY "Users can update versions for their own artifacts"
  ON artifact_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE artifacts.id = artifact_versions.artifact_id
      AND artifacts.user_id = auth.uid()
    )
  );

-- Users can delete versions for their own artifacts
CREATE POLICY "Users can delete versions for their own artifacts"
  ON artifact_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE artifacts.id = artifact_versions.artifact_id
      AND artifacts.user_id = auth.uid()
    )
  );

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_artifacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artifacts_updated_at
  BEFORE UPDATE ON artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_artifacts_updated_at();
