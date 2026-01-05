-- =============================================================================
-- Custom Modes Migration
-- Creates tables for custom conversation modes, version history, and test results
-- =============================================================================

-- =============================================================================
-- 1. CUSTOM MODES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS custom_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT '💬', -- Emoji or icon identifier
  color VARCHAR(20) DEFAULT 'blue', -- UI color theme
  system_prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true, -- Whether mode appears in selector
  is_default BOOLEAN DEFAULT false, -- System default modes (read-only)
  sort_order INTEGER DEFAULT 0, -- For custom ordering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_custom_modes_user_id ON custom_modes(user_id);
CREATE INDEX idx_custom_modes_active ON custom_modes(is_active) WHERE is_active = true;
CREATE INDEX idx_custom_modes_sort ON custom_modes(user_id, sort_order);

-- =============================================================================
-- 2. MODE VERSIONS TABLE (Version History)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mode_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_id UUID REFERENCES custom_modes(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  notes TEXT, -- What changed in this version
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(mode_id, version_number)
);

-- Index for quick version lookups
CREATE INDEX idx_mode_versions_mode_id ON mode_versions(mode_id);
CREATE INDEX idx_mode_versions_created_at ON mode_versions(mode_id, created_at DESC);

-- =============================================================================
-- 3. MODE TEST RESULTS TABLE (Test History)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mode_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode_id UUID REFERENCES custom_modes(id) ON DELETE CASCADE,
  mode_name VARCHAR(100), -- Store name in case mode is deleted
  system_prompt_snapshot TEXT, -- Snapshot of prompt used
  test_input TEXT NOT NULL,
  test_output TEXT,
  model_used VARCHAR(100) NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  brand_name VARCHAR(255), -- Store name for reference
  response_time_ms INTEGER,
  token_count INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Optional user rating
  notes TEXT, -- User notes on the result
  is_comparison BOOLEAN DEFAULT false, -- Part of A/B test
  comparison_group_id UUID, -- Links results from same A/B test
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for test result queries
CREATE INDEX idx_mode_test_results_user_id ON mode_test_results(user_id);
CREATE INDEX idx_mode_test_results_mode_id ON mode_test_results(mode_id);
CREATE INDEX idx_mode_test_results_created_at ON mode_test_results(user_id, created_at DESC);
CREATE INDEX idx_mode_test_results_comparison ON mode_test_results(comparison_group_id) WHERE comparison_group_id IS NOT NULL;

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE custom_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_test_results ENABLE ROW LEVEL SECURITY;

-- Custom Modes RLS
CREATE POLICY "Users can view their own modes"
  ON custom_modes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own modes"
  ON custom_modes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own modes"
  ON custom_modes FOR UPDATE
  USING (auth.uid() = user_id AND is_default = false);

CREATE POLICY "Users can delete their own modes"
  ON custom_modes FOR DELETE
  USING (auth.uid() = user_id AND is_default = false);

-- Mode Versions RLS (access through mode ownership)
CREATE POLICY "Users can view versions of their modes"
  ON mode_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM custom_modes
      WHERE custom_modes.id = mode_versions.mode_id
      AND custom_modes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert versions for their modes"
  ON mode_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_modes
      WHERE custom_modes.id = mode_versions.mode_id
      AND custom_modes.user_id = auth.uid()
    )
  );

-- Test Results RLS
CREATE POLICY "Users can view their own test results"
  ON mode_test_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test results"
  ON mode_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test results"
  ON mode_test_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test results"
  ON mode_test_results FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_custom_modes_updated_at
  BEFORE UPDATE ON custom_modes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create version on prompt change
CREATE OR REPLACE FUNCTION create_mode_version_on_update()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Only create version if system_prompt changed
  IF OLD.system_prompt IS DISTINCT FROM NEW.system_prompt THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM mode_versions
    WHERE mode_id = NEW.id;
    
    INSERT INTO mode_versions (mode_id, version_number, system_prompt, created_by)
    VALUES (NEW.id, next_version, OLD.system_prompt, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_version_mode_prompt
  BEFORE UPDATE ON custom_modes
  FOR EACH ROW
  EXECUTE FUNCTION create_mode_version_on_update();

-- Create initial version on insert
CREATE OR REPLACE FUNCTION create_initial_mode_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO mode_versions (mode_id, version_number, system_prompt, created_by)
  VALUES (NEW.id, 1, NEW.system_prompt, auth.uid());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_create_initial_version
  AFTER INSERT ON custom_modes
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_mode_version();

-- =============================================================================
-- 6. HELPER FUNCTIONS
-- =============================================================================

-- Get latest version number for a mode
CREATE OR REPLACE FUNCTION get_mode_version_count(p_mode_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(version_number), 0)
  FROM mode_versions
  WHERE mode_id = p_mode_id;
$$ LANGUAGE sql STABLE;

-- Restore a previous version
CREATE OR REPLACE FUNCTION restore_mode_version(p_mode_id UUID, p_version_number INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_prompt TEXT;
BEGIN
  -- Get the prompt from the specified version
  SELECT system_prompt INTO v_prompt
  FROM mode_versions
  WHERE mode_id = p_mode_id AND version_number = p_version_number;
  
  IF v_prompt IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update the mode with the old prompt (this will auto-create a new version)
  UPDATE custom_modes
  SET system_prompt = v_prompt
  WHERE id = p_mode_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. GRANT PERMISSIONS
-- =============================================================================

GRANT ALL ON custom_modes TO authenticated;
GRANT ALL ON mode_versions TO authenticated;
GRANT ALL ON mode_test_results TO authenticated;
GRANT EXECUTE ON FUNCTION get_mode_version_count TO authenticated;
GRANT EXECUTE ON FUNCTION restore_mode_version TO authenticated;
























