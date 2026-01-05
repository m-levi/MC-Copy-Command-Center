-- =====================================================
-- ARTIFACT PREFERENCES MIGRATION
-- Add user preferences for artifact types and behaviors
-- =====================================================

-- Add artifact preference columns to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS disabled_artifact_types TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS artifact_auto_create BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS artifact_suggestions_enabled BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.disabled_artifact_types IS
'List of artifact type kinds the user has explicitly disabled. Empty array means all types are enabled.';

COMMENT ON COLUMN user_preferences.artifact_auto_create IS
'Whether AI should automatically create artifacts when appropriate (true) or just suggest them (false)';

COMMENT ON COLUMN user_preferences.artifact_suggestions_enabled IS
'Whether to show "Save as artifact" suggestions in chat when artifact-worthy content is detected';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_artifact_types
ON user_preferences USING GIN (disabled_artifact_types);

-- =====================================================
-- SEED NEW ARTIFACT TYPES INTO artifact_types TABLE
-- =====================================================

-- Insert new baseline artifact types (if artifact_types table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'artifact_types') THEN
    INSERT INTO artifact_types (
      kind, name, description, icon, color,
      field_schema, supports_variants, supports_sharing,
      supports_comments, viewer_type, is_system, is_active, category
    ) VALUES
    (
      'markdown',
      'Document',
      'Rich text document with formatting, headers, lists, and links',
      'FileText',
      'slate',
      '[{"name": "format", "label": "Format", "type": "select", "options": ["article", "notes", "documentation"], "required": false}]'::jsonb,
      false, true, true, 'markdown', true, true, 'content'
    ),
    (
      'spreadsheet',
      'Spreadsheet',
      'Structured data in rows and columns with editing support',
      'Table',
      'emerald',
      '[{"name": "columns", "label": "Columns", "type": "array", "required": true}, {"name": "rows", "label": "Rows", "type": "array", "required": true}, {"name": "has_header", "label": "Has Header Row", "type": "boolean", "default": true}]'::jsonb,
      false, true, true, 'spreadsheet', true, true, 'data'
    ),
    (
      'code',
      'Code Snippet',
      'Syntax-highlighted code with language detection',
      'Code',
      'amber',
      '[{"name": "language", "label": "Language", "type": "text", "required": true}, {"name": "filename", "label": "Filename", "type": "text", "required": false}, {"name": "description", "label": "Description", "type": "text", "required": false}]'::jsonb,
      false, true, true, 'code', true, true, 'development'
    ),
    (
      'checklist',
      'Checklist',
      'Interactive checklist with checkable items and progress tracking',
      'CheckSquare',
      'violet',
      '[{"name": "items", "label": "Items", "type": "array", "required": true}, {"name": "allow_add", "label": "Allow Adding Items", "type": "boolean", "default": true}, {"name": "show_progress", "label": "Show Progress", "type": "boolean", "default": true}]'::jsonb,
      false, true, true, 'checklist', true, true, 'productivity'
    )
    ON CONFLICT (kind) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      icon = EXCLUDED.icon,
      field_schema = EXCLUDED.field_schema,
      updated_at = NOW();
  END IF;
END $$;

-- =====================================================
-- VERIFY
-- =====================================================

-- This query can be used to verify the migration was successful
-- SELECT
--   column_name,
--   data_type,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user_preferences'
-- AND column_name IN ('disabled_artifact_types', 'artifact_auto_create', 'artifact_suggestions_enabled');
